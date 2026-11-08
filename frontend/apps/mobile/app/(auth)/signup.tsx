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
import { showToast } from '../../src/shared/ui/Toast';
import { TYPE, display } from '../../src/theme/d';
import { GradientButton, Reveal, SoftButton } from '../../src/shared/d';
import { PasswordRules } from '../../src/shared/d/PasswordRules';
import { OtpBoxes, ResendCode, type OtpHandle } from '../../src/shared/d/Otp';

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

function formatSignupError(e: unknown): string {
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
  return msg || "Something went wrong. Please try again.";
}

export default function SignupScreen() {
  const syncFromApiLogin = useAuthStore((s) => s.syncFromApiLogin);
  const { isDark, tc } = useTheme();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [usernamePickerVisible, setUsernamePickerVisible] = useState(false);
  const [oauthTempToken, setOauthTempToken] = useState("");
  const [oauthProvider, setOauthProvider] = useState<"google" | "apple">("google");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // SPRINT-39: removed stale Google.useAuthRequest hook (referenced undefined `Google` + missing `useEffect`
  // import). Active Google signup uses getGoogleIdToken from googleAuth.ts. Minimum removal to unblock tsc.

  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  const otpRef = useRef<OtpHandle>(null);
  const [codeOk, setCodeOk] = useState(false);

  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleSendCode() {
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("Username: 3–20 chars, letters, numbers, underscores only");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password: min 8 characters, 1 uppercase letter, 1 number");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authService.registerInitiate({
        email: email.trim(),
        password,
        fullName: name.trim(),
        username: username.trim(),
      });
      setStep("verify");
      setCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("We sent a 6-digit code to complete sign-up.", "success");
    } catch (e: unknown) {
      setError(formatSignupError(e));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  // `typed` is the code the boxes just completed: onComplete fires in the same tick as setCode, so `code` here is
  // still the previous render's five digits and the check below always failed (the boxes shook and emptied).
  async function handleVerifyAndCreate(typed?: string) {
    const trimmed = (typed ?? code).replace(/\D/g, "");
    if (trimmed.length !== 6) {
      setError("Enter the 6-digit code from your email");
      otpRef.current?.shake();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authService.registerVerify({
        email: email.trim(),
        password,
        fullName: name.trim(),
        username: username.trim(),
        code: trimmed,
      });
      const { user: profile, sessionCookie } = res.data;
      const { onboardingDone } = await syncFromApiLogin(profile, sessionCookie);
      void useSidebarStore.getState().fetchSidebarData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCodeOk(true);
      await new Promise((r) => setTimeout(r, 520));
      router.replace((onboardingDone ? "/(tabs)/feed" : "/(auth)/onboarding") as any);
    } catch (e: unknown) {
      setError(formatSignupError(e));
      otpRef.current?.shake();
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialSignup(provider: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
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
        setError(formatSignupError(e));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setSocialLoading(false);
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
      }
    }
  }

  const strengthLevel =
    password.length === 0 ? 0
    : password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) ? 1
    : password.length < 10 ? 2
    : 3;

  const strengthColors = ["#E5E7EB", "#EF4444", "#257A86", "#30855B"];
  const strengthLabels = ["", "Weak", "Good", "Strong"];

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
      <LinearGradient colors={isDark ? ["rgba(26,107,174,0.30)", "rgba(48,133,91,0.10)", "transparent"] : ["rgba(26,107,174,0.16)", "rgba(48,133,91,0.06)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420 }} pointerEvents="none" />

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
            <Reveal i={0} style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <Pressable onPress={() => (step === "verify" ? (setStep("form"), setCode(""), setError("")) : router.back())} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back"
                style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginLeft: -10 }}>
                <Ionicons name="chevron-back" size={24} color={tc.textPrimary} />
              </Pressable>
              <Image source={require("../../assets/images/brand/app_icon_1024.png")} style={{ width: 32, height: 32, borderRadius: 10 }} contentFit="contain" />
              <Text style={[display(800), { fontSize: 19, color: tc.textPrimary, letterSpacing: -0.4 }]}>comlinkr</Text>
            </Reveal>

            <View>
              <Reveal i={1}>
                <Text style={[TYPE.pageTitle, { color: tc.textPrimary }]}>{step === "form" ? "Create account" : "Check your email"}</Text>
                <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 4, marginBottom: 20 }]}>
                  {step === "form" ? "Takes a minute. We email you a 6-digit code." : `Sent to ${email.trim() || "your email"}`}
                </Text>
              </Reveal>

              {/* Social Sign Up */}
              {step === "form" ? (
              <Reveal i={2} style={{ flexDirection: "row", gap: 10 }}>
                <SoftButton ghost block outerStyle={{ flex: 1 }} label={Platform.OS === "ios" ? "Google" : "Sign up with Google"} onPress={() => void handleSocialSignup("Google")} icon={<Ionicons name="logo-google" size={19} color={tc.textPrimary} />} />
                {Platform.OS === "ios" ? <SoftButton ghost block outerStyle={{ flex: 1 }} label="Apple" onPress={() => void handleSocialSignup("Apple")} icon={<Ionicons name="logo-apple" size={20} color={tc.textPrimary} />} /> : null}
              </Reveal>
              ) : null}

              {/* Divider */}
              {step === "form" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 }}>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: tc.borderMedium }} />
                <Text style={[TYPE.small, { color: tc.textTertiary }]}>or with email</Text>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: tc.borderMedium }} />
              </View>
              ) : null}

              {/* Form */}
              {step === "form" ? (
              <View style={styles.form}>
                <Input
                  label="Full name"
                  placeholder="John Doe"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  onSubmitEditing={() => usernameRef.current?.focus()}
                />
                <Input
                  ref={usernameRef}
                  label="Username"
                  placeholder="john_doe"
                  value={username}
                  onChangeText={(t) =>
                    setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  autoCapitalize="none"
                  autoComplete="username"
                  maxLength={20}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
                <Input
                  ref={emailRef}
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
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="go"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={handleSendCode}
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
              ) : (
              <Reveal key="otp" style={{ marginTop: 4 }}>
                <OtpBoxes ref={otpRef} value={code} ok={codeOk} onChange={(v) => { setCode(v); if (v) setError(""); }} onComplete={(v) => void handleVerifyAndCreate(v)} autoFocus />
                <View style={{ marginTop: 18 }}><ResendCode onResend={handleSendCode} busy={loading} /></View>
                <Pressable onPress={() => { setStep("form"); setCode(""); setError(""); }} hitSlop={8} style={{ alignSelf: "center", marginTop: 18 }} accessibilityRole="button">
                  <Text style={[TYPE.small, { color: tc.textSecondary }]}>Wrong email? <Text style={{ color: tc.accentText, fontFamily: "Manrope_700Bold" }}>Edit details</Text></Text>
                </Pressable>
              </Reveal>
              )}

              {/* Password rules, live (design D `signup`) */}
              {step === "form" && (passwordFocused || password.length > 0) ? <PasswordRules password={password} /> : null}

              {/* Username hint */}
              {step === "form" && username.length > 0 && username.length < 3 && (
                <View style={styles.hintBox}>
                  <Ionicons name="information-circle-outline" size={rs(14)} color="#1A6BAE" />
                  <Text style={styles.hintText}>Username needs at least 3 characters</Text>
                </View>
              )}

              {/* Error */}
              {error ? (
                <Reveal style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: "rgba(239,68,68,0.12)" }}>
                  <Ionicons name="alert-circle" size={17} color={tc.dangerText} />
                  <Text style={[TYPE.small, { flex: 1, color: tc.textPrimary }]}>{error}</Text>
                </Reveal>
              ) : null}

              {/* Spacer */}
              <View style={{ height: 6 }} />

              {/* Terms agreement checkbox */}
              {step === "form" ? (
                <Pressable
                  onPress={() => setAgreedToTerms((v) => !v)}
                  style={({ pressed }) => [styles.agreeRow, pressed && { opacity: 0.85 }]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: agreedToTerms ? tc.accent : tc.borderMedium, borderRadius: 7 },
                      agreedToTerms && { backgroundColor: tc.accent },
                    ]}
                  >
                    {agreedToTerms ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
                  </View>
                  <Text style={[styles.terms, { color: tc.textSecondary, textAlign: "left", flex: 1 }]}>
                    I agree to the{" "}
                    <Text style={styles.termsLink} onPress={() => router.push("/terms-of-service" as any)}>
                      Terms of Service
                    </Text>
                    {" "}and{" "}
                    <Text style={styles.termsLink} onPress={() => router.push("/privacy-policy" as any)}>
                      Privacy Policy
                    </Text>
                    , and confirm I am at least 18 years old.
                  </Text>
                </Pressable>
              ) : null}

              {/* Create Account / Verify Button */}
              <GradientButton
                block
                style={{ marginTop: 10 }}
                loading={loading}
                disabled={socialLoading || (step === "form" && !agreedToTerms)}
                onPress={step === "form" ? handleSendCode : () => void handleVerifyAndCreate()}
                label={step === "form" ? "Email me a code" : "Create my account"}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[TYPE.body, { color: tc.textSecondary }]}>Already on Comlinkr? </Text>
              <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
                <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>Sign in</Text>
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
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 32,
    justifyContent: "flex-start",
    alignItems: "stretch",
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
    bottom: 80,
    left: -60,
  },

  /* Logo */
  logoSection: {
    alignItems: "center",
    marginBottom: rs(12),
  },
  logoWrap: {
    width: rs(96),
    height: rs(96),
    borderRadius: rs(24),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A6BAE",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 9,
    borderWidth: 2,
    borderColor: "rgba(26,107,174,0.12)",
  },
  logo: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(18),
  },
  appName: {
    fontSize: rs(20),
    fontWeight: "900",
    color: Colors.brand.blue,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: rs(11),
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
    marginBottom: rs(3),
  },
  subheading: {
    fontSize: rs(12),
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: rs(12),
  },

  /* Social */
  socialGroup: { gap: rs(8), marginBottom: rs(12) },
  socialBtn: {
    height: rs(44),
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
    marginBottom: rs(10),
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
  form: { gap: 8 },

  /* Password toast */
  toast: {
    position: "absolute",
    top: rs(54),
    left: rs(20),
    right: rs(20),
    zIndex: 999,
    backgroundColor: "#12303A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 12,
  },
  toastTextWrap: { flex: 1, gap: rs(2) },
  toastTitle: {
    ...TYPE.bodyStrong,
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: rs(3),
  },
  toastLine: {
    ...TYPE.small,
    fontSize: 12.5,
    color: "rgba(255,255,255,0.8)",
    lineHeight: rs(18),
  },

  /* Password Strength */
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    marginTop: rs(10),
    marginBottom: rs(4),
  },
  strengthBar: {
    flex: 1,
    height: rs(4),
    borderRadius: rs(2),
  },
  strengthLabel: {
    fontSize: rs(11),
    fontWeight: "700",
    marginLeft: rs(6),
    minWidth: rs(44),
  },

  /* Hint */
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(6),
    marginTop: rs(8),
    paddingHorizontal: rs(4),
  },
  hintText: {
    fontSize: rs(12),
    color: Colors.brand.blue,
  },

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

  /* Create Account Button */
  signupBtn: {
    borderRadius: rs(14),
    overflow: "hidden",
    marginTop: rs(10),
    shadowColor: "#1A6BAE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  signupBtnGradient: {
    height: rs(50),
    borderRadius: rs(14),
    alignItems: "center",
    justifyContent: "center",
  },
  signupBtnText: {
    fontSize: rs(17),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },

  /* Terms */
  terms: {
    fontSize: rs(10),
    color: Colors.text.tertiary,
    textAlign: "center",
    marginTop: rs(8),
    lineHeight: rs(15),
  },
  termsLink: {
    color: Colors.brand.blue,
    fontWeight: "600",
  },
  agreeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(10),
    marginTop: rs(4),
    marginBottom: rs(4),
  },
  checkbox: {
    width: rs(20),
    height: rs(20),
    borderRadius: rs(5),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: rs(1),
  },

  /* Footer */
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: rs(12),
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
