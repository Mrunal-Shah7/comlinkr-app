# 2026-11-15: The backend deploys from GitHub Actions again (TR-056, T-001)

Branch `chore/backend-deploy-workflow`, merged as pull request 48 (merge `6407403`). The workflow file was written by the owner on 2026-11-11 and left
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
- **First run** (merge of PR 48, [run 43637726615](https://github.com/Mrunal-Shah7/comlinkr-app/actions/runs/43637726615)):
  `test` passed (install, generate, `tsc`, unit tests). `deploy` failed in its first second, in the SSH step,
  before reaching the server: most likely the `VPS_*` secrets are not set (the job log needs a signed-in
  browser and was not read). Production was untouched: `/api/health` answered 200 afterwards.
- **Re-runs, after the owner added the secrets:**
  - Attempt 2: `ssh: unable to authenticate`. The new key had been generated on the VPS, but only an older key
    (`github-actions-deploy`) was in `~ubuntu/.ssh/authorized_keys`. The owner added the new public key.
  - Attempt 3: logged in, fast-forwarded `/var/www/comlinkr-app` to `main`, then stopped at
    `npx: command not found`. Node is installed with nvm (`~/.nvm`, v22), which a non-interactive SSH shell does
    not load; `pm2` is in `~/.local/bin`, `pg_dump` in `/usr/bin`. Nothing was built or restarted.
- **Fix** (`fix/backend-deploy-nvm`, merged as pull request 50, merge `c7a99d6`): the script sources
  `~/.nvm/nvm.sh` before `set -e` and stops with a clear message if `npx` is still missing.
- **The merge of PR 50** ([run 43639906602](https://github.com/Mrunal-Shah7/comlinkr-app/actions/runs/43639906602)):
  - Attempt 1: nvm loaded, install, generate and build passed, then `pg_dump` failed with `could not translate
    host name "…@localhost"`: the database password contains `@`, unencoded in the VPS `backend/.env`. Nothing
    was migrated or restarted. The owner encoded it as `%40`, checked `pg_dump` by hand and restarted pm2.
  - Attempt 2: **passed** (83 s): build, backup in `~/backups/`, `migrate:deploy`, `pm2 restart`, health
    check. `/api/health` answered 200 with an uptime of 113 s.
- The lessons are in [production-lessons.md](../production-lessons.md).

## Notes for later

- `~/backups/` on the VPS gains one dump per deploy; nothing prunes it.
- The VPS runs Node 22 (nvm); the workflow's test job uses Node 24.
- `backend/.github/workflows/deploy.yml` still exists and never runs (T-001).
