# One repository for backend and frontend

_2026-11-04. No triage line (owner's request in chat)._

## Problem

The backend and the frontend were two git repositories (`comlinkr_backend`, `Comlinkr_App`) under
`comlnkr/code/`, with the shared docs in `code/docs/` belonging to neither, so the docs had no history and a change
across both apps needed two pull requests.

## Change

- New folder `C:\Users\shahm\Desktop\Codes\comlinkr-app`. `backend/` and `frontend/` were **moved** into it from
  `comlnkr/code/`, names unchanged. Chosen location: same path length as `comlnkr\code`, because the Windows native
  Android build is close to the path-length limit.
- Fresh start, no history (owner's choice). Both old `.git` folders were moved, not deleted, to
  `C:\Users\shahm\Desktop\Codes\comlnkr\old-git\backend.git` and `frontend.git`. The GitHub repositories are
  untouched.
- `git init -b main` at the root. **Nothing committed** (owner's instruction).
- Root `.gitignore`: dependencies and build output, every `.env*` except `.env.example`, `*.pem`, `*.jks`,
  `*.keystore`, Firebase config files, logs.
- `frontend/.gitignore` repaired: it held PowerShell here-string lines (`@'` and `'@ | Set-Content …`) around its
  patterns. Patterns kept; `!.env.example` added so the mobile `.env.example` stays tracked.
- Left in `comlnkr/code/` by the owner's choice: `build-release.cmd`, `scripts/read-build-api.cjs`,
  `.android-build/` (the long-path workaround and its junctions), `builds/` (the standalone APK), and the old
  `docs/`. They point at `code/frontend`, which no longer exists, so the release-APK script does not work for this
  repository.
- Docs written: root `README.md` and `CLAUDE.md`; `docs/` (index, system map, device-testing guide, eight system
  reviews, checklists, triage, plans, reviews, build notes, device runs, handover, production lessons). Earlier
  docs copied into `docs/reference/`; the three 2026-10-29 audits moved into `docs/build/`.
- App docs rewritten because they were out of date: `frontend/README.md` (said Expo SDK 54, React Native 0.81, npm,
  Node 18/20, a planned Spring Boot backend and a `docs/` folder that does not exist), `frontend/apps/mobile/README.md`
  (a `create-expo-app` placeholder) and `frontend/CONTRIBUTING.md` (naming moved to the root README; pnpm commands;
  docs now in the root `docs/`; the review rules kept as they were).
- Dependencies reinstalled, because pnpm links hold absolute paths: backend with its pinned `pnpm@9.15.0`
  (pnpm 12 stopped at a "reinstall from scratch?" prompt and left the old links), mobile with pnpm 12. Both with
  `--frozen-lockfile`.

## What is now untracked compared with the old repositories

Checked by listing the files git would add (`git ls-files --others --exclude-standard`) against the files each old
repository tracked at its last commit (`39c807c` backend, `6088c037` frontend). 1,046 files would be added, plus
the new docs and root files. Not carried over:

| Files | Why |
|---|---|
| `frontend/apps/mobile/@comlinkr__comlinkr.jks`, `@comlinkr__comlinkr_OLD_1.jks` | Signing keystores must not be in git. They are still on disk, and still in the old repository's history |
| `frontend/apps/mobile/*.log`, `out.txt` | Build and Metro logs |
| `frontend/.expo/README.md`, `devices.json` | Expo's machine-local folder |

## How it was checked

- Every tracked file of both old repositories is unchanged after the move and reinstall, except the four edited on
  purpose: `git status` with each old `.git` as `--git-dir` and the moved folder as `--work-tree` shows nothing for
  the backend, and ` M` for `.gitignore`, `CONTRIBUTING.md`, `README.md` and `apps/mobile/README.md` in the
  frontend.
- A scan of the 1,080 files to be added for private keys, `sk_live_`, AWS keys, Google client secrets (`GOCSPX-`),
  Resend keys (`re_…`) and Google API keys (`AIza…`): nothing found (the only hit is this note's own list of
  patterns). Both `.env.example` files hold placeholders only. The old local test password is not in any new doc.
- `backend`: `npx tsc --noEmit` clean; `pnpm test:unit` 3 suites, 80 / 80 pass.
- `frontend/apps/mobile`: `pnpm typecheck` reports one error, `src/services/audioPlayback.ts(3,40): TS2307 Cannot
  find module 'expo-modules-core'`. `expo-modules-core` is only a dependency of `expo`, not of the app, so pnpm's
  isolated layout does not expose it. **This is a regression that cannot be explained from here:** the tracked files
  are identical to the last commit and the 2026-10-29 audit reported the type check clean, so the reinstalled
  `node_modules` is the only thing that changed, and the old one is gone, so they cannot be compared. The import is
  `import type`, which is erased at build time: Metro and the running app are not affected, only `tsc` fails. Not
  fixed (app code); later work T-006.
- **Not checked:** e2e tests (`pnpm test:e2e`), starting the backend, Metro, any build, the phone.

## Way back

Move `backend/` and `frontend/` back to `comlnkr/code/`, move each `old-git/<name>.git` back to `<name>/.git`,
restore `frontend/.gitignore` with `git checkout -- .gitignore` inside `frontend/`, delete `comlinkr-app/`, then
reinstall dependencies in both apps.
