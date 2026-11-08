// The compose screen. Its pieces live in src/features/compose/ (split from one 5,000-line file, TR-013).
import { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useRequireAuth } from "../src/shared/hooks/useRequireAuth";
import { TYPE } from "../src/theme/d";
import { PressableScale, Reveal } from "../src/shared/d";
import { goBackOr } from "../src/shared/d/Page";
import { PostForm } from "../src/features/compose/PostForm";
import { POST_TYPES, PostType } from "../src/features/compose/postTypes";
import { s } from "../src/features/compose/styles";

// ── Main screen ────────────────────────────────────────────────────────────────
export default function CreatePostScreen() {
  const { isDark, tc } = useTheme();
  const { requireAuth, isAuthed } = useRequireAuth();
  const params = useLocalSearchParams<{ type?: string; mode?: string; id?: string }>(); // SPRINT-42: receive the authoritative entity id for reused edit mode.
  const initialType = POST_TYPES.find((t) => t.id === params.type) ?? null;
  const [selectedType, setSelectedType] = useState<PostType | null>(initialType);
  // DEV-11: a reused route instance must follow a changed `type` param (e.g. consecutive deep links).
  const lastRouteTypeRef = useRef(params.type);
  useEffect(() => {
    if (lastRouteTypeRef.current === params.type) return;
    lastRouteTypeRef.current = params.type;
    setSelectedType(POST_TYPES.find((t) => t.id === params.type) ?? null);
  }, [params.type]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthed) {
      requireAuth(undefined, "Sign in to create posts, events, stories, and more.");
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/feed" as any);
      return;
    }
    setAuthChecked(true);
  }, [isAuthed, requireAuth]);

  if (!authChecked || !isAuthed) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.brand.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (selectedType) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}>
          <PostForm type={selectedType} onBack={params.type ? () => router.back() : () => setSelectedType(null)} initialMode={params.mode} editId={params.id} />
            {/* SPRINT-42: deep-linked type (from Listings/Food/etc.) returns to the originating screen; in-app chooser selection returns to the chooser. */}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
        <Pressable onPress={() => goBackOr("/(tabs)/feed")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back"
          style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: tc.inputBg }]}>
          <Ionicons name="chevron-back" size={24} color={tc.textPrimary} />
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={[TYPE.pageTitle, { color: tc.textPrimary, marginLeft: 2 }]}>Post something</Text>
        <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 2, marginBottom: 16, marginLeft: 2 }]}>What would you like to share with your city?</Text>
        {POST_TYPES.map((type, i) => (
          <Reveal key={type.id} i={i}>
            <PressableScale onPress={() => setSelectedType(type)} accessibilityRole="button" accessibilityLabel={type.label}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, marginBottom: 10, borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg }}>
              <View style={{ width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
                <Ionicons name={type.icon} size={22} color={tc.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{type.label}</Text>
                <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={2}>{type.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tc.textTertiary} />
            </PressableScale>
          </Reveal>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
