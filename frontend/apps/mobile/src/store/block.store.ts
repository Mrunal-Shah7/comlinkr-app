// src/store/block.store.ts
import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export interface BlockedUser {
  id: string;       // author name used as stable ID for demo data
  name: string;
  avatar?: string;
  blockedAt: string;
}

const BLOCKED_KEY = "comlinkr_blocked_users";

async function storageGetItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return typeof localStorage === "undefined" ? null : localStorage.getItem(key); } catch { return null; }
  }
  return await SecureStore.getItemAsync(key);
}

async function storageSetItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); } catch { }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

interface BlockState {
  blockedUsers: BlockedUser[];
  isBlocked: (id: string) => boolean;
  blockUser: (user: Omit<BlockedUser, "blockedAt">) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blockedUsers: [],

  isBlocked: (id: string) => get().blockedUsers.some((u) => u.id === id),

  blockUser: async (user) => {
    const { blockedUsers } = get();
    if (blockedUsers.some((u) => u.id === user.id)) return;
    const updated = [...blockedUsers, { ...user, blockedAt: new Date().toISOString() }];
    await storageSetItem(BLOCKED_KEY, JSON.stringify(updated));
    set({ blockedUsers: updated });
  },

  unblockUser: async (id) => {
    const updated = get().blockedUsers.filter((u) => u.id !== id);
    await storageSetItem(BLOCKED_KEY, JSON.stringify(updated));
    set({ blockedUsers: updated });
  },

  hydrate: async () => {
    try {
      const raw = await storageGetItem(BLOCKED_KEY);
      if (raw) set({ blockedUsers: JSON.parse(raw) });
    } catch { }
  },
}));
