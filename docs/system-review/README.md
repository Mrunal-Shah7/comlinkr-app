# System review

The source of truth for how Comlinkr behaves, one document per module, across the mobile app and the backend.
Read the module's document before changing it, and update it in the same pull request.

## Marks

Every statement carries one mark:

- **[confirmed]**: intended behaviour, said by the owner or the team;
- **[observed]**: seen on the phone or in a real request, not yet confirmed as intended;
- **[code]**: read in the code, not run;
- **[question]**: looks wrong, or two parts disagree; listed under "Questions" and in the index.

When a question is answered, write the answer into the review, mark the statement **[confirmed]**, and remove the
question from `docs/README.md`.

## Sections in each review

1. **Planned changes**: changes with a triage line or a plan, and where they stand.
2. **What it is for** and **Who uses it, and where** (screens, routes, roles).
3. **How it works**: screens, data loading, API, data.
4. **Rules it enforces**: limits, permissions, validation, the things a change must not break.
5. **Problems found**: numbered, with status and the build note that fixed them.
6. **Questions** for the owner or team.
7. **How to test it**: the checklist in `checklists/`, the test data it needs.
8. **Not yet checked**: what nobody has run or seen.
9. **Updates**: dated sections added by later walks, newest last.

## Modules

| # | Module | Mobile | Backend |
|---|---|---|---|
| 01 | [Account, sign-in, onboarding, badges, settings](01-account-onboarding-settings.md) | `app/(auth)/`, `profile`, `edit-profile`, `settings`, `apply-badge` | `auth`, `onboarding`, `users`, `badges`, `settings` |
| 02 | [Explore: news, events, stories, quests, polls](02-explore.md) | `app/(tabs)/feed/`, `events/`, `story-viewer` | `feed`, `news`, `events`, `stories`, `challenges` |
| 03 | [Listings, rooms and roommates](03-listings-rooms-roommates.md) | `app/(tabs)/housing/`, `my-listings`, `landlord-dashboard`, `property-agreement` | `housing`, `shared-spaces`, `roommates`, `property-applications`, `documents` |
| 04 | [Food](04-food.md) | `app/(tabs)/food/`, `my-restaurants` | `food` |
| 05 | [Community Q&A](05-community.md) | `app/(tabs)/community/` | `community` |
| 06 | [Messaging and notifications](06-messaging-notifications.md) | `chat`, `notifications` | `messaging`, `notifications` |
| 07 | [Admin console](07-admin.md) | `app/admin/*` | `admin` |
| 08 | [Platform: sessions, guards, deep links, media, jobs](08-platform.md) | `app/_layout.tsx`, `src/api/`, `src/store/` | `common/`, `deep-links.ts`, `storage`, `files`, `*.cron.ts` |

The cross-cutting composer `create-post.tsx` (news, listing, shared space, restaurant, event, story, challenge) is
described in the module that owns each content type. Its code lives in `src/features/compose/` (`PostForm.tsx`,
`PreviewModal.tsx` and helpers); the route file holds only the screen.

## Status

All eight reviews were made on 2026-11-04 from the earlier docs (written from code on 2026-10-29) and the
2026-10-29 bug audit. Statements are **[code]** unless the audit saw them on the phone. No module has been walked
by checklist yet.
