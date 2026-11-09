import { palette } from "../../../theme/palette";
import { memo } from "react";
import { View, Text, Pressable, StyleSheet, Share } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { body, display } from "../../../theme/d";
import { GradientFill, PressableScale } from "../../../shared/d";
import { getShareLink } from "../../../utils/shareLinks";
import { FadeImage } from "../../../../components/FadeImage";
import { resolveApiAssetUrl } from "../../../api/feed.api";
import type { ApiStory } from "../../../api/stories.api";
import { mapApiStoryToCommunityStory, formatStoryTimeLeft } from "../models";
import { StoryVideoThumb } from "./NewsImages";

const LIKE = palette.pinkL61;

/** A story tile in Explore → Stories (design D, plan 01): a tall photo with the author's ring, the title, and
 *  small glass buttons (like, save or delete). Long-press shares. Handlers must be stable (the row is memoized). */
export const StoryCard = memo(function StoryCard({
  story: apiSt,
  authorIndex: ai,
  storyIndex: si,
  isOwnStory,
  onOpen,
  onDelete,
  onToggleSave,
  onToggleLike,
}: {
  story: ApiStory;
  authorIndex: number;
  storyIndex: number;
  isOwnStory: boolean;
  onOpen: (authorIndex: number, storyIndex: number) => void;
  onDelete: (storyId: string) => void;
  onToggleSave: (storyId: string) => unknown;
  onToggleLike: (storyId: string) => unknown;
}) {
  const { tc } = useTheme();
  const ui = mapApiStoryToCommunityStory(apiSt);
  const isVideo = ["VIDEO", "REEL"].includes((apiSt.mediaType || "").toUpperCase());
  const mediaUrl = resolveApiAssetUrl(apiSt.mediaUrl || "");
  const thumb = mediaUrl || ui.thumbnail;
  const avatar = apiSt.author?.avatarUrl ? resolveApiAssetUrl(apiSt.author.avatarUrl) : null;
  const name = (apiSt.author?.name || apiSt.author?.username || "").split(" ")[0];
  const ini = (apiSt.author?.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const share = () => {
    const link = getShareLink("story", apiSt.id);
    void Share.share({ message: `${apiSt.title}\n\nShared via ComLinkr\n\n${link}`, ...(process.env.EXPO_OS === "ios" ? { url: link } : {}) });
  };
  const glassBtn = (icon: keyof typeof Ionicons.glyphMap, color: string, label: string, onPress: () => void) => (
    <Pressable hitSlop={6} onPress={(e) => { e.stopPropagation(); void Haptics.selectionAsync(); onPress(); }} style={s.glassBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  );

  return (
    <PressableScale
      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onOpen(ai, si); }}
      onLongPress={share}
      outerStyle={{ flex: 1 }}
      style={[s.tile, { backgroundColor: tc.cardBg }]}
      accessibilityRole="button"
      accessibilityLabel={`Story: ${apiSt.title}, by ${apiSt.author?.name ?? "a neighbour"}`}
    >
      {isVideo && mediaUrl ? <StoryVideoThumb uri={mediaUrl} style={StyleSheet.absoluteFill} /> : <FadeImage uri={thumb} style={StyleSheet.absoluteFill} />}
      <GradientFill colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"] as const} style={[StyleSheet.absoluteFill, { top: "40%" }]} />

      <GradientFill colors={[tc.mint, tc.accent] as const} style={s.ring}>
        <View style={[s.ringIn, { borderColor: tc.cardBg }]}>
          {avatar ? <FadeImage uri={avatar} style={s.av} /> : <GradientFill style={s.av}><Text style={[body(800), { color: palette.white, fontSize: 11 }]}>{ini}</Text></GradientFill>}
        </View>
      </GradientFill>

      <View style={s.topRight}>
        {isVideo ? <View style={s.glassBtn}><Ionicons name="videocam" size={15} color={palette.white} /></View> : null}
        {isOwnStory
          ? glassBtn("trash-outline", palette.white, "Delete story", () => onDelete(apiSt.id))
          : glassBtn(apiSt.isSaved ? "bookmark" : "bookmark-outline", palette.white, apiSt.isSaved ? "Remove from saved" : "Save story", () => void onToggleSave(apiSt.id))}
      </View>

      <View style={s.bottom}>
        <View style={{ flex: 1 }}>
          <Text style={[display(700), { color: palette.white, fontSize: 14, lineHeight: 17 }]} numberOfLines={2}>{apiSt.title}</Text>
          <Text style={[body(600), { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }]} numberOfLines={1}>
            {[name, formatStoryTimeLeft(apiSt.expiresAt)].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {glassBtn(apiSt.likedByMe ? "heart" : "heart-outline", apiSt.likedByMe ? LIKE : palette.white, apiSt.likedByMe ? "Unlike" : "Like", () => void onToggleLike(apiSt.id))}
      </View>
    </PressableScale>
  );
});

/** The first tile of the Stories grid: add your own. */
export function AddStoryTile({ onPress, hasOwn }: { onPress: () => void; hasOwn: boolean }) {
  const { tc } = useTheme();
  return (
    <PressableScale onPress={onPress} outerStyle={{ flex: 1 }} style={[s.tile, s.add, { backgroundColor: tc.cardBg, borderColor: tc.borderMedium }]} accessibilityRole="button" accessibilityLabel={hasOwn ? "View your story" : "Add a story"}>
      <Ionicons name={hasOwn ? "book-outline" : "camera-outline"} size={30} color={tc.textPrimary} />
      <Text style={[body(700), { color: tc.textPrimary, marginTop: 6 }]}>{hasOwn ? "Your story" : "Add a story"}</Text>
      <Text style={[body(500), { color: tc.textSecondary, fontSize: 12.5 }]}>{hasOwn ? "Tap to view" : "Photo or video"}</Text>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1, aspectRatio: 3 / 4.4, borderRadius: 24, overflow: "hidden" },
  add: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed" },
  ring: { position: "absolute", top: 10, left: 10, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  ringIn: { width: 31, height: 31, borderRadius: 16, borderWidth: 2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  av: { width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  topRight: { position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 6 },
  glassBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 10, right: 10, bottom: 10, flexDirection: "row", alignItems: "flex-end", gap: 8 },
});
