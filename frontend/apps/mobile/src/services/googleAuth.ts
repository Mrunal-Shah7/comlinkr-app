import { Platform } from "react-native";
import Constants from "expo-constants";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let configured = false;

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

/**
 * Lazy-load the native module. A static import crashes Expo Go / any binary
 * without RNGoogleSignin linked, which also breaks expo-router route loading.
 */
function loadGoogleSignIn(): GoogleSignInModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@react-native-google-signin/google-signin");
}

export function isGoogleSignInConfigured(): boolean {
  if (Platform.OS === "ios") {
    return Boolean(webClientId && iosClientId);
  }
  // Android needs webClientId to mint an idToken for our backend.
  return Boolean(webClientId);
}

export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function ensureConfigured(GoogleSignin: GoogleSignInModule["GoogleSignin"]): void {
  if (configured) return;
  if (!isGoogleSignInConfigured()) {
    throw new Error(
      "Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID on iOS), then rebuild the app.",
    );
  }
  GoogleSignin.configure({
    webClientId: webClientId!,
    iosClientId: Platform.OS === "ios" ? iosClientId : undefined,
    offlineAccess: false,
  });
  configured = true;
}

/**
 * Native Google Sign-In. Returns an ID token for POST /auth/google.
 * Does not work in Expo Go — requires a development or production build.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  if (isExpoGo()) {
    throw new Error(
      "Google sign-in does not work in Expo Go. Install a development or production build of ComLinkr.",
    );
  }

  const {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes,
  } = loadGoogleSignIn();

  ensureConfigured(GoogleSignin);

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      // User cancelled the account picker / sheet.
      return null;
    }

    let idToken = response.data.idToken;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }
    if (!idToken) {
      throw new Error(
        "Google sign-in succeeded but no ID token was returned. Confirm EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID matches your Web client in Google Cloud Console.",
      );
    }
    return idToken;
  } catch (e: unknown) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) {
      throw new Error("Google sign-in is already in progress.");
    }
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services is required for Google sign-in on this device.");
    }
    throw e;
  }
}
