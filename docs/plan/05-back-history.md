# 05. Back returns to the previous state

**Status: Built (2026-11-09) on `feature/back-history`, [build note](../build/2026-11-09-back-history.md).** Owner,
2026-11-09: "if he swipes left from the left edge or presses back button … he shall be sent back to the original
screen or that previous state where the user was. Similar to how it works in apps such as play store, instagram".
Triage [TR-023](../triage.md).

## Problem

On Android, Back did not follow what the user did:
- Back from any tab went to Explore.
- Back ignored section switches, filters and searches inside a screen. After Listings → Rooms, Back left Listings.
- Returning from a pushed screen already kept the list and its scroll, because the list stays mounted.

## Questions for the owner, and answers (2026-11-09)

| Question | Answer |
|---|---|
| Back after switching tabs? | The previous tab, in the order visited (Instagram), then leave the app from Explore. |
| Which in-screen changes does Back undo? | Section switches, filters and searches. |
| How much comes back? | Scroll position and typed text, while the app is open. Not after a restart. |
| Scope? | The whole app in one pull request, admin included. |
| The on-screen ← on a screen with sections? | It leaves the screen. Android Back and the edge swipe undo in-screen changes first. |
| How to check the edge swipe? | Switch the test phone to gesture navigation for the walk, then back to buttons. |

## What will change

- **Tabs:** `backBehavior="history"` on the native tabs.
- **In-screen history:** `useBackState` (`src/hooks/useBackState.ts`), a `useState` that records the user's changes per
  screen. Back undoes the last one before the screen or tab is left.
  - Changes from one tap are one step, for example a section switch that also clears the search.
  - A burst of typing is one step.
  - Everything changed while a sheet is open is one step (`useBackBatch`). The Listings filter applies live, so
    without this one sheet visit would take several presses to undo.
  - Effects (deep-link parameters, pull-to-refresh resets, the tab change after sending an admin notification or
    creating a poll) use the silent setter, so Back never undoes a step the user did not take.
- **Screens:**
  - the four tabs (Explore, Listings, Food, Community);
  - chat, events, help, the landlord dashboard, my posts, my listings, notifications, saved, and event check-in;
  - the 15 admin screens with filters or searches.
- **Admin queries:** Audit log and Data privacy copied the filter into the query only in the tap handler. They now
  derive the query from screen state, as User management and Listing management already did, so an undo also
  reloads the list.

## What will not change

- **Form fields** are not history: posting, onboarding, edit profile, the restaurant edit form, the community "ask"
  topic, the voice recorder, the property agreement. Back on a form keeps its existing behaviour.
- **City pickers** stay as they are.
- **Sheets and dialogs** still close first on Back. They are their own window.
- **iOS:** there is no system Back. The edge swipe pops a pushed screen and never undoes in-screen changes. Tab
  history has no effect on iOS.

## Lost

- Leaving a screen after trying several filters takes one press per change. The owner chose this ("sections,
  filters, search").
- Undoing a section switch shows the earlier section from the top of its list. The switch sits at the top, so at
  most a header's height of scroll is lost.

## How it will be checked

`pnpm typecheck`. On the phone (Android, Expo Go), against the local backend:
- tab history;
- each section, filter and search, undone in order, on the tabs and on one pushed screen;
- a sheet visit undone in one press;
- a section kept after another tab is visited and Back returns to it;
- a pushed screen closed by Back once nothing is left to undo;
- the edge swipe in gesture navigation.
