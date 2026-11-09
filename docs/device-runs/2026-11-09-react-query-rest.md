# 2026-11-09: React Query on the remaining screens (TR-014)

OnePlus (Android 16), Expo Go, Metro on 8083 with `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`, backend
local with email off. Account: `ui_tester` (ADMIN for the walk, back to USER at the end).
[Build note](../build/2026-11-09-react-query-rest.md).

| Screen | Requests (backend log) | Result |
|---|---|---|
| Admin dashboard | analytics, reports, verifications, support | loads; `reports?status=PENDING` 400 (older bug, see the build note) |
| Users, listings, reports, polls, posts, feed, community, roommates, food, stories, notifications, trending, area, auth | one list request each, 200 | lists load, filters change the key |
| Verifications, support | none: answered from the cache the dashboard filled | loads |
| Audit log | `GET /admin/audit-log?page=1&limit=30` 200 | loads |
| Chat moderation | `GET /admin/reports?...&targetType=CHAT_MESSAGE` 200 | loads |
| Analytics | `GET /admin/analytics` 304 | loads, counts shown |
| Data privacy | privacy requests list, 200 | crashes on `req.user.username` (older bug, see the build note) |
| Edit profile | `GET /users/me` 200 | form filled |
| Event detail | `GET /events/:id`, `/events/:id/reviews?page=1` 304 | loads |
| Settings, Food | account, privacy, preferences | load |

Force-stopping Expo Go signed the app out; signed in again with the seeded account.
