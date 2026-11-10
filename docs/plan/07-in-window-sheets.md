# 07. Sheets and dialogs drawn in the app's own window (Android)

**Status: Building (2026-11-10) on `feature/in-window-sheets`.** Owner, 2026-11-10: "Still there's places or steps
where the navigation menu appears such as when the profile button is clicked and the drawer opens from the bottom
or when the create post button is tapped." Triage [TR-041](../triage.md).

## Problem

Plan 04 hid the Android navigation bar, and recorded one limitation: the bar shows while a sheet or dialog is open.
Every `DSheet` (Material's ModalBottomSheet from `@expo/ui`, TR-017), every React Native `Modal` and every dialog
from `appAlert` / `confirmDialog` opens its own Android dialog window. A new window does not inherit the activity's
hidden bar, so the bar comes back: the profile menu, the "Post something" sheet, filters, every confirm.

## What will change

- **Android sheets:** `SheetFrame.android.tsx` stops opening a native sheet. The sheet is drawn by React Native in
  the app's window, through a portal: `DSheet` hands its content to a `SheetPortalHost` mounted once at the root,
  above the stack and the native tab bar. The host draws the scrim, the card sliding up from the bottom, drag down
  to close, Back to close, and lifts the card above the keyboard. `DSheet`'s props do not change, so its 31 call
  sites do not change. iOS keeps the native SwiftUI sheet (iOS has no navigation bar to hide).
- **Dialogs:** `DialogHost` (`src/shared/ui/Dialogs.tsx`) already sits at the root; its four `Modal`s become plain
  overlays in the same window.
- **The other React Native `Modal`s** (TR-019: edit profile, restaurant, settings, story viewer, four admin screens,
  the OAuth username picker) move to `DSheet` or an in-window overlay, one by one, each checked on the phone.

## What will not change

- What each sheet contains, its title, and how it opens and closes for the user.
- iOS.

## Rejected

- Patching `@expo/ui` or React Native's `Modal` natively to hide the bar on their dialog windows: Expo Go cannot run
  native changes, and the app is checked in Expo Go.

## Risks

- Portal content renders under the root, not under the screen that opened it: a sheet's content must not rely on
  hooks that read the screen's own navigation context (`useFocusEffect`, `useLocalSearchParams`). Checked with a
  grep of sheet contents.
- The rule in `CLAUDE.md` ("inside `DSheet` never use `GestureHandlerRootView`, gestures never fire") applied to
  the native sheet; on Android it no longer holds and is reworded in this pull request.

## How it was checked

See the [build note](../build/2026-11-10-in-window-sheets.md). Planned:

`pnpm typecheck`. On the phone (Android, Expo Go), with the bar hidden: the profile menu, "Post something", the
Listings filters, a full-height form sheet with the keyboard up, a confirm dialog, an action sheet; for each, open,
close by scrim, by drag, by Back and by its button, and check the bar stays hidden and the first tap after closing
works (TR-020).
