import { Alert } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../store/auth.store";
import { appAlert } from '../ui/Dialogs';

/**
 * Central gate for any account-based action (post, comment, save, message, RSVP,
 * roommate-match, list a property/restaurant, etc.). Guests may browse freely —
 * this hook only fires when a guest (or a signed-in user who hasn't finished
 * onboarding) attempts an action that requires a full account.
 */
export function useRequireAuth() {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const onboardingDone = useAuthStore((s) => s.user?.onboardingDone ?? false);

  /**
   * Returns true and runs `action` immediately if the user is signed in and
   * onboarded. Otherwise shows a sign-in prompt and returns false without
   * running `action`.
   */
  const requireAuth = (action?: () => void, message?: string): boolean => {
    if (!isAuthed) {
      appAlert(
        "Sign in required",
        message ?? "Create a free account or sign in to continue.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => router.push("/(auth)/login" as any),
          },
        ]
      );
      return false;
    }
    if (!onboardingDone) {
      appAlert(
        "Finish setting up your account",
        "Complete your profile to unlock this feature.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Continue Setup",
            onPress: () => router.push("/(auth)/onboarding" as any),
          },
        ]
      );
      return false;
    }
    action?.();
    return true;
  };

  return { requireAuth, isAuthed, onboardingDone, canUseAccountFeatures: isAuthed && onboardingDone };
}
