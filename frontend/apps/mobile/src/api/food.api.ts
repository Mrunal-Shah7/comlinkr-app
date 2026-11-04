/**
 * Food / Restaurants API
 *
 * Endpoints:
 *   GET    /restaurants                — browse all restaurants
 *   GET    /restaurants/my-restaurants — current owner's restaurants
 *   GET    /restaurants/favorites      — saved restaurants
 *   GET    /restaurants/:id            — single restaurant
 *   POST   /restaurants                — create restaurant listing
 *   PATCH  /restaurants/:id            — update restaurant
 *   DELETE /restaurants/:id            — delete restaurant
 *   POST   /restaurants/:id/favorite   — toggle heart favorite
 *   POST   /restaurants/:id/save       — toggle bookmark (Saved tab)
 *   POST   /restaurants/:id/order      — initiate order conversation
 *   POST   /restaurants/:id/review     — submit review
 *   PATCH  /restaurants/:id/reviews    — edit own review
 *   DELETE /restaurants/:id/reviews    — delete own review
 *   GET    /restaurants/:id/reviews    — list reviews
 *   POST   /restaurants/:id/report     — report restaurant
 */

import { api, postFormData } from "./client";
import { resolveApiAssetUrl, type PaginatedResponse } from "./feed.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PriceRange = "$" | "$$" | "$$$" | "$$$$";
export type RestaurantService = "Dine-in" | "Takeout" | "Delivery" | "Reservations";

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  price: PriceRange;
  /** Average cost per person, if the owner provided one. Undefined on restaurants created before this field existed. */
  avgPricePerPerson?: number | null;
  distance: string;
  image: string;
  /** All resolved image URLs for the carousel (at least 1 entry). */
  images?: string[];
  verified: boolean;
  tags: string[];
  openNow: boolean;
  closingTime?: string;
  openingTime?: string | null;
  /** IANA timezone of the business, when the owner/admin provided one. */
  timezone?: string | null;
  /** ISO-4217 currency the business quotes prices in. */
  currency?: string | null;
  services: RestaurantService[];
  popularDishes: string[];
  waitTime?: string;
  address?: string;
  city?: string;
  state?: string | null;
  country?: string | null;
  phone?: string;
  /** Backend `formatRestaurant` field; mirrored into `phone` when `phone` is empty. */
  phoneNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
  waitTimeMinutes?: number | null;
  website?: string;
  savedByMe: boolean;
  /** Bookmark / save (separate from heart favorite). */
  isSaved?: boolean;
  /** Current user has submitted a review (detail endpoint). */
  hasReviewed?: boolean;
  ownerId?: string;
  /** Present on API `formatRestaurant` responses. */
  isOwner?: boolean;
  owner?: { id: string; name?: string; username?: string };
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantReview {
  id: string;
  author: { id: string; name: string; avatar?: string };
  rating: number;
  text: string;
  /** Same as `text`; API returns `content`. */
  content?: string;
  createdAt: string;
}

export interface RestaurantQueryParams {
  page?: number;
  limit?: number;
  /** Backward-compatible alias; mapped to `limit`. */
  pageSize?: number;
  city?: string;
  cuisine?: string;
  priceRange?: "BUDGET" | "MODERATE" | "PREMIUM" | "LUXURY";
  service?: RestaurantService;
  search?: string;
  sort?: "rating" | "distance" | "newest";
}

export interface CreateRestaurantPayload {
  name: string;
  cuisine: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  phoneNumber?: string;
  /** Prisma `PriceRange`: BUDGET | MODERATE | PREMIUM | LUXURY */
  priceRange: "BUDGET" | "MODERATE" | "PREMIUM" | "LUXURY";
  openingTime?: string;
  closingTime?: string;
  /** e.g. ["Dine-in","Takeout","Delivery"] */
  availableServices: string[];
  tags?: string[];
  popularDishes?: { name: string; rank: number }[];
  latitude?: number;
  longitude?: number;
  waitTimeMinutes?: number;
  /** Average cost per person, in the owner's local currency. Requires backend support — see Restaurant.avgPricePerPerson. */
  avgPricePerPerson?: number;
  /** IANA timezone of the business (defaults to the owner's device zone when listing). */
  timezone?: string;
  /** ISO-4217 currency the prices are quoted in. */
  currency?: string;
}

export interface ReviewPayload {
  rating: number;
  /** Nest `CreateReviewDto.content` */
  content: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

function toQs(params: object): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `?${qs}` : "";
}

function mapPriceRangeFromApi(p: string | undefined): PriceRange {
  const u = String(p || "").toUpperCase();
  if (u === "LUXURY") return "$$$$";
  if (u === "PREMIUM") return "$$$";
  if (u === "MODERATE") return "$$";
  return "$";
}

export function normalizeRestaurantReview(raw: any): RestaurantReview {
  const author = raw?.author ?? {};
  const text = String(raw?.text ?? raw?.content ?? "");
  const avRaw = author.avatarUrl ?? author.avatar;
  const av = typeof avRaw === "string" && avRaw.trim() ? resolveApiAssetUrl(avRaw.trim()) : undefined;
  return {
    id: String(raw?.id ?? ""),
    rating: Number(raw?.rating ?? 0),
    text,
    content: text,
    createdAt: raw?.createdAt ?? "",
    author: {
      id: String(author.id ?? ""),
      name: String(author.name ?? author.username ?? "User"),
      avatar: av,
    },
  };
}

function firstNonEmptyString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

function pickRestaurantCoverUrl(raw: any): string {
  if (Array.isArray(raw?.images)) {
    for (const img of raw.images) {
      const u = img?.url ?? img?.imageUrl;
      const s = firstNonEmptyString(u);
      if (s) return s;
    }
  }
  return firstNonEmptyString(
    raw?.image,
    raw?.imageUrl,
    raw?.coverImage,
    raw?.coverImageUrl,
  );
}

function normalizeRestaurant(raw: any): Restaurant {
  const imageCandidate = pickRestaurantCoverUrl(raw);
  const phoneFromApi =
    (typeof raw?.phone === "string" && raw.phone.trim()) ||
    (typeof raw?.phoneNumber === "string" && raw.phoneNumber.trim()) ||
    "";
  const phoneNumberField =
    typeof raw?.phoneNumber === "string" && raw.phoneNumber.trim()
      ? raw.phoneNumber.trim()
      : phoneFromApi || undefined;
  const dist =
    typeof raw?.distance === "string" && raw.distance
      ? raw.distance
      : raw?.distanceMiles != null && Number.isFinite(Number(raw.distanceMiles))
        ? `${Number(raw.distanceMiles).toFixed(1)} mi`
        : "—";
  const dishes = Array.isArray(raw?.popularDishes)
    ? raw.popularDishes.map((d: any) => (typeof d === "string" ? d : String(d?.name ?? d)))
    : [];
  const waitTimeStr =
    raw?.waitTimeMinutes != null && Number.isFinite(Number(raw.waitTimeMinutes))
      ? `~${raw.waitTimeMinutes} min`
      : typeof raw?.waitTime === "string"
        ? raw.waitTime
        : undefined;

  // Build a resolved string[] for the image carousel
  const resolvedImages: string[] = [];
  if (Array.isArray(raw?.images)) {
    for (const img of raw.images) {
      const u = firstNonEmptyString(img?.url, img?.imageUrl);
      if (u) resolvedImages.push(resolveApiAssetUrl(u));
    }
  }
  const resolvedCover = resolveApiAssetUrl(imageCandidate);
  if (resolvedCover && resolvedImages.length === 0) resolvedImages.push(resolvedCover);

  return {
    ...(raw as Restaurant),
    rating: Number(raw?.averageRating ?? raw?.rating ?? 0) || 0,
    reviews:
      typeof raw?.totalReviews === "number"
        ? raw.totalReviews
        : typeof raw?.reviews === "number"
          ? raw.reviews
          : 0,
    price: (raw?.price as PriceRange) || mapPriceRangeFromApi(raw?.priceRange),
    avgPricePerPerson:
      raw?.avgPricePerPerson != null && !Number.isNaN(Number(raw.avgPricePerPerson))
        ? Number(raw.avgPricePerPerson)
        : null,
    distance: dist,
    openNow: Boolean(raw?.openNow ?? raw?.isOpen),
    verified: Boolean(raw?.verified ?? raw?.isVerified),
    phone: phoneFromApi,
    phoneNumber: phoneNumberField,
    isSaved: raw?.isSaved === true,
    image: resolvedCover,
    images: resolvedImages,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    services: (raw?.availableServices ?? raw?.services ?? []) as RestaurantService[],
    popularDishes: dishes,
    waitTime: waitTimeStr,
    savedByMe: Boolean(raw?.isFavorited ?? raw?.savedByMe),
    hasReviewed: raw?.hasReviewed === true,
    latitude: raw?.latitude != null ? Number(raw.latitude) : null,
    longitude: raw?.longitude != null ? Number(raw.longitude) : null,
    waitTimeMinutes:
      raw?.waitTimeMinutes != null ? Number(raw.waitTimeMinutes) : null,
    openingTime: raw?.openingTime ?? null,
    timezone: raw?.timezone ?? null,
    currency: raw?.currency ?? null,
    state: raw?.state ?? null,
    country: raw?.country ?? null,
  };
}

export function getRestaurants(params: RestaurantQueryParams = {}): Promise<PaginatedResponse<Restaurant>> {
  const backendParams = {
    page: params.page,
    limit: params.limit ?? params.pageSize,
    city: params.city,
    cuisine: params.cuisine,
    priceRange: params.priceRange,
    service: params.service,
    search: params.search,
    sort: params.sort,
  };
  return api.get<PaginatedResponse<Restaurant>>(`/restaurants${toQs(backendParams)}`).then((res) => ({
    ...res,
    data: Array.isArray(res?.data) ? res.data.map(normalizeRestaurant) : [],
  }));
}

export function getMyRestaurants(): Promise<Restaurant[]> {
  return api
    .get<Restaurant[]>("/restaurants/my-restaurants")
    .then((rows) => (Array.isArray(rows) ? rows.map(normalizeRestaurant) : []));
}

export function getFavoriteRestaurants(): Promise<Restaurant[]> {
  return api
    .get<Restaurant[]>("/restaurants/favorites")
    .then((rows) => (Array.isArray(rows) ? rows.map(normalizeRestaurant) : []));
}

export function getRestaurant(id: string): Promise<Restaurant> {
  return api.get<Restaurant>(`/restaurants/${id}`).then(normalizeRestaurant);
}

export function createRestaurant(payload: CreateRestaurantPayload): Promise<Restaurant> {
  return api.post<Restaurant>("/restaurants", payload).then(normalizeRestaurant);
}

export function updateRestaurant(id: string, payload: Partial<CreateRestaurantPayload>): Promise<Restaurant> {
  return api.patch<Restaurant>(`/restaurants/${id}`, payload).then(normalizeRestaurant);
}

export function deleteRestaurant(id: string): Promise<void> {
  return api.delete(`/restaurants/${id}`);
}

export function toggleFavoriteRestaurant(id: string): Promise<{ saved: boolean }> {
  return api.post(`/restaurants/${id}/favorite`);
}

export function toggleRestaurantSave(id: string): Promise<{ saved: boolean }> {
  return api.post<{ saved: boolean }>(`/restaurants/${id}/save`);
}

export function initiateOrder(id: string): Promise<{ conversationId: string }> {
  return api.post(`/restaurants/${id}/order`);
}

export function submitReview(id: string, payload: ReviewPayload): Promise<RestaurantReview> {
  return api.post<RestaurantReview>(`/restaurants/${id}/review`, payload).then(normalizeRestaurantReview);
}

export function getReviews(id: string): Promise<RestaurantReview[]> {
  // Backend PaginationDto: limit max 50 (was 100 → validation error, empty reviews + false 409 on re-submit).
  return api.get<unknown>(`/restaurants/${id}/reviews?limit=50&page=1`).then((raw) => {
    const o = raw as { data?: unknown[] };
    const arr = Array.isArray(o?.data) ? o.data : Array.isArray(raw) ? (raw as unknown[]) : [];
    return arr.map(normalizeRestaurantReview);
  });
}

export function updateReview(
  restaurantId: string,
  payload: { rating?: number; content?: string },
): Promise<RestaurantReview> {
  return api
    .patch<RestaurantReview>(`/restaurants/${restaurantId}/reviews`, payload)
    .then(normalizeRestaurantReview);
}

export function deleteReview(restaurantId: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/restaurants/${restaurantId}/reviews`);
}

function guessRestaurantImageMime(uri: string): string {
  const u = uri.toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

/** Attach up to 6 JPEG/PNG/WebP images after creating restaurant. */
export async function uploadRestaurantImages(
  restaurantId: string,
  files: { uri: string; name?: string; type?: string }[],
): Promise<void> {
  const slice = files.slice(0, 6);
  if (slice.length === 0) return;
  const fd = new FormData();
  slice.forEach((f, i) => {
    const name = f.name || `restaurant_${i + 1}.jpg`;
    const type = f.type || guessRestaurantImageMime(f.uri);
    fd.append("images", { uri: f.uri, name, type } as any);
  });
  await postFormData(`/restaurants/${restaurantId}/images`, fd);
}

export function reportRestaurant(id: string, reason: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/restaurants/${id}/report`, { reason });
}

// ─── Reservations (SPRINT-29) ────────────────────────────────────────────────

export interface RestaurantReservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  userId: string;
  user: { id: string; username: string; name: string; avatarUrl: string | null };
  date: string;
  time: string;
  partySize: number;
  note: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
  restaurantCity?: string | null;
  restaurantCuisine?: string | null;
  imageUrl?: string | null;
}

export interface CreateReservationPayload {
  date: string;
  time: string;
  partySize: number;
  note?: string;
}

export function createReservation(
  restaurantId: string,
  body: CreateReservationPayload,
): Promise<RestaurantReservation> {
  return api.post<RestaurantReservation>(`/restaurants/${restaurantId}/reservations`, body);
}

export function cancelReservation(reservationId: string): Promise<RestaurantReservation> {
  return api.patch<RestaurantReservation>(`/restaurants/reservations/${reservationId}/cancel`);
}

export function getMyReservations(): Promise<RestaurantReservation[]> {
  return api.get<RestaurantReservation[]>("/users/me/reservations");
}
