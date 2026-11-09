import { palette } from "../../theme/palette";
import { Colors } from "../../theme/colors";
import { type NeighborhoodMood } from "../../api/feed.api";

export const HERO_MOOD_OPTIONS: { mood: NeighborhoodMood; emoji: string; label: string; color: string }[] = [
  { mood: "GREAT", emoji: "😊", label: "Great", color: palette.green400 },
  { mood: "EXCITING", emoji: "🎉", label: "Exciting", color: palette.amber400 },
  { mood: "CHILL", emoji: "😌", label: "Chill", color: palette.blue400 },
  { mood: "MEH", emoji: "🤔", label: "Meh", color: palette.orange500 },
  { mood: "NOISY", emoji: "😤", label: "Noisy", color: palette.red500 },
];

export const POSTS = [
  { id: "1", author: "Sarah M.", avatar: "https://randomuser.me/api/portraits/women/44.jpg", time: "2h ago", title: "New bike lanes coming to downtown!", content: "The city just approved 15 miles of protected bike lanes. Construction starts this spring.", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=500&q=70", likes: 127, comments: 34, tags: ["Transit", "City"], verified: true },
  { id: "2", author: "Mike R.", avatar: "https://randomuser.me/api/portraits/men/32.jpg", time: "4h ago", title: "Hidden gem restaurant in Midtown", content: "Just discovered an amazing Thai place on 5th Ave. The pad thai is incredible and super affordable!", image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=500&q=70", likes: 89, comments: 22, tags: ["Food", "Review"], verified: false },
  { id: "3", author: "Community Board", avatar: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=80&q=60", time: "6h ago", title: "Free concert in Central Park this Saturday", content: "Local bands performing from 2–8 PM. Bring blankets and food. Family friendly!", image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?w=500&q=70", likes: 234, comments: 56, tags: ["Events", "Free"], verified: true },
  { id: "4", author: "Lisa K.", avatar: "https://randomuser.me/api/portraits/women/68.jpg", time: "8h ago", title: "Tips for apartment hunting in this market", content: "After searching for 3 months, here are my top tips for finding affordable housing...", image: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=500&q=70", likes: 186, comments: 41, tags: ["Housing", "Tips"], verified: false },
  { id: "5", author: "James T.", avatar: "https://randomuser.me/api/portraits/men/55.jpg", time: "10h ago", title: "New dog park opening next month!", content: "Great news for pet owners — the city approved a brand new off-leash dog park on Oak St. It'll have separate areas for small and large dogs.", image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&q=70", likes: 312, comments: 67, tags: ["Pets", "Community"], verified: true },
  { id: "6", author: "Priya S.", avatar: "https://randomuser.me/api/portraits/women/29.jpg", time: "12h ago", title: "Street fair this weekend — road closures", content: "Heads up! Main St will be closed Saturday 8 AM – 6 PM for the annual spring street fair. 100+ vendors, live music, and kids' activities.", image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=500&q=70", likes: 245, comments: 53, tags: ["Events", "Alert"], verified: true },
  { id: "7", author: "David L.", avatar: "https://randomuser.me/api/portraits/men/76.jpg", time: "1d ago", title: "Water main repair update", content: "The city says the water main repair on Elm Ave is 80% complete. Full pressure should be restored by Wednesday.", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&q=70", likes: 98, comments: 19, tags: ["City", "Update"], verified: false },
  { id: "8", author: "Neighborhood Watch", avatar: "https://images.unsplash.com/photo-1531956656798-56686eeef3d4?w=80&q=60", time: "1d ago", title: "Package theft prevention tips", content: "With the holidays coming, here are some smart ways to protect your deliveries. Consider a lockbox or coordinate with neighbors.", image: "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=500&q=70", likes: 156, comments: 38, tags: ["Safety", "Tips"], verified: true },
];

// ── Feed tabs ──────────────────────────────────────────
export const FEED_TABS = ["News", "Events", "Stories", "Quests", "Polls"] as const;
export type FeedTab = typeof FEED_TABS[number];


// ── Community Stories Data ─────────────────────────────
export const STORY_CATEGORIES = ["All", "Events", "Food", "Housing", "Culture", "Local News", "General"] as const;
export type StoryCategory = typeof STORY_CATEGORIES[number];

export interface CommunityStory {
  id: string;
  author: string;
  authorAvatar: string;
  authorBio: string;
  authorFollowers: number;
  verified: boolean;
  thumbnail: string;
  title: string;
  description: string;
  category: Exclude<StoryCategory, "All">;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  timeAgo: string;
  hasNewStory: boolean;
  isBookmarked: boolean;
  hashtags: string[];
  location: string;
  mediaType: "photo" | "video" | "reel";
  reactions: { emoji: string; count: number }[];
}

// Trending hashtags for the Stories page
export const TRENDING_HASHTAGS = [
  { tag: "#NYCVibes", posts: 2340, trending: true },
  { tag: "#StreetFood", posts: 1890, trending: true },
  { tag: "#ApartmentHunting", posts: 1560, trending: false },
  { tag: "#CommunityEvents", posts: 1230, trending: true },
  { tag: "#HiddenGems", posts: 980, trending: false },
  { tag: "#CityLife", posts: 870, trending: true },
  { tag: "#LocalEats", posts: 760, trending: false },
  { tag: "#Nightlife", posts: 650, trending: false },
];

// Top creators for spotlight section
export const TOP_CREATORS = [
  { id: "tc1", name: "NYC Events", avatar: "https://randomuser.me/api/portraits/women/44.jpg", posts: 156, followers: 23400, verified: true, badge: "🏆" },
  { id: "tc2", name: "FoodieNY", avatar: "https://randomuser.me/api/portraits/men/32.jpg", posts: 89, followers: 18900, verified: true, badge: "🔥" },
  { id: "tc3", name: "Desi Vibes", avatar: "https://randomuser.me/api/portraits/women/68.jpg", posts: 134, followers: 15600, verified: true, badge: "⭐" },
  { id: "tc4", name: "CityBeat", avatar: "https://randomuser.me/api/portraits/men/22.jpg", posts: 201, followers: 31200, verified: true, badge: "📰" },
  { id: "tc5", name: "Sarah Kim", avatar: "https://randomuser.me/api/portraits/women/33.jpg", posts: 67, followers: 8900, verified: false, badge: "🌟" },
];

export const COMMUNITY_STORIES: CommunityStory[] = [
  {
    id: "s1",
    author: "NYC Events",
    authorAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    authorBio: "Your go-to for all NYC events & happenings",
    authorFollowers: 23400,
    verified: true,
    thumbnail: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=70",
    title: "Spring Festival highlights from Central Park 🌸",
    description: "The most beautiful spring festival of the year! Cherry blossoms, live music, and amazing food vendors. Don't miss it!",
    category: "Events",
    duration: 32,
    views: 12400,
    likes: 890,
    comments: 156,
    shares: 89,
    timeAgo: "2h ago",
    hasNewStory: true,
    isBookmarked: false,
    hashtags: ["#SpringFestival", "#CentralPark", "#NYCVibes"],
    location: "Central Park, NYC",
    mediaType: "reel",
    reactions: [{ emoji: "🔥", count: 234 }, { emoji: "❤️", count: 456 }, { emoji: "😍", count: 123 }],
  },
  {
    id: "s2",
    author: "FoodieNY",
    authorAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
    authorBio: "Discovering NYC's best eats, one slice at a time",
    authorFollowers: 18900,
    verified: true,
    thumbnail: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=70",
    title: "Best $1 pizza slice in Manhattan — taste test! 🍕",
    description: "I tried every dollar slice in Manhattan and ranked them. You won't believe which one came out on top!",
    category: "Food",
    duration: 45,
    views: 23100,
    likes: 2100,
    comments: 342,
    shares: 267,
    timeAgo: "4h ago",
    hasNewStory: true,
    isBookmarked: true,
    hashtags: ["#DollarSlice", "#NYCPizza", "#StreetFood"],
    location: "Manhattan, NYC",
    mediaType: "reel",
    reactions: [{ emoji: "🍕", count: 567 }, { emoji: "🤤", count: 334 }, { emoji: "🔥", count: 189 }],
  },
  {
    id: "s3",
    author: "Raj Patel",
    authorAvatar: "https://randomuser.me/api/portraits/men/45.jpg",
    authorBio: "Brooklyn apartment hunter & housing tips",
    authorFollowers: 5600,
    verified: false,
    thumbnail: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=70",
    title: "Found this amazing 2BR in Brooklyn for $2,200! 🏠",
    description: "After months of searching, I finally found the perfect apartment. Here's my tour and tips for fellow apartment hunters.",
    category: "Housing",
    duration: 28,
    views: 8900,
    likes: 670,
    comments: 89,
    shares: 145,
    timeAgo: "5h ago",
    hasNewStory: true,
    isBookmarked: false,
    hashtags: ["#BrooklynApartment", "#ApartmentHunting", "#HousingTips"],
    location: "Brooklyn, NYC",
    mediaType: "video",
    reactions: [{ emoji: "🏠", count: 145 }, { emoji: "👏", count: 89 }, { emoji: "😮", count: 67 }],
  },
  {
    id: "s4",
    author: "Desi Vibes",
    authorAvatar: "https://randomuser.me/api/portraits/women/68.jpg",
    authorBio: "Celebrating South Asian culture in NYC",
    authorFollowers: 15600,
    verified: true,
    thumbnail: "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=400&q=70",
    title: "Holi celebrations in Jackson Heights 🎨",
    description: "The most colorful celebration of the year! Jackson Heights came alive with music, dance, and colors.",
    category: "Culture",
    duration: 55,
    views: 18700,
    likes: 3200,
    comments: 278,
    shares: 456,
    timeAgo: "6h ago",
    hasNewStory: false,
    isBookmarked: true,
    hashtags: ["#Holi", "#JacksonHeights", "#CultureNYC"],
    location: "Jackson Heights, Queens",
    mediaType: "reel",
    reactions: [{ emoji: "🎨", count: 890 }, { emoji: "❤️", count: 567 }, { emoji: "🔥", count: 345 }],
  },
  {
    id: "s5",
    author: "CityBeat",
    authorAvatar: "https://randomuser.me/api/portraits/men/22.jpg",
    authorBio: "Breaking local news & city updates",
    authorFollowers: 31200,
    verified: true,
    thumbnail: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=70",
    title: "New subway line opening this weekend 🚇",
    description: "Major transportation update! The new subway extension is finally opening. Here's everything you need to know.",
    category: "Local News",
    duration: 20,
    views: 31200,
    likes: 1540,
    comments: 198,
    shares: 312,
    timeAgo: "8h ago",
    hasNewStory: false,
    isBookmarked: false,
    hashtags: ["#SubwayNYC", "#CityUpdate", "#Transit"],
    location: "New York City",
    mediaType: "video",
    reactions: [{ emoji: "🚇", count: 234 }, { emoji: "👍", count: 456 }, { emoji: "🎉", count: 123 }],
  },
  {
    id: "s6",
    author: "Sarah Kim",
    authorAvatar: "https://randomuser.me/api/portraits/women/33.jpg",
    authorBio: "Korean food explorer in NYC 🇰🇷",
    authorFollowers: 8900,
    verified: false,
    thumbnail: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=70",
    title: "Hidden gem Korean BBQ in Flushing 🥩🔥",
    description: "This tiny spot in Flushing has the BEST Korean BBQ I've ever had outside of Korea. Must visit!",
    category: "Food",
    duration: 38,
    views: 9800,
    likes: 780,
    comments: 67,
    shares: 98,
    timeAgo: "10h ago",
    hasNewStory: true,
    isBookmarked: false,
    hashtags: ["#KoreanBBQ", "#Flushing", "#HiddenGems"],
    location: "Flushing, Queens",
    mediaType: "photo",
    reactions: [{ emoji: "🤤", count: 234 }, { emoji: "🔥", count: 145 }, { emoji: "❤️", count: 89 }],
  },
  {
    id: "s7",
    author: "Apt Hunter",
    authorAvatar: "https://randomuser.me/api/portraits/men/55.jpg",
    authorBio: "Helping you find your perfect NYC home",
    authorFollowers: 12300,
    verified: true,
    thumbnail: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=70",
    title: "Roommate intro: Meet your match in East Village 🤝",
    description: "Looking for a roommate? I created this community matching event and it was a huge success!",
    category: "Housing",
    duration: 42,
    views: 6300,
    likes: 410,
    comments: 56,
    shares: 78,
    timeAgo: "12h ago",
    hasNewStory: false,
    isBookmarked: false,
    hashtags: ["#RoommateSearch", "#EastVillage", "#NYCHousing"],
    location: "East Village, NYC",
    mediaType: "video",
    reactions: [{ emoji: "🤝", count: 89 }, { emoji: "👏", count: 67 }, { emoji: "❤️", count: 45 }],
  },
  {
    id: "s8",
    author: "Community",
    authorAvatar: "https://randomuser.me/api/portraits/women/12.jpg",
    authorBio: "Official community page for local events",
    authorFollowers: 45600,
    verified: true,
    thumbnail: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&q=70",
    title: "Block party on 5th Ave was AMAZING 🎉",
    description: "Over 5,000 people came out for the biggest block party of the year! Live music, food trucks, and community vibes.",
    category: "Events",
    duration: 50,
    views: 14600,
    likes: 1890,
    comments: 234,
    shares: 189,
    timeAgo: "1d ago",
    hasNewStory: false,
    isBookmarked: false,
    hashtags: ["#BlockParty", "#5thAve", "#CommunityEvents"],
    location: "5th Ave, NYC",
    mediaType: "reel",
    reactions: [{ emoji: "🎉", count: 567 }, { emoji: "🔥", count: 345 }, { emoji: "❤️", count: 234 }],
  },
];

export const STORY_CATEGORY_META: Record<Exclude<StoryCategory, "All">, { icon: string; color: string; bg: string; darkBg: string }> = {
  Events:       { icon: "calendar-outline",      color: palette.brandTeal, bg: palette.brandTealLight, darkBg: "rgba(37,122,134,0.18)" },
  Food:         { icon: "restaurant-outline",    color: palette.red500, bg: palette.red100, darkBg: "rgba(239,68,68,0.18)" },
  Housing:      { icon: "home-outline",           color: Colors.brand.blue, bg: Colors.brand.blueLight, darkBg: "rgba(26,107,174,0.18)" },
  Culture:      { icon: "color-palette-outline",  color: palette.violet500, bg: palette.neutralL97_7, darkBg: "rgba(139,92,246,0.18)" },
  "Local News": { icon: "newspaper-outline",     color: Colors.brand.green, bg: Colors.brand.greenLight, darkBg: "rgba(48,133,91,0.18)" },
  General:      { icon: "images-outline",        color: palette.inkSecondary, bg: palette.neutralL93_2, darkBg: "rgba(138,157,168,0.18)" },
};

// ── My Area Live Data ──────────────────────────────────
export const LIVE_CATEGORIES = ["All", "Housing", "Roommates", "Food", "Events", "Alerts", "News"] as const;
export type LiveCategory = typeof LIVE_CATEGORIES[number];

export interface LiveWallItem {
  id: string;
  type: Exclude<LiveCategory, "All">;
  title: string;
  subtitle: string;
  icon: string;
  author: string;
  authorAvatar: string;
  timeAgo: string;
  location: string;
  isNew: boolean;
  highlight?: string; // price, date, etc
}

export const LIVE_WALL_ITEMS: LiveWallItem[] = [
  {
    id: "lw1",
    type: "Housing",
    title: "Spacious 1BR in Midtown — move-in ready!",
    subtitle: "Doorman building, laundry in unit, near subway",
    icon: "home-outline",
    author: "Alex Rivera",
    authorAvatar: "https://randomuser.me/api/portraits/men/36.jpg",
    timeAgo: "3m ago",
    location: "Midtown West",
    isNew: true,
    highlight: "$2,100/mo",
  },
  {
    id: "lw2",
    type: "Roommates",
    title: "Looking for a roommate in East Village",
    subtitle: "2BR apt, $1,350/person, pet-friendly",
    icon: "people-outline",
    author: "Priya Sharma",
    authorAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    timeAgo: "12m ago",
    location: "East Village",
    isNew: true,
    highlight: "$1,350/mo",
  },
  {
    id: "lw3",
    type: "Food",
    title: "New ramen spot opened on 3rd Ave!",
    subtitle: "Authentic Japanese tonkotsu — grand opening today",
    icon: "restaurant-outline",
    author: "FoodieNY",
    authorAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
    timeAgo: "28m ago",
    location: "3rd Avenue",
    isNew: true,
    highlight: "NOW OPEN",
  },
  {
    id: "lw4",
    type: "Events",
    title: "Outdoor yoga in Central Park this evening",
    subtitle: "Free community class, all levels welcome",
    icon: "calendar-outline",
    author: "Wellness NYC",
    authorAvatar: "https://randomuser.me/api/portraits/women/22.jpg",
    timeAgo: "45m ago",
    location: "Central Park",
    isNew: false,
    highlight: "6:00 PM",
  },
  {
    id: "lw5",
    type: "Alerts",
    title: "Water main repair on 7th St — detour ahead",
    subtitle: "Expected to last through the weekend",
    icon: "warning-outline",
    author: "CityAlerts",
    authorAvatar: "https://randomuser.me/api/portraits/men/55.jpg",
    timeAgo: "1h ago",
    location: "Lower East Side",
    isNew: false,
    highlight: "ALERT",
  },
  {
    id: "lw6",
    type: "News",
    title: "New bike lanes coming to Brooklyn Bridge area",
    subtitle: "City announces $8M infrastructure upgrade",
    icon: "newspaper-outline",
    author: "CityBeat",
    authorAvatar: "https://randomuser.me/api/portraits/men/22.jpg",
    timeAgo: "2h ago",
    location: "Brooklyn",
    isNew: false,
  },
  {
    id: "lw7",
    type: "Housing",
    title: "Sunny studio with rooftop access in Williamsburg",
    subtitle: "Renovated kitchen, hardwood floors, W/D in unit",
    icon: "home-outline",
    author: "Lisa Chen",
    authorAvatar: "https://randomuser.me/api/portraits/women/33.jpg",
    timeAgo: "2h ago",
    location: "Williamsburg",
    isNew: false,
    highlight: "$1,800/mo",
  },
  {
    id: "lw8",
    type: "Roommates",
    title: "Chill roommate needed for 3BR in Astoria",
    subtitle: "Spacious common areas, near N/W train, no smoking",
    icon: "people-outline",
    author: "Mike Torres",
    authorAvatar: "https://randomuser.me/api/portraits/men/45.jpg",
    timeAgo: "3h ago",
    location: "Astoria",
    isNew: false,
    highlight: "$1,100/mo",
  },
  {
    id: "lw9",
    type: "Food",
    title: "Weekend farmers market returns to Union Square",
    subtitle: "Fresh produce, baked goods, local vendors",
    icon: "restaurant-outline",
    author: "Community",
    authorAvatar: "https://randomuser.me/api/portraits/women/12.jpg",
    timeAgo: "4h ago",
    location: "Union Square",
    isNew: false,
    highlight: "SAT–SUN",
  },
  {
    id: "lw10",
    type: "Events",
    title: "Live jazz at the Blue Note tonight",
    subtitle: "Special guest performance — limited seats",
    icon: "musical-notes-outline",
    author: "Blue Note NYC",
    authorAvatar: "https://randomuser.me/api/portraits/men/67.jpg",
    timeAgo: "5h ago",
    location: "Greenwich Village",
    isNew: false,
    highlight: "8:30 PM",
  },
];

export const LIVE_CATEGORY_META: Record<Exclude<LiveCategory, "All">, { emoji: string; icon: string; color: string; bg: string }> = {
  Housing:   { emoji: "🏠", icon: "home-outline",          color: Colors.brand.blue, bg: palette.blueL95 },
  Roommates: { emoji: "🤝", icon: "people-outline",        color: palette.violet500,         bg: palette.neutralL97_7 },
  Food:      { emoji: "🍜", icon: "restaurant-outline",    color: palette.red500,         bg: palette.red100 },
  Events:    { emoji: "🎉", icon: "calendar-outline",      color: palette.brandTeal,         bg: palette.brandTealLight },
  Alerts:    { emoji: "⚠️", icon: "warning-outline",       color: palette.amber600,         bg: palette.amber100 },
  News:      { emoji: "📰", icon: "newspaper-outline",     color: Colors.brand.green, bg: palette.brandGreenLight },
};

// ── Event category badge colors ─────────────────────────
export const CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  Community: { bg: palette.tealL93, text: palette.cyan600 },
  Food:      { bg: palette.brandTealLight, text: palette.brandTeal },
  Arts:      { bg: palette.brandGreenLight, text: palette.brandGreen },
  Tech:      { bg: palette.skyL96, text: palette.brandBlue },
  Wellness:  { bg: palette.brandGreenLight, text: palette.brandGreen },
};
