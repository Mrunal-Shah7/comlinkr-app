# 01. Build design D (Night Market in the brand gradient)

**Status: phase 1 and most of phase 2 built (2026-11-06) on the branch, not pushed.** Owner, 2026-11-05: include the phase 2 behaviour changes now. [Phase 1 build note](../build/2026-11-05-design-d-phase-1.md), [full-match build note](../build/2026-11-06-design-d-full-match.md). Card-to-detail expand built for Explore event tiles only; guest city picker rebuilt, not walked.
[2026-11-05 design review](../review/2026-11-05-design-audit.md). Design:
[`d-night-market-gradient.html`](../design/2026-11-05-redesign/d-night-market-gradient.html), built from
`docs/design/2026-11-05-redesign/src/` (`c1.js`, `a2.js`, `a3.js`, `a4.js`, `c3.js`, `a.css` + `c.css` + `d.css`).

## Problem

The app's screens are inconsistent (an accent colour per section, three levels of tabs, very tall cards, "N/A" for
missing data, red report flags everywhere) and have almost no motion feedback. Posting takes too many fields.
The owner chose design D from four proposals.

## What will change

### Phase 1: look and motion, with today's behaviour

Every screen of the four sections and the shared screens takes D's look and motion. Fields, steps and flows stay
as they are today, except where only the presentation changes (a hidden "N/A" is presentation).

1. **Tokens and type** (`src/theme/`): D's palette for light and dark (near-black blue-grey `#091218` dark,
   `#F2F6F8` light, accent `#1A6BAE`, green `#30855B`, gradient `#1A6BAE → #257A86 → #30855B`), radii (24 cards,
   18 buttons, 14 chips), Bricolage Grotesque for headings and Manrope for text (`@expo-google-fonts/*`).
2. **Motion kit** (`src/shared/motion/`): the springs and timings in the prototype as named presets
   (`press`, `sheet`, `push`, `reveal`, `pop`, `shake`), `useReducedMotion` everywhere, and shared pieces:
   `PressableScale`, `Reveal` (staggered FadeInDown), `GradientButton`, `Segmented` with a sliding gradient
   indicator, `Chip`, `BentoTile`, `GlassSurface`, `Toast`, `Sheet`.
3. **Navigation**: the tab bar becomes a floating glass bar with a central **+** (opens the compose sheet, the +
   turns into ×) and a mint "liquid" indicator that stretches between tabs while the pager is dragged (today's
   `SwipeTabs` keeps the finger-following pager). Pushed screens zoom in (scale 0.88 → 1, corner radius 44 → 0,
   spring) instead of sliding. Detail screens open with a shared photo where the current code allows it.
4. **Screens**, section by section, each checked on the phone before the next:
   - Sign in: login, sign-up, code (OTP: pop per digit, shake on wrong code, green sweep on success), forgot
     password, onboarding (look only in phase 1).
   - Explore: the bento home (greeting with city and time, next event, new-homes count, hot question, stories,
     quest, poll), then News, Events, Stories, Quests, Polls; neighbour post, event detail, RSVP sheet and ticket,
     door check-in, story viewer, all events.
   - Listings: homes (feature card + tile grid), rooms, roommates; listing detail, gallery, room detail, roommate
     profile (animated match ring), apply and agreement, my listings, landlord applications.
   - Food: bento top, tiles, restaurant detail, rating sheet (drag across stars), my restaurants.
   - Community: ask box, question bubbles, question thread, ask sheet.
   - You: side menu, profile, public profile, edit profile, messages, conversation, notifications, saved,
     settings, help, badges, badge status, terms and privacy, my posts.
   - Post: the compose sheet and every composer form restyled.
   Missing values are hidden instead of "N/A", "—", "$0–$0" (TR-001, B6), and report moves into the ··· menu.

### Phase 2: behaviour changes (after phase 1 is on the phone)

One question per screen for listing a place, photos first, profile prefill and optional facts as chips;
restaurant review by search list; event date and time pickers; room currency from the country; tags as chips;
onboarding to 5 steps with the terms as one tick-box on the last step (still calling `acceptAgreement`);
Saved, Interested and Favourites merged; story photo-first (needs `CreateStoryDto.title` and `category` optional,
a backend change with its own migration-free DTO change and e2e test).

## What will not change

- The admin console (`app/admin/*`); it keeps working with the new tokens.
- Tab names: Explore, Listings, Food, Community (owner, 2026-11-05).
- The API, except the story DTO in phase 2.
- Things with no data behind them today are left out: the temperature in the greeting tile, the "similar homes"
  rent hint, walk score and transit from the address, location from the phone (owner, 2026-11-05).

## Questions and answers (2026-11-05)

| Question | Answer |
|---|---|
| Deliver in one go or in phases? | Phases: look and motion first, behaviour second |
| Tab names | Keep today's |
| Data the prototype shows that does not exist | Leave it out |
| Git | One base commit on `main` of the current state, then `feature/design-d`; commit per phase, no push or PR until asked |

## How it will be checked

- `pnpm typecheck` in `frontend/apps/mobile` after each step (it fails today on `audioPlayback.ts`, T-006; only new
  errors count).
- On the phone (Expo Go, local backend, `ui_tester`), per section: every screen side by side with the prototype
  in light and dark, the motions (tab drag and liquid indicator, + sheet, push zoom, sheets, OTP, press, reveal),
  reduce motion on, the way back, and the smoke checklist (`docs/system-review/checklists/00-smoke.md`).
- A build note per phase in `docs/build/`, and a device-run log.

## Decided while building

- **Search button left out** of the tab header: the prototype shows one, but there is no city-wide search
  behind it (same rule as the missing data above).
- **"Recent activity" ticker removed** with the old Explore hero; the bento replaces both.
- **Glass is a translucent fill, not a blur** (`tc.glass`): Android blur is costly and not in Expo Go's
  reach for every surface. Looks close to the prototype on the dark theme.
- **`Colors.brand.orange` now maps to the gradient's teal** (`#257A86`), because design D has no orange. The
  only use that meant a warning is the chat's "pending request" state (`app/chat.tsx:346, 537, 1077`); it moves
  to `tc.warningText` / `tc.warningBg` when chat is restyled.
- **News categories and neighbours' posts are one chip row** ("For you", Local, National, World, …,
  Neighbours), replacing the Live News / Community toggle plus a second row of categories. Same data, same
  filters.
- **The homes tile says "Homes in <city>"** with the city's listing total, not "new this week": the API has no
  weekly count.
- **Screen transitions use the JS stack inside expo-router** (`ZoomStack`), not the native stack, so the zoom
  can match the prototype. Edge swipe back now works on Android through the stack itself; `EdgeSwipeBack` is no
  longer used by the root layout.
- **Fonts on Android:** each weight is its own family (`Manrope_700Bold`, …); screens use `body()` /
  `display()` from `src/theme/d.ts` instead of `fontWeight`. Screens not yet restyled keep the system font
  until their turn.

- **Phase 2 folded in** (owner, 2026-11-05, "Yes, include them now").
- **Two API changes, not one:** `CreateReviewDto.content` became optional as well as the story fields, and the
  story change needed a migration (`GENERAL` in `StoryCategory`), not the migration-free change planned.
- **Reset password asks for the sign-up rule** (8 characters, a capital, a number); the server accepts 6.
- **A new listing needs a photo** to get past the first screen (photos first, as the design asks).
- **Swipe on a conversation removes it** with Undo: the server has no archive.
- **Removed as not real:** the hidden promote-listing sheet, the zero counts in My restaurants, "both parties
  have signed" and a made-up document id, the review fields that were never sent.
- **Event detail map pin: not applicable** (no map on the event detail).
- **Quest template rewards** are things a host gives ("Bragging rights"), not the prototype's "Featured on
  Explore" or badges, which the app does not award.
- **The apply step is the first part of the agreement page**, not a sheet over the listing.

## Screen tracker (phase 1)

The screens of `d-night-market-gradient.html` (52 plus small sheets: city, more, listing menu, the RSVP ticket and others; 57 rows). Status is one
of: **not started**; **base coat** (fonts and colours only, through the shared style layer, old layout; also the screens kept dark on purpose); **partly rebuilt** (the frame follows the design, the body keeps its layout); **rebuilt**
(the screen's own layout follows the design, not yet seen on the phone); **phone-checked** (rebuilt and walked on
the phone against the local backend). Only "phone-checked" counts as done.

| Design screen | File | Status |
| --- | --- | --- |
| explore | `app/(tabs)/feed/index.tsx`, `ExploreBento.tsx` | phone-checked |
| listings | `app/(tabs)/housing/index.tsx`, `DListingCards.tsx`, `RoommateCard.tsx` | phone-checked |
| food | `app/(tabs)/food/index.tsx` | phone-checked |
| community | `app/(tabs)/community/index.tsx` | phone-checked |
| compose (+ sheet) | `src/shared/navigation/ComposeSheet.tsx`; the chooser in `app/create-post.tsx` matches it | phone-checked |
| menu (You sheet) | `components/HamburgerMenu.tsx` | phone-checked |
| listing-detail | `PropertyDetailModal.tsx` | bar and journey changed 2026-11-06; phone-checked |
| restaurant-detail | restaurant modal in `app/(tabs)/food/index.tsx` | phone-checked |
| roommate-detail | `RoommateDetailModal.tsx`, `MatchRing.tsx` | phone-checked |
| notifications | `app/notifications.tsx` | phone-checked |
| room-detail | `AvailableRoomDetailModal.tsx` | phone-checked (with a temporary uit_ room, removed after) |
| gallery | `ImageViewer` (createDTypeStyles) | rebuilt 2026-11-06 (1 of n, swipe down to close); not walked |
| apply (sheet) | apply flow in `PropertyDetailModal.tsx` (Apply leads to the agreement's step 1) | part 1 of the agreement page 2026-11-06; phone-checked |
| agreement | `app/property-agreement.tsx` | rebuilt 2026-11-06 (offer, terms chips, sign pad, Signed); phone-checked to signed; Decline not walked |
| landlord | `app/landlord-dashboard.tsx` | one-tap decisions and slide-away 2026-11-06; not walked (no applications to decide) |
| my-listings | `app/my-listings.tsx` | rebuilt; empty state phone-checked, rows to check after a listing is made |
| filters | filter sheet in `app/(tabs)/housing/index.tsx` | phone-checked (chips, clear) |
| safety | `SafeRentingGuide` | phone-checked (collapsed and open) |
| listmenu | listing ··· menu | phone-checked through the dialogs (every ··· menu is an appAlert action sheet) |
| my-restaurants | `app/my-restaurants.tsx` (manage sheet still base coat) | manage sheet rebuilt 2026-11-06; not walked |
| review (sheet) | rate and review in the restaurant modal | drag stars, rating only 2026-11-06; phone-checked (post, delete) |
| ask (sheet) | ask sheet in `app/(tabs)/community/index.tsx` | topic guess 2026-11-06; not walked |
| question-detail | answers in `app/(tabs)/community/index.tsx` | upvote bounce, best answer first 2026-11-06; not walked |
| post-detail | post comments modal (comments modal in `app/(tabs)/feed/index.tsx`) | phone-checked (opened a seeded post; no comment posted) |
| event-detail | `EventDetailModal` | phone-checked (with a temporary uit_ event, removed after) |
| event-register | `EventRegistrationModal` | rebuilt 2026-11-06 (D sheet, profile prefill, stepper); phone-checked: RSVP for 2, cancel |
| event-ticket | ticket in `EventRegistrationModal` | rebuilt 2026-11-06 (flip in the RSVP sheet); phone-checked, flip seen in a frame capture |
| events-all | `app/events.tsx` (its own detail sheet keeps the base coat) | shared event detail and RSVP 2026-11-06; not walked |
| check-in | `app/events/[id]/check-in.tsx` (stays dark on purpose: D fonts, the D dark background, a mint filter chip) | rebuilt 2026-11-06 (D page, scanner box, rolling counts); permission screen phone-checked, scanning not walked |
| story-viewer | `app/story-viewer.tsx` (createDTypeStyles) | rebuilt 2026-11-06 (cross-fade with slow zoom, D header); not walked (no stories) |
| profile | `app/profile.tsx` (roommate-preferences sheet still base coat) | roommate sheet rebuilt 2026-11-06; not walked |
| public-profile | `app/public-profile.tsx` | phone-checked (Follow fails on the backend: TR-006) |
| edit-profile | `app/edit-profile.tsx` | save as you go 2026-11-06; phone-checked (bio saved, restored) |
| saved | `app/saved.tsx` (`interested.tsx` is not linked from anywhere: base coat; merging it is phase 2) | Saved, Interested, Favourites tabs 2026-11-06; phone-checked (empty states) |
| settings | `app/settings.tsx` | phone-checked |
| help | `app/help-support.tsx` | phone-checked |
| legal | `app/terms-of-service.tsx`, `app/privacy-policy.tsx` (shared `LegalDoc.tsx`) | phone-checked (privacy walked; terms uses the same component) |
| badges | `app/apply-badge.tsx` (frame, progress, fields, upload rows; step bodies keep their layout on the base coat) | 3 steps 2026-11-06; not walked |
| verification | `app/verification-status.tsx` | rebuilt; not-applied state phone-checked, review timeline checked with the badge journey |
| messages | `app/chat.tsx` (list) | swipe to remove with Undo 2026-11-06; phone-checked |
| chat | `app/chat.tsx` (conversation; group info panel and emoji picker still base coat) | pinned subject, messages pop from their side, D sheets 2026-11-06; phone-checked |
| my-posts | `app/myposts.tsx` (detail and edit sheets still base coat) | Undo instead of confirm, D sheets 2026-11-06; not walked |
| city | city picker | rebuilt 2026-11-06 (Your city sheet); not walked (guests only) |
| more | ··· sheets and dialogs: `src/shared/ui/Dialogs.tsx` (every appAlert, confirm and action sheet) | phone-checked |
| login | `app/(auth)/login.tsx` | errors under the field 2026-11-06; phone-checked |
| signup | `app/(auth)/signup.tsx` | live password rules, resend countdown 2026-11-06; rules phone-checked |
| otp | OTP step in sign-up (`OtpBoxes`) | empties after a wrong code, countdown 2026-11-06; phone-checked in reset |
| forgot | `app/(auth)/forgot-password.tsx`, `src/shared/d/Otp.tsx` | email, code, password slide 2026-11-06; phone-checked with a wrong code |
| onboarding | `app/(auth)/onboarding.tsx` (look only; 5 steps is phase 2) | 5 steps, dots, choices pop 2026-11-06; not walked (test account onboarded) |
| compose-listing | `app/create-post.tsx` (same shared look; one-question layout is phase 2) | one question per screen 2026-11-06; screen 1 phone-checked, 2 to 7 not |
| compose-room | `app/create-post.tsx` (same shared look; one-question layout is phase 2) | steppers, currency from country 2026-11-06; not walked |
| compose-news | `app/create-post.tsx` (shared look: glass bar, overline labels, soft inputs, mint chips) | tag chips, city chip 2026-11-06; not walked |
| compose-event | `app/create-post.tsx` (same shared look; one-question layout is phase 2) | rebuilt (look), not walked |
| compose-story | `app/create-post.tsx` (same shared look; one-question layout is phase 2) | black composer, optional title and topic 2026-11-06; phone-checked without media |
| compose-restaurant | `app/create-post.tsx` (same shared look; one-question layout is phase 2) | defaults, one-line badge note 2026-11-06; not walked |
| compose-review | `app/create-post.tsx` (same shared look; one-question layout is phase 2) | search list 2026-11-06; not walked |
| compose-quest | `app/create-post.tsx` (same shared look; one-question layout is phase 2) | templates 2026-11-06; not walked |
