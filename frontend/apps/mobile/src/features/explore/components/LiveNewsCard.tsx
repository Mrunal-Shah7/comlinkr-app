import { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { RADIUS, TYPE, body, display } from "../../../theme/d";
import { PressableScale } from "../../../shared/d";
import { SPRING } from "../../../shared/motion/presets";
import { FadeImage } from "../../../../components/FadeImage";
import { type NewsArticle, BASE_NEWS_CATEGORIES, newsTimeAgo, isSameContent } from "../news";

const LIKE = "#F0457E";

/** Heart / bookmark that pops when toggled (scale 1 → 1.32 → 1, spring). */
function PopIcon({ on, name, onName, color, onColor, size, onPress, label, count }: {
  on: boolean; name: keyof typeof Ionicons.glyphMap; onName: keyof typeof Ionicons.glyphMap; color: string; onColor: string; size: number; onPress: () => void; label: string; count?: number;
}) {
  const sc = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sc.get() }] }));
  return (
    <Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }}
      onPress={(e) => { e.stopPropagation?.(); sc.set(withSequence(withTiming(1.32, { duration: 120 }), withSpring(1, SPRING.press))); onPress(); }}
      style={s.act}>
      <Animated.View style={st}><Ionicons name={on ? onName : name} size={size} color={on ? onColor : color} /></Animated.View>
      {count ? <Text style={[body(700), { fontSize: 13, color: on ? onColor : color }]}>{count}</Text> : null}
    </Pressable>
  );
}

/** A Live News article (Explore → News), design D (plan 01). The first article is a feature card; the rest
 *  are compact rows. A photo shows only when the article has one. Handlers must be stable (memoized row). */
export const LiveNewsCard = memo(function LiveNewsCard({
  article,
  isFeatured,
  isExpanded,
  isLiked,
  isSaved,
  isRead,
  likeCount,
  commentCount,
  onOpen,
  onToggleExpand,
  onLike,
  onComments,
  onShare,
  onToggleSave,
}: {
  article: NewsArticle;
  isFeatured: boolean;
  isExpanded: boolean;
  isLiked: boolean;
  isSaved: boolean;
  isRead: boolean;
  likeCount: number;
  commentCount: number;
  onOpen: (article: NewsArticle) => void;
  onToggleExpand: (id: string) => void;
  onLike: (id: string) => unknown;
  onComments: (id: string) => unknown;
  onShare: (article: NewsArticle) => unknown;
  onToggleSave: (id: string) => unknown;
}) {
  const { tc, isDark } = useTheme();
  const catMeta = BASE_NEWS_CATEGORIES.find((c) => c.id === article.category);
  const hasDesc = article.description.length > 0 && !isSameContent(article.title, article.description);
  const meta = `${article.source} · ${newsTimeAgo(article.publishedAt)}`;

  const actions = (
    <View style={s.actions}>
      <PopIcon on={isLiked} name="heart-outline" onName="heart" color={tc.textSecondary} onColor={LIKE} size={19} label="Like" count={likeCount} onPress={() => void onLike(article.id)} />
      <Pressable hitSlop={6} onPress={(e) => { e.stopPropagation?.(); void onComments(article.id); }} style={s.act} accessibilityRole="button" accessibilityLabel="Comments">
        <Ionicons name="chatbubble-outline" size={18} color={tc.textSecondary} />
        {commentCount ? <Text style={[body(700), { fontSize: 13, color: tc.textSecondary }]}>{commentCount}</Text> : null}
      </Pressable>
      <Pressable hitSlop={6} onPress={(e) => { e.stopPropagation?.(); void onShare(article); }} style={s.act} accessibilityRole="button" accessibilityLabel="Share">
        <Ionicons name="share-social-outline" size={18} color={tc.textSecondary} />
      </Pressable>
      <View style={{ marginLeft: "auto" }}>
        <PopIcon on={isSaved} name="bookmark-outline" onName="bookmark" color={tc.textSecondary} onColor={tc.accentText} size={19} label="Save" onPress={() => void onToggleSave(article.id)} />
      </View>
    </View>
  );

  const card = [s.card, { backgroundColor: tc.cardBg, borderColor: tc.glassLine, borderWidth: isDark ? 1 : 0 }];

  if (isFeatured) {
    return (
      <PressableScale onPress={() => onOpen(article)} style={card} accessibilityRole="button" accessibilityLabel={article.title}>
        {article.image ? <FadeImage uri={article.image} style={s.featImg} /> : null}
        <View style={s.featBody}>
          <View style={s.metaRow}>
            <View style={[s.tag, { backgroundColor: tc.accentSoft }]}><Text style={[body(700), { fontSize: 11.5, color: tc.accentText }]}>{catMeta?.label ?? "News"}</Text></View>
            {isRead ? <View style={[s.tag, { backgroundColor: tc.mintSoft }]}><Text style={[body(700), { fontSize: 11.5, color: tc.successText }]}>Read</Text></View> : null}
            <Text style={[TYPE.small, { color: tc.textSecondary, flexShrink: 1 }]} numberOfLines={1}>{meta}</Text>
          </View>
          <Text style={[display(700), { fontSize: 18, lineHeight: 22, color: tc.textPrimary, marginTop: 8 }]} numberOfLines={4}>{article.title}</Text>
          {hasDesc ? (
            <Pressable onPress={(e) => { e.stopPropagation?.(); onToggleExpand(article.id); }}>
              <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 6 }]} numberOfLines={isExpanded ? undefined : 3}>{article.description}</Text>
            </Pressable>
          ) : null}
          {actions}
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale onPress={() => onOpen(article)} style={card} accessibilityRole="button" accessibilityLabel={article.title}>
      <View style={s.row}>
        {article.image ? <FadeImage uri={article.image} style={s.thumb} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>{isRead ? "Read · " : ""}{meta}</Text>
          <Text style={[display(700), { fontSize: 15.5, lineHeight: 19, color: tc.textPrimary, marginTop: 3 }]} numberOfLines={3}>{article.title}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>{actions}</View>
    </PressableScale>
  );
});

const s = StyleSheet.create({
  card: { borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 12, shadowColor: "#0F283C", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  featImg: { margin: 6, borderRadius: 22, aspectRatio: 16 / 11 },
  featBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  row: { flexDirection: "row", gap: 12, padding: 14, paddingBottom: 2, alignItems: "center" },
  thumb: { width: 96, height: 84, borderRadius: 18 },
  actions: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 6, marginHorizontal: -8 },
  act: { flexDirection: "row", alignItems: "center", gap: 5, height: 36, paddingHorizontal: 8, borderRadius: 10 },
});
