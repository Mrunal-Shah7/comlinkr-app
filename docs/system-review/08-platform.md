# 08. Platform: sessions, guards, deep links, media, jobs, navigation

_2026-11-04. Made from the architecture doc (written from code, 2026-10-29), the bug audit and the UI change and
performance notes. Marks: see [README.md](README.md)._

## Planned changes

| ID | Kind | What will change | Triage | Plan |
|---|---|---|---|---|
| — | | None yet | | |

## What it is for

The parts every module relies on: how a request is authenticated and checked, how responses look, how media and
deep links work, the scheduled jobs, and the app's navigation, theme and gestures.

## How it works

### Backend

- **Sessions:** `express-session` with a Redis store, cookie `comlinkr.sid`. A per-user session version allows
  signing a user out everywhere. No JWTs (`auth.guard.ts`) [code].
- **Global guards** (`app.module.ts:71-73`), in this order: `AuthGuard` (session needed unless `@Public()` or
  `@OptionalAuth()`), `OnboardingGuard` (unless `@SkipOnboarding()`), `ThrottlerGuard` (100 requests a minute).
  `RolesGuard` (`@Roles(ADMIN)`) and `BadgeGuard` (`@RequireBadge(...)`) are not global; each controller or route
  that needs them applies them [code]. Only `admin.controller.ts` uses `RolesGuard`; `BadgeGuard` and
  `@RequireBadge` are used nowhere, and badge rules are checked inside services instead (for example
  `property-applications.service.ts:629`) [code]. The old architecture doc listed all five as global; corrected
  here 2026-11-04.
- **Responses:** `TransformInterceptor` wraps payloads; `HttpExceptionFilter` turns errors into `{ code, message }`
  (for example `RESOURCE_NOT_FOUND`, `BADGE_REQUIRED`, `AUTH_EMAIL_EXISTS`). Lists take `page` and `limit` (or
  `pageSize`) and return `{ data, meta }` [code].
- **Validation:** global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`: unknown fields are
  refused [code].
- **Media:** Cloudinary through `StorageService`; URLs resolved by the shared `resolveMediaUrl` [code].
- **Deep links:** `src/deep-links.ts` serves `/.well-known/*` and `/app/*` outside `/api`; the app handles
  `https://www.comlinkr.com/app/…` and `comlinkr://` [code].
- **Jobs:** inside the API process; schedule in the [system map](../system-map.md#the-parts) [code].
- **Request logging** middleware on every route (`forRoutes('{*path}')`) [observed].

### Mobile

- **HTTP:** `src/api/client.ts` (fetch) and `src/services/http/apiClient.ts` (axios). The cookie from SecureStore
  is sent as a `Cookie` header. Base URL from `EXPO_PUBLIC_API_BASE_URL`, which must end in `/api` [code].
- **State:** Zustand stores in `src/store/`. React Query is set up (`src/services/cache/queryClient.ts`) but barely
  used; screens fetch in `useEffect` / `useFocusEffect` [code].
- **Server data:** React Query (`src/services/cache/`, `src/hooks/useScreenQuery.ts`, `useInfiniteScreenQuery.ts`): keys carry city and filters, `focusManager` follows `AppState`, stale queries refetch when a screen regains focus, sign-in and sign-out clear the cache ([React Query note](../build/2026-11-09-react-query.md)) [code].
- **Navigation:** expo-router, native since [plan 02](../plan/02-native-navigation.md) (2026-11-09): `NativeTabs`
  (Material 3 bottom navigation on Android, the system tab bar on iOS; tabs do not slide), a fifth "Post" trigger
  that opens the compose sheet, the native `Stack` with the platform's push animation (iOS edge swipe back, Android
  system Back). Pull-down-to-close detail modals (`DismissibleSheet`) stay [code].
- **Controls:** `@expo/ui` switches, segmented controls and bottom sheet (`DSheet`); gesture-handler gestures do not
  run inside the native sheet [code]. On Android `DSheet` is a full-height transparent Material sheet with the card
  drawn at its bottom, so it fits its content and opens fully; tapping above the card closes it
  (`SheetFrame.android.tsx`, [build note](../build/2026-11-09-native-sheets.md)) [walked, Android]. The post
  preview (`/compose-preview`, form sheet) and the photo gallery (`/gallery`, transparent modal) are modal routes; the
  opener hands its in-memory data over through a small store [walked, Android]. React Native `Modal` remains in the
  ten files listed in TR-019 [code].
- **Navigation bar (Android):** hidden throughout the app by `<NavigationBar hidden />` in `app/_layout.tsx` and the
  `expo-navigation-bar` plugin. A swipe up from the bottom edge shows it for a moment. It shows while a native
  sheet or `Modal` is open, because those have their own window. Plan 04 [walked, Android].
- **Back (Android):**
  - Tabs keep a history (`backBehavior="history"`).
  - On 28 screens, sections, filters and searches are kept with `useBackState`. Back undoes them one step at a time
    before it leaves the screen. A sheet visit is one step, and so is a burst of typing.
  - The on-screen ← always leaves the screen.
  - iOS has no system Back, so in-screen undo is Android only. Plan 05 [walked, Android, button].
- **Theme:** `src/theme/` light and dark tokens through `useTheme()`; the root view is painted with the page
  colour [code]. Screens styled with the static `palette` follow dark mode through `createThemedStyles`. Its tables,
  and a lightness fallback for colours they do not name, map light surfaces and dark text. Colours passed as props go
  through `usePaletteColor()`. Brand colours and white on colour stay as they are. Screens dark in both themes use
  `createDTypeStyles` [walked, Android].
- Route map: [reference/Architecture.md](../reference/Architecture.md#route-map-expo-router).

## Rules it enforces

- Every route is authenticated unless marked otherwise; onboarding is required unless marked otherwise [code].
- 100 requests a minute per client [code].
- Unknown request fields are an error, not ignored [code].
- Post-focus work is deferred with `runAfterTransition()` [code].
- Horizontal scrollers inside tab screens are gesture-handler components [code].

## Problems found

| # | Problem | Status |
|---|---|---|
| 1 | Legacy wildcard route `forRoutes('*')` logged `Unsupported route path "/api/*"` on every start (B9) | Fixed 2026-10-29, seen after a restart: no warning, logging still works. [Bug audit](../build/2026-10-29-bug-audit.md) |
| 2 | Android back showed a full-screen white frame for about 120 ms when leaving a stack screen | Partly fixed 2026-10-29: the gap is now the page colour; the leaving screen still goes blank for a few frames. [UI changes](../build/2026-10-29-ui-navigation-gestures-theme.md) |
| 3 | Tab switches janky | Improved 2026-10-29 (about 0.2 s blocked after a press, dev mode); not re-measured after the pager change. [Performance note](../build/2026-10-29-ui-performance-tab-jank.md) |
| 4 | `app/_layout.tsx` hides every `Uncaught (in promise` warning, which hides unhandled API errors in development | Fixed 2026-11-08 at the owner's go-ahead: no longer hidden. [Expo review](../build/2026-11-08-expo-review.md) |
| 5 | React Query retried every 4xx twice (`statusCode` read, `status` thrown) | Fixed 2026-11-08, checked against the library. [Expo review](../build/2026-11-08-expo-review.md) |
| 6 | The fetch client had no timeout | Fixed 2026-11-08: 30 s, uploads 120 s. [Expo review](../build/2026-11-08-expo-review.md) |

## Questions

1. ~~Show the hidden `Uncaught (in promise` warnings again?~~ Yes, 2026-11-08.
2. Move data fetching to React Query, which is already set up? [question]

## How to test it

The smoke checklist covers launch, tab switches, back navigation and theme. Backend: `pnpm test:unit`,
`pnpm test:e2e` (guarded test database).

## Not yet checked

Session expiry and sign-out everywhere; the throttle limit from the phone; deep links from outside the app (cold
and warm start); iOS gestures (no device); a release build's performance.

## Update 2026-11-04: smoke run on the phone

[Run log](../device-runs/2026-11-04-00-smoke.md).

- Tabs: one swipe moves one tab in either direction and the tab bar follows; a tapped tab takes about a second to
  appear in dev mode [observed].
- Problem 2, recorded with `scrcpy --record` and measured frame by frame: Back from Notifications shows no white
  frame (brightness 34.8 → 93.3, nothing near white); the leaving screen goes blank in the page colour for about
  0.3 s, as noted [observed].
- Opening the side menu as a guest fired six signed-in-only requests that returned 401
  (`HamburgerMenu.tsx:77-80` → `sidebar.store.ts:42-48`) [observed]. TR-002, fixed the same day: the menu
  refreshes its data only when signed in; checked on the phone ([build note](../build/2026-11-04-TR-002-guest-menu-401s.md)).
- In light mode the Android navigation bar stays dark grey [observed]. TR-004.

## Update 2026-11-08: Expo review (TR-010)

[Build note](../build/2026-11-08-expo-review.md), [run log](../device-runs/2026-11-08-expo-review.md).

- **HTTP:** `src/api/client.ts` requests time out after 30 s (`postFormData` 120 s) with `ApiError(0, "TIMEOUT")`;
  React Query no longer retries a 4xx [observed for the rule, code for the screens].
- **Routes:** nothing but routes under `app/`. `EventRegistrationModal` moved to `src/features/explore/components/`.
  The `app/app/*` bridge routes stay: Expo Go links (`exp://…/--/app/...`) are not rewritten by `+native-intent.ts`
  [observed].
- **Gestures:** the photo gallery, the story viewer's pull-down and the listing photo reorder run on Gesture Handler
  and Reanimated; a pull-down also closes on a flick [observed]. `SignPad` still uses `PanResponder` [code].
- **Removed:** about 45 unused files (`src/_app_legacy/`, the Expo template components, the unused query persister,
  legacy HTTP services) [code].
