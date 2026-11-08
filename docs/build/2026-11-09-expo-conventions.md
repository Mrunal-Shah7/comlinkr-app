# 2026-11-09: Expo conventions, mechanical fixes and one HTTP client (TR-013)

Branch `chore/expo-conventions`. Points 1, 2, 4, 5 and 9a of the owner's nine-point list ("I want all the 9 points
resolved in this run"). Run log: [device-runs/2026-11-09-expo-conventions.md](../device-runs/2026-11-09-expo-conventions.md).

## Problem

The Expo skills audit (2026-11-08) left convention gaps that need no design decision:

1. Forms inside scroll views swallowed the first tap while the keyboard was open (no `keyboardShouldPersistTaps`).
2. Two HTTP stacks: the fetch client (`src/api/client.ts`) for most of the app and axios
   (`src/services/http/client.ts`, `apiClient.ts`) for the auth and onboarding services, each with its own cookie
   handling, timeouts and error class.
3. `Dimensions.get('window')` read once at module scope or in render, so sizes never followed a window change.
4. `Platform.OS` instead of `process.env.EXPO_OS`, which Expo inlines at build time so the other platform's branch is
   dropped from the bundle.
5. The onboarding dots animated `width` inside a flex row, re-laying out the row every frame.

## Change

- **Keyboard taps:** `keyboardShouldPersistTaps="handled"` on the 22 vertical scroll containers in files that hold a
  text input.
- **One HTTP client:** `src/services/http/apiClient.ts` is now a thin adapter over `request()` from
  `src/api/client.ts`, with a new `raw` option that returns the body without unwrapping `{ success, data }` (the auth
  and onboarding services unwrap it themselves). It keeps the details-joined validation message, the "cannot reach
  API" message and `HttpApiError` (now the same class as `ApiError`, so `code === 'REGION_NOT_SUPPORTED'` still
  works). `src/services/http/client.ts` and the `bindSessionAuth` wiring in `authStore.ts` are deleted; the session
  cookie lives only in the fetch client's SecureStore handling. `axios` removed from `package.json`.
- **Window size:** `useWindowDimensions()` in the food carousel, the compose preview, the image viewer and the event
  detail; unused module-scope sizes removed. `src/utils/responsive.ts` keeps `Dimensions` with a comment: it scales
  at module scope and the app is portrait-only.
- **`EXPO_OS`:** 70 uses in 34 files; unused `Platform` imports removed.
- **Onboarding dots:** each dot is a fixed slot with an absolutely positioned pill whose width animates (the
  expo-animation exception for an absolute, childless element), so the row no longer re-lays out.

## Commits

- `5719a15` chore(mobile): keyboard taps, window size, EXPO_OS, onboarding dots
- `4e3d158` refactor(mobile): one HTTP client, drop axios

## How it was checked

`pnpm typecheck` passes. On the phone (Expo Go, local backend, `ui_tester`), see the run log: cold restart keeps
the session, wrong password shows the server's message, sign in, edit profile save (and the onboarding re-save it
triggers), forgot password sends a code (logged, not completed), log out and back in. Not checked: sign-up with a
new account, iOS.
