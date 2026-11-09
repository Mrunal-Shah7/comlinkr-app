// src/features/explore/components/NewsCommentsSheet.tsx — comments on a news article, in the native bottom sheet
// (DSheet). Used by the Explore feed's news cards and by the article route (TR-017). It loads, pages and posts on
// its own; the caller hears the new comment count through onCountChange.
import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, FlatList, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DSheet } from "../../../shared/d/Sheet";
import { useTheme } from "../../../theme/useTheme";
import { Colors } from "../../../theme/colors";
import { palette } from "../../../theme/palette";
import { rs } from "../../../utils/responsive";
import { nw } from "../styles/news.styles";
import { FadeImage } from "../../../../components/FadeImage";
import { LinkifiedText } from "../../../../components/LinkifiedText";
import { addArticleComment, getArticleComments, type NewsArticleComment } from "../../../api/news.api";
import { useRequireAuth } from "../../../shared/hooks/useRequireAuth";
import { newsTimeAgo } from "../news";

export function NewsCommentsSheet({ articleId, title, onClose, onCountChange }: {
  /** The article whose comments are shown; null keeps the sheet closed. */
  articleId: string | null;
  title?: string;
  onClose: () => void;
  onCountChange?: (articleId: string, count: number) => void;
}) {
  const { tc } = useTheme();
  const { height } = useWindowDimensions();
  const { requireAuth } = useRequireAuth();
  const [comments, setComments] = useState<NewsArticleComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setComments([]);
    setDraft("");
    setError(null);
    setPage(1);
    setHasMore(false);
    if (!articleId) return;
    let live = true;
    setLoading(true);
    getArticleComments(articleId, { page: 1, pageSize: 20 })
      .then((res) => {
        if (!live) return;
        setComments(Array.isArray(res?.data) ? res.data : []);
        setHasMore((res?.meta?.page ?? 1) < (res?.meta?.totalPages ?? 1));
        setTotal(res?.meta?.total ?? 0);
        onCountChange?.(articleId, res?.meta?.total ?? 0);
      })
      .catch(() => {
        if (live) setError("Could not load comments.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // Reload only when the article changes; onCountChange is a callback prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const loadMore = useCallback(async () => {
    if (!articleId || !hasMore || loading) return;
    const next = page + 1;
    setLoading(true);
    try {
      const res = await getArticleComments(articleId, { page: next, pageSize: 20 });
      setComments((prev) => [...prev, ...(Array.isArray(res?.data) ? res.data : [])]);
      setPage(next);
      setHasMore((res?.meta?.page ?? next) < (res?.meta?.totalPages ?? next));
    } catch {
      setError("Could not load more comments.");
    } finally {
      setLoading(false);
    }
  }, [articleId, hasMore, loading, page]);

  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => setTotal(null), [articleId]);

  const submit = useCallback(async () => {
    if (!articleId || !draft.trim()) return;
    if (!requireAuth(undefined, "Sign in to join the conversation.")) return;
    setSending(true);
    setError(null);
    try {
      const created = await addArticleComment(articleId, draft.trim());
      setComments((prev) => [created, ...prev]);
      const nextTotal = (total ?? comments.length) + 1;
      setTotal(nextTotal);
      onCountChange?.(articleId, nextTotal);
      setDraft("");
    } catch {
      setError("Could not post comment.");
    } finally {
      setSending(false);
    }
  }, [articleId, comments.length, draft, onCountChange, requireAuth, total]);

  return (
    <DSheet visible={!!articleId} onClose={onClose} title="Comments">
      {title ? (
        <Text style={{ color: tc.textSecondary, paddingHorizontal: rs(18), marginBottom: rs(6), fontSize: rs(13) }} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
      {loading && comments.length === 0 ? (
        <View style={nw.commentsLoadingWrap}>
          <ActivityIndicator color={Colors.brand.blue} />
        </View>
      ) : comments.length === 0 ? (
        <View style={nw.commentsLoadingWrap}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={tc.textTertiary} />
          <Text style={{ color: tc.textTertiary }}>Be the first to comment</Text>
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: height * 0.5 }}
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={nw.commentsList}
          onEndReachedThreshold={0.35}
          onEndReached={() => void loadMore()}
          renderItem={({ item }) => {
            const initials = (item.author.name || item.author.username || "U")
              .split(" ")
              .map((p) => p[0] ?? "")
              .join("")
              .toUpperCase()
              .slice(0, 2);
            return (
              <View style={[nw.commentRow, { borderBottomColor: tc.borderLight }]}>
                {item.author.avatarUrl ? (
                  <FadeImage uri={item.author.avatarUrl} style={nw.commentAvatar} />
                ) : (
                  <View style={[nw.commentAvatar, { backgroundColor: tc.inputBg, alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ color: tc.textSecondary, fontSize: rs(11), fontWeight: "700" }}>{initials}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[nw.commentAuthor, { color: tc.textPrimary }]}>@{item.author.username}</Text>
                  <LinkifiedText text={item.content} style={[nw.commentText, { color: tc.textSecondary }]} />
                  <Text style={[nw.commentTime, { color: tc.textTertiary }]}>{newsTimeAgo(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
      {error ? <Text style={[nw.commentErr, { color: tc.dangerText }]}>{error}</Text> : null}
      <View style={[nw.commentsInputRow, { borderTopColor: tc.borderLight }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment..."
          placeholderTextColor={tc.textTertiary}
          maxLength={1000}
          style={[nw.commentsInput, { color: tc.textPrimary, borderColor: tc.borderLight, backgroundColor: tc.inputBg }]}
        />
        <Pressable
          style={[nw.commentsSendBtn, sending && { opacity: 0.6 }]}
          disabled={sending || !draft.trim()}
          onPress={() => void submit()}
          accessibilityLabel="Post comment"
        >
          {sending ? <ActivityIndicator size="small" color={palette.white} /> : <Ionicons name="send" size={14} color={palette.white} />}
        </Pressable>
      </View>
    </DSheet>
  );
}
