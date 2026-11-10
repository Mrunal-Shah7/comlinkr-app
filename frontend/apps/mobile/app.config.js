// apps/mobile/app.config.js

module.exports = ({ config }) => ({
  ...config,
  name: 'ComLinkr',
  slug: 'comlinkr',
  scheme: 'comlinkr',
  version: '1.0.4',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',

  icon: './assets/images/brand/app_icon_1024.png',

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.comlinkr.app',
    usesAppleSignIn: true,
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
//    associatedDomains: ['applinks:comlinkr.app'],
    associatedDomains: ['applinks:www.comlinkr.com'],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Lets Reanimated run at 120 fps on ProMotion iPhones (expo-animation skill). Takes effect on the next iOS build.
      CADisableMinimumFrameDurationOnPhone: true,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: process.env.APP_ENV !== 'production',
      },
      NSCameraUsageDescription:
        'ComLinkr uses your camera to scan event ticket QR codes at check-in and to take photos you choose to share.', // SPRINT-42: unified camera purpose string
      NSPhotoLibraryUsageDescription:
        'ComLinkr accesses your photo library so you can choose and upload existing photos when creating a restaurant listing, marketplace listing, or community post.',
      NSMicrophoneUsageDescription: // SPRINT-40: reviewed App Store microphone purpose string
        'ComLinkr uses your microphone to record voice messages you choose to send in chats.', // SPRINT-40:
    },
  },

  android: {
    // Predictive back (Android 13+/14+ edge-swipe preview) completes the screen
    // pop at the native level before React Native's BackHandler "hardwareBackPress"
    // listener runs. chat.tsx relies on that JS listener to intercept back and
    // close an open thread instead of leaving the screen (see handleThreadBack) —
    // with predictive back on, that interception can lose the race, showing a
    // blank/black frame or exiting past the intended screen. Disabling it keeps
    // back navigation on the classic event both platforms' guards were built for.
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/images/brand/app_icon_1024.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'com.comlinkr.app',
    googleServicesFile: './google-services.json',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
//        data: [{ scheme: 'https', host: 'comlinkr.app' }],
        data: [{ scheme: 'https', host: 'www.comlinkr.com', pathPrefix: '/app' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },

  web: {
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
    output: 'static',
  },

  updates: {
    url: 'https://u.expo.dev/cef56468-066a-4761-abe6-b3171e1e2d06',
    enabled: process.env.APP_ENV !== 'development',
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },

  runtimeVersion: {
    policy: 'appVersion',
  },

  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-updates',
    '@react-native-community/datetimepicker',
    'expo-asset',
    'expo-font',
    'expo-image',
    'expo-status-bar',
    // Android: the navigation bar starts hidden; a swipe up from the bottom edge shows it for a moment.
    ['expo-navigation-bar', { hidden: true }],
    'expo-web-browser',
    // Plan 08: the city comes from the phone's location, read once while the app is open.
    ['expo-location', {
      locationWhenInUsePermission: 'ComLinkr uses your location to set your city, so what you see and post belongs to where you are.',
      locationAlwaysAndWhenInUsePermission: false,
      isAndroidBackgroundLocationEnabled: false,
    }],
    [
      'expo-build-properties',
      {
        android: {
          // Non-production builds allow cleartext (http) for local/dev API hosts.
          usesCleartextTraffic: process.env.APP_ENV !== 'production',
        },
        ios: {
          extraPods: [
            { name: 'GoogleUtilities', modular_headers: true },
            { name: 'FirebaseCoreInternal', modular_headers: true },
            { name: 'RecaptchaInterop', modular_headers: true },
            { name: 'AppCheckCore', modular_headers: true },
          ],
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/brand/splash_icon_1024.png',
        imageWidth: 160,
      },
    ],
    'expo-video',
    [ // SPRINT-40: declare native microphone permissions through the supported Expo audio plugin
      'expo-audio', // SPRINT-40:
      { // SPRINT-40:
        microphonePermission: // SPRINT-40:
          'ComLinkr uses your microphone to record voice messages you choose to send in chats.', // SPRINT-40:
        recordAudioAndroid: true, // SPRINT-40:
        enableBackgroundRecording: false, // SPRINT-40: recordings are cancelled when the app backgrounds
        // Voice messages are foreground, user-initiated playback only (chat audio
        // bubbles) — nothing plays after the app backgrounds/locks, so the plugin's
        // default UIBackgroundModes:"audio" entitlement does not apply. Explicitly
        // disabled per Apple App Review Guideline 2.5.4 (Submission ID 27abc70d).
        enableBackgroundPlayback: false,
      }, // SPRINT-40:
    ], // SPRINT-40:
    [ // SPRINT-42: expo-camera plugin with exact check-in + share permission string
      'expo-camera', // SPRINT-42:
      { // SPRINT-42:
        cameraPermission: // SPRINT-42:
          'ComLinkr uses your camera to scan event ticket QR codes at check-in and to take photos you choose to share.', // SPRINT-42:
        recordAudioAndroid: false, // SPRINT-42: scanner does not need mic
      }, // SPRINT-42:
    ], // SPRINT-42:
    [
      'expo-notifications',
      { icon: './assets/images/brand/app_icon_1024.png', color: '#0076EB' },
    ],
    // React Native Firebase — handles GoogleService-Info.plist (iOS) & google-services.json (Android)
    '@react-native-firebase/app',
    // Disable IDFA collection in Firebase Analytics so no App Tracking Transparency prompt is required.
    './plugins/withFirebaseAnalyticsNoAdId',
    // Native Google Sign-In (does not work in Expo Go — requires a dev/prod build)
    [
      '@react-native-google-signin/google-signin',
      {
        // Reversed iOS OAuth client ID (from EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
        iosUrlScheme:
          'com.googleusercontent.apps.178685561232-shvmr9g6c3s2u1grsi4kr1labrmcl571',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.comlinkr.com/api',
    appEnv: process.env.APP_ENV || 'development',
    eas: {
      projectId: 'cef56468-066a-4761-abe6-b3171e1e2d06',
    },
  },
});
