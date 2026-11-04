# UI Performance Audit — tab navigation jank (Oct 2026)

_Moved here on 2026-11-04 from the old `code/docs/` folder, unchanged except links. Written before the build-note format
existed, so its headings differ; the format is in [README.md](README.md)._

**Symptom:** switching bottom tabs, especially **Explore → Listings**, felt laggy and "jittery".

## How it was measured
- Device: Android phone (1080×2412) over USB, app running in **Expo Go**, local backend.
- Android `dumpsys gfxinfo` showed the **native UI thread was fine** (p99 frame 15–26 ms, no missed
  vsyncs), so the lag was on the **JS thread**: the tap registers, but React work blocks the switch.
- A temporary dev-only `requestAnimationFrame` probe logged JS stalls > 50 ms for 5 s after each
  `tabPress`, driven by an adb script tapping Explore → Listings → Explore → Listings → Food →
  Community → … (dev build, so absolute numbers are inflated; compare before/after).

## Results (JS time blocked after a tab press, repeat visits)

| Tab | Before | After |
|-----|-------:|------:|
| **Listings** | **2.1 – 2.6 s** (single freeze 1.4 – 1.65 s) | **~0.19 s** (worst frame ~0.12 s) |
| Food | 0.6 – 0.8 s | ~0.2 s |
| Community | ~0.6 s | ~0.2 s |
| Explore | 0.2 – 0.3 s | ~0.2 s |

## Root causes
1. **Every hidden tab re-rendered on global store changes.** `(tabs)/_layout.tsx` used
   `lazy: false`, `detachInactiveScreens={false}`, `freezeOnBlur: false` (SPRINT-27 keep-alive). All
   four very large screens (Listings 7.8k lines, Explore 7k lines) stayed mounted *and live*, so any
   `authStore.user` update re-rendered all of them.
2. **Listings refetched and replaced everything on every focus** (`housing/index.tsx` focus effect):
   - `GET /roommates/preferences` → `authStore.updateRoommatePrefs()` **always** created a new `user`
     object (plus 2–3 AsyncStorage writes), even when nothing changed → cause #1 fired on every visit.
   - `GET /housing` (50 rows) + `GET /housing/my-listings` → `setListings(new objects)` → every
     `ListingCard` (un-memoized, image carousels, inside a plain `ScrollView`) re-rendered.
   - The effect's deps included `activeTab` and `loadListings`, so switching Listings ↔ Rooms & Mates
     or changing a filter re-ran the whole fetch (filters even fetched twice).
3. **Deferred work ran mid-animation.** `InteractionManager.runAfterInteractions` is deprecated in
   RN 0.86 and tab transitions don't register as interactions, so fetch results landed during the
   tab animation.
4. Smaller: the Listings/Rooms segment indicator animated `left` with `useNativeDriver: false`
   (JS-driven, stutters when JS is busy).

## Fixes applied
| Fix | Where |
|-----|-------|
| `freezeOnBlur: true` + `detachInactiveScreens` (keep-alive retained: screens stay mounted, they just don't re-render while hidden) | `app/(tabs)/_layout.tsx` |
| `updateRoommatePrefs` is a no-op when prefs are unchanged | `src/store/auth.store.ts` |
| Listings/roommates loaders skip `setState` when the response is identical (signature check) — still refetch on every focus, so SPRINT-42 freshness holds (verified: changed a price in the DB, refocused, card updated) | `housing/index.tsx` |
| Focus effect keyed only on `user?.id`; loaders read via refs | `housing/index.tsx` |
| `runAfterTransition()` (timeout + rAF, cancellable) replaces `InteractionManager` in all 4 tabs | `src/utils/afterTransition.ts` |
| `MemoListingCard` / `MemoRoommateCard` + `useStableCallback` handlers | `housing/index.tsx`, `src/shared/hooks/useStableCallback.ts` |
| Native-driver `translateX` for the segment indicator | `housing/index.tsx` |
| TTL gates only skip refetch once the *instance* has data (a remounted tab no longer shows an empty list for 10 min) | feed, food, community |

## Follow-up: virtualized lists + file split (Oct 29, 2026)

**What changed**
- **Listings** (`housing/index.tsx`) and **Explore** (`feed/index.tsx`): the main vertical `ScrollView` + `.map()` is now one
  `FlatList` per screen (`initialNumToRender 4`, `maxToRenderPerBatch 4`, `windowSize 7`).
  - The hero, segment switcher, search, chips and per-tab section headers sit in `ListHeaderComponent`. It is
    passed as an element, so the search box keeps focus while you type.
  - Load-more buttons and error / empty / needs-city states sit in `ListFooterComponent`, with the same conditions as before.
  - The rows are whichever list the active tab shows. Listings: listings, shared rooms or roommates. Explore:
    events, stories, quests, community posts, live news or poll questions. Keys are prefixed by row kind.
- The same `RefreshControl` and `useScrollToTop(ref)` are kept. Re-tapping the tab still scrolls to the top (checked on device).
- Listings rows still use `MemoListingCard` / `MemoRoommateCard` with the `useStableCallback` handlers.
  - New memoized Explore rows: `StoryCard`, `QuestCard`, `LiveNewsCard`, all with `useStableCallback` handlers.
  - Per-row UI state (news expand, read, liked, saved) stays in screen state and is passed in as props, so it
    survives a row being unmounted off-screen. Example: the "✓ READ" badge updates after opening an article.
- **Split.** `housing/index.tsx` went from 8,033 to 1,877 lines and `feed/index.tsx` from 7,055 to 3,139.
  - Cards, detail modals, models and styles moved to `src/features/housing/` and `src/features/explore/`.
    Subfolders: `components/`, `styles/`, and model/constants files.
  - The modules are **not** under `app/`, because expo-router turns every `.tsx` under `app/` into a route.
  - The split was done mechanically with the TypeScript checker (top-level declarations moved verbatim) and has no import cycles.
- Unchanged: tab keep-alive (`lazy: false` + `freezeOnBlur`), `TabSwipeLayout`, `DismissibleSheet` on detail
  modals, `runAfterTransition` focus loading, and the `loadListings` / `loadRoommates` signature skip.

**How it was measured**
- Same device, Expo Go dev build, local backend.
- A temporary `React.Profiler` (since removed) wrapped each screen and logged commits of 8 ms or more.
- A scripted adb run: cold start → Listings → pull-to-refresh → scroll → Explore ↔ Listings → each Explore tab.
- The local DB has 24 listings, 12 roommates, 14 posts and about 20 live-news articles. It has no events, stories or quests.

| React commit time (dev build) | Before | After |
|---|---:|---:|
| Listings, first visit (listings arrive) | **1,367 ms** single commit (1.43 s total) | **228–299 ms** (~0.30 s total) |
| Listings, pull-to-refresh | 647 ms (683 ms total) | 107–110 ms (~0.17 s total) |
| Explore, cold start (all commits ≥ 8 ms) | ~1.03 s, worst 257 ms | ~0.93 s, worst 209 ms |
| Tab switches / scrolling | no commits ≥ 8 ms beyond 10–25 ms | same |

The Listings win is large: about 5× on first load and 6× on refresh. Explore's win is small, because most of its
start-up cost is the hero, ticker and data loading, not the rows. Events, Stories and Quests rows could only be
checked in their empty state, because the local DB has no such data.

**Behaviour notes**
- A listing's photo-carousel index resets once the card has scrolled far enough off-screen to be unmounted.
- Pre-existing, not caused by this change (seen with the original file too):
  - Community post cards show the image placeholder for the seeded posts.
  - Post dates render as `29/10/2026, 01:26:51`.

## Further opportunities (not done)
- Move data fetching to React Query (already configured, barely used) for caching/dedup.
- The two screen components are still large (1.9k / 3.1k lines of state + handlers). Next step: extract the
  per-tab loaders into hooks (e.g. `useExploreNews`, `useRoommates`).
- `roommates.service.searchRoommates` scores every looking user in the city in memory per request.
- Measure a release build (`eas build --profile preview`) — dev mode inflates JS cost ~2–4×.

## Update: pager-style tab swipe
The bottom tabs now use `src/shared/navigation/SwipeTabs.tsx`. That replaces the `freezeOnBlur` +
`detachInactiveScreens` and `TabSwipeLayout` rows above. All tabs stay mounted. Tabs two or more
positions from the focused tab are frozen. The direct neighbours stay live, so they have content to show
when they slide in during a swipe. A neighbour therefore re-renders on store updates while hidden; the
roommate-prefs no-op and the signature skips above keep that cheap.
Each page is memoized, so a tab switch re-renders only the pages whose focus/freeze state or route
params changed.
**Not re-measured:** tab-switch blocked time with live neighbours. There are no new numbers to compare
with the ~0.2 s above.
