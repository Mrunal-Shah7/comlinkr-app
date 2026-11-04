import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { tabBarClearance } from "../../../src/shared/navigation/DTabBar";
import { DatePickerField, TimePickerField } from "../../../components/DateTimePickerField";
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
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { FlatList as GHFlatList } from "react-native-gesture-handler";
import { runAfterTransition } from "../../../src/utils/afterTransition";
import { DismissibleSheet, SheetDragArea } from "../../../src/shared/ui/DismissibleSheet";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../src/theme/colors";
import { useTheme } from "../../../src/theme/useTheme";
import AppHeader from "../../../components/AppHeader";
import { FadeImage } from "../../../components/FadeImage"; // SPRINT-31: shared expo-image FadeImage (local helper removed)
import { router, useFocusEffect, useLocalSearchParams, useScrollToTop } from "expo-router";
import { useAuthStore } from "../../../src/store/auth.store";
import { useGuestLocationStore } from "../../../src/store/guestLocation.store";
import { useRequireAuth } from "../../../src/shared/hooks/useRequireAuth";
import { ApiError } from "../../../src/api/client";
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
import { getPriceRangeSymbol, getBusinessCurrency, formatPrice } from "../../../src/utils/currency";
import { ListState } from "../../../src/shared/ui/ListState";
import { useAppCity } from "../../../src/utils/useAppCity";
import { GuestCityPickerModal } from "../../../components/GuestCityBanner";
import { getShareLink } from "../../../src/utils/shareLinks";
import { useListFetchCacheStore } from "../../../src/store/listFetchCache.store"; // SPRINT-27
import { showToast } from "../../../src/shared/ui/Toast";
import { actionSheet, appAlert } from '../../../src/shared/ui/Dialogs';

function restaurantIsMine(r: Restaurant, userId: string | undefined): boolean {
  if (!userId) return false;
  if (r.isOwner) return true;
  if (r.ownerId && String(r.ownerId) === String(userId)) return true;
  const oid = r.owner?.id;
  return !!oid && String(oid) === String(userId);
}

function safeList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function itemLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const v = value as { name?: unknown; label?: unknown; value?: unknown };
    if (typeof v.name === "string") return v.name;
    if (typeof v.label === "string") return v.label;
    if (typeof v.value === "string") return v.value;
  }
  return String(value ?? "");
}

function distanceMiles(value: string | null | undefined): number {
  const n = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function parseTimeMins(t: string): number {
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return -1;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes since midnight in the business's timezone; null when the timezone is unknown (the phone's clock is not the business's clock). */
function minutesNowInTimezone(timezone?: string | null): number | null {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const m = Number(parts.find((p) => p.type === "minute")?.value);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  } catch {
    return null;
  }
}

type Availability = { state: "open" | "closed" | "hours" | "unknown"; label: string };

/**
 * FOD-01/02: explicit availability model. Equal opening/closing times are treated as "hours not usable"
 * rather than assumed 24-hour operation.
 */
function getAvailability(r: Restaurant): Availability {
  const open = r.openingTime?.trim();
  const close = r.closingTime?.trim();
  const op = open ? parseTimeMins(open) : -1;
  const cl = close ? parseTimeMins(close) : -1;
  if (op === -1 || cl === -1 || op === cl) return { state: "unknown", label: "Hours not provided" };
  const cur = minutesNowInTimezone(r.timezone);
  if (cur === null) return { state: "hours", label: `Hours ${open} – ${close}` };
  const isOpen = cl > op ? cur >= op && cur < cl : cur >= op || cur < cl;
  return isOpen
    ? { state: "open", label: `Open · closes ${close}` }
    : { state: "closed", label: `Closed · opens ${open}` };
}

function restaurantIsOpen(r: Restaurant): boolean {
  return getAvailability(r).state === "open";
}

/** Prefer the owner-entered average price per person in the business's own currency; otherwise fall back to the $/$$/$$$ tier. */
function getDisplayPrice(r: Restaurant, _viewerCountryCode?: string | null | undefined): string {
  const currency = getBusinessCurrency(r.currency, r.country);
  if (typeof r.avgPricePerPerson === "number" && r.avgPricePerPerson > 0 && currency) {
    return formatPrice(r.avgPricePerPerson, currency.code);
  }
  // Tier symbols are relative, so only relabel them when the business currency is known.
  return currency && currency.code === "GBP" ? getPriceRangeSymbol(r.price, "GB") : (r.price || "—");
}

function hasDistance(r: Restaurant): boolean {
  return !!r.distance && r.distance !== "—";
}

function hasReservations(r: Restaurant): boolean {
  return safeList(r.services as unknown as string[]).some((s) =>
    itemLabel(s).toLowerCase().includes("reserv")
  );
}

/** SPRINT-29: convert picker display time to API HH:MM */
function toApiTime(display: string): string | null {
  const t = display.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m12) return null;
  let h = parseInt(m12[1], 10);
  const min = m12[2];
  const ampm = m12[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/** SPRINT-29: normalize date picker value to YYYY-MM-DD */
function toApiDate(display: string): string | null {
  const t = display.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const CUISINES = ["All", "Italian", "Mexican", "Thai", "Japanese", "Indian", "American", "Chinese", "Mediterranean", "Vietnamese", "Korean", "Greek", "French", "Middle Eastern", "Ethiopian"];

const TABS = [
  { key: "all", label: "All", emoji: "🍽️" },
  { key: "open", label: "Open Now", emoji: "🟢" },
  { key: "top", label: "Top Rated", emoji: "⭐" },
  { key: "nearby", label: "Nearby", emoji: "📍" },
  { key: "favorites", label: "Saved", emoji: "❤️" },
];

const SORT_OPTIONS = ["Rating", "Distance", "Reviews"] as const;
type SortOption = typeof SORT_OPTIONS[number];

const REPORT_REASONS = [
  "Incorrect or misleading information",
  "Spam or scam",
  "Inappropriate content",
  "Harassment or hate",
  "Duplicate listing",
  "Other",
] as const;


const CARD_WIDTH = Dimensions.get("window").width - rs(32);
const SCREEN_WIDTH = Dimensions.get("window").width;

// ── Zoomable fullscreen image ─────────────────────────────────────────────────
function pinchDistance(touches: { pageX: number; pageY: number }[]): number {
  if (touches.length < 2) return 0;
  const [a, b] = touches;
  return Math.sqrt((a.pageX - b.pageX) ** 2 + (a.pageY - b.pageY) ** 2);
}

function FoodZoomableImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastTX = useRef(0);
  const lastTY = useRef(0);
  const pinchStartDist = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastTX.current = (translateX as any)._value;
        lastTY.current = (translateY as any)._value;
        pinchStartDist.current = 0;
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const dist = pinchDistance(touches as any);
          if (pinchStartDist.current === 0) {
            pinchStartDist.current = dist;
            return;
          }
          const ratio = dist / pinchStartDist.current;
          scale.setValue(Math.max(1, Math.min(4, lastScale.current * ratio)));
        } else if (gs.numberActiveTouches === 1 && lastScale.current > 1) {
          translateX.setValue(lastTX.current + gs.dx);
          translateY.setValue(lastTY.current + gs.dy);
        }
      },
      onPanResponderRelease: () => {
        lastScale.current = Math.max(1, Math.min(4, (scale as any)._value));
        pinchStartDist.current = 0;
        if (lastScale.current === 1) {
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          ]).start();
          lastTX.current = 0; lastTY.current = 0;
        } else { lastTX.current = (translateX as any)._value; lastTY.current = (translateY as any)._value; }
      },
    })
  ).current;

  const resetZoom = () => {
    lastScale.current = 1; lastTX.current = 0; lastTY.current = 0;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable onLongPress={resetZoom} style={{ width, height, alignItems: "center", justifyContent: "center" }} {...panResponder.panHandlers}>
      <Animated.View style={{ transform: [{ scale }, { translateX }, { translateY }] }}>
        <FadeImage uri={uri} style={{ width, height: height * 0.85 }} cachePolicy="disk" transition={300} />
      </Animated.View>
    </Pressable>
  );
}

function FoodFullscreenViewer({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const W = Dimensions.get("window").width;
  const H = Dimensions.get("window").height;
  const ref = useRef<any>(null);
  useEffect(() => { ref.current?.scrollTo({ x: startIndex * W, animated: false }); }, [startIndex, W]);
  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose} onDismiss={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.97)" }}>
        <Pressable onPress={onClose} hitSlop={12} style={{ position: "absolute", top: 52, right: 20, zIndex: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={22} color="#FFF" />
        </Pressable>
        {images.length > 1 && (
          <View style={{ position: "absolute", top: 58, left: 0, right: 0, zIndex: 15, alignItems: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "700" }}>{idx + 1} / {images.length}</Text>
          </View>
        )}
        <View style={{ position: "absolute", bottom: 40, left: 0, right: 0, zIndex: 15, alignItems: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Pinch to zoom · Long press to reset</Text>
        </View>
        <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))} style={{ flex: 1 }}>
          {images.map((uri, i) => <FoodZoomableImage key={i} uri={uri} width={W} height={H} />)}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ImageCarousel({ images, height = rs(165), itemWidth, onImagePress }: { images: string[]; height?: number; itemWidth?: number; onImagePress?: (idx: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const w = itemWidth ?? CARD_WIDTH;
  if (!images || images.length === 0) return null;
  if (images.length === 1) return (
    <Pressable onPress={() => onImagePress?.(0)} style={{ width: "100%", height }}>
      <FadeImage uri={images[0]} style={{ width: "100%", height }} cachePolicy="disk" transition={300} />
    </Pressable>
  );
  return (
    <View style={{ width: "100%", height }}>
      <GHFlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / w);
          setActiveIndex(idx);
        }}
        renderItem={({ item, index }) => (
          <Pressable style={{ width: w, height }} onPress={() => onImagePress?.(index)}>
            <FadeImage uri={item} style={{ width: w, height }} cachePolicy="disk" transition={300} />
          </Pressable>
        )}
        getItemLayout={(_, i) => ({ length: w, offset: w * i, index: i })}
      />
      {/* Dot indicators */}
      <View style={carouselSt.dots}>
        {images.map((_, i) => (
          <View key={i} style={[carouselSt.dot, i === activeIndex && carouselSt.dotActive]} />
        ))}
      </View>
      {/* Image counter badge */}
      <View style={carouselSt.counter}>
        <Ionicons name="images-outline" size={10} color="#FFF" />
        <Text style={carouselSt.counterText}>{activeIndex + 1}/{images.length}</Text>
      </View>
    </View>
  );
}

const carouselSt = StyleSheet.create({
  dots: {
    position: "absolute", bottom: rs(8), alignSelf: "center",
    flexDirection: "row", gap: rs(5),
  },
  dot: {
    width: rs(6), height: rs(6), borderRadius: rs(3),
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    backgroundColor: "#FFF", width: rs(18), borderRadius: rs(3),
  },
  counter: {
    position: "absolute", bottom: rs(28), right: rs(8),
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: rs(12),
    paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  counterText: { fontSize: rs(10), fontWeight: "700", color: "#FFF" },
});

export default function FoodScreen() {
  const foodScrollRef = useRef<ScrollView>(null);
  useScrollToTop(foodScrollRef); // re-tap the Food tab → back to top
  const insets = useSafeAreaInsets();
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  // Starts true so a tab that hasn't fetched yet shows skeletons (not "No restaurants") when it peeks in during a tab swipe.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const { city: appCity, hasCity, chooseCity } = useAppCity(() => setCityPickerVisible(true));
  const requestGenRef = useRef(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [fsImages, setFsImages] = useState<string[]>([]);
  const [fsStartIdx, setFsStartIdx] = useState(0);
  const [fsVisible, setFsVisible] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState("");
  const [reviewsList, setReviewsList] = useState<Record<string, RestaurantReview[]>>({});
  const [myRestaurantReviews, setMyRestaurantReviews] = useState<Record<string, RestaurantReview | null>>({});
  const [reviewEditMode, setReviewEditMode] = useState<Record<string, boolean>>({});
  const [editRating, setEditRating] = useState<Record<string, number>>({});
  const [editText, setEditText] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("Rating");
  const [reservationRestaurant, setReservationRestaurant] = useState<Restaurant | null>(null);
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [reservationGuests, setReservationGuests] = useState("2");
  const [reservationNote, setReservationNote] = useState("");
  const [reservationSubmitted, setReservationSubmitted] = useState(false);
  const [reservationErrors, setReservationErrors] = useState<{ date?: string; time?: string; partySize?: string }>({}); // SPRINT-29
  const [reservationSubmitting, setReservationSubmitting] = useState(false); // SPRINT-29
  const [reportSheetId, setReportSheetId] = useState<string | null>(null);
  const [reportOtherText, setReportOtherText] = useState("");
  const [reportOtherFocused, setReportOtherFocused] = useState(false);

  const submitRestaurantReport = useCallback(async (restaurantId: string, reason: string) => {
    setReportSheetId(null);
    setReportOtherText("");
    setReportOtherFocused(false);
    if (!requireAuth(undefined, "Sign in to report this restaurant.")) return;
    try {
      await reportRestaurant(restaurantId, reason);
      showToast("Report submitted. Thank you for helping keep the community safe.", "success");
    } catch {
      showToast("Could not report. Please try again.", "error");
    }
  }, [requireAuth]);

  const loadRestaurants = useCallback(async (opts?: { page?: number }) => {
    if (!hasCity) {
      setRestaurants([]);
      setHasMore(false);
      return;
    }
    const targetPage = opts?.page ?? 1;
    const gen = ++requestGenRef.current;
    const res = await getRestaurants({
      page: targetPage,
      limit: 20,
      city: appCity,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(cuisine && cuisine !== "All" ? { cuisine } : {}),
    });
    if (gen !== requestGenRef.current) return; // superseded by a newer search/city request
    const list = Array.isArray(res?.data) ? res.data : [];
    setRestaurants((prev) => (targetPage > 1 ? [...prev, ...list.filter((n) => !prev.some((o) => o.id === n.id))] : list));
    setFavorites((prev) => {
      const next = new Set(targetPage > 1 ? prev : []);
      list.filter((x) => x.savedByMe).forEach((x) => next.add(x.id));
      return next;
    });
    setBookmarkedIds((prev) => {
      const next = new Set(targetPage > 1 ? prev : []);
      list.filter((x) => x.isSaved === true).forEach((x) => next.add(x.id));
      return next;
    });
    const meta = (res as any)?.meta;
    setPage(targetPage);
    setHasMore(meta ? targetPage < Number(meta.totalPages ?? 1) : list.length >= 20);
    setLoadError(false);
  }, [hasCity, appCity, debouncedSearch, cuisine]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const queryMountedRef = useRef(false);
  useEffect(() => {
    if (!queryMountedRef.current) {
      queryMountedRef.current = true;
      return;
    }
    setLoading(true);
    loadRestaurants()
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [loadRestaurants]);

  const foodEverLoadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // SPRINT-27: 10-minute stale-while-revalidate gate
      // The gate only applies once this instance has data — a remounted screen must refetch.
      if (foodEverLoadedRef.current && !useListFetchCacheStore.getState().shouldFetch("food")) return undefined;
      let cancelled = false;
      const silent = foodEverLoadedRef.current;
      const cancelDefer = runAfterTransition(() => {
        if (cancelled) return;
        void (async () => {
          try {
            if (!silent) setLoading(true);
            await loadRestaurants();
            foodEverLoadedRef.current = true;
            useListFetchCacheStore.getState().markFetched("food");
          } catch {
            setLoadError(true);
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
      });
      return () => {
        cancelled = true;
        cancelDefer();
      };
    }, [loadRestaurants]),
  );

  useEffect(() => {
    const raw = params.openRestaurant;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || openedRestaurantRef.current === id) return;
    openedRestaurantRef.current = id;
    (async () => {
      try {
        const r = await getRestaurant(id);
        setSelectedRestaurant(r);
        if (r.isSaved === true) {
          setBookmarkedIds((p) => {
            const n = new Set(p);
            n.add(r.id);
            return n;
          });
        }
      } catch {
        showToast("This place may have been removed.", "error");
      }
    })();
  }, [params.openRestaurant]);

  useEffect(() => {
    const r = selectedRestaurant;
    const id = r?.id;
    if (!id) return;
    void getReviews(id)
      .then((list) => {
        setReviewsList((prev) => ({ ...prev, [id]: list }));
        const mine = user?.id
          ? list.find((rv) => String(rv.author.id) === String(user.id)) ?? null
          : null;
        setMyRestaurantReviews((prev) => ({ ...prev, [id]: mine }));
      })
      .catch(() => {
        setReviewsList((prev) => ({ ...prev, [id]: [] }));
        setMyRestaurantReviews((prev) => ({ ...prev, [id]: null }));
      });
  }, [selectedRestaurant?.id, user?.id]);

  const onRefresh = useCallback(() => {
    useListFetchCacheStore.getState().clearFetchTimestamp("food"); // SPRINT-27
    (async () => {
      try {
        setRefreshing(true);
        setSearch("");
        setCuisine(null);
        setActiveTab("all");
        setSelectedRestaurant(null);
        setReviewText("");
        await loadRestaurants();
      } finally {
        setRefreshing(false);
      }
    })();
  }, [loadRestaurants]);

  const confirmDeleteRestaurant = useCallback((id: string) => {
    appAlert("Delete this restaurant?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRestaurant(id);
            setRestaurants((prev) => prev.filter((r) => r.id !== id));
            setSelectedRestaurant(null);
            setFavorites((prev) => {
              const n = new Set(prev);
              n.delete(id);
              return n;
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Restaurant deleted.", "success");
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : "Could not delete. Try again.", "error");
          }
        },
      },
    ]);
  }, []);

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
      setSelectedRestaurant((sr) => (sr && sr.id === id ? { ...sr, isSaved: saved } : sr));
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

  // ── Card gestures: double-tap photo → favorite (heart burst); long-press card → quick actions ──
  const burstAnim = useRef(new Animated.Value(0)).current;
  const [burstId, setBurstId] = useState<string | null>(null);
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
      setBurstId(r.id);
      burstAnim.setValue(0);
      Animated.sequence([
        Animated.spring(burstAnim, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 12 }),
        Animated.delay(380),
        Animated.timing(burstAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setBurstId(null));
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
    else if (choice === "open") setSelectedRestaurant(r);
  };

  const handleShare = async (r: Restaurant) => {
    try {
      const link = getShareLink("restaurant", r.id);
      await Share.share({
        title: r.name,
        message: `Check out ${r.name} — ${r.cuisine} cuisine, ${r.rating}⭐ rating! ${r.distance} away. Found on ComLinkr 🍽️\n\n${link}`,
        ...(Platform.OS === "ios" ? { url: link } : {}),
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
      if (Platform.OS === "ios") {
        url = `maps://app?ll=${lat},${lng}&q=${encodeURIComponent(r.name)}`;
      } else if (Platform.OS === "android") {
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

  const handleCall = (r: Restaurant) => {
    const phone = (r.phone || r.phoneNumber || "").trim();
    if (!phone) {
      appAlert(r.name, `${r.name} has not listed a phone number.`);
      return;
    }
    const dial = phone.replace(/[^\d+]/g, "");
    if (!dial) {
      appAlert("Call " + r.name, phone);
      return;
    }
    void (async () => {
      try {
        await Linking.openURL(`tel:${dial}`);
      } catch {
        appAlert("Call " + r.name, phone);
      }
    })();
  };

  const handleOrder = (r: Restaurant) => {
    const phone = (r.phone || r.phoneNumber || "").trim();
    if (phone) {
      const dial = phone.replace(/[^\d+]/g, "");
      void Linking.openURL(`tel:${dial}`).catch(() => appAlert(r.name, `Call to order: ${phone}`));
    } else if (r.website) {
      void Linking.openURL(r.website).catch(() => appAlert("Order from " + r.name, "Visit their website to place an order."));
    } else {
      appAlert("Order from " + r.name, "Contact this restaurant directly to place an order.", [{ text: "OK" }]);
    }
  };

  const handleReserve = (r: Restaurant) => {
    if (!requireAuth(undefined, "Sign in to reserve a table.")) return;
    setSelectedRestaurant(r);
    setReservationRestaurant(r);
    setReservationDate("");
    setReservationTime("");
    setReservationGuests("2");
    setReservationNote("");
    setReservationSubmitted(false);
    setReservationErrors({}); // SPRINT-29
    setReservationSubmitting(false);
  };

  const submitReviewForRestaurant = async (r: Restaurant) => {
    if (!reviewText.trim()) return;
    if (!requireAuth(undefined, "Sign in to share your review.")) return;
    const rating = userRatings[r.id] || 5;
    try {
      const created = await submitReview(r.id, { rating, content: reviewText.trim() });
      const [fresh, remote] = await Promise.all([getRestaurant(r.id), getReviews(r.id)]);
      setSelectedRestaurant(fresh);
      setReviewsList((prev) => ({ ...prev, [r.id]: remote }));
      setMyRestaurantReviews((prev) => ({ ...prev, [r.id]: created }));
      setReviewText("");
      setUserRatings((prev) => ({ ...prev, [r.id]: created.rating }));
      showToast("Thanks for sharing your experience.", "success");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        try {
          const [fresh, remote] = await Promise.all([getRestaurant(r.id), getReviews(r.id)]);
          setSelectedRestaurant(fresh);
          setReviewsList((prev) => ({ ...prev, [r.id]: remote }));
          const mine = user?.id
            ? remote.find((rv) => String(rv.author.id) === String(user.id)) ?? null
            : null;
          if (mine) {
            setMyRestaurantReviews((prev) => ({ ...prev, [r.id]: mine }));
            setUserRatings((prev) => ({ ...prev, [r.id]: mine.rating }));
            setReviewText("");
            setReviewEditMode((prev) => ({ ...prev, [r.id]: false }));
            showToast("You already reviewed this place — tap the pencil icon to edit it.", "info");
          } else {
            showToast(e.message, "error");
          }
        } catch {
          showToast(e instanceof ApiError ? e.message : "Please try again.", "error");
        }
        return;
      }
      showToast(e instanceof ApiError ? e.message : "Could not submit review. Please try again.", "error");
    }
  };

  const saveReviewEdits = async (r: Restaurant) => {
    const id = r.id;
    const mine = myRestaurantReviews[id];
    if (!mine) return;
    const rating = editRating[id] ?? mine.rating;
    const prevText = (mine.text || mine.content || "").trim();
    const textVal = (editText[id] ?? "").trim();
    const payload: { rating?: number; content?: string } = {};
    if (rating !== mine.rating) payload.rating = rating;
    if (textVal !== prevText) payload.content = textVal;
    if (Object.keys(payload).length === 0) {
      setReviewEditMode((prev) => ({ ...prev, [id]: false }));
      return;
    }
    try {
      const updated = await updateReview(id, payload);
      const [fresh, remote] = await Promise.all([getRestaurant(r.id), getReviews(r.id)]);
      setSelectedRestaurant(fresh);
      setReviewsList((prev) => ({ ...prev, [id]: remote }));
      setMyRestaurantReviews((prev) => ({ ...prev, [id]: updated }));
      setReviewEditMode((prev) => ({ ...prev, [id]: false }));
      showToast("Your changes were saved.", "success");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not update review. Please try again.", "error");
    }
  };

  const confirmDeleteMyReview = (r: Restaurant) => {
    const id = r.id;
    appAlert("Delete your review?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteReview(id);
              const [fresh, remote] = await Promise.all([getRestaurant(r.id), getReviews(r.id)]);
              setSelectedRestaurant(fresh);
              setReviewsList((prev) => ({ ...prev, [id]: remote }));
              setMyRestaurantReviews((prev) => ({ ...prev, [id]: null }));
              setReviewEditMode((prev) => ({ ...prev, [id]: false }));
              setEditRating((prev) => ({ ...prev, [id]: 0 }));
              setEditText((prev) => ({ ...prev, [id]: "" }));
              setUserRatings((prev) => ({ ...prev, [id]: 0 }));
              setReviewText("");
              showToast("Review deleted. You can submit a new review anytime.", "success");
            } catch (e) {
              showToast(e instanceof ApiError ? e.message : "Could not delete review. Please try again.", "error");
            }
          })();
        },
      },
    ]);
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
      <AppHeader />
      <ScrollView
        ref={foodScrollRef}
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: tabBarClearance(insets.bottom) }]}
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
        {/* Hero */}
        <LinearGradient
          colors={[Colors.brand.greenDark, Colors.brand.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroRow}>
            <Ionicons name="restaurant-outline" size={rs(12)} color="#86EFAC" />
            <Text style={s.heroLabel}>FOOD & DINING</Text>
          </View>
          <Text style={s.heroTitle}>
            {user?.name?.split(" ")[0] ? `Hi ${user.name.split(" ")[0]},` : "Discover"} Local Flavors
          </Text>
          <Text style={s.heroSub}>
            {hasCity ? `Restaurants, cafes & eateries in ${appCity}` : "Restaurants, cafes & eateries near you"}
          </Text>
        </LinearGradient>

        {/* Search */}
        <View style={[s.searchWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight, paddingRight: rs(8) }]}>
          <Ionicons name="search-outline" size={rs(16)} color={tc.textTertiary} />
          <TextInput
            style={[s.searchInput, { color: tc.textPrimary }]}
            placeholder="Search restaurants, cuisines..."
            placeholderTextColor={tc.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!user?.id) {
                appAlert("Sign in required", "Log in to list your restaurant on ComLinkr.");
                return;
              }
              router.push({ pathname: "/create-post" as any, params: { type: "restaurant" } });
            }}
            style={[s.addRestaurantFab, { width: "auto", minWidth: rs(34), height: rs(34), borderRadius: rs(10), paddingHorizontal: rs(10), flexDirection: "row", gap: rs(4), backgroundColor: Colors.brand.green }]}
            hitSlop={10}
            accessibilityLabel="Add restaurant listing"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={rs(18)} color="#FFF" />
            <Text style={{ color: "#FFF", fontSize: rs(12), fontWeight: "800" }}>Add</Text>
          </Pressable>
        </View>

        {/* View Tabs — hidden */}

        {/* Cuisine Chips — hidden for now */}

        {/* Results row hidden */}

        {!hasCity ? <ListState kind="needs-city" onAction={chooseCity} /> : null}
        {hasCity && loading && restaurants.length === 0 ? <ListState kind="loading" /> : null}
        {hasCity && loadError && restaurants.length === 0 && !loading ? (
          <ListState
            kind="error"
            onAction={() => {
              setLoadError(false);
              setLoading(true);
              loadRestaurants().catch(() => setLoadError(true)).finally(() => setLoading(false));
            }}
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

        {/* Restaurant Cards */}
        {filtered.map((r) => (
          <Pressable key={r.id} onPress={() => setSelectedRestaurant(r)} onLongPress={() => void openCardActions(r)} delayLongPress={350} style={({ pressed }) => [s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, pressed && { opacity: 0.95 }]}>
            {/* ── Full-width image carousel ── */}
            <View>
              <ImageCarousel images={r.images && r.images.length > 0 ? r.images : [r.image]} height={rs(165)}
                onImagePress={(idx) => onCardPhotoPress(r, idx)} />
              {burstId === r.id ? (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: rs(165), alignItems: "center", justifyContent: "center",
                    opacity: burstAnim,
                    transform: [{ scale: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                  }}
                >
                  <Ionicons name="heart" size={64} color="#FFFFFF" />
                </Animated.View>
              ) : null}
              {/* Availability — only claims open/closed when hours and timezone are known */}
              {(() => {
                const av = getAvailability(r);
                return (
                  <View style={[s.statusBadge, av.state === "open" ? s.statusOpen : av.state === "closed" ? s.statusClosed : s.statusNeutral]}>
                    <View style={s.statusDot} />
                    <Text style={s.statusText}>{av.label}</Text>
                  </View>
                );
              })()}
              {/* Bookmark (Saved) + favorite heart */}
              <Pressable style={s.bookmarkIconBtn} accessibilityRole="button" accessibilityLabel={bookmarkedIds.has(r.id) || r.isSaved ? "Remove from saved" : "Save restaurant"} accessibilityState={{ selected: bookmarkedIds.has(r.id) || !!r.isSaved }} onPress={(e) => { e.stopPropagation?.(); void toggleBookmark(r.id); }}>
                <Ionicons
                  name={bookmarkedIds.has(r.id) || r.isSaved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={bookmarkedIds.has(r.id) || r.isSaved ? "#FF7B00" : "#FFF"}
                />
              </Pressable>
              <Pressable style={s.favIconBtn} accessibilityRole="button" accessibilityLabel={favorites.has(r.id) ? "Remove from favorites" : "Add to favorites"} accessibilityState={{ selected: favorites.has(r.id) }} onPress={(e) => { e.stopPropagation?.(); void toggleFav(r.id); }}>
                <Ionicons
                  name={favorites.has(r.id) ? "heart" : "heart-outline"}
                  size={18}
                  color={favorites.has(r.id) ? "#EF4444" : "#FFF"}
                />
              </Pressable>
              {/* Price badge removed — dollar signs were visually noisy */}
            </View>

            {/* ── Card body ── */}
            <View style={s.cardBody}>
              {/* Name + verified */}
              <View style={s.cardNameRow}>
                <Text style={[s.cardName, isDark && { color: tc.textPrimary }]}>{r.name}</Text>
                {r.verified && (
                  <View style={[s.vBadge, isDark && { backgroundColor: Colors.brand.green + "25" }]}>
                    <Ionicons name="shield-checkmark" size={10} color={Colors.brand.green} />
                    <Text style={[s.vText, isDark && { color: Colors.brand.green }]}>Verified</Text>
                  </View>
                )}
              </View>
              <Text style={[s.cardCuisine, { color: tc.textSecondary }]}>{r.cuisine}</Text>

              {/* Rating + price + distance + wait */}
              <View style={s.infoRow}>
                <View style={[s.ratingChip, { backgroundColor: isDark ? tc.inputBg : "#FFF8E6" }]}>
                  <Ionicons name="star" size={12} color={(r.reviews ?? 0) > 0 ? "#F59E0B" : tc.textTertiary} />
                  {(r.reviews ?? 0) > 0 ? (
                    <>
                      <Text style={[s.ratingNum, isDark && { color: tc.textPrimary }]}>{r.rating}</Text>
                      <Text style={[s.reviewCount, isDark && { color: tc.textTertiary }]}>({r.reviews})</Text>
                    </>
                  ) : (
                    <Text style={[s.reviewCount, { color: tc.textTertiary }]}>No reviews yet</Text>
                  )}
                </View>
                {r.price ? (
                  <View style={[s.priceChip, { backgroundColor: isDark ? tc.inputBg : "#F0FDF4" }]}>
                    <Text style={[s.priceText, isDark && { color: Colors.brand.green }]}>{getDisplayPrice(r, countryCode)}</Text>
                  </View>
                ) : null}
                {hasDistance(r) ? (
                  <View style={[s.distChip, { backgroundColor: isDark ? tc.inputBg : "#F3F4F6" }]}>
                    <Ionicons name="location-outline" size={11} color={isDark ? tc.textTertiary : Colors.text.tertiary} />
                    <Text style={[s.metaText, isDark && { color: tc.textSecondary }]}>{r.distance}</Text>
                  </View>
                ) : null}
                {r.waitTime && (
                  <View style={[s.waitChip, { backgroundColor: isDark ? "#2A1A00" : "#FFF3E6" }]}>
                    <Ionicons name="time-outline" size={11} color="#FF7B00" />
                    <Text style={s.waitText}>{r.waitTime} wait</Text>
                  </View>
                )}
              </View>

              {/* Service options */}
              <View style={s.servicesRow}>
                {safeList(r.services).map((sv, i) => (
                  <View key={`${r.id}-service-${i}-${itemLabel(sv)}`} style={[s.serviceChip, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                    <Text style={[s.serviceText, isDark && { color: Colors.brand.green }]}>{itemLabel(sv)}</Text>
                  </View>
                ))}
              </View>

              {/* Popular dishes */}
              {safeList(r.popularDishes).length > 0 ? (
                <View style={s.dishesRow}>
                  <Ionicons name="flame-outline" size={12} color="#FF7B00" />
                  <Text style={s.dishesLabel}>Popular: </Text>
                  <Text style={[s.dishesText, { color: tc.textSecondary }]} numberOfLines={1}>
                    {safeList(r.popularDishes).map(itemLabel).join(" · ")}
                  </Text>
                </View>
              ) : null}

              {/* Tags + action buttons */}
              <View style={[s.cardMeta, { borderTopColor: tc.borderLight }]}>
                <View style={s.cardTags}>
                  {safeList(r.tags).slice(0, 2).map((t, i) => (
                    <View key={`${r.id}-tag-${i}-${itemLabel(t)}`} style={[s.cardTag, isDark && { backgroundColor: Colors.brand.greenDark + "25", borderWidth: 1, borderColor: Colors.brand.greenDark + "40" }]}><Text style={[s.cardTagText, isDark && { color: Colors.brand.green }]}>{itemLabel(t)}</Text></View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  {!restaurantIsMine(r, user?.id) ? (
                  <Pressable
                    style={[s.reportBtn, isDark && { backgroundColor: tc.inputBg }]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setReportSheetId(r.id);
                    }}
                  >
                    <Ionicons name="flag-outline" size={16} color="#DC2626" />
                  </Pressable>
                  ) : null}
                  <Pressable style={[s.chatBtn, isDark && { backgroundColor: Colors.brand.blue + "25", borderWidth: 1, borderColor: Colors.brand.blue + "40" }]} onPress={(e) => { e.stopPropagation?.(); handleDirections(r); }}>
                    <Ionicons name="navigate-outline" size={14} color={isDark ? "#60A5FA" : Colors.brand.blue} />
                  </Pressable>
                  {hasReservations(r) && (
                    <Pressable
                      style={[s.orderBtn, { backgroundColor: Colors.brand.green }]}
                      onPress={(e) => { e.stopPropagation?.(); handleReserve(r); }}
                    >
                      <Ionicons name="calendar-outline" size={rs(12)} color="#FFF" />
                      <Text style={s.orderBtnText}>Reserve</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        ))}

        {hasCity && hasMore && filtered.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load more restaurants"
            disabled={loadingMore}
            onPress={() => {
              setLoadingMore(true);
              loadRestaurants({ page: page + 1 })
                .catch(() => showToast("Could not load more restaurants.", "error"))
                .finally(() => setLoadingMore(false));
            }}
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
      </ScrollView>

      {/* ── Restaurant Detail Modal ── */}
      {selectedRestaurant && (
        <Modal
          visible={!!selectedRestaurant}
          animationType="slide"
          onRequestClose={() => {
            if (reservationRestaurant) {
              setReservationRestaurant(null);
              setReservationSubmitted(false);
              setReservationSubmitting(false);
              setReservationErrors({});
              return;
            }
            setSelectedRestaurant(null); setReviewText(""); setReservationSubmitted(false); setReservationErrors({});
          }}
          onDismiss={() => { setSelectedRestaurant(null); setReviewText(""); setReservationRestaurant(null); setReservationSubmitted(false); setReservationErrors({}); }}
          statusBarTranslucent
        >
          <DismissibleSheet onDismiss={() => { setSelectedRestaurant(null); setReviewText(""); setReservationRestaurant(null); setReservationSubmitted(false); setReservationSubmitting(false); setReservationErrors({}); }} style={{ backgroundColor: tc.cardBg }}>
            {/* Hero */}
            <SheetDragArea style={{ height: 280, position: "relative" }}>
              <ImageCarousel
                images={selectedRestaurant.images && selectedRestaurant.images.length > 0 ? selectedRestaurant.images : [selectedRestaurant.image]}
                height={280}
                itemWidth={SCREEN_WIDTH}
                onImagePress={(idx) => { const imgs = selectedRestaurant.images && selectedRestaurant.images.length > 0 ? selectedRestaurant.images : [selectedRestaurant.image]; setFsImages(imgs); setFsStartIdx(idx); setFsVisible(true); }}
              />
              <LinearGradient colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
              <Pressable style={rdm.backBtn} onPress={() => { setSelectedRestaurant(null); setReviewText(""); setReservationRestaurant(null); setReservationSubmitted(false); setReservationErrors({}); }}>
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </Pressable>
              <View style={rdm.heroTopRight}>
                {restaurantIsMine(selectedRestaurant, user?.id) ? (
                  <Pressable
                    style={rdm.heroActionBtn}
                    onPress={() => confirmDeleteRestaurant(selectedRestaurant.id)}
                    accessibilityLabel="Delete restaurant"
                  >
                    <Ionicons name="trash-outline" size={18} color="#FCA5A5" />
                  </Pressable>
                ) : null}
                <Pressable style={rdm.heroActionBtn} onPress={() => handleShare(selectedRestaurant)}>
                  <Ionicons name="share-outline" size={18} color="#FFF" />
                </Pressable>
                <Pressable style={rdm.heroActionBtn} onPress={() => void toggleBookmark(selectedRestaurant.id)}>
                  <Ionicons
                    name={bookmarkedIds.has(selectedRestaurant.id) || selectedRestaurant.isSaved ? "bookmark" : "bookmark-outline"}
                    size={18}
                    color={bookmarkedIds.has(selectedRestaurant.id) || selectedRestaurant.isSaved ? "#FF7B00" : "#FFF"}
                  />
                </Pressable>
                <Pressable style={rdm.heroActionBtn} onPress={() => void toggleFav(selectedRestaurant.id)}>
                  <Ionicons name={favorites.has(selectedRestaurant.id) ? "heart" : "heart-outline"} size={18} color={favorites.has(selectedRestaurant.id) ? "#EF4444" : "#FFF"} />
                </Pressable>
                {!restaurantIsMine(selectedRestaurant, user?.id) ? (
                  <Pressable
                    style={rdm.heroActionBtn}
                    onPress={() => setReportSheetId(selectedRestaurant.id)}
                  >
                    <Ionicons name="flag-outline" size={18} color="#FCA5A5" />
                  </Pressable>
                ) : null}
              </View>
              <View style={rdm.heroBottom}>
                <View style={{ flexDirection: "row", gap: 7, marginBottom: 8 }}>
                  {(() => {
                    const av = getAvailability(selectedRestaurant);
                    if (av.state === "unknown") return null;
                    const bg = av.state === "open" ? "rgba(22,163,74,0.9)" : av.state === "closed" ? "rgba(220,38,38,0.9)" : "rgba(0,0,0,0.5)";
                    const txt = av.state === "open" ? "Open Now" : av.state === "closed" ? "Closed" : av.label;
                    return (
                      <View style={[rdm.badge, { backgroundColor: bg }]}>
                        <Text style={rdm.badgeText}>{txt}</Text>
                      </View>
                    );
                  })()}
                  <View style={[rdm.badge, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                    <Text style={rdm.badgeText}>{selectedRestaurant.price}</Text>
                  </View>
                  {selectedRestaurant.verified && (
                    <View style={[rdm.badge, { backgroundColor: "rgba(22,163,74,0.9)" }]}>
                      <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                      <Text style={rdm.badgeText}>Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={rdm.heroTitle}>{selectedRestaurant.name}</Text>
                <Text style={rdm.heroCuisine}>{selectedRestaurant.cuisine} Cuisine{hasDistance(selectedRestaurant) ? ` · ${selectedRestaurant.distance}` : ""}</Text>
              </View>
            </SheetDragArea>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Stats row */}
              <View style={[rdm.statsRow, { backgroundColor: isDark ? tc.inputBg : "#F9FAFB" }]}>
                <View style={rdm.statItem}>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                  <Text style={[rdm.statNum, isDark && { color: tc.textPrimary }]}>{(selectedRestaurant.reviews ?? 0) > 0 ? selectedRestaurant.rating : "—"}</Text>
                  <Text style={[rdm.statLbl, isDark && { color: tc.textTertiary }]}>{(selectedRestaurant.reviews ?? 0) > 0 ? `${selectedRestaurant.reviews} reviews` : "No reviews yet"}</Text>
                </View>
                <View style={[rdm.statDiv, isDark && { backgroundColor: tc.borderLight }]} />
                <View style={rdm.statItem}>
                  <Ionicons name="location" size={20} color={Colors.brand.blue} />
                  <Text style={[rdm.statNum, isDark && { color: tc.textPrimary }]}>{hasDistance(selectedRestaurant) ? selectedRestaurant.distance : "—"}</Text>
                  <Text style={[rdm.statLbl, isDark && { color: tc.textTertiary }]}>{hasDistance(selectedRestaurant) ? "Distance" : "Distance unavailable"}</Text>
                </View>
                <View style={[rdm.statDiv, isDark && { backgroundColor: tc.borderLight }]} />
                <View style={rdm.statItem}>
                  <Ionicons name="time" size={20} color="#FF7B00" />
                  <Text style={[rdm.statNum, isDark && { color: tc.textPrimary }]}>{selectedRestaurant.waitTime || "N/A"}</Text>
                  <Text style={[rdm.statLbl, isDark && { color: tc.textTertiary }]}>Wait Time</Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={rdm.section}>
                <Text style={[rdm.sectionTitle, { color: tc.textPrimary }]}>Quick Actions</Text>
                <View style={rdm.quickActionsRow}>
                  <Pressable style={rdm.quickAction} onPress={() => handleDirections(selectedRestaurant)}>
                    <View style={[rdm.quickActionIcon, { backgroundColor: isDark ? tc.inputBg : "#EBF5FF" }]}>
                      <Ionicons name="navigate-outline" size={20} color={Colors.brand.blue} />
                    </View>
                    <Text style={[rdm.quickActionLabel, { color: tc.textSecondary }]}>Directions</Text>
                  </Pressable>
                  <Pressable style={rdm.quickAction} onPress={() => handleCall(selectedRestaurant)}>
                    <View style={[rdm.quickActionIcon, { backgroundColor: isDark ? tc.inputBg : "#F0FDF4" }]}>
                      <Ionicons name="call-outline" size={20} color="#16A34A" />
                    </View>
                    <Text style={[rdm.quickActionLabel, { color: tc.textSecondary }]}>Call</Text>
                  </Pressable>
                  <Pressable style={rdm.quickAction} onPress={() => handleShare(selectedRestaurant)}>
                    <View style={[rdm.quickActionIcon, { backgroundColor: isDark ? tc.inputBg : "#FFF7ED" }]}>
                      <Ionicons name="share-social-outline" size={20} color="#FF7B00" />
                    </View>
                    <Text style={[rdm.quickActionLabel, { color: tc.textSecondary }]}>Share</Text>
                  </Pressable>
                  {hasReservations(selectedRestaurant) && !reservationRestaurant && (
                    <Pressable style={rdm.quickAction} onPress={() => handleReserve(selectedRestaurant)}>
                      <View style={[rdm.quickActionIcon, { backgroundColor: isDark ? tc.inputBg : "#F3E8FF" }]}>
                        <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                      </View>
                      <Text style={[rdm.quickActionLabel, { color: tc.textSecondary }]}>Reserve</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Details */}
              <View style={rdm.section}>
                <Text style={[rdm.sectionTitle, { color: tc.textPrimary }]}>Restaurant Details</Text>
                <View style={rdm.detailGrid}>
                  {[
                    {
                      icon: "time-outline" as const,
                      label: "Hours",
                      value: getAvailability(selectedRestaurant).label,
                      color: getAvailability(selectedRestaurant).state === "open" ? "#16A34A" : getAvailability(selectedRestaurant).state === "closed" ? "#DC2626" : "#6B7280",
                    },
                    {
                      icon: "pricetag-outline" as const,
                      label: typeof selectedRestaurant.avgPricePerPerson === "number" && selectedRestaurant.avgPricePerPerson > 0 ? "Avg Price / Person" : "Price range",
                      value: getDisplayPrice(selectedRestaurant, countryCode),
                      color: Colors.brand.blue,
                    },
                    ...(hasDistance(selectedRestaurant) ? [{ icon: "location-outline" as const, label: "Distance", value: selectedRestaurant.distance, color: "#16A34A" }] : []),
                    { icon: "restaurant-outline" as const, label: "Cuisine", value: selectedRestaurant.cuisine, color: "#8B5CF6" },
                  ].map((d) => (
                    <View key={d.label} style={rdm.detailRow}>
                      <View style={[rdm.detailIconBox, { backgroundColor: `${d.color}15` }]}>
                        <Ionicons name={d.icon} size={16} color={d.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[rdm.detailLabel, { color: tc.textTertiary }]}>{d.label}</Text>
                        <Text style={[rdm.detailValue, { color: tc.textPrimary }]}>{d.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Services */}
              <View style={rdm.section}>
                <Text style={[rdm.sectionTitle, { color: tc.textPrimary }]}>Available Services</Text>
                {safeList(selectedRestaurant.services).length === 0 ? (
                  <Text style={{ fontSize: 13, color: tc.textTertiary }}>No services listed.</Text>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {safeList(selectedRestaurant.services).map((sv, i) => {
                      const label = itemLabel(sv);
                      const iconName = label === "Dine-in" ? "restaurant-outline" : label === "Takeout" ? "bag-handle-outline" : label === "Delivery" ? "bicycle-outline" : "checkmark-circle-outline";
                      const isReserve = label.toLowerCase().includes("reserv");
                      return (
                        <Pressable
                          key={`${selectedRestaurant.id}-service-${i}-${label}`}
                          style={({ pressed }) => [rdm.serviceChip, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, pressed && { opacity: 0.7 }]}
                          onPress={isReserve ? () => handleReserve(selectedRestaurant) : undefined}
                        >
                          <Ionicons name={iconName as any} size={14} color={Colors.brand.green} />
                          <Text style={[rdm.serviceChipText, isDark && { color: Colors.brand.green }]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Popular Dishes */}
              <View style={rdm.section}>
                <Text style={[rdm.sectionTitle, { color: tc.textPrimary }]}>Popular Dishes</Text>
                <View style={{ gap: 8 }}>
                  {safeList(selectedRestaurant.popularDishes).map((dish, i) => (
                    <View key={`${selectedRestaurant.id}-dish-${i}-${itemLabel(dish)}`} style={[rdm.dishRow, { backgroundColor: isDark ? tc.inputBg : "#FFFBF5" }]}>
                      <View style={rdm.dishNum}><Text style={rdm.dishNumText}>{i + 1}</Text></View>
                      <Text style={[rdm.dishName, { color: tc.textPrimary }]}>{itemLabel(dish)}</Text>
                      <Ionicons name="flame" size={14} color="#FF7B00" />
                    </View>
                  ))}
                </View>
              </View>

              {/* Tags */}
              <View style={rdm.section}>
                <Text style={[rdm.sectionTitle, { color: tc.textPrimary }]}>Tags</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {safeList(selectedRestaurant.tags).map((t, i) => (
                    <View key={`${selectedRestaurant.id}-tag-${i}-${itemLabel(t)}`} style={[rdm.tagChip, isDark && { backgroundColor: tc.inputBg }]}><Text style={[rdm.tagChipText, isDark && { color: tc.textSecondary }]}>{itemLabel(t)}</Text></View>
                  ))}
                </View>
              </View>

              {/* Rate & Review */}
              <View style={rdm.section}>
                <Text style={[rdm.sectionTitle, { color: tc.textPrimary }]}>Rate & Review</Text>
                {!restaurantIsMine(selectedRestaurant, user?.id) ? (
                  <>
                    {(() => {
                      const rid = selectedRestaurant.id;
                      const my = myRestaurantReviews[rid];
                      const editing = reviewEditMode[rid] === true;
                      if (my && !editing) {
                        const full = Math.min(5, Math.max(0, Math.floor(my.rating)));
                        return (
                          <View style={[rdm.userReview, { backgroundColor: isDark ? tc.sectionBg : "#F9FAFB", paddingTop: 36 }]}>
                            <View style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 12 }}>
                              <Pressable
                                accessibilityLabel="Edit review"
                                onPress={() => {
                                  setReviewEditMode((p) => ({ ...p, [rid]: true }));
                                  setEditRating((p) => ({ ...p, [rid]: my.rating }));
                                  setEditText((p) => ({ ...p, [rid]: my.text || my.content || "" }));
                                }}
                                hitSlop={8}
                              >
                                <Ionicons name="pencil" size={18} color={Colors.brand.blue} />
                              </Pressable>
                              <Pressable accessibilityLabel="Delete review" onPress={() => confirmDeleteMyReview(selectedRestaurant)} hitSlop={8}>
                                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                              </Pressable>
                            </View>
                            <Text style={{ color: "#F59E0B", marginBottom: 4 }}>
                              {"★".repeat(full)}
                              {"☆".repeat(5 - full)}
                            </Text>
                            <Text style={[rdm.reviewText, { color: tc.textSecondary, marginBottom: 6 }]}>{my.text || my.content}</Text>
                            <Text style={[rdm.reviewTime, { color: tc.textTertiary }]}>{new Date(my.createdAt).toLocaleString()}</Text>
                          </View>
                        );
                      }
                      if (my && editing) {
                        const er = editRating[rid] ?? my.rating;
                        return (
                          <>
                            <View style={rdm.rateRow}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Pressable key={star} onPress={() => setEditRating((p) => ({ ...p, [rid]: star }))}>
                                  <Ionicons name={er >= star ? "star" : "star-outline"} size={32} color="#F59E0B" />
                                </Pressable>
                              ))}
                            </View>
                            <View style={[rdm.reviewInputWrap, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                              <TextInput
                                style={[rdm.reviewInput, { color: tc.textPrimary }]}
                                placeholder="Write your review..."
                                placeholderTextColor={tc.textTertiary}
                                value={editText[rid] ?? ""}
                                onChangeText={(t) => setEditText((p) => ({ ...p, [rid]: t }))}
                                multiline
                              />
                            </View>
                            <Pressable style={rdm.reviewSubmitBtn} onPress={() => void saveReviewEdits(selectedRestaurant)}>
                              <LinearGradient colors={[Colors.brand.green, "#1a8a18"]} style={rdm.reviewSubmitGrad}>
                                <Ionicons name="save-outline" size={14} color="#FFF" />
                                <Text style={rdm.reviewSubmitText}>Save Changes</Text>
                              </LinearGradient>
                            </Pressable>
                            <Pressable style={{ marginBottom: 12 }} onPress={() => setReviewEditMode((p) => ({ ...p, [rid]: false }))}>
                              <Text style={{ color: tc.textTertiary, textAlign: "center", fontSize: 13 }}>Cancel</Text>
                            </Pressable>
                          </>
                        );
                      }
                      return (
                        <>
                          <View style={rdm.rateRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Pressable key={star} onPress={() => setUserRatings((p) => ({ ...p, [rid]: star }))}>
                                <Ionicons
                                  name={(userRatings[rid] || 0) >= star ? "star" : "star-outline"}
                                  size={32}
                                  color="#F59E0B"
                                />
                              </Pressable>
                            ))}
                          </View>
                          <View style={[rdm.reviewInputWrap, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                            <TextInput
                              style={[rdm.reviewInput, { color: tc.textPrimary }]}
                              placeholder="Write your review..."
                              placeholderTextColor={tc.textTertiary}
                              value={reviewText}
                              onChangeText={setReviewText}
                              multiline
                            />
                          </View>
                          <Pressable
                            style={[rdm.reviewSubmitBtn, !reviewText.trim() && { opacity: 0.5 }]}
                            onPress={() => void submitReviewForRestaurant(selectedRestaurant)}
                          >
                            <LinearGradient colors={[Colors.brand.green, "#1a8a18"]} style={rdm.reviewSubmitGrad}>
                              <Ionicons name="send" size={14} color="#FFF" />
                              <Text style={rdm.reviewSubmitText}>Submit Review</Text>
                            </LinearGradient>
                          </Pressable>
                        </>
                      );
                    })()}
                  </>
                ) : null}

                {(reviewsList[selectedRestaurant.id] || [])
                  .filter((rv) => String(rv.author.id) !== String(user?.id))
                  .map((rev) => {
                    const full = Math.min(5, Math.max(0, Math.floor(rev.rating)));
                    return (
                      <View key={rev.id} style={[rdm.userReview, { backgroundColor: isDark ? tc.sectionBg : "#F9FAFB" }]}>
                        <Text style={[rdm.reviewTime, { color: tc.textTertiary, marginBottom: 4, fontWeight: "600" }]}>{rev.author.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Text style={{ color: "#F59E0B" }}>
                            {"★".repeat(full)}
                            {"☆".repeat(5 - full)}
                          </Text>
                          <Text style={[rdm.reviewTime, { color: tc.textTertiary }]}>{new Date(rev.createdAt).toLocaleString()}</Text>
                        </View>
                        <Text style={[rdm.reviewText, { color: tc.textSecondary }]}>{rev.text}</Text>
                      </View>
                    );
                  })}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

            {/* Bottom CTA */}
            {hasReservations(selectedRestaurant) && !reservationRestaurant && (
              <View style={[rdm.ctaBar, { backgroundColor: tc.cardBg, borderTopColor: tc.borderLight, paddingBottom: rs(12) + insets.bottom }]}>
                <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={() => handleReserve(selectedRestaurant)}>
                  <LinearGradient
                    colors={[Colors.brand.green, Colors.brand.greenDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[rdm.ctaOrder, { paddingVertical: 14 }]}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#FFF" />
                    <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 15 }}>Reserve a Table</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* ── Inline Reservation Sheet (avoids nested Modal on iOS) ── */}
            {!!reservationRestaurant && (
              <View style={StyleSheet.absoluteFill}>
                <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]}
                  onPress={() => { setReservationRestaurant(null); setReservationSubmitted(false); setReservationSubmitting(false); setReservationErrors({}); }} />
                <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                  <ScrollView
                    style={{ backgroundColor: tc.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" as any }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: tc.borderLight, alignSelf: "center", marginBottom: 16 }} />
                    {reservationSubmitted ? (
                      <View style={{ alignItems: "center", paddingVertical: 24 }}>
                        <Ionicons name="checkmark-circle" size={56} color={Colors.brand.green} />
                        <Text style={{ fontSize: 18, fontWeight: "800", color: tc.textPrimary, marginTop: 12 }}>Request Sent!</Text>
                        <Text style={{ fontSize: 14, color: tc.textSecondary, textAlign: "center", marginTop: 8 }}>
                          Your reservation request for {reservationGuests} guest{parseInt(reservationGuests, 10) !== 1 ? "s" : ""} at {reservationRestaurant.name} on {reservationDate} at {reservationTime} has been submitted.
                        </Text>
                        <Text style={{ fontSize: 13, color: tc.textTertiary, textAlign: "center", marginTop: 6 }}>
                          The restaurant will confirm your booking shortly.
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                          <Pressable
                            onPress={() => handleCall(reservationRestaurant)}
                            style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, backgroundColor: Colors.brand.green, alignItems: "center" }}
                          >
                            <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 14 }}>Call Restaurant</Text>
                          </Pressable>
                          <Pressable onPress={() => { setReservationRestaurant(null); setReservationSubmitted(false); setReservationSubmitting(false); setReservationErrors({}); }} style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, backgroundColor: isDark ? tc.inputBg : "#F3F4F6", alignItems: "center" }}>
                            <Text style={{ color: tc.textSecondary, fontWeight: "700", fontSize: 14 }}>Done</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={{ fontSize: 17, fontWeight: "800", color: tc.textPrimary, marginBottom: 4 }}>Reserve at {reservationRestaurant.name}</Text>
                        <Text style={{ fontSize: 13, color: tc.textSecondary, marginBottom: 16 }}>{reservationRestaurant.cuisine} · {getDisplayPrice(reservationRestaurant, countryCode)}</Text>

                        <Text style={{ fontSize: 12, fontWeight: "700", color: tc.textTertiary, marginBottom: 6 }}>DATE</Text>
                        <DatePickerField
                          value={reservationDate}
                          onChange={(v) => { setReservationDate(v); setReservationErrors((e) => ({ ...e, date: undefined })); }}
                          placeholder="Select reservation date"
                          accentColor={Colors.brand.green}
                          dateFormat="iso"
                          minimumDate={new Date()}
                          forceDark={isDark}
                          style={{ borderColor: reservationErrors.date ? "#EF4444" : tc.borderLight, backgroundColor: tc.inputBg, marginBottom: 4 }}
                        />
                        {!!reservationErrors.date && <Text style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{reservationErrors.date}</Text>}

                        <Text style={{ fontSize: 12, fontWeight: "700", color: tc.textTertiary, marginBottom: 6, marginTop: 4 }}>TIME</Text>
                        <TimePickerField
                          value={reservationTime}
                          onChange={(v) => { setReservationTime(v); setReservationErrors((e) => ({ ...e, time: undefined })); }}
                          placeholder="HH:MM or select time"
                          accentColor={Colors.brand.green}
                          forceDark={isDark}
                          style={{ borderColor: reservationErrors.time ? "#EF4444" : tc.borderLight, backgroundColor: tc.inputBg, marginBottom: 4 }}
                        />
                        {!!reservationErrors.time && <Text style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{reservationErrors.time}</Text>}

                        <Text style={{ fontSize: 12, fontWeight: "700", color: tc.textTertiary, marginBottom: 6 }}>PARTY SIZE</Text>
                        <TextInput
                          style={{ borderWidth: 1.5, borderColor: reservationErrors.partySize ? "#EF4444" : tc.borderLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: tc.textPrimary, backgroundColor: tc.inputBg, marginBottom: 4 }}
                          placeholder="e.g. 2"
                          placeholderTextColor={tc.textTertiary}
                          value={reservationGuests}
                          onChangeText={(v) => { setReservationGuests(v); setReservationErrors((e) => ({ ...e, partySize: undefined })); }}
                          keyboardType="number-pad"
                        />
                        {!!reservationErrors.partySize && <Text style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{reservationErrors.partySize}</Text>}

                        <Text style={{ fontSize: 12, fontWeight: "700", color: tc.textTertiary, marginBottom: 6 }}>SPECIAL REQUESTS (optional)</Text>
                        <TextInput
                          style={{ borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: tc.textPrimary, backgroundColor: tc.inputBg, minHeight: 72, textAlignVertical: "top", marginBottom: 20 }}
                          placeholder="e.g. window seat, birthday, dietary needs..."
                          placeholderTextColor={tc.textTertiary}
                          value={reservationNote}
                          onChangeText={setReservationNote}
                          maxLength={500}
                          multiline
                        />

                        <Pressable
                          disabled={reservationSubmitting}
                          onPress={() => {
                            const errors: { date?: string; time?: string; partySize?: string } = {};
                            const apiDate = toApiDate(reservationDate);
                            if (!apiDate) errors.date = "Please select a valid date.";
                            const apiTime = toApiTime(reservationTime);
                            if (!apiTime) errors.time = "Please enter a valid time (HH:MM).";
                            const g = parseInt(reservationGuests, 10);
                            if (!g || g < 1 || g > 20) errors.partySize = "Party size must be between 1 and 20.";
                            if (Object.keys(errors).length > 0) { setReservationErrors(errors); return; }
                            if (!reservationRestaurant) return;
                            setReservationSubmitting(true);
                            void (async () => {
                              try {
                                await createReservation(reservationRestaurant.id, {
                                  date: apiDate!,
                                  time: apiTime!,
                                  partySize: g,
                                  note: reservationNote.trim() || undefined,
                                });
                                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                setReservationSubmitted(true);
                              } catch (e) {
                                showToast(e instanceof ApiError ? e.message : "Could not reserve. Please try again.", "error");
                              } finally {
                                setReservationSubmitting(false);
                              }
                            })();
                          }}
                          style={{ borderRadius: 14, overflow: "hidden", opacity: reservationSubmitting ? 0.7 : 1 }}
                        >
                          <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 15, alignItems: "center" }}>
                            {reservationSubmitting ? (
                              <ActivityIndicator color="#FFF" />
                            ) : (
                              <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 15 }}>Confirm Reservation</Text>
                            )}
                          </LinearGradient>
                        </Pressable>
                      </>
                    )}
                  </ScrollView>
                </KeyboardAvoidingView>
              </View>
            )}
          </DismissibleSheet>
        </Modal>
      )}

      {/* ── Report Sheet ── */}
      <Modal
        visible={!!reportSheetId}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => { setReportSheetId(null); setReportOtherText(""); setReportOtherFocused(false); }}
        onDismiss={() => { setReportSheetId(null); setReportOtherText(""); setReportOtherFocused(false); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setReportSheetId(null); setReportOtherText(""); setReportOtherFocused(false); }} />
          <View style={{ backgroundColor: tc.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: tc.borderLight, alignSelf: "center", marginTop: 12, marginBottom: 16 }} />
            <Text style={{ fontSize: 15, fontWeight: "800", color: tc.textPrimary, paddingHorizontal: 20, marginBottom: 4 }}>Report Restaurant</Text>
            <Text style={{ fontSize: 13, color: tc.textSecondary, paddingHorizontal: 20, marginBottom: 14 }}>Why are you reporting this listing?</Text>
            {REPORT_REASONS.map((reason) => (
              <View key={reason}>
                <Pressable
                  onPress={() => {
                    if (reason === "Other") { setReportOtherFocused(true); return; }
                    if (reportSheetId) void submitRestaurantReport(reportSheetId, reason);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", gap: 12,
                    paddingHorizontal: 20, paddingVertical: 14,
                    backgroundColor: (pressed || (reason === "Other" && reportOtherFocused)) ? (isDark ? "#1A1A2E" : "#F5F7FA") : "transparent",
                    borderBottomWidth: reason === "Other" ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: tc.borderLight,
                  })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="flag" size={16} color="#DC2626" />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: tc.textPrimary, flex: 1 }}>{reason}</Text>
                  {reason === "Other" && <Ionicons name="chevron-down" size={14} color={tc.textTertiary} />}
                </Pressable>
                {reason === "Other" && (
                  <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                    <TextInput
                      style={{
                        borderWidth: 1.5,
                        borderColor: reportOtherFocused ? "#DC2626" : tc.borderLight,
                        borderRadius: 12,
                        paddingHorizontal: 14, paddingVertical: 10,
                        fontSize: 14, color: tc.textPrimary, backgroundColor: tc.inputBg,
                        minHeight: 72, textAlignVertical: "top",
                      }}
                      placeholder="Describe your reason..."
                      placeholderTextColor={tc.textTertiary}
                      value={reportOtherText}
                      onChangeText={setReportOtherText}
                      onFocus={() => setReportOtherFocused(true)}
                      onBlur={() => setReportOtherFocused(false)}
                      multiline
                      maxLength={300}
                    />
                    <Pressable
                      onPress={() => {
                        if (!reportOtherText.trim()) {
                          showToast("Please describe your reason before submitting.", "error");
                          return;
                        }
                        if (reportSheetId) void submitRestaurantReport(reportSheetId, `Other: ${reportOtherText.trim()}`);
                        setReportOtherText("");
                        setReportOtherFocused(false);
                      }}
                      style={{ marginTop: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}>Submit Report</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
            <Pressable
              onPress={() => { setReportSheetId(null); setReportOtherText(""); setReportOtherFocused(false); }}
              style={{ marginTop: 8, marginHorizontal: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: isDark ? tc.inputBg : "#F3F4F6", alignItems: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: tc.textSecondary }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {fsVisible && fsImages.length > 0 && (
        <FoodFullscreenViewer images={fsImages} startIndex={fsStartIdx} onClose={() => setFsVisible(false)} />
      )}
      <GuestCityPickerModal visible={cityPickerVisible} onClose={() => setCityPickerVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  hero: { marginHorizontal: rs(16), marginTop: rs(12), marginBottom: 0, borderRadius: rs(18), paddingHorizontal: rs(18), paddingVertical: rs(14), overflow: "hidden", shadowColor: Colors.brand.green, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  heroDecor1: { display: "none" },
  heroDecor2: { display: "none" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: rs(6), marginBottom: rs(4) },
  heroLabel: { fontSize: rs(10), fontWeight: "800", color: "#86EFAC", letterSpacing: 2 },
  heroTitle: { fontSize: rs(20), fontWeight: "900", color: "#FFF", letterSpacing: -0.4 },
  heroSub: { fontSize: rs(12.5), color: "rgba(255,255,255,0.85)", marginTop: rs(3), fontWeight: "500" },

  searchWrap: { flexDirection: "row", alignItems: "center", gap: rs(10), marginHorizontal: rs(16), marginTop: rs(10), marginBottom: rs(10), backgroundColor: "#FFF", borderRadius: rs(14), borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: rs(14), height: rs(44) },
  searchInput: { flex: 1, fontSize: rs(14), color: Colors.text.primary, fontWeight: "400" },

  tabScroll: { marginTop: rs(12) },
  tab: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: "#F3F4F6", borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(7), marginRight: rs(8) },
  tabActive: { backgroundColor: Colors.brand.greenDark },
  tabText: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary },
  tabTextActive: { color: "#FFF", fontWeight: "700" },
  tabBadge: { backgroundColor: "rgba(0,0,0,0.06)", borderRadius: rs(6), paddingHorizontal: rs(5), paddingVertical: rs(1) },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  tabBadgeText: { fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary },

  cuisineScroll: { marginTop: rs(10) },
  cuisineChip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(7), marginRight: rs(8), backgroundColor: "#FFF" },
  cuisineChipActive: { borderColor: Colors.brand.green, backgroundColor: Colors.brand.greenLight },
  cuisineText: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary },
  cuisineTextActive: { color: Colors.brand.greenDark, fontWeight: "700" },

  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    marginTop: rs(10),
    marginBottom: rs(8),
    gap: rs(8),
  },
  resultsCount: {
    fontSize: rs(12),
    fontWeight: "600",
    color: Colors.text.tertiary,
    flex: 1,
  },
  resultCount: { fontSize: rs(13), fontWeight: "500", color: Colors.text.tertiary, flex: 1 },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(8),
    paddingVertical: rs(5),
    borderRadius: rs(10),
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sortChipActive: {
    backgroundColor: Colors.brand.green + "18",
    borderColor: Colors.brand.green,
  },
  sortChipText: {
    fontSize: rs(10),
    fontWeight: "600",
    color: Colors.text.tertiary,
  },
  sortChipTextActive: {
    color: Colors.brand.greenDark,
  },
  addRestaurantFab: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.green,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addRestaurantFabGrad: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(10),
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    marginHorizontal: rs(16), marginBottom: rs(14), backgroundColor: "#FFF",
    borderRadius: rs(18), overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: "#F0F2F5",
  },

  // Image area
  cardImage: { width: "100%", height: rs(165) },
  statusBadge: {
    position: "absolute", top: rs(10), left: rs(10),
    flexDirection: "row", alignItems: "center", gap: rs(5),
    paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(10),
  },
  statusOpen: { backgroundColor: "rgba(22,163,74,0.9)" },
  statusNeutral: { backgroundColor: "rgba(55,65,81,0.9)" },
  statusClosed: { backgroundColor: "rgba(220,38,38,0.9)" },
  statusDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: "#FFF", opacity: 0.85 },
  statusText: { fontSize: rs(11), fontWeight: "700", color: "#FFF" },
  bookmarkIconBtn: {
    position: "absolute", top: rs(10), right: rs(48),
    width: rs(34), height: rs(34), borderRadius: rs(17),
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  favIconBtn: {
    position: "absolute", top: rs(10), right: rs(10),
    width: rs(34), height: rs(34), borderRadius: rs(17),
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  priceOverlay: {
    position: "absolute", bottom: rs(10), right: rs(10),
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: rs(9), paddingVertical: rs(4), borderRadius: rs(8),
  },
  priceOverlayText: { fontSize: rs(12), fontWeight: "800", color: "#FFF" },

  // Card body
  cardBody: { padding: rs(14) },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: rs(7), marginBottom: rs(2) },
  cardName: { fontSize: rs(16), fontWeight: "800", color: Colors.text.primary, flex: 1 },
  vBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(3),
    backgroundColor: "#DCFCE7", paddingHorizontal: rs(7), paddingVertical: rs(3), borderRadius: rs(8),
  },
  vText: { fontSize: rs(10), fontWeight: "700", color: Colors.brand.green },
  cardCuisine: { fontSize: rs(12), color: Colors.text.secondary, marginBottom: rs(8) },

  // Rating + info row
  infoRow: { flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10), flexWrap: "wrap" },
  ratingChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "#FFF8E6", borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  ratingNum: { fontSize: rs(13), fontWeight: "700", color: Colors.text.primary },
  reviewCount: { fontSize: rs(11), color: Colors.text.tertiary },
  distChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "#F3F4F6", borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  metaText: { fontSize: rs(11), fontWeight: "600", color: Colors.text.secondary },
  waitChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "#FFF3E6", borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  waitText: { fontSize: rs(11), fontWeight: "600", color: "#FF7B00" },
  priceChip: {
    borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
    backgroundColor: "#F0FDF4",
  },
  priceText: { fontSize: rs(12), fontWeight: "800", color: Colors.brand.greenDark },

  // Services row
  servicesRow: { flexDirection: "row", gap: rs(6), marginBottom: rs(8), flexWrap: "wrap" },
  serviceChip: {
    borderWidth: 1, borderColor: Colors.brand.greenLight,
    borderRadius: rs(7), paddingHorizontal: rs(9), paddingVertical: rs(3),
    backgroundColor: "#FAFFFC",
  },
  serviceText: { fontSize: rs(10), fontWeight: "700", color: Colors.brand.greenDark },

  // Popular dishes
  dishesRow: { flexDirection: "row", alignItems: "center", gap: rs(4), marginBottom: rs(10) },
  dishesLabel: { fontSize: rs(11), fontWeight: "700", color: "#FF7B00" },
  dishesText: { fontSize: rs(11), color: Colors.text.secondary, flex: 1 },

  // Bottom row: tags + actions
  cardMeta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: rs(10), borderTopWidth: 1, borderTopColor: "#F3F4F6",
  },
  cardTags: { flexDirection: "row", gap: rs(6), flexWrap: "wrap" },
  cardTag: { backgroundColor: Colors.brand.greenLight, borderRadius: rs(6), paddingHorizontal: rs(7), paddingVertical: rs(3) },
  cardTagText: { fontSize: rs(10), fontWeight: "600", color: Colors.brand.greenDark },
  reportBtn: {
    width: rs(30), height: rs(30), borderRadius: rs(8),
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  chatBtn: {
    width: rs(34), height: rs(34), borderRadius: rs(10),
    backgroundColor: Colors.brand.blueLight,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "transparent",
  },
  orderBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(5),
    paddingHorizontal: rs(12), paddingVertical: rs(8), borderRadius: rs(10),
  },
  orderBtnText: { fontSize: rs(12), fontWeight: "700", color: "#FFF" },

  empty: { alignItems: "center", paddingVertical: rs(40), marginHorizontal: rs(16) },
  emptyTitle: { fontSize: rs(15), fontWeight: "600", marginTop: rs(12) },
  emptyDesc: { fontSize: rs(13), marginTop: rs(4), textAlign: "center" },
});

/* ── Restaurant Detail Modal Styles ────────────────────────── */
const rdm = StyleSheet.create({
  backBtn: {
    position: "absolute", top: 50, left: 16, width: 38, height: 38,
    borderRadius: 12, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  heroTopRight: {
    position: "absolute", top: 50, right: 16, flexDirection: "row", gap: 10,
  },
  heroActionBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  heroBottom: { position: "absolute", bottom: 16, left: 16, right: 16 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  heroCuisine: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    backgroundColor: "#F9FAFB", borderRadius: 16, paddingVertical: 16, marginVertical: 16,
  },
  statItem: { alignItems: "center", gap: 4 },
  statNum: { fontSize: 18, fontWeight: "800", color: Colors.text.primary },
  statLbl: { fontSize: 11, color: Colors.text.tertiary },
  statDiv: { width: 1, height: 32, backgroundColor: "#E5E7EB" },

  // Section
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: Colors.text.primary, marginBottom: 12 },

  // Quick Actions
  quickActionsRow: { flexDirection: "row", justifyContent: "space-around" },
  quickAction: { alignItems: "center", gap: 8 },
  quickActionIcon: {
    width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  quickActionLabel: { fontSize: 11, fontWeight: "600", color: Colors.text.secondary },

  // Detail grid
  detailGrid: { gap: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  detailLabel: { fontSize: 11, color: Colors.text.tertiary },
  detailValue: { fontSize: 14, fontWeight: "600", color: Colors.text.primary },

  // Services
  serviceChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  serviceChipText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },

  // Popular dishes
  dishRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFBF5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  dishNum: {
    width: 24, height: 24, borderRadius: 8, backgroundColor: "#FF7B00",
    alignItems: "center", justifyContent: "center",
  },
  dishNumText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  dishName: { fontSize: 14, fontWeight: "600", color: Colors.text.primary, flex: 1 },

  // Tags
  tagChip: { backgroundColor: Colors.brand.blueLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagChipText: { fontSize: 12, fontWeight: "600", color: Colors.brand.blue },

  // Rate & Review
  rateRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  reviewInputWrap: {
    borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  reviewInput: { fontSize: 14, minHeight: 72, textAlignVertical: "top", lineHeight: 20 },
  reviewSubmitBtn: { borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  reviewSubmitGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 12,
  },
  reviewSubmitText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  userReview: {
    backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 8,
  },
  reviewTime: { fontSize: 11, color: Colors.text.tertiary },
  reviewText: { fontSize: 13, color: Colors.text.secondary },

  // Bottom CTA bar
  ctaBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#F3F4F6", backgroundColor: "#FFF",
  },
  ctaReserve: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1.5, borderColor: Colors.brand.blue, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  ctaReserveFull: { flex: 1, justifyContent: "center" },
  ctaReserveText: { fontSize: 14, fontWeight: "700", color: Colors.brand.blue },
  ctaOrder: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  ctaOrderText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});
