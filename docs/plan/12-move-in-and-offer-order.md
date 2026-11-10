# 12. The move-in date and the order of the offer

**Status: Built (2026-11-10) on `feature/move-in-rules`; [build note](../build/2026-11-10-move-in-rules.md).** Triage [TR-036](../triage.md), from the walkthrough
(L-20). The owner decided both questions in chat on 2026-11-10: refuse a move-in before the home is available, and
show the offer only after the landlord approves.

## Problem

- An application accepted a move-in of 30 Nov for a home available from 2 Dec. The picker's minimum is today, and
  the server checks only that the date parses.
- The offer (rent, deposit, start, length, signature) appears as soon as the applicant sends the form. The app saves
  steps 1 and 4 and then submits and signs in one go, so the landlord first sees an application the tenant has
  already signed, and approving it finishes the agreement.

## What will change

- **Move-in date:** it may not be before the home's available day (`HousingListing.availableDate`, a calendar date;
  compared by date part, rule B10). Steps 1 and 4 return 400 (`MOVE_IN_BEFORE_AVAILABLE`) with a message naming the
  day. A listing without an available day adds no rule. The picker starts at the later of today and that day.
- **The order:**
  1. **Apply:** the form as today, plus the lease length (12 or 6 months) for a rental. **Send** saves step 1 and
     step 4 (lease length and start) and submits.
  2. **Waiting:** "Sent. Waiting for <landlord>". Withdraw is still possible.
  3. **The landlord approves** (or declines) in the dashboard. The applicant is notified.
  4. **Your offer:** rent, deposit, start and length as approved (read only), the full agreement, the signature.
     Signing finishes the agreement (`SIGNED`, the PDF in My Documents). **Decline** withdraws.
  5. **Signed.**
- **Terms come before sending.** `saveStep` accepts only drafts, so the terms are fixed when the application is
  sent. The "Change a term" chips leave the offer: the lease length moves to Apply, and "Start a week later" goes,
  since the move-in date picker does the same. `termsRead` and `termsAgreed` become optional on step 4; the
  signature on the offer is the acknowledgement. Installed builds still send them.
- **Withdraw after approval:** an approved application the tenant has not signed can be withdrawn (Decline on the
  offer), and the landlord is told. This changes the walkthrough rule L-23 ("withdraw until the landlord approves"),
  which assumed the tenant signed first. Once the tenant has signed, withdrawing is refused as before.
- **Notifications:** tapping an application notification opens it. The applicant goes to the application screen;
  the landlord goes to the dashboard. Today the tap does nothing.
- **Landlord dashboard:** an approved application the tenant has not signed reads "Waiting for signature".

## What will not change

- The server still accepts a tenant's signature before approval. Installed builds submit and sign in one go, and
  refusing it would leave them with a sent application and a "Could not sign" error. Enforcing the order on the
  server is the owner's call once those builds are gone.
- Rent and deposit still come from the listing when the application starts.
- Shared spaces have their own applications; they are not touched.

## How it will be checked

e2e:
- a move-in before, on and after the available day, for steps 1 and 4;
- a listing without an available day;
- step 4 without `termsRead` or `termsAgreed`;
- sending, then approving, then signing gives `SIGNED` and a document;
- declining an approved offer: 200, and the landlord is notified;
- withdrawing after signing is refused.

On the phone, as a test tenant, with the landlord acting through the local API:
- an early date cannot be chosen;
- send, then waiting, then reopen: still waiting;
- approve, then the notification opens the offer;
- Decline: the dialog's Cancel first, then for real;
- on a second application, sign: done, and the document exists.

## Decided while building

- The application response also carries the landlord's name, the listing's country and its available day, so the
  screen can open from a notification with only the application id. The market (UK or US agreement) is taken from
  the currency or country there, as the listing page does.
- Back from the offer leaves the screen; there is no going back to the form once the application is sent.
- The listing's button still says "View agreement" for a sent application (from the journey steps); left as it is.

