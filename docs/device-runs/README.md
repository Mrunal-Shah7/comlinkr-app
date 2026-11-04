# Device runs

One file per checklist run on the phone, named `YYYY-MM-DD-<checklist>.md` (for example
`2026-11-05-00-smoke.md`), newest at the top of the list below. How runs are done:
[../device-testing.md](../device-testing.md).

## Format

```
# Run: <checklist>, <date>

Build: development build / Expo Go, app version, commit of this repository
Device: model, Android version, USB or wireless, time zone
Backend: commit, database (local copy), seed used
Account(s): test usernames only

| ID | Result | Note |
|---|---|---|
| S-01 | pass | |
| S-02 | fail | what was seen, and where the screenshot or log is kept |
| S-03 | blocked | why, and what is needed |

Put back: settings restored, data removed and checked as gone
Follow-up: triage lines opened (TR-nnn), review sections updated
```

Results are `pass`, `fail`, `blocked` or `YOU`. A `fail` gets a triage line unless the review already lists it as
a known problem.

## Runs

None yet.
