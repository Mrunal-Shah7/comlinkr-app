# Data Model (Prisma)

Source: `backend/prisma/schema.prisma` (~1,750 lines, 37 migrations). Grouped by domain.

## Identity & profile
| Model | Notes |
|-------|-------|
| `User` | Core account: `email`, `username`, `fullName`, `avatarUrl`, `bio`, `role` (USER/ADMIN), `isActive`, `onboardingCompleted`, deletion window (`DeletionSource`), relations to everything below |
| `AuthProvider` | LOCAL / GOOGLE / APPLE links per user |
| `OtpCode` | REGISTRATION / PASSWORD_RESET codes |
| `UserLocation` | `city`, `state`, `country` (+ coords). Drives city scoping across the app |
| `Vibe`, `Interest`, `Community` | Onboarding taxonomies (m:n with User). Community has `CommunityCategory` (cultural heritage, national diaspora, …) |
| `RoommatePreferences` | budget, move-in, sleep/cleanliness/noise/guests enums, pets, smoking, WFH, `aboutMe`, `isLooking` |
| `PrivacySettings`, `NotificationPreference`, `BlockedUser` | Per-user settings & blocks |
| `PrivacyRequest` | DATA_EXPORT / ERASURE compliance log |
| `PushDevice`, `PushToken` | Expo push tokens |

## Explore / feed
| Model | Notes |
|-------|-------|
| `FeedPost` (+ `FeedPostMedia`, `FeedPostView`, `FeedLike`, `FeedComment`, `FeedSave`) | Community news posts, `FeedCategory` (COMMUNITY, ANNOUNCEMENT, JOBS, ALERT, DISCUSSION, QUESTION, TIP), counters `likesCount`, `commentsCount` |
| `NewsArticleLike`, `NewsArticleComment`, `NewsArticleSave` | Engagement on external (RSS) news keyed by article id/url |
| `NeighborhoodMoodVote` | Daily mood vote per city (GREAT, EXCITING, CHILL, MEH, NOISY) |
| `Story` (+ `StoryComment`, `StoryLike`, `StorySave`) | Ephemeral REEL/PHOTO/VIDEO with `StoryCategory`, expires via cron |
| `Challenge`, `ChallengeParticipant` | "Quests": type (PHOTO, FITNESS, …), duration, ACTIVE/ENDED |
| `Event` (+ `EventImage`, `EventSave`, `EventAttendee`, `EventReview`) | Category, format (IN_PERSON/VIRTUAL/HYBRID), FREE/PAID tickets, registrations with QR check-in |

## Housing
| Model | Notes |
|-------|-------|
| `HousingListing` (+ `HousingImage`, `HousingInterest`, `HousingSave`) | `PropertyType` (APARTMENT/HOUSE/STUDIO/ROOM), `ListingStatus` (AVAILABLE/RENTED/UNLISTED), price, beds, baths, pets, address/city |
| `SharedSpace` (+ `SharedSpaceImage`, `SharedSpaceApplication`, `SharedSpaceSave`) | Spare room in an existing home: `RoomType`, `FurnishedStatus`; applications PENDING/ACCEPTED/REJECTED |
| `RoommateSave` | Bookmarked roommate profiles |
| `PropertyApplication` | Multi-step rental application, `PropertyApplicationStatus`, signatures (`SignatureType` TYPED/DRAWN), `DepositStatus` |
| `UserDocument` | Generated TENANCY_AGREEMENT PDFs |
| `ListingReport` | Reports on HOUSING, RESTAURANT, USER, COMMUNITY_POST/MEMBER/QUESTION… |

## Food
| Model | Notes |
|-------|-------|
| `Restaurant` (+ `RestaurantImage`) | Cuisine, `PriceRange`, hours + timezone (for "open now"), owner (`OwnershipType` OWN/MANAGE) |
| `RestaurantReview` | Rating + text; reviewer may hold LOCAL_REVIEWER badge |
| `RestaurantReservation` | PENDING/CONFIRMED/CANCELLED |
| `RestaurantFavorite`, `RestaurantSave` | Two separate "heart" concepts kept for compatibility |

## Community Q&A
`CommunityQuestion`, `CommunityAnswer`, `CommunityUpvote` (`UpvoteTargetType` QUESTION/ANSWER),
`CommunitySave`, `CommunityPoll`, `CommunityPollVote` (default polls are materialised per city).

## Messaging & notifications
| Model | Notes |
|-------|-------|
| `Conversation` | DIRECT or group; `ConversationContextType` (GENERAL, listing, restaurant…) |
| `ConversationMember` | role + `ConversationMemberStatus` (PENDING / ACCEPTED / BLOCKED) and `BlockProvenance` (user vs ADMIN_BAN) — also encodes roommate connection state |
| `Message` | TEXT / IMAGE / SYSTEM … |
| `Notification` | EVENT_NEARBY, COMMENT, LIKE, MESSAGE, BADGE_UPDATE, SYSTEM with `referenceType/Id`, `actorId` |
| `BroadcastNotification` | Admin broadcasts: priority, DRAFT/SCHEDULED/SENT/FAILED, audience ALL/CITY/SELECTIVE |

## Trust, safety & admin
`BadgeApplication` (+ `BadgeDocument`), `UserBadge`, `ContentReport`, `WarningRecord`, `BanRecord`,
`AdminAuditLog`, `AdminPoll` (+ options/votes), `SupportTicket` (OPEN/REPLIED/CLOSED), `PlatformSettings`.
