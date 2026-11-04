# Roommate Matching

Source of truth: `backend/src/modules/roommates/roommates.service.ts`
(`computeCompatibilityScore`, `searchRoommates`, `getRoommateProfile`, connection methods).
Mobile UI: `frontend/apps/mobile/app/(tabs)/housing/index.tsx` → **Listings → Rooms & Mates → Find Roommates**.

## Who appears in results
`GET /api/roommates` and `GET /api/roommates/matches` (same logic, default sort `best_match`) return users where:
- not the current user, `isActive = true`, `onboardingCompleted = true`
- `RoommatePreferences.isLooking = true` (a user becomes visible by saving preferences / a roommate listing)
- **same city** as `query.city`, or else the viewer's own `UserLocation.city` (exact match)
- budget overlap if `minBudget`/`maxBudget` given: `their.budgetMax ≥ minBudget` and `their.budgetMin ≤ maxBudget`
- blocked pairs are hidden on the profile endpoint (`BlockedUser` either direction → 404)

## Compatibility score (0–100)
Five weighted components, each normalised to 0–100 first:

| Component | Weight | Raw points | Normalised by |
|-----------|-------:|------------|---------------|
| **Vibes** (shared `Vibe`s) | 30% | 8 per shared vibe | max 12 vibes × 8 = 96 |
| **Interests** (shared `Interest`s) | 20% | 10 per shared interest | max 8 × 10 = 80 |
| **Communities** (shared `Community`s) | 25% | 5 per shared community | `min(max(5 × max(|A|,|B|), 1), 50)`, capped at 100% |
| **Location** | 15% | same city 15 · same state 10 · same country 5 · else 0 | 15 |
| **Lifestyle** (`RoommatePreferences`) | 10% | see below | 100 |

Lifestyle points (only counted when both sides have a value; 50 neutral if either has no prefs row):

| Field | Points if equal |
|-------|---------------:|
| `sleepSchedule` (EARLY_BIRD / NIGHT_OWL / FLEXIBLE) | 20 |
| `cleanliness` (CLEAN / MODERATE / RELAXED) | 20 |
| `noiseTolerance` (QUIET / MODERATE / SOCIAL) | 20 |
| `petFriendly` (bool) | 15 |
| `smokingAllowed` (bool) | 15 |
| `guestsFrequency` (NEVER / OCCASIONALLY / FREQUENTLY) | 10 |

```
score = round(0.30·vibes% + 0.20·interests% + 0.25·communities% + 0.15·location% + 0.10·lifestyle%)
        clamped to [0, 100]
```
Budget, move-in date and work-from-home are **not** part of the score (budget is a filter only).

**Worked example** — A and B in the same city, 3 shared vibes, 2 shared interests, A has 4 communities,
B has 2, 1 shared; lifestyle: same sleep + same cleanliness + both non-smokers, pets differ:
- vibes 3×8/96 = 25% → 7.5
- interests 2×10/80 = 25% → 5.0
- communities 5 / min(max(20,1),50)=20 → 25% → 6.25
- location 15/15 = 100% → 15
- lifestyle (20+20+15)/100 = 55% → 5.5
- **total ≈ 39**

Note: since only the location band and up to 12 vibes / 8 interests are in play, typical scores land
in the 20–60 range; 100 requires near-identical profiles.

## Sorting (`sort` query)
- `best_match` (default) — score desc
- `budget` — `budgetMin` asc
- `move_in_soon` — `moveInDate` asc (nulls last)
- `verified` — users with any badge first, then score desc

The service loads **all** matching users for the city, scores and sorts in memory, then paginates
(`page`, `limit` default 20). Fine at current scale; would need a precomputed score table at large scale.

## Profile breakdown
`GET /api/roommates/:id` returns the card plus `compatibilityBreakdown`:
`sharedVibesCount`, `sharedInterestsCount`, `sharedCommunitiesCount`,
`locationMatch` (`same_city|same_state|same_country|different`), `lifestyleScore` (0–100).
Cards also contain `inCommon` (shared vibes/interests/communities with emoji) shown as chips.

## Connection flow
Connections ride on 1:1 `Conversation`s (`type = DIRECT`):

| Action | Endpoint | Effect |
|--------|----------|--------|
| Connect | `POST /roommates/:id/connect` | Creates conversation: me `ACCEPTED`, them `PENDING`, SYSTEM message "X wants to connect…", notification to them. Re-uses an existing pair conversation. Refused if admin-banned in that thread. |
| Cancel | `POST /roommates/:id/cancel` | Sender withdraws: deletes the conversation + messages (state resets to none) |
| Accept | `POST /roommates/:id/accept` | My member row `PENDING → ACCEPTED`, SYSTEM message, notification to requester |
| Decline | `POST /roommates/:id/decline` | My member row → `BLOCKED` |

`connectionStatus` on each card, from the viewer's side: `null` · `pending_sent` · `pending_received` · `accepted`
(+ `conversationId`). Computed in one batched query per page (`batchConnectionStatuses`).

## Other roommate endpoints
- `GET/PATCH /roommates/preferences` — read/upsert own `RoommatePreferences`
- `GET/POST/PATCH/DELETE /roommates/listing[/me]` — own "looking for a roommate" listing (syncs location)
- `POST /roommates/:id/save`, `GET /roommates/saved` — bookmarks (`RoommateSave`)

## Mobile-side details & gotchas
- The Listings screen fetches **both** `GET /roommates` (city browse, pageSize 100) and
  `GET /roommates/matches` and merges by id, preferring the server-scored entry.
- `computeMatch()` in `housing/index.tsx` is a **client-side fallback** (Jaccard similarity) used only
  when a card lacks `apiMatchScore`. The server score is authoritative.
- UI option labels don't map 1:1 to enums: UI "Very Clean"/"Clean" → `CLEAN`, UI noise "Lively" →
  `SOCIAL`, UI guests "Anytime" → `FREQUENTLY` (see `mapApi*` helpers and `roommatePrefsToPatchBody`).
- **Available Rooms** (shared spaces: someone with a spare room) use a separate, simpler client-side
  `computeRoomCompatibility()`; applications go through `POST /shared-spaces/:id/apply`.
