# Run: Expo review fixes (TR-010), 2026-11-08

Build: Expo Go (SDK 57), app 1.0.4, `feature/design-d` at `79babe3` plus the restored `app/app/*` routes
Device: OnePlus CPH2613, Android 16, USB, time zone not checked
Backend: this repository's `backend/dist` (already running), database `comlinkr` (local copy), existing seed
Account(s): `ui_tester`; listing owners `uit_priya3`

Metro: `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`, not taken from `.env`; requests seen in the Metro log on
`localhost:4000`.

| ID | Result | Note |
|---|---|---|
| G-01 | pass | Listing detail → photo → gallery "1 of 3" |
| G-02 | pass | Swipe left twice, right once: 2 of 3, 3 of 3, 2 of 3 |
| G-03 | pass | Short pull (about 30 dp): stays open, photo springs back, black fully opaque again |
| G-04 | pass | Long pull: closes to the detail |
| G-05 | pass | Hardware Back closes the gallery |
| G-06 | pass | Flick of 87 dp closes (velocity) |
| G-07 | blocked | Pinch and pan while zoomed: adb input has one finger |
| S-01 | pass | Story opens from Stories nearby |
| S-02 | pass | Short pull: stays open; long pull: closes to Explore; flick: closes |
| S-03 | pass | Like and unlike inside the gesture area |
| S-04 | fail, fixed | `exp://…/--/app/feed?openStory=<id>` with the `app/app/*` bridge routes deleted: "Unmatched Route". The deletion was reverted (`193be40`) |
| S-05 | pass | Same link with the bridges back opens the story. A first try looked like it did not, because the 5 s test story had closed before the screen was read; re-checked with a 60 s story, one read 2 s after the link |
| E-01 | pass | All events → event → RSVP: the moved registration sheet shows; tickets 1 → 2; ✕ closes without registering |
| C-01 | pass | Listing → Message → a message sent and shown; send button returns to the mic |
| P-01 | pass | Listing editor step 4: drag the first photo one place right; the database order became B, A, C after one PATCH |
| P-02 | pass | Dragged back: order A, B, C again |
| P-03 | pass | Vertical swipe over the photo tiles scrolls the page |
| P-04 | pass | Hardware Back leaves the editor without saving |
| P-05 | pass | "Add more photos" (Android) → the media picker sheet slides in; Cancel slides it out; opened again at the same place; a tap on the backdrop closes it. Library and Camera not tapped (an upload would go to Cloudinary) |

Put back: the test story, event, listing (with its photos) and the conversation with its message were added for
this run and deleted after it; the story and listing were added again for S-05 and P-05 and deleted again; a count
of what is left is 0. No setting changed.
Follow-up: TR-010 updated; review 08 "Update 2026-11-08".

## Second round: signature pad and Explore news (later the same day)

Build: Expo Go, `main` at `aee7784` plus the `fix/signpad-tap-dot` change. Device: OnePlus CPH2613, Android 16, USB.
Backend and account as above (`ui_tester`; the "UT" avatar on the tabs). Metro with the local API (requests seen on
`localhost:4000`). The agreement screen was opened with `exp://127.0.0.1:8083/--/property-agreement?propertyTitle=Test%20flat`
(no `listingId`, so no application was created and nothing was sent to the server).

| ID | Result | Note |
|---|---|---|
| A-01 | pass | Part 1 filled (name, phone, city, move-in 30 Nov 2026, income, Employed); "Send application" goes to the offer |
| A-02 | pass | A diagonal and a vertical stroke both draw; the page did not scroll under the vertical stroke |
| A-03 | fail, fixed | A tap left no dot: a down and up with no move never activates the pan, so `onStart` did not run. The stroke now starts in `onBegin` (`fix/signpad-tap-dot`) |
| A-04 | pass | After the fix: Clear empties the pad; a tap leaves a dot |
| A-05 | pass | Stroke, "I have read" on, "Sign and accept": "Signed" screen (`toPng()` returned a signature); no API request in the Metro log |
| N-01 | pass | Explore opens; news loads (phase "full", 200) and the cards render |
| N-02 | pass | "Load More" requests page 2 and appends the cards |

Not checked: the pad in dark mode; iOS.
Put back: nothing was written to the database. Metro stopped.

## Third round: the checks left over (later the same day)

Build: Expo Go, `main` at `c49c034`. Same device, backend, account and Metro set-up as the second round.

| ID | Result | Note |
|---|---|---|
| T-01 | pass | Stroke drawn, then "Type instead": a name field replaces the pad; "UI Tester" typed and "I have read" on turn "Sign and accept" on |
| T-02 | pass | "Draw instead": the pad comes back empty and "Sign and accept" turns off (switching clears `signed`); one stroke turns it on again. Left with Back, nothing signed |
| K-01 | not checked | Explore's news skeleton pulse: it shows only below the fold, for about a second (the first news request took 956 ms), while the list is empty. `adb shell screenrecord` is refused on this phone ("Permission denied"), and slowing the network would mean changing phone settings |
| L-01 | not applicable | `ListingCard`'s save pop and burst: the shared component is rendered nowhere. The admin listings screen has its own local `ListingCard`, and `MemoListingCard` (the only user of the shared one) was imported by Listings but never rendered. Both deleted on `chore/remove-unused-listingcard` |

Put back: nothing written. Metro stopped.
