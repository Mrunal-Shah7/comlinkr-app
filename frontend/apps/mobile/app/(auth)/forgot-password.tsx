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

type Step = "email" | "otp";

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
      setStep("otp");
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
    if (!otp.trim()) {
      setResetError("Please enter the OTP sent to your email");
      return;
    }
    if (!newPassword) {
      setResetError("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: tc.pageBg }]}>
      <LinearGradient
        colors={isDark ? ["#080F1E", "#0D1526", "#091408"] : ["#EBF5FF", "#F4F9FF", "#E3F1EA"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <Pressable onPress={() => (step === "otp" ? setStep("email") : router.back())} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={rs(22)} color={tc.textPrimary} />
            </Pressable>

            {/* Card */}
            <View
              style={[
                styles.card,
                { backgroundColor: tc.cardBg, borderColor: isDark ? tc.borderLight : "rgba(26,107,174,0.06)" },
              ]}
            >
              {/* Icon */}
              <View style={styles.iconWrap}>
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGrad}
                >
                  <Ionicons name={step === "email" ? "lock-open-outline" : "shield-checkmark-outline"} size={rs(28)} color="#fff" />
                </LinearGradient>
              </View>

              <GradientText
                text={step === "email" ? "Forgot Password?" : "Verify & Reset"}
                style={styles.heading}
                colors={["#1A6BAE", "#005BE0", "#30855B"]}
              />
              <Text style={[styles.subheading, { color: tc.textSecondary }]}>
                {step === "email"
                  ? "Enter your email and we'll send you a reset code"
                  : `Enter the code sent to ${email} and choose a new password`}
              </Text>

              {step === "email" ? (
                <>
                  <View style={styles.form}>
                    <Input
                      label="Email address"
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={(t) => { setEmail(t); setEmailError(""); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      returnKeyType="send"
                      onSubmitEditing={handleSendOtp}
                    />
                  </View>

                  {emailError ? (
                    <View style={[styles.errorBox, { backgroundColor: isDark ? "#2D0F0F" : "#FEF2F2" }]}>
                      <Ionicons name="alert-circle" size={rs(16)} color="#EF4444" />
                      <Text style={styles.errorText}>{emailError}</Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={handleSendOtp}
                    disabled={emailLoading}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                      emailLoading && { opacity: 0.7 },
                    ]}
                  >
                    <LinearGradient
                      colors={["#1A6BAE", "#005BE0", "#30855B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionBtnGrad}
                    >
                      <Text style={styles.actionBtnText}>
                        {emailLoading ? "Sending..." : "Send Reset Code"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.form}>
                    <Input
                      label="OTP Code"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChangeText={(t) => { setOtp(t); setResetError(""); }}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => newPassRef.current?.focus()}
                    />
                    <Input
                      ref={newPassRef}
                      label="New Password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); setResetError(""); }}
                      secureTextEntry={!showNew}
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      rightIcon={
                        <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8}>
                          <Ionicons
                            name={showNew ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={tc.textTertiary}
                          />
                        </Pressable>
                      }
                    />
                    <Input
                      ref={confirmRef}
                      label="Confirm New Password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setResetError(""); }}
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                      returnKeyType="go"
                      onSubmitEditing={handleResetPassword}
                      rightIcon={
                        <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                          <Ionicons
                            name={showConfirm ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={tc.textTertiary}
                          />
                        </Pressable>
                      }
                    />
                  </View>

                  {resetError ? (
                    <View style={[styles.errorBox, { backgroundColor: isDark ? "#2D0F0F" : "#FEF2F2" }]}>
                      <Ionicons name="alert-circle" size={rs(16)} color="#EF4444" />
                      <Text style={styles.errorText}>{resetError}</Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={handleResetPassword}
                    disabled={resetLoading}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                      resetLoading && { opacity: 0.7 },
                    ]}
                  >
                    <LinearGradient
                      colors={["#1A6BAE", "#005BE0", "#30855B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionBtnGrad}
                    >
                      <Text style={styles.actionBtnText}>
                        {resetLoading ? "Resetting..." : "Reset Password"}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    onPress={handleSendOtp}
                    disabled={emailLoading}
                    style={styles.resendRow}
                  >
                    <Text style={[styles.resendText, { color: tc.textSecondary }]}>
                      Didn't receive it?{" "}
                    </Text>
                    <GradientText
                      text={emailLoading ? "Sending..." : "Resend Code"}
                      style={styles.resendLink}
                      colors={["#1A6BAE", "#30855B"]}
                    />
                  </Pressable>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: tc.textSecondary }]}>Remember your password? </Text>
              <Pressable onPress={() => router.replace("/(auth)/login" as any)}>
                <GradientText
                  text="Sign in"
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
