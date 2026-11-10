# 2026-11-10: The brand is spelled "ComLinkr" (TR-046)

Branch `chore/brand-comlinkr`, from `fix/chat-request-accept`. Merged as pull request 36 (merge `5f75ac5`), reaching `main` with PR 24.

## Problem

The app said "ComLinkr" in 108 places and "Comlinkr" in eight (part of TR-040). The owner decided on "ComLinkr".

## Change

These now say "ComLinkr":
- sign-up ("Already on ComLinkr?");
- the location messages (Food, onboarding and edit profile, and the iOS permission text in `app.config.js`);
- the door check-in camera text;
- the landlord safety tips in My listings;
- the About row in Settings;
- the User-Agent sent to OpenStreetMap, and its unit test.

Left as they are:
- the all-caps "COMLINKR" in the terms and on the news card logo, which reads the same either way;
- code names (`ComlinkrNewsImage`, comments);
- the domain `comlinkr.com`.

## How it was checked

- **Checks:** mobile `pnpm typecheck`; backend unit tests.
- **Searched** the app and the backend: no user-facing "Comlinkr" is left. Email templates already said "ComLinkr".
- **Not walked on the phone:** text only.
