/**
 * Housing API — Nest `/api/housing/*`
 * Bookmarks: `POST /housing/:id/save`, list: `GET /housing/saved`.
 * Legacy interest: `POST /housing/:id/interest`, `GET /housing/interested`.
 */

import { api, postFormData } from "./client";
import type { PaginatedResponse } from "./feed.api";
// New:
import { resolveApiAssetUrl } from "./feed.api";

import { queryClient } from "../services/cache/queryClient";
import { queryKeys } from "../services/cache/queryKeys";

/** One row from `GET /housing` — Nest `formatListing` returns objects, not bare URL strings. */
export interface HousingListingImageRef {
  id: string;
  url: string;
  order: number; // SPRINT-42: Sprint 37 guarantees an explicit persisted order.
  caption?: string | null;
}

/**
 * Normalize `images` for React Native `<Image source={{ uri }} />`.
 * The API returns `{ id, url, order, caption }[]`; mocks may use plain strings.
 */
export function listingImageUrlList(images: unknown): string[] {
  if (!Array.isArray(images) || images.length === 0) {
    return []; // SPRINT-42: zero-image listings are valid and must not fabricate media.
  }
  const ordered = images.map((item, index) => ({ item, index })).sort((a, b) => { // SPRINT-42: defensively honor backend image.order.
    const ao = a.item && typeof a.item === "object" && typeof (a.item as { order?: unknown }).order === "number" ? (a.item as { order: number }).order : a.index; // SPRINT-42: preserve received order for legacy strings.
    const bo = b.item && typeof b.item === "object" && typeof (b.item as { order?: unknown }).order === "number" ? (b.item as { order: number }).order : b.index; // SPRINT-42: preserve received order for legacy strings.
    return ao - bo || a.index - b.index; // SPRINT-42: keep sorting stable when orders match.
  }); // SPRINT-42: finish ordered image normalization.
  const out: string[] = []; // SPRINT-42: collect only valid received URLs.
  for (const { item } of ordered) { // SPRINT-42: iterate in persisted order.
    if (typeof item === "string" && item.trim().length > 0) {
//       out.push(item.trim());
      // New:
      out.push(resolveApiAssetUrl(item.trim()));
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as { url?: unknown; uri?: unknown };
      const u = o.url ?? o.uri;
//       if (typeof u === "string" && u.trim().length > 0) out.push(u.trim());
      // New:
      if (typeof u === "string" && u.trim().length > 0) out.push(resolveApiAssetUrl(u.trim()));
    }
  }
  return out; // SPRINT-42: return an empty list when no usable image exists.
}

export interface Landlord {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  since: string;
  rating: number;
  responseTime: string;
  color: string;
  verified: boolean;
}

export interface HousingListing {
  id: string;
  title: string;
  price: number;
  currency?: string;
  priceNote?: string;
  deposit?: number;
  type?: string;
  /** Nest `formatListing` uses `propertyType` (enum string). */
  propertyType?: string;
  /** API `GET /housing` returns Nest `formatListing` fields `bedrooms` / `bathrooms`. */
  bedrooms?: number;
  bathrooms?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  floor?: string | number | null;
  yearBuilt?: number;
  location?: string; // SPRINT-42: compatibility alias; Sprint 37 uses address/city fields.
  address?: string;
  city?: string; // SPRINT-42: canonical Sprint 37 required city field.
  available?: string; // SPRINT-42: retain the legacy UI alias without treating it as authoritative.
  availableDate?: string | null; // SPRINT-42: canonical Sprint 37 availability field.
  petPolicy?: string;
  parking?: string;
  laundry?: string;
  heating?: string;
  cooling?: string;
  utilities?: string | string[]; // SPRINT-42: accept the Sprint 37 string field and legacy array responses.
  leaseTerm?: string;
  neighborhood?: string;
  furnished?: boolean; // SPRINT-42: retain legacy alias for older responses.
  description: string;
  /** Raw API: `{ id, url }[]`; use `listingImageUrlList()` before passing to `Image`. */
  images: string[] | HousingListingImageRef[];
  verified?: boolean; // SPRINT-42: retain legacy alias for older UI mappings.
  isVerified?: boolean; // SPRINT-42: canonical backend verification field.
  featured?: boolean; // SPRINT-42: retain legacy alias for older UI mappings.
  isFeatured?: boolean; // SPRINT-42: canonical backend featured field.
  isNew?: boolean; // SPRINT-42: optional presentation hint.
  tags?: string[]; // SPRINT-42: optional compatibility alias; amenities are canonical.
  walkScore?: number;
  transitInfo?: string;
  landlord?: Landlord; // SPRINT-42: compatibility presenter; owner is canonical.
  /** Present on API responses (`formatListing`). */
  isOwner?: boolean;
  /** Nest `formatListing` — publisher profile (avatar is relative path unless already absolute). */
  owner?: { id: string; name?: string; username?: string; avatarUrl?: string | null };
  /** Listing lifecycle status from API (e.g. AVAILABLE). */
  status: ListingStatus; // SPRINT-42: owner-controlled listing lifecycle status.
  amenities?: string[];
  isFurnished?: boolean;
  state?: string;
  country?: string;
  /** Bookmark / save (Sprint 12+). */
  isSaved?: boolean;
  /** @deprecated Legacy interest flag; prefer `isSaved`. */
  savedByMe?: boolean;
  createdAt: string;
  updatedAt: string;
  viewsCount?: number; // SPRINT-42: canonical backend aggregate field.
}

export type ListingStatus = "AVAILABLE" | "RENTED" | "UNLISTED"; // SPRINT-42: Sprint 37 owner status values.
export type PropertyType = "APARTMENT" | "HOUSE" | "STUDIO" | "ROOM"; // SPRINT-42: shared listing property enum.

export interface ListingQueryParams {
  page?: number;
  pageSize?: number;
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  pets?: boolean;
  featured?: boolean;
  /** Server-side text search over title/description/location. */
  search?: string;
}

/** `POST /housing` body (Nest `CreateListingDto`). */
export interface CreateListingPayload {
  title: string;
  description: string;
  propertyType: PropertyType; // SPRINT-42: use the shared Sprint 37 enum.
  price: number;
  currency?: string;
  deposit?: number;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  floor?: string;
  address: string;
  neighborhood?: string;
  city: string;
  state?: string;
  country: string;
  availableDate?: string;
  leaseTerm?: string;
  isFurnished?: boolean;
  petPolicy?: string;
  parking?: string;
  laundry?: string;
  heating?: string;
  cooling?: string;
  utilities?: string;
  yearBuilt?: number;
  amenities?: string[];
  transitInfo?: string;
  walkScore?: number;
}

export type UpdateListingPayload = Partial<Omit<CreateListingPayload, "latitude" | "longitude">> & { status?: ListingStatus }; // SPRINT-42: coordinates and images are excluded from field PATCH.

export interface ListingContactPayload {
  message: string;
}

function toQs(params: object): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  const remapped = entries.map(([k, v]) => {
    if (k === "pageSize") return ["limit", String(v)];
    return [k, String(v)];
  });
  const qs = new URLSearchParams(remapped).toString();
  return qs ? `?${qs}` : "";
}

function toFeedPaged<T>(raw: unknown): PaginatedResponse<T> {
  // Handle plain array responses
  if (Array.isArray(raw)) {
    return { data: raw as T[], page: 1, pageSize: raw.length, total: raw.length, hasMore: false };
  }
  const o = raw as {
    data?: T[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  };
  if (!o?.meta) {
    // Backend returned object without meta — preserve data if present
    const arr = Array.isArray(o?.data) ? (o.data as T[]) : [];
    return { data: arr, page: 1, pageSize: arr.length, total: arr.length, hasMore: false };
  }
  return {
    data: (o.data ?? []) as T[],
    page: o.meta.page,
    pageSize: o.meta.limit,
    total: o.meta.total,
    hasMore: o.meta.page < o.meta.totalPages,
  };
}

export async function getListings(params: ListingQueryParams = {}): Promise<PaginatedResponse<HousingListing>> {
  const raw = await api.get<unknown>(`/housing${toQs(params)}`);
  return toFeedPaged<HousingListing>(raw);
}

export async function getMyListings(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<HousingListing>> {
  const raw = await api.get<unknown>(`/housing/my-listings${toQs(params)}`);
  return toFeedPaged<HousingListing>(raw);
}

export async function getFavoriteListings(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<HousingListing>> {
  const raw = await api.get<unknown>(`/housing/interested${toQs(params)}`);
  return toFeedPaged<HousingListing>(raw);
}

export function getListing(id: string): Promise<HousingListing> {
  return api.get<HousingListing>(`/housing/${id}`);
}

export function createListing(payload: CreateListingPayload): Promise<HousingListing> {
  return api.post<HousingListing>("/housing", payload as unknown as Record<string, unknown>);
}

/** In-memory listing edit fan-out (field PATCH and/or ordered images). Never persisted. */ // SPRINT-42:
export type ListingUpdateEvent = { // SPRINT-42: process-local listing edit signal.
  id: string; // SPRINT-42: listing identity for patching mounted lists.
  listing?: HousingListing; // SPRINT-42: full detail after field PATCH.
  images?: HousingListingImageRef[]; // SPRINT-42: complete ordered images after image ops.
}; // SPRINT-42: end listing update event type.

type ListingUpdateListener = (update: ListingUpdateEvent) => void; // SPRINT-42: notify browse / my-listings / previews.
const listingUpdateListeners = new Set<ListingUpdateListener>(); // SPRINT-42: memory-only subscriber set.
const latestListingUpdates = new Map<string, ListingUpdateEvent>(); // SPRINT-42: bridge focus races after edit.

export function subscribeToListingUpdates(listener: ListingUpdateListener): () => void { // SPRINT-42: shared listing-edit subscription.
  listingUpdateListeners.add(listener); // SPRINT-42: register a mounted housing boundary.
  return () => listingUpdateListeners.delete(listener); // SPRINT-42: drop unmounted listeners.
} // SPRINT-42: end listing update subscription.

export function getLatestListingUpdate(id: string): ListingUpdateEvent | undefined { // SPRINT-42: let focus handlers consume the latest patch.
  return latestListingUpdates.get(id); // SPRINT-42: never read from disk.
} // SPRINT-42: end latest listing update accessor.

function publishListingUpdate(update: ListingUpdateEvent): void { // SPRINT-42: fan successful listing mutations into UI state.
  const previous = latestListingUpdates.get(update.id); // SPRINT-42: merge with any prior partial event.
  const merged: ListingUpdateEvent = { // SPRINT-42: keep both full listing and images when both exist.
    id: update.id, // SPRINT-42: retain identity.
    listing: update.listing ?? previous?.listing, // SPRINT-42: prefer the newest full listing body.
    images: update.images ?? previous?.images ?? update.listing?.images as HousingListingImageRef[] | undefined, // SPRINT-42: prefer newest ordered images.
  }; // SPRINT-42: finish merge.
  latestListingUpdates.set(update.id, merged); // SPRINT-42: retain process-local latest.
  listingUpdateListeners.forEach((listener) => listener(merged)); // SPRINT-42: patch every mounted consumer immediately.
  void queryClient.invalidateQueries({ queryKey: ["housing"] }); // a listing changed: browse lists, roommates and rooms refetch
  void queryClient.invalidateQueries({ queryKey: queryKeys.myListings() });
} // SPRINT-42: end listing update publisher.

export async function uploadListingImages(
  listingId: string,
  files: { uri: string; name?: string; type?: string }[]
): Promise<HousingListingImageRef[]> { // SPRINT-42: return the backend's complete ordered image array.
  if (files.length === 0) return []; // SPRINT-42: make an empty local add a no-op.
  const fd = new FormData();
  let i = 0;
  for (const f of files.slice(0, 6)) {
    const name = f.name || `listing_${i + 1}.jpg`;
    const type = f.type || "image/jpeg";
    fd.append("images", { uri: f.uri, name, type } as any);
    i += 1;
  }
  const images = await postFormData<HousingListingImageRef[]>(`/housing/${listingId}/images`, fd); // SPRINT-42: preserve ApiError messages such as capacity failures.
  publishListingUpdate({ id: listingId, images }); // SPRINT-42: broadcast the complete ordered image set.
  return images; // SPRINT-42: return authoritative images to the editor.
}

export async function updateListing(id: string, payload: UpdateListingPayload): Promise<HousingListing> { // SPRINT-42: restrict updates to Sprint 37 editable fields.
  const body = Object.fromEntries( // SPRINT-42: drop undefined so JSON never pretends keys exist.
    Object.entries(payload).filter(([, value]) => value !== undefined), // SPRINT-42: omit undefined optional clears that would stringify away.
  ) as Record<string, unknown>; // SPRINT-42: finish present-field body.
  if (Object.keys(body).length === 0) { // SPRINT-42: refuse an empty PATCH that the backend would reject.
    throw new Error("No listing fields to update."); // SPRINT-42: callers must no-op before reaching the network.
  } // SPRINT-42: finish empty-body guard.
  const updated = await api.patch<HousingListing>(`/housing/${id}`, body); // SPRINT-42: PATCH only dirty present fields.
  publishListingUpdate({ id, listing: updated, images: Array.isArray(updated.images) ? updated.images as HousingListingImageRef[] : undefined }); // SPRINT-42: fan the full listing response into mounted UIs.
  return updated; // SPRINT-42: return the standard listing response.
}

export async function removeListingImage(listingId: string, imageId: string): Promise<HousingListingImageRef[]> { // SPRINT-42: remove one persisted image and receive the ordered remainder.
  const images = await api.delete(`/housing/${listingId}/images/${imageId}`) as HousingListingImageRef[]; // SPRINT-42: surface the backend ApiError unchanged.
  publishListingUpdate({ id: listingId, images }); // SPRINT-42: broadcast remainder including the zero-image case.
  return images; // SPRINT-42: return ordered remainder.
} // SPRINT-42: end listing image removal API.

export async function reorderListingImages(listingId: string, imageIds: string[]): Promise<HousingListingImageRef[]> { // SPRINT-42: send the complete authoritative order.
  const images = await api.patch<HousingListingImageRef[]>(`/housing/${listingId}/images/reorder`, { imageIds }); // SPRINT-42: preserve backend exact-set validation messages.
  publishListingUpdate({ id: listingId, images }); // SPRINT-42: broadcast the complete reordered set.
  return images; // SPRINT-42: return authoritative order.
} // SPRINT-42: end listing image reorder API.

export function deleteListing(id: string): Promise<void> {
  return api.delete(`/housing/${id}`);
}

export function toggleListingSave(id: string): Promise<{ saved: boolean }> {
  return api.post<{ saved: boolean }>(`/housing/${id}/save`);
}

export function toggleFavoriteListing(id: string): Promise<{ interested: boolean }> {
  return api.post<{ interested: boolean }>(`/housing/${id}/interest`);
}

export function removeInterest(id: string): Promise<{ interested: boolean }> {
  return api.delete(`/housing/${id}/interest`) as Promise<{ interested: boolean }>;
}

export function contactLandlord(_id: string, _payload: ListingContactPayload): Promise<{ conversationId: string }> {
  return Promise.reject(new Error("Start a conversation via POST /conversations with contextType LISTING."));
}

export function reportHousingListing(id: string, reason: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/housing/${id}/report`, { reason });
}

export function getSimilarListings(_id: string): Promise<HousingListing[]> {
  return Promise.resolve([]);
}
