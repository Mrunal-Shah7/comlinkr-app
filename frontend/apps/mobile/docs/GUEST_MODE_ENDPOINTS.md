# Guest Mode — Required Public Endpoints

## Context

The app supports **guest browsing** — users can explore Feed, Listings, Food, Community, and Events without signing in. Every write action (post, comment, save, message, RSVP, roommate matching, etc.) still requires a real account and is gated on the frontend via `useRequireAuth`.

Guest requests are sent with **zero `Cookie` header** (`src/api/client.ts` only attaches the header when a session exists in SecureStore). Browse/detail GETs use `@OptionalAuth()` so they succeed without a session while still hydrating `request.user` when a cookie is present.

## Auth pattern (implemented)

Use `@OptionalAuth()` (not plain `@Public()`):

- Valid session cookie → same personalized response as before (`isLiked`, `isSaved`, `myVote`, etc.)
- No session → **200** with public data; personalization fields default to `false` / `null`

Writes and personal collections (`/saved`, `/me`, roommates, notifications, chat, etc.) remain auth-strict.

---

## List / browse endpoints

### 1. `GET /community/stats`
**Used by:** Feed, Community  
**Query params:** `city` (string, optional)

### 2. `GET /feed/mood`
**Used by:** Feed  
**Query params:** `city` (string, optional)  
`myMood` is `null` for guests.

### 3. `GET /events`
**Used by:** Feed (ticker), Events screen  
**Query params:** `page`, `limit`, `city`, `upcoming` (boolean)

### 4. `GET /housing`
**Used by:** Feed (ticker), Listings tab  
**Query params:** `page`, `limit`, `city`, `type` (optional)

### 5. `GET /feed`
**Used by:** Feed — 3 variants (main, community-news, question)  
**Query params:** `page`, `limit`, `trending` (bool), `category` (optional), **`city` (optional)** — required for guest city scoping

### 6. `GET /stories`
**Used by:** Feed  
**Query params:** **`city` (optional)** — scopes active stories for guests

### 7. `GET /community/polls`
**Used by:** Feed  
**Query params:** `city` (optional)  
`myVote` is `null` for guests.

### 8. `GET /challenges`
**Used by:** Feed  
**Query params:** `status` (e.g. `ACTIVE`), `city` (optional)

### 9. `GET /news/explore`
**Used by:** Feed → News sub-tab  
**Query params:** `city`, `country`, `state` (optional), `phase`, `page`, `pageSize`

### 10. `GET /news/articles/{id}/stats`
**Used by:** Feed → News sub-tab  
`likedByMe` / `savedByMe` are `false` for guests.

### 11. `GET /restaurants`
**Used by:** Food  
**Query params:** `page`, `limit`, `city` (optional)

### 12. `GET /community/questions`
**Used by:** Community  
**Query params:** `page`, `limit`, `sort`, `city`

---

## Detail / read endpoints (open full details)

| Method | Path | Used by |
|--------|------|---------|
| GET | `/feed/:id` | Post detail modal |
| GET | `/feed/:id/comments` | Post comments (read) |
| GET | `/housing/:id` | Listing detail |
| GET | `/events/:id` | Event detail |
| GET | `/events/:id/reviews` | Event reviews (read) |
| GET | `/restaurants/:id` | Restaurant detail |
| GET | `/restaurants/:id/reviews` | Restaurant reviews (read) |
| GET | `/community/questions/:id` | Question detail + answers |
| GET | `/stories/:id` | Story viewer |
| GET | `/stories/:id/like` | Story like status (read) |
| GET | `/stories/:id/comments` | Already `@Public()` |
| GET | `/challenges/:id` | Challenge detail |

---

## Summary table

| Method | Path | Screens using it |
|---|---|---|
| GET | `/community/stats` | Feed, Community |
| GET | `/feed/mood` | Feed |
| GET | `/events` | Feed (ticker), Events screen |
| GET | `/housing` | Feed (ticker), Listings tab |
| GET | `/feed` | Feed (3 variants) |
| GET | `/stories` | Feed |
| GET | `/community/polls` | Feed |
| GET | `/challenges` | Feed |
| GET | `/news/explore` | Feed News sub-tab |
| GET | `/news/articles/{id}/stats` | Feed News sub-tab |
| GET | `/restaurants` | Food |
| GET | `/community/questions` | Community |
| GET | `/feed/:id` | Post detail |
| GET | `/feed/:id/comments` | Post comments |
| GET | `/housing/:id` | Listing detail |
| GET | `/events/:id` | Event detail |
| GET | `/events/:id/reviews` | Event reviews |
| GET | `/restaurants/:id` | Restaurant detail |
| GET | `/restaurants/:id/reviews` | Restaurant reviews |
| GET | `/community/questions/:id` | Question detail |
| GET | `/stories/:id` | Story viewer |
| GET | `/stories/:id/like` | Story like status |
| GET | `/challenges/:id` | Challenge detail |

## Frontend gates (personal actions)

Guests are prompted to sign in (Alert → `/(auth)/login`) when they try to:

- Like, save, or comment (posts, news, stories)
- RSVP / register for an event or message a host
- Save a listing or restaurant
- Post / create (news, events, challenges, stories, questions) — including deep-link to `create-post`
- Apply to a listing or request a viewing
- Reserve a table or review a restaurant
- Vote in polls or join a challenge
- Open Roommate Matching
