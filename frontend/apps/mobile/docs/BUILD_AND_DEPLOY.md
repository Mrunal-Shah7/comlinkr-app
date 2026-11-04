# ComLinkr — Build & Deployment Guide

All commands run from `apps/mobile/` unless stated otherwise.

---

## Table of Contents

1. [One-Time Setup](#1-one-time-setup)
2. [Environment & Config](#2-environment--config)
3. [Local Development](#3-local-development)
4. [Building the App](#4-building-the-app)
5. [Play Store — Internal Testing](#5-play-store--internal-testing)
6. [Play Store — Going Live (Production)](#6-play-store--going-live-production)
7. [OTA Updates (EAS Update)](#7-ota-updates-eas-update)
8. [Update Decision Rule](#8-update-decision-rule)
9. [Versioning](#9-versioning)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. One-Time Setup

Install EAS CLI globally (once per machine):

```bash
npm install -g eas-cli
```

Log in to your Expo account:

```bash
eas login
```

Link the project to EAS (run once in `apps/mobile/`):

```bash
eas build:configure
```

This writes your `EAS_PROJECT_ID` into the project. The project ID for ComLinkr is:

```
EAS_PROJECT_ID=cef56468-066a-4761-abe6-b3171e1e2d06
```

This is already hardcoded in `app.config.js` — no `.env` entry needed.

---

## 2. Environment & Config

### Build profiles (`eas.json`)

| Profile | Output | API URL | Use for |
|---|---|---|---|
| `development` | Dev client | `dev-api.comlinkr.com` | Local dev with native modules |
| `staging` | `.apk` | `staging-api.comlinkr.com` | Team testing, quick installs |
| `production` | `.aab` | `api.comlinkr.com` | Play Store (internal + live) |

### Key config files

| File | Purpose |
|---|---|
| `app.config.js` | App name, version, icons, plugins, EAS project ID |
| `eas.json` | Build profiles and environment variables |
| `google-services.json` | Firebase/Google Play Services config (do not commit to public repos) |

### `usesCleartextTraffic`
Already set to `false` in production automatically via `app.config.js`. HTTP traffic (for local dev) is only allowed in `development` and `staging` builds.

---

## 3. Local Development

Start Expo dev server (from repo root):

```bash
npm run dev:mobile
```

Or directly from `apps/mobile/`:

```bash
npx expo start
```

With cache cleared (fixes most weird metro errors):

```bash
npx expo start --clear
```

Via tunnel (if on different network from phone):

```bash
npx expo start --tunnel
```

Scan the QR code with **Expo Go** on your phone to preview.

> **Note:** Expo Go runs JS only. For features that need native code (notifications, video, etc.) you need a development build — see Section 4.

---

## 4. Building the App

### Staging APK — for team testing (no Play Store)

Produces a `.apk` file. Teammates install it directly on Android.

```bash
cd apps/mobile
eas build --profile staging --platform android
```

- Takes ~15–20 min
- EAS prints a download link when done
- Share the link — teammates tap it on their phone to install
- No Play Store account needed

### Production AAB — for Play Store

Produces a `.aab` (App Bundle). Required format for Play Store.

```bash
cd apps/mobile
eas build --profile production --platform android
```

- Takes ~15–20 min
- Download the `.aab` from the EAS dashboard link
- Upload this file to Play Console

### Check build status

```bash
eas build:list
```

View builds at: https://expo.dev/accounts/[your-account]/projects/comlinkr/builds

---

## 5. Play Store — Internal Testing

Internal testing = **no Google review**, instant publish, up to 100 testers.

### Steps

1. Run the production build (Section 4)
2. Go to [Play Console](https://play.google.com/console)
3. Your app → **Testing → Internal testing**
4. Click **Create new release**
5. Upload the `.aab` file
6. Add release notes → **Save → Review → Publish**
7. Go to **Testers** tab → add tester email addresses
8. Testers receive an opt-in email link → install via Play Store

### Adding more testers later

Play Console → Internal testing → Testers → Edit → add emails → Save.  
No new build needed.

---

## 6. Play Store — Going Live (Production)

Production = Google reviews the app (1–7 days first time, faster for updates).

### Complete the Store Listing first

These must be filled in Play Console before submitting:

| Item | Where |
|---|---|
| Short description (80 chars) | Store listing |
| Full description (4000 chars) | Store listing |
| At least 4 screenshots (phone) | Store listing → Graphics |
| Feature graphic (1024×500 px) | Store listing → Graphics |
| Privacy policy URL | App content → Privacy policy |
| Content rating questionnaire | App content → Content rating |
| Data safety form | App content → Data safety |
| Target audience (age group) | App content → Target audience |

### Option A — Promote internal testing release (no new build)

If no code has changed since the internal build:

1. Play Console → **Internal testing → Releases**
2. Find the release → click **Promote release → Production**
3. Add release notes → Submit for review

### Option B — Fresh production build (code changed)

```bash
cd apps/mobile
eas build --profile production --platform android
```

Upload the new `.aab` to Play Console → **Production → Create new release**.

### Automated submit (optional)

```bash
eas submit --profile production --platform android
```

Requires `google-service-account.json` at `apps/mobile/google-service-account.json`  
(different from `google-services.json` — this is your Play Console service account key).

---

## 7. OTA Updates (EAS Update)

OTA = Over The Air. Push JS/UI changes to users **without a new build or Play Store upload**.

Users receive the update automatically on next app launch. No reinstall needed.

### Push an OTA update to production users

```bash
cd apps/mobile
eas update --branch production --message "describe what changed"
```

### Push an OTA update to staging/testers

```bash
cd apps/mobile
eas update --branch staging --message "describe what changed"
```

### Check update status

```bash
eas update:list
```

### OTA limitations

OTA updates **cannot** change:
- Native packages (anything in `node_modules` with Android/iOS native code)
- `app.config.js` plugins, permissions, or package name
- App icon or splash screen
- `version` in `app.config.js` (triggers a new `runtimeVersion`)

For any of the above, you need a full EAS build + Play Store upload.

---

## 8. Update Decision Rule

| What changed | Command needed |
|---|---|
| UI fix, new screen, style change | `eas update --branch production` |
| Bug fix in TypeScript/React | `eas update --branch production` |
| New API endpoint wired up | `eas update --branch production` |
| Story backend connected | `eas update --branch production` |
| Text/copy change | `eas update --branch production` |
| New npm package (JS-only, no native) | `eas update --branch production` |
| New npm package with native Android/iOS code | Full build + Play Store upload |
| Added/removed `app.config.js` plugin | Full build + Play Store upload |
| Changed Android permissions | Full build + Play Store upload |
| Bumped `version` in `app.config.js` | Full build + Play Store upload |
| Changed icon or splash | Full build + Play Store upload |

> **Rule of thumb:** If you ran `npm install <package>` and it has native code, rebuild. Everything else is an OTA update.

---

## 9. Versioning

Managed in `apps/mobile/app.config.js`:

```js
version: '1.0.0',   // shown to users in Play Store
```

The `runtimeVersion` policy is set to `appVersion` — meaning OTA updates only apply to users on the **same app version**. When you bump `version`, users on the old version keep the old OTA updates until they update the app from Play Store.

### When to bump the version

- Any time you do a full Play Store build (new `.aab` upload)
- Follow semantic versioning: `1.0.0` → `1.0.1` (patch), `1.1.0` (minor feature), `2.0.0` (major)

### Android version code

`autoIncrement: true` in the production `eas.json` profile handles this automatically — EAS increments the Android `versionCode` on every production build.

---

## 10. Troubleshooting

### Metro bundler crashes / weird import errors
```bash
npx expo start --clear
```

### EAS build fails — dependency issue
```bash
cd apps/mobile
npm install
eas build --profile production --platform android --clear-cache
```

### OTA update not appearing on device
- User must open the app (not just background it)
- Check update was published: `eas update:list`
- Verify the branch name matches (`production` not `main`)

### `google-services.json` missing error
Place the file at `apps/mobile/google-services.json`.  
Download it from Firebase Console → Project settings → Your apps → Android app.

### Play Store rejects the build — target SDK too low
Expo 54 targets SDK 35 by default which meets current Play Store requirements. If this changes, update Expo SDK version.

### `usesCleartextTraffic` warning in Play Console
Already handled — it is `false` in production builds automatically.

### Check which build profile was used
```bash
eas build:list --limit 5
```

---

## Quick Reference Card

```bash
# ── LOCAL DEV ──────────────────────────────────────
npx expo start                        # start dev server
npx expo start --clear                # start with cleared cache
npx expo start --tunnel               # start with tunnel (different network)

# ── BUILDS ─────────────────────────────────────────
eas build --profile staging --platform android     # APK for team testing
eas build --profile production --platform android  # AAB for Play Store
eas build:list                                     # view recent builds

# ── OTA UPDATES ────────────────────────────────────
eas update --branch production --message "what changed"   # push to live users
eas update --branch staging --message "what changed"      # push to testers
eas update:list                                           # view recent updates

# ── PLAY STORE SUBMIT (automated) ──────────────────
eas submit --profile production --platform android

# ── ACCOUNT ────────────────────────────────────────
eas login                             # log in to Expo
eas whoami                            # check who you're logged in as
eas build:configure                   # link project to EAS (one-time)
```

---

## Links

- EAS Dashboard: https://expo.dev/accounts/comlinkr/projects/comlinkr
- Play Console: https://play.google.com/console
- Expo Docs (EAS Build): https://docs.expo.dev/build/introduction/
- Expo Docs (EAS Update): https://docs.expo.dev/eas-update/introduction/
