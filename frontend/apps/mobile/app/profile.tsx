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
  Platform,
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
  { v: "—", l: "Posts",     icon: "document-text" as const, c: [Colors.brand.orange, "#CC5500"] as [string, string] },
  { v: "—", l: "Saved",     icon: "bookmark"      as const, c: [Colors.brand.green, Colors.brand.greenDark] as [string, string] },
  { v: "—", l: "Events",    icon: "calendar"      as const, c: [Colors.brand.orange, "#E56800"] as [string, string] },
  { v: "—", l: "Neighbors", icon: "people"        as const, c: [Colors.brand.blue, "#0055CC"] as [string, string] },
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
  { id: "myposts",       label: "My Posts",           sublabel: "All your content",      icon: "document-text",      colors: [Colors.brand.orange, "#CC5500"],            route: "/myposts" },
  { id: "messages",      label: "Messages",           sublabel: "Your conversations",    icon: "chatbubbles",        colors: [Colors.brand.blue, "#0055CC"],             route: "/chat" },
  { id: "edit-profile",  label: "Edit Profile",       sublabel: "Name, photo & bio",     icon: "person",             colors: [Colors.brand.blue, "#0055CC"],             route: "/edit-profile" },
  { id: "communities",   label: "My Communities",     sublabel: "Manage & update groups", icon: "people",             colors: [Colors.brand.green, Colors.brand.greenDark], route: "/edit-profile" },
  { id: "notifications", label: "Notifications",      sublabel: "Alerts & push",         icon: "notifications",      colors: [Colors.brand.orange, "#E56800"],           route: "/notifications" },
  { id: "privacy",       label: "Privacy",            sublabel: "Security settings",     icon: "shield-checkmark",   colors: [Colors.brand.blue, "#0055CC"],             route: "/settings" },
  { id: "language",      label: "Language",           sublabel: "Region & locale",       icon: "language",           colors: [Colors.brand.green, Colors.brand.greenDark], route: "/settings" },
  { id: "help",          label: "Help & Support",     sublabel: "FAQs, contact us",      icon: "help-circle",        colors: ["#0EA5E9", "#0284C7"],                     route: "/settings" },
  { id: "about",         label: "About",              sublabel: "Version & terms",       icon: "information-circle", colors: ["#5A6A7E", "#3D4F61"],                     route: "/settings" },
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
        { v: String(mergedPosts),     l: "Content",   icon: "layers"   as const, c: [Colors.brand.blue,   "#0055CC"]                           as [string, string] },
        { v: String(mergedSaved),     l: "Saved",     icon: "bookmark" as const, c: [Colors.brand.green,  Colors.brand.greenDark]               as [string, string] },
        { v: String(mergedEvents),    l: "Events",    icon: "calendar" as const, c: [Colors.brand.orange, "#E56800"]                            as [string, string] },
        { v: mergedNeighbors > 0 ? String(mergedNeighbors) : "—", l: "Neighbors", icon: "people" as const, c: [Colors.brand.blue, "#0055CC"] as [string, string] },
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

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={[]}>
      <ScrollView
        style={[s.scroll, { backgroundColor: tc.pageBg }]}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        overScrollMode="always"
        bounces
        horizontal={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        nestedScrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchProfile(true)}
            tintColor={Colors.brand.blue}
          />
        }
      >
        {/* ── HERO ── */}
        <View style={s.heroWrap}>
          {/* Background gradient — purely visual, no touch handling */}
          <LinearGradient
            colors={isDark ? ["#0D1B2A", "#0A1628"] : ["#EBF5FF", "#EAFBE9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroCover}
            pointerEvents="box-none"
          >
            <View style={s.decor1} />
            <View style={s.decor2} />
            <View style={s.decor3} />
          </LinearGradient>

          {/* Top bar — back arrow left, settings + edit right, all in one row */}
          <View style={s.heroTopBar}>
            <Pressable
              style={({ pressed }) => [s.heroBackBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.9 }] }]}
              onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }}
              hitSlop={{ top: rs(12), bottom: rs(12), left: rs(12), right: rs(12) }}
            >
              <View style={s.heroBackCircle}>
                <Ionicons name="chevron-back" size={20} color={Colors.brand.blue} />
              </View>
            </Pressable>

            <View style={s.heroActions}>
              <Pressable
                style={({ pressed }) => [s.heroIconBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/settings" as any)}
              >
                <Ionicons name="settings-outline" size={18} color={Colors.brand.blue} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.heroEditBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/edit-profile" as any)}
              >
                <Ionicons name="pencil" size={13} color={Colors.brand.blue} />
                <Text style={s.heroEditText}>Edit Profile</Text>
              </Pressable>
            </View>
          </View>

          {/* Avatar — purely visual, does not block touches */}
          <View style={s.avatarWrap} pointerEvents="none">
            {profileLoading && !avatarUri ? (
              <View style={[s.avatarGrad, { alignItems: "center", justifyContent: "center" }]}>
                <ActivityIndicator color="#FFF" />
              </View>
            ) : avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={s.avatarImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={[Colors.brand.blue, Colors.brand.green]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.avatarGrad}
              >
                <Text style={s.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {profileError ? (
          <View style={[s.errorBanner, { backgroundColor: isDark ? "#3A1515" : "#FEF2F2", borderColor: isDark ? "#7F1D1D" : "#FECACA" }]}>
            <Text style={[s.errorBannerText, { color: isDark ? "#FCA5A5" : "#B91C1C" }]}>{profileError}</Text>
          </View>
        ) : null}

        {/* ── USER INFO ── */}
        <View style={[s.infoCard, { backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }]}>
          <View style={{ height: rs(58) }} />
          <View style={s.nameRow}>
            <Text style={[s.userName, { color: tc.textPrimary }]}>
              {serverProfile?.name?.trim() || user?.name || "ComLinkr User"}
            </Text>
            {false && user?.isPro && (
              <View style={s.proBadge}>
                <Ionicons name="star" size={9} color="#FFF" />
                <Text style={s.proBadgeText}>PRO</Text>
              </View>
            )}
            {hasAnyVerifiedBadge && (
              <View style={s.verifiedPill}>
                <Ionicons name="shield-checkmark" size={11} color={Colors.brand.green} />
                <Text style={s.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={[s.userHandle, { color: tc.textSecondary }]}>
            @{serverProfile?.username?.trim() || user?.username || "comlinkr_user"}
          </Text>
          <View style={s.metaRow}>
            <View style={[s.metaPill, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location-outline" size={12} color={Colors.brand.blue} />
              <Text style={[s.metaPillText, { color: tc.textSecondary }]}>{displayCity}</Text>
            </View>
            <View style={[s.metaPill, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
              <Ionicons name="people-outline" size={12} color={Colors.brand.orange} />
              <Text style={[s.metaPillText, { color: tc.textSecondary }]}>
                {hasAnyStats
                  ? `${mergedNeighbors} neighbors`
                  : "— neighbors"}
              </Text>
            </View>
            <View style={[s.metaPill, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
              <Ionicons name="calendar-outline" size={12} color={Colors.brand.green} />
              <Text style={[s.metaPillText, { color: tc.textSecondary }]}>
                {formatJoinedLabel(serverProfile?.createdAt)}
              </Text>
            </View>
          </View>
          <Text style={[s.bio, { color: tc.textSecondary }]} numberOfLines={4}>
            {(serverProfile?.bio ?? user?.bio)?.trim()
              ? (serverProfile?.bio ?? user?.bio)?.trim()
              : "Add a short bio — tap Edit Profile."}
          </Text>
        </View>

        {/* ── STATS — single row ── */}
        <View style={[s.statsGrid, { backgroundColor: tc.cardBg }]}>
          <View style={s.statsRow}>
            {statsRow.map((st) => {
              const dest =
                st.l === "Posts"   ? "/myposts" :
                st.l === "Content" ? "/myposts" :
                st.l === "Saved"   ? "/saved" :
                st.l === "Events"  ? "/events" :
                null;
              return (
                <Pressable
                  key={st.l}
                  style={({ pressed }) => [s.statCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}
                  onPress={() => { if (dest) router.push(dest as any); }}
                  disabled={!dest}
                >
                  <View style={[s.statIconBox, { backgroundColor: st.c[0] }]}>
                    <Ionicons name={st.icon} size={14} color="#FFF" />
                  </View>
                  <Text style={[s.statValue, { color: tc.textPrimary }]}>{st.v}</Text>
                  <Text style={[s.statLabel, { color: tc.textTertiary }]}>{st.l}{dest ? " ›" : ""}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── ACHIEVEMENTS ── */}
        {(!serverProfile || achievementsRow.length > 0) && (
          <View style={s.section}>
            <SectionLabel
              icon="ribbon-outline"
              label="ACHIEVEMENTS"
              rightEl={
                serverProfile ? (
                  <View style={[s.sectionCountPill, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
                    <Text style={[s.sectionCountText, { color: Colors.brand.blue }]}>
                      {achievementsRow.filter((a) => a.earned).length}/{achievementsRow.length} earned
                    </Text>
                  </View>
                ) : null
              }
            />
            {profileLoading && achievementsRow.length === 0 ? (
              <View style={{ paddingVertical: rs(16), alignItems: "center" }}>
                <ActivityIndicator size="small" color={Colors.brand.blue} />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={s.achieveRow}
              >
                {achievementsRow.map((a, idx) => (
                  <View key={`${a.id}-${idx}`} style={[s.achieveChip, !a.earned && s.achieveChipLocked, { backgroundColor: a.earned ? tc.cardBg : tc.sectionBg, borderColor: tc.borderLight }]}>
                    <Text style={[s.achieveEmoji, !a.earned && { opacity: 0.3 }]}>{a.emoji}</Text>
                    <Text style={[s.achieveLabel, !a.earned && s.achieveLabelLocked, { color: a.earned ? tc.textSecondary : tc.textTertiary }]}>{a.label}</Text>
                    {!a.earned && (
                      <View style={s.lockBadge}>
                        <Ionicons name="lock-closed" size={8} color="#9CA3AF" />
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── MY LOCATION ── */}
        <View style={s.section}>
          <SectionLabel
            icon="location-outline"
            label="MY LOCATION"
            rightEl={<ChangeBtn onPress={goToEditProfile} />}
          />
          <View style={[s.prefCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <View style={s.locRow}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.blueDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.locIcon}>
                {COUNTRY_INFO[displayCountry]?.flag ? (
                  <Text style={{ fontSize: rs(16) }}>{COUNTRY_INFO[displayCountry].flag}</Text>
                ) : (
                  <Ionicons name="earth" size={16} color="#FFF" />
                )}
              </LinearGradient>
              <View style={s.locText}>
                <Text style={[s.locFieldLabel, { color: tc.textTertiary }]}>Country</Text>
                <Text style={[displayCountry === "Not set" ? s.locValueEmpty : s.locValue, { color: displayCountry === "Not set" ? tc.textTertiary : tc.textPrimary }]}>
                  {displayCountry !== "Not set" && COUNTRY_INFO[displayCountry] ? `${COUNTRY_INFO[displayCountry].flag}  ${displayCountry}  ${COUNTRY_INFO[displayCountry].code}` : displayCountry}
                </Text>
              </View>
            </View>
            <View style={[s.locDivider, { backgroundColor: tc.borderLight }]} />
            <View style={s.locRow}>
              <LinearGradient colors={[Colors.brand.green, Colors.brand.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.locIcon}>
                <Ionicons name="map" size={16} color="#FFF" />
              </LinearGradient>
              <View style={s.locText}>
                <Text style={[s.locFieldLabel, { color: tc.textTertiary }]}>State / Province</Text>
                <Text style={[displayState === "Not set" ? s.locValueEmpty : s.locValue, { color: displayState === "Not set" ? tc.textTertiary : tc.textPrimary }]}>{displayState}</Text>
              </View>
            </View>
            <View style={[s.locDivider, { backgroundColor: tc.borderLight }]} />
            <View style={s.locRow}>
              <View style={[s.locIcon, { backgroundColor: Colors.brand.orange, alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="business" size={16} color="#FFF" />
              </View>
              <View style={s.locText}>
                <Text style={[s.locFieldLabel, { color: tc.textTertiary }]}>City</Text>
                <Text style={[displayCity === "Not set" ? s.locValueEmpty : s.locValue, { color: displayCity === "Not set" ? tc.textTertiary : tc.textPrimary }]}>{displayCity}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── MY VIBE ── */}
        <View style={s.section}>
          <SectionLabel
            icon="heart-outline"
            label="MY VIBE"
            rightEl={<ChangeBtn onPress={goToEditProfile} />}
          />
          {(serverProfile?.vibes?.length ?? 0) > 0 ? (
            <View style={s.tagWrap}>
              {serverProfile!.vibes.map((v, idx) => {
                const iconName = CULTURE_MAP[v.id]?.icon ?? "musical-notes-outline";
                return (
                  <View key={`${v.id}-${idx}`} style={s.tagOrange}>
                    <Ionicons name={iconName as any} size={11} color="#FF7B00" />
                    <Text style={[s.tagText, { color: tc.textSecondary }]}>{v.name}</Text>
                  </View>
                );
              })}
            </View>
          ) : cultureIds.length === 0 ? (
            <TouchableOpacity style={[s.emptyPrefCard, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]} onPress={goToEditProfile} activeOpacity={0.7}>
              <View style={s.emptyPrefIconWrap}>
                <Ionicons name="musical-notes-outline" size={18} color={Colors.brand.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.emptyPrefTitle, { color: tc.textPrimary }]}>No vibe set yet</Text>
                <Text style={[s.emptyPrefSub, { color: tc.textTertiary }]}>Tap Change to pick your lifestyle preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4D0E4" />
            </TouchableOpacity>
          ) : (
            <View style={s.tagWrap}>
              {cultureIds.map((id, idx) => {
                const opt = CULTURE_MAP[id];
                if (!opt) return null;
                return (
                  <View key={`${id}-${idx}`} style={s.tagOrange}>
                    <Text style={[s.tagText, { color: tc.textSecondary }]}>{opt.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── MY INTERESTS ── */}
        <View style={s.section}>
          <SectionLabel
            icon="star-outline"
            label="MY INTERESTS"
            rightEl={<ChangeBtn onPress={goToEditProfile} />}
          />
          {(serverProfile?.interests?.length ?? 0) > 0 ? (
            <View style={s.tagWrap}>
              {serverProfile!.interests.map((it, idx) => {
                const iconName = INTEREST_MAP[it.id]?.icon ?? "star-outline";
                return (
                  <View key={`${it.id}-${idx}`} style={s.tagGreen}>
                    <Text style={[s.tagText, { color: tc.textSecondary }]}>{it.name}</Text>
                  </View>
                );
              })}
            </View>
          ) : interestIds.length === 0 ? (
            <TouchableOpacity style={[s.emptyPrefCard, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]} onPress={goToEditProfile} activeOpacity={0.7}>
              <View style={s.emptyPrefIconWrap}>
                <Ionicons name="star-outline" size={18} color={Colors.brand.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.emptyPrefTitle, { color: tc.textPrimary }]}>No interests set yet</Text>
                <Text style={[s.emptyPrefSub, { color: tc.textTertiary }]}>Tap Change to choose what you're looking for</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4D0E4" />
            </TouchableOpacity>
          ) : (
            <View style={s.tagWrap}>
              {interestIds.map((id, idx) => {
                const opt = INTEREST_MAP[id];
                if (!opt) return null;
                return (
                  <View key={`${id}-${idx}`} style={s.tagGreen}>
                    <Text style={[s.tagText, { color: tc.textSecondary }]}>{opt.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── MY COMMUNITIES ── */}
        <View style={s.section}>
          <SectionLabel
            icon="people-outline"
            label="MY COMMUNITIES"
            rightEl={<ChangeBtn onPress={goToEditProfile} />}
          />
          {(serverProfile?.communities?.length ?? 0) > 0 ? (
            <View style={s.tagWrap}>
              {serverProfile!.communities.map((c, idx) => (
                <View key={`${c.id}-${idx}`} style={s.tagBlue}>
                  <Text style={[s.tagText, { color: tc.textSecondary }]}>{c.name}</Text>
                </View>
              ))}
            </View>
          ) : communityIds.length === 0 ? (
            <TouchableOpacity style={[s.emptyPrefCard, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]} onPress={goToEditProfile} activeOpacity={0.7}>
              <View style={s.emptyPrefIconWrap}>
                <Ionicons name="people-outline" size={18} color={Colors.brand.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.emptyPrefTitle, { color: tc.textPrimary }]}>No communities joined yet</Text>
                <Text style={[s.emptyPrefSub, { color: tc.textTertiary }]}>Tap Change to find your global community</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4D0E4" />
            </TouchableOpacity>
          ) : (
            <View style={s.tagWrap}>
              {communityIds.map((id, idx) => {
                const opt = COMMUNITY_MAP[id];
                if (!opt) return null;
                return (
                  <View key={`${id}-${idx}`} style={s.tagBlue}>
                    <Text style={[s.tagText, { color: tc.textSecondary }]}>{opt.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── ROOMMATE PREFERENCES ── */}
        <View style={s.section}>
          <SectionLabel
            icon="home-outline"
            label="ROOMMATE PREFERENCES"
            rightEl={
              <Pressable
                style={({ pressed }) => [s.changeBtn, pressed && { opacity: 0.7 }]}
                onPress={openRmModal}
              >
                <Ionicons name="pencil" size={11} color={Colors.brand.blue} />
                <Text style={s.changeBtnText}>Edit</Text>
              </Pressable>
            }
          />

          {/* ── 3 stat cards: Budget · Move-in · Sleep ── */}
          <View style={s.rmStatRow}>
            {[
              {
                icon: "cash-outline" as const,
                color: Colors.brand.blue,
                bg: Colors.brand.blueLight,
                label: "Budget",
                value: `${formatPrice((prefs.budgetMin ?? DEFAULT_ROOMMATE_PREFS.budgetMin), profileCurrencyCode)}–${formatPrice((prefs.budgetMax ?? DEFAULT_ROOMMATE_PREFS.budgetMax), profileCurrencyCode)}/mo`,
              },
              { icon: "calendar-outline" as const, color: Colors.brand.green,  bg: Colors.brand.greenLight, label: "Move-in",      value: formatMoveInDate(prefs.moveInDate ?? DEFAULT_ROOMMATE_PREFS.moveInDate) },
              { icon: "moon-outline" as const,     color: Colors.brand.blue,   bg: Colors.brand.blueLight,  label: "Sleep",        value: prefs.sleepSchedule ?? DEFAULT_ROOMMATE_PREFS.sleepSchedule },
            ].map((st) => (
              <Pressable key={st.label} style={({ pressed }) => [s.rmStatCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, pressed && { opacity: 0.8 }]} onPress={openRmModal}>
                <View style={[s.rmStatIcon, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={18} color={st.color} />
                </View>
                <Text style={[s.rmStatValue, { color: tc.textPrimary }]}>{st.value}</Text>
                <Text style={[s.rmStatLabel, { color: tc.textTertiary }]}>{st.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Lifestyle chips — tappable to open edit ── */}
          <Pressable onPress={openRmModal}>
            <View style={s.rmChipWrap}>
              {[
                { icon: "sparkles" as const,              label: prefs.cleanliness ?? DEFAULT_ROOMMATE_PREFS.cleanliness, bg: Colors.brand.blueLight,  color: Colors.brand.blue },
                { icon: "volume-medium-outline" as const, label: prefs.noiseLevel ?? DEFAULT_ROOMMATE_PREFS.noiseLevel,   bg: Colors.brand.greenLight, color: Colors.brand.green },
                { icon: "paw-outline" as const,           label: (prefs.petFriendly ?? DEFAULT_ROOMMATE_PREFS.petFriendly) ? "Pet Friendly" : "No Pets", bg: (prefs.petFriendly ?? DEFAULT_ROOMMATE_PREFS.petFriendly) ? Colors.brand.orangeLight : "#FEE2E2", color: (prefs.petFriendly ?? DEFAULT_ROOMMATE_PREFS.petFriendly) ? Colors.brand.orange : "#DC2626" },
                { icon: "ban-outline" as const,           label: (prefs.smoking ?? DEFAULT_ROOMMATE_PREFS.smoking) ? "Smoking OK" : "No Smoking", bg: (prefs.smoking ?? DEFAULT_ROOMMATE_PREFS.smoking) ? Colors.brand.orangeLight : "#FEE2E2", color: "#DC2626" },
                { icon: "people-outline" as const,        label: `Guests: ${prefs.guestPolicy ?? DEFAULT_ROOMMATE_PREFS.guestPolicy}`, bg: Colors.brand.blueLight, color: Colors.brand.blue },
                { icon: "laptop-outline" as const,        label: (prefs.workFromHome ?? DEFAULT_ROOMMATE_PREFS.workFromHome) ? "Work from Home" : "Office/Hybrid", bg: Colors.brand.greenLight, color: Colors.brand.green },
              ].map((chip) => (
                <View key={`${String(chip.icon)}-${chip.label}`} style={[s.rmChip, { backgroundColor: chip.bg }]}>
                  <Ionicons name={chip.icon} size={13} color={chip.color} />
                  <Text style={[s.rmChipText, { color: chip.color }]}>{chip.label}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {/* ── Info note ── */}
          <View style={[s.rmInfoNote, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.brand.blue} />
            <Text style={[s.rmInfoNoteText, { color: tc.textSecondary }]}>
              Tap Edit to update your preferences. These details appear on your roommate card when others search for matches.
            </Text>
          </View>
        </View>

        {/* ── ROOMMATE EDIT MODAL ── */}
        <Modal
          visible={rmModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setRmModalVisible(false)}
        >
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <SafeAreaView style={[s.rmModalSafe, { backgroundColor: tc.sheetBg }]} edges={["top", "bottom"]}>
              {/* Modal header */}
              <View style={[s.rmModalHeader, { borderBottomColor: tc.borderLight }]}>
                <Pressable onPress={() => setRmModalVisible(false)} hitSlop={12}>
                  <Ionicons name="close" size={24} color={tc.textPrimary} />
                </Pressable>
                <Text style={[s.rmModalTitle, { color: tc.textPrimary }]}>Edit Roommate Preferences</Text>
                <Pressable onPress={saveRoommatePrefs} hitSlop={12} disabled={rmSaving} style={[s.rmModalSaveBtn, { backgroundColor: Colors.brand.blue }, rmSaving && { opacity: 0.65 }]}>
                  {rmSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.rmModalSaveBtnText}>Save</Text>
                  )}
                </Pressable>
              </View>

              <ScrollView style={[s.rmModalScroll, { backgroundColor: tc.sheetBg }]} contentContainerStyle={s.rmModalScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Budget */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: Colors.brand.blueLight }]}>
                      <Ionicons name="cash-outline" size={16} color={Colors.brand.blue} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Monthly Budget</Text>
                  </View>
                  <View style={s.rmBudgetRow}>
                    <View style={[s.rmInputWrap, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                      <Text style={[s.rmInputPrefix, { color: tc.textSecondary }]}>$</Text>
                      <TextInput
                        style={[s.rmInput, { color: tc.textPrimary }]}
                        value={rmBudgetMin}
                        onChangeText={setRmBudgetMin}
                        keyboardType="numeric"
                        placeholder="Min"
                        placeholderTextColor={tc.textTertiary}
                      />
                    </View>
                    <Text style={[s.rmBudgetDash, { color: tc.textTertiary }]}>–</Text>
                    <View style={[s.rmInputWrap, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                      <Text style={[s.rmInputPrefix, { color: tc.textSecondary }]}>$</Text>
                      <TextInput
                        style={[s.rmInput, { color: tc.textPrimary }]}
                        value={rmBudgetMax}
                        onChangeText={setRmBudgetMax}
                        keyboardType="numeric"
                        placeholder="Max"
                        placeholderTextColor={tc.textTertiary}
                      />
                    </View>
                    <Text style={[s.rmBudgetSuffix, { color: tc.textTertiary }]}>/mo</Text>
                  </View>
                </View>

                {/* Move-in Date */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: Colors.brand.greenLight }]}>
                      <Ionicons name="calendar-outline" size={16} color={Colors.brand.green} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Move-in Date</Text>
                  </View>
                  <DatePickerField
                    value={rmMoveInDate}
                    onChange={(iso) => setRmMoveInDate(iso ?? "")}
                    dateFormat="iso"
                    placeholder="Select move-in date"
                    accentColor={Colors.brand.green}
                    minimumDate={new Date()}
                    style={{ backgroundColor: tc.inputBg, borderColor: tc.borderLight, borderWidth: 1.5, borderRadius: rs(12), paddingHorizontal: rs(14), paddingVertical: rs(13) }}
                    textStyle={{ color: tc.textPrimary, fontSize: rs(14), fontWeight: "500" }}
                  />
                </View>

                {/* Sleep Schedule */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: Colors.brand.blueLight }]}>
                      <Ionicons name="moon-outline" size={16} color={Colors.brand.blue} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Sleep Schedule</Text>
                  </View>
                  <View style={s.rmOptionRow}>
                    {SLEEP_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[s.rmOptionChip, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, rmSleep === opt && s.rmOptionChipActive]}
                        onPress={() => setRmSleep(opt)}
                      >
                        <Text style={[s.rmOptionChipText, { color: tc.textSecondary }, rmSleep === opt && s.rmOptionChipTextActive]}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Cleanliness */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: Colors.brand.blueLight }]}>
                      <Ionicons name="sparkles" size={16} color={Colors.brand.blue} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Cleanliness</Text>
                  </View>
                  <View style={s.rmOptionRow}>
                    {CLEANLINESS_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[s.rmOptionChip, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, rmClean === opt && s.rmOptionChipActive]}
                        onPress={() => setRmClean(opt)}
                      >
                        <Text style={[s.rmOptionChipText, { color: tc.textSecondary }, rmClean === opt && s.rmOptionChipTextActive]}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Noise Level */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: Colors.brand.greenLight }]}>
                      <Ionicons name="volume-medium-outline" size={16} color={Colors.brand.green} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Noise Level</Text>
                  </View>
                  <View style={s.rmOptionRow}>
                    {NOISE_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[s.rmOptionChip, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, rmNoise === opt && s.rmOptionChipActive]}
                        onPress={() => setRmNoise(opt)}
                      >
                        <Text style={[s.rmOptionChipText, { color: tc.textSecondary }, rmNoise === opt && s.rmOptionChipTextActive]}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Guest Policy */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: Colors.brand.blueLight }]}>
                      <Ionicons name="people-outline" size={16} color={Colors.brand.blue} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Guest Policy</Text>
                  </View>
                  <View style={s.rmOptionRow}>
                    {GUEST_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[s.rmOptionChip, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, rmGuest === opt && s.rmOptionChipActive]}
                        onPress={() => setRmGuest(opt)}
                      >
                        <Text style={[s.rmOptionChipText, { color: tc.textSecondary }, rmGuest === opt && s.rmOptionChipTextActive]}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Toggle switches */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: Colors.brand.orangeLight }]}>
                      <Ionicons name="options-outline" size={16} color={Colors.brand.orange} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Lifestyle</Text>
                  </View>
                  <View style={s.rmToggleList}>
                    {[
                      { key: "pet",  icon: "paw-outline" as const,    label: "Pet Friendly",   val: rmPet,   set: setRmPet },
                      { key: "smoke", icon: "ban-outline" as const,    label: "Smoking Allowed", val: rmSmoke, set: setRmSmoke },
                      { key: "wfh",  icon: "laptop-outline" as const, label: "Work from Home",  val: rmWfh,   set: setRmWfh },
                    ].map((item) => (
                      <Pressable
                        key={item.key}
                        style={[s.rmToggleRow, { borderBottomColor: tc.borderLight }]}
                        onPress={() => item.set(!item.val)}
                      >
                        <View style={s.rmToggleLeft}>
                          <Ionicons name={item.icon} size={18} color={tc.textSecondary} />
                          <Text style={[s.rmToggleLabel, { color: tc.textPrimary }]}>{item.label}</Text>
                        </View>
                        <View style={[s.rmToggleTrack, item.val && s.rmToggleTrackActive]}>
                          <View style={[s.rmToggleThumb, item.val && s.rmToggleThumbActive]} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={{ height: rs(40) }} />
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MY BADGES ── */}
        <View style={s.section}>
          <SectionLabel
            icon="shield-checkmark-outline"
            label="MY BADGES"
            rightEl={
              <Pressable onPress={() => router.push("/verification-status" as any)}>
                <Text style={s.sectionLinkText}>Manage</Text>
              </Pressable>
            }
          />
          {([
            { badge: "landlord"        as const, label: "Verified Property Host",     icon: "home"       as const, gradient: ["#0076EB", "#0054CC"] as [string, string] },
            { badge: "restaurant_owner" as const, label: "Verified Restaurant Owner", icon: "restaurant" as const, gradient: ["#26B324", "#1a8a18"] as [string, string] },
            { badge: "agency"          as const, label: "Verified Agency",            icon: "business"   as const, gradient: ["#FF7B00", "#E56800"] as [string, string] },
            { badge: "local_reviewer"  as const, label: "Local Reviewer",             icon: "star"       as const, gradient: ["#F59E0B", "#D97706"] as [string, string] },
          ]).map(({ badge, label, icon, gradient }) => {
            const status = getBadgeStatus(badge);
            const statusMeta = {
              none:     { label: "Not Applied",  color: isDark ? "#94A3B8" : "#9CA3AF", bg: isDark ? tc.inputBg   : "#F3F4F6",  icon: "ellipse-outline"  as const },
              pending:  { label: "Under Review", color: "#D97706",                      bg: isDark ? "#2A1A00"   : "#FEF3C7",  icon: "time"             as const },
              verified: { label: "Active",       color: "#16A34A",                      bg: isDark ? "#052010"   : "#DCFCE7",  icon: "checkmark-circle" as const },
              rejected: { label: "Not Approved", color: "#DC2626",                      bg: isDark ? "#200808"   : "#FEE2E2",  icon: "close-circle"     as const },
            }[status];
            return (
              <View key={badge} style={[s.badgeRow, { borderBottomColor: tc.borderLight }]}>
                <View style={[s.badgeRowIcon, { backgroundColor: status === "verified" ? gradient[0] : "#9CA3AF" }]}>
                  <Ionicons name={icon} size={16} color="#FFF" />
                </View>
                <Text style={[s.badgeRowLabel, { color: tc.textPrimary }]} numberOfLines={1}>{label}</Text>
                <View style={[s.badgeStatusPill, { backgroundColor: statusMeta.bg }]}>
                  <Ionicons name={statusMeta.icon} size={11} color={statusMeta.color} />
                  <Text style={[s.badgeStatusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                </View>
                {(status === "none" || status === "rejected") && (
                  <Pressable
                    onPress={() => router.push({ pathname: "/apply-badge" as any, params: { badgeType: badge } })}
                    style={s.badgeApplyBtn}
                  >
                    <Text style={s.badgeApplyBtnText}>{status === "rejected" ? "Re-apply" : "Apply"}</Text>
                  </Pressable>
                )}
                {status === "verified" && (
                  <Pressable
                    onPress={() => router.push({
                      pathname: "/create-post" as any,
                      params: {
                        type: badge === "landlord" || badge === "agency" ? "listing"
                          : badge === "restaurant_owner" || badge === "local_reviewer" ? "restaurant"
                          : undefined,
                        mode: badge === "local_reviewer" ? "review" : undefined,
                      },
                    })}
                    style={[s.badgeApplyBtn, { backgroundColor: gradient[0] }]}
                  >
                    <Text style={[s.badgeApplyBtnText, { color: "#FFF" }]}>Post Now</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* ── GET LISTING VERIFIED ── */}
        <View style={s.section}>
          <SectionLabel
            icon="shield-checkmark-outline"
            label="GET LISTING VERIFIED"
            rightEl={
              listingTrustInReview ? (
                <View style={s.submittedPill}>
                  <Ionicons name="time-outline" size={12} color="#D97706" />
                  <Text style={s.submittedPillText}>Under Review</Text>
                </View>
              ) : null
            }
          />
          <View style={[s.promoCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <LinearGradient
              colors={isDark ? [tc.cardElevated, tc.inputBg] : ["#DCFCE7", "#EBF5FF"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.promoCardHeader}
            >
              <View style={s.promoIconWrap}>
                <LinearGradient colors={[Colors.brand.green, "#16A34A"]} style={s.promoIcon}>
                  <Ionicons name="shield-checkmark" size={20} color="#FFF" />
                </LinearGradient>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.promoCardTitle, { color: tc.textPrimary }]}>Verified Green Tag</Text>
                <Text style={[s.promoCardSub, { color: tc.textSecondary }]}>Build trust with renters — verified listings get 3× more enquiries</Text>
              </View>
            </LinearGradient>
            <View style={s.promoBenefitsRow}>
              {["Green ✓ badge on card", "Priority in search", "Trust seal on profile"].map((b) => (
                <View key={b} style={s.promoBenefit}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.brand.green} />
                  <Text style={[s.promoBenefitText, { color: tc.textSecondary }]}>{b}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [s.promoActionBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {
                if (isLandlordPending || isAgencyPending) {
                  router.push("/verification-status" as any);
                  return;
                }
                router.push({ pathname: "/apply-badge" as any, params: { badgeType: "landlord" } });
              }}
            >
              <LinearGradient colors={[Colors.brand.green, "#16A34A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.promoActionGrad}>
                <Ionicons name="shield-checkmark" size={15} color="#FFF" />
                <Text style={s.promoActionText}>
                  {isLandlordPending || isAgencyPending ? "View badge status" : "Apply for Verification"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* ── FEATURE MY LISTING ── */}
        {false && <View style={s.section}>
          <SectionLabel
            icon="star-outline"
            label="FEATURE MY LISTING"
            rightEl={
              featureSubmitted ? (
                <View style={[s.submittedPill, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                  <Ionicons name="time-outline" size={12} color="#D97706" />
                  <Text style={[s.submittedPillText, { color: "#D97706" }]}>Active</Text>
                </View>
              ) : null
            }
          />
          <View style={[s.promoCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <LinearGradient
              colors={isDark ? [tc.cardElevated, tc.inputBg] : ["#FFF7ED", "#FFFBEB"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.promoCardHeader}
            >
              <View style={s.promoIconWrap}>
                <LinearGradient colors={[Colors.brand.orange, "#E56800"]} style={s.promoIcon}>
                  <Ionicons name="star" size={20} color="#FFF" />
                </LinearGradient>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.promoCardTitle, { color: tc.textPrimary }]}>Promoted Listing</Text>
                <Text style={[s.promoCardSub, { color: tc.textSecondary }]}>Get top placement in search results and featured sections</Text>
              </View>
            </LinearGradient>
            <View style={s.promoBenefitsRow}>
              {["Gold ⭐ Featured badge", "Top search placement", "Homepage exposure"].map((b) => (
                <View key={b} style={s.promoBenefit}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.brand.orange} />
                  <Text style={[s.promoBenefitText, { color: tc.textSecondary }]}>{b}</Text>
                </View>
              ))}
            </View>
            {/* Plan cards */}
            <View style={s.planRow}>
              {FEATURED_PLANS.map((plan) => (
                <Pressable
                  key={plan.id}
                  style={[s.planCard, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }, featurePlan === plan.id && s.planCardActive, plan.highlight && s.planCardHighlight]}
                  onPress={() => setFeaturePlan(plan.id)}
                >
                  {plan.highlight && (
                    <View style={s.planPopularBadge}>
                      <Text style={s.planPopularText}>Popular</Text>
                    </View>
                  )}
                  <Text style={[s.planLabel, { color: tc.textSecondary }, featurePlan === plan.id && s.planLabelActive]}>{plan.label}</Text>
                  <Text style={[s.planPrice, { color: tc.textPrimary }, featurePlan === plan.id && s.planPriceActive]}>{plan.price}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [s.promoActionBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {
                setFeatureSubmitted(false);
                setFeatureListingTitle("");
                setFeaturePlacement(FEATURED_PLACEMENTS[0]);
                setFeatureNote("");
                setFeatureModalVisible(true);
              }}
            >
              <LinearGradient colors={[Colors.brand.orange, "#E56800"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.promoActionGrad}>
                <Ionicons name="star" size={15} color="#FFF" />
                <Text style={s.promoActionText}>{featureSubmitted ? "Manage Promotion" : "Promote My Listing"}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>}

        {/* ── FEATURE LISTING MODAL ── */}
        <Modal
          visible={featureModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setFeatureModalVisible(false)}
        >
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <SafeAreaView style={[s.rmModalSafe, { backgroundColor: tc.sheetBg }]} edges={["top", "bottom"]}>
              <View style={[s.rmModalHeader, { borderBottomColor: tc.borderLight }]}>
                <Pressable onPress={() => setFeatureModalVisible(false)} hitSlop={12}>
                  <Ionicons name="close" size={24} color={tc.textPrimary} />
                </Pressable>
                <Text style={[s.rmModalTitle, { color: tc.textPrimary }]}>Promote My Listing</Text>
                <Pressable onPress={handleFeatureSubmit} hitSlop={12} style={[s.rmModalSaveBtn, { backgroundColor: Colors.brand.orange }]}>
                  <Text style={s.rmModalSaveBtnText}>Submit</Text>
                </Pressable>
              </View>
              <ScrollView style={[s.rmModalScroll, { backgroundColor: tc.sheetBg }]} contentContainerStyle={s.rmModalScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Info note */}
                <View style={[s.rmInfoNote, { backgroundColor: isDark ? "#1A0D00" : "#FFF7ED", borderColor: isDark ? tc.borderLight : "#FDE68A", marginBottom: rs(16) }]}>
                  <Ionicons name="star-outline" size={14} color={Colors.brand.orange} />
                  <Text style={[s.rmInfoNoteText, { color: isDark ? "#FCD34D" : "#92400E" }]}>
                    Featured listings display a gold ⭐ badge and appear at the top of search results. Payment is processed after approval.
                  </Text>
                </View>

                {/* Listing Title */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: "#FFF7ED" }]}>
                      <Ionicons name="home-outline" size={16} color={Colors.brand.orange} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Listing Title</Text>
                  </View>
                  <TextInput
                    style={[s.rmFullInput, { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]}
                    value={featureListingTitle}
                    onChangeText={setFeatureListingTitle}
                    placeholder="e.g. Modern 2BR in Downtown"
                    placeholderTextColor={tc.textTertiary}
                  />
                </View>

                {/* Duration Plan */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: "#FFF7ED" }]}>
                      <Ionicons name="calendar-outline" size={16} color={Colors.brand.orange} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Promotion Duration</Text>
                  </View>
                  <View style={s.planRow}>
                    {FEATURED_PLANS.map((plan) => (
                      <Pressable
                        key={plan.id}
                        style={[s.planCard, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }, featurePlan === plan.id && s.planCardActive]}
                        onPress={() => setFeaturePlan(plan.id)}
                      >
                        <Text style={[s.planLabel, { color: tc.textSecondary }, featurePlan === plan.id && s.planLabelActive]}>{plan.label}</Text>
                        <Text style={[s.planPrice, { color: tc.textPrimary }, featurePlan === plan.id && s.planPriceActive]}>{plan.price}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Placement */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: "#FFF7ED" }]}>
                      <Ionicons name="trophy-outline" size={16} color={Colors.brand.orange} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Placement Preference</Text>
                  </View>
                  <View style={s.rmOptionRow}>
                    {FEATURED_PLACEMENTS.map((p) => (
                      <Pressable
                        key={p}
                        style={[s.rmOptionChip, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, featurePlacement === p && { ...s.rmOptionChipActive, backgroundColor: Colors.brand.orange, borderColor: Colors.brand.orange }]}
                        onPress={() => setFeaturePlacement(p)}
                      >
                        <Text style={[s.rmOptionChipText, { color: tc.textSecondary }, featurePlacement === p && s.rmOptionChipTextActive]}>{p}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Additional Note */}
                <View style={s.rmFormSection}>
                  <View style={s.rmFormLabelRow}>
                    <View style={[s.rmFormLabelIcon, { backgroundColor: "#FFF7ED" }]}>
                      <Ionicons name="create-outline" size={16} color={Colors.brand.orange} />
                    </View>
                    <Text style={[s.rmFormLabel, { color: tc.textPrimary }]}>Note to Team (Optional)</Text>
                  </View>
                  <TextInput
                    style={[s.rmFullInput, { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary, height: rs(80), textAlignVertical: "top", paddingTop: rs(10) }]}
                    value={featureNote}
                    onChangeText={setFeatureNote}
                    placeholder="Any special instructions..."
                    placeholderTextColor={tc.textTertiary}
                    multiline
                  />
                </View>

                <View style={{ height: rs(40) }} />
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── ACCOUNT & SETTINGS — 3-column card grid ── */}
        <View style={s.section}>
          <SectionLabel icon="person-circle-outline" label="ACCOUNT & SETTINGS" />
          <View style={s.accountGrid}>
            {accountRows.map((row, ri) => (
              <View key={ri} style={s.accountGridRow}>
                {row.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.82}
                    style={[s.accountGridCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={s.accountCardIconWrap}>
                      <View style={[s.accountCardIcon, { backgroundColor: item.colors[0] }]}>
                        <Ionicons name={item.icon} size={18} color="#FFF" />
                      </View>
                      {(() => {
                        const badgeVal = item.id === "myposts"
                          ? (mergedPosts > 0 ? mergedPosts : item.badge)
                          : item.id === "messages"
                          ? undefined
                          : item.badge;
                        return badgeVal !== undefined && badgeVal > 0 ? (
                          <View style={s.accountCardBadge}>
                            <Text style={s.accountCardBadgeText}>{badgeVal}</Text>
                          </View>
                        ) : null;
                      })()}
                    </View>
                    <Text style={[s.accountCardLabel, { color: tc.textPrimary }]} numberOfLines={1}>{item.label}</Text>
                    <Text style={[s.accountCardSub, { color: tc.textTertiary }]} numberOfLines={1}>{item.sublabel}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* ── BLOCKED USERS ── */}
        {blockedUsers.length > 0 && (
          <View style={s.section}>
            <SectionLabel icon="ban-outline" label="BLOCKED USERS" />
            <View style={[s.prefCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              {blockedUsers.map((bu, idx) => (
                <View key={bu.id}>
                  {idx > 0 && <View style={[s.locDivider, { backgroundColor: tc.borderLight }]} />}
                  <View style={[s.locRow, { paddingVertical: rs(10) }]}>
                    <View style={[s.locIcon, { backgroundColor: "#FEE2E2" }]}>
                      <Ionicons name="person" size={16} color="#DC2626" />
                    </View>
                    <View style={[s.locText, { flex: 1 }]}>
                      <Text style={[s.locValue, { color: tc.textPrimary }]}>{bu.name}</Text>
                      <Text style={[s.locFieldLabel, { color: tc.textTertiary, marginTop: rs(2) }]}>
                        Blocked {new Date(bu.blockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => appAlert("Unblock User", `Unblock ${bu.name}?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Unblock", onPress: async () => {
                          await unblockUser(bu.id);
                          try { await unblockUserApi(bu.id); } catch { /* best-effort */ }
                        }},
                      ])}
                      style={[s.badgeApplyBtn, { backgroundColor: "#FEE2E2" }]}
                    >
                      <Text style={[s.badgeApplyBtnText, { color: "#DC2626" }]}>Unblock</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── SIGN OUT ── */}
        <View style={s.signOutSection}>
          <Pressable
            style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLogout}
          >
            <View style={[s.signOutGrad, { backgroundColor: "#EF4444" }]}>
              <Ionicons name="log-out-outline" size={20} color="#FFF" />
              <Text style={s.signOutText}>Sign Out</Text>
            </View>
          </Pressable>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <View style={[s.footerRule, { backgroundColor: tc.borderMedium }]} />
          <Text style={[s.footerBrand, { color: tc.textSecondary }]}>ComLinkr</Text>
          <Text style={[s.footerMeta, { color: tc.textTertiary }]}>v1.0.0 · Build 2026</Text>
          <Text style={[s.footerHeart, { color: tc.textTertiary }]}>Built for your community</Text>
          <Text style={[s.footerHeart, { color: tc.textTertiary, marginTop: rs(2) }]}>© 2026 ComLinkr Ltd. All rights reserved.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: rs(48) },

  // Submitted/status pill
  submittedPill: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0", paddingHorizontal: rs(9), paddingVertical: rs(4), borderRadius: rs(999) },
  submittedPillText: { fontSize: rs(10), fontWeight: "800", color: "#16A34A" },

  // Promo cards (Verify + Feature sections)
  promoCard: { backgroundColor: "#FFF", borderRadius: rs(18), borderWidth: 1, borderColor: "#E5EBF4", overflow: "hidden", shadowColor: "#0A2540", shadowOpacity: 0.07, shadowRadius: rs(12), shadowOffset: { width: 0, height: rs(4) }, elevation: 4 },
  promoCardHeader: { flexDirection: "row", alignItems: "center", gap: rs(12), padding: rs(14) },
  promoIconWrap: {},
  promoIcon: { width: rs(46), height: rs(46), borderRadius: rs(14), alignItems: "center", justifyContent: "center" },
  promoCardTitle: { fontSize: rs(15), fontWeight: "800", color: "#0A2540", letterSpacing: -0.2 },
  promoCardSub: { fontSize: rs(12), color: Colors.text.secondary, marginTop: rs(2), lineHeight: rs(17) },
  promoBenefitsRow: { paddingHorizontal: rs(14), paddingBottom: rs(12), gap: rs(6) },
  promoBenefit: { flexDirection: "row", alignItems: "center", gap: rs(7) },
  promoBenefitText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.green },
  promoActionBtn: { marginHorizontal: rs(14), marginBottom: rs(14), borderRadius: rs(14), overflow: "hidden" },
  promoActionGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(7), paddingVertical: rs(13) },
  promoActionText: { fontSize: rs(14), fontWeight: "800", color: "#FFF" },

  // Plan cards for featured listing
  planRow: { flexDirection: "row", gap: rs(8), paddingHorizontal: rs(14), paddingBottom: rs(14) },
  planCard: { flex: 1, alignItems: "center", paddingVertical: rs(12), borderRadius: rs(14), borderWidth: 1.5, borderColor: "#E5EBF4", backgroundColor: "#F8FAFF" },
  planCardActive: { borderColor: Colors.brand.orange, backgroundColor: "#FFF7ED" },
  planCardHighlight: { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  planPopularBadge: { position: "absolute", top: rs(-8), backgroundColor: Colors.brand.orange, borderRadius: rs(6), paddingHorizontal: rs(6), paddingVertical: rs(2) },
  planPopularText: { fontSize: rs(8), fontWeight: "900", color: "#FFF", letterSpacing: 0.3 },
  planLabel: { fontSize: rs(12), fontWeight: "700", color: Colors.text.secondary },
  planLabelActive: { color: Colors.brand.orange },
  planPrice: { fontSize: rs(15), fontWeight: "900", color: Colors.text.primary, marginTop: rs(3) },
  planPriceActive: { color: Colors.brand.orange },

  // Section
  section: { marginTop: rs(22), paddingHorizontal: rs(16) },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: rs(10) },
  sectionLabelLeft: { flexDirection: "row", alignItems: "center", gap: rs(7) },
  sectionLabelText: { fontSize: rs(11), fontWeight: "900", color: Colors.text.tertiary, letterSpacing: 1.4, textTransform: "uppercase" },
  sectionCountPill: { backgroundColor: Colors.brand.blueLight, borderWidth: 1, borderColor: "#D6E8FF", paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(999) },
  sectionCountText: { fontSize: rs(11), fontWeight: "800", color: Colors.brand.blue },
  sectionLinkText:  { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },

  // Badge rows
  badgeRow: { flexDirection: "row", alignItems: "center", gap: rs(10), paddingVertical: rs(10), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F3F4F6" },
  badgeRowIcon: { width: rs(36), height: rs(36), borderRadius: rs(11), alignItems: "center", justifyContent: "center" },
  badgeRowLabel: { flex: 1, fontSize: rs(13), fontWeight: "700", color: "#0A2540" },
  badgeStatusPill: { flexDirection: "row", alignItems: "center", gap: rs(4), paddingHorizontal: rs(8), paddingVertical: rs(4), borderRadius: rs(8) },
  badgeStatusText: { fontSize: rs(10), fontWeight: "700" },
  badgeApplyBtn: { backgroundColor: Colors.brand.blue, borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(5) },
  badgeApplyBtnText: { fontSize: rs(11), fontWeight: "800", color: "#FFF" },

  // Change button
  changeBtn: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: Colors.brand.blueLight, borderWidth: 1, borderColor: "#D6E8FF", paddingHorizontal: rs(12), paddingVertical: rs(5), borderRadius: rs(999) },
  changeBtnText: { fontSize: rs(11), fontWeight: "800", color: Colors.brand.blue },

  // Hero
  heroWrap: { position: "relative" },
  heroCover: { height: rs(180), overflow: "hidden", paddingTop: rs(50) },
  decor1: { position: "absolute", top: rs(-50), right: rs(-50), width: rs(180), height: rs(180), borderRadius: rs(90), backgroundColor: "rgba(0,118,235,0.10)" },
  decor2: { position: "absolute", bottom: rs(-40), left: rs(-30), width: rs(140), height: rs(140), borderRadius: rs(70), backgroundColor: "rgba(38,179,36,0.09)" },
  decor3: { position: "absolute", top: rs(20), left: "42%", width: rs(80), height: rs(80), borderRadius: rs(40), backgroundColor: "rgba(255,123,0,0.07)" },
  heroTopBar: { position: "absolute", top: rs(48), left: rs(12), right: rs(16), flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 100, elevation: 100 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: rs(10) },
  heroBackBtn: {},
  heroBackCircle: { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: "rgba(0,118,235,0.15)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: rs(8), shadowOffset: { width: 0, height: rs(2) }, elevation: 8 },
  heroIconBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(0,118,235,0.18)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: rs(4), shadowOffset: { width: 0, height: rs(2) }, elevation: 3 },
  heroEditBtn: { flexDirection: "row", alignItems: "center", gap: rs(6), backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(0,118,235,0.18)", paddingHorizontal: rs(14), height: rs(36), borderRadius: rs(999), shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: rs(4), shadowOffset: { width: 0, height: rs(2) }, elevation: 3 },
  heroEditText: { fontSize: rs(12), fontWeight: "900", color: Colors.brand.blue },

  // Avatar
  avatarWrap: { position: "absolute", bottom: rs(-50), left: rs(16), zIndex: 2 },
  avatarGrad: { width: rs(100), height: rs(100), borderRadius: rs(50), alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#FFFFFF", shadowColor: Colors.brand.blue, shadowOpacity: 0.28, shadowRadius: rs(18), shadowOffset: { width: 0, height: rs(6) }, elevation: 12 },
  avatarImage: { width: rs(100), height: rs(100), borderRadius: rs(50), borderWidth: 4, borderColor: "#FFFFFF" },
  errorBanner: { marginHorizontal: rs(16), marginTop: rs(8), padding: rs(12), borderRadius: rs(12), borderWidth: 1 },
  errorBannerText: { fontSize: rs(13), fontWeight: "600", textAlign: "center" },
  avatarText: { fontSize: rs(34), fontWeight: "900", color: "#FFF" },
  onlineDot: { position: "absolute", bottom: rs(6), right: rs(4), width: rs(16), height: rs(16), borderRadius: rs(8), backgroundColor: "#22C55E", borderWidth: 3, borderColor: "#FFFFFF" },

  // Info card
  infoCard: { backgroundColor: "#FFF", paddingHorizontal: rs(16), paddingBottom: rs(16), borderBottomWidth: 1, borderBottomColor: "#F0F4FA", alignItems: "flex-start" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: rs(8), flexWrap: "wrap", marginBottom: rs(4) },
  userName: { fontSize: rs(22), fontWeight: "900", color: Colors.text.primary, letterSpacing: -0.5 },
  proBadge: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: Colors.brand.orange, paddingHorizontal: rs(8), paddingVertical: rs(4), borderRadius: rs(999) },
  proBadgeText: { fontSize: rs(9), fontWeight: "900", color: "#FFF", letterSpacing: 0.6 },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0", paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(999) },
  verifiedText: { fontSize: rs(10), fontWeight: "900", color: Colors.brand.green },
  userHandle: { fontSize: rs(14), fontWeight: "700", color: Colors.text.secondary, marginBottom: rs(10) },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(8), marginBottom: rs(12) },
  metaPill: { flexDirection: "row", alignItems: "center", gap: rs(6), backgroundColor: "#F5F8FF", borderWidth: 1, borderColor: "#E5EEF9", paddingHorizontal: rs(12), paddingVertical: rs(7), borderRadius: rs(999) },
  metaPillText: { fontSize: rs(11), fontWeight: "800", color: Colors.text.secondary },
  bio: { fontSize: rs(13), color: Colors.text.secondary, lineHeight: rs(20), fontWeight: "600" },

  // Stats — single row, compact
  statsGrid: { paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(6), backgroundColor: "#FFF" },
  statsRow: { flexDirection: "row", gap: rs(10) },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: rs(14),
    paddingVertical: rs(14),
    paddingHorizontal: rs(4),
    borderWidth: 1,
    borderColor: "#E7EFFA",
    shadowColor: "#0A2540",
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
  achieveChip: { alignItems: "center", backgroundColor: "#FFF", borderRadius: rs(14), paddingHorizontal: rs(16), paddingVertical: rs(14), borderWidth: 1, borderColor: "#E7EFFA", shadowColor: "#0A2540", shadowOpacity: 0.04, shadowRadius: rs(6), shadowOffset: { width: 0, height: rs(3) }, elevation: 2, gap: rs(6), minWidth: 90, position: "relative" },
  achieveChipLocked: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
  achieveEmoji: { fontSize: rs(22) },
  achieveLabel: { fontSize: rs(10), fontWeight: "900", color: Colors.text.secondary, textAlign: "center" },
  achieveLabelLocked: { color: Colors.text.tertiary },
  lockBadge: { position: "absolute", top: rs(7), right: rs(7), width: rs(16), height: rs(16), borderRadius: rs(8), backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },

  // Location pref card
  prefCard: { backgroundColor: "#FFF", borderRadius: rs(16), borderWidth: 1, borderColor: "#E7EFFA", overflow: "hidden", shadowColor: "#0A2540", shadowOpacity: 0.04, shadowRadius: rs(8), shadowOffset: { width: 0, height: rs(3) }, elevation: 2 },
  locRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: rs(16), paddingVertical: rs(14), gap: rs(14) },
  locDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#EDF2F8", marginHorizontal: rs(16) },
  locIcon: { width: rs(38), height: rs(38), borderRadius: rs(13), alignItems: "center", justifyContent: "center" },
  locText: { flex: 1 },
  locFieldLabel: { fontSize: rs(10), fontWeight: "800", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: rs(2) },
  locValue: { fontSize: rs(15), fontWeight: "900", color: Colors.text.primary },
  locValueEmpty: { fontSize: rs(14), fontWeight: "700", color: Colors.text.tertiary, fontStyle: "italic" },

  // Tags
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: rs(8) },
  tagOrange: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: Colors.brand.orangeLight, borderWidth: 1, borderColor: "#FECBA1", borderRadius: rs(999), paddingHorizontal: rs(12), paddingVertical: rs(6) },
  tagGreen:  { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: Colors.brand.greenLight,  borderWidth: 1, borderColor: "#A7F3A0", borderRadius: rs(999), paddingHorizontal: rs(12), paddingVertical: rs(6) },
  tagBlue:   { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: Colors.brand.blueLight,   borderWidth: 1, borderColor: "#B3D9FF", borderRadius: rs(999), paddingHorizontal: rs(12), paddingVertical: rs(6) },
  tagText: { fontSize: rs(12), fontWeight: "700", color: Colors.text.secondary },

  // Empty pref state
  emptyPrefCard: { flexDirection: "row", alignItems: "center", gap: rs(14), backgroundColor: "#F8FAFC", borderRadius: rs(16), borderWidth: 1, borderColor: "#E7EFFA", paddingHorizontal: rs(16), paddingVertical: rs(16), shadowColor: "#0A2540", shadowOpacity: 0.03, shadowRadius: rs(6), shadowOffset: { width: 0, height: rs(2) }, elevation: 1 },
  emptyPrefIconWrap: { width: rs(40), height: rs(40), borderRadius: rs(12), backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emptyPrefTitle: { fontSize: rs(14), fontWeight: "800", color: Colors.text.primary, marginBottom: rs(3) },
  emptyPrefSub: { fontSize: rs(12), color: Colors.text.tertiary, fontWeight: "600", lineHeight: rs(17) },

  // Account & Settings — 3-column compact grid
  accountGrid: { gap: rs(10) },
  accountGridRow: { flexDirection: "row", gap: rs(10) },
  accountGridCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: rs(14),
    paddingVertical: rs(14),
    paddingHorizontal: rs(6),
    borderWidth: 1,
    borderColor: "#E7EFFA",
    shadowColor: "#0A2540",
    shadowOpacity: 0.04,
    shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(3) },
    elevation: 2,
    gap: rs(5),
  },
  accountCardIconWrap: { position: "relative", marginBottom: rs(1) },
  accountCardIcon: { width: rs(38), height: rs(38), borderRadius: rs(13), alignItems: "center", justifyContent: "center" },
  accountCardBadge: { position: "absolute", top: rs(-4), right: rs(-4), minWidth: 16, height: rs(16), borderRadius: rs(8), backgroundColor: Colors.brand.orange, alignItems: "center", justifyContent: "center", paddingHorizontal: rs(3), borderWidth: 2, borderColor: "#FFF" },
  accountCardBadgeText: { fontSize: rs(8), fontWeight: "900", color: "#FFF" },
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
    backgroundColor: "#FFF",
    borderRadius: rs(14),
    paddingVertical: rs(14),
    paddingHorizontal: rs(8),
    borderWidth: 1,
    borderColor: "#E7EFFA",
    shadowColor: "#0A2540",
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
    borderColor: "#D6E8FF",
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
  rmModalSafe: { flex: 1, backgroundColor: "#FFFFFF" },
  rmModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(14),
    borderBottomWidth: 1,
    borderBottomColor: "#E7EFFA",
  },
  rmModalTitle: { fontSize: rs(17), fontWeight: "900", color: Colors.text.primary, letterSpacing: -0.3 },
  rmModalSaveBtn: { paddingHorizontal: rs(18), paddingVertical: rs(8), borderRadius: rs(999) },
  rmModalSaveBtnText: { fontSize: rs(13), fontWeight: "900", color: "#FFF" },
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
    backgroundColor: "#F5F8FF",
    borderWidth: 1.5,
    borderColor: "#E7EFFA",
    borderRadius: rs(14),
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
  },
  rmInputPrefix: { fontSize: rs(15), fontWeight: "800", color: Colors.text.secondary, marginRight: rs(2) },
  rmInput: { flex: 1, fontSize: rs(15), fontWeight: "800", color: Colors.text.primary, padding: 0 },
  rmBudgetDash: { fontSize: rs(16), fontWeight: "700", color: Colors.text.tertiary },
  rmBudgetSuffix: { fontSize: rs(12), fontWeight: "700", color: Colors.text.tertiary },
  rmFullInput: {
    backgroundColor: "#F5F8FF",
    borderWidth: 1.5,
    borderColor: "#E7EFFA",
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
    backgroundColor: "#F5F8FF",
    borderWidth: 1.5,
    borderColor: "#E7EFFA",
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
    borderBottomColor: "#F0F4FA",
  },
  rmToggleLeft: { flexDirection: "row", alignItems: "center", gap: rs(12) },
  rmToggleLabel: { fontSize: rs(14), fontWeight: "700", color: Colors.text.primary },
  rmToggleTrack: {
    width: rs(48),
    height: rs(28),
    borderRadius: rs(14),
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    padding: rs(2),
  },
  rmToggleTrackActive: { backgroundColor: Colors.brand.blue },
  rmToggleThumb: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    backgroundColor: "#FFF",
    shadowColor: "#000",
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
  signOutText: { fontSize: rs(16), fontWeight: "900", color: "#FFF", letterSpacing: 0.3 },

  // Footer
  footer: { alignItems: "center", paddingTop: rs(28), paddingBottom: rs(12), gap: rs(4) },
  footerRule: { width: rs(48), height: rs(3), borderRadius: rs(2), backgroundColor: "#E5E7EB", marginBottom: rs(12) },
  footerBrand: { fontSize: rs(13), fontWeight: "900", color: Colors.text.secondary, letterSpacing: 0.5 },
  footerMeta: { fontSize: rs(11), color: Colors.text.tertiary, fontWeight: "700" },
  footerHeart: { fontSize: rs(11), color: Colors.text.tertiary, fontWeight: "700" },
});
