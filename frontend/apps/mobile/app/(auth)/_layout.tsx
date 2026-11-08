import { Stack } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import { useTheme } from "../../src/theme/useTheme";

// Plan 02: sign-in screens use the native stack and the platform's push animation, like the rest of the app.
export default function AuthLayout() {
  const reduceMotion = useReducedMotion();
  const { tc } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tc.pageBg }, animation: reduceMotion ? "fade" : "default" }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
