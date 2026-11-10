// src/features/auth/enterApp.ts: where the app goes once someone is signed in.
// A guest opens sign-in on top of the tabs (tabs → login → sign-up → onboarding). `replace` swapped only the top
// screen for the tabs, so the sign-in screens stayed underneath and Android Back from Explore showed the login
// screen while signed in (TR-028). `dismissTo` pops back to the tabs already in the stack, or replaces the current
// screen with them when there are none (a cold start that began on the login screen).
import { router } from "expo-router";

export function enterApp(onboardingDone: boolean): void {
  if (!onboardingDone) {
    router.replace("/(auth)/onboarding");
    return;
  }
  router.dismissTo("/(tabs)/feed");
}
