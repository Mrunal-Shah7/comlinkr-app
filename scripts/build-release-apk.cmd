@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem Builds the standalone ARM64 release APK of the mobile app with every tool, cache, temporary file and
rem output on D: (C: is short on space). JavaScript and assets are bundled; Metro is not needed to run it.
rem   build-release-apk.cmd            build (pauses at the end when double-clicked)
rem   build-release-apk.cmd --no-pause build from a terminal
rem   build-release-apk.cmd --check    preflight only
call :build "%~1"
set "BUILD_RESULT=%ERRORLEVEL%"
echo.
if /i "%~1"=="--no-pause" goto finish
if /i "%~1"=="--check" goto finish
pause
:finish
exit /b %BUILD_RESULT%

:build
set "REPO=%~dp0.."
set "MOBILE_DIR=%REPO%\frontend\apps\mobile"
set "ANDROID_DIR=%MOBILE_DIR%\android"
set "INIT_SCRIPT=%~dp0android-d-drive.init.gradle"
set "CL_BUILD_BASE=D:\cl"
rem Short junction aliases for native sources: no space used, but they must share a drive with node_modules.
set "CL_LINK_BASE=C:\cl"
set "OUTPUT_DIR=D:\ComLinkr\builds"
set "OUTPUT_APK=%OUTPUT_DIR%\ComLinkr-arm64.apk"
set "PRODUCTION_API=https://api.comlinkr.com/api"

rem Build tools on D: (see docs/build/2026-11-06-release-apk-on-d-drive.md).
set "JAVA_HOME=D:\ProgramData\jdk-17.0.12"
set "ANDROID_HOME=D:\AppData\AndroidStudio\Sdk"
set "ANDROID_SDK_ROOT=D:\AppData\AndroidStudio\Sdk"
set "GRADLE_USER_HOME=D:\AppData\Gradle"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"
set "TEMP=%CL_BUILD_BASE%\tmp"
set "TMP=%CL_BUILD_BASE%\tmp"

echo ComLinkr standalone release APK (tools and output on D:)
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not available in PATH.
    exit /b 1
)
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo ERROR: JDK 17 not found at "%JAVA_HOME%".
    exit /b 1
)
if not exist "%ANDROID_HOME%\ndk\27.1.12297006" (
    echo ERROR: Android SDK with NDK 27.1.12297006 not found at "%ANDROID_HOME%".
    exit /b 1
)
if not exist "%ANDROID_DIR%\gradlew.bat" (
    echo ERROR: Android project is missing: "%ANDROID_DIR%"
    exit /b 1
)
if not exist "%MOBILE_DIR%\node_modules\expo\package.json" (
    echo ERROR: Mobile dependencies are missing. Run pnpm install in frontend\apps\mobile.
    exit /b 1
)
if not exist "%ANDROID_DIR%\app\google-services.json" if not exist "%MOBILE_DIR%\google-services.json" (
    echo ERROR: google-services.json is missing.
    exit /b 1
)

rem The APK embeds the API URL from the mobile .env; only the production API is allowed here.
set "EXPO_PUBLIC_API_BASE_URL="
for /f "delims=" %%U in ('node -e "const l=require('fs').readFileSync(process.argv[1],'utf8').split(/\r?\n/).filter(s=>/^\s*EXPO_PUBLIC_API_BASE_URL\s*=/.test(s));if(l.length)console.log(l.pop().split('=').slice(1).join('=').trim().replace(/^['\x22](.*)['\x22]$/,'$1').replace(/\/+$/,''))" "%MOBILE_DIR%\.env"') do set "EXPO_PUBLIC_API_BASE_URL=%%U"
if not "%EXPO_PUBLIC_API_BASE_URL%"=="%PRODUCTION_API%" (
    echo ERROR: frontend\apps\mobile\.env sets EXPO_PUBLIC_API_BASE_URL to "%EXPO_PUBLIC_API_BASE_URL%".
    echo        A release APK must use "%PRODUCTION_API%".
    exit /b 1
)
echo Backend for this APK: "%EXPO_PUBLIC_API_BASE_URL%"
echo Build files: "%CL_BUILD_BASE%"   APK: "%OUTPUT_APK%"
echo.

if /i "%~1"=="--check" (
    echo Preflight passed.
    exit /b 0
)

if not exist "%TEMP%" mkdir "%TEMP%"

rem Same settings as the old build-release.cmd: OTA update checks off, production JS bundle.
set "APP_ENV=development"
set "NODE_ENV=production"
set "EXPO_PUBLIC_DEBUG_API=false"

rem Release lint runs out of Metaspace at the 512m set in gradle.properties; this build raises it.
pushd "%ANDROID_DIR%"
if errorlevel 1 (
    echo ERROR: Could not enter the Android project directory.
    exit /b 1
)
echo [1/2] Building the release APK...
call "%ANDROID_DIR%\gradlew.bat" :app:assembleRelease -I "%INIT_SCRIPT%" --project-cache-dir "%CL_BUILD_BASE%\project-cache" -Pkotlin.project.persistent.dir="%CL_BUILD_BASE%\kotlin" -PreactNativeArchitectures=arm64-v8a "-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m" --console=plain --max-workers=2
set "GRADLE_RESULT=%ERRORLEVEL%"
popd
if not "%GRADLE_RESULT%"=="0" (
    echo.
    echo ERROR: Gradle failed with exit code %GRADLE_RESULT%. The APK in "%OUTPUT_DIR%" was not replaced.
    exit /b %GRADLE_RESULT%
)

set "BUILT_APK=%CL_BUILD_BASE%\app\outputs\apk\release\app-release.apk"
if not exist "%BUILT_APK%" (
    echo ERROR: Gradle finished but "%BUILT_APK%" was not found.
    exit /b 1
)
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
echo.
echo [2/2] Copying the APK...
copy /y "%BUILT_APK%" "%OUTPUT_APK%" >nul
if errorlevel 1 (
    echo ERROR: Could not copy the APK to "%OUTPUT_APK%".
    exit /b 1
)

echo.
echo BUILD COMPLETE
echo APK: "%OUTPUT_APK%"
echo Backend embedded in this APK: "%EXPO_PUBLIC_API_BASE_URL%"
echo Install: adb install -r "%OUTPUT_APK%"
exit /b 0
