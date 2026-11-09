# 2026-11-09: iOS conventions, peek and context menus (TR-013, point 8)

Branch `chore/ios-conventions`, stacked on `chore/detail-routes`.

## Problem

The cards that open a detail had no iOS press-and-hold preview or native context menu, and the Food tiles used a
JS action sheet on long press. Card corners used the default circular curve, not the iOS continuous one.

## Change

- `src/shared/d/DetailLink.tsx`: on iOS (`process.env.EXPO_OS === "ios"`) wraps a card in an expo-router `<Link>`
  with `<Link.Trigger>`, `<Link.Preview />` and an optional `<Link.Menu>`. The tap stays the card's own `Pressable`
  (the Link's `onPress` lands on a plain `View` and is ignored), so the route is pushed once; tapping the preview
  opens it through the Link. On Android and web it returns the card unchanged.
- Wrapped: listing feature and tiles (menu: save, share), shared space tiles (preview only), event tiles (menu:
  save), Food grid tiles (menu: favourite, save, share, directions). On iOS the Food tile's JS long-press sheet is
  off, the native menu replaces it; Android keeps the sheet.
- `borderCurve: "continuous"` on the shared card, tile, chip, stepper, input, legal card and OTP box styles, and on
  the listing and event card photos. Android ignores it.

## Commit

See the pull request.

## How it was checked

`pnpm typecheck`. Android, local backend: Food and Listings render as before; tapping a listing opens the detail
with one `GET /housing/:id`. **Not checked: iOS.** There is no iPhone or Mac here, so the peek, the menus and the
continuous corners are unverified; walk them on an iPhone before release (press and hold a listing, an event and a
restaurant tile; tap the preview; each menu action; a normal tap still opens once).
