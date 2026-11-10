# 2026-11-10: First triage sweep (TR-003, 007, 009, 030, 033, 035)

Branch `fix/triage-sweep`, from `chore/docs-cleanup`. Not merged.

## Problems and changes

- **TR-003, Explore after sign-out:** with no city, the hero kept the last city's ticker, events and counts.
  `app/(tabs)/feed/index.tsx` clears them when there is no city.
- **TR-007, Saved:** unsaving from Saved left the bookmark filled on the tab's card. `app/saved.tsx` invalidates
  the matching tab's queries after an unsave.
- **TR-009, Listings:** a filter sheet left open stayed on screen after a deep link opened another tab. The
  Listings focus cleanup closes both sheets.
- **TR-030, role changes:** a new role reached the app only at the next sign-in. The sidebar's `/auth/me` refresh
  now applies a changed role (`apiRoleToAppRole`, `src/store/auth.store.ts`, `sidebar.store.ts`).
- **TR-033, restaurant time zones:** a restaurant took the creating phone's time zone, so a Los Angeles restaurant
  made from India showed closed during its hours. The backend sets the zone from the restaurant's city on create
  and update (`src/common/utils/city-timezone.ts`, 53 cities), and migration
  `20261110120000_restaurant_city_timezone` corrects existing rows whose city name matches exactly (12 local rows).
  Production was not read; cities spelt differently there keep their zone.
- **TR-035, 403s after sign-up (part):** the sidebar no longer fetches before onboarding is done, and onboarding
  fetches it when it finishes. Three other requests still answer 403 before onboarding ends (roommate matches,
  shared spaces, the unread count); they are left for the next branch.

## How it was checked

Mobile `pnpm typecheck`; backend `tsc`, unit tests (the time zone tests are in `test/unit/location-and-timezone.spec.ts`
on `feature/gps-city`), migration applied locally and the rows read back. On the phone: TR-009 (a deep link to
Community closes the open Listings sheet); TR-003 (after sign-out Explore shows "Choose your city" with no hero);
TR-030 (an account made admin opens the admin screens after the app restarts). TR-007 was not walked.
