/**
 * Favorites / Saved Items API
 *
 * The Favorites screen shows saved items across ALL content types in one place
 * with tabs: All, Housing, Food, Events, Community.
 *
 * Also covers the "Interested" screen — items a user has marked as interested
 * (distinct from saved: "saved" = bookmarked, "interested" = intent to engage).
 *
 * Endpoints:
 *   GET    /favorites                    — all saved items (cross-type, paginated)
 *   GET    /favorites/housing            — saved housing listings
 *   GET    /favorites/food               — saved restaurants
 *   GET    /favorites/events             — saved events
 *   GET    /favorites/community          — saved community posts / questions
 *   GET    /favorites/news               — saved news articles
 *   DELETE /favorites/:type/:id          — remove a specific saved item
 *   DELETE /favorites                    — clear all saved items
 *
 *   Interested:
 *   GET    /interested                   — all interested items (cross-type)
 *   POST   /interested/:type/:id         — mark as interested
 *   DELETE /interested/:type/:id         — remove interested mark
 */

import { api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SavedItemType = "Housing" | "Food" | "Events" | "Community" | "News";

export interface SavedItem {
  id: string;
  type: SavedItemType;
  /** The original content id */
  contentId: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  image?: string;
  tags?: string[];
  savedAt: string;
  /** Additional type-specific metadata */
  meta?: Record<string, unknown>;
}

export interface PaginatedSavedItems {
  data: SavedItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type InterestedItemType = "listing" | "restaurant" | "event" | "post" | "question";

export interface InterestedItem {
  id: string;
  type: InterestedItemType;
  contentId: string;
  title: string;
  subtitle?: string;
  image?: string;
  tags?: string[];
  markedAt: string;
}

// ─── Favorites API calls ──────────────────────────────────────────────────────

function toQs(params: object): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `?${qs}` : "";
}

export function getAllFavorites(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedSavedItems> {
  return api.get<PaginatedSavedItems>(`/favorites${toQs(params)}`);
}

export function getHousingFavorites(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedSavedItems> {
  return api.get<PaginatedSavedItems>(`/favorites/housing${toQs(params)}`);
}

export function getFoodFavorites(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedSavedItems> {
  return api.get<PaginatedSavedItems>(`/favorites/food${toQs(params)}`);
}

export function getEventFavorites(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedSavedItems> {
  return api.get<PaginatedSavedItems>(`/favorites/events${toQs(params)}`);
}

export function getCommunityFavorites(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedSavedItems> {
  return api.get<PaginatedSavedItems>(`/favorites/community${toQs(params)}`);
}

export function getNewsFavorites(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedSavedItems> {
  return api.get<PaginatedSavedItems>(`/favorites/news${toQs(params)}`);
}

export function removeFavorite(type: Lowercase<SavedItemType>, contentId: string): Promise<void> {
  return api.delete(`/favorites/${type}/${contentId}`);
}

export function clearAllFavorites(): Promise<void> {
  return api.delete("/favorites");
}

// ─── Interested API calls ─────────────────────────────────────────────────────

/**
 * DEV-03: "Interested" is housing-only. The backend exposes it as GET /housing/interested (listing rows);
 * adapt those rows to the screen's InterestedItem contract.
 */
export async function getInterestedItems(params: { page?: number; pageSize?: number; type?: InterestedItemType } = {}): Promise<{ data: InterestedItem[]; total: number; hasMore: boolean }> {
  if (params.type && params.type !== "listing") return { data: [], total: 0, hasMore: false };
  const raw = await api.get<{ data?: any[]; meta?: { total?: number; page?: number; totalPages?: number } } | any[]>(
    `/housing/interested${toQs({ page: params.page, limit: Math.min(params.pageSize ?? 50, 50) })}`,
  );
  const rows: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  const meta = Array.isArray(raw) ? undefined : raw?.meta;
  const data: InterestedItem[] = rows.map((l) => ({
    id: `listing-${l.id}`,
    type: "listing",
    contentId: String(l.id),
    title: String(l.title ?? "Listing"),
    subtitle: [l.address ?? l.neighborhood ?? l.city, l.price != null ? `${l.currency ?? "$"}${l.price}/mo` : null].filter(Boolean).join(" · ") || undefined,
    image: Array.isArray(l.images) && l.images[0] ? (typeof l.images[0] === "string" ? l.images[0] : l.images[0].imageUrl ?? l.images[0].url) : undefined,
    tags: [l.propertyType].filter(Boolean),
    markedAt: String(l.interestedAt ?? l.createdAt ?? new Date().toISOString()),
  }));
  return { data, total: meta?.total ?? data.length, hasMore: meta ? Number(meta.page ?? 1) < Number(meta.totalPages ?? 1) : false };
}

export function markInterested(type: InterestedItemType, contentId: string): Promise<void> {
  if (type !== "listing") return Promise.resolve();
  return api.post(`/housing/${contentId}/interest`);
}

export function removeInterested(type: InterestedItemType, contentId: string): Promise<void> {
  if (type !== "listing") return Promise.resolve();
  return api.delete(`/housing/${contentId}/interest`);
}
