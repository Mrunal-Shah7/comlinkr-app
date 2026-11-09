# Handover archive

_Older entries moved from [handover.md](handover.md), newest first. Read only when the history of a piece of
work is needed; the build notes and triage hold the details._

## 2026-11-09 (earlier) - native navigation and controls (TR-012)

- Owner: replace design D's tab pager, floating tab bar, zoom transitions and custom controls with the native ones.
  [Plan 02](plan/02-native-navigation.md), [build note](build/2026-11-09-native-navigation.md), walked on the
  OnePlus ([run log](device-runs/2026-11-09-native-navigation.md)).
- New rule in `CLAUDE.md`: no `GestureHandlerRootView` or gesture-handler gestures inside the native sheet (`DSheet`).
- Not checked: iOS, a release build, the other sheets one by one, the story viewer animation.
- Servers: backend and Metro started this session; Metro stopped at the end, backend left running.

## 2026-11-08 (earlier) - Expo skills audit (TR-011)

- GitHub default branch switched to `main` (owner asked; done in the browser).
- Every rule of the installed Expo skills checked: [build note](build/2026-11-08-expo-skills-audit.md). Fixed on
  `chore/expo-skills-audit`: one lock file, nine SDK 57 patch bumps, an unused dependency, `.value` → `.get()`/`.set()`
  (31 files), `expo-image` in four admin screens, `expo-status-bar` in the story viewer, the iOS 120 fps key.
  Walked on the OnePlus (fourth round of [the run log](device-runs/2026-11-08-expo-review.md)).
- **Before the next `eas update`:** build a new binary. The native patch bumps are not in the 1.0.4 builds, and
  `runtimeVersion` follows `appVersion`.
- Next candidates (reported, not fixed): `keyboardShouldPersistTaps` on 16 forms; axios; `Dimensions.get`.
- Metro stopped; backend left running as found.

## 2026-11-08 (earlier) - last Expo review checks

- Walked "Type instead" on the signature pad (pass). `ListingCard` turned out to be rendered nowhere; it and
  `MemoListingCard` are deleted (`chore/remove-unused-listingcard`). The news skeleton pulse could not be seen
  (below the fold for about a second; adb screen recording refused on the OnePlus). Third section of
  [the run log](device-runs/2026-11-08-expo-review.md).
- Still not checked anywhere: pinch-to-zoom (needs two fingers), iOS, a release build. ESLint does not run.
- Metro stopped; backend left running as found.

## 2026-11-08 (later) - on GitHub; signature pad walked and fixed

- The repository is on GitHub (`Mrunal-Shah7/comlinkr-app`, public). `feature/design-d` went into `main` through
  pull request 1 and the Expo skills (`.claude/skills/`, `skills-lock.json`) through pull request 2. No deploy runs
  from this repository yet (`backend/.github/` is not read by GitHub).
- Signature pad walked on the OnePlus: a tap left no dot; fixed on `fix/signpad-tap-dot` (first point in `onBegin`).
  Explore news without `LayoutAnimation` walked. Run log: second section of
  [device-runs/2026-11-08-expo-review.md](device-runs/2026-11-08-expo-review.md).
- For the owner on GitHub: set the default branch to `main` (it is `feature/design-d`); decide public or private;
  delete the merged branches.
- Servers: Metro stopped; the backend left running as found.

## 2026-11-08 (later) - Expo review, second round; no pull request possible

- **Owner:** "Open the PR and merge it as well. Once that is done, proceed with the next items."
- **Blocked:** this repository has no `origin` remote and `gh` is not installed, so nothing was pushed and no pull
  request exists. Nothing was merged (no `development` branch exists; `main` takes changes only through a pull
  request). To do: create the GitHub repository, add it as `origin`, push `main` and `feature/design-d`, then open the
  pull request into `development` (or `main` if `development` is not created).
- **Done:** `SignPad` on Gesture Handler with the path on the UI thread; `LayoutAnimation` removed from Explore.
  "Second round" in [the build note](build/2026-11-08-expo-review.md). Committed on `feature/design-d`.
- **Not checked:** the signature pad on a phone (the Motorola connected this time was PIN-locked). Steps are in the
  build note.
- **Servers:** Metro stopped; the backend was left running as found.

## 2026-11-08 - Expo review of the mobile app on `feature/design-d` (TR-010)

- **Owner, 2026-11-08:** review `frontend/` against the Expo skills, fix the clear bugs and the clean-up, then start
  the refactors; walk on the phone; continue unattended. First, commit the uncommitted animation-timing work
  (done: `18788bb`, and the D: release script `3f8ba27`).
- **Done:** [build note](build/2026-11-08-expo-review.md), [run log](device-runs/2026-11-08-expo-review.md), review 08
  "Update 2026-11-08". Commits `d414423` (bugs), `4a07c79` (unused files), `79babe3` (gestures and animations on
  Gesture Handler / Reanimated), `193be40` (the restored `app/app/*` bridge routes, with these docs), then a
  docs-only commit. Nothing pushed, no pull request.
- **Not checked:** pinch-to-zoom (adb has one finger), `ListingCard` (admin screen only), the news skeleton pulse,
  iOS, a release build. ESLint does not run in the mobile app (no dev dependency).
- **Next, if wanted:** `SignPad` off `PanResponder`; data fetching onto React Query; hard-coded colours onto theme
  tokens. Full list under "Reported, not fixed" in the build note.
- **Left untracked on purpose:** `.claude/skills/` and `skills-lock.json` (the Expo skills install); the owner decides
  whether they belong in the repository.
- **Servers:** Metro (port 8083) stopped at the end; the backend was already running before the session and was left
  running.

## 2026-11-06 - design D full match on `feature/design-d` (plan 01)

- **Owner, 2026-11-05:** every screen must match design D, motion included, and the phase 2 behaviour changes
  are in ("Yes, include them now").
- **Done:** see [the build note](build/2026-11-06-design-d-full-match.md) and the tracker in
  [plan 01](plan/01-design-d.md). Two optional API fields and migration `20261105000000_story_general_category`
  (applied to the local databases only). One commit per screen; nothing pushed, no pull request.
- **Partly built:** card-to-detail expand on Explore event tiles only; the guest city picker is rebuilt but not walked.
- **Not walked:** listed in the build note (onboarding, badges, most composers, landlord, My posts Undo, gallery,
  story viewer, scanning, Ask, upvotes, All events). Light mode not checked on anything new. No screen-by-screen
  comparison with the prototype.
- **Before a pull request:** check the production PostgreSQL version (12 or later for the enum migration);
  update the system reviews (`docs/system-review/`, sections "Update 2026-11-06" added with the moved
  interactions, still to be read through by the owner); walk the screens not walked; confirm
  `frontend/apps/mobile/.env` still points at production; the owner's go-ahead to push.
- **Known failing test, not from this branch:** `test/sprint54/stories-listing-reason.e2e-spec.ts` (listing
  moderation) fails with `main`'s code too.
- **Servers:** stopped at the end.

## 2026-11-05 (latest) - design D phase 1 built on `feature/design-d` (plan 01)

- **State:** of the plan's 57 tracker rows, 40 are rebuilt and seen on the phone, 9 rebuilt but not walked, 2
  partly rebuilt (Apply for a badge, the tenancy agreement) and 6 on the base coat (RSVP sheet and ticket, city
  picker, and the dark-on-purpose gallery, story viewer and door check-in). One commit per screen, nothing pushed,
  no pull request. Build note (with the motion the design has and phase 1 lacks):
  [build/2026-11-05-design-d-phase-1.md](build/2026-11-05-design-d-phase-1.md). Run log: the second section of
  [device-runs/2026-11-05-design-d.md](device-runs/2026-11-05-design-d.md).
- **Not walked:**
  - the seven composers other than News;
  - the RSVP ticket and the sign-up step of the RSVP sheet;
  - restaurant review, the question answers view, the story viewer (no stories in the seed);
  - badge upload and send;
  - the sign-up code step (same `OtpBoxes` as reset password, which was walked).
- **Still on the base coat inside rebuilt screens:**
  - the roommate-preferences sheet in My profile;
  - My posts' detail and edit sheets;
  - My restaurants' manage sheet;
  - a conversation's group info and emoji picker;
  - the step bodies of Apply for a badge and the tenancy agreement;
  - the detail sheet in `app/events.tsx`.
- **Next:**
  - the owner reviews on the phone;
  - then phase 2, the behaviour changes in the plan;
  - triage TR-006 to TR-009, found on the way and none caused by this work.
- **Before a pull request:** check that `frontend/apps/mobile/.env` still points at production (it was not
  edited); walk the journeys not yet walked; check a detail page, a sheet and sign-in in light mode; update the system
  reviews in `docs/system-review/` for the interactions that moved (edit, delete and report in ··· menus, the Dark
  mode row in Settings, fewer profile shortcuts, "Show results" in filters, the composer chooser without tips); get the
  owner's go-ahead to push.
- **Servers:** backend and Metro were stopped at the end. To walk again, start them as in
  [device-testing.md](device-testing.md) (backend with `RESEND_API_KEY=` empty and `NODE_ENV=development`; Metro with
  `EXPO_PUBLIC_API_BASE_URL` set to the local API for the process, port 8083).
- **Lesson:** build `RegExp` patterns in a script file with escaped `|`; an unescaped one put text at the top of the
  plan (repaired in `d7fb062`).

## 2026-11-05 (earlier) - building design D, phase 1 in progress (plan 01)

- **Stopped here (usage limit).** Done and checked on the phone: foundation, navigation (zoom stack, floating tab bar, + sheet), Explore tab (all five sub-tabs), Listings tab (homes, rooms, roommates). Food tab restyled and type-checked but **not yet checked on the phone** (last commit). Not started: Community tab, all detail screens and modals, the You screens, sign-in and onboarding, the composers. Backend and Metro were stopped.

- **Where:** branch `feature/design-d` (from base commit `6720646` on `main`). Commits so far: `bb696fe`
  foundation (palette, fonts, motion kit, ZoomStack, floating tab bar, + sheet), `fb739c8` Explore part 1
  (header, bento, chips, news cards), then Explore fixes and tab-bar clearance on the other tabs.
- **Checked on the phone:** foundation, navigation, Explore header, bento, News. Log:
  [device-runs/2026-11-05-design-d.md](device-runs/2026-11-05-design-d.md) (includes an accidental Play Store
  visit, nothing changed).
- **Next, in order:** Explore's Events, Stories, Quests, Polls and neighbour-post cards, then the event detail,
  RSVP, ticket and story viewer; then Listings, Food, Community, the "You" screens, the composers (phase 1 =
  restyle only). Check light mode once per section. Build note in `docs/build/` when phase 1 is finished.
- **How screens are restyled:** use `src/shared/d` (PressableScale, GradientButton, SoftButton, Chip,
  Segmented, BentoTile, Reveal/TileIn, useShake, DSheet), `src/theme/d.ts` (TYPE, body(), display(), RADIUS,
  GRADIENT) and `tc.*` tokens; scroll lists in tabs add `tabBarClearance(insets.bottom)`. Decisions are in the
  plan's "Decided while building".
- **Running:** backend (`pnpm start:dev`, email off) and Metro (port 8083, local API, Fast Refresh on) in this
  session's background; phone has `adb reverse` 4000/8083, Expo Go signed in as `ui_tester`. Driving helpers
  (`shot.sh`, `t.sh`, `app.sh`) live in the session scratchpad.

## 2026-11-05 (later) - design D is C in the brand gradient

- The owner likes C best. The first D (a new design from the brand colours) was deleted. The new D,
  `d-night-market-gradient.html`, is built from C's own sources plus `src/d.css`, which only recolours: violet →
  #1A6BAE, mint and pink → #30855B, gradients → #1A6BAE → #257A86 → #30855B, greys → blue-grey. C's confetti now
  reads optional colour variables (C looks the same). All 52 screens open with no console errors, light and dark
  checked. Nothing committed.

## 2026-11-05 - design review and three redesign proposals (TR-005)

- Walked Explore, Listings, Food, Community, details, menu, profile, messages, notifications and two composers on
  the phone (Expo Go, local backend, `ui_tester`, read only: nothing posted or changed). Read the composers and the
  backend create DTOs. Findings: [design review](review/2026-11-05-design-audit.md).
- Built three clickable proposals in [design/2026-11-05-redesign/](design/2026-11-05-redesign/README.md)
  (A Clarity, B Paper, C Night Market), each with every screen of the four sections, the shared screens and all
  composers, plus motion. Checked in the browser pane: every screen opens with no console errors; tab drag,
  sheets, OTP and the composers work. Not checked on a real phone browser.
- **Waiting for the owner** to choose a design; then write the plan in `docs/plan/`. Story "title optional"
  needs a backend change (noted in the design README).
- Backend and Metro were stopped after the walk. Nothing committed.

## 2026-11-04 (later still) - TR-002 fixed

- `HamburgerMenu.tsx`: the menu refreshes sidebar data only when signed in. Checked on the phone: no requests on a
  guest menu open (six 401s before), sidebar data still loads when signed in. [Build note](build/2026-11-04-TR-002-guest-menu-401s.md).
- Metro was restarted (still port 8083, local API, background). Phone signed in as `ui_tester`. Not committed.

## 2026-11-04 (later) - first smoke run on the phone

- Ran the smoke checklist on a OnePlus Nord CE4 (Android 16) over wireless debugging, in Expo Go, through MCPier's
  `android` server, against the local backend: 13 of 14 pass, S-09 partial. [Run log](device-runs/2026-11-04-00-smoke.md).
- Triage TR-001 to TR-004 opened ("N/A" for missing values, 401s from the guest menu, the ticker after sign-out, the
  navigation bar in light mode). Review 04 corrected: the Food chips are defined but never rendered. Reviews 01, 02,
  03, 04, 06 and 08 have an "Update 2026-11-04" section. The device-testing guide now holds the working setup and
  what went wrong while driving the phone.
- **Running:** the backend (`pnpm start:dev`, email off) and Metro (port 8083, local API) are still running in
  this session's background; the phone has `adb reverse` for 4000 and 8083 and is signed in as `ui_tester` (it was
  `auditadmin` before the run). No database data was changed.
- Nothing committed.

## 2026-11-04 - one repository and the docs system

**Done.**

- `backend/` and `frontend/` moved from `comlnkr/code/` into `C:\Users\shahm\Desktop\Codes\comlinkr-app`. Fresh
  git repository (`main`), **nothing committed**. Old `.git` folders kept in `comlnkr/old-git/`. Details and checks:
  [build note](build/2026-11-04-combined-repository.md).
- Dependencies reinstalled at the new path. Backend: type check clean, 80 / 80 unit tests. Mobile: type check has
  one error after the reinstall (`import type` from `expo-modules-core` in `src/services/audioPlayback.ts`; the
  running app is not affected), cause unknown, not fixed.
- App docs rewritten because they were out of date: `frontend/README.md`, `frontend/CONTRIBUTING.md`,
  `frontend/apps/mobile/README.md`; `frontend/.gitignore` repaired.
- Docs written: `README.md`, `CLAUDE.md`, and `docs/`: index, [system map](system-map.md),
  [device-testing guide](device-testing.md), eight [system reviews](system-review/README.md) (from the
  2026-10-29 docs and audit, mostly **[code]**), a smoke checklist and a Listings checklist, and empty triage,
  plan, review, device-run and production-lesson files with their formats.
- Found while writing: only `AuthGuard`, `OnboardingGuard` and `ThrottlerGuard` are global; `BadgeGuard` is used
  nowhere (review 08). Every EAS profile points at production. The backend deploy workflow does not run from this
  repository.

**In progress.** Nothing half done.

**Running.** Nothing. No servers started; no phone connected.

**Waiting on the owner.**

- The first commit, and creating the GitHub repository for this folder.
- The questions in [README.md](README.md#questions-for-the-team).
- Whether to fix the mobile type-check error.

**Next.** In order: commit and push (owner); the later-work items T-001 to T-004 in the index (deploy wiring, a
local build that cannot reach production, a full seed, scrcpy-mcp set up); then the first smoke run on the phone.
