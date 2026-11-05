# 01. Account, sign-in, onboarding, badges, settings

_2026-11-04. Made from the earlier section doc (written from code, 2026-10-29) and a read of
`backend/src/modules/auth/`. Not walked on the phone yet. Marks: see [README.md](README.md)._

## Planned changes

| ID | Kind | What will change | Triage | Plan |
|---|---|---|---|---|
| — | | None yet | | |

## What it is for

Getting a person from first open to a signed-in, onboarded account in their city, and letting them manage their
profile, privacy, notifications and account. Badges let landlords, restaurant owners, agencies and local reviewers
be verified.

## Who uses it, and where

- Guests: browse a city picked with `GuestCityPickerModal`; `useRequireAuth()` asks them to sign in for gated
  actions (save, post, connect, chat) [code].
- Signed-in users: `profile.tsx`, `public-profile.tsx`, `edit-profile.tsx`, `settings.tsx`, `help-support.tsx`,
  saved content (`saved`, `favorites`, `interested`, `myposts`) [code].
- Badge applicants: `apply-badge.tsx`, `verification-status.tsx`; admins decide in Admin → Verifications (review
  07) [code].

## How it works

### Sign-up and sign-in (`app/(auth)/`, backend `auth`)

- **Email sign-up:** `POST /auth/register/initiate` (email, username, password, name) sends a 6-digit OTP, then
  `POST /auth/register/verify` creates the account and the session [code].
- OTPs are stored HMAC'd, so they cannot be read back from the database [code]. With no Resend key and
  `NODE_ENV=development` the backend logs the OTP instead of sending it (`mail.service.ts`) [code].
- **Login:** `POST /auth/login` with email or username and password [code].
- **Google / Apple:** `POST /auth/google|apple`; a new user gets a temporary token and finishes with
  `/complete` and a username. Native SDKs, so not in Expo Go [code].
- Forgot and reset password by OTP; `GET /auth/me`, `POST /auth/logout`, list and unlink providers [code].
- The session cookie `comlinkr.sid` is kept in SecureStore on the phone and sent as a `Cookie` header (review 08)
  [code].

### Onboarding (`app/(auth)/onboarding.tsx`, backend `onboarding`)

Steps: location (country, state, city) → vibes → interests → communities → agreement → complete. Until it is
complete, `OnboardingGuard` refuses most authenticated APIs [code].

### Profile

`edit-profile.tsx` edits avatar, bio, phone (validated on the backend since `ddfdd9a`), location, vibes, interests,
communities and roommate preferences [code].

### Badges (`badges` module)

Types `LANDLORD`, `RESTAURANT_OWNER`, `AGENCY`, `LOCAL_REVIEWER`. An application has a business profile and
documents (`BadgeApplication`, `BadgeDocument`); an admin approves it into a `UserBadge`, and the user gets a
`BADGE_UPDATE` notification [code]. Open-posting model: anyone may post; a badge marks content as verified
(`frontend/apps/mobile/docs/posting-authorization.md`) [code].

### Settings (`settings` module)

Theme (light / dark, `theme.store`), notification preferences, privacy settings, blocked users, data export and
account deletion with a 30-day window handled by `settings.cron` at 03:00, support tickets, legal pages [code].

## Rules it enforces

- Every route needs a session unless marked `@Public()` or `@OptionalAuth()` [code].
- Onboarding must be complete for most routes (`@SkipOnboarding()` exempts) [code].
- `LANDLORD` is required to decide property applications (review 03) [code].
- Account deletion waits 30 days before it happens [code].

## Problems found

None recorded yet for this module.

## Questions

1. What happens to a user's listings, restaurants, chats and applications when their account is deleted after
   the 30-day window? [question]
2. Can a user with a pending deletion still sign in and cancel it? [question]

## How to test it

Checklist: none yet; the smoke checklist ([checklists/00-smoke.md](checklists/00-smoke.md)) covers sign-in and
sign-out. Test data: `ui_tester` (see the system map). Sign-up needs the backend to log OTPs.

## Not yet checked

Sign-up end to end with a logged OTP; Google and Apple sign-in (development build); password reset; every
onboarding step with awkward input (accented names, long bios); badge application with documents; data export;
account deletion and its cron.

## Update 2026-11-04: smoke run on the phone

[Run log](../device-runs/2026-11-04-00-smoke.md) (Expo Go, local backend, OnePlus Android 16).

- Email and password sign-in works: `POST /auth/login 201`, the chat socket authenticates, Explore opens on the
  user's city [observed].
- Log Out asks "Are you sure you want to log out?"; confirming sends `POST /auth/logout`, disconnects the socket and
  shows the guest view with "Choose your city" [observed].
- Theme: the menu's Dark Mode / Light Mode switch changes the whole app at once [observed]. In the signed-in menu the
  switch sits under the pinned Log Out footer until the menu is scrolled [observed].

## Update 2026-11-06: design D (plan 01, branch `feature/design-d`, not merged)

From [the full-match build note](../build/2026-11-06-design-d-full-match.md); **[code]** unless marked
**[phone]**.

- Login shows errors under the field with a shake, not in a box. **[phone]**
- Sign-up and reset password show the password rules live (8 characters, a capital, a number). Reset password now enforces them; the server still accepts 6. **[phone]**
- Code boxes empty after a wrong code; "Send again in 0:30" counts down before a resend. **[phone]**
- Reset password is one sliding screen: email, code, new password. The code is checked only when the password is saved; a wrong code returns to the boxes. **[phone]**
- Onboarding has 5 steps: the agreement step is gone; a required switch on the last step agrees to the Terms and the Privacy Policy. Consent is still posted to `/onboarding/agreement` when onboarding finishes. Not walked.
- Edit profile saves each field as you go (on leaving the field, or a second after typing stops); no Save button. **[phone]**
- My profile: roommate preferences edit in a sheet; the hidden promote-listing sheet (toast only) is removed.
- Apply for a badge: 3 steps (choose; details and documents; send) instead of 5. Same fields and submit. Not walked.
