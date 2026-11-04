# Comlinkr

A city-scoped community app for people settling into a new place: finding a home (rentals, spare rooms,
roommates) and finding their people (local news, events, stories, Q&A, food). The mobile app is the product.
One repository holds every app, one folder each:

- `backend/`: the NestJS API (Prisma, PostgreSQL, Redis, Socket.IO chat, cron jobs); was `comlinkr_backend`;
- `frontend/apps/mobile/`: the Expo / React Native app (Expo SDK 57, RN 0.86, expo-router); was `Comlinkr_App`;
- `frontend/apps/web/` (Vite, not actively developed) and `frontend/packages/` (`shared`, `ui`).

This repository started on 2026-11-04 without history; the old repositories are kept read-only.

Work goes from short branches to `development` to `main`. Branch, commit and pull request names follow the
"Naming" section of the root `README.md` (`feature/…`, `fix/…`, `hotfix/…`, `chore/…`; Conventional Commits).
A push to `main` is meant to deploy the backend to production and run its migrations (see "How it deploys" in
[docs/system-map.md](docs/system-map.md)), so nothing reaches `main` without a pull request.
Do not commit or push unless the owner asks.

## Building and testing

Node 24 on this machine. Both apps use pnpm, at different versions: the backend pins `pnpm@9.15.0`
(`packageManager`), so run it as `npx pnpm@9.15.0 …`; the mobile app was installed with pnpm 12. A newer pnpm on
the backend stops at a "reinstall from scratch?" prompt and leaves `node_modules` as it was. After moving the
repository, reinstall both: pnpm's links hold absolute paths.

- **backend (`backend/`):** `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm start:dev`.
  - Type check: `npx tsc --noEmit`.
  - Unit tests: `pnpm test:unit` (no database needed).
  - End-to-end tests: `pnpm test:e2e`. They run against `comlinkr_test` (or `TEST_DATABASE_URL` from
    `backend/.env.test`). A guard refuses the databases `comlinkr` and `postgres`; never weaken it.
  - Lint: `npx eslint "src/**/*.ts"` to check. `pnpm lint` runs `--fix` and rewrites files.
- **mobile (`frontend/apps/mobile/`):** `pnpm install`, `pnpm typecheck`. There are no automated mobile tests;
  behaviour is checked on a phone (see "Testing on the phone" below).
- **Database:** Prisma migrations in `backend/prisma/migrations/`. Locally: `pnpm migrate:dev` to create one,
  `pnpm migrate:status` to check. Production runs `migrate:deploy` on each deploy.

To run everything locally against the phone, see
[docs/system-map.md, "How it runs locally"](docs/system-map.md#how-it-runs-locally).

## Testing on the phone

Phone checks are done by Claude driving a real Android phone over USB or wireless debugging with scrcpy (see
[docs/device-testing.md](docs/device-testing.md)). Each module has a checklist in `docs/system-review/checklists/`.
A walk records its results in `docs/device-runs/` and updates the module's review.

- Only a build pointed at the **local** backend may be walked. Before touching the app, check the API base URL
  the build uses. Every EAS profile in `eas.json` points at production.
- Sign in only with seeded test accounts (`*@comlinkr.test`). Never sign in with, message or change a real person's
  account.
- Do not install, uninstall or clear data for any app other than Comlinkr and Expo Go, and do not change the
  phone's settings beyond what the checklist says.
- Screenshots that show personal data stay out of the repository.

## Before a pull request

- For each app the change touches: type check, and for the backend run unit tests (and e2e tests when an endpoint
  changed).
- Walk the changed journey on the phone against the local backend, including the way back (delete, cancel,
  undo, sign out), unless the change cannot be seen on the phone.
- Write a build note.
- Work on a branch and open a pull request. Nothing is pushed to `development` or `main` directly.

## Where things are written down

So the next developer, or the next session, can see what changed and why (index: `docs/README.md`):

- **The system review** (`docs/system-review/`, one document per module) is the source of truth for how the
  product behaves. Read the module's document before changing it, and update it in the same pull request.
- **Every incoming task** (bug report, request, idea) gets a line in `docs/triage.md` before any work.
- **A change in what the product does** gets a plan (`docs/plan/NN-*.md`) before it is built. When the current
  behaviour needs describing first, write a review in `docs/review/`.
- **Every fix or feature** gets a build note in `docs/build/` (problem, cause, change, commit, how it was checked)
  and a line in the build-notes list of `docs/README.md`.
- **Something production showed first** also goes in `docs/production-lessons.md` and the rules below.
- **Database changes** are Prisma migrations in the same pull request as the code that needs them. After running
  one locally, query the database to check that it did what it says.
- **At the end of a session**, add an entry to the top of `docs/handover.md`.

## Safety on a local copy

- Keep email off locally: start the backend with `RESEND_API_KEY=` set empty for the process (the local `.env`
  holds a real key), with `NODE_ENV=development`. The backend then logs OTP codes instead of emailing them, so
  sign-up and password reset can be tested. For the phone, start Metro with `EXPO_PUBLIC_API_BASE_URL` set to the
  local API the same way instead of editing `.env` (commands in `docs/device-testing.md`).
- Cloudinary, Google and Apple sign-in, and Expo push use real services. Locally, use test credentials or leave
  them empty. Push only reaches devices registered against the local database.
- `news.cron` calls Google News RSS every 4 minutes while the backend runs.
- Before any EAS build or update, check that `frontend/apps/mobile/.env` points `EXPO_PUBLIC_API_BASE_URL` back at
  production (`https://api.comlinkr.com/api`), as `docs/system-map.md` describes. A build with a local URL breaks
  for every user who installs it.
- Never run `prisma migrate reset`, `migrate dev` or a seed against anything but a local database.
- Test data uses `.test` email addresses and the `uit_` / `ui_tester` usernames; clean-up SQL is in the system
  map.

## Rules learned from production

Each comes from a real incident; the story is in `docs/production-lessons.md`. Add to both when a fix lands for
something production showed first. None yet.

## Rules from bugs already found

Each comes from a fixed bug; the story is in the build note named. Production has not yet shown them first, so
none is in `docs/production-lessons.md`.

- Date-only values (`YYYY-MM-DD`, availability, move-in) are calendar dates: read the date part, never convert
  through local time ([bug audit](docs/build/2026-10-29-bug-audit.md), B10).
- Never hard-code a month, a year or "today" into a filter; compare real dates (B1).
- Missing data must not look like a bad value: hide a pill or field that has no data instead of showing 0 or N/A
  (B6).
- Hide an empty state while its list is still loading (B3).
- List every value a `useMemo` or `useEffect` reads in its dependencies (B8).
- Horizontal scrollers inside tab screens must be gesture-handler `ScrollView` / `FlatList`, or the tab swipe
  takes their drags ([architecture](docs/reference/Architecture.md)).
- Defer post-focus work with `runAfterTransition()`, not `InteractionManager`
  ([performance note](docs/build/2026-10-29-ui-performance-tab-jank.md)).

General rules this way of working starts with:

- For a production-only failure, get the real error first (the log line, the database's own reason). Don't fix a
  guess.
- Green tests are not done. Run the whole journey on the phone, including the way back, with ordinary data and
  awkward data (long names, accents, empty lists, a city with no content).
- Test lists at the size of the busiest city, not only with the seed data.
- What leaves for a third party (Cloudinary, Google, Expo push, email) is checked in the real request: it must not
  carry a session cookie or more personal data than needed.
