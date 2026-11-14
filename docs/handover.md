# Handover

_Where the work stopped and how to pick it up. Newest first; the next session reads the top entry before anything
else. Keep old entries short: what was done and where it is written._

Older entries are in [handover-archive.md](handover-archive.md).

## In progress

_One line per open branch: branch, task, what is left. Removed when the branch merges._

- `chore/docs-app-1-0-6` (TR-054, TR-055): docs for commit `60cdd7b`, written; left: push, pull request, merge.

## 2026-11-15 - docs for app 1.0.6 (commit `60cdd7b`, pushed without a PR)

- **What happened:** a developer pushed `60cdd7b` (app 1.0.6) straight to `main` on 2026-11-14: the Community tab
  renamed Q&A, topics matched on the phone, four Explore tiles and Food's "Rated 4.5+" tile hidden, a bigger logo,
  the header avatar without its ring, and EAS build fixes (Google Services file from `GOOGLE_SERVICES_JSON`,
  hoisted `node_modules`, the Metro transformer). No docs came with it.
- **Docs written afterwards** on `chore/docs-app-1-0-6`: TR-054 and TR-055 in triage,
  [plan 18](plan/18-qa-tab-and-lighter-explore.md) (four questions for the owner),
  [build note](build/2026-11-14-app-1-0-6.md), updates to reviews 01, 02, 04, 05 and 08, the system map and
  `CLAUDE.md` (Building and testing).
- **Checked:** mobile `pnpm typecheck` passes at `60cdd7b`; it reinstalled `node_modules` (hoisted) first.
  Nothing of 1.0.6 was walked on the phone, by the author or here.
- **Left for the owner:** register the debug keystore's SHA-1 with Google before trying Google sign-in on a
  release APK (TR-055); answer plan 18's questions.
- **Still running:** nothing. **Phone:** not used.
- **Slowed down by:**
  - A direct push to `main` passes `check-docs`, which only compares docs with merged branches and PRs, so the
    missing docs were found by reading the diff. Not made a rule: the rule that nothing reaches `main` without a
    pull request already exists. The push went through, so GitHub does not enforce it on `main`: branch protection
    is the owner's call.
  - Whether Google sign-in works on the local APK took reading the keystore's SHA-1 and `google-services.json`;
    now in `CLAUDE.md` (Building and testing) and the system map.

## 2026-11-11 - production on this repository, release APK, after-merge docs (PR 43)

- **Production switch** (owner on the VPS, Claude wrote the steps): pm2 `comlinkr-api` now runs this repository's
  `backend/` with `pnpm start:prod`; the nine new migrations ran on the production database; nginx unchanged.
  Checked from outside only (health, Socket.IO, a route only the new code has). Written in `system-map.md`, "How it
  deploys", with the manual deploy steps and the rollback.
- **Release APK:** `D:\ComLinkr\builds\ComLinkr-arm64.apk`, built 2026-11-11 against `https://api.comlinkr.com/api`
  (1.0.4, arm64, debug key, location permissions present). Not installed on a phone. `android/` was regenerated
  with `expo prebuild --clean` (keystore kept): the one used for the 2026-11-09 APK dated from 2026-10-25.
- **Docs:** PR 43 recorded PRs 24 to 42 as merged and wrote down the release APK process (CLAUDE.md, system map,
  build note). This branch, `chore/docs-production-switch`, records the switch and PR 43.
- **Left for the owner:** T-001 (deploy workflow at the root, pointed at the new clone); disable the old
  repository's deploy workflow; ship the new app screens to users (store build or EAS update).
- **Still running:** nothing of this session (the backend on 4003 and Metro on 8085 stopped with the old session).
- **Phone:** no settings changed.
- **Slowed down by:**
  - A stale `expo-updates-gradle-plugin/build` folder in `node_modules`: Gradle called `compileKotlin` up to date
    with no classes on disk and packed an empty jar. `--rerun-tasks` on the jar did not hold; deleting the folder
    did, and `Remove-Item` cannot, past the path-length limit (`rmdir /s /q "\\?\<path>"` can).
  - Not knowing the `android/` folder was out of date: nothing checks it. Both are now in the release APK build
    note, and the prebuild rule is in `CLAUDE.md`, "Building and testing".

## 2026-11-10 - the owner's eight answers, and the rest of the pending list (TR-045 to TR-053)

- Seven branches, each stacked on the one before, are PRs 36 to 42. None is merged. Each has a build note.
  - PR 36 `chore/brand-comlinkr`: "ComLinkr" (TR-046).
  - PR 37 `fix/sign-after-approval`: the server refuses a signature before approval (TR-048).
  - PR 38 `feature/event-cancelled`: a cancelled event is kept (TR-047, plan 15). Migration.
  - PR 39 `feature/follow-requests`: follow requests, the Following tab, the "New followers" switch, and the
    settings reset bug (TR-049, 050, 051, 053, plan 16). Migration.
  - PR 40 `feature/quest-progress`: members mark a quest done (TR-052, plan 17). Migration.
  - PR 41 `fix/chat-keyboard`: the chat composer above the Android keyboard (TR-045).
  - PR 42 `fix/walk-leftovers`: the last TR-040 findings (E-14, L-18), and the review composer opening in owner
    mode; run log of the loose ends in `docs/device-runs/2026-11-10-loose-ends.md`.
- **Owner decisions in chat:** the Following feed gets its own tab; private accounts approve followers; a "New
  followers" switch; keep a cancelled event; refuse an early signature; Nominatim stays as it is; "ComLinkr";
  resolve quest progress.
- **For the owner** (each PR body says more):
  - **Quests:** completion is self-reported, with no proof and no notice to the host. Claude chose this.
  - **Follow requests:** older app builds send a request to a private account but still show "Follow".
  - **Messages:** a declined request is silent. The sender can keep writing and is not told.
- **Not walked, with reasons in the run log:** door check-in (camera), badge submission, story comments and L-06
  (Cloudinary uploads), 403 gating after a real sign-up, the first-time location prompt.
- **Checks:** backend unit 124, e2e 77; mobile tsc; `check-docs` passes.
- **Still running:** backend on 4003 (email off) and Metro on 8085. Not mine and left alone: Metro on 8083.
- **Phone:** no settings changed.
- **Test data:**
  - deleted: the walk's quests, posts, chats, follows, the block and their notices;
  - `uit_gps1` is public again;
  - Hannah's privacy row was removed (she had none before).
- **Slowed down by:**
  - `prisma migrate dev --create-only` run twice: it applied the first migration under today's timestamp and made an
    empty second one. Fixed by renaming the folder and its `_prisma_migrations` row.
  - The API client drops `hasMore` from paged answers: read `meta.page < meta.totalPages`.
  - A fast refresh keeps the old keyboard listener, so the keyboard fix looked like it failed until a full restart.
  - An item inside Explore opened through a route parameter: the stale parameter switched tabs and the same item
    would not reopen. Use a callback.
  - On GitHub's compare page, the first "Create pull request" button only folds the form; `find` once returned the
    previous page's "Merge pull request". Click the visible submit button in the form, after checking the title.
  - The keyboard rule is now in `CLAUDE.md` ("Rules from bugs already found").

## 2026-11-10 - the open triage rows, one stacked PR each (TR-036, 037, 032, 029, 043)

- Five branches, each stacked on the one before, all built, tested and walked on the phone (OnePlus, Expo Go, local
  backend). Each has a build note. None is merged.
  - PR 31 `feature/event-edit`: TR-037.
  - PR 32 `feature/move-in-rules`: TR-036.
  - PR 33 `feature/nearby`: TR-032, plan 13.
  - PR 34 `feature/follow`: TR-029, plan 14.
  - PR 35 `fix/chat-request-accept`: TR-043.
- **Owner decisions in chat:** refuse an early move-in; show the offer only after approval; geocode restaurant
  addresses; ask for location only when Nearby is tapped; build Follow.
- **For the owner** (each PR body says more):
  - **Nearby:** after deploy the backend geocodes restaurants through Nominatim, four a minute. To stop it, set
    `GEOCODING_ENABLED=false` and restart.
  - **Follow:** it does not change the feed; there are no private accounts; "New follower" has no setting.
  - **Events:** a CANCELLED state (PR 31) is your call.
  - **Agreements:** enforcing sign-after-approval on the server (PR 32) is your call.
- **New triage:** TR-045, the Android chat composer half under the keyboard. Two attempts were reverted.
- **Still open from the walkthrough:**
  - fixes not walked again: S-04, E-26, F-15;
  - findings: E-27, L-06 and the rest of TR-040;
  - checks never done: notification preferences, badge submission, door check-in, story comments, 403 gating after
    a real sign-up.
- **Checks:** backend unit 123, e2e 67; mobile tsc; `check-docs` passes.
- **Still running:** backend on 4003 (email off) and Metro on 8085, with the development location in Los Angeles.
  Both outlived their task ids after the session restart. Not mine and left alone: Metro on 8083.
  `adb reverse tcp:4000` points at 4003.
- **Phone:** no settings changed. Expo Go keeps the location permission from plan 08.
- **Test data:** the walk's follows, applications, temporary restaurants, the test chat and their notifications were
  deleted. The restaurants now have coordinates, which is intended.
- **Slowed down by:**
  - a plan linking a build note that did not exist yet: the docs hook then refused every shell call;
  - a stopped Metro task whose node process kept port 8085;
  - `/api` written twice in an e2e URL;
  - the scratchpad API helper cutting responses at 600 characters (now `AS_MAX`).
  - The first two are now rules in `CLAUDE.md` (Tools).

## 2026-11-10 - full walkthrough (TR-028), autopilot overnight

- Walked every section (Explore, Listings, Food, Community), the shared screens and admin on the OnePlus against
  the local backend; 60 bugs fixed (Follow hidden, not fixed), findings recorded. Everything is in [the run log](device-runs/2026-11-10-full-walkthrough.md)
  and [the build note](build/2026-11-10-walkthrough.md). New triage: TR-029 to TR-040. Nothing committed.
- Resend works locally with the key set: sign-up and reset emails were delivered. The old "not working" was the
  documented empty `RESEND_API_KEY`, plus a real bug: SDK errors were never logged (R-03).
- Decided without the owner (they asked for autopilot): Follow hidden instead of built (TR-029); quest and story
  delete added to My posts; event photos deleted with the event; Saved news lists article saves; the owner's local
  account kept (role back to USER, password reset to the same value); admin walk read-only on other people's
  content.
- L-23, F-13 and F-14 change what the product does; the owner decided them in chat, with no plan file.
- Checks: backend tsc, unit 103, e2e 47 pass; lint has 27 errors, all already in the committed code; mobile tsc
  passes; `check-docs` passes.
- Still running: backend on port 4003 (email off, `RESEND_API_KEY=` empty) and Metro on 8085, both from this
  session. The walk's earlier backend (4000) and Metro (8084) were stopped. Not from this walk and left alone: Metro
  on 8083 and three `nest start --watch` from 9 Nov. `adb reverse tcp:4000` points at 4003. No phone setting was
  changed.
- Slowed down by: the login screen closing on a Back sent with the keyboard already down, a mistyped password after
  the field jump, `uiautomator dump /dev/tty` printing nothing, MCPier's 25-call limit, and Metro dying with its
  parent task. All are now rules in `CLAUDE.md` (Tools).
