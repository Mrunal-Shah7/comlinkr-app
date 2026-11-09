// src/features/admin/hooks/useAdmin.ts

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminQueryFn } from '../api/adminQuery';
import type {
  AdminActionVerb,
  AdminNotification,
  AdminPost,
  NotificationAudience,
  NotificationPriority,
  TrendingPost,
  UserProfile,
} from '@shared/types/api';
import { ApiError } from '../../../api/client';
import {
  adminActionReport,
  adminApproveBadge,
  adminApproveListing,
  adminApprovePrivacyRequest,
  adminCreatePoll,
  adminDeleteChatMessage,
  adminDeleteCommunityQuestion,
  adminDeleteListingFromReport,
  adminDeletePoll,
  adminDeleteStory,
  adminDeleteUser,
  adminDismissReport,
  adminGetAnalytics,
  adminGetAreas,
  adminGetAuditLog,
  adminGetBadgeApplications,
  adminGetBroadcastHistory,
  adminGetCommunityQuestions,
  adminGetConversation,
  adminGetConversationMessages,
  adminGetFeedPosts,
  adminGetListings,
  adminGetPolls,
  adminGetPrivacyRequests,
  adminGetReports,
  adminGetRestaurants,
  adminGetRoommates,
  adminGetSessions,
  adminGetStories,
  adminGetSupportTickets,
  adminGetTrendingPosts,
  adminGetUser,
  adminGetUserBanHistory,
  adminGetUsers,
  adminGetUserWarnings,
  adminGrantBadge,
  adminModerateFeedPost,
  adminModerateListing,
  adminModerateRoommate,
  adminModerateRestaurant,
  adminPinCommunityPost,
  adminRejectBadge,
  adminRejectListing,
  adminRejectPrivacyRequest,
  adminReplyToTicket,
  adminRequestDataExport,
  adminRequestErasure,
  adminRevokeBadge,
  adminSendBroadcast,
  type BroadcastPayload, // SPRINT-57
  adminTerminateSession,
  adminTerminateUserSessions,
  adminToggleArea,
  adminTogglePoll,
  adminUpdateUser,
  adminWarnUser,
  type AdminAnalytics,
  type AdminApiRole,
  type AdminHousingListingRow,
  type AdminPaginatedResponse,
  type AdminPoll,
  type AdminReportActionType,
  type AdminReportTargetType,
  type AdminSessionItem, // SPRINT-41:
  type AdminSessionsResponse,
  type AdminSupportTicket,
  type AdminUser,
  type AnalyticsTimeSeries, // SPRINT-41:
  type CreatePollPayload,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
  type ReportStatus,
} from '../../../api/admin.api';
import type { BadgeApplication } from '../../../api/badges.api';
import { getQuestion } from '../../../api/community-qa.api'; // SPRINT-42: full question + answers for Community detail modal
import { handleAdminApiError } from '../api/handleAdminError';
import { mapAdminHousingListingToScreen } from '../api/mapAdminListing';
import { useAdminListState } from '../api/useAdminListState';
import type {
  CommunityPost,
  FeedPost,
  FoodListing,
  RoommateProfile,
} from '../mock/adminMockData';

// ─── Re-exports (SPRINT-41) ───────────────────────────────────────────────────

export type { AdminPoll }; // SPRINT-41:
export type { CreatePollPayload }; // SPRINT-41:

// SPRINT-41: Support ticket view for screens — no category/priority (not on backend)
export type AdminSupportTicketView = { // SPRINT-41:
  id: string; // SPRINT-41:
  userName: string; // SPRINT-41:
  email: string; // SPRINT-41:
  subject: string; // SPRINT-41:
  message: string; // SPRINT-41:
  status: 'open' | 'replied' | 'closed'; // SPRINT-41:
  createdAt: string; // SPRINT-41:
  adminResponse?: string; // SPRINT-41:
}; // SPRINT-41:

export type AdminUserActionVars = { // SPRINT-41:
  userId: string; // SPRINT-41:
  action: { action: AdminActionVerb }; // SPRINT-41: only the verb is read here; userId is passed separately, so targetId/targetType from the generic AdminAction shape don't apply

  warnMessage?: string; // SPRINT-41:
  grantBadgeType?: string; // SPRINT-41:
  revokeBadgeType?: string; // SPRINT-41:
  role?: AdminApiRole; // SPRINT-41:
}; // SPRINT-41:

type ListUser = UserProfile & { badges?: string[] }; // SPRINT-41:

type MutationOpts<TResult> = { // SPRINT-41:
  onSuccess?: (result: TResult) => void; // SPRINT-41:
  onError?: (err?: unknown) => void; // SPRINT-41:
}; // SPRINT-41:

// ─── Infrastructure ───────────────────────────────────────────────────────────

export interface AsyncDataState<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
}

/**
 * One admin value through React Query (TR-013, point 3), cached under ['admin', key, ...deps]. Same return shape
 * as the hand-written hook it replaces, so the screens did not change.
 */
export function useAsyncData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  enabled = true,
): AsyncDataState<T> {
  const query = useQuery({
    queryKey: ['admin', key, ...deps],
    queryFn: () => adminQueryFn(fetchFn),
    enabled,
  });
  const { refetch } = query;
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    isRefetching: query.isRefetching,
    isError: query.isError,
    errorMessage: query.error ? query.error.message : null,
    refetch: useCallback(() => void refetch(), [refetch]),
  };
}

/**
 * Admin mutation: mutate(arg, { onSuccess, onError }) resolves to the result, or undefined on failure.
 * A success invalidates every ['admin'] query, so lists and counts show the change without a manual refresh.
 */
export function useMutation<TArg, TResult = void>(
  fn: (arg: TArg) => Promise<TResult>,
) {
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (arg: TArg, opts?: MutationOpts<TResult>): Promise<TResult | undefined> => {
      setIsPending(true);
      try {
        const result = await fn(arg);
        void qc.invalidateQueries({ queryKey: ['admin'] });
        opts?.onSuccess?.(result);
        return result;
      } catch (err) {
        handleAdminApiError(err); // a 403 leaves the admin area even if the caller shows no alert
        opts?.onError?.(err);
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [fn, qc],
  );

  return { mutate, isPending };
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapAdminUserToListUser(u: AdminUser): ListUser { // SPRINT-41:
  const fullName = u.fullName ?? u.name ?? ''; // SPRINT-41:
  const parts = fullName.trim().split(/\s+/).filter(Boolean); // SPRINT-41:
  const roleRaw = String(u.role).toUpperCase(); // SPRINT-41:
  const role = roleRaw === 'ADMIN' ? 'ADMIN' : 'USER'; // SPRINT-41:
  return { // SPRINT-41:
    id: u.id, // SPRINT-41:
    email: u.email, // SPRINT-41:
    username: u.username, // SPRINT-41:
    firstName: parts[0] ?? u.username, // SPRINT-41:
    lastName: parts.slice(1).join(' ') || '', // SPRINT-41:
    role, // SPRINT-41:
    isVerified: Boolean(u.badges?.length), // SPRINT-41:
    isActive: u.isActive !== false && !u.deletedAt, // SPRINT-41:
    city: u.city ?? u.location?.city ?? undefined, // SPRINT-41:
    country: u.country ?? u.location?.country ?? undefined, // SPRINT-41:
    avatar: u.avatarUrl ?? undefined, // SPRINT-41:
    createdAt: u.createdAt, // SPRINT-41:
    updatedAt: u.createdAt, // SPRINT-41:
    badges: u.badges ?? [], // SPRINT-41:
  }; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: OPEN→open, REPLIED→replied, CLOSED→closed — no category/priority hardcodes */
export function mapApiSupportRowToTicket(row: AdminSupportTicket): AdminSupportTicketView { // SPRINT-41:
  const statusMap = { OPEN: 'open', REPLIED: 'replied', CLOSED: 'closed' } as const; // SPRINT-41:
  return { // SPRINT-41:
    id: row.id, // SPRINT-41:
    userName: row.user.fullName || row.user.username, // SPRINT-41:
    email: row.user.email, // SPRINT-41:
    subject: row.subject, // SPRINT-41:
    message: row.message, // SPRINT-41:
    status: statusMap[row.status], // SPRINT-41:
    createdAt: row.createdAt, // SPRINT-41:
    adminResponse: row.adminReply ?? undefined, // SPRINT-41:
  }; // SPRINT-41:
} // SPRINT-41:

function normalizeFeedType(category: unknown): FeedPost['type'] { // SPRINT-41:
  const key = String(category ?? 'COMMUNITY').toUpperCase(); // SPRINT-41:
  const map: Record<string, FeedPost['type']> = { // SPRINT-41:
    ANNOUNCEMENT: 'news', // SPRINT-41:
    COMMUNITY: 'news', // SPRINT-41:
    JOBS: 'news', // SPRINT-41:
    ALERT: 'news', // SPRINT-41:
    DISCUSSION: 'news', // SPRINT-41:
    QUESTION: 'poll', // SPRINT-41:
    TIP: 'story', // SPRINT-41:
    EVENT: 'event', // SPRINT-41:
    CHALLENGE: 'challenge', // SPRINT-41:
    STORY: 'story', // SPRINT-41:
    POLL: 'poll', // SPRINT-41:
    NEWS: 'news', // SPRINT-41:
  }; // SPRINT-41:
  return map[key] ?? 'news'; // SPRINT-41:
} // SPRINT-41:

function normalizeAdminPostType(category: unknown): AdminPost['type'] { // SPRINT-41:
  const key = String(category ?? 'COMMUNITY').toUpperCase(); // SPRINT-41:
  const map: Record<string, AdminPost['type']> = { // SPRINT-41:
    ANNOUNCEMENT: 'news', // SPRINT-41:
    COMMUNITY: 'community', // SPRINT-41:
    JOBS: 'news', // SPRINT-41:
    ALERT: 'news', // SPRINT-41:
    DISCUSSION: 'community', // SPRINT-41:
    QUESTION: 'community', // SPRINT-41:
    TIP: 'story', // SPRINT-41:
    EVENT: 'event', // SPRINT-41:
    CHALLENGE: 'challenge', // SPRINT-41:
    STORY: 'story', // SPRINT-41:
    NEWS: 'news', // SPRINT-41:
  }; // SPRINT-41:
  return map[key] ?? 'news'; // SPRINT-41:
} // SPRINT-41:

function mapApiRowToFeedPost(row: Record<string, unknown>): FeedPost { // SPRINT-41:
  const author = row.author as { id?: string; username?: string; fullName?: string | null } | undefined; // SPRINT-41:
  const createdAt = String(row.createdAt ?? new Date().toISOString()); // SPRINT-41:
  return { // SPRINT-41:
    id: String(row.id), // SPRINT-41:
    title: String(row.title ?? ''), // SPRINT-41:
    author: author?.fullName || author?.username || 'Unknown', // SPRINT-41:
    authorId: author?.id ?? String(row.authorId ?? ''), // SPRINT-41:
    type: normalizeFeedType(row.category), // SPRINT-41:
    status: row.isPublished === true ? 'published' : 'pending', // SPRINT-41:
    date: new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), // SPRINT-41:
    likes: Number(row.likesCount ?? 0), // SPRINT-41:
    comments: Number(row.commentsCount ?? 0), // SPRINT-41:
    views: Number(row.viewsCount ?? 0), // SPRINT-57: real unique-viewer count from the backend
    reports: Number(row.reportCount ?? 0), // SPRINT-57: real ListingReport aggregate
    featured: Boolean(row.isFeatured ?? false), // SPRINT-41:
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [], // SPRINT-41:
    content: row.content != null ? String(row.content) : undefined, // SPRINT-42: full body for detail modal
    createdAt, // SPRINT-42:
  }; // SPRINT-41:
} // SPRINT-41:

function mapApiRowToAdminPost(row: Record<string, unknown>): AdminPost { // SPRINT-41:
  const author = row.author as { id?: string; username?: string; fullName?: string | null } | undefined; // SPRINT-41:
  const createdAt = String(row.createdAt ?? new Date().toISOString()); // SPRINT-41:
  return { // SPRINT-41:
    id: String(row.id), // SPRINT-41:
    title: String(row.title ?? ''), // SPRINT-41:
    type: normalizeAdminPostType(row.category), // SPRINT-41:
    content: String(row.content ?? ''), // SPRINT-41:
    author: author?.fullName || author?.username || 'Unknown', // SPRINT-41:
    authorId: author?.id ?? String(row.authorId ?? ''), // SPRINT-41:
    status: row.isPublished === true ? 'active' : 'pending', // SPRINT-41:
    views: Number(row.viewsCount ?? 0), // SPRINT-57: real unique-viewer count from the backend
    likes: Number(row.likesCount ?? 0), // SPRINT-41:
    reportCount: Number(row.reportCount ?? 0), // SPRINT-57: real ListingReport aggregate
    createdAt, // SPRINT-41:
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [], // SPRINT-41:
  }; // SPRINT-41:
} // SPRINT-41:

function mapApiRowToTrendingPost(row: Record<string, unknown>): TrendingPost { // SPRINT-41:
  const author = row.author as { id?: string; username?: string; fullName?: string | null } | undefined; // SPRINT-41:
  const likes = Number(row.likesCount ?? 0); // SPRINT-41:
  const comments = Number(row.commentsCount ?? 0); // SPRINT-41:
  const views = Number(row.viewsCount ?? 0); // SPRINT-57: real unique-viewer count from the backend
  const engagementScore = Math.min(100, likes + comments * 2); // SPRINT-41:
  return { // SPRINT-41:
    id: String(row.id), // SPRINT-41:
    title: String(row.title ?? ''), // SPRINT-41:
    type: normalizeAdminPostType(row.category), // SPRINT-41:
    author: author?.fullName || author?.username || 'Unknown', // SPRINT-41:
    authorId: author?.id ?? String(row.authorId ?? ''), // SPRINT-41:
    views, // SPRINT-41:
    likes, // SPRINT-41:
    comments, // SPRINT-41:
    shares: 0, // SPRINT-41:
    engagementScore, // SPRINT-41:
    reportCount: Number(row.reportCount ?? 0), // SPRINT-57: real ListingReport aggregate
    status: row.isPublished === false ? 'flagged' : 'active', // SPRINT-41:
    createdAt: String(row.createdAt ?? new Date().toISOString()), // SPRINT-41:
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [], // SPRINT-41:
  }; // SPRINT-41:
} // SPRINT-41:

function mapApiRowToCommunityPost(row: Record<string, unknown>): CommunityPost { // SPRINT-41:
  const author = row.author as { id?: string; username?: string; fullName?: string | null } | undefined; // SPRINT-41:
  const cat = String(row.category ?? 'DISCUSSION').toLowerCase(); // SPRINT-41:
  const categoryMap: Record<string, CommunityPost['category']> = { // SPRINT-41:
    question: 'question', // SPRINT-41:
    discussion: 'discussion', // SPRINT-41:
    tip: 'tip', // SPRINT-41:
    announcement: 'announcement', // SPRINT-41:
  }; // SPRINT-41:
  const count = row._count as { answers?: number } | undefined; // SPRINT-41:
  return { // SPRINT-41:
    id: String(row.id), // SPRINT-41:
    title: String(row.title ?? ''), // SPRINT-41:
    author: author?.fullName || author?.username || 'Unknown', // SPRINT-41:
    authorId: author?.id ?? String(row.authorId ?? ''), // SPRINT-41:
    category: categoryMap[cat] ?? 'discussion', // SPRINT-41:
    status: 'published', // SPRINT-41:
    date: new Date(String(row.createdAt ?? '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), // SPRINT-41:
    upvotes: Number(row.upvoteCount ?? 0), // SPRINT-41:
    answers: Math.max(Number(row.answerCount ?? 0), Number(count?.answers ?? 0)), // DEV-01: relation count wins over a stale stored count
    views: 0, // SPRINT-41:
    reports: 0, // SPRINT-41:
    pinned: false, // SPRINT-41:
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [], // SPRINT-41:
    content: (row.content ?? row.body ?? row.question) != null ? String(row.content ?? row.body ?? row.question) : undefined, // SPRINT-42: full body for detail modal
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined, // SPRINT-42:
  }; // SPRINT-41:
} // SPRINT-41:

function mapApiRowToRoommateProfile(row: Record<string, unknown>): RoommateProfile { // SPRINT-41:
  const user = row.user as Record<string, unknown> | undefined; // SPRINT-41:
  const location = user?.location as Record<string, unknown> | undefined; // SPRINT-41:
  const fullName = String(user?.fullName ?? user?.username ?? 'Unknown'); // SPRINT-41:
  const budgetMin = row.budgetMin as number | null | undefined; // SPRINT-41:
  const budgetMax = row.budgetMax as number | null | undefined; // SPRINT-41:
  let budget = '—'; // SPRINT-41:
  if (budgetMin != null && budgetMax != null) budget = `$${budgetMin}-$${budgetMax}/mo`; // SPRINT-41:
  else if (budgetMin != null) budget = `$${budgetMin}/mo`; // SPRINT-41:
  else if (budgetMax != null) budget = `$${budgetMax}/mo`; // SPRINT-41:
  const isActive = user?.isActive !== false; // SPRINT-41:
  const isLooking = row.isLooking === true; // SPRINT-41:
  let status: RoommateProfile['status'] = 'active'; // SPRINT-41:
  if (!isActive) status = 'suspended'; // SPRINT-41:
  else if (!isLooking) status = 'pending'; // SPRINT-41:
  return { // SPRINT-41:
    id: String(user?.id ?? row.userId ?? row.id), // SPRINT-41:
    name: fullName, // SPRINT-41:
    age: Number(row.age ?? 0), // SPRINT-57: derived server-side from User.dateOfBirth (0 when unknown)
    occupation: String(row.aboutMe ?? '—').slice(0, 48) || '—', // SPRINT-41:
    budget, // SPRINT-41:
    location: [location?.city, location?.state].filter(Boolean).join(', ') || String(location?.city ?? '—'), // SPRINT-41:
    moveInDate: row.moveInDate // SPRINT-41:
      ? new Date(String(row.moveInDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) // SPRINT-41:
      : '—', // SPRINT-41:
    status, // SPRINT-41:
    verified: row.verified === true, // SPRINT-57: holds at least one approved badge
    gender: '—', // SPRINT-41: not on backend
    genderPref: 'Any', // SPRINT-41:
    lookingFor: 'roommate', // SPRINT-41:
    submittedDate: user?.createdAt // SPRINT-41:
      ? new Date(String(user.createdAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) // SPRINT-41:
      : '—', // SPRINT-41:
    views: 0, // SPRINT-41: no per-profile view tracking on the backend
    matches: Number(row.matchCount ?? 0), // SPRINT-57: mutual roommate saves
    reports: Number(row.reportCount ?? 0), // SPRINT-57: real ListingReport aggregate
    bio: row.aboutMe != null ? String(row.aboutMe) : undefined, // SPRINT-42: full untruncated bio for detail modal
    avatarUrl: (user?.avatarUrl as string | undefined) ?? undefined, // SPRINT-42:
    preferences: (row.preferences as RoommateProfile['preferences']) ?? null, // SPRINT-42:
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : undefined, // SPRINT-42:
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : undefined, // SPRINT-42:
    username: (user?.username as string | undefined) ?? undefined, // SPRINT-42:
  }; // SPRINT-41:
} // SPRINT-41:

function mapApiRowToFoodListing(row: Record<string, unknown>): FoodListing { // SPRINT-41:
  const priceRange = String(row.priceRange ?? 'MODERATE'); // SPRINT-41:
  const priceMap: Record<string, string> = { BUDGET: '$', MODERATE: '$$', PREMIUM: '$$$', LUXURY: '$$$$' }; // SPRINT-41:
  const isVerified = row.isVerified === true; // SPRINT-41:
  const count = row._count as { reviews?: number } | undefined; // SPRINT-41:
  let status: FoodListing['status'] = isVerified ? 'active' : 'pending'; // SPRINT-41:
  if (row.isActive === false) status = 'suspended'; // SPRINT-41:
  return { // SPRINT-41:
    id: String(row.id), // SPRINT-41:
    name: String(row.name ?? ''), // SPRINT-41:
    cuisine: String(row.cuisine ?? ''), // SPRINT-41:
    rating: Number(row.averageRating ?? 0), // SPRINT-41:
    reviews: Number(row.totalReviews ?? count?.reviews ?? 0), // SPRINT-41:
    price: priceMap[priceRange] ?? '$$', // SPRINT-41:
    verified: isVerified, // SPRINT-41:
    openNow: row.isOpen === true, // SPRINT-41:
    status, // SPRINT-41:
    reports: 0, // SPRINT-41:
    services: Array.isArray(row.availableServices) ? (row.availableServices as string[]) : [], // SPRINT-41:
    description: row.description != null ? String(row.description) : undefined, // SPRINT-42: full restaurant profile for detail modal
    address: row.address != null ? String(row.address) : undefined, // SPRINT-42:
    phone: (row.phone ?? row.phoneNumber) != null ? String(row.phone ?? row.phoneNumber) : undefined, // SPRINT-42:
    website: row.website != null ? String(row.website) : undefined, // SPRINT-42:
    images: Array.isArray(row.images) ? (row.images as string[]) : undefined, // SPRINT-42:
  }; // SPRINT-41:
} // SPRINT-41:

// SPRINT-57: the backend uses Prisma's uppercase enums; the UI colour maps are keyed
// lowercase, so unknown values fall back rather than silently missing the lookup.
const BROADCAST_AUDIENCE_MAP: Record<string, NotificationAudience> = { // SPRINT-57:
  ALL: 'all', CITY: 'all', SELECTIVE: 'specific', // SPRINT-57:
}; // SPRINT-57:

function mapBroadcastToNotification(row: Record<string, unknown>): AdminNotification { // SPRINT-41:
  const priority = String(row.priority ?? 'NORMAL').toLowerCase(); // SPRINT-57:
  const status = String(row.status ?? 'SENT').toLowerCase(); // SPRINT-57:
  const sentBy = row.sentBy as { id?: string; fullName?: string | null; username?: string } | undefined; // SPRINT-57:
  return { // SPRINT-41:
    id: String(row.id), // SPRINT-41:
    title: String(row.title ?? ''), // SPRINT-41:
    body: String(row.body ?? row.message ?? ''), // SPRINT-41:
    audience: BROADCAST_AUDIENCE_MAP[String(row.audienceType ?? '')] ?? 'all', // SPRINT-57:
    priority: (['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal') as NotificationPriority, // SPRINT-57:
    status: (['draft', 'scheduled', 'sent', 'failed'].includes(status) ? status : 'sent') as AdminNotification['status'], // SPRINT-57:
    sentAt: row.sentAt ? String(row.sentAt) : undefined, // SPRINT-57: absent until actually dispatched
    scheduledFor: row.scheduledFor ? String(row.scheduledFor) : undefined, // SPRINT-57:
    recipientCount: row.recipientCount == null ? undefined : Number(row.recipientCount), // SPRINT-57:
    openRate: row.openRate == null ? undefined : Number(row.openRate), // SPRINT-57:
    createdBy: String(sentBy?.fullName ?? sentBy?.username ?? row.sentById ?? 'admin'), // SPRINT-57:
    createdAt: String(row.createdAt ?? new Date().toISOString()), // SPRINT-41:
  }; // SPRINT-41:
} // SPRINT-41:

// ─── Stats / Analytics ────────────────────────────────────────────────────────

/** // SPRINT-41: Raw AdminAnalytics from adminGetAnalytics — no mockApiResponse fabrications */
export function useAdminStats() { // SPRINT-41:
  return useAsyncData<AdminAnalytics>('useAdminStats', () => adminGetAnalytics(), []); // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Time-series deferred — hook removed from screens; throws if called */
export function useAdminAnalytics(_period: '7d' | '30d' | '90d' | '1y' = '30d') { // SPRINT-41:
  return useAsyncData<AnalyticsTimeSeries>('useAdminAnalytics', async () => { // SPRINT-41:
    throw new Error('Admin analytics time-series is not available (deferred).'); // SPRINT-41:
  }, [_period]); // SPRINT-41:
} // SPRINT-41:

// ─── Users ────────────────────────────────────────────────────────────────────

type AdminUsersParams = { // SPRINT-41:
  limit?: number; // SPRINT-41:
  search?: string; // SPRINT-41:
  role?: AdminApiRole; // SPRINT-41:
  isActive?: boolean; // SPRINT-41:
}; // SPRINT-41:

export function useAdminUsers(initialParams?: AdminUsersParams) { // SPRINT-41:
  return useAdminListState<ListUser, AdminUsersParams>({ key: 'useAdminUsers', // SPRINT-41:
    initialParams: { limit: 20, ...initialParams }, // SPRINT-41:
    fetchPage: async ({ page, limit, search, role, isActive }) => { // SPRINT-41:
      const res = await adminGetUsers({ page, limit, search, role, isActive }); // SPRINT-41:
      return { data: res.data.map(mapAdminUserToListUser), meta: res.meta }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useAdminUserDetail(id: string | null) { // SPRINT-41:
  return useAsyncData<AdminUser | null>('useAdminUserDetail', // SPRINT-41:
    async () => (id ? adminGetUser(id) : null), // SPRINT-41:
    [id], // SPRINT-41:
    Boolean(id), // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

export function useAdminUserAction() { // SPRINT-41:
  return useMutation(async (vars: AdminUserActionVars) => { // SPRINT-41:
    const { userId, action, warnMessage, grantBadgeType, revokeBadgeType, role } = vars; // SPRINT-41:
    const verb = action.action; // SPRINT-41:
    if (role !== undefined) { // SPRINT-41:
      return adminUpdateUser(userId, { role }); // SPRINT-41:
    } // SPRINT-41:
    switch (verb) { // SPRINT-41:
      case 'delete': // SPRINT-41:
        return adminDeleteUser(userId); // SPRINT-41:
      case 'suspend': // SPRINT-41:
      case 'ban': // SPRINT-41:
        return adminUpdateUser(userId, { isActive: false }); // SPRINT-41:
      case 'restore': // SPRINT-41:
        return adminUpdateUser(userId, { isActive: true }); // SPRINT-41:
      case 'warn': // SPRINT-41:
        return adminWarnUser(userId, warnMessage ?? 'Warning from admin'); // SPRINT-41:
      case 'grant_badge': // SPRINT-41:
        return adminGrantBadge(userId, grantBadgeType ?? 'LANDLORD'); // SPRINT-41:
      case 'revoke_badge': // SPRINT-41:
        return adminRevokeBadge(userId, revokeBadgeType ?? 'LANDLORD'); // SPRINT-41:
      default: // SPRINT-41:
        throw new Error(`Unsupported admin user action: ${verb}`); // SPRINT-41:
    } // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

// ─── Listings ─────────────────────────────────────────────────────────────────

type AdminListingsParams = { // SPRINT-41:
  pageSize?: number; // SPRINT-41:
  search?: string; // SPRINT-41:
  status?: string; // SPRINT-41:
  propertyType?: string; // SPRINT-41:
}; // SPRINT-41:

export function useAdminListings(initialParams?: AdminListingsParams) { // SPRINT-41:
  return useAdminListState({ key: 'useAdminListings', // SPRINT-41:
    initialParams: { pageSize: 20, ...initialParams }, // SPRINT-41:
    fetchPage: async ({ page, pageSize, search, status, propertyType }) => { // SPRINT-41:
      const res = await adminGetListings({ page, pageSize, search, status, propertyType }); // SPRINT-41:
      return { // SPRINT-41:
        data: res.data.map((row: AdminHousingListingRow) => mapAdminHousingListingToScreen(row)), // SPRINT-41:
        meta: res.meta, // SPRINT-41:
      }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useApproveListingMutation() { // SPRINT-41:
  return useMutation((listingId: string) => adminApproveListing(listingId)); // SPRINT-41:
} // SPRINT-41:

export function useRejectListingMutation() { // SPRINT-41:
  return useMutation(({ listingId, reason }: { listingId: string; reason?: string }) => // SPRINT-41:
    adminRejectListing(listingId, reason)); // SPRINT-41:
} // SPRINT-41:

export function useModerateListingMutation() { // SPRINT-41:
  return useMutation( // SPRINT-41:
    ({ listingId, action }: { listingId: string; action: 'approve' | 'reject' | 'delete' | 'hide' | 'suspend' }) => // SPRINT-41:
      adminModerateListing(listingId, action), // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

// ─── Reports ──────────────────────────────────────────────────────────────────

export function useAdminReports(params?: { targetType?: AdminReportTargetType; status?: ReportStatus; targetId?: string; reporterId?: string }) { // SPRINT-41:
  return useAdminListState({ key: 'useAdminReports', // SPRINT-41:
    initialParams: { limit: 20, ...params }, // SPRINT-41:
    fetchPage: async ({ page, limit, targetType, status, targetId, reporterId }) => { // SPRINT-41:
      const res = await adminGetReports({ page, limit, targetType, status, targetId, reporterId }); // SPRINT-41:
      return { data: res.data, meta: res.meta }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useDismissReportMutation() { // SPRINT-41:
  return useMutation(({ reportId }: { reportId: string }) => adminDismissReport(reportId)); // SPRINT-41:
} // SPRINT-41:

export function useDeleteListingFromReportMutation() { // SPRINT-41:
  return useMutation(({ reportId }: { reportId: string }) => adminDeleteListingFromReport(reportId)); // SPRINT-41:
} // SPRINT-41:

export function useReportActionMutation() {
  return useMutation(
    ({ reportId, action, reason, durationDays }:
      { reportId: string; action: AdminReportActionType; reason?: string; durationDays?: number }) =>
      adminActionReport(reportId, action, { reason, durationDays }),
  );
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function useAdminNotifications() { // SPRINT-41:
  return useAsyncData('useAdminNotifications', async () => { // SPRINT-41:
    const res = await adminGetBroadcastHistory({ page: 1, pageSize: 50 }); // SPRINT-41:
    return { // SPRINT-41:
      data: res.data.map((row) => // SPRINT-41:
        mapBroadcastToNotification(row as unknown as Record<string, unknown>), // SPRINT-41:
      ), // SPRINT-41:
    }; // SPRINT-41:
  }, []); // SPRINT-41:
} // SPRINT-41:

export function useBroadcastHistory() { // SPRINT-41:
  return useAdminNotifications(); // SPRINT-41:
} // SPRINT-41:

type SendNotificationVars = { // SPRINT-41:
  title: string; // SPRINT-41:
  body: string; // SPRINT-41:
  audience: NotificationAudience; // SPRINT-41:
  priority?: NotificationPriority; // SPRINT-57: persisted server-side again; optional until the compose selector returns
  scheduledFor?: string; // SPRINT-57: ISO timestamp; a future value defers dispatch to the cron
}; // SPRINT-41:

export function useSendNotificationMutation() { // SPRINT-41:
  return useMutation(({ title, body, audience, priority, scheduledFor }: SendNotificationVars) => { // SPRINT-57:
    const audienceType = audience === 'specific' ? 'SELECTIVE' : 'ALL'; // SPRINT-41:
    return adminSendBroadcast({ // SPRINT-57: priority is persisted server-side now
      title, body, audienceType, // SPRINT-57:
      priority: (priority ?? 'normal').toUpperCase() as NonNullable<BroadcastPayload['priority']>, // SPRINT-57:
      ...(scheduledFor ? { scheduledFor } : {}), // SPRINT-57:
    }); // SPRINT-57:
  }); // SPRINT-41:
} // SPRINT-41:

export function useSendBroadcastMutation() { // SPRINT-41:
  return useSendNotificationMutation(); // SPRINT-41:
} // SPRINT-41:

// ─── Badges ───────────────────────────────────────────────────────────────────

export function useAdminBadgeApplications() { // SPRINT-41:
  return useAdminListState<BadgeApplication, { limit?: number }>({ key: 'useAdminBadgeApplications', // SPRINT-41:
    initialParams: { limit: 50 }, // SPRINT-41:
    fetchPage: async ({ page, limit }) => { // SPRINT-41:
      const res = await adminGetBadgeApplications({ page, limit }); // SPRINT-41:
      return { data: res.data, meta: res.meta }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useApproveBadgeMutation() { // SPRINT-41:
  return useMutation( // SPRINT-41:
    ({ applicationId, adminNotes }: { applicationId: string; userId?: string; badgeType?: string; adminNotes?: string }) => // SPRINT-41:
      adminApproveBadge(applicationId, adminNotes), // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

export function useRejectBadgeMutation() { // SPRINT-41:
  return useMutation(({ applicationId, reason }: { applicationId: string; reason: string }) => // SPRINT-41:
    adminRejectBadge(applicationId, reason)); // SPRINT-41:
} // SPRINT-41:

// ─── Polls ────────────────────────────────────────────────────────────────────

export function useAdminPolls(params: { page: number; pageSize: number }) { // SPRINT-41:
  return useAsyncData('useAdminPolls', // SPRINT-41:
    () => adminGetPolls(params), // SPRINT-41: raw AdminPoll[] — no legacy Poll mapping
    [params.page, params.pageSize], // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

export function useCreatePollMutation() { // SPRINT-41:
  return useMutation((payload: CreatePollPayload) => // SPRINT-41:
    adminCreatePoll(payload.question, payload.options)); // SPRINT-41:
} // SPRINT-41:

export function useTogglePollMutation() { // SPRINT-41:
  return useMutation((pollId: string) => adminTogglePoll(pollId)); // SPRINT-41:
} // SPRINT-41:

export function useClosePollMutation() { // SPRINT-41:
  return useTogglePollMutation(); // SPRINT-41: close = toggle isActive
} // SPRINT-41:

export function useDeletePollMutation() { // SPRINT-41:
  return useMutation((pollId: string) => adminDeletePoll(pollId)); // SPRINT-41:
} // SPRINT-41:

// ─── Posts / Feed ─────────────────────────────────────────────────────────────

// NOTE: adminGetTrendingPosts hits GET /admin/feed/trending, which returns a flat
// SharedTrendingPost[] with no page/meta/hasMore envelope (unlike the sibling
// /admin/feed and /admin/trending routes). Since there is no real pagination
// contract to drive loadMore/meta without fabricating one, this hook is kept on
// useAsyncData rather than useAdminListState. To avoid silent truncation at the
// old 50-item cap, the limit is raised to 200 (matches other admin list ceilings)
// so admins see effectively the full trending set instead of losing older items
// with no indication. If the backend adds page/pageSize + meta to this endpoint,
// migrate this hook to useAdminListState like its siblings.
export function useAdminTrendingPosts() { // SPRINT-41:
  return useAsyncData('useAdminTrendingPosts', async () => { // SPRINT-41:
    const res = await adminGetTrendingPosts({ page: 1, pageSize: 50 }); // SPRINT-57: real pagination, no 200-row stopgap
    const rows = (res.data ?? []) as unknown as Record<string, unknown>[]; // SPRINT-57:
    return rows.map((row) => mapApiRowToTrendingPost(row)); // SPRINT-41:
  }, []); // SPRINT-41:
} // SPRINT-41:

export function useAdminAllPosts(initialParams?: { search?: string; category?: string; published?: boolean }) { // SPRINT-41:
  return useAdminListState({ key: 'useAdminAllPosts', // SPRINT-41:
    initialParams: { pageSize: 20, ...initialParams }, // SPRINT-41:
    fetchPage: async ({ page, pageSize, search, category, published }) => { // SPRINT-41:
      const res = await adminGetFeedPosts({ page, pageSize, search, category, published }); // SPRINT-41:
      const rows = (res.data ?? []) as Record<string, unknown>[]; // SPRINT-41:
      return { data: rows.map((row) => mapApiRowToAdminPost(row)), meta: res.meta }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useRemovePostMutation() { // SPRINT-41:
  return useMutation((postId: string) => adminModerateFeedPost(postId, 'delete')); // SPRINT-41:
} // SPRINT-41:

export function useFeaturePostMutation() { // SPRINT-41:
  return useMutation((postId: string) => adminModerateFeedPost(postId, 'approve')); // SPRINT-41:
} // SPRINT-41:

export function useAdminFeedPosts(initialParams?: { search?: string; category?: string; published?: boolean }) { // SPRINT-41:
  return useAdminListState({ key: 'useAdminFeedPosts', // SPRINT-41:
    initialParams: { pageSize: 20, ...initialParams }, // SPRINT-41:
    fetchPage: async ({ page, pageSize, search, category, published }) => { // SPRINT-41:
      const res = await adminGetFeedPosts({ page, pageSize, search, category, published }); // SPRINT-41:
      const rows = (res.data ?? []) as Record<string, unknown>[]; // SPRINT-41:
      return { data: rows.map((row) => mapApiRowToFeedPost(row)), meta: res.meta }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useFeatureFeedPostMutation() { // SPRINT-41:
  return useMutation((postId: string) => adminModerateFeedPost(postId, 'approve')); // SPRINT-41:
} // SPRINT-41:

export function useRemoveFeedPostMutation() { // SPRINT-41:
  return useMutation((postId: string) => adminModerateFeedPost(postId, 'reject')); // SPRINT-41:
} // SPRINT-41:

export function useModerateFeedPostMutation() { // SPRINT-41:
  return useMutation( // SPRINT-41:
    ({ postId, action }: { postId: string; action: 'approve' | 'reject' | 'delete' | 'hide' | 'suspend' }) => // SPRINT-41:
      adminModerateFeedPost(postId, action), // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

// ─── Areas ────────────────────────────────────────────────────────────────────

function mapAreaRow(row: Record<string, unknown>, index: number) { // SPRINT-41:
  return { // SPRINT-41:
    id: String(row.id ?? `area_${index}`), // SPRINT-41:
    name: String(row.name ?? row.city ?? 'Unknown'), // SPRINT-41:
    city: String(row.city ?? ''), // SPRINT-41:
    activeUsers: Number(row.activeUsers ?? row.userCount ?? 0), // SPRINT-41:
    listingCount: Number(row.listingCount ?? 0), // SPRINT-41:
    eventCount: Number(row.eventCount ?? 0), // SPRINT-41:
    isActive: row.isActive !== false, // SPRINT-41:
  }; // SPRINT-41:
} // SPRINT-41:

export function useAdminAreaData() { // SPRINT-41:
  return useAsyncData('useAdminAreaData', async () => { // SPRINT-41:
    const raw = await adminGetAreas(); // SPRINT-41:
    const arr = Array.isArray(raw) ? raw : []; // SPRINT-41:
    return { data: arr.map((row, i) => mapAreaRow(row as Record<string, unknown>, i)) }; // SPRINT-41: wrap bare array
  }, []); // SPRINT-41:
} // SPRINT-41:

export function useAdminAreas() { // SPRINT-41:
  return useAdminAreaData(); // SPRINT-41:
} // SPRINT-41:

export function useToggleAreaMutation() { // SPRINT-41:
  return useMutation(({ areaId }: { areaId: string; active?: boolean }) => adminToggleArea(areaId)); // SPRINT-41:
} // SPRINT-41:

// ─── Support ──────────────────────────────────────────────────────────────────

type AdminSupportTicketsParams = { // SPRINT-41:
  page?: number; // SPRINT-41:
  pageSize?: number; // SPRINT-41:
  status?: string; // SPRINT-41:
}; // SPRINT-41:

export function useAdminSupportTickets(params?: AdminSupportTicketsParams) { // SPRINT-41:
  const page = params?.page ?? 1; // SPRINT-41:
  const pageSize = params?.pageSize ?? 50; // SPRINT-41:
  const status = params?.status; // SPRINT-41:
  return useAsyncData('useAdminSupportTickets', async () => { // SPRINT-41:
    const res = await adminGetSupportTickets({ page, pageSize, status }); // SPRINT-41:
    return { ...res, data: res.data.map(mapApiSupportRowToTicket) }; // SPRINT-41:
  }, [page, pageSize, status]); // SPRINT-41: deps refetch
} // SPRINT-41:

export function useReplyToTicketMutation() { // SPRINT-41:
  return useMutation( // SPRINT-41:
    ({ ticketId, reply, close }: { ticketId: string; reply: string; close?: boolean }) => // SPRINT-41:
      adminReplyToTicket(ticketId, reply, close), // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

export function useCloseSupportTicketMutation() { // SPRINT-41:
  return useMutation((ticketId: string) => // SPRINT-41:
    adminReplyToTicket(ticketId, 'Ticket closed by admin.', true)); // SPRINT-41: reply required to close
} // SPRINT-41:

export function useResolveSupportTicketMutation() { // SPRINT-41:
  return useCloseSupportTicketMutation(); // SPRINT-41:
} // SPRINT-41:

// ─── Sessions ─────────────────────────────────────────────────────────────────

type AdminAuthSessionsParams = { // SPRINT-41:
  page: number; // SPRINT-41:
  pageSize: number; // SPRINT-41:
  userId?: string; // SPRINT-41:
}; // SPRINT-41:

/** // SPRINT-41: Returns AdminSessionsResponse AS-IS (data + truncated) — no AuthSession mock mapping */
export function useAdminAuthSessions(params: AdminAuthSessionsParams) { // SPRINT-41:
  return useAsyncData<AdminSessionsResponse>('useAdminAuthSessions', // SPRINT-41:
    () => adminGetSessions(params), // SPRINT-41:
    [params.page, params.pageSize, params.userId], // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

/** @deprecated Use useAdminAuthSessions */
export function useAdminSessions(params: AdminAuthSessionsParams) { // SPRINT-41:
  return useAdminAuthSessions(params); // SPRINT-41:
} // SPRINT-41:

export function useRevokeSessionMutation() { // SPRINT-41:
  return useMutation(async (sessionId: string) => { // SPRINT-41:
    try { // SPRINT-41:
      return await adminTerminateSession(sessionId); // SPRINT-41:
    } catch (err) { // SPRINT-41:
      if (err instanceof ApiError && err.status === 404) { // SPRINT-41: treat as success
        return { message: 'Session already terminated', userId: null }; // SPRINT-41:
      } // SPRINT-41:
      throw err; // SPRINT-41:
    } // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useTerminateUserSessionsMutation() { // SPRINT-41:
  return useMutation((userId: string) => adminTerminateUserSessions(userId)); // SPRINT-41:
} // SPRINT-41:

// ─── Community ────────────────────────────────────────────────────────────────

export function useAdminCommunityPosts(initialParams?: { search?: string; category?: string }) { // SPRINT-41:
  return useAdminListState({ key: 'useAdminCommunityPosts', // SPRINT-41:
    initialParams: { pageSize: 20, ...initialParams }, // SPRINT-41:
    fetchPage: async ({ page, pageSize, search, category }) => { // SPRINT-41:
      const res = (await adminGetCommunityQuestions({ page, pageSize, search, category })) as AdminPaginatedResponse<Record<string, unknown>>; // SPRINT-41: adminGetCommunityQuestions uses buildPageSizeQuery like its paginated siblings (restaurants/feed/roommates) but lacks an explicit AdminPaginatedResponse annotation — cast matches the same envelope shape those siblings declare.
      const rows = (res.data ?? []) as Record<string, unknown>[]; // SPRINT-41:
      return { data: rows.map((row) => mapApiRowToCommunityPost(row)), meta: res.meta }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useAdminCommunityQuestions() { // SPRINT-41:
  return useAdminCommunityPosts(); // SPRINT-41:
} // SPRINT-41:

export function useAdminCommunityNews() { // SPRINT-41:
  return useAdminCommunityPosts(); // SPRINT-41: same list surface until dedicated news route wired
} // SPRINT-41:

export function useRemoveCommunityPostMutation() { // SPRINT-41:
  return useMutation((questionId: string) => adminDeleteCommunityQuestion(questionId)); // SPRINT-41:
} // SPRINT-41:

export function useDeleteCommunityQuestionMutation() { // SPRINT-41:
  return useRemoveCommunityPostMutation(); // SPRINT-41:
} // SPRINT-41:

export function usePinCommunityPostMutation() { // SPRINT-41:
  return useMutation((postId: string) => adminPinCommunityPost(postId)); // SPRINT-41:
} // SPRINT-41:

// SPRINT-42: Full question + answer thread for the Community detail modal.
// Reuses the existing user-facing `GET /community/questions/:id` (returns the
// question with `answers` populated) instead of adding a new admin endpoint —
// this is an authenticated GET that works fine with an admin session token.
export function useAdminCommunityQuestionDetail(questionId: string | null) { // SPRINT-42:
  return useAsyncData('useAdminCommunityQuestionDetail', // SPRINT-42:
    async () => (questionId ? getQuestion(questionId) : null), // SPRINT-42:
    [questionId], // SPRINT-42:
    Boolean(questionId), // SPRINT-42:
  ); // SPRINT-42:
} // SPRINT-42:

// ─── Roommates ────────────────────────────────────────────────────────────────

export function useAdminRoommates(initialParams?: { search?: string }) { // SPRINT-41:
  return useAdminListState({ key: 'useAdminRoommates', // SPRINT-41:
    initialParams: { pageSize: 20, ...initialParams }, // SPRINT-41:
    fetchPage: async ({ page, pageSize, search }) => { // SPRINT-41:
      const res = await adminGetRoommates({ page, pageSize, search }); // SPRINT-41:
      const rows = (res.data ?? []) as Record<string, unknown>[]; // SPRINT-41:
      return { data: rows.map((row) => mapApiRowToRoommateProfile(row)), meta: res.meta }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useModerateRoommateMutation() { // SPRINT-41:
  return useMutation( // SPRINT-41:
    ({ userId, action }: { userId: string; action: 'approve' | 'reject' | 'delete' | 'hide' | 'suspend' }) => // SPRINT-41:
      adminModerateRoommate(userId, action === 'approve' ? 'approve' : action === 'delete' ? 'delete' : 'suspend'), // SPRINT-41:
  ); // SPRINT-41:
} // SPRINT-41:

export function useApproveRoommateMutation() { // SPRINT-41:
  return useMutation((userId: string) => adminModerateRoommate(userId, 'approve')); // SPRINT-41:
} // SPRINT-41:

export function useSuspendRoommateMutation() { // SPRINT-41:
  return useMutation((userId: string) => adminModerateRoommate(userId, 'suspend')); // SPRINT-41:
} // SPRINT-41:

// ─── Food / Restaurants ───────────────────────────────────────────────────────

export function useAdminFoodListings(initialParams?: { search?: string; isVerified?: boolean }) { // SPRINT-41:
  return useAdminListState({ key: 'useAdminFoodListings', // SPRINT-41:
    initialParams: { pageSize: 20, ...initialParams }, // SPRINT-41:
    fetchPage: async ({ page, pageSize, search, isVerified }) => { // SPRINT-41:
      const res = await adminGetRestaurants({ page, pageSize, search, isVerified }); // SPRINT-41:
      const rows = (res.data ?? []) as Record<string, unknown>[]; // SPRINT-41:
      return { data: rows.map((row) => mapApiRowToFoodListing(row)), meta: res.meta }; // SPRINT-41:
    }, // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

export function useVerifyFoodListingMutation() { // SPRINT-41:
  return useMutation((restaurantId: string) => adminModerateRestaurant(restaurantId, 'approve')); // SPRINT-41:
} // SPRINT-41:

export function useSuspendFoodListingMutation() { // SPRINT-41:
  return useMutation((restaurantId: string) => adminModerateRestaurant(restaurantId, 'suspend')); // SPRINT-41:
} // SPRINT-41:

// ─── User Safety Case File ──────────────────────────────────────────────────────

export function useAdminUserWarnings(userId: string | null) {
  return useAdminListState({ key: `useAdminUserWarnings:${userId}`,
    initialParams: { limit: 20 },
    enabled: Boolean(userId),
    fetchPage: async ({ page, limit }) => {
      const res = await adminGetUserWarnings(userId as string, { page, limit });
      return { data: res.data, meta: res.meta };
    },
  });
}

export function useAdminUserBanHistory(userId: string | null) {
  return useAdminListState({ key: `useAdminUserBanHistory:${userId}`,
    initialParams: { limit: 20 },
    enabled: Boolean(userId),
    fetchPage: async ({ page, limit }) => {
      const res = await adminGetUserBanHistory(userId as string, { page, limit });
      return { data: res.data, meta: res.meta };
    },
  });
}

export function useAdminReportsAgainstUser(userId: string | null) {
  return useAdminReports({ targetType: 'USER', targetId: userId ?? undefined });
}

export function useAdminReportsByUser(userId: string | null) {
  return useAdminReports({ reporterId: userId ?? undefined });
}

// ─── Admin Action Audit Log ──────────────────────────────────────────────────────

export function useAdminAuditLog(initialParams?: { action?: string; targetType?: string; search?: string }) {
  return useAdminListState({ key: 'useAdminAuditLog',
    initialParams: { limit: 30, ...initialParams },
    fetchPage: async ({ page, limit, action, targetType, search }) => {
      const res = await adminGetAuditLog({ page, limit, action, targetType, search });
      return { data: res.data, meta: res.meta };
    },
  });
}

// ─── Data Privacy / GDPR ─────────────────────────────────────────────────────────

export function useAdminPrivacyRequests(initialParams?: { status?: PrivacyRequestStatus; type?: PrivacyRequestType }) {
  return useAdminListState({ key: 'useAdminPrivacyRequests',
    initialParams: { limit: 20, ...initialParams },
    fetchPage: async ({ page, limit, status, type }) => {
      const res = await adminGetPrivacyRequests({ page, limit, status, type });
      return { data: res.data, meta: res.meta };
    },
  });
}

export function useApprovePrivacyRequestMutation() {
  return useMutation(({ requestId }: { requestId: string }) => adminApprovePrivacyRequest(requestId));
}

export function useRejectPrivacyRequestMutation() {
  return useMutation(({ requestId, reason }: { requestId: string; reason: string }) =>
    adminRejectPrivacyRequest(requestId, reason));
}

export function useRequestDataExportMutation() {
  return useMutation(({ userId }: { userId: string }) => adminRequestDataExport(userId));
}

export function useRequestErasureMutation() {
  return useMutation(({ userId, reason }: { userId: string; reason: string }) =>
    adminRequestErasure(userId, reason));
}

// ─── Chat Moderation ──────────────────────────────────────────────────────────────

export function useAdminReportedMessages() {
  return useAdminReports({ targetType: 'CHAT_MESSAGE' });
}

export function useAdminConversationDetail(id: string | null) {
  return useAsyncData('useAdminConversationDetail', async () => (id ? adminGetConversation(id) : null), [id], Boolean(id));
}

export function useAdminConversationMessages(id: string | null) {
  return useAdminListState({ key: `useAdminConversationMessages:${id}`,
    initialParams: { limit: 30 },
    enabled: Boolean(id),
    fetchPage: async ({ page, limit }) => {
      const res = await adminGetConversationMessages(id as string, { page, limit });
      return { data: res.data, meta: res.meta };
    },
  });
}

export function useDeleteChatMessageMutation() {
  return useMutation(({ messageId }: { messageId: string }) => adminDeleteChatMessage(messageId));
}

// ─── Stories Moderation ───────────────────────────────────────────────────────────

export function useAdminStories(initialParams?: { search?: string; status?: 'active' | 'reported' | 'expired' }) {
  return useAdminListState({ key: 'useAdminStories',
    initialParams: { pageSize: 20, ...initialParams },
    fetchPage: async ({ page, pageSize, search, status }) => {
      const res = await adminGetStories({ page, pageSize, search, status });
      return { data: res.data, meta: res.meta };
    },
  });
}

export function useDeleteStoryMutation() {
  return useMutation((storyId: string) => adminDeleteStory(storyId));
}
