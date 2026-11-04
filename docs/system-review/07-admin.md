# 07. Admin console

_2026-11-04. Made from the earlier section doc (written from code, 2026-10-29). Not seen on the phone: the local
data has no admin content. Marks: see [README.md](README.md)._

## Planned changes

| ID | Kind | What will change | Triage | Plan |
|---|---|---|---|---|
| — | | None yet | | |

## What it is for

Running the platform from inside the mobile app: moderating users and content, verifying badges, handling reports
and support tickets, sending broadcasts, and privacy requests.

## Who uses it, and where

- Users with `role = ADMIN`. The admin user is created with `pnpm seed:admin` [code].
- Routes `frontend/apps/mobile/app/admin/*` (thin files) → screens in `src/features/admin/pages/*`; data through
  `src/features/admin/hooks/useAdmin.ts` and `src/api/admin.api.ts` [code].
- Backend: `admin` module, `/api/admin`, 43 endpoints, all `@Roles(ADMIN)`. Every change is written to
  `AdminAuditLog` by `AdminAuditInterceptor` [code].

## How it works

| Route | Screen | Purpose |
|---|---|---|
| `admin/index` | AdminDashboardScreen | KPIs and entry points |
| `admin/users`, `admin/user-safety/[id]` | UserManagement, UserSafetyCaseFile | Search users, warn, ban and unban, case file |
| `admin/verifications` | Verifications | Approve or reject badge applications and documents |
| `admin/reports` | Reports | Content and listing report queue (resolve, dismiss) |
| `admin/listings` | ListingManagement | Housing moderation |
| `admin/food` | FoodManagement | Restaurant moderation |
| `admin/feed`, `admin/posts`, `admin/trending` | Feed, AllPosts, TrendingPosts | Feed post moderation |
| `admin/stories` | StoriesModeration | Story moderation |
| `admin/community` | CommunityManagement | Q&A moderation |
| `admin/roommates` | Roommates | Roommate profiles overview |
| `admin/chat-moderation` | ChatModeration | Conversation bans |
| `admin/notifications` | NotificationManagement | Broadcasts (priority, schedule, audience) |
| `admin/polls` | Polls | Admin polls |
| `admin/support` | SupportRequests | Support tickets |
| `admin/area` | AreaManagement | Cities and areas |
| `admin/auth` | AuthManagement | Auth providers and sessions |
| `admin/privacy` | DataPrivacy | Export and erasure requests |
| `admin/analytics`, `admin/audit-log` | — | Analytics, audit trail |

[code] for every row.

## Rules it enforces

- Only `ADMIN` reaches `/api/admin` [code].
- Every admin change is audited [code].
- Moderation records: `ContentReport`, `WarningRecord`, `BanRecord` [code].

## Problems found

None recorded yet.

## Questions

1. Can an admin see badge documents and rental-application documents, and is each view audited, or only changes?
   [question]
2. Should an admin be able to use the normal app with the same account? [question]

## How to test it

Checklist: none yet. Needs `pnpm seed:admin` and seeded reports, badge applications, support tickets and posts.

## Not yet checked

Every screen. The 2026-10-29 audit spot-checked a few backend ownership rules (food reservations, notifications,
story comments, messaging member status) and found them correct; the admin routes were not part of it.
