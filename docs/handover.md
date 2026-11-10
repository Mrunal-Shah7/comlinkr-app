# Handover

_Where the work stopped and how to pick it up. Newest first; the next session reads the top entry before anything
else. Keep old entries short: what was done and where it is written._

Older entries are in [handover-archive.md](handover-archive.md).

## In progress

_One line per open branch: branch, task, what is left. Removed when the branch merges._

- `chore/docs-cleanup`: the animate-expo skill, plan 06 (the walkthrough's decided changes), stale triage rows (TR-002, TR-006, TR-018). Left: the owner's merge.
- `fix/triage-sweep` (from `chore/docs-cleanup`), the open triage bugs: TR-003, 007, 009, 030, 033 (migration), 035 (part) done, build note written. Left: the owner's review; the rest of the open rows go on a later branch.
- `feature/in-window-sheets` (from `fix/triage-sweep`), TR-041, TR-019, TR-020, plan 07: built and checked on the phone (profile menu, Post sheet, filters, keyboard, dialogs, settings modal). Built, walked on the phone, build note written. Left: the owner's review.
- `feature/gps-city` (from `feature/in-window-sheets`), TR-042, plan 08: built, tested, walked on the phone. Left: the owner's review.
- `fix/triage-leftovers` (from `feature/gps-city`), TR-035, TR-040, lint: built, build note written. Left: the owner's review.
- `feature/chat-delete` (from `fix/triage-leftovers`), TR-039, TR-044, plan 09: built, tested, walked on the phone, build note written. Left: the owner's review.
- `feature/quest-detail` (from `feature/chat-delete`), TR-038, plan 10: quest page, leave, wording; built, tested, walked, build note written. Left: the owner's review.

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

## 2026-11-09 - docs checks and tooling rules (TR-025, PR 21)

- Merged into `main` as PR 21.
- `CLAUDE.md`: Tools (MCPier `android` for the phone, adb fallback, Claude in Chrome for PRs since `gh` is not
  installed), After a merge, "In progress" in this file, "Slowed down by:" on every entry, removing stale rules,
  and Checks on the docs ([build note](build/2026-11-09-docs-tooling.md)).
- `scripts/check-docs.mjs`, run by hooks at session start and before `git push`. Its first run found five merged
  tasks still marked built and three build notes without their PR; all fixed.
- Older handover entries moved to [handover-archive.md](handover-archive.md).
- Slowed down by: finding how earlier PRs were opened (`gh` missing, searched the old session log); now in Tools.

## 2026-11-09 - back history (TR-023, PR 20)

- Merged into `main` as PR 20 (`0ec3a44`): tab history and in-screen undo on Android Back
  ([build note](build/2026-11-09-back-history.md)).
- Edge swipe not confirmed: injected swipes (adb and scrcpy) do not trigger the system gesture. Try it by hand.
- Not walked: admin screens, chat, events, help, landlord dashboard, my posts, my listings, notifications, check-in.
- Found: TR-024, the Listings Pets filter returns 400.
- Phone back on three-button navigation. Backend and Metro still running at the time of writing.

## 2026-11-09 (earlier) - the three open Expo-skill points (TR-017)

- All three merged into `main`:
  - PR 16, point 4: the news article as a route with `GET /news/articles/:id`
    ([build note](build/2026-11-09-news-article-route.md)).
  - PR 17, point 2: sheets moved to `DSheet`, which now sizes itself on Android; the post preview and the photo
    gallery are modal routes ([build note](build/2026-11-09-native-sheets.md)).
  - PR 18, point 1: palette colours follow dark mode through a fallback in `createThemedStyles`, 15 stylesheets moved
    onto it (colour only) and `usePaletteColor()` ([build note](build/2026-11-09-dark-mode-palette.md)).
- Logged for later: TR-018 (editing a room overwrites its description), TR-019 (ten files still render `Modal`),
  TR-020 (first tap after a sheet closes is lost).
- Not walked: iOS for all three; the login, sign-up and forgot-password screens in dark mode (the `ui_tester`
  password is not in the repository); pinch zoom in the gallery.
- `ui_tester` is USER and in light mode. Metro and the backend stopped at the end.

## 2026-11-09 (earlier) - admin reports filter and Data privacy crash (TR-015)

- `fix/admin-reports-privacy`: `/admin/reports` accepts `status` (default PENDING); `/admin/privacy-requests`
  filters by `status` / `type`; the Data privacy screen uses the API's snapshot fields and real enums.
  [Build note](build/2026-11-09-admin-reports-privacy.md).
- E2e `sprint54/stories-listing-reason` was out of date against SEC-04; updated on `chore/e2e-listing-visibility`
  (TR-016, [build note](build/2026-11-09-e2e-listing-visibility.md)). The backend e2e suite now passes 45/45.
- `ui_tester` back to USER; servers stopped.
