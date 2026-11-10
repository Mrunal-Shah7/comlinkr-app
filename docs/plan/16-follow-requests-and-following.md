# 16. Follow requests, the Following tab, and the "New follower" switch

**Status: Built on `feature/follow-requests`, not merged; [build note](../build/2026-11-10-follow-requests.md).** Triage
[TR-049, TR-050, TR-051](../triage.md), from the owner's answers on PR 34, and TR-053 (found while planning). The
owner decided on 2026-11-10: private accounts approve followers; the people you follow get their own tab; "New
follower" gets a setting. The details below were chosen by Claude; the owner can change any of them in review.

## Problem

- Plan 14's Follow is one-way with no approval, even for a private profile (Settings → Privacy → "Public profile"
  off). A private profile shows only its base to everyone, followers included.
- Following someone changes nothing you see: there is no place for their posts.
- "New follower" cannot be turned off.
- TR-053: saving one notification switch resets the others. `PATCH /notifications/preferences` writes every
  default along with the field sent, so turning push off turns "Likes" off and "Messages" back on; saving the
  categories turns push back on. `PATCH /settings/privacy` has the same flaw (the app happens to send all three
  fields).

## What will change

- **Model:** `UserFollow.status` (`PENDING` or `ACCEPTED`, default `ACCEPTED`, so existing follows stay accepted).
  `NotificationPreference.followers` (default on).
- **A private account** is one with "Public profile" off. Following it:
  - `POST /users/:id/follow` with no row makes a request (`PENDING`) and tells them ("Follow request"); again
    cancels the request; on an accepted follow it unfollows, as before. The answer adds `requested`.
  - `GET /users/me/follow-requests`: the requests to you, newest first.
  - `POST /users/me/follow-requests/:userId/accept`: the requester now follows you and is told ("<name> accepted
    your follow request", opening your profile).
  - `DELETE /users/me/follow-requests/:userId`: declines, silently.
  - Turning "Public profile" on accepts every pending request, silently. Turning it off keeps existing followers.
  - Counts, lists and "follows you" only count accepted follows. `GET /users/:id` adds `followRequested`.
- **Who sees a private profile and its posts:** the person, and their accepted followers. Everyone else sees the
  base, as today. The same rule serves the profile, its posts list and the Following tab.
- **The Following tab** in Explore, after News: `GET /feed/following` lists, newest first, what the people you
  follow (accepted, active accounts) posted: published news posts, events not cancelled, stories not expired, and
  quests. Each row shows who posted it and opens the item. Signed out, it asks you to sign in. The empty state says
  to follow people, and is hidden while loading.
- **The "New followers" switch** (Settings → Notifications) mutes "New follower", "Follow request" and "accepted
  your follow request". Requests still wait in Follows → Requests, so a private account can always find them.
- **TR-053:** both PATCH routes change only the fields sent; a new row starts from the defaults.
- **App:**
  - the profile's button: Follow, Requested (tap to cancel), Following;
  - Follows gets a Requests tab with Accept and Decline when there are requests; a "Follow request" notification
    opens it;
  - the Following tab and the switch.

## What will not change

- Posts by private accounts in the city's lists (news, events, stories, quests): they stay as they are today.
- Older builds: tapping Follow on a private account sends a request, but the button still reads "Follow" (they
  only know `following`). Tapping again cancels the request.
- Blocking still removes follows both ways, requests included.

## How it will be checked

- Unit: a preference PATCH keeps the fields not sent; the follower switch mutes the three notices.
- e2e: request, cancel, accept, decline; going public accepts; counts and lists ignore requests; a private profile
  opens to an accepted follower only; the Following feed's content and paging, with about 50 people followed.
- Phone, as `uit_gps1`: change push and check the categories in the database; make the account private;
  `uit_hannah5` requests through the API; accept on the phone; the profile button states; the Following tab;
  then put the account back to public.
