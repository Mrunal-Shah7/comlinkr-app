# 2026-11-09: Back returns to the previous state (TR-023, plan 05)

Branch `feature/back-history`, from `main` after pull request 19.

## Problem

On Android, Back from any tab went to Explore. Back also left a screen even when the user had just switched a
section, picked a filter or typed a search there ([plan 05](../plan/05-back-history.md)).

## Change

- **Tabs:** `app/(tabs)/_layout.tsx` sets `backBehavior="history"` on `NativeTabs`. Back retraces the tabs in the
  order visited, then leaves the app from Explore.
- **`src/hooks/useBackState.ts`:** `useBackState(initial, { coalesceMs })` returns `[value, set, setSilently]`.
  - `set` records an undo in the screen's history, keyed by the route.
  - While the screen is focused, it listens for Android Back (`BackHandler`) and undoes the last step that still
    changes something before navigation sees Back.
  - Changes made within 80 ms are one step.
  - With `coalesceMs`, a burst of typing is one step.
  - `useBackBatch()` groups everything changed while a sheet is open into one step.
  - A screen's history is dropped when it unmounts.
- **Converted (28 screens):**
  - Listings: sections, the type chip, search, the filter sheet as one step, the roommate filter and sub-tab;
  - Explore: sections, news category and sub-tab, story filter and sort;
  - Food: chip, cuisine, search;
  - Community: topic and sort;
  - chat (tab, search), events, help (search), the landlord dashboard, my posts, my listings, notifications, saved
    (section and category), and event check-in;
  - the 15 admin screens with filters, tabs or searches.
- **Silent where the change is not the user's:**
  - deep-link parameters in Explore and Listings;
  - the pull-to-refresh resets in Listings and Food;
  - the tab change after an admin sends a notification or creates a poll.
- **Admin Audit log and Data privacy:** the list query now follows the screen's filter and search in an effect, so
  an undo reloads the list too.

## Checked

- `pnpm typecheck` passes.
- Walked on the OnePlus (Android 16, Expo Go) against the local backend, with the Back button:
  - **Tabs:** Explore → Food → Community, then Back: Food, then Explore.
  - **Listings sections:** Homes → Rooms → Roommates, then Back: Rooms, Homes, Explore.
  - **Listings chip, search and sheet:** Apartment, then "santa" typed, then 2+ and Pets Allowed in the filter sheet.
    Back undid the sheet (both filters at once), then the whole search, then Apartment, then went to Explore.
    Re-opening the sheet after one Back showed Any.
  - **Across tabs:** Rooms → Food tab, then Back: Listings still on Rooms, then Homes.
  - **Detail:** a listing opened from a scrolled list, then Back: the same list at the same scroll position.
  - **Explore:** Local news, then Events. Back: News with Local, then For you.
  - **Community:** Housing, then Popular. Back: Recent, then All, then the Food tab, where Top rated → Back gave All.
  - **Saved (a pushed screen):** Favourites, then Back: Saved; Back again closed the screen.
- **Edge swipe:** with the owner's agreement the phone was switched to gesture navigation and then back to buttons
  (`navigation_mode` 0 again).
  - Swipes injected over adb from the left edge did nothing, with the navigation bar hidden and with it shown.
  - Swipes injected through scrcpy (`scrcpy-mcp`) from x = 0 also did nothing: three tries, slow and fast, on
    Listings → Roommates. The Back key right after them undid the section, so the history was there.
  - This OnePlus does not treat injected touches as the back gesture.
  - React Native receives the gesture as the same Back event as the button. That is likely but not confirmed here.
  - Try it by hand on a gesture-navigation phone.
- **Not walked:**
  - the admin screens (they need an admin account), chat, events, help, the landlord dashboard, my posts, my
    listings, notifications, check-in;
  - iOS, where in-screen undo does not apply.

## Found on the way

- TR-024: the Listings "Pets" filter sends `pets`, which `GET /housing` rejects with 400 ("property pets should not
  exist"). Choosing Pets Allowed or No Pets shows "Could not load listings".
