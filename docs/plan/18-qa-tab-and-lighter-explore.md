# 18. The Q&A tab, topics matched on the phone, a lighter Explore

**Status: Done before this plan was written.** Built in commit `60cdd7b` (app 1.0.6), pushed to `main` on
2026-11-14 without a pull request; this plan records it afterwards. Triage [TR-054](../triage.md);
[build note](../build/2026-11-14-app-1-0-6.md). The questions below are open for the owner.

## Problem

As read from the commit (it gives no reasons of its own):
- The fourth tab holds questions and answers, but was called "Community", the same word as Explore's feed of
  local posts.
- A topic chip showed only the questions saved under that category. People often keep the suggested topic or
  pick General, so a question about rent saved as General never appeared under Housing.
- Explore's bento repeated other tabs: a Homes count (Housing), a trending question (Q&A), stories and a poll
  (Explore's own feed tabs).
- The "Rated 4.5+" tile on Food was not wanted.

## What changed

- **Q&A.** The tab, its header and its page title say "Q&A". The route (`community/index`) and deep links stay.
- **Topics on the phone.** A question belongs to a topic when its saved category is that topic, a tag equals it,
  or its words score for it (`scoreForCategory` ≥ 2, the scorer that suggests a topic while asking). General: saved
  as General, or about no other topic. With a topic chosen the screen loads every question in the city, 50 at a
  time, and keeps the matches.
- **Explore.** Homes, trending question, Stories nearby and Poll tiles hidden behind flags in `ExploreBento.tsx`.
  The next event, the hero and the quest tile stay.
- **Food.** The "Rated 4.5+" tile hidden; the Top rated chip stays.
- **Look.** A bigger, centred logo on login and sign-up; the logo in the side menu; the header avatar without its
  gradient ring.

## What did not change

- The backend: the questions API still filters by `category` when asked; the screen no longer asks.
- How a question is saved: the Ask sheet still suggests a category and the asker can change it.
- The hidden tiles' code: it is all still there, behind the flags.

## Questions for the owner

1. **Keep the topic matching on the phone, or move it to the API?** On the phone a page of 50 can keep few
   matches, so a quiet topic loads several pages to fill the screen, and the count of matches is unknown. On the
   server the same rule would page correctly. A question can also show under two topics; is that wanted?
2. **Are the four Explore tiles gone for good?** If so, remove their code and the trending-question query rather
   than keep the flags. Same for Food's `topCount = 0`.
3. **"Q&A" everywhere?** Other places still say Community for this tab: the system review's name, notifications
   or share text that name the section, and the store listing. Worth a search before the next release.
4. **The wordmark is lower case ("comlinkr")** on login, sign-up and the side menu, while TR-046 settled on
   "ComLinkr" for text. Is the lower-case wordmark the logo, or should it follow?

## How it is checked

- Mobile type check.
- On the phone (not done yet), checklists 05 and 02: each topic chip on Q&A in a busy city and in an empty one,
  including General; Explore with and without a next event or quest; Food's hero tiles; login, sign-up and the
  side menu in light and dark mode.
