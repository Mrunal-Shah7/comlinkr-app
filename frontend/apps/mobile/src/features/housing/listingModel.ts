import { router } from "expo-router";
import { useAuthStore } from "../../store/auth.store";
import { resolveApiAssetUrl } from "../../api/feed.api";
import { listingImageUrlList, type HousingListing } from "../../api/housing.api";
import { formatPrice } from "../../utils/currency";
import { appAlert } from "../../shared/ui/Dialogs";

// ── Data model ───────────────────────────────────────────────────────────────
export interface Listing {
  id: string;
  title: string;
  price: string;
  priceNote: string;
  deposit: string;
  type: string;
  beds: number;
  baths: number;
  sqft: string;
  floor: string;
  yearBuilt: string;
  location: string;
  address: string;
  available: string;
  petPolicy: string;
  parking: string;
  laundry: string;
  heating: string;
  cooling: string;
  utilities: string;
  leaseTerm: string;
  neighborhood: string;
  furnished: string;
  description: string;
  images: string[];
  verified: boolean;
  featured: boolean;
  isNew?: boolean;
  tags: string[];
  walkScore: number;
  transitInfo: string;
  landlord: {
    id: string;
    name: string;
    initials: string;
    /** Resolved absolute URL for publisher photo; empty → initials only */
    avatarUrl: string;
    since: string;
    rating: number;
    responseTime: string;
    color: string;
  };
  /** Current user owns this listing (from API or inferred). */
  isOwner?: boolean;
  /** Nest `status` e.g. AVAILABLE */
  listingStatus?: string;
}

export const USER_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Opens Messages with landlord user id + listing context so the API can start or resume a thread. */
export function navigateToLandlordChat(listing: Pick<Listing, "id" | "landlord" | "title">) {
  const { isAuthed, user } = useAuthStore.getState();
  if (!isAuthed) {
    appAlert("Sign in required", "Sign in to message the landlord.", [
      { text: "Not now", style: "cancel" },
      { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
    ]);
    return;
  }
  if (!user?.onboardingDone) {
    appAlert("Finish setting up your account", "Complete your profile to message the landlord.", [
      { text: "Not now", style: "cancel" },
      { text: "Continue Setup", onPress: () => router.push("/(auth)/onboarding" as any) },
    ]);
    return;
  }
  const landlordUserId = String(listing.landlord.id ?? "").trim();
  if (!landlordUserId) {
    appAlert("Can't send a message", "Landlord information is missing for this listing.");
    return;
  }
  const listingId = String(listing.id ?? "").trim();
  router.push({
    pathname: "/chat",
    params: {
      recipientId: landlordUserId,
      recipientName: listing.landlord.name,
      recipientType: "landlord",
      ...(listingId ? { contextId: listingId } : {}),
      contextName: listing.title,
      returnTo: "housing",
    },
  } as any);
}

/** ISO availability → "Immediate" (today or earlier) or a short date; free-text values pass through. */
/** Date-only strings ("2026-11-02") are calendar dates: parse them as local midnight. `new Date()` reads
 *  them as UTC midnight, which shows the previous day anywhere west of UTC. */
export function parseCalendarDate(raw: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(raw);
}

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 21 → "21st". */
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function formatFloor(floor: string | number | null | undefined): string {
  if (floor == null || floor === "") return "N/A";
  const n = Number(floor);
  if (!Number.isInteger(n)) return String(floor); // free text such as "Penthouse"
  return n === 0 ? "Ground Floor" : `${ordinal(n)} Floor`;
}

export function formatAvailability(raw: string | null | undefined): string {
  if (!raw) return "N/A";
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  // Availability / move-in are calendar dates (the API stores "YYYY-MM-DD" as UTC midnight): use the date
  // part only, so the day doesn't shift with the viewer's time zone.
  const d = parseCalendarDate(raw.slice(0, 10));
  if (Number.isNaN(d.getTime())) return raw;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d.getTime() <= today.getTime()) return "Immediate";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function toUiListing(l: HousingListing, _currentUserId?: string | null): Listing { // SPRINT-42: keep call compatibility while backend isOwner remains authoritative.
  const ext = l as HousingListing & {
    isOwner?: boolean;
    status?: string;
    owner?: { id: string; name?: string; username?: string; avatarUrl?: string | null };
    propertyType?: string;
    amenities?: string[];
    isFurnished?: boolean;
  };
  const landlordName =
    l.landlord?.name || ext.owner?.name || ext.owner?.username || "Property Owner";
  const initials = landlordName
    .split(" ")
    .map((p) => p[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const beds =
    typeof l.bedrooms === "number"
      ? l.bedrooms
      : typeof l.beds === "number"
        ? l.beds
        : 0;
  const baths =
    typeof l.bathrooms === "number"
      ? l.bathrooms
      : typeof l.baths === "number"
        ? l.baths
        : 0;
  const rawOwnerAvatar =
    ext.owner?.avatarUrl ?? (l.landlord as { avatarUrl?: string | null } | undefined)?.avatarUrl;
  const landlordAvatarUrl = resolveApiAssetUrl(rawOwnerAvatar ?? undefined);
  return {
    id: l.id,
    title: l.title,
    price:
      typeof l.price === "number"
        ? formatPrice(l.price, (l.currency ?? "USD").toUpperCase())
        : formatPrice(0, "USD"),
    priceNote: "/ month",
    deposit: l.deposit ? formatPrice(l.deposit, (l.currency ?? "USD").toUpperCase()) : "N/A",
    type: l.type || formatPropertyTypeLabel(String(ext.propertyType || "APARTMENT")),
    beds,
    baths,
    sqft: String(l.sqft ?? 0),
    floor: formatFloor(l.floor),
    yearBuilt: l.yearBuilt ? String(l.yearBuilt) : "N/A",
    location: l.location || l.neighborhood || "Unknown",
    address: l.address || l.location || "Unknown",
    available: formatAvailability(l.availableDate || l.available), // SPRINT-42: prefer the canonical availability field.
    petPolicy: l.petPolicy || "N/A",
    parking: l.parking || "N/A",
    laundry: l.laundry || "N/A",
    heating: l.heating || "N/A",
    cooling: l.cooling || "N/A",
    utilities: Array.isArray(l.utilities) ? l.utilities.join(", ") : l.utilities || "N/A", // SPRINT-42: support the canonical string utilities field.
    leaseTerm: l.leaseTerm || "N/A",
    neighborhood: l.neighborhood || l.location || "N/A",
    furnished:
      ext.isFurnished === true || l.furnished === true ? "Furnished" : "Unfurnished",
    description: l.description || "",
    images: listingImageUrlList(l.images),
    verified: l.isVerified ?? l.verified ?? false, // SPRINT-42: prefer canonical backend verification.
    featured: l.isFeatured ?? l.featured ?? false, // SPRINT-42: prefer canonical backend featured state.
    isNew: l.isNew,
    tags:
      (Array.isArray(l.tags) && l.tags.length > 0
        ? l.tags
        : Array.isArray(ext.amenities) && ext.amenities.length > 0
          ? ext.amenities
          : []) as string[],
    walkScore: l.walkScore ?? 0,
    transitInfo: l.transitInfo || "N/A",
    landlord: {
      id: l.landlord?.id ?? ext.owner?.id ?? "",
      name: landlordName,
      initials: initials || "PO",
      avatarUrl: landlordAvatarUrl,
      since: l.landlord?.since || "2024",
      rating: l.landlord?.rating ?? 4.5,
      responseTime: l.landlord?.responseTime || "N/A",
      color: l.landlord?.color || "#1A6BAE",
    },
    isOwner: ext.isOwner === true, // SPRINT-42: remove client identity-comparison ownership inference.
    listingStatus: ext.status,
  };
}

export const FILTERS = ["All", "Apartment", "House", "Studio"];

export function propertyFilterLabelToApi(label: string): string | undefined {
  const m: Record<string, string> = {
    Apartment: "APARTMENT",
    House: "HOUSE",
    Studio: "STUDIO",
    Room: "ROOM",
  };
  return m[label];
}

export function formatPropertyTypeLabel(t: string): string {
  const u = t.toUpperCase();
  if (u === "APARTMENT") return "Apartment";
  if (u === "HOUSE") return "House";
  if (u === "STUDIO") return "Studio";
  if (u === "ROOM") return "Room";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
