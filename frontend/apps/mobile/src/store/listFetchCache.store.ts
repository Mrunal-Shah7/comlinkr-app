// SPRINT-27: stale-while-revalidate timestamps for tab / inbox list fetches
// SPRINT-30: feed sub-tab keys (News, Events, Stories, Quests, Polls)
import { create } from "zustand";

export const LIST_FETCH_TTL_MS = 600_000; // 10 minutes

export type ListFetchKey =
  | "feed"
  | "housing"
  | "food"
  | "community"
  | "messages"
  | "feed:news" // SPRINT-30
  | "feed:events" // SPRINT-30
  | "feed:stories" // SPRINT-30
  | "feed:quests" // SPRINT-30
  | "feed:polls"; // SPRINT-30

type SliceState = {
  lastFetchedAt: number | null;
};

type ListFetchCacheState = {
  feed: SliceState;
  housing: SliceState;
  food: SliceState;
  community: SliceState;
  messages: SliceState;
  "feed:news": SliceState; // SPRINT-30
  "feed:events": SliceState; // SPRINT-30
  "feed:stories": SliceState; // SPRINT-30
  "feed:quests": SliceState; // SPRINT-30
  "feed:polls": SliceState; // SPRINT-30
  clearFetchTimestamp: (key: ListFetchKey) => void;
  markFetched: (key: ListFetchKey) => void;
  shouldFetch: (key: ListFetchKey) => boolean;
  /** UI-08: forget every timestamp so the next focus refetches (call on login/logout/account switch). */
  resetAll: () => void;
};

const emptySlice = (): SliceState => ({ lastFetchedAt: null });

export const useListFetchCacheStore = create<ListFetchCacheState>((set, get) => ({
  feed: emptySlice(),
  housing: emptySlice(),
  food: emptySlice(),
  community: emptySlice(),
  messages: emptySlice(),
  "feed:news": emptySlice(), // SPRINT-30
  "feed:events": emptySlice(), // SPRINT-30
  "feed:stories": emptySlice(), // SPRINT-30
  "feed:quests": emptySlice(), // SPRINT-30
  "feed:polls": emptySlice(), // SPRINT-30
  clearFetchTimestamp: (key) =>
    set((s) => ({
      [key]: { ...s[key], lastFetchedAt: null },
    })),
  markFetched: (key) =>
    set((s) => ({
      [key]: { ...s[key], lastFetchedAt: Date.now() },
    })),
  resetAll: () =>
    set({
      feed: emptySlice(),
      housing: emptySlice(),
      food: emptySlice(),
      community: emptySlice(),
      messages: emptySlice(),
      "feed:news": emptySlice(),
      "feed:events": emptySlice(),
      "feed:stories": emptySlice(),
      "feed:quests": emptySlice(),
      "feed:polls": emptySlice(),
    }),
  shouldFetch: (key) => {
    const ts = get()[key].lastFetchedAt;
    if (ts === null) return true;
    return Date.now() - ts >= LIST_FETCH_TTL_MS;
  },
}));
