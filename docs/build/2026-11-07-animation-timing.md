# Animation timing: springs ran on Reanimated 4's mass 4

_2026-11-07. Found by screen-recording a walk of the app on a phone; fixed in `frontend/apps/mobile`._

## Problem

After the design D overhaul the animations felt too long and too bouncy: sheets and dialogs wobbled for a second, the
"Renting safely" card flickered when it closed, the roommate profile opened a beat after the tap.

## Cause

- **Reanimated 4 fills any spring value a call leaves out with mass 4, stiffness 900, damping 120** (Reanimated 3 used
  1, 100, 10; `react-native-reanimated/src/animation/spring/springConfigs.ts`). Calls such as
  `.springify().damping(18)` or `withSpring(0, { damping: 20, stiffness: 240 })` therefore ran on mass 4: about a third
  as damped and twice as slow as the numbers suggest (dialogs, the Saved lists, onboarding steps, the sheets' drag
  release, the `ZoomIn` tiles).
- The shared presets were also long: 520 ms reveals 45 ms apart, a 900 ms match ring, a 480 ms hero, an under-damped
  push spring (damping 18, stiffness 190).
- "Renting safely" and Help's FAQ used a *spring* layout transition on a card inside a FlatList header: the header
  blanked and flickered for about a second when the card shrank.
- The Explore glow loop ran forever, so the phone redrew at 60 fps behind every other tab and screen.
- The roommate profile waited for `getRoommate()` before it opened (about 0.4 s of nothing after the tap).
- The Listings skeletons rendered above the guide card, so the guide jumped up when loading ended.
- The featured listing photo sat about 22 dp short of the card's right edge (margin plus `aspectRatio` only).

## Change

- `src/shared/motion/presets.ts`: every spring names damping, stiffness and mass; push/sheet `{24, 260, 1}`, liquid
  `{18, 260, 0.9}`; reveal 360 ms, stagger 35 ms (cap 8), match ring 650 ms, new `layoutEase` (220 ms timed layout).
- Every other `.springify()` / partial `withSpring` call now passes mass (`Dialogs`, `chat`, `check-in`, `edit-profile`,
  `onboarding`, `forgot-password`, `apply-badge`, `property-agreement`, `ListingQuestions`, `ChipInput`, `Otp`,
  `StarPicker`, `PasswordRules`, `EdgeSwipeBack`, `DismissibleSheet`).
- `SafeRentingGuide`, `help-support`, `saved`: `layoutEase` instead of a spring layout; Saved's reveal uses `revealIn`.
- `ZoomStack` back 340 -> 280 ms; hero 480 -> 380 ms (landed 230 ms, done 480 ms); + rotation 350 -> 240 ms; sheet close
  260 -> 200 ms; match ring 900 + 250 -> 650 + 120 ms.
- `ExploreBento`: the glow loop runs only while Explore is focused (`useFocusEffect`, `cancelAnimation`).
- `app/(tabs)/housing/index.tsx`: the roommate profile opens at once with the card's data and is replaced by the full
  profile when it arrives; the guide sits above the skeletons.
- `DListingCards.tsx`: the feature photo is `width: 100%` inside a padded wrapper.

## Checked

Walked on a OnePlus CPH2613 (Expo Go, production JS, local backend, `ui_tester`). Every action was screen-recorded
(scrcpy) with the recording confirmed running before the first tap; each action's time to settled was measured from
the frames (frame-to-frame difference), before and after. Typecheck passes.

| Action | Before | After |
|---|---|---|
| Open a listing (card -> detail) | 485 ms | 333 ms |
| Back from a listing | 131 ms | 66 ms |
| + button opens the Post sheet | 804 ms | 669 ms |
| Close the Post sheet | 306 ms | 158 ms |
| "Renting safely" collapse | 1173 ms, header flickers | no flicker |
| Open side menu | 712 ms | 517 ms |
| Side menu -> a pushed screen | 623-1011 ms | 444-810 ms |
| Log-out dialog opens | 810 ms | 501 ms |
| Roommate card -> profile | 885 ms (starts 409 ms late) | 466 ms (starts 85 ms) |

## Two more bugs found while walking the remaining screens

- **Sign-up could never verify a typed code** (`app/(auth)/signup.tsx`). The code boxes call `onComplete` in the same tick
  as `setCode`, but `handleVerifyAndCreate` read `code` from the previous render (five digits), so the sixth digit always
  gave "Enter the 6-digit code from your email", shook the boxes and emptied them (pasted or autofilled codes failed the
  same way). It now takes the code the boxes pass in; the button calls it with no argument. Checked on the phone: the
  verify request goes out (`POST /auth/register/verify` 201) and onboarding follows.
- **A poll vote never showed on the Explore poll card** (`app/(tabs)/feed/index.tsx`, `handleWyrVote`). Template polls are
  voted under an id like `tpl:0:Los Angeles` and come back as a stored poll with a new id; the card replaced the poll by
  the returned id, found none, and kept saying "Be the first to vote". It now replaces by the id that was voted on.
  Checked: the card shows "Cook at home every day 100%" and "1 voted" at once; tapping the choice again clears it.

## Walked in the second pass (after the first report)

Story composer (opens in about 1 s), Host an event, Explore sub-tabs, polls, chat (Message on a listing opens in about
0.9 s: it creates the conversation first), the whole guest path (side menu, login, forgot password with code and new
password, sign-up with code), and onboarding (each step change about 270-330 ms; Back about 270 ms). Local data the walk
created (user `walk_tester`, one conversation and message, one poll vote) was deleted and checked gone.

## Third pass: the screens left unwalked

Walked on the phone: edit profile (the bio autosaves, `PATCH /users/me` 200), the event list and detail, the RSVP sheet,
door check-in (up to the camera-permission screen), the story viewer (like, save, comments, auto-advance, close), the
quest composer, apply-badge step 1, the rental application form (validation message), log out and back in, and every
admin screen (the test account was made ADMIN in the local database for this and put back).

- **The host was offered an RSVP on their own event** (`EventDetailModal.tsx`): the sheet filled in, then "You cannot RSVP
  to your own event." The bottom bar now says "You're hosting" for the owner, and the owner no longer gets a "Message"
  button to message themselves. Type-checks; **not re-checked on the phone** (the seeded events were removed first).
- Admin screens: all 20 open with live data. Opening 20 routes in a row by deep link made later ones show "Something went
  wrong"; the same screens open fine from the dashboard, so that was the stacked navigation of the test, not the screens.
- A cold deep link to an admin route lands on Login (the guard runs before the saved session loads). Not changed.

Not reachable on this phone without changing its settings or using a picker: the door scanner (camera permission),
the ID photos in apply-badge step 2, and the move-in date in the rental application (native date picker). A story with a
photo needs the system picker. The Dark mode switch, `Hot question` tile and similar remain as listed below.

Local data this pass created was removed and checked: two events and one image, two stories (with the like and save),
the walk's bio; `ui_tester` is `USER` again. Seed rows must store UTC (`now() at time zone 'utc'`): the columns are
`timestamp without time zone`, and local time read as UTC showed "-328m ago" in the story viewer.

## Fourth pass: the + sheet and the tab underline

- **The Post sheet now opens out of the + button and closes back into it** (`Sheet.tsx`, `ComposeSheet.tsx`,
  `DTabBar.tsx`). `DSheet` has a `growFrom={{ bottom }}` prop: the sheet scales 0.04 -> 1 about the + centre (shifted by
  `(sheetHeight/2 - bottom)(1 - scale)`, hidden until measured) and shrinks back into it on close (240 ms).
  `DTabBar` exports `plusCenterFromBottom(inset)` so the sheet and the bar agree where the + is. Sheets without
  `growFrom` (Ask a question) keep the old bottom-edge grow.
- **The tab underline no longer stretches across the + gap** (`DTabBar.tsx`). Its stretch used the full distance between
  the old and new tab, which is double when the + sits between Listings and Food. It now uses the smallest spacing between
  neighbouring tabs. While it crosses, it is partly behind the + button.
- Checked on the phone from screen recordings started before the tap (frame strips of open, close, and Listings -> Food,
  plus a swipe). Type-checks. Not committed.

## Test setup, not app bugs

- Under `expo start --no-dev` Metro lazy-bundles, and a dynamic `import()` (`auth.store.ts` after sign-in, onboarding's
  finish) fails with "Unable to determine the production URL where additional JavaScript chunks are hosted". Start Metro
  with `EXPO_NO_METRO_LAZY=1` to avoid it; a real build embeds everything.
- Expo Go keeps the production bundle it first downloaded for a project; only clearing its data loads new code.

## Not changed, for the owner

- Explore "Hot question" opens the Community tab, not that question (`feed/index.tsx`, `onQuestion`).
- The side menu's Dark mode row only toggles on its switch, not on the row.
- Not walked: event detail and check-in (no events in the local database), story viewer (no stories), a story with a
  photo (needs the system picker), apply-badge, property agreement, edit-profile saving, the admin screens (the test
  account is not an admin).
