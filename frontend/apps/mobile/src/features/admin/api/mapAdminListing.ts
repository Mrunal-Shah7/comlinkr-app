// SPRINT-41: Map backend AdminHousingListingRow → screen Listing (field-by-field).
// SPRINT-41: Do NOT rename fields in the API layer — mapping belongs here only.
import type { Listing, UserProfile } from "@shared/types/api"; // SPRINT-41:
import type { AdminHousingListingRow } from "../../../api/admin.api"; // SPRINT-41:

/**
 * // SPRINT-41: Field mapping:
 * // SPRINT-41: - id            ← row.id
 * // SPRINT-41: - title         ← row.title
 * // SPRINT-41: - description   ← row.description ?? ""
 * // SPRINT-41: - category      ← always "housing"
 * // SPRINT-41: - status        ← AVAILABLE→active; RENTED→inactive; UNLISTED→inactive
 * // SPRINT-41: - images        ← row.images ?? []
 * // SPRINT-41: - price         ← row.price
 * // SPRINT-41: - currency      ← row.currency
 * // SPRINT-41: - location      ← { address, city, state, country, lat: latitude, lng: longitude }
 * // SPRINT-41: - authorId      ← row.owner?.id ?? ""
 * // SPRINT-41: - author        ← derived UserProfile-ish from owner (username/fullName)
 * // SPRINT-41: - viewCount     ← row.viewCount ?? 0
 * // SPRINT-41: - favoriteCount ← row._count?.interests ?? 0
 * // SPRINT-41: - createdAt     ← row.createdAt
 * // SPRINT-41: - updatedAt     ← row.updatedAt ?? row.createdAt
 */
export function mapAdminHousingListingToScreen(row: AdminHousingListingRow): Listing { // SPRINT-41:
  // SPRINT-41: status AVAILABLE→active; RENTED and UNLISTED→inactive (UNLISTED conceptually unlisted)
  let status: Listing["status"] = "inactive"; // SPRINT-41:
  if (row.status === "AVAILABLE") { // SPRINT-41:
    status = "active"; // SPRINT-41:
  } else if (row.status === "RENTED" || row.status === "UNLISTED") { // SPRINT-41:
    status = "inactive"; // SPRINT-41:
  } // SPRINT-41:

  const owner = row.owner; // SPRINT-41:
  const fullName = owner?.fullName ?? ""; // SPRINT-41:
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean); // SPRINT-41:
  const author: UserProfile | undefined = owner // SPRINT-41:
    ? { // SPRINT-41:
        id: owner.id, // SPRINT-41:
        email: "", // SPRINT-41:
        username: owner.username, // SPRINT-41:
        firstName: nameParts[0] ?? owner.username, // SPRINT-41:
        lastName: nameParts.slice(1).join(" ") || "", // SPRINT-41:
        role: "USER", // SPRINT-41:
        isVerified: false, // SPRINT-41:
        isActive: true, // SPRINT-41:
        createdAt: row.createdAt, // SPRINT-41:
        updatedAt: row.updatedAt ?? row.createdAt, // SPRINT-41:
      } // SPRINT-41:
    : undefined; // SPRINT-41:

  return { // SPRINT-41:
    id: row.id, // SPRINT-41:
    title: row.title, // SPRINT-41:
    description: row.description ?? "", // SPRINT-41:
    category: "housing", // SPRINT-41:
    status, // SPRINT-41:
    images: row.images ?? [], // SPRINT-41:
    price: row.price, // SPRINT-41:
    currency: row.currency, // SPRINT-41:
    location: { // SPRINT-41:
      address: row.address, // SPRINT-41:
      city: row.city, // SPRINT-41:
      state: row.state, // SPRINT-41:
      country: row.country, // SPRINT-41:
      lat: row.latitude, // SPRINT-41:
      lng: row.longitude, // SPRINT-41:
    }, // SPRINT-41:
    authorId: owner?.id ?? "", // SPRINT-41:
    author, // SPRINT-41:
    viewCount: row.viewCount ?? 0, // SPRINT-41:
    favoriteCount: row._count?.interests ?? 0, // SPRINT-41:
    createdAt: row.createdAt, // SPRINT-41:
    updatedAt: row.updatedAt ?? row.createdAt, // SPRINT-41:
    // SPRINT-41: admin-only extras (not on shared Listing contract)
    propertyType: row.propertyType, // SPRINT-41:
    backendStatus: row.status, // SPRINT-41: AVAILABLE | RENTED | UNLISTED
  } as Listing & { propertyType?: string; backendStatus?: string }; // SPRINT-41:
} // SPRINT-41:
