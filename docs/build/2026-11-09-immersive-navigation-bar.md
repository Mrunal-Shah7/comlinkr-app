# 2026-11-09: Hide the Android navigation bar (TR-021, plan 04)

Branch `feature/immersive-nav-bar`, from `main` after pull request 18.

## Problem

The owner asked for the app to use the whole screen on Android. The navigation buttons should appear only when the
user swipes up from the bottom edge ([plan 04](../plan/04-immersive-navigation-bar.md)).

## Change

- Added `expo-navigation-bar` (`npx expo install`, 57.0.3).
- **`app/_layout.tsx`:** `<NavigationBar hidden />` next to the `StatusBar`. On Android the library hides the bar
  with `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`, so a swipe from the edge shows it for a moment over the app. On iOS
  it does nothing.
- **`app.config.js`:** `['expo-navigation-bar', { hidden: true }]`, so release and development builds start with the
  bar hidden before JavaScript runs. Expo Go ignores the plugin and relies on the component.

## Checked

- `pnpm typecheck` passes.
- Walked on the OnePlus (Android 16, buttons navigation, Expo Go) against the local backend:
  - **After a cold start of Expo Go:** the bar is hidden, and the tab bar sits at the bottom edge.
  - **A swipe up from the bottom edge:** Back, Home and Recents appear over the tab bar and hide again after a few
    seconds.
  - **The Listings filter sheet:** the bar shows while the sheet is open and hides when it closes. The sheet's
    footer stays above the bar. This is expected; see plan 04, "Lost".
  - **Light and dark mode:** the bar stays hidden in both.
- **Not walked:**
  - A development or release build, where the config plugin applies.
  - A phone set to gesture navigation.
  - iOS, where nothing changes.

## Found on the way

- TR-022: a cold start through a deep link (for example `/--/settings`) can land on the sign-in screen although the
  session is valid. Opening any route again shows the app signed in. Redis held the session the whole time.
