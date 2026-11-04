# Build notes

One note for every fix or feature as it was built, in the same pull request as the change. Name it
`YYYY-MM-DD-<topic>.md` (with the triage ID or ticket if there is one, for example
`2026-11-05-TR-003-move-in-filter.md`), and add one line to the build-notes list in [../README.md](../README.md).

Each note covers:

- **Problem**: as people saw it;
- **Cause**: with file and line;
- **Change**: what was changed, and in which apps;
- **Commit or pull request**;
- **How it was checked**: commands run (type check, tests), the journey walked on the phone (checklist rows and
  run log), the way back, awkward data, every platform it reaches; and what was **not** checked;
- **Way back**: how to undo it (revert, migration down, OTA rollback).

If production showed the problem first, also add it to [../production-lessons.md](../production-lessons.md) and a
rule to `CLAUDE.md`.

The three notes dated 2026-10-29 were written before this format and moved here unchanged.
