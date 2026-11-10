# 04. Food

_2026-11-04. Made from the earlier section doc (written from code, 2026-10-29) and the UI change notes. The audit
opened the Food tab on the phone; nothing specific to Food was found. Marks: see [README.md](README.md)._

## Planned changes

| ID | Kind | What will change | Triage | Plan |
|---|---|---|---|---|
| — | | None yet | | |

## What it is for

Finding places to eat in the city, reading and writing reviews, and booking a table. Owners list and manage their
restaurants.

## Who uses it, and where

- Screen: `frontend/apps/mobile/app/(tabs)/food/index.tsx` (about 2k lines), one `FlatList` [code].
- Owners: `app/my-restaurants.tsx`; creation through `create-post?type=restaurant` [code].
- Backend: `food` module, `/api/restaurants`, 23 endpoints [code].

## How it works

- Hero, search and **+ Add**, then the restaurant list [observed]. Segments (All · Open Now · Top Rated · Nearby ·
  Saved, `TABS`), 15 cuisine chips (`CUISINES`) and sort options (`SORT_OPTIONS`) are defined at
  `app/(tabs)/food/index.tsx:186-197` but never rendered [code]; the earlier doc listed them as on screen
  (corrected 2026-11-04) [question: dropped on purpose, or lost in a refactor?].
- Cards: image carousel with pinch-zoom, name, cuisine, rating, price range, open or closed computed on the phone
  in the restaurant's own time zone (`getAvailability`, `minutesNowInTimezone`), distance, verified owner badge,
  save heart [code].
- **Restaurant detail**, the route `app/restaurant/[id].tsx` (helpers in `src/features/food/foodShared.tsx`,
  [detail routes note](../build/2026-11-09-detail-routes.md)): stats, call, directions, website, reserve (Android Back closes the reservation form first); hours, address, services, popular dishes,
  tags; **Rate & Review** (one review per user, edit and delete); report [code].
- Reservations: `POST /restaurants/:id/reservations` (date, time, party size); the owner confirms or cancels
  (`PATCH /restaurants/reservations/:id/confirm|cancel`) [code].
- Data loading: an infinite React Query keyed by city, search and cuisine, fresh for 10 minutes and refetched on focus once stale; pull-to-refresh forces a refetch ([React Query note](../build/2026-11-09-react-query.md)).
  A remounted tab now refetches instead of showing "No restaurants found" (fixed 2026-10-29) [observed].

## Rules it enforces

- One review per user per restaurant [code].
- `RESTAURANT_OWNER` marks a restaurant verified; `LOCAL_REVIEWER` marks a review trusted [code].
- Opening hours are judged in the restaurant's time zone, not the phone's [code].
- Two separate "heart" tables exist, `RestaurantFavorite` and `RestaurantSave`, kept for compatibility [code]
  [question].

## Problems found

| # | Problem | Status |
|---|---|---|
| 1 | A remounted Food tab could show "No restaurants found" for up to 10 minutes | Fixed 2026-10-29. [UI changes](../build/2026-10-29-ui-navigation-gestures-theme.md) |

## Questions

1. Which heart does the app use, `RestaurantFavorite` or `RestaurantSave`, and can the other be retired?
   [question]
2. Is the owner told when a reservation is made, and the guest when it is confirmed or cancelled? [question]
3. The Open Now / Top Rated / Nearby / Saved segments, cuisine chips and sort are defined but not rendered. Bring
   them back, or remove the dead code? [question]

## How to test it

Checklist: none yet; the smoke checklist opens the tab. Test data: 12 restaurants owned by `uit_*` users in Los
Angeles.

## Not yet checked

Reservations end to end with the owner side; reviews (create, edit, delete); Open Now across a time-zone
boundary; restaurant create and edit with images; report.

## Update 2026-11-04: smoke run on the phone

[Run log](../device-runs/2026-11-04-00-smoke.md).

- The tab shows "Hi UI, Local Flavors", search and **+ Add**, then restaurant cards; no segment, cuisine or sort
  chips [observed]. The code defines them but never renders them (see "How it works") [code].
- Every seeded restaurant shows "Hours not provided", so open or closed could not be checked [observed].
- Detail: rating with review count, "Distance unavailable", "N/A Wait Time" (TR-001), quick actions Directions,
  Call, Share; no Website or Reserve for this restaurant [observed].

## Update 2026-11-06: design D (plan 01, branch `feature/design-d`, not merged)

From [the full-match build note](../build/2026-11-06-design-d-full-match.md); **[code]** unless marked
**[phone]**.

- Rate and review is a sheet; drag across the stars; a rating alone can be posted (server: `content` optional, stored empty). **[phone]**
- Review composer: pick the restaurant from a search list of your city; the fields that were never sent (cuisine, price, visit, dishes) are gone.
- Restaurant composer: $$ and Dine-in chosen by default; one line about badges.
- My restaurants: manage sheet in D; views, likes and reservations (not in the data) are no longer shown as 0.

## Update 2026-11-10: full walkthrough (TR-028, branch `fix/walkthrough`, not merged)

Walked on the phone; rows F- in the [run log](../device-runs/2026-11-10-full-walkthrough.md).
- Opening hours are read in both stored formats and in the restaurant's (or its city's) time zone, so Open now works (F-01, F-02). Older production rows may hold a phone's zone (TR-033).
- My restaurants and Favourites list their rows (F-03); restaurant edit saves (F-04).
- The owner's switch is now "Temporarily closed", which customers see whatever the hours say (F-13, owner's decision).
- Nearby is hidden until restaurants have coordinates (F-11, TR-032). The review composer is titled "A review" (F-15). Open: F-16.

## Update 2026-11-10: Nearby (TR-032, plan 13, branch `feature/nearby`, not merged)

From the [build note](../build/2026-11-10-nearby.md).
- Restaurants get coordinates from their address: a cron (`FoodGeocodeCron`, every minute, ten at a time) asks
  OpenStreetMap's Nominatim, one request a second, with only the business address. An address it cannot find is
  marked (`geocodeTriedAt`) and not retried until it changes; editing the address clears the coordinates. Off in
  tests and with `GEOCODING_ENABLED=false` [code].
- Nearby shows once a restaurant in the list has coordinates. Tapping it reads the phone's position (asking for
  permission the first time) and works out the distances on the phone; the position is not sent. Nearby lists
  restaurants within 3 miles, nearest first; cards then show "x.x mi" **[phone]**.
- Sharing a restaurant no longer says how far away it is [code].
