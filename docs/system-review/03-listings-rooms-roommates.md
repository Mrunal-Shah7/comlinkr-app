# 03. Listings, rooms and roommates

_2026-11-04. Made from the earlier section doc and roommate-matching doc (written from code, 2026-10-29), the bug
audit and the UI change notes of 2026-10-29. The audit walked parts of it on an Android phone (Expo Go, local
backend). Marks: see [README.md](README.md)._

## Planned changes

| ID | Kind | What will change | Triage | Plan |
|---|---|---|---|---|
| — | | None yet | | |

## What it is for

Finding a home: rental listings from landlords and agencies, spare rooms in existing homes ("shared spaces"),
and roommates matched by compatibility, through to a rental application and a signed tenancy agreement.

## Who uses it, and where

- Screen: `frontend/apps/mobile/app/(tabs)/housing/index.tsx` (about 7.8k lines: screen, cards, modals and
  styles) [code].
- Related: `my-listings.tsx` (owner management), `interested.tsx`, `landlord-dashboard.tsx` (applications received
  and decisions), `property-agreement.tsx` (multi-step application, e-signature, deposit, agreement PDF), deep
  link `app/app/housing/[id].tsx` [code].
- Guests can browse listings; **Rooms & Mates** needs sign-in [code].
- Backend: `housing`, `shared-spaces`, `roommates`, `property-applications`, `documents` [code].

## How it works

Header, hero ("Find Your Perfect Home" / "Connect with Ideal Housemates" and the city), a switcher
**Listings | Rooms & Mates**, and a search box (debounced 350 ms; server-side for listings, client-side for
roommates) [code].

### Listings

- **+ Post** (→ `create-post?type=listing`), type chips (All / Apartment / House / Studio), a Filters sheet (min
  and max price, beds, pets) [code].
- `SafeRentingGuide`, then `ListingCard`s (image carousel, price, beds and baths, landlord avatar, verified
  badge, save heart). "Load More" pages by 50 [code].
- **Listing detail**, the route `app/listing/[id].tsx` (`PropertyDetail`): gallery with pinch-zoom and fullscreen,
  details, landlord, message landlord (opens `chat` with the listing as context), interest, save, share, report
  (`ReportListingModal`), `RemoteViewingPanel`, owner edit and delete, apply. It shows the list's cached row at once
  and refreshes it from `GET /housing/:id`; Back is the stack's ([detail routes note](../build/2026-11-09-detail-routes.md)) [code].
- A local "journey" per listing (Enquired → Viewing → Applied) kept in AsyncStorage `comlinkr_listing_journey`
  [code].

### Rooms & Mates

- Sub-tabs **Available Rooms** (shared spaces) and **Find Roommates** [code].
- Available Rooms: "Have a Spare Room?" (→ `create-post?type=shared_space`), `AvailableRoomCard`s; the detail is the
  route `app/room/[id].tsx` with apply or request (requested ids in AsyncStorage `comlinkr_requested_rooms`, re-read
  when the tab is shown) and the owner's quick edit (`EditSharedSpaceModal`) [code].
- Find Roommates: chips Best Match / Budget / Move-in Soon / Verified, `RoommateCard`s with match %, shared tags,
  connect / cancel / chat, save; the profile is the route `app/roommate/[id].tsx` (connect, accept, decline, cancel,
  save; signed-in users only). A preferences modal (budget, move-in, sleep,
  cleanliness, noise, pets, smoking, guests, work from home) saves with `PATCH /roommates/preferences` [code].
- Connecting creates a pending DIRECT conversation; accepting unlocks chat (review 06) [code].

### Roommate matching

Full rules in [reference/RoommateMatching.md](../reference/RoommateMatching.md) [code]. In short:

- Results: other active, onboarded users with `RoommatePreferences.isLooking = true`, in the same city (the query
  city, else the viewer's own), with overlapping budgets when a budget is given. Blocked pairs are hidden on the
  profile endpoint [code].
- Score 0–100 from five weighted parts: vibes (30%), and interests, communities, location and lifestyle
  preferences (weights in the reference doc) [code].
- `searchRoommates` scores every looking user in the city in memory on each request [code].

### Data loading

React Query ([React Query note](../build/2026-11-09-react-query.md)): homes are an infinite query keyed by city and filters (`GET /housing` page 1 merged with
`GET /housing/my-listings`), refetched on every focus; roommates (browse merged with matches) and shared spaces are
cached for 10 minutes per city. A listing mutation invalidates all of them. Roommate preferences load on each focus
(signed in only). Pull-to-refresh resets filters. Links `?openListing=<id>` and `?openRoommate=<id>` push the
detail routes; a detail action invalidates the list it came from, so Back shows the new state [code].

### Housing API

`GET /housing` (type, city, minPrice, maxPrice, beds, pets, search, page, pageSize), `GET /housing/:id`,
`POST/PATCH/DELETE /housing[/:id]`, image upload, delete and reorder, `POST/DELETE /housing/:id/interest`,
`POST /housing/:id/save`, `GET /housing/saved|interested|my-listings`, `POST /housing/:id/report` [code].

## Rules it enforces

- Only the listing owner with a `LANDLORD` badge decides a property application, and only once the tenant has
  submitted it (`property-applications.service.ts:610-629`); drafts and withdrawn applications are hidden from the
  landlord [code].
- Availability and move-in dates are calendar dates stored as `YYYY-MM-DD` at UTC midnight; the app reads the date
  part only (`parseCalendarDate`) [observed].
- "Move-in Soon" keeps people moving in within 30 days (or able to move now), soonest first [observed].
- A walk-score or transit pill shows only when there is data [observed].
- Floors: 1st, 2nd, 3rd, 11th–13th, 21st; 0 is "Ground Floor" ("G" in the grid) [code].

## Problems found

From the [bug audit](../build/2026-10-29-bug-audit.md) and the
[UI changes](../build/2026-10-29-ui-navigation-gestures-theme.md), 2026-10-29. All fixed.

| # | Problem | Seen on the phone after the fix |
|---|---|---|
| 1 | "Move-in Soon" never matched: it looked for "Immediate" or a hard-coded "Mar" (B1) | Yes: 3 of 12 test roommates match |
| 2 | Raw ISO dates on roommate cards, the profile modal and shared-room cards (B5) | Yes, roommate card |
| 3 | Dates a day early west of UTC (Nov 2 shown as Nov 1 in Los Angeles), a day late in India for values with a time (B10) | Yes (IST) |
| 4 | "Walk 0" in red and "N/A" transit pills on every card without data (B6) | Yes |
| 5 | Floor ordinal always "th" ("1th Floor"); floor 0 showed "N/A" (B7) | Checked with sample values only; test listings have no floor |
| 6 | Match-score sort could go stale: `useMemo` missed `user` in its dependencies (B8) | Code only |
| 7 | Listing card showed a raw ISO timestamp for availability | Yes |
| 8 | Available Rooms showed a blank area when empty | Yes |
| 9 | Roommate bookmark icon invisible (white on pale) in light mode | Yes |

## Questions

1. The listing detail's "Available" badge shows the listing status (listed, not rented), not its move-in date, so
   a listing available from December still says "Available". Intended? [question]
2. Is a deposit in a property application ever charged, or only recorded? [question]

## How to test it

Checklist: [checklists/03-listings-rooms-roommates.md](checklists/03-listings-rooms-roommates.md). Test data:
`ui_tester`, the 12 `uit_*` roommates, 24 listings (all in Los Angeles). Property applications need a landlord
with a badge and a seeded application.

## Not yet checked

Property applications end to end (apply, landlord decision, e-signature, deposit, agreement PDF); listing create,
edit and delete with images; shared-space applications; report flows; deep links into a listing or roommate; a
city with no listings; more listings than one page.

## Update 2026-11-04: smoke run on the phone

[Run log](../device-runs/2026-11-04-00-smoke.md) (phone in Asia/Kolkata).

- Tapping a listing's photo opens the fullscreen image viewer ("Pinch to zoom · Long press to reset"); the detail
  opens from **View Full Details** [observed].
- Problems 2, 3, 4 and 8 still fixed: roommate move-in dates are calendar dates ("Nov 29, 2026", "Immediate"); a
  value stored as 19:56 UTC shows its stored day, not the next day in IST; no walk or transit pill without data;
  Available Rooms shows "No shared rooms in Los Angeles yet" [observed].
- Find Roommates: "12 people in Los Angeles · sorted by match %" (36%, 30%, 28%) [observed].
- Missing values show as **"N/A"**: floor on the card and the detail, "Deposit N/A" on the card, and Security
  deposit, Year built, Heating, Cooling, Utilities in Property Details [observed] [question: TR-001].

## Update 2026-11-06: design D (plan 01, branch `feature/design-d`, not merged)

From [the full-match build note](../build/2026-11-06-design-d-full-match.md); **[code]** unless marked
**[phone]**.

- Listing detail: the bar is price, Message, Apply; "Your journey" shows only after contacting the owner; "Ask to see it first" is a link. **[phone]**
- Apply and sign: one page in three parts. Part 1 is the application (fields from the profile open only when missing; date picker; monthly income as a number). Part 2 is the offer: rent, deposit (hidden when the listing has none), start, length; "Start a week later" and "6-month lease" change the terms sent with the server's terms step (step 4, `leaseTerm`, `moveInDate`, `termsRead`, `termsAgreed`); sign with a finger (PNG, `signatureType: drawn`) or type; Decline withdraws. Part 3 is Signed. Re-applying resumes your draft. **[phone]**
- Landlord applications: Approve and Decline on each card; the card slides off. Not walked.
- New listing: one question per screen (7), photos first and required; extras as chips; the draft is kept on the phone. Editing a listing keeps the full form. Screen 1 walked.
- Room composer: steppers for rooms, baths, people, spots; currency from the country.
- Gallery: "1 of n", swipe down to close (Food uses the same viewer).

## Update 2026-11-10: full walkthrough (TR-028, branch `fix/walkthrough`, not merged)

Walked on the phone; rows L- and S-14 in the [run log](../device-runs/2026-11-10-full-walkthrough.md).
- The Pets filter works: `pets=true|false` matches the free-text pet policy (L-01, TR-024).
- A tenant can withdraw an application until the landlord approves; the landlord is notified (L-23, owner's decision). Applying again reopens your application (L-22).
- Cancel request on a roommate calls `/cancel` (L-16); editing a room keeps its description (L-12).
- Open: L-05, L-06, L-14, L-17, L-18, L-20. The landlord dashboard now tells a non-landlord that the badge is needed (S-14, TR-031).
