import { rs } from "../src/utils/responsive";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
  Alert,
} from "react-native";
import { FadeImage } from "../components/FadeImage"; // SPRINT-42: use the shared image renderer for every saved-item image.
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ListState } from "../src/shared/ui/ListState";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useAuthStore } from "../src/store/auth.store";
import { getSavesByType, type SaveTypeQuery } from "../src/api/saves.api";
import { subscribeToPostUpdates, toggleSave as toggleFeedSave } from "../src/api/feed.api"; // SPRINT-42: patch saved feed rows immediately after edit.
import { toggleSaveEvent } from "../src/api/events.api";
import { RatingSummary } from "../components/events"; // SPRINT-42:
import { toggleListingSave } from "../src/api/housing.api";
import { toggleRestaurantSave } from "../src/api/food.api";
import { bookmarkQuestion } from "../src/api/community-qa.api";
import { toggleStorySave } from "../src/api/stories.api";
import { toggleRoommateSave } from "../src/api/roommates.api";
import { resolveApiAssetUrl } from "../src/api/feed.api";
import { ApiError } from "../src/api/client";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TABS: { type: SaveTypeQuery; label: string; empty: string }[] = [
  { type: "news", label: "News", empty: "No saved news yet — bookmark posts you like to find them here." },
  { type: "events", label: "Events", empty: "No saved events yet — tap the bookmark on an event card to save it." },
  { type: "listings", label: "Listings", empty: "No saved listings yet — bookmark listings you like to find them here." },
  { type: "food", label: "Food", empty: "No saved restaurants yet — use the bookmark on a restaurant card." },
  { type: "community", label: "Community", empty: "No saved questions yet — bookmark community questions to see them here." },
  { type: "stories", label: "Stories", empty: "No saved stories yet — bookmark stories from Explore." },
  { type: "roommates", label: "Roommates", empty: "No saved roommate profiles yet — bookmark profiles you want to revisit." },
];

type Row = Record<string, unknown> & { id?: string; savedItemType?: string };

function pickId(item: Row, tab: SaveTypeQuery): string {
  const id = item.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && !Number.isNaN(id)) return String(id);
  return "";
}

function thumbUri(item: Row, tab: SaveTypeQuery): string | undefined {
  if (tab === "news") {
    const m = item.media as { url?: string }[] | undefined;
    const u = Array.isArray(m) && m[0]?.url ? String(m[0].url) : "";
    return u ? resolveApiAssetUrl(u) : undefined;
  }
  if (tab === "events") {
    const imgs = item.images as string[] | undefined;
    const u = Array.isArray(imgs) && imgs[0] ? imgs[0] : "";
    return u || undefined;
  }
  if (tab === "listings") {
    const imgs = item.images as { url?: string; order?: number }[] | undefined; // SPRINT-42: model persisted listing image order.
    const first = Array.isArray(imgs) ? imgs.map((image, index) => ({ image, index })).sort((a, b) => (a.image.order ?? a.index) - (b.image.order ?? b.index) || a.index - b.index)[0]?.image : undefined; // SPRINT-42: select the received/order-sorted primary image without reversing.
    const u = first?.url ? String(first.url) : ""; // SPRINT-42: allow a valid zero-image listing.
    return u ? resolveApiAssetUrl(u) : undefined;
  }
  if (tab === "food") {
    const u = typeof item.image === "string" ? item.image : "";
    return u ? resolveApiAssetUrl(u) : undefined;
  }
  if (tab === "stories") {
    const u = typeof item.mediaUrl === "string" ? item.mediaUrl : "";
    return u ? resolveApiAssetUrl(u) : undefined;
  }
  if (tab === "roommates") {
    const u =
      typeof item.avatarUrl === "string"
        ? item.avatarUrl
        : typeof item.avatar === "string"
          ? item.avatar
          : "";
    return u ? resolveApiAssetUrl(u) : undefined;
  }
  return undefined;
}

function titleLine(item: Row, tab: SaveTypeQuery): string {
  if (tab === "news") return String(item.title ?? "Post");
  if (tab === "events") return String(item.title ?? "Event");
  if (tab === "listings") return String(item.title ?? "Listing");
  if (tab === "food") return String(item.name ?? "Restaurant");
  if (tab === "community") return String(item.question ?? item.title ?? "Question");
  if (tab === "stories") return String(item.title ?? "Story");
  if (tab === "roommates") return String(item.name ?? item.username ?? "Roommate");
  return "Saved item";
}

function subtitleLine(item: Row, tab: SaveTypeQuery): string {
  if (tab === "news") {
    const a = item.author as { name?: string; username?: string } | undefined;
    return a?.name || a?.username || "";
  }
  if (tab === "events") {
    const a = item.author as { name?: string; username?: string } | undefined;
    return a?.name || a?.username || String(item.venue ?? "");
  }
  if (tab === "listings") return String(item.city ?? item.address ?? "");
  if (tab === "food") return String(item.cuisine ?? "");
  if (tab === "community") {
    const a = item.author as { name?: string; username?: string } | undefined;
    return a?.name || a?.username || "";
  }
  if (tab === "stories") {
    const a = item.author as { name?: string; username?: string } | undefined;
    return a?.name || a?.username || "";
  }
  if (tab === "roommates") return String(item.city ?? item.location ?? "");
  return "";
}

export default function SavedScreen() {
  const { tc, isDark } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const [active, setActive] = useState<SaveTypeQuery>("news");
  const cache = useRef<
    Partial<
      Record<
        SaveTypeQuery,
        { items: Row[]; page: number; hasMore: boolean; loaded: boolean; loading: boolean }
      >
    >
  >({});

  const [, bump] = useState(0);
  const forceRender = () => bump((x) => x + 1);

  const tabState = (t: SaveTypeQuery) =>
    cache.current[t] ?? { items: [], page: 0, hasMore: true, loaded: false, loading: false };

  const loadPage = useCallback(
    async (t: SaveTypeQuery, page: number, append: boolean) => {
      const cur = cache.current[t] ?? {
        items: [],
        page: 0,
        hasMore: true,
        loaded: false,
        loading: false,
      };
      if (cur.loading) return;
      cache.current[t] = { ...cur, loading: true };
      forceRender();
      try {
        const res = await getSavesByType<Row>(t, { page, limit: 20 });
        const chunk = Array.isArray(res.data) ? res.data : [];
        const nextItems = append ? [...cur.items, ...chunk] : chunk;
        cache.current[t] = {
          items: nextItems,
          page: res.page ?? page,
          hasMore: !!res.hasMore,
          loaded: true,
          loading: false,
        };
      } catch {
        cache.current[t] = { ...cur, loading: false, loaded: true, hasMore: false };
      }
      forceRender();
    },
    [],
  );

  const onTabPress = (t: SaveTypeQuery) => {
    void Haptics.selectionAsync();
    setActive(t);
    const st = cache.current[t];
    if (!st || !st.loaded) void loadPage(t, 1, false);
  };

  const onRefresh = useCallback(() => {
    cache.current[active] = {
      items: [],
      page: 0,
      hasMore: true,
      loaded: false,
      loading: false,
    };
    void loadPage(active, 1, false);
  }, [active, loadPage]);

  const unsave = async (item: Row, t: SaveTypeQuery) => {
    const id = pickId(item, t);
    if (!id) return;
    try {
      let saved = true;
      switch (t) {
        case "news":
          ({ saved } = await toggleFeedSave(id));
          break;
        case "events":
          ({ saved } = await toggleSaveEvent(id));
          break;
        case "listings":
          ({ saved } = await toggleListingSave(id));
          break;
        case "food":
          ({ saved } = await toggleRestaurantSave(id));
          break;
        case "community":
          ({ saved } = await bookmarkQuestion(id));
          break;
        case "stories":
          ({ saved } = await toggleStorySave(id));
          break;
        case "roommates":
          ({ saved } = await toggleRoommateSave(id));
          break;
        default:
          return;
      }
      if (saved) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const st = cache.current[t];
      if (!st) return;
      cache.current[t] = {
        ...st,
        items: st.items.filter((row) => pickId(row, t) !== id),
      };
      forceRender();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not update save.";
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      appAlert("Save", msg);
    }
  };

  const openItem = (item: Row, t: SaveTypeQuery) => {
    const id = pickId(item, t);
    if (!id) return;
    switch (t) {
      case "news":
        router.push({ pathname: "/(tabs)/feed", params: { openPost: id } } as never);
        return;
      case "events":
        router.push({ pathname: "/(tabs)/feed", params: { exploreTab: "Events", openEvent: id } } as never);
        return;
      case "listings":
        router.push({ pathname: "/(tabs)/housing", params: { openListing: id } } as never);
        return;
      case "food":
        router.push({ pathname: "/(tabs)/food", params: { openRestaurant: id } } as never);
        return;
      case "community":
        router.push({ pathname: "/(tabs)/community", params: { openQuestion: id } } as never);
        return;
      case "stories":
        router.push({ pathname: "/(tabs)/feed", params: { exploreTab: "Stories", openStory: id } } as never);
        return;
      case "roommates":
        router.push({ pathname: "/(tabs)/housing", params: { openRoommate: id } } as never);
        return;
      default:
        return;
    }
  };

  const st = tabState(active);
  const tabMeta = useMemo(() => TABS.find((x) => x.type === active), [active]);

  useEffect(() => {
    if (!cache.current.news?.loaded) void loadPage("news", 1, false);
  }, [loadPage]);

  // Re-fetch the active tab whenever this screen regains focus (e.g. after saving
  // something elsewhere in the app) so newly-saved items appear without a manual
  // pull-to-refresh — the in-memory cache has no other way to learn about them.
  const isFirstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      cache.current[active] = {
        items: [],
        page: 0,
        hasMore: true,
        loaded: false,
        loading: false,
      };
      void loadPage(active, 1, false);
    }, [active, loadPage]),
  );
  useEffect(() => subscribeToPostUpdates((updated) => { // SPRINT-42: consume successful edits in the memory-only saved cache.
    const state = cache.current.news; // SPRINT-42: inspect only the feed save boundary.
    if (!state) return; // SPRINT-42: skip an unloaded saved-feed tab.
    cache.current.news = { ...state, items: state.items.map((item) => pickId(item, "news") === updated.id ? { ...item, ...updated } : item) }; // SPRINT-42: patch all six fields plus isEdited from the authoritative response.
    forceRender(); // SPRINT-42: repaint the visible saved row immediately.
  }), []); // SPRINT-42: release the subscription on unmount.

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tc.sheetBg }]} edges={["top"]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }}
          hitSlop={12}
          style={[styles.backBtn, { backgroundColor: isDark ? tc.inputBg : "#F3F4F6" }]}
        >
          <Ionicons name="chevron-back" size={22} color={tc.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>Saved</Text>
        <View style={{ width: rs(40) }} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: tc.borderLight }]}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={(x) => x.type}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: rs(10), gap: rs(6), paddingVertical: rs(10) }}
          renderItem={({ item }) => {
            const on = item.type === active;
            return (
              <Pressable
                onPress={() => onTabPress(item.type)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: on ? Colors.brand.blue : isDark ? tc.inputBg : "#FFF",
                    borderColor: on ? Colors.brand.blue : tc.borderLight,
                  },
                ]}
              >
                <Text style={{ fontSize: rs(12), fontWeight: "800", color: on ? "#FFF" : tc.textSecondary }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {st.loading && !st.loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.blue} />
        </View>
      ) : st.items.length === 0 ? (
        <ListState
          kind="empty"
          icon="bookmark-outline"
          title="Nothing saved"
          message={tabMeta?.empty}
          actionLabel="Browse"
          onAction={() => router.push((({ listings: "/(tabs)/housing", roommates: "/(tabs)/housing", food: "/(tabs)/food", community: "/(tabs)/community" } as Record<string, string>)[active] ?? "/(tabs)/feed") as any)}
        />
) : active === "stories" ? (
        <FlatList
          key="stories-grid"
          data={st.items}
          numColumns={2}
          keyExtractor={(item) => pickId(item, active)}
          columnWrapperStyle={{ gap: rs(10), paddingHorizontal: rs(14) }}
          contentContainerStyle={{ paddingVertical: rs(14), gap: rs(10) }}
          refreshControl={<RefreshControl refreshing={st.loading && st.loaded} onRefresh={onRefresh} />}
          onEndReachedThreshold={0.35}
          onEndReached={() => {
            if (st.hasMore && !st.loading && st.loaded) void loadPage(active, (st.page ?? 0) + 1, true);
          }}
          renderItem={({ item }) => {
            const id = pickId(item, active);
            const uri = thumbUri(item, active) || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=60";
            const expired = item.isExpired === true;
            return (
              <Pressable
                onPress={() => openItem(item, active)}
                style={[
                  styles.storyTile,
                  { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
                ]}
              >
                <FadeImage // SPRINT-42: render saved story media through the shared image component.
                  uri={uri} // SPRINT-42: pass the normalized story thumbnail.
                  style={styles.storyImg}
                />
                <Pressable
                  style={styles.storyBookmark}
                  onPress={() => void unsave(item, active)}
                  hitSlop={10}
                >
                  <Ionicons name="bookmark" size={18} color="#FF7B00" />
                </Pressable>
                {expired ? (
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredText}>Expired</Text>
                  </View>
                ) : null}
                <View style={styles.storyMeta}>
                  <Text numberOfLines={2} style={[styles.storyTitle, { color: tc.textPrimary }]}>
                    {titleLine(item, active)}
                  </Text>
                  <Text numberOfLines={1} style={[styles.storyCat, { color: tc.textTertiary }]}>
                    {String(item.category ?? "")}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          key={active}
          data={st.items}
          keyExtractor={(item) => pickId(item, active)}
          contentContainerStyle={{ padding: rs(14), paddingBottom: rs(32), gap: rs(10) }}
          refreshControl={<RefreshControl refreshing={st.loading && st.loaded} onRefresh={onRefresh} />}
          onEndReachedThreshold={0.35}
          onEndReached={() => {
            if (st.hasMore && !st.loading && st.loaded) void loadPage(active, (st.page ?? 0) + 1, true);
          }}
          renderItem={({ item }) => {
            const uri = thumbUri(item, active);
            const sub = subtitleLine(item, active);
            return (
              <Pressable
                onPress={() => openItem(item, active)}
                style={[
                  styles.row,
                  { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
                ]}
              >
                {uri ? (
                  <FadeImage // SPRINT-42: render saved feed/listing thumbnails through the shared image component.
                    uri={uri} // SPRINT-42: preserve the order-selected thumbnail.
                    style={styles.rowThumb}
                  />
                ) : (
                  <View style={[styles.rowThumb, styles.rowThumbPh, { backgroundColor: tc.inputBg }]}>
                    <Ionicons name="image-outline" size={22} color={tc.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={[styles.rowTitle, { color: tc.textPrimary }]}>
                    {titleLine(item, active)}
                  </Text>
                  {active === "news" && item.isEdited === true ? <Text style={[styles.rowSub, { color: tc.textTertiary }]}>Edited</Text> : null}
                  {/* SPRINT-42: saved feed-row marker follows backend isEdited. */}
                  {active === "events" ? ( // SPRINT-42: saved event row rating
                    <RatingSummary
                      averageRating={Number(item.averageRating ?? 0) || 0}
                      totalReviews={Number(item.totalReviews ?? 0) || 0}
                      size="sm"
                      textColor={tc.textPrimary}
                      mutedColor={tc.textTertiary}
                      style={{ marginTop: 2 }}
                    />
                  ) : null}
                  {sub ? (
                    <Text numberOfLines={1} style={[styles.rowSub, { color: tc.textSecondary }]}>
                      {sub}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => void unsave(item, active)} hitSlop={10} style={styles.rowBookmark}>
                  <Ionicons name="bookmark" size={22} color="#FF7B00" />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
  },
  backBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: rs(20), fontWeight: "900" },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabChip: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    borderRadius: rs(999),
    borderWidth: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: rs(28) },
  emptyTitle: { fontSize: rs(18), fontWeight: "800", marginBottom: rs(6) },
  emptyBody: { fontSize: rs(14), textAlign: "center", lineHeight: rs(21) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    borderRadius: rs(14),
    borderWidth: 1,
    padding: rs(10),
  },
  rowThumb: { width: rs(56), height: rs(56), borderRadius: rs(10) },
  rowThumbPh: { alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: rs(15), fontWeight: "700" },
  rowSub: { fontSize: rs(12), marginTop: rs(2) },
  rowBookmark: { paddingLeft: rs(4) },
  storyTile: {
    flex: 1,
    maxWidth: "48%",
    borderRadius: rs(14),
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: rs(4),
  },
  storyImg: { width: "100%", height: rs(120) },
  storyBookmark: { position: "absolute", top: rs(8), right: rs(8), backgroundColor: "rgba(0,0,0,0.35)", borderRadius: rs(8), padding: rs(4) },
  expiredBadge: {
    position: "absolute",
    top: rs(8),
    left: rs(8),
    backgroundColor: "rgba(220,38,38,0.92)",
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(6),
  },
  expiredText: { color: "#FFF", fontSize: rs(10), fontWeight: "800" },
  storyMeta: { padding: rs(8), gap: rs(2) },
  storyTitle: { fontSize: rs(13), fontWeight: "800" },
  storyCat: { fontSize: rs(11), fontWeight: "600" },
});
