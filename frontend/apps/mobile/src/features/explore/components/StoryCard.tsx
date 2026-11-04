import { memo } from "react";
import { View, Text, Pressable, StyleSheet, Share, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { rs } from "../../../utils/responsive";
import { getShareLink } from "../../../utils/shareLinks";
import { FadeImage } from "../../../../components/FadeImage";
import { resolveApiAssetUrl } from "../../../api/feed.api";
import type { ApiStory } from "../../../api/stories.api";
import { st } from "../../../styles/feedScreen.styles";
import { STORY_CATEGORY_META } from "../constants";
import { mapApiStoryToCommunityStory, formatStoryTimeLeft } from "../models";
import { StoryVideoThumb } from "./NewsImages";

/** A story row in the Explore → Stories list. Handlers must be stable (the row is memoized). */
export const StoryCard = memo(function StoryCard({
  story: apiSt,
  authorIndex: ai,
  storyIndex: si,
  isOwnStory,
  onOpen: openStoryViewerAt,
  onDelete: onDeleteStoryFromFeed,
  onToggleSave: onToggleStorySaveFromFeed,
  onToggleLike: onToggleStoryLikeFromFeed,
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
  const { isDark, tc } = useTheme();
  const ui = mapApiStoryToCommunityStory(apiSt);
  const catM = STORY_CATEGORY_META[ui.category];
  const thumb = resolveApiAssetUrl(apiSt.mediaUrl || "") || ui.thumbnail;
  const isVideo =
    (apiSt.mediaType || "").toUpperCase() === "VIDEO" ||
    (apiSt.mediaType || "").toUpperCase() === "REEL";
  const mediaUrl = resolveApiAssetUrl(apiSt.mediaUrl || "");
  return (
    <Pressable
      style={({ pressed }) => [
        st.storyCard,
        { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
        pressed && { opacity: 0.96 },
      ]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openStoryViewerAt(ai, si); }}
    >
      {/* ── Media area — image or paused video first-frame ── */}
      <View style={{ height: 230, position: "relative", overflow: "hidden", borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
        {isVideo && mediaUrl ? (
          <StoryVideoThumb uri={mediaUrl} style={StyleSheet.absoluteFill} />
        ) : (
          <FadeImage uri={thumb} style={StyleSheet.absoluteFill} />
        )}
        {/* VIDEO badge — on the image, bottom-left */}
        {isVideo && (
          <View style={{ position: "absolute", bottom: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Ionicons name="videocam" size={11} color="#FFF" />
            <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "800" }}>VIDEO</Text>
          </View>
        )}
        {/* Delete button — own stories only */}
        {isOwnStory && (
          <Pressable
            style={st.storyListDelete}
            hitSlop={4}
            onPress={(e) => { e.stopPropagation(); onDeleteStoryFromFeed(apiSt.id); }}
            accessibilityLabel="Delete story"
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </Pressable>
        )}
        {/* Single bookmark button on image */}
        <Pressable
          style={st.storyListBookmark}
          hitSlop={8}
          onPress={(e) => { e.stopPropagation(); void onToggleStorySaveFromFeed(apiSt.id); }}
        >
          <Ionicons
            name={apiSt.isSaved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={apiSt.isSaved ? "#F59E0B" : Colors.brand.blue}
          />
        </Pressable>
      </View>
      <View style={st.storyCardBody}>
        {/* Category chip + expiry — clean row, no overlapping elements */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6) }}>
            <View style={[st.storyCatChipInline, { borderColor: catM.color, backgroundColor: catM.color + "18" }]}>
              <Ionicons name={catM.icon as any} size={rs(11)} color={catM.color} />
              <Text style={[st.storyCatChipInlineText, { color: catM.color }]}>{ui.category}</Text>
            </View>
            {isOwnStory && (
              <View style={[st.storyCatChipInline, { borderColor: Colors.brand.blue, backgroundColor: isDark ? "rgba(0,118,235,0.18)" : Colors.brand.blueLight }]}>
                <Ionicons name="person-outline" size={rs(11)} color={Colors.brand.blue} />
                <Text style={[st.storyCatChipInlineText, { color: Colors.brand.blue }]}>Your story</Text>
              </View>
            )}
          </View>
          <Text style={[st.storyListExpiry, { color: tc.textTertiary }]}>
            {formatStoryTimeLeft(apiSt.expiresAt)}
          </Text>
        </View>
        {/* Metrics row for videos */}
        {isVideo && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="eye-outline" size={14} color={tc.textTertiary} />
              <Text style={[st.storyEngTextLight, { color: tc.textTertiary }]}>
                {apiSt.viewsCount >= 1000 ? `${(apiSt.viewsCount / 1000).toFixed(1)}K` : apiSt.viewsCount}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="heart-outline" size={14} color={tc.textTertiary} />
              <Text style={[st.storyEngTextLight, { color: tc.textTertiary }]}>
                {apiSt.likeCount ?? 0}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="chatbubble-outline" size={14} color={tc.textTertiary} />
              <Text style={[st.storyEngTextLight, { color: tc.textTertiary }]}>
                {apiSt.commentCount ?? 0}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Card body ── */}
      <View style={[st.storyCardBody, { paddingTop: 12 }]}>
        <Text style={[st.storyCardTitle, { color: tc.textPrimary }]} numberOfLines={2}>{apiSt.title}</Text>
        {apiSt.details ? (
          <Text style={[st.storyCardDesc, { color: tc.textSecondary }]} numberOfLines={2}>{apiSt.details}</Text>
        ) : null}
        {apiSt.hashtags?.length ? (
          <View style={[st.storyHashtags, { marginBottom: 10 }]}>
            {apiSt.hashtags.slice(0, 3).map((h, i) => (
              <Text
                key={i}
                style={[
                  st.storyHashtag,
                  { backgroundColor: isDark ? "rgba(0,118,235,0.18)" : "rgba(0,118,235,0.08)" },
                ]}
              >
                {h.startsWith("#") ? h : `#${h}`}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Action row */}
        <View style={[st.storyEngBar, { paddingTop: 10, borderTopColor: tc.borderLight }]}>
          <Pressable style={st.storyEngItem} hitSlop={8}
            onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); void onToggleStoryLikeFromFeed(apiSt.id); }}>
            <Ionicons name={apiSt.likedByMe ? "heart" : "heart-outline"} size={18} color={apiSt.likedByMe ? "#EF4444" : tc.textTertiary} />
            <Text style={[st.storyEngText, { color: apiSt.likedByMe ? "#EF4444" : tc.textTertiary }]}>{apiSt.likedByMe ? "Liked" : "Like"}</Text>
          </Pressable>
          <Pressable style={st.storyEngItem} hitSlop={8}
            onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openStoryViewerAt(ai, si); }}>
            <Ionicons name="chatbubble-outline" size={17} color={tc.textTertiary} />
            <Text style={[st.storyEngText, { color: tc.textTertiary }]}>Comment</Text>
          </Pressable>
          <Pressable style={st.storyEngItem} hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              Haptics.selectionAsync();
              const link = getShareLink("story", apiSt.id);
              void Share.share({
                message: `${apiSt.title}${apiSt.details ? ` — ${apiSt.details}` : ""}\n\nShared via ComLinkr\n\n${link}`,
                ...(Platform.OS === "ios" ? { url: link } : {}),
              });
            }}>
            <Ionicons name="share-social-outline" size={17} color={tc.textTertiary} />
            <Text style={[st.storyEngText, { color: tc.textTertiary }]}>Share</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});
