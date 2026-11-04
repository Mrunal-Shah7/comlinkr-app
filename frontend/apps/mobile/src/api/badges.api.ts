/**
 * Badges / Verification API — matches Nest `BadgesController`.
 *
 * Apply uses `multipart/form-data` with field `documents` (1–5 files, JPEG/PNG/PDF, max 10MB each).
 */

import { api, postFormData } from "./client";

// ─── Types (Nest / Prisma) ───────────────────────────────────────────────────

export type ApiBadgeType = "LANDLORD" | "RESTAURANT_OWNER" | "AGENCY" | "LOCAL_REVIEWER";

export type BadgeApplicationStatusApi = "PENDING" | "APPROVED" | "REJECTED";

export type MyBadgeStatusState = "NOT_APPLIED" | "PENDING" | "APPROVED" | "REJECTED";

export interface BadgeTypeInfo {
  type: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  unlocks: string[];
  requirements: string[];
  requiredFields: string[];
  requiredDocuments: string[];
}

export interface MyBadgeStatusRow {
  badgeType: ApiBadgeType;
  status: MyBadgeStatusState;
  badge: { id: string; badgeType: ApiBadgeType; grantedAt: string } | null;
  latestApplication: {
    id: string;
    badgeType: ApiBadgeType;
    status: BadgeApplicationStatusApi;
    createdAt: string;
  } | null;
  grantedAt: string | null;
}

export interface BadgeApplicationDetail {
  id: string;
  badgeType: ApiBadgeType;
  status: BadgeApplicationStatusApi;
  applicant?: {
    id: string;
    username: string;
    fullName: string;
    email: string;
  } | null;
  fullLegalName: string;
  businessPhone: string;
  businessEmail?: string | null;
  ownershipType?: string | null;
  propertyAddress?: string | null;
  restaurantName?: string | null;
  cuisineType?: string | null;
  restaurantAddress?: string | null;
  agencyName?: string | null;
  agencyLicense?: string | null;
  propertiesManaged?: number | null;
  companyWebsite?: string | null;
  neighborhoodArea?: string | null;
  reviewerBio?: string | null;
  documents: Array<{ id: string; documentType: string; fileUrl?: string | null; createdAt: string }>;
  createdAt: string;
  adminNotes?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: { id: string; name: string } | null;
}

/** Alias for admin API / legacy imports — same shape as `BadgeApplicationDetail`. */
export type BadgeApplication = BadgeApplicationDetail;

/** Mobile profile keys used in routes / UI */
export type UserBadgeKey = "landlord" | "restaurant_owner" | "agency" | "local_reviewer";

export function userBadgeKeyToApi(key: UserBadgeKey): ApiBadgeType {
  const m: Record<UserBadgeKey, ApiBadgeType> = {
    landlord: "LANDLORD",
    restaurant_owner: "RESTAURANT_OWNER",
    agency: "AGENCY",
    local_reviewer: "LOCAL_REVIEWER",
  };
  return m[key];
}

export function apiBadgeTypeToUserKey(t: ApiBadgeType): UserBadgeKey {
  const m: Record<ApiBadgeType, UserBadgeKey> = {
    LANDLORD: "landlord",
    RESTAURANT_OWNER: "restaurant_owner",
    AGENCY: "agency",
    LOCAL_REVIEWER: "local_reviewer",
  };
  return m[t];
}

export interface SubmitBadgeApplicationFields {
  badgeType: ApiBadgeType;
  fullLegalName: string;
  businessPhone: string;
  businessEmail?: string;
  ownershipType?: "OWN" | "MANAGE";
  propertyAddress?: string;
  restaurantName?: string;
  cuisineType?: string;
  restaurantAddress?: string;
  agencyName?: string;
  agencyLicense?: string;
  propertiesManaged?: number;
  companyWebsite?: string;
  neighborhoodArea?: string;
  reviewerBio?: string;
}

export interface PickedDocument {
  uri: string;
  name: string;
  type: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function getBadgeTypes(): Promise<BadgeTypeInfo[]> {
  return api.get<BadgeTypeInfo[]>("/badges/types");
}

export function getMyBadgeStatus(): Promise<MyBadgeStatusRow[]> {
  return api.get<MyBadgeStatusRow[]>("/badges/my-status");
}

export function listMyBadgeApplications(): Promise<BadgeApplicationDetail[]> {
  return api.get<BadgeApplicationDetail[]>("/badges/my-applications");
}

export function getBadgeApplicationById(id: string): Promise<BadgeApplicationDetail> {
  return api.get<BadgeApplicationDetail>(`/badges/applications/${id}`);
}

export function withdrawBadgeApplication(id: string): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/badges/my-applications/${id}`);
}

/**
 * Multipart apply — append every scalar field that is set; append each file as `documents`.
 * File order must match backend expectations (index 0 = government ID, then type-specific docs).
 */
export function submitBadgeApplication(
  fields: SubmitBadgeApplicationFields,
  documents: PickedDocument[]
): Promise<BadgeApplicationDetail> {
  if (!documents.length) {
    throw new Error("At least one document is required.");
  }
  const fd = new FormData();
  fd.append("badgeType", fields.badgeType);
  fd.append("fullLegalName", fields.fullLegalName);
  fd.append("businessPhone", fields.businessPhone);
  if (fields.businessEmail) fd.append("businessEmail", fields.businessEmail);
  if (fields.ownershipType) fd.append("ownershipType", fields.ownershipType);
  if (fields.propertyAddress) fd.append("propertyAddress", fields.propertyAddress);
  if (fields.restaurantName) fd.append("restaurantName", fields.restaurantName);
  if (fields.cuisineType) fd.append("cuisineType", fields.cuisineType);
  if (fields.restaurantAddress) fd.append("restaurantAddress", fields.restaurantAddress);
  if (fields.agencyName) fd.append("agencyName", fields.agencyName);
  if (fields.agencyLicense) fd.append("agencyLicense", fields.agencyLicense);
  if (fields.propertiesManaged != null) fd.append("propertiesManaged", String(fields.propertiesManaged));
  if (fields.companyWebsite) fd.append("companyWebsite", fields.companyWebsite);
  if (fields.neighborhoodArea) fd.append("neighborhoodArea", fields.neighborhoodArea);
  if (fields.reviewerBio) fd.append("reviewerBio", fields.reviewerBio);

  for (const doc of documents) {
    // React Native FormData file part
    fd.append("documents", { uri: doc.uri, name: doc.name, type: doc.type } as unknown as never);
  }

  return postFormData<BadgeApplicationDetail>("/badges/apply", fd);
}
