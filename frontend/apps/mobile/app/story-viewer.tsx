import { rs } from "../src/utils/responsive";
/**
 * Fullscreen immersive story viewer (Sprint 14).
 * Params: authorIndex, storyIndex (optional, default 0)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { createDTypeStyles } from "../src/theme/themedStyles";
import { Image } from "expo-image"; // SPRINT-31:
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import * as Haptics from "expo-haptics";
import {
  getActiveStories,
  getStory,
  toggleStorySave,
  deleteStory,
  buildStoryAuthorGroups,
  addStoryComment,
  getStoryComments,
  deleteStoryComment,
  getStoryLikeStatus,
  toggleStoryLike,
  type ApiStory,
  type StoryAuthorGroup,
  type StoryComment,
} from "../src/api/stories.api";
import { resolveApiAssetUrl } from "../src/api/feed.api";
import { ApiError } from "../src/api/client";
import { useAuthStore } from "../src/store/auth.store";
import { useRequireAuth } from "../src/shared/hooks/useRequireAuth";
import { useGuestLocationStore } from "../src/store/guestLocation.store";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { showToast } from "../src/shared/ui/Toast";
import { appAlert } from '../src/shared/ui/Dialogs';

function mediaUri(url: string | null | undefined): string {
  if (!url) return "";
  return resolveApiAssetUrl(url);
}

function categoryUi(cat: string): { label: string; color: string; bg: string } {
  const c = (cat || "").toUpperCase();
  if (c === "EVENTS")     return { label: "Events",     color: "#257A86", bg: "rgba(37,122,134,0.2)" };
  if (c === "FOOD")       return { label: "Food",       color: "#30855B", bg: "rgba(48,133,91,0.2)" };
  if (c === "HOUSING")    return { label: "Housing",    color: "#1A6BAE", bg: "rgba(26,107,174,0.2)" };
  if (c === "CULTURE")    return { label: "Culture",    color: "#A78BFA", bg: "rgba(167,139,250,0.2)" };
  if (c === "LOCAL_NEWS") return { label: "Local News", color: "#F87171", bg: "rgba(248,113,113,0.2)" };
  return { label: cat, color: "#94A3B8", bg: "rgba(148,163,184,0.2)" };
}

function timeAgoShort(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m || 1}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function storySavedFlag(s: ApiStory): boolean {
  return s.isSaved === true || !!(s as { savedByMe?: boolean }).savedByMe;
}

function normalizeStoryFromApi(s: ApiStory): ApiStory {
  return { ...s, isSaved: storySavedFlag(s) };
}

// FIX 1: Removed duplicate `formatCompactCount` — only one definition kept
function formatCompactCount(count: number): string {
  if (count <= 0) return "";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function applyStoryDeleted(
  groups: StoryAuthorGroup[],
  authorIndex: number,
  storyIndex: number,
): { groups: StoryAuthorGroup[]; nextAuthorIndex: number; nextStoryIndex: number } | null {
  const g = groups[authorIndex];
  if (!g) return null;
  const nextStories = g.stories.filter((_, i) => i !== storyIndex);
  if (nextStories.length > 0) {
    const nextGroups = groups.map((gr, i) => (i === authorIndex ? { ...gr, stories: nextStories } : gr));
    const nextStoryIndex = Math.min(storyIndex, nextStories.length - 1);
    return { groups: nextGroups, nextAuthorIndex: authorIndex, nextStoryIndex };
  }
  const nextGroups = groups.filter((_, i) => i !== authorIndex);
  if (nextGroups.length === 0) return null;
  const nextAuthorIndex = Math.min(authorIndex, nextGroups.length - 1);
  return { groups: nextGroups, nextAuthorIndex, nextStoryIndex: 0 };
}

function StoryVideoLayer({
  uri,
  paused,
  muted,
  onProgress,
  onEnded,
  onError,
}: {
  uri: string;
  paused: boolean;
  muted: boolean;
  onProgress: (p: number) => void;
  onEnded: () => void;
  onError: () => void;
}) {
  const [isBuffering, setIsBuffering] = useState(true);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = muted;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (paused) player.pause();
    else void player.play();
  }, [paused, player]);

  useEventListener(player, "playToEnd", onEnded);

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") {
      onError();
      return;
    }
    setIsBuffering(status === "loading");
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = player.duration;
      if (d > 0) onProgress(Math.min(1, player.currentTime / d));
    }, 200);
    return () => clearInterval(id);
  }, [player, onProgress]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // player may already be released
      }
    };
  }, [player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {isBuffering ? (
        <View style={[StyleSheet.absoluteFill, styles.videoBufferOverlay]} pointerEvents="none">
          <ActivityIndicator color="#FFF" size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = createDTypeStyles({
  videoBufferOverlay: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)" },
});

export default function StoryViewerScreen() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const { tc, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const { requireAuth } = useRequireAuth();
  const guestCity = useGuestLocationStore((s) => s.city);
  const city = (user?.city && user.city.trim()) || guestCity || undefined;

  const params = useLocalSearchParams<{ authorIndex?: string; storyIndex?: string }>();
  const startAuthor = Math.max(0, parseInt(String(params.authorIndex ?? "0"), 10) || 0);
  const startStory  = Math.max(0, parseInt(String(params.storyIndex  ?? "0"), 10) || 0);

  const [loading, setLoading]                   = useState(true);
  const [groups, setGroups]                     = useState<StoryAuthorGroup[]>([]);
  const [currentAuthorIndex, setCurrentAuthorIndex] = useState(startAuthor);
  const [currentStoryIndex,  setCurrentStoryIndex]  = useState(startStory);
  const [progress, setProgress]                 = useState(0);
  const [isPaused, setIsPaused]                 = useState(false);
  const [videoMuted, setVideoMuted]             = useState(true);
  const [mediaError, setMediaError]             = useState(false);
  const [commentsOpen, setCommentsOpen]         = useState(false);
  const [storyComments, setStoryComments]       = useState<StoryComment[]>([]);
  const [commentsLoading, setCommentsLoading]   = useState(false);
  const [commentsPage, setCommentsPage]         = useState(1);
  const [commentsHasMore, setCommentsHasMore]   = useState(false);
  const [commentsPaging, setCommentsPaging]     = useState(false);
  const [commentDraft, setCommentDraft]         = useState("");
  const [commentSending, setCommentSending]     = useState(false);
  const [commentSheetError, setCommentSheetError] = useState<string | null>(null);
  const [storyLiked, setStoryLiked] = useState(false);
  const [storyLikeCount, setStoryLikeCount] = useState(0);
  const [likeSending, setLikeSending]           = useState(false);
  // FIX 2: Added missing likedIds state
  const [likedIds, setLikedIds]                 = useState<Set<string>>(new Set());

  const authorOpacity = useRef(new Animated.Value(1)).current;
  const prevAuthorRef = useRef(startAuthor);
  const slideY        = useRef(new Animated.Value(0)).current;

  const closeViewer = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: "/(tabs)/feed",
        params: { exploreTab: "Stories" },
      } as never);
    }
  }, []);

  const patchStorySaved = useCallback((storyId: string, saved: boolean) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        stories: g.stories.map((s) => (s.id === storyId ? { ...s, isSaved: saved } : s)),
      })),
    );
  }, []);

  const patchStoryFields = useCallback((storyId: string, patch: Partial<ApiStory>) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        stories: g.stories.map((s) => (s.id === storyId ? { ...s, ...patch } : s)),
      })),
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getActiveStories(city);
      const list = Array.isArray(raw) ? raw : [];
      const normalized = list.map((s) => normalizeStoryFromApi(s));
      const g = buildStoryAuthorGroups(normalized, uid);
      setGroups(g);
      const safeAuthor = Math.min(startAuthor, Math.max(0, g.length - 1));
      const sg = g[safeAuthor];
      const safeStory = sg ? Math.min(startStory, Math.max(0, sg.stories.length - 1)) : 0;
      setCurrentAuthorIndex(safeAuthor);
      setCurrentStoryIndex(safeStory);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [city, startAuthor, startStory, uid]);

  useEffect(() => { void load(); }, [load]);

  const currentGroup = groups[currentAuthorIndex];
  const currentStory: ApiStory | undefined = currentGroup?.stories[currentStoryIndex];

  useEffect(() => {
    if (prevAuthorRef.current !== currentAuthorIndex) {
      prevAuthorRef.current = currentAuthorIndex;
      authorOpacity.setValue(0);
      Animated.timing(authorOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [currentAuthorIndex, authorOpacity]);

  useEffect(() => {
    if (!currentStory?.id) return;
    setProgress(0);
    setMediaError(false);
    setStoryLiked(false);
    setStoryLikeCount(currentStory.likeCount ?? 0);
    let cancelled = false;
    void getStory(currentStory.id)
      .then((detail) => {
        if (cancelled || !detail?.id) return;
        patchStorySaved(detail.id, storySavedFlag(detail));
        if (typeof detail.commentCount === "number") {
          patchStoryFields(detail.id, { commentCount: detail.commentCount });
        }
        if (typeof detail.likeCount === "number") {
          setStoryLikeCount(detail.likeCount);
          patchStoryFields(detail.id, { likeCount: detail.likeCount });
        }
      })
      .catch(() => {});
    void getStoryLikeStatus(currentStory.id)
      .then((res) => {
        if (cancelled) return;
        setStoryLiked(res.likedByMe);
        setStoryLikeCount(res.likeCount);
        patchStoryFields(currentStory.id, { likeCount: res.likeCount });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentStory?.id, patchStoryFields, patchStorySaved]);

  const handleLike = useCallback(async () => {
    if (!requireAuth(undefined, "Sign in to like stories from your neighbors.")) return;
    if (!currentStory || likeSending) return;
    const previousLiked = storyLiked;
    const previousCount = storyLikeCount;
    const nextLiked = !previousLiked;
    const optimisticCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));
    setLikeSending(true);
    setStoryLiked(nextLiked);
    setStoryLikeCount(optimisticCount);
    patchStoryFields(currentStory.id, { likeCount: optimisticCount });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await toggleStoryLike(currentStory.id);
      setStoryLiked(res.liked);
      setStoryLikeCount(res.likeCount);
      patchStoryFields(currentStory.id, { likeCount: res.likeCount });
    } catch {
      setStoryLiked(previousLiked);
      setStoryLikeCount(previousCount);
      patchStoryFields(currentStory.id, { likeCount: previousCount });
    } finally {
      setLikeSending(false);
    }
  }, [currentStory, likeSending, patchStoryFields, requireAuth, storyLikeCount, storyLiked]);

  const advanceStory = useCallback(() => {
    setProgress(0);
    setIsPaused(false);
    if (!currentGroup) { closeViewer(); return; }
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex((i) => i + 1);
      return;
    }
    if (currentAuthorIndex < groups.length - 1) {
      setCurrentAuthorIndex((a) => a + 1);
      setCurrentStoryIndex(0);
      return;
    }
    closeViewer();
  }, [closeViewer, currentAuthorIndex, currentGroup, currentStoryIndex, groups.length]);

  const goBackStory = useCallback(() => {
    setProgress(0);
    setIsPaused(false);
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((i) => i - 1);
      return;
    }
    if (currentAuthorIndex > 0) {
      const prev = groups[currentAuthorIndex - 1];
      if (!prev) return;
      setCurrentAuthorIndex((a) => a - 1);
      setCurrentStoryIndex(prev.stories.length - 1);
    }
  }, [currentAuthorIndex, currentStoryIndex, groups]);

  const photoDurationSec = currentStory?.durationSeconds ?? 5;
  const isPhoto = (currentStory?.mediaType || "").toUpperCase() === "PHOTO";

  const openCommentsSheet = useCallback(() => {
    if (!currentStory) return;
    const sid = currentStory.id;
    setCommentsOpen(true);
    setStoryComments([]);
    setCommentsLoading(true);
    setCommentsPage(1);
    setCommentsHasMore(false);
    setCommentSheetError(null);
    void getStoryComments(sid, { page: 1, pageSize: 20 })
      .then((res) => {
        setStoryComments(res.data);
        setCommentsHasMore(res.meta.totalPages > res.meta.page);
      })
      .catch(() => setCommentSheetError("Could not load comments."))
      .finally(() => setCommentsLoading(false));
  }, [currentStory?.id]);

  const loadMoreComments = useCallback(() => {
    const sid = currentStory?.id;
    if (!sid || !commentsHasMore || commentsPaging || commentsLoading) return;
    const nextPage = commentsPage + 1;
    setCommentsPaging(true);
    void getStoryComments(sid, { page: nextPage, pageSize: 20 })
      .then((res) => {
        setStoryComments((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          const merged = [...prev];
          for (const c of res.data) {
            if (!seen.has(c.id)) merged.push(c);
          }
          return merged;
        });
        setCommentsPage(nextPage);
        setCommentsHasMore(res.meta.totalPages > res.meta.page);
      })
      .catch(() => {})
      .finally(() => setCommentsPaging(false));
  }, [commentsHasMore, commentsLoading, commentsPage, commentsPaging, currentStory?.id]);

  // Last photo progress per story, so pausing (hold / comments) resumes instead of restarting at 0.
  const photoProgressRef = useRef<{ storyId?: string; p: number }>({ p: 0 });
  useEffect(() => {
    if (!currentStory || !isPhoto || isPaused || commentsOpen) return;
    const ms = Math.max(1, photoDurationSec) * 1000;
    const saved = photoProgressRef.current;
    const resumeFrom = saved.storyId === currentStory.id && progress > 0 ? saved.p : 0;
    const started = Date.now() - resumeFrom * ms;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / ms);
      photoProgressRef.current = { storyId: currentStory.id, p };
      setProgress(p);
      if (p >= 1) { clearInterval(id); advanceStory(); }
    }, 50);
    return () => clearInterval(id);
  }, [advanceStory, commentsOpen, currentStory?.id, isPhoto, isPaused, photoDurationSec]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > rs(8) && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => { if (g.dy > 0) slideY.setValue(g.dy); },
        onPanResponderRelease: (_, g) => {
          if (g.dy > rs(80)) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            closeViewer();
          } else {
            Animated.spring(slideY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
          }
        },
      }),
    [slideY, closeViewer],
  );

  const promptDeleteStory = useCallback(() => {
    if (!currentStory || !uid || currentStory.author.id !== uid) return;
    const sid = currentStory.id;
    const ai  = currentAuthorIndex;
    const si  = currentStoryIndex;
    appAlert("Delete this story?", "It will be removed immediately for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteStory(sid)
            .then(() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setCommentsOpen(false);
              setCommentDraft("");
              setStoryComments([]);
              setGroups((prev) => {
                const next = applyStoryDeleted(prev, ai, si);
                if (!next) { requestAnimationFrame(() => closeViewer()); return []; }
                requestAnimationFrame(() => {
                  setCurrentAuthorIndex(next.nextAuthorIndex);
                  setCurrentStoryIndex(next.nextStoryIndex);
                  setProgress(0);
                  setMediaError(false);
                });
                return next.groups;
              });
            })
            .catch((e: unknown) =>
              showToast(e instanceof ApiError ? e.message : "Could not delete story. Try again.", "error"),
            );
        },
      },
    ]);
  }, [closeViewer, currentAuthorIndex, currentStory, currentStoryIndex, uid]);

  const onToggleSave = async () => {
    if (!requireAuth(undefined, "Sign in to save stories and find them later.")) return;
    if (!currentStory) return;
    const cur  = storySavedFlag(currentStory);
    const next = !cur;
    patchStorySaved(currentStory.id, next);
    try {
      const r = await toggleStorySave(currentStory.id);
      patchStorySaved(currentStory.id, r.isSaved === true || r.saved === true);
    } catch {
      patchStorySaved(currentStory.id, cur);
    }
  };

  /* ── Loading state ──────────────────────────────────────────── */
  if (loading) {
    return (
      <View style={[st.root, st.center, { width: W, height: H }]}>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_bottom" }} />
        <StatusBar barStyle="light-content" hidden />
        <ActivityIndicator color="#FFF" size="large" />
        <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: rs(12), fontSize: rs(13) }}>Loading stories…</Text>
      </View>
    );
  }

  /* ── Empty state ────────────────────────────────────────────── */
  if (!currentStory || groups.length === 0) {
    return (
      <View style={[st.root, st.center, { width: W, height: H }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" hidden />
        <Ionicons name="images-outline" size={rs(52)} color="rgba(255,255,255,0.5)" />
        <Text style={st.emptyText}>No stories right now</Text>
        <Pressable style={st.emptyBtn} onPress={closeViewer}>
          <Text style={st.emptyBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const bars   = currentGroup.stories;
  const cat    = categoryUi(currentStory.category);
  const imgUrl = mediaUri(currentStory.mediaUrl);
  const isVideo =
    (currentStory.mediaType || "").toUpperCase() === "VIDEO" ||
    (currentStory.mediaType || "").toUpperCase() === "REEL";
  const isSaved = storySavedFlag(currentStory);
  const isOwner = uid && currentStory.author.id === uid;

  return (
    <Animated.View style={[st.root, { width: W, height: H, transform: [{ translateY: slideY }] }]} {...pan.panHandlers}>
      <Stack.Screen options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <StatusBar barStyle="light-content" hidden />

      {/* ── Media layer ── */}
      {isPhoto && imgUrl ? (
        <Image
          source={{ uri: imgUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          transition={0}
          onError={() => { setMediaError(true); advanceStory(); }}
        />
      ) : isVideo && imgUrl ? (
        <StoryVideoLayer
          key={currentStory.id}
          uri={imgUrl}
          paused={isPaused || commentsOpen}
          muted={videoMuted}
          onProgress={setProgress}
          onEnded={advanceStory}
          onError={() => { setMediaError(true); advanceStory(); }}
        />
      ) : (
        <LinearGradient
          colors={["#0C1A2E", "#1A6BAE", "#001A40"]}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* ── Gradient overlays ── */}
      <LinearGradient
        colors={["rgba(0,0,0,0.72)", "rgba(0,0,0,0.3)", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: H * 0.38 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.88)"]}
        style={[StyleSheet.absoluteFill, { top: H * 0.42 }]}
        pointerEvents="none"
      />

      {/* ── Progress bars ── */}
      <View style={[st.progressRow, { paddingTop: insets.top + rs(8) }]}>
        {bars.map((_, i) => {
          let fill = 0;
          if (i < currentStoryIndex) fill = 1;
          else if (i === currentStoryIndex) fill = progress;
          return (
            <View key={i} style={st.progressTrack}>
              <View style={[st.progressFill, { width: `${fill * 100}%` }]} />
            </View>
          );
        })}
      </View>

      {/* ── Tap zones ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={[st.tapRow, { paddingTop: insets.top + rs(60) }]}>
          <Pressable
            style={st.tapLeft}
            onPress={goBackStory}
            onLongPress={() => { setIsPaused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            delayLongPress={200}
            onPressOut={() => setIsPaused(false)}
          />
          <Pressable
            style={st.tapCenter}
            onLongPress={() => { setIsPaused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            delayLongPress={200}
            onPressOut={() => setIsPaused(false)}
          />
          <Pressable
            style={st.tapRight}
            onPress={advanceStory}
            onLongPress={() => { setIsPaused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            delayLongPress={200}
            onPressOut={() => setIsPaused(false)}
          />
        </View>
      </View>

      {/* ── Header: author + controls ── */}
      <Animated.View style={[st.header, { paddingTop: insets.top + rs(28) }, { opacity: authorOpacity }]}>
        {/* Author */}
        <View style={st.authorRow}>
          <View style={st.avatarRing}>
            {currentStory.author.avatarUrl ? (
              <Image
                source={{ uri: mediaUri(currentStory.author.avatarUrl) }}
                style={st.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} style={[st.avatar, st.avatarPh]}>
                <Text style={st.avatarPhText}>{(currentStory.author.username || "?").slice(0, 2).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.authorName}>{currentStory.author.username}</Text>
            <Text style={st.authorTime}>{timeAgoShort(currentStory.createdAt)}</Text>
          </View>
        </View>

        {/* Right controls */}
        <View style={st.headerControls}>
          {isOwner ? (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); promptDeleteStory(); }}
              style={st.headerIconBtn}
              hitSlop={10}
              accessibilityLabel="Delete story"
            >
              <Ionicons name="trash-outline" size={rs(18)} color="#FFF" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeViewer(); }}
            style={st.closeBtn}
            hitSlop={10}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={rs(20)} color="#FFF" />
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Pause hint ── */}
      {isPaused && (
        <View style={st.pauseHint} pointerEvents="none">
          <View style={st.pauseCircle}>
            <Ionicons name="pause" size={rs(32)} color="#FFF" />
          </View>
        </View>
      )}

      {/* ── Footer ── */}
      <View style={[st.footer, { paddingBottom: insets.bottom + rs(20) }]}>
        {/* Category pill */}
        <View style={[st.catPill, { backgroundColor: cat.bg, borderColor: cat.color }]}>
          <View style={[st.catDot, { backgroundColor: cat.color }]} />
          <Text style={[st.catPillText, { color: cat.color }]}>{cat.label}</Text>
        </View>

        {/* Title */}
        <Text style={st.footerTitle} numberOfLines={2}>{currentStory.title}</Text>

        {/* Details */}
        {currentStory.details ? (
          <Text style={st.footerDetails} numberOfLines={3}>{currentStory.details}</Text>
        ) : null}

        {/* Hashtags */}
        {currentStory.hashtags?.length ? (
          <View style={st.hashRow}>
            {currentStory.hashtags.slice(0, 4).map((h, i) => (
              <View key={i} style={st.hashPill}>
                <Text style={st.hashText}>{h.startsWith("#") ? h : `#${h}`}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Location */}
        {currentStory.location ? (
          <View style={st.locRow}>
            <Ionicons name="location-outline" size={rs(13)} color="rgba(255,255,255,0.75)" />
            <Text style={st.locText} numberOfLines={1}>{currentStory.location}</Text>
          </View>
        ) : null}

        {/* Action row */}
        <View style={st.actionRow}>
          {/* Mute (video only) */}
          {isVideo ? (
            <Pressable
              style={st.muteBtn}
              onPress={() => { setVideoMuted((m) => !m); Haptics.selectionAsync(); }}
            >
              <Ionicons name={videoMuted ? "volume-mute" : "volume-high"} size={rs(18)} color="#FFF" />
            </Pressable>
          ) : <View style={{ width: rs(40) }} />}

          <View style={st.actionGroup}>
            {/* FIX 3: Changed `styles.actionBtn` → `st.actionBtn` and `styles.actionBtnLabel` → `st.actionBtnLabel` */}
            {/* FIX 4: Typed `prev` explicitly as `Set<string>` */}
            {/* Like */}
            <Pressable
              style={st.actionBtn}
              onPress={() => {
                void handleLike();
              }}
            >
              <Ionicons
                name={storyLiked || likedIds.has(currentStory.id) ? "heart" : "heart-outline"}
                size={rs(24)}
                color={storyLiked || likedIds.has(currentStory.id) ? "#F87171" : "#FFF"}
              />
              <Text style={st.actionBtnLabel}>
                {storyLiked || likedIds.has(currentStory.id) ? "Liked" : "Like"}
              </Text>
            </Pressable>

            {/* Comment */}
            <Pressable
              style={st.actionBtn}
              onPress={() => {
                if (!requireAuth(undefined, "Sign in to join the conversation.")) return;
                Haptics.selectionAsync();
                openCommentsSheet();
              }}
            >
              <Ionicons name="chatbubble-outline" size={rs(20)} color="#FFF" />
              <Text style={st.actionBtnLabel}>{currentStory.commentCount ?? 0}</Text>
            </Pressable>

            {/* Save */}
            <Pressable
              style={[st.actionBtn, isSaved && st.actionBtnSaved]}
              onPress={() => void onToggleSave()}
            >
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={rs(20)} color={isSaved ? "#FBBF24" : "#FFF"} />
              <Text style={st.actionBtnLabel}>{isSaved ? "Saved" : "Save"}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Comments sheet ── */}
      <Modal
        visible={commentsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => { setCommentsOpen(false); setCommentDraft(""); setCommentSheetError(null); }}
      >
        <KeyboardAvoidingView
          style={st.sheetBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCommentsOpen(false)} />
          <View style={[st.sheetCard, { backgroundColor: tc.pageBg }]}>
            {/* Sheet handle */}
            <View style={st.sheetHandle} />

            <View style={[st.sheetHeader, { borderBottomColor: tc.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[st.sheetTitle, { color: tc.textPrimary }]}>Comments</Text>
                <Text style={[st.sheetSubtitle, { color: tc.textSecondary }]} numberOfLines={1}>
                  {currentStory.title}
                </Text>
              </View>
              <Pressable
                onPress={() => { setCommentsOpen(false); setCommentDraft(""); setCommentSheetError(null); }}
                style={st.sheetCloseBtn}
                hitSlop={10}
              >
                <Ionicons name="close" size={rs(18)} color={tc.textSecondary} />
              </Pressable>
            </View>

            {commentsLoading && storyComments.length === 0 ? (
              <View style={st.sheetCenter}>
                <ActivityIndicator color={Colors.brand.blue} />
              </View>
            ) : (
              <FlatList
                data={storyComments}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingVertical: 8, paddingBottom: 12, flexGrow: 1 }}
                onEndReachedThreshold={0.35}
                onEndReached={() => loadMoreComments()}
                ListEmptyComponent={
                  !commentsLoading ? (
                    <View style={st.sheetEmpty}>
                      <Ionicons name="chatbubbles-outline" size={rs(40)} color={tc.textTertiary} />
                      <Text style={[st.sheetEmptyText, { color: tc.textSecondary }]}>
                        No comments yet — be the first.
                      </Text>
                    </View>
                  ) : null
                }
                ListFooterComponent={
                  commentsPaging ? <ActivityIndicator style={{ marginVertical: 12 }} color={Colors.brand.blue} /> : null
                }
                renderItem={({ item }) => {
                  const isOwn        = uid != null && item.author.id === uid;
                  const isStoryOwner = uid != null && currentStory.author.id === uid;
                  const canDelete    = isOwn || isStoryOwner;
                  const av           = item.author.avatarUrl ? mediaUri(item.author.avatarUrl) : "";
                  const initials     = (item.author.username || "?").slice(0, 2).toUpperCase();
                  return (
                    <Pressable
                      onLongPress={() => {
                        if (!canDelete || !currentStory) return;
                        appAlert("Delete comment?", undefined, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => {
                              void deleteStoryComment(currentStory.id, item.id)
                                .then(() => {
                                  setStoryComments((prev) => prev.filter((c) => c.id !== item.id));
                                  patchStoryFields(currentStory.id, {
                                    commentCount: Math.max(0, (currentStory.commentCount ?? 0) - 1),
                                  });
                                })
                                .catch(() => showToast("Could not delete comment. Try again.", "error"));
                            },
                          },
                        ]);
                      }}
                      delayLongPress={350}
                      style={[st.commentRow, { borderBottomColor: tc.borderLight }]}
                    >
                      {av ? (
                        <Image
                          source={{ uri: av }}
                          style={st.commentAvatar}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={200}
                        />
                      ) : (
                        <View style={[st.commentAvatar, st.commentAvatarPh, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]}>
                          <Text style={[st.commentAvatarPhText, { color: tc.textPrimary }]}>{initials}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[st.commentUser, { color: tc.textPrimary }]}>{item.author.username}</Text>
                        <Text style={[st.commentBody, { color: tc.textSecondary }]}>{item.content}</Text>
                        <Text style={[st.commentTime, { color: tc.textTertiary }]}>{timeAgoShort(item.createdAt)}</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}

            {commentSheetError ? (
              <Text style={{ color: "#DC2626", textAlign: "center", paddingHorizontal: 16, marginBottom: 6, fontSize: rs(13) }}>
                {commentSheetError}
              </Text>
            ) : null}

            <View style={[st.sheetInputRow, { borderTopColor: tc.borderLight, backgroundColor: tc.cardBg }]}>
              <TextInput
                style={[st.sheetInput, { color: tc.textPrimary, backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}
                placeholder="Add a comment…"
                placeholderTextColor={tc.textTertiary}
                value={commentDraft}
                onChangeText={setCommentDraft}
                maxLength={500}
                editable={!commentSending}
              />
              <Pressable
                onPress={() => {
                  if (!requireAuth(undefined, "Sign in to join the conversation.")) return;
                  const text = commentDraft.trim();
                  if (!text || !currentStory || commentSending) return;
                  setCommentSending(true);
                  setCommentSheetError(null);
                  void addStoryComment(currentStory.id, text)
                    .then((created) => {
                      setStoryComments((prev) => [...prev, created]);
                      setCommentDraft("");
                      const next = (currentStory.commentCount ?? 0) + 1;
                      patchStoryFields(currentStory.id, { commentCount: next });
                    })
                    .catch(() => setCommentSheetError("Could not post comment."))
                    .finally(() => setCommentSending(false));
                }}
                style={[st.sheetSendBtn, { opacity: commentDraft.trim() ? 1 : 0.4 }]}
                disabled={commentSending || !commentDraft.trim()}
              >
                <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} style={st.sheetSendGrad}>
                  {commentSending
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Ionicons name="send" size={rs(16)} color="#FFF" />}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Animated.View>
  );
}

const st = createDTypeStyles({
  root: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center" },

  emptyText: { color: "rgba(255,255,255,0.8)", fontSize: rs(17), fontWeight: "700", marginTop: rs(16) },
  emptyBtn: {
    marginTop: rs(20),
    paddingHorizontal: rs(28),
    paddingVertical: rs(12),
    borderRadius: rs(24),
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  emptyBtnText: { color: "#FFF", fontWeight: "800", fontSize: rs(15) },

  progressRow: {
    position: "absolute",
    left: rs(12),
    right: rs(12),
    flexDirection: "row",
    gap: rs(4),
    zIndex: 20,
  },
  progressTrack: {
    flex: 1,
    height: rs(3),
    borderRadius: rs(2),
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: rs(2),
  },

  tapRow: { ...StyleSheet.absoluteFill, flexDirection: "row" },
  tapLeft:   { width: "40%", height: "100%" },
  tapCenter: { width: "20%", height: "100%" },
  tapRight:  { width: "40%", height: "100%" },

  header: {
    position: "absolute",
    left: rs(14),
    right: rs(14),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 15,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: rs(10), flex: 1 },
  avatarRing: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    borderWidth: 2,
    borderColor: "#FFF",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  avatarPh: { alignItems: "center", justifyContent: "center" },
  avatarPhText: { color: "#FFF", fontSize: rs(13), fontWeight: "900" },
  authorName: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: rs(14),
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  authorTime: {
    color: "rgba(255,255,255,0.75)",
    fontSize: rs(11),
    fontWeight: "600",
    marginTop: rs(1),
  },
  headerControls: { flexDirection: "row", alignItems: "center", gap: rs(8) },
  headerIconBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  closeBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  pauseHint: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", zIndex: 8 },
  pauseCircle: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: rs(18),
    zIndex: 12,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: rs(20),
    borderWidth: 1.5,
    gap: rs(5),
    marginBottom: rs(8),
  },
  catDot: { width: rs(6), height: rs(6), borderRadius: rs(3) },
  catPillText: { fontSize: rs(11), fontWeight: "900", letterSpacing: 0.4 },
  footerTitle: {
    color: "#FFF",
    fontSize: rs(22),
    fontWeight: "900",
    marginBottom: rs(6),
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    lineHeight: rs(28),
  },
  footerDetails: {
    color: "rgba(255,255,255,0.88)",
    fontSize: rs(13),
    lineHeight: rs(19),
    marginBottom: rs(8),
  },
  hashRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(6), marginBottom: rs(8) },
  hashPill: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(10),
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  hashText: { color: "rgba(255,255,255,0.9)", fontSize: rs(11), fontWeight: "700" },
  locRow: { flexDirection: "row", alignItems: "center", gap: rs(4), marginBottom: rs(8) },
  locText: { color: "rgba(255,255,255,0.75)", fontSize: rs(11), flex: 1 },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: rs(10),
  },
  muteBtn: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionGroup: { flexDirection: "row", alignItems: "center", gap: rs(8) },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    paddingHorizontal: rs(14),
    paddingVertical: rs(9),
    borderRadius: rs(22),
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionBtnActive: {
    backgroundColor: "rgba(248,113,113,0.2)",
    borderColor: "rgba(248,113,113,0.5)",
  },
  actionBtnSaved: {
    backgroundColor: "rgba(251,191,36,0.2)",
    borderColor: "rgba(251,191,36,0.5)",
  },
  actionBtnLabel: { color: "#FFF", fontSize: rs(12), fontWeight: "800" },

  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheetCard: {
    maxHeight: "88%",
    minHeight: 320,
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    paddingBottom: rs(8),
  },
  sheetHandle: {
    alignSelf: "center",
    width: rs(36),
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: "#D1D5DB",
    marginTop: rs(10),
    marginBottom: rs(4),
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: rs(16),
    paddingTop: rs(10),
    paddingBottom: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle:    { fontSize: rs(17), fontWeight: "900" },
  sheetSubtitle: { fontSize: rs(12), marginTop: rs(2), fontWeight: "600" },
  sheetCloseBtn: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCenter: { paddingVertical: rs(40), alignItems: "center", justifyContent: "center" },
  sheetEmpty:  { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: rs(48), gap: rs(10) },
  sheetEmptyText: { fontSize: rs(14), fontWeight: "600", textAlign: "center", paddingHorizontal: rs(24) },

  commentRow: {
    flexDirection: "row",
    gap: rs(10),
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentAvatar:       { width: rs(36), height: rs(36), borderRadius: rs(18) },
  commentAvatarPh:     { alignItems: "center", justifyContent: "center" },
  commentAvatarPhText: { fontSize: rs(12), fontWeight: "900" },
  commentUser: { fontSize: rs(13), fontWeight: "800" },
  commentBody: { fontSize: rs(13), marginTop: rs(2), lineHeight: rs(19) },
  commentTime: { fontSize: rs(11), marginTop: rs(3), fontWeight: "600" },

  sheetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: rs(8),
  },
  sheetInput: {
    flex: 1,
    fontSize: rs(14),
    paddingVertical: rs(10),
    paddingHorizontal: rs(14),
    borderRadius: rs(22),
    borderWidth: 1,
  },
  sheetSendBtn: { borderRadius: rs(20), overflow: "hidden" },
  sheetSendGrad: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    alignItems: "center",
    justifyContent: "center",
  },
});
