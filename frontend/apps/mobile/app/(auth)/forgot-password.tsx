import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import authService from "../../src/services/http/authService";
import Input from "../../src/shared/ui/Input";
import { useTheme } from "../../src/theme/useTheme";
import { rs } from "../../src/utils/responsive";
import { TYPE } from '../../src/theme/d';
import { GradientButton, Reveal } from '../../src/shared/d';
import { OtpBoxes, ResendCode, type OtpHandle } from '../../src/shared/d/Otp';
import { PasswordRules, passwordOk } from '../../src/shared/d/PasswordRules';
import Reanimated, { FadeInLeft, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { DPage, goBackOr } from '../../src/shared/d/Page';

function GradientText({
  text,
  colors = ["#1A6BAE", "#005BE0", "#30855B"],
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

type Step = "email" | "otp" | "password";

export default function ForgotPasswordScreen() {
  const { isDark, tc } = useTheme();
  const [step, setStep] = useState<Step>("email");

  // Email step
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // OTP + new password step
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const newPassRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const otpRef = useRef<OtpHandle>(null);
  const reduceMotion = useReducedMotion();
  const [dir, setDir] = useState<1 | -1>(1);
  const go = (s: "email" | "otp" | "password", d: 1 | -1) => { setDir(d); setStep(s); };

  async function handleSendOtp() {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Please enter your email address");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    setEmailLoading(true);
    try {
      await authService.forgotPassword(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (step === "email") go("otp", 1);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
      setEmailError(msg || "Failed to send reset code. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleResetPassword() {
    if (otp.replace(/\D/g, "").length !== 6) {
      setResetError("Enter the 6-digit code from your email");
      go("otp", -1);
      return;
    }
    if (!passwordOk(newPassword)) {
      setResetError("Your new password needs 8 characters, a capital letter and a number");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }
    setResetError("");
    setResetLoading(true);
    try {
      await authService.resetPassword(email.trim(), otp.trim(), newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(auth)/login" as any);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
      setResetError(msg || "Invalid or expired code. Please try again.");
      go("otp", -1);
      setTimeout(() => otpRef.current?.shake(), 380);
    } finally {
      setResetLoading(false);
    }
  }

  const errorBox = (msg: string) => (
    <Reveal style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: "rgba(239,68,68,0.12)" }}>
      <Ionicons name="alert-circle" size={17} color={tc.dangerText} />
      <Text style={[TYPE.small, { flex: 1, color: tc.textPrimary }]}>{msg}</Text>
    </Reveal>
  );

  return (
    <DPage
      title="Reset password"
      sub={step === "email" ? "We email you a 6-digit code." : step === "otp" ? `Code sent to ${email.trim()}` : "Choose a new password."}
      onBack={() => (step === "password" ? go("otp", -1) : step === "otp" ? go("email", -1) : goBackOr("/(auth)/login"))}
    >
      <KeyboardAvoidingView behavior="padding">
        <View style={{ paddingHorizontal: 18 }}>
          <Reanimated.View key={step} entering={reduceMotion ? undefined : (dir > 0 ? FadeInRight : FadeInLeft).springify().damping(20).stiffness(200).mass(1)}>
          {step === "email" ? (
            <View>
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleSendOtp}
                error={emailError || undefined}
                icon={<Ionicons name="mail-outline" size={19} color={tc.textTertiary} />}
              />
              <GradientButton block label={emailLoading ? "Sending…" : "Email me a code"} loading={emailLoading} onPress={handleSendOtp} style={{ marginTop: 18 }} />
            </View>
          ) : step === "otp" ? (
            <View>
              <View style={{ marginTop: 6, marginBottom: 14 }}>
                <OtpBoxes ref={otpRef} value={otp} onChange={(v) => { setOtp(v); if (v) setResetError(""); }} onComplete={() => go("password", 1)} autoFocus />
              </View>
              {resetError ? errorBox(resetError) : null}
              <View style={{ marginTop: 16 }}>
                <ResendCode onResend={handleSendOtp} busy={emailLoading} />
              </View>
              <Pressable onPress={() => go("email", -1)} hitSlop={8} style={{ alignSelf: "center", marginTop: 16 }} accessibilityRole="button">
                <Text style={[TYPE.small, { color: tc.textSecondary }]}>Wrong email? <Text style={{ color: tc.accentText, fontFamily: "Manrope_700Bold" }}>Change it</Text></Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={{ gap: 14 }}>
                <View>
                  <Input
                    ref={newPassRef}
                    label="New password"
                    placeholder="Your new password"
                    value={newPassword}
                    onChangeText={(t) => { setNewPassword(t); setResetError(""); }}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    icon={<Ionicons name="lock-closed-outline" size={19} color={tc.textTertiary} />}
                    rightIcon={
                      <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8} accessibilityLabel={showNew ? "Hide password" : "Show password"}>
                        <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={tc.textTertiary} />
                      </Pressable>
                    }
                  />
                  <PasswordRules password={newPassword} />
                </View>
                <Input
                  ref={confirmRef}
                  label="Type it again"
                  placeholder="The same password"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setResetError(""); }}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleResetPassword}
                  error={confirmPassword.length > 0 && confirmPassword !== newPassword && confirmPassword.length >= newPassword.length ? "Passwords do not match" : undefined}
                  icon={<Ionicons name="lock-closed-outline" size={19} color={tc.textTertiary} />}
                  rightIcon={
                    <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8} accessibilityLabel={showConfirm ? "Hide password" : "Show password"}>
                      <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={tc.textTertiary} />
                    </Pressable>
                  }
                />
              </View>
              {resetError ? errorBox(resetError) : null}
              <GradientButton block label={resetLoading ? "Saving…" : "Save new password"} loading={resetLoading} disabled={!passwordOk(newPassword) || newPassword !== confirmPassword} onPress={handleResetPassword} style={{ marginTop: 18 }} />
            </View>
          )}
          </Reanimated.View>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 28 }}>
            <Text style={[TYPE.body, { color: tc.textSecondary }]}>Remember it? </Text>
            <Pressable onPress={() => router.replace("/(auth)/login" as any)} hitSlop={8} accessibilityRole="button">
              <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </DPage>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: rs(20),
    paddingBottom: rs(24),
    paddingTop: rs(16),
    justifyContent: "center",
    alignItems: "center",
  },

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

  backBtn: {
    alignSelf: "flex-start",
    padding: rs(8),
    marginBottom: rs(8),
    marginLeft: rs(-4),
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: rs(24),
    padding: rs(22),
    width: "100%",
    maxWidth: 420,
    shadowColor: "#1A6BAE",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(26,107,174,0.06)",
  },

  iconWrap: { alignItems: "center", marginBottom: rs(14) },
  iconGrad: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(20),
    alignItems: "center",
    justifyContent: "center",
  },

  heading: {
    fontSize: rs(22),
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: rs(6),
  },
  subheading: {
    fontSize: rs(13),
    textAlign: "center",
    marginBottom: rs(18),
    lineHeight: rs(20),
  },

  form: { gap: rs(10), marginBottom: rs(0) },

  errorBox: {
    marginTop: rs(12),
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

  actionBtn: {
    marginTop: rs(16),
    borderRadius: rs(16),
    overflow: "hidden",
    shadowColor: "#1A6BAE",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  actionBtnGrad: {
    height: rs(50),
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: rs(17),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },

  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: rs(14),
  },
  resendText: { fontSize: rs(13) },
  resendLink: { fontSize: rs(13), fontWeight: "700" },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: rs(18),
  },
  footerText: { fontSize: rs(14) },
  footerLink: { fontSize: rs(14), fontWeight: "700" },
});
