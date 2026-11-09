// A news article (TR-017, plan 03 addendum). Opened from the Explore feed's news cards, which hand over the article
// they show, and from a link (/news/<id>), which reads it from GET /news/articles/:id.
import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, Share, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { getArticleStats, getNewsArticle, saveNewsArticle, toggleArticleLike } from "../../src/api/news.api";
import { ApiError } from "../../src/api/client";
import { closeDetail, useIdParam } from "../../src/hooks/useDetailRoute";
import { emitNewsPatch, peekArticle } from "../../src/features/explore/newsArticleStore";
import { type NewsArticle, newsTimeAgo, isSameContent } from "../../src/features/explore/news";
import { BASE_NEWS_CATEGORIES } from "../../src/features/explore/news";
import { NewsLeadImage } from "../../src/features/explore/components/NewsImages";
import { NewsCommentsSheet } from "../../src/features/explore/components/NewsCommentsSheet";
import { nw } from "../../src/features/explore/styles/news.styles";
import { EmptyState } from "../../src/shared/d";
import { useAuthStore } from "../../src/store/auth.store";
import { useGuestLocationStore } from "../../src/store/guestLocation.store";
import { useSidebarStore } from "../../src/store/sidebar.store";
import { useRequireAuth } from "../../src/shared/hooks/useRequireAuth";
import { useTheme } from "../../src/theme/useTheme";
import { Colors } from "../../src/theme/colors";
import { palette } from "../../src/theme/palette";
import { rs } from "../../src/utils/responsive";

export default function NewsArticleScreen() {
  const id = useIdParam();
  const { tc } = useTheme();
  const insets = useSafeAreaInsets();
  const { requireAuth } = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const guestCity = useGuestLocationStore((s) => s.city);
  const guestCountry = useGuestLocationStore((s) => s.country);
  const city = (user?.city && user.city.trim()) || guestCity || "";
  const userCountry = user?.country || guestCountry || "United States";

  const seed = peekArticle(id);
  const articleQuery = useQuery<NewsArticle>({
    queryKey: ["news", "article", id],
    queryFn: () => getNewsArticle(id),
    enabled: !!id,
    // From the feed the article is already here; only a link needs the request.
    initialData: seed,
    staleTime: seed ? Infinity : 0,
  });
  const article = articleQuery.data;

  const statsQuery = useQuery({
    queryKey: ["news", "stats", id, user?.id ?? ""],
    queryFn: () => getArticleStats(id),
    enabled: !!id && !!article,
    staleTime: 0,
  });
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  useEffect(() => {
    const st = statsQuery.data;
    if (!st) return;
    setLiked(st.likedByMe);
    setSaved(st.savedByMe);
    setLikeCount(st.likeCount);
    setCommentCount(st.commentCount);
  }, [statsQuery.data]);

  const like = async () => {
    if (!requireAuth(undefined, "Sign in to like news from your area.")) return;
    const was = liked;
    setLiked(!was);
    setLikeCount((n) => Math.max(0, n + (was ? -1 : 1)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await toggleArticleLike(id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
      emitNewsPatch({ id, liked: res.liked, likeCount: res.likeCount });
    } catch {
      setLiked(was);
      setLikeCount((n) => Math.max(0, n + (was ? 1 : -1)));
    }
  };

  const save = async () => {
    if (!article || !requireAuth(undefined, "Sign in to save articles and read them later.")) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const was = saved;
    setSaved(!was);
    useSidebarStore.getState().incrementSaved(was ? -1 : 1);
    try {
      const res = await saveNewsArticle(id, {
        title: article.title,
        url: article.url,
        imageUrl: article.image ?? undefined,
        source: article.source,
        publishedAt: article.publishedAt,
      });
      if (typeof res.saved === "boolean") {
        setSaved(res.saved);
        if (res.saved === was) useSidebarStore.getState().incrementSaved(was ? 1 : -1);
        emitNewsPatch({ id, saved: res.saved });
      }
    } catch {
      setSaved(was);
      useSidebarStore.getState().incrementSaved(was ? 1 : -1);
    }
  };

  const share = async () => {
    if (!article) return;
    try {
      const link = article.url && article.url !== "#" ? article.url : "";
      await Share.share({
        title: article.title,
        message: `${article.title}\n\n${article.description}${link ? `\n\n${link}` : ""}`,
        ...(process.env.EXPO_OS === "ios" && link ? { url: link } : {}),
      });
    } catch {}
  };

  const onCommentCount = useCallback((articleId: string, n: number) => {
    setCommentCount(n);
    emitNewsPatch({ id: articleId, commentCount: n });
  }, []);

  const header = (
    <View style={[nw.modalHeader, { paddingTop: insets.top + rs(8), backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }]}>
      <Pressable onPress={closeDetail} style={[nw.modalBackBtn, { backgroundColor: tc.inputBg }]} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={22} color={tc.textPrimary} />
      </Pressable>
      <Text style={[nw.modalHeaderTitle, { color: tc.textPrimary, flex: 1, textAlign: "center", marginHorizontal: rs(8) }]} numberOfLines={1}>
        Article
      </Text>
      <Pressable onPress={() => void share()} disabled={!article} style={[nw.modalShareBtn, { backgroundColor: tc.inputBg }]} accessibilityLabel="Share">
        <Ionicons name="share-social-outline" size={20} color={tc.textPrimary} />
      </Pressable>
    </View>
  );

  if (!article) {
    const gone = articleQuery.error instanceof ApiError && articleQuery.error.status === 404;
    return (
      <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
        {header}
        {articleQuery.isPending ? (
          <ActivityIndicator color={Colors.brand.blue} style={{ marginTop: rs(40) }} />
        ) : (
          <EmptyState
            icon="newspaper-outline"
            title={gone ? "This article is no longer available" : "Could not load the article"}
            sub={gone ? "News moves fast. Open Explore for today's stories." : "Check your connection and try again."}
            actionLabel={gone ? "Back" : "Try again"}
            onAction={gone ? closeDetail : () => void articleQuery.refetch()}
          />
        )}
      </View>
    );
  }

  const category = BASE_NEWS_CATEGORIES.find((c) => c.id === article.category);
  const hasSummary = article.description.length > 0 && !isSameContent(article.title, article.description);

  return (
    <View style={[nw.modalRoot, { backgroundColor: tc.pageBg }]}>
      {header}
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={nw.modalScroll} showsVerticalScrollIndicator={false}>
        <NewsLeadImage article={article} city={city} userCountry={userCountry} remoteUri={article.image} variant="modal" style={nw.modalHeroImg} />
        <View style={[nw.modalBody, { backgroundColor: tc.pageBg }]}>
          <View style={[nw.articleCatPill, { alignSelf: "flex-start", marginBottom: rs(8), backgroundColor: tc.pillBg, flexDirection: "row", alignItems: "center", gap: rs(4) }]}>
            <Ionicons name={(category?.icon ?? "newspaper-outline") as keyof typeof Ionicons.glyphMap} size={rs(10)} color={tc.textSecondary} />
            <Text style={[nw.articleCatText, { color: tc.textSecondary }]}>{category?.label || "News"}</Text>
          </View>
          <Text style={[nw.modalTitle, { color: tc.textPrimary }]}>{article.title}</Text>
          <View style={nw.modalMeta}>
            <View style={nw.sourceDot} />
            <Text style={[nw.modalSource, { color: tc.textSecondary }]}>{article.source}</Text>
            <Text style={[nw.modalTime, { color: tc.textTertiary }]}>• {newsTimeAgo(article.publishedAt)}</Text>
          </View>
          <View style={[nw.modalDivider, { backgroundColor: tc.borderLight }]} />
          {hasSummary ? (
            <Text style={[nw.modalContent, { color: tc.textSecondary }]}>{article.description}</Text>
          ) : (
            <View style={[nw.modalContentNote, { backgroundColor: tc.secondaryBg }]}>
              <Ionicons name="document-text-outline" size={16} color={tc.textTertiary} />
              <Text style={[nw.modalContentNoteText, { color: tc.textTertiary }]}>Tap below to read the full article from {article.source}.</Text>
            </View>
          )}
          {hasSummary && article.description.length > 50 ? (
            <View style={[nw.modalContentNote, { backgroundColor: tc.secondaryBg }]}>
              <Ionicons name="information-circle-outline" size={16} color={tc.textTertiary} />
              <Text style={[nw.modalContentNoteText, { color: tc.textTertiary }]}>
                This is the article summary. Tap below to read the complete article from the original source.
              </Text>
            </View>
          ) : null}
          {article.url && article.url !== "#" ? (
            <Pressable onPress={() => Linking.openURL(article.url).catch(() => {})} style={nw.modalSourceBtn}>
              <Ionicons name="globe-outline" size={16} color={palette.white} />
              <Text style={nw.modalSourceBtnText}>Read Full Article on {article.source}</Text>
            </Pressable>
          ) : null}
          <View style={[nw.modalActions, { borderTopColor: tc.borderLight, backgroundColor: tc.cardBg }]}>
            <Pressable onPress={() => void like()} style={nw.modalActionBtn}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? palette.red500 : tc.textSecondary} />
              <Text style={[nw.modalActionLabel, { color: liked ? palette.red500 : tc.textSecondary }]}>{likeCount > 0 ? `Like · ${likeCount}` : "Like"}</Text>
            </Pressable>
            <Pressable onPress={() => setCommentsOpen(true)} style={nw.modalActionBtn}>
              <Ionicons name="chatbubble-outline" size={20} color={tc.textSecondary} />
              <Text style={[nw.modalActionLabel, { color: tc.textSecondary }]}>{commentCount > 0 ? `Comment · ${commentCount}` : "Comment"}</Text>
            </Pressable>
            <Pressable onPress={() => void share()} style={nw.modalActionBtn}>
              <Ionicons name="share-social-outline" size={20} color={tc.textSecondary} />
              <Text style={[nw.modalActionLabel, { color: tc.textSecondary }]}>Share</Text>
            </Pressable>
            <Pressable onPress={() => void save()} style={nw.modalActionBtn}>
              <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={20} color={saved ? Colors.brand.blue : tc.textSecondary} />
              <Text style={[nw.modalActionLabel, { color: tc.textSecondary }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <NewsCommentsSheet articleId={commentsOpen ? id : null} title={article.title} onClose={() => setCommentsOpen(false)} onCountChange={onCommentCount} />
    </View>
  );
}
