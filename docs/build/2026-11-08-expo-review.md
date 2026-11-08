# TR-010: Expo review of the mobile app, fixes and gesture/animation refactor

_2026-11-08. Triage [TR-010](../triage.md). Review [08 Platform](../system-review/08-platform.md). Run log
[2026-11-08 Expo review](../device-runs/2026-11-08-expo-review.md)._

## Problem

The owner asked for a full review of `frontend/apps/mobile` against the Expo skills in `.claude/skills/`
(expo-overview, expo-router, expo-data-fetching, expo-animation, expo-design-system, expo-native-ui), fixing what it
found and then starting the larger refactors. The app is Expo SDK 57, React Native 0.86, Reanimated 4.5, about 72 000
lines. `tsc --noEmit` passed before any change.

## What the review found

Fixed (tier A, clear bugs):

- **Every 4xx was retried twice.** `src/services/cache/queryClient.ts` stopped retries on `error.statusCode`, but both
  API clients throw `.status` (`ApiError`, `HttpApiError`). A 404 or 403 therefore waited for two retries with
  back-off before the screen saw the error.
- **Components inside the router folder.** `app/components/EventRegistrationModal.tsx` and
  `app/components/modals/EventRegistrationModal.tsx` sat under `app/`, so expo-router registered both as routes
  (`/components/...`). Only the `modals/` copy was imported (Explore and All events).
- **No request timeout.** `src/api/client.ts` called `fetch` with no deadline: a request the network never answers
  left its screen spinning. (The axios client already had 30 s.)
- **Deprecated `runOnJS`** in `src/shared/d/MatchRing.tsx` (Reanimated 4 uses `scheduleOnRN`).
- **Keystores not ignored.** Two `.jks` files sit untracked in the app folder; `.gitignore` did not cover them.

Fixed (tier B, clean-up):

- About 45 files nothing imports: `src/_app_legacy/` navigators and providers, the Expo template components and hooks
  (`hello-wave`, `parallax-scroll-view`, `themed-*`, `external-link`, `hooks/use-color-scheme*`, `use-theme-color`),
  the unused query persister, legacy HTTP services and stores, `EdgeSwipeBack` (replaced by the stack's own edge
  swipe in design D, plan 01).
- `app/_layout.tsx` hid every "Uncaught (in promise" warning (review 08, problem 4). It no longer does.

Refactor (started, as the owner asked):

- `PanResponder` in four places moved to Gesture Handler with the motion on the UI thread (Reanimated):
  the listing photo reorder tile and the media picker sheet in `create-post`, the story viewer's pull-down, and the
  photo gallery (`ImageViewer`: pinch, pan when zoomed, long-press reset, pull-down to close).
- Core `Animated` moved to Reanimated: Explore's news skeleton pulse, `ListingCard`'s save pop and burst, chat's send
  pop.
- Removed animations that never reached the screen: Food's double-tap heart burst (animated, never rendered), the
  Listings tab indicator (`tabAnim`/`tabSlide`, computed, never used) and the sign-up password toast (never called).

## Cause

Mostly drift: the API client was rewritten without the query client's retry rule; files were moved or replaced
(design D, the expo-router move) without deleting the old ones; gesture code predates Gesture Handler in the app.

## Change

- `queryClient.ts`: reads `error.status ?? error.statusCode`.
- `src/api/client.ts`: `fetchWithTimeout`, 30 s for JSON requests, 120 s for `postFormData`; a timeout throws
  `ApiError(0, "TIMEOUT", ...)`. `src/api/media.api.ts` has its own `fetch` calls for uploads and was left as is.
- `EventRegistrationModal` now lives in `src/features/explore/components/`; the unused copy is deleted.
- `MatchRing`: `scheduleOnRN(setShown, v)`.
- `.gitignore`: `*.jks`, `*.keystore`.
- Unused files deleted; `LogBox` keeps only the keep-awake message.
- `create-post.tsx`: `DraggableListingImage` uses `Gesture.Pan` (`activeOffsetX ±6`, `failOffsetY ±12`) and a
  shared value; the drop is turned into a move once, on release. `MediaPickerSheet` starts its slide from an effect:
  before, `show()` ran during render and restarted the spring on every render.
- `story-viewer.tsx`: `Gesture.Pan` (down only, off while comments are open); closes past 80 dp or on a downward
  flick (> 800 dp/s); springs back otherwise.
- `ImageViewer.tsx`: `Gesture.Pinch` + `Pan` (only while zoomed) + `LongPress`; the pager stops paging while a
  photo is zoomed; the pull-down closes past 120 dp or on a flick; the Modal gets its own `GestureHandlerRootView`
  (a React Native Modal is a separate window). The entrance respects reduce motion.
- **Not deleted after all: `app/app/*`.** These four bridge routes look redundant with `app/+native-intent.ts`, which
  rewrites `/app/...` links. On the phone, an Expo Go link (`exp://.../--/app/feed?...`) has the path `/--/app/feed`,
  which the rewrite does not match, so without the bridges it showed "Unmatched Route". They were restored.

## Commits

On `feature/design-d`, not pushed: `d414423` (tier A), `4a07c79` (tier B), `79babe3` (refactor), `193be40`
(restores `app/app/*`, with these docs), then a docs-only commit with the second phone check.

## How it was checked

- `npx tsc --noEmit` after each batch; `npx expo export --platform android` (Metro bundle) after tier B and after the
  refactor.
- Retry rule: a script against the installed `@tanstack/query-core` (404 by `status` and 403 by `statusCode`: one
  call; 500 and a network error: three calls).
- On the phone (OnePlus, Android 16, Expo Go, local backend), as `ui_tester`: gallery paging, short and long pull,
  flick, hardware Back; story viewer short and long pull, flick, Like and unlike inside the gesture area; the moved
  RSVP sheet (stepper, close); a chat message sent; photo reorder dragged and dragged back (the database order
  followed both times), vertical scroll over the tiles; the media picker sheet opened twice and closed with Cancel
  and with the backdrop; an Expo Go `?openStory=` link opens the story. Details in the run log.
- ESLint could not run: the mobile app has no `eslint` dev dependency (`eslint.config.js` needs `eslint/config`).

## Not checked

- Pinch-to-zoom and panning a zoomed photo: adb input has one finger.
- `ListingCard`'s save pop and burst: the card now renders only on the admin listings screen, which was not walked.
- The Explore news skeleton pulse: not seen on screen (the news loaded before it could be looked at).
- The chat send pop and the photo tiles' spring back: too quick to judge from screenshots.
- iOS (no device).
- A release build. Feel of the springs on a slow phone.
- The "Uncaught (in promise" warnings now visible in development were not counted or chased.

## Reported, not fixed

- About 2 000 hard-coded hex colours in screens instead of theme tokens (expo-design-system).
- About 200 `useEffect` fetches against 2 `useQuery` uses; React Query is set up but barely used (review 08, Q2).
- Two HTTP clients (fetch and axios) with different error types.
- About 40 list keys built from the array index. Looked at in the second round: they are fixed lists (dots, steps,
  requirement rows, the six photo slots) or photo lists where the same photo can be picked twice, so a `uri` key
  could repeat. Left as they are.
- `app/create-post.tsx` is 5 000 lines.
- Staging builds allow cleartext traffic (`APP_ENV !== 'production'`).
- `dist_baseline/` is tracked in git; build logs and one-off scripts sit in the app folder.
- The design D tab pager (`SwipeTabs`) and the JS screen transitions (`ZoomStack`) go against the expo-animation and
  expo-router guidance (native tabs, platform transitions). They are deliberate design D choices (plan 01), so they
  were left alone.

## Second round (same day, owner: "proceed with the next items")

- **`SignPad`** (`src/shared/d/SignPad.tsx`, the tenancy agreement signature): `PanResponder` with a `setState` per
  touch move is replaced by a `Gesture.Pan` (`minDistance(0)`, so a tap leaves a dot and the pad claims the touch
  at once; one finger). The path grows on the UI thread through an animated `d` prop on the SVG `Path`; each finished
  stroke is handed to JS once (`scheduleOnRN`) for `toPng()`. `clear`, `isEmpty`, `toPng`, `onChange` and
  `onDrawing` (which stops the page scrolling) keep their meaning.
- **`LayoutAnimation` in Explore** removed (three `configureNext` calls on news load, phase 2 and "load more"). It
  animated every layout change in the next frame, not only the news list, and news loads each time Explore opens
  (expo-animation: something that happens many times a day does not animate). Unused `LayoutAnimation`,
  `UIManager` and `Platform` imports removed from `app/saved.tsx`.
- **Checked:** `tsc --noEmit`; `npx expo export --platform android`.
- **Not checked on the phone:** the phone connected this time (Motorola edge 40 neo) was locked with a PIN, so the
  signature pad was not drawn on. To check: open `exp://127.0.0.1:8083/--/property-agreement?propertyTitle=Test`
  (no `listingId`, so nothing is sent to the server), fill part 1, then draw, tap for a dot, clear, draw while the
  page is scrolled, and check that the page does not scroll under the finger; then "Type instead" and back. iOS:
  whether the page's scroll view can take a vertical stroke before `onDrawing` turns scrolling off is not known.
- **The pull request was not opened:** the repository has no GitHub remote and the `gh` CLI is not installed.
