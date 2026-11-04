import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { tabBarClearance } from "../../../src/shared/navigation/DTabBar";
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { ListingFeature, ListingTile, RoomTile } from "../../../src/features/housing/components/DListingCards";
import { Chip, Segmented, SoftButton } from "../../../src/shared/d";
import { TYPE } from "../../../src/theme/d";
import { View, Text, ScrollView, FlatList, Pressable, TextInput, Animated, StyleSheet, Modal, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams, useScrollToTop } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../src/theme/colors";
import { useTheme } from "../../../src/theme/useTheme";
import { ListState } from "../../../src/shared/ui/ListState";
import { useAppCity } from "../../../src/utils/useAppCity";
import { GuestCityPickerModal } from "../../../components/GuestCityBanner";
import AppHeader from "../../../components/AppHeader";
import { useAuthStore } from "../../../src/store/auth.store";
import { useRequireAuth } from "../../../src/shared/hooks/useRequireAuth";
import { useStableCallback } from "../../../src/shared/hooks/useStableCallback";
import { runAfterTransition } from "../../../src/utils/afterTransition";
import { SkeletonCard } from "../../../src/shared/ui/Skeleton";
import { ApiError } from "../../../src/api/client";
import { rs } from "../../../src/utils/responsive";
import { deleteListing, getListings, getMyListings, getListing, toggleListingSave, listingImageUrlList, subscribeToListingUpdates, type HousingListing, type HousingListingImageRef } from "../../../src/api/housing.api";
import { applyToSharedSpace, toggleFavoriteSharedSpace, deleteSharedSpace, updateSharedSpace, acceptRoommateConnection, connectWithRoommate, declineRoommateConnection, getRoommates, getRoommateMatches, getRoommate, getRoommatePreferences, getSharedSpaces, toggleRoommateSave, updateRoommatePreferences, type RoommateListing } from "../../../src/api/roommates.api";
import { DatePickerField } from "../../../components/DateTimePickerField";
import { roommatePrefsFromGetEndpoint, roommatePrefsToPatchBody } from "../../../src/utils/roommatePrefsMap";
import { useListFetchCacheStore } from "../../../src/store/listFetchCache.store";
import { showToast } from "../../../src/shared/ui/Toast";
import { appAlert } from "../../../src/shared/ui/Dialogs";
import { type Listing, propertyFilterLabelToApi, toUiListing, FILTERS } from "../../../src/features/housing/listingModel";
import { type Roommate, type AvailableRoom, RM_DEFAULT_PREFS, toUiRoommate, toUiAvailableRoom, buildCurrentUserForMatch, computeMatch, ROOMMATE_FILTERS, RM_SLEEP_OPTIONS, RM_CLEAN_OPTIONS, RM_NOISE_OPTIONS, RM_GUEST_OPTIONS } from "../../../src/features/housing/roommateModel";
import { s } from "../../../src/features/housing/styles/housingScreen.styles";
import { SafeRentingGuide } from "../../../src/features/housing/components/SafeRentingGuide";
import { MemoListingCard, MemoRoommateCard } from "../../../src/features/housing/components/MemoRows";
import { ar } from "../../../src/features/housing/styles/availableRoom.styles";
import { AvailableRoomCard } from "../../../src/features/housing/components/AvailableRoomCard";
import { PropertyDetailModal } from "../../../src/features/housing/components/PropertyDetailModal";
import { RoommateDetailModal } from "../../../src/features/housing/components/RoommateDetailModal";
import { AvailableRoomDetailModal } from "../../../src/features/housing/components/AvailableRoomDetailModal";
import { ListYourSpaceModal } from "../../../src/features/housing/components/ListYourSpaceModal";
import { FullscreenImageViewer } from "../../../src/features/housing/components/ImageViewer";

// ── Tab type ─────────────────────────────────────────────────────────────────
type HousingTab = "listings" | "roommates";

/** A row of the main FlatList — which kind depends on the active tab / sub-tab. */
type HousingRow =
  | { kind: "listing"; listing: Listing }
  | { kind: "listingPair"; listings: Listing[] }
  | { kind: "roomPair"; rooms: AvailableRoom[] }
  | { kind: "roommate"; roommate: Roommate };

const housingRowKey = (row: HousingRow) =>
  row.kind === "listing" ? `l:${row.listing.id}`
  : row.kind === "listingPair" ? `lp:${row.listings.map((l) => l.id).join("+")}`
  : row.kind === "roomPair" ? `rp:${row.rooms.map((r) => r.id).join("+")}`
  : `m:${row.roommate.id}`;

// ── Main screen ──────────────────────────────────────────────────────────────
export default function HousingScreen() {
  const housingScrollRef = useRef<FlatList<HousingRow>>(null);
  useScrollToTop(housingScrollRef); // re-tap the Listings tab → back to top
  const { isDark, tc } = useTheme();
  const insets = useSafeAreaInsets();
  // Design D (plan 01): the header title fades in as the large title scrolls away.
  const housingScrollY = useSharedValue(0);
  const onHousingScroll = useAnimatedScrollHandler((e) => { housingScrollY.value = e.contentOffset.y; });
  const user = useAuthStore((s) => s.user);
  const updateRoommatePrefs = useAuthStore((s) => s.updateRoommatePrefs);
  const { requireAuth } = useRequireAuth();
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const { city: userCity, hasCity, chooseCity } = useAppCity(() => setCityPickerVisible(true));
  const params = useLocalSearchParams<{ openListing?: string; openRoommate?: string }>();
  const openedListingDeepLink = useRef<string | null>(null);
  const openedRoommateDeepLink = useRef<string | null>(null);

  // ── Shared state ──
  const [activeTab, setActiveTab] = useState<HousingTab>("listings");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const [refreshing, setRefreshing] = useState(false);

  // ── Listings state ──
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("All");
  const [minPriceFilter, setMinPriceFilter] = useState<string>("");
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>("");
  const [bedsFilter, setBedsFilter] = useState<number | null>(null);
  const [petsFilter, setPetsFilter] = useState<boolean | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [listings, setListings] = useState<Listing[]>([]);
  // Starts true so a tab that hasn't fetched yet shows skeletons (not "No listings") when it peeks in during a tab swipe.
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState(false);
  const [listingsHasMore, setListingsHasMore] = useState(false);
  const [listingsPage, setListingsPage] = useState(1);
  const [listingsLoadingMore, setListingsLoadingMore] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [listingJourneyMap, setListingJourneyMap] = useState<Record<string, number>>({});
  const [fullscreenImages, setFullscreenImages] = useState<string[]>([]);
  const [fullscreenStartIdx, setFullscreenStartIdx] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  // ── Roommates state ──
  const [rmFilter, setRmFilter] = useState("Best Match");
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [roommatesLoading, setRoommatesLoading] = useState(false);
  const [selectedRoommate, setSelectedRoommate] = useState<Roommate | null>(null);
  const [roommateSavedIds, setRoommateSavedIds] = useState<Set<string>>(new Set());

  // ── Available Rooms state ──
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [availableRoomsLoading, setAvailableRoomsLoading] = useState(false);
  const [selectedAvailableRoom, setSelectedAvailableRoom] = useState<AvailableRoom | null>(null);
  const [requestedRooms, setRequestedRooms] = useState<Set<string>>(new Set());
  const [showListModal, setShowListModal] = useState(false);

  // ── Inline roommate prefs modal state ──────────────────────────────────────
  const [rmPrefsModalVisible, setRmPrefsModalVisible] = useState(false);
  const [rmSaving, setRmSaving] = useState(false);
  const [rmBudgetMin, setRmBudgetMin] = useState(String(user?.roommatePrefs?.budgetMin ?? RM_DEFAULT_PREFS.budgetMin));
  const [rmBudgetMax, setRmBudgetMax] = useState(String(user?.roommatePrefs?.budgetMax ?? RM_DEFAULT_PREFS.budgetMax));
  const [rmMoveInDate, setRmMoveInDate] = useState(user?.roommatePrefs?.moveInDate ?? RM_DEFAULT_PREFS.moveInDate);
  const [rmSleep, setRmSleep] = useState(user?.roommatePrefs?.sleepSchedule ?? RM_DEFAULT_PREFS.sleepSchedule);
  const [rmClean, setRmClean] = useState(user?.roommatePrefs?.cleanliness ?? RM_DEFAULT_PREFS.cleanliness);
  const [rmNoise, setRmNoise] = useState(user?.roommatePrefs?.noiseLevel ?? RM_DEFAULT_PREFS.noiseLevel);
  const [rmPet, setRmPet] = useState(user?.roommatePrefs?.petFriendly ?? RM_DEFAULT_PREFS.petFriendly);
  const [rmSmoke, setRmSmoke] = useState(user?.roommatePrefs?.smoking ?? RM_DEFAULT_PREFS.smoking);
  const [rmGuest, setRmGuest] = useState(user?.roommatePrefs?.guestPolicy ?? RM_DEFAULT_PREFS.guestPolicy);
  const [rmWfh, setRmWfh] = useState(user?.roommatePrefs?.workFromHome ?? RM_DEFAULT_PREFS.workFromHome);

  const openRmPrefsModal = useCallback(async () => {
    // Seed from local store first so modal opens instantly
    const localP = user?.roommatePrefs ?? RM_DEFAULT_PREFS;
    setRmBudgetMin(String(localP.budgetMin ?? RM_DEFAULT_PREFS.budgetMin));
    setRmBudgetMax(String(localP.budgetMax ?? RM_DEFAULT_PREFS.budgetMax));
    setRmMoveInDate(localP.moveInDate ?? RM_DEFAULT_PREFS.moveInDate);
    setRmSleep(localP.sleepSchedule ?? RM_DEFAULT_PREFS.sleepSchedule);
    setRmClean(localP.cleanliness ?? RM_DEFAULT_PREFS.cleanliness);
    setRmNoise(localP.noiseLevel ?? RM_DEFAULT_PREFS.noiseLevel);
    setRmPet(localP.petFriendly ?? RM_DEFAULT_PREFS.petFriendly);
    setRmSmoke(localP.smoking ?? RM_DEFAULT_PREFS.smoking);
    setRmGuest(localP.guestPolicy ?? RM_DEFAULT_PREFS.guestPolicy);
    setRmWfh(localP.workFromHome ?? RM_DEFAULT_PREFS.workFromHome);
    setRmPrefsModalVisible(true);
    // Then fetch fresh from backend and update fields
    try {
      const fresh = await getRoommatePreferences();
      const mapped = roommatePrefsFromGetEndpoint({
        budgetMin: fresh.budgetMin, budgetMax: fresh.budgetMax, moveInDate: fresh.moveInDate,
        sleepSchedule: fresh.sleepSchedule, cleanliness: fresh.cleanliness, noiseLevel: fresh.noiseLevel,
        petFriendly: fresh.petFriendly, smoking: fresh.smoking, guestPolicy: fresh.guestPolicy, workFromHome: fresh.workFromHome,
      });
      await updateRoommatePrefs({ ...RM_DEFAULT_PREFS, ...mapped });
      if (mapped.budgetMin) setRmBudgetMin(String(mapped.budgetMin));
      if (mapped.budgetMax) setRmBudgetMax(String(mapped.budgetMax));
      if (mapped.moveInDate) setRmMoveInDate(mapped.moveInDate);
      if (mapped.sleepSchedule) setRmSleep(mapped.sleepSchedule);
      if (mapped.cleanliness) setRmClean(mapped.cleanliness);
      if (mapped.noiseLevel) setRmNoise(mapped.noiseLevel);
      if (mapped.petFriendly != null) setRmPet(mapped.petFriendly);
      if (mapped.smoking != null) setRmSmoke(mapped.smoking);
      if (mapped.guestPolicy) setRmGuest(mapped.guestPolicy);
      if (mapped.workFromHome != null) setRmWfh(mapped.workFromHome);
    } catch { /* keep local values if backend unreachable */ }
  }, [user?.roommatePrefs, updateRoommatePrefs]);

  // Persist listing journey progress (Enquired/Viewing/Applied) across sessions
  useEffect(() => {
    AsyncStorage.getItem("comlinkr_listing_journey").then((val) => {
      if (val) {
        try { setListingJourneyMap(JSON.parse(val) as Record<string, number>); } catch {}
      }
    });
  }, []);
  useEffect(() => {
    if (Object.keys(listingJourneyMap).length > 0) {
      AsyncStorage.setItem("comlinkr_listing_journey", JSON.stringify(listingJourneyMap));
    }
  }, [listingJourneyMap]);

  // Persist requested rooms across sessions
  useEffect(() => {
    AsyncStorage.getItem("comlinkr_requested_rooms").then((val) => {
      if (val) {
        try { setRequestedRooms(new Set(JSON.parse(val) as string[])); } catch {}
      }
    });
  }, []);
  useEffect(() => {
    if (requestedRooms.size > 0) {
      AsyncStorage.setItem("comlinkr_requested_rooms", JSON.stringify([...requestedRooms]));
    }
  }, [requestedRooms]);

  // ── Roommates sub-tab ──
  const [rmSubTab, setRmSubTab] = useState<"searching" | "matching">("searching");

  const listingsSignatureRef = useRef("");
  const loadListings = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!userCity) {
      // No resolved location: show the choose-city prompt instead of unscoped listings.
      listingsSignatureRef.current = "";
      setListings([]);
      setListingsHasMore(false);
      setListingsError(false);
      setListingsLoading(false);
      return;
    }
    if (!silent) setListingsLoading(true);
    try {
      const typeApi = propertyFilterLabelToApi(propertyTypeFilter);
      const minPriceNum = minPriceFilter.trim() ? Number(minPriceFilter) : undefined;
      const maxPriceNum = maxPriceFilter.trim() ? Number(maxPriceFilter) : undefined;
      // Fetch public listings + the user's own listings in parallel so the owner
      // always sees their own post even if the backend filters it from the public feed.
      const [res, myRes] = await Promise.allSettled([
        getListings({
          page: 1,
          pageSize: 50,
          ...(typeApi ? { type: typeApi } : {}),
          ...(userCity ? { city: userCity } : {}),
          ...(minPriceNum != null && Number.isFinite(minPriceNum) ? { minPrice: minPriceNum } : {}),
          ...(maxPriceNum != null && Number.isFinite(maxPriceNum) ? { maxPrice: maxPriceNum } : {}),
          ...(bedsFilter != null ? { beds: bedsFilter } : {}),
          ...(petsFilter != null ? { pets: petsFilter } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        }),
        user?.id ? getMyListings({ page: 1, pageSize: 20 }) : Promise.resolve(null),
      ]);
      if (res.status === "rejected") throw res.reason;
      const publicData: HousingListing[] = Array.isArray(res.value?.data) ? res.value.data : [];
      const myData: HousingListing[] = myRes.status === "fulfilled" && myRes.value && Array.isArray(myRes.value.data) ? myRes.value.data : [];

      // Merge: public listings first, then append own listings not already in the list
      const seen = new Set(publicData.map((x) => x.id));
      const q = debouncedSearch.toLowerCase();
      const ownMatches = (x: HousingListing) =>
        !q || `${x.title ?? ""} ${(x as { location?: string }).location ?? ""} ${(x as { city?: string }).city ?? ""}`.toLowerCase().includes(q);
      const merged = [...publicData, ...myData.filter((x) => !seen.has(x.id) && ownMatches(x))];

      // Focus refreshes usually return identical rows; skip the state churn (and the re-render of
      // every card) when nothing changed since the last applied response.
      const signature = JSON.stringify(merged) + String(res.value.hasMore === true);
      if (silent && signature === listingsSignatureRef.current) return;
      listingsSignatureRef.current = signature;

      setListings(merged.map((row) => toUiListing(row, user?.id)));
      setSavedIds(
        new Set(
          merged.filter((x) => (x as HousingListing).isSaved === true || x.savedByMe === true).map((x) => x.id),
        ),
      );
      setListingsError(false);
      setListingsPage(1);
      setListingsHasMore(res.value.hasMore === true);
    } catch {
      if (!silent) {
        listingsSignatureRef.current = "";
        setListings([]);
        setSavedIds(new Set());
        setListingsError(true);
      }
    } finally {
      if (!silent) setListingsLoading(false);
    }
  }, [user?.id, propertyTypeFilter, userCity, minPriceFilter, maxPriceFilter, bedsFilter, petsFilter, debouncedSearch]);

  const loadMoreListings = useCallback(async () => {
    if (listingsLoadingMore || !listingsHasMore) return;
    setListingsLoadingMore(true);
    try {
      const typeApi = propertyFilterLabelToApi(propertyTypeFilter);
      const minPriceNum = minPriceFilter.trim() ? Number(minPriceFilter) : undefined;
      const maxPriceNum = maxPriceFilter.trim() ? Number(maxPriceFilter) : undefined;
      const nextPage = listingsPage + 1;
      const res = await getListings({
        page: nextPage,
        pageSize: 50,
        ...(typeApi ? { type: typeApi } : {}),
        ...(userCity ? { city: userCity } : {}),
        ...(minPriceNum != null && Number.isFinite(minPriceNum) ? { minPrice: minPriceNum } : {}),
        ...(maxPriceNum != null && Number.isFinite(maxPriceNum) ? { maxPrice: maxPriceNum } : {}),
        ...(bedsFilter != null ? { beds: bedsFilter } : {}),
        ...(petsFilter != null ? { pets: petsFilter } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const nextData: HousingListing[] = Array.isArray(res.data) ? res.data : [];
      setListings((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        const nextUi = nextData.filter((x) => !seen.has(x.id)).map((row) => toUiListing(row, user?.id));
        return [...prev, ...nextUi];
      });
      setSavedIds((prev) => {
        const next = new Set(prev);
        for (const x of nextData) {
          if ((x as HousingListing).isSaved === true || x.savedByMe === true) next.add(x.id);
        }
        return next;
      });
      setListingsPage(nextPage);
      setListingsHasMore(res.hasMore === true);
    } catch {
      showToast("Could not load more listings.", "error");
    } finally {
      setListingsLoadingMore(false);
    }
  }, [listingsLoadingMore, listingsHasMore, propertyTypeFilter, minPriceFilter, maxPriceFilter, listingsPage, userCity, bedsFilter, petsFilter, user?.id, debouncedSearch]);

  const userCityRef = useRef(userCity);
  useEffect(() => {
    if (userCityRef.current === userCity) return;
    userCityRef.current = userCity;
    void loadListings();
  }, [userCity, loadListings]);

  useEffect(() => subscribeToListingUpdates((update) => { // SPRINT-42: consume in-memory listing field/image updates without waiting for TTL.
    const applyImages = (images: HousingListingImageRef[] | string[] | undefined) => // SPRINT-42: normalize ordered URLs for the UI listing model.
      listingImageUrlList(images ?? []); // SPRINT-42: preserve zero-image empty arrays.
    setListings((prev) => prev.map((row) => { // SPRINT-42: patch every matching browse card.
      if (row.id !== update.id) return row; // SPRINT-42: leave unrelated listings alone.
      if (update.listing) return toUiListing(update.listing, user?.id); // SPRINT-42: replace with the full PATCH response mapping.
      if (update.images) return { ...row, images: applyImages(update.images) }; // SPRINT-42: update primary/gallery order from image ops.
      return row; // SPRINT-42: no-op when the event carries neither body.
    })); // SPRINT-42: finish browse list patch.
    setSelectedListing((sel) => { // SPRINT-42: patch an open detail modal.
      if (!sel || sel.id !== update.id) return sel; // SPRINT-42: ignore unrelated detail.
      if (update.listing) return toUiListing(update.listing, user?.id); // SPRINT-42: refresh detail fields from the PATCH response.
      if (update.images) return { ...sel, images: applyImages(update.images) }; // SPRINT-42: refresh detail gallery order.
      return sel; // SPRINT-42: keep prior detail when nothing usable arrived.
    }); // SPRINT-42: finish detail patch.
  }), [user?.id]); // SPRINT-42: resubscribe if the signed-in user identity changes.

  const confirmDeleteListing = useCallback((id: string) => {
    appAlert("Delete this listing?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteListing(id);
            setListings((prev) => prev.filter((x) => x.id !== id));
            setSelectedListing(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Listing deleted.", "success");
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : "Could not delete. Try again.", "error");
          }
        },
      },
    ]);
  }, []);

  const roommatesSignatureRef = useRef("");
  const loadRoommates = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!user?.id) {
      setRoommates([]);
      setRoommateSavedIds(new Set());
      if (!silent) setRoommatesLoading(false);
      return;
    }
    if (!silent) setRoommatesLoading(true);
    try {
      // Fetch both city-filtered browse list AND personalised match list, then merge
      const [browseRes, matchRes] = await Promise.allSettled([
        getRoommates({ page: 1, pageSize: 100, city: user?.city?.trim() || undefined }),
        getRoommateMatches({ page: 1, pageSize: 100 }),
      ]);
      const browseData: RoommateListing[] = browseRes.status === "fulfilled" && Array.isArray(browseRes.value?.data) ? browseRes.value.data : [];
      const matchData: RoommateListing[] = matchRes.status === "fulfilled" && Array.isArray(matchRes.value?.data) ? matchRes.value.data : [];
      // Merge by id — prefer matchData entry (has server-side score) when duplicate
      const byId = new Map<string, RoommateListing>();
      browseData.forEach((r) => byId.set(r.id, r));
      matchData.forEach((r) => byId.set(r.id, r)); // overwrite with scored version
      const rows = Array.from(byId.values());
      const signature = JSON.stringify(rows);
      if (silent && signature === roommatesSignatureRef.current) return;
      roommatesSignatureRef.current = signature;
      const cards = rows.map(toUiRoommate);
      setRoommates(cards);
      setRoommateSavedIds(new Set(cards.filter((c) => c.isSaved).map((c) => c.id)));
    } catch {
      if (!silent) {
        roommatesSignatureRef.current = "";
        setRoommates([]);
        setRoommateSavedIds(new Set());
      }
    } finally {
      if (!silent) setRoommatesLoading(false);
    }
  }, [user?.city, user?.id]);

  const loadAvailableRooms = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!user?.id) {
      setAvailableRooms([]);
      if (!silent) setAvailableRoomsLoading(false);
      return;
    }
    if (!silent) setAvailableRoomsLoading(true);
    try {
      const res = await getSharedSpaces({
        city: user?.city?.trim() || undefined,
        page: 1,
        pageSize: 20,
      });
      const data = Array.isArray(res?.data) ? res.data : [];
      setAvailableRooms(data.map(toUiAvailableRoom));
    } catch {
      if (!silent) setAvailableRooms([]);
    } finally {
      if (!silent) setAvailableRoomsLoading(false);
    }
  }, [user?.city, user?.id]);

  const saveRmPrefs = useCallback(async () => {
    const minVal = parseInt(rmBudgetMin, 10);
    const maxVal = parseInt(rmBudgetMax, 10);
    if (isNaN(minVal) || isNaN(maxVal) || minVal <= 0 || maxVal <= 0) {
      showToast("Please enter valid budget amounts.", "error");
      return;
    }
    if (minVal > maxVal) {
      showToast("Minimum budget cannot exceed maximum.", "error");
      return;
    }
    const next = {
      budgetMin: minVal, budgetMax: maxVal, moveInDate: rmMoveInDate,
      sleepSchedule: rmSleep, cleanliness: rmClean, noiseLevel: rmNoise,
      petFriendly: rmPet, smoking: rmSmoke, guestPolicy: rmGuest, workFromHome: rmWfh,
    };
    setRmSaving(true);
    try {
      await updateRoommatePrefs({ ...RM_DEFAULT_PREFS, ...next });
      try {
        await updateRoommatePreferences(roommatePrefsToPatchBody(next));
        const fresh = await getRoommatePreferences();
        const mapped = roommatePrefsFromGetEndpoint({
          budgetMin: fresh.budgetMin, budgetMax: fresh.budgetMax, moveInDate: fresh.moveInDate,
          sleepSchedule: fresh.sleepSchedule, cleanliness: fresh.cleanliness, noiseLevel: fresh.noiseLevel,
          petFriendly: fresh.petFriendly, smoking: fresh.smoking, guestPolicy: fresh.guestPolicy, workFromHome: fresh.workFromHome,
        });
        await updateRoommatePrefs({ ...RM_DEFAULT_PREFS, ...mapped });
      } catch { /* backend sync failed — local save kept */ }
      setRmPrefsModalVisible(false);
      showToast("Your roommate preferences have been updated.", "success");
      void loadRoommates();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not save. Try again.", "error");
    } finally {
      setRmSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rmBudgetMin, rmBudgetMax, rmMoveInDate, rmSleep, rmClean, rmNoise, rmPet, rmSmoke, rmGuest, rmWfh, updateRoommatePrefs, loadRoommates]);

  const housingListingsEverLoadedRef = useRef(false);
  const housingRoommatesEverLoadedRef = useRef(false);
  const loadListingsRef = useRef(loadListings);
  const loadRoommatesRef = useRef(loadRoommates);
  const loadAvailableRoomsRef = useRef(loadAvailableRooms);
  loadListingsRef.current = loadListings;
  loadRoommatesRef.current = loadRoommates;
  loadAvailableRoomsRef.current = loadAvailableRooms;

  // Re-fetch whenever the property type / price / beds / pets filters change
  // (loadListings identity changes with them since they're in its dep array).
  const listingsFilterLoadRef = useRef(loadListings);
  useEffect(() => {
    if (listingsFilterLoadRef.current === loadListings) return;
    listingsFilterLoadRef.current = loadListings;
    if (!housingListingsEverLoadedRef.current) return;
    void loadListings({ silent: true });
  }, [loadListings]);
  useFocusEffect(
    useCallback(() => {
      // SPRINT-42: listing browse always silent-refetches on focus (no 10-minute suppression). Roommate slices still honor TTL.
      // Loaders are read through refs so the effect only re-runs on focus / account change — not on
      // segment switches or filter edits (the filter effect above already refetches those).
      let cancelled = false;
      const cancelDefer = runAfterTransition(() => {
        if (cancelled) return;
        const loadListings = loadListingsRef.current;
        const loadRoommates = loadRoommatesRef.current;
        const loadAvailableRooms = loadAvailableRoomsRef.current;
        void (async () => {
          // Roommate prefs / matching require an account — skip for guests
          if (user?.id) {
            try {
              const fresh = await getRoommatePreferences();
              const mapped = roommatePrefsFromGetEndpoint({
                budgetMin: fresh.budgetMin, budgetMax: fresh.budgetMax, moveInDate: fresh.moveInDate,
                sleepSchedule: fresh.sleepSchedule, cleanliness: fresh.cleanliness, noiseLevel: fresh.noiseLevel,
                petFriendly: fresh.petFriendly, smoking: fresh.smoking, guestPolicy: fresh.guestPolicy, workFromHome: fresh.workFromHome,
              });
              await updateRoommatePrefs({ ...RM_DEFAULT_PREFS, ...mapped });
            } catch { /* backend unreachable — keep local */ }
          }
          if (cancelled) return;
          const silentListings = housingListingsEverLoadedRef.current;
          try {
            await loadListings({ silent: silentListings }); // SPRINT-42: always refresh listings on focus so edits are not TTL-stale.
            housingListingsEverLoadedRef.current = true;
          } catch {
            if (!silentListings) showToast("Could not load listings. Please try again.", "error");
          }
          if (cancelled) return;
          if (!user?.id) {
            useListFetchCacheStore.getState().markFetched("housing");
            return;
          }
          const refreshRoommates = useListFetchCacheStore.getState().shouldFetch("housing"); // SPRINT-42: roommates keep the prior TTL gate (cleared on listing publish).
          if (!refreshRoommates && housingRoommatesEverLoadedRef.current) { // SPRINT-42: skip roommate refetch only when TTL is fresh and roommates already loaded.
            return; // SPRINT-42: listings already refreshed above.
          } // SPRINT-42: finish roommate TTL short-circuit.
          const silentRm = housingRoommatesEverLoadedRef.current;
          try {
            await Promise.all([loadRoommates({ silent: silentRm }), loadAvailableRooms({ silent: silentRm })]);
            housingRoommatesEverLoadedRef.current = true;
          } catch {
            if (!silentRm) showToast("Could not load roommates. Please try again.", "error");
          }
          useListFetchCacheStore.getState().markFetched("housing");
        })();
      });
      return () => {
        cancelled = true;
        cancelDefer();
      };
    }, [updateRoommatePrefs, user?.id]),
  );

  const openRoommateProfile = useCallback(async (id: string) => {
    try {
      const full = await getRoommate(id);
      setSelectedRoommate(toUiRoommate(full));
    } catch {
      const local = roommates.find((x) => x.id === id);
      if (local) setSelectedRoommate(local);
      else showToast("Could not load this roommate.", "error");
    }
  }, [roommates]);

  // Preferences setup is handled in Edit Profile — no auto-prompt needed here.

  useEffect(() => {
    const raw = params.openListing;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || openedListingDeepLink.current === id) return;
    openedListingDeepLink.current = id;
    setActiveTab("listings");
    (async () => {
      try {
        const row = await getListing(id);
        setSelectedListing(toUiListing(row, user?.id));
      } catch {
        showToast("This listing may have been removed.", "error");
      }
    })();
  }, [params.openListing, user?.id]);

  useEffect(() => {
    const raw = params.openRoommate;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || openedRoommateDeepLink.current === id) return;
    if (!requireAuth(undefined, "Sign in to view roommate profiles.")) return;
    openedRoommateDeepLink.current = id;
    setActiveTab("roommates");
    setRmSubTab("searching");
    (async () => {
      try {
        const rm = await getRoommate(id);
        setSelectedRoommate(toUiRoommate(rm));
      } catch {
        showToast("This roommate profile may no longer be active.", "error");
      }
    })();
  }, [params.openRoommate, requireAuth]);

  const onRefresh = useCallback(() => {
    useListFetchCacheStore.getState().clearFetchTimestamp("housing"); // SPRINT-27
    (async () => {
      try {
        setRefreshing(true);
        setSearch("");
        setPropertyTypeFilter("All");
        setRmFilter("Best Match");
        setSelectedListing(null);
        setSelectedRoommate(null);
        if (activeTab === "listings") {
          await loadListings();
        } else if (activeTab === "roommates") {
          await Promise.all([loadRoommates(), loadAvailableRooms()]);
        }
      } finally {
        setRefreshing(false);
      }
    })();
  }, [activeTab, loadAvailableRooms, loadListings, loadRoommates]);

  const handleConnect = async (rm: Roommate) => {
    try {
      const res = await connectWithRoommate(rm.id);
      const cid = res.conversationId ?? null;
      setSelectedRoommate((prev) =>
        prev?.id === rm.id
          ? { ...prev, connectionStatus: "pending_sent", conversationId: cid ?? prev.conversationId }
          : prev,
      );
      setRoommates((prev) =>
        prev.map((x) =>
          x.id === rm.id ? { ...x, connectionStatus: "pending_sent" as const, conversationId: cid ?? x.conversationId } : x,
        ),
      );
    } catch {
      showToast("Could not connect. Please try again.", "error");
      void openRoommateProfile(rm.id);
    }
  };

  const handleAcceptRoommate = async (rm: Roommate) => {
    try {
      const { conversationId } = await acceptRoommateConnection(rm.id);
      const patch = (x: Roommate): Roommate =>
        x.id === rm.id
          ? { ...x, connectionStatus: "accepted", conversationId: conversationId ?? x.conversationId }
          : x;
      setSelectedRoommate((prev) => (prev?.id === rm.id ? patch(prev) : prev));
      setRoommates((prev) => prev.map(patch));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not accept. Try again.", "error");
    }
  };

  const handleDeclineRoommate = async (rm: Roommate) => {
    try {
      await declineRoommateConnection(rm.id);
      const patch = (x: Roommate): Roommate =>
        x.id === rm.id ? { ...x, connectionStatus: null, conversationId: null } : x;
      setSelectedRoommate((prev) => (prev?.id === rm.id ? patch(prev) : prev));
      setRoommates((prev) => prev.map(patch));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not decline. Try again.", "error");
    }
  };

  const handleCancelRequest = async (rm: Roommate) => {
    try {
      await declineRoommateConnection(rm.id);
      const patch = (x: Roommate): Roommate =>
        x.id === rm.id ? { ...x, connectionStatus: null, conversationId: null } : x;
      setSelectedRoommate((prev) => (prev?.id === rm.id ? patch(prev) : prev));
      setRoommates((prev) => prev.map(patch));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not cancel. Try again.", "error");
    }
  };

  const toggleRoommateBookmark = async (id: string) => {
    try {
      const { saved } = await toggleRoommateSave(id);
      setRoommateSavedIds((p) => {
        const n = new Set(p);
        if (saved) n.add(id);
        else n.delete(id);
        return n;
      });
      setSelectedRoommate((prev) =>
        prev?.id === id ? { ...prev, isSaved: saved } : prev,
      );
      setRoommates((prev) =>
        prev.map((x) => (x.id === id ? { ...x, isSaved: saved } : x)),
      );
    } catch {
      showToast("Could not update save. Please try again.", "error");
    }
  };

  const handleApplySharedSpace = async (id: string, message?: string) => {
    const { isAuthed, user } = useAuthStore.getState();
    if (!isAuthed || !user?.onboardingDone) {
      // Close the room modal so the sign-in / onboarding screen isn't hidden behind it.
      setSelectedAvailableRoom(null);
      setTimeout(() => { requireAuth(undefined, "Sign in to request this shared space."); }, Platform.OS === "ios" ? 450 : 250);
      return;
    }
    try {
      await applyToSharedSpace(id, message?.trim() || undefined);
      setRequestedRooms((p) => {
        const n = new Set(p);
        n.add(id);
        return n;
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "";
      if (msg.toLowerCase().includes("already applied")) {
        setRequestedRooms((p) => {
          const n = new Set(p);
          n.add(id);
          return n;
        });
      }
      showToast(msg || "Could not send request. Please try again.", "error");
    }
  };

  const handleToggleSharedSpaceSave = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to save this space and find it later.")) return;
    try {
      const { saved } = await toggleFavoriteSharedSpace(id);
      setAvailableRooms((prev) =>
        prev.map((r) =>
          r.id === id && r.api
            ? {
                ...r,
                api: {
                  ...r.api,
                  isSaved: saved,
                  savedByMe: saved,
                },
              }
            : r,
        ),
      );
    } catch {
      showToast("Could not update bookmark. Please try again.", "error");
    }
  };

  const handleDeleteSharedSpace = (id: string) => {
    appAlert("Delete this listing?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSharedSpace(id);
            setAvailableRooms((p) => p.filter((x) => x.id !== id));
            setSelectedAvailableRoom(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Shared space deleted.", "success");
          } catch (err) {
            showToast(err instanceof ApiError ? err.message : "Could not delete. Try again.", "error");
          }
        },
      },
    ]);
  };

  const [editRoomTarget, setEditRoomTarget] = useState<AvailableRoom | null>(null);
  const [editRoomDesc, setEditRoomDesc] = useState("");
  const [editRoomPrice, setEditRoomPrice] = useState("");
  const [editRoomDeposit, setEditRoomDeposit] = useState("");
  const [editRoomSpots, setEditRoomSpots] = useState("");
  const [editRoomSaving, setEditRoomSaving] = useState(false);

  const openEditSharedSpace = (room: AvailableRoom) => {
    setEditRoomDesc(room.apartmentDesc || "");
    setEditRoomPrice(String(room.rentPerMonth ?? ""));
    setEditRoomDeposit(String(room.deposit ?? ""));
    setEditRoomSpots(String(room.availableRooms ?? ""));
    setEditRoomTarget(room);
  };

  const handleSaveEditSharedSpace = async () => {
    if (!editRoomTarget) return;
    const price = Number(editRoomPrice);
    const deposit = editRoomDeposit.trim() ? Number(editRoomDeposit) : undefined;
    const availableSpots = Number(editRoomSpots);
    if (!editRoomDesc.trim()) {
      showToast("Description can't be empty.", "error");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      showToast("Enter a valid monthly rent.", "error");
      return;
    }
    if (!Number.isFinite(availableSpots) || availableSpots < 0) {
      showToast("Enter a valid number of available spots.", "error");
      return;
    }
    setEditRoomSaving(true);
    try {
      const updated = await updateSharedSpace(editRoomTarget.id, {
        description: editRoomDesc.trim(),
        price,
        deposit: deposit != null && Number.isFinite(deposit) ? deposit : undefined,
        availableSpots,
      });
      const merged = toUiAvailableRoom(updated);
      setAvailableRooms((prev) => prev.map((r) => (r.id === editRoomTarget.id ? merged : r)));
      setSelectedAvailableRoom((prev) => (prev && prev.id === editRoomTarget.id ? merged : prev));
      setEditRoomTarget(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Changes saved.", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save changes. Try again.", "error");
    } finally {
      setEditRoomSaving(false);
    }
  };

  const toggleSave = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to save listings and find them later.")) return;
    try {
      const { saved } = await toggleListingSave(id);
      setSavedIds((p) => {
        const n = new Set(p);
        if (saved) n.add(id);
        else n.delete(id);
        return n;
      });
    } catch {
      showToast("Could not update save. Please try again.", "error");
    }
  };

  // LST-03: search is server-backed; only filter locally while the debounce has not caught up yet.
  const filtered = useMemo(
    () =>
      search.trim() === debouncedSearch
        ? listings
        : listings.filter(
            (l) =>
              l.title.toLowerCase().includes(search.toLowerCase()) ||
              l.location.toLowerCase().includes(search.toLowerCase()),
          ),
    [search, debouncedSearch, listings],
  );

  // ── Roommates: sort + filter ──
  const sortedRoommates = useMemo(() => {
    let list = [...roommates];

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.occupation.toLowerCase().includes(q)
      );
    }

    // Filter
    if (rmFilter === "Verified") list = list.filter((r) => r.verified);
    if (rmFilter === "Move-in Soon") {
      // Moving in within the next 30 days (or already able to). Undated "Flexible" profiles are left out.
      const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
      list = list
        .filter((r) => r.moveInAt != null && r.moveInAt <= soon)
        .sort((a, b) => (a.moveInAt ?? 0) - (b.moveInAt ?? 0));
    }

    // Sort — always apply match score sort by default, override for other filters
    const cu = buildCurrentUserForMatch(user);
    if (rmFilter === "Best Match" || (!["Budget", "Move-in Soon", "Verified"].includes(rmFilter))) {
      list.sort((a, b) => {
        const scoreA = a.apiMatchScore ?? computeMatch(cu, a).score;
        const scoreB = b.apiMatchScore ?? computeMatch(cu, b).score;
        return scoreB - scoreA;
      });
    } else if (rmFilter === "Budget") {
      list.sort((a, b) => a.budgetMin - b.budgetMin);
    }

    return list;
  }, [search, rmFilter, roommates, user]);

  // ── Stable row handlers (keep MemoListingCard / MemoRoommateCard from re-rendering) ──
  const onToggleListingSave = useStableCallback((id: string) => void toggleSave(id));
  const openListingImages = useStableCallback((images: string[], idx: number) => {
    setFullscreenImages(images);
    setFullscreenStartIdx(idx);
    setFullscreenVisible(true);
  });
  const onToggleRoommateSave = useStableCallback((id: string) => void toggleRoommateBookmark(id));
  const onOpenRoommate = useStableCallback((id: string) => void openRoommateProfile(id));
  const onConnectRoommate = useStableCallback((rm: Roommate) => void handleConnect(rm));
  const onCancelRoommateRequest = useStableCallback((rm: Roommate) => void handleCancelRequest(rm));
  const openRoommateConversation = useStableCallback((cid: string) =>
    router.push({ pathname: "/chat", params: { conversationId: cid, returnTo: "housing" } } as any),
  );

  // ── Virtualized main list ──
  // One FlatList for every mode: the hero / switcher / search / chips live in ListHeaderComponent,
  // the rows are whichever list the active (sub-)tab shows, so only on-screen cards are mounted.
  const listRows = useMemo<HousingRow[]>(() => {
    // Design D: the first home is a feature card, the rest two-column tiles; rooms are tiles too.
    const pairs = <T,>(arr: T[]) => { const out: T[][] = []; for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2)); return out; };
    if (activeTab === "listings") {
      if (filtered.length === 0) return [];
      return [{ kind: "listing", listing: filtered[0] } as HousingRow, ...pairs(filtered.slice(1)).map((listings) => ({ kind: "listingPair", listings }) as HousingRow)];
    }
    if (rmSubTab === "searching") {
      return pairs(availableRoomsLoading ? [] : availableRooms).map((rooms) => ({ kind: "roomPair", rooms }) as HousingRow);
    }
    return sortedRoommates.map((roommate) => ({ kind: "roommate", roommate }));
  }, [activeTab, rmSubTab, filtered, availableRooms, availableRoomsLoading, sortedRoommates]);

  const renderHousingRow = useCallback(
    ({ item }: { item: HousingRow }) => {
      if (item.kind === "listing") {
        return <ListingFeature listing={item.listing} saved={savedIds.has(item.listing.id)} onToggleSaveId={onToggleListingSave} onOpen={setSelectedListing} />;
      }
      if (item.kind === "listingPair") {
        return (
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 16 }}>
            {item.listings.map((l) => <ListingTile key={l.id} listing={l} saved={savedIds.has(l.id)} onToggleSaveId={onToggleListingSave} onOpen={setSelectedListing} />)}
            {item.listings.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        );
      }
      if (item.kind === "roomPair") {
        return (
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 16 }}>
            {item.rooms.map((r) => <RoomTile key={r.id} room={r} onOpen={setSelectedAvailableRoom} />)}
            {item.rooms.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        );
      }
      const rm = item.roommate;
      return (
        <MemoRoommateCard
          roommate={rm}
          isSaved={roommateSavedIds.has(rm.id)}
          onToggleSaveId={onToggleRoommateSave}
          onOpenId={onOpenRoommate}
          onConnectRm={onConnectRoommate}
          onCancelRm={onCancelRoommateRequest}
          onOpenConversation={openRoommateConversation}
        />
      );
    },
    // The handlers are stable; the saved / requested sets are what change a visible row.
    [
      savedIds,
      requestedRooms,
      roommateSavedIds,
      onToggleListingSave,
      openListingImages,
      onToggleRoommateSave,
      onOpenRoommate,
      onConnectRoommate,
      onCancelRoommateRequest,
      openRoommateConversation,
    ],
  );

  // ── Tab indicator animation ──
  const tabAnim = useRef(new Animated.Value(0)).current;
  const switchTab = (tab: HousingTab) => {
    if (tab === "roommates" && !requireAuth(undefined, "Sign in to find compatible roommates matched to you.")) {
      return;
    }
    // Start the (native-driven) indicator first so it glides even while the segment re-renders.
    Animated.spring(tabAnim, {
      toValue: tab === "listings" ? 0 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
    void Haptics.selectionAsync();
    setActiveTab(tab);
    setSearch("");
    if (tab === "roommates" && roommates.length === 0 && !roommatesLoading) {
      void Promise.all([loadRoommates(), loadAvailableRooms()]);
    }
  };

  const [tabSwitcherWidth, setTabSwitcherWidth] = useState(0);
  const tabSlide = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabSwitcherWidth / 2],
  });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top"]}>
      <AppHeader title="Listings" scrollY={housingScrollY} />
      <Reanimated.FlatList
        ref={housingScrollRef as any}
        onScroll={onHousingScroll}
        scrollEventThrottle={16}
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: tabBarClearance(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand.blue}
            colors={[Colors.brand.blue]}
          />
        }
        data={listRows}
        keyExtractor={housingRowKey}
        renderItem={renderHousingRow}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        ListHeaderComponent={
          <>
            {/* ── Design D: large title, city, one row of tabs (Homes / Rooms / Roommates) ── */}
            <Text style={[TYPE.pageTitle, { color: tc.textPrimary, paddingHorizontal: 18, paddingTop: 2 }]}>Listings</Text>
            {userCity ? <Text style={[TYPE.small, { color: tc.textSecondary, paddingHorizontal: 18, marginTop: 2, marginBottom: 12 }]}>{userCity}</Text> : <View style={{ height: 12 }} />}
            <Segmented
              style={{ marginHorizontal: 16, marginBottom: 12 }}
              items={[{ key: "homes", label: "Homes" }, { key: "rooms", label: "Rooms" }, { key: "mates", label: "Roommates" }]}
              value={activeTab === "listings" ? "homes" : rmSubTab === "searching" ? "rooms" : "mates"}
              onChange={(k) => {
                if (k === "homes") { switchTab("listings"); return; }
                if (activeTab !== "roommates") switchTab("roommates");
                setRmSubTab(k === "rooms" ? "searching" : "matching");
              }}
            />

                        {/* Search */}
            <View style={[s.searchWrap, { backgroundColor: tc.inputBg, borderColor: "transparent", borderRadius: 16 }]}>
              <Ionicons name="search-outline" size={17} color={tc.textTertiary} />
              <TextInput
                style={[s.searchInput, { color: tc.textPrimary }]}
                placeholder={
                  activeTab === "listings"
                    ? "Search by name, location..."
                    : "Search by name, location, occupation..."
                }
                placeholderTextColor={tc.textTertiary}
                value={search}
                onChangeText={setSearch}
              />
              {!!search && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={tc.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* ═══ LISTINGS TAB ═══ */}
            {activeTab === "listings" && (
              <>
                {/* Design D: type chips, then Filters (posting lives behind the tab bar's +) */}
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" }}>
                  {FILTERS.map((f) => (
                    <Chip key={f} label={f} on={propertyTypeFilter === f} onPress={() => setPropertyTypeFilter(f)} />
                  ))}
                  <Chip
                    label="Filters"
                    on={!!(minPriceFilter || maxPriceFilter || bedsFilter != null || petsFilter != null)}
                    onPress={() => setShowFilterSheet(true)}
                    icon={<Ionicons name="options-outline" size={14} color={(minPriceFilter || maxPriceFilter || bedsFilter != null || petsFilter != null) ? "#FFF" : tc.textSecondary} />}
                  />
                </GHScrollView>

                {/* <View style={s.listingsResultsRow}>
                  <Text
                    style={[
                      s.resultCount,
                      {
                        color: tc.textTertiary,
                        marginTop: 0,
                        marginBottom: 0,
                        paddingHorizontal: 0,
                        flex: 1,
                      },
                    ]}
                  >
                    {filtered.length} listing{filtered.length !== 1 ? "s" : ""} found
                  </Text>
                </View> */}

                {listingsLoading ? (
                  <View style={{ paddingTop: 8 }} accessibilityLabel="Loading listings">
                    <SkeletonCard imageHeight={220} />
                    <SkeletonCard imageHeight={220} />
                  </View>
                ) : null}

                {/* Safe Renting Guide */}
                <SafeRentingGuide />
              </>
            )}

            {/* ═══ ROOMMATES TAB ═══ */}
            {activeTab === "roommates" && (
              <>
                {/* ── SEARCHING SUB-TAB ── */}
                {rmSubTab === "searching" && (
                  <>
                    {/* Design D: one button to list a room */}
                    <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
                      <SoftButton
                        block
                        label="Rent out a room in my home"
                        icon={<Ionicons name="key-outline" size={18} color={tc.accentText} />}
                        onPress={() => {
                          if (!user?.id) {
                            appAlert("Sign in required", "Log in to list a shared space.");
                            return;
                          }
                          router.push({ pathname: "/create-post" as any, params: { type: "shared_space" } });
                        }}
                      />
                    </View>

                                        {availableRoomsLoading ? (
                      <View accessibilityLabel="Loading shared spaces">
                        <SkeletonCard imageHeight={170} />
                        <SkeletonCard imageHeight={170} />
                      </View>
                    ) : null}

                    {!availableRoomsLoading && availableRooms.length === 0 ? (
                      <ListState
                        kind="empty"
                        icon="key-outline"
                        title={`No shared rooms in ${user?.city || "your city"} yet`}
                        message="Have a spare room? List it above and match with a compatible housemate."
                      />
                    ) : null}
                  </>
                )}

                {/* ── ROOMMATE MATCHING SUB-TAB ── */}
                {rmSubTab === "matching" && (
                  <>
                    {/* Design D: sort as chips; one line says how matches are ordered */}
                    <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
                      {ROOMMATE_FILTERS.map((f) => (
                        <Chip key={f} label={f} on={rmFilter === f} onPress={() => setRmFilter(f)} />
                      ))}
                    </GHScrollView>
                    <Text style={[TYPE.small, { color: tc.textSecondary, paddingHorizontal: 18, marginBottom: 10 }]}>
                      {sortedRoommates.length} {sortedRoommates.length !== 1 ? "people" : "person"} in {user?.city || "your city"} · matched on communities, vibes, interests and lifestyle
                    </Text>

                    {roommatesLoading ? (
                      <View accessibilityLabel="Loading roommate matches">
                        <SkeletonCard imageHeight={120} />
                        <SkeletonCard imageHeight={120} />
                      </View>
                    ) : null}

                    {!roommatesLoading && sortedRoommates.length === 0 ? (() => {
                      const hasPrefs = !!(
                        user?.roommatePrefs && (
                          (user.roommatePrefs.budgetMin != null && user.roommatePrefs.budgetMin > 0) ||
                          (user.roommatePrefs.budgetMax != null && user.roommatePrefs.budgetMax > 0) ||
                          !!user.roommatePrefs.moveInDate ||
                          !!user.roommatePrefs.sleepSchedule
                        )
                      );
                      return (
                        <View style={{ paddingHorizontal: 24, paddingVertical: 32, alignItems: "center" }}>
                          <Ionicons name="people-outline" size={40} color={tc.textTertiary} />
                          <Text style={{ color: tc.textPrimary, fontWeight: "800", marginTop: 12, textAlign: "center" }}>
                            {hasPrefs ? "No matches found yet" : "No roommate matches yet"}
                          </Text>
                          <Text style={{ color: tc.textSecondary, marginTop: 8, textAlign: "center" }}>
                            {hasPrefs
                              ? "Your preferences are set. Matches will appear here as others join with compatible preferences."
                              : "Set up your roommate preferences to appear in searches and find matches."}
                          </Text>
                          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                            {hasPrefs && (
                              <Pressable
                                onPress={() => void loadRoommates()}
                                style={{ paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: Colors.brand.blue }}
                              >
                                <Text style={{ color: Colors.brand.blue, fontWeight: "700" }}>Refresh</Text>
                              </Pressable>
                            )}
                            <Pressable
                              onPress={() => openRmPrefsModal()}
                              style={{ paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, backgroundColor: Colors.brand.blue }}
                            >
                              <Text style={{ color: "#FFF", fontWeight: "800" }}>{hasPrefs ? "Edit Preferences" : "Set Up Preferences"}</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })() : null}
                  </>
                )}
              </>
            )}
          </>
        }
        ListFooterComponent={
          <>
            {activeTab === "listings" && (
              <>
                {!listingsLoading && listingsHasMore && filtered.length > 0 && (
                  <Pressable
                    onPress={() => void loadMoreListings()}
                    disabled={listingsLoadingMore}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 13,
                      borderRadius: 14,
                      marginTop: 4,
                      marginBottom: 12,
                      backgroundColor: tc.cardBg,
                      borderWidth: 1,
                      borderColor: tc.borderLight,
                      opacity: listingsLoadingMore ? 0.6 : 1,
                    }}
                  >
                    {listingsLoadingMore ? (
                      <ActivityIndicator size="small" color={Colors.brand.blue} />
                    ) : (
                      <Ionicons name="chevron-down-circle-outline" size={18} color={Colors.brand.blue} />
                    )}
                    <Text style={{ fontSize: 14, fontWeight: "800", color: Colors.brand.blue }}>
                      {listingsLoadingMore ? "Loading more..." : "Load More Listings"}
                    </Text>
                  </Pressable>
                )}

                {!listingsLoading && listingsError && filtered.length === 0 && (
                  <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 }}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>📡</Text>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: tc.textPrimary, textAlign: "center" }}>
                      Couldn't load listings
                    </Text>
                    <Text style={{ fontSize: 13, color: tc.textSecondary, textAlign: "center", marginTop: 4 }}>
                      Check your connection and try again.
                    </Text>
                    <Pressable
                      onPress={() => void loadListings()}
                      style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.brand.blue, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10, marginTop: 14 }}
                    >
                      <Ionicons name="refresh" size={16} color="#FFF" />
                      <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "800" }}>Retry</Text>
                    </Pressable>
                  </View>
                )}

                {!hasCity && (
                  <>
                    <ListState kind="needs-city" onAction={chooseCity} />
                    <GuestCityPickerModal visible={cityPickerVisible} onClose={() => setCityPickerVisible(false)} />
                  </>
                )}

                {hasCity && !listingsLoading && !listingsError && filtered.length === 0 && (
                  <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tc.sectionBg, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                      <Ionicons name="home-outline" size={26} color={tc.textTertiary} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: tc.textPrimary, textAlign: "center" }}>
                      No listings in {userCity || "this area"} yet
                    </Text>
                    <Text style={{ fontSize: 13, color: tc.textSecondary, textAlign: "center", marginTop: 4 }}>
                      Try a different city, or check back soon as new listings are posted.
                    </Text>
                  </View>
                )}
              </>
            )}
            <View style={{ height: 24 }} />
          </>
        }
      />

      {/* Detail modals */}
      <PropertyDetailModal
        listing={selectedListing}
        visible={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        onDelete={
          selectedListing?.isOwner ? () => confirmDeleteListing(selectedListing.id) : undefined
        }
        onEdit={selectedListing?.isOwner ? () => { const id = selectedListing.id; setSelectedListing(null); router.push({ pathname: "/create-post", params: { type: "listing", mode: "edit", id } } as any); } : undefined} // SPRINT-42: open the reused listing editor with the authoritative listing id.
        initialJourneyStep={selectedListing ? (listingJourneyMap[selectedListing.id] ?? 0) : 0}
        onJourneyStepChange={(id, step) => setListingJourneyMap((prev) => ({ ...prev, [id]: step }))}
        isBookmarked={selectedListing ? savedIds.has(selectedListing.id) : false}
        onToggleBookmark={() => {
          if (selectedListing) void toggleSave(selectedListing.id);
        }}
      />
      <RoommateDetailModal
        roommate={selectedRoommate}
        visible={!!selectedRoommate}
        onClose={() => setSelectedRoommate(null)}
        isBookmarked={selectedRoommate ? roommateSavedIds.has(selectedRoommate.id) : false}
        onToggleBookmark={() => {
          if (selectedRoommate) void toggleRoommateBookmark(selectedRoommate.id);
        }}
        onConnect={() => selectedRoommate && void handleConnect(selectedRoommate)}
        onAccept={() => selectedRoommate && void handleAcceptRoommate(selectedRoommate)}
        onDecline={() => selectedRoommate && void handleDeclineRoommate(selectedRoommate)}
        onCancelRequest={() => selectedRoommate && void handleCancelRequest(selectedRoommate)}
      />
      <AvailableRoomDetailModal
        room={selectedAvailableRoom}
        visible={!!selectedAvailableRoom}
        onClose={() => setSelectedAvailableRoom(null)}
        requested={selectedAvailableRoom ? requestedRooms.has(selectedAvailableRoom.id) : false}
        saved={!!selectedAvailableRoom?.api?.isSaved}
        isOwner={!!selectedAvailableRoom?.api?.isOwner}
        onToggleSave={
          selectedAvailableRoom
            ? () => void handleToggleSharedSpaceSave(selectedAvailableRoom.id)
            : undefined
        }
        onDelete={
          selectedAvailableRoom?.api?.isOwner
            ? () => handleDeleteSharedSpace(selectedAvailableRoom.id)
            : undefined
        }
        onEdit={
          selectedAvailableRoom?.api?.isOwner ? (room) => openEditSharedSpace(room) : undefined
        }
        onApplyWithMessage={(msg) => {
          if (selectedAvailableRoom) void handleApplySharedSpace(selectedAvailableRoom.id, msg);
        }}
        onRequest={() => {
          if (selectedAvailableRoom) setSelectedAvailableRoom(selectedAvailableRoom);
        }}
      />
      <ListYourSpaceModal
        visible={showListModal}
        onClose={() => setShowListModal(false)}
        onSubmit={() => setShowListModal(false)}
      />

      {/* ── Edit Shared Space Modal ── */}
      <Modal
        visible={!!editRoomTarget}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !editRoomSaving && setEditRoomTarget(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <SafeAreaView style={{ flex: 1, backgroundColor: tc.sheetBg ?? tc.cardBg }} edges={["top", "bottom"]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: rs(20), paddingVertical: rs(14), borderBottomWidth: 1, borderBottomColor: tc.borderLight }}>
              <Pressable onPress={() => !editRoomSaving && setEditRoomTarget(null)} hitSlop={12}>
                <Ionicons name="close" size={24} color={tc.textPrimary} />
              </Pressable>
              <Text style={{ fontSize: rs(16), fontWeight: "800", color: tc.textPrimary }}>Edit Listing</Text>
              <Pressable
                onPress={() => void handleSaveEditSharedSpace()}
                hitSlop={12}
                disabled={editRoomSaving}
                style={{ backgroundColor: Colors.brand.blue, borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(7), opacity: editRoomSaving ? 0.65 : 1 }}
              >
                {editRoomSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: "#FFF", fontWeight: "800", fontSize: rs(13) }}>Save</Text>}
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: rs(20), gap: rs(18) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View>
                <Text style={{ fontSize: rs(12), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(8), textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Description
                </Text>
                <TextInput
                  style={{ borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(12), backgroundColor: tc.inputBg, color: tc.textPrimary, paddingHorizontal: rs(14), paddingVertical: rs(12), fontSize: rs(14), minHeight: rs(110), textAlignVertical: "top" }}
                  value={editRoomDesc}
                  onChangeText={setEditRoomDesc}
                  placeholder="Describe the space, house rules, what makes it a good fit..."
                  placeholderTextColor={tc.textTertiary}
                  multiline
                  editable={!editRoomSaving}
                />
              </View>

              <View style={{ flexDirection: "row", gap: rs(10) }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rs(12), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(8), textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Monthly Rent
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), backgroundColor: tc.inputBg, paddingHorizontal: rs(10), height: rs(46) }}>
                    <Text style={{ color: tc.textSecondary, fontWeight: "700", marginRight: rs(4) }}>$</Text>
                    <TextInput
                      style={{ flex: 1, fontSize: rs(14), color: tc.textPrimary }}
                      value={editRoomPrice}
                      onChangeText={setEditRoomPrice}
                      keyboardType="numeric"
                      placeholder="Rent"
                      placeholderTextColor={tc.textTertiary}
                      editable={!editRoomSaving}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rs(12), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(8), textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Deposit
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), backgroundColor: tc.inputBg, paddingHorizontal: rs(10), height: rs(46) }}>
                    <Text style={{ color: tc.textSecondary, fontWeight: "700", marginRight: rs(4) }}>$</Text>
                    <TextInput
                      style={{ flex: 1, fontSize: rs(14), color: tc.textPrimary }}
                      value={editRoomDeposit}
                      onChangeText={setEditRoomDeposit}
                      keyboardType="numeric"
                      placeholder="Deposit"
                      placeholderTextColor={tc.textTertiary}
                      editable={!editRoomSaving}
                    />
                  </View>
                </View>
              </View>

              <View>
                <Text style={{ fontSize: rs(12), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(8), textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Available Spots
                </Text>
                <TextInput
                  style={{ borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), backgroundColor: tc.inputBg, color: tc.textPrimary, paddingHorizontal: rs(14), height: rs(46), fontSize: rs(14) }}
                  value={editRoomSpots}
                  onChangeText={setEditRoomSpots}
                  keyboardType="numeric"
                  placeholder="e.g. 1"
                  placeholderTextColor={tc.textTertiary}
                  editable={!editRoomSaving}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen image viewer */}
      {fullscreenVisible && fullscreenImages.length > 0 && (
        <FullscreenImageViewer
          images={fullscreenImages}
          startIndex={fullscreenStartIdx}
          onClose={() => setFullscreenVisible(false)}
        />
      )}

      {/* ── Listings filter sheet (price / beds / pets) ── */}
      <Modal
        visible={showFilterSheet}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFilterSheet(false)} />
          <View style={{ backgroundColor: tc.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <Text style={{ fontSize: 17, fontWeight: "900", color: tc.textPrimary }}>Filters</Text>
              <Pressable onPress={() => setShowFilterSheet(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={tc.textSecondary} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, fontWeight: "800", color: tc.textTertiary, marginBottom: 8, letterSpacing: 0.4 }}>PRICE RANGE / MONTH</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <TextInput
                value={minPriceFilter}
                onChangeText={(t) => setMinPriceFilter(t.replace(/[^0-9]/g, ""))}
                placeholder="Min"
                placeholderTextColor={tc.textTertiary}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: tc.inputBg, borderRadius: 12, borderWidth: 1, borderColor: tc.borderLight, paddingHorizontal: 14, paddingVertical: 10, color: tc.textPrimary, fontSize: 14 }}
              />
              <Text style={{ color: tc.textTertiary }}>—</Text>
              <TextInput
                value={maxPriceFilter}
                onChangeText={(t) => setMaxPriceFilter(t.replace(/[^0-9]/g, ""))}
                placeholder="Max"
                placeholderTextColor={tc.textTertiary}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: tc.inputBg, borderRadius: 12, borderWidth: 1, borderColor: tc.borderLight, paddingHorizontal: 14, paddingVertical: 10, color: tc.textPrimary, fontSize: 14 }}
              />
            </View>

            <Text style={{ fontSize: 12, fontWeight: "800", color: tc.textTertiary, marginBottom: 8, letterSpacing: 0.4 }}>BEDROOMS</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[null, 0, 1, 2, 3, 4].map((n) => (
                <Pressable
                  key={String(n)}
                  onPress={() => { Haptics.selectionAsync(); setBedsFilter(n); }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    alignItems: "center",
                    backgroundColor: bedsFilter === n ? Colors.brand.blue : tc.inputBg,
                    borderColor: bedsFilter === n ? Colors.brand.blue : tc.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: bedsFilter === n ? "#FFF" : tc.textSecondary }}>
                    {n === null ? "Any" : n === 0 ? "Studio" : `${n}+`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: "800", color: tc.textTertiary, marginBottom: 8, letterSpacing: 0.4 }}>PETS</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
              {[{ label: "Any", value: null }, { label: "Pets Allowed", value: true }, { label: "No Pets", value: false }].map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => { Haptics.selectionAsync(); setPetsFilter(opt.value); }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    alignItems: "center",
                    backgroundColor: petsFilter === opt.value ? Colors.brand.blue : tc.inputBg,
                    borderColor: petsFilter === opt.value ? Colors.brand.blue : tc.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: petsFilter === opt.value ? "#FFF" : tc.textSecondary }} numberOfLines={1}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setMinPriceFilter("");
                  setMaxPriceFilter("");
                  setBedsFilter(null);
                  setPetsFilter(null);
                }}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: "center", backgroundColor: tc.inputBg, borderWidth: 1, borderColor: tc.borderLight }}
              >
                <Text style={{ fontSize: 14, fontWeight: "800", color: tc.textSecondary }}>Clear All</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilterSheet(false); }}
                style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
              >
                <LinearGradient colors={[Colors.brand.blue, "#0054CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 13, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#FFF" }}>Apply Filters</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Inline Roommate Prefs Modal ── */}
      <Modal
        visible={rmPrefsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRmPrefsModalVisible(false)}
      >
        {/* Android: no "height" behavior — it can leave the sheet clipped at a fixed height after the keyboard closes (blank area below Lifestyle). */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={{ flex: 1, backgroundColor: tc.sheetBg ?? tc.cardBg }} edges={["top", "bottom"]}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: rs(20), paddingVertical: rs(14), borderBottomWidth: 1, borderBottomColor: tc.borderLight }}>
              <Pressable onPress={() => setRmPrefsModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={tc.textPrimary} />
              </Pressable>
              <Text style={{ fontSize: rs(16), fontWeight: "800", color: tc.textPrimary }}>Roommate Preferences</Text>
              <Pressable onPress={() => void saveRmPrefs()} hitSlop={12} disabled={rmSaving}
                style={{ backgroundColor: Colors.brand.blue, borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(7), opacity: rmSaving ? 0.65 : 1 }}>
                {rmSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: "#FFF", fontWeight: "800", fontSize: rs(13) }}>Save</Text>}
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: rs(20), gap: rs(20), paddingBottom: rs(40) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled automaticallyAdjustKeyboardInsets>
              {/* Budget */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10) }}>
                  <View style={{ width: rs(30), height: rs(30), borderRadius: rs(8), backgroundColor: Colors.brand.blueLight, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="cash-outline" size={16} color={Colors.brand.blue} />
                  </View>
                  <Text style={{ fontSize: rs(14), fontWeight: "700", color: tc.textPrimary }}>Monthly Budget</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(8) }}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), backgroundColor: tc.inputBg, paddingHorizontal: rs(10), height: rs(46) }}>
                    <Text style={{ color: tc.textSecondary, fontWeight: "700", marginRight: rs(4) }}>$</Text>
                    <TextInput style={{ flex: 1, fontSize: rs(14), color: tc.textPrimary }} value={rmBudgetMin} onChangeText={setRmBudgetMin} keyboardType="numeric" placeholder="Min" placeholderTextColor={tc.textTertiary} />
                  </View>
                  <Text style={{ color: tc.textTertiary, fontWeight: "700" }}>–</Text>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), backgroundColor: tc.inputBg, paddingHorizontal: rs(10), height: rs(46) }}>
                    <Text style={{ color: tc.textSecondary, fontWeight: "700", marginRight: rs(4) }}>$</Text>
                    <TextInput style={{ flex: 1, fontSize: rs(14), color: tc.textPrimary }} value={rmBudgetMax} onChangeText={setRmBudgetMax} keyboardType="numeric" placeholder="Max" placeholderTextColor={tc.textTertiary} />
                  </View>
                  <Text style={{ color: tc.textTertiary, fontSize: rs(13) }}>/mo</Text>
                </View>
              </View>

              {/* Move-in Date */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10) }}>
                  <View style={{ width: rs(30), height: rs(30), borderRadius: rs(8), backgroundColor: Colors.brand.greenLight, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.brand.green} />
                  </View>
                  <Text style={{ fontSize: rs(14), fontWeight: "700", color: tc.textPrimary }}>Move-in Date</Text>
                </View>
                <DatePickerField
                  value={rmMoveInDate}
                  onChange={(iso) => setRmMoveInDate(iso ?? "")}
                  dateFormat="iso"
                  placeholder="Select move-in date"
                  accentColor={Colors.brand.green}
                  minimumDate={new Date()}
                  forceDark={isDark}
                  style={{ backgroundColor: tc.inputBg, borderColor: tc.borderLight, borderWidth: 1.5, borderRadius: rs(12), paddingHorizontal: rs(14), paddingVertical: rs(13) }}
                  textStyle={{ color: tc.textPrimary, fontSize: rs(14), fontWeight: "500" }}
                />
              </View>

              {/* Sleep Schedule */}
              {(["sleepSchedule", "cleanliness", "noiseLevel", "guestPolicy"] as const).map((field) => {
                const configs = {
                  sleepSchedule: { label: "Sleep Schedule", icon: "moon-outline" as const, color: Colors.brand.blue, bg: Colors.brand.blueLight, options: RM_SLEEP_OPTIONS, val: rmSleep, set: setRmSleep },
                  cleanliness:   { label: "Cleanliness",    icon: "sparkles" as const,     color: Colors.brand.blue, bg: Colors.brand.blueLight, options: RM_CLEAN_OPTIONS, val: rmClean, set: setRmClean },
                  noiseLevel:    { label: "Noise Level",    icon: "volume-medium-outline" as const, color: Colors.brand.green, bg: Colors.brand.greenLight, options: RM_NOISE_OPTIONS, val: rmNoise, set: setRmNoise },
                  guestPolicy:   { label: "Guest Policy",   icon: "people-outline" as const, color: Colors.brand.blue, bg: Colors.brand.blueLight, options: RM_GUEST_OPTIONS, val: rmGuest, set: setRmGuest },
                };
                const cfg = configs[field];
                return (
                  <View key={field}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10) }}>
                      <View style={{ width: rs(30), height: rs(30), borderRadius: rs(8), backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                      </View>
                      <Text style={{ fontSize: rs(14), fontWeight: "700", color: tc.textPrimary }}>{cfg.label}</Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(8) }}>
                      {cfg.options.map((opt) => (
                        <Pressable key={opt} onPress={() => cfg.set(opt)}
                          style={{ paddingHorizontal: rs(14), paddingVertical: rs(9), borderRadius: rs(10), borderWidth: 1.5,
                            borderColor: cfg.val === opt ? cfg.color : tc.borderLight,
                            backgroundColor: cfg.val === opt ? cfg.color : tc.inputBg }}>
                          <Text style={{ fontSize: rs(13), fontWeight: "700", color: cfg.val === opt ? "#FFF" : tc.textSecondary }}>{opt}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Lifestyle toggles */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10) }}>
                  <View style={{ width: rs(30), height: rs(30), borderRadius: rs(8), backgroundColor: Colors.brand.orangeLight, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="options-outline" size={16} color={Colors.brand.orange} />
                  </View>
                  <Text style={{ fontSize: rs(14), fontWeight: "700", color: tc.textPrimary }}>Lifestyle</Text>
                </View>
                {[
                  { icon: "paw-outline" as const,    label: "Pet Friendly",    val: rmPet,   set: setRmPet },
                  { icon: "ban-outline" as const,    label: "Smoking Allowed", val: rmSmoke, set: setRmSmoke },
                  { icon: "laptop-outline" as const, label: "Work from Home",  val: rmWfh,   set: setRmWfh },
                ].map((item) => (
                  <Pressable key={item.label} onPress={() => item.set(!item.val)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: rs(13), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tc.borderLight }}>
                    <Ionicons name={item.icon} size={18} color={tc.textSecondary} style={{ marginRight: rs(12) }} />
                    <Text style={{ flex: 1, fontSize: rs(14), fontWeight: "600", color: tc.textPrimary }}>{item.label}</Text>
                    <View style={{ width: rs(48), height: rs(26), borderRadius: rs(13), backgroundColor: item.val ? Colors.brand.green : (isDark ? tc.borderMedium : "#CBD5E1"), justifyContent: "center", paddingHorizontal: rs(3) }}>
                      <View style={{ width: rs(20), height: rs(20), borderRadius: rs(10), backgroundColor: "#FFF", transform: [{ translateX: item.val ? rs(22) : 0 }] }} />
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={{ height: rs(40) }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
