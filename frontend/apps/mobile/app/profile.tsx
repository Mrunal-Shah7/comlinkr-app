import { palette } from "../src/theme/palette";
import { Switch } from "../src/shared/ui/Switch";
import { rs } from "../src/utils/responsive";
import React, { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image"; // SPRINT-31:
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, type User, type UserBadge, type VerificationStatus } from "../src/store/auth.store";
import { DatePickerField } from "../components/DateTimePickerField";
import { usePermissions } from "../src/shared/hooks/usePermissions";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { ApiError } from "../src/api/client";
import {
  getMyFullProfile,
  mergeFullProfileIntoUser,
  resolveAvatarDisplayUrl,
  type MyFullProfile,
} from "../src/api/meProfile.api";
import { getRoommatePreferences, updateRoommatePreferences } from "../src/api/roommates.api";
import { roommatePrefsFromGetEndpoint, roommatePrefsToPatchBody } from "../src/utils/roommatePrefsMap";
import { getMyBadgeStatus, apiBadgeTypeToUserKey, type MyBadgeStatusRow } from "../src/api/badges.api";
import { formatPrice, getCurrencyForCountry } from "../src/utils/currency";
import { useSidebarStore } from "../src/store/sidebar.store";
import { useBlockStore } from "../src/store/block.store";
import { usePostsStore } from "../src/store/posts.store";
import { unblockUser as unblockUserApi } from "../src/api/profile.api";
import { showToast } from "../src/shared/ui/Toast";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { TYPE, display } from "../src/theme/d";
import { Chip, GradientButton, GradientFill, PressableScale, Reveal, SoftButton, TileIn } from "../src/shared/d";
import { DSheet } from "../src/shared/d/Sheet";
import { DPage, DRow, goBackOr } from "../src/shared/d/Page";

// ─── Country Flags & Dial Codes ─────────────────────────
const COUNTRY_INFO: Record<string, { flag: string; code: string }> = {
  "United States":  { flag: "🇺🇸", code: "+1" },
  "Canada":         { flag: "🇨🇦", code: "+1" },
  "United Kingdom": { flag: "🇬🇧", code: "+44" },
  "Australia":      { flag: "🇦🇺", code: "+61" },
  "Germany":        { flag: "🇩🇪", code: "+49" },
  "France":         { flag: "🇫🇷", code: "+33" },
  "India":          { flag: "🇮🇳", code: "+91" },
  "Brazil":         { flag: "🇧🇷", code: "+55" },
  "Mexico":         { flag: "🇲🇽", code: "+52" },
  "Japan":          { flag: "🇯🇵", code: "+81" },
  "Singapore":      { flag: "🇸🇬", code: "+65" },
  "New Zealand":    { flag: "🇳🇿", code: "+64" },
  "South Africa":   { flag: "🇿🇦", code: "+27" },
  "UAE":            { flag: "🇦🇪", code: "+971" },
  "Ireland":        { flag: "🇮🇪", code: "+353" },
};

// ─── Onboarding lookup data ───────────────────────────────────────────────────

const CULTURE_MAP: Record<string, { emoji: string; icon: string; label: string }> = {
  coffee:    { emoji: "☕", icon: "cafe-outline",           label: "Coffee Culture" },
  art:       { emoji: "🎨", icon: "color-palette-outline",  label: "Art & Museums" },
  fitness:   { emoji: "💪", icon: "barbell-outline",        label: "Fitness & Health" },
  nightlife: { emoji: "🌙", icon: "moon-outline",           label: "Nightlife" },
  family:    { emoji: "👨‍👩‍👧", icon: "people-outline",  label: "Family Life" },
  wellness:  { emoji: "🧘", icon: "leaf-outline",           label: "Wellness" },
  foodie:    { emoji: "🍕", icon: "restaurant-outline",     label: "Foodie" },
  outdoor:   { emoji: "🏕️", icon: "trail-sign-outline",   label: "Outdoor" },
  tech:      { emoji: "💡", icon: "hardware-chip-outline",  label: "Tech & Innovation" },
  music:     { emoji: "🎵", icon: "musical-notes-outline",  label: "Music & Events" },
  sports:    { emoji: "⚽", icon: "football-outline",       label: "Sports & Games" },
  volunteer: { emoji: "🤝", icon: "hand-left-outline",      label: "Volunteering" },
};

const COMMUNITY_MAP: Record<string, { emoji: string; label: string }> = {
  "south-asian":       { emoji: "🇮🇳", label: "South Asian" },
  "east-asian":        { emoji: "🌏", label: "East Asian" },
  "southeast-asian":   { emoji: "🌺", label: "Southeast Asian" },
  "latin-american":    { emoji: "🌎", label: "Latin American" },
  "african":           { emoji: "🌍", label: "African & Afro-Diaspora" },
  "caribbean":         { emoji: "🌊", label: "Caribbean" },
  "middle-eastern":    { emoji: "🕌", label: "Middle Eastern" },
  "european":          { emoji: "🇪🇺", label: "European" },
  "pacific-islander":  { emoji: "🏝️", label: "Pacific Islander" },
  "indigenous":        { emoji: "🪶", label: "Indigenous & First Nations" },
  "south-american":    { emoji: "🦜", label: "South American" },
  "central-asian":     { emoji: "🐎", label: "Central Asian" },
  "expat":             { emoji: "✈️", label: "Expat" },
  "digital-nomad":     { emoji: "💻", label: "Digital Nomad" },
  "student":           { emoji: "🎓", label: "Student" },
  "young-professional":{ emoji: "💼", label: "Young Professional" },
  "new-in-town":       { emoji: "🗺️", label: "New in Town" },
  "retiree":           { emoji: "🌅", label: "Retiree & Seniors" },
  "parent":            { emoji: "👨‍👩‍👧", label: "Parents & Families" },
  "pet-owner":         { emoji: "🐾", label: "Pet Owners" },
  "tech-startup":      { emoji: "🚀", label: "Tech & Startups" },
  "creative-pro":      { emoji: "🎨", label: "Creatives & Artists" },
  "healthcare-pro":    { emoji: "🏥", label: "Healthcare Workers" },
  "educator-pro":      { emoji: "📚", label: "Educators & Teachers" },
  "entrepreneur":      { emoji: "💡", label: "Entrepreneurs" },
  "finance-biz":       { emoji: "📊", label: "Finance & Business" },
  "legal-gov":         { emoji: "⚖️", label: "Legal & Government" },
  "lgbtq":             { emoji: "🌈", label: "LGBTQ+" },
  "womens-network":    { emoji: "💜", label: "Women's Network" },
  "veterans":          { emoji: "🎖️", label: "Veterans" },
  "eco-conscious":     { emoji: "🌿", label: "Eco-Conscious" },
  "volunteer-net":     { emoji: "🤝", label: "Volunteer Network" },
  "disability":        { emoji: "♿", label: "Disability Community" },
  "mental-health":     { emoji: "🧠", label: "Mental Health Advocates" },
  "christian":         { emoji: "✝️", label: "Christian" },
  "muslim":            { emoji: "☪️", label: "Muslim" },
  "jewish":            { emoji: "✡️", label: "Jewish" },
  "hindu":             { emoji: "🕉️", label: "Hindu" },
  "buddhist":          { emoji: "☸️", label: "Buddhist" },
  "interfaith":        { emoji: "🙏", label: "Interfaith & Spiritual" },
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
};

const INTEREST_MAP: Record<string, { icon: string; label: string }> = {
  housing:   { icon: "home-outline",        label: "Housing & Real Estate" },
  food:      { icon: "restaurant-outline",  label: "Food & Dining" },
  community: { icon: "people-outline",      label: "Community & Social" },
  events:    { icon: "calendar-outline",    label: "Events & Entertainment" },
  jobs:      { icon: "briefcase-outline",   label: "Jobs & Careers" },
  health:    { icon: "medkit-outline",      label: "Health & Wellness" },
  education: { icon: "book-outline",        label: "Education & Learning" },
  shopping:  { icon: "bag-outline",         label: "Shopping & Services" },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { v: "—", l: "Posts",     icon: "document-text" as const, c: [Colors.brand.orange, palette.orangeL40] as [string, string] },
  { v: "—", l: "Saved",     icon: "bookmark"      as const, c: [Colors.brand.green, Colors.brand.greenDark] as [string, string] },
  { v: "—", l: "Events",    icon: "calendar"      as const, c: [Colors.brand.orange, palette.orangeL45] as [string, string] },
  { v: "—", l: "Neighbors", icon: "people"        as const, c: [Colors.brand.blue, palette.blueL40_3] as [string, string] },
];

const ACCOUNT_GRID: {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  colors: [string, string];
  route: string;
  badge?: number;
}[] = [
  { id: "myposts",       label: "My Posts",           sublabel: "All your content",      icon: "document-text",      colors: [Colors.brand.orange, palette.orangeL40],            route: "/myposts" },
  { id: "messages",      label: "Messages",           sublabel: "Your conversations",    icon: "chatbubbles",        colors: [Colors.brand.blue, palette.blueL40_3],             route: "/chat" },
  { id: "edit-profile",  label: "Edit Profile",       sublabel: "Name, photo & bio",     icon: "person",             colors: [Colors.brand.blue, palette.blueL40_3],             route: "/edit-profile" },
  { id: "communities",   label: "My Communities",     sublabel: "Manage & update groups", icon: "people",             colors: [Colors.brand.green, Colors.brand.greenDark], route: "/edit-profile" },
  { id: "notifications", label: "Notifications",      sublabel: "Alerts & push",         icon: "notifications",      colors: [Colors.brand.orange, palette.orangeL45],           route: "/notifications" },
  { id: "privacy",       label: "Privacy",            sublabel: "Security settings",     icon: "shield-checkmark",   colors: [Colors.brand.blue, palette.blueL40_3],             route: "/settings" },
  { id: "language",      label: "Language",           sublabel: "Region & locale",       icon: "language",           colors: [Colors.brand.green, Colors.brand.greenDark], route: "/settings" },
  { id: "help",          label: "Help & Support",     sublabel: "FAQs, contact us",      icon: "help-circle",        colors: [palette.sky500, palette.sky600],                     route: "/settings" },
  { id: "about",         label: "About",              sublabel: "Version & terms",       icon: "information-circle", colors: [palette.skyL42, palette.skyL31],                     route: "/settings" },
];

const ACHIEVEMENTS = [
  { id: "1", emoji: "🏠", label: "Homefinder",  earned: true },
  { id: "2", emoji: "🍽️", label: "Foodie",      earned: true },
  { id: "3", emoji: "👥", label: "Connector",   earned: true },
  { id: "4", emoji: "📸", label: "Storyteller", earned: false },
  { id: "5", emoji: "⭐", label: "Explorer",    earned: false },
];

// ─── Roommate Form Options ────────────────────────────────────────────────────

const SLEEP_OPTIONS = ["Early Bird", "Night Owl", "Flexible"];
const CLEANLINESS_OPTIONS = ["Very Clean", "Clean", "Moderate", "Relaxed"];
const NOISE_OPTIONS = ["Quiet", "Moderate", "Lively"];
const GUEST_OPTIONS = ["Never", "Occasionally", "Frequently", "Anytime"];

const DEFAULT_ROOMMATE_PREFS = {
  budgetMin: 0,
  budgetMax: 0,
  moveInDate: "",
  sleepSchedule: "Night Owl",
  cleanliness: "Clean",
  noiseLevel: "Moderate",
  petFriendly: false,
  smoking: false,
  guestPolicy: "Occasionally",
  workFromHome: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({
  icon,
  label,
  rightEl,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  rightEl?: React.ReactNode;
}) {
  const { tc, isDark } = useTheme();
  const labelColor = isDark ? tc.textSecondary : tc.textTertiary;
  return (
    <View style={s.sectionLabelRow}>
      <View style={s.sectionLabelLeft}>
        <Ionicons name={icon} size={13} color={labelColor} />
        <Text style={[s.sectionLabelText, { color: labelColor }]}>{label}</Text>
      </View>
      {rightEl}
    </View>
  );
}

function ChangeBtn({ onPress }: { onPress: () => void }) {
  const { tc } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [s.changeBtn, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Ionicons name="pencil" size={11} color={Colors.brand.blue} />
      <Text style={s.changeBtnText}>Change</Text>
    </Pressable>
  );
}

function formatMoveInDate(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === "Invalid Date") return "Not set";
  try {
    const clean = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00";
    const d = new Date(clean);
    if (isNaN(d.getTime())) return "Not set";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Not set";
  }
}

function formatJoinedLabel(iso: string | undefined): string {
  if (!iso) return "Joined —";
  try {
    const d = new Date(iso);
    return `Joined ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  } catch {
    return "Joined —";
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

// ─── Report Reason Options ────────────────────────────────────────────────────
const REPORT_REASONS = [
  "Spam or advertising",
  "Fake or misleading listing",
  "Inappropriate content",
  "Scam or fraud",
  "Wrong category",
  "Other",
];

/** Maps Nest `/badges/my-status` rows into local `User` fields used by `usePermissions` and profile UI. */
function mapBadgeStatusRowsToUserFields(rows: MyBadgeStatusRow[]): {
  verificationStatus: Record<UserBadge, VerificationStatus>;
  badges: UserBadge[];
} {
  const verificationStatus: Record<UserBadge, VerificationStatus> = {
    landlord: "none",
    restaurant_owner: "none",
    agency: "none",
    local_reviewer: "none",
  };
  const badges: UserBadge[] = [];
  for (const row of rows) {
    const key = apiBadgeTypeToUserKey(row.badgeType);
    if (row.status === "APPROVED") {
      verificationStatus[key] = "verified";
      badges.push(key);
    } else if (row.status === "PENDING") {
      verificationStatus[key] = "pending";
    } else if (row.status === "REJECTED") {
      verificationStatus[key] = "rejected";
    } else {
      verificationStatus[key] = "none";
    }
  }
  return { verificationStatus, badges };
}

// ─── Featured Listing Plan Options ───────────────────────────────────────────
const FEATURED_PLANS = [
  { id: "7d",  label: "7 Days",  price: "$9.99",  highlight: false },
  { id: "14d", label: "14 Days", price: "$16.99", highlight: true  },
  { id: "30d", label: "30 Days", price: "$29.99", highlight: false },
];
const FEATURED_PLACEMENTS = ["Top of Search Results", "Homepage Featured Section", "Category Banner"];

export default function ProfileScreen() {
  const { isDark, tc } = useTheme();
  const isAuthed = useAuthStore((st) => st.isAuthed);
  const user   = useAuthStore((st) => st.user);
  const logout = useAuthStore((st) => st.logout);
  const updateRoommatePrefs = useAuthStore((st) => st.updateRoommatePrefs);
  const applyUser = useAuthStore((st) => st.applyUser);
  const sidebarStats = useSidebarStore((s) => s.sidebarStats);
  const aggregateSavedTotal = useSidebarStore((s) => s.aggregateSavedTotal);
  const blockedUsers = useBlockStore((s) => s.blockedUsers);
  const unblockUser = useBlockStore((s) => s.unblockUser);
  const localUserPosts = usePostsStore((s) => s.userPosts);

  const { hasAnyVerifiedBadge, getBadgeStatus, isLandlordPending, isAgencyPending } = usePermissions();

  const [serverProfile, setServerProfile] = useState<MyFullProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(
    async (isRefresh: boolean) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setProfileLoading(true);
        setProfileError(null);
        const p = await getMyFullProfile();
        setServerProfile(p);
        // Sync stats into sidebar store so hamburger menu + profile show consistent live counts
        if (p.stats) {
          useSidebarStore.setState({ sidebarStats: p.stats });
        }
        const prev = useAuthStore.getState().user;
        const merged = mergeFullProfileIntoUser(p, prev);
        let nextUser: User = merged;
        try {
          const badgeRows = await getMyBadgeStatus();
          const { verificationStatus, badges } = mapBadgeStatusRowsToUserFields(badgeRows);
          nextUser = { ...merged, verificationStatus, badges };
        } catch {
          /* Badge API optional — keep merged user (may have stale verification until next load). */
        }
        await applyUser(nextUser);
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not load profile";
        setProfileError(msg);
      } finally {
        setProfileLoading(false);
        setRefreshing(false);
      }
    },
    [applyUser]
  );

  useFocusEffect(
    useCallback(() => {
      void fetchProfile(false);
      void useSidebarStore.getState().fetchSidebarData();
      void useBlockStore.getState().hydrate();
    }, [fetchProfile])
  );

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "CL";

  const displayCity =
    serverProfile?.location?.city?.trim() || user?.city?.trim() || "Not set";
  const displayState =
    serverProfile?.location?.state?.trim() || user?.stateProvince?.trim() || "Not set";
  const displayCountry =
    serverProfile?.location?.country?.trim() || user?.country?.trim() || "Not set";
  const profileCountryCode =
    (serverProfile?.location as { countryCode?: string | null } | undefined)?.countryCode ||
    (displayCountry === "United Kingdom" ? "GB" : "US");
  const profileCurrencyCode = getCurrencyForCountry(profileCountryCode).code;
  const cultureIds     = user?.culture       || [];
  const interestIds    = user?.interests     || [];
  const communityIds   = user?.communities   || [];

  const avatarUri = resolveAvatarDisplayUrl(serverProfile?.avatarUrl ?? user?.avatarUrl ?? null);

  // Merge both stat sources — take the higher value so a 0 from one endpoint
  // never hides a real count from the other (dedicated /users/me/stats endpoint).
  const hasAnyStats = serverProfile?.stats != null || sidebarStats != null || localUserPosts.length > 0;
  const mergedPosts     = Math.max(serverProfile?.stats?.postsCount     ?? 0, sidebarStats?.postsCount     ?? 0, localUserPosts.length);
  const mergedSaved     = Math.max(
    aggregateSavedTotal ?? serverProfile?.stats?.savedCount ?? 0,
    sidebarStats?.savedCount ?? 0,
  );
  const mergedEvents    = Math.max(serverProfile?.stats?.eventsCount    ?? 0, sidebarStats?.eventsCount    ?? 0);
  const mergedNeighbors = Math.max(serverProfile?.stats?.neighborsCount ?? 0, sidebarStats?.neighborsCount ?? 0);

  const statsRow = hasAnyStats
    ? [
        { v: String(mergedPosts),     l: "Content",   icon: "layers"   as const, c: [Colors.brand.blue,   palette.blueL40_3]                           as [string, string] },
        { v: String(mergedSaved),     l: "Saved",     icon: "bookmark" as const, c: [Colors.brand.green,  Colors.brand.greenDark]               as [string, string] },
        { v: String(mergedEvents),    l: "Events",    icon: "calendar" as const, c: [Colors.brand.orange, palette.orangeL45]                            as [string, string] },
        { v: mergedNeighbors > 0 ? String(mergedNeighbors) : "—", l: "Neighbors", icon: "people" as const, c: [Colors.brand.blue, palette.blueL40_3] as [string, string] },
      ]
    : STATS;

  const achievementsRow = serverProfile
    ? (serverProfile.achievements ?? []).map((a, idx) => ({
        id: a.slug || `a-${idx}`,
        emoji: a.icon,
        label: a.name,
        earned: a.earned,
      }))
    : [];

  // Roommate preferences — use stored values or defaults
  const prefs = user?.roommatePrefs || DEFAULT_ROOMMATE_PREFS;

  // ─── Roommate Edit Modal State ──────────────────────────────────────
  const params = useLocalSearchParams<{ openRoommatePrefs?: string }>();
  const [rmModalVisible, setRmModalVisible] = useState(false);
  const [rmSaving, setRmSaving] = useState(false);

  React.useEffect(() => {
    if (params.openRoommatePrefs === "1") {
      void openRmModal();
      router.setParams({ openRoommatePrefs: "" });
    }
  }, [params.openRoommatePrefs]); // openRmModal excluded intentionally — only trigger on param change

  /** Landlord–agency badge application pending on the server. */
  const listingTrustInReview = isLandlordPending || isAgencyPending;

  // ─── Feature Listing Modal State ───────────────────────────────────
  const [featureModalVisible, setFeatureModalVisible] = useState(false);
  const [featureListingTitle, setFeatureListingTitle] = useState("");
  const [featurePlan, setFeaturePlan] = useState(FEATURED_PLANS[1].id);
  const [featurePlacement, setFeaturePlacement] = useState(FEATURED_PLACEMENTS[0]);
  const [featureNote, setFeatureNote] = useState("");
  const [featureSubmitted, setFeatureSubmitted] = useState(false);

  const handleFeatureSubmit = useCallback(() => {
    if (!featureListingTitle.trim()) {
      appAlert("Missing Info", "Please enter your listing title.");
      return;
    }
    setFeatureSubmitted(true);
    setFeatureModalVisible(false);
    showToast("Your listing has been submitted for featuring. Our team will activate it shortly after review.", "success");
  }, [featureListingTitle]);
  const [rmBudgetMin, setRmBudgetMin] = useState(String(prefs.budgetMin ?? DEFAULT_ROOMMATE_PREFS.budgetMin));
  const [rmBudgetMax, setRmBudgetMax] = useState(String(prefs.budgetMax ?? DEFAULT_ROOMMATE_PREFS.budgetMax));
  const [rmMoveInDate, setRmMoveInDate] = useState(prefs.moveInDate ?? DEFAULT_ROOMMATE_PREFS.moveInDate);
  const [rmSleep, setRmSleep] = useState(prefs.sleepSchedule ?? DEFAULT_ROOMMATE_PREFS.sleepSchedule);
  const [rmClean, setRmClean] = useState(prefs.cleanliness ?? DEFAULT_ROOMMATE_PREFS.cleanliness);
  const [rmNoise, setRmNoise] = useState(prefs.noiseLevel ?? DEFAULT_ROOMMATE_PREFS.noiseLevel);
  const [rmPet, setRmPet] = useState(prefs.petFriendly ?? DEFAULT_ROOMMATE_PREFS.petFriendly);
  const [rmSmoke, setRmSmoke] = useState(prefs.smoking ?? DEFAULT_ROOMMATE_PREFS.smoking);
  const [rmGuest, setRmGuest] = useState(prefs.guestPolicy ?? DEFAULT_ROOMMATE_PREFS.guestPolicy);
  const [rmWfh, setRmWfh] = useState(prefs.workFromHome ?? DEFAULT_ROOMMATE_PREFS.workFromHome);

  const openRmModal = useCallback(async () => {
    // Seed from local store first so modal opens instantly
    const localP = user?.roommatePrefs || DEFAULT_ROOMMATE_PREFS;
    setRmBudgetMin(String(localP.budgetMin ?? DEFAULT_ROOMMATE_PREFS.budgetMin));
    setRmBudgetMax(String(localP.budgetMax ?? DEFAULT_ROOMMATE_PREFS.budgetMax));
    setRmMoveInDate(localP.moveInDate ?? DEFAULT_ROOMMATE_PREFS.moveInDate);
    setRmSleep(localP.sleepSchedule ?? DEFAULT_ROOMMATE_PREFS.sleepSchedule);
    setRmClean(localP.cleanliness ?? DEFAULT_ROOMMATE_PREFS.cleanliness);
    setRmNoise(localP.noiseLevel ?? DEFAULT_ROOMMATE_PREFS.noiseLevel);
    setRmPet(localP.petFriendly ?? DEFAULT_ROOMMATE_PREFS.petFriendly);
    setRmSmoke(localP.smoking ?? DEFAULT_ROOMMATE_PREFS.smoking);
    setRmGuest(localP.guestPolicy ?? DEFAULT_ROOMMATE_PREFS.guestPolicy);
    setRmWfh(localP.workFromHome ?? DEFAULT_ROOMMATE_PREFS.workFromHome);
    setRmModalVisible(true);
    // Fetch fresh from backend and overwrite with real saved values
    try {
      const fresh = await getRoommatePreferences();
      const mapped = roommatePrefsFromGetEndpoint({
        budgetMin: fresh.budgetMin,
        budgetMax: fresh.budgetMax,
        moveInDate: fresh.moveInDate,
        sleepSchedule: fresh.sleepSchedule,
        cleanliness: fresh.cleanliness,
        noiseLevel: fresh.noiseLevel,
        petFriendly: fresh.petFriendly,
        smoking: fresh.smoking,
        guestPolicy: fresh.guestPolicy,
        workFromHome: fresh.workFromHome,
      });
      await updateRoommatePrefs({ ...DEFAULT_ROOMMATE_PREFS, ...mapped });
      if (mapped.budgetMin) setRmBudgetMin(String(mapped.budgetMin));
      if (mapped.budgetMax) setRmBudgetMax(String(mapped.budgetMax));
      if (mapped.moveInDate) setRmMoveInDate(mapped.moveInDate);
      if (mapped.sleepSchedule) setRmSleep(mapped.sleepSchedule);
      if (mapped.cleanliness) setRmClean(mapped.cleanliness);
      if (mapped.noiseLevel) setRmNoise(mapped.noiseLevel);
      if (mapped.petFriendly != null) setRmPet(mapped.petFriendly);
      if (mapped.smoking != null) setRmSmoke(mapped.smoking);
      if (mapped.guestPolicy) setRmGuest(mapped.guestPolicy);
      if (mapped.workFromHome != null) setRmWfh(mapped.workFromHome);
    } catch { /* keep local values if backend unreachable */ }
  }, [user, updateRoommatePrefs]);

  const saveRoommatePrefs = useCallback(async () => {
    const minVal = parseInt(rmBudgetMin, 10);
    const maxVal = parseInt(rmBudgetMax, 10);
    if (isNaN(minVal) || isNaN(maxVal) || minVal <= 0 || maxVal <= 0) {
      showToast("Please enter valid budget amounts.", "error");
      return;
    }
    if (minVal > maxVal) {
      showToast("Minimum budget cannot exceed maximum.", "error");
      return;
    }
    // Ensure moveInDate is not in the past — clamp to today if needed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let safeMoveInDate = rmMoveInDate;
    if (safeMoveInDate) {
      const d = new Date(safeMoveInDate);
      if (!isNaN(d.getTime()) && d < today) {
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        safeMoveInDate = `${y}-${m}-${day}`;
      }
    }

    const next: NonNullable<User["roommatePrefs"]> = {
      budgetMin: minVal,
      budgetMax: maxVal,
      moveInDate: safeMoveInDate,
      sleepSchedule: rmSleep,
      cleanliness: rmClean,
      noiseLevel: rmNoise,
      petFriendly: rmPet,
      smoking: rmSmoke,
      guestPolicy: rmGuest,
      workFromHome: rmWfh,
    };
    setRmSaving(true);
    try {
      // Save locally first so prefs are never lost
      await updateRoommatePrefs({ ...DEFAULT_ROOMMATE_PREFS, ...next });
      if (user?.id) {
        await AsyncStorage.setItem(`@comlinkr/rm_prefs_done_${user.id}`, "1");
      }

      // Then sync to backend — if this fails, local save is still kept
      try {
        await updateRoommatePreferences(roommatePrefsToPatchBody(next));
        const fresh = await getRoommatePreferences();
        const mapped = roommatePrefsFromGetEndpoint({
          budgetMin: fresh.budgetMin,
          budgetMax: fresh.budgetMax,
          moveInDate: fresh.moveInDate,
          sleepSchedule: fresh.sleepSchedule,
          cleanliness: fresh.cleanliness,
          noiseLevel: fresh.noiseLevel,
          petFriendly: fresh.petFriendly,
          smoking: fresh.smoking,
          guestPolicy: fresh.guestPolicy,
          workFromHome: fresh.workFromHome,
        });
        await updateRoommatePrefs({ ...DEFAULT_ROOMMATE_PREFS, ...mapped });
      } catch {
        // Backend sync failed — preferences saved locally, show success anyway
      }

      setRmModalVisible(false);
      showToast("Your roommate preferences have been updated.", "success");
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not save preferences. Try again.";
      showToast(msg, "error");
    } finally {
      setRmSaving(false);
    }
  }, [rmBudgetMin, rmBudgetMax, rmMoveInDate, rmSleep, rmClean, rmNoise, rmPet, rmSmoke, rmGuest, rmWfh, updateRoommatePrefs]);

  const goToEditProfile = () => router.push("/edit-profile" as any);

  const handleLogout = () => {
    appAlert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login" as any);
          },
        },
      ]
    );
  };

  // Split account grid into rows of 3
  const accountRows: (typeof ACCOUNT_GRID)[] = [];
  for (let i = 0; i < ACCOUNT_GRID.length; i += 3) {
    accountRows.push(ACCOUNT_GRID.slice(i, i + 3));
  }

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  const name = serverProfile?.name?.trim() || user?.name || "ComLinkr User";
  const handle = serverProfile?.username?.trim() || user?.username || "";
  const bio = (serverProfile?.bio ?? user?.bio)?.trim() || "";
  const known = (v: string) => !!v && v !== "Not set";
  const joined = serverProfile?.createdAt ? formatJoinedLabel(serverProfile.createdAt).replace(/^Joined /, "since ") : "";
  const meta = [handle ? `@${handle}` : "", known(displayCity) ? displayCity : "", joined].filter(Boolean).join(" · ");
  const card = { borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" as const };
  const h2 = (t: string, action?: { label: string; onPress: () => void }) => (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 24, marginBottom: 10, paddingHorizontal: 18 }}>
      <Text style={[TYPE.section, { color: tc.textPrimary }]}>{t}</Text>
      {action ? <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${action.label} ${t}`}><Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>{action.label}</Text></Pressable> : null}
    </View>
  );
  const chipList = (items: string[]) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 }}>
      {items.map((t, i) => <View key={`${t}-${i}`} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.borderMedium }}><Text style={[TYPE.label, { fontSize: 13, color: tc.textPrimary }]}>{t}</Text></View>)}
    </View>
  );
  const emptyLine = (text: string) => (
    <Pressable onPress={goToEditProfile} accessibilityRole="button" style={{ marginHorizontal: 16, padding: 14, borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: tc.borderMedium }}>
      <Text style={[TYPE.small, { color: tc.textTertiary }]}>{text}</Text>
    </Pressable>
  );
  const vibeNames = (serverProfile?.vibes?.length ?? 0) > 0 ? serverProfile!.vibes.map((v) => v.name) : cultureIds.map((id) => CULTURE_MAP[id]?.label).filter(Boolean) as string[];
  const interestNames = (serverProfile?.interests?.length ?? 0) > 0 ? serverProfile!.interests.map((v) => v.name) : interestIds.map((id) => INTEREST_MAP[id]?.label).filter(Boolean) as string[];
  const communityNames = (serverProfile?.communities?.length ?? 0) > 0 ? serverProfile!.communities.map((v) => v.name) : communityIds.map((id) => COMMUNITY_MAP[id]?.label).filter(Boolean) as string[];
  const p = { ...DEFAULT_ROOMMATE_PREFS, ...prefs };
  const roommateRows: [string, string][] = ([
    ["Budget", `${formatPrice(p.budgetMin, profileCurrencyCode)}–${formatPrice(p.budgetMax, profileCurrencyCode)} /mo`],
    ["Move-in", formatMoveInDate(p.moveInDate)],
    ["Sleep", p.sleepSchedule],
    ["Habits", [p.cleanliness, p.smoking ? "Smoking OK" : "No smoking", p.petFriendly ? "Pet friendly" : "No pets", `Guests ${String(p.guestPolicy).toLowerCase()}`, p.workFromHome ? "Works from home" : ""].filter(Boolean).join(" · ")],
  ] as [string, string][]).filter(([, v]) => !!v && v !== "Not set");
  const locationRows = ([["Country", displayCountry], ["State or province", displayState], ["City", displayCity]] as [string, string][]).filter(([, v]) => known(v));

  return (
    <DPage
      title={name}
      largeTitle="hidden"
      onBack={() => goBackOr("/(tabs)/feed")}
      right={
        <Pressable onPress={() => router.push("/settings" as any)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Settings"
          style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: tc.inputBg }]}>
          <Ionicons name="settings-outline" size={22} color={tc.textPrimary} />
        </Pressable>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void fetchProfile(true)} tintColor={tc.accent} />}
    >
        {/* ── Head (design D) ── */}
        <Reveal i={0} style={{ alignItems: "center", paddingTop: 6, paddingHorizontal: 24 }}>
          <GradientFill style={{ width: 98, height: 98, borderRadius: 49, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: tc.pageBg, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: tc.cardBg }}>
              {profileLoading && !avatarUri ? (
                <ActivityIndicator color={tc.accent} />
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
              ) : (
                <GradientFill style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}><Text style={[display(800), { color: palette.white, fontSize: 30 }]}>{initials}</Text></GradientFill>
              )}
            </View>
          </GradientFill>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
            <Text style={[TYPE.pageTitle, { fontSize: 28, color: tc.textPrimary, textAlign: "center" }]}>{name}</Text>
            {hasAnyVerifiedBadge ? <Ionicons name="checkmark-circle" size={22} color={tc.mint} accessibilityLabel="Verified" /> : null}
          </View>
          {meta ? <Text style={[TYPE.small, { color: tc.textSecondary, textAlign: "center", marginTop: 2 }]}>{meta}</Text> : null}
          {bio ? <Text style={[TYPE.body, { color: tc.textSecondary, textAlign: "center", marginTop: 8 }]} numberOfLines={4}>{bio}</Text> : null}
          {/* Plan 14: followers and following; opens the Follows screen. Hidden until the server sends the counts. */}
          {serverProfile?.stats?.followersCount != null && serverProfile.stats.followingCount != null ? (
            <Pressable onPress={() => router.push("/follows" as never)} accessibilityRole="button" hitSlop={6} style={{ marginTop: 8 }}
              accessibilityLabel={`${serverProfile.stats.followersCount} ${serverProfile.stats.followersCount === 1 ? "follower" : "followers"}, ${serverProfile.stats.followingCount} following`}>
              <Text style={[TYPE.small, { color: tc.textSecondary, textAlign: "center" }]}>
                <Text style={{ fontWeight: "700", color: tc.textPrimary }}>{serverProfile.stats.followersCount}</Text>
                {serverProfile.stats.followersCount === 1 ? " follower" : " followers"}{"  ·  "}
                <Text style={{ fontWeight: "700", color: tc.textPrimary }}>{serverProfile.stats.followingCount}</Text> following
              </Text>
            </Pressable>
          ) : null}
          <SoftButton small label="Edit profile" icon={<Ionicons name="pencil" size={14} color={tc.accentText} />} onPress={goToEditProfile} style={{ marginTop: 14 }} />
        </Reveal>

        {profileError ? (
          <View style={{ marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: tc.warningBg }}>
            <Text style={[TYPE.small, { color: tc.warningText }]}>{profileError}</Text>
          </View>
        ) : null}

        {/* ── Stats ── */}
        <Reveal i={1} style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 20 }}>
          {statsRow.map((st) => {
            const dest = st.l === "Posts" || st.l === "Content" ? "/myposts" : st.l === "Saved" ? "/saved" : st.l === "Events" ? "/events" : null;
            const label = st.l === "Content" ? "Posts" : st.l === "Neighbors" ? "Neighbours" : st.l;
            return (
              <PressableScale key={st.l} disabled={!dest} onPress={() => { if (dest) router.push(dest as any); }} outerStyle={{ flex: 1 }} accessibilityRole={dest ? "button" : undefined} accessibilityLabel={`${st.v} ${label}`}
                style={{ alignItems: "center", paddingVertical: 14, borderRadius: 18, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }}>
                <Text style={[display(800), { fontSize: 22, color: tc.textPrimary }]}>{st.v}</Text>
                <Text style={[TYPE.small, { color: tc.textTertiary }]}>{label}</Text>
              </PressableScale>
            );
          })}
        </Reveal>

        {/* ── Badges (achievements) ── */}
        {achievementsRow.length > 0 ? (
          <>
            {h2("Badges")}
            <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {achievementsRow.map((a, idx) => (
                <TileIn key={`${a.id}-${idx}`} i={idx} style={{ width: 110, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center", borderRadius: 20, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine, opacity: a.earned ? 1 : 0.55 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft, marginBottom: 6 }}>
                    <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                  </View>
                  <Text style={[TYPE.label, { fontSize: 13, color: tc.textPrimary, textAlign: "center" }]} numberOfLines={2}>{a.label}</Text>
                  <Text style={[TYPE.small, { color: tc.textTertiary }]}>{a.earned ? "Earned" : "Locked"}</Text>
                </TileIn>
              ))}
            </GHScrollView>
          </>
        ) : profileLoading ? <ActivityIndicator color={tc.accent} style={{ marginTop: 20 }} /> : null}

        {/* ── About me ── */}
        {h2("About me", { label: "Change", onPress: goToEditProfile })}
        {vibeNames.length + interestNames.length > 0 ? chipList([...vibeNames, ...interestNames]) : emptyLine("Add your vibe and interests so neighbours can find you.")}

        {h2("Communities", { label: "Change", onPress: goToEditProfile })}
        {communityNames.length > 0 ? chipList(communityNames) : emptyLine("Join the communities you belong to.")}

        {locationRows.length > 0 ? (
          <>
            {h2("Location", { label: "Change", onPress: goToEditProfile })}
            <View style={[card, { marginHorizontal: 16, paddingHorizontal: 14 }]}>
              {locationRows.map(([k, v], i) => (
                <View key={k} style={[{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 12 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
                  <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
                  <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{k === "Country" && COUNTRY_INFO[v]?.flag ? `${COUNTRY_INFO[v].flag}  ${v}` : v}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── As a roommate ── */}
        {h2("As a roommate", { label: "Edit", onPress: openRmModal })}
        <Pressable onPress={openRmModal} accessibilityRole="button" accessibilityLabel="Edit roommate preferences" style={[card, { marginHorizontal: 16, paddingHorizontal: 14 }]}>
          {roommateRows.map(([k, v], i) => (
            <View key={k} style={[{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 12 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
              <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
            </View>
          ))}
        </Pressable>
        <Text style={[TYPE.small, { color: tc.textTertiary, marginHorizontal: 18, marginTop: 8 }]}>These show on your roommate card when people look for a match.</Text>

        {/* ── ROOMMATE EDIT SHEET ── */}
        <DSheet visible={rmModalVisible} onClose={() => setRmModalVisible(false)} title="Roommate preferences" full>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6 }]}>Monthly budget</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                {[{ v: rmBudgetMin, set: setRmBudgetMin, ph: "Min" }, { v: rmBudgetMax, set: setRmBudgetMax, ph: "Max" }].map((b2, i) => (
                  <View key={b2.ph} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tc.inputBg }}>
                    <Text style={[TYPE.bodyStrong, { color: tc.textSecondary }]}>$</Text>
                    <TextInput style={[TYPE.body, { flex: 1, color: tc.textPrimary, paddingVertical: 0 }]} value={b2.v} onChangeText={b2.set} keyboardType="numeric" placeholder={b2.ph} placeholderTextColor={tc.textTertiary} accessibilityLabel={i ? "Most per month" : "Least per month"} />
                  </View>
                ))}
                <Text style={[TYPE.small, { color: tc.textTertiary }]}>/mo</Text>
              </View>

              <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6 }]}>Move-in date</Text>
              <DatePickerField
                value={rmMoveInDate}
                onChange={(iso) => setRmMoveInDate(iso ?? "")}
                dateFormat="iso"
                placeholder="Choose a date"
                accentColor={tc.accent}
                minimumDate={new Date()}
                style={{ backgroundColor: tc.inputBg, borderWidth: 0, borderRadius: 16, paddingHorizontal: 14, minHeight: 50, marginBottom: 16 }}
                textStyle={[TYPE.body, { color: tc.textPrimary }]}
              />

              {([
                ["Sleep schedule", SLEEP_OPTIONS, rmSleep, setRmSleep],
                ["Cleanliness", CLEANLINESS_OPTIONS, rmClean, setRmClean],
                ["Noise level", NOISE_OPTIONS, rmNoise, setRmNoise],
                ["Guests", GUEST_OPTIONS, rmGuest, setRmGuest],
              ] as const).map(([label, opts, val, set]) => (
                <View key={label} style={{ marginBottom: 16 }}>
                  <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 8 }]}>{label}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {(opts as readonly string[]).map((opt) => <Chip key={opt} label={opt} on={val === opt} onPress={() => (set as (v: string) => void)(opt)} />)}
                  </View>
                </View>
              ))}

              <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine, marginBottom: 18 }}>
                {[
                  { key: "pet", icon: "paw-outline" as const, label: "Pets are fine", val: rmPet, set: setRmPet },
                  { key: "smoke", icon: "flame-outline" as const, label: "Smoking is fine", val: rmSmoke, set: setRmSmoke },
                  { key: "wfh", icon: "laptop-outline" as const, label: "I work from home", val: rmWfh, set: setRmWfh },
                ].map((item, i) => (
                  <View key={item.key} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: tc.borderLight }]}>
                    <Ionicons name={item.icon} size={19} color={tc.textSecondary} />
                    <Text style={[TYPE.body, { color: tc.textPrimary, flex: 1 }]}>{item.label}</Text>
                    <Switch value={item.val} onValueChange={item.set} accessibilityLabel={item.label} />
                  </View>
                ))}
              </View>

              <GradientButton block label="Save" loading={rmSaving} onPress={saveRoommatePrefs} />
            </ScrollView>
          </KeyboardAvoidingView>
        </DSheet>

        {/* ── Verification (design D) ── */}
        {h2("Verification", { label: "Manage", onPress: () => router.push("/verification-status" as any) })}
        <View style={[card, { marginHorizontal: 16 }]}>
          {([
            { badge: "landlord" as const, label: "Verified property host", icon: "home-outline" as const },
            { badge: "restaurant_owner" as const, label: "Verified restaurant owner", icon: "restaurant-outline" as const },
            { badge: "agency" as const, label: "Verified agency", icon: "business-outline" as const },
            { badge: "local_reviewer" as const, label: "Local reviewer", icon: "star-outline" as const },
          ]).map(({ badge, label, icon }, i) => {
            const status = getBadgeStatus(badge);
            const pill = {
              none: { t: "Apply", bg: tc.accentSoft, fg: tc.accentText },
              pending: { t: "In review", bg: tc.warningBg, fg: tc.warningText },
              verified: { t: "Post now", bg: tc.mintSoft, fg: tc.successText },
              rejected: { t: "Re-apply", bg: "rgba(239,68,68,0.12)", fg: tc.dangerText },
            }[status];
            const go = () => {
              if (status === "none" || status === "rejected") router.push({ pathname: "/apply-badge" as any, params: { badgeType: badge } });
              else if (status === "verified") router.push({ pathname: "/create-post" as any, params: { type: badge === "landlord" || badge === "agency" ? "listing" : "restaurant", mode: badge === "local_reviewer" ? "review" : undefined } });
              else router.push("/verification-status" as any);
            };
            return (
              <DRow key={badge} first={i === 0} icon={icon} label={label} onPress={go}
                right={<View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: pill.bg }}><Text style={[TYPE.label, { color: pill.fg }]}>{pill.t}</Text></View>} />
            );
          })}
        </View>

        <Reveal style={{ marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: tc.mintSoft }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Ionicons name="shield-checkmark" size={24} color={tc.successText} />
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]}>Get the verified tag</Text>
              <Text style={[TYPE.small, { color: tc.textSecondary }]}>A green check on your listings, higher in search, a trust seal on your profile.</Text>
            </View>
          </View>
          <GradientButton block small={false} label={listingTrustInReview ? "See badge status" : "Apply for verification"} style={{ marginTop: 14 }}
            onPress={() => { if (listingTrustInReview) router.push("/verification-status" as any); else router.push({ pathname: "/apply-badge" as any, params: { badgeType: "landlord" } }); }} />
        </Reveal>


        {/* ── Shortcuts (design D) ── */}
        {h2("Your account")}
        <View style={[card, { marginHorizontal: 16 }]}>
          {ACCOUNT_GRID.filter((item) => item.id !== "edit-profile" && item.id !== "communities").map((item, i) => {
            const ICON: Record<string, keyof typeof Ionicons.glyphMap> = { myposts: "document-text-outline", messages: "chatbubble-outline", notifications: "notifications-outline", privacy: "shield-checkmark-outline", language: "language-outline", help: "help-circle-outline", about: "information-circle-outline" };
            const value = item.id === "myposts" && mergedPosts > 0 ? String(mergedPosts) : undefined;
            return <DRow key={item.id} first={i === 0} icon={ICON[item.id] ?? "ellipse-outline"} label={item.label.replace(" & ", " and ").replace(/ (\w)/g, (m) => m.toLowerCase())} value={value} onPress={() => router.push(item.route as any)} />;
          })}
        </View>

        {blockedUsers.length > 0 ? (
          <>
            {h2("Blocked people")}
            <View style={[card, { marginHorizontal: 16 }]}>
              {blockedUsers.map((bu, idx) => (
                <DRow key={bu.id} first={idx === 0} icon="person-outline" label={bu.name}
                  right={<SoftButton small ghost label="Unblock" onPress={() => appAlert("Unblock", `Unblock ${bu.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Unblock", onPress: async () => { await unblockUser(bu.id); try { await unblockUserApi(bu.id); } catch { /* best-effort */ } } },
                  ])} />} />
              ))}
            </View>
          </>
        ) : null}

        <View style={[card, { marginHorizontal: 16, marginTop: 24 }]}>
          <DRow first danger icon="log-out-outline" label="Log out" onPress={handleLogout} />
        </View>
        <Text style={[TYPE.small, { color: tc.textTertiary, textAlign: "center", marginTop: 18, fontSize: 11.5 }]}>© 2026 ComLinkr Ltd. All rights reserved.</Text>
    </DPage>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: palette.white },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: rs(48) },

  // Submitted/status pill
  submittedPill: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: palette.green100, borderWidth: 1, borderColor: palette.green200, paddingHorizontal: rs(9), paddingVertical: rs(4), borderRadius: rs(999) },
  submittedPillText: { fontSize: rs(10), fontWeight: "800", color: palette.green600 },

  // Promo cards (Verify + Feature sections)
  promoCard: { backgroundColor: palette.white, borderRadius: rs(18), borderWidth: 1, borderColor: palette.neutralL93, overflow: "hidden", shadowColor: palette.navy, shadowOpacity: 0.07, shadowRadius: rs(12), shadowOffset: { width: 0, height: rs(4) }, elevation: 4 },
  promoCardHeader: { flexDirection: "row", alignItems: "center", gap: rs(12), padding: rs(14) },
  promoIconWrap: {},
  promoIcon: { width: rs(46), height: rs(46), borderRadius: rs(14), alignItems: "center", justifyContent: "center" },
  promoCardTitle: { fontSize: rs(15), fontWeight: "800", color: palette.navy, letterSpacing: -0.2 },
  promoCardSub: { fontSize: rs(12), color: Colors.text.secondary, marginTop: rs(2), lineHeight: rs(17) },
  promoBenefitsRow: { paddingHorizontal: rs(14), paddingBottom: rs(12), gap: rs(6) },
  promoBenefit: { flexDirection: "row", alignItems: "center", gap: rs(7) },
  promoBenefitText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.green },
  promoActionBtn: { marginHorizontal: rs(14), marginBottom: rs(14), borderRadius: rs(14), overflow: "hidden" },
  promoActionGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(7), paddingVertical: rs(13) },
  promoActionText: { fontSize: rs(14), fontWeight: "800", color: palette.white },

  // Plan cards for featured listing
  planRow: { flexDirection: "row", gap: rs(8), paddingHorizontal: rs(14), paddingBottom: rs(14) },
  planCard: { flex: 1, alignItems: "center", paddingVertical: rs(12), borderRadius: rs(14), borderWidth: 1.5, borderColor: palette.neutralL93, backgroundColor: palette.neutralL99 },
  planCardActive: { borderColor: Colors.brand.orange, backgroundColor: palette.orange50 },
  planCardHighlight: { borderColor: palette.amber200, backgroundColor: palette.amber50 },
  planPopularBadge: { position: "absolute", top: rs(-8), backgroundColor: Colors.brand.orange, borderRadius: rs(6), paddingHorizontal: rs(6), paddingVertical: rs(2) },
  planPopularText: { fontSize: rs(8), fontWeight: "900", color: palette.white, letterSpacing: 0.3 },
  planLabel: { fontSize: rs(12), fontWeight: "700", color: Colors.text.secondary },
  planLabelActive: { color: Colors.brand.orange },
  planPrice: { fontSize: rs(15), fontWeight: "900", color: Colors.text.primary, marginTop: rs(3) },
  planPriceActive: { color: Colors.brand.orange },

  // Section
  section: { marginTop: rs(22), paddingHorizontal: rs(16) },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: rs(10) },
  sectionLabelLeft: { flexDirection: "row", alignItems: "center", gap: rs(7) },
  sectionLabelText: { fontSize: rs(11), fontWeight: "900", color: Colors.text.tertiary, letterSpacing: 1.4, textTransform: "uppercase" },
  sectionCountPill: { backgroundColor: Colors.brand.blueLight, borderWidth: 1, borderColor: palette.skyL92_2, paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(999) },
  sectionCountText: { fontSize: rs(11), fontWeight: "800", color: Colors.brand.blue },
  sectionLinkText:  { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },

  // Badge rows
  badgeRow: { flexDirection: "row", alignItems: "center", gap: rs(10), paddingVertical: rs(10), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.gray100 },
  badgeRowIcon: { width: rs(36), height: rs(36), borderRadius: rs(11), alignItems: "center", justifyContent: "center" },
  badgeRowLabel: { flex: 1, fontSize: rs(13), fontWeight: "700", color: palette.navy },
  badgeStatusPill: { flexDirection: "row", alignItems: "center", gap: rs(4), paddingHorizontal: rs(8), paddingVertical: rs(4), borderRadius: rs(8) },
  badgeStatusText: { fontSize: rs(10), fontWeight: "700" },
  badgeApplyBtn: { backgroundColor: Colors.brand.blue, borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(5) },
  badgeApplyBtnText: { fontSize: rs(11), fontWeight: "800", color: palette.white },

  // Change button
  changeBtn: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: Colors.brand.blueLight, borderWidth: 1, borderColor: palette.skyL92_2, paddingHorizontal: rs(12), paddingVertical: rs(5), borderRadius: rs(999) },
  changeBtnText: { fontSize: rs(11), fontWeight: "800", color: Colors.brand.blue },

  // Hero
  heroWrap: { position: "relative" },
  heroCover: { height: rs(180), overflow: "hidden", paddingTop: rs(50) },
  decor1: { position: "absolute", top: rs(-50), right: rs(-50), width: rs(180), height: rs(180), borderRadius: rs(90), backgroundColor: "rgba(26,107,174,0.10)" },
  decor2: { position: "absolute", bottom: rs(-40), left: rs(-30), width: rs(140), height: rs(140), borderRadius: rs(70), backgroundColor: "rgba(48,133,91,0.09)" },
  decor3: { position: "absolute", top: rs(20), left: "42%", width: rs(80), height: rs(80), borderRadius: rs(40), backgroundColor: "rgba(37,122,134,0.07)" },
  heroTopBar: { position: "absolute", top: rs(48), left: rs(12), right: rs(16), flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 100, elevation: 100 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: rs(10) },
  heroBackBtn: {},
  heroBackCircle: { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: "rgba(26,107,174,0.15)", alignItems: "center", justifyContent: "center", shadowColor: palette.black, shadowOpacity: 0.12, shadowRadius: rs(8), shadowOffset: { width: 0, height: rs(2) }, elevation: 8 },
  heroIconBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(26,107,174,0.18)", alignItems: "center", justifyContent: "center", shadowColor: palette.black, shadowOpacity: 0.08, shadowRadius: rs(4), shadowOffset: { width: 0, height: rs(2) }, elevation: 3 },
  heroEditBtn: { flexDirection: "row", alignItems: "center", gap: rs(6), backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(26,107,174,0.18)", paddingHorizontal: rs(14), height: rs(36), borderRadius: rs(999), shadowColor: palette.black, shadowOpacity: 0.08, shadowRadius: rs(4), shadowOffset: { width: 0, height: rs(2) }, elevation: 3 },
  heroEditText: { fontSize: rs(12), fontWeight: "900", color: Colors.brand.blue },

  // Avatar
  avatarWrap: { position: "absolute", bottom: rs(-50), left: rs(16), zIndex: 2 },
  avatarGrad: { width: rs(100), height: rs(100), borderRadius: rs(50), alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: palette.white, shadowColor: Colors.brand.blue, shadowOpacity: 0.28, shadowRadius: rs(18), shadowOffset: { width: 0, height: rs(6) }, elevation: 12 },
  avatarImage: { width: rs(100), height: rs(100), borderRadius: rs(50), borderWidth: 4, borderColor: palette.white },
  errorBanner: { marginHorizontal: rs(16), marginTop: rs(8), padding: rs(12), borderRadius: rs(12), borderWidth: 1 },
  errorBannerText: { fontSize: rs(13), fontWeight: "600", textAlign: "center" },
  avatarText: { fontSize: rs(34), fontWeight: "900", color: palette.white },
  onlineDot: { position: "absolute", bottom: rs(6), right: rs(4), width: rs(16), height: rs(16), borderRadius: rs(8), backgroundColor: palette.green500, borderWidth: 3, borderColor: palette.white },

  // Info card
  infoCard: { backgroundColor: palette.white, paddingHorizontal: rs(16), paddingBottom: rs(16), borderBottomWidth: 1, borderBottomColor: palette.neutralL96_2, alignItems: "flex-start" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: rs(8), flexWrap: "wrap", marginBottom: rs(4) },
  userName: { fontSize: rs(22), fontWeight: "900", color: Colors.text.primary, letterSpacing: -0.5 },
  proBadge: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: Colors.brand.orange, paddingHorizontal: rs(8), paddingVertical: rs(4), borderRadius: rs(999) },
  proBadgeText: { fontSize: rs(9), fontWeight: "900", color: palette.white, letterSpacing: 0.6 },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: palette.green100, borderWidth: 1, borderColor: palette.green200, paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(999) },
  verifiedText: { fontSize: rs(10), fontWeight: "900", color: Colors.brand.green },
  userHandle: { fontSize: rs(14), fontWeight: "700", color: Colors.text.secondary, marginBottom: rs(10) },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(8), marginBottom: rs(12) },
  metaPill: { flexDirection: "row", alignItems: "center", gap: rs(6), backgroundColor: palette.neutralL98_2, borderWidth: 1, borderColor: palette.skyL94_3, paddingHorizontal: rs(12), paddingVertical: rs(7), borderRadius: rs(999) },
  metaPillText: { fontSize: rs(11), fontWeight: "800", color: Colors.text.secondary },
  bio: { fontSize: rs(13), color: Colors.text.secondary, lineHeight: rs(20), fontWeight: "600" },

  // Stats — single row, compact
  statsGrid: { paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(6), backgroundColor: palette.white },
  statsRow: { flexDirection: "row", gap: rs(10) },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: rs(14),
    paddingVertical: rs(14),
    paddingHorizontal: rs(4),
    borderWidth: 1,
    borderColor: palette.skyL94_6,
    shadowColor: palette.navy,
    shadowOpacity: 0.04,
    shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(3) },
    elevation: 2,
    gap: rs(4),
  },
  statIconBox: { width: rs(34), height: rs(34), borderRadius: rs(11), alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: rs(17), fontWeight: "900", color: Colors.text.primary, letterSpacing: -0.4, textAlign: "center" },
  statLabel: { fontSize: rs(9), fontWeight: "900", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.4, textAlign: "center" },

  // Achievements
  achieveRow: { flexDirection: "row", gap: rs(10), paddingRight: rs(8) },
  achieveChip: { alignItems: "center", backgroundColor: palette.white, borderRadius: rs(14), paddingHorizontal: rs(16), paddingVertical: rs(14), borderWidth: 1, borderColor: palette.skyL94_6, shadowColor: palette.navy, shadowOpacity: 0.04, shadowRadius: rs(6), shadowOffset: { width: 0, height: rs(3) }, elevation: 2, gap: rs(6), minWidth: 90, position: "relative" },
  achieveChipLocked: { backgroundColor: palette.gray50, borderColor: palette.gray200 },
  achieveEmoji: { fontSize: rs(22) },
  achieveLabel: { fontSize: rs(10), fontWeight: "900", color: Colors.text.secondary, textAlign: "center" },
  achieveLabelLocked: { color: Colors.text.tertiary },
  lockBadge: { position: "absolute", top: rs(7), right: rs(7), width: rs(16), height: rs(16), borderRadius: rs(8), backgroundColor: palette.gray200, alignItems: "center", justifyContent: "center" },

  // Location pref card
  prefCard: { backgroundColor: palette.white, borderRadius: rs(16), borderWidth: 1, borderColor: palette.skyL94_6, overflow: "hidden", shadowColor: palette.navy, shadowOpacity: 0.04, shadowRadius: rs(8), shadowOffset: { width: 0, height: rs(3) }, elevation: 2 },
  locRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: rs(16), paddingVertical: rs(14), gap: rs(14) },
  locDivider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.neutralL95, marginHorizontal: rs(16) },
  locIcon: { width: rs(38), height: rs(38), borderRadius: rs(13), alignItems: "center", justifyContent: "center" },
  locText: { flex: 1 },
  locFieldLabel: { fontSize: rs(10), fontWeight: "800", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: rs(2) },
  locValue: { fontSize: rs(15), fontWeight: "900", color: Colors.text.primary },
  locValueEmpty: { fontSize: rs(14), fontWeight: "700", color: Colors.text.tertiary, fontStyle: "italic" },

  // Tags
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: rs(8) },
  tagOrange: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: Colors.brand.orangeLight, borderWidth: 1, borderColor: palette.orangeL81, borderRadius: rs(999), paddingHorizontal: rs(12), paddingVertical: rs(6) },
  tagGreen:  { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: Colors.brand.greenLight,  borderWidth: 1, borderColor: palette.greenL79, borderRadius: rs(999), paddingHorizontal: rs(12), paddingVertical: rs(6) },
  tagBlue:   { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: Colors.brand.blueLight,   borderWidth: 1, borderColor: palette.skyL85, borderRadius: rs(999), paddingHorizontal: rs(12), paddingVertical: rs(6) },
  tagText: { fontSize: rs(12), fontWeight: "700", color: Colors.text.secondary },

  // Empty pref state
  emptyPrefCard: { flexDirection: "row", alignItems: "center", gap: rs(14), backgroundColor: palette.slate50, borderRadius: rs(16), borderWidth: 1, borderColor: palette.skyL94_6, paddingHorizontal: rs(16), paddingVertical: rs(16), shadowColor: palette.navy, shadowOpacity: 0.03, shadowRadius: rs(6), shadowOffset: { width: 0, height: rs(2) }, elevation: 1 },
  emptyPrefIconWrap: { width: rs(40), height: rs(40), borderRadius: rs(12), backgroundColor: palette.blueL97, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emptyPrefTitle: { fontSize: rs(14), fontWeight: "800", color: Colors.text.primary, marginBottom: rs(3) },
  emptyPrefSub: { fontSize: rs(12), color: Colors.text.tertiary, fontWeight: "600", lineHeight: rs(17) },

  // Account & Settings — 3-column compact grid
  accountGrid: { gap: rs(10) },
  accountGridRow: { flexDirection: "row", gap: rs(10) },
  accountGridCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: rs(14),
    paddingVertical: rs(14),
    paddingHorizontal: rs(6),
    borderWidth: 1,
    borderColor: palette.skyL94_6,
    shadowColor: palette.navy,
    shadowOpacity: 0.04,
    shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(3) },
    elevation: 2,
    gap: rs(5),
  },
  accountCardIconWrap: { position: "relative", marginBottom: rs(1) },
  accountCardIcon: { width: rs(38), height: rs(38), borderRadius: rs(13), alignItems: "center", justifyContent: "center" },
  accountCardBadge: { position: "absolute", top: rs(-4), right: rs(-4), minWidth: 16, height: rs(16), borderRadius: rs(8), backgroundColor: Colors.brand.orange, alignItems: "center", justifyContent: "center", paddingHorizontal: rs(3), borderWidth: 2, borderColor: palette.white },
  accountCardBadgeText: { fontSize: rs(8), fontWeight: "900", color: palette.white },
  accountCardLabel: { fontSize: rs(11), fontWeight: "800", color: Colors.text.primary, textAlign: "center" },
  accountCardSub: { fontSize: rs(9), fontWeight: "600", color: Colors.text.tertiary, textAlign: "center" },

  // Roommate Preferences
  rmStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: rs(10),
    marginBottom: rs(12),
  },
  rmStatCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.white,
    borderRadius: rs(14),
    paddingVertical: rs(14),
    paddingHorizontal: rs(8),
    borderWidth: 1,
    borderColor: palette.skyL94_6,
    shadowColor: palette.navy,
    shadowOpacity: 0.04,
    shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(3) },
    elevation: 2,
    gap: rs(6),
    minHeight: 100,
  },
  rmStatIcon: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(13),
    alignItems: "center",
    justifyContent: "center",
  },
  rmStatValue: {
    fontSize: rs(12),
    fontWeight: "800",
    color: Colors.text.primary,
    textAlign: "center",
    lineHeight: rs(16),
  },
  rmStatLabel: {
    fontSize: rs(9),
    fontWeight: "900",
    color: Colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  rmChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: rs(8),
    marginBottom: rs(12),
  },
  rmChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(6),
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: "transparent",
  },
  rmChipText: {
    fontSize: rs(12),
    fontWeight: "700",
  },
  rmInfoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(8),
    backgroundColor: Colors.brand.blueLight,
    borderWidth: 1,
    borderColor: palette.skyL92_2,
    borderRadius: rs(12),
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
  },
  rmInfoNoteText: {
    flex: 1,
    fontSize: rs(11),
    fontWeight: "600",
    color: Colors.brand.blue,
    lineHeight: rs(17),
  },

  // Roommate Edit Modal
  rmModalSafe: { flex: 1, backgroundColor: palette.white },
  rmModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(14),
    borderBottomWidth: 1,
    borderBottomColor: palette.skyL94_6,
  },
  rmModalTitle: { fontSize: rs(17), fontWeight: "900", color: Colors.text.primary, letterSpacing: -0.3 },
  rmModalSaveBtn: { paddingHorizontal: rs(18), paddingVertical: rs(8), borderRadius: rs(999) },
  rmModalSaveBtnText: { fontSize: rs(13), fontWeight: "900", color: palette.white },
  rmModalScroll: { flex: 1 },
  rmModalScrollContent: { padding: rs(16) },
  rmFormSection: { marginBottom: rs(24) },
  rmFormLabelRow: { flexDirection: "row", alignItems: "center", gap: rs(10), marginBottom: rs(12) },
  rmFormLabelIcon: { width: rs(32), height: rs(32), borderRadius: rs(10), alignItems: "center", justifyContent: "center" },
  rmFormLabel: { fontSize: rs(14), fontWeight: "900", color: Colors.text.primary, letterSpacing: -0.2 },
  rmBudgetRow: { flexDirection: "row", alignItems: "center", gap: rs(8) },
  rmInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.neutralL98_2,
    borderWidth: 1.5,
    borderColor: palette.skyL94_6,
    borderRadius: rs(14),
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
  },
  rmInputPrefix: { fontSize: rs(15), fontWeight: "800", color: Colors.text.secondary, marginRight: rs(2) },
  rmInput: { flex: 1, fontSize: rs(15), fontWeight: "800", color: Colors.text.primary, padding: 0 },
  rmBudgetDash: { fontSize: rs(16), fontWeight: "700", color: Colors.text.tertiary },
  rmBudgetSuffix: { fontSize: rs(12), fontWeight: "700", color: Colors.text.tertiary },
  rmFullInput: {
    backgroundColor: palette.neutralL98_2,
    borderWidth: 1.5,
    borderColor: palette.skyL94_6,
    borderRadius: rs(14),
    paddingHorizontal: rs(16),
    paddingVertical: rs(14),
    fontSize: rs(15),
    fontWeight: "800",
    color: Colors.text.primary,
  },
  rmFormHint: { fontSize: rs(11), fontWeight: "600", color: Colors.text.tertiary, marginTop: rs(6), marginLeft: rs(2) },
  rmOptionRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(8) },
  rmOptionChip: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    borderRadius: rs(12),
    backgroundColor: palette.neutralL98_2,
    borderWidth: 1.5,
    borderColor: palette.skyL94_6,
  },
  rmOptionChipActive: {
    backgroundColor: Colors.brand.blueLight,
    borderColor: Colors.brand.blue,
  },
  rmOptionChipText: { fontSize: rs(13), fontWeight: "700", color: Colors.text.secondary },
  rmOptionChipTextActive: { color: Colors.brand.blue, fontWeight: "900" },
  rmToggleList: { gap: rs(2) },
  rmToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: rs(14),
    paddingHorizontal: rs(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutralL96_2,
  },
  rmToggleLeft: { flexDirection: "row", alignItems: "center", gap: rs(12) },
  rmToggleLabel: { fontSize: rs(14), fontWeight: "700", color: Colors.text.primary },
  rmToggleTrack: {
    width: rs(48),
    height: rs(28),
    borderRadius: rs(14),
    backgroundColor: palette.gray200,
    justifyContent: "center",
    padding: rs(2),
  },
  rmToggleTrackActive: { backgroundColor: Colors.brand.blue },
  rmToggleThumb: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    backgroundColor: palette.white,
    shadowColor: palette.black,
    shadowOpacity: 0.15,
    shadowRadius: rs(4),
    shadowOffset: { width: 0, height: rs(2) },
    elevation: 3,
  },
  rmToggleThumbActive: { alignSelf: "flex-end" },

  // Sign Out
  signOutSection: { paddingHorizontal: rs(16), marginTop: rs(24) },
  signOutBtn: { borderRadius: rs(18), overflow: "hidden" },
  signOutGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(10), paddingVertical: rs(16) },
  signOutText: { fontSize: rs(16), fontWeight: "900", color: palette.white, letterSpacing: 0.3 },

  // Footer
  footer: { alignItems: "center", paddingTop: rs(28), paddingBottom: rs(12), gap: rs(4) },
  footerRule: { width: rs(48), height: rs(3), borderRadius: rs(2), backgroundColor: palette.gray200, marginBottom: rs(12) },
  footerBrand: { fontSize: rs(13), fontWeight: "900", color: Colors.text.secondary, letterSpacing: 0.5 },
  footerMeta: { fontSize: rs(11), color: Colors.text.tertiary, fontWeight: "700" },
  footerHeart: { fontSize: rs(11), color: Colors.text.tertiary, fontWeight: "700" },
});
