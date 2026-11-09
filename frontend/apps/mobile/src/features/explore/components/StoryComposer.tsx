// Design D `compose-story`: a black screen, photo or video first. The picked media fills the preview (it settles
// in: scale 0.94 → 1 with a fade), a caption is optional, a topic is optional, Share posts it.
import { palette } from "../../../theme/palette";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Keyframe, useReducedMotion } from "react-native-reanimated";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { TYPE, body } from "../../../theme/d";
import { GradientButton } from "../../../shared/d";

const SETTLE = new Keyframe({ 0: { opacity: 0.4, transform: [{ scale: 0.94 }] }, 100: { opacity: 1, transform: [{ scale: 1 }] } }).duration(320);

export function StoryComposer({ media, onPick, caption, onCaption, topics, topic, onTopic, onShare, submitting, onClose }: {
  media: { uri: string; mediaType: "photo" | "video" } | null;
  onPick: () => void;
  caption: string; onCaption: (v: string) => void;
  topics: readonly string[]; topic: string; onTopic: (v: string) => void;
  onShare: () => void; submitting: boolean; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  return (
    <View style={{ flex: 1, backgroundColor: palette.black }}>
      <StatusBar style="light" />
      <View style={[st.bar, { paddingTop: 4 }]}>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={st.ib}>
          <Ionicons name="chevron-back" size={24} color={palette.white} />
        </Pressable>
        <Text style={[TYPE.bar, { color: palette.white, flex: 1, textAlign: "center" }]}>New story</Text>
        <GradientButton small label="Share" disabled={!media} loading={submitting} onPress={onShare} outerStyle={{ marginRight: 6 }} />
      </View>

      <Pressable onPress={onPick} style={st.preview} accessibilityRole="button" accessibilityLabel={media ? "Change the photo or video" : "Pick a photo or video"}>
        {media ? (
          <Animated.View key={media.uri} entering={reduce ? undefined : SETTLE} style={StyleSheet.absoluteFill}>
            {media.mediaType === "photo" ? (
              <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, st.center]}>
                <Ionicons name="videocam" size={44} color="rgba(255,255,255,0.8)" />
                <Text style={[body(600), { color: "rgba(255,255,255,0.8)", marginTop: 6 }]}>Video ready</Text>
              </View>
            )}
            <View style={st.change}><Ionicons name="images-outline" size={15} color={palette.white} /><Text style={[body(700), { color: palette.white, fontSize: 13 }]}>Change</Text></View>
          </Animated.View>
        ) : (
          <View style={[st.center, { opacity: 0.75 }]}>
            <Ionicons name="camera-outline" size={40} color={palette.white} />
            <Text style={[body(600), { color: palette.white, marginTop: 8 }]}>Pick a photo or video</Text>
          </View>
        )}
      </Pressable>

      <View style={st.caption}>
        <TextInput value={caption} onChangeText={onCaption} maxLength={120} placeholder="Add a caption (optional)" placeholderTextColor="rgba(255,255,255,0.55)"
          style={[body(500), { color: palette.white, fontSize: 15.5, paddingVertical: 0 }]} accessibilityLabel="Caption" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: insets.bottom + 24 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, alignItems: "center" }}>
        {topics.map((t) => {
          const on = topic === t;
          return (
            <Pressable key={t} onPress={() => onTopic(on ? "" : t)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[st.topic, on && { backgroundColor: palette.brandGreen, borderColor: palette.brandGreen }]}>
              <Text style={[body(600), { color: palette.white, fontSize: 13.5 }]}>{t}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  ib: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  preview: { flex: 1, marginHorizontal: 12, borderRadius: 20, overflow: "hidden", backgroundColor: palette.neutralL07 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  change: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)" },
  caption: { marginHorizontal: 12, marginTop: 10, marginBottom: 10, minHeight: 50, borderRadius: 16, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  topic: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
});
