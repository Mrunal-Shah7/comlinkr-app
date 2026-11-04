import { rs } from "../../../src/utils/responsive";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Animated, Modal, TextInput, Linking, ActivityIndicator, Share, Platform, FlatList, KeyboardAvoidingView, LayoutAnimation, AccessibilityInfo } from "react-native";
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExploreBento } from "../../../src/features/explore/components/ExploreBento";
import { Chip, Segmented } from "../../../src/shared/d";
import { TYPE } from "../../../src/theme/d";
import { revealIn } from "../../../src/shared/motion/presets";
import { tabBarClearance } from "../../../src/shared/navigation/DTabBar";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { runAfterTransition } from "../../../src/utils/afterTransition";
import { DismissibleSheet, SheetDragArea } from "../../../src/shared/ui/DismissibleSheet";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, useScrollToTop } from "expo-router";
import { Colors } from "../../../src/theme/colors";
import { useTheme } from "../../../src/theme/useTheme";
import AppHeader from "../../../components/AppHeader";
import { GuestCityBanner, GuestCityPickerModal } from "../../../components/GuestCityBanner";
import { FadeImage } from "../../../components/FadeImage";
import { useAuthStore } from "../../../src/store/auth.store";
import { useGuestLocationStore } from "../../../src/store/guestLocation.store";
import { useRequireAuth } from "../../../src/shared/hooks/useRequireAuth";
import { usePostsStore } from "../../../src/store/posts.store";
import { useBlockStore } from "../../../src/store/block.store";
import { blockUser as blockUserApi } from "../../../src/api/profile.api";
import { useSidebarStore } from "../../../src/store/sidebar.store";
import { getFeed, getPost, toggleLike as toggleFeedLike, toggleSave as toggleFeedSave, getComments, addComment, deletePost, subscribeToPostUpdates, getLatestPostUpdate, getNeighborhoodMood, voteNeighborhoodMood, resolveApiAssetUrl, type NeighborhoodMood, type NeighborhoodMoodSummary, type Post as FeedPost, type Comment as FeedComment } from "../../../src/api/feed.api";
import { getEvent, getEvents, registerForEvent, unregisterFromEvent, toggleSaveEvent, type ApiEvent } from "../../../src/api/events.api";
import { getActiveStories, getMyStories, getStory, toggleStorySave, toggleStoryLike, getStoryLikeStatus, deleteStory, buildStoryAuthorGroups, type ApiStory, type StoryLikeStatus } from "../../../src/api/stories.api";
import { getCommunityStats, type CommunityStats } from "../../../src/api/community-qa.api";
import { getListings } from "../../../src/api/housing.api";
import { addArticleComment, getArticleComments, getArticleStatsBatch, getNewsExplore, saveNewsArticle, toggleArticleLike, type NewsArticleComment } from "../../../src/api/news.api";
import { getShareLink } from "../../../src/utils/shareLinks";
import { LinkifiedText } from "../../../components/LinkifiedText";
import { getPolls, votePoll, type Poll } from "../../../src/api/community.api";
import { getChallenges, joinChallenge, type ApiChallenge } from "../../../src/api/challenges.api";
import { ApiError } from "../../../src/api/client";
import EventRegistrationModal from "../../components/modals/EventRegistrationModal";
import { useNotificationStore } from "../../../src/store/notifications.store";
import { useListFetchCacheStore } from "../../../src/store/listFetchCache.store";
import { s, st } from "../../../src/styles/feedScreen.styles";
import { showToast } from "../../../src/shared/ui/Toast";
import { appAlert } from "../../../src/shared/ui/Dialogs";
import { ListState } from "../../../src/shared/ui/ListState";
import { type FeedTab, type CommunityStory, HERO_MOOD_OPTIONS, type StoryCategory, FEED_TABS, STORY_CATEGORIES, STORY_CATEGORY_META } from "../../../src/features/explore/constants";
import { type ExploreEventRow, type HeroTickerRow, apiEventToExploreRow, buildHeroTickerRows, normalizeApiStoryForFeed, mapApiStoryToCommunityStory, apiStoryIsSaved, getFeedPostShareUrl, pollToWyrCardModel, myVoteToSide, formatStoryTimeLeft } from "../../../src/features/explore/models";
import { type NewsArticle, LIVE_NEWS_SESSION_CACHE, type NewsCategory, COUNTRY_NEWS_MAP, BASE_NEWS_CATEGORIES, LIVE_NEWS_PAGE_SIZE, FALLBACK_NEWS, fetchArticleMeta, newsTimeAgo, isSameContent } from "../../../src/features/explore/news";
import { WYRCard } from "../../../src/features/explore/components/WYRCard";
import { nw } from "../../../src/features/explore/styles/news.styles";
import { FeaturedEventCard, EventRowCard } from "../../../src/features/explore/components/EventCards";
import { StoryVideoThumb, NewsLeadImage } from "../../../src/features/explore/components/NewsImages";
import { PostCard } from "../../../src/features/explore/components/PostCard";
import { EventDetailModal } from "../../../src/features/explore/components/EventDetailModal";
import { StoryCard } from "../../../src/features/explore/components/StoryCard";
import { QuestCard } from "../../../src/features/explore/components/QuestCard";
import { LiveNewsCard } from "../../../src/features/explore/components/LiveNewsCard";
import { useStableCallback } from "../../../src/shared/hooks/useStableCallback";

/** A row of the Explore FlatList — which kind depends on the active tab / news sub-tab. */
type FeedRow =
  | { kind: "event"; event: ExploreEventRow }
  | { kind: "story"; story: ApiStory }
  | { kind: "quest"; quest: ApiChallenge }
  | { kind: "post"; post: FeedPost }
  | { kind: "news"; article: NewsArticle; index: number }
  | { kind: "poll"; post: FeedPost };

const feedRowKey = (row: FeedRow) => {
  switch (row.kind) {
    case "event": return `e:${row.event.id}`;
    case "story": return `s:${row.story.id}`;
    case "quest": return `q:${row.quest.id}`;
    case "post": return `p:${row.post.id}`;
    case "news": return `n:${row.article.id}`;
    case "poll": return `o:${row.post.id}`;
  }
};

// Horizontal padding the rows used to inherit from their section wrapper (s.section / st.feedSection
// and nw.sectionBlock respectively).
const feedSectionRowPad = { paddingHorizontal: rs(14) };
const feedNewsRowPad = { paddingHorizontal: rs(16) };

// ── Main screen ──────────────────────────────────────────
export default function FeedScreen() {
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { requireAuth } = useRequireAuth();
  const userPosts = usePostsStore((s) => s.userPosts);
  const blockUser = useBlockStore((s) => s.blockUser);
  const isBlocked = useBlockStore((s) => s.isBlocked);
  const [refreshing, setRefreshing] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const guestCity = useGuestLocationStore((s) => s.city);
  const guestState = useGuestLocationStore((s) => s.state);
  const guestCountry = useGuestLocationStore((s) => s.country);
  /** Explore is scoped to the city from onboarding / profile, or the guest's chosen city. */
  const hasChosenCity = !!((user?.city && user.city.trim()) || guestCity);
  // Explore still needs a region to fetch regional news; the hero labels it honestly when the user hasn't chosen one.
  const city = (user?.city && user.city.trim()) || guestCity || "";
  const [guestCityPickerVisible, setGuestCityPickerVisible] = useState(false);
  const params = useLocalSearchParams<{
    openPost?: string;
    openEvent?: string;
    openStory?: string;
    exploreTab?: string;
  }>();
  const feedScrollRef = useRef<FlatList<FeedRow>>(null);
  // Design D (plan 01): the header title fades in as the large "Explore" title scrolls away.
  const exploreScrollY = useSharedValue(0);
  const onExploreScroll = useAnimatedScrollHandler((e) => { exploreScrollY.value = e.contentOffset.y; });
  const exploreInsets = useSafeAreaInsets();
  useScrollToTop(feedScrollRef); // re-tap the Explore tab → back to top

  // SPRINT-27: removed scroll-to-top on focus — preserves scroll position across tab switches

  const [wyrIndex, setWyrIndex] = useState(0);
  const [wyrPolls, setWyrPolls] = useState<Poll[]>([]);
  const [wyrPollsLoading, setWyrPollsLoading] = useState(false);
  const [feedTab, setFeedTab] = useState<FeedTab>("News");
  const [selectedEvent, setSelectedEvent] = useState<ExploreEventRow | null>(null);
  const [heroMood, setHeroMood] = useState<string | null>(null);
  const [heroMoodSummary, setHeroMoodSummary] = useState<NeighborhoodMoodSummary | null>(null);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regEvent, setRegEvent] = useState<ExploreEventRow | null>(null);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleBlock = (authorName: string, authorAvatar?: string, authorId?: string) => {
    appAlert(
      "Block " + authorName + "?",
      "You won't see their posts or questions anymore. You can unblock them anytime in Settings → Blocked Users.",
      [
        { text: "Block", style: "destructive", onPress: async () => {
          await blockUser({ id: authorId || authorName, name: authorName, avatar: authorAvatar });
          if (authorId) {
            try { await blockUserApi(authorId); } catch { /* best-effort */ }
          }
          showToast(authorName + " blocked. Manage in Settings → Blocked Users.", "success");
        }},
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // ── News state ──
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>(() => LIVE_NEWS_SESSION_CACHE.articles);
  const [newsLoading, setNewsLoading] = useState(() => LIVE_NEWS_SESSION_CACHE.articles.length === 0);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsCategory, setNewsCategory] = useState<NewsCategory>("all");
  const [newsLastFetched, setNewsLastFetched] = useState<number>(() => LIVE_NEWS_SESSION_CACHE.lastFetched);
  const [primaryLoaded, setPrimaryLoaded] = useState(false);
  const [newsCurrentPage, setNewsCurrentPage] = useState(() => LIVE_NEWS_SESSION_CACHE.currentPage);
  const [newsHasMore, setNewsHasMore] = useState(() => LIVE_NEWS_SESSION_CACHE.hasMore);
  const [newsTotal, setNewsTotal] = useState(() => LIVE_NEWS_SESSION_CACHE.total);
  const [newsPaging, setNewsPaging] = useState(false);
  const [newsSubTab, setNewsSubTab] = useState<"community" | "live">("live");
  const [exploreEvents, setExploreEvents] = useState<ExploreEventRow[]>([]);
  const [exploreEventsLoading, setExploreEventsLoading] = useState(false);
  const [apiStoriesList, setApiStoriesList] = useState<CommunityStory[]>([]);
  /** Raw API stories (Sprint 14 — grouping, saves, viewer). */
  const [storiesFromApi, setStoriesFromApi] = useState<ApiStory[]>([]);
  const [myStoriesFromApi, setMyStoriesFromApi] = useState<ApiStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState(false);
  const [questsList, setQuestsList] = useState<ApiChallenge[]>([]);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [joinedQuestIds, setJoinedQuestIds] = useState<Set<string>>(new Set());
  /** User-created posts for News → Community (`GET /feed` city-scoped; all categories except QUESTION, which Polls uses). */
  const [communityNewsPosts, setCommunityNewsPosts] = useState<FeedPost[]>([]);
  const [communityNewsLoading, setCommunityNewsLoading] = useState(false);
  const [pollQuestionPosts, setPollQuestionPosts] = useState<FeedPost[]>([]);
  const [pollPostsLoading, setPollPostsLoading] = useState(false);
  const [heroCommunityStats, setHeroCommunityStats] = useState<CommunityStats | null>(null);
  const [heroEventsTotal, setHeroEventsTotal] = useState(0);
  const [heroListingsTotal, setHeroListingsTotal] = useState(0);
  const [heroTickerRows, setHeroTickerRows] = useState<HeroTickerRow[]>([]);

  const applyMoodSummary = useCallback((summary: NeighborhoodMoodSummary | null) => {
    setHeroMoodSummary(summary);
    if (!summary?.myMood) {
      setHeroMood(null);
      return;
    }
    const selected = HERO_MOOD_OPTIONS.find((m) => m.mood === summary.myMood)?.label ?? null;
    setHeroMood(selected);
  }, []);

  const handleMoodVote = useCallback(async (mood: NeighborhoodMood) => {
    if (!requireAuth(undefined, "Sign in to share how your neighborhood is feeling today.")) return;
    const option = HERO_MOOD_OPTIONS.find((m) => m.mood === mood);
    const isDeselecting = option != null && heroMood === option.label;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const previous = heroMoodSummary;

    if (isDeselecting) {
      // Clear selection locally — update counts/percentages optimistically.
      // No API call: backend vote-endpoint re-votes rather than un-votes.
      setHeroMood(null);
      if (previous) {
        const nextRows = previous.moods.map((row) => ({
          ...row,
          count: row.mood === mood ? Math.max(0, row.count - 1) : row.count,
        }));
        const total = Math.max(0, (previous.totalVotes ?? 0) - 1);
        setHeroMoodSummary({
          ...previous,
          myMood: undefined as any,
          totalVotes: total,
          moods: nextRows.map((row) => ({
            ...row,
            percentage: total > 0 ? Math.round((row.count * 100) / total) : 0,
          })),
        });
      }
      return;
    }

    // Voting for a new mood — optimistic update
    if (option) setHeroMood(option.label);
    if (previous) {
      const prevMood = previous.myMood;
      const nextRows = previous.moods.map((row) => {
        let count = row.count;
        if (prevMood && row.mood === prevMood) count = Math.max(0, count - 1);
        if (row.mood === mood) count += 1;
        return { ...row, count };
      });
      const total = nextRows.reduce((sum, row) => sum + row.count, 0);
      applyMoodSummary({
        ...previous,
        myMood: mood,
        totalVotes: total,
        moods: nextRows.map((row) => ({
          ...row,
          percentage: total > 0 ? Math.round((row.count * 100) / total) : 0,
        })),
      });
    }
    try {
      const updated = await voteNeighborhoodMood({ mood, city });
      applyMoodSummary(updated);
    } catch {
      applyMoodSummary(previous ?? null);
      if (previous?.myMood) {
        const prev = HERO_MOOD_OPTIONS.find((m) => m.mood === previous.myMood);
        setHeroMood(prev?.label ?? null);
      } else {
        setHeroMood(null);
      }
    }
  }, [applyMoodSummary, city, heroMood, heroMoodSummary, requireAuth]);

  const toUiFeedPostCard = (p: any) => {
    const authorName = p?.author?.name || p?.author?.username || "User";
    const rawAv = p?.author?.avatarUrl;
    const avatarUrl = rawAv ? resolveApiAssetUrl(rawAv) : "https://randomuser.me/api/portraits/lego/1.jpg";
    const rawMedia = Array.isArray(p?.media) ? p.media?.[0]?.url : undefined;
    const mediaUrl = rawMedia ? resolveApiAssetUrl(String(rawMedia)) : undefined;

    return {
      id: String(p?.id ?? ""),
      author: authorName,
      avatar: avatarUrl,
      time: p?.createdAt ? new Date(p.createdAt).toLocaleString() : "",
      title: String(p?.title ?? ""),
      content: String(p?.content ?? ""),
      image: mediaUrl || "",
      likes: Math.max(0, (p?.likesCount ?? 0) - (p?.isLiked ? 1 : 0)),
      comments: p?.commentsCount ?? 0,
      tags: Array.isArray(p?.tags) ? p.tags.map(String) : [],
      // Sourced from the real author.verified field once the backend sends it on /feed —
      // do not hardcode true/false here (that would fabricate or hide a real trust signal).
      verified: p?.author?.verified === true,
      isEdited: p?.isEdited === true, // SPRINT-42: preserve the backend-derived edited marker.
      isOwner: p?.isOwner === true, // SPRINT-42: remove client id-comparison ownership fallbacks.
    };
  };
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [feedCommentPostId, setFeedCommentPostId] = useState<string | null>(null);
  const [feedCommentTitle, setFeedCommentTitle] = useState("");
  /** Full post when opening comments (e.g. from Saved) so title/body show even if not in Community list. */
  const [feedCommentPostDetail, setFeedCommentPostDetail] = useState<FeedPost | null>(null);
  useEffect(() => subscribeToPostUpdates((updated) => { // SPRINT-42: consume successful edit responses without persisted stale cache.
    setCommunityNewsPosts((posts) => posts.map((post) => post.id === updated.id ? { ...post, ...updated } : post)); // SPRINT-42: patch the main public card immediately.
    setPollQuestionPosts((posts) => posts.map((post) => post.id === updated.id ? { ...post, ...updated } : post)); // SPRINT-42: preserve edits if a question post crosses this boundary.
    setFeedCommentPostDetail((post) => post?.id === updated.id ? { ...post, ...updated } : post); // SPRINT-42: patch the open detail immediately.
  }), []); // SPRINT-42: subscribe only for this mounted screen lifetime.
  const [feedCommentPostLoading, setFeedCommentPostLoading] = useState(false);
  const [feedComments, setFeedComments] = useState<FeedComment[]>([]);
  const [feedCommentsLoading, setFeedCommentsLoading] = useState(false);
  const [feedCommentSending, setFeedCommentSending] = useState(false);
  const [feedCommentDraft, setFeedCommentDraft] = useState("");
  const [newsLiked, setNewsLiked] = useState<Set<string>>(new Set());
  const [newsSaved, setNewsSaved] = useState<Set<string>>(() => new Set(LIVE_NEWS_SESSION_CACHE.savedIds));
  const [newsLikeCounts, setNewsLikeCounts] = useState<Record<string, number>>({});
  const [newsCommentCounts, setNewsCommentCounts] = useState<Record<string, number>>({});
  const [newsCommentsOpen, setNewsCommentsOpen] = useState<string | null>(null);
  const [newsComments, setNewsComments] = useState<NewsArticleComment[]>([]);
  const [newsCommentsLoading, setNewsCommentsLoading] = useState(false);
  const [newsCommentDraft, setNewsCommentDraft] = useState("");
  const [newsCommentSending, setNewsCommentSending] = useState(false);
  const [newsCommentsPage, setNewsCommentsPage] = useState(1);
  const [newsCommentsHasMore, setNewsCommentsHasMore] = useState(false);
  const [newsCommentsError, setNewsCommentsError] = useState<string | null>(null);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  const newsSkeletonOpacity = useRef(new Animated.Value(0.4)).current;
  const userCountry = user?.country || guestCountry || "United States";
  const userState = user?.stateProvince?.trim() || guestState || undefined; // SPRINT-30
  const countryGeo = COUNTRY_NEWS_MAP[userCountry] || { gl: "US", hl: "en-US", flag: "🇺🇸" };

  const NEWS_CATEGORIES = BASE_NEWS_CATEGORIES;

  // ── Fetch news on mount & when city/country changes ──
  const newsCache = useRef<{ ts: number; city: string; country: string; phase: "primary" | "full" }>(
    LIVE_NEWS_SESSION_CACHE.cacheMeta ?? {
      ts: 0,
      city: "",
      country: "",
      phase: "full",
    },
  );

  // SPRINT-58: article ids whose stats have already been requested for the current
  // article set. `newsArticles` gets a new identity on every list update — primary load,
  // phase-two full load, background description enrichment, and paging — so without this
  // the stats effect re-requested the same cards four or more times per open.
  // Cleared whenever the article set is rebuilt, so pull-to-refresh and a city change
  // still pick up fresh like/comment counts.
  const newsStatsFetchedIds = useRef<Set<string>>(new Set());

  const loadNews = useCallback(async (force = false) => {
    if (!city) { setNewsLoading(false); return; } // no resolved location: Explore shows the choose-city prompt
    // Cache for 2 minutes — pull-to-refresh always forces a fresh fetch
    const cache = newsCache.current;
    const cacheFresh =
      !force &&
      cache.ts > 0 &&
      Date.now() - cache.ts < 120_000 &&
      cache.city === city &&
      cache.country === userCountry;
    if (cacheFresh && cache.phase === "full") {
      setNewsLoading(false);
      setPrimaryLoaded(false);
      return;
    }
    // A forced refresh or a location change replaces the whole article set, so the
    // stats dedupe must start over or counts would stay frozen at their first values.
    if (force || cache.city !== city || cache.country !== userCountry) {
      newsStatsFetchedIds.current.clear();
    }
    if (force) {
      setNewsArticles([]);
      setNewsLastFetched(0);
      setNewsCurrentPage(1);
      setNewsHasMore(false);
      setNewsTotal(0);
    }
    setNewsLoading(true);
    setPrimaryLoaded(false);
    setNewsError(null);

    const runPhaseTwo = async (existingPrimary: NewsArticle[]) => {
      setPrimaryLoaded(true);
      try {
        const fullRes = await getNewsExplore({
          city,
          country: userCountry,
          state: userState, // SPRINT-30
          phase: "full",
          page: 1,
          pageSize: LIVE_NEWS_PAGE_SIZE,
          force: force === true,
        });
        const fullArticles = Array.isArray(fullRes?.data) && fullRes.data.length > 0 ? fullRes.data : existingPrimary;
        const firstPage = fullArticles.slice(0, LIVE_NEWS_PAGE_SIZE);
        if (firstPage.length > 0) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setNewsArticles(firstPage);
        }
        const t = fullRes.cachedAt ? new Date(fullRes.cachedAt).getTime() : NaN;
        setNewsLastFetched(Number.isNaN(t) ? Date.now() : t);
        setNewsCurrentPage(1);
        const totalFromResponse = typeof fullRes.total === "number" ? fullRes.total : firstPage.length;
        setNewsTotal(totalFromResponse);
        setNewsHasMore(
          typeof fullRes.hasMore === "boolean"
            ? fullRes.hasMore
            : firstPage.length < totalFromResponse,
        );
        newsCache.current = { ts: Date.now(), city, country: userCountry, phase: "full" };
      } catch (phaseTwoError) {
        console.warn("[Feed] Phase 2 full news fetch failed:", phaseTwoError);
      } finally {
        setPrimaryLoaded(false);
      }
    };

    try {
      let primaryArticles: NewsArticle[] = [];
      if (cacheFresh && cache.phase === "primary" && newsArticles.length > 0) {
        primaryArticles = newsArticles;
      } else {
        const primaryRes = await getNewsExplore({
          city,
          country: userCountry,
          state: userState, // SPRINT-30
          phase: "primary",
          force: force === true,
        });
        primaryArticles = Array.isArray(primaryRes?.data) && primaryRes.data.length > 0 ? primaryRes.data : FALLBACK_NEWS;
      }

      if (primaryArticles.length === 0) {
        setNewsError("Couldn't load news. Pull to refresh.");
        setNewsArticles([]);
        setNewsLastFetched(0);
        return;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNewsArticles(primaryArticles);
      setNewsCurrentPage(1);
      setNewsHasMore(false);
      setNewsTotal(primaryArticles.length);
      newsCache.current = { ts: Date.now(), city, country: userCountry, phase: "primary" };
      setNewsLoading(false);
      void runPhaseTwo(primaryArticles);

      // ── Background description enrichment ──
      // For articles with no/short description, fetch og:description from the article page.
      // Runs after initial render so cards appear immediately then fill in with details.
      const needsDesc = primaryArticles.filter(
        (a) => !a.description || a.description.length < 30 || a.description.startsWith("Also covered:"),
      );
      if (needsDesc.length > 0) {
        const toEnrich = needsDesc.slice(0, 30);
        Promise.allSettled(
          toEnrich.map((a) => fetchArticleMeta(a.url).then((meta) => ({ id: a.id, description: meta.description }))),
        ).then((results) => {
          const updates = new Map<string, string>();
          for (const r of results) {
            if (r.status === "fulfilled" && r.value.description) {
              updates.set(r.value.id, r.value.description);
            }
          }
          if (updates.size > 0) {
            setNewsArticles((prev) =>
              prev.map((a) => {
                const newDesc = updates.get(a.id);
                if (!newDesc || (a.description && a.description.length >= 30)) return a;
                return { ...a, description: newDesc };
              }),
            );
          }
        }).catch(() => {});
      }

    } catch {
      setNewsError("Couldn't load news. Pull to refresh.");
      setNewsArticles([]);
      setNewsLastFetched(0);
      setPrimaryLoaded(false);
    } finally {
      setNewsLoading(false);
      useListFetchCacheStore.getState().markFetched("feed:news"); // SPRINT-30
    }
  }, [city, userCountry, userState, newsArticles]);

  const loadMoreNews = useCallback(async () => {
    if (newsPaging || newsLoading || !newsHasMore) return;
    setNewsPaging(true);
    try {
      const nextPage = newsCurrentPage + 1;
      const nextRes = await getNewsExplore({
        city,
        country: userCountry,
        state: userState, // SPRINT-30
        phase: "full",
        page: nextPage,
        pageSize: LIVE_NEWS_PAGE_SIZE,
      });
      const nextArticles = Array.isArray(nextRes?.data) ? nextRes.data : [];
      if (nextArticles.length > 0) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNewsArticles((prev) => {
          const next = [
            ...prev,
            ...nextArticles.filter((item) => !prev.some((existing) => existing.id === item.id)),
          ];
          if (typeof nextRes.total === "number") {
            setNewsHasMore(
              typeof nextRes.hasMore === "boolean"
                ? nextRes.hasMore
                : next.length < nextRes.total,
            );
          }
          return next;
        });
      }
      setNewsCurrentPage(nextPage);
      const totalFromResponse = typeof nextRes.total === "number" ? nextRes.total : newsTotal;
      setNewsTotal(totalFromResponse);
      setNewsHasMore(
        typeof nextRes.hasMore === "boolean"
          ? nextRes.hasMore
          : newsArticles.length + nextArticles.length < totalFromResponse,
      );
    } catch (err) {
      console.warn("[Feed] loadMoreNews failed:", err);
    } finally {
      setNewsPaging(false);
    }
  }, [city, userCountry, userState, newsCurrentPage, newsHasMore, newsLoading, newsPaging]);

  useEffect(() => {
    LIVE_NEWS_SESSION_CACHE.articles = newsArticles;
    LIVE_NEWS_SESSION_CACHE.lastFetched = newsLastFetched;
    LIVE_NEWS_SESSION_CACHE.currentPage = newsCurrentPage;
    LIVE_NEWS_SESSION_CACHE.hasMore = newsHasMore;
    LIVE_NEWS_SESSION_CACHE.total = newsTotal;
    LIVE_NEWS_SESSION_CACHE.cacheMeta = newsCache.current;
  }, [newsArticles, newsLastFetched, newsCurrentPage, newsHasMore, newsTotal]);

  useEffect(() => {
    LIVE_NEWS_SESSION_CACHE.savedIds = Array.from(newsSaved);
  }, [newsSaved]);

  useFocusEffect(
    useCallback(() => {
      if (feedTab !== "News" || newsSubTab !== "live") {
        return undefined;
      }
      // SPRINT-30: sub-tab cache gate for Live News
      if (!useListFetchCacheStore.getState().shouldFetch("feed:news")) return undefined;
      void loadNews().then(() => {
        useListFetchCacheStore.getState().markFetched("feed:news");
      });
      return undefined;
    }, [feedTab, newsSubTab, loadNews]),
  );

  // City changes while already on News/Live don't trigger the focus effect above.
  const newsCityRef = useRef(city);
  useEffect(() => {
    if (newsCityRef.current === city) return;
    newsCityRef.current = city;
    if (feedTab !== "News" || newsSubTab !== "live") return;
    void loadNews().then(() => {
      useListFetchCacheStore.getState().markFetched("feed:news");
    });
  }, [city, feedTab, newsSubTab, loadNews]);

  const loadExploreEvents = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!city) return;
    if (!silent) setExploreEventsLoading(true);
    try {
      const [stats, moodSummary, res, listingsRes, feedRes, storiesRaw] = await Promise.all([
        getCommunityStats(city),
        getNeighborhoodMood(city),
        getEvents({
          page: 1,
          pageSize: 50,
          city,
          upcoming: true,
        }),
        getListings({ page: 1, pageSize: 12, city }),
        getFeed({ page: 1, pageSize: 25, trending: false, city }),
        getActiveStories(city),
      ]);
      setHeroCommunityStats(stats);
      applyMoodSummary(moodSummary);
      setHeroEventsTotal(typeof res?.total === "number" ? res.total : res?.data?.length ?? 0);
      setHeroListingsTotal(typeof listingsRes?.total === "number" ? listingsRes.total : listingsRes?.data?.length ?? 0);
      const rows = (res?.data ?? []).map(apiEventToExploreRow);
      setExploreEvents(rows);
      const posts = Array.isArray(feedRes?.data) ? (feedRes.data as FeedPost[]) : [];
      const stories = Array.isArray(storiesRaw) ? storiesRaw : [];
      setHeroTickerRows(
        buildHeroTickerRows({
          city,
          posts,
          events: res?.data ?? [],
          listings: listingsRes?.data ?? [],
          stories,
        }),
      );
      // Seed community news from the same feed data so the Community tab is
      // never empty while posts clearly exist (e.g. on first load or remount).
      if (posts.length > 0) {
        setCommunityNewsPosts((prev) => {
          // Show all feed posts in Community News. Some posts created from the
          // news composer can be categorized as QUESTION and should still appear here.
          const communityPosts = posts;
          if (prev.length > 0) return prev; // don't overwrite a more-complete fetch
          return communityPosts;
        });
      }
    } catch {
      if (!silent) {
        setExploreEvents([]);
        setHeroCommunityStats(null);
        setHeroEventsTotal(0);
        setHeroListingsTotal(0);
        setHeroTickerRows([]);
      }
    } finally {
      if (!silent) setExploreEventsLoading(false);
    }
  }, [applyMoodSummary, city]);

  const loadStories = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!city) return;
    if (!silent) setStoriesLoading(true);
    try {
      const raw = await getActiveStories(city);
      const list = Array.isArray(raw) ? raw : [];
      let myList: typeof list = [];
      // /stories/me requires auth — skip entirely for guests to avoid noisy 401s
      if (user?.id) {
        try {
          const mine = await getMyStories();
          myList = Array.isArray(mine) ? mine : [];
        } catch {
          myList = [];
        }
      }
      const listNorm = list.map(normalizeApiStoryForFeed);
      const myNorm = myList.map(normalizeApiStoryForFeed);
      setStoriesFromApi(listNorm);
      setMyStoriesFromApi(myNorm);
      setApiStoriesList(listNorm.map(mapApiStoryToCommunityStory));
      setStoriesError(false);

      // Hydrate per-story liked/count state — /stories list doesn't include likedByMe.
      if (user?.id && listNorm.length > 0) {
        Promise.allSettled(
          listNorm.slice(0, 20).map((s) => getStoryLikeStatus(s.id).then((res) => ({ id: s.id, res }))),
        ).then((results) => {
          const patches = new Map<string, StoryLikeStatus>();
          for (const r of results) {
            if (r.status === "fulfilled") patches.set(r.value.id, r.value.res);
          }
          if (patches.size === 0) return;
          setStoriesFromApi((prev) =>
            prev.map((s) => {
              const p = patches.get(s.id);
              return p ? { ...s, likedByMe: p.likedByMe, likeCount: p.likeCount } : s;
            }),
          );
        });
      }
    } catch {
      if (!silent) {
        setStoriesFromApi([]);
        setMyStoriesFromApi([]);
        setApiStoriesList([]);
        setStoriesError(true);
      }
    } finally {
      if (!silent) setStoriesLoading(false);
    }
  }, [city, user?.id]);

  const loadQuests = useCallback(async () => {
    if (!city) return;
    try {
      setQuestsLoading(true);
      const res = await getChallenges({ status: "ACTIVE", city });
      const list = Array.isArray(res?.data) ? res.data : [];
      setQuestsList(list);
      const joined = new Set(list.filter((q) => q.isJoined).map((q) => q.id));
      setJoinedQuestIds(joined);
    } catch {
      setQuestsList([]);
    } finally {
      setQuestsLoading(false);
    }
  }, [city]);

  useEffect(() => {
    // UI-11: respect the OS "remove animations" setting; keep a static skeleton instead of pulsing.
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(newsSkeletonOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(newsSkeletonOpacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [newsSkeletonOpacity]);

  useEffect(() => {
    if (newsArticles.length === 0) return;
    const pending = newsArticles
      .slice(0, 20)
      .map((a) => a.id)
      .filter((id) => id && !newsStatsFetchedIds.current.has(id));
    if (pending.length === 0) return;
    // Marked before the request so a re-render mid-flight cannot queue a duplicate.
    pending.forEach((id) => newsStatsFetchedIds.current.add(id));

    getArticleStatsBatch(pending)
      .then((res) => {
        const stats = res?.data ?? {};
        const likeCounts: Record<string, number> = {};
        const commentCounts: Record<string, number> = {};
        const likedIds = new Set<string>();
        const savedIds = new Set<string>(); // SPRINT-30
        for (const [id, s] of Object.entries(stats)) {
          likeCounts[id] = s.likeCount;
          commentCounts[id] = s.commentCount;
          if (s.likedByMe) likedIds.add(id);
          if (s.savedByMe) savedIds.add(id); // SPRINT-30
        }
        setNewsLikeCounts((prev) => ({ ...prev, ...likeCounts }));
        setNewsCommentCounts((prev) => ({ ...prev, ...commentCounts }));
        // Merged off the previous state rather than the captured value, so stats landing
        // after a like/save tap cannot roll that tap back.
        setNewsLiked((prev) => new Set([...prev, ...likedIds]));
        setNewsSaved((prev) => new Set([...prev, ...savedIds])); // SPRINT-30
      })
      .catch(() => {
        // Allow a retry on the next list update.
        pending.forEach((id) => newsStatsFetchedIds.current.delete(id));
      });
  }, [newsArticles]);

  const loadCommunityNewsFeed = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!city) return;
    if (!silent) setCommunityNewsLoading(true);
    try {
      // Omit `category`: the create-post news form uses Community, Announcement, Jobs, etc.
      // Previously only COMMUNITY was requested, so other news categories never appeared here.
      const res = await getFeed({
        page: 1,
        pageSize: 50,
        city,
      });
      const raw = Array.isArray(res?.data) ? (res.data as FeedPost[]) : [];
      setCommunityNewsPosts(raw.map((post) => { // SPRINT-42: overlay in-memory PATCH so a refetch cannot erase a just-edited post.
        const latest = getLatestPostUpdate(post.id); // SPRINT-42: read process-local edit cache.
        return latest ? { ...post, ...latest } : post; // SPRINT-42: prefer the fresher edited response when present.
      })); // SPRINT-42: finish community feed merge.
    } catch {
      // preserve any posts already seeded from loadExploreEvents on error
    } finally {
      if (!silent) setCommunityNewsLoading(false);
    }
  }, [city]);

  const loadPollFeed = useCallback(async () => {
    if (!city) return;
    try {
      setPollPostsLoading(true);
      const res = await getFeed({ page: 1, pageSize: 25, category: "QUESTION", city });
      const items = Array.isArray(res?.data) ? res.data : [];
      setPollQuestionPosts((items as FeedPost[]).map((post) => { // SPRINT-42: preserve just-edited question posts across refetch.
        const latest = getLatestPostUpdate(post.id); // SPRINT-42: read process-local edit cache.
        return latest ? { ...post, ...latest } : post; // SPRINT-42: overlay PATCH fields when present.
      })); // SPRINT-42: finish poll feed merge.
    } catch {
      setPollQuestionPosts([]);
    } finally {
      setPollPostsLoading(false);
    }
  }, [city]);

  const loadWyrPolls = useCallback(async () => {
    if (!city) return;
    try {
      setWyrPollsLoading(true);
      const list = await getPolls(city);
      setWyrPolls(Array.isArray(list) ? list : []);
    } catch {
      setWyrPolls([]);
    } finally {
      setWyrPollsLoading(false);
    }
  }, [city]);

  const feedBackgroundHydratedRef = useRef(false);

  const communityNewsEverLoadedRef = useRef(false);
  useEffect(() => {
    if (feedTab !== "News") return;
    if (newsSubTab !== "community") return;
    const silent = communityNewsEverLoadedRef.current;
    void loadCommunityNewsFeed({ silent }).then(() => {
      communityNewsEverLoadedRef.current = true;
    });
  }, [feedTab, newsSubTab, loadCommunityNewsFeed]);

  useFocusEffect(
    useCallback(() => {
      if (feedTab !== "News" || newsSubTab !== "community") return undefined;
      // SPRINT-27: 10-minute stale-while-revalidate gate
      if (communityNewsEverLoadedRef.current && !useListFetchCacheStore.getState().shouldFetch("feed")) return undefined;
      const silent = communityNewsEverLoadedRef.current;
      return runAfterTransition(() => {
        void loadCommunityNewsFeed({ silent }).then(() => {
          communityNewsEverLoadedRef.current = true;
          useListFetchCacheStore.getState().markFetched("feed");
        });
      });
    }, [feedTab, newsSubTab, loadCommunityNewsFeed]),
  );

  useEffect(() => {
    if (feedTab !== "Events") return;
    // SPRINT-30: sub-tab cache gate
    if (!useListFetchCacheStore.getState().shouldFetch("feed:events")) return;
    void loadExploreEvents({ silent: feedBackgroundHydratedRef.current }).then(() => {
      useListFetchCacheStore.getState().markFetched("feed:events");
    });
  }, [feedTab, loadExploreEvents]);

  useEffect(() => {
    if (feedTab !== "Stories") return;
    // SPRINT-30: sub-tab cache gate
    if (!useListFetchCacheStore.getState().shouldFetch("feed:stories")) return;
    void loadStories({ silent: feedBackgroundHydratedRef.current }).then(() => {
      useListFetchCacheStore.getState().markFetched("feed:stories");
    });
  }, [feedTab, loadStories]);

  useEffect(() => {
    if (feedTab !== "Quests") return;
    // SPRINT-30: sub-tab cache gate
    if (!useListFetchCacheStore.getState().shouldFetch("feed:quests")) return;
    void loadQuests().then(() => {
      useListFetchCacheStore.getState().markFetched("feed:quests");
    });
  }, [feedTab, loadQuests]);

  useEffect(() => {
    if (feedTab !== "Polls") return;
    // SPRINT-30: sub-tab cache gate
    if (!useListFetchCacheStore.getState().shouldFetch("feed:polls")) return;
    Promise.allSettled([loadPollFeed(), loadWyrPolls()]).then(() => {
      useListFetchCacheStore.getState().markFetched("feed:polls");
    });
  }, [feedTab, loadPollFeed, loadWyrPolls]);

  useEffect(() => {
    setWyrIndex(0);
  }, [city]);

  useEffect(() => {
    setWyrIndex((i) => {
      if (wyrPolls.length === 0) return 0;
      return Math.min(i, wyrPolls.length - 1);
    });
  }, [wyrPolls.length]);

  useFocusEffect(
    useCallback(() => {
      // SPRINT-27: 10-minute stale-while-revalidate gate
      if (feedBackgroundHydratedRef.current && !useListFetchCacheStore.getState().shouldFetch("feed")) return undefined;
      let cancelled = false;
      const silent = feedBackgroundHydratedRef.current;
      const cancelDefer = runAfterTransition(() => {
        if (cancelled) return;
        void (async () => {
          await loadExploreEvents({ silent });
          await loadStories({ silent });
          feedBackgroundHydratedRef.current = true;
          useListFetchCacheStore.getState().markFetched("feed");
        })();
      });
      return () => {
        cancelled = true;
        cancelDefer();
      };
    }, [loadExploreEvents, loadStories]),
  );

  // City changes while Feed is already focused/mounted don't trigger the
  // useFocusEffect above — refetch explicitly so switching city refreshes
  // the hero/explore data immediately instead of waiting for a re-focus.
  const feedCityRef = useRef(city);
  useEffect(() => {
    if (feedCityRef.current === city) return;
    feedCityRef.current = city;
    void loadExploreEvents({ silent: true });
    void loadStories({ silent: true });
  }, [city, loadExploreEvents, loadStories]);

  const filteredNews = newsCategory === "all"
    ? newsArticles
    : newsArticles.filter((a) => a.category === newsCategory);
  const [storyFilter, setStoryFilter] = useState<StoryCategory>("All");
  const [storySortBy, setStorySortBy] = useState<"trending" | "latest" | "popular">("trending");

  const storyAuthorGroups = useMemo(
    () => buildStoryAuthorGroups(storiesFromApi, user?.id),
    [storiesFromApi, user?.id],
  );

  const { filteredApiStories, filteredStories } = useMemo(() => {
    const apiCatToUi = (cat: string): string => {
      const c = (cat || "").toUpperCase();
      if (c === "EVENTS") return "Events";
      if (c === "FOOD") return "Food";
      if (c === "HOUSING") return "Housing";
      if (c === "CULTURE") return "Culture";
      if (c === "LOCAL_NEWS") return "Local News";
      return "Local News";
    };
    let list = [...storiesFromApi];
    if (storyFilter !== "All") {
      list = list.filter((s) => apiCatToUi(s.category) === storyFilter);
    }
    if (storySortBy === "popular") list.sort((a, b) => b.viewsCount - a.viewsCount);
    else if (storySortBy === "latest") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      list.sort((a, b) => b.viewsCount - a.viewsCount);
    }
    return {
      filteredApiStories: list,
      filteredStories: list.map(mapApiStoryToCommunityStory),
    };
  }, [storiesFromApi, storyFilter, storySortBy]);

  const openStoryViewerAt = useCallback((authorIndex: number, storyIndex: number) => {
    router.push({
      pathname: "/story-viewer",
      params: { authorIndex: String(authorIndex), storyIndex: String(storyIndex) },
    } as any);
  }, []);

  const findStoryIndices = useCallback(
    (storyId: string): { ai: number; si: number } => {
      for (let ai = 0; ai < storyAuthorGroups.length; ai++) {
        const si = storyAuthorGroups[ai].stories.findIndex((s) => s.id === storyId);
        if (si >= 0) return { ai, si };
      }
      return { ai: 0, si: 0 };
    },
    [storyAuthorGroups],
  );

  const patchStorySavedInFeed = useCallback((storyId: string, saved: boolean) => {
    setStoriesFromApi((prev) => prev.map((s) => (s.id === storyId ? { ...s, isSaved: saved } : s)));
    setApiStoriesList((prev) =>
      prev.map((row) => (row.id === storyId ? { ...row, isBookmarked: saved } : row)),
    );
  }, []);

  const onToggleStorySaveFromFeed = useCallback(
    async (storyId: string) => {
      if (!requireAuth(undefined, "Sign in to save stories and find them later.")) return;
      const cur = storiesFromApi.find((s) => s.id === storyId);
      const next = !apiStoryIsSaved(cur);
      patchStorySavedInFeed(storyId, next);
      useSidebarStore.getState().incrementSaved(next ? 1 : -1);
      try {
        const r = await toggleStorySave(storyId);
        const confirmed = r.isSaved === true || r.saved === true;
        patchStorySavedInFeed(storyId, confirmed);
        if (confirmed !== next) useSidebarStore.getState().incrementSaved(confirmed ? 1 : -1);
      } catch {
        patchStorySavedInFeed(storyId, !next);
        useSidebarStore.getState().incrementSaved(next ? -1 : 1);
      }
    },
    [storiesFromApi, patchStorySavedInFeed, requireAuth],
  );

  const patchStoryLikeInFeed = useCallback((storyId: string, liked: boolean, likeCount: number) => {
    setStoriesFromApi((prev) => prev.map((s) => (s.id === storyId ? { ...s, likedByMe: liked, likeCount } : s)));
  }, []);

  const onToggleStoryLikeFromFeed = useCallback(
    async (storyId: string) => {
      if (!requireAuth(undefined, "Sign in to like stories from your neighbors.")) return;
      const cur = storiesFromApi.find((s) => s.id === storyId);
      if (!cur) return;
      const prevLiked = cur.likedByMe === true;
      const prevCount = cur.likeCount ?? 0;
      const nextLiked = !prevLiked;
      const optimisticCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
      patchStoryLikeInFeed(storyId, nextLiked, optimisticCount);
      try {
        const res = await toggleStoryLike(storyId);
        patchStoryLikeInFeed(storyId, res.liked, res.likeCount);
      } catch {
        patchStoryLikeInFeed(storyId, prevLiked, prevCount);
      }
    },
    [storiesFromApi, patchStoryLikeInFeed, requireAuth],
  );

  const onDeleteStoryFromFeed = useCallback((storyId: string) => {
    appAlert(
      "Delete this story?",
      "It will be removed immediately for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteStory(storyId)
              .then(() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setStoriesFromApi((prev) => prev.filter((s) => s.id !== storyId));
                setMyStoriesFromApi((prev) => prev.filter((s) => s.id !== storyId));
                setApiStoriesList((prev) => prev.filter((row) => row.id !== storyId));
              })
              .catch((e: unknown) =>
                showToast(e instanceof ApiError ? e.message : "Could not delete story. Try again.", "error"),
              );
          },
        },
      ],
    );
  }, []);

  const toggleCommunityLike = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to like posts from your neighbors.")) return;
    try {
      const res = await toggleFeedLike(id);
      const liked = (res as any)?.liked === true;
      const likesCount = (res as any)?.likesCount ?? 0;
      setCommunityNewsPosts((prev) => prev.map((p) => (p.id === id ? { ...p, isLiked: liked, likesCount } : p)));
    } catch {
      // no-op
    }
  };

  const toggleCommunitySave = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to save posts and find them later.")) return;
    try {
      const res = await toggleFeedSave(id);
      const saved = (res as any)?.saved === true;
      const savesCount = (res as any)?.savesCount ?? 0;
      setCommunityNewsPosts((prev) => prev.map((p) => (p.id === id ? { ...p, isSaved: saved, savesCount } : p)));
      useSidebarStore.getState().incrementSaved(saved ? 1 : -1);
    } catch {
      // no-op
    }
  };

  const toggleEventGoing = async (row: ExploreEventRow) => {
    if (!requireAuth(undefined, "Sign in to RSVP and get event updates.")) return;
    const next = !row.registeredByMe;
    const prevInterested = row.interested;
    const prevReg = row.registeredByMe;
    const prevCanChat = row.canAccessChat;
    const prevConv = row.conversationId;
    setExploreEvents((p) =>
      p.map((e) =>
        e.id === row.id
          ? {
              ...e,
              registeredByMe: next,
              interested: Math.max(0, e.interested + (next ? 1 : -1)),
              canAccessChat: next
                ? e.canAccessChat
                : e.isOwner
                  ? Math.max(0, e.interested - 1) > 0 && e.conversationId != null
                  : false,
            }
          : e,
      ),
    );
    try {
      if (next) {
        const res = await registerForEvent(row.id, {});
        const attendees = typeof res.attendees === "number" ? res.attendees : undefined;
        const cid = res.conversationId ?? undefined;
        setExploreEvents((p) =>
          p.map((e) =>
            e.id === row.id
              ? {
                  ...e,
                  registeredByMe: true,
                  interested: attendees ?? e.interested,
                  conversationId: cid ?? e.conversationId,
                  canAccessChat: cid != null ? true : e.canAccessChat,
                }
              : e,
          ),
        );
        setSelectedEvent((cur) =>
          cur?.id === row.id
            ? {
                ...cur,
                registeredByMe: true,
                interested: attendees ?? cur.interested,
                conversationId: cid ?? cur.conversationId,
                canAccessChat: cid != null ? true : cur.canAccessChat,
              }
            : cur,
        );
      } else {
        const res = await unregisterFromEvent(row.id);
        const attendees = typeof res.attendees === "number" ? res.attendees : undefined;
        const resCid = res.conversationId ?? undefined;
        setExploreEvents((p) =>
          p.map((e) =>
            e.id === row.id
              ? {
                  ...e,
                  registeredByMe: false,
                  interested: attendees ?? e.interested,
                  conversationId: resCid ?? e.conversationId,
                  canAccessChat: e.isOwner && (attendees ?? 0) > 0 && (resCid ?? e.conversationId) != null,
                }
              : e,
          ),
        );
        setSelectedEvent((cur) =>
          cur?.id === row.id
            ? {
                ...cur,
                registeredByMe: false,
                interested: attendees ?? cur.interested,
                conversationId: resCid ?? cur.conversationId,
                canAccessChat:
                  cur.isOwner && (attendees ?? 0) > 0 && (resCid ?? cur.conversationId) != null,
              }
            : cur,
        );
      }
    } catch (e) {
      setExploreEvents((p) =>
        p.map((ev) =>
          ev.id === row.id
            ? {
                ...ev,
                registeredByMe: prevReg,
                interested: prevInterested,
                canAccessChat: prevCanChat,
                conversationId: prevConv,
              }
            : ev,
        ),
      );
      setSelectedEvent((cur) =>
        cur?.id === row.id
          ? {
              ...cur,
              registeredByMe: prevReg,
              interested: prevInterested,
              canAccessChat: prevCanChat,
              conversationId: prevConv,
            }
          : cur,
      );
      showToast(e instanceof ApiError ? e.message : (next ? "Could not RSVP. Please try again." : "Could not cancel RSVP. Please try again."), "error");
    }
  };

  const toggleEventSave = async (row: ExploreEventRow) => {
    if (!requireAuth(undefined, "Sign in to save events for later.")) return;
    try {
      const res = await toggleSaveEvent(row.id);
      const saved = res.saved === true;
      setExploreEvents((p) => p.map((e) => (e.id === row.id ? { ...e, isSaved: saved } : e)));
      setSelectedEvent((cur) => (cur?.id === row.id ? { ...cur, isSaved: saved } : cur));
      useSidebarStore.getState().incrementSaved(saved ? 1 : -1);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not update save. Please try again.", "error");
    }
  };

  const onRefresh = useCallback(() => {
    useListFetchCacheStore.getState().clearFetchTimestamp("feed"); // SPRINT-27
    setRefreshing(true);
    const heroSync = loadExploreEvents();
    if (feedTab === "News") {
      useListFetchCacheStore.getState().clearFetchTimestamp("feed:news"); // SPRINT-30
      if (newsSubTab === "community") {
        Promise.allSettled([heroSync, loadNews(true), loadCommunityNewsFeed()]).finally(() =>
          setRefreshing(false),
        );
      } else {
        Promise.allSettled([heroSync, loadNews(true)]).finally(() => setRefreshing(false));
      }
    } else if (feedTab === "Events") {
      useListFetchCacheStore.getState().clearFetchTimestamp("feed:events"); // SPRINT-30
      heroSync.finally(() => setRefreshing(false));
    } else if (feedTab === "Stories") {
      useListFetchCacheStore.getState().clearFetchTimestamp("feed:stories"); // SPRINT-30
      Promise.allSettled([heroSync, loadStories()]).finally(() => setRefreshing(false));
    } else if (feedTab === "Quests") {
      useListFetchCacheStore.getState().clearFetchTimestamp("feed:quests"); // SPRINT-30
      Promise.allSettled([heroSync, loadQuests()]).finally(() => setRefreshing(false));
    } else if (feedTab === "Polls") {
      useListFetchCacheStore.getState().clearFetchTimestamp("feed:polls"); // SPRINT-30
      Promise.allSettled([heroSync, loadPollFeed(), loadWyrPolls()]).finally(() => setRefreshing(false));
    } else {
      heroSync.finally(() => setRefreshing(false));
    }
  }, [
    feedTab,
    newsSubTab,
    loadNews,
    loadExploreEvents,
    loadStories,
    loadQuests,
    loadCommunityNewsFeed,
    loadPollFeed,
    loadWyrPolls,
  ]);

  const toggleLike    = (id: string) => setLiked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSave    = (id: string) => setSaved((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── News card interaction helpers ──
  const handleNewsLike = useCallback(async (articleId: string) => {
    if (!requireAuth(undefined, "Sign in to like news from your area.")) return;
    const wasLiked = newsLiked.has(articleId);
    setNewsLiked((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(articleId) : next.add(articleId);
      return next;
    });
    setNewsLikeCounts((prev) => ({
      ...prev,
      [articleId]: Math.max(0, (prev[articleId] ?? 0) + (wasLiked ? -1 : 1)),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await toggleArticleLike(articleId);
      setNewsLikeCounts((prev) => ({ ...prev, [articleId]: res.likeCount }));
      setNewsLiked((prev) => {
        const next = new Set(prev);
        res.liked ? next.add(articleId) : next.delete(articleId);
        return next;
      });
    } catch {
      setNewsLiked((prev) => {
        const next = new Set(prev);
        wasLiked ? next.add(articleId) : next.delete(articleId);
        return next;
      });
      setNewsLikeCounts((prev) => ({
        ...prev,
        [articleId]: Math.max(0, (prev[articleId] ?? 0) + (wasLiked ? 1 : -1)),
      }));
    }
  }, [newsLiked, requireAuth]);
  const toggleNewsSave = useCallback(async (id: string) => {
    if (!requireAuth(undefined, "Sign in to save articles and read them later.")) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const article = newsArticles.find((a) => a.id === id); // SPRINT-30
    const wasSaved = newsSaved.has(id);
    setNewsSaved((p) => { const n = new Set(p); wasSaved ? n.delete(id) : n.add(id); return n; });
    useSidebarStore.getState().incrementSaved(wasSaved ? -1 : 1);
    try {
      const res = await saveNewsArticle(id, { // SPRINT-30
        title: article?.title ?? "Saved article",
        url: article?.url ?? "#",
        imageUrl: article?.image ?? undefined,
        source: article?.source,
        publishedAt: article?.publishedAt,
      });
      // Sync with authoritative backend state if available
      if (typeof res.saved === "boolean") {
        setNewsSaved((p) => {
          const n = new Set(p);
          res.saved ? n.add(id) : n.delete(id);
          return n;
        });
        const delta = (res.saved ? 1 : -1) - (wasSaved ? -1 : 1);
        if (delta !== 0) useSidebarStore.getState().incrementSaved(delta > 0 ? 1 : -1);
      }
    } catch {
      setNewsSaved((p) => { const n = new Set(p); wasSaved ? n.add(id) : n.delete(id); return n; });
      useSidebarStore.getState().incrementSaved(wasSaved ? 1 : -1);
    }
  }, [newsSaved, newsArticles, requireAuth]);
  const openNewsComments = useCallback(async (articleId: string) => {
    setNewsCommentsOpen(articleId);
    setNewsComments([]);
    setNewsCommentsLoading(true);
    setNewsCommentsPage(1);
    setNewsCommentsHasMore(false);
    setNewsCommentsError(null);
    try {
      const res = await getArticleComments(articleId, { page: 1, pageSize: 20 });
      setNewsComments(Array.isArray(res?.data) ? res.data : []);
      setNewsCommentsHasMore((res?.meta?.page ?? 1) < (res?.meta?.totalPages ?? 1));
      setNewsCommentCounts((prev) => ({ ...prev, [articleId]: res?.meta?.total ?? 0 }));
    } catch {
      setNewsCommentsError("Could not load comments.");
    } finally {
      setNewsCommentsLoading(false);
    }
  }, []);
  const loadMoreNewsComments = useCallback(async () => {
    if (!newsCommentsOpen || !newsCommentsHasMore || newsCommentsLoading) return;
    const nextPage = newsCommentsPage + 1;
    setNewsCommentsLoading(true);
    try {
      const res = await getArticleComments(newsCommentsOpen, { page: nextPage, pageSize: 20 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setNewsComments((prev) => [...prev, ...rows]);
      setNewsCommentsPage(nextPage);
      setNewsCommentsHasMore((res?.meta?.page ?? nextPage) < (res?.meta?.totalPages ?? nextPage));
    } catch {
      setNewsCommentsError("Could not load more comments.");
    } finally {
      setNewsCommentsLoading(false);
    }
  }, [newsCommentsHasMore, newsCommentsLoading, newsCommentsOpen, newsCommentsPage]);
  const submitNewsComment = useCallback(async () => {
    if (!newsCommentsOpen || !newsCommentDraft.trim()) return;
    if (!requireAuth(undefined, "Sign in to join the conversation.")) return;
    setNewsCommentSending(true);
    setNewsCommentsError(null);
    try {
      const created = await addArticleComment(newsCommentsOpen, newsCommentDraft.trim());
      setNewsComments((prev) => [created, ...prev]);
      setNewsCommentDraft("");
      setNewsCommentCounts((prev) => ({
        ...prev,
        [newsCommentsOpen]: Math.max(0, (prev[newsCommentsOpen] ?? 0) + 1),
      }));
    } catch {
      setNewsCommentsError("Could not post comment.");
    } finally {
      setNewsCommentSending(false);
    }
  }, [newsCommentDraft, newsCommentsOpen, requireAuth]);
  const toggleExpandArticle = (id: string) => {
    setExpandedArticles((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const shareArticle = async (article: NewsArticle) => {
    try {
      const link = article.url && article.url !== "#" ? article.url : "";
      const body = `${article.title}\n\n${article.description}${link ? `\n\n${link}` : ""}`;
      await Share.share({
        title: article.title,
        message: body,
        ...(Platform.OS === "ios" && link ? { url: link } : {}),
      });
    } catch {}
  };

  const shareFeedPostCard = async (post: ReturnType<typeof toUiFeedPostCard>) => {
    try {
      const url = getFeedPostShareUrl(post.id);
      const snippet = post.content.length > 300 ? `${post.content.slice(0, 300)}…` : post.content;
      const message = `${post.title}\n\n${snippet}\n\n${url}`;
      await Share.share({
        title: post.title,
        message,
        ...(Platform.OS === "ios" ? { url } : {}),
      });
    } catch {
      /* user dismissed */
    }
  };

  const bumpFeedPostCommentCount = useCallback((postId: string) => {
    const bump = (p: FeedPost) =>
      String(p.id) === postId ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p;
    setCommunityNewsPosts((prev) => prev.map(bump));
    setPollQuestionPosts((prev) => prev.map(bump));
  }, []);

  const removeFeedPostFromLists = useCallback((postId: string) => {
    setCommunityNewsPosts((prev) => prev.filter((p) => String(p.id) !== postId));
    setPollQuestionPosts((prev) => prev.filter((p) => String(p.id) !== postId));
    setFeedCommentPostId((open) => (open === postId ? null : open));
    setFeedCommentDraft("");
    setFeedCommentTitle("");
  }, []);

  const confirmDeleteFeedPost = useCallback(
    (postId: string) => {
      appAlert("Delete this post?", "This can’t be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost(postId);
              removeFeedPostFromLists(postId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              const msg = e instanceof ApiError ? e.message : "Could not delete the post.";
              showToast(msg, "error");
            }
          },
        },
      ]);
    },
    [removeFeedPostFromLists],
  );

  const sendFeedComment = async () => {
    if (!feedCommentPostId || !feedCommentDraft.trim()) return;
    if (!requireAuth(undefined, "Sign in to join the conversation.")) return;
    setFeedCommentSending(true);
    try {
      const created = await addComment(feedCommentPostId, feedCommentDraft.trim());
      setFeedComments((prev) => [...prev, created]);
      setFeedCommentDraft("");
      bumpFeedPostCommentCount(feedCommentPostId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not post your comment.";
      showToast(msg, "error");
    } finally {
      setFeedCommentSending(false);
    }
  };

  useEffect(() => {
    if (!feedCommentPostId) {
      setFeedComments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setFeedCommentsLoading(true);
      try {
        const list = await getComments(feedCommentPostId);
        if (!cancelled) setFeedComments(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setFeedComments([]);
      } finally {
        if (!cancelled) setFeedCommentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedCommentPostId]);

  const deepLinkPostRef = useRef<string | null>(null);
  const deepLinkEventRef = useRef<string | null>(null);
  const deepLinkStoryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!feedCommentPostId) deepLinkPostRef.current = null;
  }, [feedCommentPostId]);

  useEffect(() => {
    const raw = params.openPost;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || deepLinkPostRef.current === id) return;
    deepLinkPostRef.current = id;
    setFeedTab("News");
    setNewsSubTab("community");
    setFeedCommentPostId(id);
    setFeedCommentTitle("Post");
  }, [params.openPost]);

  useEffect(() => {
    const raw = params.exploreTab;
    const tabRaw = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!tabRaw) return;
    const allowed: FeedTab[] = ["News", "Events", "Stories", "Quests", "Polls"];
    const match = allowed.find((a) => a.toLowerCase() === tabRaw.toLowerCase());
    if (match) {
      setFeedTab(match);
      router.setParams({ exploreTab: "" });
    }
  }, [params.exploreTab]);

  useEffect(() => {
    const raw = params.openEvent;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || deepLinkEventRef.current === id) return;
    deepLinkEventRef.current = id;
    let cancelled = false;
    (async () => {
      try {
        const e = await getEvent(id);
        if (cancelled || !e) return;
        setFeedTab("Events");
        setSelectedEvent(apiEventToExploreRow(e as ApiEvent));
      } catch {
        /* ignore invalid id */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.openEvent]);

  useEffect(() => {
    const raw = params.openStory;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || deepLinkStoryRef.current === id) return;
    deepLinkStoryRef.current = id;
    let cancelled = false;
    (async () => {
      try {
        await getStory(id);
        if (cancelled) return;
        const rawList = await getActiveStories(city);
        if (cancelled) return;
        const list = Array.isArray(rawList) ? rawList : [];
        const listNorm = list.map(normalizeApiStoryForFeed);
        setStoriesFromApi(listNorm);
        setApiStoriesList(listNorm.map(mapApiStoryToCommunityStory));
        const groups = buildStoryAuthorGroups(listNorm, user?.id);
        let ai = 0;
        let si = 0;
        for (let i = 0; i < groups.length; i++) {
          const j = groups[i].stories.findIndex((st) => st.id === id);
          if (j >= 0) {
            ai = i;
            si = j;
            break;
          }
        }
        queueMicrotask(() => {
          router.push({
            pathname: "/story-viewer",
            params: { authorIndex: String(ai), storyIndex: String(si) },
          } as any);
        });
      } catch {
        if (!cancelled) showToast("This story has expired or was removed.", "info");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.openStory, user?.id]);

  const feedCommentOpenPostIsOwner = useMemo(() => {
    if (!feedCommentPostId) return false;
    if (feedCommentPostDetail?.isOwner) return true;
    const id = feedCommentPostId;
    const m = communityNewsPosts.find((x) => String(x.id) === id);
    if (m) return !!m.isOwner;
    const pq = pollQuestionPosts.find((x) => String(x.id) === id);
    return !!pq?.isOwner;
  }, [feedCommentPostId, feedCommentPostDetail, communityNewsPosts, pollQuestionPosts]);

  useEffect(() => {
    if (!feedCommentPostId) {
      setFeedCommentPostDetail(null);
      setFeedCommentPostLoading(false);
      return;
    }
    let cancelled = false;
    setFeedCommentPostLoading(true);
    void getPost(feedCommentPostId)
      .then((p) => {
        if (!cancelled) {
          const latest = getLatestPostUpdate(p.id); // SPRINT-42: prefer the in-memory PATCH when a slower GET races after edit.
          const merged = latest ? { ...p, ...latest } : p; // SPRINT-42: overlay edited fields without dropping GET-only data.
          setFeedCommentPostDetail(merged); // SPRINT-42: show the freshest known post body.
          if (merged?.title?.trim()) setFeedCommentTitle(merged.title.trim()); // SPRINT-42: keep the modal title in sync.
        }
      })
      .catch(() => {
        if (!cancelled) setFeedCommentPostDetail(null);
      })
      .finally(() => {
        if (!cancelled) setFeedCommentPostLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feedCommentPostId]);

  const CITY_TZ: Record<string, string> = {
    "New York": "America/New_York", "New York City": "America/New_York",
    "Los Angeles": "America/Los_Angeles", "Chicago": "America/Chicago",
    "Houston": "America/Chicago", "Phoenix": "America/Phoenix",
    "Philadelphia": "America/New_York", "San Antonio": "America/Chicago",
    "San Diego": "America/Los_Angeles", "Dallas": "America/Chicago",
    "San Jose": "America/Los_Angeles", "Austin": "America/Chicago",
    "Miami": "America/New_York", "Atlanta": "America/New_York",
    "Seattle": "America/Los_Angeles", "Denver": "America/Denver",
    "Boston": "America/New_York", "Nashville": "America/Chicago",
    "London": "Europe/London", "Manchester": "Europe/London",
    "Birmingham": "Europe/London", "Leeds": "Europe/London",
    "Glasgow": "Europe/London", "Bristol": "Europe/London",
    "Toronto": "America/Toronto", "Vancouver": "America/Vancouver",
    "Montreal": "America/Toronto", "Calgary": "America/Edmonton",
    "Dubai": "Asia/Dubai", "Abu Dhabi": "Asia/Dubai",
    "Sydney": "Australia/Sydney", "Melbourne": "Australia/Melbourne",
    "Brisbane": "Australia/Brisbane", "Perth": "Australia/Perth",
    "Paris": "Europe/Paris", "Berlin": "Europe/Berlin",
    "Amsterdam": "Europe/Amsterdam", "Madrid": "Europe/Madrid",
    "Rome": "Europe/Rome", "Lagos": "Africa/Lagos",
    "Nairobi": "Africa/Nairobi", "Accra": "Africa/Accra",
    "Mumbai": "Asia/Kolkata", "Delhi": "Asia/Kolkata",
    "Bangalore": "Asia/Kolkata", "Singapore": "Asia/Singapore",
    "Kuala Lumpur": "Asia/Kuala_Lumpur", "Jakarta": "Asia/Jakarta",
    "Tokyo": "Asia/Tokyo", "Seoul": "Asia/Seoul",
    "Hong Kong": "Asia/Hong_Kong", "Shanghai": "Asia/Shanghai",
    "Beijing": "Asia/Shanghai",
  };
  const cityTz = CITY_TZ[city] ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cityHour = parseInt(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: cityTz }).format(new Date()), 10);
  const greeting = cityHour < 12 ? "Good morning" : cityHour < 18 ? "Good afternoon" : "Good evening";
  const cityDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: cityTz }).format(new Date()).replace(/,/g, "");
  const cityClock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: cityTz }).format(new Date());
  const dateLine = `${cityDay} · ${cityClock}`.toUpperCase();

  const currentPoll = wyrPolls[wyrIndex];
  const currentWYR = currentPoll ? pollToWyrCardModel(currentPoll, wyrIndex, wyrPolls.length) : null;
  const wyrVoted = myVoteToSide(currentPoll);

  const handleWyrVote = async (v: "A" | "B") => {
    if (!requireAuth(undefined, "Sign in to vote and see what your neighbors think.")) return;
    const poll = wyrPolls[wyrIndex];
    if (!poll) return;
    const opt = v === "A" ? poll.options[0] : poll.options[1];
    if (!opt) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await votePoll(poll.id, opt.id);
      setWyrPolls((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not submit your vote.";
      showToast(msg, "error");
    }
  };

  const renderWYR = () => {
    if (wyrPollsLoading && wyrPolls.length === 0) {
      return (
        <View style={{ paddingVertical: rs(28), alignItems: "center" }}>
          <ActivityIndicator color={Colors.brand.blue} />
        </View>
      );
    }
    if (!wyrPollsLoading && wyrPolls.length === 0) {
      return (
        <View style={{ paddingHorizontal: rs(18), paddingVertical: rs(16) }}>
          <Text style={{ color: tc.textSecondary, textAlign: "center", lineHeight: rs(20) }}>
            No community polls for {city} yet. Pull to refresh.
          </Text>
        </View>
      );
    }
    if (!currentWYR || !currentPoll) return null;
    return (
      <WYRCard
        wyr={currentWYR}
        index={wyrIndex}
        total={wyrPolls.length}
        voted={wyrVoted}
        onVote={handleWyrVote}
        onPrev={() => setWyrIndex((i) => Math.max(0, i - 1))}
        onNext={() => setWyrIndex((i) => Math.min(wyrPolls.length - 1, i + 1))}
      />
    );
  };

  // ── Virtualized main list ──
  // The tab bar / hero / per-tab headers are the FlatList header; the rows are whichever list the
  // active tab shows (events, stories, quests, community posts, live news, poll questions).
  const visibleCommunityPosts = communityNewsPosts.filter((p) => {
    // Never hide current user's own posts in their feed.
    if (p?.isOwner) return true;
    const blockKey = String(p?.author?.id ?? p?.author?.name ?? "");
    return blockKey.length === 0 || !isBlocked(blockKey);
  });

  let feedRows: FeedRow[] = [];
  if (hasChosenCity) {
    if (feedTab === "Events") feedRows = exploreEvents.map((event) => ({ kind: "event", event }));
    else if (feedTab === "Stories") feedRows = filteredApiStories.map((story) => ({ kind: "story", story }));
    else if (feedTab === "Quests") feedRows = questsList.map((quest) => ({ kind: "quest", quest }));
    else if (feedTab === "Polls") feedRows = pollQuestionPosts.map((post) => ({ kind: "poll", post }));
    else if (newsSubTab === "community") feedRows = visibleCommunityPosts.map((post) => ({ kind: "post", post }));
    else feedRows = filteredNews.map((article, index) => ({ kind: "news", article, index }));
  }

  // Stable handlers for the memoized rows (StoryCard / QuestCard / LiveNewsCard).
  const onOpenStoryRow = useStableCallback(openStoryViewerAt);
  const onDeleteStoryRow = useStableCallback(onDeleteStoryFromFeed);
  const onToggleStorySaveRow = useStableCallback(onToggleStorySaveFromFeed);
  const onToggleStoryLikeRow = useStableCallback(onToggleStoryLikeFromFeed);
  const onJoinQuest = useStableCallback(async (quest: ApiChallenge) => {
    if (joinedQuestIds.has(quest.id)) return;
    if (!requireAuth(undefined, "Sign in to join this challenge.")) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await joinChallenge(quest.id);
      setJoinedQuestIds((p) => new Set([...p, quest.id]));
      setQuestsList((prev) => prev.map((q) => q.id === quest.id ? { ...q, isJoined: true, participantsCount: (q.participantsCount ?? 0) + 1 } : q));
    } catch {
      showToast("Could not join quest. Please try again.", "error");
    }
  });
  const onOpenArticleRow = useStableCallback((article: NewsArticle) => {
    setReadArticles((p) => { const n = new Set(p); n.add(article.id); return n; });
    setSelectedArticle(article);
  });
  const onToggleExpandArticleRow = useStableCallback(toggleExpandArticle);
  const onLikeArticleRow = useStableCallback(handleNewsLike);
  const onCommentsArticleRow = useStableCallback(openNewsComments);
  const onShareArticleRow = useStableCallback(shareArticle);
  const onToggleSaveArticleRow = useStableCallback(toggleNewsSave);

  const renderFeedRowInner = ({ item, index }: { item: FeedRow; index: number }) => {
    switch (item.kind) {
      case "event": {
        const e = item.event;
        return (
          <View style={feedSectionRowPad}>
            <EventRowCard
              event={e}
              isSaved={e.isSaved}
              onToggleSave={() => { void toggleEventSave(e); }}
              isRegistered={e.registeredByMe}
              onToggleGoing={() => { void toggleEventGoing(e); }}
              canAccessEventChat={e.canAccessChat}
              conversationId={e.conversationId}
              onPress={() => setSelectedEvent(e)}
              rsvp={() => {
                if (!requireAuth(undefined, "Sign in to register for this event.")) return;
                setRegEvent(e);
                setRegModalOpen(true);
              }}
            />
          </View>
        );
      }
      case "story": {
        const apiSt = item.story;
        const { ai, si } = findStoryIndices(apiSt.id);
        return (
          <View style={feedSectionRowPad}>
            <StoryCard
              story={apiSt}
              authorIndex={ai}
              storyIndex={si}
              isOwnStory={!!user?.id && apiSt.author?.id === user.id}
              onOpen={onOpenStoryRow}
              onDelete={onDeleteStoryRow}
              onToggleSave={onToggleStorySaveRow}
              onToggleLike={onToggleStoryLikeRow}
            />
          </View>
        );
      }
      case "quest":
        return (
          <View style={[feedSectionRowPad, index > 0 && { marginTop: rs(14) }]}>
            <QuestCard quest={item.quest} isJoined={joinedQuestIds.has(item.quest.id)} city={city} onJoin={onJoinQuest} />
          </View>
        );
      case "post": {
        const p = item.post;
        const cardPost = toUiFeedPostCard(p);
        return (
          <View style={feedNewsRowPad}>
            <PostCard
              post={cardPost}
              isLiked={!!p?.isLiked}
              isSaved={!!p?.isSaved}
              onLike={() => {
                void toggleCommunityLike(cardPost.id);
              }}
              onSave={() => {
                void toggleCommunitySave(cardPost.id);
              }}
              onComment={() => {
                setFeedCommentTitle(cardPost.title);
                setFeedCommentPostId(cardPost.id);
              }}
              onShare={() => void shareFeedPostCard(cardPost)}
              onBlock={() => handleBlock(cardPost.author, cardPost.avatar, (cardPost as any).authorId)}
              onDelete={cardPost.isOwner ? () => confirmDeleteFeedPost(cardPost.id) : undefined}
              onEdit={cardPost.isOwner ? () => router.push({ pathname: "/create-post", params: { type: "news", mode: "edit", id: cardPost.id } } as any) : undefined} // SPRINT-42: route only backend-authorized owners to shared post edit mode.
            />
          </View>
        );
      }
      case "news": {
        const article = item.article;
        return (
          <View style={feedNewsRowPad}>
            <LiveNewsCard
              article={article}
              isFeatured={item.index === 0 && newsCategory === "all"}
              isExpanded={expandedArticles.has(article.id)}
              isLiked={newsLiked.has(article.id)}
              isSaved={newsSaved.has(article.id)}
              isRead={readArticles.has(article.id)}
              likeCount={newsLikeCounts[article.id] ?? 0}
              commentCount={newsCommentCounts[article.id] ?? 0}
              onOpen={onOpenArticleRow}
              onToggleExpand={onToggleExpandArticleRow}
              onLike={onLikeArticleRow}
              onComments={onCommentsArticleRow}
              onShare={onShareArticleRow}
              onToggleSave={onToggleSaveArticleRow}
            />
          </View>
        );
      }
      case "poll": {
        const p = item.post;
        return (
          <View style={feedSectionRowPad}>
            <View
              style={[s.debateCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight, marginBottom: rs(12) }]}
            >
              <Text style={[s.debateQ, { color: tc.textPrimary }]}>{p.title}</Text>
              <Text style={{ color: tc.textSecondary, fontSize: rs(13), lineHeight: rs(18) }} numberOfLines={4}>
                {p.content}
              </Text>
              <Text style={{ color: tc.textTertiary, fontSize: rs(12), marginTop: rs(8) }}>
                {p.likesCount ?? 0} likes · {p.commentsCount ?? 0} comments
              </Text>
            </View>
          </View>
        );
      }
    }
  };

  // Design D (plan 01): rows rise in on first load, 45 ms apart (capped).
  const renderFeedRow = (p: { item: FeedRow; index: number }) => (
    <Reanimated.View entering={revealIn(Math.min(p.index, 6))}>{renderFeedRowInner(p)}</Reanimated.View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top"]}>
      <AppHeader title="Explore" scrollY={exploreScrollY} />
      {!user ? <GuestCityBanner /> : null}
      {!user ? (
        <GuestCityPickerModal
          visible={guestCityPickerVisible}
          onClose={() => setGuestCityPickerVisible(false)}
        />
      ) : null}

      <Reanimated.FlatList
        ref={feedScrollRef as any}
        onScroll={onExploreScroll}
        scrollEventThrottle={16}
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarClearance(exploreInsets.bottom) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.blue} />}
        data={feedRows}
        keyExtractor={feedRowKey}
        renderItem={renderFeedRow}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        ListHeaderComponent={
          <>
            {/* ── Design D (plan 01): large title, the bento, one row of tabs ── */}
            <Text style={[TYPE.pageTitle, { color: tc.textPrimary, paddingHorizontal: 18, paddingTop: 2, paddingBottom: 12 }]}>Explore</Text>
            {hasChosenCity ? (
              <ExploreBento
                city={city}
                dateLine={dateLine}
                greeting={greeting}
                firstName={user?.name?.split(" ")[0] ?? "neighbour"}
                onCity={() => {
                  if (!user) setGuestCityPickerVisible(true);
                  else router.push("/edit-profile" as any);
                }}
                nextEvent={exploreEvents[0]}
                onEvent={(e) => setSelectedEvent(e)}
                homesCount={heroListingsTotal}
                onHomes={() => router.push("/(tabs)/housing" as any)}
                stories={storyAuthorGroups}
                onAddStory={() => {
                  if (!requireAuth(undefined, "Sign in to share your story with the neighborhood.")) return;
                  router.push({ pathname: "/create-post", params: { type: "story" } } as any);
                }}
                onStory={(ai) => openStoryViewerAt(ai, 0)}
                quest={questsList[0]}
                onQuest={() => setFeedTab("Quests")}
                poll={wyrPolls[0]}
                onPoll={() => setFeedTab("Polls")}
                onQuestion={() => router.push("/(tabs)/community" as any)}
              />
            ) : null}
            <Segmented
              style={{ marginHorizontal: 16, marginBottom: 12 }}
              items={FEED_TABS.map((t) => ({ key: t, label: t }))}
              value={feedTab}
              onChange={(k) => setFeedTab(k as typeof feedTab)}
            />

            {!hasChosenCity ? (
              <ListState
                kind="needs-city"
                message="Pick your city to see local news, events, stories, quests and polls."
                onAction={() => {
                  if (!user) setGuestCityPickerVisible(true);
                  else router.push("/edit-profile" as any);
                }}
              />
            ) : null}

            {/* ── EVENTS ── */}
            {hasChosenCity && feedTab === "Events" && (
              <>
                {/* ── Events header with create shortcut ── */}
                <View style={[nw.sectionBlock, { marginBottom: rs(4) }]}>
                  <View style={nw.sectionHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[nw.sectionTitle, { color: tc.textPrimary }]}>Upcoming Events</Text>
                      <Text style={[nw.sectionSubtitle, { color: tc.textSecondary }]}>Events happening in {city}</Text>
                    </View>
                    <Pressable
                      style={nw.sectionCreateBtn}
                      onPress={() => {
                        if (!requireAuth(undefined, "Sign in to host your own event.")) return;
                        router.push({ pathname: "/create-post", params: { type: "event" } } as any);
                      }}
                    >
                      <Ionicons name="add" size={16} color="#FFF" />
                      <Text style={nw.sectionCreateBtnText}>Create</Text>
                    </Pressable>
                  </View>
                </View>

                {exploreEventsLoading && exploreEvents.length === 0 && (
                  <View style={{ paddingVertical: rs(32), alignItems: "center" }}>
                    <ActivityIndicator size="large" color={Colors.brand.blue} />
                    <Text style={{ marginTop: rs(8), color: tc.textTertiary }}>Loading events…</Text>
                  </View>
                )}
                {!exploreEventsLoading && exploreEvents.length === 0 && (
                  <View style={{ paddingHorizontal: rs(20), paddingVertical: rs(28) }}>
                    <Text style={[s.secTitle, { color: tc.textPrimary }]}>No upcoming events</Text>
                    <Text style={{ color: tc.textSecondary, marginTop: rs(6) }}>
                      There are no events listed for {city} yet. Pull to refresh or check back soon.
                    </Text>
                  </View>
                )}
                {exploreEvents.length > 0 && (
                  <>
                    <FeaturedEventCard
                      event={exploreEvents[0]}
                      isSaved={exploreEvents[0].isSaved}
                      onToggleSave={() => { void toggleEventSave(exploreEvents[0]); }}
                      isRegistered={exploreEvents[0].registeredByMe}
                      onToggleGoing={() => { void toggleEventGoing(exploreEvents[0]); }}
                      canAccessEventChat={exploreEvents[0].canAccessChat}
                      conversationId={exploreEvents[0].conversationId}
                      onPress={() => setSelectedEvent(exploreEvents[0])}
                      rsvp={() => {
                        if (!requireAuth(undefined, "Sign in to register for this event.")) return;
                        setRegEvent(exploreEvents[0]);
                        setRegModalOpen(true);
                      }}
                    />
                    <View style={[s.section, { marginTop: rs(16) }]}>
                      <Text style={[s.secTitle, { color: tc.textPrimary }]}>🗓 All Events</Text>
                    </View>
                  </>
                )}
              </>
            )}

            {/* ── STORIES (Sprint 14) ── */}
            {hasChosenCity && feedTab === "Stories" && (
              <>
                <Text style={[st.storySectionTitle, { color: tc.textPrimary }]}>Stories</Text>

                {/* ── Add Story card (full-width, non-Instagram style) ── */}
                <Pressable
                  onPress={() => {
                    if (myStoriesFromApi.length > 0) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      const gi = storyAuthorGroups.findIndex((g) => g.author.id === user?.id);
                      openStoryViewerAt(gi >= 0 ? gi : 0, 0);
                      return;
                    }
                    if (!requireAuth(undefined, "Sign in to share your story with the neighborhood.")) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({ pathname: "/create-post", params: { type: "story" } } as any);
                  }}
                  style={({ pressed }) => [{ marginHorizontal: rs(14), marginBottom: rs(14), borderRadius: rs(20), overflow: "hidden", opacity: pressed ? 0.92 : 1 }]}
                >
                  <LinearGradient
                    colors={[Colors.brand.blue, Colors.brand.green]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: rs(20), borderRadius: rs(20) }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(14) }}>
                      <View style={{ width: rs(52), height: rs(52), borderRadius: rs(16), backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}>
                        {myStoriesFromApi.length > 0 && user?.avatarUrl ? (
                          <FadeImage uri={resolveApiAssetUrl(user.avatarUrl)} style={{ width: rs(52), height: rs(52), borderRadius: rs(16) }} /> // SPRINT-42: render story-owner avatar with FadeImage.
                        ) : (
                          <Ionicons name={myStoriesFromApi.length > 0 ? "book-outline" : "add-circle-outline"} size={26} color="#FFF" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: rs(16), fontWeight: "900", color: "#FFF", letterSpacing: -0.2 }}>
                          {myStoriesFromApi.length > 0 ? "View Your Story" : "Share Your Story"}
                        </Text>
                        <Text style={{ fontSize: rs(12), color: "rgba(255,255,255,0.82)", marginTop: rs(3), fontWeight: "500" }}>
                          {myStoriesFromApi.length > 0
                            ? `${myStoriesFromApi.length} story posted · tap to view`
                            : "Post a photo, update or local moment with your community"}
                        </Text>
                      </View>
                      <View style={{ width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                      </View>
                    </View>
                    {/* Active story count chips */}
                    {storiesFromApi.length > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: rs(8), marginTop: rs(14) }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: "rgba(255,255,255,0.15)", borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5) }}>
                          <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.9)" />
                          <Text style={{ fontSize: rs(11), fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>{storiesFromApi.length} active stories</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: "rgba(255,255,255,0.15)", borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5) }}>
                          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.9)" />
                          <Text style={{ fontSize: rs(11), fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>{city}</Text>
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>

                {storiesLoading && storiesFromApi.length === 0 && myStoriesFromApi.length === 0 ? (
                  <View style={{ paddingHorizontal: rs(16), gap: rs(12) }}>
                    {Array.from({ length: 2 }).map((_, idx) => (
                      <Animated.View
                        key={`story-skeleton-${idx}`}
                        style={[
                          nw.newsSkeletonCard,
                          { backgroundColor: tc.cardBg, borderColor: tc.borderLight, opacity: newsSkeletonOpacity },
                        ]}
                      />
                    ))}
                  </View>
                ) : null}

                <View style={st.headerBlock}>
                  <View style={st.headerLeft}>
                    <Text style={[st.headerSubtitle, { color: tc.textTertiary }]}>
                      {storiesLoading
                        ? " "
                        : storiesFromApi.length > 0
                          ? `${storiesFromApi.length} stories in ${city}`
                          : city
                            ? `Stories from ${city}`
                            : "Local stories"}
                    </Text>
                  </View>
                </View>

                {/* ── Category Filter ── */}
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catRow}>
                  {STORY_CATEGORIES.map((cat) => {
                    const active = storyFilter === cat;
                    const meta = cat !== "All" ? STORY_CATEGORY_META[cat] : null;
                    return (
                      <Pressable
                        key={cat}
                        style={[st.catChip, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, active && st.catChipActive, active && meta && { backgroundColor: isDark ? meta.darkBg : meta.bg, borderColor: meta.color }]}
                        onPress={() => { Haptics.selectionAsync(); setStoryFilter(cat); }}
                      >
                        {meta && <Ionicons name={meta.icon as any} size={rs(13)} color={active ? meta.color : (tc.textSecondary as string)} />}
                        <Text style={[st.catChipText, { color: tc.textSecondary }, active && st.catChipTextActive, active && meta && { color: meta.color }]}>
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </GHScrollView>

                {/* ── Sort Row ── */}
                <View style={st.sortRow}>
                  {(["trending", "latest", "popular"] as const).map((sortOpt) => {
                    const active = storySortBy === sortOpt;
                    const iconMap = { trending: "trending-up", latest: "time-outline", popular: "flame-outline" } as const;
                    return (
                      <Pressable
                        key={sortOpt}
                        style={[st.sortPill, { backgroundColor: tc.inputBg }, active && st.sortPillActive]}
                        onPress={() => { Haptics.selectionAsync(); setStorySortBy(sortOpt); }}
                      >
                        <Ionicons name={iconMap[sortOpt]} size={14} color={active ? "#FFF" : tc.textTertiary} />
                        <Text style={[st.sortPillText, { color: tc.textTertiary }, active && st.sortPillTextActive]}>
                          {sortOpt.charAt(0).toUpperCase() + sortOpt.slice(1)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {/* Story list (API-backed) — rows below; st.feedSection's top margin */}
                <View style={{ height: rs(10) }} />
              </>
            )}

            {/* ── QUESTS ── */}
            {hasChosenCity && feedTab === "Quests" && (
              <>
                {/* Section header */}
                <LinearGradient
                  colors={[Colors.brand.orange, "#CC5500"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ marginHorizontal: rs(14), marginBottom: rs(16), borderRadius: rs(20), padding: rs(20), overflow: "hidden" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: rs(14) }}>
                    <View style={{ width: rs(52), height: rs(52), borderRadius: rs(16), backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}>
                      <Ionicons name="trophy-outline" size={26} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: rs(17), fontWeight: "900", color: "#FFF", letterSpacing: -0.2 }}>Community Quests</Text>
                      <Text style={{ fontSize: rs(12), color: "rgba(255,255,255,0.85)", marginTop: rs(3), fontWeight: "500" }}>Complete challenges, earn rewards, connect with neighbors</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (!requireAuth(undefined, "Sign in to start a community challenge.")) return;
                        router.push({ pathname: "/create-post", params: { type: "challenge" } } as any);
                      }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(8) })}
                    >
                      <Text style={{ fontSize: rs(12), fontWeight: "800", color: "#FFF" }}>+ New</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row", gap: rs(8), marginTop: rs(14) }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: "rgba(255,255,255,0.15)", borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5) }}>
                      <Ionicons name="flame-outline" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={{ fontSize: rs(11), fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>{questsList.length} active quests</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: "rgba(255,255,255,0.15)", borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5) }}>
                      <Ionicons name="gift-outline" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={{ fontSize: rs(11), fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>Earn rewards</Text>
                    </View>
                  </View>
                </LinearGradient>

                {questsLoading && questsList.length === 0 ? (
                  <View style={{ paddingVertical: rs(32), alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#FF7B00" />
                    <Text style={{ marginTop: rs(10), color: tc.textTertiary }}>Loading quests…</Text>
                  </View>
                ) : null}
              </>
            )}

            {/* ── NEWS ── */}
            {hasChosenCity && feedTab === "News" && (
              <>
                {/* ── Design D: one row of chips (categories, then neighbours' posts) ── */}
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
                  {NEWS_CATEGORIES.map((cat) => (
                    <Chip
                      key={cat.id}
                      label={cat.id === "all" ? "For you" : cat.label}
                      on={newsSubTab === "live" && newsCategory === cat.id}
                      onPress={() => { setNewsSubTab("live"); setNewsCategory(cat.id as NewsCategory); }}
                    />
                  ))}
                  <Chip label="Neighbours" on={newsSubTab === "community"} onPress={() => setNewsSubTab("community")} />
                  {newsLoading && newsSubTab === "live" ? <ActivityIndicator size="small" color={tc.accent} style={{ marginLeft: 4 }} /> : null}
                </GHScrollView>
                {/* ═══ Community Tab ═══ */}
                {newsSubTab === "community" && (
                  <View style={nw.sectionBlock}>
                    <View style={nw.sectionHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[TYPE.section, { color: tc.textPrimary }]}>Neighbours say</Text>
                      </View>
                      <Pressable
                        style={nw.sectionCreateBtn}
                        onPress={() => {
                          if (!requireAuth(undefined, "Sign in to post news for your neighborhood.")) return;
                          router.push({ pathname: "/create-post", params: { type: "news" } } as any);
                        }}
                      >
                        <Ionicons name="add" size={16} color="#FFF" />
                        <Text style={nw.sectionCreateBtnText}>Post</Text>
                      </Pressable>
                    </View>

                    {communityNewsLoading && communityNewsPosts.length === 0 && (
                      <View style={{ paddingVertical: rs(28), alignItems: "center" }}>
                        <ActivityIndicator size="large" color={Colors.brand.blue} />
                        <Text style={{ marginTop: rs(8), color: tc.textTertiary }}>Loading posts...</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ═══ Live News Tab ═══ */}
                {newsSubTab === "live" && (
                  <View style={nw.sectionBlock}>
                    {primaryLoaded && (
                      <View style={nw.phaseTwoLoaderWrap}>
                        <View style={nw.phaseTwoLoaderTrack}>
                          <View style={nw.phaseTwoLoaderBar} />
                        </View>
                        <Text style={[nw.phaseTwoLoaderText, { color: tc.textTertiary }]}>Loading more stories...</Text>
                      </View>
                    )}

                    {/* Loading State */}
                    {newsLoading && newsArticles.length === 0 && (
                      <View style={nw.loadingWrap}>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Animated.View
                            key={`news-skeleton-${idx}`}
                            style={[
                              nw.newsSkeletonCard,
                              { backgroundColor: tc.cardBg, borderColor: tc.borderLight, opacity: newsSkeletonOpacity },
                            ]}
                          />
                        ))}
                      </View>
                    )}

                    {/* Error State */}
                    {newsError && newsArticles.length === 0 && (
                      <View style={nw.errorWrap}>
                        <Text style={{ fontSize: rs(40), marginBottom: rs(12) }}>📡</Text>
                        <Text style={[nw.errorTitle, { color: tc.textPrimary }]}>Couldn't load news</Text>
                        <Text style={[nw.errorSub, { color: tc.textTertiary }]}>Pull down to try again</Text>
                        <Pressable style={nw.retryBtn} onPress={() => loadNews(true)}>
                          <Ionicons name="refresh" size={16} color="#FFF" />
                          <Text style={nw.retryText}>Retry</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            {/* ── POLLS ── */}
            {hasChosenCity && feedTab === "Polls" && (
              <>
                {renderWYR()}

                <View style={[s.section, { marginTop: rs(20) }]}>
                  <Text style={[s.secTitle, { color: tc.textPrimary }]}>💬 Questions from the feed</Text>
                  <Text style={{ color: tc.textSecondary, marginBottom: rs(12), paddingHorizontal: rs(2) }}>
                    Real prompts from neighbors (Community Q&A lives in the Community tab).
                  </Text>
                  {pollPostsLoading && pollQuestionPosts.length === 0 && (
                    <View style={{ paddingVertical: rs(20), alignItems: "center" }}>
                      <ActivityIndicator color={Colors.brand.blue} />
                    </View>
                  )}
                  {!pollPostsLoading && pollQuestionPosts.length === 0 && (
                    <Text style={{ color: tc.textTertiary, paddingVertical: rs(8) }}>No question posts in your area yet.</Text>
                  )}
                </View>
              </>
            )}
          </>
        }
        ListFooterComponent={
          <>
            {hasChosenCity && feedTab === "Stories" && (
              <View style={[st.feedSection, { marginTop: 0 }]}>
                {!storiesLoading && storiesError && storiesFromApi.length === 0 && myStoriesFromApi.length === 0 ? (
                  <View style={nw.errorWrap}>
                    <Text style={{ fontSize: rs(40), marginBottom: rs(12) }}>📡</Text>
                    <Text style={[nw.errorTitle, { color: tc.textPrimary }]}>Couldn't load stories</Text>
                    <Text style={[nw.errorSub, { color: tc.textTertiary }]}>Check your connection and try again</Text>
                    <Pressable style={nw.retryBtn} onPress={() => void loadStories()}>
                      <Ionicons name="refresh" size={16} color="#FFF" />
                      <Text style={nw.retryText}>Retry</Text>
                    </Pressable>
                  </View>
                ) : null}

                {!storiesLoading && !storiesError && storiesFromApi.length === 0 && myStoriesFromApi.length === 0 ? (
                  <View style={st.emptyState}>
                    <View style={st.emptyIconWrap}>
                      <Ionicons name="videocam-outline" size={44} color={Colors.brand.blue} />
                    </View>
                    <Text style={[st.emptyTitle, { color: tc.textPrimary }]}>No stories in your area yet</Text>
                    <Text style={[st.emptySubtitle, { color: tc.textTertiary }]}>
                      Be the first to share one — tap Add Story above!
                    </Text>
                  </View>
                ) : null}

                {!storiesLoading && filteredApiStories.length === 0 && storiesFromApi.length > 0 ? (
                  <View style={st.emptyState}>
                    <Text style={[st.emptySubtitle, { color: tc.textTertiary }]}>No stories in this category.</Text>
                  </View>
                ) : null}
              </View>
            )}

            {hasChosenCity && feedTab === "Quests" && (
              <View style={{ paddingHorizontal: rs(14) }}>
                {!questsLoading && questsList.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: rs(48) }}>
                    <View style={{ width: rs(72), height: rs(72), borderRadius: rs(22), backgroundColor: isDark ? "#261000" : "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: rs(14) }}>
                      <Ionicons name="trophy-outline" size={34} color="#FF7B00" />
                    </View>
                    <Text style={{ fontSize: rs(17), fontWeight: "800", color: isDark ? "#F1F5F9" : "#0A1628", marginBottom: rs(6) }}>No Active Quests Yet</Text>
                    <Text style={{ fontSize: rs(13), color: tc.textTertiary, textAlign: "center", fontWeight: "500", paddingHorizontal: rs(32) }}>
                      Be the first to create a community quest and challenge your neighbors!
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (!requireAuth(undefined, "Sign in to create the first community quest.")) return;
                        router.push({ pathname: "/create-post", params: { type: "challenge" } } as any);
                      }}
                      style={({ pressed }) => ({ marginTop: rs(16), borderRadius: rs(14), overflow: "hidden", opacity: pressed ? 0.85 : 1 })}
                    >
                      <LinearGradient colors={["#FF7B00", "#E55A00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: rs(24), paddingVertical: rs(12), flexDirection: "row", alignItems: "center", gap: rs(6) }}>
                        <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                        <Text style={{ fontSize: rs(14), fontWeight: "800", color: "#FFF" }}>Create a Quest</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}

            {hasChosenCity && feedTab === "News" && newsSubTab === "community" && !communityNewsLoading && visibleCommunityPosts.length === 0 && (
              <View style={feedNewsRowPad}>
                <View style={{ paddingVertical: rs(28), paddingHorizontal: rs(16), alignItems: "center" }}>
                  <Text style={{ fontSize: rs(40), marginBottom: rs(8) }}>📰</Text>
                  <Text style={[nw.sectionTitle, { color: tc.textPrimary, textAlign: "center" }]}>No posts yet</Text>
                  <Text style={{ color: tc.textTertiary, textAlign: "center", marginTop: rs(6), maxWidth: 280 }}>
                    Be the first to share news from your neighborhood — tap Post above.
                  </Text>
                </View>
              </View>
            )}

            {hasChosenCity && feedTab === "News" && newsSubTab === "live" && (
              <View style={feedNewsRowPad}>
                {filteredNews.length > 0 && (
                  <View style={nw.paginationFooter}>
                    <Text style={[nw.paginationText, { color: tc.textTertiary }]}>
                      Loaded {newsArticles.length} of {Math.max(newsTotal, newsArticles.length)} article{Math.max(newsTotal, newsArticles.length) === 1 ? "" : "s"}
                    </Text>
                    {(newsHasMore || newsArticles.length < newsTotal) && (
                      <Pressable
                        style={nw.loadMoreBtn}
                        onPress={() => void loadMoreNews()}
                      >
                        {newsPaging ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Text style={nw.loadMoreBtnText}>Load More</Text>
                            <Ionicons name="chevron-down" size={14} color="#FFF" />
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Empty state after filtering */}
                {!newsLoading && filteredNews.length === 0 && newsArticles.length > 0 && (
                  <View style={nw.emptyFilter}>
                    <Text style={{ fontSize: rs(36) }}>🔍</Text>
                    <Text style={[nw.emptyFilterTitle, { color: tc.textPrimary }]}>No articles in this category</Text>
                    <Text style={[nw.emptyFilterSub, { color: tc.textTertiary }]}>Try selecting "All News" or another category</Text>
                  </View>
                )}

                {/* No articles fetched at all */}
                {!newsLoading && !newsError && newsArticles.length === 0 && (
                  <View style={nw.emptyFilter}>
                    <Text style={{ fontSize: rs(36) }}>📰</Text>
                    <Text style={[nw.emptyFilterTitle, { color: tc.textPrimary }]}>No news available right now</Text>
                    <Text style={[nw.emptyFilterSub, { color: tc.textTertiary }]}>Pull down to refresh or try changing your city</Text>
                    <Pressable style={nw.retryBtn} onPress={() => loadNews(true)}>
                      <Ionicons name="refresh" size={16} color="#FFF" />
                      <Text style={nw.retryText}>Refresh</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: rs(28) }} />
          </>
        }
      />

      {/* ── Article Detail Modal ── (same mount condition as when it lived inside the News section) */}
      {hasChosenCity && feedTab === "News" && (
        <Modal
          visible={!!selectedArticle}
          animationType="slide"
          onRequestClose={() => setSelectedArticle(null)}
          statusBarTranslucent
        >
          {selectedArticle && (
            <DismissibleSheet onDismiss={() => setSelectedArticle(null)} style={[nw.modalRoot, { backgroundColor: tc.pageBg }]}>
              {/* Sticky header */}
              <SheetDragArea>
              <View style={[nw.modalHeader, { backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }]}>
                <Pressable onPress={() => setSelectedArticle(null)} style={[nw.modalBackBtn, { backgroundColor: tc.inputBg }]}>
                  <Ionicons name="chevron-back" size={22} color={tc.textPrimary} />
                </Pressable>
                <Text style={[nw.modalHeaderTitle, { color: tc.textPrimary, flex: 1, textAlign: "center", marginHorizontal: rs(8) }]} numberOfLines={1}>Article</Text>
                <Pressable onPress={() => shareArticle(selectedArticle)} style={[nw.modalShareBtn, { backgroundColor: tc.inputBg }]}>
                  <Ionicons name="share-social-outline" size={20} color={tc.textPrimary} />
                </Pressable>
              </View>
              </SheetDragArea>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={nw.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Hero Image — placeholder + optional RSS overlay */}
                <NewsLeadImage
                  article={selectedArticle}
                  city={city}
                  userCountry={userCountry}
                  remoteUri={selectedArticle.image}
                  variant="modal"
                  style={nw.modalHeroImg}
                />

                <View style={[nw.modalBody, { backgroundColor: tc.pageBg }]}>
                  {/* Category */}
                  <View style={[nw.articleCatPill, { alignSelf: "flex-start", marginBottom: rs(8), backgroundColor: tc.pillBg, flexDirection: "row", alignItems: "center", gap: rs(4) }]}>
                    <Ionicons name={((NEWS_CATEGORIES.find((c) => c.id === selectedArticle.category)?.icon) ?? "newspaper-outline") as any} size={rs(10)} color={tc.textSecondary as string} />
                    <Text style={[nw.articleCatText, { color: tc.textSecondary }]}>
                      {NEWS_CATEGORIES.find((c) => c.id === selectedArticle.category)?.label || "News"}
                    </Text>
                  </View>

                  {/* Title */}
                  <Text style={[nw.modalTitle, { color: tc.textPrimary }]}>{selectedArticle.title}</Text>

                  {/* Source & Time */}
                  <View style={nw.modalMeta}>
                    <View style={nw.sourceDot} />
                    <Text style={[nw.modalSource, { color: tc.textSecondary }]}>{selectedArticle.source}</Text>
                    <Text style={[nw.modalTime, { color: tc.textTertiary }]}>• {newsTimeAgo(selectedArticle.publishedAt)}</Text>
                  </View>

                  {/* Full description / article content */}
                  <View style={[nw.modalDivider, { backgroundColor: tc.borderLight }]} />
                  {selectedArticle.description.length > 0 && !isSameContent(selectedArticle.title, selectedArticle.description) ? (
                    <Text style={[nw.modalContent, { color: tc.textSecondary }]}>{selectedArticle.description}</Text>
                  ) : (
                    <View style={[nw.modalContentNote, { backgroundColor: tc.secondaryBg }]}>
                      <Ionicons name="document-text-outline" size={16} color={tc.textTertiary} />
                      <Text style={[nw.modalContentNoteText, { color: tc.textTertiary }]}>
                        Tap below to read the full article from {selectedArticle.source}.
                      </Text>
                    </View>
                  )}

                  {/* If there's more to the article, show helpful message */}
                  {selectedArticle.description.length > 50 && !isSameContent(selectedArticle.title, selectedArticle.description) && (
                    <View style={[nw.modalContentNote, { backgroundColor: tc.secondaryBg }]}>
                      <Ionicons name="information-circle-outline" size={16} color={tc.textTertiary} />
                      <Text style={[nw.modalContentNoteText, { color: tc.textTertiary }]}>
                        This is the article summary. Tap below to read the complete article from the original source.
                      </Text>
                    </View>
                  )}

                  {/* Visit original source — only if url is valid */}
                  {selectedArticle.url && selectedArticle.url !== "#" && (
                    <Pressable
                      onPress={() => Linking.openURL(selectedArticle.url).catch(() => {})}
                      style={nw.modalSourceBtn}
                    >
                      <Ionicons name="globe-outline" size={16} color="#FFF" />
                      <Text style={nw.modalSourceBtnText}>Read Full Article on {selectedArticle.source}</Text>
                    </Pressable>
                  )}

                  {/* Interaction bar */}
                  <View style={[nw.modalActions, { borderTopColor: tc.borderLight, backgroundColor: tc.cardBg }]}>
                    <Pressable onPress={() => void handleNewsLike(selectedArticle.id)} style={nw.modalActionBtn}>
                      <Ionicons
                        name={newsLiked.has(selectedArticle.id) ? "heart" : "heart-outline"}
                        size={20}
                        color={newsLiked.has(selectedArticle.id) ? "#EF4444" : tc.textSecondary}
                      />
                      <Text style={[nw.modalActionLabel, { color: newsLiked.has(selectedArticle.id) ? "#EF4444" : tc.textSecondary }]}>
                        {(newsLikeCounts[selectedArticle.id] ?? 0) > 0 ? `Like · ${newsLikeCounts[selectedArticle.id]}` : "Like"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => void openNewsComments(selectedArticle.id)} style={nw.modalActionBtn}>
                      <Ionicons name="chatbubble-outline" size={20} color={tc.textSecondary} />
                      <Text style={[nw.modalActionLabel, { color: tc.textSecondary }]}>
                        {(newsCommentCounts[selectedArticle.id] ?? 0) > 0 ? `Comment · ${newsCommentCounts[selectedArticle.id]}` : "Comment"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => shareArticle(selectedArticle)} style={nw.modalActionBtn}>
                      <Ionicons name="share-social-outline" size={20} color={tc.textSecondary} />
                      <Text style={[nw.modalActionLabel, { color: tc.textSecondary }]}>Share</Text>
                    </Pressable>
                    <Pressable onPress={() => toggleNewsSave(selectedArticle.id)} style={nw.modalActionBtn}>
                      <Ionicons
                        name={newsSaved.has(selectedArticle.id) ? "bookmark" : "bookmark-outline"}
                        size={20}
                        color={newsSaved.has(selectedArticle.id) ? Colors.brand.blue : tc.textSecondary}
                      />
                      <Text style={[nw.modalActionLabel, { color: tc.textSecondary }]}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </DismissibleSheet>
          )}
        </Modal>
      )}

      <Modal
        visible={!!newsCommentsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setNewsCommentsOpen(null);
          setNewsComments([]);
          setNewsCommentDraft("");
          setNewsCommentsError(null);
        }}
      >
        <KeyboardAvoidingView style={nw.commentsOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[nw.commentsSheet, { backgroundColor: tc.cardBg }]}>
            <View style={[nw.commentsHeader, { borderBottomColor: tc.borderLight }]}>
              <Text style={[nw.commentsTitle, { color: tc.textPrimary }]} numberOfLines={2}>
                {newsArticles.find((a) => a.id === newsCommentsOpen)?.title ?? "Comments"}
              </Text>
              <Pressable
                onPress={() => {
                  setNewsCommentsOpen(null);
                  setNewsComments([]);
                  setNewsCommentDraft("");
                  setNewsCommentsError(null);
                }}
              >
                <Ionicons name="close" size={22} color={tc.textSecondary} />
              </Pressable>
            </View>

            {newsCommentsLoading && newsComments.length === 0 ? (
              <View style={nw.commentsLoadingWrap}>
                <ActivityIndicator color={Colors.brand.blue} />
              </View>
            ) : newsComments.length === 0 ? (
              <View style={nw.commentsLoadingWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={tc.textTertiary} />
                <Text style={{ color: tc.textTertiary }}>Be the first to comment</Text>
              </View>
            ) : (
              <FlatList
                data={newsComments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={nw.commentsList}
                onEndReachedThreshold={0.35}
                onEndReached={() => void loadMoreNewsComments()}
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
                        <FadeImage uri={item.author.avatarUrl} style={nw.commentAvatar} /> // SPRINT-42: render news-comment avatars with FadeImage.
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
            {newsCommentsError ? <Text style={[nw.commentErr, { color: "#DC2626" }]}>{newsCommentsError}</Text> : null}

            <View style={[nw.commentsInputRow, { borderTopColor: tc.borderLight }]}>
              <TextInput
                value={newsCommentDraft}
                onChangeText={setNewsCommentDraft}
                placeholder="Add a comment..."
                placeholderTextColor={tc.textTertiary}
                maxLength={1000}
                style={[nw.commentsInput, { color: tc.textPrimary, borderColor: tc.borderLight, backgroundColor: tc.inputBg }]}
              />
              <Pressable
                style={[nw.commentsSendBtn, newsCommentSending && { opacity: 0.6 }]}
                disabled={newsCommentSending || !newsCommentDraft.trim()}
                onPress={() => void submitNewsComment()}
              >
                {newsCommentSending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={14} color="#FFF" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      <EventDetailModal
        event={selectedEvent}
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isSaved={!!selectedEvent?.isSaved}
        onToggleSave={() => {
          if (selectedEvent) void toggleEventSave(selectedEvent);
        }}
        isRegistered={!!selectedEvent?.registeredByMe}
        onToggleGoing={() => {
          if (selectedEvent) void toggleEventGoing(selectedEvent);
        }}
        onRegister={() => {
          if (!requireAuth(undefined, "Sign in to register for this event.")) return;
          if (selectedEvent) {
            const ev = selectedEvent;
            setSelectedEvent(null);   // close EventDetailModal first
            setRegEvent(ev);
            setRegModalOpen(true);
          }
        }}
        onMessageHost={() => {
          if (!selectedEvent?.authorId) return;
          if (!requireAuth(undefined, "Sign in to message the host.")) return;
          const host = selectedEvent.host;
          const authorId = selectedEvent.authorId;
          router.push({
            pathname: "/chat",
            params: {
              recipientId: authorId,
              recipientName: host,
              recipientType: "dm",
            },
          } as any);
        }}
      />

      <EventRegistrationModal
        visible={regModalOpen}
        event={regEvent}
        onClose={() => setRegModalOpen(false)}
        onRegistered={async ({ name, email, phone, tickets }: { name: string; email: string; phone: string; tickets: string }) => {
          const ev = regEvent;
          if (!ev) return;
          // Optimistic update — card flips to "Going" immediately
          setExploreEvents((p) =>
            p.map((e) =>
              e.id === ev.id ? { ...e, registeredByMe: true, interested: e.interested + 1 } : e,
            ),
          );
          addNotification({
            type: "registration",
            emoji: "🎟️",
            title: `Registered for ${ev.title}`,
            desc: `${name} (${email}) reserved ${tickets} ticket${tickets === "1" ? "" : "s"}`,
          });
          // SPRINT-42: await registration before ticket GET; do not swallow errors
          try {
            const res = await registerForEvent(ev.id, {
              attendeeName: name,
              attendeeEmail: email,
              attendeePhone: phone || undefined,
              ticketCount: parseInt(tickets, 10) || 1,
            });
            const attendeeTotal = typeof res.attendees === "number" ? res.attendees : undefined;
            const cid = res.conversationId ?? undefined;
            setExploreEvents((p) =>
              p.map((e) =>
                e.id === ev.id
                  ? {
                      ...e,
                      registeredByMe: true,
                      interested: attendeeTotal ?? e.interested,
                      conversationId: cid ?? e.conversationId,
                      canAccessChat: cid != null ? true : e.canAccessChat,
                    }
                  : e,
              ),
            );
          } catch (err) {
            // SPRINT-42: revert optimistic state and surface the failure
            setExploreEvents((p) =>
              p.map((e) =>
                e.id === ev.id
                  ? { ...e, registeredByMe: false, interested: Math.max(0, e.interested - 1) }
                  : e,
              ),
            );
            throw err;
          }
        }}
      />

      <Modal
        visible={!!feedCommentPostId}
        animationType="slide"
        onRequestClose={() => {
          setFeedCommentPostId(null);
          setFeedCommentDraft("");
          setFeedCommentPostDetail(null);
        }}
        presentationStyle="pageSheet"
        statusBarTranslucent
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? tc.pageBg : "#F2F4F8" }} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: isDark ? tc.pageBg : "#F2F4F8" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 56 : 0}
        >
          {/* Top nav bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: rs(14),
              paddingVertical: rs(13),
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: tc.borderLight,
              backgroundColor: tc.cardBg,
            }}
          >
            <Pressable
              onPress={() => {
                setFeedCommentPostId(null);
                setFeedCommentDraft("");
                setFeedCommentPostDetail(null);
              }}
              hitSlop={10}
              style={{ width: rs(32), height: rs(32), borderRadius: rs(16), backgroundColor: isDark ? tc.inputBg : "#F3F4F6", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="chevron-back" size={20} color={tc.textPrimary} />
            </Pressable>
            <Text
              style={{ flex: 1, textAlign: "center", fontWeight: "800", fontSize: rs(16), color: tc.textPrimary, marginHorizontal: rs(8) }}
              numberOfLines={1}
            >
              {feedCommentPostDetail?.title?.trim() || "Post"}
            </Text>
            {feedCommentOpenPostIsOwner && feedCommentPostId ? (
              <Pressable
                onPress={() => appAlert("Post options", undefined, [{ text: "Edit", onPress: () => { setFeedCommentPostId(null); router.push({ pathname: "/create-post", params: { type: "news", mode: "edit", id: feedCommentPostId } } as any); } }, { text: "Delete", style: "destructive", onPress: () => confirmDeleteFeedPost(feedCommentPostId) }, { text: "Cancel", style: "cancel" }])} // SPRINT-42: expose owner Edit and retain Delete in detail overflow.
                hitSlop={10}
                accessibilityLabel="Post options" // SPRINT-42: identify the owner detail overflow.
                style={{ width: rs(32), height: rs(32), borderRadius: rs(16), backgroundColor: tc.inputBg, alignItems: "center", justifyContent: "center" }} // SPRINT-42: use a neutral owner-options surface.
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={tc.textSecondary} />
                {/* SPRINT-42: use overflow semantics for edit/delete. */}
              </Pressable>
            ) : (
              <View style={{ width: rs(32) }} />
            )}
          </View>

          <FlatList
            data={feedComments}
            keyExtractor={(it) => it.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: rs(24), flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                {/* Post body card */}
                <View
                  style={{
                    backgroundColor: tc.cardBg,
                    marginBottom: rs(8),
                    paddingHorizontal: rs(16),
                    paddingTop: rs(16),
                    paddingBottom: rs(18),
                    shadowColor: "#000",
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  {feedCommentPostLoading ? (
                    <View style={{ paddingVertical: rs(28), alignItems: "center" }}>
                      <ActivityIndicator color={Colors.brand.blue} />
                    </View>
                  ) : feedCommentPostDetail ? (
                    <>
                      {feedCommentPostDetail.media?.[0]?.url ? (
                        <FadeImage // SPRINT-42: render post-detail media through the shared image component.
                          uri={resolveApiAssetUrl(feedCommentPostDetail.media[0].url)} // SPRINT-42: resolve the persisted API asset.
                          style={{
                            width: "100%",
                            height: rs(200),
                            borderRadius: rs(14),
                            marginBottom: rs(14),
                            backgroundColor: tc.inputBg,
                          }}
                        />
                      ) : null}
                      {feedCommentPostDetail.category ? (
                        <View style={{ flexDirection: "row", marginBottom: rs(10) }}>
                          <View style={{ backgroundColor: Colors.brand.blue + "18", borderRadius: rs(6), paddingHorizontal: rs(10), paddingVertical: rs(4) }}>
                            <Text style={{ fontSize: rs(10), fontWeight: "800", color: Colors.brand.blue, letterSpacing: 1, textTransform: "uppercase" }}>
                              {String(feedCommentPostDetail.category).replace(/_/g, " ")}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      {feedCommentPostDetail.content ? (
                        <Text style={{ fontSize: rs(14), lineHeight: rs(22), color: tc.textSecondary }}>
                          {feedCommentPostDetail.content}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: rs(13), color: tc.textTertiary, fontStyle: "italic" }}>
                          No additional content
                        </Text>
                      )}
                      {feedCommentPostDetail.isEdited ? <Text style={{ fontSize: rs(10), color: tc.textTertiary, marginTop: rs(8) }}>Edited</Text> : null}
                      {/* SPRINT-42: detail marker is driven only by backend isEdited. */}
                      {feedCommentPostDetail.author && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6), marginTop: rs(12), paddingTop: rs(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }}>
                          <View style={{ width: rs(22), height: rs(22), borderRadius: rs(11), backgroundColor: Colors.brand.blue + "20", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: rs(10), fontWeight: "800", color: Colors.brand.blue }}>
                              {(feedCommentPostDetail.author.name?.[0] ?? feedCommentPostDetail.author.username?.[0] ?? "U").toUpperCase()}
                            </Text>
                          </View>
                          <Text style={{ fontSize: rs(12), color: tc.textTertiary, fontWeight: "600" }}>
                            {feedCommentPostDetail.author.name ?? feedCommentPostDetail.author.username ?? ""}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={{ color: tc.textTertiary, textAlign: "center", paddingVertical: rs(16) }}>
                      Could not load this post. You can still view comments below.
                    </Text>
                  )}
                </View>

                {/* Comments section header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: rs(6),
                    paddingHorizontal: rs(16),
                    paddingTop: rs(14),
                    paddingBottom: rs(10),
                    backgroundColor: isDark ? tc.pageBg : "#F2F4F8",
                  }}
                >
                  <Ionicons name="chatbubbles-outline" size={rs(15)} color={Colors.brand.blue} />
                  <Text style={{ fontSize: rs(13), fontWeight: "800", color: tc.textPrimary, letterSpacing: 0.3 }}>
                    Comments
                  </Text>
                  {feedComments.length > 0 ? (
                    <View style={{ backgroundColor: Colors.brand.blue + "18", borderRadius: rs(10), paddingHorizontal: rs(7), paddingVertical: rs(2) }}>
                      <Text style={{ fontSize: rs(11), fontWeight: "700", color: Colors.brand.blue }}>{feedComments.length}</Text>
                    </View>
                  ) : null}
                </View>

                {feedCommentsLoading ? (
                  <View style={{ paddingVertical: rs(16), alignItems: "center" }}>
                    <ActivityIndicator color={Colors.brand.blue} />
                  </View>
                ) : null}
              </>
            }
            ListEmptyComponent={
              feedCommentsLoading ? null : (
                <View style={{ alignItems: "center", paddingVertical: rs(40), gap: rs(10), paddingHorizontal: rs(32) }}>
                  <View style={{ width: rs(64), height: rs(64), borderRadius: rs(32), backgroundColor: Colors.brand.blue + "12", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={rs(28)} color={Colors.brand.blue} />
                  </View>
                  <Text style={{ color: tc.textPrimary, fontWeight: "700", fontSize: rs(15) }}>No comments yet</Text>
                  <Text style={{ color: tc.textTertiary, fontSize: rs(13), textAlign: "center", lineHeight: rs(19) }}>
                    Be the first to share your thoughts!
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const authorName = item.author?.name || item.author?.username || "Neighbor";
              const initials = authorName.split(" ").map((p: string) => p[0] || "").join("").slice(0, 2).toUpperCase();
              const avatar = (item.author as any)?.avatarUrl || (item.author as any)?.avatar;
              return (
                <View style={{ flexDirection: "row", gap: rs(10), marginBottom: rs(10), paddingHorizontal: rs(16) }}>
                  {avatar ? (
                    <FadeImage uri={avatar} style={{ width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: tc.inputBg, marginTop: rs(2) }} /> // SPRINT-42: render feed-comment avatars with FadeImage.
                  ) : (
                    <View style={{ width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: Colors.brand.blue + "20", alignItems: "center", justifyContent: "center", marginTop: rs(2) }}>
                      <Text style={{ fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue }}>{initials}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, backgroundColor: tc.cardBg, borderRadius: rs(14), padding: rs(12), shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: rs(5) }}>
                      <Text style={{ fontWeight: "700", fontSize: rs(13), color: tc.textPrimary }}>{authorName}</Text>
                      <Text style={{ fontSize: rs(10), color: tc.textTertiary }}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <LinkifiedText text={item.content} style={{ color: tc.textSecondary, lineHeight: rs(20), fontSize: rs(13) }} />
                  </View>
                </View>
              );
            }}
          />

          {/* Comment input bar */}
          <SafeAreaView edges={["bottom"]} style={{ backgroundColor: tc.cardBg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                paddingHorizontal: rs(12),
                paddingTop: rs(10),
                paddingBottom: rs(10),
                gap: rs(8),
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  minHeight: rs(42),
                  maxHeight: rs(100),
                  paddingHorizontal: rs(16),
                  paddingVertical: rs(11),
                  borderRadius: rs(22),
                  backgroundColor: tc.inputBg,
                  color: tc.textPrimary,
                  fontSize: rs(14),
                  borderWidth: 1,
                  borderColor: tc.borderLight,
                }}
                placeholder="Write a comment..."
                placeholderTextColor={tc.textTertiary}
                value={feedCommentDraft}
                onChangeText={setFeedCommentDraft}
                multiline
                editable={!feedCommentSending}
              />
              <Pressable
                onPress={() => void sendFeedComment()}
                disabled={feedCommentSending || !feedCommentDraft.trim()}
                style={{
                  paddingHorizontal: rs(18),
                  paddingVertical: rs(11),
                  borderRadius: rs(22),
                  backgroundColor: Colors.brand.blue,
                  opacity: feedCommentSending || !feedCommentDraft.trim() ? 0.45 : 1,
                  minWidth: rs(68),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {feedCommentSending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: rs(14) }}>Send</Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
