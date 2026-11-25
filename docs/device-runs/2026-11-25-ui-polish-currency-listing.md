# 2026-11-25: pickers, currency, listing detail walked on Android

OnePlus over wireless debugging, Expo Go 57.0.9, local backend on 4000 (email off), Metro on 8083 with the local
API, as the demo account `rohan@demo.comlinkr.test`. Branch `feature/ui-polish-currency-listing`
([build note](../build/2026-11-25-ui-polish-currency-listing.md)).

| # | Step | Result |
|---|---|---|
| 1 | Rohan's saved location set to the United Kingdom (local database), app cold-started | `/auth/me` answered with `United Kingdom` / `GB`; the stored user took it |
| 2 | Explore → Events | "Pilsen Art Walk · 96 going · £15" (was "$15") |
| 3 | Event detail, RSVP | Entry "£15", footer "£15", registration "Confirm · £15"; closed without confirming |
| 4 | Food → Sakura Counter → Reserve a Table → Date | Month panel in the app's colours, past days dimmed, today outlined. First version wrapped Sunday to a new line; fixed, seven columns, 1 November on a Sunday |
| 5 | Choose 28 | Field reads "Nov 28, 2026", panel closes |
| 6 | Time | Hour, minute and AM/PM chips; chose 7 and :30 PM, "Set 7:30 PM" → field "7:30 PM". First version drew unselected chips white on white; now filled. Not submitted |
| 7 | Listing "Sunny 1BR near the Blue Line" | Fact tiles with icons, at a glance, three-line description, amenities with icons (dishwasher: cutlery), "More details" opens the rest and "Fewer details" closes it |
| 8 | Explore tab row | Five tabs now reach the right edge (Polls ends at x 1007 of 1080, was about 920) |
| 9 | Clean-up | Rohan back to United States / US, the event back to free; checked by query |

Not walked: the other screens that use the pickers (event edit, profile, housing, the application), and any iPhone.

## Release APK against production, as a guest

Same day, on the owner's say-so: the release APK (1.0.7, versionCode 1, production API) on the OnePlus, signed out
(guest), read only. Input through MCPier's `android` server, screens read with adb. Nothing created or changed on
production; no sign-in.

| # | Step | Result |
|---|---|---|
| 1 | Explore, no city | Tab row fills the width (News to Polls, Polls ends at x 1007 of 1080); "Choose your city" card text whole |
| 2 | City Mumbai → Events | "No upcoming events" (production has one event, in Chicago, and two listings, both in Chicago, USD) |
| 3 | City Chicago → Events | "Backyard Pool Party · 3 going · $15"; detail Entry "$15", footer "$15" |
| 4 | Listings → "Spacious 2BHK house near University of Chicago" | Card "$1,500/mo". Detail: fact tiles with icons (2 Beds, 3 Baths, 1500 Sq ft, 2nd Floor), Deposit $650, Lease, Pets, Furnished cards, six amenities and "+2 more", "More details" |
| 5 | More details / Fewer details | Opens all eight amenities (Dishwasher with its icon) and the Details list with icons; closes back to six |
| 6 | Apply as a guest | "Sign in required" dialog, buttons centred; dismissed with "Not now" |

Not walkable on this build: a non-USD price (all production content is in Chicago) and the date and time pickers
(every form that uses them needs an account). Both were walked on the local backend above.
Seen in passing: the Furnished card reads "Furnished / Furnished" (label and value the same).

### Then signed in (by the owner, on the phone)

The owner signed a user in on the phone; nothing was submitted or changed on the account.

| # | Step | Result |
|---|---|---|
| 7 | Explore → Events | "3 going · $15" (the account's city is Chicago) |
| 8 | Host an event → date | Month panel in the app's colours, seven columns, past days dimmed, today outlined; 28 → "Nov 28, 2026" |
| 9 | Start time | **Bug:** the panel opened inside the Start / End row, ran past the right edge (5, 11 and "Set 7:00 PM" cut) and End time showed as a sliver. Fixed (build note, item 6); see 12 |
| 10 | Back | "Discard your changes?" → Discard; back on Explore, no event created |
| 11 | Food → Zigzag Multi Cuisine Restaurant → Reserve a Table → Time | Full-width panel, green accent, filled chips, AM / PM and "Set 7:00 PM"; sheet closed with Back, no reservation |

### Rebuilt APK with the two fixes

Release APK rebuilt (a broken Gradle cache entry on D: removed first, as earlier today) and installed over the
app with `adb install -r`; the user stayed signed in.

| # | Step | Result |
|---|---|---|
| 12 | Host an event → Start time | Field takes the row, the panel a full-width line under it (all hour chips and "Set" on screen), End time below; 8 and :30 → "8:30 PM", the two fields side by side again |
| 13 | End time | Both fields stay on one row, the panel full width under them |
| 14 | Back → Discard | No event created |
| 15 | Listing detail | The card reads "Furnishing / Furnished" |

