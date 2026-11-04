# API Reference (summary)

Base URL: `http://localhost:4000/api` (dev) · `https://api.comlinkr.com/api` (prod) · Swagger: `/api/docs`.

> Generated from `backend/docs/API_ENDPOINTS.md` (which includes request DTO params). This file groups endpoints by module and drops params for skimming.

## Conventions
- **Auth**: session cookie `comlinkr.sid` (express-session + Redis). `Public` = no session; `Auth` = session required; `Admin` = `ADMIN` role.
- Authenticated routes also pass `OnboardingGuard` (onboarding must be complete) unless marked `@SkipOnboarding()`.
- Responses are wrapped by `TransformInterceptor`; errors are `{ code, message }` (e.g. `RESOURCE_NOT_FOUND`, `BADGE_REQUIRED`, `AUTH_EMAIL_EXISTS`).
- Lists use `page` / `limit` (or `pageSize`) and return `{ data, meta }` pagination.
- Rate limit: 100 requests / minute per client (ThrottlerGuard).
- Realtime chat: Socket.IO namespace `/chat` (`join_conversation`, `send_message`, `typing_start/stop`).

## `/api/health` (1)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |

## `/api/auth` (13)

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | `/api/auth/register/initiate` | Public | Start registration, send OTP |
| POST | `/api/auth/register/verify` | Public | Verify OTP and create account |
| POST | `/api/auth/login` | Public | Login with email/username and password |
| POST | `/api/auth/google` | Public | Google OAuth login/register |
| POST | `/api/auth/google/complete` | Public | Complete Google registration with username |
| POST | `/api/auth/apple` | Public | Apple OAuth login/register |
| POST | `/api/auth/apple/complete` | Public | Complete Apple registration with username |
| POST | `/api/auth/logout` | Auth | Destroy session and clear cookie |
| GET | `/api/auth/me` | Auth | Get current user from session |
| GET | `/api/auth/providers` | Auth | List linked auth providers |
| DELETE | `/api/auth/providers/:provider` | Auth | Unlink an auth provider |
| POST | `/api/auth/forgot-password` | Public | Send password reset OTP |
| POST | `/api/auth/reset-password` | Public | Reset password with OTP |

## `/api/users` (16)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/users/me` | Auth | Get full profile (relations, stats, achievements) |
| PATCH | `/api/users/me` | Auth | Update basic profile fields |
| POST | `/api/users/me/avatar` | Auth | Upload profile photo |
| DELETE | `/api/users/me/avatar` | Auth | Remove profile photo |
| GET | `/api/users/me/stats` | Auth | Get profile stats only |
| GET | `/api/users/me/achievements` | Auth | Get achievement badges only |
| GET | `/api/users/me/reservations` | Auth | Get all reservations made by the current user |
| GET | `/api/users/me/posts` | Auth | All content by current user (unified) |
| POST | `/api/users/push-token` | Auth | registerPushToken |
| DELETE | `/api/users/push-token` | Auth | removePushToken |
| POST | `/api/users/support` | Auth | createSupportTicket |
| GET | `/api/users/support` | Auth | getMySupportTickets |
| GET | `/api/users/:username/by-username` | Auth | Get public profile by username |
| POST | `/api/users/:id/block` | Auth | Block a user by ID |
| DELETE | `/api/users/:id/block` | Auth | Unblock a user by ID |
| GET | `/api/users/:id` | Auth | Get public profile by ID |

## `/api/onboarding` (9)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/onboarding/vibes` | Auth | List all vibes |
| GET | `/api/onboarding/interests` | Auth | List all interests |
| GET | `/api/onboarding/communities` | Auth | List all communities by category |
| POST | `/api/onboarding/location` | Auth | Step 1: Set user location |
| POST | `/api/onboarding/vibes` | Auth | Step 2: Set user vibes |
| POST | `/api/onboarding/interests` | Auth | Step 3: Set user interests |
| POST | `/api/onboarding/communities` | Auth | Step 4: Set user communities |
| POST | `/api/onboarding/agreement` | Auth | Step 5: Accept ToS and policies |
| POST | `/api/onboarding/complete` | Auth | Step 6: Mark onboarding complete |

## `/api/feed` (12)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/feed` | OptionalAuth | Get city-scoped feed with optional category/trending filters |
| GET | `/api/feed/mood` | OptionalAuth | Get neighborhood mood distribution for current city |
| POST | `/api/feed/mood` | Auth | Vote your neighborhood mood for current city |
| GET | `/api/feed/saved` | Auth | Get saved/bookmarked posts for current user |
| GET | `/api/feed/:id` | OptionalAuth | Get single feed post by ID |
| POST | `/api/feed` | Auth | Create news feed post with optional media |
| PATCH | `/api/feed/:id` | Auth | Partially update an owned feed post |
| DELETE | `/api/feed/:id` | Auth | Delete own feed post |
| POST | `/api/feed/:id/like` | Auth | Toggle like on a post |
| POST | `/api/feed/:id/comment` | Auth | Add comment to a post |
| GET | `/api/feed/:id/comments` | OptionalAuth | Get paginated comments for a post |
| POST | `/api/feed/:id/save` | Auth | Toggle save/bookmark on a post |

## `/api/community` (11)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/community/polls` | OptionalAuth | Active Would You Rather–style polls for your city |
| POST | `/api/community/polls/:id/vote` | Auth | Vote, change vote, or clear vote (same option again removes your vote) |
| GET | `/api/community/questions` | OptionalAuth | Get paginated city-scoped community questions |
| GET | `/api/community/questions/saved` | Auth | getSavedQuestions |
| GET | `/api/community/stats` | OptionalAuth | Get community stats for a city (or user profile city) |
| GET | `/api/community/questions/:id` | OptionalAuth | Get question detail with answers |
| POST | `/api/community/questions` | Auth | Create a community question |
| POST | `/api/community/questions/:id/answers` | Auth | Create an answer for a question |
| POST | `/api/community/questions/:id/upvote` | Auth | Toggle upvote on a question |
| POST | `/api/community/questions/:id/save` | Auth | Toggle save/bookmark on a question |
| POST | `/api/community/answers/:id/upvote` | Auth | Toggle upvote on an answer |

## `/api/events` (24)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/events/stories` | Auth | Lightweight events for feed story strip |
| GET | `/api/events/me` | Auth | Events created by current user |
| GET | `/api/events/registered` | Auth | Events the user is attending |
| GET | `/api/events/saved` | Auth | getSaved |
| GET | `/api/events` | OptionalAuth | List events with filters |
| POST | `/api/events` | Auth | Create event |
| POST | `/api/events/:id/images` | Auth | Upload event cover images (host only) |
| GET | `/api/events/:id/reviews` | OptionalAuth | Get paginated reviews for an event |
| POST | `/api/events/:id/reviews` | Auth | Submit an attendee review after an event |
| PATCH | `/api/events/:id/reviews/:reviewId` | Auth | Edit own event review |
| DELETE | `/api/events/:id/reviews/:reviewId` | Auth | Delete an event review as author or event organiser |
| POST | `/api/events/:id/check-in` | Auth | checkInTicket |
| GET | `/api/events/:id/check-in` | Auth | Get organiser check-in totals and registrations |
| GET | `/api/events/:id` | OptionalAuth | Get event by ID |
| PATCH | `/api/events/:id` | Auth | Update own event |
| DELETE | `/api/events/:id` | Auth | Delete own event |
| POST | `/api/events/:id/attend` | Auth | RSVP to event |
| DELETE | `/api/events/:id/attend` | Auth | Cancel RSVP |
| POST | `/api/events/:id/register` | Auth | Register for event (alias of attend; mobile) |
| DELETE | `/api/events/:id/register` | Auth | Cancel registration (alias of cancel attend) |
| POST | `/api/events/:id/save` | Auth | Toggle saved / bookmark |
| POST | `/api/events/:id/report` | Auth | Report an event |
| GET | `/api/events/:id/attendees` | Auth | List attendees (host only) |
| GET | `/api/events/:id/ticket` | Auth | Current user ticket stub (after registration) |

## `/api/housing` (15)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/housing` | OptionalAuth | List housing listings with filters |
| GET | `/api/housing/my-listings` | Auth | getMyListings |
| GET | `/api/housing/interested` | Auth | Listings the current user marked interest in |
| GET | `/api/housing/saved` | Auth | getSavedListings |
| GET | `/api/housing/:id` | OptionalAuth | Get listing by ID |
| POST | `/api/housing/:id/report` | Auth | Report a housing listing |
| POST | `/api/housing` | Auth | Create listing (verified landlord/agency badge adds trust on the listing) |
| PATCH | `/api/housing/:id` | Auth | Partially update an owned housing listing |
| POST | `/api/housing/:id/images` | Auth | Append images to an owned listing |
| DELETE | `/api/housing/:id/images/:imageId` | Auth | Remove one image from an owned listing |
| PATCH | `/api/housing/:id/images/reorder` | Auth | Set the complete image order for an owned listing |
| DELETE | `/api/housing/:id` | Auth | Delete own listing |
| POST | `/api/housing/:id/interest` | Auth | Mark interest on listing |
| DELETE | `/api/housing/:id/interest` | Auth | Remove interest from listing |
| POST | `/api/housing/:id/save` | Auth | Toggle save/bookmark on a listing |

## `/api/roommates` (15)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/roommates/matches` | Auth | AI-style best-match list (same as search with sort=best_match) |
| GET | `/api/roommates/preferences` | Auth | Get roommate search preferences |
| GET | `/api/roommates/listing/me` | Auth | Current user roommate listing (if isLooking) |
| POST | `/api/roommates/listing` | Auth | Publish roommate listing (sets isLooking) |
| PATCH | `/api/roommates/listing` | Auth | Update roommate listing |
| DELETE | `/api/roommates/listing` | Auth | Remove roommate listing (isLooking=false) |
| GET | `/api/roommates` | Auth | Search roommates with filters and sort |
| GET | `/api/roommates/saved` | Auth | getSavedRoommates |
| PATCH | `/api/roommates/preferences` | Auth | Update own roommate preferences |
| GET | `/api/roommates/:id` | Auth | Get roommate profile with compatibility |
| POST | `/api/roommates/:id/save` | Auth | Toggle save/bookmark on a roommate profile |
| POST | `/api/roommates/:id/connect` | Auth | Send connection request / start conversation |
| POST | `/api/roommates/:id/cancel` | Auth | Cancel outgoing roommate connection request |
| POST | `/api/roommates/:id/accept` | Auth | Accept incoming roommate connection request from user :id |
| POST | `/api/roommates/:id/decline` | Auth | Decline incoming roommate connection request from user :id |

## `/api/restaurants` (23)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/restaurants` | OptionalAuth | List restaurants with filters |
| GET | `/api/restaurants/my-restaurants` | Auth | getMyRestaurants |
| GET | `/api/restaurants/favorites` | Auth | getFavorites |
| GET | `/api/restaurants/saved` | Auth | getSavedRestaurants |
| PATCH | `/api/restaurants/reservations/:reservationId/cancel` | Auth | Cancel a reservation (reserver or restaurant owner) |
| PATCH | `/api/restaurants/reservations/:reservationId/confirm` | Auth | Confirm a pending reservation (owner only) |
| GET | `/api/restaurants/:id/reviews` | OptionalAuth | Get paginated reviews for a restaurant |
| PATCH | `/api/restaurants/:id/reviews` | Auth | Edit own review |
| DELETE | `/api/restaurants/:id/reviews` | Auth | Delete own review |
| POST | `/api/restaurants/:id/reservations` | Auth | Create a reservation at a restaurant |
| GET | `/api/restaurants/:id/reservations` | Auth | List reservations for a restaurant (owner only) |
| GET | `/api/restaurants/:id` | OptionalAuth | Get restaurant by ID |
| POST | `/api/restaurants` | Auth | Create restaurant (verified owner badge adds trust on the listing) |
| PATCH | `/api/restaurants/:id` | Auth | Update own restaurant |
| DELETE | `/api/restaurants/:id` | Auth | Delete own restaurant |
| POST | `/api/restaurants/:id/images` | Auth | Upload restaurant images |
| POST | `/api/restaurants/:id/reviews` | Auth | Submit a review |
| POST | `/api/restaurants/:id/review` | Auth | Submit a review (alias of POST …/reviews) |
| POST | `/api/restaurants/:id/reserve` | Auth | Make a reservation |
| POST | `/api/restaurants/:id/favorite` | Auth | Toggle favorite |
| POST | `/api/restaurants/:id/save` | Auth | Toggle save/bookmark on a restaurant |
| POST | `/api/restaurants/:id/order` | Auth | Start conversation with owner (mobile “order”) |
| POST | `/api/restaurants/:id/report` | Auth | Report a restaurant |

## `/api/shared-spaces` (10)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/shared-spaces` | Auth | List shared spaces (paginated) |
| GET | `/api/shared-spaces/me` | Auth | Current user shared spaces |
| GET | `/api/shared-spaces/:id` | Auth | Get shared space by id |
| POST | `/api/shared-spaces` | Auth | Create shared space |
| PATCH | `/api/shared-spaces/:id` | Auth | Update own shared space |
| DELETE | `/api/shared-spaces/:id` | Auth | Delete own shared space |
| POST | `/api/shared-spaces/:id/images` | Auth | Upload shared space images |
| DELETE | `/api/shared-spaces/:id/images/:imageId` | Auth | Remove a shared space image |
| POST | `/api/shared-spaces/:id/apply` | Auth | Apply to join shared space |
| POST | `/api/shared-spaces/:id/save` | Auth | Toggle save / bookmark |

## `/api/stories` (12)

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | `/api/stories` | Auth | Create story (multipart: fields + media) |
| GET | `/api/stories/me` | Auth | Current user’s active stories |
| GET | `/api/stories/saved` | Auth | getSavedStories |
| GET | `/api/stories` | OptionalAuth | getActiveStories |
| GET | `/api/stories/:id/comments` | Public | Paginated comments for a story |
| POST | `/api/stories/:id/comments` | Auth | Add a comment to a story |
| DELETE | `/api/stories/:id/comments/:commentId` | Auth | Delete a story comment |
| POST | `/api/stories/:id/like` | Auth | Toggle like on a story |
| GET | `/api/stories/:id/like` | OptionalAuth | Get story like count + liked-by-me state |
| GET | `/api/stories/:id` | OptionalAuth | View a story (increments view count) |
| POST | `/api/stories/:id/save` | Auth | Toggle save/bookmark on a story |
| DELETE | `/api/stories/:id` | Auth | Delete own story (before or after expiry if still stored) |

## `/api/news` (7)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/news/explore` | OptionalAuth | Aggregated live news for Explore (Google News RSS via server — same mix as mobile) |
| GET | `/api/news/articles/saved` | Auth | getSavedArticles |
| GET | `/api/news/articles/:id/stats` | OptionalAuth | getArticleStats |
| POST | `/api/news/articles/:id/save` | Auth | toggleArticleSave |
| POST | `/api/news/articles/:id/like` | Auth | toggleArticleLike |
| GET | `/api/news/articles/:id/comments` | Auth | getArticleComments |
| POST | `/api/news/articles/:id/comments` | Auth | addArticleComment |

## `/api/challenges` (4)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/challenges` | OptionalAuth | List challenges with filters |
| POST | `/api/challenges` | Auth | Create challenge |
| GET | `/api/challenges/:id` | OptionalAuth | Get challenge by ID with participants |
| POST | `/api/challenges/:id/join` | Auth | Join challenge |

## `/api/badges` (7)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/badges/types` | Auth | getBadgeTypes |
| GET | `/api/badges/my-status` | Auth | getMyBadgeStatus |
| GET | `/api/badges/my-applications` | Auth | listMyApplications |
| DELETE | `/api/badges/my-applications/:id` | Auth | withdrawApplication |
| POST | `/api/badges/apply` | Auth | applyForBadge |
| GET | `/api/badges/applications/:id` | Auth | getApplicationById |
| GET | `/api/badges/applications/:applicationId/documents/:documentId/url` | Auth | getDocumentUrl |

## `/api/conversations` (10)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/conversations` | Auth | getConversations |
| GET | `/api/conversations/unread-count` | Auth | getUnreadCount |
| POST | `/api/conversations` | Auth | createConversation |
| POST | `/api/conversations/audio/upload` | Auth | uploadAudio |
| DELETE | `/api/conversations/:id` | Auth | hideConversation |
| GET | `/api/conversations/:id` | Auth | getConversationById |
| PATCH | `/api/conversations/members/:id/status` | Auth | updateMemberStatus |
| GET | `/api/conversations/:id/messages` | Auth | getMessages |
| POST | `/api/conversations/:id/messages` | Auth | sendMessage |
| PATCH | `/api/conversations/:id/read` | Auth | markAsRead |

## `/api/notifications` (10)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/notifications` | Auth | getNotifications |
| GET | `/api/notifications/unread-count` | Auth | getUnreadCount |
| GET | `/api/notifications/preferences` | Auth | getPreferences |
| PATCH | `/api/notifications/preferences` | Auth | updatePreferences |
| POST | `/api/notifications/push-token` | Auth | registerPushToken |
| DELETE | `/api/notifications/push-token` | Auth | removePushToken |
| PATCH | `/api/notifications/read-all` | Auth | markAllAsRead |
| PATCH | `/api/notifications/:id/read` | Auth | markAsRead |
| DELETE | `/api/notifications/:id` | Auth | deleteOne |
| DELETE | `/api/notifications` | Auth | deleteAll |

## `/api/saves` (1)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/saves` | Auth | Unified saved items: counts only when |

## `/api/settings` (12)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/settings/account` | Auth | getAccount |
| PATCH | `/api/settings/account` | Auth | updateAccount |
| GET | `/api/settings/privacy` | Auth | getPrivacy |
| PATCH | `/api/settings/privacy` | Auth | updatePrivacy |
| GET | `/api/settings/blocked-users` | Auth | getBlockedUsers |
| POST | `/api/settings/blocked-users` | Auth | blockUser |
| DELETE | `/api/settings/blocked-users/:userId` | Auth | unblockUser |
| PATCH | `/api/settings/city` | Auth | updateCity |
| PATCH | `/api/settings/culture` | Auth | updateCulture |
| POST | `/api/settings/delete-account` | Auth | requestDeletion |
| POST | `/api/settings/delete-account/immediate` | Auth | Immediately and permanently delete account |
| POST | `/api/settings/cancel-deletion` | Auth | cancelDeletion |

## `/api/admin` (43)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | getUsers |
| GET | `/api/admin/analytics` | Admin | getAnalytics |
| GET | `/api/admin/reports` | Admin | getReports |
| GET | `/api/admin/feed` | Admin | getFeedPosts |
| GET | `/api/admin/feed/trending` | Admin | getTrendingPosts |
| PATCH | `/api/admin/feed/:id/moderate` | Admin | moderateFeedPost |
| GET | `/api/admin/polls` | Admin | getPolls |
| POST | `/api/admin/polls` | Admin | createPoll |
| PATCH | `/api/admin/polls/:id/toggle` | Admin | togglePoll |
| DELETE | `/api/admin/polls/:id` | Admin | deletePoll |
| GET | `/api/admin/community/questions` | Admin | getCommunityQuestions |
| GET | `/api/admin/community/news` | Admin | getCommunityNews |
| DELETE | `/api/admin/community/questions/:id` | Admin | moderateCommunityQuestion |
| GET | `/api/admin/roommates` | Admin | getRoommates |
| PATCH | `/api/admin/roommates/:id/moderate` | Admin | moderateRoommate |
| GET | `/api/admin/restaurants` | Admin | getRestaurants |
| PATCH | `/api/admin/restaurants/:id/moderate` | Admin | moderateRestaurant |
| GET | `/api/admin/listings` | Admin | getListings |
| PATCH | `/api/admin/listings/:id/moderate` | Admin | moderateListing |
| GET | `/api/admin/areas` | Admin | getAreas |
| GET | `/api/admin/notifications/broadcasts` | Admin | getBroadcastHistory |
| POST | `/api/admin/notifications/broadcast` | Admin | sendBroadcast |
| GET | `/api/admin/support` | Admin | getSupportTickets |
| PATCH | `/api/admin/support/:id/reply` | Admin | replyToTicket |
| GET | `/api/admin/sessions` | Admin | List active authenticated sessions |
| DELETE | `/api/admin/sessions/session/:sessionId` | Admin | Terminate one active session |
| DELETE | `/api/admin/sessions/user/:userId` | Admin | Terminate all active sessions for one user |
| PATCH | `/api/admin/reports/:id/dismiss` | Admin | dismissReport |
| DELETE | `/api/admin/reports/:id/listing` | Admin | resolveReportAndDeleteListing |
| GET | `/api/admin/settings` | Admin | getPlatformSettings |
| PATCH | `/api/admin/settings` | Admin | updatePlatformSettings |
| GET | `/api/admin/content` | Admin | getContent |
| GET | `/api/admin/badges/applications` | Admin | getBadgeApplications |
| PATCH | `/api/admin/badges/applications/:id/approve` | Admin | Approve badge application |
| PATCH | `/api/admin/badges/applications/:id/reject` | Admin | Reject badge application |
| PATCH | `/api/admin/badges/applications/:id` | Admin | reviewBadgeApplication |
| GET | `/api/admin/users/:id` | Admin | getUserById |
| PATCH | `/api/admin/users/:id` | Admin | updateUser |
| POST | `/api/admin/users/:id/warn` | Admin | warnUser |
| POST | `/api/admin/users/:id/grant-badge` | Admin | grantUserBadge |
| DELETE | `/api/admin/users/:id/revoke-badge/:type` | Admin | Revoke a badge from a user |
| DELETE | `/api/admin/users/:id` | Admin | deleteUser |
| PATCH | `/api/admin/content/:id` | Admin | moderateContent |
## `/api/property-applications` (11) — *not in API_ENDPOINTS.md*

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | `/api/property-applications` | Auth | Start (or resume) a DRAFT application for a listing |
| GET | `/api/property-applications` | Auth | My applications (tenant side) |
| GET | `/api/property-applications/received` | Auth (landlord) | Applications received on my listings |
| GET | `/api/property-applications/:id` | Auth | Application detail (tenant or landlord) |
| PATCH | `/api/property-applications/:id/step/:step` | Auth | Save one step of the multi-step form |
| POST | `/api/property-applications/:id/submit` | Auth | Submit DRAFT → SUBMITTED |
| POST | `/api/property-applications/:id/sign` | Auth | Typed/drawn e-signature (tenant or landlord) |
| DELETE | `/api/property-applications/:id` | Auth | Withdraw |
| PATCH | `/api/property-applications/:id/decision` | Auth + LANDLORD badge | Approve / reject |
| GET | `/api/property-applications/:id/deposit` | Auth | Deposit status |
| POST | `/api/property-applications/:id/deposit/pay` | Auth | Mark deposit paid (HELD) |

Status flow: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED → SIGNED` (or `WITHDRAWN`).
When both parties have signed, a tenancy-agreement PDF is generated (`agreement-pdf.service.ts`) and
stored as a `UserDocument`.

## `/api/documents` (2) — *not in API_ENDPOINTS.md*

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/api/documents` | Auth | My documents (tenancy agreements) |
| GET | `/api/documents/:id/download` | Auth | Download a document |

## Deep links (no `/api` prefix)
`/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association`, `/app/*` — see `backend/src/deep-links.ts`.
