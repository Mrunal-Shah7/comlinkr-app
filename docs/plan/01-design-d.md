# 01. Build design D (Night Market in the brand gradient)

**Status: Building (phase 1).** Triage [TR-005](../triage.md). Review:
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

## Screen tracker (phase 1)

The 55 screens of `d-night-market-gradient.html` (52 plus three small sheets: city, more, listing menu). Status is one
of: **not started**; **base coat** (fonts and colours only, through the shared style layer, old layout); **rebuilt**
(the screen's own layout follows the design, not yet seen on the phone); **phone-checked** (rebuilt and walked on
the phone against the local backend). Only "phone-checked" counts as done.

| Design screen | File | Status |
| --- | --- | --- |
| explore | `app/(tabs)/feed/index.tsx`, `ExploreBento.tsx` | phone-checked |
| listings | `app/(tabs)/housing/index.tsx`, `DListingCards.tsx`, `RoommateCard.tsx` | phone-checked |
| food | `app/(tabs)/food/index.tsx` | phone-checked |
| community | `app/(tabs)/community/index.tsx` | phone-checked |
| compose (+ sheet) | `src/shared/navigation/ComposeSheet.tsx` | phone-checked |
| menu (You sheet) | `components/HamburgerMenu.tsx` | phone-checked |
| listing-detail | `PropertyDetailModal.tsx` | phone-checked |
| restaurant-detail | restaurant modal in `app/(tabs)/food/index.tsx` | phone-checked |
| roommate-detail | `RoommateDetailModal.tsx`, `MatchRing.tsx` | phone-checked |
| notifications | `app/notifications.tsx` | phone-checked |
| room-detail | `AvailableRoomDetailModal.tsx` | not started |
| gallery | `ImageViewer` | not started |
| apply (sheet) | apply flow in `PropertyDetailModal.tsx` | not started |
| agreement | `app/property-agreement.tsx` | not started |
| landlord | `app/landlord-dashboard.tsx` | not started |
| my-listings | `app/my-listings.tsx` | rebuilt; empty state phone-checked, rows to check after a listing is made |
| filters | filter sheet in `app/(tabs)/housing/index.tsx` | not started |
| safety | `SafeRentingGuide` | not started |
| listmenu | listing ··· menu | not started |
| my-restaurants | `app/my-restaurants.tsx` (manage sheet still base coat) | rebuilt; empty state phone-checked, cards to check after a restaurant is made |
| review (sheet) | rate and review in the restaurant modal | not started |
| ask (sheet) | ask sheet in `app/(tabs)/community/index.tsx` | not started |
| question-detail | answers in `app/(tabs)/community/index.tsx` | not started |
| post-detail | post comments modal | not started |
| event-detail | `EventDetailModal` | not started |
| event-register | `EventRegistrationModal` | not started |
| event-ticket | ticket in `EventRegistrationModal` | not started |
| events-all | `app/events.tsx` | not started |
| check-in | `app/events/[id]/check-in.tsx` | not started |
| story-viewer | `app/story-viewer.tsx` | not started |
| profile | `app/profile.tsx` (roommate-preferences sheet still base coat) | phone-checked |
| public-profile | `app/public-profile.tsx` | phone-checked (Follow fails on the backend: TR-006) |
| edit-profile | `app/edit-profile.tsx` | phone-checked (save and undo walked) |
| saved | `app/saved.tsx` (`interested.tsx` is not linked from anywhere: base coat; merging it is phase 2) | phone-checked |
| settings | `app/settings.tsx` | phone-checked |
| help | `app/help-support.tsx` | phone-checked |
| legal | `app/terms-of-service.tsx`, `app/privacy-policy.tsx` (shared `LegalDoc.tsx`) | phone-checked (privacy walked; terms uses the same component) |
| badges | `app/apply-badge.tsx` | not started |
| verification | `app/verification-status.tsx` | not started |
| messages | `app/chat.tsx` (list) | phone-checked |
| chat | `app/chat.tsx` (conversation; group info panel and emoji picker still base coat) | phone-checked (send, remove conversation) |
| my-posts | `app/myposts.tsx` (detail and edit sheets still base coat) | rebuilt; empty state phone-checked, rows to check after a post is made |
| city | city picker | not started |
| more | ··· sheets and dialogs: `src/shared/ui/Dialogs.tsx` (every appAlert, confirm and action sheet) | phone-checked |
| login | `app/(auth)/login.tsx` | not started |
| signup | `app/(auth)/signup.tsx` | not started |
| otp | OTP step in sign-up | not started |
| forgot | `app/(auth)/forgot-password.tsx` | not started |
| onboarding | onboarding screens | not started (look only in phase 1) |
| compose-listing | `app/create-post.tsx` | not started |
| compose-room | `app/create-post.tsx` | not started |
| compose-news | `app/create-post.tsx` | not started |
| compose-event | `app/create-post.tsx` | not started |
| compose-story | `app/create-post.tsx` | not started |
| compose-restaurant | `app/create-post.tsx` | not started |
| compose-review | `app/create-post.tsx` | not started |
| compose-quest | `app/create-post.tsx` | not started |
