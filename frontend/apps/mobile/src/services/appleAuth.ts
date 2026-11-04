/**
 * Shared Sign in with Apple flow for login and signup screens.
 * // SPRINT-39:
 */

import * as AppleAuthentication from "expo-apple-authentication";
import authService from "./http/authService";

export type AppleSignInResult = Awaited<ReturnType<typeof authService.appleAuth>>;

/**
 * Performs AppleAuthentication.signInAsync, assembles the backend request body
 * (including optional authorizationCode), and calls POST /api/auth/apple.
 * Callers own navigation and error presentation (including ERR_REQUEST_CANCELED).
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  // SPRINT-39:
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("Sign in with Apple is not available on this device.");
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const identityToken = credential.identityToken;
  if (!identityToken) {
    throw new Error("Apple sign-in failed: missing identity token.");
  }

  const fullNameFromApple = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(" ");

  // SPRINT-39: pass authorizationCode only when Apple provides a non-empty string
  const authorizationCode =
    typeof credential.authorizationCode === "string" && credential.authorizationCode.trim().length > 0
      ? credential.authorizationCode.trim()
      : undefined;

  return authService.appleAuth(
    identityToken,
    fullNameFromApple || undefined,
    authorizationCode, // SPRINT-39:
  );
}
