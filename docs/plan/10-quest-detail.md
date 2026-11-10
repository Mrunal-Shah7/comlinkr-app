# 10. A quest's own page: details, people, leaving

**Status: Built (2026-11-10) on `feature/quest-detail`, not merged.** Triage [TR-038](../triage.md), from the walkthrough
(E-36). The owner asked for every open triage row to be done and for plans to be built straight away; they review in
the pull request.

## Problem

A quest is only a card in Explore › Quests: there is no page to open, no list of who joined, and no way to leave
once joined. The screens call it a "quest" in one place and a "challenge" in another ("A quest", then "CHALLENGE
TITLE", "Launch Challenge", "Challenge Created!"). The empty Quests tab shows "Start a quest" twice.

## What will change

- **API:** `DELETE /challenges/:id/join` leaves a quest. In one transaction the membership row is removed, and the
  count goes down only when a row was removed (a second tap, or someone who never joined, changes nothing). It is
  refused (400) to the author, who deletes the quest from My posts instead, and on an ended quest, so the record of
  who took part stays. Leaving a full quest frees a place; joining again works.
- **App: `/quest/[id]`**, a detail route like `/events/[id]` (plan 03): type, time left, title, details, goal,
  reward, place and tags, the host, and the people who joined (the first ten, with the count). Join (guests are
  asked to sign in), Leave (confirmed with `appAlert`), Share. The host sees "You started this quest" instead of
  Leave. Tapping a quest card opens it; Join stays on the card. Back returns to where it was opened; a cold link
  (`comlinkr://quest/:id`) goes back to Explore.
- Explore's quest list refreshes when you come back after joining or leaving on the page.
- **Words:** what the user reads says "quest" (compose labels, the publish button, the success message, toasts).
  The API, enum and code names stay `challenge`.
- **Empty Quests tab:** one "Start a quest", in the empty state; the button above the list shows only when there
  are quests.

## What will not change

- **Progress:** the model has no per-person progress (no check-ins, no completion). The page shows time left and
  how many joined. Tracking each person's progress or completion is a product change of its own; the owner can ask
  for it.
- Editing a quest; the author still deletes it from My posts.

## How it will be checked

e2e: a member leaves (count down, `isJoined` false); a second leave and a non-member's leave do not change the count;
the author is refused; an ended quest is refused; leave then join; leaving a full quest lets someone else join. On
the phone: open from Explore, join, leave, Back; a cold link; a quest with a maximum; a guest view.

## Decided while building

- The cards and the Explore tile read `participantsCount`, a name the API never sent; they now read
  `participantCount`, so the count and bar show before you join.
- Share on the page includes a link (`getShareLink("quest", id)`, opening `/quest/:id`).
- My posts' filter and label say "Quests"; the admin analytics label ("Challenges") is left as it is.
- The guest view was checked against the API (the page's `GET` answers without a session; leaving answers 401),
  not by signing the phone out.
- See the [build note](../build/2026-11-10-quest-detail.md).
