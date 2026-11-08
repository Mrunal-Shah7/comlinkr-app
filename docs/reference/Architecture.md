# Architecture

## Repository layout
```
comlinkr-app/                one git repository
├─ backend/                  NestJS API
│  ├─ prisma/                schema.prisma (~90 models), 37 migrations, seed.ts, seed-admin.ts
│  ├─ src/main.ts            bootstrap: session, helmet, CORS, global prefix /api, Swagger /api/docs
│  ├─ src/app.module.ts      wires all feature modules + global guards
│  ├─ src/common/            guards (auth, onboarding, roles, badge), decorators, interceptors, filters, utils
│  ├─ src/modules/<domain>/  controller + service + dto per domain (see APIs.md)
│  ├─ src/redis/             RedisService (sessions, OTP, caches)
│  ├─ src/deep-links.ts      /.well-known/* + /app/* deep-link routes (no /api prefix)
│  └─ docs/API_ENDPOINTS.md  exhaustive endpoint table
├─ frontend/                 Expo app + web app + shared packages
│  ├─ apps/mobile/           ★ Expo app — the product that matters
│  ├─ apps/web/              Vite web app (not actively developed)
│  └─ packages/shared, ui    shared TS packages
└─ docs/                     project docs (index: docs/README.md)
```

## Backend stack
- **NestJS** on Express, **Prisma** ORM, **PostgreSQL**, **Redis**.
- **Sessions**: `express-session` with a Redis store; cookie `comlinkr.sid`. A per-user *session
  version* allows global logout/invalidation. No JWTs.
- **Global guards** (`app.module.ts`; corrected 2026-11-04, see system-review/08-platform.md: only Auth, Onboarding and Throttler are global, Roles is used by the admin controller, Badge is unused): `ThrottlerGuard` (100 req/min), `AuthGuard` (everything is
  authenticated unless `@Public()` / `@OptionalAuth()`), `OnboardingGuard` (blocks users who haven't
  finished onboarding unless `@SkipOnboarding()`), `RolesGuard` (`@Roles(ADMIN)`), `BadgeGuard`
  (`@RequireBadge(...)`).
- **Response envelope**: `TransformInterceptor` wraps payloads; `HttpExceptionFilter` normalises errors
  to `{ code, message }`.
- **Validation**: global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`.
- **Media**: Cloudinary (`StorageService`), URLs resolved via shared `resolveMediaUrl`.
- **Realtime**: Socket.IO gateway, namespace `/chat`, rooms `conversation:<id>`; events
  `join_conversation`, `leave_conversation`, `send_message`, `typing_start`, `typing_stop`.
- **Push**: Expo push service (`expo-notification.service.ts`), tokens in `PushToken`/`PushDevice`.
- **Mail**: `mail.service.ts` (OTP + password reset). In dev OTPs are logged.
- **Cron jobs** (`@nestjs/schedule`):
  | Job | Schedule | Purpose |
  |-----|----------|---------|
  | `admin.cron` | every min / 15 min | dispatch scheduled broadcasts, housekeeping |
  | `news.cron` | every 4 min | refresh Google News RSS per city |
  | `stories.cron` | hourly | expire stories |
  | `challenges.cron` | every 6 h | end expired challenges |
  | `settings.cron` | 03:00 daily | account deletion window / privacy requests |

## Mobile stack (`frontend/apps/mobile`)
- **Expo SDK 57**, React Native 0.86, React 19.2, **expo-router** (file-based routing).
- **State**: Zustand stores in `src/store/` (`auth`, `theme`, `chat`, `notifications`, `posts`,
  `sidebar`, `block`, `mute`, `guestLocation`, `listFetchCache`). React Query is configured
  (`src/services/cache/queryClient.ts`) but almost unused — screens fetch in `useEffect`/`useFocusEffect`
  and keep results in local `useState`.
- **List cache**: `listFetchCache.store.ts` — a 10-minute "should I refetch on focus?" timestamp gate
  per section (`feed`, `feed:news`, `housing`, `food`, `community`).
- **HTTP**: `src/api/client.ts` (fetch wrapper) + `src/services/http/apiClient.ts` (axios). The session
  cookie is kept in SecureStore and sent as a `Cookie` header. Base URL from
  `EXPO_PUBLIC_API_BASE_URL` (must include `/api`).
- **Theme**: `src/theme/` — `Colors` brand palette, `LIGHT_THEME`/`DARK_THEME` token sets exposed by
  `useTheme()` → `{ isDark, tc }`; `rs()` responsive scale in `src/utils/responsive.ts`.
- **UI kit**: `src/shared/ui` — `Button`, `Input`, `ListState`, `Toast` (`showToast`), `Dialogs` (`appAlert`).
- **Animation/gestures**: `react-native-reanimated` 4 + `react-native-gesture-handler` 2. The root is
  wrapped in `GestureHandlerRootView` (painted with `pageBg`; a transparent root lets the white Android
  window show during stack pops). Navigation is native since plan 02: `NativeTabs`
  for the tab bar, expo-router's `Stack` (native stack) for screens. Shared gesture components:
  `DismissibleSheet`/`SheetDragArea` (pull-down-to-close for modals; also
  supplies the in-Modal `GestureHandlerRootView`), `Skeleton`. Controls come from `@expo/ui` (plan 02): `src/shared/ui/Switch.tsx`,
  `src/shared/d/Segmented.{ios,android}.tsx`, and `DSheet` (`src/shared/d/Sheet.tsx`) on the native `BottomSheet`.
  Gesture-handler gestures do not run inside that sheet (it has no gesture-handler root, and adding
  `GestureHandlerRootView` there crashes): use `Pressable` or the React Native responder props.
  See [build/2026-10-29-ui-navigation-gestures-theme.md](../build/2026-10-29-ui-navigation-gestures-theme.md).
- **Tabs**: `NativeTabs` (react-native-screens) keeps each tab's screen once it has been opened; tabs do not
  slide (plan 02).
  Defer post-focus work with `runAfterTransition()` (`src/utils/afterTransition.ts`), not the deprecated
  `InteractionManager`.
- **Native modules not available in Expo Go**: `@react-native-firebase/*`, Google Sign-In. The app is
  normally built with EAS (`eas.json`); Expo Go can be used for UI work.

### Route map (expo-router)
```
app/_layout.tsx            Root Stack (slide_from_right), QueryClientProvider, Toast/Dialog hosts,
                           auth/theme hydration, push registration, chat socket
app/index.tsx              entry redirect (auth → tabs / onboarding / login)
app/(auth)/                login, signup, forgot-password, onboarding
app/(tabs)/_layout.tsx     Bottom tabs (NativeTabs): feed (Explore), housing (Listings), post (opens the compose sheet), food, community
app/create-post.tsx        universal composer (news, listing, shared_space, restaurant, event, story…)
app/chat.tsx               conversations + thread
app/profile.tsx, public-profile.tsx, edit-profile.tsx, settings.tsx, notifications.tsx
app/saved.tsx, favorites.tsx, interested.tsx, myposts.tsx, my-listings.tsx, my-restaurants.tsx
app/events.tsx, events/[id]/index.tsx, events/[id]/check-in.tsx
app/story-viewer.tsx, apply-badge.tsx, verification-status.tsx
app/landlord-dashboard.tsx, property-agreement.tsx
app/admin/*                admin console (see system-review/07-admin.md)
app/app/*                  deep-link entry points (/app/housing/:id …)
```

## Local development
1. Postgres on `localhost:5432` (db `comlinkr`) and Redis on `localhost:6379`.
2. `cd backend && npm run start:dev` → `http://localhost:4000/api`, Swagger at `/api/docs`.
   `npx prisma migrate status` should say up to date. `npm run seed` seeds reference data.
3. Mobile: set `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api` in `frontend/apps/mobile/.env`.
   With a USB device run `adb reverse tcp:4000 tcp:4000` (and `tcp:8081` for Metro) so the phone's
   `localhost` reaches the PC. Then `npx expo start` and open in Expo Go.
