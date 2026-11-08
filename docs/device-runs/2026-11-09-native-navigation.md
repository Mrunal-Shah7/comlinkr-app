# 2026-11-09: native navigation and controls (TR-012)

Build: Expo Go on the OnePlus (Android 16), `feature/native-navigation`, Metro with
`EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`, local backend with `RESEND_API_KEY=` empty, signed in as
`ui_tester`.

| ID | Result | Note |
|---|---|---|
| N-01 | pass | The native tab bar renders in Expo Go: Explore, Listings, Post, Food, Community, with the Material 3 indicator |
| N-02 | pass | Post opens the compose sheet; the bar stays on Listings; Back closes the sheet |
| N-03 | pass | Listing card → detail (native push) → Back to Listings |
| N-04 | pass | Listing "Message" → chat thread; Back closes the thread and returns to Listings. Opening the thread created a test conversation, deleted afterwards |
| N-05 | pass | Listings Homes / Rooms / Roommates: Material 3 segmented buttons; Rooms selected and back |
| N-06 | fail → fixed | Compose sheet: a crash with `GestureHandlerRootView` inside the native sheet, then a crash on the first scroll without `RNHostView`. With both fixed it expands, scrolls, and "Review a restaurant" opens its composer |
| N-07 | fail → fixed | Food rating sheet: the stars ignored tap and drag (gesture-handler). After the responder change, a tap gives 4 and a drag gives 3 |
| N-08 | fail → fixed | Rating sheet: the keyboard hid the text field. With full height while the keyboard is open, the field and "Post rating" are visible. Closed with X; nothing posted |
| N-09 | pass | Settings switches render as Material 3. Dark mode on (tab bar, segmented control and switches follow), then off again |
| N-10 | not checked | Story viewer `slide_from_bottom`: no story seeded |

Put back: the conversation from N-04 deleted (`Conversation` and its two `ConversationMember` rows); dark mode off;
no rating posted.
