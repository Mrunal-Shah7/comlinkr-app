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
| S-04 | fail | `exp://…/--/app/feed?openStory=<id>` with the bridge routes deleted: "Unmatched Route". Bridges restored; then the link lands on Explore but the story does not open (noted in the build note, not chased) |
| E-01 | pass | All events → event → RSVP: the moved registration sheet shows; tickets 1 → 2; ✕ closes without registering |
| C-01 | pass | Listing → Message → a message sent and shown; send button returns to the mic |
| P-01 | pass | Listing editor step 4: drag the first photo one place right; the database order became B, A, C after one PATCH |
| P-02 | pass | Dragged back: order A, B, C again |
| P-03 | pass | Vertical swipe over the photo tiles scrolls the page |
| P-04 | pass | Hardware Back leaves the editor without saving |

Put back: the test story, event, listing (with its three photos) and the conversation with its message were added
for this run and deleted after it; a count of what is left is 0. No setting changed.
Follow-up: TR-010 updated; review 08 "Update 2026-11-08".
