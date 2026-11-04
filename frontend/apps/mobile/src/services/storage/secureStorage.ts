// src/services/storage/secureStorage.ts

import * as SecureStore from 'expo-secure-store';

const KEYS = {
  SESSION_COOKIE: 'comlinkr_session_cookie',
  USER_ID: 'comlinkr_user_id',
};

const secureStorage = {
  saveSessionCookie: async (sessionCookie: string) => {
    await SecureStore.setItemAsync(KEYS.SESSION_COOKIE, sessionCookie);
  },

  getSessionCookie: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(KEYS.SESSION_COOKIE);
  },

  saveUserId: async (userId: string) => {
    await SecureStore.setItemAsync(KEYS.USER_ID, userId);
  },

  getUserId: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(KEYS.USER_ID);
  },

  clearSessionCookie: async () => {
    await SecureStore.deleteItemAsync(KEYS.SESSION_COOKIE);
  },

  clearAll: async () => {
    await SecureStore.deleteItemAsync(KEYS.SESSION_COOKIE);
    await SecureStore.deleteItemAsync(KEYS.USER_ID);
  },
};

export default secureStorage;
