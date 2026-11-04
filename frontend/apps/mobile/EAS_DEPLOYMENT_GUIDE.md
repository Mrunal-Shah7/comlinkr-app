# ComLinkr — EAS Build & Deployment Guide
### Android (Google Play Store) + iOS (Apple App Store)
> Run all `eas` commands from `apps/mobile/` directory on the machine that has the complete codebase (UI + API integration).

---

## TABLE OF CONTENTS
1. [Prerequisites & One-Time Setup](#1-prerequisites--one-time-setup)
2. [Google Play Store — Account Setup](#2-google-play-store--account-setup)
3. [Apple App Store — Account Setup](#3-apple-app-store--account-setup)
4. [EAS Project Configuration](#4-eas-project-configuration)
5. [Building for Android](#5-building-for-android)
6. [Building for iOS](#6-building-for-ios)
7. [Submitting to Google Play Store](#7-submitting-to-google-play-store)
8. [Submitting to Apple App Store](#8-submitting-to-apple-app-store)
9. [Store Listing — What to Fill](#9-store-listing--what-to-fill)
10. [App Review Process](#10-app-review-process)
11. [OTA Updates After Going Live](#11-ota-updates-after-going-live)
12. [Version Management](#12-version-management)
13. [Common Errors & Fixes](#13-common-errors--fixes)
14. [Full Workflow Cheatsheet](#14-full-workflow-cheatsheet)

---

## 1. Prerequisites & One-Time Setup

### 1.1 Install Node, pnpm, and EAS CLI
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version
```

### 1.2 Create an Expo Account
1. Go to **https://expo.dev**
2. Click **Sign Up**
3. Fill in: Username, Email, Password
4. Verify your email address
5. Come back to terminal and login:
```bash
eas login
# Enter your Expo username and password
```

### 1.3 Initialize EAS in the project
```bash
cd apps/mobile
eas init
# This creates/links a project ID in your Expo account
# Press Y when asked to create a new project
```
After this, a field `extra.eas.projectId` will be added to your `app.json` automatically.

---

## 2. Google Play Store — Account Setup

> Cost: **$25 one-time registration fee** (USD, non-refundable)

### 2.1 Create Google Play Developer Account
1. Go to **https://play.google.com/console**
2. Sign in with a Google account (create one dedicated to the app if needed)
3. Click **"Get started"**
4. Fill in:
   - Developer name: `Comlinkr` (this shows publicly on the store)
   - Email address: your contact email
   - Phone number: for verification
5. Pay the **$25 registration fee** via credit/debit card
6. Complete **identity verification**:
   - Google will ask for your **D-U-N-S number** (for organisations) OR
   - Personal identity verification (government ID upload)
   - Verification takes **1–3 business days**
7. Once verified, your account is active

### 2.2 Create the App in Play Console
1. In Play Console, click **"Create app"**
2. Fill in:
   - App name: `ComLinkr`
   - Default language: `English (United States)`
   - App or game: `App`
   - Free or paid: `Free`
3. Check both declarations (policies and export laws)
4. Click **"Create app"**

### 2.3 Generate Google Play Service Account Key (for EAS auto-submit)
This allows EAS to upload builds automatically without you logging in each time.

1. In Play Console → **Setup → API access**
2. Click **"Link to a Google Cloud project"**
   - If no project exists, click **"Create a new Google Cloud project"**
3. Click **"View in Google Cloud Platform"** — this opens Google Cloud Console
4. In Google Cloud Console:
   - Go to **IAM & Admin → Service Accounts**
   - Click **"+ Create Service Account"**
   - Name: `eas-play-store-upload`
   - Click **"Create and Continue"**
   - Role: Select **"Service Account User"**
   - Click **Done**
5. Click on the created service account → **Keys tab → Add Key → Create new key → JSON**
6. A `.json` file downloads — rename it to `google-play-key.json`
7. Place it at `apps/mobile/google-play-key.json`
8. **Add to `.gitignore` immediately** — never commit this file:
   ```
   google-play-key.json
   ```
9. Back in Play Console → **Setup → API access**:
   - Find your service account in the list
   - Click **"Grant access"**
   - Role: **Release Manager**
   - Click **"Invite user"** → **"Send invite"**

---

## 3. Apple App Store — Account Setup

> Cost: **$99/year** (USD, billed annually)

### 3.1 Create Apple Developer Account
1. Go to **https://developer.apple.com/programs/enroll/**
2. Sign in with your Apple ID (create one at appleid.apple.com if needed)
3. Select enrollment type:
   - **Individual**: if the app is under your personal name
   - **Organisation**: if under a company name (requires D-U-N-S number — takes 1–5 days to get)
4. Fill in all personal/organisation details
5. Pay **$99/year** with credit/debit card
6. Apple will verify your account — takes **24–48 hours** for Individual, up to **5 business days** for Organisation

### 3.2 Create App in App Store Connect
1. Go to **https://appstoreconnect.apple.com**
2. Sign in with your Apple ID
3. Click **"My Apps"** → **"+"** → **"New App"**
4. Fill in:
   - Platforms: `iOS`
   - Name: `ComLinkr`
   - Primary Language: `English (U.S.)`
   - Bundle ID: `com.comlinkr.app`
     - If not listed, go to **https://developer.apple.com/account/resources/identifiers**
     - Click **"+"** → App IDs → App → Continue
     - Description: `ComLinkr`, Bundle ID: `com.comlinkr.app` → Register
   - SKU: `comlinkr-001` (internal reference, not shown publicly)
   - User Access: `Full Access`
5. Click **"Create"**
6. Note the **Apple ID number** shown on the app page (e.g. `1234567890`) — needed in `eas.json`

### 3.3 Find your Apple Team ID
1. Go to **https://developer.apple.com/account**
2. Your **Team ID** is shown in the top-right corner (e.g. `A1B2C3D4E5`)

---

## 4. EAS Project Configuration

### 4.1 Update `app.json`
```json
{
  "expo": {
    "name": "ComLinkr",
    "slug": "comlinkr",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/brand/logo.jpg",
    "scheme": "comlinkr",
    "userInterfaceStyle": "light",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID"
    },
    "android": {
      "package": "com.comlinkr.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/brand/logo.jpg",
        "backgroundColor": "#0076EB"
      },
      "permissions": []
    },
    "ios": {
      "bundleIdentifier": "com.comlinkr.app",
      "buildNumber": "1",
      "supportsTablet": false
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    }
  }
}
```
> Replace `YOUR_PROJECT_ID` with the ID shown after running `eas init`

### 4.2 Create `eas.json`
```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {}
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your@apple.com",
        "ascAppId": "1234567890",
        "appleTeamId": "A1B2C3D4E5"
      }
    }
  }
}
```
> Replace `appleId`, `ascAppId`, `appleTeamId` with your actual values from Step 3

### 4.3 Create `.env` for environment variables
```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=https://api.comlinkr.com
```
Add `.env` to `.gitignore` — share this file privately with teammates.

---

## 5. Building for Android

### 5.1 First-time build
```bash
cd apps/mobile
eas build --platform android --profile production
```
- EAS builds on **Expo's cloud servers** — no Android Studio needed
- First time: EAS auto-generates a **keystore** (signing certificate) and stores it on Expo's servers
- Build takes **10–15 minutes**
- When complete, you get a download link for the `.aab` file

### 5.2 What the keystore is
- The keystore is the **signing certificate** that identifies your app
- **Never lose it** — if you lose it, you can never update your app on Play Store
- EAS stores it safely on their servers by default
- To download a backup: `eas credentials` → Android → download keystore

### 5.3 Test build before production (optional but recommended)
```bash
# Builds a plain .apk you can install directly on any Android phone
eas build --platform android --profile preview
```
- Download the `.apk` from the EAS dashboard
- Install directly on your Android phone to test before going live

---

## 6. Building for iOS

### 6.1 First-time build
```bash
cd apps/mobile
eas build --platform ios --profile production
```
- First time, EAS will ask several questions:
  - **"Generate a new Apple Distribution Certificate?"** → Press **Y**
  - **"Generate a new Apple Provisioning Profile?"** → Press **Y**
  - EAS handles all signing automatically — no Xcode needed
- Build takes **15–25 minutes**
- When complete, you get a download link for the `.ipa` file

### 6.2 Apple ID authentication during build
- EAS will prompt for your **Apple ID and password**
- If you have **2-factor authentication** (you will), it will ask for the 6-digit code sent to your iPhone
- Enter it when prompted — you have ~30 seconds

### 6.3 Test on iOS Simulator (optional)
```bash
# Builds a simulator version (only works on Mac with Xcode)
eas build --platform ios --profile preview
```

---

## 7. Submitting to Google Play Store

### 7.1 Auto-submit via EAS (recommended)
```bash
eas submit --platform android --profile production
```
- EAS uses `google-play-key.json` to authenticate
- Uploads the `.aab` to **Internal Testing track** automatically
- Takes 2–5 minutes

### 7.2 Manual submit (alternative)
1. Download the `.aab` file from EAS dashboard (https://expo.dev)
2. Go to Play Console → your app → **Testing → Internal Testing**
3. Click **"Create new release"**
4. Click **"Upload"** → select your `.aab` file
5. Add release notes → **"Save"** → **"Review release"** → **"Start rollout to Internal Testing"**

### 7.3 Promote from Internal Testing to Production
1. Play Console → **Testing → Internal Testing**
2. Select your release → click **"Promote release"** → **"Production"**
3. Set rollout percentage: `100%`
4. Click **"Start rollout to Production"**
5. Google reviews it — **3–7 business days** for first submission

---

## 8. Submitting to Apple App Store

### 8.1 Auto-submit via EAS (recommended)
```bash
eas submit --platform ios --profile production
```
- EAS uploads the `.ipa` to **TestFlight** automatically
- Prompts for Apple ID, password, and 2FA code

### 8.2 Manual submit (alternative)
1. Download the `.ipa` from EAS dashboard
2. Install **Transporter** app from Mac App Store (free — Mac only)
3. Open Transporter → sign in with Apple ID → drag `.ipa` file → click **Deliver**

### 8.3 Submit from TestFlight to App Store Review
1. App Store Connect → your app → **TestFlight** tab → confirm the build appears (takes ~15 min to process)
2. Go to **App Store tab** → select your iOS version
3. Under **"Build"** section → click **"+"** → select the build from TestFlight
4. Fill in all required fields (see Section 9)
5. Click **"Add for Review"** → **"Submit to App Review"**
6. Apple reviews it — **1–3 business days**

---

## 9. Store Listing — What to Fill

### 9.1 Google Play Console — Required fields

| Field | What to enter |
|---|---|
| App name | ComLinkr |
| Short description | Discover your new neighbourhood — listings, food, events & community in one app. |
| Full description | Min 80 characters, max 4000. Explain what ComLinkr does, who it's for, key features. |
| App icon | 512×512 PNG, no rounded corners (Play adds them), no alpha/transparency |
| Feature graphic | 1024×500 PNG or JPG — banner shown at top of store listing |
| Screenshots | Min 2, max 8. Size: 320–3840px. Take from real device or emulator |
| Category | Social → Social Networking |
| Tags | community, neighbourhood, local, relocation |
| Privacy Policy URL | Must be a live URL — host a simple page on GitHub Pages or Notion |
| Content rating | Complete the questionnaire in **Policy → App Content** |
| Target audience | Select age group (13+ recommended) |
| Ads declaration | Does your app contain ads? Select No |
| Data safety | Fill in what data you collect (email, location if any) |

### 9.2 App Store Connect — Required fields

| Field | What to enter |
|---|---|
| App name | ComLinkr |
| Subtitle | Find Your Community, Anywhere |
| Description | Max 4000 characters. Describe features clearly. |
| Keywords | community,neighbourhood,local,relocation,discover,listings,food (max 100 chars) |
| Support URL | Link to your website or GitHub |
| Privacy Policy URL | Same live URL as above — mandatory |
| App icon | 1024×1024 PNG, no alpha channel, no rounded corners |
| Screenshots | Required sizes: 6.7" (1290×2796) and 6.5" (1242×2688). At least 3 per size. |
| App Preview (optional) | 30-second video showing app in use |
| Category | Social Networking |
| Age Rating | Complete the questionnaire |
| Sign-In required | If your app requires login, provide: Username: demo@comlinkr.com / Password: Demo@123 |

### 9.3 Privacy Policy (mandatory for both stores)
Create a simple privacy policy page. Easiest free option:

1. Go to **https://www.privacypolicygenerator.info** (free)
2. Fill in your app name, company, email
3. Generate → copy the URL they host for you
4. Paste that URL in both Play Console and App Store Connect

---

## 10. App Review Process

### Google Play Review
| Stage | Timeline |
|---|---|
| First submission | 3–7 business days |
| Updates | 1–3 business days |
| If rejected | Fix issues → re-submit → 1–3 days |

**Common rejection reasons (Android):**
- Missing privacy policy
- Data safety form incomplete
- App crashes on launch
- Screenshots don't match app functionality
- App name too similar to an existing app

### Apple App Review
| Stage | Timeline |
|---|---|
| First submission | 1–3 business days |
| Updates | 24–48 hours |
| If rejected | Fix → resubmit → another 24–48 hrs |

**Common rejection reasons (iOS):**
- Missing privacy policy
- App crashes during review
- Login credentials not provided (Apple reviewer needs to test the app)
- Misleading description or screenshots
- App does not work as described

### If rejected — what to do
1. Read the rejection reason carefully in the email / console
2. Fix the specific issue mentioned
3. For Android: re-upload a new build or update store listing → re-submit
4. For iOS: reply in App Store Connect Resolution Center explaining the fix, or re-submit

---

## 11. OTA Updates After Going Live

OTA (Over-The-Air) updates push JS/UI changes to users **without store review**. Users get updates silently on next app launch.

### What can be updated OTA vs what needs a full build

| Type of change | OTA `eas update` | Full `eas build` + submit |
|---|---|---|
| UI changes, styles, colours | ✅ | |
| New screens (JS only) | ✅ | |
| Text/copy changes | ✅ | |
| Bug fixes in TypeScript | ✅ | |
| New images/assets | ✅ | |
| API URL change | ✅ | |
| New native package (camera, maps etc.) | | ✅ |
| Changes to `app.json` | | ✅ |
| `version` or `versionCode` bump | | ✅ |
| Splash screen / app icon change | | ✅ |

### Push an OTA update
```bash
cd apps/mobile
eas update --branch production --message "Fix feed crash on Android"
```
- Users receive the update within minutes
- No action required from user — happens automatically on next launch

### OTA update branches
```bash
eas update --branch production    # all live users
eas update --branch staging       # internal testers only
```

---

## 12. Version Management

### When to bump version numbers

**For OTA updates** — do NOT change version:
```bash
# Just run:
eas update --branch production --message "description"
```

**For full builds** (new native feature or major release):
```json
// app.json — increment these:
"version": "1.1.0",
"android": { "versionCode": 2 },
"ios": { "buildNumber": "2" }
```
Then run `eas build` + `eas submit` again.

### Versioning convention
```
version:     1.0.0  →  MAJOR.MINOR.PATCH
versionCode: 1      →  increment by 1 every full build (Android)
buildNumber: "1"    →  increment by 1 every full build (iOS)
```

---

## 13. Common Errors & Fixes

| Error | Fix |
|---|---|
| `eas: command not found` | Run `npm install -g eas-cli` |
| `Keystore not found` | Run `eas credentials` to generate |
| `Invalid Apple ID or password` | Check for typos; if using 2FA, generate an **App-Specific Password** at appleid.apple.com |
| `Bundle ID not found` | Register `com.comlinkr.app` at developer.apple.com/account/resources/identifiers |
| `Build failed — Metro bundler error` | Run `npx expo export` locally first to catch JS errors |
| `Google Play: Version code already used` | Increment `versionCode` in `app.json` |
| `App Store: Missing compliance` | In App Store Connect → your build → answer the export compliance question |
| `Play Store: You need to sign the APK` | Use `app-bundle` not `apk` for production — EAS handles signing |
| `eas update` not reaching users | Check `runtimeVersion` in `app.json` matches the installed build |

---

## 14. Full Workflow Cheatsheet

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRST RELEASE (do once)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Create Expo account → eas login
□ Create Google Play account ($25) + verify identity
□ Create Apple Developer account ($99) + verify
□ Create app in Play Console + App Store Connect
□ Generate google-play-key.json → add to .gitignore
□ Update app.json with package name, bundle ID, project ID
□ Create eas.json with build + submit config
□ Run: eas build --platform android --profile production
□ Run: eas build --platform ios --profile production
□ Fill store listings (description, screenshots, privacy policy)
□ Run: eas submit --platform android
□ Run: eas submit --platform ios
□ Play Console: Promote Internal → Production
□ App Store Connect: Submit for Review
□ Wait for review (Android 3–7 days, iOS 1–3 days)
□ APP IS LIVE ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UI/UX UPDATE (any time, no review needed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Make UI changes → git push
□ Friend pulls → verifies API still works
□ Run: eas update --branch production --message "what changed"
□ Users get update silently ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEW FEATURE WITH NATIVE CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Make changes
□ Bump version + versionCode + buildNumber in app.json
□ Run: eas build --platform all --profile production
□ Run: eas submit --platform all
□ Wait for review
□ LIVE ✅
```

---

> **Questions?** Expo docs: https://docs.expo.dev/eas/  
> EAS Build docs: https://docs.expo.dev/build/introduction/  
> EAS Submit docs: https://docs.expo.dev/submit/introduction/
