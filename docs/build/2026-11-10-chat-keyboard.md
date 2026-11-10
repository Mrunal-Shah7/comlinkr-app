# 2026-11-10: The chat composer above the Android keyboard (TR-045)

Branch `fix/chat-keyboard`, from `feature/quest-progress`. Not merged.

## Problem

On Android, with the keyboard up, the chat composer sat half or fully under the keyboard. Send was only tappable just
above its middle. It happened in every chat.

## Cause

The app hides the navigation bar (`app/_layout.tsx`), but Android shows it again over the bottom of the keyboard
while the keyboard is up.
- `KeyboardAvoidingView` (`behavior="height"`) and Reanimated's `useAnimatedKeyboard()` both report the keyboard's
  height without the bar.
- On the OnePlus that is 852 px out of 984: the keyboard's top was at y 1428, and the bar is 132 px (2280 to 2412).
- The thread was therefore lifted 132 px too little.

Reanimated takes the bar off unless the bar is "translucent". It decides that from its edge-to-edge check, which is
false in Expo Go.

The earlier attempt with `useAnimatedKeyboard` (in the TR-043 build note) used it without the flag, and left the
field fully covered.

## Change

- **`app/chat.tsx`:** a `KeyboardFrame` replaces the screen's `KeyboardAvoidingView`.
  - iOS keeps `KeyboardAvoidingView` (`padding`).
  - Android pads the screen by `useAnimatedKeyboard({ isNavigationBarTranslucentAndroid: true })`, which is the
    keyboard's full height.

## How it was checked

- **Mobile:** `pnpm typecheck`.
- **Phone** (OnePlus, Expo Go, local backend), as `uit_gps1`, in a new chat with `uit_hannah5`:
  - **Keyboard up:**
    - the field's centre is at y 1334, above the keyboard's top at 1428;
    - after typing, Send is at 1332;
    - nothing was sent.
  - **Escape:** the composer went back to the bottom (y 2318).
  - **A full restart was needed:** a fast refresh kept the old keyboard listener, and the field stayed at 1466.
- **The post sheet's comment field** (an in-window sheet with its own `useAnimatedKeyboard()`) already sat above the
  keyboard, so the sheets are unchanged.

## Not checked

- **The other screens that pass `behavior="height"` on Android:**
  - `create-post`;
  - `restaurant/[id]`;
  - the admin pages;
  - `OAuthUsernamePickerModal`.

  Their fields sit in scrolling forms, not at the bottom edge.
- **A phone with gesture navigation:** its bar is shorter.
- **iOS:** unchanged.
