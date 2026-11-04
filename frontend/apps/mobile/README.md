# Comlinkr mobile app

Expo SDK 57, React Native 0.86, expo-router. Package `com.comlinkr.app`.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
npx expo start --lan --port 8083     # Metro; Expo Go or a development build loads from it
npx expo run:android                 # development build on a connected phone
```

- `.env` from `.env.example`. `EXPO_PUBLIC_API_BASE_URL` must end in `/api`. Locally
  `http://localhost:4000/api` with `adb reverse`; set it back to `https://api.comlinkr.com/api` before any EAS
  build or update.
- How the app is built: [../../../docs/reference/Architecture.md](../../../docs/reference/Architecture.md). How it
  behaves, screen by screen: [../../../docs/system-review/](../../../docs/system-review/README.md).
- Builds, store releases and OTA updates: [docs/BUILD_AND_DEPLOY.md](docs/BUILD_AND_DEPLOY.md).
- Testing on a phone: [../../../docs/device-testing.md](../../../docs/device-testing.md).
