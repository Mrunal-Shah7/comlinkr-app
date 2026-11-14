# 2026-11-15: The backend deploys from GitHub Actions again (TR-056, T-001)

Branch `chore/backend-deploy-workflow`. The workflow file was written by the owner on 2026-11-11 and left
uncommitted; this branch commits it.

## Problem

Since the move to this repository, backend deploys were manual (`docs/system-map.md`, "How it deploys"). The old
`backend/.github/workflows/deploy.yml` never runs, because GitHub only reads `.github/workflows/` at the
repository root, and it deployed and migrated with no tests (T-001).

## Change

`.github/workflows/deploy-backend.yml`:
- **Runs on** a push to `main` that touches `backend/**` or the workflow file itself, or by hand
  (`workflow_dispatch`). One deploy at a time; a running one is never cancelled.
- **`test` job:** pnpm 9.15.0 and Node 24, then `pnpm install --frozen-lockfile`, `pnpm generate`,
  `npx tsc --noEmit`, `pnpm test:unit`.
- **`deploy` job**, only after the tests pass, in the GitHub environment `production` (where a manual approval
  can be required): over SSH (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` secrets) in `/var/www/comlinkr-app`, a
  fast-forward of `main`, install, generate, build, a `pg_dump` to `~/backups/`, `migrate:deploy`,
  `pm2 restart comlinkr-api`, then up to 30 seconds of `/api/health` checks.

Left as it was: `backend/.github/workflows/deploy.yml` (it never runs; delete it in a later change).

## Notes for the next change

- **Merging this deploys.** The workflow's own path is in its `paths` filter, so the merge commit runs it against
  production.
- Not seen from here: whether the three secrets and the `production` environment exist on GitHub, and whether
  the VPS user can run `pg_dump`, `pm2` and `npx` from a non-interactive SSH shell (the script adds
  `~/.local/bin` to `PATH`).

## How it was checked

- Read the workflow. `node scripts/check-docs.mjs` passes.
- Not run yet: its first run is the merge of this branch.
