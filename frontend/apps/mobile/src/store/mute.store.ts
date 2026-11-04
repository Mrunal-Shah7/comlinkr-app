// src/store/mute.store.ts
//
// No backend endpoint currently exposes conversation mute state — chat.api.ts's
// Conversation type has no `muted` field, and nothing in apps/mobile/src/api calls
// a mute/unmute endpoint. This store makes the toggle in chat.tsx's three-dot menu
// actually persist locally (survives app restart) so the label correctly flips
// between Mute/Unmute. It does NOT suppress real push notifications from the
// server — that requires a backend mute endpoint. Once one exists, replace the
// SecureStore calls below with real API calls and keep the same isMuted/toggleMute
// interface so chat.tsx doesn't need to change.
import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const MUTED_KEY = "comlinkr_muted_conversations";

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

interface MuteState {
  mutedConversationIds: string[];
  isMuted: (conversationId: string) => boolean;
  muteConversation: (conversationId: string) => Promise<void>;
  unmuteConversation: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: string) => Promise<boolean>; // returns the new muted state
  hydrate: () => Promise<void>;
}

export const useMuteStore = create<MuteState>((set, get) => ({
  mutedConversationIds: [],

  isMuted: (conversationId: string) => get().mutedConversationIds.includes(conversationId),

  muteConversation: async (conversationId) => {
    const { mutedConversationIds } = get();
    if (mutedConversationIds.includes(conversationId)) return;
    const updated = [...mutedConversationIds, conversationId];
    await storageSetItem(MUTED_KEY, JSON.stringify(updated));
    set({ mutedConversationIds: updated });
  },

  unmuteConversation: async (conversationId) => {
    const updated = get().mutedConversationIds.filter((id) => id !== conversationId);
    await storageSetItem(MUTED_KEY, JSON.stringify(updated));
    set({ mutedConversationIds: updated });
  },

  toggleMute: async (conversationId) => {
    const currentlyMuted = get().isMuted(conversationId);
    if (currentlyMuted) {
      await get().unmuteConversation(conversationId);
    } else {
      await get().muteConversation(conversationId);
    }
    return !currentlyMuted;
  },

  hydrate: async () => {
    try {
      const raw = await storageGetItem(MUTED_KEY);
      if (raw) set({ mutedConversationIds: JSON.parse(raw) });
    } catch { }
  },
}));