/**
 * Current user full profile — GET/PATCH /users/me, avatar upload.
 */

import type { User, UserRole } from "../../src/store/auth.store";
import {
  COMMUNITY_SLUG_TO_UI_ID,
  INTEREST_SLUG_TO_UI_ID,
  VIBE_SLUG_TO_UI_ID,
} from "../../src/services/http/onboardingService";
import { api, postFormData } from "./client";
import type { UserStats } from "./profile.api";
import { roommatePrefsFromFullProfile, type RoommatePreferencesApiBlock } from "../utils/roommatePrefsMap";

const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const ORIGIN = BASE.replace(/\/api\/?$/i, "");

/** Matches Nest `AchievementDto` on full profile */
export interface AchievementDto {
  slug: string;
  name: string;
  icon: string;
  earned: boolean;
}

export interface MyFullProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  phoneNumber: string | null;
  role: string;
  onboardingDone: boolean;
  createdAt: string;
  /** Set by admin when user qualifies (paid plan, etc.). Controls PRO badge display. */
  isPro?: boolean;
  location: {
    country: string;
    countryCode: string;
    dialCode: string;
    state: string;
    city: string;
  } | null;
  vibes: Array<{ id: string; slug: string; name: string; description: string; emoji: string }>;
  interests: Array<{ id: string; slug: string; name: string; description: string; icon: string }>;
  communities: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    countryCode: string | null;
    emoji: string;
  }>;
  stats: UserStats;
  achievements: AchievementDto[];
  roommatePreferences: RoommatePreferencesApiBlock | null;
}

export function resolveAvatarDisplayUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.trim()) return null;
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) return avatarUrl;
  return `${ORIGIN}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
}

export interface PatchMyProfileBody {
  fullName?: string;
  username?: string;
  bio?: string;
  phoneNumber?: string;
}

export function getMyFullProfile(): Promise<MyFullProfile> {
  return api.get<MyFullProfile>("/users/me");
}

export function patchMyProfile(body: PatchMyProfileBody): Promise<MyFullProfile> {
  return api.patch<MyFullProfile>("/users/me", body);
}

export async function uploadMyAvatar(localUri: string, mimeType: string): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  const name = mimeType.includes("png") ? "photo.png" : mimeType.includes("webp") ? "photo.webp" : "photo.jpg";
  // React Native file shape (not a web Blob)
  form.append("avatar", { uri: localUri, name, type: mimeType } as never);
  return postFormData<{ avatarUrl: string }>("/users/me/avatar", form);
}

export function removeMyAvatar(): Promise<{ message: string }> {
  return api.delete<{ message: string }>("/users/me/avatar");
}

function mapRole(role: string): UserRole {
  if (role === "SUPER_ADMIN") return "superadmin";
  if (role === "ADMIN" || role === "MODERATOR") return "admin";
  return "user";
}

/** Maps GET /users/me payload into the local `User` shape (preserves badge/roommate data from `prev`). */
export function mergeFullProfileIntoUser(p: MyFullProfile, prev: User | null): User {
  const vibeUi = p.vibes.map((v) => VIBE_SLUG_TO_UI_ID[v.slug]).filter(Boolean) as string[];
  const interestUi = p.interests.map((i) => INTEREST_SLUG_TO_UI_ID[i.slug]).filter(Boolean) as string[];
  const communityUi = p.communities.map((c) => COMMUNITY_SLUG_TO_UI_ID[c.slug]).filter(Boolean) as string[];

  const next: User = {
    id: p.id,
    name: p.name,
    username: p.username,
    email: p.email,
    onboardingDone: p.onboardingDone,
    bio: p.bio ?? undefined,
    phone: p.phoneNumber ?? undefined,
    country: p.location?.country,
    stateProvince: p.location?.state,
    city: p.location?.city,
    vibe: vibeUi,
    culture: vibeUi,
    interests: interestUi,
    communities: communityUi,
    role: mapRole(p.role),
    avatarUrl: p.avatarUrl,
    isPro: p.isPro ?? prev?.isPro ?? false,
    badges: prev?.badges ?? [],
    verificationStatus: prev?.verificationStatus,
    businessProfile: prev?.businessProfile,
    roommatePrefs:
      roommatePrefsFromFullProfile(p.roommatePreferences) ?? prev?.roommatePrefs,
  };
  return next;
}
