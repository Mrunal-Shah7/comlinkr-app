# 20. The listing detail's first view

**Status: Built** on `feature/ui-polish-currency-listing`, not merged. Triage [TR-066](../triage.md);
[build note](../build/2026-11-25-ui-polish-currency-listing.md).

## Problem

Opening a home showed everything at once: the full description, every amenity as a plain chip, and a details table
of up to twelve rows (available, deposit, lease, furnished, pets, parking, laundry, heating, cooling, utilities,
year built, neighbourhood). The owner wants the first view lighter, with icons, and the rest behind a
"More details" button.

## What changes (`src/features/housing/components/PropertyDetail.tsx`)

- **Fact tiles** (beds, baths, sq ft, floor) get an icon each; "1 Bed" / "1 Bath" in the singular.
- **At a glance:** a two-by-two grid of up to four key facts with an icon, taken in this order from what the
  listing has: deposit, lease, pets, furnished, parking, laundry, neighbourhood. "Available" is not repeated: it is
  already the tag at the top.
- **About this place:** a description longer than 180 characters shows three lines first.
- **What it has:** up to six amenities, each with an icon matched from its name (Wi-Fi, parking, laundry,
  dishwasher, gym, balcony, ...; a tick when nothing matches), then a "+N more" chip.
- **More details** (a full-width button with a chevron) opens the full description, every amenity and the
  remaining details as a table with an icon per row; it then reads "Fewer details". It shows only when something
  is hidden. Opening another listing starts closed again.

## What does not change

- The price bar (Message, Apply), the landlord card, viewing, journey, report and owner actions.
- No data or API change. Rooms (`AvailableRoomDetail`) are unchanged.

## Questions for the owner

None. The four "at a glance" facts and the six-amenity cut are constants at the top of the file
(`GLANCE_KEYS`, `FIRST_AMENITIES`, `LONG_DESCRIPTION`) if the balance should change.
