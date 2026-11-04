/**
 * Public User Profile & Achievements API
 *
 * Covers:
 *  - Viewing other users' public profiles (community member cards)
 *  - Achievements / earned badges (Homefinder, Foodie, Connector, etc.)
 *  - User stats (posts, saved, events, neighbors)
 *  - Follow / block from profile
 *  - Profile activity feed (user's public posts)
 *
 * Endpoints:
 *   GET    /users/:id                   — public profile of any user
 *   GET    /users/:id/posts             — public posts by user
 *   GET    /users/:id/achievements      — earned achievements
 *   GET    /users/me/achievements       — my achievements
 *   GET    /users/me/stats              — my stat counts (posts, saved, events, neighbors)
 *   POST   /users/:id/follow            — follow / unfollow toggle
 *   GET    /users/me/followers          — my followers list
 *   GET    /users/me/following          — who I'm following
 *   POST   /users/:id/block             — block user
 *   DELETE /users/:id/block             — unblock user
 *   GET    /users/me/blocked            — my blocked users list
 *   POST   /users/:id/report            — report user
 */

import { api } from "./client";
import type { PaginatedResponse } from "./feed.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AchievementId =
  | "homefinder"
  | "foodie"
  | "connector"
  | "storyteller"
  | "explorer"
  | "neighborly"
  | "local_expert"
  | "event_host"
  | "verified_landlord"
  | "verified_owner";

export interface Achievement {
  id: AchievementId;
  emoji: string;
  label: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number;     // 0-100 for in-progress achievements
  threshold?: number;    // required count to earn
}

/** Matches Nest `UserStatsDto` from `GET /users/me/stats` */
export interface UserStats {
  postsCount: number;
  savedCount: number;
  eventsCount: number;
  neighborsCount: number;
}

export interface PublicProfile {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  verified: boolean;
  badges: string[];
  verificationStatus: string;
  role: string;
  stats: UserStats;
  achievements: Achievement[];
  followedByMe: boolean;
  followingMe: boolean;
  blockedByMe: boolean;
  joinedAt: string;
}

export interface Follower {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  city?: string;
  verified: boolean;
  followedByMe: boolean;
}

export interface BlockedUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  blockedAt: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Nest `GET /users/:id` shape → screen `PublicProfile` (field-name + defaults). */
function normalizePublicProfile(raw: Record<string, unknown>): PublicProfile {
  const location =
    raw.location && typeof raw.location === "object"
      ? (raw.location as { city?: string })
      : null;
  const badgesRaw = Array.isArray(raw.badges) ? raw.badges : [];
  const badgeLabels = badgesRaw
    .map((b) =>
      typeof b === "string"
        ? b
        : b && typeof b === "object" && "badgeType" in b
          ? String((b as { badgeType: unknown }).badgeType)
          : "",
    )
    .filter(Boolean);
  const statsRaw =
    raw.stats && typeof raw.stats === "object"
      ? (raw.stats as Partial<UserStats>)
      : {};

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? raw.fullName ?? ""),
    username: String(raw.username ?? ""),
    avatar:
      (typeof raw.avatar === "string" && raw.avatar) ||
      (typeof raw.avatarUrl === "string" && raw.avatarUrl) ||
      undefined,
    bio: typeof raw.bio === "string" ? raw.bio : undefined,
    city:
      (typeof raw.city === "string" && raw.city) ||
      location?.city ||
      undefined,
    stateProvince:
      typeof raw.stateProvince === "string" ? raw.stateProvince : undefined,
    country: typeof raw.country === "string" ? raw.country : undefined,
    verified: Boolean(raw.verified ?? badgeLabels.length > 0),
    badges: badgeLabels,
    verificationStatus:
      typeof raw.verificationStatus === "string"
        ? raw.verificationStatus
        : "none",
    role: typeof raw.role === "string" ? raw.role : "USER",
    stats: {
      postsCount: Number(statsRaw.postsCount ?? 0),
      savedCount: Number(statsRaw.savedCount ?? 0),
      eventsCount: Number(statsRaw.eventsCount ?? 0),
      neighborsCount: Number(statsRaw.neighborsCount ?? 0),
    },
    achievements: Array.isArray(raw.achievements)
      ? (raw.achievements as Achievement[])
      : [],
    followedByMe: Boolean(raw.followedByMe),
    followingMe: Boolean(raw.followingMe),
    blockedByMe: Boolean(raw.blockedByMe),
    joinedAt: String(raw.joinedAt ?? raw.createdAt ?? new Date().toISOString()),
  };
}

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  // Backend exposes GET /users/:id (not /users/:id/profile)
  const raw = await api.get<Record<string, unknown>>(`/users/${userId}`);
  return normalizePublicProfile(raw ?? {});
}

export function getUserPosts(userId: string, params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<unknown>> {
  // Backend pagination uses `limit` (max 50).
  const qs = new URLSearchParams(
    Object.entries({ page: params.page, limit: params.pageSize })
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return api.get<PaginatedResponse<unknown>>(`/users/${userId}/posts${qs ? `?${qs}` : ""}`);
}

export function getUserAchievements(userId: string): Promise<Achievement[]> {
  return api.get<Achievement[]>(`/users/${userId}/achievements`);
}

export function getMyAchievements(): Promise<Achievement[]> {
  return api.get<Achievement[]>("/users/me/achievements");
}

export function getMyStats(): Promise<UserStats> {
  return api.get<UserStats>("/users/me/stats");
}

export function toggleFollow(userId: string): Promise<{ following: boolean; followersCount: number }> {
  return api.post(`/users/${userId}/follow`);
}

export function getMyFollowers(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<Follower>> {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
  ).toString();
  return api.get<PaginatedResponse<Follower>>(`/users/me/followers${qs ? `?${qs}` : ""}`);
}

export function getMyFollowing(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<Follower>> {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
  ).toString();
  return api.get<PaginatedResponse<Follower>>(`/users/me/following${qs ? `?${qs}` : ""}`);
}

export function blockUser(userId: string): Promise<void> {
  return api.post(`/users/${userId}/block`);
}

export function unblockUser(userId: string): Promise<void> {
  return api.delete(`/users/${userId}/block`);
}

export function getBlockedUsers(): Promise<BlockedUser[]> {
  return api.get<BlockedUser[]>("/users/me/blocked");
}

export function reportUser(userId: string, reason: string): Promise<void> {
  return api.post(`/users/${userId}/report`, { reason });
}
