# 2026-11-09: Palette colours in dark mode (TR-017, point 1)

Branch `fix/dark-mode-palette`, from `main` after pull request 17.

## Problem

Screens that colour themselves with the static `palette` (TR-013) do not follow dark mode. After pull request 15,
98 files used `palette.*` outside `createThemedStyles`. On those screens a light surface, chip or tint stayed light
in dark mode unless the JSX switched on `isDark` by hand.

## Cause

Two separate gaps:
- **Files that never used the shim:** 44 files still build their styles with `StyleSheet.create`, so no colour in
  them is ever mapped for dark mode.
- **Colours the tables did not name:** `createThemedStyles` maps only the hex values its tables list. Any other light
  neutral or tint (for example `neutralL97_10`, `red100`, `green50`) stayed light, even in files that use it.

## Change

**A fallback in `createThemedStyles`** (`src/theme/themedStyles.ts`), used in dark mode for any colour the tables do
not name:
- Backgrounds: a light neutral (lightness 94% or more) becomes the card or input surface. A light tint becomes a
  dark shade of its own hue.
- Text: dark and mid-grey neutrals become the theme's primary and secondary text. A dark saturated text colour is
  lightened in its own hue.
- Borders: light neutrals become `borderLight`. Light tints become a dark shade of their hue.
- Left alone: saturated brand and status colours, light text (white on a brand button), shadows and tints.

This also reaches the files that already used `createThemedStyles`.

**Colour only (`{ fonts: false }`):** `createThemedStyles` also swaps fonts to design D's in both themes. The new
option skips that, so the files moved over below look the same in light mode as before.

**Moved from `StyleSheet.create` to `createThemedStyles(…, { fonts: false })`.** These are the 15 files with light
surfaces in their styles:
- the Explore feed styles (`src/styles/feedScreen.styles.ts`), `news.styles.ts` and `PostCard.tsx`;
- the Listings styles (`housingScreen`, `propertyDetail`, `availableRoom`, `roommate`) and
  `ReportListingModal.tsx`;
- `foodShared.tsx`, `app/(tabs)/community/index.tsx`, `app/chat.tsx`;
- `login`, `signup`, `forgot-password`;
- `src/shared/ui/Input.tsx`.

**`usePaletteColor()`:** a hook for a colour passed as a prop or inline style. It maps the colour the same way and
subscribes the component to the theme. It is used for:
- the news photo's loading background;
- the room card's match pill and furnished chip;
- the restaurant report flag tile;
- the report-listing reason icons.

**Left as they are on purpose:**
- **White on brand buttons and category hues** (`postTypes`, the admin and explore constants) read in both themes.
- **Screens dark in both themes:** the story viewer and the gallery use `createDTypeStyles`. The check-in scanner
  and the story composer stay on `StyleSheet.create`.
- **Already handle dark themselves:** `DateTimePickerField` and `ErrorBoundary`.
- **The branded LIVE NEWS card** is light by design, like a picture.
- **The 29 smaller `StyleSheet.create` files** use `palette` only for white on colour, shadows or brand colours.
  `src/shared/d/index.tsx` is among them.

## Checked

- `pnpm typecheck` passes.
- Walked on the OnePlus (Android 16, Expo Go) against the local backend as `ui_tester`, with dark mode switched on
  in Settings:
  - **The fallback alone,** before any file moved: profile, get a badge, help and badge status.
  - **The moved screens:** Explore, Listings (Homes, Rooms, Roommates), a listing's detail, the report-listing
    sheet (with a reason selected, then closed without sending), Food, Community, and Messages.
  - Dark surfaces, readable text, no white blocks left. The report reasons' icon tiles were still white and are
    fixed with `usePaletteColor`.
  - **Toggle without remounting:**
    1. With Listings, a listing's detail and Messages on the stack, switching dark mode off in Settings and pressing
       Back redrew each one light.
    2. Switching it back on redrew the Listings, Community and Explore tabs dark.
  - **Light mode:** the same screens look as before, with fonts unchanged.
  - Dark mode was switched off again at the end.
- **Not walked:**
  - Login, sign-up and forgot password: walking them means signing out, and the test account's password is not in
    the repository.
  - iOS.
