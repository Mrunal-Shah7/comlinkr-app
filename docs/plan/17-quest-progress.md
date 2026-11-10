# 17. Marking a quest done

**Status: Built on `feature/quest-progress`, not merged; [build note](../build/2026-11-10-quest-progress.md).** Triage
[TR-052](../triage.md). The owner said "resolve it" on 2026-11-10. The design below was chosen by Claude; the owner
can change any of it in review.

## Problem

A quest has a goal ("Visit 3 parks", "Run 5 km") but nothing about each person's progress (plan 10). Joining is the
only state, so nobody can say they finished. The page shows only the time left and how many joined.

## What will change

- **Self-reported completion.** A member says they did it. Nobody checks a proof: quests are informal and set by
  neighbours, and their goals are free text, so there is nothing to verify against.
- **Model:** `ChallengeParticipant.completedAt` (nullable).
- **API:**
  - `POST /challenges/:id/complete` marks you done.
  - `DELETE /challenges/:id/complete` undoes it.
  - A second call changes nothing.
  - Only members can use them, and only while the quest runs (`status` `ACTIVE` and before `endsAt`), the same rule
    as leaving.
  - After the end, the record stays as it was.
- **The host** joins their own quest when they create it (plan 10), so they can mark it done like anyone else.
- **Every quest response** adds:
  - `completedCount`: members marked done;
  - `isCompleted`: you.
- **The detail** adds `completedAt` per person.
- **Leaving** deletes your membership, completion included. The leave confirm says so when you had marked it done.
- **No notification:** the host is not told when someone finishes. A busy quest would send many notices; the page
  shows the count.
- **App:**
  - the quest page's footer: "Mark as done" for a member while it runs, and "Done · Undo" once marked; Leave stays
    for members who are not the host;
  - the count line reads "N joined · M done" (no "0 done", rule B6);
  - people marked done get a Done mark in the list;
  - an ended quest you finished says "You finished this quest";
  - Explore's quest card: "Done" instead of "Joined" on the button once you finished, and "· M done" on the joined
    line.
- **Older builds** ignore the new fields; the client treats them as optional.

## What will not change

- No proof (photos, check-ins) and no host approval.
- Quests still end by time (`ChallengesCron` sets `ENDED`).
- Rewards are still free text; nothing is handed out.

## How it will be checked

- **e2e:**
  - mark done and undo, with the counts in the list and the detail;
  - a second call changes nothing;
  - a non-member is refused;
  - an ended quest is refused;
  - leaving drops the completion;
  - the host can mark done.
- **Phone, as `uit_gps1`:**
  - join a quest `uit_hannah5` started, mark done, and check the count, the Done mark and Explore's card;
  - undo, then leave.
- **Clean-up:** delete the test quest and its members.
