// src/store/auth.store.ts
// NOTE: local login()/signup() below are dead code — the app exclusively authenticates via
// authService.login() -> syncFromApiLogin(). Kept for potential future local-dev use; do not
// reintroduce hardcoded credentials here.

import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { SessionCookieHeader, UserProfile } from "@shared/types/api";
import { useAuthStore as useApiAuthStore } from "./auth/authStore";
import authService from "@services/http/authService";
import { setSessionCookie as setFetchSessionCookie, getSessionCookie as getFetchSessionCookie, clearSession as clearFetchSession } from "../api/client";
import { removePushToken } from "../api/users.api";
import { useListFetchCacheStore } from "./listFetchCache.store";
import { queryClient } from "../services/cache/queryClient";

export type UserRole = "user" | "admin" | "superadmin";
export type UserBadge = "landlord" | "restaurant_owner" | "agency" | "local_reviewer";
export type VerificationStatus = "none" | "pending" | "verified" | "rejected";
export type MarketCode = string; // Known values: "US", "UK", "CA", "AU", "IN", "DE", "FR" ...

/**
 * Maps user.country (as stored after onboarding) to a market code.
 * To launch in a new country: add ONE line here + entries in MARKET_DOCS and MARKET_LABELS in apply-badge.tsx.
 */
export const COUNTRY_TO_MARKET: Record<string, MarketCode> = {
  "United States": "US",
  "United Kingdom": "UK",
  // "Canada":         "CA",
  // "Australia":      "AU",
  // "India":          "IN",
  // "Germany":        "DE",
  // "France":         "FR",
  // "Ireland":        "UK", // same legal market as UK for most badge purposes
};

/** Returns the market code for a given country string. Defaults to "US" if not mapped. */
export function getMarketCode(country?: string): MarketCode {
  return COUNTRY_TO_MARKET[country ?? ""] ?? "US";
}

export interface BusinessProfile {
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  ownershipType?: "own" | "manage";
  propertyAddress?: string;
  cuisineType?: string;
  restaurantAddress?: string;
  agencyLicense?: string;
  propertiesManaged?: number;
  companyWebsite?: string;
  appliedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface BadgeApplication {
  id: string;
  userId: string;
  badgeType: UserBadge;
  status: VerificationStatus;
  businessProfile: BusinessProfile;
  submittedAt: string;
  marketFocus: MarketCode;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  onboardingDone: boolean;
  /** Server path e.g. `/api/files/{id}` — use `resolveAvatarDisplayUrl` to load. */
  avatarUrl?: string | null;
  bio?: string;
  phone?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  vibe?: string[];
  culture?: string[];
  interests?: string[];
  communities?: string[];
  /** Granted by admin only — shows PRO badge on profile and sidebar. */
  isPro?: boolean;
  role?: UserRole;
  badges?: UserBadge[];
  verificationStatus?: Record<UserBadge, VerificationStatus>;
  businessProfile?: BusinessProfile;
  roommatePrefs?: {
    budgetMin?: number;
    budgetMax?: number;
    moveInDate?: string;
    sleepSchedule?: string;
    cleanliness?: string;
    noiseLevel?: string;
    petFriendly?: boolean;
    smoking?: boolean;
    guestPolicy?: string;
    workFromHome?: boolean;
  };
}

const DEFAULT_VERIFICATION_STATUS: Record<UserBadge, VerificationStatus> = {
  landlord: "none",
  restaurant_owner: "none",
  agency: "none",
  local_reviewer: "none",
};

function withBadgeDefaults(user: User): User {
  return {
    ...user,
    role: user.role ?? "user",
    badges: user.badges ?? [],
    verificationStatus: user.verificationStatus ?? { ...DEFAULT_VERIFICATION_STATUS },
  };
}

interface AuthState {
  user: User | null;
  pushToken: string | null;
  isAuthed: boolean;
  isLoading: boolean;
  /** After Nest login/register — updates local user + session cookie for axios. */
  syncFromApiLogin: (profile: UserProfile, sessionCookie: SessionCookieHeader) => Promise<{ onboardingDone: boolean }>;
  login: (email: string, password: string) => Promise<{ onboardingDone: boolean }>;
  signup: (name: string, email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  updateOnboarding: (prefs: { country: string; stateProvince: string; city: string; culture: string[]; interests: string[]; communities: string[] }) => Promise<void>;
  updateProfile: (prefs: { name: string; username: string; email: string; bio: string; phone: string; city: string; country: string; stateProvince: string; vibe: string[]; culture: string[]; interests: string[]; communities: string[] }) => Promise<void>;
  /** Replace persisted user after a successful server profile sync (e.g. Edit Profile). */
  applyUser: (user: User) => Promise<void>;
  updateRoommatePrefs: (prefs: NonNullable<User["roommatePrefs"]>) => Promise<void>;
  applyForBadge: (badgeType: UserBadge, businessProfile: BusinessProfile) => Promise<void>;
  updateBadgeStatus: (badgeType: UserBadge, status: VerificationStatus, rejectionReason?: string) => Promise<void>;
  setPushToken: (token: string | null) => void;
  /** SPRINT-27: clear local auth without protected API calls (session expiry). */
  clearLocalAuth: () => Promise<void>;
}

const AUTH_KEY = "comlinkr_auth";
const BADGE_APPLICATIONS_KEY = "comlinkr_badge_applications";

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

async function storageDeleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); } catch { }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function profileToAppUser(profile: UserProfile): User {
  // SPRINT-41: ADMIN → admin; SUPER_ADMIN → superadmin; MODERATOR → user (no longer admin).
  const role: UserRole = // SPRINT-41:
    profile.role === "SUPER_ADMIN" // SPRINT-41:
      ? "superadmin" // SPRINT-41:
      : profile.role === "ADMIN" // SPRINT-41:
        ? "admin" // SPRINT-41:
        : "user"; // SPRINT-41: MODERATOR and all others map to user
  return withBadgeDefaults({
    id: profile.id,
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.username,
    username: profile.username,
    email: profile.email,
    onboardingDone: profile.onboardingDone ?? false,
    bio: profile.bio,
    phone: profile.phone,
    city: profile.city,
    country: profile.country,
    avatarUrl: profile.avatar ?? undefined,
    role,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  pushToken: null,
  isAuthed: false,
  isLoading: true,

  syncFromApiLogin: async (profile, sessionCookie) => {
    const user = profileToAppUser(profile);
    await storageSetItem(AUTH_KEY, JSON.stringify(user));
    await setFetchSessionCookie(sessionCookie);
    useListFetchCacheStore.getState().resetAll(); // UI-08: never reuse another identity's list freshness
    queryClient.clear();
    set({ user, isAuthed: true, isLoading: false });
    useApiAuthStore.getState().login(profile, sessionCookie);
    const { resetSessionExpiryGuard } = await import("../api/client"); // SPRINT-27
    resetSessionExpiryGuard();
    return { onboardingDone: user.onboardingDone };
  },

  hydrate: async () => {
    try {
      const raw = await storageGetItem(AUTH_KEY);
      if (raw) {
        const user = withBadgeDefaults(JSON.parse(raw) as User);
        await storageSetItem(AUTH_KEY, JSON.stringify(user));
        // SEC-01: SecureStore is the single credential owner; feed it into the in-memory auth store.
        const storedCookie = await getFetchSessionCookie();
        if (storedCookie?.trim()) {
          useApiAuthStore.getState().setSessionCookie(storedCookie);
        }
        set({ user, isAuthed: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    await new Promise((r) => setTimeout(r, 800));
    if (!email || !password) throw new Error("Please fill in both fields");

    const storedUsersRaw = await storageGetItem("comlinkr_users");
    let storedUsers: User[] = [];
    if (storedUsersRaw) { try { storedUsers = JSON.parse(storedUsersRaw); } catch { } }

    const found = storedUsers.find((u) => u.email === email);
    if (found) {
      const user = withBadgeDefaults(found);
      await storageSetItem(AUTH_KEY, JSON.stringify(user));
      set({ user, isAuthed: true });
      return { onboardingDone: user.onboardingDone };
    }

    // Unknown email — reject login
    throw new Error("Invalid email or password");
  },

  signup: async (name, email, password, username) => {
    await new Promise((r) => setTimeout(r, 1000));
    if (!name || !email || !password || !username) throw new Error("All fields required");
    const user: User = withBadgeDefaults({ id: `user_${Date.now()}`, name, username, email, onboardingDone: false });
    const storedUsersRaw = await storageGetItem("comlinkr_users");
    let storedUsers: User[] = [];
    if (storedUsersRaw) { try { storedUsers = JSON.parse(storedUsersRaw); } catch { } }
    storedUsers.push(user);
    await storageSetItem("comlinkr_users", JSON.stringify(storedUsers));
    await storageSetItem(AUTH_KEY, JSON.stringify(user));
    set({ user, isAuthed: true });
  },

  updateOnboarding: async ({ country, stateProvince, city, culture, interests, communities }) => {
    const { user } = get();
    if (!user) return;
    const updated: User = { ...user, country, stateProvince, city, culture, interests, communities, onboardingDone: true };
    await storageSetItem(AUTH_KEY, JSON.stringify(updated));
    const storedUsersRaw = await storageGetItem("comlinkr_users");
    let storedUsers: User[] = [];
    if (storedUsersRaw) { try { storedUsers = JSON.parse(storedUsersRaw); } catch { } }
    const idx = storedUsers.findIndex((u) => u.id === user.id);
    if (idx !== -1) { storedUsers[idx] = updated; await storageSetItem("comlinkr_users", JSON.stringify(storedUsers)); }
    set({ user: updated });
  },

  updateProfile: async ({ name, username, email, bio, phone, city, country, stateProvince, vibe, culture, interests, communities }) => {
    const { user } = get();
    if (!user) return;
    const updated: User = { ...user, name, username, email, bio, phone, city, country, stateProvince, vibe, culture, interests, communities };
    await storageSetItem(AUTH_KEY, JSON.stringify(updated));
    const storedUsersRaw = await storageGetItem("comlinkr_users");
    let storedUsers: User[] = [];
    if (storedUsersRaw) { try { storedUsers = JSON.parse(storedUsersRaw); } catch { } }
    const idx = storedUsers.findIndex((u) => u.id === user.id);
    if (idx !== -1) { storedUsers[idx] = updated; await storageSetItem("comlinkr_users", JSON.stringify(storedUsers)); }
    set({ user: updated });
  },

  applyUser: async (user) => {
    const u = withBadgeDefaults(user);
    await storageSetItem(AUTH_KEY, JSON.stringify(u));
    set({ user: u });
  },

  updateRoommatePrefs: async (prefs) => {
    const { user } = get();
    if (!user) return;
    const nextPrefs = { ...user.roommatePrefs, ...prefs };
    // Unchanged prefs (the common case on every Listings focus) must not replace `user`:
    // a new object re-renders every screen subscribed to it and rewrites storage.
    if (JSON.stringify(nextPrefs) === JSON.stringify(user.roommatePrefs)) return;
    const updated: User = { ...user, roommatePrefs: nextPrefs };
    await storageSetItem(AUTH_KEY, JSON.stringify(updated));
    const storedUsersRaw = await storageGetItem("comlinkr_users");
    let storedUsers: User[] = [];
    if (storedUsersRaw) { try { storedUsers = JSON.parse(storedUsersRaw); } catch { } }
    const idx = storedUsers.findIndex((u) => u.id === user.id);
    if (idx !== -1) { storedUsers[idx] = updated; await storageSetItem("comlinkr_users", JSON.stringify(storedUsers)); }
    set({ user: updated });
  },

  applyForBadge: async (badgeType, businessProfile) => {
    const { user } = get();
    if (!user) return;
    const currentStatus = user.verificationStatus?.[badgeType] ?? "none";
    if (currentStatus === "pending") throw new Error("You already have a pending application for this badge.");
    const application: BadgeApplication = {
      id: `app_${Date.now()}`, userId: user.id, badgeType, status: "pending",
      businessProfile: { ...businessProfile, appliedAt: new Date().toISOString() },
      submittedAt: new Date().toISOString(),
      marketFocus: getMarketCode(user.country),
    };
    const appsRaw = await storageGetItem(BADGE_APPLICATIONS_KEY);
    let apps: BadgeApplication[] = [];
    if (appsRaw) { try { apps = JSON.parse(appsRaw); } catch { } }
    apps.push(application);
    await storageSetItem(BADGE_APPLICATIONS_KEY, JSON.stringify(apps));
    const updatedStatus: Record<UserBadge, VerificationStatus> = { ...(user.verificationStatus ?? DEFAULT_VERIFICATION_STATUS), [badgeType]: "pending" };
    const updated: User = { ...user, badges: [...(user.badges ?? []).filter((b) => b !== badgeType), badgeType], verificationStatus: updatedStatus, businessProfile: application.businessProfile };
    await storageSetItem(AUTH_KEY, JSON.stringify(updated));
    const storedUsersRaw = await storageGetItem("comlinkr_users");
    let storedUsers: User[] = [];
    if (storedUsersRaw) { try { storedUsers = JSON.parse(storedUsersRaw); } catch { } }
    const idx = storedUsers.findIndex((u) => u.id === user.id);
    if (idx !== -1) { storedUsers[idx] = updated; await storageSetItem("comlinkr_users", JSON.stringify(storedUsers)); }
    set({ user: updated });
  },

  updateBadgeStatus: async (badgeType, status, rejectionReason) => {
    const { user } = get();
    if (!user) return;
    const updatedStatus: Record<UserBadge, VerificationStatus> = { ...(user.verificationStatus ?? DEFAULT_VERIFICATION_STATUS), [badgeType]: status };
    const updatedBP: BusinessProfile = { ...(user.businessProfile ?? {}), ...(status === "verified" ? { verifiedAt: new Date().toISOString() } : {}), ...(status === "rejected" && rejectionReason ? { rejectionReason } : {}) };
    const updatedBadges = status === "verified" ? [...(user.badges ?? []).filter((b) => b !== badgeType), badgeType] : (user.badges ?? []).filter((b) => b !== badgeType);
    const updated: User = { ...user, badges: updatedBadges, verificationStatus: updatedStatus, businessProfile: updatedBP };
    await storageSetItem(AUTH_KEY, JSON.stringify(updated));
    const storedUsersRaw = await storageGetItem("comlinkr_users");
    let storedUsers: User[] = [];
    if (storedUsersRaw) { try { storedUsers = JSON.parse(storedUsersRaw); } catch { } }
    const idx = storedUsers.findIndex((u) => u.id === user.id);
    if (idx !== -1) { storedUsers[idx] = updated; await storageSetItem("comlinkr_users", JSON.stringify(storedUsers)); }
    set({ user: updated });
  },

  setPushToken: (token) => set({ pushToken: token }),

  // SPRINT-27: used by global 401 interceptor — no remote logout (would 401 again)
  clearLocalAuth: async () => {
    const { disconnectMessagingSocket } = await import("../services/messagingSocket"); // SPRINT-39:
    disconnectMessagingSocket(); // SPRINT-39:
    useApiAuthStore.getState().logout();
    await clearFetchSession();
    await storageDeleteItem(AUTH_KEY);
    useListFetchCacheStore.getState().resetAll(); // UI-08
    queryClient.clear();
    set({ user: null, pushToken: null, isAuthed: false });
  },

  logout: async () => {
    const { pushToken } = get();
    if (pushToken) {
      try {
        await removePushToken(pushToken);
      } catch {
        // best effort cleanup
      }
    }
    try {
      await authService.logout();
    } catch {
      /* offline / already logged out */
    }
    const { disconnectMessagingSocket } = await import("../services/messagingSocket"); // SPRINT-39:
    disconnectMessagingSocket(); // SPRINT-39: tear down shared socket on sign-out / account deletion
    useApiAuthStore.getState().logout();
    await clearFetchSession();
    await storageDeleteItem(AUTH_KEY);
    useListFetchCacheStore.getState().resetAll(); // UI-08
    queryClient.clear();
    set({ user: null, pushToken: null, isAuthed: false });
  },
}));