# 2026-11-10: A tenant signs only after the landlord approves (TR-048)

Branch `fix/sign-after-approval`, from `chore/brand-comlinkr`. Merged as pull request 37 (merge `78e2eae`), reaching `main` with PR 24.

## Problem

Plan 12 (PR 32) moved signing after the landlord's approval in the app, but the server still accepted a signature on
a submitted or under-review application, for installed builds that signed when sending. The owner decided on
2026-11-10 that such a signature is refused.

## Change

`PropertyApplicationsService.sign` (backend):
- An application that is not `APPROVED` answers 409 `NOT_APPROVED`: "The landlord has not approved this application
  yet. You can sign once they do." Drafts still answer `NOT_SUBMITTED`; rejected and withdrawn ones are refused as
  before.
- The guarded update only matches `APPROVED`, so a decision racing the signature cannot let an early one through.
- `decide` still finalises a row an older build signed early, so those applications are not stranded.

Installed builds older than plan 12 that sign when sending now see "Could not sign" with that message; their
application is still sent, and they can sign after approval once updated.

## How it was checked

- **Backend:** `tsc`, lint on the changed files, unit tests 123, e2e tests 68.
  - Unit (`property-applications.service.spec.ts`): signing while submitted or under review is refused and stores
    nothing; retry, the drawn-image check and the PDF-failure retry now sign after approval; the legacy
    already-signed row still finalises on approval.
  - e2e (`move-in-offer.e2e-spec.ts`): signing a sent application answers 409 `NOT_APPROVED` and leaves no signature;
    after approval the same signature makes it signed.
- **Mobile:** unchanged. The app signs only from the offer, which shows after approval
  (`app/property-agreement.tsx`).
- **Phone:** not walked; the refused path cannot be reached from the current app.

## Not checked

- An installed pre-plan-12 build against this server.
