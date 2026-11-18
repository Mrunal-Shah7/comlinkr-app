# Handover

_Where the work stopped and how to pick it up. Newest first; the next session reads the top entry before anything
else. Keep old entries short: what was done and where it is written._

Older entries are in [handover-archive.md](handover-archive.md).

## In progress

_One line per open branch: branch, task, what is left. Removed when the branch merges._

- `fix/ios-ui-batch` (TR-057 to TR-062, plan 19): six fixes from the owner's iPhone screenshots, walked on
  Android, pull request open; left: the owner's iPhone check of the tab bar and the Ask sheet, then merge.

## 2026-11-19 - iOS fixes from the owner's screenshots (TR-057 to TR-062)

- **What:** tab bar kept opaque on iOS, "ComLinkr" in the word mark, the blank Ask sheet on iOS, chat day labels,
  the room form's currency symbol, and an optional "Looking for" community on spare rooms (plan 19, new column).
  [Build note](build/2026-11-19-ios-ui-batch.md), [run log](device-runs/2026-11-19-ios-ui-batch.md).
- **Branch:** `fix/ios-ui-batch` from `origin/main`: the local `main` lacked two commits from another developer.
  The previous session's uncommitted `CLAUDE.md` and handover edits are committed on this branch.
- **Still running:** backend on 4000 (email off) and Metro on 8083 with the local API, started from this session.
  **Phone:** the Motorola, Expo Go, signed in as Rohan (demo); no setting changed.
- **Slowed down by:**
  - The OnePlus named in the notes has no Expo Go any more; the Motorola on USB has it, and the owner chose it.
    Which phone is current is the owner's call, so it is not a rule yet.
  - The local `main` was behind `origin/main`; fetch before branching. Now a rule in `CLAUDE.md` (Tools).
  - A heredoc with a large Python script failed in the Bash tool; writing the script to a file worked.

## 2026-11-15 - Chicago demo data for the promo video screen recordings (no code change)

- **What:** a HyperFrames prompt for a 40 s vertical promo, and Chicago demo content in the **local** database
  so the six screens to record are full. Nothing in the repository changed apart from this entry and `CLAUDE.md`.
- **Seed:** `D:ComLinkrideo-demoseed-chicago-demo.js` (outside the repository; run from `backend/`, refuses
  any database but local `comlinkr`; re-running replaces the data). 22 people with `@demo.comlinkr.test` emails
  and real-looking usernames (they show on screen), 10 listings, 5 rooms, 8 restaurants, 6 events, 7 stories
  (expire after about 23 h: re-run before recording), 3 quests, 8 posts, 6 Q&A threads, 3 polls, one chat. Photos
  are Unsplash URLs. Sign-in: `rohan@demo.comlinkr.test`, password in `D:ComLinkrideo-demodemo-account.txt`.
  Clean-up: `DELETE FROM "User" WHERE email LIKE '%@demo.comlinkr.test'; DELETE FROM "CommunityPoll" WHERE city = 'Chicago';`
- **Still running:** backend (`RESEND_API_KEY=` empty) on 4000 and Metro on 8083 with the local API, started
  from this session. **Phone:** Expo Go signed in as Rohan (demo account), dark mode; no setting changed. Expo Go's
  Tools button was turned off for the recordings and turned back on.
- **Recordings:** six clips (1080×2408, 60 fps) in `D:ComLinkrideo-demoscreens`, made with scrcpy while
  adb input drove the app; Explore and Food are joined from segments kept in `screenssegments`. They left a
  saved listing, a poll vote, a Q&A upvote and a pending request to Aditya; re-running the seed resets them.
- **Slowed down by:**
  - A password with `_` and `!` typed through MCPier was refused every time; letters and digits worked. Now a
    rule in `CLAUDE.md` (Tools).
  - When `uiautomator dump` fails, `cat /sdcard/u.xml` prints the previous screen's dump, which looked real. Now
    in `CLAUDE.md` (Tools): remove the file before dumping.

## 2026-11-15 - the backend deploys from GitHub Actions (TR-056, PRs 47 to 50)

- **Merged:** PR 47 (the `ponytail` project skill), PR 48 (`.github/workflows/deploy-backend.yml`, T-001),
  PR 49 (after-merge docs), PR 50 (load nvm in the deploy script). PRs 48 to 50 were opened and merged through
  MCPier's `github` server.
- **Pipeline live:** merging a change to `backend/**` now tests and deploys to production. First success:
  run 43639906602, attempt 2. Getting there took the owner adding the secrets, the deploy key to
  `~ubuntu/.ssh/authorized_keys`, and `%40` for the `@` in the VPS database password
  ([build note](build/2026-11-15-backend-deploy-workflow.md), [lessons](production-lessons.md)).
- **Left for the owner:** delete `~/.ssh/comlinkr_deploy` on the VPS if still there; remove the old
  `github-actions-deploy` key once the old repository's workflow is disabled; prune `~/backups/` now and then;
  TR-055 (Google sign-in SHA-1) and plan 18's questions are still open.
- **Still running:** nothing. **Phone:** not used.
- **Slowed down by:**
  - Every deploy failure needed the owner to paste the job log: the MCPier GitHub server has no Actions tools and
    the logs API needs a sign-in. Now in `CLAUDE.md` (Tools, GitHub).
  - nvm and the unencoded password, both only visible on the real server. Now rules in `CLAUDE.md`, "Rules
    learned from production".

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
