import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { runAfterTransition } from "../../../src/utils/afterTransition";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams, useScrollToTop } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../src/theme/colors";
import { useTheme } from "../../../src/theme/useTheme";
import { useAuthStore } from "../../../src/store/auth.store";
import { useGuestLocationStore } from "../../../src/store/guestLocation.store";
import { useRequireAuth } from "../../../src/shared/hooks/useRequireAuth";
import AppHeader from "../../../components/AppHeader";
import { FadeImage } from "../../../components/FadeImage"; // SPRINT-31: shared expo-image FadeImage (local helper removed)
import { LinkifiedText } from "../../../components/LinkifiedText";
import { useBlockStore } from "../../../src/store/block.store";
import { blockUser as blockUserApi, reportUser } from "../../../src/api/profile.api";
import { useListFetchCacheStore } from "../../../src/store/listFetchCache.store"; // SPRINT-27
import {
  askQuestion,
  bookmarkQuestion,
  getCommunityStats,
  getAnswers,
  getQuestions,
  getQuestion,
  reportAnswer,
  reportQuestion,
  submitAnswer,
  voteAnswer,
  voteQuestion,
  type Answer,
  type CommunityStats,
  type Question,
} from "../../../src/api/community-qa.api";
import { rs } from "../../../src/utils/responsive";
import { getShareLink } from "../../../src/utils/shareLinks";
import { appAlert, actionSheet } from '../../../src/shared/ui/Dialogs';
import { ListState } from '../../../src/shared/ui/ListState';
import { showToast } from '../../../src/shared/ui/Toast';
import { useAppCity } from '../../../src/utils/useAppCity';
import { GuestCityPickerModal } from '../../../components/GuestCityBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../../src/api/client';

const TOPICS = ["All", "Housing", "Food", "Transit", "Events", "Safety", "General"];

const QUESTION_CATEGORIES = ["Housing", "Food", "Transit", "Events", "Safety", "General"] as const;

// ── Semantic category matching ─────────────────────────────────────────────────
//
// Each category has:
//   words   → single words matched at word boundaries (avoids "eat" matching "great")
//   phrases → multi-word expressions matched as substrings (more specific, higher weight)
//
// Design goal: catch natural-language questions that express the topic without
// using the "textbook" keyword, e.g.:
//   "cozy place to stay for 3 months"  → Housing
//   "something strange last night, should I be worried?" → Safety
//   "anything fun happening this weekend?" → Events
//
const TOPIC_SIGNALS: Record<string, { words: string[]; phrases: string[] }> = {
  Housing: {
    words: [
      "housing", "rent", "rental", "apartment", "flat", "house", "home", "property",
      "landlord", "tenant", "renter", "flatmate", "roommate", "housemate", "lodger",
      "lease", "tenancy", "sublease", "sublet", "mortgage", "deposit", "deed",
      "studio", "bedroom", "bathroom", "ensuite", "accommodation", "lodging",
      "furnished", "unfurnished", "eviction", "letting", "lettings", "bedsit",
      "utilities", "council", "realtor", "condo", "townhouse", "duplex", "bungalow",
      "penthouse", "loft", "dorm", "dormitory", "hostel", "guesthouse", "inn",
      "motel", "bnb", "airbnb", "sublet", "occupancy", "vacancy", "available",
      "cohabitation", "co-living", "coliving", "househunting",
      "cozy", "cosy", "comfy", "settle", "relocate", "relocating",
    ],
    phrases: [
      "place to live", "place to stay", "somewhere to live", "somewhere to stay",
      "room to rent", "rooms available", "looking for a room", "looking for accommodation",
      "move in", "move out", "moving in", "moving out", "real estate", "estate agent",
      "letting agent", "property manager", "bills included", "notice period",
      "tenancy agreement", "monthly rent", "share a house", "flat share",
      "house share", "shared house", "renting a", "looking for a flat",
      "looking for an apartment", "need a place", "find a place", "finding a place",
      "place for rent", "rooms for rent", "available to rent", "cozy place",
      "affordable place", "living situation", "housing situation", "short-term",
      "long term", "long-term", "short term stay", "temporary stay",
      "shared accommodation", "student housing", "student accommodation",
      "looking to rent", "where to live", "where can i live", "where should i live",
      "place for a few months", "for a month", "for 3 months", "for 6 months",
      "affordable living", "nice place", "good area", "decent area", "safe area",
      "spare room", "single room", "double room", "en suite", "bills included",
      "all inclusive", "deposit required", "how much is rent", "average rent",
      "cheapest area", "best area to live", "where do people live", "neighborhoods",
      "neighbourhood", "local area", "which area", "nice neighbourhood",
      "for a few weeks", "for a week", "moving to the area", "new to the area",
      "just moved", "recently moved", "looking to move", "thinking of moving",
      "temporary home", "somewhere affordable", "settle down", "settle in",
    ],
  },
  Food: {
    words: [
      "food", "restaurant", "eat", "eating", "cafe", "coffee", "dinner", "lunch",
      "breakfast", "menu", "dish", "dishes", "cuisine", "takeaway", "takeout",
      "delivery", "halal", "kosher", "vegan", "vegetarian", "pub", "bar", "diner",
      "bistro", "buffet", "snack", "meal", "meals", "cooking", "recipe", "grocery",
      "groceries", "supermarket", "bakery", "pizza", "burger", "sushi", "curry",
      "noodles", "pasta", "dessert", "brunch", "eatery", "foodie", "drinks",
      "beverage", "beer", "wine", "cocktail", "seafood", "steak", "salad",
      "sandwich", "wrap", "taco", "burrito", "kebab", "ramen", "pho", "biryani",
      "hummus", "falafel", "gyro", "dumplings", "dim", "tapas", "crepe",
      "waffle", "pancake", "smoothie", "juice", "latte", "cappuccino", "espresso",
      "gluten", "dairy", "nut", "allergy", "allergen", "organic", "local",
      "hungry", "dine", "dining", "taste", "tasty", "yummy", "vendor",
    ],
    phrases: [
      "place to eat", "somewhere to eat", "good food", "best food",
      "food recommendation", "where to eat", "grab a bite", "eat out",
      "dining out", "food near", "good restaurant", "food delivery",
      "order food", "street food", "fast food", "fine dining",
      "coffee shop", "grab some food", "get some food", "get something to eat",
      "something to eat", "grab something", "food spot", "nice spot to eat",
      "any recommendations", "recommend a restaurant", "best place for food",
      "worth trying", "must try", "hidden gem", "local food", "local cuisine",
      "authentic", "home cooked", "comfort food", "healthy food", "quick bite",
      "late night food", "open late", "open early", "open 24", "24 hour",
      "food market", "night market", "food truck", "food hall", "food court",
      "where can i get", "where can i find", "best spot for",
      "good place for breakfast", "good place for lunch", "good place for dinner",
      "best brunch", "best coffee", "best pizza", "best burger",
      "cheap eats", "budget food", "affordable food",
      "places to eat", "where can i eat", "food recommendations",
      "food near me", "eat around here", "good food around",
      "grab lunch", "grab dinner", "grab breakfast",
      "feeling hungry", "i am hungry", "so hungry",
    ],
  },
  Transit: {
    words: [
      "transit", "bus", "train", "metro", "subway", "transport", "commute",
      "commuting", "station", "rail", "railway", "uber", "lyft", "taxi", "cab",
      "cycling", "bike", "biking", "bicycle", "tfl", "tube", "underground",
      "overground", "tram", "ferry", "rideshare", "carpool", "driving",
      "traffic", "route", "journey", "ticket", "stop", "platform",
      "airport", "walking", "pedestrian", "walk", "scooter", "moped",
      "motorcycle", "motorbike", "highway", "motorway", "freeway", "road",
      "directions", "gps", "navigation", "map", "transit", "connection",
      "connections", "connecting", "transfer",
    ],
    phrases: [
      "blue line", "red line", "green line", "yellow line", "getting around",
      "how to get to", "how to get from", "how do i get to", "how do i get from",
      "public transport", "bus route", "bus stop", "train station",
      "nearest station", "nearest stop", "travel time", "best route",
      "commuting to", "cycling route", "bike lane", "transit pass",
      "monthly pass", "oyster card", "metro card", "bus card",
      "getting there", "easiest way to get", "quickest way to get",
      "fastest way to get", "how far is", "how long does it take",
      "directions to", "go to work", "getting to work",
      "city center", "city centre", "downtown", "town center",
      "travel from", "travel to", "commute time", "transport options",
      "is there a bus", "is there a train", "does the bus", "does the train",
      "what line", "which bus", "which train", "which route",
      "how many stops", "how many minutes", "how many hours",
      "getting around the city", "getting around town", "any transport",
      "any buses", "any trains", "reliable transport",
    ],
  },
  Events: {
    words: [
      "event", "events", "festival", "concert", "party", "meetup", "show",
      "exhibition", "fair", "gig", "nightlife", "club", "market", "happening",
      "entertainment", "activities", "activity", "performance", "screening",
      "gathering", "conference", "workshop", "class", "parade", "fireworks",
      "game", "match", "tournament", "competition", "rally", "demonstration",
      "carnival", "celebration", "occasion", "ceremony", "fundraiser",
      "popup", "pop-up", "networking", "social", "socialise", "socialize",
      // day/time words — "this friday" style questions
      "friday", "saturday", "sunday", "tonight", "weekend", "evening",
      // exploring / visiting words
      "explore", "exploring", "visit", "visiting", "sightseeing", "tourist",
      "tourism", "attraction", "venue", "outing", "hangout", "chill",
      // culture / entertainment
      "comedy", "theatre", "theater", "gallery", "museum", "sports",
    ],
    phrases: [
      "things to do", "what to do", "fun things", "something to do",
      "going out", "night out", "this weekend", "this week", "next week",
      "things happening", "events near", "local events", "any events",
      "live music", "open mic", "art show", "food market", "craft fair",
      "community event", "worth visiting", "any shows", "what's on",
      "what is on", "anything happening", "anything going on",
      "anything fun", "fun things", "plans this weekend", "fun plans",
      "exploring the city", "explore the city", "explore the area", "places to visit",
      "places to see", "what's there to do", "is there anything",
      "cool things", "interesting things", "new things",
      "out and about", "night out", "weekend plans",
      "where can i go", "where should i go", "any suggestions",
      "worth going to", "anything on", "things to see",
      "any recommendations for", "how to meet people", "meet locals",
      "make friends", "social events", "community activities",
      // gaps: "anything to do", day-specific, casual phrasings
      "anything to do", "what can i do", "what should i do",
      "this friday", "this saturday", "this sunday", "this evening",
      "tomorrow night", "tomorrow evening", "next friday", "next saturday",
      "fun place", "fun places", "cool place", "cool places",
      "go out tonight", "going out tonight", "night out tonight",
      "where to explore", "what to explore", "what to visit",
      "what is there", "is there anything fun", "anything worth",
      "any fun", "any cool", "any interesting",
      "suggest something", "recommend something", "any ideas",
    ],
  },
  Safety: {
    words: [
      "safe", "safety", "unsafe", "crime", "crimes", "police", "emergency",
      "dangerous", "danger", "security", "scam", "scams", "theft", "robbery",
      "robbed", "assault", "assaulted", "threat", "threatening", "suspicious",
      "violence", "violent", "accident", "incident", "warning", "attack",
      "attacked", "mugging", "mugged", "pickpocket", "worried", "worry",
      "afraid", "scared", "fear", "fearful", "risk", "risky", "cctv",
      "surveillance", "neighbourhood watch", "watch", "disturbance",
      "harassment", "harassed", "stalking", "stalker",
      "sketchy", "dodgy", "rough", "shady", "creepy", "iffy",
    ],
    phrases: [
      "is it safe", "is the area safe", "is this area safe", "is it dangerous",
      "safety concerns", "crime rate", "neighborhood safety", "neighbourhood safety",
      "watch out", "be careful", "stay safe", "feel unsafe", "feeling unsafe",
      "getting scammed", "been scammed", "suspicious activity", "suspicious person",
      "emergency number", "call police", "call the police", "should i be worried",
      "should i worry", "anything to worry", "not safe", "anything strange",
      "something strange", "saw something", "seen something",
      "weird happening", "dangerous area", "avoid area", "should i avoid",
      "is it ok to", "is it okay to", "is it okay at night", "at night",
      "late at night", "walking alone", "walking at night", "out alone",
      "out at night", "any danger", "any problems", "any issues",
      "anyone been", "anyone experienced", "had a bad experience",
      "what to watch out for", "things to be aware of",
      "feels sketchy", "a bit sketchy", "looks sketchy", "bit dodgy",
      "safe at night", "safe to walk", "feel safe", "is it safe to walk",
      "walk alone", "walk by myself", "alone at night",
    ],
  },
  General: { words: [], phrases: [] },
};

// Strip common suffixes to match word stems (e.g. "eating"→"eat", "exploring"→"explor", "house"→"hous")
function normalizeStem(w: string): string {
  return w
    .replace(/ings?$/, "")
    .replace(/tion$/, "")
    .replace(/ness$/, "")
    .replace(/ment$/, "")
    .replace(/ers?$/, "")
    .replace(/ies$/, "y")
    .replace(/ied$/, "y")
    .replace(/ed$/, "")
    .replace(/s$/, "")
    .replace(/e$/, "");
}

// Returns true if `text` contains the word `w` respecting word boundaries
function wordBoundaryMatch(text: string, w: string): boolean {
  // Multi-word phrases use substring; single words use \b
  if (w.includes(" ")) return text.includes(w);
  try {
    return new RegExp(`\\b${w}\\b`).test(text);
  } catch {
    return text.includes(w);
  }
}

// Score a question body + tags against a category. 0 = no match.
// phrase hit = 3 pts, word/stem hit = 2 pts, threshold ≥ 2 to show.
// Uses bidirectional stemming: "exploring" matches signal word "explore" via shared stem "explor".
function scoreForCategory(text: string, tags: string[], category: string): number {
  const signals = TOPIC_SIGNALS[category];
  if (!signals) return 0;

  const lower = text.toLowerCase();
  const tagStr = tags.join(" ").toLowerCase();
  const combined = `${lower} ${tagStr}`;

  // Tag exact match (highest confidence — skips scoring entirely)
  if (tags.some((t) => t.toLowerCase() === category.toLowerCase())) return 100;

  let score = 0;

  // Phrase matches (multi-word, very specific)
  for (const phrase of signals.phrases) {
    if (combined.includes(phrase)) score += 3;
  }

  // Pre-compute stems of every word in the question for bidirectional matching
  // e.g. question has "exploring" → stem "explor"; signal word "explore" → stem "explor" → match
  const textStemSet = new Set(
    combined.split(/\W+/).filter((t) => t.length >= 3).map(normalizeStem)
  );

  for (const word of signals.words) {
    if (wordBoundaryMatch(combined, word)) {
      score += 2;
    } else {
      const wStem = normalizeStem(word);
      if (wStem.length >= 3 && (wordBoundaryMatch(combined, wStem) || textStemSet.has(wStem))) {
        score += 2;
      }
    }
  }

  return score;
}
type QuestionCategoryUi = (typeof QUESTION_CATEGORIES)[number];
const QUESTION_CATEGORY_SET: Set<string> = new Set(QUESTION_CATEGORIES);

function normalizeQuestionTagToUiTag(tag: string): QuestionCategoryUi | null {
  const t = tag.trim();
  const upper = t.toUpperCase();
  switch (upper) {
    case "HOUSING":
      return "Housing";
    case "FOOD":
      return "Food";
    case "TRANSIT":
      return "Transit";
    case "EVENTS":
      return "Events";
    case "SAFETY":
      return "Safety";
    case "GENERAL":
      return "General";
    default:
      return null;
  }
}

const INITIAL_QUESTIONS = [
  {
    id: "1",
    author: "Alex P.",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    question: "Best neighborhoods for young professionals?",
    tags: ["Housing", "Lifestyle"],
    votes: 24,
    answers: [
      { id: "a1", author: "Sarah W.", avatar: "https://randomuser.me/api/portraits/women/22.jpg", text: "Downtown is great for young professionals! Tons of restaurants, nightlife, and easy access to transit.", time: "2h ago", votes: 12 },
      { id: "a2", author: "Mark J.", avatar: "https://randomuser.me/api/portraits/men/40.jpg", text: "I'd recommend the Midtown area. Affordable rent and lots of co-working spaces nearby.", time: "2h ago", votes: 8 },
    ],
    time: "3h ago",
  },
  {
    id: "2",
    author: "Maria L.",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    question: "Where to find authentic Mexican food?",
    tags: ["Food"],
    votes: 31,
    answers: [
      { id: "a3", author: "Carlos R.", avatar: "https://randomuser.me/api/portraits/men/28.jpg", text: "La Casita on 5th Street is incredible! Family-owned, been there for 20 years. Their mole is the best in town.", time: "4h ago", votes: 15 },
      { id: "a4", author: "Elena G.", avatar: "https://randomuser.me/api/portraits/women/31.jpg", text: "Check out the taco trucks along Main Ave on weekends. Authentic street food and very affordable!", time: "4h ago", votes: 9 },
    ],
    time: "5h ago",
  },
  {
    id: "3",
    author: "David K.",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
    question: "Is the subway safe after midnight?",
    tags: ["Transit", "Safety"],
    votes: 45,
    answers: [
      { id: "a5", author: "Jessica M.", avatar: "https://randomuser.me/api/portraits/women/50.jpg", text: "Generally yes, especially on main lines. Avoid empty cars and stay near other passengers. The blue line is usually busy even late.", time: "6h ago", votes: 22 },
    ],
    time: "8h ago",
  },
  {
    id: "4",
    author: "Priya S.",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    question: "Dog-friendly parks with off-leash areas?",
    tags: ["Pets"],
    votes: 19,
    answers: [
      { id: "a6", author: "Tom H.", avatar: "https://randomuser.me/api/portraits/men/20.jpg", text: "Riverside Park has a huge off-leash section before 9am and after 7pm. My dog loves it there!", time: "10h ago", votes: 7 },
    ],
    time: "12h ago",
  },
  {
    id: "5",
    author: "James T.",
    avatar: "https://randomuser.me/api/portraits/men/12.jpg",
    question: "Best rooftop bars with live music?",
    tags: ["Nightlife", "Events"],
    votes: 37,
    answers: [
      { id: "a7", author: "Nina P.", avatar: "https://randomuser.me/api/portraits/women/65.jpg", text: "SkyLounge on 7th has live jazz on weekends. The Rooftop at Hotel Central also has amazing views and indie bands on Fridays.", time: "20h ago", votes: 18 },
      { id: "a8", author: "Rick D.", avatar: "https://randomuser.me/api/portraits/men/36.jpg", text: "Don't miss Sunset Terrace! Happy hour from 5-7pm and live DJs every Thursday.", time: "22h ago", votes: 11 },
    ],
    time: "1d ago",
  },
];

type UIQuestion = {
  id: string;
  /** Stable user id from API — use for block list, not display `author` (many rows can show as "User"). */
  authorId: string;
  author: string;
  avatar: string;
  question: string;
  tags: string[];
  votes: number;
  answerCount: number;
  answers: { id: string; author: string; avatar: string; text: string; time: string; votes: number }[];
  time: string;
};

function isQuestionHiddenByBlock(q: UIQuestion, isBlocked: (blockedKey: string) => boolean): boolean {
  if (q.authorId) return isBlocked(q.authorId);
  return isBlocked(q.author);
}

function toUiQuestion(q: Question): UIQuestion {
  const authorAny = (q as any).author ?? {};
  const tagsAny = (q as any).tags ?? [];
  const answersAny = (q as any).answers ?? [];
  return {
    id: q.id,
    authorId: authorAny.id != null && authorAny.id !== "" ? String(authorAny.id) : "",
    author: authorAny.name || authorAny.username || "User",
    avatar: authorAny.avatar || authorAny.avatarUrl || "https://randomuser.me/api/portraits/lego/1.jpg",
    question: (q as any).question || (q as any).title || "",
    tags: Array.isArray(tagsAny) ? tagsAny.map(String) : [],
    votes: (q as any).votes ?? (q as any).upvoteCount ?? 0,
    answerCount: (q as any).answerCount ?? (q as any).answersCount ?? (Array.isArray(answersAny) ? answersAny.length : 0),
    answers: (Array.isArray(answersAny) ? answersAny : []).map((a: Answer | any) => ({
      id: a.id,
      author: a.author?.name || a.author?.username || "User",
      avatar: a.author?.avatar || a.author?.avatarUrl || "https://randomuser.me/api/portraits/lego/1.jpg",
      text: a.text || a.content || "",
      time: relativeTime(a.createdAt),
      votes: a.votes ?? a.upvoteCount ?? 0,
    })),
    time: relativeTime(q.createdAt),
  };
}

/** "just now", "5m ago", "3h ago", "2d ago", then a short date. */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CommunityScreen() {
  const communityScrollRef = useRef<ScrollView>(null);
  useScrollToTop(communityScrollRef); // re-tap the Community tab → back to top
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { requireAuth } = useRequireAuth();
  const params = useLocalSearchParams<{ openQuestion?: string; ask?: string }>();
  const openedQuestionRef = useRef<string | null>(null);
  /** Same city as Feed explore hero — profile city, else demo default (must match API scope for stats vs list). */
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const { city, hasCity, chooseCity } = useAppCity(() => setCityPickerVisible(true));
  const insets = useSafeAreaInsets();
  const blockUser = useBlockStore((s) => s.blockUser);
  const isBlocked = useBlockStore((s) => s.isBlocked);
  const [filter, setFilter] = useState<string | null>(null);
  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  // Starts true so a tab that hasn't fetched yet shows skeletons (not an empty state) when it peeks in during a tab swipe.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAsk, setShowAsk] = useState(false);
  // Long-press on the Community tab opens the composer (`/community?ask=<token>`); each token fires once.
  const consumedAskRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const token = params.ask;
    if (!token || consumedAskRef.current === token) return;
    consumedAskRef.current = token;
    router.setParams({ ask: undefined });
    if (requireAuth(undefined, "Sign in to ask your neighbors a question.")) setShowAsk(true);
  }, [params.ask, requireAuth]);
  const [newQ, setNewQ] = useState("");
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerVotedIds, setAnswerVotedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [stats, setStats] = useState<CommunityStats>({
    membersCount: 0,
    questionsCount: 0,
    answersCount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const requestGenRef = useRef(0);
  const loadQuestions = useCallback(async (opts?: { silent?: boolean; page?: number }) => {
    if (!hasCity) {
      setQuestions([]);
      return;
    }
    const targetPage = opts?.page ?? 1;
    const gen = ++requestGenRef.current;
    const res = await getQuestions({
      page: targetPage,
      pageSize: 20,
      sort: sortBy,
      city,
      tag: (filter ?? undefined) as any,
    });
    if (gen !== requestGenRef.current) return; // a newer city/filter/sort request superseded this one
    const items = Array.isArray(res?.data) ? res.data : [];
    // Backend returns `isUpvoted` / `isSaved` / `answers[].isUpvoted`.
    const upvotedIds = new Set<string>();
    const savedIds = new Set<string>();
    const answerUpvotedIds = new Set<string>();

    for (const q of items as any[]) {
      if (q?.isUpvoted === true) upvotedIds.add(String(q.id));
      if (q?.isSaved === true) savedIds.add(String(q.id));
      if (Array.isArray(q?.answers)) {
        for (const a of q.answers as any[]) {
          if (a?.isUpvoted === true) answerUpvotedIds.add(String(a.id));
        }
      }
    }

    const merge = (prev: Set<string>, next: Set<string>) => (targetPage > 1 ? new Set([...prev, ...next]) : next);
    setVotedIds((p) => merge(p, upvotedIds));
    setBookmarkedIds((p) => merge(p, savedIds));
    setAnswerVotedIds((p) => merge(p, answerUpvotedIds));
    const ui = items.map(toUiQuestion);
    setQuestions((prev) => (targetPage > 1 ? [...prev, ...ui.filter((n) => !prev.some((o) => o.id === n.id))] : ui));
    setPage(targetPage);
    const meta = (res as any)?.meta;
    setHasMore(meta ? targetPage < Number(meta.totalPages ?? 1) : items.length >= 20);
    setLoadError(false);
  }, [sortBy, city, hasCity, filter]);

  const communityEverLoadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // SPRINT-27: 10-minute stale-while-revalidate gate
      // The gate only applies once this instance has data — a remounted screen must refetch.
      if (communityEverLoadedRef.current && !useListFetchCacheStore.getState().shouldFetch("community")) return undefined;
      let cancelled = false;
      const silent = communityEverLoadedRef.current;
      const cancelDefer = runAfterTransition(() => {
        if (cancelled) return;
        void (async () => {
          try {
            if (!silent) setLoading(true);
            await loadQuestions({ silent });
            communityEverLoadedRef.current = true;
            useListFetchCacheStore.getState().markFetched("community");
          } catch {
            // Keep any previously loaded rows; surface a persistent retry state instead of a blocking alert.
            setLoadError(true);
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
      });
      return () => {
        cancelled = true;
        cancelDefer();
      };
    }, [loadQuestions]),
  );

  // Re-fetch when sortBy or city changes (filter is now client-side — no API call needed)
  useEffect(() => {
    if (!communityEverLoadedRef.current) return;
    setLoading(true);
    loadQuestions({ silent: true })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [loadQuestions]);

  useEffect(() => {
    const raw = params.openQuestion;
    const id = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
    if (!id || openedQuestionRef.current === id) return;
    openedQuestionRef.current = id;
    (async () => {
      try {
        const q = await getQuestion(id);
        const ui = toUiQuestion(q);
        setQuestions((prev) => (prev.some((x) => x.id === ui.id) ? prev : [ui, ...prev]));
        if ((q as { isSaved?: boolean }).isSaved === true) {
          setBookmarkedIds((p) => {
            const n = new Set(p);
            n.add(ui.id);
            return n;
          });
        }
        setExpandedIds((p) => {
          const n = new Set(p);
          n.add(ui.id);
          return n;
        });
      } catch {
        appAlert("Question unavailable", "This question may have been removed.");
      }
    })();
  }, [params.openQuestion]);

  const onRefresh = useCallback(() => {
    useListFetchCacheStore.getState().clearFetchTimestamp("community"); // SPRINT-27
    (async () => {
      try {
        setRefreshing(true);
        setExpandedIds(new Set());
        setAnsweringId(null);
        setAnswerText("");
        await loadQuestions();
      } catch {
        setLoadError(true);
      } finally {
        setRefreshing(false);
      }
    })();
  }, [loadQuestions]);

  // Category filtering is server-side (COM-03); only locally blocked authors are hidden here.
  const filtered = questions.filter((q) => !isQuestionHiddenByBlock(q, isBlocked));
  const answerTotal = (q: UIQuestion) => Math.max(q.answerCount, q.answers.length);

  const sorted = [...filtered].sort((a, b) =>
    sortBy === "popular" ? b.votes - a.votes : 0
  );

  const handleVote = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to upvote helpful answers.")) return;
    const wasUpvoted = votedIds.has(id);
    const previousVotes = questions.find((q) => q.id === id)?.votes ?? 0;

    // Optimistic toggle
    setVotedIds((p) => {
      const n = new Set(p);
      wasUpvoted ? n.delete(id) : n.add(id);
      return n;
    });
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, votes: Math.max(0, q.votes + (wasUpvoted ? -1 : 1)) } : q
      )
    );

    try {
      const res = await voteQuestion(id);

      // Sync with server counts + state
      setVotedIds((_) => {
        const n = new Set<string>(_);
        if (res.upvoted) n.add(id);
        else n.delete(id);
        return n;
      });
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, votes: res.upvoteCount } : q)));
    } catch {
      // Rollback to previous state
      setVotedIds((_) => {
        const n = new Set<string>(_);
        wasUpvoted ? n.add(id) : n.delete(id);
        return n;
      });
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, votes: previousVotes } : q)));
    }
  };

  const handleAnswerVote = async (answerId: string, questionId: string) => {
    if (!requireAuth(undefined, "Sign in to upvote helpful answers.")) return;
    const wasUpvoted = answerVotedIds.has(answerId);
    const previousVotes =
      questions.find((q) => q.id === questionId)?.answers.find((a) => a.id === answerId)?.votes ?? 0;

    // Optimistic toggle
    setAnswerVotedIds((p) => {
      const n = new Set(p);
      wasUpvoted ? n.delete(answerId) : n.add(answerId);
      return n;
    });
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.id === answerId
                  ? { ...a, votes: Math.max(0, a.votes + (wasUpvoted ? -1 : 1)) }
                  : a
              ),
            }
          : q
      )
    );

    try {
      const res = await voteAnswer(questionId, answerId);

      setAnswerVotedIds((_) => {
        const n = new Set<string>(_);
        if (res.upvoted) n.add(answerId);
        else n.delete(answerId);
        return n;
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answers: q.answers.map((a) => (a.id === answerId ? { ...a, votes: res.upvoteCount } : a)) }
            : q
        )
      );
    } catch {
      // Rollback to previous vote count
      setAnswerVotedIds((_) => {
        const n = new Set<string>(_);
        wasUpvoted ? n.add(answerId) : n.delete(answerId);
        return n;
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answers: q.answers.map((a) => (a.id === answerId ? { ...a, votes: previousVotes } : a)) }
            : q
        )
      );
    }
  };

  const toggleExpanded = async (id: string) => {
    const isOpen = expandedIds.has(id);
    if (!isOpen) {
      const question = questions.find((q) => q.id === id);
      if (question && question.answers.length === 0) {
        try {
          const remote = await getAnswers(id);
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === id
                ? {
                    ...q,
                    answerCount: Math.max(q.answerCount, remote.length),
                    answers: remote.map((a: Answer) => ({
                      id: a.id,
                      author: a.author?.name || a.author?.username || "User",
                      avatar: a.author?.avatar || "https://randomuser.me/api/portraits/lego/1.jpg",
                      text: a.text,
                      time: relativeTime(a.createdAt),
                      votes: a.votes,
                    })),
                  }
                : q
            )
          );
        } catch {
          // no-op
        }
      }
    }
    setExpandedIds((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleDeleteAnswer = (answerId: string, questionId: string) => {
    appAlert("Delete Answer", "Remove your answer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === questionId ? { ...q, answers: q.answers.filter((a) => a.id !== answerId) } : q
            )
          );
        }
      },
    ]);
  };

  const toggleBookmark = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to save questions and find them later.")) return;
    const wasBookmarked = bookmarkedIds.has(id);
    setBookmarkedIds((p) => {
      const n = new Set(p);
      wasBookmarked ? n.delete(id) : n.add(id);
      return n;
    });
    try {
      const res = await bookmarkQuestion(id);
      const serverBookmarked = res.saved === true;

      setBookmarkedIds((_) => {
        const n = new Set<string>(_);
        if (serverBookmarked) n.add(id);
        else n.delete(id);
        return n;
      });
      showToast(serverBookmarked ? "Question saved to your bookmarks" : "Removed from bookmarks", "success");
    } catch {
      // Rollback optimistic toggle; never report success for a failed request.
      setBookmarkedIds((_) => {
        const n = new Set<string>(_);
        wasBookmarked ? n.add(id) : n.delete(id);
        return n;
      });
      showToast("Could not update your bookmark. Please try again.", "error");
    }
  };

  const handleShareQuestion = async (q: typeof questions[0]) => {
    try {
      const link = getShareLink("question", q.id);
      await Share.share({
        title: "ComLinkr Community",
        message: `Q: ${q.question}\n\nAsked by ${q.author} on ComLinkr Community · ${q.votes} votes · ${answerTotal(q)} answers\n\n${link}`,
        ...(Platform.OS === "ios" ? { url: link } : {}),
      });
    } catch (_) {}
  };

  const POST_REASONS = ["Spam or scam", "Misinformation", "Inappropriate content", "Harassment or hate", "Other"];
  const PERSON_REASONS = ["Scam or fraud", "Harassment", "Spam", "Inappropriate content", "Other"];

  const handleReportQuestion = async (q: UIQuestion) => {
    if (!requireAuth(undefined, "Sign in to report this post.")) return;
    const reason = await actionSheet({
      title: "Report post",
      message: "Why are you reporting this post?",
      options: POST_REASONS.map((r) => ({ label: r, value: r })),
    });
    if (!reason) return;
    try {
      await reportQuestion(q.id, reason);
      showToast("Reported. Thanks for keeping our community safe.", "success");
    } catch {
      showToast("Could not submit your report. Please try again.", "error");
    }
  };

  const handleReportPerson = async (q: UIQuestion) => {
    if (!q.authorId) {
      appAlert("Can't report this user", "This user's profile isn't available to report right now.");
      return;
    }
    if (!requireAuth(undefined, "Sign in to report this person.")) return;
    const reason = await actionSheet({
      title: "Report " + q.author,
      message: "Why are you reporting this person?",
      options: PERSON_REASONS.map((r) => ({ label: r, value: r })),
    });
    if (!reason) return;
    try {
      await reportUser(q.authorId, reason);
      showToast("Reported. Thanks for keeping our community safe.", "success");
    } catch {
      showToast("Could not submit your report. Please try again.", "error");
    }
  };

  const handleSubmitAnswer = async (questionId: string) => {
    if (!answerText.trim()) return;
    if (!requireAuth(undefined, "Sign in to answer and help your neighbors.")) return;
    try {
      const created = await submitAnswer(questionId, { content: answerText.trim() });
      const newAnswer = {
        id: created.id,
        author: created.author?.name || created.author?.username || "You",
        avatar: created.author?.avatar || "https://randomuser.me/api/portraits/lego/1.jpg",
        text: created.text || (created as any).content || "",
        time: relativeTime(created.createdAt),
        votes: created.votes ?? (created as any).upvoteCount ?? 0,
      };

      if ((created as any).isUpvoted === true) {
        setAnswerVotedIds((p) => {
          const n = new Set(p);
          n.add(created.id);
          return n;
        });
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, answerCount: q.answerCount + 1, answers: [newAnswer, ...q.answers] } : q
        )
      );
      setAnswerText("");
      setAnsweringId(null);
      setExpandedIds((p) => new Set(p).add(questionId));
    } catch {
      appAlert("Could not post answer", "Please try again.");
    }
  };

  const handleSubmitQuestion = async () => {
    if (!newQ.trim() || posting) return;
    setPosting(true);
    try {
      const topic = filter && filter !== "All" ? filter : null;
      const category =
        topic === "Housing"
          ? "HOUSING"
          : topic === "Food"
            ? "FOOD"
            : topic === "Transit"
              ? "TRANSIT"
              : topic === "Events"
                ? "EVENTS"
                : topic === "Safety"
                  ? "SAFETY"
                  : "GENERAL"; // Pets/Nightlife/etc -> GENERAL

      const created = await askQuestion({
        title: newQ.trim(),
        body: "",
        category,
        tags: topic ? ([topic] as any) : (["General"] as any),
      });
      const uiQ = toUiQuestion(created);
      setQuestions((prev) => [uiQ, ...prev]);
      setExpandedIds((p) => { const n = new Set(p); n.add(uiQ.id); return n; });
      setNewQ("");
      setShowAsk(false);
    } catch (e) {
      // Keep the draft so the user can retry.
      showToast(e instanceof ApiError ? e.message : "Could not post your question. Please try again.", "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top"]}>
      <AppHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <ScrollView
        ref={communityScrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand.blue}
            colors={[Colors.brand.blue]}
          />
        }
      >
        {/* Hero */}
        <LinearGradient
          colors={[Colors.brand.blue, Colors.brand.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <Text style={s.heroLabel}>COMMUNITY Q&A</Text>
          <Text style={s.heroTitle}>Ask. Answer. Connect.</Text>
          <Text style={s.heroSub}>Get local tips from people around you.</Text>

          {/* Sprint 21: hide aggregate stats row; stats state + fetch kept for future use */}
          {false && (
            <View style={s.statsRow}>
              {[
                { label: "Members", value: stats.membersCount, icon: "people-outline" as const },
                { label: "Questions", value: stats.questionsCount, icon: "help-circle-outline" as const },
                { label: "Answers", value: stats.answersCount, icon: "chatbubble-outline" as const },
              ].map((stat) => (
                <View key={stat.label} style={s.statItem}>
                  <Ionicons name={stat.icon} size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={s.statValue}>
                    {stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value}
                  </Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ask bar */}
          <Pressable onPress={() => { if (requireAuth(undefined, "Sign in to ask your neighbors a question.")) setShowAsk(true); }} style={s.askBar}>
            <View style={s.askIconWrap}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.brand.blue} />
            </View>
            <Text style={s.askPlaceholder}>What do you need help with?</Text>
            <View style={s.askCtaBtn}>
              <Text style={s.askCtaText}>Ask</Text>
            </View>
          </Pressable>
        </LinearGradient>

        {/* Topic Chips */}
        <GHScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipScroll}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {TOPICS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setFilter(t === "All" ? null : t)}
              accessibilityRole="button"
              accessibilityLabel={`${t} topic`}
              accessibilityState={{ selected: filter === t || (!filter && t === "All") }}
              style={[s.chip, { backgroundColor: tc.chipBg }, (filter === t || (!filter && t === "All")) && s.chipActive]}
            >
              <Text
                style={[s.chipText, { color: tc.chipText }, (filter === t || (!filter && t === "All")) && s.chipTextActive]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </GHScrollView>

        {/* Section header with sort */}
        <View style={s.secHeader}>
          <Text style={[s.secTitle, { color: tc.textPrimary }]}>
            {filter ? `Questions about ${filter}` : "Latest Questions"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {filter && (
              <Pressable onPress={() => setFilter(null)}>
                <Text style={s.clearBtn}>Clear</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setSortBy(sortBy === "recent" ? "popular" : "recent")}
              style={[s.sortBtn, isDark && { backgroundColor: tc.inputBg }]}
            >
              <Ionicons name={sortBy === "popular" ? "flame" : "time-outline"} size={13} color={Colors.brand.blue} />
              <Text style={s.sortBtnText}>{sortBy === "popular" ? "Popular" : "Recent"}</Text>
            </Pressable>
          </View>
        </View>

        {hasCity && loadError && sorted.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Showing older results. Tap to retry"
            onPress={onRefresh}
            style={[s.staleBanner, { backgroundColor: tc.warningBg, borderColor: tc.warningBorder }]}
          >
            <Ionicons name="alert-circle-outline" size={16} color={tc.warningText} />
            <Text style={[s.staleText, { color: tc.warningText }]}>Couldn't refresh. Showing older results. Tap to retry.</Text>
          </Pressable>
        ) : null}
        {!hasCity ? (
          <ListState kind="needs-city" onAction={chooseCity} />
        ) : loading && sorted.length === 0 ? (
          <ListState kind="loading" skeleton="row" />
        ) : loadError && sorted.length === 0 ? (
          <ListState
            kind="error"
            onAction={() => {
              setLoadError(false);
              setLoading(true);
              loadQuestions().catch(() => setLoadError(true)).finally(() => setLoading(false));
            }}
          />
        ) : sorted.length === 0 ? (
          filter ? (
            <ListState
              kind="filtered-empty"
              title={`No ${filter} questions yet`}
              message="Be the first to ask, or browse all topics."
              actionLabel="Show all topics"
              onAction={() => setFilter(null)}
            />
          ) : (
            <ListState
              kind="empty"
              icon="chatbubbles-outline"
              title="No questions yet"
              message={`Nobody has asked in ${city} yet.`}
              actionLabel="Be the first to ask"
              onAction={() => { if (requireAuth(undefined, "Sign in to ask your neighbors a question.")) setShowAsk(true); }}
            />
          )
        ) : (
          sorted.map((q) => (
            <View key={q.id} style={[s.qaCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <View style={s.qaHead}>
                <FadeImage uri={q.avatar} style={s.qaAvatar} showLoadingSpinner={true} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.qaAuthor, { color: tc.textPrimary }]}>{q.author}</Text>
                  <Text style={[s.qaTime, { color: tc.textTertiary }]}>{q.time}</Text>
                </View>
                {/* Share & Bookmark & More */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Pressable style={s.iconBtn} onPress={() => handleShareQuestion(q)}>
                    <Ionicons name="share-social-outline" size={16} color={Colors.text.tertiary} />
                  </Pressable>
                  <Pressable style={s.iconBtn} onPress={() => toggleBookmark(q.id)}>
                    <Ionicons
                      name={bookmarkedIds.has(q.id) ? "bookmark" : "bookmark-outline"}
                      size={16}
                      color={bookmarkedIds.has(q.id) ? Colors.brand.blue : Colors.text.tertiary}
                    />
                  </Pressable>
                  <Pressable style={s.iconBtn} onPress={() =>
                    appAlert(q.author, "What would you like to do?", [
                      { text: "Report post", onPress: () => handleReportQuestion(q) },
                      { text: "Report " + q.author, onPress: () => handleReportPerson(q) },
                      { text: "Block " + q.author, style: "destructive", onPress: () =>
                        appAlert("Block " + q.author + "?", "You won't see their posts anymore. You can unblock them in Settings → Blocked Users.", [
                          { text: "Block", style: "destructive", onPress: async () => {
                            await blockUser({ id: q.authorId || q.author, name: q.author, avatar: q.avatar });
                            if (q.authorId) {
                              try { await blockUserApi(q.authorId); } catch { /* best-effort */ }
                            }
                            showToast(q.author + " has been blocked. Manage blocked users in Settings.", "success");
                          }},
                          { text: "Cancel", style: "cancel" },
                        ])
                      },
                      { text: "Cancel", style: "cancel" },
                    ])
                  }>
                    <Ionicons name="flag-outline" size={16} color="#DC2626" />
                  </Pressable>
                </View>
              </View>
              <LinkifiedText text={q.question} style={[s.qaQuestion, { color: tc.textPrimary }]} />
              <View style={s.qaTags}>
                {Array.from(
                  new Set(
                    q.tags
                      .map((t) => normalizeQuestionTagToUiTag(String(t)))
                      .filter((t): t is QuestionCategoryUi => !!t && QUESTION_CATEGORY_SET.has(t))
                  )
                ).map((t) => (
                  <Pressable key={t} onPress={() => setFilter(t)} style={s.qaTag}>
                    <Text style={s.qaTagText}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={[s.qaActions, { borderTopColor: tc.borderLight }]}>
                <Pressable
                  onPress={() => handleVote(q.id)}
                  style={[s.voteBtn, votedIds.has(q.id) && s.voteBtnActive]}
                >
                  <Ionicons
                    name="arrow-up"
                    size={14}
                    color={votedIds.has(q.id) ? Colors.brand.blue : Colors.text.tertiary}
                  />
                  <Text style={[s.voteCount, { color: tc.textPrimary }, votedIds.has(q.id) && { color: Colors.brand.blue }]}>
                    {q.votes}
                  </Text>
                </Pressable>
                <Pressable onPress={() => toggleExpanded(q.id)} style={s.answerBadge}>
                  <Ionicons
                    name={expandedIds.has(q.id) ? "chatbubble" : "chatbubble-outline"}
                    size={14}
                    color={expandedIds.has(q.id) ? Colors.brand.blue : Colors.text.secondary}
                  />
                  <Text style={[s.answerCount, expandedIds.has(q.id) && { color: Colors.brand.blue }]}>
                    {answerTotal(q)} {answerTotal(q) === 1 ? "answer" : "answers"}
                  </Text>
                  <Ionicons
                    name={expandedIds.has(q.id) ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={Colors.text.tertiary}
                  />
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable
                  style={[s.replyBtn, answeringId === q.id && { backgroundColor: Colors.brand.blue }]}
                  onPress={() => { setAnsweringId(answeringId === q.id ? null : q.id); setAnswerText(""); }}
                >
                  <Ionicons
                    name="create-outline"
                    size={12}
                    color={answeringId === q.id ? "#FFF" : Colors.brand.blue}
                  />
                  <Text style={[s.replyBtnText, answeringId === q.id && { color: "#FFF" }]}>Answer</Text>
                </Pressable>
              </View>

              {/* Answer Input */}
              {answeringId === q.id && (
                <View style={[s.answerInputWrap, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.answerInput, { color: tc.textPrimary }]}
                    placeholder="Write your answer..."
                    placeholderTextColor={tc.textTertiary}
                    value={answerText}
                    onChangeText={setAnswerText}
                    multiline
                    autoFocus
                  />
                  <View style={s.answerInputActions}>
                    <Pressable onPress={() => { setAnsweringId(null); setAnswerText(""); }} style={s.answerCancelBtn}>
                      <Text style={s.answerCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[s.answerSubmitBtn, !answerText.trim() && { opacity: 0.5 }]}
                      onPress={() => handleSubmitAnswer(q.id)}
                    >
                      <View style={[s.answerSubmitGrad, { backgroundColor: Colors.brand.blue }]}>
                        <Ionicons name="send" size={12} color="#FFF" />
                        <Text style={s.answerSubmitText}>Post</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Expanded Answers */}
              {expandedIds.has(q.id) && q.answers.length > 0 && (
                <View style={s.answersContainer}>
                  <View style={s.answersHeader}>
                    <Ionicons name="chatbubbles-outline" size={14} color={Colors.brand.blue} />
                    <Text style={s.answersHeaderText}>{answerTotal(q)} {answerTotal(q) === 1 ? "Answer" : "Answers"}</Text>
                  </View>
                  {q.answers.map((a) => (
                    <View key={a.id} style={[s.answerCard, { backgroundColor: tc.sectionBg }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <FadeImage uri={a.avatar} style={s.answerAvatar} showLoadingSpinner={true} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.answerAuthor, { color: tc.textPrimary }]}>{a.author}</Text>
                          <Text style={[s.answerTime, { color: tc.textTertiary }]}>{a.time}</Text>
                        </View>
                        <Pressable
                          onPress={() => handleAnswerVote(a.id, q.id)}
                          style={[s.answerVoteBtn, answerVotedIds.has(a.id) && s.answerVoteBtnActive]}
                        >
                          <Ionicons
                            name="arrow-up"
                            size={12}
                            color={answerVotedIds.has(a.id) ? Colors.brand.blue : Colors.text.tertiary}
                          />
                          <Text style={[s.answerVoteCount, answerVotedIds.has(a.id) && { color: Colors.brand.blue }]}>
                            {a.votes}
                          </Text>
                        </Pressable>
                        {a.author === "You" && (
                          <Pressable onPress={() => handleDeleteAnswer(a.id, q.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 4 }}>
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </Pressable>
                        )}
                      </View>
                      <LinkifiedText text={a.text} style={[s.answerText, { color: tc.textSecondary }]} />
                    </View>
                  ))}
                </View>
              )}

              {/* Expand prompt if answers exist but not expanded */}
              {!expandedIds.has(q.id) && answerTotal(q) > 0 && (
                <Pressable onPress={() => toggleExpanded(q.id)} style={s.expandPrompt}>
                  <Text style={s.expandPromptText}>View {answerTotal(q)} {answerTotal(q) === 1 ? "answer" : "answers"}</Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.brand.blue} />
                </Pressable>
              )}
            </View>
          ))
        )}

        {hasCity && hasMore && sorted.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load more questions"
            disabled={loadingMore}
            onPress={() => {
              setLoadingMore(true);
              loadQuestions({ page: page + 1 })
                .catch(() => showToast("Could not load more questions.", "error"))
                .finally(() => setLoadingMore(false));
            }}
            style={[s.loadMoreBtn, { borderColor: tc.borderLight, backgroundColor: tc.cardBg }]}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={Colors.brand.blue} />
            ) : (
              <Text style={s.loadMoreText}>Load more</Text>
            )}
          </Pressable>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Ask Question Modal */}
      <Modal visible={showAsk} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowAsk(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalOverlay}
        >
          <View style={[s.modalSheet, { backgroundColor: tc.sheetBg, paddingBottom: Math.max(insets.bottom, 12) + rs(16) }]}>
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: tc.textPrimary }]}>Ask the Community</Text>
            <Text style={[s.modalSubtitle, { color: tc.textSecondary }]}>
              Get answers from locals who know the area
            </Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]}
              placeholder="Type your question..."
              placeholderTextColor={tc.textTertiary}
              value={newQ}
              onChangeText={setNewQ}
              maxLength={300}
              accessibilityLabel="Your question"
              editable={!posting}
              multiline
              autoFocus
            />
            <Text style={{ alignSelf: "flex-end", fontSize: rs(11), color: tc.textTertiary, marginTop: rs(4) }}>
              {newQ.length}/300
            </Text>
            <View style={s.modalActions}>
              <Pressable onPress={() => setShowAsk(false)} disabled={posting} style={[s.modalCancel, { backgroundColor: tc.inputBg }]}>
                <Text style={[s.modalCancelText, { color: tc.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitQuestion}
                disabled={!newQ.trim() || posting}
                accessibilityRole="button"
                accessibilityLabel="Post question"
                accessibilityState={{ disabled: !newQ.trim() || posting, busy: posting }}
                style={[s.modalSubmit, (!newQ.trim() || posting) && { opacity: 0.5 }]}
              >
                <View style={[s.modalSubmitGrad, { backgroundColor: Colors.brand.blue }]}>
                  {posting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.modalSubmitText}>Post Question</Text>}
                </View>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <GuestCityPickerModal visible={cityPickerVisible} onClose={() => setCityPickerVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: rs(20) },

  hero: {
    margin: rs(16),
    borderRadius: rs(20),
    padding: rs(20),
    overflow: "hidden",
    shadowColor: Colors.brand.blue,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroLabel: {
    fontSize: rs(10),
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.5,
  },
  heroTitle: { fontSize: rs(24), fontWeight: "800", color: "#FFF", marginTop: rs(6) },
  heroSub: { fontSize: rs(13), color: "rgba(255,255,255,0.9)", marginTop: rs(4) },

  statsRow: {
    flexDirection: "row",
    marginTop: rs(16),
    marginBottom: rs(14),
    gap: 0,
    borderRadius: rs(12),
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: rs(10),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: rs(2),
  },
  statValue: { fontSize: rs(16), fontWeight: "800", color: "#FFF" },
  statLabel: { fontSize: rs(10), color: "rgba(255,255,255,0.75)", fontWeight: "500" },

  askBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: rs(16),
    paddingHorizontal: rs(14),
    paddingVertical: rs(11),
    marginTop: rs(18),
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    gap: rs(10),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  askIconWrap: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    backgroundColor: Colors.brand.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  askPlaceholder: { flex: 1, fontSize: rs(13.5), color: Colors.text.tertiary },
  askCtaBtn: {
    backgroundColor: Colors.brand.blue,
    borderRadius: rs(10),
    paddingHorizontal: rs(14),
    paddingVertical: rs(7),
  },
  askCtaText: { fontSize: rs(12.5), fontWeight: "700", color: "#FFF" },

  chipScroll: { marginTop: rs(12) },
  loadMoreBtn: { marginHorizontal: rs(16), marginTop: rs(8), minHeight: 46, borderRadius: rs(12), borderWidth: 1, alignItems: "center", justifyContent: "center" },
  loadMoreText: { fontSize: rs(14), fontWeight: "700", color: Colors.brand.blue },
  staleBanner: { flexDirection: "row", alignItems: "center", gap: rs(8), marginHorizontal: rs(16), marginBottom: rs(8), padding: rs(10), borderRadius: rs(12), borderWidth: 1 },
  staleText: { flex: 1, fontSize: rs(12), fontWeight: "600" },
  chip: {
    backgroundColor: "#F3F4F6",
    borderRadius: rs(10),
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    marginRight: rs(8),
  },
  chipActive: { backgroundColor: Colors.brand.blue },
  chipText: { fontSize: rs(13), fontWeight: "600", color: Colors.text.secondary },
  chipTextActive: { color: "#FFF" },

  secHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: rs(16),
    marginTop: rs(20),
    marginBottom: rs(12),
  },
  secTitle: { fontSize: rs(17), fontWeight: "800", color: Colors.text.primary },
  clearBtn: { fontSize: rs(13), fontWeight: "700", color: Colors.brand.blue },
  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: Colors.brand.blueLight, borderRadius: rs(8),
    paddingHorizontal: rs(10), paddingVertical: rs(5),
  },
  sortBtnText: { fontSize: rs(11), fontWeight: "600", color: Colors.brand.blue },

  empty: {
    alignItems: "center",
    paddingVertical: rs(40),
    marginHorizontal: rs(16),
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: rs(14),
    fontWeight: "600",
    color: Colors.text.secondary,
    marginTop: rs(12),
  },
  emptyBtn: {
    marginTop: rs(16),
    backgroundColor: Colors.brand.blue,
    borderRadius: rs(12),
    paddingHorizontal: rs(20),
    paddingVertical: rs(10),
  },
  emptyBtnText: { fontSize: rs(13), fontWeight: "700", color: "#FFF" },

  qaCard: {
    marginHorizontal: rs(16),
    marginBottom: rs(12),
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    padding: rs(16),
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  qaHead: { flexDirection: "row", alignItems: "center", gap: rs(10), marginBottom: rs(10) },
  qaAvatar: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    backgroundColor: Colors.brand.blueLight,
  },
  qaAuthor: { fontSize: rs(14), fontWeight: "700", color: Colors.text.primary },
  qaTime: { fontSize: rs(12), color: Colors.text.tertiary, marginTop: rs(1) },
  qaQuestion: {
    fontSize: rs(15),
    fontWeight: "600",
    color: Colors.text.primary,
    lineHeight: rs(22),
  },
  qaTags: { flexDirection: "row", gap: rs(6), marginTop: rs(10) },
  qaTag: {
    backgroundColor: Colors.brand.blueLight,
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
  },
  qaTagText: { fontSize: rs(11), fontWeight: "600", color: Colors.brand.blue },
  qaActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    marginTop: rs(14),
    paddingTop: rs(12),
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: rs(10),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
  },
  voteBtnActive: { borderColor: Colors.brand.blue, backgroundColor: Colors.brand.blueLight },
  voteCount: { fontSize: rs(14), fontWeight: "700", color: Colors.text.primary },
  answerBadge: { flexDirection: "row", alignItems: "center", gap: rs(5) },
  answerCount: { fontSize: rs(13), fontWeight: "600", color: Colors.text.secondary },
  replyBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    borderRadius: rs(8),
    borderWidth: 1.5,
    borderColor: Colors.brand.blue,
    paddingHorizontal: rs(12),
    paddingVertical: rs(5),
  },
  replyBtnText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },

  // Icon buttons for share/bookmark/more
  iconBtn: {
    width: rs(30), height: rs(30), borderRadius: rs(8),
    backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center",
  },

  // Answer input
  answerInputWrap: {
    marginTop: rs(12), backgroundColor: "#F0F8FF", borderRadius: rs(14),
    padding: rs(14), borderWidth: 1.5, borderColor: Colors.brand.blue + "55",
    shadowColor: Colors.brand.blue, shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  answerInput: {
    fontSize: rs(14), color: Colors.text.primary, minHeight: rs(72),
    textAlignVertical: "top", lineHeight: rs(20),
  },
  answerInputActions: {
    flexDirection: "row", justifyContent: "flex-end", gap: rs(8), marginTop: rs(12),
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB", paddingTop: rs(10),
  },
  answerCancelBtn: {
    paddingHorizontal: rs(14), paddingVertical: rs(8), borderRadius: rs(10),
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  answerCancelText: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary },
  answerSubmitBtn: { borderRadius: rs(10), overflow: "hidden" },
  answerSubmitGrad: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    paddingHorizontal: rs(16), paddingVertical: rs(8), borderRadius: rs(10),
  },
  answerSubmitText: { fontSize: rs(12), fontWeight: "700", color: "#FFF" },

  // Answers container
  answersContainer: {
    marginTop: rs(12), borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: rs(12),
  },
  answersHeader: {
    flexDirection: "row", alignItems: "center", gap: rs(6), marginBottom: rs(10),
  },
  answersHeaderText: { fontSize: rs(13), fontWeight: "700", color: Colors.brand.blue },
  answerCard: {
    backgroundColor: "#F9FAFB", borderRadius: rs(12), padding: rs(12), marginBottom: rs(8),
  },
  answerAvatar: { width: rs(28), height: rs(28), borderRadius: rs(14), backgroundColor: Colors.brand.blueLight },
  answerAuthor: { fontSize: rs(12), fontWeight: "700", color: Colors.text.primary },
  answerTime: { fontSize: rs(10), color: Colors.text.tertiary },
  answerText: { fontSize: rs(13), color: Colors.text.secondary, lineHeight: rs(20), marginTop: rs(8) },
  answerVoteBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(3),
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: rs(8),
    paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  answerVoteBtnActive: { borderColor: Colors.brand.blue, backgroundColor: Colors.brand.blueLight },
  answerVoteCount: { fontSize: rs(11), fontWeight: "700", color: Colors.text.tertiary },

  // Expand prompt
  expandPrompt: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(4),
    marginTop: rs(10), paddingTop: rs(8), borderTopWidth: 1, borderTopColor: "#F3F4F6",
  },
  expandPromptText: { fontSize: rs(12), fontWeight: "600", color: Colors.brand.blue },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: rs(24),
    borderTopRightRadius: rs(24),
    paddingHorizontal: rs(20),
    paddingBottom: rs(40),
    paddingTop: rs(12),
  },
  modalHandle: {
    width: rs(40),
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: rs(16),
  },
  modalTitle: {
    fontSize: rs(18),
    fontWeight: "800",
    color: Colors.text.primary,
    marginBottom: rs(4),
  },
  modalSubtitle: {
    fontSize: rs(13),
    color: Colors.text.secondary,
    marginBottom: rs(16),
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: rs(14),
    fontSize: rs(15),
    color: Colors.text.primary,
    minHeight: rs(110),
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: rs(12), marginTop: rs(16) },
  modalCancel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rs(14),
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingVertical: rs(14),
  },
  modalCancelText: { fontSize: rs(15), fontWeight: "600", color: Colors.text.secondary },
  modalSubmit: { flex: 2, borderRadius: rs(14), overflow: "hidden" },
  modalSubmitGrad: {
    paddingVertical: rs(14),
    alignItems: "center",
    borderRadius: rs(14),
  },
  modalSubmitText: { fontSize: rs(15), fontWeight: "700", color: "#FFF" },
});
