# Checklists

Hands-on test scripts, one per module (named like the review: `03-listings-rooms-roommates.md`), plus
`00-smoke.md` for a quick pass over the whole app. Claude runs them on the phone as described in
[../../device-testing.md](../../device-testing.md); each run is logged in `docs/device-runs/`.

## Format

Each checklist starts with:

- **Build and data**: which build (development build or Expo Go), which test accounts, which seeded data, and
  what must be true before starting.
- **Settings to put back**: everything the run changes and must restore.
- **Clean-up**: what the run creates and how it is removed and checked as gone.

Then a table of rows:

| ID | Who | Do | Expect | Review |
|---|---|---|---|---|
| L-01 | P | One action on the phone, with the exact screen and control | What must be seen (text, count, state) | `03 §How it works` or problem number |

- **ID**: a letter for the checklist (`S` smoke, `L` listings…) and a number. IDs never change and are never
  reused; new rows go at the end.
- **Who**: P, A, D, C or YOU (see the device-testing guide).
- **Expect**: concrete enough that two runs reach the same verdict. "Looks fine" is not an expectation.
- **Review**: the statement in the system review the row checks. A row that checks something the review does not
  say yet means the review needs a line.

**No row may be skipped.** If Claude cannot do it, it moves to a YOU table at the end with what the owner needs to
do, and stays listed until done.
