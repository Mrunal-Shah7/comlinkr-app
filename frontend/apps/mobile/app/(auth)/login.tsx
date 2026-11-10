import { palette } from "../../src/theme/palette";
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { enterApp } from "../../src/features/auth/enterApp";
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
import { TYPE, display } from '../../src/theme/d';
import { GradientButton, Reveal, SoftButton, useShake } from '../../src/shared/d';
import Reanimated from 'react-native-reanimated';
import { createThemedStyles } from '../../src/theme/themedStyles';

/* ── Gradient Text helper ────────────────────────── */
function GradientText({
  text,
  colors = [palette.brandBlue, palette.brandGreen],
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
  // Errors sit under the field they belong to and the fields shake (design D `login`).
  const [fieldError, setFieldError] = useState<"email" | "password" | "">("");
  const { style: shakeStyle, shake } = useShake();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setFieldError(!email.trim() ? "email" : "password");
      setError(!email.trim() ? "Enter your email or username." : "Enter your password.");
      shake();
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
      enterApp(onboardingDone);
    } catch (e: unknown) {
      setFieldError("password");
      setError(formatLoginError(e));
      shake();
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
        enterApp(onboardingDone);
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
      if (process.env.EXPO_OS !== "ios") {
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
        enterApp(onboardingDone);
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

  const busy = loading || socialLoading;
  const social = (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <SoftButton ghost block outerStyle={{ flex: 1 }} disabled={busy} onPress={() => void handleSocialLogin("Google")}
        label={loadingProvider === "google" ? "Opening Google…" : process.env.EXPO_OS === "ios" ? "Google" : "Continue with Google"}
        icon={<Ionicons name="logo-google" size={19} color={tc.textPrimary} />} />
      {process.env.EXPO_OS === "ios" ? (
        <SoftButton ghost block outerStyle={{ flex: 1 }} disabled={busy} onPress={() => void handleSocialLogin("Apple")}
          label={loadingProvider === "apple" ? "Opening Apple…" : "Apple"}
          icon={<Ionicons name="logo-apple" size={20} color={tc.textPrimary} />} />
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
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
          enterApp(onboardingDone);
        }}
        onCancel={() => {
          setUsernamePickerVisible(false);
          setOauthTempToken("");
        }}
      />
      {/* a soft glow of the brand gradient behind the top of the page */}
      <LinearGradient colors={isDark ? ["rgba(26,107,174,0.30)", "rgba(48,133,91,0.10)", "transparent"] : ["rgba(26,107,174,0.16)", "rgba(48,133,91,0.06)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420 }} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 48, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Reveal i={0} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 }}>
              <Image source={require("../../assets/images/brand/app_icon_1024.png")} style={{ width: 40, height: 40, borderRadius: 12 }} contentFit="contain" />
              <Text style={[display(800), { fontSize: 22, color: tc.textPrimary, letterSpacing: -0.5 }]}>comlinkr</Text>
            </Reveal>

            <Reveal i={1}>
              <Text style={[display(800), { fontSize: 40, lineHeight: 42, letterSpacing: -1.4, color: tc.textPrimary }]}>New city.</Text>
              <GradientText text="Your people." style={[display(800), { fontSize: 40, lineHeight: 44, letterSpacing: -1.4 }]} colors={[palette.skyL54, palette.greenL48]} />
              <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 8, marginBottom: 24 }]}>Homes, food and friends, around the corner.</Text>
            </Reveal>

            <Reveal i={2}>{social}</Reveal>

            <Reveal i={3} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 }}>
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: tc.borderMedium }} />
              <Text style={[TYPE.small, { color: tc.textTertiary }]}>or with email</Text>
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: tc.borderMedium }} />
            </Reveal>

            <Reveal i={4}>
            <Reanimated.View style={[{ gap: 14 }, shakeStyle]}>
              <Input
                error={fieldError === "email" && error ? error : undefined}
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={(v) => { setEmail(v); if (fieldError) { setFieldError(""); setError(""); } }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                icon={<Ionicons name="mail-outline" size={19} color={tc.textTertiary} />}
              />
              <Input
                ref={passwordRef}
                label="Password"
                placeholder="Your password"
                value={password}
                onChangeText={(v) => { setPassword(v); if (fieldError) { setFieldError(""); setError(""); } }}
                error={fieldError === "password" && error ? error : undefined}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                icon={<Ionicons name="lock-closed-outline" size={19} color={tc.textTertiary} />}
                rightIcon={
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={tc.textTertiary} />
                  </Pressable>
                }
              />
            </Reanimated.View>
            </Reveal>

            {error && !fieldError ? (
              <Reveal style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: "rgba(239,68,68,0.12)" }}>
                <Ionicons name="alert-circle" size={17} color={tc.dangerText} />
                <Text style={[TYPE.small, { flex: 1, color: tc.textPrimary }]}>{error}</Text>
              </Reveal>
            ) : null}

            <Reveal i={5} style={{ marginTop: 14 }}>
              <Pressable onPress={() => router.push("/(auth)/forgot-password" as any)} hitSlop={8} style={{ alignSelf: "flex-start", marginBottom: 18 }} accessibilityRole="button">
                <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>Forgot password?</Text>
              </Pressable>
              <GradientButton block label={busy ? "Signing in…" : "Sign in"} loading={loading} disabled={socialLoading} onPress={handleLogin} />
            </Reveal>

            <Reveal i={6} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 26 }}>
              <Text style={[TYPE.body, { color: tc.textSecondary }]}>New here? </Text>
              <Pressable onPress={() => router.push("/(auth)/signup")} hitSlop={8} accessibilityRole="button">
                <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>Create an account</Text>
              </Pressable>
            </Reveal>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = createThemedStyles({
  root: {
    flex: 1,
    backgroundColor: palette.legacyBlueLight,
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
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.brandBlue,
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
    backgroundColor: palette.white,
    borderRadius: rs(24),
    padding: rs(22),
    width: "100%",
    maxWidth: 420,
    shadowColor: palette.black,
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
    borderColor: palette.gray200,
    backgroundColor: palette.neutralL98_6,
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
    backgroundColor: palette.gray100,
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
    backgroundColor: palette.gray200,
  },
  dividerText: {
    fontSize: rs(12),
    color: palette.gray400,
    fontWeight: "500",
  },

  /* Form */
  form: { gap: 10 },

  /* Error */
  errorBox: {
    marginTop: rs(12),
    backgroundColor: palette.red50,
    borderRadius: rs(12),
    paddingHorizontal: rs(14),
    paddingVertical: rs(11),
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
  },
  errorText: {
    fontSize: rs(13),
    color: palette.red500,
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
    shadowColor: palette.brandBlue,
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
    color: palette.white,
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
}, { fonts: false });
