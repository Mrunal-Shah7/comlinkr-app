/**
 * API barrel export
 *
 * Import from this file throughout the app:
 *   import { authApi, feedApi, housingApi } from "@/app/api";
 *   import { ApiError } from "@/app/api";
 */

// ── Client / error ─────────────────────────────────────────────────────────
export { ApiError, getSessionCookie, setSessionCookie, clearSession, clearTokens } from "./client";

// ── Domain modules (namespaced to avoid name collisions) ───────────────────
export * as authApi              from "./auth.api";
export * as feedApi              from "./feed.api";
export * as housingApi           from "./housing.api";
export * as roommatesApi         from "./roommates.api";
export * as foodApi              from "./food.api";
export * as communityApi         from "./community.api";
export * as communityQAApi       from "./community-qa.api";
export * as chatApi              from "./chat.api";
export * as notificationsApi     from "./notifications.api";
export * as eventsApi            from "./events.api";
export * as newsApi              from "./news.api";
export * as storiesApi           from "./stories.api";
export * as challengesApi        from "./challenges.api";
export * as badgesApi            from "./badges.api";
export * as favoritesApi         from "./favorites.api";
export * as searchApi            from "./search.api";
export * as profileApi           from "./profile.api";
export * as supportApi           from "./support.api";
export * as settingsApi          from "./settings.api";
export * as propertyAgreementApi from "./property-agreement.api";
export * as adminApi             from "./admin.api";
export * as mediaApi             from "./media.api";

// ── Type re-exports (most commonly used) ──────────────────────────────────
export type {
  LoginPayload,
  RegisterInitiatePayload,
  RegisterVerifyPayload,
  AuthUser,
} from "./auth.api";
export type { Post, PostType, CreatePostPayload, FeedQueryParams, PaginatedResponse } from "./feed.api";
export type { HousingListing, CreateListingPayload }                           from "./housing.api";
export type { RoommateListing, SharedSpaceListing, RoommatePreferences }       from "./roommates.api";
export type { Restaurant, CreateRestaurantPayload }                            from "./food.api";
export type { CommunityPost, CommunityMember }                                 from "./community.api";
export type { Question, Answer, CommunityTopic }                               from "./community-qa.api";
export type { ApiConversation, ApiMessage, ChatListRow }                        from "./chat.api";
export type { AppNotification }                                                 from "./notifications.api";
export type { Event, StoryEvent, EventTicket, CreateEventPayload }             from "./events.api";
export type { NewsArticle, NewsCategory, NewsQueryParams }                     from "./news.api";
export type {
  BadgeApplication,
  BadgeApplicationDetail,
  SubmitBadgeApplicationFields,
  MyBadgeStatusRow,
  PickedDocument,
} from "./badges.api";
export type { SavedItem, InterestedItem }                                       from "./favorites.api";
export type { SearchResult, UnifiedSearchResponse }                            from "./search.api";
export type { PublicProfile, Achievement, UserStats }                          from "./profile.api";
export type { SupportTicket, FAQ, CreateTicketPayload }                        from "./support.api";
export type {
  SettingsAccount,
  SettingsPrivacy,
  BlockedUserEntry,
  UpdateAccountPayload,
} from "./settings.api";
export type { NotificationPreferenceSettings } from "./notifications.api";
export type { PropertyApplication, DepositProtection, PersonalInfo }          from "./property-agreement.api";
export type {
  AdminUser,
  AdminListingReport as Report,
  Analytics,
  Poll,
  CreatePollPayload,
  AreaNeighborhood,
  TrendingItem,
  AdminSession,
  AnalyticsTimeSeries,
} from "./admin.api";
export type { UploadResult, UploadContext }                                     from "./media.api";
