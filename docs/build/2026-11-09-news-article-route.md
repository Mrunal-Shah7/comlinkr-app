# 2026-11-09: the news article as a route (TR-017, point 4)

Branch `feature/news-article-route`, from `main` after pull request 15.
[Plan 03, addendum](../plan/03-detail-routes.md#addendum-2026-11-09-tr-017-the-news-article).

## Problem

The news article opened as a full-screen React Native `Modal` inside the Explore feed. It had no URL, no native
Back, and no way to open from a link. The expo-router skill asks for screens to be routes. Plan 03 had kept it a
modal because the API had no way to read one article.

## Change

**Backend** (`src/modules/news/`):
- `GET /news/articles/:id` (optional auth, declared after `articles/saved`).
- `NewsService.getArticleById` searches the in-memory feed cache. When the article is no longer there, it falls back
  to the newest `NewsArticleSave` for that id, without a summary. Otherwise it returns 404 `RESOURCE_NOT_FOUND`.
- Ids are `g-<query>-<position>-<hash>`, so after a rebuild an old id can miss. Production runs one backend (one
  VPS), so the cache is the same for every request.

**App:**
- `app/news/[id].tsx` is the article screen. It has the same content and actions as the old modal: image, category,
  title, source, summary, "Read full article", like, comment, share, save.
- From the feed, the card hands over its article (`rememberArticle`), so the screen opens with no request. From a
  link, it fetches. When the article is gone, it says so and offers Back.
- `src/features/explore/newsArticleStore.ts`: likes, saves and comment counts changed on the route are sent back to
  the feed (`emitNewsPatch` / `onNewsPatch`), so the cards match when the user returns.
- `src/features/explore/components/NewsCommentsSheet.tsx`: news comments now use the native bottom sheet (`DSheet`)
  instead of a React Native `Modal`. The feed's cards and the route share it. It loads, pages and posts on its own.
- The feed lost the article modal, the comments modal and their nine pieces of state.

## Checked

- Backend:
  - `npx tsc --noEmit` passes;
  - the new e2e spec `test/regression/news-article.e2e-spec.ts` covers: the cache hit (as a guest), the saved-copy
    fallback, a 404, and `articles/saved` still reaching its own route.
- Mobile: `pnpm typecheck` passes.
- Walked on the OnePlus against the local backend as `ui_tester`:
  - **From the feed:** opening an article sent only the stats request. Like went to 1. The comments sheet opened,
    rose above the keyboard, and posted a comment. Back closed the sheet, then the route. The feed card then showed
    the like, the comment and "Read".
  - **The feed card's own comment sheet** showed the new comment. Unlike from the card worked.
  - **By link** (`/news/<id>`), the article loaded with `GET /news/articles/:id` 200. An unknown id got 404 and the
    "no longer available" screen.
- The test comment was deleted afterwards, and the test like was removed with Unlike.
