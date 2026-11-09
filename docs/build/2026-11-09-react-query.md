# 2026-11-09: server data through React Query (TR-013, point 3)

Branch `chore/react-query`, stacked on `chore/expo-conventions`. Run log:
[device-runs/2026-11-09-react-query.md](../device-runs/2026-11-09-react-query.md).

## Problem

Screens fetched in `useEffect` / `useFocusEffect` into component state, each with its own loading, error, paging and
refresh flags. A hand-made store (`listFetchCache.store.ts`) remembered when each tab last fetched and skipped a
refetch for 10 minutes; it had to be cleared by hand on city change, listing edits and sign-out. React Query was
installed and provided at the root but used by two components only.

## Change

**Infrastructure** (`src/services/cache/`, `src/hooks/`):

- `queryClient.ts`: `focusManager` follows `AppState`, so stale queries refetch when the app returns to the
  foreground. `LIST_STALE_MS` (10 minutes) replaces the old gate.
- `queryKeys.ts`: every key in one place. List keys carry the city and the filters, so a change of either is a new
  query and never shows stale data under the old key.
- `useRefetchOnFocus(key)`: when a mounted screen regains focus, refetch its queries that are stale (TanStack's
  React Navigation pattern). A quick tab switch inside the stale time sends nothing.
- `useScreenQuery` / `useInfiniteScreenQuery`: `useQuery` / `useInfiniteQuery` with what screens used to build by
  hand: a fallback while loading, a cache setter for optimistic edits (which keeps the fetch time, so effects keyed
  on "a fetch landed" don't fire on a local edit), `loadMore`, pull to refresh, de-duplication across pages.
- `listFetchCache.store.ts` deleted. City changes need nothing (the key changes); a listing mutation invalidates
  the `housing` and my-listings queries; sign-in and sign-out already called `queryClient.clear()`.

**Screens:**

| Screen | Now |
|---|---|
| Notifications, verification status, public profile, event deep link, landlord dashboard, events | `useQuery` / `useScreenQuery` |
| My listings, my restaurants | `useScreenQuery`, `staleTime` 0 (refetch on every focus, as before) |
| My posts, saved (one query per save type), Interested / Favourites | `useInfiniteScreenQuery` / `useQuery` |
| Review picker (compose) | `useQuery` with a debounced search in the key |
| Listings tab | homes: infinite query keyed by city + filters (`staleTime` 0, as before); roommates and rooms: 10 minutes |
| Food, Community tabs | infinite queries keyed by city + search / cuisine or sort / topic, 10 minutes |
| Explore feed, chat inbox | the existing loaders fetch through `queryClient.fetchQuery` (keyed by tab, city, country, state, user); a fresh entry answers without a request and is not re-applied; pull to refresh forces. News keeps 2 minutes, chat 30 seconds |

Hearts, bookmarks and votes stay local state seeded from each fetch, as before.

**Not converted, and why:**
- Forms that load once and then hold edits: settings, edit profile, onboarding, apply badge.
- Timers and media: story viewer, event check-in.
- `EventDetailModal`, `EventRegistrationModal`: become routes in point 7.
- The root layout's socket and push wiring.
- Admin pages: `useAdmin` already uses `useQuery`; the rest are admin-only and were not walked.
- The Explore feed keeps its many local states. Its loaders now use the cache, but a full `useQuery` rewrite of its
  2,800 lines (two-phase news, the session news cache, description enrichment) is not done.

## Commits

`e4fd954`, `76182b8`, `4db1609`.

## How it was checked

`pnpm typecheck` after each file. On the phone, with the backend log open, see the run log. Not checked: Load more
(no list in the seed is longer than one page) and iOS. My posts delete and Undo was checked later, on
`chore/split-compose`.
