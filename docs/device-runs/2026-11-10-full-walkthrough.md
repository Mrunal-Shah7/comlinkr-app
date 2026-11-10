# 2026-11-10: full walkthrough of the app (TR-028)

Owner, 2026-11-10: walk every feature of the four sections and the shared screens from the UI, check the logic as
well as the look, fix what is found (the API too), and check whether Resend email works locally.

**Build.** Expo Go on the OnePlus (Android 16), branch `fix/walkthrough` (from `main` at `24c6878`), Metro on port
8084 with `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`. The phone's port 4000 is forwarded (`adb reverse
tcp:4000 tcp:4001`) to a backend on port 4001 started **with** the Resend key (`NODE_ENV=development`), so sign-up
and reset send real email. Requests read from Metro's `[API]` log.

**Account.** The owner's own account, created in the walk on the local database (the owner asked for it; the
address and password are not written here). Codes were read back from the local `OtpCode` row (HMAC with the local
`SESSION_SECRET`, 6 digits tried) so the walk did not wait for the inbox.

**Input.** MCPier `android` (scrcpy) for taps and typing; screenshots with `adb exec-out screencap`, because scrcpy
frames lag one step.

## Resend

| ID | Result | Note |
|---|---|---|
| R-01 | pass | `GET https://api.resend.com/domains` with the local key: 200; `comlinkr.com` verified, sending enabled |
| R-02 | pass | Sign-up code sent from the app: Resend lists it as **delivered** to the owner's address (01:46 local) |
| R-03 | bug, fixed | The Resend SDK (v6) returns `{ data, error }` instead of throwing, so `mail.service.ts`'s `try/catch` never saw a refused email: failures were silent in production too. The error is now logged, with the dev OTP fallback |
| R-04 | finding | "Not working locally" was the documented setup: the backend is started with `RESEND_API_KEY=` empty, so the code is only logged |

## Account: sign-up, onboarding

| ID | Result | Note |
|---|---|---|
| A-01 | pass | Sign-up button disabled until the form is valid; live password rules (8 characters, capital, number) |
| A-02 | pass | Taken username: 409, "This username is already taken." shown |
| A-03 | pass | Wrong code: 400, "Invalid verification code", boxes empty |
| A-04 | pass | Right code: account created, onboarding opens |
| A-05 | finding | Right after sign-up, six sidebar requests (`/saves`, `/users/me/stats`, unread counts, my listings, my restaurants) go out before onboarding and all answer 403 "Complete onboarding" |
| A-06 | bug | The six code boxes reach the screen edges on this phone (about 377 dp wide): fixed width 48 × 6 plus gaps |
| A-07 | bug, fixed | Onboarding state search: the keyboard's autocorrect commits "California " with a space, and the list showed "No results". The query is now trimmed |
| A-08 | pass | Onboarding 5 steps: location, vibes, interests, communities (Skip turns into Continue), agreement; Back keeps the answers; Terms opens and Back returns to step 5; finish posts location, vibes, interests, communities, agreement, complete (all 201) |
| A-09 | pass | Explore after onboarding: "Good afternoon, Mrunal", Los Angeles (time is the city's) |

## Explore

| ID | Result | Note |
|---|---|---|
| E-01 | bug, fixed | Explore's section switcher cut "Stories" and "Quests" to "Storie" and "Quest" (Compose segmented button, five labels). Five or more labels now use the smaller `labelMedium` type; all fit, selected or not |
| E-03 | bug, fixed | Hot question card opened Community but not the question when it was further down the list: the question is now moved to the top and the list scrolls up |
| E-04 | bug, fixed | Back from Explore right after signing in showed the login screen again: sign-in and onboarding now `dismissTo` Explore (`enterApp`) instead of pushing it |
| E-05 | bug, fixed | Story composer: the Photo library / Camera sheet never opened (it was only rendered in the main composer's return) |
| E-06 | bug, fixed | Story composer background was white around the black card; it is black for a new story |
| E-07 | bug, fixed | **Every upload in the app failed** ("Could not publish"): since SDK 57 the global `fetch` is `expo/fetch`, which rejects React Native's `{ uri, name, type }` FormData parts ("Unsupported FormDataPart implementation"). No request reached the API. `postFormData` now gives each such part a `bytes()` that reads the file (`expo-file-system`). Covers stories, posts, listing and room photos, restaurant and event images, badge proofs, chat audio and the avatar. Story published: `POST /stories` 201, image served from Cloudinary |
| E-08 | bug, fixed | A new story did not appear in Explore's rings, and a deleted one stayed, until pull to refresh: the rings are cached for 10 minutes and nothing marked them stale. `stories.api` now invalidates them on create and delete, and Explore reloads the rings when they are invalidated (it never loses focus under the viewer) |
| E-09 | bug, fixed | "View" after sharing a story went to Explore, the same as "Done": it now opens the new story (`story-viewer?storyId=`), replacing the composer |
| E-10 | pass | Story viewer: image, caption, Like (201, "Liked"), Save (201, "Saved"), comment sheet pauses the story, comment posted (201) and listed, delete with confirmation (200; row and Cloudinary file removed by the API) |
| E-11 | bug, fixed | After publishing a post, event, quest or restaurant, Explore and Food kept their cached lists for minutes: the composer now marks the matching caches stale |
| E-12 | finding | A story seconds old reads "1m ago"; the comment just posted too |
| E-13 | finding | Initials differ for the same person: "MS" (avatar), "M" (story header), "MR" (comment) |
| E-14 | finding | The "Homes in Los Angeles" card appears a moment after the rest of the bento, pushing it down |
| E-15 | pass | News: like (201, "Like · 1"), save (201), comment posted (201, "Just now"), share sheet with the title |
| E-16 | bug, fixed | News "For you" showed a 2019 Super Bowl story labelled Local: Google News search returns years-old items and the API kept them. Items older than 30 days are now dropped (`isStaleNewsItem`, unit tested); the oldest item for Los Angeles is now 5 days old |
| E-17 | bug, fixed | Tapping a news card opened a different article twice: the second ("full") load replaced the list in another order a second or two after it appeared. Cards already shown now keep their place and new ones are added below |
| E-18 | finding | "Read full article" leaves the app for the phone's browser (`Linking.openURL`) on a news.google.com redirect, instead of an in-app browser |
| E-19 | finding | "For you" in Los Angeles leads with currency analysis (USD/CAD, AUD/USD), a UK farming report and a Korean-language source: little of it is local |
| E-20 | pass | Neighbours post with a photo: published (`POST /feed` 201, photo shown), appears at the top at once (E-11), edit (PATCH 200, "Edited"), like (201), comment (201, count 1), delete with confirmation (200) |
| E-21 | bug, fixed | **A post that failed still appeared.** The API saved the post, then uploaded the photo; when Cloudinary dropped the connection (twice, including the retry) it answered 500, the app said "Could not publish", but the post stayed, without its photo. A wrong file type or size did the same. Files are now checked before anything is written, and a failed upload removes the post and any photos already uploaded; the app gets 503 "Could not upload your photos. Please try again." (unit tested) |
| E-22 | bug, fixed | Deleting a post left its photos public on Cloudinary (the code said "not strictly required for now"). They are now deleted with the post, as stories already were (unit tested). The test photo left by the earlier delete was removed by hand |
| E-23 | bug, fixed | The post sheet's comment field stayed under the keyboard on Explore, so typing was blind. On Android the Material sheet only shrinks for the keyboard on some screens (it did on the article screen, not inside the tabs); the sheet frame now measures its overlap with the keyboard and lifts the card by it, and a full-height sheet gives up the keyboard's height |
| E-24 | bug, fixed | Neighbours posts showed a raw timestamp with seconds ("10/11/2026, 02:39:06"); now relative ("5m ago"), like news. Restaurant reviews had the same and are fixed too |
| E-25 | finding | Users without a photo get a stock picture from randomuser.me (a third-party request per card); 55 uses of randomuser.me in the app, most in placeholder data |
| E-26 | bug, fixed | Post editor kept the "Publish Post" label in edit mode; it says "Save changes" now (not walked again) |
| E-27 | finding | "View" after publishing a post scrolls Explore to the top and leaves the chip on "For you", not on Neighbours where the post is |
| E-28 | pass | Events: no upcoming events in Los Angeles locally (one past event in "TestCity"), so one was hosted: native date and time pickers (past days disabled), `POST /events` 201 and its photo `POST /events/:id/images` 201; listed at once with the photo and in the bento ("Next up"); detail (when, where, host, "You're hosting"), save (201, kept on the card), share text |
| E-29 | bug, fixed | "View" after creating an event went to Explore's News; it now opens the event |
| E-30 | bug, fixed | If an event's photos failed to upload after the event was created, the composer said "Could not publish" and a retry made a second event. The event now counts as published and the message says its photos could not be uploaded |
| E-31 | finding | The host cannot edit, cancel or delete an event from its page: delete is only in My posts, and there is no edit screen (`updateEvent` is never called) |
| E-32 | finding | Event times are entered and shown in the phone's time zone, while Explore shows the city's time (Los Angeles); an event in another zone would be off |
| E-33 | finding | Door check-in asks for the camera; not granted (phone setting), so scanning was not tested. Attending another person's event needs a second account: not covered here |
| E-34 | pass | Quests: the "Visit places" template fills title, type and details; goal is required; `POST` 201; the creator is joined; shows in Quests and in the bento |
| E-35 | bug, fixed | A one-week quest created a minute earlier read "6D LEFT" (days rounded down); now rounded up ("7D LEFT") |
| E-36 | finding | Quests: no detail screen, so no progress and no way to leave; the screen mixes "quest" and "challenge" (title "A quest", "Challenge title", "Launch Challenge"); the empty state shows two "Start a quest" buttons |
| E-37 | finding | After "Done" on the new quest the app stopped responding to taps (frames frozen, tab icons missing) until it was reloaded; the event composer showed the same frozen frames for a while. Not reproduced yet |
| E-38 | pass | Polls: vote (201, 100%, bento "1 voted"), tap again clears (201), next question; notifications (empty, correct: own actions); messages (empty state) |

## Listings

From here on, taps, swipes, text and keys go through MCPier's `android` server (scrcpy); adb is used only for
screenshots and the UI dump. Before this point all input went through adb directly (see the handover).

| # | Result | What happened |
|---|---|---|
| L-01 | bug, fixed | **Pets filter (TR-024).** `GET /api/housing?pets=…` answered 400 because the query DTO had no `pets`. It now takes `pets=true|false` and matches the free-text `petPolicy` ("No pets", "not allowed" = refused; empty = not stated, left out). Los Angeles: Pets allowed 8, No pets 16, as in the database (unit tested) |
| L-02 | pass | Type chip; max price with no match shows "No listings match your filters" and Clear filters; Clear all in the filter sheet |
| L-03 | pass | Search "Koreatown" sends `search=` and narrows the list. Back after Clear all brings the filters back: that is the in-screen Back history, not a bug |
| L-04 | pass | Listing detail; save and unsave (`POST /housing/:id/save` toggles, 201); Message opens a chat with the landlord (a seeded `uit_` account) tied to the listing, and a message is sent (201) |
| L-05 | finding | Seed data is incoherent: "Spacious 3BR family home" has 1 bed and type Room. The seed's source is not in this repo |
| L-06 | finding | Once, the status bar's clock and icons turned white on the light screens (Listings, chat) and stayed so until the app restarted. Not reproduced: filter sheet, listing detail, keyboard and story composer each leave it dark. Likely left by the story viewer (`StatusBar hidden`), which was used earlier in the walk |
| L-07 | pass | Rooms: empty state in a city with no shared rooms (none in the local database) |
| L-08 | bug, fixed | **A room whose photo upload failed still appeared.** `POST /shared-spaces` 201, then the photo upload got 500 (Cloudinary dropped the connection twice); the app said "Could not publish" though the room was listed, so a retry made a second one. Rooms and restaurants now count as published and say their photos could not be uploaded, as events already do (E-30) |
| L-09 | bug, fixed | A Cloudinary upload that dropped twice reached the app as a bare 500 "An unexpected error occurred", and the log lost Cloudinary's reason (it reads `error.message` only from an `Error`, but Cloudinary passes a plain object). Now 503 "Could not upload your photos. Please try again." with the reason logged (unit tested) |
| L-10 | bug, fixed | "View" after listing a room went to Listings → Homes; it now opens the room |
| L-11 | bug, fixed | Own room: a "50% match" against yourself (hidden for the owner), "0 people live here now" whatever was entered (the field read, `currentOccupants`, is never raised; it now shows "People living there"), and the filler line "Shared space host" (removed) |
| L-12 | bug, fixed | **Editing a room put its title in the Description field**, so Save overwrote the description with the title. It now loads the description. Checked: Save changed description and rent only (`PATCH` 200, title kept) |
| L-13 | pass | Room delete: Cancel keeps it, Delete removes the room and its photo from Cloudinary; the empty state returns |
| L-14 | finding | Room placeholder "e.g. Sunny room in shared Williamsburg l…" is cut off |
| L-15 | pass | Roommates: Best Match sorted by score, Budget by lowest budget, Move-in Soon = the 5 people moving in within 30 days (checked against the database), save (201) |
| L-16 | bug, fixed | **"Cancel request" never cancelled.** It called the recipient's `/decline`, which answered 400 "No pending connection request to decline"; the card stayed Pending. It now calls `/cancel` (list and profile) |
| L-17 | finding | Pull to refresh resets search, the type chip and the roommate sort, but keeps price, beds and pets: half the filters reset |
| L-18 | finding | Roommate preferences can be edited on the Listings tab only from the empty state; otherwise only from Profile |
| L-19 | pass | Apply: name and city prefilled, native date picker, income, work, `POST /property-applications` 201 and step 1 saved; the offer; "Start a week later" moves the start 7 days; the agreement read to the end; drawn signature; submit and sign (200); the stored move-in date is 7 Dec |
| L-20 | finding | The application accepted a start of 30 Nov for a home available from 2 Dec, and the offer appears at once, before the landlord has seen the application |
| L-21 | bug, fixed | Agreement: the divider lines wrapped onto a second line on a phone (shortened), and the document ID was random on every render with "2026" hard-coded; it is now the year and the application's own ID, the same every time |
| L-22 | bug, fixed | **Applying again opened a blank form** after you had applied and signed (the server then refuses with "already applied"), and the listing still said "Apply". Apply now reopens your application (the offer, or "You signed") and the listing shows "Agreement" |
| L-23 | bug, fixed | **No way to withdraw** although the form said "You can withdraw it at any time": the server allowed it for drafts only. Owner's decision: a tenant may withdraw until the landlord approves. Withdraw is on the signed screen, the landlord is notified, and the listing goes back to "Apply" (unit tested) |
| L-24 | bug, fixed | Date picker warned that `onChange` is deprecated (datetimepicker 9); it uses `onValueChange` now |

## Food

| # | Result | What happened |
|---|---|---|
| F-01 | bug, fixed | **"Open now" never showed a restaurant.** The seeded and older listings store hours as `09:00`, the app's picker writes `9:00 AM`, and `parseTimeMins` read only the second form, so every seeded restaurant was "Hours not provided". It reads both now; restaurants with no time zone fall back to their city's (`src/utils/cityTimezone.ts`, shared with Explore's greeting). Los Angeles at 14:50: 12 open, the "Open now" tile appears, the detail says "Open · closes 22:00" |
| F-02 | bug, fixed | **A new restaurant took the owner's phone time zone**, not its city's: one created in Los Angeles from a phone set to India was saved as `Asia/Kolkata`, so it would show closed through Los Angeles' day. The composer now saves the city's zone (none when the city is not in the table). Rows already in production may hold a phone's zone: see triage |
| F-03 | bug, fixed | **My restaurants was always empty**, so an owner could never edit or delete a restaurant, and Saved → Favourites was always empty: both read a paginated `{ data, meta }` answer as a bare array. Both lists now read `data` |
| F-04 | bug, fixed | **Saving an edit to a restaurant always failed** (400): the form sent the price as `$$` upper-cased, which the API rejects, plus city and country it does not edit. It now sends only what the form edits, and the "Open now" switch, which it never sent |
| F-05 | bug, fixed | **Sheets hid their last row under the navigation bar**: the Material sheet's window reaches 24 dp under a three-button bar, so the Save button of a full-height form (Manage restaurant) could not be reached. The sheet frame now lifts its card above the window's bottom |
| F-06 | bug, fixed | **Opening a signed-in screen from a link on a cold start showed the login screen** (seen on `my-restaurants`; eight screens redirect on `!user`): the screen rendered before the stored session loaded. The root layout now waits for it, as it already waited for the theme |
| F-07 | bug, fixed | "View" after adding a restaurant went to the Food tab; it opens the new restaurant now (and, after a review from the composer, the reviewed one) |
| F-08 | bug, fixed | The composer kept "Add Restaurant" disabled with no reason while the story was empty: the story is required but its label had no `*` (added) |
| F-09 | bug, fixed | The composer's default price, "$ Mid-range", matched no chip and was saved as Budget; the default is the "$$ Mid-range" chip |
| F-10 | bug, fixed | Searching swapped "Pick of the week" for the first search hit (a 4.1 restaurant) and recounted the tiles from the matches; the summary tiles hide during a search |
| F-11 | bug, fixed | "Nearby" was always empty: no restaurant and no user location has coordinates (the composer collects none). The chip hides until some restaurant has a distance; making Nearby work is a feature (triage) |
| F-12 | bug, fixed | Favourites' empty state said "Tap the heart on any restaurant", but cards have no heart: it now says to double-tap a photo or press and hold a card (both work) |
| F-13 | bug, fixed | Two meanings of open: the owner's "Open now" switch (`isOpen`) changed nothing customers see (they get the status from the hours), so the owner's card could say "Open now" while customers saw "Closed". **Owner's decision: a "Temporarily closed" override.** The switch is now "Temporarily closed"; when on, customers see "Temporarily closed" whatever the hours say (the Open now count drops, checked 12 to 11), and the owner's card shows the status customers see (none when the hours are not set). A missing `isOpen` never reads as closed |
| F-14 | bug, fixed | **Leaving the composer with Back lost everything typed**, with no prompt (a full restaurant form was lost this way). **Owner's decision: ask first.** Every composer type now asks "Discard your changes?" (Keep editing / Discard) from the back arrow, the hardware Back and the story and listing close buttons, only when something was typed or picked; an untouched form, a publish and a save leave without asking |
| F-15 | bug, fixed | In review mode the composer's title said "My restaurant"; it says "A review" now (not walked again) |
| F-16 | seed | Seeded restaurants carry a rating and review count (4.7, 87) with no reviews behind them; the first real review recalculates them (4.0 from 1). Put back after the test |
| F-17 | pass | Top rated (3, matches the database), Favourites add and remove (long-press menu, detail heart, Saved), bookmark save and unsave, search (match, no match, Clear Filters), review post, edit (4 to 5 stars), delete with confirm, rating hidden when there are no reviews, restaurant create with the test photo, edit, delete (row, image row and Cloudinary folder gone), review from the composer and its delete |

## Community

| # | Check | Result |
|---|---|---|
| C-01 | Ask with accents; topic guessed (Housing), chip override to Transit | ok: saved as TRANSIT, accents intact |
| C-02 | Upvote question, post answer, upvote answer, bookmark, share | ok |
| C-03 | Block an author from the ··· menu | bug, fixed: the list never re-rendered (screen selected the store's `isBlocked` function, not the list); same in Feed's community posts. Blocked authors' answers are now hidden too |
| C-04 | Delete your own answer | bug, fixed: the icon only showed for an author named "You", and it only hid the answer locally. Backend had no delete route: added `DELETE /community/questions/:qid/answers/:aid` (author only, count lowered, upvotes removed) |
| C-05 | ··· menu on your own question | bug, fixed: offered report and block of yourself (the backend refuses self-reports) and no delete. Now Share and Delete; added `DELETE /community/questions/:id` (author only). My posts' question delete called this missing route too |
| C-06 | Answer composer with the keyboard open | bug, fixed: Cancel and Post sat under the keyboard; the screen now scrolls the composer into view |
| C-07 | Saved questions client call | bug, fixed: `/community/bookmarks` does not exist; now `/community/questions/saved` |
| C-08 | Ask sheet opens without the keyboard although the field asks for focus | minor, not fixed |
| C-09 | Delete your own answer and question on the phone | ok: answer count back to 0, upvotes and save removed with them |
| C-10 | Topic chip (Transit) and sort (Popular), then Back | ok: server-side filter and sort; Back undoes the sort, then the filter |
| C-11 | Pagination past 20 (12 temporary `uit page test` rows) | ok: page 2 loads, Load more disappears at the end |
| C-12 | Report a person (`uit_lucas8`), unblock in Settings → Blocked people | ok: report stored as USER; unblock removes the row and empties the list |
| C-13 | Delete a question from My posts | ok after the new route (it called a missing endpoint before) |
| C-14 | My posts question counts | bug, fixed: read `answersCount` / `votes`, the list returns `answerCount` / `upvoteCount`, so they always showed 0 |
| C-15 | Edit on a question in My posts | not supported; says so ("Not available"). Left as is |

Clean-up done: test questions, answers, the 12 paging rows, both reports and the block are deleted; the owner has no
Community questions, answers, upvotes or saves left (checked in the database).

## Shared screens and admin

Backend restarted on port 4003 (phone port 4000 reversed to it) and Metro on 8085 after the Community section; the
backend ran with the Resend key until S-10, then was restarted with `RESEND_API_KEY=` empty (the reset code was logged, not emailed).

| # | Result | What happened |
|---|---|---|
| S-01 | bug, fixed | **Saved → News never listed a saved article.** The count included news articles (`newsArticleSave`) but the list read feed saves only, so the tab said 1 and showed nothing. The API now merges both, newest first, and the app opens an article in the news reader and unsaves it there (unit tested) |
| S-02 | pass | Saved → Events and Roommates: unsave removes the card; Interested: empty state |
| S-03 | bug, fixed | My posts: question counts always 0 (C-14); deleting a quest or a story said nothing happened: added `DELETE /challenges/:id` (author only) and the story delete the viewer already had. Other kinds now say they cannot be deleted here yet |
| S-04 | bug, fixed | Deleting an event left its photo on Cloudinary (the test event's photo was removed by hand). `deleteEvent` now deletes the event's images after the row (unit tested; not walked again on the phone) |
| S-05 | pass | Chat: send with accents, View profile, Message, Delete chat (with confirmation), empty state. Deleting one message is not offered (the client call is a stub): finding |
| S-06 | bug, hidden | **Follow on a public profile always failed** ("Cannot POST"): there is no follow API at all. The button is hidden behind `FOLLOW_ENABLED = false` until it is built (TR-029) |
| S-07 | pass | Own profile: edit bio and save (PATCH 200); bio put back in the database |
| S-08 | pass | Log out asks first, goes to guest Explore; Back then leaves the app |
| S-09 | pass | **Resend locally:** Forgot password sends the reset email (Resend id logged, delivered to the owner's inbox); the code resets the password (set to the same value) and sign-in works |
| S-10 | bug, fixed | The six code boxes (A-06) now share the row's width (`flex: 1`, at most 48 dp). Seen on the phone (Forgot password, code logged with email off): all six sit inside the page margins. The reset was left unfinished |
| S-11 | pass | Admin (owner's local role set to ADMIN for the walk, then put back to USER and signed in again): dashboard and all 20 admin screens render their data (each screenshot read) and the backend log shows no failed request (143 requests). No moderation action was taken on other people's content |
| S-12 | bug, fixed | Admin → Users said "0 users" while the list was still loading (rule B6/B3): the count hides until the first page arrives. The fixed screen was seen loaded (60 users), not while loading |
| S-13 | finding | A role change reaches the app only after the next sign-in: the stored user is restored at start and never refreshed from `/auth/me` (TR-030) |
| S-14 | bug, fixed | The landlord dashboard for a user without the Landlord badge said "No applications yet" (the API answers 403). It now says "Verified hosts only" with Get the badge; seen on the phone. The 403 was requested seven times during the walk, cause not found (TR-031) |
| S-15 | pass | Settings, Help, Get a badge, Notifications, Verification status, My listings, Interested, Favourites, Edit profile, Privacy policy and Terms open with no failed request. "Get a badge" writes "ComLinkr", elsewhere "Comlinkr" |
| S-16 | bug, fixed | Saved → Favourites still said "Tap the heart on a place" (F-12 fixed only Food's copy); it now says to double-tap a photo or press and hold. Seen on the phone |
| S-17 | finding | Admin → Roommates shows "Age 0" for a profile without an age (rule B6) |

Not covered: notification preferences were not toggled; badge applications were not submitted (they need proof
uploads and an admin decision); door check-in needs the camera (not granted).

Clean-up done: the test event and its Cloudinary photo, the quest, the news like, save and comment, the chat, the
withdrawn application, the saves, and the question are deleted. The owner's local account is kept (role USER).
