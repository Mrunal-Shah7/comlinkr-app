import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/auth.store";
import { useSidebarStore } from "../../src/store/sidebar.store";
import authService from "../../src/services/http/authService";
import {
  getGoogleIdToken,
  isExpoGo,
  isGoogleSignInConfigured,
} from "../../src/services/googleAuth";
import { signInWithApple } from "../../src/services/appleAuth"; // SPRINT-39:
import Input from "../../src/shared/ui/Input";
import OAuthUsernamePickerModal from "../../components/OAuthUsernamePickerModal";
import { Colors } from "../../src/theme/colors";
import { useTheme } from "../../src/theme/useTheme";
import { rs } from "../../src/utils/responsive";
import { Image } from "expo-image";
import { appAlert } from '../../src/shared/ui/Dialogs';

/* ── Gradient Text helper ────────────────────────── */
function GradientText({
  text,
  colors = ["#1A6BAE", "#30855B"],
  style,
}: {
  text: string;
  colors?: string[];
  style: any;
}) {
  return (
    <MaskedView
      maskElement={<Text style={[style, { backgroundColor: "transparent" }]}>{text}</Text>}
    >
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

function formatLoginError(e: unknown): string {
  const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
  const lower = msg.toLowerCase();
  if (
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("econnrefused") ||
    lower.includes("timeout") ||
    lower.includes("could not connect")
  ) {
    return "Cannot reach the server. On a real device set EXPO_PUBLIC_API_BASE_URL to http://YOUR_PC_LAN_IP:4000/api (not localhost).";
  }
  return msg || "Invalid email or password";
}

export default function LoginScreen() {
  const syncFromApiLogin = useAuthStore((s) => s.syncFromApiLogin);
  const { isDark, tc } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);
  const [usernamePickerVisible, setUsernamePickerVisible] = useState(false);
  const [oauthTempToken, setOauthTempToken] = useState("");
  const [oauthProvider, setOauthProvider] = useState<"google" | "apple">("google");

  const passwordRef = useRef<TextInput>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in both fields");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authService.login({ email: email.trim(), password });
      const { user: profile, sessionCookie } = res.data;
      const { onboardingDone } = await syncFromApiLogin(profile, sessionCookie);
      void useSidebarStore.getState().fetchSidebarData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace((onboardingDone ? "/(tabs)/feed" : "/(auth)/onboarding") as any);
    } catch (e: unknown) {
      setError(formatLoginError(e));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: string) {
    if (loading || socialLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (provider === "Google") {
      if (isExpoGo()) {
        appAlert(
          "Google sign-in unavailable",
          "Google Sign-In requires a development or production build of ComLinkr. It does not work in Expo Go.",
        );
        return;
      }
      if (!isGoogleSignInConfigured()) {
        appAlert(
          "Google sign-in unavailable",
          "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID on iOS), then rebuild the app.",
        );
        return;
      }
      setError("");
      setSocialLoading(true);
      setLoadingProvider("google");
      try {
        const idToken = await getGoogleIdToken();
        if (!idToken) return;
        const result = await authService.googleAuth(idToken);
        if ("needsUsername" in result && result.needsUsername) {
          setOauthTempToken(result.tempToken);
          setOauthProvider("google");
          setUsernamePickerVisible(true);
          return;
        }
        if (!("data" in result)) {
          setError("Google sign-in returned an unexpected response.");
          return;
        }
        const { user: profile, sessionCookie } = result.data;
        const { onboardingDone } = await syncFromApiLogin(profile, sessionCookie);
        void useSidebarStore.getState().fetchSidebarData();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace((onboardingDone ? "/(tabs)/feed" : "/(auth)/onboarding") as any);
      } catch (e: unknown) {
        setError(formatLoginError(e));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setSocialLoading(false);
        setLoadingProvider(null);
      }
      return;
    }
    if (provider === "Apple") {
      // SPRINT-39: shared Apple helper; authorizationCode included when Apple provides it
      if (Platform.OS !== "ios") {
        appAlert("Apple Sign In", "Apple sign-in is only available on iOS devices.");
        return;
      }
      setError("");
      try {
        setSocialLoading(true);
        setLoadingProvider("apple");
        const result = await signInWithApple(); // SPRINT-39:
        if ("needsUsername" in result && result.needsUsername) {
          setOauthTempToken(result.tempToken);
          setOauthProvider("apple");
          setUsernamePickerVisible(true);
          return;
        }
        if (!("data" in result)) {
          setError("Apple sign-in returned an unexpected response.");
          return;
        }
        const { user: profile, sessionCookie } = result.data;
        const { onboardingDone } = await syncFromApiLogin(profile, sessionCookie);
        void useSidebarStore.getState().fetchSidebarData();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace((onboardingDone ? "/(tabs)/feed" : "/(auth)/onboarding") as any);
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
        if (code === "ERR_REQUEST_CANCELED") return;
        const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
        setError(msg || "Apple sign-in failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setSocialLoading(false);
        setLoadingProvider(null);
      }
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: tc.pageBg }]}>
      <OAuthUsernamePickerModal
        visible={usernamePickerVisible}
        tempToken={oauthTempToken}
        provider={oauthProvider}
        onSuccess={async (user, sessionCookie) => {
          const { onboardingDone } = await syncFromApiLogin(user, sessionCookie);
          void useSidebarStore.getState().fetchSidebarData();
          setUsernamePickerVisible(false);
          setOauthTempToken("");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace((onboardingDone ? "/(tabs)/feed" : "/(auth)/onboarding") as any);
        }}
        onCancel={() => {
          setUsernamePickerVisible(false);
          setOauthTempToken("");
        }}
      />
      <LinearGradient
        colors={isDark ? ["#080F1E", "#0D1526"] : ["#EEF6FF", "#F5FAF5"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoWrap}>
                <Image
                  source={require("../../assets/images/brand/app_icon_1024.png")}
                  style={styles.logo}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            </View>

            {/* Card */}
            <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: isDark ? tc.borderLight : "rgba(26,107,174,0.06)" }]}>
              <GradientText
                text="Welcome back"
                style={styles.heading}
                colors={["#1A6BAE", "#30855B"]}
              />
              <Text style={[styles.subheading, { color: tc.textSecondary }]}>
                Sign in to continue exploring
              </Text>

              {/* Social Buttons */}
              <View style={styles.socialGroup}>
                <Pressable
                  onPress={() => void handleSocialLogin("Google")}
                  disabled={loading || socialLoading}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    { borderColor: tc.borderLight, backgroundColor: isDark ? tc.inputBg : "#FAFAFA" },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    (loading || socialLoading) && loadingProvider !== "google" && { opacity: 0.5 },
                  ]}
                >
                  <View style={styles.socialBtnInner}>
                    {loadingProvider === "google" ? (
                      <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                      <>
                        <Ionicons name="logo-google" size={rs(20)} color="#4285F4" />
                        <GradientText
                          text="Continue with Google"
                          style={styles.socialLabel}
                          colors={["#4285F4", "#1A6BAE"]}
                        />
                      </>
                    )}
                  </View>
                </Pressable>

                {Platform.OS === "ios" ? (
                  <Pressable
                    onPress={() => void handleSocialLogin("Apple")}
                    disabled={loading || socialLoading}
                    style={({ pressed }) => [
                      styles.socialBtn,
                      { borderColor: tc.borderLight, backgroundColor: isDark ? tc.inputBg : "#FAFAFA" },
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                      (loading || socialLoading) && loadingProvider !== "apple" && { opacity: 0.5 },
                    ]}
                  >
                    <View style={styles.socialBtnInner}>
                      {loadingProvider === "apple" ? (
                        <ActivityIndicator size="small" color={isDark ? "#FFFFFF" : "#000000"} />
                      ) : (
                        <>
                          <Ionicons name="logo-apple" size={22} color={isDark ? "#FFFFFF" : "#000000"} />
                          <Text style={[styles.socialLabel, { color: tc.textPrimary }]}>Continue with Apple</Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                ) : null}
              </View>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: tc.borderLight }]} />
                <Text style={[styles.dividerText, { color: tc.textTertiary }]}>or sign in with email</Text>
                <View style={[styles.dividerLine, { backgroundColor: tc.borderLight }]} />
              </View>

              {/* Form */}
              <View style={styles.form}>
                <Input
                  label="Email address"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <Input
                  ref={passwordRef}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  rightIcon={
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={tc.textTertiary}
                      />
                    </Pressable>
                  }
                />
              </View>

              {/* Error */}
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: isDark ? "#2D0F0F" : "#FEF2F2" }]}>
                  <Ionicons name="alert-circle" size={rs(16)} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Forgot */}
              <Pressable style={styles.forgotRow} onPress={() => router.push("/(auth)/forgot-password" as any)}>
                <GradientText
                  text="Forgot password?"
                  style={styles.forgotText}
                  colors={["#1A6BAE", "#0066DD"]}
                />
              </Pressable>

              {/* Sign In Button */}
              <Pressable
                onPress={handleLogin}
                disabled={loading || socialLoading}
                style={({ pressed }) => [
                  styles.loginBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  (loading || socialLoading) && { opacity: 0.7 },
                ]}
              >
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtnGradient}
                >
                  <Text style={styles.loginBtnText}>
                    {loading || socialLoading ? "Signing in..." : "Sign In"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: tc.textSecondary }]}>New to ComLinkr? </Text>
              <Pressable onPress={() => router.push("/(auth)/signup")}>
                <GradientText
                  text="Create account"
                  style={styles.footerLink}
                  colors={["#1A6BAE", "#30855B"]}
                />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EBF5FF",
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: rs(20),
    paddingBottom: rs(20),
    paddingTop: rs(8),
    justifyContent: "center",
    alignItems: "center",
  },

  /* Decorative */
  decorCircle1: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(26,107,174, 0.08)",
    top: -60,
    right: -80,
  },
  decorCircle2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(48,133,91, 0.07)",
    bottom: 60,
    left: -60,
  },

  /* Logo */
  logoSection: {
    alignItems: "center",
    marginBottom: rs(14),
  },
  logoWrap: {
    width: rs(104),
    height: rs(104),
    borderRadius: rs(28),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A6BAE",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 2,
    borderColor: "rgba(26,107,174,0.12)",
  },
  logo: {
    width: rs(88),
    height: rs(88),
    borderRadius: rs(20),
  },
  appName: {
    fontSize: rs(22),
    fontWeight: "900",
    color: Colors.brand.blue,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: rs(12),
    color: Colors.text.secondary,
    marginTop: rs(2),
    fontWeight: "500",
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: rs(24),
    padding: rs(22),
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  heading: {
    fontSize: rs(22),
    fontWeight: "900",
    color: Colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: rs(4),
  },
  subheading: {
    fontSize: rs(13),
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: rs(14),
  },

  /* Social Buttons */
  socialGroup: { gap: rs(8), marginBottom: rs(14) },
  socialBtn: {
    height: rs(46),
    borderRadius: rs(12),
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  socialBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(10),
  },
  socialBtnPressed: {
    backgroundColor: "#F3F4F6",
    transform: [{ scale: 0.98 }],
  },
  socialLabel: {
    fontSize: rs(15),
    fontWeight: "600",
    color: Colors.text.primary,
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rs(12),
    gap: rs(10),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: rs(12),
    color: "#9CA3AF",
    fontWeight: "500",
  },

  /* Form */
  form: { gap: 10 },

  /* Error */
  errorBox: {
    marginTop: rs(12),
    backgroundColor: "#FEF2F2",
    borderRadius: rs(12),
    paddingHorizontal: rs(14),
    paddingVertical: rs(11),
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
  },
  errorText: {
    fontSize: rs(13),
    color: "#EF4444",
    fontWeight: "500",
    flex: 1,
  },

  /* Forgot */
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: rs(8),
    marginBottom: rs(14),
  },
  forgotText: {
    fontSize: rs(13),
    fontWeight: "600",
    color: Colors.brand.blue,
  },

  /* Sign In Button */
  loginBtn: {
    borderRadius: rs(16),
    overflow: "hidden",
    shadowColor: "#1A6BAE",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  loginBtnGradient: {
    height: rs(50),
    borderRadius: rs(14),
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: {
    fontSize: rs(17),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },

  /* Footer */
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: rs(16),
  },
  footerText: {
    fontSize: rs(14),
    color: Colors.text.secondary,
  },
  footerLink: {
    fontSize: rs(14),
    fontWeight: "700",
    color: Colors.brand.blue,
  },
});
