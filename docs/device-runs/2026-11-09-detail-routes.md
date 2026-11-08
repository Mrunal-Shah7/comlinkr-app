# 2026-11-09: detail routes (TR-013, point 7)

Build: Expo Go on the OnePlus (Android 16), `chore/detail-routes`, Metro with
`EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`, local backend with `RESEND_API_KEY=` empty, `ui_tester`.
Requests read from the backend log.

| ID | Result | Note |
|---|---|---|
| D-01 | pass | Listings → a home: the route opens with one `GET /housing/:id` |
| D-02 | pass | Save in the listing detail, system Back: the card shows it saved (list refetched) |
| D-03 | pass | Roommates → a profile: one `GET /roommates/:id`; save, in-app Back: the card shows it saved |
| D-04 | pass | Food → pick of the week: `GET /restaurants/:id` and its reviews; save, Back: the tile shows it saved |
| D-05 | pass | Cold link `exp://…/--/events/<id>`: the event renders directly (one `GET /events/:id`, no redirect to Explore); save and unsave from the detail |
| D-06 | pass | `room/<missing id>`: `GET /shared-spaces/:id` 404, "This space may have been removed." and Go back |
| D-07 | pass | Explore → a news article opens and closes with system Back (still a modal) |
| D-08 | not checked | Shared space detail from the list (the seed has no shared spaces), events from a list (no Los Angeles events), roommate connect / accept, review and reservation, iOS |

Put back: every save made in the walk removed (`HousingSave`, `RoommateSave`, `RestaurantSave`, `EventSave` all 0
for `ui_tester`).
