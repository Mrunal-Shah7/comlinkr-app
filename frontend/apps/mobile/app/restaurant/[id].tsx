// A restaurant's detail (plan 03): photos, hours, reviews, reservation, report. Opened from the Food tab, Saved,
// notifications and share links (/app/food?openRestaurant=<id>).
import { palette } from "../../src/theme/palette";
import { usePaletteColor } from "../../src/theme/themedStyles";
import { useState, useEffect, useCallback } from "react";
import Reanimated from "react-native-reanimated";
import { GradientButton, PressableScale, Reveal } from "../../src/shared/d";
import { DSheet } from "../../src/shared/d/Sheet";
import { StarPicker } from "../../src/shared/d/StarPicker";
import { TYPE } from "../../src/theme/d";
import { DatePickerField, TimePickerField } from "../../components/DateTimePickerField";
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
  BackHandler,
} from "react-native";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../src/theme/colors";
import { useTheme } from "../../src/theme/useTheme";
import AppHeader from "../../components/AppHeader";
import { useFocusEffect } from "expo-router";
import { openGallery } from "../../src/features/housing/galleryStore";
import { useAuthStore } from "../../src/store/auth.store";
import { useGuestLocationStore } from "../../src/store/guestLocation.store";
import { useRequireAuth } from "../../src/shared/hooks/useRequireAuth";
import { ApiError } from "../../src/api/client";
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
} from "../../src/api/food.api";
import { rs } from "../../src/utils/responsive";
import { useAppCity } from "../../src/utils/useAppCity";
import { getShareLink } from "../../src/utils/shareLinks";
import { queryKeys } from "../../src/services/cache/queryKeys";
import { showToast } from "../../src/shared/ui/Toast";
import { appAlert } from '../../src/shared/ui/Dialogs';

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { closeDetail, findCachedRow, useIdParam } from "../../src/hooks/useDetailRoute";
import { restaurantIsMine, safeList, itemLabel, getAvailability, getDisplayPrice, hasDistance, hasReservations, toApiTime, toApiDate, SortOption, REPORT_REASONS, ImageCarousel, restaurantId, s, rdm } from "../../src/features/food/foodShared";
import { newsTimeAgo } from "../../src/features/explore/news";

export default function RestaurantDetailScreen() {
  const id = useIdParam();
  const qc = useQueryClient();
  // The restaurant: the Food list's cached row at once, then the by-id response (plan 03).
  const detailQ = useQuery<Restaurant>({
    queryKey: ["food", "detail", id, useAuthStore.getState().user?.id ?? ""],
    queryFn: () => getRestaurant(id),
    enabled: !!id,
    staleTime: 0,
    initialData: () => findCachedRow<Restaurant>(qc, ["food"], id, (k) => k[1] !== "detail")?.row,
    initialDataUpdatedAt: 0,
  });
  const [detail, setDetail] = useState<Restaurant | null>(detailQ.data ?? null);
  useEffect(() => {
    if (detailQ.data) setDetail(detailQ.data);
  }, [detailQ.data]);
  const selectedRestaurant = detail;
  // The screen's old modal state setter: null closes the route, a value or updater replaces the restaurant.
  const setSelectedRestaurant = (next: Restaurant | null | ((r: Restaurant | null) => Restaurant | null)) => {
    if (next === null) { closeDetail(); return; }
    setDetail(next);
  };
  // Edits here change the server; the Food list and Saved refetch instead of being patched by hand.
  const setRestaurants = (_patch: (prev: Restaurant[]) => Restaurant[]) => {
    void qc.invalidateQueries({ queryKey: ["food"], predicate: (q) => q.queryKey[1] !== "detail" });
    void qc.invalidateQueries({ queryKey: queryKeys.saved() });
  };
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, tc } = useTheme();
  const pc = usePaletteColor();
  const user = useAuthStore((s) => s.user);
  const { requireAuth } = useRequireAuth();
  const guestCity = useGuestLocationStore((s) => s.city);
  const guestCountry = useGuestLocationStore((s) => s.country);
  const countryCode =
    (user as any)?.userLocation?.countryCode ||
    ((user?.country || guestCountry) === "United Kingdom" ? "GB" : "US");
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const { city: appCity, hasCity, chooseCity } = useAppCity(() => setCityPickerVisible(true));
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
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


  // Hearts and bookmarks start from the restaurant's own flags.
  useEffect(() => {
    if (!detailQ.data) return;
    const r = detailQ.data;
    setFavorites((p) => { const n = new Set(p); if (r.savedByMe) n.add(r.id); else n.delete(r.id); return n; });
    setBookmarkedIds((p) => { const n = new Set(p); if (r.isSaved === true) n.add(r.id); else n.delete(r.id); return n; });
  }, [detailQ.data]);

  // Android Back closes the reservation form before it leaves the screen.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (!reservationRestaurant) return false;
        setReservationRestaurant(null);
        setReservationSubmitted(false);
        setReservationSubmitting(false);
        setReservationErrors({});
        return true;
      });
      return () => sub.remove();
    }, [reservationRestaurant]),
  );

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




  // The reviews come through React Query (TR-013), fetched fresh each time the detail opens.
  const reviewsRestaurantId = selectedRestaurant?.id;
  const reviewsQuery = useQuery({
    queryKey: ["food", "reviews", reviewsRestaurantId ?? ""],
    queryFn: () => getReviews(String(reviewsRestaurantId)),
    enabled: !!reviewsRestaurantId,
    staleTime: 0,
  });
  useEffect(() => {
    const id = reviewsRestaurantId;
    if (!id) return;
    if (reviewsQuery.isError) {
      setReviewsList((prev) => ({ ...prev, [id]: [] }));
      setMyRestaurantReviews((prev) => ({ ...prev, [id]: null }));
      return;
    }
    const list = reviewsQuery.data;
    if (!list) return;
    setReviewsList((prev) => ({ ...prev, [id]: list }));
    const mine = user?.id ? list.find((rv) => String(rv.author.id) === String(user.id)) ?? null : null;
    setMyRestaurantReviews((prev) => ({ ...prev, [id]: mine }));
  }, [reviewsRestaurantId, reviewsQuery.data, reviewsQuery.isError, user?.id]);


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



  return (
    <>
      <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
        {selectedRestaurant ? (
          <>
            {/* ── Photos with glass buttons (design D, plan 01) ── */}
            <View style={{ height: 350, position: "relative" }}>
              <ImageCarousel
                images={selectedRestaurant.images && selectedRestaurant.images.length > 0 ? selectedRestaurant.images : [selectedRestaurant.image]}
                height={350}
                itemWidth={windowWidth}
                onImagePress={(idx) => { const imgs = selectedRestaurant.images && selectedRestaurant.images.length > 0 ? selectedRestaurant.images : [selectedRestaurant.image]; openGallery(imgs, idx); }}
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
                    {btn(favorites.has(r.id) ? "heart" : "heart-outline", favorites.has(r.id) ? "Remove from favourites" : "Add to favourites", () => void toggleFav(r.id), favorites.has(r.id) ? palette.pinkL61 : tc.textPrimary)}
                    {btn("ellipsis-horizontal", "More options", () => appAlert(r.name, undefined, [
                      { text: "Share", onPress: () => handleShare(r) },
                      ...(!mine ? [{ text: "Report", style: "destructive" as const, onPress: () => setReportSheetId(r.id) }] : []),
                      { text: "Cancel", style: "cancel" },
                    ]))}
                  </View>
                );
              })()}
            </View>

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
                              {[1, 2, 3, 4, 5].map((n) => <Ionicons key={n} name={n <= full ? "star" : "star-outline"} size={18} color={n <= full ? palette.yellowL48 : tc.surface3} />)}
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
                      <View key={rev.id} style={[rdm.userReview, { backgroundColor: isDark ? tc.sectionBg : palette.gray50 }]}>
                        <Text style={[rdm.reviewTime, { color: tc.textTertiary, marginBottom: 4, fontWeight: "600" }]}>{rev.author.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Text style={{ color: palette.amber500 }}>
                            {"★".repeat(full)}
                            {"☆".repeat(5 - full)}
                          </Text>
                          <Text style={[rdm.reviewTime, { color: tc.textTertiary }]}>{newsTimeAgo(String(rev.createdAt))}</Text>
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
                    <Ionicons name="calendar-outline" size={16} color={palette.white} />
                    <Text style={{ color: palette.white, fontWeight: "800", fontSize: 15 }}>Reserve a Table</Text>
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
                            <Text style={{ color: palette.white, fontWeight: "800", fontSize: 14 }}>Call Restaurant</Text>
                          </Pressable>
                          <Pressable onPress={() => { setReservationRestaurant(null); setReservationSubmitted(false); setReservationSubmitting(false); setReservationErrors({}); }} style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, backgroundColor: isDark ? tc.inputBg : palette.gray100, alignItems: "center" }}>
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
                          style={{ borderColor: reservationErrors.date ? palette.red500 : tc.borderLight, backgroundColor: tc.inputBg, marginBottom: 4 }}
                        />
                        {!!reservationErrors.date && <Text style={{ fontSize: 12, color: palette.red500, marginBottom: 8 }}>{reservationErrors.date}</Text>}

                        <Text style={{ fontSize: 12, fontWeight: "700", color: tc.textTertiary, marginBottom: 6, marginTop: 4 }}>TIME</Text>
                        <TimePickerField
                          value={reservationTime}
                          onChange={(v) => { setReservationTime(v); setReservationErrors((e) => ({ ...e, time: undefined })); }}
                          placeholder="HH:MM or select time"
                          accentColor={Colors.brand.green}
                          forceDark={isDark}
                          style={{ borderColor: reservationErrors.time ? palette.red500 : tc.borderLight, backgroundColor: tc.inputBg, marginBottom: 4 }}
                        />
                        {!!reservationErrors.time && <Text style={{ fontSize: 12, color: palette.red500, marginBottom: 8 }}>{reservationErrors.time}</Text>}

                        <Text style={{ fontSize: 12, fontWeight: "700", color: tc.textTertiary, marginBottom: 6 }}>PARTY SIZE</Text>
                        <TextInput
                          style={{ borderWidth: 1.5, borderColor: reservationErrors.partySize ? palette.red500 : tc.borderLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: tc.textPrimary, backgroundColor: tc.inputBg, marginBottom: 4 }}
                          placeholder="e.g. 2"
                          placeholderTextColor={tc.textTertiary}
                          value={reservationGuests}
                          onChangeText={(v) => { setReservationGuests(v); setReservationErrors((e) => ({ ...e, partySize: undefined })); }}
                          keyboardType="number-pad"
                        />
                        {!!reservationErrors.partySize && <Text style={{ fontSize: 12, color: palette.red500, marginBottom: 8 }}>{reservationErrors.partySize}</Text>}

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
                              <ActivityIndicator color={palette.white} />
                            ) : (
                              <Text style={{ color: palette.white, fontWeight: "800", fontSize: 15 }}>Confirm Reservation</Text>
                            )}
                          </LinearGradient>
                        </Pressable>
                      </>
                    )}
                  </ScrollView>
                </KeyboardAvoidingView>
              </View>
            )}
          </>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
            {detailQ.isError ? (
              <>
                <Text style={{ color: tc.textPrimary, fontSize: 17, fontWeight: "600" }}>This place may have been removed.</Text>
                <Pressable onPress={closeDetail} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: tc.accentText, fontSize: 16, fontWeight: "600" }}>Go back</Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator color={tc.accentText} />
            )}
          </View>
        )}
      </View>

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
                    backgroundColor: (pressed || (reason === "Other" && reportOtherFocused)) ? (isDark ? palette.blueL14 : palette.neutralL97_10) : "transparent",
                    borderBottomWidth: reason === "Other" ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: tc.borderLight,
                  })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: pc(palette.red100, "backgroundColor"), alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="flag" size={16} color={palette.red600} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: tc.textPrimary, flex: 1 }}>{reason}</Text>
                  {reason === "Other" && <Ionicons name="chevron-down" size={14} color={tc.textTertiary} />}
                </Pressable>
                {reason === "Other" && (
                  <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                    <TextInput
                      style={{
                        borderWidth: 1.5,
                        borderColor: reportOtherFocused ? palette.red600 : tc.borderLight,
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
                      style={{ marginTop: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: palette.red600, alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: palette.white }}>Submit Report</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
            <Pressable
              onPress={() => { setReportSheetId(null); setReportOtherText(""); setReportOtherFocused(false); }}
              style={{ marginTop: 8, marginHorizontal: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: isDark ? tc.inputBg : palette.gray100, alignItems: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: tc.textSecondary }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

    </>
  );
}
