# 2026-11-25: themed pickers, prices in the user's currency, a shorter listing detail (TR-063 to TR-067)

Branch `feature/ui-polish-currency-listing`, from `origin/main` (`10d0b89`). Mobile app only.

## Problems and changes

1. **Google account chooser (TR-063).** Not changed. `GoogleSignin.signIn()` hands over to Google's own account
   chooser (Credential Manager on Android, Google's sheet on iOS). It follows the phone's light or dark setting and
   no app can restyle it; `@react-native-google-signin/google-signin` has no option for it.
2. **Date and time pickers (TR-064).** `components/DateTimePickerField.tsx` opened the system pickers, which are grey
   and follow the system theme. `DatePickerField` and `TimePickerField` now open a panel under the field in the
   app's colours:
   - date: a month grid (Monday first, one row per week), arrows for the month, the chosen day filled with the
     accent, today outlined, days before `minimumDate` dimmed; choosing a day closes it;
   - time: hour chips (12, 1 to 11), minutes :00 / :15 / :30 / :45 (a saved minute off the quarter is added), an
     AM/PM switch and "Set 7:30 PM".
   The props and the stored formats are unchanged, so every screen that uses them (reservation, events, housing,
   profile, the application, the composer) gets the new panels. `@react-native-community/datetimepicker` is no
   longer imported but stays in `package.json`.
   First version laid the grid out with seven `14.28%` cells; Android rounded them past the row and wrapped Sunday.
   Rows of seven `flex: 1` cells fixed it.
3. **Prices in the user's currency (TR-065).** Three causes:
   - the app's user had no country from the server: `mapAuthUser` (`src/services/http/authService.ts`) dropped
     `userLocation`, and `profileToAppUser` read `profile.country`, which the API does not send. Both now carry
     `country` and `countryCode` (new optional fields on `UserProfile` and `User`);
   - a restored session never asked the server again, so a country saved elsewhere never arrived.
     `hydrate` now calls `/auth/me` once in the background and keeps the server's country and city
     (`refreshLocationFromServer`, `src/store/auth.store.ts`);
   - screens wrote `$` themselves or formatted once. New `currencyForUser` (chosen country, then located country,
     then a guest's city country, then US dollars) and `formatPrice` in `src/utils/currency.ts`; hook
     `useUserCurrency` (`src/hooks/useUserCurrency.ts`). Event rows keep the number (`priceAmount`) and the event
     tile, detail and registration format it at render time (`eventPriceLabel`). Also: the events screen, my
     listings, the landlord dashboard, settings, saved listings' subtitles ("GBP650" before), the composer's ticket
     price, the room form and the room cards. A listing or room with its own currency keeps it.
   `formatPrice` uses a fixed symbol table, not `Intl`, which printed "US$" on an en-GB phone.
4. **Listing detail (TR-066, [plan 20](../plan/20-listing-detail-first-view.md)).** Icons on the fact tiles, an "at a
   glance" grid of four facts, a three-line description, six amenities with icons, and "More details" for the rest.
   `LinkifiedText` gained `numberOfLines`. The amenity icon rules are ordered so "Dishwasher" is not matched as a
   washer.
5. **Buttons on wider screens (TR-067).** The shared buttons hug their label unless `block`; footers and sheets
   already pass `block`, so most rows fill the width. What showed the gap on Android was Explore's tab row
   (`src/shared/d/ScrollTabs.tsx`): a horizontal scroller whose five tabs stopped short of the right edge. The tabs
   now grow to share the row when they fit, and still scroll when they do not. The owner's iPhone case was not seen
   here; a screenshot of any other button is asked for.
6. **Time panel cut off in a row of two fields (found on the release APK).** On the event form, Start time and End
   time sit side by side; the time panel is drawn as a sibling of its field, so it became a third item in that row,
   ran past the right edge (the 5 and 11 chips and "Set" cut) and left End time as a sliver. The panel now takes the
   full width (`components/DateTimePickerField.tsx`), and the two side-by-side time rows in
   `src/features/compose/PostForm.tsx` (event start / end, business opening hours) wrap, so the open panel gets a
   line of its own. The event edit screen keeps each time field in its own half column, so its panel stays half
   width (not cut, but narrow). Checked on a rebuilt release APK.
7. **Furnished card read "Furnished / Furnished".** The label is now "Furnishing" in `PropertyDetail.tsx`; the value
   stays "Furnished" or "Unfurnished". Checked on a rebuilt release APK.

## How it was checked

- Mobile `pnpm typecheck`.
- **Walked on Android** (OnePlus, Expo Go, local backend, demo account `rohan@demo.comlinkr.test`)
  ([run log](../device-runs/2026-11-25-ui-polish-currency-listing.md)): an event price with the user in the United Kingdom ("£15" on the tile, the
  detail and "Confirm · £15"), the reservation date and time panels, the listing detail closed and open with the
  amenity icons, and Explore's tab row.
- For the currency walk the local database was changed and then put back: Rohan's location to the United Kingdom,
  and one event to a paid ticket of 15.
- **Release APK on production** (owner's say-so, same day): as a guest, then signed in by the owner; nothing
  submitted. Tab row, USD prices, listing detail and More / Fewer details, the event date panel and the
  reservation time panel were right; the event form's time panel was cut off (item 6). Items 6 and 7 were then checked on a rebuilt APK.
- **Not checked on an iPhone.** The Google chooser and button alignment items came from iPhone screenshots.

## Seen while working

- Metro started with `CI=1` does not watch files, so edits never reached the phone. Rule added to `CLAUDE.md`
  (Tools).
