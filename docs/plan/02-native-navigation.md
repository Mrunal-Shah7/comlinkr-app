# 02. Native tabs, native screen transitions and native controls

**Status: Building (built 2026-11-09) on `feature/native-navigation`; Android walked, iOS not checked.** [Build note](../build/2026-11-09-native-navigation.md). Owner, 2026-11-09: "implement the changes even if
they deviate from the original design D". Triage [TR-012](../triage.md). Follows the
[Expo skills audit](../build/2026-11-08-expo-skills-audit.md), which listed these as design D deviations.
Supersedes the navigation part of [plan 01](01-design-d.md) (phase 1, item 3) and its `Segmented`, `Sheet` and
switches.

## Problem

Design D draws its own navigation and controls in JavaScript: a swipeable tab pager (`SwipeTabs`), a floating glass
tab bar with a central + and a liquid indicator (`DTabBar`), zoom transitions on a JS stack (`ZoomStack`), and its
own segmented control, switches and sheets. The installed Expo skills (expo-router, expo-animation, expo-ui) ask for
the platform's own: `NativeTabs`, the native stack, `@expo/ui` controls. Tabs are peers and do not slide; screen
transitions are the platform's; controls are SwiftUI on iOS and Jetpack Compose on Android.

## What will change

Three steps, each its own commit, each walked on the phone before the next.

1. **Tabs.** `app/(tabs)/_layout.tsx` uses `NativeTabs` (`expo-router/unstable-native-tabs`): Material 3 bottom
   navigation on Android, the system tab bar (liquid glass on iOS 26) on iOS. Same four tabs, names and order.
   - **Lost:** swiping between tabs; the floating bar and its liquid indicator; the long-press shortcuts on each tab.
   - **The + (compose sheet)** cannot sit in a native tab bar. It becomes a fifth tab, "Post", that never opens a
     screen: pressing it opens the compose sheet (the trigger is `disabled`, so the native bar stays on the current
     tab, and `tabPress` opens the sheet).
   - Tab screens drop `tabBarClearance()`: the native tabs inset content themselves.
2. **Screen transitions.** `ZoomStack` is replaced by the expo-router `Stack` (native stack) in `app/_layout.tsx`
   and `app/(auth)/_layout.tsx`. Pushed screens use the platform animation (iOS push with edge swipe back; Android's
   default). Reduce motion: `animation: 'fade'`. The story viewer keeps `slide_from_bottom`. Chat's Back still
   closes an open thread first.
3. **Controls** (`@expo/ui`, `npx expo install @expo/ui`):
   - Switches → `Switch` from `@expo/ui`.
   - The segmented control → the platform's segmented control (SwiftUI `Picker` with the segmented style on iOS,
     Compose `SegmentedButton` on Android), in `.ios.tsx` / `.android.tsx` files under `src/`.
   - Sheets (`Sheet`, `DismissibleSheet`, the compose sheet) → `BottomSheet` from `@expo/ui` where the content
     fits; a sheet with a form or a list that scrolls stays as it is if `BottomSheet` cannot hold it, and is listed
     in the build note.
   - Kept, no `@expo/ui` equivalent: OTP boxes, star picker, signature pad, match ring, password rules.

## What will not change

- Screens' content, colours and fonts; the API; the admin console (it already uses the native `Stack`).

## Risks

- `NativeTabs` is `unstable-` in SDK 57; if Expo Go cannot show it, step 1 stops and the owner is asked.
- Android has no edge swipe back on the native stack; system Back and the predictive-back setting stay as they are.
- Horizontal scrollers no longer compete with a tab pager; the CLAUDE.md rule about gesture-handler scrollers in tab
  screens is dropped with step 1.
