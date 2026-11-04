# Comlinkr — Posting Authorization Model

This document describes who can post what on Comlinkr, how verification badges affect post visibility and trust, and where the relevant code lives.

---

## 1. Core Principle — Open Posting with Verified Boost

Comlinkr uses an **open posting model**: anyone with an account can post any content type, including housing listings and restaurant posts. There are no hard gates.

Badge verification provides a **trust and visibility boost**, not exclusive access. This design is intentional:

- Maximizes early-stage user growth — no one is turned away from posting.
- Builds trust progressively — verified posts are visually distinguished.
- Encourages badge applications organically — users see the boost, want it, apply.

---

## 2. Post Types & Who Can Post

| Post Type | Who Can Post | Badge Effect |
|---|---|---|
| **News** | Everyone | None — no badge relevant |
| **Event** | Everyone | None — no badge relevant |
| **Story** | Everyone | None — no badge relevant |
| **Challenge** | Everyone | None — no badge relevant |
| **Housing Listing** | Everyone | `landlord` badge → `verified: true` on post, trust badge shown, priority placement |
| **Restaurant (Owner post)** | Everyone | `restaurant_owner` badge → `verified: true`, trust badge shown, priority placement |
| **Restaurant (Community review)** | Everyone | `local_reviewer` badge → `verified: true`, trusted reviewer indicator shown |

---

## 3. The `verified` Field on Posts

Every `UserPost` in `posts.store.ts` has a `verified: boolean` field:

```ts
export interface UserPost {
  // ...
  verified: boolean; // true = posted by a badge-verified user
}
```

In `handlePost` inside `create-post.tsx`, `verified` is set at submission time based on whether the posting user has the relevant active badge:

```ts
addPost({
  // ...
  verified:
    type.id === "listing"
      ? canPostListing                  // user has active landlord badge
      : type.id === "restaurant"
      ? restaurantPostMode === "owner"
        ? canPostRestaurant             // restaurant_owner badge
        : canPostRestaurantReview       // local_reviewer badge
      : false,
});
```

This means: the `verified` flag is **set at post time** and reflects the user's badge status at that moment. If a user later gets verified, old posts are not retroactively updated (by design — they were posted without verification).

---

## 4. Soft Boost Banner (UX)

For non-verified users in the listing and restaurant forms, a **soft green banner** is shown instead of a lock screen:

```
✓ Anyone can list a property — Verified Property Host badge holders
  get a trust indicator and higher visibility. [Get verified]
```

The banner:
- Never blocks posting
- Links directly to the relevant badge application (`/apply-badge?badgeType=landlord` etc.)
- Uses green (`#F0FDF4` / `#15803D`) to feel encouraging, not restrictive

---

## 5. Badge Benefits (Unlocks)

### Verified Property Host (`landlord`)
- Verified trust badge on all housing listings
- Priority placement in housing search results
- Access to My Listings dashboard
- Direct tenant messaging

### Verified Restaurant Owner (`restaurant_owner`)
- Verified Business badge on restaurant posts
- Priority placement in food search results
- Ability to reply to community reviews
- Manage menu & hours
- Access to My Restaurants dashboard

### Local Reviewer (`local_reviewer`)
- Trusted reviewer badge on profile and all reviews
- Priority placement in community review search results
- Higher visibility for restaurant recommendations

### Verified Agency (`agency`)
- Unlimited listings
- Agency branding on all listings
- Priority search placement
- Multi-agent team support
- Agency Dashboard

---

## 6. Files That Control Posting Authorization

| File | What it controls |
|---|---|
| `app/create-post.tsx` | `canPost` logic (content checks only, no badge gates); soft boost banners; `verified` flag set on submit |
| `src/shared/hooks/usePermissions.ts` | Computes `canPostListing`, `canPostRestaurant`, `canPostRestaurantReview` from badge status — used for soft banner display and `verified` flag |
| `src/store/posts.store.ts` | `UserPost.verified` field — stores whether a post was made by a verified user |
| `app/apply-badge.tsx` | `BADGE_CONFIG.unlocks` — describes benefits shown to users on the badge application flow |

---

## 7. What Was Removed

The previous model had a **hard lock screen** for housing listings and restaurant posts. It was removed because:

- Early users could not engage with core content types without first going through verification.
- This created friction at the exact moment when user acquisition is most important.
- The verification badge system works better as an incentive than as a gate.

Removed from `create-post.tsx`:
- `isLockedRestaurant`, `isLockedListing`, `isLocked` variables
- `lockedBadge`, `lockedStatus` variables
- The `if (isLocked) { return <lock screen>; }` block
- `canPostListing &&` and `canPostRestaurant &&` from `canPost` conditions

---

## 8. Future Considerations

- **Feed/search ranking**: when search and ranking are implemented server-side, `verified: true` posts should receive ranking weight.
- **Visual trust indicators**: housing and food screens can show a small verified shield icon on cards where `post.verified === true` (already supported by the `verified` field — just needs UI implementation in those screens).
- **Retroactive verification**: if desired, a future migration could update older posts to `verified: true` when the posting user's badge is approved. Not implemented currently.
