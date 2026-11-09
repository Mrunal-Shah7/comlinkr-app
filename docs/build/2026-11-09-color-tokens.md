# 2026-11-09: hex colours into a named palette (TR-013, point 6)

Branch `chore/color-tokens`, stacked on `chore/ios-conventions`.

## Problem

About 3,000 hex colour literals (`"#FFF"`, `'#EF4444'`, 239 distinct values) were spread over 123 screen and
component files. The same colour was written several ways (`#FFF`, `#FFFFFF`), and nothing showed which colours the
app uses.

## Change

- `src/theme/palette.ts`: every distinct value, by name. Tailwind values keep their Tailwind names (`red500`,
  `gray200`), the design-D brand values their brand names (`brandBlue`, `ink`), the older app colours a legacy name
  (`navy`, `legacyOrange`), and the rest a hue plus HSL lightness (`blueL92`).
- Every whole-string hex literal outside `src/theme/` now reads `palette.<name>`: JSX attributes become
  `color={palette.white}`, object keys become computed keys. Three-digit values are written out in full, so
  `"#FFF" + "18"` style alpha suffixes now produce valid colours.
- **The values are unchanged, so nothing looks different**, including in dark mode. Moving a screen's colours onto
  the theme (`useTheme().tc`, which follows dark mode) is per-screen design work; `palette.ts` says to prefer the
  theme for new code, and the palette shows which raw colours are left.
- Left as they are: the token definitions in `src/theme/` (`colors.ts`, `d.ts`, `useTheme.ts`, `themedStyles.ts`,
  `shadows.ts`) and `rgba(...)` values.

Codemod: one script, checked by `pnpm typecheck` and a search showing no hex literal left outside `src/theme/` and
no equality check against a palette value.

## Commit

See the pull request.

## How it was checked

`pnpm typecheck`. Android, local backend, after a clean restart: Explore, Community, the compose sheet, Food and a
listing detail look as before; Back from a link-opened listing lands on Explore. Dark mode switched on in Settings:
Food, Community and Settings render as before; switched back off. Not checked: every admin screen, iOS.
