import { useAuthStore } from "../../store/auth.store";
import type { UserBadge, VerificationStatus } from "../../store/auth.store";

/**
 * Central permission-checking hook.
 * All permission decisions in the app go through here.
 * Reads from auth store — single source of truth.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const verificationStatus = user?.verificationStatus ?? {
    landlord: "none" as VerificationStatus,
    restaurant_owner: "none" as VerificationStatus,
    agency: "none" as VerificationStatus,
    local_reviewer: "none" as VerificationStatus,
  };

  const badges = user?.badges ?? [];

  // Badge status helpers
  const getBadgeStatus = (badge: UserBadge): VerificationStatus =>
    verificationStatus[badge] ?? "none";

  const hasBadge = (badge: UserBadge): boolean => badges.includes(badge);

  const isVerified = (badge: UserBadge): boolean =>
    getBadgeStatus(badge) === "verified";

  const isPending = (badge: UserBadge): boolean =>
    getBadgeStatus(badge) === "pending";

  const isRejected = (badge: UserBadge): boolean =>
    getBadgeStatus(badge) === "rejected";

  // ── Role check (needed early for capability flags) ──────────────────────────
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // ── Post-type capability flags ──────────────────────────────────────────────
  const isLoggedIn = !!user?.id;

  /** Any signed-in user may list housing; landlord/agency badge adds trust on the listing */
  const canPostListing = isLoggedIn;

  /** Any signed-in user may list a restaurant; restaurant_owner badge adds trust */
  const canPostRestaurant = isLoggedIn;

  /** Can post a community restaurant review — local_reviewer badge OR owner OR admin */
  const canPostRestaurantReview = isAdmin || isVerified("restaurant_owner") || isVerified("local_reviewer");

  // ── Verified badge holders ──────────────────────────────────────────────────
  const isVerifiedLandlord = isVerified("landlord");
  const isVerifiedAgency = isVerified("agency");
  const isVerifiedRestaurantOwner = isVerified("restaurant_owner");
  const isVerifiedLocalReviewer = isVerified("local_reviewer");

  /** User holds any verified badge — shows verified indicator on profile */
  const hasAnyVerifiedBadge =
    isVerifiedLandlord || isVerifiedAgency || isVerifiedRestaurantOwner || isVerifiedLocalReviewer;

  // ── Pending application states ──────────────────────────────────────────────
  const isLandlordPending = isPending("landlord");
  const isAgencyPending = isPending("agency");
  const isRestaurantPending = isPending("restaurant_owner");
  const isLocalReviewerPending = isPending("local_reviewer");

  // ── Rejection states ────────────────────────────────────────────────────────
  const isLandlordRejected = isRejected("landlord");
  const isAgencyRejected = isRejected("agency");
  const isRestaurantRejected = isRejected("restaurant_owner");
  const isLocalReviewerRejected = isRejected("local_reviewer");

  // ── Listing card lock status (for create-post grid) — unlocked when signed in ─
  const listingLockStatus: "unlocked" | "pending" | "rejected" | "locked" =
    isLoggedIn ? "unlocked" : "locked";

  const restaurantLockStatus: "unlocked" | "pending" | "rejected" | "locked" =
    isLoggedIn ? "unlocked" : "locked";

  const localReviewerLockStatus: "unlocked" | "pending" | "rejected" | "locked" = canPostRestaurantReview
    ? "unlocked"
    : isLocalReviewerPending
    ? "pending"
    : isLocalReviewerRejected
    ? "rejected"
    : "locked";

  return {
    // Core capability flags
    canPostListing,
    canPostRestaurant,
    canPostRestaurantReview,
    // Verified badge flags
    isVerifiedLandlord,
    isVerifiedAgency,
    isVerifiedRestaurantOwner,
    isVerifiedLocalReviewer,
    hasAnyVerifiedBadge,
    // Pending states
    isLandlordPending,
    isAgencyPending,
    isRestaurantPending,
    isLocalReviewerPending,
    // Rejected states
    isLandlordRejected,
    isAgencyRejected,
    isRestaurantRejected,
    isLocalReviewerRejected,
    // Lock status for create-post grid
    listingLockStatus,
    restaurantLockStatus,
    localReviewerLockStatus,
    // Helpers
    getBadgeStatus,
    hasBadge,
    isVerified,
    isPending,
    isRejected,
    isAdmin,
    // Raw values
    verificationStatus,
    badges,
  };
}
