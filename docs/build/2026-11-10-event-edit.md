# 2026-11-10: Editing and cancelling an event; event days in the city's time (TR-037, plan 11)

Branch `feature/event-edit`, from `feature/quest-detail`. Not merged.

## Problem

From the walkthrough (E-31, E-32; [plan 11](../plan/11-event-edit-and-city-time.md)):

- The host could not change or cancel an event from its page. Delete existed only in My posts; `PATCH /events/:id`
  was never called by the app, and it skipped create's checks (a paid event without a price).
- An event's day is a calendar date stored at UTC midnight, with a wall-clock time text. Several places read it
  through another zone:
  - the app formatted it with `toLocaleDateString`, so a phone west of UTC showed the day before;
  - "upcoming" meant `date >= now`, so an event dated today dropped out of Explore once the UTC day began;
  - the day filter was built in the server's zone;
  - reviews opened at the end time read in the server's zone;
  - create refused a date by the server's "today".

## Change

- **Backend:**
  - `src/common/utils/city-day.ts` (new) provides:
    - `cityToday` (today in the city's zone, UTC for an unknown city);
    - `datePart`, `dayStart` and `parseClock`;
    - `cityInstant` (a wall-clock time on a date in the city's zone, correct across daylight saving).
  - `EventsService`:
    - upcoming starts at the city's today, for the list and for story events;
    - the day filter uses the calendar day;
    - create refuses a day before the city's today and stores the day at UTC midnight;
    - the ended check for reviews uses `cityInstant`.
  - `updateEvent` makes create's checks: a paid event needs a price above 0, the date may not be in the past for
    the city, the capacity may not go below the number registered. It ignores `city`. A change of date, time or
    place notifies the people registered.
  - `deleteEvent` notifies the people registered: "<title> was cancelled", with no link, since the event is gone.
  - New private `notifyRegistered` sends these notifications. It skips the host, and one failed notification does
    not fail the request.
- **App:**
  - `src/utils/eventDay.ts` (new): the date part, a local `Date` on that calendar day, and today in the city. These
    are used in Explore's rows, the Events screen (its labels and "past") and the review check in `ratingUtils.ts`.
  - The event page shows **Edit** and **Cancel event** to the host:
    - Cancel is confirmed with `appAlert`, then calls `DELETE`, refreshes the lists and goes back.
    - `app/events/[id]/edit.tsx` (new) holds the title, description, date, start and end time, venue, capacity,
      and Free or Paid with a price. It sends only what changed, warns that the people registered will be told,
      and asks before discarding changes on Back.

## How it was checked

- **Backend:** `tsc` and lint on the changed files; unit tests 119 (the city-day helper is new; the mock in the
  old delete test gained `eventAttendee.findMany`); e2e tests 58.
  - The 4 new tests are in `test/design-d/event-edit.e2e-spec.ts`:
    - edit, notify, city ignored;
    - 403, and 400 for paid without a price, for a capacity below the registered count and for a past date;
    - cancel notifies;
    - an event dated today is listed, and the day filter.
- **Mobile:** `pnpm typecheck`.
- **Phone** (OnePlus, Expo Go, local backend), signed in as `uit_gps1`, with a Los Angeles test event dated today
  and `uit_liam2` registered through the local API:
  - the page shows 10 Nov (the right day), and Edit and Cancel event for the host;
  - Edit opens with the event's values;
  - after changing the venue, Back asks "Discard your changes?" and Keep editing keeps the change;
  - start set to 7:00 PM, then Save: the page shows "10 Nov · 7:00 PM" and the new venue;
  - `uit_liam2` got "has changed", saying "time and place", linked to the event;
  - Cancel event, then "Keep it": nothing changes;
  - Cancel event confirmed: the event is gone, the app is back on Explore, and `uit_liam2` got "was cancelled"
    with no link.
- **Not walked on the phone:** another account's view of the page. Checked through the API instead: the detail
  carries no `isOwner` for a non-host, which the app reads as false, and their `PATCH` is refused (403).
- The test events and notifications were deleted afterwards.

## Seen while walking, not changed

- The shared time picker opens at the current time, not the field's value. This was the case before.
- The Cancel button sits under the page's bottom bar until the page is scrolled, as Door check-in did before.
- Not checked: iOS; the event-day display on a phone set west of UTC (the phone here is in IST; the fix reads the
  date part, so the phone's zone no longer matters).
