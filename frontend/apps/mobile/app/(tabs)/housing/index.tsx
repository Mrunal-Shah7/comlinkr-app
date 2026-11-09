import { palette } from "../../../src/theme/palette";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { ListingFeature, ListingTile, RoomTile } from "../../../src/features/housing/components/DListingCards";
import { Chip, Segmented, SoftButton } from "../../../src/shared/d";
import { TYPE } from "../../../src/theme/d";
import { View, Text, ScrollView, FlatList, Pressable, TextInput, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { DSheet } from "../../../src/shared/d/Sheet";
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
import { getListings, getMyListings, toggleListingSave, listingImageUrlList, subscribeToListingUpdates, type HousingListing, type HousingListingImageRef } from "../../../src/api/housing.api";
import { connectWithRoommate, declineRoommateConnection, getRoommates, getRoommateMatches, getRoommatePreferences, getSharedSpaces, toggleRoommateSave, updateRoommatePreferences, type RoommateListing } from "../../../src/api/roommates.api";
import { DatePickerField } from "../../../components/DateTimePickerField";
import { roommatePrefsFromGetEndpoint, roommatePrefsToPatchBody } from "../../../src/utils/roommatePrefsMap";
import { queryKeys } from "../../../src/services/cache/queryKeys";
import { LIST_STALE_MS } from "../../../src/services/cache/queryClient";
import { useScreenQuery } from "../../../src/hooks/useScreenQuery";
import { useInfiniteScreenQuery } from "../../../src/hooks/useInfiniteScreenQuery";
import { showToast } from "../../../src/shared/ui/Toast";
import { appAlert } from "../../../src/shared/ui/Dialogs";
import { type Listing, propertyFilterLabelToApi, toUiListing, FILTERS } from "../../../src/features/housing/listingModel";
import { type Roommate, type AvailableRoom, RM_DEFAULT_PREFS, toUiRoommate, toUiAvailableRoom, buildCurrentUserForMatch, computeMatch, ROOMMATE_FILTERS, RM_SLEEP_OPTIONS, RM_CLEAN_OPTIONS, RM_NOISE_OPTIONS, RM_GUEST_OPTIONS } from "../../../src/features/housing/roommateModel";
import { s } from "../../../src/features/housing/styles/housingScreen.styles";
import { SafeRentingGuide } from "../../../src/features/housing/components/SafeRentingGuide";
import { MemoRoommateCard } from "../../../src/features/housing/components/MemoRows";
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
const EMPTY_LISTINGS: Listing[] = [];
const EMPTY_ROOMMATES: Roommate[] = [];
const EMPTY_ROOMS: AvailableRoom[] = [];
const listingId = (l: Listing) => l.id;

export default function HousingScreen() {
  const housingScrollRef = useRef<FlatList<HousingRow>>(null);
  useScrollToTop(housingScrollRef); // re-tap the Listings tab → back to top
  const { isDark, tc } = useTheme();
  const insets = useSafeAreaInsets();
  // Design D (plan 01): the header title fades in as the large title scrolls away.
  const housingScrollY = useSharedValue(0);
  const onHousingScroll = useAnimatedScrollHandler((e) => { housingScrollY.set(e.contentOffset.y); });
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
  const [fullscreenImages, setFullscreenImages] = useState<string[]>([]);
  const [fullscreenStartIdx, setFullscreenStartIdx] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  // ── Roommates state ──
  const [rmFilter, setRmFilter] = useState("Best Match");
  const [roommateSavedIds, setRoommateSavedIds] = useState<Set<string>>(new Set());

  // ── Available Rooms state ──
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

  // Requested rooms are recorded by the room detail route (plan 03); re-read them whenever the tab is shown.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("comlinkr_requested_rooms").then((val) => {
        if (val) {
          try { setRequestedRooms(new Set(JSON.parse(val) as string[])); } catch {}
        }
      });
    }, []),
  )

  // ── Roommates sub-tab ──
  const [rmSubTab, setRmSubTab] = useState<"searching" | "matching">("searching");

  // Listings: one cached query per city + filter set. Page 1 also merges the user's own listings so an owner
  // always sees their post even if the public feed filters it out. Refetched on every focus (staleTime 0) so
  // edits made elsewhere show at once.
  const listingFilters = useMemo(() => {
    const typeApi = propertyFilterLabelToApi(propertyTypeFilter);
    const minPriceNum = minPriceFilter.trim() ? Number(minPriceFilter) : undefined;
    const maxPriceNum = maxPriceFilter.trim() ? Number(maxPriceFilter) : undefined;
    return {
      ...(typeApi ? { type: typeApi } : {}),
      ...(minPriceNum != null && Number.isFinite(minPriceNum) ? { minPrice: minPriceNum } : {}),
      ...(maxPriceNum != null && Number.isFinite(maxPriceNum) ? { maxPrice: maxPriceNum } : {}),
      ...(bedsFilter != null ? { beds: bedsFilter } : {}),
      ...(petsFilter != null ? { pets: petsFilter } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    };
  }, [propertyTypeFilter, minPriceFilter, maxPriceFilter, bedsFilter, petsFilter, debouncedSearch]);
  const listingsQ = useInfiniteScreenQuery<Listing, { items: Listing[]; hasMore: boolean; savedIds: string[] }>({
    queryKey: [...queryKeys.housing(userCity, listingFilters), user?.id ?? ""],
    enabled: !!userCity,
    staleTime: 0,
    getId: listingId,
    fetchPage: async (page) => {
      const [res, myRes] = await Promise.allSettled([
        getListings({ page, pageSize: 50, ...(userCity ? { city: userCity } : {}), ...listingFilters }),
        page === 1 && user?.id ? getMyListings({ page: 1, pageSize: 20 }) : Promise.resolve(null),
      ]);
      if (res.status === "rejected") throw res.reason;
      const publicData: HousingListing[] = Array.isArray(res.value?.data) ? res.value.data : [];
      const myData: HousingListing[] = myRes.status === "fulfilled" && myRes.value && Array.isArray(myRes.value.data) ? myRes.value.data : [];
      const seen = new Set(publicData.map((x) => x.id));
      const q = debouncedSearch.toLowerCase();
      const ownMatches = (x: HousingListing) =>
        !q || `${x.title ?? ""} ${(x as { location?: string }).location ?? ""} ${(x as { city?: string }).city ?? ""}`.toLowerCase().includes(q);
      const merged = [...publicData, ...myData.filter((x) => !seen.has(x.id) && ownMatches(x))];
      return {
        items: merged.map((row) => toUiListing(row, user?.id)),
        hasMore: res.value.hasMore === true,
        savedIds: merged.filter((x) => (x as HousingListing).isSaved === true || x.savedByMe === true).map((x) => x.id),
      };
    },
  });
  const listings = userCity ? listingsQ.items : EMPTY_LISTINGS;
  const setListings = listingsQ.setItems;
  const listingsLoading = listingsQ.loading;
  const listingsError = !!listingsQ.error;
  const listingsHasMore = listingsQ.hasMore;
  const listingsLoadingMore = listingsQ.loadingMore;
  const loadListings = listingsQ.refetch;
  const loadMoreListings = listingsQ.loadMore;
  // The server's saved flags seed the hearts each time a page arrives; taps change them locally after that.
  const listingsFetchedAt = listingsQ.dataUpdatedAt;
  useEffect(() => {
    if (!listingsQ.pages) return;
    setSavedIds(new Set(listingsQ.pages.flatMap((pg) => pg.savedIds)));
    // Only when a fetch lands, not on a local patch of the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingsFetchedAt, listingsQ.pages?.length]);
  useEffect(() => {
    if (listingsQ.error && !listingsQ.pages) showToast("Could not load listings. Please try again.", "error");
  }, [listingsQ.error, listingsQ.pages]);

  useEffect(() => subscribeToListingUpdates((update) => { // SPRINT-42: consume in-memory listing field/image updates without waiting for TTL.
    const applyImages = (images: HousingListingImageRef[] | string[] | undefined) => // SPRINT-42: normalize ordered URLs for the UI listing model.
      listingImageUrlList(images ?? []); // SPRINT-42: preserve zero-image empty arrays.
    setListings((prev) => prev.map((row) => { // SPRINT-42: patch every matching browse card.
      if (row.id !== update.id) return row; // SPRINT-42: leave unrelated listings alone.
      if (update.listing) return toUiListing(update.listing, user?.id); // SPRINT-42: replace with the full PATCH response mapping.
      if (update.images) return { ...row, images: applyImages(update.images) }; // SPRINT-42: update primary/gallery order from image ops.
      return row; // SPRINT-42: no-op when the event carries neither body.
    })); // SPRINT-42: finish browse list patch.
  }), [user?.id]); // SPRINT-42: resubscribe if the signed-in user identity changes.


  // Roommates (browse list merged with the scored matches) and available rooms: signed-in only, cached for
  // the old 10-minute window and keyed by the user's city.
  const roommatesQ = useScreenQuery({
    queryKey: ["housing", "roommates", user?.city?.trim() ?? "", user?.id ?? ""],
    enabled: !!user?.id,
    staleTime: LIST_STALE_MS,
    initial: EMPTY_ROOMMATES,
    queryFn: async () => {
      const [browseRes, matchRes] = await Promise.allSettled([
        getRoommates({ page: 1, pageSize: 100, city: user?.city?.trim() || undefined }),
        getRoommateMatches({ page: 1, pageSize: 100 }),
      ]);
      const browseData: RoommateListing[] = browseRes.status === "fulfilled" && Array.isArray(browseRes.value?.data) ? browseRes.value.data : [];
      const matchData: RoommateListing[] = matchRes.status === "fulfilled" && Array.isArray(matchRes.value?.data) ? matchRes.value.data : [];
      // Merge by id — prefer matchData entry (has server-side score) when duplicate
      const byId = new Map<string, RoommateListing>();
      browseData.forEach((r) => byId.set(r.id, r));
      matchData.forEach((r) => byId.set(r.id, r));
      return Array.from(byId.values()).map(toUiRoommate);
    },
  });
  const roommates = user?.id ? roommatesQ.data : EMPTY_ROOMMATES;
  const setRoommates = roommatesQ.setData;
  const roommatesLoading = roommatesQ.loading;
  const loadRoommates = roommatesQ.refetch;
  const roommatesFetchedAt = roommatesQ.dataUpdatedAt;
  useEffect(() => {
    if (!roommatesFetchedAt) return;
    setRoommateSavedIds(new Set(roommatesQ.data.filter((c) => c.isSaved).map((c) => c.id)));
    // Only when a fetch lands, not on every local patch of the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roommatesFetchedAt]);

  const roomsQ = useScreenQuery({
    queryKey: ["housing", "rooms", user?.city?.trim() ?? "", user?.id ?? ""],
    enabled: !!user?.id,
    staleTime: LIST_STALE_MS,
    initial: EMPTY_ROOMS,
    queryFn: async () => {
      const res = await getSharedSpaces({ city: user?.city?.trim() || undefined, page: 1, pageSize: 20 });
      return (Array.isArray(res?.data) ? res.data : []).map(toUiAvailableRoom);
    },
  });
  const availableRooms = user?.id ? roomsQ.data : EMPTY_ROOMS;
  const setAvailableRooms = roomsQ.setData;
  const availableRoomsLoading = roomsQ.loading;
  const loadAvailableRooms = roomsQ.refetch;

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

  // Roommate preferences come from the server on each focus (signed in only); the lists refetch themselves.
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      const cancelDefer = runAfterTransition(() => {
        void (async () => {
          try {
            const fresh = await getRoommatePreferences();
            if (cancelled) return;
            const mapped = roommatePrefsFromGetEndpoint({
              budgetMin: fresh.budgetMin, budgetMax: fresh.budgetMax, moveInDate: fresh.moveInDate,
              sleepSchedule: fresh.sleepSchedule, cleanliness: fresh.cleanliness, noiseLevel: fresh.noiseLevel,
              petFriendly: fresh.petFriendly, smoking: fresh.smoking, guestPolicy: fresh.guestPolicy, workFromHome: fresh.workFromHome,
            });
            await updateRoommatePrefs({ ...RM_DEFAULT_PREFS, ...mapped });
          } catch { /* backend unreachable — keep local */ }
        })();
      });
      return () => {
        cancelled = true;
        cancelDefer();
      };
    }, [updateRoommatePrefs, user?.id]),
  );

  // The profile is its own route (plan 03); it shows the cached card at once and fetches the full profile.
  const openRoommateProfile = useCallback((id: string) => {
    router.push(`/roommate/${encodeURIComponent(id)}` as never);
  }, []);

  // Preferences setup is handled in Edit Profile — no auto-prompt needed here.

  useEffect(() => {
    const raw = params.openListing;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || openedListingDeepLink.current === id) return;
    openedListingDeepLink.current = id;
    setActiveTab("listings");
    // Older links and callers still pass ?openListing=; the detail is its own route now (plan 03).
    router.push(`/listing/${encodeURIComponent(id)}` as never);
  }, [params.openListing]);

  useEffect(() => {
    const raw = params.openRoommate;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || openedRoommateDeepLink.current === id) return;
    if (!requireAuth(undefined, "Sign in to view roommate profiles.")) return;
    openedRoommateDeepLink.current = id;
    setActiveTab("roommates");
    setRmSubTab("searching");
    openRoommateProfile(id);
  }, [params.openRoommate, requireAuth, openRoommateProfile]);

  const onRefresh = useCallback(() => {
    (async () => {
      try {
        setRefreshing(true);
        setSearch("");
        setPropertyTypeFilter("All");
        setRmFilter("Best Match");
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
      setRoommates((prev) =>
        prev.map((x) =>
          x.id === rm.id ? { ...x, connectionStatus: "pending_sent" as const, conversationId: cid ?? x.conversationId } : x,
        ),
      );
    } catch {
      showToast("Could not connect. Please try again.", "error");
    }
  };

  const handleCancelRequest = async (rm: Roommate) => {
    try {
      await declineRoommateConnection(rm.id);
      const patch = (x: Roommate): Roommate =>
        x.id === rm.id ? { ...x, connectionStatus: null, conversationId: null } : x;
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
      setRoommates((prev) =>
        prev.map((x) => (x.id === id ? { ...x, isSaved: saved } : x)),
      );
    } catch {
      showToast("Could not update save. Please try again.", "error");
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

  // ── Stable row handlers (keep MemoRoommateCard from re-rendering) ──
  const onToggleListingSave = useStableCallback((id: string) => void toggleSave(id));
  const openListingImages = useStableCallback((images: string[], idx: number) => {
    setFullscreenImages(images);
    setFullscreenStartIdx(idx);
    setFullscreenVisible(true);
  });
  const onToggleRoommateSave = useStableCallback((id: string) => void toggleRoommateBookmark(id));
  const openRoom = useStableCallback((r: AvailableRoom) => router.push(`/room/${encodeURIComponent(r.id)}` as never));
  const openListing = useStableCallback((l: Listing) => router.push(`/listing/${encodeURIComponent(l.id)}` as never));
  const onOpenRoommate = useStableCallback((id: string) => openRoommateProfile(id));
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
        return <ListingFeature listing={item.listing} saved={savedIds.has(item.listing.id)} onToggleSaveId={onToggleListingSave} onOpen={openListing} />;
      }
      if (item.kind === "listingPair") {
        return (
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 16 }}>
            {item.listings.map((l) => <ListingTile key={l.id} listing={l} saved={savedIds.has(l.id)} onToggleSaveId={onToggleListingSave} onOpen={openListing} />)}
            {item.listings.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        );
      }
      if (item.kind === "roomPair") {
        return (
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 16 }}>
            {item.rooms.map((r) => <RoomTile key={r.id} room={r} onOpen={openRoom} />)}
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

  const switchTab = (tab: HousingTab) => {
    if (tab === "roommates" && !requireAuth(undefined, "Sign in to find compatible roommates matched to you.")) {
      return;
    }
    void Haptics.selectionAsync();
    setActiveTab(tab);
    setSearch("");
  };


  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top"]}>
      <AppHeader title="Listings" scrollY={housingScrollY} />
      <Reanimated.FlatList
        ref={housingScrollRef as any}
        onScroll={onHousingScroll}
        scrollEventThrottle={16}
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 24 }]}
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
                    icon={<Ionicons name="options-outline" size={14} color={(minPriceFilter || maxPriceFilter || bedsFilter != null || petsFilter != null) ? palette.white : tc.textSecondary} />}
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

                {/* Safe Renting Guide: above the loading placeholders, where it stays once the cards arrive
                    (below them it jumped up when loading ended). */}
                <SafeRentingGuide />

                {listingsLoading ? (
                  <View style={{ paddingTop: 8 }} accessibilityLabel="Loading listings">
                    <SkeletonCard imageHeight={220} />
                    <SkeletonCard imageHeight={220} />
                  </View>
                ) : null}
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
                              <Text style={{ color: palette.white, fontWeight: "800" }}>{hasPrefs ? "Edit Preferences" : "Set Up Preferences"}</Text>
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
                      <Ionicons name="refresh" size={16} color={palette.white} />
                      <Text style={{ color: palette.white, fontSize: 13, fontWeight: "800" }}>Retry</Text>
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
      <ListYourSpaceModal
        visible={showListModal}
        onClose={() => setShowListModal(false)}
        onSubmit={() => setShowListModal(false)}
      />

      {/* Fullscreen image viewer */}
      {fullscreenVisible && fullscreenImages.length > 0 && (
        <FullscreenImageViewer
          images={fullscreenImages}
          startIndex={fullscreenStartIdx}
          onClose={() => setFullscreenVisible(false)}
        />
      )}

      {/* ── Listings filter sheet (price / beds / pets) ── */}
      <DSheet visible={showFilterSheet} onClose={() => setShowFilterSheet(false)} title="Filters">
          <View style={{ paddingHorizontal: 20 }}>

            <Text style={{ fontSize: 12, fontFamily: "Manrope_800ExtraBold", color: tc.textTertiary, marginBottom: 8, letterSpacing: 0.4 }}>PRICE RANGE / MONTH</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <TextInput
                value={minPriceFilter}
                onChangeText={(t) => setMinPriceFilter(t.replace(/[^0-9]/g, ""))}
                placeholder="Min"
                placeholderTextColor={tc.textTertiary}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: tc.inputBg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: tc.textPrimary, fontSize: 15, fontFamily: "Manrope_500Medium" }}
              />
              <Text style={{ color: tc.textTertiary }}>—</Text>
              <TextInput
                value={maxPriceFilter}
                onChangeText={(t) => setMaxPriceFilter(t.replace(/[^0-9]/g, ""))}
                placeholder="Max"
                placeholderTextColor={tc.textTertiary}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: tc.inputBg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: tc.textPrimary, fontSize: 15, fontFamily: "Manrope_500Medium" }}
              />
            </View>

            <Text style={{ fontSize: 12, fontFamily: "Manrope_800ExtraBold", color: tc.textTertiary, marginBottom: 8, letterSpacing: 0.4 }}>BEDROOMS</Text>
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
                    backgroundColor: bedsFilter === n ? tc.mint : tc.inputBg,
                    borderColor: bedsFilter === n ? tc.mint : tc.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: "Manrope_700Bold", color: bedsFilter === n ? palette.white : tc.textSecondary }}>
                    {n === null ? "Any" : n === 0 ? "Studio" : `${n}+`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontFamily: "Manrope_800ExtraBold", color: tc.textTertiary, marginBottom: 8, letterSpacing: 0.4 }}>PETS</Text>
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
                    backgroundColor: petsFilter === opt.value ? tc.mint : tc.inputBg,
                    borderColor: petsFilter === opt.value ? tc.mint : tc.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: "Manrope_700Bold", color: petsFilter === opt.value ? palette.white : tc.textSecondary }} numberOfLines={1}>
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
                <Text style={{ fontSize: 14, fontFamily: "Manrope_800ExtraBold", color: tc.textSecondary }}>Clear all</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilterSheet(false); }}
                style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
              >
                <LinearGradient colors={[palette.brandBlue, palette.brandTeal, palette.brandGreen]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 13, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontFamily: "Manrope_800ExtraBold", color: palette.white }}>Show results</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
      </DSheet>

      {/* ── Inline Roommate Prefs Modal ── */}
      <DSheet visible={rmPrefsModalVisible} onClose={() => setRmPrefsModalVisible(false)} full>
          <View style={{ flex: 1, backgroundColor: tc.sheetBg ?? tc.cardBg }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: rs(20), paddingVertical: rs(14), borderBottomWidth: 1, borderBottomColor: tc.borderLight }}>
              <Pressable onPress={() => setRmPrefsModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={tc.textPrimary} />
              </Pressable>
              <Text style={{ fontSize: rs(16), fontWeight: "800", color: tc.textPrimary }}>Roommate Preferences</Text>
              <Pressable onPress={() => void saveRmPrefs()} hitSlop={12} disabled={rmSaving}
                style={{ backgroundColor: Colors.brand.blue, borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(7), opacity: rmSaving ? 0.65 : 1 }}>
                {rmSaving ? <ActivityIndicator color={palette.white} size="small" /> : <Text style={{ color: palette.white, fontWeight: "800", fontSize: rs(13) }}>Save</Text>}
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
                          <Text style={{ fontSize: rs(13), fontWeight: "700", color: cfg.val === opt ? palette.white : tc.textSecondary }}>{opt}</Text>
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
                    <View style={{ width: rs(48), height: rs(26), borderRadius: rs(13), backgroundColor: item.val ? Colors.brand.green : (isDark ? tc.borderMedium : palette.slate300), justifyContent: "center", paddingHorizontal: rs(3) }}>
                      <View style={{ width: rs(20), height: rs(20), borderRadius: rs(10), backgroundColor: palette.white, transform: [{ translateX: item.val ? rs(22) : 0 }] }} />
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={{ height: rs(40) }} />
            </ScrollView>
          </View>
      </DSheet>
    </SafeAreaView>
  );
}
