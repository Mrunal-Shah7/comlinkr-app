# Design D, phase 1: the look and the motion on every screen

_2026-11-05. Triage [TR-005](../triage.md), [plan 01](../plan/01-design-d.md). Branch `feature/design-d`, not
pushed._

## Problem

The owner chose design D (design C, Night Market, in the brand gradient) and asked for all 52 screens to match it,
motion included. Phase 1 is the look and the motion with today's behaviour; phase 2 changes behaviour (the
one-question composer, onboarding in five steps, the merges).

## Change

**Shared pieces, in `frontend/apps/mobile/src`:**

- `theme/colors.ts`, `theme/useTheme.ts`, `theme/d.ts`: the D palette, gradient, radii, Manrope and Bricolage
  Grotesque, type roles.
- `shared/motion/presets.ts`: springs, timings, reveal and tile entrances, the shake.
- `shared/d/index.tsx`: `PressableScale`, `GradientButton` (with `loading`), `SoftButton`, `Chip`, `Segmented`,
  `Reveal`, `TileIn`, `useShake`, `BentoTile`, `EmptyState`.
- `shared/d/Page.tsx`: `DPage`, a pushed screen's frame. Back button, a large title that fades into a glass bar,
  a right slot, an optional `renderList` for virtualised lists, a `scrollRef`, and `largeTitle="hidden"` for
  profile heads. Also `DGroup` and `DRow`.
- `shared/d/Sheet.tsx` (`DSheet`), `shared/d/MatchRing.tsx`, `shared/d/Otp.tsx` (`OtpBoxes`: a pop per digit, a
  shake on a wrong code, a green sweep on a right one), `shared/d/LegalDoc.tsx` (contents that jump to a section).
- `shared/navigation/`: `ZoomStack` (the zoom push), `DTabBar` (floating bar, liquid indicator), `ComposeSheet`
  (the + sheet).
- `shared/ui/Dialogs.tsx`: every `appAlert`, confirm and action sheet in D. Dialogs zoom in and sheets rise, both
  on a spring.
- `shared/ui/Input.tsx`: the shared field (soft fill, accent focus ring).

**The base coat.** Every screen not rebuilt by hand gets the D colours and fonts through one layer:

- the old brand colour literals were swapped for D's everywhere except admin, where orange means "pending";
- `createThemedStyles` sets the font family from `fontWeight` in both themes, Bricolage for large bold headings;
- the new light colours map to dark mode.

`createDTypeStyles` is the fonts-only version, for the story viewer, the gallery and other dark-on-purpose screens.

**Screens**, one commit each: see `git log main..feature/design-d`. The tracker in the plan has 57 rows (the 52 screens plus small sheets), labelled by the plan's own rules:

- **40 rebuilt and seen on the phone.**
- **9 rebuilt, not walked:** the seven composers other than News (they share the News composer's look), restaurant
  review, the question answers view.
- **2 partly rebuilt** (the frame follows the design, the step bodies keep their layout on the base coat): Apply for
  a badge, the tenancy agreement.
- **6 on the base coat** (D fonts and colours on the old layout): the RSVP sheet, the RSVP ticket, the city picker
  (guests only), and three kept dark on purpose: the gallery, the story viewer, door check-in.

So the screens that do **not** yet match the design exactly are those 8 (partly rebuilt or base coat), plus the
sheets listed below inside rebuilt screens.

**Left at the base coat inside rebuilt screens:**

- the roommate-preferences sheet in My profile;
- the detail and edit sheets in My posts;
- the manage sheet in My restaurants;
- the group-info panel and emoji picker in a conversation;
- the step bodies of Apply for a badge and of the tenancy agreement;
- the detail sheet inside `app/events.tsx`.

**Copy changed on the way** (no behaviour):

- sentence case throughout;
- composer type names follow the + sheet;
- the event detail's generic "Join the community…" paragraph was dropped;
- the Help tip no longer claims an answer "within the hour";
- the composer chooser's tips cards were dropped, including the unverified "3× more engagement".

## Motion in the design that phase 1 does not have

From the prototype's per-screen notes (`docs/design/2026-11-05-redesign/src/notes.js`) and its motion markers:

- **Card to detail expand** (`data-flip` / `data-hero`): in the design a card's photo grows into the detail's hero
  (events, listings, restaurants, All events rows). Phase 1 opens details with the zoom push or the modal slide.
- **The event ticket flips in** with its QR code (the ticket is on the base coat).
- **Door check-in counter ticks up** on each scan (the scanner was not opened).
- **Review stars fill as you drag** (the review sheet keeps today's stars).
- **Landlord: a decision slides the card away** (today the decision is made in a sheet).
- **Question detail: an upvote bounces.**
- **Onboarding: chips pop when chosen** (steps do slide in).
- **Codes: "Send again in 0:30" countdown**, and a wrong code clearing the boxes (it shakes but keeps the digits).
- **Event detail: the pulsing map pin** (there is no map on the event detail today).
- **Chat: messages pop in from their own side** (they rise in from below).
- **Gallery and story viewer gestures** (swipe down to close, hold to pause) were not checked.

Built and checked: the zoom push and edge-swipe back, the liquid tab indicator, the + sheet growing from the bar,
large titles that fade into a glass bar, rows rising in, tiles popping in, the match ring sweep, the code boxes (pop,
shake, green sweep), dialogs zooming in and sheets rising, chevrons that turn, steps sliding in, progress bars that
spring, unread pills popping. Behaviour changes in the notes (swipe to archive, undo instead of confirm, save as you
go, the one-question composer, five-step onboarding) are phase 2.

## How it was checked

- `pnpm typecheck` after every screen, all passing. Lists were walked with 0 to 2 items; the row entrance only
  animates the first 14 rows so long, virtualised lists do not replay it while scrolling. Not tested at busiest-city size. There are no mobile unit tests. The backend was not changed.
- Walked on a OnePlus (Android 16) in Expo Go against the local backend, signed in as `ui_tester`. Steps and
  results are in [the run log](../device-runs/2026-11-05-design-d.md). Journeys included the way back:
  - save and unsave a listing and an event;
  - send a message and remove the conversation;
  - post a news item and delete it;
  - add a community to the profile and remove it;
  - a wrong reset code (the account password was not changed);
  - follow on a public profile, which fails on the backend (TR-006);
  - light mode and back to dark.
- Temporary rows (two notifications, one event with an image, one shared room with an image, the test post and the
  test conversation) were created with `uit` / `uit-` names and deleted; counts checked as 0 afterwards.

## Found on the way

- TR-006: there is no follow endpoint.
- TR-007: Listings keeps a stale bookmark.
- TR-008: the guest state flashes on a cold start.
- TR-009: a filter sheet gets stranded by a deep link.

None of these comes from this change.
