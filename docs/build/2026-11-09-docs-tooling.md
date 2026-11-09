# 2026-11-09: Docs checks and tooling rules (TR-025)

Branch `chore/docs-tooling`, from `main` after pull request 20. Merged as pull request 21.

## Problem

The docs carry work across sessions, but only as well as each session remembers to update them.
- Five merged tasks were still marked built or done in `triage.md` (TR-005, TR-011, TR-012, TR-013, TR-023).
- Three build notes did not name the pull request that merged them.
- `handover.md` had grown to 19 entries and 293 lines, all read at the start of a session.
- Work in progress was recorded only at the end of a session, so a session cut short by its context left nothing.
- How to reach the phone and how to open a pull request (`gh` is not installed) were not written down, so each
  session found out again.

## Change

- **`CLAUDE.md`:**
  - "Tools": the phone through MCPier's `android` server (scrcpy-mcp), with adb when MCPier is down; injected
    swipes are not system gestures; Claude in Chrome for browser work and pull requests, merging only when the
    owner asks; phone settings put back before the session ends.
  - "After a merge": triage state, the PR in the build note, the "In progress" line removed.
  - An "In progress" line in `handover.md` when a branch is cut; a "Slowed down by:" line on every entry that
    becomes a rule when it will happen again; the handover keeps five entries.
  - Rules are removed when they stop applying.
  - "Checks on the docs".
- **`scripts/check-docs.mjs`:** errors for a triage row still built on a merged branch, a merged task's build
  note without its PR number, a build note missing from `docs/README.md`, a broken relative link, and a merged
  branch under "In progress"; warnings for a missing branch and a long handover. `--session-start` also prints
  "In progress" and the latest entry.
- **`.claude/settings.json`:** a SessionStart hook runs the check with `--session-start`; a PreToolUse hook on
  `git push` (Bash and PowerShell) runs it with `--hook` and blocks the push while there are errors.
- **Docs fixed by the first run:** the five triage rows, PR numbers in three build notes, T-005 in
  `docs/README.md`. Fourteen handover entries moved to `docs/handover-archive.md`.

## Checked

- `node scripts/check-docs.mjs`: six errors on the first run, none after the fixes. A branch just cut from
  `main` was reported as merged; fixed by ignoring branches at the same commit as `origin/main`.
- Both hook commands piped by hand from a subdirectory: the session-start output prints the handover; the
  push check exits 0 when clean and 1 or 2 on errors.
- With a link broken on purpose, the script reported it and exited 2. The hooks did not fire in the session that
  wrote them: `.claude/settings.json` did not exist when that session started, so Claude Code was not watching
  it. They load in the next session (or after opening `/hooks`). Not yet seen firing.
