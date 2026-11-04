# Comlinkr frontend

The client apps of Comlinkr, inside the `comlinkr-app` repository. Product, setup, testing and the way of working
are in the repository root: [../README.md](../README.md), [../CLAUDE.md](../CLAUDE.md) and
[../docs/README.md](../docs/README.md).

| Folder | What | State |
|---|---|---|
| `apps/mobile/` | Expo / React Native app (Expo SDK 57, React Native 0.86, React 19.2, expo-router, Zustand) | The product |
| `apps/web/` | React + Vite web app | Not under active development |
| `packages/shared/` | Shared types, theme tokens, helpers | |
| `packages/ui/` | Platform-aware UI primitives (`.web.tsx` / `.native.tsx`) | |

The backend is `../backend/` (NestJS, Prisma, PostgreSQL, Redis).

## Run the mobile app

```bash
cd apps/mobile
pnpm install --frozen-lockfile
npx expo start --lan --port 8083
```

Against the local backend on a USB phone, with `adb reverse` and the `.env` settings, see
[../docs/system-map.md](../docs/system-map.md#how-it-runs-locally). Builds and store releases:
[apps/mobile/docs/BUILD_AND_DEPLOY.md](apps/mobile/docs/BUILD_AND_DEPLOY.md).

## Troubleshooting

- **Metro cache:** `npx expo start -c` in `apps/mobile`.
- **Expo SDK mismatch:** `npx expo install --check` in `apps/mobile`.
- **Phone cannot reach Metro or the API:** `adb reverse tcp:8083 tcp:8083` and `adb reverse tcp:4000 tcp:4000`;
  start Metro with `--lan` (plain `--localhost` binds IPv6 only on Windows).
- **After moving the folder:** reinstall dependencies; pnpm's links hold absolute paths.
