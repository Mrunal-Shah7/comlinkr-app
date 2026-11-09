import { rs } from "../src/utils/responsive";
import React, { useState, useCallback, useEffect, useRef } from "react"; // SPRINT-42: subscribe to successful in-memory post edits.
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect } from "expo-router";
import { queryKeys } from "../src/services/cache/queryKeys";
import { useInfiniteScreenQuery } from "../src/hooks/useInfiniteScreenQuery";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useAuthStore } from "../src/store/auth.store";
import { useTheme } from "../src/theme/useTheme";
import { ApiError } from "../src/api/client";
import { getMyPosts, getPost, deletePost, updatePost, subscribeToPostUpdates, getLatestPostUpdate, type UnifiedMyPost, type UnifiedMyPostType } from "../src/api/feed.api"; // SPRINT-42: detail GET supplies isEdited; list endpoint omits it.
import { deleteEvent, getMyEvents } from "../src/api/events.api";
import { RatingSummary } from "../components/events"; // SPRINT-42:
import { getMyStories } from "../src/api/stories.api";
import { getQuestions, deleteQuestion } from "../src/api/community-qa.api";
import { showToast } from "../src/shared/ui/Toast";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { TYPE } from '../src/theme/d';
import { Chip, EmptyState, GradientButton, PressableScale, Reveal, SoftButton, Tag } from '../src/shared/d';
import { DSheet } from '../src/shared/d/Sheet';
import { DPage, goBackOr } from '../src/shared/d/Page';

/** Post types the backend supports editing via `PATCH /feed/:id` (mirrors deletePost's NEWS/ANNOUNCEMENT/JOBS coverage). */
const EDITABLE_TYPES: ReadonlySet<UnifiedMyPostType> = new Set(["NEWS", "ANNOUNCEMENT", "JOBS"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatEventDate(iso: unknown): string {
  if (!iso) return "Date TBD";
  try {
    const d = new Date(String(iso));
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return String(iso);
  }
}

function metaNum(m: Record<string, unknown> | undefined | null, key: string): number {
  if (!m) return 0;
  const v = m[key];
  return typeof v === "number" && !Number.isNaN(v) ? v : 0;
}

const FILTER_TABS = ["All", "News", "Community", "Events", "Stories", "Challenges"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const TYPE_META: Record<string, { label: string; bg: string; color: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  NEWS:         { label: "News",         bg: Colors.brand.blueLight,   color: Colors.brand.blue,   icon: "newspaper-outline"     },
  COMMUNITY:    { label: "Discussion",   bg: Colors.brand.blueLight,   color: Colors.brand.blue,   icon: "people-outline"        },
  ANNOUNCEMENT: { label: "Announcement", bg: "#FFF7ED",                color: Colors.brand.orange, icon: "megaphone-outline"     },
  JOBS:         { label: "Job Post",     bg: Colors.brand.greenLight,  color: Colors.brand.green,  icon: "briefcase-outline"     },
  QUESTION:     { label: "Q&A",          bg: Colors.brand.blueLight,   color: Colors.brand.blue,   icon: "help-circle-outline"   },
  POLL:         { label: "Poll",         bg: Colors.brand.orangeLight, color: Colors.brand.orange, icon: "bar-chart-outline"     },
  EVENT:        { label: "Event",        bg: Colors.brand.orangeLight, color: Colors.brand.orange, icon: "calendar-outline"      },
  STORY:        { label: "Story",        bg: Colors.brand.greenLight,  color: Colors.brand.green,  icon: "images-outline"        },
  CHALLENGE:    { label: "Challenge",    bg: Colors.brand.orangeLight, color: Colors.brand.orange, icon: "trophy-outline"        },
  LISTING:      { label: "Listing",      bg: "#FFF1F2",                color: "#E11D48",           icon: "home-outline"          },
  HOUSING:      { label: "Listing",      bg: "#FFF1F2",                color: "#E11D48",           icon: "home-outline"          },
  FOOD:         { label: "Restaurant",   bg: Colors.brand.orangeLight, color: Colors.brand.orange, icon: "restaurant-outline"    },
};

const FALLBACK_META = { label: "Post", bg: "#F3F5F8", color: "#6B7280", icon: "document-text-outline" as React.ComponentProps<typeof Ionicons>["name"] };

function getTypeMeta(t: string) {
  return TYPE_META[t] ?? FALLBACK_META;
}

function filterMatches(tab: FilterTab, t: string): boolean {
  if (tab === "All") return true;
  if (tab === "News") return ["NEWS", "ANNOUNCEMENT", "JOBS"].includes(t);
  if (tab === "Community") return ["COMMUNITY", "QUESTION", "POLL"].includes(t);
  if (tab === "Events") return t === "EVENT";
  if (tab === "Stories") return t === "STORY";
  if (tab === "Challenges") return t === "CHALLENGE";
  return true;
}

function tabIcon(tab: FilterTab): React.ComponentProps<typeof Ionicons>["name"] {
  if (tab === "News") return "newspaper-outline";
  if (tab === "Community") return "people-outline";
  if (tab === "Events") return "calendar-outline";
  if (tab === "Stories") return "images-outline";
  if (tab === "Challenges") return "trophy-outline";
  return "layers-outline";
}

function countForTab(tab: FilterTab, items: UnifiedMyPost[]): number {
  if (tab === "All") return items.length;
  return items.filter((p) => filterMatches(tab, p.type)).length;
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MyPostsScreen() {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const user = useAuthStore((s) => s.user);
  const { tc } = useTheme();
  const [filter, setFilter] = useState<FilterTab>("All");
  const [detailPost, setDetailPost] = useState<UnifiedMyPost | null>(null); // SPRINT-42: declare detail state before the edit subscription patches it.

  const PAGE_SIZE = 30;

  // Page 1 merges the user's posts with their events, stories and questions; later pages are posts only.
  const fetchPage = async (nextPage: number) => {
    const append = nextPage > 1;
    {
      const [postsRes, eventsRes, storiesRes, questionsRes] = await Promise.allSettled([
        getMyPosts({ page: nextPage, pageSize: PAGE_SIZE }),
        nextPage === 1 ? getMyEvents() : Promise.resolve(null),
        nextPage === 1 ? getMyStories() : Promise.resolve(null),
        nextPage === 1 ? getQuestions({ page: 1, pageSize: 50, sort: "recent" }) : Promise.resolve(null),
      ]);

      if (postsRes.status === "rejected") {
        const msg = postsRes.reason instanceof ApiError ? postsRes.reason.message : String(postsRes.reason);
        throw new Error(`Could not load posts: ${msg}`);
      }
      const posts = postsRes.status === "fulfilled" ? postsRes.value.data : [];
      const hasMore = postsRes.status === "fulfilled" ? postsRes.value.hasMore : false;

      const postIds = new Set(posts.map((p) => p.id));

      const events: UnifiedMyPost[] = eventsRes.status === "fulfilled" && eventsRes.value
        ? (eventsRes.value as any[])
            .filter((e) => !postIds.has(e.id))
            .map((e) => ({
              id: e.id,
              type: "EVENT" as UnifiedMyPostType,
              title: e.title,
              content: e.description ?? "",
              category: e.category ?? "Event",
              status: null,
              createdAt: e.createdAt ?? new Date().toISOString(),
              metadata: {
                date: e.date,
                venue: e.venue ?? (e as any).location,
                attendeeCount: e.attendeeCount ?? (e as any).attendees ?? 0,
                averageRating: Number(e.averageRating ?? 0) || 0, // SPRINT-42:
                totalReviews: Number(e.totalReviews ?? 0) || 0, // SPRINT-42:
              },
            }))
        : [];

      const stories: UnifiedMyPost[] = storiesRes.status === "fulfilled" && storiesRes.value
        ? (storiesRes.value as any[])
            .filter((s) => !postIds.has(s.id))
            .map((s) => ({
              id: s.id,
              type: "STORY" as UnifiedMyPostType,
              title: s.title ?? "Story",
              content: s.description ?? "",
              category: s.category ?? "Story",
              status: s.isExpired ? "EXPIRED" : "ACTIVE",
              createdAt: s.createdAt ?? new Date().toISOString(),
              metadata: { viewsCount: s.viewsCount ?? 0, mediaType: s.mediaType },
            }))
        : [];

      // Community questions asked by this user (filter client-side by author ID)
      const currentUserId = user?.id;
      const communityQs: UnifiedMyPost[] = questionsRes.status === "fulfilled" && questionsRes.value && currentUserId
        ? (questionsRes.value.data as any[])
            .filter((q) => q.author?.id === currentUserId && !postIds.has(q.id))
            .map((q) => ({
              id: q.id,
              type: "QUESTION" as UnifiedMyPostType,
              title: q.question ?? q.title ?? "Community question",
              content: q.details ?? q.content ?? "",
              category: (q.tags?.[0] ?? "Community"),
              status: null,
              createdAt: q.createdAt ?? new Date().toISOString(),
              metadata: {
                answersCount: q.answersCount ?? 0,
                likesCount: q.votes ?? 0,
                commentsCount: q.answersCount ?? 0,
                tags: q.tags ?? [],
              },
            }))
        : [];

      const combined = append
        ? [...posts]
        : [...posts, ...events, ...stories, ...communityQs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

      return { items: combined, hasMore };
    }
  };

  const list = useInfiniteScreenQuery<UnifiedMyPost>({
    queryKey: [...queryKeys.myPosts(), user?.id ?? ""],
    fetchPage,
    enabled: !!user?.id,
    staleTime: 0,
  });
  const { items, setItems, loading, loadingMore, hasMore, refreshing, onRefresh } = list;
  const error = list.error ? (list.error instanceof Error ? list.error.message : "Could not load your posts.") : null;
  useEffect(() => subscribeToPostUpdates((updated) => { // SPRINT-42: consume memory-only successful post updates.
    setItems((posts) => posts.map((post) => post.id === updated.id ? { ...post, title: updated.title, content: updated.content, category: updated.category, isEdited: updated.isEdited, metadata: { ...post.metadata, tags: updated.tags, location: updated.location, sourceLabel: updated.sourceLabel } } : post)); // SPRINT-42: preserve all edited fields through the unified card mapping.
    setDetailPost((post) => post?.id === updated.id ? { ...post, title: updated.title, content: updated.content, category: updated.category, isEdited: updated.isEdited, metadata: { ...post.metadata, tags: updated.tags, location: updated.location, sourceLabel: updated.sourceLabel } } : post); // SPRINT-42: patch an open detail boundary.
  }), [setItems]); // SPRINT-42: release the subscription automatically on unmount.



  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ME";

  const filtered = items.filter((p) => filterMatches(filter, p.type));

  let totalLikes = 0;
  let totalComments = 0;
  for (const p of items) {
    totalLikes += metaNum(p.metadata, "likesCount");
    totalComments += metaNum(p.metadata, "commentsCount");
    // also accumulate attendees/views/participants as engagement
    totalLikes += metaNum(p.metadata, "viewsCount");
    totalLikes += metaNum(p.metadata, "attendeeCount");
  }

  // Delete = take it off the list now, offer Undo, and only call the server once the toast is gone (4.5 s).
  // Leaving the screen sends any pending delete straight away.
  const pendingDeletes = useRef(new Map<string, { post: UnifiedMyPost; timer: ReturnType<typeof setTimeout> }>());
  const commitDelete = useCallback(async (post: UnifiedMyPost) => {
    pendingDeletes.current.delete(post.id);
    try {
      if (post.type === "NEWS" || post.type === "ANNOUNCEMENT" || post.type === "JOBS") await deletePost(post.id);
      else if (post.type === "EVENT") await deleteEvent(post.id);
      else if (post.type === "QUESTION" || post.type === "COMMUNITY") await deleteQuestion(post.id);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Delete failed.";
      showToast(msg, "error");
      setItems((prev) => (prev.some((x) => x.id === post.id) ? prev : [post, ...prev]));
    }
  }, [setItems]);
  useEffect(() => () => {
    pendingDeletes.current.forEach(({ post, timer }) => { clearTimeout(timer); void commitDelete(post); });
  }, [commitDelete]);

  const handleDelete = (post: UnifiedMyPost) => {
    const supported = ["NEWS", "ANNOUNCEMENT", "JOBS", "EVENT", "QUESTION", "COMMUNITY"].includes(post.type);
    if (!supported) {
      showToast("Deleting stories and challenges from the app is not supported yet.", "info");
      return;
    }
    let index = -1;
    setItems((prev) => { index = prev.findIndex((x) => x.id === post.id); return prev.filter((x) => x.id !== post.id); });
    const timer = setTimeout(() => void commitDelete(post), 4600);
    pendingDeletes.current.set(post.id, { post, timer });
    showToast("Deleted", "info", {
      label: "Undo",
      onPress: () => {
        const p = pendingDeletes.current.get(post.id);
        if (!p) return;
        clearTimeout(p.timer);
        pendingDeletes.current.delete(post.id);
        setItems((prev) => { const n = [...prev]; n.splice(index < 0 ? 0 : Math.min(index, n.length), 0, post); return n; });
      },
    });
  };

  const openDetail = useCallback((post: UnifiedMyPost) => { // SPRINT-42: open detail and hydrate edit marker from GET /feed/:id when the unified list omits it.
    setDetailPost(post); // SPRINT-42: show the list row immediately.
    const feedEditable = EDITABLE_TYPES.has(post.type) || post.type === "NEWS"; // SPRINT-42: only feed posts have PATCH/detail isEdited.
    if (!feedEditable) return; // SPRINT-42: events/stories/etc. stay on unified data.
    void getPost(post.id) // SPRINT-42: single detail fetch on open — no N+1 list scan.
      .then((detail) => { // SPRINT-42: merge authoritative feed fields including isEdited.
        const latest = getLatestPostUpdate(detail.id); // SPRINT-42: prefer an in-memory PATCH if a fetch race returns stale data.
        const source = latest ?? detail; // SPRINT-42: never fabricate isEdited — only real GET/PATCH fields.
        setDetailPost((current) => // SPRINT-42: patch only if the same detail is still open.
          current?.id === source.id
            ? {
                ...current, // SPRINT-42: keep unified metadata not present on feed detail.
                title: source.title, // SPRINT-42: authoritative title.
                content: source.content, // SPRINT-42: authoritative body (unified list often lacks content).
                category: source.category, // SPRINT-42: authoritative category.
                isEdited: source.isEdited === true, // SPRINT-42: detail marker from GET /feed/:id (or latest PATCH).
                metadata: { // SPRINT-42: merge editable optional fields into metadata.
                  ...current.metadata, // SPRINT-42: retain counters from the unified row.
                  tags: source.tags, // SPRINT-42: tags from feed detail.
                  location: source.location, // SPRINT-42: location from feed detail.
                  sourceLabel: source.sourceLabel, // SPRINT-42: sourceLabel from feed detail.
                },
              }
            : current, // SPRINT-42: ignore late responses after close/switch.
        ); // SPRINT-42: finish detail merge.
      })
      .catch(() => { /* SPRINT-42: keep the list row if detail fetch fails; do not fabricate isEdited */ }); // SPRINT-42: soft-fail detail hydration.
  }, []); // SPRINT-42: stable opener.

  const [editPost, setEditPost] = useState<UnifiedMyPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const handleEdit = (post: UnifiedMyPost) => {
    if (!EDITABLE_TYPES.has(post.type)) {
      appAlert(
        "Not available",
        "Editing this type of post isn't supported yet. You can delete it and create a new one instead."
      );
      return;
    }
    router.push({ pathname: "/create-post", params: { type: "news", mode: "edit", id: post.id } } as any); // SPRINT-42: reuse the complete six-field post editor.
  };

  const handleSaveEdit = async () => {
    if (!editPost) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) {
      appAlert("Missing info", "Title and content can't be empty.");
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updatePost(editPost.id, { title, content });
      setItems((prev) =>
        prev.map((p) => (p.id === editPost.id ? { ...p, title: updated.title, content: updated.content } : p))
      );
      setEditPost(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not save changes.";
      appAlert("Edit failed", msg);
    } finally {
      setEditSaving(false);
    }
  };

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  const TYPE_ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
    COMMUNITY: "chatbubbles-outline", QUESTION: "help-circle-outline", POLL: "bar-chart-outline", NEWS: "newspaper-outline",
    ANNOUNCEMENT: "megaphone-outline", JOBS: "briefcase-outline", EVENT: "calendar-outline", STORY: "camera-outline",
    LISTING: "home-outline", HOUSING: "home-outline", FOOD: "restaurant-outline", CHALLENGE: "trophy-outline",
  };
  const subLine = items.length === 0 ? undefined : `${items.length} post${items.length === 1 ? "" : "s"}${totalLikes > 0 ? ` · ${totalLikes} likes` : ""}${totalComments > 0 ? ` · ${totalComments} comments` : ""}`;
  const postMenu = (post: UnifiedMyPost) => appAlert(post.title || "Post", undefined, [
    { text: "Edit", onPress: () => handleEdit(post) },
    { text: "Delete", style: "destructive", onPress: () => handleDelete(post) },
    { text: "Cancel", style: "cancel" },
  ]);

  return (
    <>
    <DPage
      title="My posts"
      sub={subLine}
      onBack={() => goBackOr("/(tabs)/feed")}
      right={
        <Pressable onPress={() => router.push("/create-post" as any)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Post something"
          style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: tc.inputBg }]}>
          <Ionicons name="add" size={26} color={tc.textPrimary} />
        </Pressable>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.accent} />}
    >
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: tc.warningBg }}>
          <Ionicons name="alert-circle-outline" size={18} color={tc.warningText} />
          <Text style={[TYPE.small, { flex: 1, color: tc.warningText }]}>{error}</Text>
        </View>
      ) : null}

      <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
        {FILTER_TABS.map((t) => {
          const count = countForTab(t, items);
          return <Chip key={t} label={count > 0 ? `${t} · ${count}` : t} on={filter === t} onPress={() => setFilter(t)} />;
        })}
      </GHScrollView>

      {loading && items.length === 0 ? <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 48 }} /> : null}

      {filtered.map((post, i) => {
        const meta = getTypeMeta(post.type);
        const likes = metaNum(post.metadata, "likesCount");
        const comments = metaNum(post.metadata, "commentsCount") || metaNum(post.metadata, "answersCount");
        const bits = [likes > 0 ? `♥ ${likes}` : "", comments > 0 ? `${comments} ${post.type === "QUESTION" ? "answers" : "comments"}` : "", formatRelativeTime(post.createdAt)].filter(Boolean);
        const extra = post.type === "EVENT" ? formatEventDate(post.metadata.date) : post.type === "STORY" && post.status === "EXPIRED" ? "Expired" : "";
        return (
          <Reveal key={`${post.type}-${post.id}`} i={i} style={{ marginHorizontal: 16, marginBottom: 10 }}>
            <PressableScale onPress={() => openDetail(post)} accessibilityRole="button" accessibilityLabel={post.title}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 22, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }}>
              <View style={{ width: 64, height: 64, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
                <Ionicons name={TYPE_ICON[post.type] ?? meta.icon} size={24} color={tc.accentText} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: tc.accentSoft }}>
                  <Text style={[TYPE.label, { color: tc.accentText, fontSize: 11 }]}>{meta.label}</Text>
                </View>
                <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]} numberOfLines={1}>{post.title}</Text>
                <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>{[...(extra ? [extra] : []), ...bits].join(" · ")}{post.isEdited ? " · edited" : ""}</Text>
              </View>
              <Pressable onPress={() => postMenu(post)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Post options" style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="ellipsis-horizontal" size={20} color={tc.textSecondary} />
              </Pressable>
            </PressableScale>
          </Reveal>
        );
      })}

      {!loading && hasMore ? (
        <SoftButton label={loadingMore ? "Loading…" : "Load more"} disabled={loadingMore} onPress={list.loadMore} style={{ alignSelf: "center", marginTop: 6 }} />
      ) : null}

      {!loading && filtered.length === 0 && !error ? (
        <EmptyState
          icon="document-text-outline"
          title={filter === "All" ? "Nothing posted yet" : `No ${filter.toLowerCase()} yet`}
          sub="What you post shows up here, with its likes and comments."
          actionLabel="Post something"
          onAction={() => router.push("/create-post" as any)}
        />
      ) : null}
    </DPage>

      {/* ── Post Detail Modal ── */}
      <DSheet visible={!!detailPost} onClose={() => setDetailPost(null)}>
        <View>
          {detailPost ? (() => {
            const meta = getTypeMeta(detailPost.type);
            const likes    = metaNum(detailPost.metadata, "likesCount");
            const comments = metaNum(detailPost.metadata, "commentsCount");
            const views    = metaNum(detailPost.metadata, "viewsCount");
            const answers  = metaNum(detailPost.metadata, "answersCount") || comments;
            const votes    = metaNum(detailPost.metadata, "votesCount") || metaNum(detailPost.metadata, "participantCount");
            const attendees = metaNum(detailPost.metadata, "attendeeCount");
            return (
              <View style={{ paddingHorizontal: 18 }}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
                  {/* Type and time */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Tag label={meta.label} />
                    <Text style={[TYPE.small, { color: tc.textTertiary }]}>{formatRelativeTime(detailPost.createdAt)}</Text>
                    {detailPost.status ? <Tag label={detailPost.status.charAt(0) + detailPost.status.slice(1).toLowerCase()} style={{ marginLeft: "auto" }} /> : null}
                  </View>

                  {/* Title */}
                  <Text style={[TYPE.section, { color: tc.textPrimary, marginBottom: 6 }]}>{detailPost.title}</Text>
                  {detailPost.isEdited ? <Text style={[TYPE.small, { color: tc.textTertiary, marginBottom: 8 }]}>Edited</Text> : null}
                  {/* SPRINT-42: my-post detail marker follows backend isEdited. */}

                  {/* Category */}
                  {detailPost.category ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), marginBottom: rs(10) }}>
                      <Ionicons name="folder-outline" size={13} color={tc.textTertiary} />
                      <Text style={[s.cardMetaText, { color: tc.textTertiary }]}>{detailPost.category}</Text>
                    </View>
                  ) : null}

                  {/* Full content */}
                  {!!detailPost.content && (
                    <Text style={[TYPE.body, { color: tc.textSecondary }]}>{detailPost.content}</Text>
                  )}

                  {/* ── All metadata rows ── */}
                  <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: tc.inputBg, marginTop: 12 }}>
                    {likes > 0 && <DetailRow icon="heart-outline" color="#EF4444" label="Likes" value={String(likes)} tc={tc} />}
                    {comments > 0 && <DetailRow icon="chatbubble-outline" color={Colors.brand.blue} label="Comments" value={String(comments)} tc={tc} />}
                    {views > 0 && <DetailRow icon="eye-outline" color={Colors.brand.green} label="Views" value={String(views)} tc={tc} />}
                    {answers > 0 && <DetailRow icon="chatbubble-ellipses-outline" color={Colors.brand.blue} label="Answers" value={String(answers)} tc={tc} />}
                    {votes > 0 && <DetailRow icon="bar-chart-outline" color={Colors.brand.orange} label="Votes / Participants" value={String(votes)} tc={tc} />}
                    {attendees > 0 && <DetailRow icon="people-outline" color={Colors.brand.orange} label="Attendees" value={String(attendees)} tc={tc} />}
                    {detailPost.type === "EVENT" && (Number(detailPost.metadata?.totalReviews ?? 0) || 0) > 0 ? ( // SPRINT-42: detail metadata rating
                      <DetailRow
                        icon="star-outline"
                        color="#F59E0B"
                        label="Rating"
                        value={`${Number(detailPost.metadata.averageRating ?? 0).toFixed(1)} (${detailPost.metadata.totalReviews})`}
                        tc={tc}
                      />
                    ) : null}
                    {detailPost.metadata?.date ? <DetailRow icon="calendar-outline" color={Colors.brand.orange} label="Event Date" value={formatEventDate(detailPost.metadata.date)} tc={tc} /> : null}
                    {detailPost.metadata?.venue ? <DetailRow icon="location-outline" color={Colors.brand.blue} label="Venue" value={String(detailPost.metadata.venue)} tc={tc} /> : null}
                    {detailPost.metadata?.mediaType ? <DetailRow icon="images-outline" color={Colors.brand.green} label="Media Type" value={String(detailPost.metadata.mediaType)} tc={tc} /> : null}
                    {detailPost.metadata?.price ? <DetailRow icon="pricetag-outline" color="#E11D48" label="Price" value={String(detailPost.metadata.price)} tc={tc} /> : null}
                    {detailPost.metadata?.beds != null ? <DetailRow icon="bed-outline" color={Colors.brand.blue} label="Bedrooms" value={String(detailPost.metadata.beds)} tc={tc} /> : null}
                    {detailPost.metadata?.baths != null ? <DetailRow icon="water-outline" color={Colors.brand.blue} label="Bathrooms" value={String(detailPost.metadata.baths)} tc={tc} /> : null}
                    {detailPost.metadata?.city ? <DetailRow icon="location-outline" color={Colors.brand.green} label="City" value={String(detailPost.metadata.city)} tc={tc} /> : null}
                    {detailPost.metadata?.cuisine ? <DetailRow icon="restaurant-outline" color={Colors.brand.orange} label="Cuisine" value={String(detailPost.metadata.cuisine)} tc={tc} /> : null}
                    {detailPost.metadata?.rating != null ? <DetailRow icon="star-outline" color="#F59E0B" label="Rating" value={`★ ${String(detailPost.metadata.rating)}`} tc={tc} /> : null}
                    {Array.isArray(detailPost.metadata?.tags) && detailPost.metadata.tags.length > 0 ? (
                      <DetailRow icon="pricetags-outline" color={Colors.brand.blue} label="Tags" value={(detailPost.metadata.tags as string[]).join(", ")} tc={tc} />
                    ) : null}
                    <DetailRow icon="time-outline" color={tc.textTertiary} label="Created" value={new Date(detailPost.createdAt).toLocaleString()} tc={tc} />
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                    <SoftButton block label="Edit" outerStyle={{ flex: 1 }} icon={<Ionicons name="create-outline" size={17} color={tc.accentText} />} onPress={() => { setDetailPost(null); handleEdit(detailPost); }} />
                    <SoftButton block ghost label="Delete" outerStyle={{ flex: 1 }} icon={<Ionicons name="trash-outline" size={17} color={tc.dangerText} />} onPress={() => { setDetailPost(null); handleDelete(detailPost); }} />
                  </View>
                  <View style={{ height: 12 }} />
                </ScrollView>
              </View>
            );
          })() : null}
        </View>
      </DSheet>

      {/* ── Edit post ── */}
      <DSheet visible={!!editPost} onClose={() => { if (!editSaving) setEditPost(null); }} title="Edit post" full>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6 }]}>Title</Text>
            <TextInput
              style={[TYPE.body, { minHeight: 50, borderRadius: 16, paddingHorizontal: 14, backgroundColor: tc.inputBg, color: tc.textPrimary }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Post title"
              placeholderTextColor={tc.textTertiary}
              editable={!editSaving}
              maxLength={120}
            />
            <Text style={[TYPE.label, { color: tc.textSecondary, marginTop: 16, marginBottom: 6 }]}>Text</Text>
            <TextInput
              style={[TYPE.body, { minHeight: 180, borderRadius: 16, padding: 14, backgroundColor: tc.inputBg, color: tc.textPrimary, textAlignVertical: "top" }]}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="What's on your mind?"
              placeholderTextColor={tc.textTertiary}
              editable={!editSaving}
              multiline
            />
            <GradientButton block label="Save" loading={editSaving} onPress={() => void handleSaveEdit()} outerStyle={{ marginTop: 18 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </DSheet>
    </>
  );
}

/** A label / value row in the D detail list (`.dl`); the icon and colour arguments are kept for the callers. */
function DetailRow({ label, value, tc }: { icon: string; color: string; label: string; value: string; tc: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tc.borderLight }}>
      <Text style={[TYPE.body, { fontSize: 14.5, color: tc.textSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[TYPE.bodyStrong, { fontSize: 14.5, color: tc.textPrimary, flex: 2, textAlign: "right" }]}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: rs(16), gap: rs(14) },

  editModalSafe: { flex: 1 },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(18),
    paddingVertical: rs(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editModalTitle: { fontSize: rs(16), fontWeight: "800" },
  editSaveBtn: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    borderRadius: rs(10),
    minWidth: rs(64),
    alignItems: "center",
    justifyContent: "center",
  },
  editSaveBtnText: { color: "#FFF", fontSize: rs(14), fontWeight: "800" },
  editFieldLabel: { fontSize: rs(12), fontWeight: "700", marginBottom: rs(6), textTransform: "uppercase", letterSpacing: 0.4 },
  editTitleInput: {
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    fontSize: rs(15),
    fontWeight: "700",
  },
  editContentInput: {
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    fontSize: rs(14),
    minHeight: rs(160),
    lineHeight: rs(20),
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    borderBottomWidth: 1,
  },
  errorText: { flex: 1, fontSize: rs(13), fontWeight: "600" },

  loadingWrap: { alignItems: "center", paddingVertical: rs(32), gap: rs(12) },
  loadingHint: { fontSize: rs(14), fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  backBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(26,107,174,0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(2) },
    elevation: 4,
  },
  headerTitle: { fontSize: rs(18), fontWeight: "800", color: Colors.text.primary },
  composeBtn: { borderRadius: rs(19), overflow: "hidden" },
  composeBtnGrad: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    alignItems: "center",
    justifyContent: "center",
  },

  statsBanner: {
    flexDirection: "row",
    paddingVertical: rs(16),
    paddingHorizontal: rs(8),
  },
  statCell: { flex: 1, alignItems: "center", gap: rs(3) },
  statCellBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)" },
  statNum: { fontSize: rs(22), fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
  statLbl: { fontSize: rs(10), fontWeight: "700", color: "rgba(255,255,255,0.8)", letterSpacing: 0.8, textTransform: "uppercase" },

  tabScroll: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  tabScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
    gap: rs(8),
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(5),
    paddingVertical: rs(8),
    paddingHorizontal: rs(12),
    borderRadius: rs(12),
    backgroundColor: "#F3F4F6",
  },
  tabActive: { backgroundColor: Colors.brand.blue },
  tabText: { fontSize: rs(12), fontWeight: "700", color: Colors.text.secondary },
  tabTextActive: { color: "#FFF" },
  tabBadge: {
    minWidth: 18,
    height: rs(18),
    borderRadius: rs(9),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: rs(4),
  },
  tabBadgeText: { fontSize: rs(10), fontWeight: "900", color: Colors.text.secondary },

  card: {
    backgroundColor: "#FFF",
    borderRadius: rs(18),
    padding: rs(14),
    borderWidth: 1,
    borderColor: "#F0F2F5",
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.05,
    shadowRadius: rs(10),
    elevation: 2,
    gap: rs(10),
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: rs(10) },

  avatarWrap: { flexShrink: 0 },
  avatarGrad: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: rs(16), fontWeight: "900", color: "#FFF" },

  authorName: { fontSize: rs(14), fontWeight: "800", color: Colors.text.primary },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: rs(4), marginTop: rs(3), flexWrap: "wrap" },
  cardMetaText: { fontSize: rs(11), color: Colors.text.tertiary, fontWeight: "500" },
  metaDot: { width: rs(3), height: rs(3), borderRadius: rs(1.5), backgroundColor: Colors.text.tertiary },

  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    paddingHorizontal: rs(9),
    paddingVertical: rs(4),
    borderRadius: rs(10),
    flexShrink: 0,
  },
  typeBadgeText: { fontSize: rs(11), fontWeight: "800" },

  content: { fontSize: rs(14), color: Colors.text.primary, lineHeight: rs(21) },

  detailBox: {
    borderRadius: rs(10),
    borderWidth: 1,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: rs(5), flexWrap: "wrap" },
  detailText: { fontSize: rs(12), fontWeight: "700" },
  detailMuted: { fontSize: rs(12), fontWeight: "500" },
  statusPill: {
    marginLeft: rs(6),
    paddingHorizontal: rs(7),
    paddingVertical: rs(2),
    borderRadius: rs(6),
    borderWidth: 1,
  },

  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(6),
    backgroundColor: Colors.brand.orangeLight,
    borderWidth: 1,
    borderColor: Colors.brand.orange + "30",
    paddingHorizontal: rs(12),
    paddingVertical: rs(7),
    borderRadius: rs(10),
  },
  eventPillText: { fontSize: rs(12), fontWeight: "600", color: Colors.brand.orange, flex: 1 },

  statsRow: { flexDirection: "row", alignItems: "center", gap: rs(8), flexWrap: "wrap" },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    backgroundColor: "#F3F4F6",
    paddingHorizontal: rs(9),
    paddingVertical: rs(5),
    borderRadius: rs(9),
  },
  statChipText: { fontSize: rs(12), fontWeight: "700", color: Colors.text.secondary },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderRadius: rs(10),
    backgroundColor: Colors.brand.blueLight,
    borderWidth: 1,
    borderColor: Colors.brand.blue + "30",
  },
  actionBtnText: { fontSize: rs(12), fontWeight: "700" },

  loadMoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rs(14),
    borderRadius: rs(14),
    borderWidth: 1,
    marginTop: rs(4),
  },
  loadMoreText: { fontSize: rs(15), fontWeight: "800" },

  emptyState: { alignItems: "center", marginTop: rs(72), gap: rs(10) },
  emptyIconWrap: { borderRadius: rs(30), overflow: "hidden", marginBottom: rs(4) },
  emptyIconGrad: {
    width: rs(84),
    height: rs(84),
    borderRadius: rs(30),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: rs(18), fontWeight: "800", color: Colors.text.primary },
  emptyDesc: {
    fontSize: rs(13),
    color: Colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: rs(32),
    lineHeight: rs(20),
  },
  addHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    borderRadius: rs(12),
    borderWidth: 1,
    marginTop: rs(8),
  },
  addHintText: { fontSize: rs(13), fontWeight: "500", flex: 1 },

  detailModal: {
    borderTopLeftRadius: rs(24), borderTopRightRadius: rs(24),
    padding: rs(20), maxHeight: "90%",
  },
  detailHandle: {
    width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: "#D1D5DB",
    alignSelf: "center", marginBottom: rs(16),
  },
  detailTitle: { fontSize: rs(20), fontWeight: "800", marginBottom: rs(8), lineHeight: rs(26) },
  detailContent: { fontSize: rs(14), lineHeight: rs(22), marginBottom: rs(16) },
  detailMetaBox: {
    borderRadius: rs(14), borderWidth: 1,
    paddingHorizontal: rs(14), paddingVertical: rs(4), marginBottom: rs(8),
  },
});
