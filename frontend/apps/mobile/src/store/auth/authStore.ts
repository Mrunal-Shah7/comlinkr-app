// src/store/auth/authStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, SessionCookieHeader } from '@shared/types/api';
import { configureSessionAuth } from '@services/http/apiClient';

interface AuthState {
  user: UserProfile | null;
  sessionCookie: SessionCookieHeader | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (user: UserProfile, sessionCookie: SessionCookieHeader) => void;
  setSessionCookie: (sessionCookie: SessionCookieHeader) => void;
  logout: () => void;
  setUser: (user: UserProfile) => void;
  initialize: () => void;
}

/** SEC-01: remove the old unencrypted copy of the session cookie written by earlier builds. */
async function purgeLegacyPersistedCookie(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('auth-storage');
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    if (parsed?.state && 'sessionCookie' in parsed.state) {
      delete parsed.state.sessionCookie;
      await AsyncStorage.setItem('auth-storage', JSON.stringify(parsed));
    }
  } catch {
    /* best effort */
  }
}

const bindSessionAuth = (get: () => AuthState) => {
  configureSessionAuth(() => get().sessionCookie ?? null);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      sessionCookie: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: (user, sessionCookie) => {
        bindSessionAuth(get);
        set({ user, sessionCookie, isAuthenticated: true, error: null });
      },

      setSessionCookie: (sessionCookie) => {
        bindSessionAuth(get);
        set({ sessionCookie, isAuthenticated: true, error: null });
      },

      logout: () => {
        set({ user: null, sessionCookie: null, isAuthenticated: false, error: null });
      },

      setUser: (user) => set({ user }),

      initialize: () => {
        bindSessionAuth(get);
        set({ isInitialized: true });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // SEC-01: the session cookie lives only in SecureStore; never persist it to AsyncStorage.
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
      merge: (persistedState, currentState) => {
        const p = (persistedState as Partial<AuthState> | undefined) ?? {};
        const c = currentState;
        return {
          ...c,
          ...p,
          user: c.user ? c.user : (p.user ?? null),
          // Ignore any legacy persisted cookie; the credential provider re-hydrates it from SecureStore.
          sessionCookie: c.sessionCookie?.trim() ? c.sessionCookie : null,
          isAuthenticated: c.isAuthenticated || Boolean(p.isAuthenticated),
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.initialize();
        void purgeLegacyPersistedCookie();
      },
    }
  )
);

export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectIsAdmin = (s: AuthState) =>
  s.user?.role === 'ADMIN' || s.user?.role === 'SUPER_ADMIN';
