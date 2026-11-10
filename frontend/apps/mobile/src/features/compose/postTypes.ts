// Split out of app/create-post.tsx (TR-013, point 9b).
import { palette } from "../../theme/palette";
import { Alert } from "react-native";
import { type FeedCategory } from "../../api/feed.api";

// ── Canonical post type palette (matches AppHeader CREATE_OPTIONS) ─────────────
export const POST_TYPES = [
  {
    id: "news",
    icon: "newspaper-outline" as const,
    label: "News for neighbours",
    desc: "Share updates & announcements",
    color: palette.brandBlue,
    bg: palette.brandBlueLight,
    gradient: [palette.brandBlue, palette.brandGreen] as [string, string],
  },
  {
    id: "event",
    icon: "calendar-outline" as const,
    label: "An event",
    desc: "Organize a local event or meetup",
    color: palette.brandBlue,
    bg: palette.brandBlueLight,
    gradient: [palette.brandBlue, palette.brandGreen] as [string, string],
  },
  {
    id: "listing",
    icon: "home-outline" as const,
    label: "A whole place for rent",
    desc: "List your property for rent or sale",
    color: palette.brandBlue,
    bg: palette.brandBlueLight,
    gradient: [palette.brandBlue, palette.brandGreen] as [string, string],
  },
  {
    id: "shared_space",
    icon: "people-circle-outline" as const,
    label: "A room in my home",
    desc: "Offer a room or shared space for co-living",
    color: palette.brandBlue,
    bg: palette.brandBlueLight,
    gradient: [palette.brandBlue, palette.brandGreen] as [string, string],
  },
  {
    id: "restaurant",
    icon: "restaurant-outline" as const,
    label: "My restaurant",
    desc: "Register your restaurant on ComLinkr",
    color: palette.brandBlue,
    bg: palette.brandBlueLight,
    gradient: [palette.brandBlue, palette.brandGreen] as [string, string],
  },
  {
    id: "story",
    icon: "videocam-outline" as const,
    label: "A story",
    desc: "Upload a photo or video",
    color: palette.brandBlue,
    bg: palette.brandBlueLight,
    gradient: [palette.brandBlue, palette.brandGreen] as [string, string],
  },
  {
    id: "challenge",
    icon: "trophy-outline" as const,
    label: "A quest",
    desc: "Something for your neighbours to do together",
    color: palette.brandBlue,
    bg: palette.brandBlueLight,
    gradient: [palette.brandBlue, palette.brandGreen] as [string, string],
  },
];

export type PostType = typeof POST_TYPES[0];

/** Quest templates (design D `compose-quest`); rewards are things the host gives, not app features. */
export const QUEST_TEMPLATES: { key: string; icon: "camera-outline" | "location-outline" | "people-outline"; name: string; sub: string; title: string; goal: string; reward: string; kind: string }[] = [
  { key: "photo", icon: "camera-outline", name: "Photo quest", sub: "Best shot of a theme wins", title: "Golden hour shot", goal: "Post a photo of golden hour in your neighbourhood.", reward: "A shout-out from the host", kind: "Creative" },
  { key: "visit", icon: "location-outline", name: "Visit places", sub: "Check in at a list of places", title: "Taco trail", goal: "Visit 5 taquerias and post one photo at each.", reward: "Bragging rights", kind: "Food" },
  { key: "meet", icon: "people-outline", name: "Meet people", sub: "Small social goals", title: "Say hi week", goal: "Say hi to 3 neighbours this week.", reward: "New friends nearby", kind: "Social" },
];

export const ALL_CATEGORIES = [
  "Community", "Events", "Food", "Housing", "Culture", "Local News", "Announcement",
  "Jobs", "Alert", "Discussion", "Question", "Tip", "Social", "Sports", "Music",
  "Arts", "Tech", "Health", "Education", "Fitness", "Explore", "Creative", "Green", "Trivia"
];

// Stories only support these 5 categories on the backend (see StoryCategoryApi) —
// showing ALL_CATEGORIES here would silently mis-file the story under "Culture".
export const STORY_CATEGORY_OPTIONS = ["Events", "Food", "Housing", "Culture", "Local News"];

export const NEWS_LABEL_TO_FEED: Record<string, FeedCategory> = {
  Community: "COMMUNITY",
  Announcement: "ANNOUNCEMENT",
  Jobs: "JOBS",
  Alert: "ALERT",
  Discussion: "DISCUSSION",
  Question: "QUESTION",
  Tip: "TIP",
};
