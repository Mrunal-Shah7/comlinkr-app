// src/shared/types/api/index.ts
// Strictly typed API layer — replace base URL when backend is ready

// ── Generic Wrappers ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  timestamp: string;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, string[]>;
  timestamp: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/** Full `Cookie` header value from login/register (e.g. `comlinkr.sid=s%3A...`). */
export type SessionCookieHeader = string;

export interface LoginPayload {
  email: string;
  password: string;
}

/** Sent to POST /auth/login as `identifier` (email or username). */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface RegisterInitiatePayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

export interface RegisterVerifyPayload extends RegisterInitiatePayload {
  code: string;
}

// ── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR';
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  avatar?: string;
  bio?: string;
  phone?: string;
  city?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  postCount?: number;
  reportCount?: number;
  /** From backend `UserResponse.onboardingDone` when mapped from /auth/* */
  onboardingDone?: boolean;
}

// ── Listing ───────────────────────────────────────────────────────────────────

export type ListingStatus = 'active' | 'pending' | 'rejected' | 'suspended' | 'inactive';
export type ListingCategory = 'housing' | 'food' | 'community' | 'general';

export interface ListingLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: ListingCategory;
  status: ListingStatus;
  images: string[];
  price?: number;
  currency?: string;
  location?: ListingLocation;
  authorId: string;
  author?: UserProfile;
  viewCount: number;
  favoriteCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export type ReportReason =
  | 'spam'
  | 'fraud'
  | 'inappropriate_content'
  | 'harassment'
  | 'misinformation'
  | 'other';

export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';
export type ReportTargetType = 'listing' | 'user' | 'comment' | 'post';

export interface Report {
  id: string;
  reporterId: string;
  reporter?: UserProfile;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  resolvedBy?: string;
  resolution?: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  totalReports: number;
  openReports: number;
  newUsersToday: number;
  newListingsToday: number;
  totalRevenue?: number;
  monthlyGrowth?: number;
}

export type AdminActionVerb = 'warn' | 'suspend' | 'restore' | 'delete' | 'approve' | 'reject' | 'ban' | 'grant_badge' | 'revoke_badge';
export type AdminTargetType = 'user' | 'listing' | 'report' | 'comment';

export interface AdminAction {
  action: AdminActionVerb;
  targetId: string;
  targetType: AdminTargetType;
  reason?: string;
  notes?: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationAudience = 'all' | 'active' | 'admins' | 'specific';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'failed';

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  priority: NotificationPriority;
  status: NotificationStatus;
  sentAt?: string;
  scheduledFor?: string;
  recipientCount?: number;
  openRate?: number;
  createdBy: string;
  createdAt: string;
}

export interface SendNotificationPayload {
  title: string;
  body: string;
  audience: NotificationAudience;
  priority: NotificationPriority;
  scheduledFor?: string;
  userIds?: string[];
  data?: Record<string, string>;
}

// ── Badge Verification Applications ──────────────────────────────────────────

export type BadgeType = 'landlord' | 'restaurant_owner' | 'agency';
export type BadgeApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface BadgeApplication {
  id: string;
  userId: string;
  user: UserProfile;
  badgeType: BadgeType;
  status: BadgeApplicationStatus;
  documents?: string[];
  notes?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

// ── Polls ─────────────────────────────────────────────────────────────────────

export type PollStatus = 'draft' | 'active' | 'closed';
export type PollAudience = 'all' | 'active' | 'admins';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  audience: PollAudience;
  status: PollStatus;
  totalVotes: number;
  endsAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreatePollPayload {
  question: string;
  options: string[];
  audience: PollAudience;
  endsAt?: string;
}

// ── Trending Posts ────────────────────────────────────────────────────────────

export type PostType = 'news' | 'event' | 'listing' | 'restaurant' | 'story' | 'challenge' | 'community';

export interface TrendingPost {
  id: string;
  title: string;
  type: PostType;
  author: string;
  authorId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementScore: number;
  reportCount: number;
  status: 'active' | 'flagged' | 'removed';
  createdAt: string;
  tags?: string[];
}

// ── Admin Post (all posts view) ───────────────────────────────────────────────

export interface AdminPost {
  id: string;
  title: string;
  type: PostType;
  content: string;
  author: string;
  authorId: string;
  status: 'active' | 'flagged' | 'removed' | 'pending';
  views: number;
  likes: number;
  reportCount: number;
  createdAt: string;
  tags?: string[];
}

// ── Area Data ─────────────────────────────────────────────────────────────────

export interface AreaNeighborhood {
  id: string;
  name: string;
  city: string;
  activeUsers: number;
  listingCount: number;
  eventCount: number;
  isActive: boolean;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface DataPoint {
  date: string;
  count: number;
  delta?: number;
}

export interface CategoryStat {
  name: string;
  count: number;
  percentage?: number;
}

export interface AnalyticsData {
  period: string;
  users: DataPoint[];
  listings: DataPoint[];
  reports: DataPoint[];
  categories: CategoryStat[];
  retentionRate?: number;
  avgSessionDuration?: number;
}