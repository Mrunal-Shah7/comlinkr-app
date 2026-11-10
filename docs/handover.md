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
- `feature/event-edit` (from `feature/quest-detail`), TR-037, plan 11: event edit and cancel, the city's day; built, tested, walked, build note written. Left: the owner's review.
- `feature/move-in-rules` (from `feature/event-edit`), TR-036, plan 12: move-in not before the home is available; the offer after the landlord approves; built, tested, walked, build note written. Left: the owner's review.
- `feature/nearby` (from `feature/move-in-rules`), TR-032, plan 13: restaurant addresses geocoded on the server; Nearby asks for the phone's position and measures on the phone; built, tested, walked, build note written. Left: the owner's review.
- `feature/follow` (from `feature/nearby`), TR-029, plan 14: follow and unfollow, counts, the Follows screen, a notification; built, tested, walked, build note written. Left: the owner's review.
- `fix/chat-request-accept` (from `feature/follow`), TR-043: Accept ends the request in the open thread; built, walked, build note written. Left: the owner's review. TR-045 (composer under the keyboard) found, open.
- `chore/brand-comlinkr` (from `fix/chat-request-accept`), TR-046: "ComLinkr" everywhere a user reads it; build note written. PR 36. Left: the owner's review.
- `fix/sign-after-approval` (from `chore/brand-comlinkr`), TR-048: the server refuses a signature before approval; build note written. PR 37. Left: the owner's review.
- `feature/event-cancelled` (from `fix/sign-after-approval`), TR-047, plan 15: a cancelled event is kept, marked Cancelled; built, tested, walked, build note written. PR 38. Left: the owner's review.
- `feature/follow-requests` (from `feature/event-cancelled`), TR-049, 050, 051, 053, plan 16: follow requests, the Following tab, the switch, the settings reset bug. Built, tested, walked, build note written. PR 39. Left: the owner's review.
- `feature/quest-progress` (from `feature/follow-requests`), TR-052, plan 17: marking a quest done. Built, tested, walked, build note written. PR 40. Left: the owner's review.
- `fix/chat-keyboard` (from `feature/quest-progress`), TR-045: the chat composer above the Android keyboard. Built, walked, build note written. PR 41. Left: the owner's review.
- `fix/walk-leftovers` (from `fix/chat-keyboard`), TR-040 (E-14, L-18): a steady bento, preferences from the roommate list. Built, walked, build note written. PR 42. Left: the owner's review.

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
