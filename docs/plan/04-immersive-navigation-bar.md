# 04. Hide the Android navigation bar

**Status: Built (2026-11-09) on `feature/immersive-nav-bar`, [build note](../build/2026-11-09-immersive-navigation-bar.md).**
Owner, 2026-11-09: "get rid of the mobile's navigation buttons that always appear at the bottom … when the user
swipes up from the bottom edge, only then those buttons appear … the app can use the full screen size". Triage
[TR-021](../triage.md).

## Problem

On Android the system navigation bar (Back, Home, Recents on phones set to buttons; a gesture handle on phones set
to gestures) always takes a strip at the bottom of the screen.

## What will change

- On Android the navigation bar is hidden throughout the app ("immersive" mode).
- A swipe up from the bottom edge shows it over the app for a few seconds; it then hides again.
- Release builds start with it hidden, via the `expo-navigation-bar` config plugin. Expo Go hides it once the app
  has loaded, via `<NavigationBar hidden />` in the root layout.
- The app regains the bar's height. The tab bar sits at the bottom edge.

## What will not change

- The status bar at the top.
- iOS, which has no navigation buttons.

## Lost

- **Back is one step further away on phones set to buttons:** swipe up, then tap Back. Every pushed screen keeps its
  own ← button, so this matters mostly for closing sheets and dialogs.
- **The bar shows while a sheet or dialog is open.** The native sheet and React Native `Modal` open in their own
  Android window, which shows the bar. It hides again when they close.

## How it will be checked

`pnpm typecheck`. On the phone (Android, Expo Go):
- the bar is hidden on launch;
- a swipe from the bottom edge shows it, and it hides again;
- a native sheet opens and closes;
- the bar is still hidden after the app returns from the background and after a cold start.
