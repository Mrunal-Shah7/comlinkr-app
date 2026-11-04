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
- Data loading: `useFocusEffect` behind the 10-minute `listFetchCache` ("community") [code].

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
