# Checklist: 03. Listings, rooms and roommates

_2026-11-04. Built from [03-listings-rooms-roommates.md](../03-listings-rooms-roommates.md). Not run yet. Rows
L-20 onwards need data the local seed does not have yet; they stay listed until it exists._

**Build and data.** Development build or Expo Go from Metro on the local backend. Accounts: `ui_tester` on the
phone; a second test account through the API for connection requests. Data: the 24 listings, 12 `uit_*` roommates
and their preferences (Los Angeles). The phone's time zone is noted at the start (date rows depend on it).

**Settings to put back.** `ui_tester`'s roommate preferences (read them with `GET /roommates/preferences` before
L-12 and write them back after), saved and interested listings.

**Clean-up.** Listings created in L-15 are deleted through the app and checked as gone with
`SELECT id FROM "HousingListing" WHERE title LIKE 'E2E L03%'`. Connection requests from L-13 are cancelled.

| ID | Who | Do | Expect | Review |
|---|---|---|---|---|
| L-01 | P | Open Listings | Hero with "Los Angeles"; listing cards load; "Load More" absent (24 < 50) | 03 §Listings |
| L-02 | P | Tap the Apartment chip, then All | List narrows to apartments, then returns to all | 03 §Listings |
| L-03 | P | Filters: max price below the cheapest listing | Empty state, not a spinner or an error | 03 §Listings |
| L-04 | P | Search for a word from one listing's title | Only matching listings | 03 §How it works |
| L-05 | P | Open a listing with no walk-score data | No walk or transit pill | 03 Problems 4 |
| L-06 | P | In the detail: save, then unsave | Heart fills and empties; `GET /housing/saved` agrees (A) | 03 §Listings |
| L-07 | P | In the detail: Message landlord | `chat` opens with the listing as context | 03 §Listings, 06 |
| L-08 | P | Rooms & Mates → Available Rooms | Rooms or the proper empty state; never a blank area | 03 Problems 8 |
| L-09 | P | Rooms & Mates → Find Roommates | Cards with match %; dates as "Nov 2, 2026", "Immediate" or "Flexible" | 03 Problems 2 |
| L-10 | D, P | Pick a roommate with move-in `YYYY-MM-DD` in the database; find the card | The card shows that same calendar day, whatever the phone's time zone | 03 Problems 3 |
| L-11 | P | Tap Move-in Soon | Only people moving in within 30 days or now, soonest first; matches the database count (D) | 03 Problems 1 |
| L-12 | P | Change a roommate preference (budget), save, reopen the modal | Value kept; `GET /roommates/preferences` agrees (A) | 03 §Rooms & Mates |
| L-13 | P | Connect to a roommate, then cancel | Button goes to pending, then back; a pending conversation is created and removed (D) | 03 §Rooms & Mates, 06 |
| L-14 | P | Bookmark a roommate in light mode | Icon visible before and after | 03 Problems 9 |
| L-15 | P | **+ Post** a listing titled `E2E L03 Café Łódź` with one image, then delete it | Shows in the list with the accented title; gone after delete | 03 §Listings |
| L-16 | P | Pull to refresh with a filter on | Filters reset, list reloads | 03 §Data loading |
| L-20 | P | Apply to a listing owned by a landlord with a badge | Application steps reachable; draft saved | 03 Not yet checked |
| L-21 | P | As the landlord: decide the application | Decision saved; tenant notified | 03 §Rules |
| L-22 | P | Sign the agreement and open the PDF | Agreement generated as a `UserDocument` | 03 Not yet checked |

## YOU

| ID | Why Claude cannot | What the owner does |
|---|---|---|
| — | | |
