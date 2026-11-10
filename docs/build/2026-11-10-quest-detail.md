# 2026-11-10: A quest's own page (TR-038, plan 10)

Branch `feature/quest-detail`, from `feature/chat-delete`. Merged as pull request 30 (merge `73f31ec`), reaching `main` with PR 24.

## Problem

Quests were only cards: no page, no list of who joined, no way to leave. The words switched between "quest" and
"challenge", and the empty Quests tab showed "Start a quest" twice ([plan 10](../plan/10-quest-detail.md)). The
cards also never showed the real count: they read `participantsCount`, while the API sends `participantCount`.

## Change

- **API:** `DELETE /challenges/:id/join` (`ChallengesService.leaveChallenge`). One transaction: remove the
  membership, and decrement only when one was removed (never below 0). 400 for the author and for an ended quest,
  404 for an unknown one, 401 without a session.
- **App:**
  - `app/quest/[id].tsx` (new): the page, built on `DPage`; Join, Leave (confirmed with `appAlert`), Share with a
    link; full, ended and host states. Back goes to where it was opened; a cold link goes back to Explore.
  - `QuestCard` opens the page on tap; Join stays on the card. Explore refetches quests on focus (a fresh cache
    entry costs no request); joining or leaving marks the cache stale.
  - Links: `comlinkr://quest/:id`, and `openQuest` in shared links (`+native-intent.ts`, `shareLinks.ts`).
  - `participantCount` read everywhere (card, Explore tile, after joining).
  - Words: compose labels, preview, publish button ("Start quest"), success ("Quest started!"), compose sheet,
    templates and My posts say "quest". API and code names unchanged.
  - The button above the quest list shows only when there are quests; the empty state keeps its own.
- **Tools (`CLAUDE.md`, `docs/device-testing.md`):** Metro needs `GOOGLE_SERVICE_INFO_PLIST` pointing at a
  placeholder plist, or every cold start fails in Expo Go; `uiautomator dump` cannot dump Explore.

## How it was checked

- Backend: `tsc`, lint, unit 115, e2e 54, including three new tests (`test/design-d/quest-leave.e2e-spec.ts`):
  leave, leave twice, a non-member, re-join; the author, an ended quest, an unknown id; a full quest freed.
- Mobile: `pnpm typecheck`.
- Phone (OnePlus, Expo Go, local backend), as a test account, with test quests created through the local API:
  - the card shows "1 of 3 joined" and its bar before joining; tap opens the page; Join (2 of 3, "You" listed,
    Leave quest); Back: the card says Joined, 2 of 3, and the Explore tile "QUEST · JOINED";
  - Leave: Cancel changes nothing; Leave goes back to 1 of 3 and Join quest; the database count is 1;
  - a cold link opens the page; Back goes to Explore;
  - a full quest (two other test accounts joined): "This quest is full", disabled, three people listed;
  - a quest started by the phone's account: "Started by you", "You started this quest";
  - the empty Quests tab: one "Start a quest".
- The guest view was checked against the API only (page 200 without a session, leave 401).
- The test quests were deleted afterwards.

Not checked: iOS; the freeze after "Done" on a new quest (E-37) did not come up, since no quest was created in the
composer on this walk.
