# 2026-11-10: Marking a quest done (TR-052, plan 17)

Branch `feature/quest-progress`, from `feature/follow-requests`. Merged as pull request 40 (merge `f9c777e`), reaching `main` with PR 24.

## Problem

A quest had a goal but no per-person progress (plan 10). Joining was the only state, so nobody could say they
finished. The owner said "resolve it" on 2026-11-10, and Claude chose self-reported completion
([plan 17](../plan/17-quest-progress.md)).

## Change

- **Backend:**
  - **Migration `20261110220000_quest_progress`:** `ChallengeParticipant.completedAt` (nullable).
  - **`POST /challenges/:id/complete` and `DELETE /challenges/:id/complete`** (`ChallengesService.setCompleted`):
    - only members can call them, the host included; anyone else gets 403;
    - only while the quest runs, the same rule as leaving; after the end, 400;
    - a second call changes nothing, and the first time stays;
    - the answer is `{ completed, completedCount }`.
  - **Every quest response** (list, detail, create) adds:
    - `completedCount`, a filtered `_count` of members with `completedAt`;
    - `isCompleted`, for you.

    The detail adds `completedAt` per person.
  - **Leaving** deletes the membership, so the completion goes with it. Joining again starts not done.
  - **No notification:** the host is not told when someone finishes.
- **App:**
  - **`challenges.api.ts`:** the new fields are optional, for older servers; adds `setChallengeCompleted`.
  - **`quest/[id].tsx`:**
    - **Footer for a member while it runs** (the host included): "Mark as done", or "Done · Undo" once marked.
      Members who are not the host also get Leave.
    - **Footer after the end:** "You finished this quest", or "This quest has ended".
    - **Page:**
      - the count reads "N joined · M done", with no "0 done" (rule B6);
      - people marked done get a Done mark;
      - the tag reads Done.
    - **The leave confirm** says leaving takes the "done" back.
  - **`QuestCard.tsx`:** "· M done" on the joined line, and "Done" instead of "Joined" on the button.

## How it was checked

- **Backend:** `tsc`, lint on the changed files, unit tests 124, e2e tests 77.
  - **`quest-progress.e2e-spec.ts`** (new, 3 tests):
    - mark done and undo;
    - a second call keeps the first time;
    - the counts in the list and the detail, for the member and the host;
    - the host can mark done;
    - leaving drops a completion, and joining again starts not done;
    - a non-member gets 403, an ended quest 400, an unknown one 404, and signed out 401.
- **Mobile:** `pnpm typecheck`.
- **Phone** (OnePlus, Expo Go, local backend), as `uit_gps1`, on a quest `uit_hannah5` started through the API:
  - **Join:** the footer showed Mark as done and Leave.
  - **Mark as done:**
    - "2 joined · 1 done", and a Done mark by "You";
    - the database had `completedAt` set.
  - **Explore → Quests:** the card read "2 joined · 1 done", and its button "Done".
  - **Done · Undo:** back to "2 joined" and Mark as done; the database had none done.
  - **Mark again, then Leave:**
    - the confirm said leaving takes it back;
    - after leaving, "1 joined", Join quest, and only Hannah's membership left.
  - **Rewording:** the confirm's wording and the "Done" tag were changed after the first pass, then checked again.
- **Clean-up:** the quest was deleted through the API, and its members went with it.

## Not checked

- The host's own Mark as done on the phone (e2e covers it).
- An ended quest you finished, on the phone ("You finished this quest").
- iOS.
