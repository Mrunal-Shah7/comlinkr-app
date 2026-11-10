import { Colors } from "../../theme/colors";
import { resolveApiAssetUrl } from "../../api/feed.api";
import { listingImageUrlList } from "../../api/housing.api";
import { formatAvailability, parseCalendarDate } from "./listingModel";
import { type RoommateConnectionStatusApi, type RoommateListing, type SharedSpaceListing } from "../../api/roommates.api";

// ══════════════════════════════════════════════════════════════════════════════
// ROOMMATE MATCHING
// ══════════════════════════════════════════════════════════════════════════════

// ── Tag display maps ─────────────────────────────────────────────────────────
export const VIBE_DISPLAY: Record<string, { emoji: string; icon: string; label: string }> = {
  coffee:    { emoji: "☕", icon: "cafe-outline",           label: "Coffee Culture" },
  art:       { emoji: "🎨", icon: "color-palette-outline",  label: "Art & Museums" },
  fitness:   { emoji: "💪", icon: "barbell-outline",        label: "Fitness & Health" },
  nightlife: { emoji: "🌙", icon: "moon-outline",           label: "Nightlife" },
  family:    { emoji: "👨‍👩‍👧", icon: "people-outline",    label: "Family Life" },
  wellness:  { emoji: "🧘", icon: "leaf-outline",           label: "Wellness" },
  foodie:    { emoji: "🍕", icon: "restaurant-outline",     label: "Foodie" },
  outdoor:   { emoji: "🏕️", icon: "trail-sign-outline",   label: "Outdoor" },
  tech:      { emoji: "💡", icon: "hardware-chip-outline",  label: "Tech & Innovation" },
  music:     { emoji: "🎵", icon: "musical-notes-outline",  label: "Music & Events" },
  sports:    { emoji: "⚽", icon: "football-outline",       label: "Sports & Games" },
  volunteer: { emoji: "🤝", icon: "hand-left-outline",      label: "Volunteering" },
};

export const COMMUNITY_DISPLAY: Record<string, { emoji: string; label: string }> = {
  // Cultural & Heritage (regional)
  "south-asian":       { emoji: "🇮🇳", label: "South Asian" },
  "east-asian":        { emoji: "🌏", label: "East Asian" },
  "southeast-asian":   { emoji: "🌺", label: "Southeast Asian" },
  "latin-american":    { emoji: "🌎", label: "Latin American" },
  "african":           { emoji: "🌍", label: "African & Afro-Diaspora" },
  "caribbean":         { emoji: "🌊", label: "Caribbean" },
  "middle-eastern":    { emoji: "🕌", label: "Middle Eastern" },
  "european":          { emoji: "🇪🇺", label: "European" },
  "pacific-islander":  { emoji: "🏝️", label: "Pacific Islander" },
  "indigenous":        { emoji: "🪶", label: "Indigenous" },
  "south-american":    { emoji: "🦜", label: "South American" },
  "central-asian":     { emoji: "🐎", label: "Central Asian" },
  // National & Diaspora
  "mexican":           { emoji: "🇲🇽", label: "Mexican" },
  "brazilian":         { emoji: "🇧🇷", label: "Brazilian" },
  "colombian":         { emoji: "🇨🇴", label: "Colombian" },
  "cuban":             { emoji: "🇨🇺", label: "Cuban" },
  "dominican":         { emoji: "🇩🇴", label: "Dominican" },
  "puerto-rican":      { emoji: "🇵🇷", label: "Puerto Rican" },
  "venezuelan":        { emoji: "🇻🇪", label: "Venezuelan" },
  "peruvian":          { emoji: "🇵🇪", label: "Peruvian" },
  "indian":            { emoji: "🇮🇳", label: "Indian" },
  "pakistani":         { emoji: "🇵🇰", label: "Pakistani" },
  "bangladeshi":       { emoji: "🇧🇩", label: "Bangladeshi" },
  "sri-lankan":        { emoji: "🇱🇰", label: "Sri Lankan" },
  "nepali":            { emoji: "🇳🇵", label: "Nepali" },
  "chinese":           { emoji: "🇨🇳", label: "Chinese" },
  "korean":            { emoji: "🇰🇷", label: "Korean" },
  "japanese":          { emoji: "🇯🇵", label: "Japanese" },
  "filipino":          { emoji: "🇵🇭", label: "Filipino" },
  "vietnamese":        { emoji: "🇻🇳", label: "Vietnamese" },
  "thai":              { emoji: "🇹🇭", label: "Thai" },
  "indonesian":        { emoji: "🇮🇩", label: "Indonesian" },
  "british":           { emoji: "🇬🇧", label: "British" },
  "irish":             { emoji: "🇮🇪", label: "Irish" },
  "spanish":           { emoji: "🇪🇸", label: "Spanish" },
  "french":            { emoji: "🇫🇷", label: "French" },
  "italian":           { emoji: "🇮🇹", label: "Italian" },
  "greek":             { emoji: "🇬🇷", label: "Greek" },
  "portuguese":        { emoji: "🇵🇹", label: "Portuguese" },
  "polish":            { emoji: "🇵🇱", label: "Polish" },
  "ukrainian":         { emoji: "🇺🇦", label: "Ukrainian" },
  "russian":           { emoji: "🇷🇺", label: "Russian" },
  "german":            { emoji: "🇩🇪", label: "German" },
  "romanian":          { emoji: "🇷🇴", label: "Romanian" },
  "nigerian":          { emoji: "🇳🇬", label: "Nigerian" },
  "ghanaian":          { emoji: "🇬🇭", label: "Ghanaian" },
  "kenyan":            { emoji: "🇰🇪", label: "Kenyan" },
  "ethiopian":         { emoji: "🇪🇹", label: "Ethiopian" },
  "somali":            { emoji: "🇸🇴", label: "Somali" },
  "zimbabwean":        { emoji: "🇿🇼", label: "Zimbabwean" },
  "south-african":     { emoji: "🇿🇦", label: "South African" },
  "jamaican":          { emoji: "🇯🇲", label: "Jamaican" },
  "trinidadian":       { emoji: "🇹🇹", label: "Trinidadian" },
  "haitian":           { emoji: "🇭🇹", label: "Haitian" },
  "egyptian":          { emoji: "🇪🇬", label: "Egyptian" },
  "moroccan":          { emoji: "🇲🇦", label: "Moroccan" },
  "lebanese":          { emoji: "🇱🇧", label: "Lebanese" },
  "iranian":           { emoji: "🇮🇷", label: "Iranian / Persian" },
  "turkish":           { emoji: "🇹🇷", label: "Turkish" },
  "afghan":            { emoji: "🇦🇫", label: "Afghan" },
  "syrian":            { emoji: "🇸🇾", label: "Syrian" },
  "arab":              { emoji: "🕌", label: "Arab" },
  // Lifestyle
  "expat":             { emoji: "✈️", label: "Expat" },
  "digital-nomad":     { emoji: "💻", label: "Digital Nomad" },
  "student":           { emoji: "🎓", label: "Student" },
  "young-professional":{ emoji: "💼", label: "Young Professional" },
  "new-in-town":       { emoji: "🗺️", label: "New in Town" },
  "retiree":           { emoji: "🌅", label: "Retiree & Seniors" },
  "parent":            { emoji: "👨‍👩‍👧", label: "Parents & Families" },
  "pet-owner":         { emoji: "🐾", label: "Pet Owners" },
  // Professional
  "tech-startup":      { emoji: "🚀", label: "Tech & Startups" },
  "creative-pro":      { emoji: "🎨", label: "Creatives & Artists" },
  "healthcare-pro":    { emoji: "🏥", label: "Healthcare Workers" },
  "educator-pro":      { emoji: "📚", label: "Educators" },
  "entrepreneur":      { emoji: "💡", label: "Entrepreneurs" },
  "finance-biz":       { emoji: "📊", label: "Finance & Business" },
  "legal-gov":         { emoji: "⚖️", label: "Legal & Gov" },
  // Social & Cause
  "lgbtq":             { emoji: "🌈", label: "LGBTQ+" },
  "womens-network":    { emoji: "💜", label: "Women's Network" },
  "veterans":          { emoji: "🎖️", label: "Veterans" },
  "eco-conscious":     { emoji: "🌿", label: "Eco-Conscious" },
  "volunteer-net":     { emoji: "🤝", label: "Volunteer Network" },
  "disability":        { emoji: "♿", label: "Disability Community" },
  "mental-health":     { emoji: "🧠", label: "Mental Health" },
  // Faith
  "christian":         { emoji: "✝️", label: "Christian" },
  "muslim":            { emoji: "☪️", label: "Muslim" },
  "jewish":            { emoji: "✡️", label: "Jewish" },
  "hindu":             { emoji: "🕉️", label: "Hindu" },
  "buddhist":          { emoji: "☸️", label: "Buddhist" },
  "interfaith":        { emoji: "🙏", label: "Interfaith" },
};

export const INTEREST_DISPLAY: Record<string, { icon: string; label: string }> = {
  housing:   { icon: "home-outline",           label: "Housing" },
  food:      { icon: "restaurant-outline",     label: "Food & Dining" },
  community: { icon: "people-outline",         label: "Community" },
  events:    { icon: "calendar-outline",       label: "Events" },
  jobs:      { icon: "briefcase-outline",      label: "Jobs" },
  health:    { icon: "medkit-outline",         label: "Health" },
  education: { icon: "book-outline",           label: "Education" },
  shopping:  { icon: "bag-outline",            label: "Shopping" },
};

// ── Roommate data model ──────────────────────────────────────────────────────
export interface Roommate {
  id: string;
  name: string;
  username?: string;
  initials: string;
  age: number;
  gender: string;
  occupation: string;
  avatar: string; // photo URL
  color: string;
  location: string;
  /** Display text: "Immediate", "Nov 2, 2026" or "Flexible". */
  moveInDate: string;
  /** Move-in as a timestamp when a real date is known (used by the "Move-in Soon" filter). */
  moveInAt?: number;
  budgetMin: number;
  budgetMax: number;
  // Profile tags (same as user profile)
  vibes: string[];
  interests: string[];
  communities: string[];
  // Living preferences
  cleanliness: "Spotless" | "Clean" | "Relaxed";
  sleepSchedule: "Early Bird" | "Night Owl" | "Flexible";
  noiseLevel: "Quiet" | "Moderate" | "Lively";
  guestPolicy: "Rarely" | "Occasionally" | "Often";
  smoking: "No" | "Outside Only" | "Yes";
  pets: "No Pets" | "Has Pet" | "Pet Friendly";
  workFromHome: boolean;
  bio: string;
  verified: boolean;
  connectionStatus?: RoommateConnectionStatusApi;
  conversationId?: string | null;
  isSaved?: boolean;
  /** When set, card/modal prefer this over local `computeMatch` score. */
  apiMatchScore?: number;
}

// ── Current user profile (would come from auth store in production) ──────────
export const CURRENT_USER: {
  vibes: string[];
  interests: string[];
  communities: string[];
  cleanliness: Roommate["cleanliness"];
  sleepSchedule: Roommate["sleepSchedule"];
  noiseLevel: Roommate["noiseLevel"];
  guestPolicy: Roommate["guestPolicy"];
  smoking: Roommate["smoking"];
  pets: Roommate["pets"];
  workFromHome: boolean;
} = {
  vibes: ["coffee", "fitness", "tech", "foodie"],
  interests: ["housing", "food", "community", "jobs"],
  communities: ["south-asian", "young-professional", "tech-startup"],
  cleanliness: "Clean",
  sleepSchedule: "Night Owl",
  noiseLevel: "Moderate",
  guestPolicy: "Occasionally",
  smoking: "No",
  pets: "Pet Friendly",
  workFromHome: true,
};

// ── Roommate preference form constants ──────────────────────────────────────
export const RM_SLEEP_OPTIONS = ["Early Bird", "Night Owl", "Flexible"];
export const RM_CLEAN_OPTIONS = ["Very Clean", "Clean", "Moderate", "Relaxed"];
export const RM_NOISE_OPTIONS = ["Quiet", "Moderate", "Lively"];
export const RM_GUEST_OPTIONS = ["Never", "Occasionally", "Frequently", "Anytime"];
export const RM_DEFAULT_PREFS = {
  budgetMin: 0, budgetMax: 0, moveInDate: "",
  sleepSchedule: "Night Owl", cleanliness: "Clean", noiseLevel: "Moderate",
  petFriendly: false, smoking: false, guestPolicy: "Occasionally", workFromHome: false,
};

// ── Build match profile from auth user ───────────────────────────────────────
export function buildCurrentUserForMatch(user: import("../../store/auth.store").User | null): typeof CURRENT_USER {
  if (!user) return CURRENT_USER;
  const prefs = user.roommatePrefs ?? {};
  const cleanMap: Record<string, Roommate["cleanliness"]> = {
    spotless: "Spotless", clean: "Clean", relaxed: "Relaxed",
    Spotless: "Spotless", Clean: "Clean", Relaxed: "Relaxed",
  };
  const sleepMap: Record<string, Roommate["sleepSchedule"]> = {
    "early bird": "Early Bird", "night owl": "Night Owl", flexible: "Flexible",
    "Early Bird": "Early Bird", "Night Owl": "Night Owl", Flexible: "Flexible",
  };
  const noiseMap: Record<string, Roommate["noiseLevel"]> = {
    quiet: "Quiet", moderate: "Moderate", lively: "Lively",
    Quiet: "Quiet", Moderate: "Moderate", Lively: "Lively",
  };
  const guestMap: Record<string, Roommate["guestPolicy"]> = {
    rarely: "Rarely", occasionally: "Occasionally", often: "Often",
    Rarely: "Rarely", Occasionally: "Occasionally", Often: "Often",
  };
  return {
    vibes: Array.isArray(user.vibe) && user.vibe.length > 0 ? user.vibe : CURRENT_USER.vibes,
    interests: Array.isArray(user.interests) && user.interests.length > 0 ? user.interests : CURRENT_USER.interests,
    communities: Array.isArray(user.communities) && user.communities.length > 0 ? user.communities : CURRENT_USER.communities,
    cleanliness: cleanMap[prefs.cleanliness ?? ""] ?? CURRENT_USER.cleanliness,
    sleepSchedule: sleepMap[prefs.sleepSchedule ?? ""] ?? CURRENT_USER.sleepSchedule,
    noiseLevel: noiseMap[prefs.noiseLevel ?? ""] ?? CURRENT_USER.noiseLevel,
    guestPolicy: guestMap[prefs.guestPolicy ?? ""] ?? CURRENT_USER.guestPolicy,
    smoking: prefs.smoking === true ? "Yes" : prefs.smoking === false ? "No" : CURRENT_USER.smoking,
    pets: prefs.petFriendly === true ? "Pet Friendly" : prefs.petFriendly === false ? "No Pets" : CURRENT_USER.pets,
    workFromHome: prefs.workFromHome ?? CURRENT_USER.workFromHome,
  };
}

// ── Compatibility scoring engine ─────────────────────────────────────────────
// Jaccard similarity: shared / union (more accurate than shared / max)
export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  const shared = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

export function computeMatch(
  user: typeof CURRENT_USER,
  roommate: Roommate
): {
  score: number;
  sharedVibes: string[];
  sharedInterests: string[];
  sharedCommunities: string[];
  lifestyleMatch: number;
} {
  const sharedVibes = user.vibes.filter((v) => roommate.vibes.includes(v));
  const sharedInterests = user.interests.filter((i) => roommate.interests.includes(i));
  const sharedCommunities = user.communities.filter((c) => roommate.communities.includes(c));

  // Tag matching — Jaccard similarity (more balanced than max-division)
  const vibeScore = jaccard(user.vibes, roommate.vibes);
  const interestScore = jaccard(user.interests, roommate.interests);
  const communityScore = jaccard(user.communities, roommate.communities);

  // Weighted: communities 40%, interests 35%, vibes 25%
  const tagScore = communityScore * 0.4 + interestScore * 0.35 + vibeScore * 0.25;

  // Lifestyle matching — 7 factors
  let lifestylePoints = 0;
  if (user.cleanliness === roommate.cleanliness) lifestylePoints += 2;         // critical
  else if (
    (user.cleanliness === "Spotless" && roommate.cleanliness === "Clean") ||
    (user.cleanliness === "Clean" && roommate.cleanliness === "Spotless")
  ) lifestylePoints += 1; // near match
  if (user.sleepSchedule === roommate.sleepSchedule) lifestylePoints += 2;     // critical
  else if (roommate.sleepSchedule === "Flexible" || user.sleepSchedule === "Flexible") lifestylePoints += 1;
  if (user.noiseLevel === roommate.noiseLevel) lifestylePoints += 1;
  if (user.guestPolicy === roommate.guestPolicy) lifestylePoints += 1;
  if (user.smoking === roommate.smoking) lifestylePoints += 1;
  // Pets: "Pet Friendly" means fine with others' pets
  if (user.pets === roommate.pets || roommate.pets === "Pet Friendly" || user.pets === "Pet Friendly") lifestylePoints += 1;
  if (user.workFromHome === roommate.workFromHome) lifestylePoints += 1;       // WFH compatibility
  const lifestyleMax = 9;
  const lifestyleScore = lifestylePoints / lifestyleMax;

  // Combined: tags 60%, lifestyle 40%
  const total = Math.round((tagScore * 0.6 + lifestyleScore * 0.4) * 100);

  return {
    score: Math.min(total, 100),
    sharedVibes,
    sharedInterests,
    sharedCommunities,
    lifestyleMatch: Math.round(lifestyleScore * 100),
  };
}

export const ROOMMATE_FILTERS = ["Best Match", "Budget", "Move-in Soon", "Verified"];

// ══════════════════════════════════════════════════════════════════════════════
// AVAILABLE ROOMS (residents sharing their apartment)
// ══════════════════════════════════════════════════════════════════════════════

export interface AvailableRoom {
  id: string;
  hostName: string;
  hostId: string;
  hostAvatar: string;
  hostInitials: string;
  hostColor: string;
  hostVerified: boolean;
  hostOccupation: string;
  hostBio: string;
  roomType: "Private Room" | "Shared Room" | "Full Apartment";
  apartmentDesc: string;
  availableRooms: number;
  totalRooms: number;
  currentResidents: number;
  rentPerMonth: number;
  deposit: number;
  location: string;
  neighborhood: string;
  availableFrom: string;
  leaseTerm: string;
  furnished: boolean;
  privateBath: boolean;
  petFriendly: boolean;
  smokingAllowed: boolean;
  genderPref: string;
  amenities: string[];
  houseRules: string[];
  images: string[];
  // lifestyle for compatibility
  cleanliness: Roommate["cleanliness"];
  sleepSchedule: Roommate["sleepSchedule"];
  noiseLevel: Roommate["noiseLevel"];
  guestPolicy: Roommate["guestPolicy"];
  smoking: Roommate["smoking"];
  pets: Roommate["pets"];
  workFromHome: boolean;
  vibes: string[];
  /** When loaded from API, full shared-space row for detail / apply / save. */
  api?: SharedSpaceListing;
}

export function mapApiCleanliness(v: string | null | undefined): Roommate["cleanliness"] {
  if (v === "SPOTLESS" || v === "VERY_CLEAN") return "Spotless";
  if (v === "RELAXED") return "Relaxed";
  if (v === "CLEAN" || v === "MODERATE") return "Clean";
  return "Clean";
}

export function mapApiSleep(v: string | null | undefined): Roommate["sleepSchedule"] {
  if (v === "EARLY_BIRD") return "Early Bird";
  if (v === "NIGHT_OWL") return "Night Owl";
  if (v === "FLEXIBLE") return "Flexible";
  return "Flexible";
}

export function mapApiNoise(v: string | null | undefined): Roommate["noiseLevel"] {
  if (v === "QUIET") return "Quiet";
  if (v === "SOCIAL") return "Lively";
  if (v === "MODERATE") return "Moderate";
  return "Moderate";
}

export function mapApiGuests(v: string | null | undefined): Roommate["guestPolicy"] {
  if (v === "NEVER") return "Rarely";
  if (v === "FREQUENTLY") return "Often";
  if (v === "OCCASIONALLY") return "Occasionally";
  return "Occasionally";
}

export function toUiRoommate(r: RoommateListing): Roommate {
  const name = r.name || r.username || "Roommate";
  const initials = name
    .split(" ")
    .map((p) => p[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const prefs = r.preferences as Record<string, unknown> | null | undefined;
  const rawMove =
    (prefs?.moveInDate as string | undefined) ||
    (typeof r.moveInDate === "string" ? r.moveInDate : undefined);
  const moveIn = rawMove ? formatAvailability(rawMove) : "Flexible";
  const moveInDay = rawMove && /^\d{4}-\d{2}-\d{2}/.test(rawMove) ? parseCalendarDate(rawMove.slice(0, 10)) : null;
  const moveInAt = moveInDay && !Number.isNaN(moveInDay.getTime()) ? moveInDay.getTime() : undefined;
  const pClean = prefs?.cleanliness as string | undefined;
  const pSleep = prefs?.sleepSchedule as string | undefined;
  const pNoise = (prefs?.noiseTolerance ?? prefs?.noiseLevel) as string | undefined;
  const pGuests = (prefs?.guestsFrequency ?? prefs?.guestPolicy) as string | undefined;
  const avatarUrl =
    typeof r.avatarUrl === "string" && r.avatarUrl.length > 0
      ? resolveApiAssetUrl(r.avatarUrl)
      : r.avatar && r.avatar.length > 0
        ? resolveApiAssetUrl(r.avatar)
        : "";

  return {
    id: r.id,
    name,
    username: r.username,
    initials: initials || "RM",
    age: r.age ?? 25,
    gender: r.gender || "Not specified",
    occupation: r.occupation || "Roommate seeker",
    avatar: avatarUrl,
    color: Colors.brand.blue,
    location: [r.city, r.stateProvince].filter(Boolean).join(", ") || r.city || "Unknown",
    moveInDate: moveIn,
    moveInAt,
    budgetMin: (prefs?.budgetMin as number | undefined) ?? r.budget?.min ?? 0,
    budgetMax: (prefs?.budgetMax as number | undefined) ?? r.budget?.max ?? 0,
    vibes: Array.isArray((r as any).vibes) ? (r as any).vibes : (Array.isArray((r as any).vibe) ? (r as any).vibe : []),
    interests: r.interests || [],
    communities: Array.isArray((r as any).communities) ? (r as any).communities : [],
    cleanliness: mapApiCleanliness(pClean),
    sleepSchedule: mapApiSleep(pSleep),
    noiseLevel: mapApiNoise(pNoise),
    guestPolicy: mapApiGuests(pGuests),
    smoking: prefs?.smokingAllowed === true ? "Yes" : "No",
    pets: prefs?.petFriendly === true ? "Pet Friendly" : "No Pets",
    workFromHome: !!prefs?.workFromHome,
    bio: (typeof r.bio === "string" && r.bio.length > 0 ? r.bio : (prefs?.aboutMe as string)) || "Looking for a compatible roommate.",
    verified: r.verified ?? !!r.isVerified,
    connectionStatus: r.connectionStatus ?? null,
    conversationId: r.conversationId ?? null,
    isSaved: r.isSaved === true,
    apiMatchScore: (() => {
      const raw = r.compatibilityScore ?? r.matchScore;
      if (raw == null) return undefined;
      // Backend returns 0–1 decimal; convert to 0–100 integer
      return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
    })(),
  };
}

export function toUiAvailableRoom(r: SharedSpaceListing): AvailableRoom {
  const hostName = r.host?.name || r.owner?.name || "Host";
  const rawHostAvatar =
    r.host?.avatar ||
    (typeof r.owner?.avatarUrl === "string" && r.owner.avatarUrl.trim().length > 0
      ? resolveApiAssetUrl(r.owner.avatarUrl)
      : "");
  const hostInitials = hostName
    .split(" ")
    .map((p) => p[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    id: r.id,
    hostName,
    hostId: r.host?.id ?? r.owner?.id ?? "",
    hostAvatar: rawHostAvatar || "",
    hostInitials: hostInitials || "HS",
    hostColor: Colors.brand.blue,
    hostVerified: !!(r.host?.verified ?? r.verified),
    hostOccupation: "Host",
    // No bio is collected for a host: show none rather than filler text.
    hostBio: "",
    roomType: (r as any).roomType || "Private Room",
    apartmentDesc: r.title || "Shared Space",
    api: r,
    availableRooms: r.availableSpots ?? 1,
    totalRooms: r.rooms ?? 1,
    // "People living there" in the form is totalOccupants; currentOccupants is never raised above 0.
    currentResidents: Math.max(r.totalOccupants ?? 0, r.currentOccupants ?? 0),
    rentPerMonth: r.price ?? 0,
    deposit: r.deposit ?? 0,
    location: [r.city, r.state].filter(Boolean).join(", ") || r.city || "Unknown",
    neighborhood: r.city || "Unknown",
    availableFrom: formatAvailability((r as any).availableFrom || (r as any).moveInDate) === "N/A"
      ? "Flexible"
      : formatAvailability((r as any).availableFrom || (r as any).moveInDate),
    leaseTerm: (r as any).leaseTerm || (r as any).leaseType || "Flexible",
    furnished: !!(r as any).furnished,
    privateBath: r.bathrooms >= 1,
    petFriendly: !!(r.petPolicy?.toLowerCase().includes("pet") || (r as any).petFriendly),
    smokingAllowed: !!r.smoking,
    genderPref: (r as any).genderPreference || (r as any).genderPref || "Any",
    amenities: r.amenities || [],
    houseRules: r.houseRules || [],
    images: listingImageUrlList(r.images),
    cleanliness: mapApiCleanliness((r as any).cleanliness),
    sleepSchedule: mapApiSleep((r as any).sleepSchedule),
    noiseLevel: mapApiNoise((r as any).noiseLevel),
    guestPolicy: mapApiGuests((r as any).guestPolicy),
    smoking: r.smoking ? "Yes" : "No",
    pets: r.petPolicy?.toLowerCase().includes("pet") ? "Pet Friendly" : "No Pets",
    workFromHome: (r as any).workFromHome ?? false,
    vibes: Array.isArray((r as any).vibes) ? (r as any).vibes : [],
  };
}

export function computeRoomCompatibility(room: AvailableRoom, cu = CURRENT_USER): number {
  const sharedVibes = cu.vibes.filter((v) => room.vibes.includes(v));
  const vibeScore = sharedVibes.length / Math.max(cu.vibes.length, room.vibes.length, 1);
  let lifestyle = 0;
  if (cu.cleanliness === room.cleanliness) lifestyle++;
  if (cu.sleepSchedule === room.sleepSchedule) lifestyle++;
  if (cu.noiseLevel === room.noiseLevel) lifestyle++;
  if (cu.guestPolicy === room.guestPolicy) lifestyle++;
  if (cu.smoking === room.smoking) lifestyle++;
  if (cu.pets === room.pets || room.pets === "Pet Friendly" || cu.pets === "Pet Friendly") lifestyle++;
  const lifestyleScore = lifestyle / 6;
  return Math.round((vibeScore * 0.4 + lifestyleScore * 0.6) * 100);
}
