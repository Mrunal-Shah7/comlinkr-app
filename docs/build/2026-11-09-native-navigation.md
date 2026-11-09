# TR-012: native tabs, native screen transitions and native controls

Merged as pull request 6.

_2026-11-09. Triage [TR-012](../triage.md). Plan [02](../plan/02-native-navigation.md). Review
[08 Platform](../system-review/08-platform.md). Run log
[2026-11-09 native navigation](../device-runs/2026-11-09-native-navigation.md)._

## Problem

The [Expo skills audit](2026-11-08-expo-skills-audit.md) left design D's own navigation and controls as deliberate
deviations: a swipeable tab pager with a floating tab bar, zoom transitions on a JS stack, and a hand-drawn segmented
control, switches and sheet. The owner asked for the native ones "even if they deviate from the original design D".

## Change

- **Tabs** (`app/(tabs)/_layout.tsx`): `NativeTabs`. Same four tabs plus a fifth trigger, **Post**, which is
  `disabled` (the bar stays on the current tab) and opens the compose sheet from `tabPress`; `app/(tabs)/post.tsx`
  renders nothing. Icons: SF Symbols on iOS, Material Symbols on Android. Colours come from the theme, and labels are
  always shown. Tab screens no longer add `tabBarClearance()`. Deleted: `SwipeTabs`, `DTabBar`.
- **Lost with the native tab bar:** swiping between tabs, the floating glass bar and its indicator, and the long-press
  shortcuts on each tab.
- **Screen transitions** (`app/_layout.tsx`, `app/(auth)/_layout.tsx`): expo-router `Stack` (native stack) with the
  platform's push animation; reduce motion fades; screens keep the painted page colour. Deleted: `ZoomStack`.
- **Controls** (`@expo/ui` 57.0.26, added with `npx expo install`):
  - `src/shared/ui/Switch.tsx`: the universal `Switch` in a `Host` seeded with the accent colour. It replaces React
    Native's `Switch` in seven files.
  - `Segmented` (`src/shared/d/Segmented.ios.tsx`, `.android.tsx`): a SwiftUI segmented `Picker` on iOS, a Material 3
    `SingleChoiceSegmentedButtonRow` on Android, and the universal `Picker` elsewhere. The props are the same, so the
    eight screens that use it did not change.
  - `DSheet` (`src/shared/d/Sheet.tsx`): the universal `BottomSheet` with the content in an `RNHostView`. It has native
    drag, scrim and Back. While the keyboard is open the sheet goes to full height so fields stay above it. The `grow`
    animation out of the + went with the + itself.
  - `StarPicker`: touches go through the React Native responder instead of a gesture-handler `Pan`, because
    gesture-handler gestures never fire inside the native sheet.
- **Kept:** OTP boxes, signature pad, match ring and password rules have no `@expo/ui` equivalent. `DismissibleSheet`
  (full-screen detail modals with pull-down to close) is not a control.

## Found on the phone while building

- `GestureHandlerRootView` inside the native sheet crashes Expo Go ("has not been mounted under ReactRootView").
- Without `RNHostView`, a React Native `ScrollView` inside the sheet crashes on the first drag
  (`RootViewUtil.getRootView` assertion).
- The rating stars did nothing inside the sheet (gesture-handler); fixed as above.
- The keyboard covered the sheet's text field; fixed by switching to full height while it is open.
- These are now a rule in `CLAUDE.md`.

## Commits

On `feature/native-navigation`: tabs (`c73dc6d`), stack (`acf29aa`), then the controls with these docs.

## How it was checked

- `npx tsc --noEmit`, `npx expo-doctor` (21/21), `npx expo export --platform android`.
- On the phone (OnePlus, Android 16, Expo Go, local backend, `ui_tester`); details are in the run log:
  - the tab bar and every tab;
  - Post opens the sheet and the bar stays put; Back closes it;
  - a listing pushed and popped;
  - a chat thread opened from a listing and closed with Back;
  - the segmented control on Listings;
  - the compose sheet expanded and scrolled, and a row opened its composer;
  - the rating sheet: tap and drag on the stars, typing with the keyboard up, closed without posting;
  - switches in Settings;
  - dark mode on and off.

## Not checked

- iOS (no device): the system tab bar, the SwiftUI segmented picker, the SwiftUI sheet, edge swipe back.
- The story viewer's `slide_from_bottom` (no story seeded this round).
- The agreement reader sheet, the Community ask sheet and the other sheets one by one. They share `DSheet`, which was
  walked through the compose and rating sheets.
- A release build.
