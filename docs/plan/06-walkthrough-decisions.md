# 06. Three product changes decided during the walkthrough

**Status: Done (2026-11-10), merged in pull request 22, [build note](../build/2026-11-10-walkthrough.md).** Written
after building: the owner decided each change in chat during the walk ([TR-028](../triage.md)), and the docs rule
asks for a plan for any change in what the product does. This file records what was decided and why.

## Problem

Three findings of the [walkthrough](../device-runs/2026-11-10-full-walkthrough.md) could not be fixed without
choosing how the product should behave:

- **L-23.** The application form said "You can withdraw it at any time", but the server allowed a withdrawal only
  for drafts, and no screen offered it.
- **F-13.** A restaurant owner's "Open now" switch (`isOpen`) changed nothing customers see: they get the status
  from the opening hours. The owner's card could say "Open now" while customers saw "Closed".
- **F-14.** Leaving a composer with Back lost everything typed, with no prompt.

## Questions for the owner, and answers (2026-11-10)

| Question | Answer |
|---|---|
| Until when may a tenant withdraw an application? | Until the landlord approves it ("Allow until landlord signs"). |
| What should the owner's open switch mean? | A "Temporarily closed" override on top of the hours. |
| Leaving a composer with something typed? | Ask before discarding. |

## What changed

- **Withdraw (L-23):** `property-applications.service.ts` allows a withdrawal while the application is not yet
  approved; the landlord is notified, and the listing shows "Apply" again. Withdraw is on the signed-application
  screen.
- **Temporarily closed (F-13):** the switch is labelled "Temporarily closed". When on, customers see "Temporarily
  closed" whatever the hours say, and the restaurant leaves the "Open now" filter. The owner's card shows the same
  status customers see. A missing `isOpen` never reads as closed.
- **Discard prompt (F-14):** every composer asks "Discard your changes?" (Keep editing / Discard) from the back
  arrow, hardware Back and the close buttons, only when something was typed or picked. An untouched form, a
  publish and a save leave without asking.

## What did not change

- A landlord's approval still cannot be undone by the tenant.
- Opening hours stay the source of the open or closed status when the override is off.

## How it was checked

Unit tests for the withdrawal rule (`property-applications.service.spec.ts`), and each change walked on the phone
with its way back; rows L-23, F-13 and F-14 of the run log.
