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

**Screens rebuilt**, one commit each: see `git log main..feature/design-d`. The tracker in the plan has 57 rows
(the 52 screens plus small sheets). By status:

- 44 were seen on the phone, at least in part;
- 12 are rebuilt but not walked: the seven composers other than News, the event ticket, review, question detail,
  the story viewer, and the sign-up step of the RSVP sheet;
- 1 is at the base coat only: the city picker, which only guests see.

The ones not walked share their components with screens that were.

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

## How it was checked

- `pnpm typecheck` after every screen, all passing. There are no mobile unit tests. The backend was not changed.
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
