import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { BentoTile, Chip, GradientFill, PressableScale, Reveal, TileIn, TileLabel } from "../../../src/shared/d";
import { DETAIL_LINK_ON, DetailLink, detailHref } from "../../../src/shared/d/DetailLink";
import { TYPE } from "../../../src/theme/d";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  Linking,
  Share,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../src/theme/colors";
import { useTheme } from "../../../src/theme/useTheme";
import AppHeader from "../../../components/AppHeader";
import { FadeImage } from "../../../components/FadeImage"; // SPRINT-31: shared expo-image FadeImage (local helper removed)
import { router, useLocalSearchParams, useScrollToTop } from "expo-router";
import { useAuthStore } from "../../../src/store/auth.store";
import { useGuestLocationStore } from "../../../src/store/guestLocation.store";
import { useRequireAuth } from "../../../src/shared/hooks/useRequireAuth";
import {
  deleteRestaurant,
  getRestaurants,
  getRestaurant,
  getReviews,
  reportRestaurant,
  submitReview,
  updateReview,
  deleteReview,
  toggleFavoriteRestaurant,
  toggleRestaurantSave,
  createReservation,
  type Restaurant,
  type RestaurantReview,
} from "../../../src/api/food.api";
import { rs } from "../../../src/utils/responsive";
import { ListState } from "../../../src/shared/ui/ListState";
import { useAppCity } from "../../../src/utils/useAppCity";
import { GuestCityPickerModal } from "../../../components/GuestCityBanner";
import { getShareLink } from "../../../src/utils/shareLinks";
import { queryKeys } from "../../../src/services/cache/queryKeys";
import { LIST_STALE_MS } from "../../../src/services/cache/queryClient";
import { useInfiniteScreenQuery } from "../../../src/hooks/useInfiniteScreenQuery";
import { showToast } from "../../../src/shared/ui/Toast";
import { actionSheet, appAlert } from '../../../src/shared/ui/Dialogs';

import { safeList, distanceMiles, restaurantIsOpen, getDisplayPrice, SortOption, FoodFullscreenViewer, EMPTY_RESTAURANTS, restaurantId, s } from "../../../src/features/food/foodShared";

export default function FoodScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const foodScrollRef = useRef<ScrollView>(null);
  useScrollToTop(foodScrollRef); // re-tap the Food tab → back to top
  const insets = useSafeAreaInsets();
  // Design D (plan 01): the header title fades in as the large title scrolls away.
  const foodScrollY = useSharedValue(0);
  const onFoodScroll = useAnimatedScrollHandler((e) => { foodScrollY.set(e.contentOffset.y); });
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { requireAuth } = useRequireAuth();
  const guestCity = useGuestLocationStore((s) => s.city);
  const guestCountry = useGuestLocationStore((s) => s.country);
  const countryCode =
    (user as any)?.userLocation?.countryCode ||
    ((user?.country || guestCountry) === "United Kingdom" ? "GB" : "US");
  const params = useLocalSearchParams<{ openRestaurant?: string }>();
  const openedRestaurantRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const { city: appCity, hasCity, chooseCity } = useAppCity(() => setCityPickerVisible(true));
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  // The detail is its own route (plan 03).
  const openRestaurant = (rid: string) => router.push(`/restaurant/${encodeURIComponent(rid)}` as never);
  const [fsImages, setFsImages] = useState<string[]>([]);
  const [fsStartIdx, setFsStartIdx] = useState(0);
  const [fsVisible, setFsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("Rating");


  // Restaurants: one cached query per city, search and cuisine (the key replaces the old request-generation
  // guard), kept for 10 minutes like the old fetch gate; pull to refresh refetches.
  const foodQ = useInfiniteScreenQuery<Restaurant>({
    queryKey: queryKeys.food(appCity, { search: debouncedSearch, cuisine: cuisine && cuisine !== "All" ? cuisine : null }),
    enabled: hasCity,
    staleTime: LIST_STALE_MS,
    getId: restaurantId,
    fetchPage: async (targetPage) => {
      const res = await getRestaurants({
        page: targetPage,
        limit: 20,
        city: appCity,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(cuisine && cuisine !== "All" ? { cuisine } : {}),
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      const meta = (res as any)?.meta;
      return { items: list, hasMore: meta ? targetPage < Number(meta.totalPages ?? 1) : list.length >= 20 };
    },
  });
  const restaurants = hasCity ? foodQ.items : EMPTY_RESTAURANTS;
  const setRestaurants = foodQ.setItems;
  const loading = foodQ.loading;
  const loadError = !!foodQ.error;
  const hasMore = foodQ.hasMore;
  const loadingMore = foodQ.loadingMore;
  // Hearts and bookmarks start from the server's flags each time a fetch lands; taps change them locally.
  const foodFetchedAt = foodQ.dataUpdatedAt;
  useEffect(() => {
    if (!foodFetchedAt) return;
    setFavorites(new Set(foodQ.items.filter((x) => x.savedByMe).map((x) => x.id)));
    setBookmarkedIds(new Set(foodQ.items.filter((x) => x.isSaved === true).map((x) => x.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodFetchedAt]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const raw = params.openRestaurant;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || openedRestaurantRef.current === id) return;
    openedRestaurantRef.current = id;
    openRestaurant(id);
  }, [params.openRestaurant]);


  const onRefresh = useCallback(() => {
    (async () => {
      try {
        setRefreshing(true);
        setSearch("");
        setCuisine(null);
        setActiveTab("all");
        await foodQ.refetch();
      } finally {
        setRefreshing(false);
      }
    })();
  }, [foodQ.refetch]);


  const toggleBookmark = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to save restaurants and find them later.")) return;
    try {
      const { saved } = await toggleRestaurantSave(id);
      setBookmarkedIds((p) => {
        const n = new Set(p);
        if (saved) n.add(id);
        else n.delete(id);
        return n;
      });
      setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, isSaved: saved } : r)));
    } catch {
      showToast("Could not update bookmark. Please try again.", "error");
    }
  };

  const toggleFav = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to save your favorite restaurants.")) return;
    const prev = new Set(favorites);
    setFavorites((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    try {
      const { saved } = await toggleFavoriteRestaurant(id);
      setFavorites((p) => {
        const n = new Set(p);
        if (saved) n.add(id);
        else n.delete(id);
        return n;
      });
    } catch {
      setFavorites(prev);
      showToast("Could not update favorite. Please try again.", "error");
    }
  };

  // ── Card gestures: double-tap photo → favorite; long-press card → quick actions ──
  const lastPhotoTapRef = useRef<{ id: string; at: number } | null>(null);
  const photoTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (photoTapTimerRef.current) clearTimeout(photoTapTimerRef.current); }, []);
  const onCardPhotoPress = (r: Restaurant, idx: number) => {
    const now = Date.now();
    const last = lastPhotoTapRef.current;
    if (last && last.id === r.id && now - last.at < 280) {
      lastPhotoTapRef.current = null;
      if (photoTapTimerRef.current) clearTimeout(photoTapTimerRef.current);
      if (!favorites.has(r.id)) void toggleFav(r.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    lastPhotoTapRef.current = { id: r.id, at: now };
    photoTapTimerRef.current = setTimeout(() => {
      const imgs = r.images && r.images.length > 0 ? r.images : [r.image];
      setFsImages(imgs);
      setFsStartIdx(idx);
      setFsVisible(true);
    }, 280);
  };
  const openCardActions = async (r: Restaurant) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isSaved = bookmarkedIds.has(r.id) || !!r.isSaved;
    const choice = await actionSheet({
      title: r.name,
      options: [
        { label: favorites.has(r.id) ? "Remove from favorites" : "Add to favorites", value: "fav" },
        { label: isSaved ? "Remove from saved" : "Save for later", value: "save" },
        { label: "Share", value: "share" },
        { label: "Directions", value: "directions" },
        { label: "View details", value: "open" },
      ],
    });
    if (choice === "fav") void toggleFav(r.id);
    else if (choice === "save") void toggleBookmark(r.id);
    else if (choice === "share") void handleShare(r);
    else if (choice === "directions") handleDirections(r);
    else if (choice === "open") openRestaurant(r.id);
  };

  const handleShare = async (r: Restaurant) => {
    try {
      const link = getShareLink("restaurant", r.id);
      await Share.share({
        title: r.name,
        message: `Check out ${r.name} — ${r.cuisine} cuisine, ${r.rating}⭐ rating! ${r.distance} away. Found on ComLinkr 🍽️\n\n${link}`,
        ...(process.env.EXPO_OS === "ios" ? { url: link } : {}),
      });
    } catch { /* ignore */ }
  };

  const handleDirections = (r: Restaurant) => {
    const lat = r.latitude;
    const lng = r.longitude;
    const coordsOk =
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);
    let url: string;
    if (coordsOk) {
      if (process.env.EXPO_OS === "ios") {
        url = `maps://app?ll=${lat},${lng}&q=${encodeURIComponent(r.name)}`;
      } else if (process.env.EXPO_OS === "android") {
        url = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(r.name)})`;
      } else {
        url = `https://maps.google.com/?q=${encodeURIComponent(`${lat},${lng}`)}`;
      }
    } else {
      url = `https://maps.google.com/?q=${encodeURIComponent(r.address ?? r.name)}`;
    }
    void (async () => {
      try {
        await Linking.openURL(url);
      } catch {
        appAlert(r.name, r.address ?? r.name);
      }
    })();
  };








  const filtered = useMemo(() => {
    const list = restaurants.filter((r) => {
      if (search && search.trim() === debouncedSearch) {
        // Server already matched name/cuisine/description/tags; also allow dish matches among returned rows.
        const q = search.toLowerCase();
        const tags = safeList(r.tags as string[] | undefined).join(" ").toLowerCase();
        const dishes = safeList(r.popularDishes as string[] | undefined).join(" ").toLowerCase();
        const desc = ((r.description as string | undefined) ?? "").toLowerCase();
        const matches = r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || tags.includes(q) || dishes.includes(q) || desc.includes(q);
        if (!matches && !debouncedSearch) return false;
      }
      if (activeTab === "favorites" && !favorites.has(r.id)) return false;
      if (activeTab === "top" && r.rating < 4.5) return false;
      if (activeTab === "nearby" && distanceMiles(r.distance) > 1.0) return false;
      if (activeTab === "open" && !restaurantIsOpen(r)) return false;
      return true;
    });
    if (sortBy === "Distance") list.sort((a, b) => distanceMiles(a.distance) - distanceMiles(b.distance));
    else if (sortBy === "Reviews") list.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
    else list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [search, debouncedSearch, activeTab, favorites, restaurants, sortBy]);

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.pageBg }} edges={["top"]}>
      <AppHeader title="Food" scrollY={foodScrollY} />
      <Reanimated.ScrollView
        ref={foodScrollRef as any}
        onScroll={onFoodScroll}
        scrollEventThrottle={16}
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand.green}
            colors={[Colors.brand.green]}
          />
        }
      >
        {/* ── Design D: large title and city ── */}
        <Text style={[TYPE.pageTitle, { color: tc.textPrimary, paddingHorizontal: 18, paddingTop: 2 }]}>Food</Text>
        {user?.city ? <Text style={[TYPE.small, { color: tc.textSecondary, paddingHorizontal: 18, marginTop: 2, marginBottom: 12 }]}>{user.city}</Text> : <View style={{ height: 12 }} />}

        {/* Search */}
        <View style={[s.searchWrap, { backgroundColor: tc.inputBg, borderColor: "transparent", borderRadius: 16 }]}>
          <Ionicons name="search-outline" size={rs(16)} color={tc.textTertiary} />
          <TextInput
            style={[s.searchInput, { color: tc.textPrimary }]}
            placeholder="Search restaurants, cuisines..."
            placeholderTextColor={tc.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* View Tabs — hidden */}

        {/* Cuisine Chips — hidden for now */}

        {/* Results row hidden */}

        {!hasCity ? <ListState kind="needs-city" onAction={chooseCity} /> : null}
        {hasCity && loading && restaurants.length === 0 ? <ListState kind="loading" /> : null}
        {hasCity && loadError && restaurants.length === 0 && !loading ? (
          <ListState
            kind="error"
            onAction={() => { void foodQ.refetch(); }}
          />
        ) : null}
        {hasCity && loadError && restaurants.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Showing older results. Tap to retry"
            onPress={onRefresh}
            style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: tc.warningBg, borderColor: tc.warningBorder }}
          >
            <Ionicons name="alert-circle-outline" size={16} color={tc.warningText} />
            <Text style={{ flex: 1, fontSize: 12, fontWeight: "600", color: tc.warningText }}>Couldn't refresh. Showing older results. Tap to retry.</Text>
          </Pressable>
        ) : null}

        {/* ── Design D: bento, filter chips, two-column tiles ── */}
        {hasCity && filtered.length > 0 ? (() => {
          const pick = [...restaurants].sort((a, b) => b.rating - a.rating)[0];
          const openCount = restaurants.filter((r) => restaurantIsOpen(r)).length;
          const topCount = restaurants.filter((r) => r.rating >= 4.5).length;
          return (
            <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 14 }}>
              {pick ? (
                <TileIn i={0}>
                  <BentoTile onPress={() => openRestaurant(pick.id)} style={{ minHeight: 190, justifyContent: "flex-end" }} accessibilityLabel={`Pick of the week: ${pick.name}`}>
                    <FadeImage uri={(pick.images && pick.images[0]) || pick.image} style={StyleSheet.absoluteFill} />
                    <GradientFill colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"] as const} style={[StyleSheet.absoluteFill, { top: "30%" }]} />
                    <TileLabel light>PICK OF THE WEEK{pick.city ? ` · ${String(pick.city).toUpperCase()}` : ""}</TileLabel>
                    <Text style={[TYPE.cardTitle, { color: "#fff", fontSize: 22, lineHeight: 25, marginTop: 4 }]} numberOfLines={2}>{pick.name}</Text>
                    <TileLabel light style={{ marginTop: 2 }}>{[(pick.reviews ?? 0) > 0 ? `★ ${pick.rating}` : "", pick.cuisine, pick.price ? getDisplayPrice(pick, countryCode) : ""].filter(Boolean).join(" · ")}</TileLabel>
                  </BentoTile>
                </TileIn>
              ) : null}
              {openCount > 0 || topCount > 0 ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {openCount > 0 ? (
                    <TileIn i={1} style={{ flex: 1 }}>
                      <BentoTile tone="mint" onPress={() => setActiveTab("open")} accessibilityLabel={`${openCount} open now`}>
                        <TileLabel style={{ color: "rgba(255,255,255,0.85)" }}>OPEN NOW</TileLabel>
                        <Text style={[TYPE.tileBig, { color: "#fff", marginTop: "auto" }]}>{openCount}</Text>
                      </BentoTile>
                    </TileIn>
                  ) : null}
                  {topCount > 0 ? (
                    <TileIn i={2} style={{ flex: 1 }}>
                      <BentoTile onPress={() => setActiveTab("top")} accessibilityLabel={`${topCount} rated 4.5 or more`}>
                        <TileLabel>RATED 4.5+</TileLabel>
                        <Text style={[TYPE.tileBig, { color: tc.textPrimary, marginTop: "auto" }]}>{topCount}</Text>
                      </BentoTile>
                    </TileIn>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })() : null}

        {hasCity ? (
          <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
            {[["all", "All"], ["open", "Open now"], ["top", "Top rated"], ["nearby", "Nearby"], ["favorites", "Favourites"]].map(([k, label]) => (
              <Chip key={k} label={label} on={activeTab === k} onPress={() => setActiveTab(k)} />
            ))}
          </GHScrollView>
        ) : null}

        {(() => {
          const rows: Restaurant[][] = [];
          for (let i = 0; i < filtered.length; i += 2) rows.push(filtered.slice(i, i + 2));
          return rows.map((pair, ri) => (
            <Reveal key={pair.map((r) => r.id).join("+")} i={ri} style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 16 }}>
              {pair.map((r) => {
                const saved = bookmarkedIds.has(r.id) || !!r.isSaved;
                return (
                  <DetailLink key={r.id} href={detailHref.restaurant(r.id)} style={{ flex: 1 }} actions={[
                    { title: favorites.has(r.id) ? "Remove from favorites" : "Add to favorites", icon: favorites.has(r.id) ? "heart.slash" : "heart", onPress: () => void toggleFav(r.id) },
                    { title: saved ? "Remove from saved" : "Save for later", icon: saved ? "bookmark.slash" : "bookmark", onPress: () => void toggleBookmark(r.id) },
                    { title: "Share", icon: "square.and.arrow.up", onPress: () => void handleShare(r) },
                    { title: "Directions", icon: "map", onPress: () => handleDirections(r) },
                  ]}>
                  <PressableScale outerStyle={{ flex: 1 }} onPress={() => openRestaurant(r.id)} onLongPress={DETAIL_LINK_ON ? undefined : () => void openCardActions(r)} delayLongPress={350} accessibilityRole="button" accessibilityLabel={r.name}>
                    <View>
                      <FadeImage uri={(r.images && r.images[0]) || r.image} style={{ width: "100%", aspectRatio: 1, borderRadius: 22 }} />
                      {(r.reviews ?? 0) > 0 ? (
                        <View style={{ position: "absolute", left: 8, bottom: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, backgroundColor: tc.glass, borderColor: tc.glassLine }}>
                          <Text style={[TYPE.bodyStrong, { fontSize: 13.5, color: tc.textPrimary }]}>★ {r.rating}</Text>
                        </View>
                      ) : null}
                      <Pressable
                        hitSlop={8}
                        onPress={(e) => { e.stopPropagation?.(); void toggleBookmark(r.id); }}
                        style={{ position: "absolute", right: 8, top: 8, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1, backgroundColor: tc.glass, borderColor: tc.glassLine }}
                        accessibilityRole="button" accessibilityLabel={saved ? "Remove from saved" : "Save restaurant"} accessibilityState={{ selected: saved }}
                      >
                        <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={17} color={saved ? tc.accentText : tc.textPrimary} />
                      </Pressable>
                    </View>
                    <Text style={[TYPE.cardTitle, { fontSize: 14.5, lineHeight: 17, color: tc.textPrimary, marginTop: 8, marginHorizontal: 2 }]} numberOfLines={1}>{r.name}</Text>
                    <Text style={[TYPE.small, { color: tc.textSecondary, marginHorizontal: 2 }]} numberOfLines={1}>{[r.cuisine, r.price ? getDisplayPrice(r, countryCode) : ""].filter(Boolean).join(" · ")}</Text>
                  </PressableScale>
                  </DetailLink>
                );
              })}
              {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </Reveal>
          ));
        })()}

        {hasCity && hasMore && filtered.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load more restaurants"
            disabled={loadingMore}
            onPress={foodQ.loadMore}
            style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 8, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg, alignItems: "center", justifyContent: "center" }}
          >
            {loadingMore ? <ActivityIndicator size="small" color={Colors.brand.green} /> : <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.brand.green }}>Load more</Text>}
          </Pressable>
        ) : null}

        {hasCity && filtered.length === 0 && !loading && !loadError && (
          <View style={s.empty}>
            <Ionicons
              name={activeTab === "open" ? "time-outline" : activeTab === "favorites" ? "heart-outline" : "restaurant-outline"}
              size={48}
              color="#CBD5E1"
            />
            <Text style={[s.emptyTitle, { color: tc.textSecondary }]}>
              {activeTab === "open" ? "No restaurants open now"
                : activeTab === "favorites" ? "No saved restaurants yet"
                : search ? `No results for "${search}"`
                : "No restaurants found"}
            </Text>
            <Text style={[s.emptyDesc, { color: tc.textTertiary }]}>
              {activeTab === "open" ? "Check back later or try a different cuisine"
                : activeTab === "favorites" ? "Tap the heart on any restaurant to save it here"
                : search ? "Try a different search term or cuisine filter"
                : "Try adjusting your filters or pull to refresh"}
            </Text>
            {(search || cuisine) && (
              <Pressable
                onPress={() => { setSearch(""); setCuisine(null); setActiveTab("all"); }}
                style={{ marginTop: rs(12), paddingHorizontal: rs(20), paddingVertical: rs(8), borderRadius: rs(20), backgroundColor: Colors.brand.green + "18" }}
              >
                <Text style={{ color: Colors.brand.greenDark, fontWeight: "700", fontSize: rs(13) }}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: 20 }} />
      </Reanimated.ScrollView>



      {fsVisible && fsImages.length > 0 && (
        <FoodFullscreenViewer images={fsImages} startIndex={fsStartIdx} onClose={() => setFsVisible(false)} />
      )}
      <GuestCityPickerModal visible={cityPickerVisible} onClose={() => setCityPickerVisible(false)} />
    </SafeAreaView>
  );
}

