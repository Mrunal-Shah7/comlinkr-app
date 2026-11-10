// Maps onboarding UI option ids (onboarding.tsx) to Prisma seed slugs — keep in sync with backend/prisma/seed.ts

import { api } from "./apiClient";
import type { BackendAuthUser } from "./authService";

export const CULTURE_UI_ID_TO_VIBE_SLUG: Record<string, string> = {
  coffee: "coffee_culture",
  art: "art_museums",
  fitness: "fitness_health",
  nightlife: "nightlife",
  family: "family_life",
  wellness: "wellness",
  foodie: "foodie",
  outdoor: "outdoor",
  tech: "tech_innovation",
  music: "music_events",
  sports: "sports_games",
  volunteer: "volunteering",
};

export const INTEREST_UI_ID_TO_SLUG: Record<string, string> = {
  housing: "housing_real_estate",
  food: "food_dining",
  community: "community_social",
  events: "events_entertainment",
  jobs: "jobs_careers",
  health: "health_wellness",
  education: "education_learning",
  shopping: "shopping_services",
};

export const COMMUNITY_UI_ID_TO_SLUG: Record<string, string> = {
  "south-asian": "south_asian_in",
  "east-asian": "east_asian",
  "southeast-asian": "southeast_asian",
  "latin-american": "latin_american",
  african: "african_afro_diaspora",
  caribbean: "caribbean",
  "middle-eastern": "middle_eastern",
  european: "european_eu",
  "pacific-islander": "pacific_islander",
  indigenous: "indigenous_first_nations",
  "south-american": "south_american",
  "central-asian": "central_asian",
  expat: "expat",
  "digital-nomad": "digital_nomad",
  student: "student",
  "young-professional": "young_professional",
  "new-in-town": "new_in_town",
  retiree: "retiree_seniors",
  parent: "parents_families",
  "pet-owner": "pet_owners",
  "tech-startup": "tech_startups",
  "creative-pro": "creatives_artists",
  "healthcare-pro": "healthcare_workers",
  "educator-pro": "educators_teachers",
  entrepreneur: "entrepreneurs",
  "finance-biz": "finance_business",
  "legal-gov": "legal_government",
  lgbtq: "lgbtq",
  "womens-network": "womens_network",
  veterans: "veterans",
  "eco-conscious": "eco_conscious",
  "volunteer-net": "volunteer_network",
  disability: "disability_community",
  "mental-health": "mental_health_advocates",
  christian: "christian",
  muslim: "muslim",
  jewish: "jewish",
  hindu: "hindu",
  buddhist: "buddhist",
  interfaith: "interfaith_spiritual",
  mexican: "mexican_mx",
  brazilian: "brazilian_br",
  colombian: "colombian_co",
  cuban: "cuban_cu",
  dominican: "dominican_do",
  "puerto-rican": "puerto_rican_pr",
  venezuelan: "venezuelan_ve",
  peruvian: "peruvian_pe",
  indian: "indian_in",
  pakistani: "pakistani_pk",
  bangladeshi: "bangladeshi_bd",
  "sri-lankan": "sri_lankan_lk",
  nepali: "nepali_np",
  chinese: "chinese_cn",
  korean: "korean_kr",
  japanese: "japanese_jp",
  filipino: "filipino_ph",
  vietnamese: "vietnamese_vn",
  thai: "thai_th",
  indonesian: "indonesian_id",
  british: "british_gb",
  irish: "irish_ie",
  spanish: "spanish_es",
  french: "french_fr",
  italian: "italian_it",
  greek: "greek_gr",
  portuguese: "portuguese_pt",
  polish: "polish_pl",
  ukrainian: "ukrainian_ua",
  russian: "russian_ru",
  german: "german_de",
  romanian: "romanian_ro",
  nigerian: "nigerian_ng",
  ghanaian: "ghanaian_gh",
  kenyan: "kenyan_ke",
  ethiopian: "ethiopian_et",
  somali: "somali_so",
  zimbabwean: "zimbabwean_zw",
  "south-african": "south_african_za",
  jamaican: "jamaican_jm",
  trinidadian: "trinidadian_tt",
  haitian: "haitian_ht",
  egyptian: "egyptian_eg",
  moroccan: "moroccan_ma",
  lebanese: "lebanese_lb",
  iranian: "iranian_persian_ir",
  turkish: "turkish_tr",
  afghan: "afghan_af",
  syrian: "syrian_sy",
  arab: "arab",
};

/** ISO 3166-1 alpha-2 for countries shown in onboarding (SetLocationDto.countryCode). */
export const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  "United States": "US",
  Canada: "CA",
  "United Kingdom": "GB",
  Australia: "AU",
  Germany: "DE",
  France: "FR",
  India: "IN",
  Brazil: "BR",
  Mexico: "MX",
  Japan: "JP",
  Singapore: "SG",
  "New Zealand": "NZ",
  "South Africa": "ZA",
  UAE: "AE",
  Ireland: "IE",
};

/** Dial codes for countries in onboarding / edit-profile (must match onboarding.tsx). */
export const COUNTRY_DIAL_CODE: Record<string, string> = {
  "United States": "+1",
  Canada: "+1",
  "United Kingdom": "+44",
  Australia: "+61",
  Germany: "+49",
  France: "+33",
  India: "+91",
  Brazil: "+55",
  Mexico: "+52",
  Japan: "+81",
  Singapore: "+65",
  "New Zealand": "+64",
  "South Africa": "+27",
  UAE: "+971",
  Ireland: "+353",
};

export const VIBE_SLUG_TO_UI_ID: Record<string, string> = Object.fromEntries(
  Object.entries(CULTURE_UI_ID_TO_VIBE_SLUG).map(([ui, slug]) => [slug, ui]),
);

export const INTEREST_SLUG_TO_UI_ID: Record<string, string> = Object.fromEntries(
  Object.entries(INTEREST_UI_ID_TO_SLUG).map(([ui, slug]) => [slug, ui]),
);

export const COMMUNITY_SLUG_TO_UI_ID: Record<string, string> = Object.fromEntries(
  Object.entries(COMMUNITY_UI_ID_TO_SLUG).map(([ui, slug]) => [slug, ui]),
);

function unwrapData<T>(body: unknown): T {
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    (body as { success?: boolean }).success === true &&
    "data" in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export type OnboardingVibeRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
};

export type OnboardingInterestRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
};

export type OnboardingCommunityRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  countryCode: string | null;
  emoji: string;
};

async function getVibes(): Promise<OnboardingVibeRow[]> {
  const body = await api.get<unknown>("/onboarding/vibes");
  return unwrapData<OnboardingVibeRow[]>(body);
}

async function getInterests(): Promise<OnboardingInterestRow[]> {
  const body = await api.get<unknown>("/onboarding/interests");
  return unwrapData<OnboardingInterestRow[]>(body);
}

async function getCommunities(): Promise<OnboardingCommunityRow[]> {
  const body = await api.get<unknown>("/onboarding/communities");
  return unwrapData<OnboardingCommunityRow[]>(body);
}

export type SubmitOnboardingPayload = {
  country: string;
  stateProvince: string;
  city: string;
  dialCode: string;
  /** Plan 08: the phone's position when the city was detected, and the geocoder's ISO country code. */
  latitude?: number;
  longitude?: number;
  countryCode?: string;
  cultureUiIds: string[];
  interestUiIds: string[];
  communityUiIds: string[];
};

export type OnboardingCompleteData = {
  message: string;
  summary: unknown;
  user: BackendAuthUser;
};

function idsFromSlugs(
  rows: { id: string; slug: string }[],
  slugs: string[],
  label: string
): string[] {
  const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
  const ids: string[] = [];
  for (const slug of slugs) {
    const id = bySlug.get(slug);
    if (!id) {
      throw new Error(`Server has no ${label} for slug "${slug}". Re-seed the database or update the app.`);
    }
    ids.push(id);
  }
  return ids;
}

/**
 * Persists onboarding to Nest (location, vibes, interests, communities, agreement, complete).
 * Returns the updated user (same shape as GET /auth/me) so the client avoids a follow-up /auth/me call.
 */
export async function submitOnboardingToApi(
  payload: SubmitOnboardingPayload
): Promise<BackendAuthUser> {
  const countryCode = COUNTRY_NAME_TO_ISO[payload.country] ?? payload.countryCode;
  if (!countryCode) {
    throw new Error(`Unknown country "${payload.country}" — add it to COUNTRY_NAME_TO_ISO in onboardingService.`);
  }

  const vibes = await getVibes();
  const interests = await getInterests();
  const communities = await getCommunities();

  const vibeSlugs = payload.cultureUiIds
    .map((id) => CULTURE_UI_ID_TO_VIBE_SLUG[id])
    .filter(Boolean) as string[];
  const interestSlugs = payload.interestUiIds
    .map((id) => INTEREST_UI_ID_TO_SLUG[id])
    .filter(Boolean) as string[];
  const communitySlugs = payload.communityUiIds
    .map((id) => COMMUNITY_UI_ID_TO_SLUG[id])
    .filter(Boolean) as string[];

  if (payload.cultureUiIds.length > 0 && vibeSlugs.length !== payload.cultureUiIds.length) {
    throw new Error("One or more vibe selections could not be mapped. Update the app.");
  }
  if (interestSlugs.length !== payload.interestUiIds.length) {
    throw new Error("One or more interest selections could not be mapped. Update the app.");
  }
  if (payload.communityUiIds.length > 0 && communitySlugs.length !== payload.communityUiIds.length) {
    throw new Error("One or more community selections could not be mapped. Update the app.");
  }

  const vibeIds = idsFromSlugs(vibes, vibeSlugs, "vibe");
  const interestIds = idsFromSlugs(interests, interestSlugs, "interest");
  const communityIds = idsFromSlugs(communities, communitySlugs, "community");

  await api.post("/onboarding/location", {
    country: payload.country,
    countryCode,
    dialCode: payload.dialCode,
    state: payload.stateProvince,
    city: payload.city,
    ...(payload.latitude != null && payload.longitude != null ? { latitude: payload.latitude, longitude: payload.longitude } : {}),
  });

  // CMP-02: a location-only edit must work for accounts that never picked interests. Empty
  // selections are left as they are on the server rather than posted (the endpoints require >= 1).
  if (vibeIds.length > 0) await api.post("/onboarding/vibes", { vibeIds });
  if (interestIds.length > 0) await api.post("/onboarding/interests", { interestIds });
  if (communityIds.length > 0) await api.post("/onboarding/communities", { communityIds });

  await api.post("/onboarding/agreement", { accepted: true });

  const completeBody = await api.post<unknown>("/onboarding/complete", {});
  const completeData = unwrapData<OnboardingCompleteData>(completeBody);
  if (!completeData?.user) {
    throw new Error("Server did not return your profile after onboarding. Update the API or try signing in again.");
  }
  return completeData.user;
}

export type ProfileSelectionsPayload = {
  cultureUiIds: string[];
  interestUiIds: string[];
  communityUiIds: string[];
};

/**
 * Updates location + vibes + interests + communities without running onboarding completion.
 * Used by Edit Profile to stay in sync with POST /onboarding/* endpoints.
 */
/** The vibe, interest and community chips. The city is not here: it comes from the phone's location (plan 08). */
export async function syncProfileSelectionsToApi(payload: ProfileSelectionsPayload): Promise<void> {
  const vibes = await getVibes();
  const interests = await getInterests();
  const communities = await getCommunities();

  const vibeSlugs = payload.cultureUiIds
    .map((id) => CULTURE_UI_ID_TO_VIBE_SLUG[id])
    .filter(Boolean) as string[];
  const interestSlugs = payload.interestUiIds
    .map((id) => INTEREST_UI_ID_TO_SLUG[id])
    .filter(Boolean) as string[];
  const communitySlugs = payload.communityUiIds
    .map((id) => COMMUNITY_UI_ID_TO_SLUG[id])
    .filter(Boolean) as string[];

  if (payload.cultureUiIds.length > 0 && vibeSlugs.length !== payload.cultureUiIds.length) {
    throw new Error("One or more lifestyle selections could not be mapped. Update the app.");
  }
  if (interestSlugs.length !== payload.interestUiIds.length) {
    throw new Error("One or more interest selections could not be mapped. Update the app.");
  }
  if (payload.communityUiIds.length > 0 && communitySlugs.length !== payload.communityUiIds.length) {
    throw new Error("One or more community selections could not be mapped. Update the app.");
  }

  const vibeIds = idsFromSlugs(vibes, vibeSlugs, "vibe");
  const interestIds = idsFromSlugs(interests, interestSlugs, "interest");
  const communityIds = idsFromSlugs(communities, communitySlugs, "community");

  // CMP-02: a location-only edit must work for accounts that never picked interests. Empty
  // selections are left as they are on the server rather than posted (the endpoints require >= 1).
  if (vibeIds.length > 0) await api.post("/onboarding/vibes", { vibeIds });
  if (interestIds.length > 0) await api.post("/onboarding/interests", { interestIds });
  if (communityIds.length > 0) await api.post("/onboarding/communities", { communityIds });
}

/** Plan 08 (TR-042): set the signed-in user's city from a detected location (`PATCH /settings/city`, source GPS). */
export async function updateCityFromLocation(loc: {
  country: string; state: string; city: string; countryCode: string; latitude: number; longitude: number;
}): Promise<void> {
  await api.patch("/settings/city", {
    country: loc.country,
    countryCode: loc.countryCode || COUNTRY_NAME_TO_ISO[loc.country],
    dialCode: COUNTRY_DIAL_CODE[loc.country]?.trim() || "+1",
    state: loc.state,
    city: loc.city,
    latitude: loc.latitude,
    longitude: loc.longitude,
  });
}

const onboardingService = {
  getVibes,
  getInterests,
  getCommunities,
  submitOnboardingToApi,
  syncProfileSelectionsToApi,
};

export default onboardingService;
