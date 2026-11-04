// src/store/theme.store.ts — Dark / light mode preference, persisted
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'comlinkr_theme';

interface ThemeState {
  isDark: boolean;
  _hydrated: boolean;
  toggle: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  _hydrated: false,

  toggle: async () => {
    const next = !get().isDark;
    set({ isDark: next });
    try { await AsyncStorage.setItem(THEME_KEY, JSON.stringify(next)); } catch {}
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(THEME_KEY);
      if (raw !== null) set({ isDark: JSON.parse(raw) });
    } catch {}
    set({ _hydrated: true });
  },
}));
