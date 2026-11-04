# Smoke checklist

_2026-11-04. A quick pass over the whole app on the phone, run after setting up a new build and before a
release. About 15 minutes. Not run yet._

**Build and data.** Development build or Expo Go from Metro, `.env` pointing at `http://localhost:4000/api`,
backend running, `adb reverse` for 4000 and 8083. Account `ui_tester` (onboarding complete, Los Angeles) and the
`uit_*` seed data (see the system map).

**Settings to put back.** Theme (note it at the start).

**Clean-up.** Nothing is created.

| ID | Who | Do | Expect | Review |
|---|---|---|---|---|
| S-01 | P | Launch the app cold | No red screen; signed out: the login screen, or the guest view after a city is picked | 01, 08 |
| S-02 | A | Watch the backend log during S-01 | Requests arrive at the local backend. If not, stop the run: the build is not on the local backend | device-testing guide |
| S-03 | P | Sign in as `ui_tester` | Lands on the Explore tab; header shows Los Angeles | 01 §Sign-up and sign-in |
| S-04 | P | Tap each bottom tab: Explore, Listings, Food, Community | Each shows content, not an empty state; no blank or white frame | 02, 03, 04, 05 |
| S-05 | P | Swipe left and right between tabs | Pager moves one tab per swipe; tab bar follows | 08 §Navigation |
| S-06 | P | Explore: open each top tab (News, Events, Stories, Quests, Polls) | Each renders; empty ones show an empty state, not a spinner forever | 02 |
| S-07 | P | Listings: open the first listing card | Detail opens; price, beds and baths shown; no "Walk 0" or "N/A" pills without data | 03 Problems 4 |
| S-08 | P | Listings → Rooms & Mates → Find Roommates | Roommate cards with a match %; move-in dates read like "Nov 2, 2026", "Immediate" or "Flexible" | 03 Problems 2, 3 |
| S-09 | P | Food: open the first restaurant | Detail opens with hours and an open or closed state | 04 |
| S-10 | P | Community: scroll the questions | Relative times ("3h ago"), not raw dates | 05 Problems 1 |
| S-11 | P | Open Messages from the header | The list shows; no "✓✓" on rows where `ui_tester` did not send the last message | 06 Problems 1 |
| S-12 | P | Open Notifications, then Android back | Back returns to the previous screen without a white flash | 08 Problems 2 |
| S-13 | P | Settings: switch the theme, then switch it back | Whole app follows each change; theme restored | 01 §Settings |
| S-14 | P | Sign out | Returns to the login or guest view; reopening Messages asks to sign in | 01 |

## YOU

| ID | Why Claude cannot | What the owner does |
|---|---|---|
| — | | |
