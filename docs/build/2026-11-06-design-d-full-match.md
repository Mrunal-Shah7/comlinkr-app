# Design D, full match: the rest of the look, the missing motion, and the behaviour changes

_2026-11-05 to 2026-11-06. Triage [TR-005](../triage.md), [plan 01](../plan/01-design-d.md). Branch `feature/design-d`,
not pushed. Follows [phase 1](2026-11-05-design-d-phase-1.md)._

## Problem

After phase 1 the owner asked for every screen to match design D exactly, motion included. Asked whether that
includes the behaviour changes planned for phase 2, the owner answered "Yes, include them now" (2026-11-05). So
this pass closes the look and motion gaps phase 1 listed and builds the design's behaviour changes
(`docs/design/2026-11-05-redesign/src/notes.js`).

## Change

One commit per screen or group: `git log 08bb16b..feature/design-d`.

**Toolkit** (`frontend/apps/mobile/src/shared/d/`): `Stepper` (the number rolls, a shake at the limit),
`Prefill`, `Tag`, `PersonAvatar`, `RollNumber`, `VoteButton` (bounce 1 → 1.32 → 1), `PopPressable`,
`ChipInput` (type, then space), `DStick`, `SignPad` (finger strokes saved as an 8-bit greyscale PNG, no extra
library), `StarPicker` (tap or drag), `PasswordRules`, `ResendCode` ("Send again in 0:30"), `OtpBoxes` now
empties after a wrong code. `Toast` is now a glass pill that drops from the top on the sheet spring and can
carry an Undo.

**Explore.** RSVP sheet with the ticket count, name and email from the profile (Change opens the fields), and the
ticket flipping in (rotateX −80° → 0). Door check-in as a D page: scanner box with corner brackets and a
sweeping line, counts that roll up, outcomes over the scanner, new rows flash green. Story viewer: photos
cross-fade with a slow zoom; D header and caption. All events now opens the shared event detail and RSVP sheet.

**Listings.** Gallery: black, "1 of n", swipe down to close (Food uses the same one). Apply and sign as one
flow with a progress bar: a short application from the profile, then the offer (terms list, "Change a term"
chips that are sent with the server's terms step, the full agreement in a sheet, sign with a finger or type,
Decline withdraws), then Signed with the deposit rules and checklist. Landlord: Approve and Decline on the
card; the card slides off. Listing detail: one bar with price, Message and Apply; the journey shows only after
you have contacted the owner; "Ask to see it first" link.

**Food.** Rate and review in a sheet with drag-across stars; a rating alone can be posted. The review composer
picks the restaurant from a search list (the old form typed the exact name and asked for four things it never
sent). My restaurants manage sheet in D.

**Community.** Upvotes bounce and the count rolls; best answer first; the Ask sheet guesses the topic from the
words (your pick wins).

**You.** Saved, Interested and Favourites in one screen with tabs. Messages: swipe a row left to remove, with
Undo. A conversation pins the home or event it is about; new messages pop in from their own side. Edit profile
saves as you go with a check per field. Apply for a badge in 3 steps. My posts: delete with Undo instead of a
confirm; detail and edit sheets in D. Roommate preferences sheet, chat menu, group info and emoji picker in D.

**Sign in.** Login errors under the field with a shake. Live password rules on sign-up and reset. Codes empty
after a wrong code; "Send again in 0:30". Reset password slides email → code → new password. Onboarding in 5
steps: the agreement is one required switch on the last step (consent is still posted to
`/onboarding/agreement` when onboarding finishes); dots instead of a bar; choices pop.

**Composers.** Listing: one question per screen, 7 screens, photos first, extras as "+" chips, a starter
description written from the facts, the draft kept on the phone. Room: steppers; currency from the country.
Restaurant: one line about badges; $$ and Dine-in chosen. News: tags as chips; your city as a location chip.
Quest: Start from templates. Story: a black composer, preview first, caption and topic optional.

**Backend.**
- `CreateReviewDto.content` is optional (stored as an empty string).
- `CreateStoryDto.title` and `.category` are optional (empty title; category `GENERAL`).
- Migration `20261105000000_story_general_category`: `ALTER TYPE "StoryCategory" ADD VALUE IF NOT EXISTS
  'GENERAL'`. Prisma runs a migration in a transaction; adding an enum value in a transaction needs
  PostgreSQL 12 or later. Local is 18.1. **The production version is not recorded in the docs; check it before
  deploying.**

**Removed because it was not real:** the promote-listing sheet on My profile (hidden since phase 1, it only
showed a toast); the made-up zero counts (views, likes, reservations) in My restaurants; "Both parties have
signed" and a random document id on the signed page; the review form's cuisine, price, visit and dishes fields
that were never sent.

## Not built, or not as the design

- **Card to detail expand** is built for Explore's event tiles only (`src/shared/d/Hero.tsx`): the photo flies
  from the tile to the hero on the prototype's EASE_SHEET, then the page fades in under it (seen frame by frame
  on the phone). Listing, restaurant and bento cards still open with the slide.
- **Guest city picker** rebuilt as the "Your city" sheet; not walked (guests only).
- **Event detail map pin:** not applicable; the event detail has no map.
- **Archive** a conversation: the server has none, so the swipe removes (hides) it, with Undo.
- **The apply step is part of the agreement page**, not a sheet over the listing.
- **Reset password now asks for 8 characters, a capital and a number** (the sign-up rule); the server still
  accepts 6.
- **A new listing needs at least one photo** to move past screen 1.

## How it was checked

- `pnpm typecheck` (mobile) and `npx tsc --noEmit` (backend) after every change, passing. Backend unit tests
  80 / 80. Backend e2e: the two new specs pass (`test/design-d/`); the whole suite has 1 failure,
  `test/sprint54/stories-listing-reason.e2e-spec.ts` (listing moderation), which also fails with `main`'s
  versions of the files this branch changed, so it predates this work. `npx eslint` on the changed backend files:
  clean (29 errors elsewhere in the backend, not from this branch).
- Migration applied to the local `comlinkr` and `comlinkr_test` databases with `prisma migrate deploy`; the
  enum lists `GENERAL`; `migrate status` up to date on both.
- On the phone (Expo Go, local backend, `ui_tester`), with the way back each time. Steps and the test data are in
  the [run log](../device-runs/2026-11-05-design-d.md), third section. Walked: Saved tabs; rate a restaurant by
  dragging (rating only), then delete; listing composer screen 1; story composer; a conversation (message
  pops in from the right, frame capture), swipe to remove, Undo, remove; login empty-field error; sign-up
  rules; reset password with a wrong code; RSVP for 2, ticket flip (frame capture), cancel RSVP; check-in
  permission screen; edit profile bio saved, then restored; apply → offer → drawn signature → signed (the stored
  PNG was embedded into a PDF with pdfkit offline).
- Bugs found on the phone and fixed: doubled top inset in the composers; photo grid gap; the story topic row
  filled the screen; the first message in an empty chat did not pop; the code error vanished when the boxes
  emptied; edit profile did not save when the keyboard was closed (Android does not blur); the sign pad lost its
  strokes to the page scroll; the offer page kept the previous scroll; "N/A" deposit shown; re-applying after
  leaving the flow failed with "already applied" (it now resumes the draft).
- Also checked on the phone: quest, room, news and restaurant composers (screens, not posted); an upvote and
  its removal; light mode on the quest composer, the apply page and Saved; the event card expand (frame
  captures). An event detail once stayed stuck on screen after hot reloads and could not be reproduced after a
  restart (run log).
- **Not walked:** onboarding (the test account is onboarded), badges, the review composer's list, listing composer screens 2 to 7 (would need the phone's photo picker), landlord decisions, My
  posts Undo, gallery, story viewer, door check-in scanning, the Ask topic guess, upvotes, All events. Light mode was checked on three new screens only. Not compared side by side with the prototype screen by screen.
