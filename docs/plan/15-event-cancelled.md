# 15. A cancelled event is kept

**Status: Built (2026-11-10) on `feature/event-cancelled`; [build note](../build/2026-11-10-event-cancelled.md).** Triage
[TR-047](../triage.md). The owner decided on 2026-11-10 that a cancelled event stays, marked Cancelled, instead of
being deleted. The details below were chosen by Claude; the owner can change any of them in review.

## Problem

Plan 11 made the host's "Cancel event" delete the event: its registrations, saves, chat and photos went with it, and
the people registered got a notification that opened nothing. Nobody could look back at what was cancelled.

## What will change

- **Model:** `Event.cancelledAt` (nullable). Set means cancelled.
- **`DELETE /events/:id` cancels.** Installed builds call it from "Cancel event" and My posts, so they get the new
  behaviour without an update. It sets `cancelledAt`, keeps every row, and tells the people registered with a
  notification that opens the event. A second call changes nothing and sends nothing. A past event can be cancelled too, and the people
  registered are told as for any other.
- **Where a cancelled event shows:**
  - left out of Explore's events list, the story strip and the "new event nearby" notification, where an older build
    would show it as live;
  - kept, with `cancelled: true` and `cancelledAt`, in the event's page, the host's My events and My posts, the
    registered list and saved events.
- **What is refused on a cancelled event** (409 `EVENT_CANCELLED`): registering, editing, adding photos and reviews.
  Unsaving and unregistering still work.
- **Registrations stay `ACTIVE`**, so the event stays in the person's registered list. The ticket is not offered and
  the door scan answers `EVENT_CANCELLED` (not admitted).
- **The event chat stays**: the people in it may still talk.
- **App:** a "Cancelled" banner on the event page, with Register, Edit and Cancel gone; a Cancelled pill on the cards
  in My posts, registered and saved lists. The host's confirm says the event is kept and marked Cancelled.

## What will not change

- Admin: its counts and lists include cancelled events; deleting a user still deletes their events.
- No way to undo a cancellation.

## Decided while building

- Saving a cancelled event and fetching its ticket are refused too (409 `EVENT_CANCELLED`).
- Event notifications had no route in the app (tapping did nothing); they now open the event.
- My posts showed an event's date through the phone's zone ("Nov 15, 2026, 5:30 AM"); it now shows the calendar day.
- The door screen has an "EVENT CANCELLED" result; older builds show the server's message under "INVALID TICKET".

## How it will be checked

- e2e: cancel keeps the row and notifies with a link; a second cancel is silent; registering and editing answer 409;
  the event leaves the feed but stays in the attendee's registered list and the host's; the door scan refuses.
- Phone: as `uit_gps1`, host an event with a second test user registered through the API, cancel it, see the
  Cancelled page, the notification on the other side opening it, and the event gone from Explore.
