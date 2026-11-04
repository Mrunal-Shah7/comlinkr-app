# Comlinkr

One repository for every Comlinkr app. Each folder is its own app with its own dependencies, `.env` and start
command. The backend and the mobile app share one PostgreSQL database and one Redis, both run by the backend.

| Folder | App | Run locally |
|---|---|---|
| `backend/` | NestJS API (Prisma, PostgreSQL, Redis, Socket.IO, cron jobs) | `npx pnpm@9.15.0 install --frozen-lockfile`, `pnpm start:dev` → `http://localhost:4000/api` |
| `frontend/apps/mobile/` | Expo / React Native app (Android, iOS): **the product** | `pnpm install`, `npx expo start` (see `docs/system-map.md`) |
| `frontend/apps/web/` | Vite web app. Not under active development | `npm run dev:web` from `frontend/` |
| `frontend/packages/` | `shared` and `ui` TypeScript packages | used by the apps |

## Naming

**Branches**

| Branch | For | Cut from | Merged into |
|---|---|---|---|
| `main` | Production. The backend deploys from it | — | — |
| `development` | Integration and review before release (to be created) | `main` | `main`, by a release pull request |
| `feature/<scope>-<short-description>` | New behaviour, e.g. `feature/mobile-roommate-filters` | `development` | `development` |
| `fix/<scope>-<short-description>` | A bug fix, e.g. `fix/mobile-move-in-filter` | `development` | `development` |
| `hotfix/<scope>-<short-description>` | An urgent production fix | `main` | `main`, then `development` |
| `docs/`, `chore/`, `refactor/<scope>-<short-description>` | Docs, tooling, cleanup, restructuring | `development` | `development` |

- Lower case, words joined by hyphens. `<scope>` is `mobile`, `backend`, `web` or `shared`; a change that
  touches several apps stays on one branch, with the main scope in its name.
- If the work has a ticket, add its key after the prefix: `fix/BUG-12-move-in-filter`.
- `main` and `development` are protected: changes arrive only through pull requests.

**Commits and pull requests**

- Conventional Commits: `<type>: <short summary>`, e.g. `fix: show move-in dates as calendar dates`.
  Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, `ci`.
- Pull request title: the same form. The description says how the change was checked (commands run, the journey
  walked on the phone, screenshots for UI changes) and links its build note.
- Review rules are in [frontend/CONTRIBUTING.md](frontend/CONTRIBUTING.md); they apply to the whole repository.

## History

This repository started on 2026-11-04 without git history. The history of each app is in its old repository,
kept read-only: `comlinkr_backend` (backend) and `Comlinkr_App` (frontend). Local copies of both old `.git`
folders are kept outside this repository.

## Documentation

`docs/` holds the system map, the module reviews, plans, build notes, the device-testing guide and the handover
(start with [docs/README.md](docs/README.md)). Some apps keep their own notes: `backend/docs/API_ENDPOINTS.md`
and `frontend/apps/mobile/docs/`.
