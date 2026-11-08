// src/store/guestLocation.store.ts — City chosen by a browsing guest (not synced to backend), persisted locally.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveCityLocation } from '../data/locationData';

const GUEST_CITY_KEY = 'comlinkr_guest_city';
const GUEST_STATE_KEY = 'comlinkr_guest_state';
const GUEST_COUNTRY_KEY = 'comlinkr_guest_country';

interface GuestLocationState {
  city: string | null;
  state: string | null;
  country: string | null;
  _hydrated: boolean;
  /** Pass state/country explicitly when the caller knows the exact tuple (e.g. picker selection) — city names alone can collide across countries (e.g. "London", "East London"). Falls back to a best-effort name lookup only when omitted. */
  setCity: (city: string, location?: { state: string; country: string }) => Promise<void>;
  clearCity: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useGuestLocationStore = create<GuestLocationState>((set) => ({
  city: null,
  state: null,
  country: null,
  _hydrated: false,

  setCity: async (city: string, location?: { state: string; country: string }) => {
    const { state, country } = location ?? resolveCityLocation(city);
    set({ city, state, country });
    try {
      await AsyncStorage.multiSet([
        [GUEST_CITY_KEY, city],
        [GUEST_STATE_KEY, state ?? ''],
        [GUEST_COUNTRY_KEY, country ?? ''],
      ]);
    } catch {}
  },

  clearCity: async () => {
    set({ city: null, state: null, country: null });
    try { await AsyncStorage.multiRemove([GUEST_CITY_KEY, GUEST_STATE_KEY, GUEST_COUNTRY_KEY]); } catch {}
  },

  hydrate: async () => {
    try {
      const [[, city], [, state], [, country]] = await AsyncStorage.multiGet([
        GUEST_CITY_KEY,
        GUEST_STATE_KEY,
        GUEST_COUNTRY_KEY,
      ]);
      if (city) set({ city, state: state || null, country: country || null });
    } catch {}
    set({ _hydrated: true });
  },
}));

// A signed-in account's own location fields must never fall back to a
// leftover guest-session pick (e.g. guest browses "London, Ontario", then
// signs into an account whose own country is unset — that account should
// never inherit Canada from the guest session). Clear guest location data
// the moment auth flips to signed-in, from a single choke point regardless
// of which login path (real backend, demo/local, admin) set isAuthed.
import { useAuthStore } from './auth.store';

let wasAuthed = useAuthStore.getState().isAuthed;
useAuthStore.subscribe((state) => {
  if (state.isAuthed && !wasAuthed) {
    void useGuestLocationStore.getState().clearCity();
  }
  wasAuthed = state.isAuthed;
});
