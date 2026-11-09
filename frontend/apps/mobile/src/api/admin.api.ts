/**
 * Admin API — single module for /admin/* (and badge document URL).
 * // SPRINT-41: Contract-aligned types + dual pagination query builders.
 *
 * Pagination conventions:
 *   buildLimitQuery   → page + limit (max 50)     — users, reports, badges/applications, content DTO
 *   buildPageSizeQuery → page + pageSize (literal) — listings, polls, support, sessions, feed, restaurants, etc.
 */

import { api, ApiError } from "./client"; // SPRINT-41:
import type { BadgeApplication } from "./badges.api";
import type { AdminNotification as SharedAdminNotification, TrendingPost as SharedTrendingPost } from "@shared/types/api";

// ─── Envelope helpers ─────────────────────────────────────────────────────────

/** // SPRINT-41: Backend error.body shape from HttpExceptionFilter */
export interface AdminErrorBody { // SPRINT-41:
  code: string; // SPRINT-41:
  message: string; // SPRINT-41:
  details?: { field: string; message: string }[]; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Standard paginated meta (meta.limit holds pageSize for raw-query routes) */
export interface AdminPageMeta { // SPRINT-41:
  page: number; // SPRINT-41:
  limit: number; // SPRINT-41:
  total: number; // SPRINT-41:
  totalPages: number; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Paginated admin list envelope after client unwrap */
export interface AdminPaginatedResponse<T> { // SPRINT-41:
  data: T[]; // SPRINT-41:
  meta: AdminPageMeta; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: True when ApiError is HTTP 403 (non-admin / forbidden) */
export function isAdminForbiddenError(err: unknown): boolean { // SPRINT-41:
  return err instanceof ApiError && err.status === 403; // SPRINT-41:
} // SPRINT-41:

// ─── Query builders ───────────────────────────────────────────────────────────

/**
 * // SPRINT-41: DTO pagination — Nest PaginationDto / AdminUsersQueryDto use `page` + `limit` (max 50).
 * // SPRINT-41: NEVER rename pageSize→limit here incorrectly for pageSize endpoints; use buildPageSizeQuery instead.
 */
export function buildLimitQuery(params: Record<string, unknown>): string { // SPRINT-41:
  const e = new URLSearchParams(); // SPRINT-41:
  for (const [key, value] of Object.entries(params)) { // SPRINT-41:
    if (value === undefined || value === null) continue; // SPRINT-41:
    if (key === "pageSize") { // SPRINT-41: accept legacy alias from callers, send as limit
      const n = Math.min(50, Number(value)); // SPRINT-41:
      if (!Number.isNaN(n)) e.set("limit", String(n)); // SPRINT-41:
      continue; // SPRINT-41:
    } // SPRINT-41:
    if (key === "limit") { // SPRINT-41:
      const n = Math.min(50, Number(value)); // SPRINT-41:
      if (!Number.isNaN(n)) e.set("limit", String(n)); // SPRINT-41:
      continue; // SPRINT-41:
    } // SPRINT-41:
    e.set(key, String(value)); // SPRINT-41:
  } // SPRINT-41:
  return e.toString(); // SPRINT-41:
} // SPRINT-41:

/**
 * // SPRINT-41: Raw-query pagination — backend reads `page` + `pageSize` literally (do NOT rename to limit).
 * // SPRINT-41: Sessions allow pageSize up to 100; other routes typically default 20.
 */
export function buildPageSizeQuery(params: Record<string, unknown>, opts?: { maxPageSize?: number }): string { // SPRINT-41:
  const max = opts?.maxPageSize ?? 50; // SPRINT-41:
  const e = new URLSearchParams(); // SPRINT-41:
  for (const [key, value] of Object.entries(params)) { // SPRINT-41:
    if (value === undefined || value === null) continue; // SPRINT-41:
    if (key === "pageSize" || key === "limit") { // SPRINT-41: map limit alias → pageSize query key
      const n = Math.min(max, Number(value)); // SPRINT-41:
      if (!Number.isNaN(n)) e.set("pageSize", String(n)); // SPRINT-41:
      continue; // SPRINT-41:
    } // SPRINT-41:
    e.set(key, String(value)); // SPRINT-41:
  } // SPRINT-41:
  return e.toString(); // SPRINT-41:
} // SPRINT-41:

// ─── Types (contract-aligned) ─────────────────────────────────────────────────

export type AdminApiRole = "USER" | "ADMIN"; // SPRINT-41:
/** @deprecated Prefer AdminApiRole uppercase for PATCH bodies */
export type UserRole = "user" | "admin" | "moderator" | "super_admin";
export type AdminActionType = "approve" | "reject" | "suspend" | "delete" | "restore" | "warn" | "ban" | "grant_badge" | "revoke_badge" | "remove_content" | "feature";
export type NotificationAudience = "all" | "active" | "admins";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/** // SPRINT-41: GET /admin/analytics contract shape */
export interface AdminAnalytics { // SPRINT-41:
  users: { total: number; active: number; newThisMonth: number; newThisWeek: number }; // SPRINT-41:
  content: { // SPRINT-41:
    feedPosts: number; // SPRINT-41:
    housingListings: number; // SPRINT-41:
    restaurants: number; // SPRINT-41:
    events: number; // SPRINT-41:
    stories: number; // SPRINT-41:
    challenges: number; // SPRINT-41:
    communityQuestions: number; // SPRINT-41:
  }; // SPRINT-41:
  engagement: { // SPRINT-41:
    totalLikes: number; // SPRINT-41:
    totalComments: number; // SPRINT-41:
    totalMessages: number; // SPRINT-41:
    totalReviews: number; // SPRINT-41:
  }; // SPRINT-41:
  reports: { pending: number }; // SPRINT-41:
  badges: { pendingApplications: number; totalApproved: number }; // SPRINT-41:
} // SPRINT-41:

/** @deprecated Use AdminAnalytics — kept for older screen mappings */
export type Analytics = AdminAnalytics; // SPRINT-41:

/** // SPRINT-41: Session row from GET /admin/sessions */
export interface AdminSessionItem { // SPRINT-41:
  sessionId: string; // SPRINT-41:
  user: { // SPRINT-41:
    id: string; // SPRINT-41:
    username: string; // SPRINT-41:
    fullName: string | null; // SPRINT-41:
    avatarUrl: string | null; // SPRINT-41:
    email: string; // SPRINT-41:
    role: string; // SPRINT-41:
    isActive: boolean; // SPRINT-41:
  }; // SPRINT-41:
  provider: string | null; // SPRINT-41:
  approximateLastActivityAt: string; // SPRINT-41:
  remainingLifetimeSeconds: number; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Sessions list envelope including truncated flag */
export interface AdminSessionsResponse { // SPRINT-41:
  data: AdminSessionItem[]; // SPRINT-41:
  meta: { page: number; limit: number; total: number; totalPages: number }; // SPRINT-41:
  truncated: boolean; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Poll option from backend AdminPoll */
export interface AdminPollOption { // SPRINT-41:
  id: string; // SPRINT-41:
  text: string; // SPRINT-41:
  votesCount: number; // SPRINT-41:
  order: number; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Poll from GET/POST/PATCH /admin/polls */
export interface AdminPoll { // SPRINT-41:
  id: string; // SPRINT-41:
  question: string; // SPRINT-41:
  createdById: string; // SPRINT-41:
  isActive: boolean; // SPRINT-41:
  createdAt: string; // SPRINT-41:
  updatedAt: string; // SPRINT-41:
  options: AdminPollOption[]; // SPRINT-41:
  createdBy: { id: string; username: string }; // SPRINT-41:
  totalVotes: number; // SPRINT-41:
} // SPRINT-41:

/** @deprecated Use AdminPoll */
export type Poll = AdminPoll; // SPRINT-41:

export interface CreatePollPayload { // SPRINT-41:
  question: string; // SPRINT-41:
  options: string[]; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Support ticket from GET /admin/support */
export interface AdminSupportTicket { // SPRINT-41:
  id: string; // SPRINT-41:
  subject: string; // SPRINT-41:
  message: string; // SPRINT-41:
  status: "OPEN" | "REPLIED" | "CLOSED"; // SPRINT-41:
  adminReply?: string | null; // SPRINT-41:
  createdAt: string; // SPRINT-41:
  updatedAt?: string; // SPRINT-41:
  user: { id: string; username: string; fullName: string | null; email: string }; // SPRINT-41:
} // SPRINT-41:

/** @deprecated Use AdminSupportTicket */
export type SupportTicket = AdminSupportTicket; // SPRINT-41:

/** // SPRINT-41: Housing listing row from GET /admin/listings — do not rename fields in API layer */
export interface AdminHousingListingRow { // SPRINT-41:
  id: string; // SPRINT-41:
  title: string; // SPRINT-41:
  description?: string; // SPRINT-41:
  status: "AVAILABLE" | "RENTED" | "UNLISTED"; // SPRINT-41:
  propertyType?: string; // SPRINT-41:
  price?: number; // SPRINT-41:
  currency?: string; // SPRINT-41:
  address?: string; // SPRINT-41:
  city?: string; // SPRINT-41:
  state?: string; // SPRINT-41:
  country?: string; // SPRINT-41:
  zipCode?: string; // SPRINT-41:
  latitude?: number; // SPRINT-41:
  longitude?: number; // SPRINT-41:
  images?: string[]; // SPRINT-41:
  viewCount?: number; // SPRINT-41:
  createdAt: string; // SPRINT-41:
  updatedAt?: string; // SPRINT-41:
  owner?: { id: string; username: string; fullName: string | null }; // SPRINT-41:
  _count?: { interests?: number }; // SPRINT-41:
  [key: string]: unknown; // SPRINT-41:
} // SPRINT-41:

export interface AreaNeighborhood {
  id: string;
  name: string;
  city: string;
  activeUsers: number;
  listingCount: number;
  eventCount: number;
  isActive: boolean;
}

export interface TrendingItem {
  id: string;
  title: string;
  type: "listing" | "restaurant" | "event" | "news" | "post";
  author: string;
  authorId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementScore: number;
  reportCount: number;
  status: "active" | "flagged";
  createdAt: string;
  tags: string[];
}

/** @deprecated Use AdminSessionItem — mock-shaped session type */
export interface AdminSession {
  id: string;
  userId: string;
  userName: string;
  email: string;
  device: "mobile" | "web";
  os: string;
  ipAddress: string;
  location?: string;
  lastActiveAt: string;
  loginTime: string;
  status: "active" | "expired" | "revoked";
  suspicious: boolean;
}

/** // SPRINT-41: Time-series is deferred on backend — stub type only */
export interface AnalyticsTimeSeries { // SPRINT-41:
  period: "7d" | "30d" | "90d" | "1y"; // SPRINT-41:
  users: { date: string; count: number; delta: number }[]; // SPRINT-41:
  listings: { date: string; count: number; delta: number }[]; // SPRINT-41:
  reports: { date: string; count: number; delta: number }[]; // SPRINT-41:
  retentionRate: number; // SPRINT-41:
  avgSessionDuration: number; // SPRINT-41:
} // SPRINT-41:

export interface AdminUser {
  id: string;
  /** Legacy client shape; list API may send `fullName` instead. */
  name?: string;
  fullName?: string | null;
  username: string;
  email: string;
  role: UserRole | AdminApiRole | string;
  city?: string;
  country?: string;
  location?: { city: string | null; country: string | null } | null; // SPRINT-41:
  verificationStatus?: string;
  badges?: string[];
  banned?: boolean;
  isActive?: boolean;
  deletedAt?: string | null; // SPRINT-41:
  createdAt: string;
  lastActiveAt?: string;
  providers?: string[]; // SPRINT-41:
  avatarUrl?: string | null; // SPRINT-41:
  counts?: { // SPRINT-41: detail GET only
    feedPosts: number; // SPRINT-41:
    housingListings: number; // SPRINT-41:
    restaurants: number; // SPRINT-41:
    conversations: number; // SPRINT-41:
    events: number; // SPRINT-41:
  }; // SPRINT-41:
  userBadges?: { badgeType: string }[]; // SPRINT-41: detail GET
}

export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

/** Widened target-type union for the unified report queue (Safety Center). */
export type AdminReportTargetType =
  | "HOUSING"
  | "RESTAURANT"
  | "USER"
  | "COMMUNITY_POST"
  | "COMMUNITY_MEMBER"
  | "QA_QUESTION"
  | "QA_ANSWER"
  | "EVENT"
  | "CHAT_MESSAGE"
  | string; // keep string fallback so unknown future types don't hard-break rendering

export interface AdminListingReport {
  id: string;
  source?: "LISTING_REPORT" | "CONTENT_REPORT";
  targetType: AdminReportTargetType;
  targetId: string;
  targetTitle: string | null;
  targetAddress: string | null;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  reporter: {
    id: string;
    username: string;
    fullName: string | null;
  };
  /** Present for USER-type reports: who is being reported (not the reporter). */
  reportedUser?: { id: string; username: string; fullName: string | null } | null;
  /** Parent context for nested content (e.g. QA_ANSWER needs its questionId, CHAT_MESSAGE needs its conversationId). */
  parentId?: string | null;
}

export interface BroadcastPayload {
  title: string;
  body: string;
  audienceType: "ALL" | "CITY" | "SELECTIVE";
  audienceCity?: string;
  audienceUserIds?: string[];
  /** SPRINT-57: persisted server-side; Prisma enum casing. */
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  /** SPRINT-57: ISO timestamp. A future value defers dispatch to the backend cron. */
  scheduledFor?: string;
}

export interface UpdateUserPayload { // SPRINT-41:
  role?: AdminApiRole; // SPRINT-41: uppercase USER | ADMIN for PATCH body
  isActive?: boolean; // SPRINT-41:
  /** @deprecated Maps to isActive when isActive omitted */
  banned?: boolean;
} // SPRINT-41:

// ─── Users (limit pagination) ─────────────────────────────────────────────────

/** // SPRINT-41: GET /admin/users — buildLimitQuery (page + limit) */
export function adminGetUsers( // SPRINT-41:
  params: { // SPRINT-41:
    page?: number; // SPRINT-41:
    limit?: number; // SPRINT-41:
    search?: string; // SPRINT-41:
    role?: AdminApiRole; // SPRINT-41:
    isActive?: boolean; // SPRINT-41:
    /** @deprecated Prefer `limit` */
    pageSize?: number;
  } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<AdminUser>> { // SPRINT-41:
  const q: Record<string, unknown> = {}; // SPRINT-41:
  if (params.page !== undefined) q.page = params.page; // SPRINT-41:
  if (params.limit !== undefined) q.limit = params.limit; // SPRINT-41:
  else if (params.pageSize !== undefined) q.limit = params.pageSize; // SPRINT-41:
  if (params.search !== undefined) q.search = params.search; // SPRINT-41:
  if (params.role !== undefined) q.role = params.role; // SPRINT-41:
  if (params.isActive !== undefined) q.isActive = params.isActive; // SPRINT-41:
  const qs = buildLimitQuery(q); // SPRINT-41:
  return api.get<AdminPaginatedResponse<AdminUser>>(`/admin/users${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: GET /admin/users/:id */
export function adminGetUser(id: string): Promise<AdminUser> { // SPRINT-41:
  return api.get<AdminUser>(`/admin/users/${id}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: PATCH /admin/users/:id — send uppercase roles */
export function adminUpdateUser( // SPRINT-41:
  id: string, // SPRINT-41:
  payload: { role?: AdminApiRole; isActive?: boolean; banned?: boolean }, // SPRINT-41:
): Promise<AdminUser> { // SPRINT-41:
  const body: { role?: AdminApiRole; isActive?: boolean } = {}; // SPRINT-41:
  if (payload.role !== undefined) body.role = payload.role; // SPRINT-41:
  if (payload.isActive !== undefined) { // SPRINT-41:
    body.isActive = payload.isActive; // SPRINT-41:
  } else if (payload.banned === true) { // SPRINT-41:
    body.isActive = false; // SPRINT-41:
  } else if (payload.banned === false) { // SPRINT-41:
    body.isActive = true; // SPRINT-41:
  } // SPRINT-41:
  return api.patch<AdminUser>(`/admin/users/${id}`, body); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: DELETE /admin/users/:id */
export function adminDeleteUser(id: string): Promise<{ message: string }> { // SPRINT-41:
  return api.delete(`/admin/users/${id}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: POST /admin/users/:id/warn */
export function adminWarnUser(id: string, message: string): Promise<{ message: string }> { // SPRINT-41:
  return api.post(`/admin/users/${id}/warn`, { message }); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: POST /admin/users/:id/grant-badge */
export function adminGrantBadge(userId: string, badgeType: string): Promise<{ message: string }> { // SPRINT-41:
  return api.post(`/admin/users/${userId}/grant-badge`, { badgeType }); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: DELETE /admin/users/:id/revoke-badge/:type */
export function adminRevokeBadge(userId: string, badgeType: string): Promise<{ message: string }> { // SPRINT-41:
  return api.delete(`/admin/users/${userId}/revoke-badge/${badgeType}`); // SPRINT-41:
} // SPRINT-41:

// ─── Listings (pageSize pagination) ───────────────────────────────────────────

/** // SPRINT-41: GET /admin/listings — buildPageSizeQuery */
export function adminGetListings( // SPRINT-41:
  params: { // SPRINT-41:
    page?: number; // SPRINT-41:
    pageSize?: number; // SPRINT-41:
    search?: string; // SPRINT-41:
    status?: string; // SPRINT-41:
    propertyType?: string; // SPRINT-41:
  } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<AdminHousingListingRow>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/listings${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: PATCH /admin/listings/:id/moderate */
export function adminModerateListing( // SPRINT-41:
  listingId: string, // SPRINT-41:
  action: "approve" | "reject" | "delete" | "hide" | "suspend", // SPRINT-41:
  reason?: string,
): Promise<{ message: string }> { // SPRINT-41:
  return api.patch(`/admin/listings/${listingId}/moderate`, { action, ...(reason ? { reason } : {}) }); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Wrapper — fake /approve path removed; calls moderate */
export function adminApproveListing(id: string): Promise<{ message: string }> { // SPRINT-41:
  return adminModerateListing(id, "approve"); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Wrapper — fake /reject path removed; calls moderate */
export function adminRejectListing(id: string, reason?: string): Promise<{ message: string }> { // SPRINT-41:
  return adminModerateListing(id, "reject", reason); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Prefer moderate action "delete" — kept for older callers */
export function adminDeleteListing(id: string): Promise<{ message: string }> { // SPRINT-41:
  return adminModerateListing(id, "delete"); // SPRINT-41:
} // SPRINT-41:

// ─── Restaurants (pageSize) ───────────────────────────────────────────────────

/** // SPRINT-41: GET /admin/restaurants — buildPageSizeQuery */
export function adminGetRestaurants( // SPRINT-41:
  params: { page?: number; pageSize?: number; search?: string; isVerified?: boolean } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<unknown>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/restaurants${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

export function adminDeleteRestaurant(id: string): Promise<void> {
  return api.delete(`/admin/restaurants/${id}`);
}

export function adminModerateRestaurant(
  restaurantId: string,
  action: "approve" | "reject" | "delete" | "hide" | "suspend",
): Promise<{ message: string }> {
  return api.patch(`/admin/restaurants/${restaurantId}/moderate`, { action });
}

export function adminVerifyRestaurant(id: string): Promise<{ message: string }> {
  return adminModerateRestaurant(id, "approve"); // SPRINT-41: route via moderate
}

export function adminSuspendRestaurant(id: string): Promise<{ message: string }> {
  return adminModerateRestaurant(id, "suspend"); // SPRINT-41: route via moderate
}

// ─── Posts / Feed / Community (pageSize) ──────────────────────────────────────

/** // SPRINT-41: legacy posts path — pageSize */
export function adminGetPosts(params: { page?: number; pageSize?: number } = {}): Promise<AdminPaginatedResponse<unknown>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/posts${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

export function adminDeletePost(id: string): Promise<void> {
  return api.delete(`/admin/posts/${id}`);
}

export function adminFeaturePost(id: string): Promise<void> {
  return api.patch(`/admin/posts/${id}/feature`);
}

export function adminRemovePost(id: string): Promise<void> {
  return api.patch(`/admin/posts/${id}/remove`);
}

/** // SPRINT-41: GET /admin/feed — buildPageSizeQuery */
export function adminGetFeedPosts( // SPRINT-41:
  params: { page?: number; pageSize?: number; search?: string; category?: string; published?: boolean } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<unknown>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/feed${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-57: GET /admin/feed/trending is paginated — same { data, meta } envelope as /admin/feed */
export function adminGetTrendingPosts(
  params: { page?: number; pageSize?: number } = {},
): Promise<AdminPaginatedResponse<SharedTrendingPost>> {
  const qs = buildPageSizeQuery(params as Record<string, unknown>);
  return api.get<AdminPaginatedResponse<SharedTrendingPost>>(
    `/admin/feed/trending${qs ? `?${qs}` : ""}`,
  );
}

export function adminModerateFeedPost(
  postId: string,
  action: "approve" | "reject" | "delete" | "hide" | "suspend",
): Promise<{ message: string }> {
  return api.patch(`/admin/feed/${postId}/moderate`, { action });
}

/** // SPRINT-41: GET /admin/community/posts — buildPageSizeQuery */
export function adminGetCommunityPosts(params: { page?: number; pageSize?: number } = {}): Promise<AdminPaginatedResponse<unknown>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/community/posts${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

export function adminPinCommunityPost(id: string): Promise<void> {
  return api.patch(`/admin/community/posts/${id}/pin`);
}

export function adminRemoveCommunityPost(id: string): Promise<void> {
  return api.patch(`/admin/community/posts/${id}/remove`);
}

/** // SPRINT-41: GET /admin/roommates — buildPageSizeQuery */
export function adminGetRoommates( // SPRINT-41:
  params: { page?: number; pageSize?: number; search?: string } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<unknown>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/roommates${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

export function adminModerateRoommate(
  userId: string,
  action: "approve" | "reject" | "delete" | "hide" | "suspend",
): Promise<{ message: string }> {
  return api.patch(`/admin/roommates/${userId}/moderate`, { action });
}

/** // SPRINT-41: GET /admin/community/questions — buildPageSizeQuery */
export function adminGetCommunityQuestions( // SPRINT-41:
  params: { page?: number; pageSize?: number; search?: string; category?: string } = {}, // SPRINT-41:
) { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/community/questions${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: GET /admin/community/news — buildPageSizeQuery */
export function adminGetCommunityNews( // SPRINT-41:
  params: { page?: number; pageSize?: number; search?: string } = {}, // SPRINT-41:
) { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/community/news${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

export function adminDeleteCommunityQuestion(questionId: string) {
  return api.delete(`/admin/community/questions/${questionId}`);
}

/** // SPRINT-41: GET /admin/events — buildPageSizeQuery */
export function adminGetEvents(params: { page?: number; pageSize?: number } = {}): Promise<AdminPaginatedResponse<unknown>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/events${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

export function adminDeleteEvent(id: string): Promise<void> {
  return api.delete(`/admin/events/${id}`);
}

// ─── Polls (pageSize) ─────────────────────────────────────────────────────────

/** // SPRINT-41: GET /admin/polls — buildPageSizeQuery */
export function adminGetPolls( // SPRINT-41:
  params: { page?: number; pageSize?: number } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<AdminPoll>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get<AdminPaginatedResponse<AdminPoll>>(`/admin/polls${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: POST /admin/polls — question + options only */
export function adminCreatePoll(question: string, options: string[]): Promise<AdminPoll> { // SPRINT-41:
  return api.post<AdminPoll>("/admin/polls", { question, options }); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: PATCH /admin/polls/:id/toggle */
export function adminTogglePoll(pollId: string): Promise<AdminPoll> { // SPRINT-41:
  return api.patch<AdminPoll>(`/admin/polls/${pollId}/toggle`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: DELETE /admin/polls/:id */
export function adminDeletePoll(id: string): Promise<{ message: string }> { // SPRINT-41:
  return api.delete(`/admin/polls/${id}`); // SPRINT-41:
} // SPRINT-41:

// ─── Areas ────────────────────────────────────────────────────────────────────

export function adminGetAreas(): Promise<unknown> {
  return api.get("/admin/areas");
}

export function adminToggleArea(id: string): Promise<AreaNeighborhood> {
  return api.patch<AreaNeighborhood>(`/admin/areas/${id}/toggle`);
}

// ─── Trending (pageSize) ──────────────────────────────────────────────────────

/** // SPRINT-41: GET /admin/trending — buildPageSizeQuery */
export function adminGetTrendingItems( // SPRINT-41:
  params: { page?: number; pageSize?: number; type?: string } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<TrendingItem>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/trending${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

export function adminFeatureTrendingItem(id: string): Promise<void> {
  return api.patch(`/admin/trending/${id}/feature`);
}

export function adminFlagTrendingItem(id: string): Promise<void> {
  return api.patch(`/admin/trending/${id}/flag`);
}

// ─── Sessions (pageSize, max 100) ─────────────────────────────────────────────

/** // SPRINT-41: GET /admin/sessions — buildPageSizeQuery (pageSize max 100) */
export function adminGetSessions( // SPRINT-41:
  params: { page?: number; pageSize?: number; userId?: string } = {}, // SPRINT-41:
): Promise<AdminSessionsResponse> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>, { maxPageSize: 100 }); // SPRINT-41:
  return api.get<AdminSessionsResponse>(`/admin/sessions${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: DELETE /admin/sessions/session/:sessionId */
export function adminTerminateSession( // SPRINT-41:
  sessionId: string, // SPRINT-41:
): Promise<{ message: string; userId: string | null }> { // SPRINT-41:
  return api.delete(`/admin/sessions/session/${sessionId}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: DELETE /admin/sessions/user/:userId */
export function adminTerminateUserSessions( // SPRINT-41:
  userId: string, // SPRINT-41:
): Promise<{ terminatedCount: number; truncated: boolean }> { // SPRINT-41:
  return api.delete(`/admin/sessions/user/${userId}`); // SPRINT-41:
} // SPRINT-41:

/** @deprecated Use adminTerminateSession */
export function adminRevokeSession(id: string): Promise<{ message: string; userId: string | null }> { // SPRINT-41:
  return adminTerminateSession(id); // SPRINT-41:
} // SPRINT-41:

// ─── Reports (limit pagination) ───────────────────────────────────────────────

/** // SPRINT-41: GET /admin/reports — buildLimitQuery. targetType/status/targetId/reporterId filters are additive — omitted = all (unchanged prior behavior). */
export function adminGetReports( // SPRINT-41:
  params: {
    page?: number; // SPRINT-41:
    limit?: number; // SPRINT-41:
    targetType?: AdminReportTargetType;
    status?: ReportStatus;
    targetId?: string;
    reporterId?: string;
  } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<AdminListingReport>> { // SPRINT-41:
  const qs = buildLimitQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get<AdminPaginatedResponse<AdminListingReport>>(`/admin/reports${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: PATCH /admin/reports/:id/dismiss */
export function adminDismissReport(reportId: string): Promise<{ message: string }> { // SPRINT-41:
  return api.patch<{ message: string }>(`/admin/reports/${reportId}/dismiss`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: DELETE /admin/reports/:id/listing */
export function adminDeleteListingFromReport(reportId: string): Promise<{ message: string }> { // SPRINT-41:
  return api.delete<{ message: string }>(`/admin/reports/${reportId}/listing`); // SPRINT-41:
} // SPRINT-41:

/** Generic per-type moderation action for non-listing report targets (users, community content, Q&A, events, chat). */
export type AdminReportActionType =
  | "WARN_USER"
  | "SUSPEND_USER"
  | "REMOVE_CONTENT"
  | "PIN_CONTENT"
  | "REMOVE_MESSAGE"
  | "BAN_FROM_CHAT";

/** POST /admin/reports/:id/action — backend resolves the target from the report's targetType+targetId, performs the action, and marks the report RESOLVED. */
export function adminActionReport(
  reportId: string,
  action: AdminReportActionType,
  payload?: { reason?: string; durationDays?: number },
): Promise<{ message: string }> {
  return api.post(`/admin/reports/${reportId}/action`, { action, ...payload });
}

// ─── Badges (limit pagination) ────────────────────────────────────────────────

/** // SPRINT-41: GET /admin/badges/applications — pending-only queue; page+limit; NO status query */
export function adminGetBadgeApplications( // SPRINT-41:
  params: { page?: number; limit?: number } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<BadgeApplication>> { // SPRINT-41:
  const qs = buildLimitQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get<AdminPaginatedResponse<BadgeApplication>>( // SPRINT-41:
    `/admin/badges/applications${qs ? `?${qs}` : ""}`, // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: PATCH /admin/badges/applications/:id/approve */
export function adminApproveBadge( // SPRINT-41:
  id: string, // SPRINT-41:
  adminNotes?: string, // SPRINT-41:
): Promise<{ message: string }> { // SPRINT-41:
  return api.patch(`/admin/badges/applications/${id}/approve`, adminNotes !== undefined ? { adminNotes } : {}); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: PATCH /admin/badges/applications/:id/reject — adminNotes required */
export function adminRejectBadge( // SPRINT-41:
  id: string, // SPRINT-41:
  adminNotes: string, // SPRINT-41:
): Promise<{ message: string }> { // SPRINT-41:
  return api.patch(`/admin/badges/applications/${id}/reject`, { adminNotes }); // SPRINT-41:
} // SPRINT-41:

/**
 * // SPRINT-41: GET /badges/applications/:applicationId/documents/:documentId/url
 * // SPRINT-41: Returns { url: string, expiresIn: number } from badges.service.getDocumentUrl
 */
export function adminGetBadgeDocumentUrl( // SPRINT-41:
  applicationId: string, // SPRINT-41:
  documentId: string, // SPRINT-41:
): Promise<{ url: string; expiresIn: number }> { // SPRINT-41:
  return api.get<{ url: string; expiresIn: number }>( // SPRINT-41:
    `/badges/applications/${applicationId}/documents/${documentId}/url`, // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

// ─── Notifications (pageSize) ─────────────────────────────────────────────────

export function adminSendBroadcast(payload: BroadcastPayload): Promise<{ id: string }> {
  return api.post(`/admin/notifications/broadcast`, payload);
}

/** // SPRINT-41: GET /admin/notifications/broadcasts — buildPageSizeQuery */
export function adminGetBroadcastHistory( // SPRINT-41:
  params: { page?: number; pageSize?: number } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<SharedAdminNotification>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/notifications/broadcasts${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

export function adminDeleteBroadcast(id: string): Promise<void> {
  return api.delete(`/admin/notifications/${id}`);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/** // SPRINT-41: GET /admin/analytics */
export function adminGetAnalytics(): Promise<AdminAnalytics> { // SPRINT-41:
  return api.get<AdminAnalytics>("/admin/analytics"); // SPRINT-41:
} // SPRINT-41:

/**
 * // SPRINT-41: Time-series is deferred on backend — do not call from screens.
 * // SPRINT-41: Stub throws so misuse is obvious.
 */
export function adminGetTimeSeries(_period: "7d" | "30d" | "90d" | "1y"): Promise<AnalyticsTimeSeries> { // SPRINT-41:
  return Promise.reject( // SPRINT-41:
    new Error("SPRINT-41: adminGetTimeSeries is not implemented (analytics time-series deferred on backend)"), // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

export function adminGetAreaAnalytics(): Promise<{ city: string; users: number; listings: number; events: number }[]> {
  return api.get("/admin/analytics/area");
}

export function adminGetTrending(): Promise<{ posts: unknown[]; listings: unknown[]; events: unknown[] }> {
  return api.get("/admin/analytics/trending");
}

// ─── Support (pageSize) ───────────────────────────────────────────────────────

/** // SPRINT-41: GET /admin/support — buildPageSizeQuery */
export function adminGetSupportTickets( // SPRINT-41:
  params: { page?: number; pageSize?: number; status?: "OPEN" | "REPLIED" | "CLOSED" | string } = {}, // SPRINT-41:
): Promise<AdminPaginatedResponse<AdminSupportTicket>> { // SPRINT-41:
  const qs = buildPageSizeQuery(params as Record<string, unknown>); // SPRINT-41:
  return api.get(`/admin/support${qs ? `?${qs}` : ""}`); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: PATCH /admin/support/:id/reply */
export function adminReplyToTicket( // SPRINT-41:
  ticketId: string, // SPRINT-41:
  reply: string, // SPRINT-41:
  close?: boolean, // SPRINT-41:
): Promise<AdminSupportTicket> { // SPRINT-41:
  return api.patch(`/admin/support/${ticketId}/reply`, { reply, close }); // SPRINT-41:
} // SPRINT-41:

// ─── User Safety Case File ─────────────────────────────────────────────────────

export interface AdminWarningRecord {
  id: string;
  userId: string;
  message: string;
  issuedBy: { id: string; username: string };
  createdAt: string;
}

export interface AdminBanRecord {
  id: string;
  userId: string;
  action: "BAN" | "SUSPEND" | "RESTORE";
  reason: string | null;
  actedBy: { id: string; username: string };
  createdAt: string;
  expiresAt?: string | null; // null = indefinite
}

/** GET /admin/users/:id/warnings */
export function adminGetUserWarnings(
  userId: string,
  params: { page?: number; limit?: number } = {},
): Promise<AdminPaginatedResponse<AdminWarningRecord>> {
  const qs = buildLimitQuery(params as Record<string, unknown>);
  return api.get(`/admin/users/${userId}/warnings${qs ? `?${qs}` : ""}`);
}

/** GET /admin/users/:id/ban-history */
export function adminGetUserBanHistory(
  userId: string,
  params: { page?: number; limit?: number } = {},
): Promise<AdminPaginatedResponse<AdminBanRecord>> {
  const qs = buildLimitQuery(params as Record<string, unknown>);
  return api.get(`/admin/users/${userId}/ban-history${qs ? `?${qs}` : ""}`);
}

// ─── Admin Action Audit Log (limit pagination) ─────────────────────────────────

export interface AdminAuditLogEntry {
  id: string;
  adminId: string;
  admin: { id: string; username: string; fullName: string | null };
  action: string; // e.g. "USER_WARN", "USER_BAN", "LISTING_REJECT", "REPORT_DISMISS", "BADGE_APPROVE"
  targetType: string; // "USER" | "LISTING" | "REPORT" | "BADGE_APPLICATION" | ...
  targetId: string;
  reason: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

/** GET /admin/audit-log — read-only trail of every admin mutation, logged server-side. */
export function adminGetAuditLog(
  params: { page?: number; limit?: number; action?: string; targetType?: string; adminId?: string; search?: string } = {},
): Promise<AdminPaginatedResponse<AdminAuditLogEntry>> {
  const qs = buildLimitQuery(params as Record<string, unknown>);
  return api.get<AdminPaginatedResponse<AdminAuditLogEntry>>(`/admin/audit-log${qs ? `?${qs}` : ""}`);
}

// ─── Data Privacy / GDPR ────────────────────────────────────────────────────────

// The backend's PrivacyRequestType / PrivacyRequestStatus enums (prisma/schema.prisma).
export type PrivacyRequestType = "DATA_EXPORT" | "ERASURE";
export type PrivacyRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

export interface AdminPrivacyRequest {
  id: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  /** Null once the account is hard-deleted; the snapshot fields stay. */
  userId: string | null;
  snapshotUsername: string;
  snapshotEmail: string;
  reason: string | null;
  /** Set when an admin raised the request; null when the user did. */
  requestedByAdminId: string | null;
  /** Set for a DATA_EXPORT whose payload is stored (download through the admin-only export route). */
  exportFileKey: string | null;
  resolvedAt: string | null;
  resolvedByAdminId: string | null;
  createdAt: string;
}

/** GET /admin/privacy-requests */
export function adminGetPrivacyRequests(
  params: { page?: number; limit?: number; status?: PrivacyRequestStatus; type?: PrivacyRequestType } = {},
): Promise<AdminPaginatedResponse<AdminPrivacyRequest>> {
  const qs = buildLimitQuery(params as Record<string, unknown>);
  return api.get(`/admin/privacy-requests${qs ? `?${qs}` : ""}`);
}

/** PATCH /admin/privacy-requests/:id/approve */
export function adminApprovePrivacyRequest(id: string): Promise<{ message: string }> {
  return api.patch(`/admin/privacy-requests/${id}/approve`);
}

/** PATCH /admin/privacy-requests/:id/reject — reason required */
export function adminRejectPrivacyRequest(id: string, reason: string): Promise<{ message: string }> {
  return api.patch(`/admin/privacy-requests/${id}/reject`, { reason });
}

/** POST /admin/users/:id/data-export — admin-triggered export request, distinct from self-serve delete-account. */
export function adminRequestDataExport(userId: string): Promise<{ requestId: string; message: string }> {
  return api.post(`/admin/users/${userId}/data-export`);
}

/** POST /admin/users/:id/erasure-request — admin-triggered erasure request, reason required. */
export function adminRequestErasure(userId: string, reason: string): Promise<{ requestId: string; message: string }> {
  return api.post(`/admin/users/${userId}/erasure-request`, { reason });
}

// ─── Chat Moderation ─────────────────────────────────────────────────────────

export interface AdminChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender: { id: string; username: string; fullName: string | null };
  content: string;
  createdAt: string;
  isDeleted: boolean;
}

export interface AdminConversationSummary {
  id: string;
  participants: { id: string; username: string; fullName: string | null }[];
  createdAt: string;
  messageCount: number;
}

/** GET /admin/chat/conversations/:id — admin-scoped, bypasses the regular participant check. */
export function adminGetConversation(id: string): Promise<AdminConversationSummary> {
  return api.get(`/admin/chat/conversations/${id}`);
}

/** GET /admin/chat/conversations/:id/messages */
export function adminGetConversationMessages(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<AdminPaginatedResponse<AdminChatMessage>> {
  const qs = buildLimitQuery(params as Record<string, unknown>);
  return api.get(`/admin/chat/conversations/${id}/messages${qs ? `?${qs}` : ""}`);
}

/** DELETE /admin/chat/messages/:id — direct removal (also reachable via adminActionReport REMOVE_MESSAGE). */
export function adminDeleteChatMessage(id: string): Promise<{ message: string }> {
  return api.delete(`/admin/chat/messages/${id}`);
}

// ─── Stories Moderation (pageSize) ─────────────────────────────────────────────

export interface AdminStoryRow {
  id: string;
  authorId: string;
  author: { id: string; username: string; fullName: string | null };
  mediaUrl: string;
  caption?: string | null;
  viewCount: number;
  reportCount: number;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

/** GET /admin/stories — buildPageSizeQuery, mirrors adminGetRestaurants shape. */
export function adminGetStories(
  params: { page?: number; pageSize?: number; search?: string; status?: "active" | "reported" | "expired" } = {},
): Promise<AdminPaginatedResponse<AdminStoryRow>> {
  const qs = buildPageSizeQuery(params as Record<string, unknown>);
  return api.get(`/admin/stories${qs ? `?${qs}` : ""}`);
}

/** DELETE /admin/stories/:id */
export function adminDeleteStory(id: string): Promise<{ message: string }> {
  return api.delete(`/admin/stories/${id}`);
}
