# 2026-11-09: React Query (TR-013, point 3)

Build: Expo Go on the OnePlus (Android 16), `chore/react-query` at `4db1609`, Metro with
`EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`, local backend with `RESEND_API_KEY=` empty, `ui_tester`.
Requests read from the backend log.

| ID | Result | Note |
|---|---|---|
| Q-01 | pass | Cold start: each list is requested once, except `GET /stories`, twice (the hero and the story row have separate keys; three times before) |
| Q-02 | pass | Listings filter "Apartment": one `GET /housing?type=APARTMENT`; the list shows apartments |
| Q-03 | pass | Food → Community → Food within a minute: no request (10-minute stale time); Listings refetches on focus as before |
| Q-04 | pass | Food search "sushi": one debounced request, empty state; Clear filters shows the cached list without a request |
| Q-05 | pass | Bookmark a restaurant, pull to refresh: still bookmarked (server flag); it appears under Saved → Food |
| Q-06 | pass | Saved → Food: unsave removes the row and the "Saved · 1" count; `POST /restaurants/:id/save` answered unsaved |
| Q-07 | pass | My posts and My listings show their empty states (the test user owns none; database checked) |
| Q-08 | pass | Explore: switching away and back sends nothing; pull to refresh forces the hero and both news phases |
| Q-09 | pass | Messages opened twice within 30 s: one `GET /conversations` |
| Q-10 | pass | Events screen loads (empty for Los Angeles in the seed) |
| Q-11 | pass | Log out: Explore, Listings and Food as a guest show "Choose your city", nothing left from `ui_tester` |
| Q-12 | pass | Guest picks Los Angeles: every tab refetches under the new key and shows its content |
| Q-13 | pass | Sign back in: Explore fills in (hero, homes count, stories, poll) |
| Q-14 | not checked | Load more (no seeded list is longer than one page) and my posts delete + Undo (no posts) |

Put back: restaurant bookmark removed; signed in as `ui_tester` again.
