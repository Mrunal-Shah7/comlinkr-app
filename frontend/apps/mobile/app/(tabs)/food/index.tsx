import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { FullscreenImageViewer } from "../../../src/features/housing/components/ImageViewer";
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { BentoTile, Chip, GradientButton, GradientFill, PressableScale, Reveal, TileIn, TileLabel } from "../../../src/shared/d";
import { DSheet } from "../../../src/shared/d/Sheet";
import { StarPicker } from "../../../src/shared/d/StarPicker";
import { GRADIENT, TYPE } from "../../../src/theme/d";
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
  KeyboardAvoidingView,
  useWindowDimensions,
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
import { queryKeys } from "../../../src/services/cache/queryKeys";
import { LIST_STALE_MS } from "../../../src/services/cache/queryClient";
import { useInfiniteScreenQuery } from "../../../src/hooks/useInfiniteScreenQuery";
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



/** The shared design D gallery (black, 1 of n, swipe down to close). */
function FoodFullscreenViewer({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  return <FullscreenImageViewer images={images} startIndex={startIndex} onClose={onClose} />;
}

function ImageCarousel({ images, height = rs(165), itemWidth, onImagePress }: { images: string[]; height?: number; itemWidth?: number; onImagePress?: (idx: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width: windowW } = useWindowDimensions();
  const w = itemWidth ?? windowW - rs(32);
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

const EMPTY_RESTAURANTS: Restaurant[] = [];
const restaurantId = (r: Restaurant) => r.id;

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
    (async () => {
      try {
        setRefreshing(true);
        setSearch("");
        setCuisine(null);
        setActiveTab("all");
        setSelectedRestaurant(null);
        setReviewText("");
        await foodQ.refetch();
      } finally {
        setRefreshing(false);
      }
    })();
  }, [foodQ.refetch]);

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
    else if (choice === "open") setSelectedRestaurant(r);
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

  const [rateFor, setRateFor] = useState<string | null>(null);

  const submitReviewForRestaurant = async (r: Restaurant) => {
    const rating = userRatings[r.id] || 0;
    if (!rating) return;
    if (!requireAuth(undefined, "Sign in to share your review.")) return;
    try {
      const created = await submitReview(r.id, { rating, content: reviewText.trim() || undefined });
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
                  <BentoTile onPress={() => setSelectedRestaurant(pick)} style={{ minHeight: 190, justifyContent: "flex-end" }} accessibilityLabel={`Pick of the week: ${pick.name}`}>
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
                  <PressableScale key={r.id} outerStyle={{ flex: 1 }} onPress={() => setSelectedRestaurant(r)} onLongPress={() => void openCardActions(r)} delayLongPress={350} accessibilityRole="button" accessibilityLabel={r.name}>
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
          <DismissibleSheet onDismiss={() => { setSelectedRestaurant(null); setReviewText(""); setReservationRestaurant(null); setReservationSubmitted(false); setReservationSubmitting(false); setReservationErrors({}); }} style={{ backgroundColor: tc.pageBg }}>
            {/* ── Photos with glass buttons (design D, plan 01) ── */}
            <SheetDragArea style={{ height: 350, position: "relative" }}>
              <ImageCarousel
                images={selectedRestaurant.images && selectedRestaurant.images.length > 0 ? selectedRestaurant.images : [selectedRestaurant.image]}
                height={350}
                itemWidth={windowWidth}
                onImagePress={(idx) => { const imgs = selectedRestaurant.images && selectedRestaurant.images.length > 0 ? selectedRestaurant.images : [selectedRestaurant.image]; setFsImages(imgs); setFsStartIdx(idx); setFsVisible(true); }}
              />
              {(() => {
                const r = selectedRestaurant;
                const saved = bookmarkedIds.has(r.id) || !!r.isSaved;
                const mine = restaurantIsMine(r, user?.id);
                const btn = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, color: string = tc.textPrimary) => (
                  <Pressable key={label} onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
                    style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: tc.glass, borderWidth: 1, borderColor: tc.glassLine }}>
                    <Ionicons name={icon} size={19} color={color} />
                  </Pressable>
                );
                const close = () => { setSelectedRestaurant(null); setReviewText(""); setReservationRestaurant(null); setReservationSubmitted(false); setReservationErrors({}); };
                return (
                  <View style={{ position: "absolute", top: insets.top + 10, left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {btn("chevron-back", "Back", close)}
                    <View style={{ flex: 1 }} />
                    {mine ? btn("trash-outline", "Delete restaurant", () => confirmDeleteRestaurant(r.id), tc.dangerText) : null}
                    {btn(saved ? "bookmark" : "bookmark-outline", saved ? "Remove from saved" : "Save restaurant", () => void toggleBookmark(r.id), saved ? tc.accentText : tc.textPrimary)}
                    {btn(favorites.has(r.id) ? "heart" : "heart-outline", favorites.has(r.id) ? "Remove from favourites" : "Add to favourites", () => void toggleFav(r.id), favorites.has(r.id) ? "#F0457E" : tc.textPrimary)}
                    {btn("ellipsis-horizontal", "More options", () => appAlert(r.name, undefined, [
                      { text: "Share", onPress: () => handleShare(r) },
                      ...(!mine ? [{ text: "Report", style: "destructive" as const, onPress: () => setReportSheetId(r.id) }] : []),
                      { text: "Cancel", style: "cancel" },
                    ]))}
                  </View>
                );
              })()}
            </SheetDragArea>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <ScrollView style={{ flex: 1, marginTop: -26, backgroundColor: tc.pageBg, borderTopLeftRadius: 30, borderTopRightRadius: 30 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {(() => {
                const r = selectedRestaurant;
                const av = getAvailability(r);
                const meta = [(r.reviews ?? 0) > 0 ? `★ ${r.rating} (${r.reviews})` : "", r.cuisine, r.price ? getDisplayPrice(r, countryCode) : "", hasDistance(r) ? r.distance : ""].filter(Boolean).join(" · ");
                const details = [
                  av.state !== "unknown" ? ["Hours", av.label] : null,
                  r.waitTime ? ["Typical wait", String(r.waitTime)] : null,
                  safeList(r.services).length ? ["Services", safeList(r.services).map(itemLabel).join(" · ")] : null,
                ].filter(Boolean) as [string, string][];
                const actions: [keyof typeof Ionicons.glyphMap, string, () => void][] = [
                  ["navigate-outline", "Directions", () => handleDirections(r)],
                  ["call-outline", "Call", () => handleCall(r)],
                  ["share-social-outline", "Share", () => handleShare(r)],
                  ...(hasReservations(r) && !reservationRestaurant ? [["calendar-outline", "Reserve", () => handleReserve(r)] as [keyof typeof Ionicons.glyphMap, string, () => void]] : []),
                ];
                return (
                  <>
                    <Reveal i={0}>
                      <Text style={[TYPE.pageTitle, { fontSize: 26, color: tc.textPrimary }]}>{r.name}</Text>
                      {meta ? <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 4 }]}>{meta}</Text> : null}
                      {av.state === "open" ? <Text style={[TYPE.bodyStrong, { color: tc.mint, marginTop: 6 }]}>{av.label}</Text> : av.state === "closed" ? <Text style={[TYPE.bodyStrong, { color: tc.dangerText, marginTop: 6 }]}>{av.label}</Text> : null}
                      {r.verified ? <View style={{ marginTop: 8, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: tc.mintSoft }}><Text style={[TYPE.label, { color: tc.successText }]}>Verified owner</Text></View> : null}
                    </Reveal>
                    <Reveal i={1} style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                      {actions.map(([icon, label, onPress]) => (
                        <PressableScale key={label} onPress={onPress} outerStyle={{ flex: 1 }} style={{ height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: tc.accentSoft }} accessibilityRole="button" accessibilityLabel={label}>
                          <Ionicons name={icon} size={20} color={tc.accentText} />
                          <Text style={[TYPE.label, { color: tc.accentText }]}>{label}</Text>
                        </PressableScale>
                      ))}
                    </Reveal>
                    {safeList(r.popularDishes).length ? (
                      <Reveal i={2}>
                        <Text style={[TYPE.section, { color: tc.textPrimary, marginTop: 22, marginBottom: 10 }]}>Popular here</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          {safeList(r.popularDishes).map((dish, i) => (
                            <View key={`${r.id}-dish-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.borderMedium }}>
                              <Text style={[TYPE.label, { color: tc.accentText }]}>{i + 1}</Text>
                              <Text style={[TYPE.bodyStrong, { fontSize: 14, color: tc.textPrimary }]}>{itemLabel(dish)}</Text>
                            </View>
                          ))}
                        </View>
                      </Reveal>
                    ) : null}
                    {details.length ? (
                      <Reveal i={3}>
                        <Text style={[TYPE.section, { color: tc.textPrimary, marginTop: 22, marginBottom: 10 }]}>Details</Text>
                        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, paddingHorizontal: 14 }}>
                          {details.map(([k, v], i) => (
                            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 12, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: tc.borderLight }}>
                              <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
                              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
                            </View>
                          ))}
                        </View>
                      </Reveal>
                    ) : null}
                    {safeList(r.tags).length ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                        {safeList(r.tags).map((t, i) => (
                          <View key={`${r.id}-tag-${i}`} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: tc.accentSoft }}><Text style={[TYPE.label, { color: tc.accentText }]}>{itemLabel(t)}</Text></View>
                        ))}
                      </View>
                    ) : null}
                  </>
                );
              })()}

              {/* Rate & Review */}
              <View style={rdm.section}>
                <Text style={[TYPE.section, { color: tc.textPrimary, marginTop: 22, marginBottom: 10 }]}>Rate and review</Text>
                {!restaurantIsMine(selectedRestaurant, user?.id) ? (
                  <>
                    {(() => {
                      const rid = selectedRestaurant.id;
                      const my = myRestaurantReviews[rid];
                      const openSheet = () => {
                        if (!requireAuth(undefined, "Sign in to rate this place.")) return;
                        if (my) {
                          setReviewEditMode((p) => ({ ...p, [rid]: true }));
                          setEditRating((p) => ({ ...p, [rid]: my.rating }));
                          setEditText((p) => ({ ...p, [rid]: my.text || my.content || "" }));
                        }
                        setRateFor(rid);
                      };
                      if (my) {
                        const full = Math.min(5, Math.max(0, Math.floor(my.rating)));
                        return (
                          <View style={[rdm.userReview, { backgroundColor: tc.cardBg, borderColor: tc.glassLine, borderWidth: 1 }]}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flex: 1 }]}>Your rating</Text>
                              <Pressable accessibilityLabel="Edit review" onPress={openSheet} hitSlop={8}><Ionicons name="create-outline" size={20} color={tc.accentText} /></Pressable>
                              <Pressable accessibilityLabel="Delete review" onPress={() => confirmDeleteMyReview(selectedRestaurant)} hitSlop={8}><Ionicons name="trash-outline" size={20} color={tc.dangerText} /></Pressable>
                            </View>
                            <View style={{ flexDirection: "row", gap: 2, marginVertical: 6 }}>
                              {[1, 2, 3, 4, 5].map((n) => <Ionicons key={n} name={n <= full ? "star" : "star-outline"} size={18} color={n <= full ? "#F5B300" : tc.surface3} />)}
                            </View>
                            {my.text || my.content ? <Text style={[TYPE.body, { color: tc.textSecondary, marginBottom: 6 }]}>{my.text || my.content}</Text> : null}
                            <Text style={[TYPE.small, { color: tc.textTertiary }]}>{new Date(my.createdAt).toLocaleDateString()}</Text>
                          </View>
                        );
                      }
                      return (
                        <PressableScale onPress={openSheet} accessibilityRole="button" accessibilityLabel={`Rate ${selectedRestaurant.name}`}
                          style={[rdm.userReview, { backgroundColor: tc.cardBg, borderColor: tc.glassLine, borderWidth: 1, alignItems: "center" }]}>
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            {[1, 2, 3, 4, 5].map((n) => <Ionicons key={n} name="star-outline" size={30} color={tc.surface3} />)}
                          </View>
                          <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 6 }]}>Been here? Tap to rate it</Text>
                        </PressableScale>
                      );
                    })()}
                  </>
                ) : null}

                <DSheet visible={rateFor === selectedRestaurant.id} onClose={() => { setRateFor(null); setReviewEditMode((p) => ({ ...p, [selectedRestaurant.id]: false })); }} title={`Rate ${selectedRestaurant.name}`}>
                  {(() => {
                    const rid = selectedRestaurant.id;
                    const my = myRestaurantReviews[rid];
                    const rating = my ? (editRating[rid] ?? my.rating) : (userRatings[rid] || 0);
                    const text = my ? (editText[rid] ?? "") : reviewText;
                    return (
                      <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
                        <StarPicker value={rating} onChange={(v) => (my ? setEditRating((p) => ({ ...p, [rid]: v })) : setUserRatings((p) => ({ ...p, [rid]: v })))} />
                        <Text style={[TYPE.label, { color: tc.textSecondary, marginTop: 16, marginBottom: 6 }]}>Tell people more (optional)</Text>
                        <TextInput
                          style={[TYPE.body, { minHeight: 96, textAlignVertical: "top", borderRadius: 16, padding: 12, backgroundColor: tc.inputBg, color: tc.textPrimary }]}
                          placeholder="What should people order?"
                          placeholderTextColor={tc.textTertiary}
                          value={text}
                          onChangeText={(t) => (my ? setEditText((p) => ({ ...p, [rid]: t })) : setReviewText(t))}
                          multiline
                        />
                        <GradientButton
                          block
                          label={my ? "Save changes" : "Post rating"}
                          disabled={!rating}
                          outerStyle={{ marginTop: 16 }}
                          onPress={() => {
                            setRateFor(null);
                            void (my ? saveReviewEdits(selectedRestaurant) : submitReviewForRestaurant(selectedRestaurant));
                          }}
                        />
                      </View>
                    );
                  })()}
                </DSheet>

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
                <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}>
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}>
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
    backgroundColor: "#E2F0F1", borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  waitText: { fontSize: rs(11), fontWeight: "600", color: "#257A86" },
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
  dishesLabel: { fontSize: rs(11), fontWeight: "700", color: "#257A86" },
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
    width: 24, height: 24, borderRadius: 8, backgroundColor: "#257A86",
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
