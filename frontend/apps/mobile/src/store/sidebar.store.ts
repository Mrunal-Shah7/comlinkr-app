import { create } from "zustand";
import { getMyStats, type UserStats } from "../api/profile.api";
import authService from "../services/http/authService";
import { getUnreadNotificationCount } from "../api/notifications.api";
import { getSaveCounts, totalSaveCount } from "../api/saves.api";
import { getMyListings } from "../api/housing.api";
import { getMyRestaurants } from "../api/food.api";

type SidebarState = {
  sidebarStats: UserStats | null;
  sessionCity: string | null;
  sessionAvatar: string | null;
  unreadNotifCount: number;
  aggregateSavedTotal: number | null;
  myListingsCount: number | null;
  myRestaurantsCount: number | null;
  lastFetchedAt: number | null; // SPRINT-27
  isFetching: boolean;
  fetchSidebarData: () => Promise<void>;
  refreshIfStale: (maxAgeMs: number) => Promise<void>;
  clearFetchTimestamp: () => void; // SPRINT-27
  incrementUnread: () => void;
  resetUnread: () => void;
  incrementSaved: (delta: number) => void;
  clear: () => void;
};

const initialState = {
  sidebarStats: null,
  sessionCity: null,
  sessionAvatar: null,
  unreadNotifCount: 0,
  aggregateSavedTotal: null,
  myListingsCount: null as number | null,
  myRestaurantsCount: null as number | null,
  lastFetchedAt: null as number | null, // SPRINT-27
  isFetching: false,
};

export const useSidebarStore = create<SidebarState>((set, get) => ({
  ...initialState,
  fetchSidebarData: async () => {
    if (get().isFetching) return;
    set({ isFetching: true });
    try {
      const [statsRes, meRes, unreadRes, savesRes, listingsRes, restaurantsRes] = await Promise.allSettled([
        getMyStats(),
        authService.getMe(),
        getUnreadNotificationCount(),
        getSaveCounts(),
        getMyListings({ page: 1, pageSize: 1 }),
        getMyRestaurants(),
      ]);

      const updates: Partial<SidebarState> = { lastFetchedAt: Date.now() };

      if (statsRes.status === "fulfilled") {
        updates.sidebarStats = statsRes.value;
      }
      if (meRes.status === "fulfilled") {
        updates.sessionCity = meRes.value.data?.city?.trim() || null;
        updates.sessionAvatar = meRes.value.data?.avatar?.trim() || null;
      }
      if (unreadRes.status === "fulfilled") {
        updates.unreadNotifCount = Math.max(0, unreadRes.value.count);
      }
      if (savesRes.status === "fulfilled" && savesRes.value?.counts) {
        updates.aggregateSavedTotal = totalSaveCount(savesRes.value.counts);
      }
      if (listingsRes.status === "fulfilled") {
        updates.myListingsCount = listingsRes.value.total ?? 0;
      }
      if (restaurantsRes.status === "fulfilled") {
        updates.myRestaurantsCount = restaurantsRes.value.length;
      }
      set(updates);
    } finally {
      set({ isFetching: false });
    }
  },
  refreshIfStale: async (maxAgeMs: number) => {
    const { lastFetchedAt, fetchSidebarData } = get();
    // SPRINT-27: null = never fetched or invalidated by pull-to-refresh
    if (lastFetchedAt === null || Date.now() - lastFetchedAt >= maxAgeMs) {
      await fetchSidebarData();
    }
  },
  clearFetchTimestamp: () => set({ lastFetchedAt: null }), // SPRINT-27
  incrementUnread: () => set((s) => ({ unreadNotifCount: s.unreadNotifCount + 1 })),
  resetUnread: () => set({ unreadNotifCount: 0 }),
  incrementSaved: (delta: number) =>
    set((s) => ({
      aggregateSavedTotal:
        s.aggregateSavedTotal !== null
          ? Math.max(0, s.aggregateSavedTotal + delta)
          : s.aggregateSavedTotal,
    })),
  clear: () => set({ ...initialState }),
}));
