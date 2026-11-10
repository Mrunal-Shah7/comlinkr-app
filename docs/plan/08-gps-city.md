# 08. The city comes from the phone's location

**Status: Building (2026-11-10) on `feature/gps-city`.** Owner, 2026-11-10: "Instead of giving the user a manual
option to add or change their location, the app directly fetches the user's location using GPS. So the user is
unable to enter the location where [he] isn't actually located." Triage [TR-042](../triage.md).

## Problem

Every city in the app (what each tab shows, where a post goes) is the city a signed-in user typed: in onboarding
(country, state and city pickers), in Settings and Edit profile, and as a side effect of the roommate profile. Nothing
checks that the user is there. Guests pick a city to browse.

## Questions for the owner, and answers (2026-11-10)

| Question | Answer |
|---|---|
| GPS or typed? | GPS decides the city; no typing a city. |
| A wrong or missing GPS city? | An admin can override a user's city from the admin panel. |
| Location permission refused, or no fix? | Block until allowed: explain why and ask again; the city cannot be set without it. Guests can still pick a city to browse. |

## What will change

- **Phone:** `expo-location`. `src/features/location/detectLocation.ts` asks for the "while using" permission, reads
  one position, and turns it into city, region and country with the phone's own reverse geocoder (no request from us
  to a third party).
- **Onboarding, step 1:** the country, state and city pickers become "Use my location". It shows the detected city
  and lets the user retry; Next stays disabled until a location is found. Refused permission shows why it is needed,
  "Try again" and "Open settings". The US and UK rule stays: a detected city elsewhere shows the existing message.
- **Settings and Edit profile:** the city is shown, not typed, with "Update from my location".
- **Admin panel, Users:** "Change city" on a user sets their city, region and country by hand, recorded as set by an
  admin (and in the audit log).
- **API:** `UserLocation` gets `source` (`GPS`, `ADMIN`, `MANUAL`) and `updatedAt`. Onboarding and `PATCH
  /settings/city` take `latitude` and `longitude`, stored with the city, and the source is `GPS` when they are sent.
  New `PATCH /admin/users/:id/location` (admin only) writes `ADMIN`. The roommate profile no longer overwrites the
  user's city (it fills it only when there is none).
- **Development only:** `EXPO_PUBLIC_DEV_LOCATION=lat,lng` stands in for the GPS in a development build (`__DEV__`),
  so the app can be tested from outside the US and UK. It is ignored in release builds.

## What will not change

- Guests still choose a city to browse; they cannot post.
- Users who already have a city keep it (source `MANUAL`) until they update from their location or an admin changes
  it.
- Older app versions still send a typed city without coordinates; the API accepts it as `MANUAL`, so their
  onboarding does not break before they update.

## Limits

- A phone can fake its position (mock location apps). The server cannot verify a position; this stops typing a city,
  not a determined spoof.

## How it was checked

See the [build note](../build/2026-11-10-gps-city.md). Planned:

Unit tests: onboarding and settings write `GPS` with coordinates and `MANUAL` without; the admin endpoint writes
`ADMIN` and is refused to a non-admin; the roommate profile does not overwrite a city. On the phone: a new account's
onboarding with the development location (Los Angeles), refusing permission and allowing it again, "Update from my
location" in Settings, and an admin changing a test user's city, then putting it back.
