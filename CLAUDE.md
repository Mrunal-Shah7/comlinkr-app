# Comlinkr

A city-scoped community app for people settling into a new place: finding a home (rentals, spare rooms,
roommates) and finding their people (local news, events, stories, Q&A, food). The mobile app is the product.
One repository holds every app, one folder each:

- `backend/`: the NestJS API (Prisma, PostgreSQL, Redis, Socket.IO chat, cron jobs); was `comlinkr_backend`;
- `frontend/apps/mobile/`: the Expo / React Native app (Expo SDK 57, RN 0.86, expo-router); was `Comlinkr_App`;
- `frontend/apps/web/` (Vite, not actively developed) and `frontend/packages/` (`shared`, `ui`).

This repository started on 2026-11-04 without history; the old repositories are kept read-only.

Work goes from short branches to `development` to `main`. Branch, commit and pull request names follow the
"Naming" section of the root `README.md` (`feature/…`, `fix/…`, `hotfix/…`, `chore/…`; Conventional Commits).
A push to `main` is meant to deploy the backend to production and run its migrations (see "How it deploys" in
[docs/system-map.md](docs/system-map.md)), so nothing reaches `main` without a pull request.
Do not commit or push unless the owner asks.

## Owner's working scope and change log

The owner works on the **mobile app only** (`frontend/apps/mobile/`): frontend changes, never the backend, web app
or shared packages unless they say otherwise. Every change made in that scope is added to the list below, newest
last, as each increment lands.

- **Increment 1 (2026-11-14), brand text and logo:** the "comlinkr" wordmark and icon on the login screen
  (`app/(auth)/login.tsx`) and sign-up screen (`app/(auth)/signup.tsx`) were too small; enlarged (login: icon 52,
  text 32; sign-up: icon 44, text 28). The hamburger menu (`components/HamburgerMenu.tsx`) showed no logo; added
  the app icon and "comlinkr" wordmark as a header row at the top of the sheet. Frontend only.
- **Increment 2 (2026-11-14), Community tab renamed to "Q&A":** the tab only holds questions and answers. Changed
  the tab label (`app/(tabs)/_layout.tsx`) and the screen's header and page title
  (`app/(tabs)/community/index.tsx`). Route name `community`, code identifiers and backend calls are unchanged.
  Type check deferred to the end of the batch, at the owner's request.
- **Increment 3 (2026-11-14), Explore bento trimmed:** hid the "Homes in <city>", "Hot question", "Stories nearby"
  and "Poll" tiles, since each has its own tab. Done with a `SHOW` flags object at the top of
  `src/features/explore/components/ExploreBento.tsx` (set a flag to `true` to bring a tile back); the hot-question
  request no longer runs while its flag is off. Greeting, next-event and quest tiles stay; the next-event tile now
  fills the width. Frontend only.
- **Increment 4 (2026-11-14), Food tab:** hid the "RATED 4.5+" tile under the search bar
  (`app/(tabs)/food/index.tsx`, `topCount` set to 0). The "Top rated" filter chip stays. The "Open now" tile now
  fills the row. Frontend only.
- **Increment 5 (2026-11-14), Q&A topic chips filter by the question:** the chips (All, Housing, Food, Transit,
  Events, Safety, General) asked the server for the category saved on each question, so a rent question saved as
  General never showed under Housing. `app/(tabs)/community/index.tsx` now fetches all questions (pages of 50 while
  a chip is on) and keeps those whose saved category, tags or words match the topic (`questionMatchesTopic`, using
  the existing `scoreForCategory`). General also takes questions that match no other topic. Frontend only; the
  API call no longer sends `category` from this screen.
- **Increment 6 (2026-11-14), header ring removed:** the gradient ring around the avatar in the top bar of the
  four tabs (`components/AppHeader.tsx`) is gone; the avatar is shown plain (34 px) and still opens the menu. The
  red unread dots on notifications and messages stay. Frontend only.
- **Increment 7 (2026-11-14), brand centred on login and sign-up:** the icon and "comlinkr" wordmark are centred
  horizontally (`app/(auth)/login.tsx`, `app/(auth)/signup.tsx`). On sign-up the back button is positioned at the
  left edge so it no longer pushes the logo off centre. Frontend only.
- **Increment 8 (2026-11-14), version 1.0.6:** app version raised from 1.0.4 to 1.0.6 in
  `frontend/apps/mobile/app.config.js` and `frontend/apps/mobile/package.json`. The Android build number
  (`versionCode`) is not in the repository: `eas.json` uses `appVersionSource: "remote"`, so EAS counts it.
- **Increment 9 (2026-11-14), Android EAS build fix:** the Android build failed in prebuild with
  `google-services.json is missing` because EAS Build uploads only git-tracked files and that file is git-ignored.
  `app.config.js` now reads `process.env.GOOGLE_SERVICES_JSON` first (falling back to the local file), as iOS
  already does with `GOOGLE_SERVICE_INFO_PLIST`. The owner creates the EAS file variable `GOOGLE_SERVICES_JSON`
  from the local `google-services.json` (`eas env:create`). Not a source of secrets in the repository.
- **Increment 10 (2026-11-14), iOS EAS build fix:** the iOS build failed in the Xcode "Bundle React Native code"
  step with `Cannot find module '@expo/metro-config/build/babel-transformer'` (shown as "Cannot read properties of
  undefined (reading 'transformFile')"). `metro.transformer.js` required that package, which the app does not list
  as a dependency: it worked with npm's flat `node_modules` (the 1.0.5 builds) but not with pnpm on EAS.
  It is now resolved through `expo`, which depends on it (no `package.json` or lockfile change). Also reinstalled
  the local `node_modules` (it was half-written from interrupted installs).

## Building and testing

Node 24 on this machine. Both apps use pnpm, at different versions: the backend pins `pnpm@9.15.0`
(`packageManager`), so run it as `npx pnpm@9.15.0 …`; the mobile app was installed with pnpm 12. A newer pnpm on
the backend stops at a "reinstall from scratch?" prompt and leaves `node_modules` as it was. After moving the
repository, reinstall both: pnpm's links hold absolute paths.

- **backend (`backend/`):** `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm start:dev`.
  - Type check: `npx tsc --noEmit`.
  - Unit tests: `pnpm test:unit` (no database needed).
  - End-to-end tests: `pnpm test:e2e`. They run against `comlinkr_test` (or `TEST_DATABASE_URL` from
    `backend/.env.test`). A guard refuses the databases `comlinkr` and `postgres`; never weaken it.
    The tests do not migrate that database: after a new migration, apply it there first (`prisma migrate deploy`
    with `DATABASE_URL` set to `TEST_DATABASE_URL`), or the tests fail with a missing column.
  - Lint: `npx eslint "src/**/*.ts"` to check. `pnpm lint` runs `--fix` and rewrites files.
- **mobile (`frontend/apps/mobile/`):** `pnpm install`, `pnpm typecheck`. There are no automated mobile tests;
  behaviour is checked on a phone (see "Testing on the phone" below).
  - Release APK for sideloading: `scripts\build-release-apk.cmd --no-pause` from the repository root, output
    `D:\ComLinkr\builds\ComLinkr-arm64.apk`. After a change to `app.config.js` or a native dependency, run
    `expo prebuild --clean` first and keep `android/app/debug.keystore`. Steps, checks and known failures:
    [docs/system-map.md, "How it deploys"](docs/system-map.md#how-it-deploys).
- **Database:** Prisma migrations in `backend/prisma/migrations/`. Locally: `pnpm migrate:dev` to create one,
  `pnpm migrate:status` to check. Production runs `migrate:deploy` on each deploy.

To run everything locally against the phone, see
[docs/system-map.md, "How it runs locally"](docs/system-map.md#how-it-runs-locally).

## Testing on the phone

Phone checks are done by Claude driving a real Android phone over USB or wireless debugging with scrcpy (see
[docs/device-testing.md](docs/device-testing.md)). Each module has a checklist in `docs/system-review/checklists/`.
A walk records its results in `docs/device-runs/` and updates the module's review.

- Only a build pointed at the **local** backend may be walked. Before touching the app, check the API base URL
  the build uses. Every EAS profile in `eas.json` points at production.
- Sign in only with seeded test accounts (`*@comlinkr.test`). Never sign in with, message or change a real person's
  account.
- Do not install, uninstall or clear data for any app other than Comlinkr and Expo Go, and do not change the
  phone's settings beyond what the checklist says.
- Screenshots that show personal data stay out of the repository.

## Tools

- **Phone:** input goes through MCPier's `android` server (scrcpy-mcp), the rest through adb
  (`D:\AppData\AndroidStudio\Sdk\platform-tools\adb.exe`). Details in [docs/device-testing.md](docs/device-testing.md).
  - **Input (MCPier):** every tap, swipe, typed text and key. `list_servers` must show `android` ready; start a session
    with `start_session` (native 1080x2412 coordinates, matching the UI dump). Use `call_tool` for one step and
    `execute` to send several inputs that need no wait between them (tap a field, then type) in one call. `execute`
    has no `setTimeout`, so waits go between calls. `key_event` has no repeat: send the key several times.
  - **Looking (adb):** screenshots with `adb exec-out screencap -p` (scrcpy screenshots lag one step behind), and
    buttons found with `uiautomator dump` filtered by text in the shell, which prints a few lines instead of the
    whole tree (`ui_dump` returns all of it). A screencap can still be stale: when it disagrees with the dump, trust
    the dump.
  - **Logs (shell):** check the Metro and backend logs in the same shell call as the screenshot; most bugs show
    there first (a 500, a missing request).
  - Find a button's centre from the dump before tapping: while the keyboard is up, taps near the bottom edge
    open Recents. Hide the keyboard with Escape (keycode 111); Back (4) also undoes in-screen state in this app.
  - `adb shell input text` cannot type accents; MCPier `input_text` can ("Café" works), but it can drop a character
    (an "Ł" after a space was lost), so read the field back from the dump after typing. Only if MCPier is down, use
    adb for input too (`input tap`, `input keyevent`).
  - `execute` stops after 25 tool calls per script: split long key sequences (clearing a field) across calls.
  - Before Back or a swipe, check `dumpsys input_method | grep mInputShown`: with the keyboard already closed, Back
    leaves the screen (it closed the login screen twice). On login, type the email, press Enter (66) to move to the
    password, type it, and Enter again to sign in; the first password typed after that jump was wrong twice, so on a
    401 clear the field and type it again.
  - `uiautomator dump /dev/tty` sometimes prints nothing (during start-up or an animation): dump to
    `/sdcard/u.xml` and `cat` it, under `timeout 30`.
  - In sheets, swipe slowly (600 ms or more); a fast swipe closes the sheet. Expo Go's floating gear sits over the
    top right of every screen: tap around it.
  - If Metro's background task dies, the app stays on the splash screen: start Metro again rather than waiting.
  - Stopping Metro's task can leave its node process holding the port ("Port 8085 is being used"): find the
    process on the port, check its command line is that Metro, stop it, then start Metro again.
  - Start Metro with `GOOGLE_SERVICE_INFO_PLIST` pointing at a placeholder plist outside the repository (command in
    `docs/device-testing.md`). Without it, every cold start of the app fails in Expo Go ("Failed to download remote
    update"); a warm reload hides it.
  - `uiautomator dump` fails on Explore ("could not get idle state": the greeting tile's glow never settles). Use
    screenshots there; the dump works again on other screens.
- **Database (shell):** timestamps read through `pg` from Node print 5 h 30 early (naive timestamps read as
  local time); compare with `now()` in the same query.
- **Injected touches are not system gestures:** a swipe from adb or scrcpy does not trigger Android's edge-swipe
  Back. Check gestures by hand.
- **Browser and GitHub:** the `gh` CLI is not installed. Use Claude in Chrome for anything in a browser, including
  opening and merging pull requests: push the branch, open
  `https://github.com/Mrunal-Shah7/comlinkr-app/compare/<base>...<branch>?expand=1` with the title and body
  filled in, then create the pull request there. Merge only when the owner asks, and close the tab afterwards.
- **Phone settings** changed for a check (navigation mode, dark mode, a test user's role) are put back before the
  session ends, and the handover says so.

## Before a pull request

- For each app the change touches: type check, and for the backend run unit tests (and e2e tests when an endpoint
  changed).
- Walk the changed journey on the phone against the local backend, including the way back (delete, cancel,
  undo, sign out), unless the change cannot be seen on the phone.
- Write a build note.
- Work on a branch and open a pull request. Nothing is pushed to `development` or `main` directly.

## After a merge

In the next commit on any branch (or a small `chore/docs-…` pull request if nothing else is open):
- set the task's state in `docs/triage.md` to `merged (PR n)`;
- add the pull request number and merge commit to the build note;
- remove the branch's line from "In progress" at the top of `docs/handover.md`.

## Where things are written down

So the next developer, or the next session, can see what changed and why (index: `docs/README.md`):

- **The system review** (`docs/system-review/`, one document per module) is the source of truth for how the
  product behaves. Read the module's document before changing it, and update it in the same pull request.
- **Every incoming task** (bug report, request, idea) gets a line in `docs/triage.md` before any work.
- **A change in what the product does** gets a plan (`docs/plan/NN-*.md`) before it is built. When the current
  behaviour needs describing first, write a review in `docs/review/`.
- **Every fix or feature** gets a build note in `docs/build/` (problem, cause, change, commit, how it was checked)
  and a line in the build-notes list of `docs/README.md`.
- **Something production showed first** also goes in `docs/production-lessons.md` and the rules below.
- **Database changes** are Prisma migrations in the same pull request as the code that needs them. After running
  one locally, query the database to check that it did what it says.
- **When a branch is cut**, add a line under "In progress" at the top of `docs/handover.md`: branch, task ID, what
  is left. Update it when the plan changes, so a session that runs out of context can be picked up from it.
- **At the end of a session**, add an entry to the top of `docs/handover.md`, including anything still running
  (backend, Metro) and any phone setting not yet put back. End it with **"Slowed down by:"**: what cost time
  (a missing tool, a wrong assumption, a step that had to be rediscovered). Anything likely to happen again
  becomes a rule here (Tools, or "Rules from bugs already found") in the same commit; say which in the entry.
- **handover.md keeps the latest five entries.** Move older ones to the top of `docs/handover-archive.md`.

## Checks on the docs

`node scripts/check-docs.mjs` checks that the docs agree with git: triage states against merged branches, merged
tasks' build notes against their PR numbers, the build-notes list in `docs/README.md`, relative links, and the
"In progress" section and length of `docs/handover.md`. Run it before every pull request.

Two hooks in `.claude/settings.json` run it without anyone remembering: at session start (it prints "In
progress", the latest handover entry and any findings) and before `git push`, which it blocks while there are
errors. Fix the docs rather than skipping the hook. The hook also runs before shell commands, so a broken relative link blocks every
shell call: create a build note (even a stub) before a plan or the README links to it. When a check is wrong or no longer useful, change the script
in a pull request like any other code.

## Safety on a local copy

- Keep email off locally: start the backend with `RESEND_API_KEY=` set empty for the process (the local `.env`
  holds a real key), with `NODE_ENV=development`. The backend then logs OTP codes instead of emailing them, so
  sign-up and password reset can be tested. For the phone, start Metro with `EXPO_PUBLIC_API_BASE_URL` set to the
  local API the same way instead of editing `.env` (commands in `docs/device-testing.md`).
- Cloudinary, Google and Apple sign-in, and Expo push use real services. Locally, use test credentials or leave
  them empty. Push only reaches devices registered against the local database.
- `news.cron` calls Google News RSS every 4 minutes while the backend runs.
- Before any EAS build or update, check that `frontend/apps/mobile/.env` points `EXPO_PUBLIC_API_BASE_URL` back at
  production (`https://api.comlinkr.com/api`), as `docs/system-map.md` describes. A build with a local URL breaks
  for every user who installs it.
- Never run `prisma migrate reset`, `migrate dev` or a seed against anything but a local database.
- Test data uses `.test` email addresses and the `uit_` / `ui_tester` usernames; clean-up SQL is in the system
  map.

## Rules learned from production

Each comes from a real incident; the story is in `docs/production-lessons.md`. Add to both when a fix lands for
something production showed first. None yet.

## Rules from bugs already found

Each comes from a fixed bug; the story is in the build note named. Production has not yet shown them first, so
none is in `docs/production-lessons.md`.

- Date-only values (`YYYY-MM-DD`, availability, move-in) are calendar dates: read the date part, never convert
  through local time ([bug audit](docs/build/2026-10-29-bug-audit.md), B10).
- Never hard-code a month, a year or "today" into a filter; compare real dates (B1).
- Missing data must not look like a bad value: hide a pill or field that has no data instead of showing 0 or N/A
  (B6).
- Hide an empty state while its list is still loading (B3).
- List every value a `useMemo` or `useEffect` reads in its dependencies (B8).
- Never open a native window on Android for a sheet or dialog (`Modal`, an `@expo/ui` sheet): it shows the hidden
  navigation bar. Use `DSheet`, `InWindowModal` or `appAlert`, which draw in the app's window (plan 07, TR-041).
  Sheet content renders under the root through a portal: no screen-scoped navigation hooks inside it.
- On iOS, inside the native `@expo/ui` sheet (`DSheet`), never use `GestureHandlerRootView` (it crashes) and do
  not rely on gesture-handler gestures (they never fire); use `Pressable` or the React Native responder props
  ([native navigation](docs/build/2026-11-09-native-navigation.md)).
- A loader that a focus effect depends on must not depend on state it sets; read that state through a ref.
  Otherwise every failure re-runs it without pause ([triage leftovers](docs/build/2026-11-10-triage-leftovers.md)).
- On Android, a field at the bottom edge is lifted with `useAnimatedKeyboard({ isNavigationBarTranslucentAndroid: true })`.
  `KeyboardAvoidingView` and the hook without the flag take the hidden navigation bar's height off the keyboard's,
  so the field stays partly under it. Check after a full restart: a fast refresh keeps the old keyboard listener
  ([chat keyboard](docs/build/2026-11-10-chat-keyboard.md)).
- Defer post-focus work with `runAfterTransition()`, not `InteractionManager`
  ([performance note](docs/build/2026-10-29-ui-performance-tab-jank.md)).

Rules are also removed: when one stops applying (a tool gets installed, a library changes), delete it in the
same pull request that makes it obsolete, so this file only holds rules that still bite.

General rules this way of working starts with:

- For a production-only failure, get the real error first (the log line, the database's own reason). Don't fix a
  guess.
- Green tests are not done. Run the whole journey on the phone, including the way back, with ordinary data and
  awkward data (long names, accents, empty lists, a city with no content).
- Test lists at the size of the busiest city, not only with the seed data.
- What leaves for a third party (Cloudinary, Google, Expo push, email) is checked in the real request: it must not
  carry a session cookie or more personal data than needed.
