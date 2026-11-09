# 2026-11-09: sprint54 e2e test brought in line with the listing visibility rule (TR-016)

Branch `chore/e2e-listing-visibility`, from `main` after pull request 14. Test only; no product change.

## Problem

`test/sprint54/stories-listing-reason.e2e-spec.ts`, "listing moderation reason persists on reject, clears on
approve, owner-only", failed with `NotFoundException: Listing not found`, on `main` as well. It was the only failure
in the backend e2e suite (44 of 45).

## Cause

After an admin rejects a listing, the test opened it as another user and expected the listing without its
`moderationReason`. The SEC-04 rule in `HousingService.getListingById` (`src/modules/housing/housing.service.ts`,
around line 280) returns "Listing not found" for a listing that is not `AVAILABLE` to anyone but its owner and
admins. The test was written before that rule. The code is right; the test was out of date.

## Change

- After the reject, the test now expects "Listing not found" for the other user.
- The owner-only check on `moderationReason` moved to after the approve, when the listing is available again: the
  other user sees the listing, without the field.

## Checked

- The spec on its own: 4 passed.
- The full backend e2e suite: 12 suites, 45 tests, all passed.
