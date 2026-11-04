export interface UpdateRoommatePreferencesPayload {
  isLooking?: boolean;
  petFriendly?: boolean;
  smokingAllowed?: boolean;
  workFromHome?: boolean;
  aboutMe?: string;
  budgetMin?: number;
  budgetMax?: number;
  moveInDate?: string;
  sleepSchedule?: "EARLY_BIRD" | "NIGHT_OWL" | "FLEXIBLE";
  cleanliness?: "CLEAN" | "MODERATE" | "RELAXED";
  noiseTolerance?: "QUIET" | "MODERATE" | "SOCIAL";
  guestsFrequency?: "NEVER" | "OCCASIONALLY" | "FREQUENTLY";
}

/** Shape of `roommatePreferences` in the full profile API response */
export interface RoommatePreferencesApiBlock {
  budgetMin?: number | null;
  budgetMax?: number | null;
  moveInDate?: string | null;
  sleepSchedule?: string | null;
  cleanliness?: string | null;
  noiseLevel?: string | null;
  noiseTolerance?: string | null;
  guestPolicy?: string | null;
  guestsFrequency?: string | null;
  petFriendly?: boolean | null;
  smoking?: boolean | null;
  smokingAllowed?: boolean | null;
  workFromHome?: boolean | null;
  lookingForRoommate?: boolean | null;
  aboutMe?: string | null;
}

type StorePrefs = {
  budgetMin?: number;
  budgetMax?: number;
  moveInDate?: string;
  sleepSchedule?: string;
  cleanliness?: string;
  noiseLevel?: string;
  petFriendly?: boolean;
  smoking?: boolean;
  guestPolicy?: string;
  workFromHome?: boolean;
};

/** Normalizes move-in date strings to `YYYY-MM-DD` for the PATCH API. */
export function normalizeMoveInDateForApi(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const display = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (display) {
    const parsed = new Date(`${display[2]} ${display[1]}, ${display[3]}`);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const y = slash[3];
    const m = String(+slash[2]).padStart(2, "0");
    const d = String(+slash[1]).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) {
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, "0");
    const d = String(fallback.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return undefined;
}

/** Maps the full-profile API block to the auth-store roommatePrefs shape */
export function roommatePrefsFromFullProfile(
  block: RoommatePreferencesApiBlock | null | undefined
): StorePrefs | undefined {
  if (!block) return undefined;
  const moveInRaw = block.moveInDate;
  const moveInDate =
    typeof moveInRaw === "string"
      ? normalizeMoveInDateForApi(moveInRaw.slice(0, 10)) ?? moveInRaw
      : undefined;
  return {
    budgetMin: block.budgetMin ?? undefined,
    budgetMax: block.budgetMax ?? undefined,
    moveInDate,
    sleepSchedule: block.sleepSchedule ?? undefined,
    cleanliness: block.cleanliness ?? undefined,
    noiseLevel: block.noiseLevel ?? block.noiseTolerance ?? undefined,
    petFriendly: block.petFriendly ?? undefined,
    smoking: block.smoking ?? block.smokingAllowed ?? undefined,
    guestPolicy: block.guestPolicy ?? block.guestsFrequency ?? undefined,
    workFromHome: block.workFromHome ?? undefined,
  };
}

/** Maps the GET /roommates/preferences response to the auth-store roommatePrefs shape */
export function roommatePrefsFromGetEndpoint(fresh: {
  budgetMin?: number | null;
  budgetMax?: number | null;
  moveInDate?: string | null;
  sleepSchedule?: string | null;
  cleanliness?: string | null;
  noiseLevel?: string | null;
  petFriendly?: boolean | null;
  smoking?: boolean | null;
  guestPolicy?: string | null;
  workFromHome?: boolean | null;
}): StorePrefs {
  return {
    budgetMin: fresh.budgetMin ?? undefined,
    budgetMax: fresh.budgetMax ?? undefined,
    moveInDate: fresh.moveInDate ?? undefined,
    sleepSchedule: fresh.sleepSchedule ?? undefined,
    cleanliness: fresh.cleanliness ?? undefined,
    noiseLevel: fresh.noiseLevel ?? undefined,
    petFriendly: fresh.petFriendly ?? undefined,
    smoking: fresh.smoking ?? undefined,
    guestPolicy: fresh.guestPolicy ?? undefined,
    workFromHome: fresh.workFromHome ?? undefined,
  };
}

/** Maps the auth-store roommatePrefs shape to the PATCH payload */
export function roommatePrefsToPatchBody(p: StorePrefs): UpdateRoommatePreferencesPayload {
  const body: UpdateRoommatePreferencesPayload = { isLooking: true };
  if (p.budgetMin != null) body.budgetMin = p.budgetMin;
  if (p.budgetMax != null) body.budgetMax = p.budgetMax;
  const moveInDate = normalizeMoveInDateForApi(p.moveInDate);
  if (moveInDate) body.moveInDate = moveInDate;
  if (p.workFromHome != null) body.workFromHome = p.workFromHome;
  if (p.petFriendly != null) body.petFriendly = p.petFriendly;
  if (p.smoking != null) body.smokingAllowed = p.smoking;

  if (p.sleepSchedule) {
    const s = p.sleepSchedule.toLowerCase().replace(/\s+/g, "_");
    if (s === "early_bird") body.sleepSchedule = "EARLY_BIRD";
    else if (s === "night_owl") body.sleepSchedule = "NIGHT_OWL";
    else if (s === "flexible") body.sleepSchedule = "FLEXIBLE";
  }

  if (p.cleanliness) {
    const c = p.cleanliness.toLowerCase();
    if (c.includes("clean")) body.cleanliness = "CLEAN";
    else if (c === "moderate") body.cleanliness = "MODERATE";
    else if (c === "relaxed") body.cleanliness = "RELAXED";
  }

  if (p.noiseLevel) {
    const n = p.noiseLevel.toLowerCase();
    if (n === "quiet") body.noiseTolerance = "QUIET";
    else if (n === "moderate") body.noiseTolerance = "MODERATE";
    else if (n === "social" || n === "lively") body.noiseTolerance = "SOCIAL";
  }

  if (p.guestPolicy) {
    const g = p.guestPolicy.toLowerCase();
    if (g === "never") body.guestsFrequency = "NEVER";
    else if (g === "occasionally") body.guestsFrequency = "OCCASIONALLY";
    else if (g === "frequently" || g === "anytime") body.guestsFrequency = "FREQUENTLY";
  }

  return body;
}
