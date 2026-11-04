# System map

_2026-11-04. The profile of the product, its parts, its data, how it runs locally, how it is tested and how it
deploys. Statements are from the code and the earlier docs unless marked otherwise. Correct this file when it is
wrong; it is read before everything else._

## Profile

| | |
|---|---|
| What | City-scoped community app: housing, roommates, news, events, stories, food, local Q&A. See [reference/ProductOverview.md](reference/ProductOverview.md) |
| Platforms | Android and iOS (Expo app, version 1.0.4, package `com.comlinkr.app`). A Vite web app exists but is not developed |
| People | Guests (browse a city), signed-in users, badge holders (LANDLORD, RESTAURANT_OWNER, AGENCY, LOCAL_REVIEWER), admins (`role = ADMIN`, in-app admin console) |
| Money | No payments in the app today. Restaurant reservations and property-application deposits are recorded, not charged [question: is a deposit ever charged?] |
| Data | Personal profiles, locations, chat, identity documents for badges, rental applications with signatures, tenancy-agreement PDFs. Data export and account deletion exist (30-day window) |
| Production | API `https://api.comlinkr.com/api` on a VPS (PM2 process `comlinkr-api`); web `https://www.comlinkr.com`; deep links `https://www.comlinkr.com/app/…` and scheme `comlinkr://` |
| Team | The owner (Mrunal) and the frontend contributors from the old `Comlinkr_App` repository |

### This machine

Windows 10, Node 24, pnpm 12 (the backend pins 9.15.0), Java 17, Android SDK with adb, scrcpy 3.3.3, ffmpeg,
PostgreSQL and Redis (Memurai) locally. No macOS, so no iOS builds or iOS testing here.

### What only the owner can run

EAS builds and updates (Expo account), Play Store and App Store submissions, the VPS and its PM2 process, the
GitHub repository settings and secrets, production database queries.

## The parts

| Part | Folder | What it does |
|---|---|---|
| API | `backend/src/` | NestJS on Express, global prefix `/api`, Swagger at `/api/docs`. 24 modules in `src/modules/`: admin, auth, badges, challenges, community, documents, events, feed, files, food, housing, messaging, news, notifications, onboarding, posts, property-applications, roommates, saves, settings, shared-spaces, storage, stories, users |
| Chat | `backend/src/modules/messaging/` | Socket.IO namespace `/chat`, rooms `conversation:<id>` |
| Jobs | `backend/src/modules/*/*.cron.ts` | Run inside the API process (`@nestjs/schedule`): `admin.cron` (every minute and 15 minutes: scheduled broadcasts, housekeeping), `news.cron` (every 4 minutes: Google News RSS per active city), `stories.cron` (hourly: expire stories), `challenges.cron` (every 6 hours: end challenges), `settings.cron` (03:00: deletion window, privacy requests) |
| Deep links | `backend/src/deep-links.ts` | `/.well-known/*` and `/app/*`, outside the `/api` prefix |
| Mobile app | `frontend/apps/mobile/` | expo-router screens in `app/`, features in `src/features/`, API clients in `src/api/`, Zustand stores in `src/store/`, UI kit in `src/shared/ui/`. Details: [reference/Architecture.md](reference/Architecture.md) |
| Web app | `frontend/apps/web/` | Vite + React. Out of scope until the team says otherwise |
| Shared packages | `frontend/packages/shared`, `ui` | Types, tokens, primitives |

Each tab and area is described in its system review (`system-review/`).

## The data

- PostgreSQL, Prisma schema `backend/prisma/schema.prisma` (about 90 models, 37 migrations up to
  `20261026000000_audit_session_version_restaurant_tz_currency`). Grouped by domain in
  [reference/DataModel.md](reference/DataModel.md).
- Redis: sessions (`express-session`, cookie `comlinkr.sid`, per-user session version for global sign-out), OTP
  state, caches.
- Media in Cloudinary. Generated tenancy agreements are stored as `UserDocument` rows.
- Almost everything is scoped by `UserLocation.city`.

## Integrations

| Service | Used for | Locally |
|---|---|---|
| Resend | OTP and password-reset emails | Leave `RESEND_API_KEY` empty: with `NODE_ENV=development` the OTP is logged by the backend |
| Cloudinary | Avatars, listing, restaurant, story and event media | Real uploads if keys are set; use a test cloud or leave empty |
| Google Sign-In, Sign in with Apple | Social sign-in | Needs a development build, not Expo Go |
| Expo push (`exp.host`) | Push notifications | Reaches only devices registered against the local database |
| Google News RSS | Live News on Explore | Called by `news.cron` every 4 minutes |
| Firebase Analytics | App analytics (`@react-native-firebase/analytics`) | Development build only; events go to the real Firebase project |
| EAS (Expo) | Builds, OTA updates (`production` and `staging` channels) | Owner only |

The backend `.env.example` lists `JWT_SECRET` and `JWT_ACCESS_EXPIRES_SEC`, but `auth.guard.ts` says cookie
sessions only and no code reads them [question: remove them from `.env.example`?].

## How it runs locally

### Once

1. PostgreSQL on `localhost:5432` with a database `comlinkr`, and a second one `comlinkr_test` for e2e tests.
   Redis on `localhost:6379`.
2. `backend/.env` from `backend/.env.example`: `DATABASE_URL` to `comlinkr`, `NODE_ENV=development`,
   `RESEND_API_KEY` empty.
3. `cd backend && npx pnpm@9.15.0 install --frozen-lockfile && pnpm migrate:status`, then `pnpm seed`
   (reference data: vibes, interests, communities; idempotent). `pnpm seed:admin` creates the admin user.
4. `cd frontend/apps/mobile && pnpm install --frozen-lockfile`. `frontend/apps/mobile/.env` from `.env.example`.

### Each time

```
# backend (http://localhost:4000/api, Swagger /api/docs)
cd backend && pnpm start:dev

# phone over USB (or wireless, see device-testing.md): let the phone's localhost reach this PC
adb reverse tcp:4000 tcp:4000
adb reverse tcp:8083 tcp:8083

# Metro; plain --localhost binds IPv6 ::1 only on this PC, which adb reverse cannot reach
cd frontend/apps/mobile && npx expo start --lan --port 8083
```

- `frontend/apps/mobile/.env`: `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`. It must include `/api`.
- **Expo Go:** `adb shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8083 host.exp.exponent`.
  Firebase, Google Sign-In and push do not work in Expo Go (expected warnings).
- **Development build** (everything works): `npx expo run:android` builds and installs a debug build of
  `com.comlinkr.app` that loads JavaScript from Metro. On this machine the Windows path-length limit has broken
  native builds before; the old workaround (`code/.android-build`, `code/build-release.cmd`) was left in the old
  folder and still points at `code/frontend`, so it does not work for this repository. See "What is missing".
- Switch `.env` back to `https://api.comlinkr.com/api` before any `eas build` or `eas update`.

### Local test data

| What | Identifier |
|---|---|
| Test login | username `ui_tester`, email `uitester@comlinkr.test`, city Los Angeles, onboarding complete. Password: kept out of the repository, in the old `comlnkr/code/docs/LocalTesting.md` (local database only) |
| 12 roommate-seeking users | usernames `uit_*` (`uit_*@comlinkr.test`), all in Los Angeles with roommate preferences |
| Their content | 24 housing listings, 12 restaurants, 14 feed posts, 10 community questions (picsum / pravatar images) |

Not covered by the test data yet: events, quests, polls, stories, property applications, badges, the admin
screens. A seed for those is in "What is missing".

Remove it all (every user relation cascades):

```sql
DELETE FROM "User" WHERE username LIKE 'uit\_%' OR username = 'ui_tester';
```

## How it is tested

| Check | Command | State (2026-11-04) |
|---|---|---|
| Backend type check | `npx tsc --noEmit` in `backend/` | Clean |
| Backend unit tests | `pnpm test:unit` | 80 / 80 pass (3 suites) |
| Backend e2e tests | `pnpm test:e2e` (database `comlinkr_test`, guarded) | Not run since the move |
| Backend lint | `npx eslint "src/**/*.ts"` | 29 findings on 2026-10-29, mostly formatting |
| Mobile type check | `pnpm typecheck` in `frontend/apps/mobile/` | **1 error** after the reinstall: `src/services/audioPlayback.ts` imports a type from `expo-modules-core`, which is not a direct dependency |
| Mobile automated tests | none | `jest-expo` is installed, no test files |
| Phone | Claude over scrcpy (MCPier `android` server), by checklist | Smoke checklist run 2026-11-04 on Android 16 in Expo Go: 13 of 14 pass, 1 partial ([run log](device-runs/2026-11-04-00-smoke.md)) |

## How it deploys

- **Backend.** `backend/.github/workflows/deploy.yml`: on a push to `main`, SSH to the VPS, `git pull origin main`
  in `/var/www/comlinkr_backend`, `pnpm install`, `pnpm migrate:deploy`, `pnpm generate`, `pnpm build`,
  `pm2 restart comlinkr-api`. No tests run first. **In this repository the workflow does not run:** GitHub only
  reads `.github/workflows/` at the repository root, and the VPS folder is a clone of the old backend repository.
  Switching production to this repository is planned work (see the index, "Later work").
- **Mobile.** EAS from `frontend/apps/mobile/`. Profiles: `development` (development client), `staging` (APK,
  channel `staging`), `production` (app bundle, channel `production`, submitted to the stores). Every profile sets
  `EXPO_PUBLIC_API_BASE_URL` to production. JavaScript-only changes ship as OTA updates
  (`eas update --branch production`) and reach every user at once. Native changes need a store build. Full guide:
  `frontend/apps/mobile/docs/BUILD_AND_DEPLOY.md`.

## Risk areas

- A push to `main` (once the workflow is wired) runs production migrations with no test step.
- An OTA update goes to every user immediately, from whichever machine and `.env` runs it.
- Very large screen files: Listings `app/(tabs)/housing/index.tsx` (about 7.8k lines), Explore
  `app/(tabs)/feed/index.tsx` (about 7k lines).
- `roommates.service.searchRoommates` scores every looking user in a city in memory, per request.
- `app/_layout.tsx` hides every `Uncaught (in promise` warning in LogBox, which hides unhandled API errors during
  development.
- Badge documents, rental applications and signatures are sensitive. Access checks were only spot-checked
  (2026-10-29 audit).

## What is missing

- A root `.github/workflows/` deploy with a test step, and the VPS switched to this repository.
- A local build profile (or a documented `expo run:android` path) that cannot point at production.
- A working Windows native build path for this repository's location.
- A seed for events, quests, polls, stories, applications, badges and admin data, all with `.test` emails.
- Any automated mobile test.
- A `development` branch and branch protection.

## Questions for the team

1. Is a deposit ever charged in the app, or only recorded?
2. Remove `JWT_SECRET` and `JWT_ACCESS_EXPIRES_SEC` from `backend/.env.example` (and the JWT keys from the mobile
   `.env.example`)?
3. Who may run `eas update --branch production`, and from which branch?
4. Should the hidden `Uncaught (in promise` warnings be shown again in development?
5. Is the web app (`frontend/apps/web/`) to be kept, frozen or removed?
6. Which Prisma migrations have run on production? (`pnpm migrate:status` against production, by the owner.)
