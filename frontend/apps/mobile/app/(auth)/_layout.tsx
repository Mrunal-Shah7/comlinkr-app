import { useReducedMotion } from "react-native-reanimated";
import { ZoomStack, zoomOptions } from "../../src/shared/navigation/ZoomStack";
import { useTheme } from "../../src/theme/useTheme";

// Design D (plan 01): sign-in screens zoom in like the rest of the app.
export default function AuthLayout() {
  const reduceMotion = useReducedMotion();
  const { tc } = useTheme();
  return (
    <ZoomStack screenOptions={zoomOptions(reduceMotion, tc.pageBg)}>
      <ZoomStack.Screen name="login" />
      <ZoomStack.Screen name="signup" />
      <ZoomStack.Screen name="forgot-password" />
      <ZoomStack.Screen name="onboarding" />
    </ZoomStack>
  );
}
