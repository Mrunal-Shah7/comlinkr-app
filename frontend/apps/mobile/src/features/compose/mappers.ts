// Split out of app/create-post.tsx (TR-013, point 9b).
import { type StoryMediaTypeApi, type StoryCategoryApi } from "../../api/stories.api";
import { type ChallengeDurationApi, type ChallengeTypeApi } from "../../api/challenges.api";

export function parseFlexibleDateToIsoDate(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // ISO format: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  // Event format from DatePickerField: "Mar 15, 2026"
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const event = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (event) {
    const mm = months[event[1]] ?? months[event[1].charAt(0).toUpperCase() + event[1].slice(1).toLowerCase()];
    if (mm) return `${event[3]}-${mm}-${event[2].padStart(2, "0")}`;
  }
  // DD/MM/YYYY or MM/DD/YYYY fallback
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  // Last resort: native parse
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

export function mapEventCategoryLabel(label: string): string {
  const m: Record<string, string> = {
    Social: "SOCIAL",
    Sports: "SPORTS",
    Music: "MUSIC",
    Arts: "ARTS",
    "Food & Drink": "FOOD_DRINK",
    Tech: "TECH",
    Health: "HEALTH",
    Community: "COMMUNITY",
    Education: "EDUCATION",
  };
  return m[label] || "COMMUNITY";
}

export function mapEventFormatLabel(label: string): string {
  if (label === "Virtual") return "VIRTUAL";
  if (label === "Hybrid") return "HYBRID";
  return "IN_PERSON";
}

export function mapPropertyTypeLabel(label: string): "APARTMENT" | "HOUSE" | "STUDIO" | "ROOM" {
  if (label === "House") return "HOUSE";
  if (label === "Studio") return "STUDIO";
  if (label === "Room") return "ROOM";
  return "APARTMENT";
}

export function mapStoryMediaUi(ui: "photo" | "video"): StoryMediaTypeApi {
  return ui === "photo" ? "PHOTO" : "VIDEO";
}

export function mapStoryCategoryLabel(label: string): StoryCategoryApi {
  const m: Record<string, StoryCategoryApi> = {
    "events": "EVENTS", "food": "FOOD", "housing": "HOUSING",
    "culture": "CULTURE", "local news": "LOCAL_NEWS",
  };
  return m[label.toLowerCase()] ?? "CULTURE";
}

export function mapChallengeTypeLabel(label: string): ChallengeTypeApi {
  const m: Record<string, ChallengeTypeApi> = {
    Photo: "PHOTO",
    Fitness: "FITNESS",
    Food: "FOOD",
    Explore: "EXPLORE",
    Social: "SOCIAL",
    Creative: "CREATIVE",
    Green: "GREEN",
    Trivia: "TRIVIA",
  };
  return m[label] || "SOCIAL";
}

export function mapChallengeDurationLabel(label: string): ChallengeDurationApi {
  const m: Record<string, ChallengeDurationApi> = {
    "1 Day": "ONE_DAY",
    "3 Days": "THREE_DAYS",
    "1 Week": "ONE_WEEK",
    "2 Weeks": "TWO_WEEKS",
    "1 Month": "ONE_MONTH",
  };
  return m[label] || "ONE_WEEK";
}

export function mapRestaurantPriceChip(chip: string): "BUDGET" | "MODERATE" | "PREMIUM" | "LUXURY" {
  if (chip.includes("$$$$")) return "LUXURY";
  if (chip.includes("$$$") && !chip.includes("$$$$")) return "PREMIUM";
  if (chip.includes("$$") && !chip.includes("$$$")) return "MODERATE";
  return "BUDGET";
}

export function splitHashtagInput(raw: string): string[] {
  return raw
    .split(/[,]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((s) => s.replace(/^#+/, "").trim())
    .filter(Boolean);
}

export function parseReviewStars(label: string): number | null {
  const m: Record<string, number> = {
    "★★★★★ Excellent": 5,
    "★★★★ Great": 4,
    "★★★ Good": 3,
    "★★ Fair": 2,
    "★ Poor": 1,
  };
  return m[label] ?? null;
}
