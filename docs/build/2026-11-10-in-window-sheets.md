# 2026-11-10: Sheets and dialogs drawn in the app's window on Android (TR-041, TR-019, TR-020, plan 07)

Branch `feature/in-window-sheets`, from `fix/triage-sweep`. Not merged.

## Problem

The Android navigation bar, hidden since plan 04, came back whenever a sheet or dialog opened: the profile menu,
"Post something", the filters, every confirm. Each `DSheet` (Material ModalBottomSheet), React Native `Modal` and
`appAlert` dialog opens its own Android window, and a new window does not inherit the hidden bar
([plan 07](../plan/07-in-window-sheets.md)).

## Change

- **`src/shared/d/SheetPortal.tsx` (new):** a small store of open sheets and a `SheetPortalHost` mounted once in
  `app/_layout.tsx`, above the stack and the tab bar.
  - A sheet: scrim (tap closes), card sliding up from the bottom, drag the handle down to close, Back closes, lifted
    above the keyboard.
  - A layer (for `InWindowModal`): full screen, fade or slide, Back closes, shrinks above the keyboard as a native
    `Modal` window did.
- **`SheetFrame.android.tsx`:** `DSheet` hands its content to the portal instead of opening the native sheet. Its
  props and its 31 call sites do not change. iOS keeps the native sheet.
- **`src/shared/d/InWindowModal.tsx` (new):** the props of `Modal`. iOS renders `Modal`; Android draws a layer in
  the portal. The nine files that still used `Modal` use it now (TR-019): edit profile, restaurant, settings, story
  viewer, four admin screens, the OAuth username picker.
- **`src/shared/ui/Dialogs.tsx`:** the four dialog `Modal`s are an in-window overlay on Android.
- **`CLAUDE.md`:** the rule now says never to open a native window for a sheet or dialog on Android; the
  `GestureHandlerRootView` rule applies to iOS only.

## How it was checked

`pnpm typecheck`. On the phone (OnePlus, Android 16, Expo Go, local backend), the bar stayed hidden in each:
- the profile menu, "Post something", the Listings filters (scrim, drag, Back, keyboard lift);
- a dialog (Log out, then Cancel); the Settings city modal;
- the compose preview (`formSheet`, already drawn in the activity);
- the admin user profile, Change city and Warn user (the warn dialog's own `KeyboardAvoidingView` does not lift
  twice).

The filters reopen on the first tap 0.6 s after closing (TR-020). While the keyboard is open, Android shows its own
navigation buttons; that is the system's, not a window of ours.

Not checked: story comments (no stories in the local data), iOS (unchanged code path).
