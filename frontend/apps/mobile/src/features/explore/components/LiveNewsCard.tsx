import { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { rs } from "../../../utils/responsive";
import { nw } from "../styles/news.styles";
import { type NewsArticle, BASE_NEWS_CATEGORIES, newsTimeAgo, isSameContent } from "../news";

/** A Live News article card (Explore → News → Live News). Handlers must be stable (the row is memoized). */
export const LiveNewsCard = memo(function LiveNewsCard({
  article,
  isFeatured,
  isExpanded,
  isLiked: isArticleLiked,
  isSaved: isArticleSaved,
  isRead,
  likeCount,
  commentCount,
  onOpen,
  onToggleExpand: toggleExpandArticle,
  onLike: handleNewsLike,
  onComments: openNewsComments,
  onShare: shareArticle,
  onToggleSave: toggleNewsSave,
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
  const { tc } = useTheme();
  const isTrending = false; // EXP-02: list position is not a popularity signal; no Trending claim without a ranking signal
  // Reading time: word count of description / 200 wpm (minimum 1 min)
  const wordCount = article.description
    ? article.description.split(/\s+/).filter(Boolean).length
    : article.title.split(/\s+/).length * 3;
  const readMins = Math.max(1, Math.round(wordCount / 200));
  const catMeta = BASE_NEWS_CATEGORIES.find((c) => c.id === article.category);

  const openArticle = () => onOpen(article);

  const catId = catMeta?.id as string | undefined;
  const accentColors: [string, string] = isFeatured
    ? ["#0076EB", "#26B324"]
    : catId === "sports" ? ["#EF4444", "#FF7B00"]
    : catId === "health" ? ["#26B324", "#00A878"]
    : catId === "technology" ? ["#7C3AED", "#0076EB"]
    : catId === "entertainment" ? ["#DB2777", "#FF7B00"]
    : catId === "world" ? ["#0076EB", "#6D28D9"]
    : ["#0076EB", "#0055CC"];

  return (
    <Pressable
      style={({ pressed }) => [nw.newsCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, pressed && { opacity: 0.94 }]}
      onPress={openArticle}
    >
      {/* Left accent bar */}
      <View style={nw.newsCardInner}>
        <LinearGradient
          colors={accentColors}
          style={nw.newsAccentBar}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />

        <View style={[nw.newsCardBody, { paddingLeft: rs(16) }]}>
          {/* Top row: badges left | time right — no overlap */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), flexWrap: "wrap", flex: 1, marginRight: rs(8) }}>
              <View style={[nw.articleCatPill, { backgroundColor: tc.pillBg, borderWidth: 1, borderColor: tc.borderLight, flexDirection: "row", alignItems: "center", gap: rs(4) }]}>
                <Ionicons name={(catMeta?.icon ?? "newspaper-outline") as any} size={rs(10)} color={tc.textSecondary as string} />
                <Text style={[nw.articleCatText, { color: tc.textSecondary, fontWeight: "700" }]}>
                  {catMeta?.label || "News"}
                </Text>
              </View>
              {isFeatured && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: Colors.brand.blue, borderRadius: rs(7), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                  <Ionicons name="star" size={rs(9)} color="#FFF" />
                  <Text style={{ fontSize: rs(9), fontWeight: "900", color: "#FFF", letterSpacing: 0.5 }}>FEATURED</Text>
                </View>
              )}
              {isTrending && !isFeatured && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(3), backgroundColor: "#EF4444", borderRadius: rs(7), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                  <Ionicons name="trending-up" size={rs(9)} color="#FFF" />
                  <Text style={{ fontSize: rs(9), fontWeight: "900", color: "#FFF", letterSpacing: 0.4 }}>TRENDING</Text>
                </View>
              )}
              {isRead && (
                <View style={{ backgroundColor: "#DCFCE7", borderRadius: rs(7), paddingHorizontal: rs(7), paddingVertical: rs(3) }}>
                  <Text style={{ fontSize: rs(9), fontWeight: "900", color: "#16A34A", letterSpacing: 0.4 }}>✓ READ</Text>
                </View>
              )}
            </View>
            <Text style={[nw.newsCardTime, { color: tc.textTertiary }]} numberOfLines={1}>{newsTimeAgo(article.publishedAt)}</Text>
          </View>

          {/* Title */}
          <Text style={[nw.newsCardTitle, { color: tc.textPrimary }, isFeatured && nw.newsCardTitleFeatured]} numberOfLines={isFeatured ? 4 : 3}>
            {article.title}
          </Text>

          {/* Description — always show up to 3 lines */}
          {article.description.length > 0 && !isSameContent(article.title, article.description) ? (
            <Text
              style={[nw.newsCardDesc, { color: tc.textSecondary }]}
              numberOfLines={isExpanded ? undefined : 3}
            >
              {article.description}
            </Text>
          ) : (
            <Text style={[nw.newsCardDesc, { color: tc.textTertiary, fontStyle: "italic" }]} numberOfLines={2}>
              Tap to read the full story from {article.source}.
            </Text>
          )}

          {/* Expand / Collapse */}
          {article.description.length > 120 && !isSameContent(article.title, article.description) && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); toggleExpandArticle(article.id); }}
              style={nw.expandBtn}
            >
              <Text style={nw.expandBtnText}>{isExpanded ? "Show less" : "Read more"}</Text>
              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={rs(13)} color={Colors.brand.blue} />
            </Pressable>
          )}

          {/* Source + read time + actions */}
          <View style={[nw.newsActions, { borderTopColor: tc.borderLight }]}>
            <View style={nw.newsCardSourceRow}>
              <View style={nw.sourceDot} />
              <Text style={nw.newsCardSource} numberOfLines={1}>{article.source}</Text>
              <View style={[nw.readTimeChip, { backgroundColor: tc.inputBg }]}>
                <Ionicons name="time-outline" size={rs(10)} color={tc.textTertiary} />
                <Text style={[nw.readTimeText, { color: tc.textTertiary }]}>{readMins} min</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4), marginLeft: "auto" as any }}>
              <Pressable onPress={(e) => { e.stopPropagation?.(); void handleNewsLike(article.id); }} style={[nw.newsAction, { flexDirection: "row", alignItems: "center", gap: rs(3) }]}>
                <Ionicons name={isArticleLiked ? "heart" : "heart-outline"} size={rs(15)} color={isArticleLiked ? "#EF4444" : tc.textSecondary} />
                {likeCount > 0 && <Text style={{ fontSize: rs(11), fontWeight: "700", color: isArticleLiked ? "#EF4444" : tc.textSecondary }}>{likeCount}</Text>}
              </Pressable>
              <Pressable onPress={(e) => { e.stopPropagation?.(); void openNewsComments(article.id); }} style={[nw.newsAction, { flexDirection: "row", alignItems: "center", gap: rs(3) }]}>
                <Ionicons name="chatbubble-outline" size={rs(14)} color={tc.textSecondary} />
                {commentCount > 0 && <Text style={{ fontSize: rs(11), fontWeight: "700", color: tc.textSecondary }}>{commentCount}</Text>}
              </Pressable>
              <Pressable onPress={(e) => { e.stopPropagation?.(); shareArticle(article); }} style={nw.newsAction}>
                <Ionicons name="share-social-outline" size={rs(15)} color={tc.textSecondary} />
              </Pressable>
              <Pressable onPress={(e) => { e.stopPropagation?.(); toggleNewsSave(article.id); }} style={nw.newsAction}>
                <Ionicons name={isArticleSaved ? "bookmark" : "bookmark-outline"} size={rs(16)} color={isArticleSaved ? Colors.brand.blue : tc.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});
