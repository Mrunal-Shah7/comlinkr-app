# TR-011: the mobile app checked rule by rule against the installed Expo skills

Merged as pull request 5.

_2026-11-08. Triage [TR-011](../triage.md). Review [08 Platform](../system-review/08-platform.md). Run log
[2026-11-08 Expo review](../device-runs/2026-11-08-expo-review.md), fourth round. Follows the
[Expo review](2026-11-08-expo-review.md) (TR-010)._

## Problem

The owner asked to "make sure that all the expo code is verified against the installed official expo skills"
(`.claude/skills/`, `skills-lock.json`). The first review (TR-010) fixed bugs and the gestures; it did not go through
every rule of every skill.

## How it was checked

- `npx expo-doctor` and `npx expo install --check`.
- One grep per skill rule over `app/` and `src/` (the rules are listed below). Each rule gets one status: **pass**,
  **fixed** (on this branch), **deviation** (deliberate, with the reason) or **reported** (left as it is, with the
  reason).
- Skills that do not apply to this app were not checked: eas-* (no build or update was made), expo-app-clip,
  expo-brownfield, expo-dom, expo-module, expo-migrate-module, expo-web-to-native, expo-tailwind-setup,
  expo-project-structure (new projects only).

## Findings and status

### Setup (expo-overview, expo-upgrade)

| Rule | Status |
| --- | --- |
| One package manager, one lock file | **Fixed.** `package-lock.json` deleted; pnpm only. |
| Packages match SDK 57 (`expo install --check`) | **Fixed.** Nine patch bumps (`expo` 57.0.32, `expo-router` 57.0.30, `expo-asset`, `expo-build-properties`, `expo-constants`, `expo-image-picker`, `expo-notifications`, `expo-splash-screen`, `expo-updates`). `expo-doctor` now passes 21/21. |
| No unused dependencies | **Fixed.** `@tanstack/query-async-storage-persister` removed (its only user was deleted in TR-010). |

### expo-animation

| Rule | Status |
| --- | --- |
| Reanimated, not core `Animated`; no `PanResponder`; no `LayoutAnimation` | **Pass** (moved in TR-010). |
| `scheduleOnRN`, not `runOnJS` | **Pass.** |
| `.get()` / `.set()`, not `.value` | **Fixed.** 159 uses in 31 files. |
| No `Easing.in`, no `'cubic-bezier(...)'` strings | **Pass.** |
| `CADisableMinimumFrameDurationOnPhone` set | **Fixed.** Set explicitly in `app.config.js` (`ios.infoPlist`). Takes effect in the next iOS build. |
| Animate `transform` / `opacity` only | **Reported.** The onboarding dots animate `width`; they are small, in-flow and seen once. |
| Tab switches do not slide; no JS screen transitions | **Deviation.** `SwipeTabs` and `ZoomStack` are design D (plan 01). |

### expo-router

| Rule | Status |
| --- | --- |
| No components inside `app/` | **Pass** (fixed in TR-010). |
| Kebab-case route files | **Pass** (only `_layout`, `+native-intent`, `[id]`, which are conventions). |
| No `@react-navigation/*` imports | **Pass.** |
| `NativeTabs`, `formSheet`, `Link.Preview` | **Deviation.** Floating tab bar and sheets are design D (plan 01). |

### expo-native-ui

| Rule | Status |
| --- | --- |
| `expo-image`, not React Native `Image` | **Fixed.** Four admin screens (`resizeMode` → `contentFit`); unused import removed from `app/events.tsx`. |
| `expo-status-bar`, not React Native `StatusBar` | **Fixed.** `app/story-viewer.tsx`. |
| `SecureStore` for tokens | **Pass.** |
| `useWindowDimensions`, not `Dimensions.get` | **Reported.** 8 files. Most read the size once for a layout constant; it matters only on rotation or split screen, which the app does not support (`orientation: portrait`). |
| `process.env.EXPO_OS`, not `Platform.OS` | **Reported.** 69 uses in 34 files. Same behaviour; the skill's form only helps tree-shaking. |
| `keyboardShouldPersistTaps` on scrolling forms | **Reported.** 16 files with a `TextInput` in a scroll view have none (forgot password, apply badge, help, property agreement, story viewer, story composer, three housing modals, seven admin screens). A tap on a button while the keyboard is open first only closes the keyboard. Worth a pass of its own with a phone check per form. |
| `borderCurve: 'continuous'`, `contentInsetAdjustmentBehavior`, selectable text | **Reported.** Not used; iOS polish, and the app has not been looked at on iOS. |

### expo-data-fetching

| Rule | Status |
| --- | --- |
| No axios; one fetch client | **Reported.** `src/services/http/apiClient.ts` still uses axios next to the fetch client (TR-010). |
| React Query for server state | **Reported.** 37 `useQuery` / `useMutation` calls, all in two files (`useAdmin.ts`, `ExploreBento.tsx`); the rest of the app fetches in `useEffect` (review 08, Q2). |
| Retry, timeout | **Pass** (fixed in TR-010). |

### expo-design-system, expo-ui

| Rule | Status |
| --- | --- |
| Colours from theme tokens | **Reported.** About 2 500 hard-coded hex colours in `.tsx` files. |
| `@expo/ui` for native controls | **Deviation.** Design D draws its own controls (plan 01). |

### Not from app code

- The development warning about `InteractionManager` comes from expo-router itself
  (`node_modules/expo-router/build/react-navigation/stack/views/Stack/Card.js`, `createInteractionHandle`). App code
  uses `runAfterTransition()`; `src/utils/afterTransition.ts` only names it in a comment.

## Change

Branch `chore/expo-skills-audit`: the fixed rows above. No behaviour is meant to change.

## Checked

- `npx tsc --noEmit`, `npx expo-doctor` (21/21), `npx expo export --platform android --clear`.
- On the phone (OnePlus, Android 16, Expo Go, local backend, `ui_tester`): tab swipe and the tab bar indicator;
  Homes → Rooms segmented indicator; the + sheet opened, Back, short drag springs back, long drag closes; a listing
  saved and unsaved (no `HousingSave` row left); a seeded story opened from an `?openStory=` link, status bar hidden
  and back after closing. Details in the run log, fourth round.

## Not checked

- **The native patch bumps.** Expo Go ships its own native code, so the new `expo-*` patches are only exercised in a
  development or release build. `runtimeVersion` follows `appVersion` (1.0.4): an `eas update` from this code would
  reach 1.0.4 binaries built with the older native patches. Build a new binary (and bump the version) before the next
  update.
- The admin screens' images: the app caches the role at sign-in, so the test account set to ADMIN in the database did
  not open them. The role was put back to USER.
- iOS (the `infoPlist` key, the status bar), a release build.
