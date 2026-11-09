// Split out of app/create-post.tsx (TR-013, point 9b).
import { palette } from "../../theme/palette";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FadeImage } from "../../../components/FadeImage";
import { AttachedMedia } from "./types";

// ── Horizontal image thumbnail strip (restaurant / multi-photo posts) ─────────
export function ImageThumbnailStrip({
  files,
  onRemove,
}: {
  files: AttachedMedia[];
  onRemove: (index: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4, paddingBottom: 4 }}
      style={{ marginBottom: 8 }}
    >
      {files.map((file, i) => (
        <View key={i} style={{ width: 100, height: 80, borderRadius: 12, overflow: "hidden", position: "relative" }}>
          <FadeImage uri={file.uri} style={{ width: "100%" as any, height: "100%" as any }} cachePolicy="memory" />
          {/* SPRINT-42: use shared FadeImage for selected media thumbnails. */}
          {file.mediaType === "video" && (
            <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" }}>
              <Ionicons name="play-circle" size={26} color={palette.white} />
            </View>
          )}
          <Pressable
            onPress={() => onRemove(i)}
            hitSlop={6}
            style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10 }}
          >
            <Ionicons name="close-circle" size={20} color={palette.white} />
          </Pressable>
          <View style={{ position: "absolute", bottom: 4, left: 4, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, color: palette.white, fontWeight: "700" }}>{i + 1}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
