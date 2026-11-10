# 14. Follow

**Status: Built (2026-11-10) on `feature/follow`; [build note](../build/2026-11-10-follow.md).** Triage [TR-029](../triage.md), from the
walkthrough (S-06). The owner decided in chat to build Follow rather than remove it.

## Problem

A public profile has a Follow button, but the backend has no follow model or route: `POST /users/:id/follow` answers
404 "Cannot POST". The walkthrough hid the button (`FOLLOW_ENABLED = false`). The app already has the client calls
(`toggleFollow`, `getMyFollowers`, `getMyFollowing`) and the profile fields `followedByMe` and `followingMe`.

## What will change

- **Model:** `UserFollow` (`followerId`, `followingId`, `createdAt`), unique per pair, indexed both ways, deleted with
  either user.
- **API** (the paths the app already calls):
  - `POST /users/:id/follow` toggles: follows, or unfollows if already following. Answers
    `{ following, followersCount }`.
    - Following yourself: 400.
    - A user who is inactive, deleted, or blocked either way: 404, as the profile does.
  - `GET /users/me/followers` and `GET /users/me/following`, paginated, newest first. Each row has the person's name,
    username, avatar, city, verified mark and `followedByMe`. Inactive, deleted and blocked users are left out.
  - The profile (`GET /users/:id`, `/users/me`) adds `followedByMe`, `followingMe`, and `followersCount` and
    `followingCount` in `stats`. The counts leave out inactive and deleted users.
- **Blocking** removes the follows between the two people, both ways.
- **Notification:** "New follower", "<name> started following you", to the person followed. Tapping it opens the
  follower's profile.
  - At most one a week per follower, so following and unfollowing repeatedly does not flood the person.
  - It is a `SYSTEM` notification, which is always on. The preferences have no follower switch.
- **App:**
  - The Follow button returns on public profiles: "Follow", then "Following" with a tick. Tapping "Following" unfollows.
  - Under the name: "N followers · M following".
  - On your own profile, the same line opens a new Follows screen with two tabs, Followers and Following. Each row
    opens that person's profile.
  - Other people's follower lists are not shown, only the counts.

## What will not change

- **The feed.** Following someone does not change what the feed shows. That is a separate product decision for the
  owner.
- **Approval.** No approval or private accounts: anyone can follow anyone they can see.
- **The old route.** The `community.api` `toggleFollow` path (`/community/members/:id/follow`) is not used by any
  screen and is left alone.

## How it will be checked

- e2e:
  - follow, then unfollow, with the counts;
  - following yourself is refused;
  - following a blocked user, or one who blocked you, is refused;
  - blocking removes the follows both ways;
  - both lists, and `followedByMe` in them;
  - the profile fields;
  - one notification for follow, unfollow, follow.
- Phone, as a test account:
  - follow another test account from their profile;
  - the counts on both profiles;
  - the follower's notification opens the profile (as the other account through the API);
  - the Follows screen, both tabs;
  - unfollow, and the counts go back.
