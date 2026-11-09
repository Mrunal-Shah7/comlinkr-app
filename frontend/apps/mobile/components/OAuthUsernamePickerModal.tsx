import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SessionCookieHeader, UserProfile } from "@shared/types/api";
import authService from "../src/services/http/authService";
import { HttpApiError } from "../src/services/http/apiClient";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

type Props = {
  visible: boolean;
  tempToken: string;
  provider: "google" | "apple";
  onSuccess: (user: UserProfile, sessionCookie: SessionCookieHeader) => void;
  onCancel: () => void;
};

export default function OAuthUsernamePickerModal({
  visible,
  tempToken,
  provider,
  onSuccess,
  onCancel,
}: Props) {
  const { tc } = useTheme();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  function validate(u: string): string | null {
    const t = u.trim().toLowerCase();
    if (t.length < 3) return "Username must be at least 3 characters";
    if (t.length > 20) return "Username must be at most 20 characters";
    if (!USERNAME_RE.test(t)) return "Only letters, numbers, and underscores allowed";
    return null;
  }

  async function onContinue() {
    const normalized = username.trim().toLowerCase();
    const v = validate(normalized);
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res =
        provider === "google"
          ? await authService.googleComplete(tempToken, normalized)
          : await authService.appleComplete(tempToken, normalized);
      if (!("data" in res)) {
        setError("Unexpected response from server");
        return;
      }
      const { user, sessionCookie } = res.data;
      onSuccess(user, sessionCookie);
      setUsername("");
      setError("");
    } catch (e: unknown) {
      if (e instanceof HttpApiError) {
        setError(e.message);
      } else {
        const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
        setError(msg || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => { if (!loading) onCancel(); }}>
      <KeyboardAvoidingView style={[styles.backdrop, { backgroundColor: tc.overlay }]} behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!loading) onCancel(); }} accessibilityRole="button" accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tc.sheetBg,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: tc.borderMedium }]} />
          </View>
          <Text style={[styles.title, { color: tc.textPrimary }]}>One last step</Text>
          <Text style={[styles.subtitle, { color: tc.textSecondary }]}>
            Choose a username for your ComLinkr account
          </Text>

          <TextInput
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              if (error) setError("");
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="username"
            placeholderTextColor={tc.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            editable={!loading}
            style={[
              styles.input,
              {
                backgroundColor: tc.inputBg,
                borderColor: focused ? Colors.brand.blue : tc.borderLight,
                color: tc.textPrimary,
              },
            ]}
          />
          <Text style={[styles.count, { color: tc.textTertiary }]}>{username.length}/20</Text>
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <Pressable
            onPress={() => void onContinue()}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.9 },
              loading && { opacity: 0.7 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </Pressable>

          <Pressable onPress={onCancel} disabled={loading} style={styles.cancelWrap}>
            <Text style={[styles.cancelText, { color: tc.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handleWrap: { alignItems: "center", marginBottom: 12 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 52,
    fontSize: 16,
  },
  count: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
  },
  inlineError: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 8,
    marginLeft: 2,
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: Colors.brand.blue,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelWrap: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
