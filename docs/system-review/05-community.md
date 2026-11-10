# 05. Community Q&A

_2026-11-04. Made from the earlier section doc (written from code, 2026-10-29) and the UI change notes. The audit
opened the tab on the phone. Marks: see [README.md](README.md)._

## Planned changes

| ID | Kind | What will change | Triage | Plan |
|---|---|---|---|---|
| — | | None yet | | |

## What it is for

Asking locals: questions and answers about the city, with upvotes, plus community polls and stats.

## Who uses it, and where

- Screen: `frontend/apps/mobile/app/(tabs)/community/index.tsx` (about 1.7k lines) [code].
- Backend: `community` module [code].

## How it works

- Hero with an **Ask bar** → Ask Question modal (title, body, category). The category is suggested from the text by
  a keyword scorer (`scoreForCategory`, word-boundary and stem matching) [code].
- Topic chips: All, Housing, Food, Transit, Events, Safety, General; sort [code].
- Question cards: upvote, answer count, share, bookmark, more menu (report question or member, block); inline
  answers with their own upvotes [code].
- Questions from blocked users are hidden on the phone (`isQuestionHiddenByBlock`) [code].
- Times show as relative ("5m ago", "3h ago") [observed].
- API: `GET /community/questions` (city, category, sort, page), `GET /community/questions/:id`,
  `POST /community/questions`, `POST /community/questions/:id/answers`, upvote toggles, save toggle,
  `GET /community/stats`, polls (shown on Explore → Polls, review 02), reports [code].
- Data loading: an infinite React Query keyed by city, sort and topic, fresh for 10 minutes and refetched on focus once stale ([React Query note](../build/2026-11-09-react-query.md)) [code].

## Rules it enforces

- City-scoped [code].
- Blocked users' questions are hidden, on the phone only [code] [question: should the API leave them out too?].

## Problems found

| # | Problem | Status |
|---|---|---|
| 1 | Questions and answers showed `29/10/2026, 01:26:51` instead of a relative time | Fixed 2026-10-29. [UI changes](../build/2026-10-29-ui-navigation-gestures-theme.md) |
| 2 | A remounted tab could show "No questions found" for up to 10 minutes | Fixed 2026-10-29, same note |

## Questions

1. Should blocked users' questions and answers be filtered by the API rather than only hidden on the phone?
   [question]

## How to test it

Checklist: none yet; the smoke checklist opens the tab. Test data: 10 questions by `uit_*` users.

## Not yet checked

Ask, answer and upvote end to end; the category suggester with non-English text; report and block from a
question; pagination past one page; answers from blocked users.

## Update 2026-11-06: design D (plan 01, branch `feature/design-d`, not merged)

From [the full-match build note](../build/2026-11-06-design-d-full-match.md); **[code]** unless marked
**[phone]**.

- Upvotes bounce and the count rolls; answers are sorted with the most-upvoted first and tagged "Best answer" when there is more than one.
- Ask sheet: the topic is guessed from the words and can be changed with a chip; your pick wins. Not walked.

## Update 2026-11-10: full walkthrough (TR-028, branch `fix/walkthrough`, not merged)

Walked on the phone; rows C- in the [run log](../device-runs/2026-11-10-full-walkthrough.md).
- Authors can delete their own question and answer (new `DELETE` routes; upvotes removed, count lowered); the ··· menu on your own question offers Share and Delete, not report or block (C-04, C-05).
- Blocking hides the author's questions and answers at once (C-03).
- Follow on a public profile is hidden: there is no follow API (S-06, TR-029).
- Open: C-08, C-15.

## Update 2026-11-10: Follow (TR-029, plan 14, branch `feature/follow`, not merged)

From the [build note](../build/2026-11-10-follow.md).
- Follow is built: one-way and without approval (`UserFollow`). `POST /users/:id/follow` toggles it, and
  `GET /users/me/followers` and `GET /users/me/following` list your follows, newest first [code].
- Profiles show "N followers · M following". On your own profile the line opens Follows, with Followers and
  Following tabs and "Follow back" **[phone]**.
- The person followed gets "New follower", at most once a week per follower; tapping it opens the follower's profile
  **[phone]**.
- Blocking removes the follows both ways, and a blocked user cannot be followed [code].
- Following does not change the feed (the owner's call).
