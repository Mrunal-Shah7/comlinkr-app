# 11. Editing and cancelling an event; event days in the city's time

**Status: Built (2026-11-10) on `feature/event-edit`; [build note](../build/2026-11-10-event-edit.md).** Triage [TR-037](../triage.md), from the walkthrough
(E-31, E-32). The owner asked for every open triage row to be done and for plans to be built straight away; they
review in the pull request.

## Problem

- **E-31:** the host cannot change or cancel an event from its page. Delete exists only in My posts; the API's
  `PATCH /events/:id` is never called by the app, and it skips the checks create makes (a paid event without a price).
- **E-32:** an event's day and time are a calendar date plus a wall-clock text ("6:00 PM"). Since plan 08 the host is
  in the event's city, so what they type is the city's time. But the code reads the day through other zones:
  - the app shows `new Date(date).toLocaleDateString()`, which shows the previous day on a phone west of UTC (the
    date is stored at UTC midnight); rule B10 says to read the date part;
  - "upcoming" is `date >= now`: an event dated today drops out of Explore for the whole day once the UTC day has
    begun, and the day filter is built in the server's zone;
  - reviews open at the event's end time read in the server's zone, not the city's;
  - create refuses a date before "today" in the server's zone.

## What will change

- **The city's day:** a helper gives today's date in the event city's zone (`cityTimezone`, falling back to UTC for an
  unknown city) and the instant of a wall-clock time on a date in that zone.
  - Upcoming (Explore, the Events screen, story events): events from today in the city's zone onwards.
  - The day filter (`?date=`): that calendar day.
  - Create: the date may not be before today in the city.
  - Reviews open after the end time (or start time) in the city's zone.
- **The app shows the date part** of `date`, never converted through the phone's zone.
- **Edit (`/events/[id]/edit`, host only):** title, description, date, start and end time, venue, capacity, ticket
  price. It sends the same formats as the composer. The city is not editable (plan 08), and `PATCH` ignores a `city`.
  `PATCH` makes the checks create makes: a paid event needs a price above 0; the date may not be in the past; the
  capacity may not go below the number registered.
- **Cancel (host only, on the page):** confirmed with `appAlert`, then `DELETE /events/:id` (as My posts does). Everyone
  registered gets a notification "<title> was cancelled" before the event is removed.
- **Changed date, time or venue:** everyone registered gets a notification saying what changed.

## What will not change

- No "cancelled" state kept on the event: cancelling removes it, as delete does today. Keeping a cancelled event
  visible (with its chat and reviews) would touch every list; it is the owner's call.
- The time stays free text from the composer's picker; there is no stored start instant.
- Category, format and photos are not editable here (photos are still added at creation).

## How it will be checked

e2e: the host edits (200), another user (403); paid without a price (400); capacity below the registered count (400);
a past date (400); `city` in the body is ignored; changes and cancelling notify the people registered; an event dated
today in Los Angeles is still upcoming after the UTC day has moved on, and a day filter returns that day. Unit: the
city-day helper. On the phone: the host edits and goes Back, another account sees no Edit, Cancel (the dialog's Cancel
first), a registered test account's notification.

## Decided while building

- The cancellation notification carries no link: the event is gone, and a link would open "Event not found". The
  change notification links to the event.
- The edit screen sends only the fields that changed, so a title-only edit never reads as a change of time.
- Back from the edit screen with changes asks "Discard your changes?".
- The app's "ended" check for reviews uses the phone's zone for the wall clock (the phone is in the event's city
  since plan 08); the server's check uses the city's zone and is the one that counts.
- The shared time picker opens at the current time, not the field's value (it did before this plan). Left as it is.
