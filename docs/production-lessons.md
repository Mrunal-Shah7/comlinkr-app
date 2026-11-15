# Production lessons

What reached people, why, and the rule that came from it. Newest first. Each lesson has a matching one-line rule
in `CLAUDE.md` under "Rules learned from production".

Each entry has: **What happened** (as people saw it, with dates), **Why**, **Why nothing caught it**, **The fix**
(build note), **The rule**.

The bugs fixed on 2026-10-29 were found by an audit on a local copy, not by production, so their rules are in
`CLAUDE.md` under "Rules from bugs already found" instead.

## 2026-11-15: the first automated backend deploys failed on the VPS (TR-056)

- **What happened:** the new GitHub Actions deploy (PR 48) failed four times on 2026-11-15 before it worked:
  SSH refused the key; then `npx: command not found`; then `pg_dump: could not translate host name
  "…@localhost"`. Nobody using the app saw it: each attempt stopped before the migrations and the pm2 restart,
  and `/api/health` answered 200 throughout. The fifth attempt deployed.
- **Why:**
  - The deploy key had been generated on the VPS, but its public half was never added to `authorized_keys`.
  - Node is installed with nvm, which a non-interactive SSH shell does not load.
  - The database password contains `@`. Prisma accepted the unencoded URL; `pg_dump` (libpq) read the text after
    it as the host.
- **Why nothing caught it:** the manual deploys ran in an interactive login (nvm loaded) and never ran `pg_dump`
  with `DATABASE_URL`. The workflow could only be tried against the real server.
- **The fix:** the owner added the public key and URL-encoded the password (`%40`) in the VPS `backend/.env`;
  PR 50 loads nvm in the deploy script ([build note](build/2026-11-15-backend-deploy-workflow.md)).
- **The rules:** a script run over SSH on the VPS loads nvm first; special characters in a password inside a
  database URL are percent-encoded.
