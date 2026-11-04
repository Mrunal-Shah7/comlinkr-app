/**
 * Events API
 *
 * Endpoints:
 *   GET    /events                    — browse events (paginated)
 *   GET    /events/stories            — story-strip events shown in the Feed hero (small horizontal cards)
 *   GET    /events/me                 — events created by current user
 *   GET    /events/registered         — events user is registered for
 *   GET    /events/saved              — events user has saved/bookmarked
 *   GET    /events/:id                — single event detail
 *   POST   /events                    — create event
 *   PATCH  /events/:id                — update event
 *   DELETE /events/:id                — cancel/delete event
 *   POST   /events/:id/register       — register for event (returns ticket)
 *   DELETE /events/:id/register       — unregister / cancel attendance
 *   POST   /events/:id/save           — save/bookmark event toggle
 *   POST   /events/:id/report         — report event
 *   GET    /events/:id/attendees      — list attendees (host only)
 *   GET    /events/:id/ticket         — get my ticket for this event (with QR code)
 *   POST   /events/:id/images         — upload event images (host only)
 *   GET    /events/:id/reviews        — list reviews for a past event
 *   POST   /events/:id/reviews        — submit a review (attendees only, one per user)
 *   PATCH  /events/:id/reviews/:reviewId — update own review
 *   DELETE /events/:id/reviews/:reviewId — delete own or organiser-delete
 *   POST   /events/:id/check-in       — organiser ticket check-in (HTTP 200 ticket outcomes)
 *   GET    /events/:id/check-in       — organiser check-in totals + filtered list
 */

import { api, postFormData } from "./client";
import type { PaginatedResponse } from "./feed.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventCategory =
  | "social"
  | "sports"
  | "culture"
  | "food"
  | "music"
  | "community"
  | "networking"
  | "outdoor";

/** Shape returned by Nest `EventsService.formatEvent` */
export interface ApiEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  venue: string;
  city: string;
  ticketType: string;
  ticketPrice: number | null;
  capacity?: number | null;
  attendeeCount: number;
  averageRating: number; // SPRINT-42: denormalised aggregate from formatEvent
  totalReviews: number; // SPRINT-42: denormalised review count from formatEvent
  /** Detail-only: whether the caller already reviewed this event. */
  hasReviewed?: boolean; // SPRINT-42: detail GET scoped review state
  /** Detail-only: caller's review id when hasReviewed. */
  myReviewId?: string | null; // SPRINT-42: detail GET scoped review id
  createdAt: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
  isAttending: boolean;
  registeredByMe: boolean;
  savedByMe: boolean;
  isSaved: boolean;
  isFull: boolean;
  isOwner: boolean;
  spotsLeft: number | null;
  /** Event group chat (created on first RSVP); null until then. */
  conversationId?: string | null;
  /** Server-computed: chat visible only for host (when chat exists) or RSVPed users. */
  canAccessChat?: boolean;
  /** `/api/files/...` paths from Nest; resolve with `resolveApiAssetUrl` in UI */
  images?: string[];
}

export interface EventOrganizer {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
}

/** @deprecated Prefer ApiEvent for API-backed lists */
export interface Event {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  time: string;
  location: string;
  address?: string;
  city: string;
  image?: string;
  price: number | null;
  capacity?: number;
  attendees: number;
  registeredByMe: boolean;
  savedByMe: boolean;
  organizer: EventOrganizer;
  tags: string[];
  isOnline: boolean;
  streamUrl?: string;
  emoji?: string;         // used in story strip cards and list view
  host?: string;         // organizer display name shorthand
  createdAt: string;
  updatedAt: string;
}

/** Lightweight event shape used in the Feed story-strip (horizontal scroll) */
export interface StoryEvent {
  id: string;
  emoji: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image?: string;
  attendees: number;
  averageRating: number; // SPRINT-42: story endpoint exposes aggregates even without a mobile consumer
  totalReviews: number; // SPRINT-42: story endpoint review count
  price: number | null;
  tags: string[];
  registeredByMe: boolean;
}

/** Ticket returned after registering for an event */
export interface EventTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventEmoji?: string;
  date: string;
  time: string;
  location: string;
  attendeeName: string;
  attendeeEmail: string;
  quantity: number;
  totalPrice: number;
  /** Base64 encoded QR code PNG, or a URL to the QR image */
  qrCode: string;
  issuedAt: string;
}

export interface EventsQueryParams {
  page?: number;
  pageSize?: number;
  /** Alias for backend `limit`. */
  limit?: number;
  city?: string;
  category?: EventCategory;
  /** Not sent to API; use ticket filters client-side if needed. */
  free?: boolean;
  upcoming?: boolean;
  date?: string;
}

/** Body for `POST /events` (matches Nest `CreateEventDto`). */
export interface CreateEventPayload {
  title: string;
  description: string;
  /** Prisma enum: SOCIAL, SPORTS, MUSIC, ARTS, FOOD_DRINK, TECH, HEALTH, COMMUNITY, EDUCATION */
  category: string;
  /** IN_PERSON | VIRTUAL | HYBRID */
  format: string;
  /** ISO date `YYYY-MM-DD` */
  date: string;
  startTime: string;
  endTime?: string;
  venue: string;
  city: string;
  ticketType: "FREE" | "PAID";
  ticketPrice?: number;
  capacity?: number;
}

/** One review row from `GET /events/:id/reviews` (restaurant-shaped). */
export interface EventReview {
  id: string;
  rating: number; // 1-5
  content: string; // SPRINT-42: backend field is content (not comment)
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
}

/** Standard Nest `{ data, meta }` normalised for event reviews. */
export interface EventReviewsPage {
  data: EventReview[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  meta?: { page: number; limit: number; total: number; totalPages: number }; // SPRINT-42: preserve raw meta when present
}

export interface CreateEventReviewPayload {
  rating: number; // SPRINT-42: integer 1..5
  content: string; // SPRINT-42: required nonempty, max 1000 (CreateEventReviewDto)
}

export interface UpdateEventReviewPayload {
  rating?: number; // SPRINT-42: optional integer 1..5
  content?: string; // SPRINT-42: optional nonempty, max 2000
}

export interface EventAttendee {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  registeredAt: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string | null;
  ticketCount: number;
}

/** HTTP 200 ticket outcome reason codes from POST check-in. */
export type EventCheckInReasonCode =
  | "ADMITTED"
  | "INVALID_TICKET"
  | "WRONG_EVENT"
  | "ALREADY_CHECKED_IN"
  | "REGISTRATION_CANCELLED"; // SPRINT-42: match Sprint 38 door contract

export interface EventCheckInAttendee {
  id: string;
  ticketId: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  ticketCount: number;
  registeredAt?: string;
  checkedInAt?: string | null;
  checkedIn?: boolean;
}

export interface EventCheckInResult {
  admitted: boolean;
  reasonCode: EventCheckInReasonCode;
  message: string;
  checkedInAt?: string | Date | null;
  attendee: EventCheckInAttendee | null;
}

export type EventCheckInFilter = "checked_in" | "remaining"; // SPRINT-42: status list filters

export interface EventCheckInStatus {
  /** Null when TransformInterceptor drops sibling totals from the HTTP envelope. */ // SPRINT-42:
  totalRegistered: number | null; // SPRINT-42: never coerce missing → 0
  checkedIn: number | null; // SPRINT-42:
  remaining: number | null; // SPRINT-42:
  data: EventCheckInAttendee[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  /** True when ticket-quantity totals were present on the unwrapped payload. */ // SPRINT-42:
  totalsAvailable: boolean; // SPRINT-42:
}

// ─── API calls ────────────────────────────────────────────────────────────────

function toPagedEvents(raw: unknown): PaginatedResponse<ApiEvent> {
  const o = raw as {
    data?: ApiEvent[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  };
  if (o?.meta) {
    return {
      data: (o.data ?? []).map(normalizeApiEvent), // SPRINT-42: normalise aggregates on every page
      page: o.meta.page,
      pageSize: o.meta.limit,
      total: o.meta.total,
      hasMore: o.meta.page < o.meta.totalPages,
    };
  }
  return {
    data: Array.isArray(o) ? (o as ApiEvent[]).map(normalizeApiEvent) : [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  };
}

/** Ensure aggregate / registration booleans are always defined for UI. */
export function normalizeApiEvent(raw: Partial<ApiEvent> | null | undefined): ApiEvent {
  // SPRINT-42: defensive normalisation for list and detail payloads
  const e = (raw ?? {}) as Partial<ApiEvent>;
  const averageRating = Number(e.averageRating ?? 0) || 0;
  const totalReviews = Number(e.totalReviews ?? 0) || 0;
  return {
    id: String(e.id ?? ""),
    title: String(e.title ?? ""),
    description: String(e.description ?? ""),
    category: String(e.category ?? ""),
    format: String(e.format ?? ""),
    date: String(e.date ?? ""),
    startTime: String(e.startTime ?? ""),
    endTime: e.endTime ?? null,
    venue: String(e.venue ?? ""),
    city: String(e.city ?? ""),
    ticketType: String(e.ticketType ?? "FREE"),
    ticketPrice: e.ticketPrice != null ? Number(e.ticketPrice) : null,
    capacity: e.capacity ?? null,
    attendeeCount: Number(e.attendeeCount ?? 0) || 0,
    averageRating, // SPRINT-42:
    totalReviews, // SPRINT-42:
    hasReviewed: e.hasReviewed === true, // SPRINT-42: detail-only; false when absent on lists
    myReviewId: e.myReviewId ?? null, // SPRINT-42:
    createdAt: String(e.createdAt ?? ""),
    author: {
      id: String(e.author?.id ?? ""),
      username: String(e.author?.username ?? ""),
      name: String(e.author?.name ?? ""),
      avatarUrl: e.author?.avatarUrl ?? null,
    },
    isAttending: !!e.isAttending,
    registeredByMe: !!(e.registeredByMe ?? e.isAttending),
    savedByMe: !!e.savedByMe,
    isSaved: !!(e.isSaved ?? e.savedByMe),
    isFull: !!e.isFull,
    isOwner: !!e.isOwner,
    spotsLeft: e.spotsLeft ?? null,
    conversationId: e.conversationId ?? null,
    canAccessChat: !!e.canAccessChat,
    images: Array.isArray(e.images) ? e.images : [],
  };
}

export function normalizeEventReview(raw: unknown): EventReview {
  // SPRINT-42: map restaurant-shaped review rows
  const r = (raw ?? {}) as Record<string, unknown>;
  const author = (r.author ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    rating: Number(r.rating ?? 0) || 0,
    content: String(r.content ?? r.comment ?? ""),
    createdAt: String(r.createdAt ?? ""),
    author: {
      id: String(author.id ?? ""),
      name: String(author.name ?? author.username ?? "User"),
      username: String(author.username ?? ""),
      avatarUrl: (author.avatarUrl as string | null) ?? null,
    },
  };
}

function toPagedReviews(raw: unknown): EventReviewsPage {
  // SPRINT-42: accept standard { data, meta } envelope
  const o = raw as {
    data?: unknown[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  };
  if (o?.meta) {
    return {
      data: (o.data ?? []).map(normalizeEventReview),
      page: o.meta.page,
      pageSize: o.meta.limit,
      total: o.meta.total,
      hasMore: o.meta.page < o.meta.totalPages,
      meta: o.meta,
    };
  }
  const arr = Array.isArray(raw) ? raw : Array.isArray(o?.data) ? o.data : [];
  return {
    data: arr.map(normalizeEventReview),
    page: 1,
    pageSize: arr.length || 20,
    total: arr.length,
    hasMore: false,
  };
}

function eventCategoryToBackend(cat?: EventCategory): string | undefined {
  if (!cat) return undefined;
  const m: Record<EventCategory, string> = {
    social: "SOCIAL",
    sports: "SPORTS",
    culture: "ARTS",
    food: "FOOD_DRINK",
    music: "MUSIC",
    community: "COMMUNITY",
    networking: "SOCIAL",
    outdoor: "SPORTS",
  };
  return m[cat];
}

/** Only sends query keys accepted by `EventsQueryDto` (avoids 400 with forbidNonWhitelisted). */
function toEventsQs(params: EventsQueryParams): string {
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  const limit = params.pageSize ?? params.limit;
  if (limit != null) e.set("limit", String(limit));
  if (params.city) e.set("city", params.city);
  const backendCat = params.category != null ? eventCategoryToBackend(params.category) : undefined;
  if (backendCat) e.set("category", backendCat);
  if (params.upcoming !== undefined) e.set("upcoming", params.upcoming ? "true" : "false");
  const qs = e.toString();
  return qs ? `?${qs}` : "";
}

export async function getEvents(params: EventsQueryParams = {}): Promise<PaginatedResponse<ApiEvent>> {
  const raw = await api.get<unknown>(`/events${toEventsQs(params)}`);
  return toPagedEvents(raw);
}

/** Story-strip events: lightweight list for the Feed hero horizontal scroll */
export async function getStoryEvents(city?: string): Promise<StoryEvent[]> {
  // SPRINT-42: type aggregates on story rows
  const raw = await api.get<StoryEvent[]>(`/events/stories${city ? `?city=${encodeURIComponent(city)}` : ""}`);
  return (Array.isArray(raw) ? raw : []).map((s) => ({
    ...s,
    averageRating: Number(s.averageRating ?? 0) || 0,
    totalReviews: Number(s.totalReviews ?? 0) || 0,
  }));
}

export async function getMyEvents(): Promise<ApiEvent[]> {
  // SPRINT-42: own events use formatEvent (ApiEvent), not legacy Event
  const raw = await api.get<unknown>("/events/me");
  const list = Array.isArray(raw) ? raw : [];
  return list.map((e) => normalizeApiEvent(e as Partial<ApiEvent>));
}

export async function getRegisteredEvents(): Promise<ApiEvent[]> {
  // SPRINT-42: registered list uses formatEvent
  const raw = await api.get<unknown>("/events/registered");
  const list = Array.isArray(raw) ? raw : [];
  return list.map((e) => normalizeApiEvent(e as Partial<ApiEvent>));
}

export async function getSavedEvents(
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResponse<ApiEvent>> {
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  if (params.pageSize != null) e.set("limit", String(params.pageSize));
  const qs = e.toString() ? `?${e.toString()}` : "";
  const raw = await api.get<unknown>(`/events/saved${qs}`);
  return toPagedEvents(raw);
}

export async function getEvent(id: string): Promise<ApiEvent> {
  // SPRINT-42: normalise detail including hasReviewed / myReviewId
  const raw = await api.get<Partial<ApiEvent>>(`/events/${id}`);
  return normalizeApiEvent(raw);
}

export function createEvent(payload: CreateEventPayload): Promise<ApiEvent> {
  return api.post<ApiEvent>("/events", payload as unknown as Record<string, unknown>).then(normalizeApiEvent);
}

function guessEventImageMime(uri: string): string {
  const u = uri.toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

/** Attach up to 6 JPEG/PNG/WebP images after creating an event. */
export async function uploadEventImages(
  eventId: string,
  files: { uri: string; name?: string; type?: string }[],
): Promise<void> {
  const slice = files.slice(0, 6);
  if (slice.length === 0) return;
  const fd = new FormData();
  slice.forEach((f, i) => {
    const name = f.name || `event_${i + 1}.jpg`;
    const type = f.type || guessEventImageMime(f.uri);
    fd.append("images", { uri: f.uri, name, type } as any);
  });
  await postFormData(`/events/${eventId}/images`, fd);
}

export function updateEvent(id: string, payload: Partial<CreateEventPayload>): Promise<ApiEvent> {
  return api.patch<ApiEvent>(`/events/${id}`, payload as unknown as Record<string, unknown>).then(normalizeApiEvent);
}

export function deleteEvent(id: string): Promise<void> {
  return api.delete(`/events/${id}`);
}

export function registerForEvent(
  id: string,
  payload?: {
    attendeeName?: string;
    attendeeEmail?: string;
    attendeePhone?: string;
    ticketCount?: number;
  },
): Promise<{
  registered: boolean;
  attendees: number;
  conversationId?: string | null;
}> {
  return api.post(`/events/${id}/register`, payload ?? {});
}

export function unregisterFromEvent(id: string): Promise<{
  registered: boolean;
  attendees: number;
  conversationId?: string | null;
}> {
  return api.delete(`/events/${id}/register`);
}

export function toggleSaveEvent(id: string): Promise<{ saved: boolean }> {
  return api.post(`/events/${id}/save`);
}

export function reportEvent(id: string, reason: string): Promise<void> {
  return api.post(`/events/${id}/report`, { reason });
}

export function getEventAttendees(id: string): Promise<EventAttendee[]> {
  return api.get<EventAttendee[]>(`/events/${id}/attendees`);
}

/** Get current user's ticket for an event (after registration) */
export function getMyTicket(id: string): Promise<EventTicket> {
  return api.get<EventTicket>(`/events/${id}/ticket`);
}

/** Register with ticket details then fetch the QR ticket (registration does not return EventTicket). */
export async function registerWithDetails(
  id: string,
  payload: { name: string; email: string; quantity?: number; phone?: string },
): Promise<EventTicket> {
  // SPRINT-42: use correct register body keys then GET ticket
  await registerForEvent(id, {
    attendeeName: payload.name,
    attendeeEmail: payload.email,
    attendeePhone: payload.phone,
    ticketCount: payload.quantity,
  });
  return getMyTicket(id);
}

/** Paginated newest-first reviews for an event. */
export async function getEventReviews(
  id: string,
  params: { page?: number; pageSize?: number; limit?: number } = {},
): Promise<EventReviewsPage> {
  // SPRINT-42: standard paginated list
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  const limit = params.pageSize ?? params.limit;
  if (limit != null) e.set("limit", String(limit));
  const qs = e.toString() ? `?${e.toString()}` : "";
  const raw = await api.get<unknown>(`/events/${id}/reviews${qs}`);
  return toPagedReviews(raw);
}

/** Submit a review for an event the user attended (one per attendee). */
export function submitEventReview(
  id: string,
  payload: CreateEventReviewPayload,
): Promise<EventReview> {
  // SPRINT-42: body { rating, content } max content 1000
  return api
    .post<unknown>(`/events/${id}/reviews`, {
      rating: payload.rating,
      content: payload.content,
    })
    .then(normalizeEventReview);
}

/** Update the caller's own review by id. */
export function updateEventReview(
  eventId: string,
  reviewId: string,
  payload: UpdateEventReviewPayload,
): Promise<EventReview> {
  // SPRINT-42: non-empty subset of rating/content
  const body: Record<string, unknown> = {};
  if (payload.rating !== undefined) body.rating = payload.rating;
  if (payload.content !== undefined) body.content = payload.content;
  return api
    .patch<unknown>(`/events/${eventId}/reviews/${reviewId}`, body)
    .then(normalizeEventReview);
}

/** Delete own review, or organiser may delete any review. */
export function deleteEventReview(eventId: string, reviewId: string): Promise<{ deleted: boolean }> {
  // SPRINT-42: DELETE /events/:id/reviews/:reviewId
  return api.delete(`/events/${eventId}/reviews/${reviewId}`);
}

/**
 * Organiser check-in: body field is `ticketId` (= QR `attendeeId`).
 * Ticket outcomes are HTTP 200 and returned normally (never thrown as ApiError).
 */
export function checkInEventTicket(
  eventId: string,
  attendeeId: string,
): Promise<EventCheckInResult> {
  // SPRINT-42: POST /events/:id/check-in { ticketId }
  return api.post<EventCheckInResult>(`/events/${eventId}/check-in`, {
    ticketId: attendeeId,
  });
}

/** Parse a ticket-quantity total; missing/invalid → null (never fake zero). */ // SPRINT-42:
function parseOptionalCheckInTotal(value: unknown): number | null {
  // SPRINT-42: TransformInterceptor may omit totals entirely
  if (value === undefined || value === null) return null; // SPRINT-42:
  const n = Number(value); // SPRINT-42:
  return Number.isFinite(n) ? n : null; // SPRINT-42:
}

/** Organiser check-in dashboard: ticket-quantity totals + paginated registrations. */
export async function getEventCheckInStatus(
  eventId: string,
  params: { page?: number; pageSize?: number; limit?: number; filter?: EventCheckInFilter } = {},
): Promise<EventCheckInStatus> {
  // SPRINT-42: GET /events/:id/check-in
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  const limit = params.pageSize ?? params.limit;
  if (limit != null) e.set("limit", String(limit));
  if (params.filter) e.set("filter", params.filter);
  const qs = e.toString() ? `?${e.toString()}` : "";
  const raw = await api.get<Record<string, unknown>>(`/events/${eventId}/check-in${qs}`); // SPRINT-42: envelope may lack totals
  const meta = raw.meta as { page: number; limit: number; total: number; totalPages: number } | undefined;
  const totalRegistered = parseOptionalCheckInTotal(raw.totalRegistered); // SPRINT-42:
  const checkedIn = parseOptionalCheckInTotal(raw.checkedIn); // SPRINT-42:
  const remaining = parseOptionalCheckInTotal(raw.remaining); // SPRINT-42:
  const totalsAvailable = // SPRINT-42: all three present only when interceptor preserves siblings
    totalRegistered != null && checkedIn != null && remaining != null; // SPRINT-42:
  return {
    totalRegistered, // SPRINT-42:
    checkedIn, // SPRINT-42:
    remaining, // SPRINT-42:
    totalsAvailable, // SPRINT-42:
    data: Array.isArray(raw.data) ? (raw.data as EventCheckInAttendee[]) : [],
    page: meta?.page ?? params.page ?? 1,
    pageSize: meta?.limit ?? limit ?? 20,
    total: meta?.total ?? (Array.isArray(raw.data) ? raw.data.length : 0),
    hasMore: meta ? meta.page < meta.totalPages : false,
  };
}
