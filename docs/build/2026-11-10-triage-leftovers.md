# 2026-11-10: Triage leftovers (TR-035, TR-040, backend lint)

Branch `fix/triage-leftovers`, from `feature/gps-city`. Merged as pull request 28 (merge `1d99f02`), reaching `main` with PR 24.

## Changes

- **TR-035:** the chat unread count (header) and the Listings roommate and room lists wait for onboarding to be done;
  they answered 403 right after sign-up.
- **Explore news looped on an error:** `loadNews` depended on the articles it sets, so every failure (a 403,
  offline, a 500) gave it a new identity, the focus effect ran it again, and it requested `news/explore` without
  pause (over a hundred requests in 30 s). It reads the articles through a ref now; one request per focus.
- **TR-040, small findings from the walkthrough:**
  - E-12: a story seconds old reads "Just now", not "1m ago".
  - E-13: story header and comments use the same initials as the avatar elsewhere (from the name).
  - E-25: no more randomuser.me photos (a third-party request per card for anyone without a photo); an empty
    avatar shows a person icon sized to its box (`FadeImage`).
  - E-27: "View" or "Done" after publishing opens the post's own section (News › Neighbours, Events, Quests).
  - L-06: the story viewer claims the light, hidden status bar only while focused; it stayed white on screens
    opened from it.
  - L-14: the room title placeholder fits.
  - L-17: pull to refresh on Listings keeps search, type and sort, like the other filters.
  - S-17: admin Roommates hides "Age 0".
  - C-08: the Ask sheet focuses its field once it has slid in (the keyboard now opens).
  - Expo Go's push warning is an info log, so its toast no longer covers the tab bar during walks.
- **Backend lint:** `npx eslint "src/**/*.ts"` passes: formatting in 17 files, an unused import, a redundant
  `any | null`, and a documented exception for a reject that is always an Error.

## Closed without code

TR-001, TR-008 and TR-022 were fixed by the walkthrough (PR 22) and checked again; TR-004 no longer applies (the bar
is hidden); TR-034 did not reproduce (a quest published, "Done", taps responsive).

## Open

E-14 (the "Homes" card arrives late and pushes the bento down), L-18 (roommate preferences only from the empty
state), and the brand's spelling: "ComLinkr" appears 78 times in the app and "Comlinkr" 16; the owner picks one.

## How it was checked

Mobile `pnpm typecheck`; backend `tsc`, unit 115, lint clean. On the phone: Ask sheet keyboard; Listings refresh
keeps the House filter; a cold start and a cold deep link stay signed in; a quest published and "Done"; with the
account marked not onboarded on the server, `news/explore` was requested once instead of in a loop. Not walked:
E-27, L-06 (no stories locally), the 403 gating after a real sign-up (the account trick cannot show it: the app's
stored user still says onboarded).
