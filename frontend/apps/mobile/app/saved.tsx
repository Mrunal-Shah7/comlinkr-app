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
import { router, Redirect, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ListState } from "../src/shared/ui/ListState";
import * as Haptics from "expo-haptics";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useAuthStore } from "../src/store/auth.store";
import { getSaveCounts, getSavesByType, totalSaveCount, type SaveTypeQuery } from "../src/api/saves.api";
import { getInterestedItems, removeInterested } from "../src/api/favorites.api";
import { subscribeToPostUpdates, toggleSave as toggleFeedSave } from "../src/api/feed.api"; // SPRINT-42: patch saved feed rows immediately after edit.
import { toggleSaveEvent } from "../src/api/events.api";
import { RatingSummary } from "../components/events"; // SPRINT-42:
import { toggleListingSave } from "../src/api/housing.api";
import { getFavoriteRestaurants, toggleFavoriteRestaurant, toggleRestaurantSave } from "../src/api/food.api";
import { bookmarkQuestion } from "../src/api/community-qa.api";
import { toggleStorySave } from "../src/api/stories.api";
import { toggleRoommateSave } from "../src/api/roommates.api";
import { resolveApiAssetUrl } from "../src/api/feed.api";
import { ApiError } from "../src/api/client";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';
import Animated, { FadeOut } from "react-native-reanimated";
import { layoutEase, revealIn } from "../src/shared/motion/presets";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { TYPE } from "../src/theme/d";
import { Chip, EmptyState, PressableScale, Segmented } from "../src/shared/d";
import { DPage, goBackOr } from "../src/shared/d/Page";

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

type Seg = "saved" | "int" | "fav";
type ExtraRow = { id: string; title: string; sub?: string; image?: string; open: () => void; remove: () => Promise<void> };

export default function SavedScreen() {
  const { tc, isDark } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const params = useLocalSearchParams<{ seg?: string }>();
  const [seg, setSeg] = useState<Seg>(params.seg === "int" || params.seg === "fav" ? params.seg : "saved");
  const [active, setActive] = useState<SaveTypeQuery>("news");
  const [savedTotal, setSavedTotal] = useState<number | null>(null);
  const [extra, setExtra] = useState<{ int: ExtraRow[] | null; fav: ExtraRow[] | null }>({ int: null, fav: null });
  const [extraLoading, setExtraLoading] = useState(false);
  const loadExtra = useCallback(async (which: "int" | "fav") => {
    setExtraLoading(true);
    try {
      if (which === "int") {
        const res = await getInterestedItems({ pageSize: 50 });
        setExtra((x) => ({ ...x, int: res.data.map((it) => ({
          id: it.id, title: it.title, sub: it.subtitle, image: it.image ? resolveApiAssetUrl(it.image) : undefined,
          open: () => router.push({ pathname: "/(tabs)/housing", params: { openListing: it.contentId } } as never),
          remove: async () => { await removeInterested(it.type, it.contentId); setExtra((y) => ({ ...y, int: (y.int ?? []).filter((r) => r.id !== it.id) })); },
        })) }));
      } else {
        const res = await getFavoriteRestaurants();
        setExtra((x) => ({ ...x, fav: res.map((r) => ({
          id: r.id, title: r.name, sub: [r.cuisine, r.city].filter(Boolean).join(" · ") || undefined, image: r.image,
          open: () => router.push({ pathname: "/(tabs)/food", params: { openRestaurant: r.id } } as never),
          remove: async () => { await toggleFavoriteRestaurant(r.id); setExtra((y) => ({ ...y, fav: (y.fav ?? []).filter((x2) => x2.id !== r.id) })); },
        })) }));
      }
    } catch (err) {
      appAlert("Could not load", err instanceof ApiError ? err.message : "Check your connection and try again.");
      setExtra((x) => ({ ...x, [which]: [] }));
    } finally {
      setExtraLoading(false);
    }
  }, []);
  useEffect(() => { if (seg !== "saved") void loadExtra(seg); }, [seg, loadExtra]);
  useEffect(() => { void getSaveCounts().then((c) => setSavedTotal(totalSaveCount(c.counts))).catch(() => {}); }, []);
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

  const TYPE_LABEL: Record<string, string> = { news: "News", events: "Event", listings: "Home", food: "Food", community: "Question", stories: "Story", roommates: "Roommate" };
  const chips = (
    <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 14 }}>
      {TABS.map((t) => <Chip key={t.type} label={t.label} on={t.type === active} onPress={() => onTabPress(t.type)} />)}
    </GHScrollView>
  );
  const isStories = active === "stories";
  const empty = st.loading && !st.loaded ? (
    <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 48 }} />
  ) : (
    <EmptyState
      icon="bookmark-outline"
      title="Nothing saved"
      sub={tabMeta?.empty}
      actionLabel="Browse"
      onAction={() => router.push((({ listings: "/(tabs)/housing", roommates: "/(tabs)/housing", food: "/(tabs)/food", community: "/(tabs)/community" } as Record<string, string>)[active] ?? "/(tabs)/feed") as any)}
    />
  );

  const segmented = (
    <Segmented
      style={{ marginHorizontal: 16, marginBottom: 14 }}
      items={[{ key: "saved", label: savedTotal ? `Saved · ${savedTotal}` : "Saved" }, { key: "int", label: "Interested" }, { key: "fav", label: "Favourites" }]}
      value={seg}
      onChange={(k) => setSeg(k as Seg)}
    />
  );
  const extraRows = seg === "saved" ? [] : extra[seg] ?? [];
  const extraEmpty = extraLoading || extra[seg as "int" | "fav"] == null ? (
    <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 48 }} />
  ) : seg === "int" ? (
    <EmptyState icon="home-outline" title="Nothing here yet" sub="Homes you mark as interested show up here." actionLabel="Browse homes" onAction={() => router.push("/(tabs)/housing" as never)} />
  ) : (
    <EmptyState icon="heart-outline" title="No favourites yet" sub="Tap the heart on a place to keep it here." actionLabel="Browse food" onAction={() => router.push("/(tabs)/food" as never)} />
  );

  if (seg !== "saved") {
    return (
      <DPage
        title="Saved"
        onBack={() => goBackOr("/(tabs)/feed")}
        renderList={({ onScroll, header, bottom }) => (
          <Animated.FlatList
            data={extraRows}
            keyExtractor={(r: ExtraRow) => r.id}
            onScroll={onScroll}
            scrollEventThrottle={16}
            itemLayoutAnimation={layoutEase}
            ListHeaderComponent={<>{header}{segmented}</>}
            ListEmptyComponent={extraEmpty}
            contentContainerStyle={{ paddingBottom: bottom, gap: 10 }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={() => void loadExtra(seg)} tintColor={tc.accent} />}
            renderItem={({ item, index }: { item: ExtraRow; index: number }) => (
              <Animated.View entering={index < 8 ? revealIn(index) : undefined} exiting={FadeOut.duration(180)} style={{ marginHorizontal: 16 }}>
                <PressableScale onPress={item.open} accessibilityRole="button" accessibilityLabel={item.title}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 22, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }}>
                  {item.image ? <FadeImage uri={item.image} style={{ width: 72, height: 72, borderRadius: 16 }} /> : (
                    <View style={{ width: 72, height: 72, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
                      <Ionicons name={seg === "int" ? "home-outline" : "restaurant-outline"} size={24} color={tc.accentText} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: tc.accentSoft }}>
                      <Text style={[TYPE.label, { color: tc.accentText, fontSize: 11 }]}>{seg === "int" ? "Home" : "Food"}</Text>
                    </View>
                    <Text numberOfLines={2} style={[TYPE.cardTitle, { color: tc.textPrimary }]}>{item.title}</Text>
                    {item.sub ? <Text numberOfLines={1} style={[TYPE.small, { color: tc.textSecondary }]}>{item.sub}</Text> : null}
                  </View>
                  <Pressable onPress={() => void item.remove().catch((err) => appAlert("Could not remove", err instanceof ApiError ? err.message : "Try again."))} hitSlop={10} accessibilityRole="button"
                    accessibilityLabel={seg === "int" ? "Not interested any more" : "Remove from favourites"} style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={seg === "int" ? "star" : "heart"} size={21} color={seg === "int" ? tc.accentText : "#E0245E"} />
                  </Pressable>
                </PressableScale>
              </Animated.View>
            )}
          />
        )}
      />
    );
  }

  return (
    <DPage
      title="Saved"
      onBack={() => goBackOr("/(tabs)/feed")}
      renderList={({ onScroll, header, bottom }) => (
        <Animated.FlatList
          key={isStories ? "stories-grid" : "rows"}
          data={st.items}
          numColumns={isStories ? 2 : 1}
          keyExtractor={(item: Row) => pickId(item, active)}
          onScroll={onScroll}
          scrollEventThrottle={16}
          itemLayoutAnimation={layoutEase}
          ListHeaderComponent={<>{header}{segmented}{chips}</>}
          ListEmptyComponent={empty}
          columnWrapperStyle={isStories ? { gap: 10, paddingHorizontal: 16 } : undefined}
          contentContainerStyle={{ paddingBottom: bottom, gap: 10 }}
          refreshControl={<RefreshControl refreshing={st.loading && st.loaded} onRefresh={onRefresh} tintColor={tc.accent} />}
          onEndReachedThreshold={0.35}
          onEndReached={() => {
            if (st.hasMore && !st.loading && st.loaded) void loadPage(active, (st.page ?? 0) + 1, true);
          }}
          renderItem={({ item, index }: { item: Row; index: number }) => {
            if (isStories) {
              const uri = thumbUri(item, active);
              const expired = item.isExpired === true;
              return (
                <Animated.View entering={index < 8 ? revealIn(index) : undefined} exiting={FadeOut.duration(180)} style={{ flex: 1, maxWidth: "50%" }}>
                  <PressableScale onPress={() => openItem(item, active)} accessibilityRole="button" accessibilityLabel={titleLine(item, active)}
                    style={{ height: 230, borderRadius: 22, overflow: "hidden", backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }}>
                    {uri ? <FadeImage uri={uri} style={StyleSheet.absoluteFill} /> : null}
                    <LinearGradient colors={["transparent", "rgba(0,0,0,0.72)"]} style={[StyleSheet.absoluteFill, { top: "45%" }]} />
                    <Pressable onPress={() => void unsave(item, active)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove from saved"
                      style={{ position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.38)" }}>
                      <Ionicons name="bookmark" size={17} color="#fff" />
                    </Pressable>
                    {expired ? <View style={{ position: "absolute", top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.5)" }}><Text style={[TYPE.label, { color: "#fff" }]}>Expired</Text></View> : null}
                    <View style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
                      <Text numberOfLines={2} style={[TYPE.cardTitle, { color: "#fff" }]}>{titleLine(item, active)}</Text>
                      {item.category ? <Text numberOfLines={1} style={[TYPE.small, { color: "rgba(255,255,255,0.8)" }]}>{String(item.category)}</Text> : null}
                    </View>
                  </PressableScale>
                </Animated.View>
              );
            }
            const uri = thumbUri(item, active);
            const sub = subtitleLine(item, active);
            return (
              <Animated.View entering={index < 8 ? revealIn(index) : undefined} exiting={FadeOut.duration(180)} style={{ marginHorizontal: 16 }}>
                <PressableScale onPress={() => openItem(item, active)} accessibilityRole="button" accessibilityLabel={titleLine(item, active)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 22, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }}>
                  {uri ? (
                    <FadeImage uri={uri} style={{ width: 72, height: 72, borderRadius: 16 }} />
                  ) : (
                    <View style={{ width: 72, height: 72, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
                      <Ionicons name={active === "community" ? "help-circle-outline" : active === "roommates" ? "person-outline" : "image-outline"} size={24} color={tc.accentText} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: tc.accentSoft }}>
                      <Text style={[TYPE.label, { color: tc.accentText, fontSize: 11 }]}>{TYPE_LABEL[active] ?? "Saved"}</Text>
                    </View>
                    <Text numberOfLines={2} style={[TYPE.cardTitle, { color: tc.textPrimary }]}>{titleLine(item, active)}</Text>
                    {active === "news" && item.isEdited === true ? <Text style={[TYPE.small, { color: tc.textTertiary }]}>Edited</Text> : null}
                    {active === "events" ? (
                      <RatingSummary
                        averageRating={Number(item.averageRating ?? 0) || 0}
                        totalReviews={Number(item.totalReviews ?? 0) || 0}
                        size="sm"
                        textColor={tc.textPrimary}
                        mutedColor={tc.textTertiary}
                      />
                    ) : null}
                    {sub ? <Text numberOfLines={1} style={[TYPE.small, { color: tc.textSecondary }]}>{sub}</Text> : null}
                  </View>
                  <Pressable onPress={() => void unsave(item, active)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remove from saved"
                    style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="bookmark" size={21} color={tc.accentText} />
                  </Pressable>
                </PressableScale>
              </Animated.View>
            );
          }}
        />
      )}
    />
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
