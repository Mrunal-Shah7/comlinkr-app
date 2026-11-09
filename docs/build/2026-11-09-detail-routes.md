# 2026-11-09: detail screens as routes (TR-013, point 7, plan 03)

Branch `chore/detail-routes`, stacked on `chore/split-compose`. Plan: [plan 03](../plan/03-detail-routes.md). Run log:
[device-runs/2026-11-09-detail-routes.md](../device-runs/2026-11-09-detail-routes.md).

## Problem

Listing, roommate, shared space, restaurant and event details opened as full-screen React Native `<Modal>`s inside
the tab screens, closed by a hand-made pull-down (`DismissibleSheet`). They had no URL, no native Back, and their
actions lived in the 1,500-line tab screens that opened them.

## Change

| Detail | Route | Body | By-id endpoint |
|---|---|---|---|
| Home listing | `app/listing/[id].tsx` | `PropertyDetail` | `GET /housing/:id` |
| Roommate | `app/roommate/[id].tsx` | `RoommateDetail` | `GET /roommates/:id` |
| Shared space | `app/room/[id].tsx` | `AvailableRoomDetail`, `EditSharedSpaceModal` | `GET /shared-spaces/:id` |
| Restaurant | `app/restaurant/[id].tsx` | moved out of the Food tab; helpers in `src/features/food/foodShared.tsx` | `GET /restaurants/:id` |
| Event | `app/events/[id]/index.tsx` (was a redirect to Explore) | `EventDetail` | `GET /events/:id` |

- Each route reads its item with `useQuery` (`staleTime` 0). Opened from a list, it starts from the list's cached
  row (`findCachedRow` in `src/hooks/useDetailRoute.ts`) and refreshes; opened from a link, it fetches. Back is
  `router.back()`, or Explore when there is nothing to go back to.
- The actions moved into the routes (save, delete, edit, connect / accept / decline, apply, RSVP, register, review,
  reserve, report). Each one invalidates the list query it changes, so the tab shows the new state on Back.
- Listing journey and requested rooms stay in AsyncStorage (`src/features/housing/localProgress.ts`); the Listings
  tab re-reads requested rooms when shown.
- Cards, Saved, notifications, chat, the composer and `+native-intent.ts` push the routes. The tabs still accept
  `?openListing=`, `?openRoommate=`, `?openRestaurant=`, `?openEvent=` and forward them, so old links keep working.
- `DismissibleSheet` is deleted. The news article stays a modal (there is no article by-id endpoint); its wrapper
  is now a plain `View`.

**Lost:**
- Pull-down to close: Back is the system Back on Android and the edge swipe on iOS.
- The event card's photo flying into the detail (`src/shared/d/Hero.tsx`, deleted): it needed the detail to be a
  transparent modal. The native push replaces it.

## Commit

See the pull request.

## How it was checked

`pnpm typecheck`, `expo export --platform android`. On the phone against the local backend, see the run log: each
detail from its list and Back (button and system Back), save in the detail then Back to a list that shows it, a
cold link to an event, the not-found state, the news article. Not checked: the shared space detail (no shared
spaces in the seed), roommate connect / accept, review and reservation flows end to end, iOS.
