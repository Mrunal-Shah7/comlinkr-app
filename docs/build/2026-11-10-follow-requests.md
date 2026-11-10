# 2026-11-10: Follow requests, the Following tab, the "New followers" switch (TR-049, TR-050, TR-051, TR-053, plan 16)

Branch `feature/follow-requests`, from `feature/event-cancelled`. Merged as pull request 39 (merge `d238035`), reaching `main` with PR 24.

## Problem

Plan 14's Follow was one-way, with no approval even for a private profile, and following someone changed nothing
you saw. "New follower" could not be turned off. On 2026-11-10 the owner decided:
- private accounts approve their followers;
- the people you follow get their own tab;
- "New follower" gets a setting.

Claude chose the details ([plan 16](../plan/16-follow-requests-and-following.md)).

While planning, TR-053 turned up. Saving one notification switch reset the others:
- `PATCH /notifications/preferences` upserted every default along with the field sent, so turning push off turned
  "Likes" off and "Messages" back on;
- `PATCH /settings/privacy` had the same flaw.

## Change

- **Backend:**
  - **Migration `20261110210000_follow_requests`:**
    - `enum FollowStatus { PENDING ACCEPTED }`;
    - `UserFollow.status` defaults to `ACCEPTED`, so existing follows stay accepted;
    - `NotificationPreference.followers` defaults to on.
  - **`FollowsService`:**
    - Following an account with "Public profile" off makes a `PENDING` request and tells them ("<name> asked to
      follow you", `referenceType: FOLLOW_REQUEST`).
    - Calling again cancels the request. On an accepted follow, it unfollows as before.
    - The answer adds `requested`.
    - Counts, lists and "follows you" count accepted follows only.
    - `GET /users/:id` adds `followRequested`.
  - **Request routes:** `GET /users/me/follow-requests`, `POST /users/me/follow-requests/:userId/accept`, and
    `DELETE /users/me/follow-requests/:userId`.
    - Accepting tells the requester ("<name> accepted your follow request", opening the profile).
    - Declining is silent.
  - **Who sees a private profile and its posts:** the person and their accepted followers
    (`FollowsService.canSeePrivate`). It applies to `UsersService.getUserById` and `PostsService.getPublicPosts`.
    Everyone else gets the base profile with `isPrivate: true`.
  - **`SettingsService.updatePrivacy`:**
    - changes only the fields sent;
    - turning "Public profile" on accepts every waiting request, silently.
  - **`NotificationsService.updatePreferences`:** changes only the fields sent. A new row starts from the defaults
    (TR-053).
    - `followers: false` mutes the three follow notices: `referenceType` `USER` and `FOLLOW_REQUEST` on SYSTEM
      notices.
    - Requests still wait in Follows → Requests.
  - **`GET /feed/following` (new `FollowingFeedService`):** what the people you follow (accepted, active accounts)
    posted, newest first, from any city:
    - published news posts;
    - events not cancelled;
    - stories not expired;
    - quests.

    Each kind is read up to `page × limit` rows and merged; the list stops at 300 items (`MAX_WINDOW`).
- **App:**
  - **`public-profile.tsx`:**
    - the button reads Follow, Requested (tap to cancel) or Following;
    - a private profile you cannot see shows a "This account is private" card;
    - the profile refetches on every visit, so it opens fully right after an accept.
  - **`follows.tsx`:** a Requests tab with Accept and Decline. It shows while there are requests, or when a "Follow
    request" notification opened the screen (`notifications.tsx`).
  - **`settings.tsx`:** a "New followers" switch under Notifications.
  - **Explore:**
    - a Following tab after News (`FollowingFeed.tsx`). Each row shows who posted it, the kind and when, and opens the
      item;
    - a news post opens in Explore's own post sheet over the Following tab;
    - signed out, the tab asks you to sign in;
    - the empty state is hidden while loading.
  - **Explore's tab row:** six tabs no longer fit the segmented control ("Follo", "Stori"). It is now
    `ScrollTabs`, a row of text tabs with an underline that scrolls sideways (`src/shared/d/ScrollTabs.tsx`).
  - **`story-viewer.tsx`:** a story from another city, opened from Following, is fetched by its id. Before, it
    looked only in the city's list.
  - **Fixed in passing:** `getFollows` read `hasMore` from the response, which the API client drops for paged
    answers, so Follows never offered "Load more" (plan 14). It now uses `meta.page < meta.totalPages`.

## How it was checked

- **Backend:** `tsc`, lint on the changed modules, unit tests 124, e2e tests 74.
  - **`follow-requests.e2e-spec.ts`** (new, 5 tests):
    - request, cancel, request again, accept, and the notices;
    - decline;
    - a private account's profile and posts open to accepted followers only;
    - going public accepts the waiting requests;
    - a privacy PATCH and a preferences PATCH keep the fields not sent;
    - the switch mutes follow notices;
    - the Following feed with 50 people followed: newest first, paging, and leaving out cancelled events,
      unpublished posts and expired stories.
  - **`follow.e2e-spec.ts`:** updated for the new answer.
- **Mobile:** `pnpm typecheck`.
- **Phone** (OnePlus, Expo Go, local backend), as `uit_gps1`, with `uit_hannah5` acting through the API:
  - **TR-053:** turning push off and on left the categories as they were (checked in the database).
  - **The switch:** "New followers" off muted follow notices.
  - **Requests:**
    - the account made private;
    - Hannah's request arrived as "Follow request";
    - tapping it opened Follows on Requests;
    - Accept made the row `ACCEPTED`, and Hannah was told.
  - **Profile button:**
    - Follow → Requested → tap to cancel → Follow on Hannah's private profile;
    - the private card showed before the accept, the full profile and posts after.
  - **Following tab:**
    - it listed Hannah's post;
    - the post opened over the tab, Back and the sheet's arrow both returned to Following, and the same post opened
      a second time.

    The first version opened the post through the `openPost` route parameter. That switched Explore to News and
    could not open the same post twice, so it now opens through a callback.
- **Clean-up:**
  - the follows both ways and the four follow notices were deleted;
  - Hannah's privacy row was removed (she had none);
  - `uit_gps1` is public again.

## Not checked

- Events, stories and quests in the Following tab on the phone (e2e covers the server; only a news post was walked).
- Decline and "going public accepts" on the phone (e2e covers them).
- Older builds against this server: following a private account sends a request, but the button still reads
  "Follow".
- iOS.
