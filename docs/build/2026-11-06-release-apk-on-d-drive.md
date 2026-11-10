# Release APK built with tools and output on D:

## Problem
C: has about 20 GB free, too little for an Android release build. The old release script
(`comlnkr/code/build-release.cmd` and `.android-build/`) still pointed at `code/frontend`, which moved into
this repository on 2026-11-04, so there was no working way to build a standalone APK.

## Cause
- The JDK, Android SDK and Gradle cache were on C:, and every build folder sits in the project or in
  `node_modules` on C:.
- Windows' path-length limit breaks CMake/ninja when native libraries build from their pnpm paths under
  `node_modules/.pnpm` (`docs/system-map.md`, "Development build").

## Change
- Build tools moved to D: and pointed at with user environment variables:
  - `JAVA_HOME=D:\ProgramData\jdk-17.0.12`
  - `ANDROID_HOME` and `ANDROID_SDK_ROOT` = `D:\AppData\AndroidStudio\Sdk`
  - `GRADLE_USER_HOME=D:\AppData\Gradle`
- New `scripts/build-release-apk.cmd` (replaces the old `build-release.cmd`):
  - It allows only `https://api.comlinkr.com/api` in the mobile `.env`.
  - It sets the D: tools and `TEMP` / `TMP` to `D:\cl\tmp`.
  - It builds `:app:assembleRelease` for arm64-v8a, with Metaspace raised to 1 GB; release lint ran out at
    the 512 MB in `gradle.properties`.
  - It copies the APK to `D:\ComLinkr\builds\ComLinkr-arm64.apk`.
  - It keeps the old script's settings (`APP_ENV=development`, so OTA update checks are off).
- New `scripts/android-d-drive.init.gradle`, a port of the old long-path workaround. No app source changes.
  - Native libraries build from short junctions, `C:\cl\pkg\<library>` and `C:\cl\p\…` (the pnpm store).
  - Every subproject's `build` folder is a junction to `D:\cl\…` through `C:\cl\d`, and so are the CMake
    staging folders. The files are written to D:.
  - The Gradle project cache and Kotlin data go to `D:\cl`.
- Why the junctions sit on C: even though the files are on D:: codegen computes relative paths between a
  library's sources, its build folder and `node_modules`, and Windows has none across drives ("this and base
  files have different roots").
- Why `build` folders are junctions rather than moved: some CMake files hard-code `${CMAKE_SOURCE_DIR}/build`
  (Reanimated's codegen headers).
- Root projects keep their real `build` folders. They are small, and the React Native settings plugin writes
  `autolinking.json` there before any hook runs.

## Commit or pull request
The scripts: commit `3f8ba27`, merged with PR 1. The 2026-11-11 notes below: PR 43 (merge `9749957`).

## How it was checked
- The build completed: `BUILD SUCCESSFUL in 7m 16s` on the last run. The first full run, including
  dependency downloads and native code, took about 25 minutes.
- The APK holds arm64-v8a libraries only.
- Its Hermes bundle contains `https://api.comlinkr.com/api` and no `localhost` URL.
- Disk after the build: `D:\cl` is 2.2 GB, and C: had 18.3 GB free.
- **Not checked:** installing and opening the APK on the phone (wireless debugging had disconnected), a clean
  run from an empty `D:\cl`, and iOS.

## Notes for the next build
- If a build fails with `Address already in use: bind`, stop the leftover `java.exe` Gradle and Kotlin daemons.
- If a plugin class is "not found" after changing where build folders go, delete that plugin's stale `build`
  folder in `node_modules`. Gradle had kept "up to date" records pointing at the old location.
- 2026-11-11: `Could not find implementation class 'expo.modules.updates.ExpoUpdatesPlugin'` after
  `expo prebuild --clean`. The plugin's `build` folder in `node_modules/.pnpm/expo-updates@…/expo-updates/`
  `expo-updates-gradle-plugin/` had lost its `classes` folder, but Gradle still called `compileKotlin` up to date
  and packed a 640-byte jar. `--rerun-tasks` on that one jar did not hold. Deleting the folder fixed it; it is
  too deep for `Remove-Item`, so use `cmd /c 'rmdir /s /q "\\?\<full path>"'`.
- Run `npx expo prebuild --platform android --clean` (with `APP_ENV=development`) when `app.config.js` or the
  native dependencies change: `android/` is git-ignored, and an old one silently leaves out new permissions and
  plugin settings. Copy `android/app/debug.keystore` out first and put it back after, so the APK still installs
  over the previous one.
- The release is signed with the debug keystore (`android/app/build.gradle`). That is fine for sideloading,
  not for the Play Store.

## Way back
- Delete the two scripts and the junction folder `C:\cl` (`rmdir` on a junction removes only the link).
- Delete `D:\cl` (build output only).
- Reset the environment variables if the tools move again.
