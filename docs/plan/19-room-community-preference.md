# 19. A community a spare room is looking for

**Status: Building** on `fix/ios-ui-batch`. Triage [TR-061](../triage.md); [build note](../build/2026-11-19-ios-ui-batch.md).

## Problem

Every spare room's detail says "Open to anyone". That pill comes from `genderPreference`, which the room form never
sends, so it is always "Any". The owner wants hosts to be able to say which community they would like to live with,
and to keep it optional.

## What will change

- **Database:** `SharedSpace.communityPreference`, `VARCHAR(80)`, nullable (migration
  `20261118120000_shared_space_community_preference`). Null means open to anyone.
- **API:** `communityPreference` on create and update (`@MaxLength(80)`, trimmed, empty clears it) and in every
  shared-space response.
- **Room form** ("A room in my home"): a "Looking for (optional)" text field before the pet policy, with the hint
  "Leave it empty if the room is open to anyone".
- **Room detail:** "Looking for: ..." when set, in place of "Open to anyone"; a gender preference other than "any"
  still shows its own pill.

## What will not change

- No filter or search by community, and the field is not on the room card.
- The owner's quick edit (`EditSharedSpaceModal`) does not edit it yet.

## Questions for the owner

1. Housing law limits stating a preferred race, religion or national origin in housing adverts, with exceptions
   for shared homes (in the US, a roommate in a shared dwelling; in the UK, small premises where the owner lives).
   The field is offered on "A room in my home" only. Should it carry a short note, or be checked by someone who
   knows the rules in the US and the UK before release? [open]
2. Free text or a list of communities? Free text for now. [open]

## How it will be checked

- Backend type check and unit tests; the column queried in `comlinkr` and `comlinkr_test` after the migration.
- On the phone: post a room with and without the field; the detail shows "Looking for: ..." or "Open to anyone";
  a long value (80 characters, accents) wraps; delete the room afterwards.
