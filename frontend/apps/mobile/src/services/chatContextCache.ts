/**
 * Persists a conversationId → contextName (listing/event title) mapping so the
 * chat inbox can show the real property name even after the conversations are
 * re-fetched from the backend (which may not return the title in the list endpoint).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "comlinkr_chat_context_names";

type CacheMap = Record<string, string>;

async function read(): Promise<CacheMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    return {};
  }
}

export async function saveChatContextName(conversationId: string, name: string): Promise<void> {
  if (!conversationId || !name) return;
  try {
    const cache = await read();
    if (cache[conversationId] === name) return;
    cache[conversationId] = name;
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore storage failures */
  }
}

export async function loadChatContextNames(): Promise<CacheMap> {
  return read();
}
