import { Ionicons } from "@expo/vector-icons";
import { resolveApiAssetUrl, type Post as FeedPost } from "../../api/feed.api";
import { type ApiEvent } from "../../api/events.api";
import { type ApiStory } from "../../api/stories.api";
import { type HousingListing } from "../../api/housing.api";
import { getShareLink } from "../../utils/shareLinks";
import { type Poll } from "../../api/community.api";
import { CATEGORY_COLOR, type CommunityStory, type StoryCategory, LIVE_WALL_ITEMS, type LiveCategory, LIVE_CATEGORY_META, POSTS } from "./constants";
import { newsTimeAgo } from "./news";

/** Deep link for sharing feed posts — opens the app directly via the comlinkr.app universal link. */
export function getFeedPostShareUrl(postId: string): string {
  return getShareLink("post", postId);
}

/** Display model for Would You Rather card (from API `Poll`) */
export type WyrCardModel = {
  question: string;
  category: string;
  questionNum: number;
  questionTotal: number;
  totalVotes: number;
  optionA: { label: string; pct: number };
  optionB: { label: string; pct: number };
};

export function pollToWyrCardModel(poll: Poll, index: number, total: number): WyrCardModel {
  const a = poll.options[0];
  const b = poll.options[1];
  const tv = poll.totalVotes;
  const pct = (votes: number) =>
    tv === 0 ? 0 : Math.round((votes / tv) * 100);
  return {
    question: poll.question,
    category: (poll.category ?? "GENERAL").toUpperCase(),
    questionNum: index + 1,
    questionTotal: total,
    totalVotes: poll.totalVotes,
    optionA: { label: a?.label ?? "Option A", pct: pct(a?.votes ?? 0) },
    optionB: { label: b?.label ?? "Option B", pct: pct(b?.votes ?? 0) },
  };
}

export function myVoteToSide(poll: Poll | undefined): "A" | "B" | undefined {
  if (!poll?.myVote || poll.options.length < 2) return undefined;
  if (poll.myVote === poll.options[0].id) return "A";
  if (poll.myVote === poll.options[1].id) return "B";
  return undefined;
}

/** UI row shape for Events tab (matches former `EVENTS` mock item). */
export interface ExploreEventRow {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  /** Resolved URLs for hero carousel (same order as API) */
  images: string[];
  interested: number;
  category: string;
  price: string;
  desc: string;
  host: string;
  emoji?: string;
  registeredByMe: boolean;
  isSaved: boolean;
  isOwner: boolean;
  authorId: string;
  conversationId: string | null;
  canAccessChat: boolean;
  averageRating: number; // SPRINT-42: aggregate for cards/detail
  totalReviews: number; // SPRINT-42: review count for cards/detail
  rawDate: string; // SPRINT-42: eligibility endTime→startTime→date
  startTimeRaw: string; // SPRINT-42:
  endTimeRaw: string | null; // SPRINT-42:
  isAttending: boolean; // SPRINT-42: active registration alias
  hasReviewed?: boolean; // SPRINT-42: detail-only caller state
  myReviewId?: string | null; // SPRINT-42: detail-only caller review id
}

export const EVENT_IMAGE_BY_CATEGORY: Record<string, string> = {
  Community: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=700&q=75",
  Food:      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&q=75",
  Arts:      "https://images.unsplash.com/photo-1464306076886-debca5e8a6b0?w=700&q=75",
  Tech:      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=700&q=75",
  Wellness:  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=700&q=75",
};

export function mapApiEventCategoryToUi(category: string): keyof typeof CATEGORY_COLOR | string {
  switch (category) {
    case "FOOD_DRINK":
      return "Food";
    case "SOCIAL":
    case "COMMUNITY":
      return "Community";
    case "TECH":
    case "EDUCATION":
      return "Tech";
    case "ARTS":
    case "MUSIC":
      return "Arts";
    case "SPORTS":
    case "HEALTH":
      return "Wellness";
    default:
      return "Community";
  }
}

export function eventCategoryEmoji(category: string): string {
  const m: Record<string, string> = {
    SOCIAL: "🎉",
    SPORTS: "⚽",
    MUSIC: "🎵",
    ARTS: "🎨",
    FOOD_DRINK: "🍽️",
    TECH: "💻",
    HEALTH: "🏥",
    COMMUNITY: "🏘️",
    EDUCATION: "📚",
  };
  return m[category] ?? "📅";
}

export function apiEventToExploreRow(e: ApiEvent): ExploreEventRow {
  const d = new Date(e.date);
  const dateStr = Number.isNaN(d.getTime())
    ? String(e.date).slice(0, 10)
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const uiCat = mapApiEventCategoryToUi(e.category);
  const price =
    e.ticketType === "FREE" || e.ticketPrice == null || Number(e.ticketPrice) === 0
      ? "Free"
      : `$${Number(e.ticketPrice)}`;
  const fallback =
    EVENT_IMAGE_BY_CATEGORY[uiCat] ?? EVENT_IMAGE_BY_CATEGORY.Community;
  const rawPaths = Array.isArray(e.images) ? e.images : [];
  const resolved = rawPaths.map((p) => resolveApiAssetUrl(p)).filter(Boolean);
  const primary = resolved[0] || fallback;
  return {
    id: e.id,
    title: e.title,
    date: dateStr,
    time: e.startTime,
    location: e.venue,
    image: primary,
    images: resolved.length > 0 ? resolved : [fallback],
    interested: e.attendeeCount,
    category: uiCat,
    price,
    desc: e.description,
    host: e.author?.name || e.author?.username || "Host",
    emoji: eventCategoryEmoji(e.category),
    registeredByMe: !!e.registeredByMe,
    isSaved: (e as ApiEvent).isSaved === true || (e as ApiEvent).savedByMe === true,
    isOwner: !!(e as ApiEvent).isOwner,
    authorId: String((e as ApiEvent).author?.id ?? ""),
    conversationId: (e as ApiEvent).conversationId ?? null,
    canAccessChat: !!(e as ApiEvent).canAccessChat,
    averageRating: Number(e.averageRating ?? 0) || 0, // SPRINT-42:
    totalReviews: Number(e.totalReviews ?? 0) || 0, // SPRINT-42:
    rawDate: String(e.date ?? ""), // SPRINT-42:
    startTimeRaw: String(e.startTime ?? ""), // SPRINT-42:
    endTimeRaw: e.endTime ?? null, // SPRINT-42:
    isAttending: !!(e.isAttending || e.registeredByMe), // SPRINT-42:
    hasReviewed: e.hasReviewed === true, // SPRINT-42:
    myReviewId: e.myReviewId ?? null, // SPRINT-42:
  };
}

export type HeroTickerNav = "housing" | "food" | "events" | "stories" | "myarea" | "post"; // SPRINT-30: post

export type HeroTickerRow = {
  id: string;
  avatar: string;
  name: string;
  action: string;
  target: string;
  icon: keyof typeof Ionicons.glyphMap;
  time: string;
  color: string;
  nav: HeroTickerNav;
  postId?: string; // SPRINT-30
  eventId?: string; // SPRINT-30
  averageRating?: number; // SPRINT-42: compact rating when space permits
  totalReviews?: number; // SPRINT-42:
};

export function formatHeroRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function buildHeroTickerRows(args: {
  city: string;
  posts: FeedPost[];
  events: ApiEvent[];
  listings: HousingListing[];
  stories: ApiStory[];
}): HeroTickerRow[] {
  const cityLc = args.city.toLowerCase();
  type Acc = { t: number; row: HeroTickerRow };
  const acc: Acc[] = [];

  const postIcon = (cat: string): HeroTickerRow["icon"] => {
    const c = (cat || "").toUpperCase();
    if (c.includes("JOB")) return "briefcase";
    if (c.includes("QUESTION")) return "help-circle";
    if (c === "TIP") return "bulb";
    if (c === "ALERT") return "warning";
    return "chatbubbles";
  };

  const pickNavForPost = (_p: FeedPost): HeroTickerNav => "post"; // SPRINT-30: open post detail

  for (const p of args.posts) {
    const name = p.author?.name || p.author?.username || "Neighbor";
    const av = p.author?.avatarUrl ? resolveApiAssetUrl(p.author.avatarUrl) : "https://randomuser.me/api/portraits/lego/1.jpg";
    const target = (p.title || String(p.category || "Post")).slice(0, 38);
    acc.push({
      t: new Date(p.createdAt).getTime(),
      row: {
        id: `p-${p.id}`,
        avatar: av,
        name,
        action: "posted",
        target,
        icon: postIcon(String(p.category)),
        time: formatHeroRelativeTime(p.createdAt),
        color: "#60A5FA",
        nav: pickNavForPost(p),
        postId: p.id, // SPRINT-30
      },
    });
  }

  for (const e of args.events) {
    const name = e.author?.name || e.author?.username || "Host";
    const av = e.author?.avatarUrl ? resolveApiAssetUrl(e.author.avatarUrl) : "https://randomuser.me/api/portraits/lego/1.jpg";
    acc.push({
      t: new Date(e.createdAt).getTime(),
      row: {
        id: `e-${e.id}`,
        avatar: av,
        name,
        action: "new event",
        target: e.title.slice(0, 38),
        icon: "calendar",
        time: formatHeroRelativeTime(e.createdAt),
        color: "#A78BFA",
        nav: "events",
        eventId: e.id, // SPRINT-30
        averageRating: Number(e.averageRating ?? 0) || 0, // SPRINT-42:
        totalReviews: Number(e.totalReviews ?? 0) || 0, // SPRINT-42:
      },
    });
  }

  for (const L of args.listings) {
    const name = L.owner?.name || L.owner?.username || L.landlord?.name || "Host"; // SPRINT-42: prefer the canonical listing owner alias.
    const av = resolveApiAssetUrl(L.owner?.avatarUrl ?? L.landlord?.avatarUrl) || "https://randomuser.me/api/portraits/lego/2.jpg"; // SPRINT-42: use canonical owner avatar for the housing ticker.
    acc.push({
      t: new Date(L.createdAt).getTime(),
      row: {
        id: `l-${L.id}`,
        avatar: av,
        name,
        action: "listed",
        target: (L.title || L.neighborhood || "Listing").slice(0, 38),
        icon: "home",
        time: formatHeroRelativeTime(L.createdAt),
        color: "#4ECDC4",
        nav: "housing",
      },
    });
  }

  for (const s of args.stories) {
    const sl = (s.location || "").toLowerCase();
    if (sl && cityLc && !sl.includes(cityLc)) continue;
    const name = s.author?.name || s.author?.username || "Creator";
    const av = s.author?.avatarUrl ? resolveApiAssetUrl(s.author.avatarUrl) : "https://randomuser.me/api/portraits/lego/3.jpg";
    acc.push({
      t: new Date(s.createdAt).getTime(),
      row: {
        id: `s-${s.id}`,
        avatar: av,
        name,
        action: "shared",
        target: (s.title || s.category || "Story").slice(0, 38),
        icon: s.mediaType === "REEL" ? "videocam" : "image",
        time: formatHeroRelativeTime(s.createdAt),
        color: "#FFB347",
        nav: "stories",
      },
    });
  }

  // EXP-03: only genuinely recent activity (last 7 days) belongs in the live ticker.
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = acc.filter((x) => Number.isFinite(x.t) && x.t >= recentCutoff);
  recent.sort((a, b) => b.t - a.t);
  return recent.slice(0, 12).map((x) => x.row);
}

export function storyTimeAgo(iso: string): string {
  return newsTimeAgo(iso);
}

/** Align with story viewer: treat missing `isSaved` as false; accept legacy `savedByMe`. */
export function apiStoryIsSaved(s: ApiStory | undefined): boolean {
  if (!s) return false;
  return s.isSaved === true || !!(s as { savedByMe?: boolean }).savedByMe;
}

export function normalizeApiStoryForFeed(s: ApiStory): ApiStory {
  return { ...s, isSaved: apiStoryIsSaved(s) };
}

export function mapApiStoryToCommunityStory(s: ApiStory): CommunityStory {
  const catRaw = s.category || "LOCAL_NEWS";
  let uiCat: Exclude<StoryCategory, "All"> = "Local News";
  if (catRaw === "EVENTS") uiCat = "Events";
  else if (catRaw === "FOOD") uiCat = "Food";
  else if (catRaw === "HOUSING") uiCat = "Housing";
  else if (catRaw === "CULTURE") uiCat = "Culture";
  else if (catRaw === "LOCAL_NEWS") uiCat = "Local News";

  const mediaUrl = resolveApiAssetUrl(s.mediaUrl);
  const thumb =
    mediaUrl ||
    "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=400&q=70";
  const av = resolveApiAssetUrl(s.author.avatarUrl) || "https://randomuser.me/api/portraits/lego/1.jpg";
  const mediaType: CommunityStory["mediaType"] =
    s.mediaType === "REEL" ? "reel" : s.mediaType === "VIDEO" ? "video" : "photo";

  return {
    id: s.id,
    author: s.author.name || s.author.username || "User",
    authorAvatar: av,
    authorBio: "",
    authorFollowers: 0,
    verified: false,
    thumbnail: thumb,
    title: s.title,
    description: (s.details ?? "").trim() || " ",
    category: uiCat,
    duration: Math.max(1, s.durationSeconds ?? 15),
    views: s.viewsCount,
    likes: 0,
    comments: s.commentCount ?? 0,
    shares: 0,
    timeAgo: storyTimeAgo(s.createdAt),
    hasNewStory: false,
    isBookmarked: apiStoryIsSaved(s),
    hashtags: (s.hashtags ?? []).map((h: string) => (h.startsWith("#") ? h : `#${h}`)),
    location: (s.location ?? "").trim() || "Nearby",
    mediaType,
    reactions: [],
  };
}

export function formatStoryTimeLeft(expiresAt: string): string {
  const t = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(t) || t <= 0) return "Ended";
  const mins = Math.ceil(t / 60000);
  if (mins < 60) return `${mins}m left`;
  const h = Math.ceil(t / (60 * 60000));
  return `${h}h left`;
}

export function truncateUsername(u: string, max = 10): string {
  if (!u) return "";
  return u.length > max ? `${u.slice(0, max - 1)}…` : u;
}

export function mapFeedPostToLiveItem(p: FeedPost): (typeof LIVE_WALL_ITEMS)[0] {
  const tags = (p.tags ?? []).map((t) => String(t).toLowerCase());
  let type: Exclude<LiveCategory, "All"> = "News";
  if (p.category === "ALERT") type = "Alerts";
  else if (tags.some((t) => t.includes("housing") || t.includes("apartment") || t.includes("lease"))) type = "Housing";
  else if (tags.some((t) => t.includes("roommate"))) type = "Roommates";
  else if (tags.some((t) => t.includes("food") || t.includes("restaurant") || t.includes("dining"))) type = "Food";
  else if (p.category === "COMMUNITY" || p.category === "ANNOUNCEMENT") type = "Events";
  else if (p.category === "JOBS") type = "News";
  else if (p.category === "TIP") type = "Food";

  const meta = LIVE_CATEGORY_META[type];
  const author = p.author?.name || p.author?.username || "Neighbor";
  const avatar = resolveApiAssetUrl(p.author?.avatarUrl) || "https://randomuser.me/api/portraits/lego/2.jpg";
  const created = p.createdAt ? new Date(p.createdAt).getTime() : 0;
  const isNew = Date.now() - created < 48 * 3600 * 1000;

  return {
    id: p.id,
    type,
    title: p.title || "Update",
    subtitle: (p.content ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || " ",
    icon: meta.icon,
    author,
    authorAvatar: avatar,
    timeAgo: p.createdAt ? newsTimeAgo(p.createdAt) : "",
    location: (p.location ?? "").trim() || "Local",
    isNew,
    highlight: String(p.category ?? "").replace(/_/g, " "),
  };
}

// ── Post card ────────────────────────────────────────────
export type PostCardModel = (typeof POSTS)[number] & { isOwner?: boolean; isEdited?: boolean };
