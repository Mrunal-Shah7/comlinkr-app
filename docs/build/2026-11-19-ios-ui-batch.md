# 2026-11-19: iOS fixes from the owner's screenshots (TR-057 to TR-062)

Branch `fix/ios-ui-batch`, from `origin/main` (which holds `5cbf35e` and `a4790e7` from another developer that the
local `main` did not have). Merged as pull request 52 (merge `adc6406`).

## Problems and changes

1. **Cards over the tab bar (TR-057).** On Food, a restaurant card drew through the tab icons on one iPhone and not
   on another. UIKit's scroll-edge appearance makes the tab bar transparent when the list's end meets it.
   `app/(tabs)/_layout.tsx`: `disableTransparentOnScrollEdge` on `NativeTabs`.
2. **"Comlinkr" (TR-058).** Commit `5cbf35e` added the word mark spelled "Comlinkr" to the header (`AppHeader`), the
   side menu, login and sign-up after TR-046 had settled on "ComLinkr". All four now say "ComLinkr".
3. **Blank Ask sheet on iOS (TR-059).** `DSheet` passed `full={full || kb > 0}`: when the keyboard opened, the iOS
   sheet switched from content-sized to full height. `@expo/ui`'s `BottomSheetView.swift` builds its content in two
   different branches for the two modes, so the switch rebuilds the SwiftUI content, and the React Native views
   inside did not come back (a white sheet over the keyboard). The sheet now keeps its mode; the content still grows
   by the keyboard's height. The Ask and Apply sheets also lost a `KeyboardAvoidingView` that lifted them a second
   time. Android's frame ignores `full`, so Android is unchanged.
4. **Chat dates (TR-060).** `app/chat.tsx` showed a fixed "Today" above the thread. Each message now keeps its sent
   time (`at`), and the thread puts a label before each new day: Today, Yesterday, a weekday within a week, then
   "12 Nov" (with the year when it differs).
5. **Room currency (TR-062).** The rent and deposit fields of "A room in my home" and of the owner's quick edit
   said "$" while the hint said GBP. They now show the symbol of the room's currency (`getBusinessCurrency`).
6. **Community a room is looking for (TR-061, [plan 19](../plan/19-room-community-preference.md)).** New optional
   column `SharedSpace.communityPreference`, the API field, a "Looking for (optional)" field in the room form, and
   "Looking for: ..." on the room detail in place of "Open to anyone".

## How it was checked

- Mobile `pnpm typecheck`; backend `tsc --noEmit`, ESLint on the module, unit tests (124 passed).
- Migration applied to `comlinkr` and `comlinkr_test`; the column queried in both (`character varying(80)`,
  nullable).
- **Not checked on an iPhone:** items 1 and 3 are iOS-only and this machine drives an Android phone. The owner is
  asked to check them.
- **Walked on Android** (Motorola, Expo Go, local backend): the header, the Ask sheet, chat day labels (with a
  sent and deleted message), the room form's £ and the "Looking for" field from publish to delete
  ([run log](../device-runs/2026-11-19-ios-ui-batch.md)).
- Seen while walking, not fixed: room prices use the viewer's currency, so a GBP room shows "$" to a US viewer.
