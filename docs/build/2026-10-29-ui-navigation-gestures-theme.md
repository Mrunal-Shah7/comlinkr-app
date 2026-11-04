# UI / UX Changes — navigation, gestures, theme (Oct 2026)

_Moved here on 2026-11-04 from the old `code/docs/` folder, unchanged except links. Written before the build-note format
existed, so its headings differ; the format is in [README.md](README.md)._

All changes are in `frontend/apps/mobile` (mobile only), **uncommitted** on `main`.
Typecheck (`npx tsc --noEmit`) is clean. Tested on an Android device in Expo Go against the local backend.
Performance details: [2026-10-29-ui-performance-tab-jank.md](2026-10-29-ui-performance-tab-jank.md).

## Gestures & shortcuts

| Gesture | Where | Behaviour |
|---------|-------|-----------|
| **Swipe between tabs** | All 4 bottom tabs | Pager-style: the tabs sit side by side, so the current tab slides out and the neighbouring tab slides in with the finger (no fade). Resists past the first/last tab, commits past 22% width or on a flick, selection haptic. Tab-bar taps to a neighbour slide; taps two or more tabs away jump. Horizontal rows inside a tab (chip rows, photo carousels, the activity ticker) use gesture-handler scroll views so they keep their own swipes; vertical scroll / pull-to-refresh are unaffected. |
| **Re-tap active tab** | All tabs | Scrolls the tab back to the top (`useScrollToTop`). |
| **Long-press a tab** | Bottom bar | Explore → new post · Listings → new listing · Food → add restaurant · Community → opens "Ask a question" (one-shot token param, so closing it never re-triggers). Medium haptic; asks guests to sign in. |
| **Pull down to close** | Listing detail, Roommate profile, Restaurant detail, News article | Drag the hero/header down; the sheet follows and closes past 140 px or on a flick. Photo carousels in the hero still swipe sideways. |
| **Edge swipe back** | Every stack screen on Android (except story viewer) | Drag from the left edge; screen follows the finger and pops past 30%. iOS keeps its native edge swipe-back (unchanged). |
| **Double-tap photo** | Listing cards → save · Restaurant cards → favourite | Bookmark / heart burst animation + haptic. Single tap still opens the fullscreen viewer (after a 280 ms double-tap window). |
| **Long-press card** | Listing cards, Restaurant cards | Quick-action sheet: save/favourite, message landlord, share, directions, view details, report. |
| Haptics | Tab press, segment switch, swipes | Light selection feedback throughout. |

Implementation: `react-native-gesture-handler` + Reanimated worklets (already in the shipped
binaries → **OTA-safe**; no new native dependency). A native pager (material-top-tabs + pager-view)
was considered and rejected: `runtimeVersion.policy = appVersion` means an `eas update` adding a
native module would crash installed 1.0.4 apps, and a pager can't freeze hidden tabs.

## Theme & visual polish
- **Tab bar**: animated active pill (spring), subtle icon lift, hairline border, softer shadow,
  refreshed inactive colour, accessibility labels mentioning the long-press shortcut.
- **Compact heroes** on Listings and Food (smaller padding/title, tighter spacing, 44 px search) —
  ~80 px more content above the fold.
- **Skeleton loaders** replace spinners for listings, shared rooms, roommate matches, Food and
  Community (`ListState kind="loading"` now renders skeletons app-wide).
- Stack transitions: 260 ms slide, themed background during transitions (no white flash in dark mode).
- `GestureHandlerRootView` at the app root (was missing), painted with the page background.
- Tabs that haven't fetched yet start in their loading state, so a tab peeking in during a swipe shows skeletons rather than "No listings/restaurants found".

## Bug fixes found while testing
- Listing card showed a raw ISO timestamp (`2026-12-02T19:56:50.931Z`) → "Immediate" / "Dec 2, 2026";
  past/today dates now light up the existing "Available Now" pill.
- Community questions/answers showed `29/10/2026, 01:26:51` → relative times ("5m ago", "3h ago").
- Rooms & Mates → Available Rooms rendered a blank area when empty → proper empty state.
- Roommate card bookmark icon was white-on-pale (invisible) in light mode → contrast fixed.
- A remounted tab (e.g. after re-login) could show "No restaurants/questions found" for up to
  10 minutes because the shared fetch-TTL gate skipped the refetch → fixed in Food, Community, Explore.

## White flash on back (Android)
Pressing the hardware back button briefly showed a full-screen white frame when leaving stack screens.
Reproduced on Messages, Notifications and Add Listing; the in-app back arrow wasn't recorded. Recorded with scrcpy and checked frame by frame: the flash was
pure `#FFFFFF`, not React Navigation's theme grey. During a native-stack pop the leaving screen's
content is removed before its slide-out finishes, so for ~120 ms the area it covers is transparent and
the Android window background (white) showed through, because the React root view had no background.

Fix (JS-only, OTA-safe): `app/_layout.tsx` paints the `GestureHandlerRootView` with the theme's
`pageBg`. The gap is now the page colour instead of white.

Not fixed: the leaving screen still goes blank for those few frames instead of visibly sliding out.
Tried and ruled out: the Android edge swipe-back wrapper (`EdgeSwipeBack`), and expo-router's
`disableSynchronousScreensUpdates` option. Neither changed it.

## New files
| File | Purpose |
|------|---------|
| `src/shared/navigation/SwipeTabs.tsx` | Tab navigator (TabRouter + stock `BottomTabBar`) whose screens sit in a horizontal strip driven by one pan gesture; replaces expo-router `Tabs` in `app/(tabs)/_layout.tsx`. Freezes tabs more than one position from the focused tab. |
| `src/shared/ui/DismissibleSheet.tsx` | `DismissibleSheet` + `SheetDragArea` pull-down-to-close for modals |
| `src/shared/ui/EdgeSwipeBack.tsx` | Android edge swipe-back (Stack `screenLayout`) |
| `src/shared/ui/Skeleton.tsx` | `SkeletonBlock`, `SkeletonCard` |
| `src/shared/hooks/useStableCallback.ts` | Stable handler identity for memoized rows |
| `src/utils/afterTransition.ts` | `runAfterTransition()` — replaces deprecated `InteractionManager` |

## Modified files
`app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/housing/index.tsx`,
`app/(tabs)/feed/index.tsx`, `app/(tabs)/food/index.tsx`, `app/(tabs)/community/index.tsx`,
`src/store/auth.store.ts`, `src/shared/ui/ListState.tsx`, `src/features/housing/components/ImageViewer.tsx`
(card photo carousel → gesture-handler `ScrollView`).

## Not verified / follow-ups
- iOS not tested (no device); gestures use cross-platform APIs, iOS swipe-back is native.
- Tested in Expo Go (dev mode) only — do a release/preview build before shipping.
- Gestures not yet added to: feed post-comment modal (iOS `pageSheet` already swipes), filter sheets,
  sidebar drawer swipe-to-close, story/event cards.
