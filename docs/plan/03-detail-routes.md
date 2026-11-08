# 03. Detail screens as routes

**Status: Built (2026-11-09), [build note](../build/2026-11-09-detail-routes.md).** Owner, 2026-11-09: "I want all the 9 points resolved in this run" (point 7 of the
Expo conventions list). Triage [TR-013](../triage.md).

## Problem

Listing, room, roommate, event and restaurant details open as full-screen React Native modals inside the tab
screens, with their own pull-down to close (`DismissibleSheet`). The expo-router skill asks for screens to be routes
presented by the stack (a card or a modal), not custom modal components. As modals they have no URL, no native Back
animation and no `Link.Preview` on iOS.

## What will change

- Each detail becomes a route under `app/`, opened with `router.push` and closed with the stack's Back (native
  animation, iOS edge swipe, Android system Back).
- The detail reads its item from the list's cached data when it came from a list, and fetches by id when opened
  from a link.
- `DismissibleSheet` and `SheetDragArea` are deleted once no screen uses them.
- Cards that open a detail use `Link` (with `Link.Preview` on iOS) where the card is a plain tap target.

## What will not change

- The content and actions of each detail screen (save, share, message, apply, RSVP, rate).
- The API. If a detail has no get-by-id endpoint, that detail stays as a modal and is listed in the build note.

## Lost

- Pull-down to close on Android (system Back and the platform transition instead). On iOS, routes presented as
  modals keep the system's swipe down.

## How it will be checked

`tsc`, `expo export`. On the phone: open each detail from its list, Back; open one from a link; the actions on each
detail with test data, undone afterwards.
