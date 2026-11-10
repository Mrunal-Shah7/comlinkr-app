/**
 * Roommates API
 *
 * Covers the "Roommates" and "Shared Spaces" tabs in the Housing screen.
 *
 * Endpoints:
 *   GET    /roommates                         — browse roommate listings
 *   GET    /roommates/matches                 — AI-matched roommates for current user
 *   GET    /roommates/:id                     — single roommate profile
 *   POST   /roommates/listing                 — create / publish my roommate listing
 *   PATCH  /roommates/listing                 — update my roommate listing
 *   DELETE /roommates/listing                 — remove my roommate listing
 *   GET    /roommates/listing/me              — get my own roommate listing
 *   POST   /roommates/:id/connect             — send roommate connection request
 *   PATCH  /roommates/preferences             — save roommate preferences (from profile)
 *   GET    /roommates/preferences             — get my roommate preferences
 *
 *   Shared Spaces:
 *   GET    /shared-spaces                     — co-living / shared space listings
 *   GET    /shared-spaces/:id                 — single shared space
 *   POST   /shared-spaces                     — create shared space listing
 *   PATCH  /shared-spaces/:id                 — update
 *   DELETE /shared-spaces/:id                 — delete
 *   POST   /shared-spaces/:id/apply           — apply to join shared space
 *   POST   /shared-spaces/:id/favorite        — save/unsave
 */

import { api, postFormData } from "./client";
import type { PaginatedResponse } from "./feed.api";
import type { UpdateRoommatePreferencesPayload } from "../utils/roommatePrefsMap";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SleepSchedule = "Early Bird" | "Night Owl" | "Flexible";
export type CleanlinessLevel = "Very Clean" | "Clean" | "Moderate" | "Relaxed";
export type NoiseLevel = "Quiet" | "Moderate" | "Lively";
export type GuestPolicy = "Never" | "Occasionally" | "Frequently" | "Anytime";

export interface RoommatePreferences {
  budgetMin?: number;
  budgetMax?: number;
  moveInDate?: string;
  preferredLocations?: string[];
  sleepSchedule?: SleepSchedule;
  cleanliness?: CleanlinessLevel;
  noiseLevel?: NoiseLevel;
  guestPolicy?: GuestPolicy;
  petFriendly?: boolean;
  smoking?: boolean;
  workFromHome?: boolean;
  lookingForRoommate?: boolean;
}

export type RoommateConnectionStatusApi =
  | null
  | "pending_sent"
  | "pending_received"
  | "accepted";

/** Card from `GET /roommates` / `GET /roommates/matches` (Nest `formatRoommateCard`). */
export interface RoommateListing {
  id: string;
  userId?: string;
  name: string;
  username: string;
  avatar?: string;
  avatarUrl?: string | null;
  age?: number;
  gender?: string;
  occupation?: string;
  bio?: string | null;
  city?: string | null;
  stateProvince?: string;
  country?: string;
  budget?: { min: number; max: number };
  moveInDate?: string;
  preferences?: RoommatePreferences | null;
  compatibilityScore?: number;
  interests?: string[];
  languages?: string[];
  matchScore?: number;
  verified: boolean;
  isVerified?: boolean;
  isSaved?: boolean;
  connectionStatus?: RoommateConnectionStatusApi;
  conversationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SharedSpaceListing {
  id: string;
  title: string;
  description: string;
  price: number;
  priceNote?: string;
  deposit?: number;
  rooms: number;
  bathrooms: number;
  totalOccupants: number;
  currentOccupants: number;
  availableSpots: number;
  address?: string;
  state?: string | null;
  country?: string;
  city: string;
  images: string[];
  amenities?: string[];
  houseRules?: string[];
  petPolicy?: string;
  smoking?: boolean;
  verified: boolean;
  savedByMe?: boolean;
  isSaved?: boolean;
  isOwner?: boolean;
  applicationCount?: number;
  owner?: {
    id: string;
    username: string;
    name: string;
    avatarUrl?: string | null;
    badges?: { badgeType: string }[];
  };
  host: { id: string; name: string; username?: string; avatar?: string; verified: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface RoommateQueryParams {
  page?: number;
  pageSize?: number;
  city?: string;
  minBudget?: number;
  maxBudget?: number;
  moveInBefore?: string;
  petFriendly?: boolean;
  smoking?: boolean;
}

export interface CreateRoommateListingPayload {
  bio?: string;
  occupation?: string;
  city: string;
  stateProvince?: string;
  country?: string;
  budgetMin: number;
  budgetMax: number;
  moveInDate: string;
  interests?: string[];
  languages?: string[];
  preferences: RoommatePreferences;
}

export interface CreateSharedSpacePayload {
  title: string;
  description: string;
  price: number;
  currency?: string;
  deposit?: number;
  rooms: number;
  bathrooms: number;
  totalOccupants: number;
  availableSpots: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  images?: string[];
  amenities?: string[];
  houseRules?: string[];
  petPolicy?: string;
  smoking?: boolean;
}

export interface SharedSpaceQueryParams {
  page?: number;
  pageSize?: number;
  city?: string;
  maxPrice?: number;
  availableSpots?: number;
  petFriendly?: boolean;
}

// ─── Roommate API calls ───────────────────────────────────────────────────────

function toQs(params: object): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  const remapped = entries.map(([k, v]) => {
    if (k === "pageSize") return ["limit", String(Math.min(Number(v), 50))];
    return [k, String(v)];
  });
  const qs = new URLSearchParams(remapped).toString();
  return qs ? `?${qs}` : "";
}

function toPaged<T>(raw: unknown): PaginatedResponse<T> {
  const o = raw as { data?: T[]; meta?: { page: number; limit: number; total: number; totalPages: number } };
  if (!o?.meta) {
    return { data: [], page: 1, pageSize: 20, total: 0, hasMore: false };
  }
  return {
    data: (o.data ?? []) as T[],
    page: o.meta.page,
    pageSize: o.meta.limit,
    total: o.meta.total,
    hasMore: o.meta.page < o.meta.totalPages,
  };
}

export async function getRoommates(params: RoommateQueryParams = {}): Promise<PaginatedResponse<RoommateListing>> {
  const raw = await api.get<unknown>(`/roommates${toQs(params)}`);
  return toPaged<RoommateListing>(raw);
}

export async function getRoommateMatches(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<RoommateListing>> {
  const raw = await api.get<unknown>(`/roommates/matches${toQs(params)}`);
  return toPaged<RoommateListing>(raw);
}

export function getRoommate(id: string): Promise<RoommateListing> {
  return api.get<RoommateListing>(`/roommates/${id}`);
}

export function getMyRoommateListing(): Promise<RoommateListing | null> {
  return api.get<RoommateListing | null>("/roommates/listing/me");
}

export function createRoommateListing(payload: CreateRoommateListingPayload): Promise<RoommateListing> {
  return api.post<RoommateListing>("/roommates/listing", payload);
}

export function updateRoommateListing(payload: Partial<CreateRoommateListingPayload>): Promise<RoommateListing> {
  return api.patch<RoommateListing>("/roommates/listing", payload);
}

export function deleteRoommateListing(): Promise<void> {
  return api.delete("/roommates/listing");
}

export function connectWithRoommate(id: string): Promise<{ conversationId: string; message?: string }> {
  return api.post(`/roommates/${id}/connect`);
}

export function acceptRoommateConnection(requesterId: string): Promise<{ conversationId: string; status: string }> {
  return api.post(`/roommates/${requesterId}/accept`);
}

export function declineRoommateConnection(requesterId: string): Promise<{ status: string }> {
  return api.post(`/roommates/${requesterId}/decline`);
}

/** The sender withdraws their own pending request (decline is the recipient's answer to one). */
export function cancelRoommateConnection(recipientId: string): Promise<{ status: string }> {
  return api.post(`/roommates/${recipientId}/cancel`);
}

export function toggleRoommateSave(id: string): Promise<{ saved: boolean }> {
  return api.post<{ saved: boolean }>(`/roommates/${id}/save`);
}

export function saveRoommatePreferences(prefs: RoommatePreferences): Promise<RoommatePreferences> {
  return api.patch<RoommatePreferences>("/roommates/preferences", prefs);
}

export type { UpdateRoommatePreferencesPayload } from "../utils/roommatePrefsMap";

/** Nest `UpdatePreferencesDto` — Prisma enum string values. */
export function updateRoommatePreferences(
  body: UpdateRoommatePreferencesPayload
): Promise<UpdateRoommatePreferencesPayload> {
  return api.patch<UpdateRoommatePreferencesPayload>("/roommates/preferences", body);
}

export function getRoommatePreferences(): Promise<RoommatePreferences> {
  return api.get<RoommatePreferences>("/roommates/preferences");
}

// ─── Shared Spaces API calls ──────────────────────────────────────────────────

export async function getSharedSpaces(
  params: SharedSpaceQueryParams = {},
): Promise<PaginatedResponse<SharedSpaceListing>> {
  const raw = await api.get<unknown>(`/shared-spaces${toQs(params)}`);
  return toPaged<SharedSpaceListing>(raw);
}

export function getSharedSpace(id: string): Promise<SharedSpaceListing> {
  return api.get<SharedSpaceListing>(`/shared-spaces/${id}`);
}

export function createSharedSpace(payload: CreateSharedSpacePayload): Promise<SharedSpaceListing> {
  return api.post<SharedSpaceListing>("/shared-spaces", payload);
}

export function updateSharedSpace(id: string, payload: Partial<CreateSharedSpacePayload>): Promise<SharedSpaceListing> {
  return api.patch<SharedSpaceListing>(`/shared-spaces/${id}`, payload);
}

export function deleteSharedSpace(id: string): Promise<void> {
  return api.delete(`/shared-spaces/${id}`);
}

export function applyToSharedSpace(
  id: string,
  message?: string,
): Promise<{ applied: boolean; applicationId: string }> {
  return api.post(`/shared-spaces/${id}/apply`, { message });
}

export type SpaceApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface SpaceApplicant {
  id: string;
  status: SpaceApplicationStatus;
  message?: string;
  createdAt: string;
  applicant: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
    city?: string;
    country?: string;
    bio?: string;
    roommatePrefs?: {
      budgetMin?: number;
      budgetMax?: number;
      moveInDate?: string;
      sleepSchedule?: string;
      cleanliness?: string;
      noiseLevel?: string;
      petFriendly?: boolean;
      smoking?: boolean;
    };
  };
}

export function getSpaceApplications(spaceId: string): Promise<SpaceApplicant[]> {
  return api.get<SpaceApplicant[]>(`/shared-spaces/${spaceId}/applications`);
}

export function decideSpaceApplication(
  spaceId: string,
  applicationId: string,
  decision: "approved" | "rejected",
): Promise<SpaceApplicant> {
  return api.patch<SpaceApplicant>(`/shared-spaces/${spaceId}/applications/${applicationId}`, { status: decision });
}

export function toggleFavoriteSharedSpace(id: string): Promise<{ saved: boolean }> {
  return api.post(`/shared-spaces/${id}/save`);
}

export async function uploadSharedSpaceImages(
  spaceId: string,
  files: { uri: string; name?: string; type?: string }[],
): Promise<void> {
  const fd = new FormData();
  files.slice(0, 6).forEach((f, i) => {
    fd.append(
      "images",
      { uri: f.uri, name: f.name || `space_${i + 1}.jpg`, type: f.type || "image/jpeg" } as any,
    );
  });
  await postFormData(`/shared-spaces/${spaceId}/images`, fd);
}
