# 2026-11-10: A cancelled event is kept, marked Cancelled (TR-047, plan 15)

Branch `feature/event-cancelled`, from `fix/sign-after-approval`. Not merged.

## Problem

Plan 11 made "Cancel event" delete the event with its registrations, saves, chat and photos. The people registered
got a notice that opened nothing, and nobody could look back at it. The owner decided on 2026-11-10 to keep a
cancelled event, marked Cancelled ([plan 15](../plan/15-event-cancelled.md); Claude chose the details).

## Change

- **Backend:**
  - Migration `20261110200000_event_cancelled_at`: `Event.cancelledAt` (nullable).
  - `DELETE /events/:id` cancels: it sets `cancelledAt` only if unset, so only the first call tells the people
    registered, and the notice now links the event (`referenceType: EVENT`). Nothing is deleted. Installed builds
    call this route, so they get the new behaviour.
  - Every event response carries `cancelled` and `cancelledAt` (`EventsService.formatEvent` and the copy in
    `SavesService`). My posts' event rows have status `CANCELLED`.
  - Explore's list and the story strip leave cancelled events out. The event's page, My events, registered and
    saved lists keep them.
  - 409 `EVENT_CANCELLED` for registering, editing, adding photos, reviewing, saving and the ticket. Unsaving and
    unregistering still work. The door scan answers `EVENT_CANCELLED`, not admitted; registrations stay `ACTIVE`, so
    the event stays in the person's list.
- **App:**
  - `EventDetail`: a banner ("You cancelled this event." / "The host cancelled this event."); Edit, Cancel event,
    Door check-in, RSVP and reviews hidden; the bottom bar says Cancelled.
  - `events/[id]/index.tsx`: the confirm says the event stays marked Cancelled; after cancelling, the page stays and
    refreshes instead of closing.
  - `myposts.tsx`: an event's action is "Cancel event" (confirmed, no Undo toast), and the row stays, marked
    Cancelled. A cancelled event opens its details with no Edit or Cancel. The event date is read as a calendar day
    (it showed "Nov 15, 2026, 5:30 AM" in India, rule B10).
  - `saved.tsx`: "Cancelled · host" under a cancelled event.
  - `notifications.tsx`: an `EVENT` notification opens the event (before, tapping it did nothing).
  - `check-in.tsx`: an "EVENT CANCELLED" result.
  - `events.api.ts` and `models.ts`: optional `cancelled`, so older servers still work.

## How it was checked

- **Backend:** `tsc`, lint on the changed files, unit tests 124, e2e tests 69.
  - Unit (`walkthrough-fixes.spec.ts`): cancel sets `cancelledAt`, deletes nothing and links the notice; a second
    cancel tells nobody. It replaces the plan 11 test that the images were deleted.
  - e2e (`event-edit.e2e-spec.ts`): the plan 11 cancel test now expects the row kept, one linked notice after two
    cancels, and the page marked cancelled. A new test: out of the feed and the story strip, still in registered,
    saved and My events with `cancelled: true`; register, edit, save and the ticket answer 409; unsave works; the door
    scan answers `EVENT_CANCELLED`.
- **Mobile:** `pnpm typecheck`.
- **Phone** (OnePlus, Expo Go, local backend), as `uit_gps1`:
  - **Host:** an event with `uit_hannah5` registered through the API. Cancel event showed the new confirm, and
    confirming kept the page, now with "You cancelled this event.", no Edit, Cancel or Door check-in, and Cancelled in
    the bottom bar. The database had `cancelledAt` set, the registration still `ACTIVE`, and one notice for Hannah.
  - **Registered side:** Hannah hosted an event, the phone's account registered and Hannah cancelled, all through
    the API. The phone's Notifications showed "Hannah walk event was cancelled"; tapping it opened the event with
    "The host cancelled this event." The event was not in the Los Angeles feed.
  - **My posts:** the row read "Cancelled · Nov 15, 2026"; its options opened the details with a Cancelled tag and
    no Edit or Cancel.
- The two walk events, their 32 notifications (including "new event in your area"), chats and messages were
  deleted.

## Not checked

- The door screen's new result on the phone (e2e covers the server).
- Saved and the registered list on the phone.
- iOS.
