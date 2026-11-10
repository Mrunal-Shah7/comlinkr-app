# 13. Nearby in Food

**Status: Built (2026-11-10) on `feature/nearby`; [build note](../build/2026-11-10-nearby.md).** Triage [TR-032](../triage.md), from the
walkthrough (F-11). The owner decided in chat: geocode restaurant addresses, and ask for the phone's location only
when Nearby is tapped.

## Problem

Food's "Nearby" can never work. No restaurant has coordinates (the composer collects only an address), and most users
have none either, so every distance is unknown. The walkthrough hid the chip until a distance exists, which in
practice is never.

## What will change

- **Restaurants get coordinates on the server.** A cron (every minute, ten at a time) sends each restaurant's public
  address (street, city, state, country) to OpenStreetMap's Nominatim and stores the latitude and longitude.
  - Nominatim's policy: at most one request a second (requests are queued 1.1 s apart), a User-Agent naming the app
    (`Comlinkr/1.0 (+https://comlinkr.com)`), results cached. Nothing about any user is sent.
  - An address Nominatim cannot find is marked tried (`Restaurant.geocodeTriedAt`, new column) and not sent again
    until it changes. A failed request (network, rate limit) stops the run and is retried the next minute.
  - Editing the address, city, state or country without coordinates clears the coordinates and the mark, so the new
    address is geocoded.
  - Off in tests and when `GEOCODING_ENABLED=false`.
- **The phone works out the distance.** Tapping Nearby asks for the "while using the app" location permission (the
  first time), reads one position, and computes each restaurant's distance on the phone. The position is not sent to
  the server.
  - Nearby lists restaurants within 3 miles, nearest first. The 1-mile limit it had was too tight for a city the size
    of Los Angeles.
  - Once the position is known, each card shows the distance next to the cuisine and price; a restaurant without
    coordinates shows none (rule B6). The Distance sort uses the same numbers.
  - The chip shows when any restaurant in the list has coordinates.
  - Permission refused: a dialog explains, and the list stays where it was. Blocked: the dialog offers the phone's
    settings. Location off or no fix: a dialog says so.
  - Empty: "Nothing within 3 miles".
- **Sharing a restaurant** no longer includes "x mi away": it would tell the recipient how near the sender is.

## What will not change

- The server's own distance from a user's saved coordinates (`UserLocation`) stays as it is; on the phone it is
  replaced by the phone's own once Nearby has been tapped.
- The restaurant composer does not ask for a pin on a map.
- Other places with addresses (homes, events) are not geocoded.

## How it will be checked

- Unit: the geocoder sends only the address, names the app, spaces requests by at least a second, caches, and reports
  not found and unavailable; it is off in tests. The cron stores coordinates, marks a not-found address, and stops on
  an unavailable geocoder.
- Locally: the cron geocodes the Los Angeles restaurants; the Testville one is marked tried.
- On the phone (development location in Los Angeles): the chip appears; the permission prompt on the first tap; the
  list within 3 miles, nearest first, with distances; an empty Nearby; back to All.
