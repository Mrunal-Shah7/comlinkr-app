// Split out of app/create-post.tsx (TR-013, point 9b).
import { palette } from "../../theme/palette";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FadeImage } from "../../../components/FadeImage";
import { createThemedStyles } from "../../theme/themedStyles";

// ── Attached file row ──────────────────────────────────────────────────────────
export function AttachedFile({
  index,
  color,
  bg,
  uri,
  fileName,
  mediaType,
  duration,
  fileSize,
  onRemove,
}: {
  index: number;
  color: string;
  bg: string;
  uri: string;
  fileName: string;
  mediaType: "photo" | "video";
  duration?: number;
  fileSize?: number;
  onRemove: () => void;
}) {
  const sizeLabel =
    typeof fileSize === "number" && Number.isFinite(fileSize) && fileSize > 0
      ? `${(fileSize / 1024 / 1024).toFixed(1)}MB`
      : "—";
  return (
    <View style={[af.file, { backgroundColor: bg, borderColor: color + "40" }]}>
      <View style={af.thumb}>
        <FadeImage uri={uri} style={af.thumbImg} cachePolicy="memory" />
        {/* SPRINT-42: use shared FadeImage for attached file thumbnails. */}
        {mediaType === "video" && (
          <View style={af.videoOverlay}>
            <Ionicons name="play-circle" size={18} color={palette.white} />
            <Text style={af.videoLabel}>{duration ? `${Math.round(duration)}s` : "Video"}</Text>
          </View>
        )}
      </View>
      <Text style={[af.fileName, { color }]} numberOfLines={1}>
        {fileName}
      </Text>
      <Text style={af.fileSize}>{sizeLabel}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close-circle" size={18} color={color} />
      </Pressable>
    </View>
  );
}
export const af = createThemedStyles({
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: palette.gray200,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: {
    width: "100%" as any,
    height: "100%" as any,
  },
  videoOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopLeftRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoLabel: {
    fontSize: 9,
    color: palette.white,
    fontWeight: "700",
  },
  fileName: { flex: 1, fontSize: 13, fontWeight: "700" },
  fileSize: { fontSize: 11, fontWeight: "600", color: palette.gray400 },
});
