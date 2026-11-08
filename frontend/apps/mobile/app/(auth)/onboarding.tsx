import { Switch } from "../../src/shared/ui/Switch";
import { useState, useRef, useEffect } from "react";
import { Linking } from "react-native";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSize } from "../../src/theme/colors";
import { useTheme } from "../../src/theme/useTheme";
import { useAuthStore } from "../../src/store/auth.store";
import { useAuthStore as useApiAuthStore } from "../../src/store/auth/authStore";
import { profileFromBackendAuthUser } from "../../src/services/http/authService";
import { submitOnboardingToApi } from "../../src/services/http/onboardingService";
import { HttpApiError } from "../../src/services/http/apiClient";
import { COUNTRIES, STATES_BY_COUNTRY, CITIES_BY_STATE } from "../../src/data/locationData";
import { rs, screenWidth } from "../../src/utils/responsive";
import { appAlert } from '../../src/shared/ui/Dialogs';
import { createThemedStyles } from '../../src/theme/themedStyles';
import Reanimated, { FadeInRight, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { TYPE } from '../../src/theme/d';
import { GradientFill, PopPressable } from '../../src/shared/d';
import { SPRING } from '../../src/shared/motion/presets';

/** The onboarding progress: a gradient bar that springs to the step (design D). */
/** Five dots; the current one stretches to a gradient pill on a spring (`.dots i.on`). */
function OnbDot({ on }: { on: boolean }) {
  const { tc } = useTheme();
  const w = useSharedValue(on ? 20 : 7);
  useEffect(() => { w.set(withSpring(on ? 20 : 7, SPRING.liquid)); }, [on, w]);
  const a = useAnimatedStyle(() => ({ width: w.get() }));
  return (
    <Reanimated.View style={[{ height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: on ? 'transparent' : tc.surface3 }, a]}>
      {on ? <GradientFill style={StyleSheet.absoluteFill} /> : null}
    </Reanimated.View>
  );
}
function OnbDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: step + 1 }}>
      {Array.from({ length: total }).map((_, i) => <OnbDot key={i} on={i === step} />)}
    </View>
  );
}
function OnbProgress({ step, total }: { step: number; total: number }) {
  const { tc } = useTheme();
  const p = useSharedValue((step + 1) / total);
  useEffect(() => { p.set(withSpring((step + 1) / total, SPRING.settle)); }, [step, total, p]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.min(1, p.get()) * 100}%` }));
  return (
    <View style={{ flex: 1, height: 6, borderRadius: 3, marginHorizontal: 12, backgroundColor: tc.surface3, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: step + 1 }}>
      <Reanimated.View style={[{ height: '100%', borderRadius: 3, overflow: 'hidden' }, fill]}><GradientFill style={StyleSheet.absoluteFill} /></Reanimated.View>
    </View>
  );
}


/** Sprint 21: enrollment limited to US + UK at onboarding. */
const ONBOARDING_COUNTRIES = COUNTRIES.filter((c) => c === "United States" || c === "United Kingdom");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

// ─── Preference Data ────────────────────────────────────
const CULTURE_OPTIONS = [
  { id: "coffee",    label: "Coffee Culture",    icon: "cafe-outline",           desc: "Cafés & morning rituals" },
  { id: "art",       label: "Art & Museums",      icon: "color-palette-outline",  desc: "Galleries & creative spaces" },
  { id: "fitness",   label: "Fitness & Health",   icon: "barbell-outline",        desc: "Gyms, yoga & active life" },
  { id: "nightlife", label: "Nightlife",           icon: "moon-outline",           desc: "Bars, clubs & evening out" },
  { id: "family",    label: "Family Life",         icon: "people-outline",         desc: "Parks & kid-friendly spots" },
  { id: "wellness",  label: "Wellness",            icon: "leaf-outline",           desc: "Mindfulness & self-care" },
  { id: "foodie",    label: "Foodie",              icon: "restaurant-outline",     desc: "Restaurants & culinary adventures" },
  { id: "outdoor",   label: "Outdoor",             icon: "trail-sign-outline",     desc: "Hiking, parks & nature" },
  { id: "tech",      label: "Tech & Innovation",   icon: "hardware-chip-outline",  desc: "Meetups & startups" },
  { id: "music",     label: "Music & Events",      icon: "musical-notes-outline",  desc: "Concerts & local artists" },
  { id: "sports",    label: "Sports & Games",      icon: "football-outline",       desc: "Teams & watch parties" },
  { id: "volunteer", label: "Volunteering",        icon: "hand-left-outline",      desc: "Community service" },
];

const INTEREST_OPTIONS = [
  { id: "housing",   label: "Housing & Real Estate", icon: "home-outline",        desc: "Find rentals, homes & roommates" },
  { id: "food",      label: "Food & Dining",          icon: "restaurant-outline",  desc: "Discover local restaurants & eateries" },
  { id: "community", label: "Community & Social",     icon: "people-outline",      desc: "Connect with locals & neighbors" },
  { id: "events",    label: "Events & Entertainment", icon: "calendar-outline",    desc: "Never miss what's happening nearby" },
  { id: "jobs",      label: "Jobs & Careers",         icon: "briefcase-outline",   desc: "Local opportunities & networking" },
  { id: "health",    label: "Health & Wellness",      icon: "medkit-outline",      desc: "Doctors, clinics & wellness services" },
  { id: "education", label: "Education & Learning",   icon: "book-outline",        desc: "Schools, tutors & local courses" },
  { id: "shopping",  label: "Shopping & Services",    icon: "bag-outline",         desc: "Local shops, deals & recommendations" },
];

// ─── Communities Data ────────────────────────────────────
const COMMUNITY_OPTIONS = [
  // Cultural / Heritage — keep flag emojis for cultural identity
  { id: "south-asian",     label: "South Asian",              emoji: "🇮🇳", category: "Cultural & Heritage" },
  { id: "east-asian",      label: "East Asian",               emoji: "🇨🇳", category: "Cultural & Heritage" },
  { id: "southeast-asian", label: "Southeast Asian",          emoji: "🇵🇭", category: "Cultural & Heritage" },
  { id: "latin-american",  label: "Latin American",           emoji: "🇧🇷", category: "Cultural & Heritage" },
  { id: "african",         label: "African & Afro-Diaspora",  emoji: "🇳🇬", category: "Cultural & Heritage" },
  { id: "caribbean",       label: "Caribbean",                emoji: "🇯🇲", category: "Cultural & Heritage" },
  { id: "middle-eastern",  label: "Middle Eastern",           emoji: "🇦🇪", category: "Cultural & Heritage" },
  { id: "european",        label: "European",                 emoji: "🇪🇺", category: "Cultural & Heritage" },
  { id: "pacific-islander",label: "Pacific Islander",         emoji: "🇦🇺", category: "Cultural & Heritage" },
  { id: "indigenous",      label: "Indigenous & First Nations",icon: "earth-outline",      category: "Cultural & Heritage" },
  { id: "south-american",  label: "South American",           emoji: "🇦🇷", category: "Cultural & Heritage" },
  { id: "central-asian",   label: "Central Asian",            emoji: "🇰🇿", category: "Cultural & Heritage" },
  // Lifestyle
  { id: "expat",             label: "Expat",                   icon: "airplane-outline",       category: "Lifestyle" },
  { id: "digital-nomad",     label: "Digital Nomad",           icon: "laptop-outline",         category: "Lifestyle" },
  { id: "student",           label: "Student",                 icon: "school-outline",         category: "Lifestyle" },
  { id: "young-professional",label: "Young Professional",      icon: "briefcase-outline",      category: "Lifestyle" },
  { id: "new-in-town",       label: "New in Town",             icon: "map-outline",            category: "Lifestyle" },
  { id: "retiree",           label: "Retiree & Seniors",       icon: "sunny-outline",          category: "Lifestyle" },
  { id: "parent",            label: "Parents & Families",      icon: "people-outline",         category: "Lifestyle" },
  { id: "pet-owner",         label: "Pet Owners",              icon: "paw-outline",            category: "Lifestyle" },
  // Professional
  { id: "tech-startup",   label: "Tech & Startups",         icon: "rocket-outline",         category: "Professional" },
  { id: "creative-pro",   label: "Creatives & Artists",     icon: "color-palette-outline",  category: "Professional" },
  { id: "healthcare-pro", label: "Healthcare Workers",      icon: "medkit-outline",         category: "Professional" },
  { id: "educator-pro",   label: "Educators & Teachers",    icon: "book-outline",           category: "Professional" },
  { id: "entrepreneur",   label: "Entrepreneurs",           icon: "bulb-outline",           category: "Professional" },
  { id: "finance-biz",    label: "Finance & Business",      icon: "bar-chart-outline",      category: "Professional" },
  { id: "legal-gov",      label: "Legal & Government",      icon: "scale-outline",          category: "Professional" },
  // Social & Cause
  { id: "lgbtq",          label: "LGBTQ+",                  icon: "heart-circle-outline",   category: "Social & Cause" },
  { id: "womens-network", label: "Women's Network",         icon: "female-outline",         category: "Social & Cause" },
  { id: "veterans",       label: "Veterans",                icon: "shield-outline",         category: "Social & Cause" },
  { id: "eco-conscious",  label: "Eco-Conscious",           icon: "leaf-outline",           category: "Social & Cause" },
  { id: "volunteer-net",  label: "Volunteer Network",       icon: "hand-left-outline",      category: "Social & Cause" },
  { id: "disability",     label: "Disability Community",    icon: "accessibility-outline",  category: "Social & Cause" },
  { id: "mental-health",  label: "Mental Health Advocates", icon: "fitness-outline",        category: "Social & Cause" },
  // Faith & Spiritual
  { id: "christian",      label: "Christian",               icon: "add-outline",            category: "Faith & Spiritual" },
  { id: "muslim",         label: "Muslim",                  icon: "moon-outline",           category: "Faith & Spiritual" },
  { id: "jewish",         label: "Jewish",                  icon: "star-outline",           category: "Faith & Spiritual" },
  { id: "hindu",          label: "Hindu",                   icon: "infinite-outline",       category: "Faith & Spiritual" },
  { id: "buddhist",       label: "Buddhist",                icon: "flower-outline",         category: "Faith & Spiritual" },
  { id: "interfaith",     label: "Interfaith & Spiritual",  icon: "sparkles-outline",       category: "Faith & Spiritual" },
  // National & Diaspora — Latin America
  { id: "mexican",        label: "Mexican",                 emoji: "🇲🇽", category: "National & Diaspora" },
  { id: "brazilian",      label: "Brazilian",               emoji: "🇧🇷", category: "National & Diaspora" },
  { id: "colombian",      label: "Colombian",               emoji: "🇨🇴", category: "National & Diaspora" },
  { id: "cuban",          label: "Cuban",                   emoji: "🇨🇺", category: "National & Diaspora" },
  { id: "dominican",      label: "Dominican",               emoji: "🇩🇴", category: "National & Diaspora" },
  { id: "puerto-rican",   label: "Puerto Rican",            emoji: "🇵🇷", category: "National & Diaspora" },
  { id: "venezuelan",     label: "Venezuelan",              emoji: "🇻🇪", category: "National & Diaspora" },
  { id: "peruvian",       label: "Peruvian",                emoji: "🇵🇪", category: "National & Diaspora" },
  // National & Diaspora — South Asia
  { id: "indian",         label: "Indian",                  emoji: "🇮🇳", category: "National & Diaspora" },
  { id: "pakistani",      label: "Pakistani",               emoji: "🇵🇰", category: "National & Diaspora" },
  { id: "bangladeshi",    label: "Bangladeshi",             emoji: "🇧🇩", category: "National & Diaspora" },
  { id: "sri-lankan",     label: "Sri Lankan",              emoji: "🇱🇰", category: "National & Diaspora" },
  { id: "nepali",         label: "Nepali",                  emoji: "🇳🇵", category: "National & Diaspora" },
  // National & Diaspora — East / SE Asia
  { id: "chinese",        label: "Chinese",                 emoji: "🇨🇳", category: "National & Diaspora" },
  { id: "korean",         label: "Korean",                  emoji: "🇰🇷", category: "National & Diaspora" },
  { id: "japanese",       label: "Japanese",                emoji: "🇯🇵", category: "National & Diaspora" },
  { id: "filipino",       label: "Filipino",                emoji: "🇵🇭", category: "National & Diaspora" },
  { id: "vietnamese",     label: "Vietnamese",              emoji: "🇻🇳", category: "National & Diaspora" },
  { id: "thai",           label: "Thai",                    emoji: "🇹🇭", category: "National & Diaspora" },
  { id: "indonesian",     label: "Indonesian",              emoji: "🇮🇩", category: "National & Diaspora" },
  // National & Diaspora — Europe
  { id: "british",        label: "British",                 emoji: "🇬🇧", category: "National & Diaspora" },
  { id: "irish",          label: "Irish",                   emoji: "🇮🇪", category: "National & Diaspora" },
  { id: "spanish",        label: "Spanish",                 emoji: "🇪🇸", category: "National & Diaspora" },
  { id: "french",         label: "French",                  emoji: "🇫🇷", category: "National & Diaspora" },
  { id: "italian",        label: "Italian",                 emoji: "🇮🇹", category: "National & Diaspora" },
  { id: "greek",          label: "Greek",                   emoji: "🇬🇷", category: "National & Diaspora" },
  { id: "portuguese",     label: "Portuguese",              emoji: "🇵🇹", category: "National & Diaspora" },
  { id: "polish",         label: "Polish",                  emoji: "🇵🇱", category: "National & Diaspora" },
  { id: "ukrainian",      label: "Ukrainian",               emoji: "🇺🇦", category: "National & Diaspora" },
  { id: "russian",        label: "Russian",                 emoji: "🇷🇺", category: "National & Diaspora" },
  { id: "german",         label: "German",                  emoji: "🇩🇪", category: "National & Diaspora" },
  { id: "romanian",       label: "Romanian",                emoji: "🇷🇴", category: "National & Diaspora" },
  // National & Diaspora — Africa
  { id: "nigerian",       label: "Nigerian",                emoji: "🇳🇬", category: "National & Diaspora" },
  { id: "ghanaian",       label: "Ghanaian",                emoji: "🇬🇭", category: "National & Diaspora" },
  { id: "kenyan",         label: "Kenyan",                  emoji: "🇰🇪", category: "National & Diaspora" },
  { id: "ethiopian",      label: "Ethiopian",               emoji: "🇪🇹", category: "National & Diaspora" },
  { id: "somali",         label: "Somali",                  emoji: "🇸🇴", category: "National & Diaspora" },
  { id: "zimbabwean",     label: "Zimbabwean",              emoji: "🇿🇼", category: "National & Diaspora" },
  { id: "south-african",  label: "South African",           emoji: "🇿🇦", category: "National & Diaspora" },
  // National & Diaspora — Caribbean
  { id: "jamaican",       label: "Jamaican",                emoji: "🇯🇲", category: "National & Diaspora" },
  { id: "trinidadian",    label: "Trinidadian",             emoji: "🇹🇹", category: "National & Diaspora" },
  { id: "haitian",        label: "Haitian",                 emoji: "🇭🇹", category: "National & Diaspora" },
  // National & Diaspora — Middle East / North Africa
  { id: "egyptian",       label: "Egyptian",                emoji: "🇪🇬", category: "National & Diaspora" },
  { id: "moroccan",       label: "Moroccan",                emoji: "🇲🇦", category: "National & Diaspora" },
  { id: "lebanese",       label: "Lebanese",                emoji: "🇱🇧", category: "National & Diaspora" },
  { id: "iranian",        label: "Iranian / Persian",       emoji: "🇮🇷", category: "National & Diaspora" },
  { id: "turkish",        label: "Turkish",                 emoji: "🇹🇷", category: "National & Diaspora" },
  { id: "afghan",         label: "Afghan",                  emoji: "🇦🇫", category: "National & Diaspora" },
  { id: "syrian",         label: "Syrian",                  emoji: "🇸🇾", category: "National & Diaspora" },
  { id: "arab",           label: "Arab",                    emoji: "🕌", category: "National & Diaspora" },
];

const COMMUNITY_CATEGORIES = ["Cultural & Heritage", "National & Diaspora", "Lifestyle", "Professional", "Social & Cause", "Faith & Spiritual"];

const COMMUNITY_CATEGORY_ICON: Record<string, string> = {
  "Cultural & Heritage": "earth-outline",
  "National & Diaspora": "flag-outline",
  "Lifestyle":           "sunny-outline",
  "Professional":        "briefcase-outline",
  "Social & Cause":      "heart-outline",
  "Faith & Spiritual":   "sparkles-outline",
};

const STEPS = ["Location", "Culture", "Interests", "Community", "Ready"];

// ─── Reusable picker list ───────────────────────────────
function PickerList({
  items,
  selected,
  onSelect,
  placeholder,
  searchValue,
  onSearchChange,
  label,
  showFlags,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
  placeholder: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  label: string;
  showFlags?: boolean;
}) {
  const { tc } = useTheme();

  const getFlag = (item: string) => showFlags ? (COUNTRY_INFO[item]?.flag ?? "") : "";
  const getCode = (item: string) => showFlags ? (COUNTRY_INFO[item]?.code ?? "") : "";

  // When an item is selected, collapse the list — just show the selected badge
  if (selected) {
    return (
      <View style={styles.pickerSection}>
        <Text style={[styles.pickerLabel, { color: tc.textTertiary }]}>{label}</Text>
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.brand.blue} />
          <Text style={styles.selectedBadgeText}>
            {showFlags && getFlag(selected) ? `${getFlag(selected)}  ${selected}  ${getCode(selected)}` : selected}
          </Text>
          <Pressable
            onPress={() => { onSelect(""); onSearchChange(""); Haptics.selectionAsync(); }}
            hitSlop={8}
            style={styles.changePressable}
          >
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const filtered = searchValue.trim()
    ? items.filter((i) => i.toLowerCase().includes(searchValue.toLowerCase()))
    : items;

  return (
    <View style={styles.pickerSection}>
      <Text style={[styles.pickerLabel, { color: tc.textTertiary }]}>{label}</Text>

      <View style={[styles.searchWrap, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
        <Ionicons name="search-outline" size={16} color={tc.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: tc.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={tc.textTertiary}
          value={searchValue}
          onChangeText={onSearchChange}
          autoCapitalize="none"
        />
        {searchValue.length > 0 && (
          <Pressable onPress={() => onSearchChange("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={tc.textTertiary} />
          </Pressable>
        )}
      </View>

      <View style={[styles.listBox, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
        <ScrollView
          style={styles.listScroll}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.map((item) => (
            <Pressable
              key={item}
              onPress={() => { onSelect(item); onSearchChange(""); Haptics.selectionAsync(); }}
              style={[styles.listItem, { borderBottomColor: tc.borderLight }]}
            >
              <Text style={[styles.listItemText, { color: tc.textPrimary }]}>
                {showFlags && getFlag(item) ? `${getFlag(item)}  ${item}` : item}
              </Text>
              {showFlags && getCode(item) ? (
                <Text style={[styles.listItemCode, { color: tc.textTertiary }]}>{getCode(item)}</Text>
              ) : null}
            </Pressable>
          ))}
          {filtered.length === 0 && (
            <View style={styles.noResults}>
              <Ionicons name="search" size={24} color={tc.borderMedium} />
              <Text style={[styles.noResultsText, { color: tc.textTertiary }]}>No results for "{searchValue}"</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────
export default function OnboardingScreen() {
  const { isDark, tc } = useTheme();
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding);
  const firstName = (useAuthStore.getState().user?.name ?? "").split(" ")[0];
  const syncFromApiLogin = useAuthStore((s) => s.syncFromApiLogin);
  const logout = useAuthStore((s) => s.logout);

  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  // Location
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  // Preferences
  const [culture, setCulture] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [communities, setCommunities] = useState<string[]>([]);

  // Agreement
  const [agreed, setAgreed] = useState(false);
  const [regionError, setRegionError] = useState<string | null>(null);

  const availableStates = country ? (STATES_BY_COUNTRY[country] ?? []) : [];
  const availableCities = stateProvince ? (CITIES_BY_STATE[stateProvince] ?? []) : [];

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((p) => Math.min(p + 1, STEPS.length - 1));
  };
  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((p) => Math.max(p - 1, 0));
  };

  const handleSignOut = () => {
    if (submitting) return;
    Haptics.selectionAsync();
    appAlert(
      "Sign out?",
      "You'll return to the sign-in screen. You can complete onboarding after signing in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  const toggleCulture = (id: string) => {
    Haptics.selectionAsync();
    setCulture((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleInterest = (id: string) => {
    Haptics.selectionAsync();
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleCommunity = (id: string) => {
    Haptics.selectionAsync();
    setCommunities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    if (submitting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dialCode = COUNTRY_INFO[country]?.code?.trim() || "+1";
    try {
      setSubmitting(true);
      const backendUser = await submitOnboardingToApi({
        country,
        stateProvince,
        city,
        dialCode,
        cultureUiIds: culture,
        interestUiIds: interests,
        communityUiIds: communities,
      });
      const profile = profileFromBackendAuthUser(backendUser);
      const sessionCookie = useApiAuthStore.getState().sessionCookie;
      if (!sessionCookie?.trim()) {
        throw new Error("Session missing. Sign in again and retry.");
      }
      await syncFromApiLogin(profile, sessionCookie);
      await updateOnboarding({ country, stateProvince, city, culture, interests, communities });
      router.replace("/(tabs)/feed");
    } catch (e) {
      if (e instanceof HttpApiError && e.code === "REGION_NOT_SUPPORTED") {
        setRegionError(
          "ComLinkr is currently only available in the United States and United Kingdom. We'll notify you when we expand to your region.",
        );
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      appAlert("Could not finish onboarding", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return country.length > 0 && stateProvince.length > 0 && city.length > 0;
    if (step === 1) return culture.length > 0;
    if (step === 2) return interests.length > 0;
    if (step === 3) return true; // communities optional — can skip
    return agreed; // step 4 Ready: the terms switch is required
  };

  const locationSummary = city ? `${city}, ${stateProvince}, ${country}` : "";
  const countryFlag = COUNTRY_INFO[country]?.flag ?? "";

  return (
    <View style={[styles.root, { backgroundColor: tc.pageBg }]}>
      <LinearGradient colors={isDark ? ["rgba(26,107,174,0.28)", "rgba(48,133,91,0.08)", "transparent"] : ["rgba(26,107,174,0.14)", "rgba(48,133,91,0.05)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420 }} pointerEvents="none" />
      <SafeAreaView style={styles.safe}>
        {/* ── Header ── */}
        <View style={styles.header}>
          {step > 0 ? (
            <Pressable onPress={goBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chevron-back" size={24} color={tc.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          <OnbDots step={step} total={STEPS.length} />

          <View style={styles.headerRight}>
            <Pressable onPress={handleSignOut} hitSlop={10} disabled={submitting}>
              <Text style={[styles.signOutLink, { color: tc.textSecondary }]}>Sign out</Text>
            </Pressable>
            <Text style={[styles.stepCounter, { color: tc.textTertiary }]}>
              {step + 1}/{STEPS.length}
            </Text>
          </View>
        </View>

        {/* ── Content ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Reanimated.View key={step} entering={reduceMotion ? undefined : FadeInRight.springify().damping(20).stiffness(200).mass(1)}>
          {/* ─── Step 0: Location ─── */}
          {step === 0 && (
            <View style={styles.stepWrap}>
              <View style={styles.iconCircle}>
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Text style={styles.iconEmoji}>🌍</Text>
                </LinearGradient>
              </View>
              <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>Where are you located?</Text>
              <Text style={[styles.stepSub, { color: tc.textSecondary }]}>
                Select your country, region, and city — we'll personalize
                your entire ComLinkr experience
              </Text>

              {/* Country picker */}
              <PickerList
                label="Country"
                items={ONBOARDING_COUNTRIES}
                selected={country}
                onSelect={(c) => {
                  setRegionError(null);
                  setCountry(c);
                  setStateProvince("");
                  setCity("");
                  setStateSearch("");
                  setCitySearch("");
                }}
                placeholder="Search country..."
                searchValue={countrySearch}
                onSearchChange={setCountrySearch}
                showFlags
              />

              <Text style={[styles.stepSub, { color: tc.textTertiary, marginTop: -4, marginBottom: 8 }]}>
                ComLinkr is currently available in the United States and United Kingdom only.
              </Text>
              {regionError ? (
                <Text style={[styles.stepSub, { color: "#DC2626", marginBottom: 8 }]}>{regionError}</Text>
              ) : null}

              {/* State / Province picker (visible once country is selected) */}
              {country.length > 0 && (
                <PickerList
                  label={
                    country === "United States" ? "State"
                    : country === "Canada" ? "Province"
                    : country === "Australia" ? "State / Territory"
                    : country === "United Kingdom" ? "Country / Region"
                    : "State / Province / Region"
                  }
                  items={availableStates}
                  selected={stateProvince}
                  onSelect={(s) => {
                    setStateProvince(s);
                    setCity("");
                    setCitySearch("");
                  }}
                  placeholder="Search state / province..."
                  searchValue={stateSearch}
                  onSearchChange={setStateSearch}
                />
              )}

              {/* City picker (visible once state is selected) */}
              {stateProvince.length > 0 && (
                <PickerList
                  label="City"
                  items={availableCities}
                  selected={city}
                  onSelect={setCity}
                  placeholder="Search city..."
                  searchValue={citySearch}
                  onSearchChange={setCitySearch}
                />
              )}

              {locationSummary ? (
                <View style={[styles.locationSummaryCard, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
                  {countryFlag ? <Text style={{ fontSize: 22 }}>{countryFlag}</Text> : <Ionicons name="location" size={18} color={Colors.brand.blue} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationSummaryLabel}>YOUR LOCATION</Text>
                    <Text style={[styles.locationSummaryValue, { color: tc.textPrimary }]}>{locationSummary}</Text>
                  </View>
                </View>
              ) : null}

              <View style={[styles.tipBox, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
                <Text style={[styles.tipText, { color: tc.textSecondary }]}>
                  💡 You can change your location anytime in Settings
                </Text>
              </View>
            </View>
          )}

          {/* ─── Step 1: Culture ─── */}
          {step === 1 && (
            <View style={styles.stepWrap}>
              <View style={styles.iconCircle}>
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="heart-outline" size={rs(34)} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>What's your vibe?</Text>
              <Text style={[styles.stepSub, { color: tc.textSecondary }]}>
                Select the lifestyles and scenes that define you — pick as
                many as you like
              </Text>

              <View style={styles.cultureGrid}>
                {CULTURE_OPTIONS.map((opt) => {
                  const active = culture.includes(opt.id);
                  return (
                    <PopPressable
                      key={opt.id}
                      onPress={() => toggleCulture(opt.id)}
                      style={[
                        styles.cultureChip,
                        { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
                        active && styles.cultureChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cultureLabel,
                          { color: tc.textPrimary },
                          active && styles.cultureLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.cultureDesc, { color: tc.textTertiary }]}>{opt.desc}</Text>
                      {active && (
                        <View style={styles.cultureCheck}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={Colors.brand.blue}
                          />
                        </View>
                      )}
                    </PopPressable>
                  );
                })}
              </View>

              <View style={styles.countRow}>
                <View style={[styles.countBadge, { backgroundColor: tc.sectionBg }]}>
                  <Text style={[styles.countText, { color: tc.textSecondary }]}>
                    {culture.length} of {CULTURE_OPTIONS.length} selected
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ─── Step 2: Interests ─── */}
          {step === 2 && (
            <View style={styles.stepWrap}>
              <View style={styles.iconCircle}>
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="search-outline" size={rs(34)} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>What are you looking for?</Text>
              <Text style={[styles.stepSub, { color: tc.textSecondary }]}>
                Choose the categories you want highlighted in your ComLinkr
                feed — select at least one
              </Text>

              <View style={styles.interestList}>
                {INTEREST_OPTIONS.map((opt) => {
                  const active = interests.includes(opt.id);
                  return (
                    <PopPressable
                      key={opt.id}
                      onPress={() => toggleInterest(opt.id)}
                      style={[
                        styles.interestCard,
                        { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
                        active && styles.interestCardActive,
                      ]}
                    >
                      <View style={styles.interestInfo}>
                        <Text
                          style={[
                            styles.interestLabel,
                            { color: tc.textPrimary },
                            active && styles.interestLabelActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={[styles.interestDesc, { color: tc.textSecondary }]}>{opt.desc}</Text>
                      </View>
                      <View
                        style={[
                          styles.interestCheckWrap,
                          { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
                          active && styles.interestCheckWrapActive,
                        ]}
                      >
                        {active && (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                    </PopPressable>
                  );
                })}
              </View>

              <View style={styles.countRow}>
                <View style={[styles.countBadge, { backgroundColor: tc.sectionBg }]}>
                  <Text style={[styles.countText, { color: tc.textSecondary }]}>
                    {interests.length} of {INTEREST_OPTIONS.length} selected
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ─── Step 3: Community ─── */}
          {step === 3 && (
            <View style={styles.stepWrap}>
              <View style={styles.iconCircle}>
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="people-outline" size={rs(34)} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>Find your community</Text>
              <Text style={[styles.stepSub, { color: tc.textSecondary }]}>
                Select communities you belong to or want to connect with — you can pick as many as you like
              </Text>

              {COMMUNITY_CATEGORIES.map((cat) => {
                const items = COMMUNITY_OPTIONS.filter((o) => o.category === cat);
                return (
                  <View key={cat} style={styles.commCategoryBlock}>
                    <View style={styles.commCategoryHeaderRow}>
                      <Ionicons name={COMMUNITY_CATEGORY_ICON[cat] as any} size={rs(14)} color={tc.textTertiary} />
                      <Text style={[styles.commCategoryHeader, { color: tc.textPrimary }]}>{cat}</Text>
                    </View>
                    <View style={styles.commChipRow}>
                      {items.map((opt) => {
                        const active = communities.includes(opt.id);
                        return (
                          <PopPressable
                            key={opt.id}
                            onPress={() => toggleCommunity(opt.id)}
                            style={[styles.commChip, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, active && styles.commChipActive]}
                          >
                              <Text style={[styles.commChipLabel, { color: tc.textSecondary }, active && styles.commChipLabelActive]}>
                              {opt.label}
                            </Text>
                            {active && (
                              <View style={styles.commCheck}>
                                <Ionicons name="checkmark-circle" size={14} color={Colors.brand.blue} />
                              </View>
                            )}
                          </PopPressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              <View style={styles.countRow}>
                <View style={[styles.countBadge, { backgroundColor: tc.sectionBg }]}>
                  <Text style={[styles.countText, { color: tc.textSecondary }]}>
                    {communities.length > 0
                      ? `${communities.length} communities selected`
                      : "Tap any community to join — or skip"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ─── Step 4: User Agreement ─── */}
          {step === 4 && (
            <View style={[styles.stepWrap, { alignItems: "center", paddingTop: 40 }]}>
              <Reanimated.View entering={reduceMotion ? undefined : ZoomIn.springify().damping(13).stiffness(220).mass(1)} style={{ width: 90, height: 90, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: tc.mint, marginBottom: 18 }}>
                <Ionicons name="checkmark" size={44} color="#06130D" />
              </Reanimated.View>
              <Text style={[TYPE.question, { color: tc.textPrimary, textAlign: "center" }]}>You're in{firstName ? `, ${firstName}` : ""} ✦</Text>
              <Text style={[TYPE.body, { color: tc.textSecondary, textAlign: "center", marginTop: 8 }]}>
                {city ? `Homes, food and people in ${city} are waiting.` : "Homes, food and people near you are waiting."}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 26, paddingHorizontal: 8 }}>
                <Switch value={agreed} onValueChange={(v) => { setAgreed(v); Haptics.selectionAsync(); }} accessibilityLabel="I agree to the Terms and Privacy Policy" />
                <Text style={[TYPE.body, { color: tc.textPrimary, flexShrink: 1 }]}>
                  I agree to the{" "}
                  <Text style={{ color: tc.accentText, fontFamily: "Manrope_700Bold" }} onPress={() => router.push("/terms-of-service" as never)}>Terms</Text>
                  {" "}and{" "}
                  <Text style={{ color: tc.accentText, fontFamily: "Manrope_700Bold" }} onPress={() => router.push("/privacy-policy" as never)}>Privacy Policy</Text>
                </Text>
              </View>
            </View>
          )}
          </Reanimated.View>
        </ScrollView>

        {/* ── Bottom CTA ── */}
        <View style={[styles.bottomBar, { backgroundColor: tc.glass, borderTopColor: tc.glassLine }]}>
          <Pressable
            onPress={step === 4 ? handleFinish : goNext}
            disabled={!canProceed() || submitting}
            style={({ pressed }) => [
              styles.ctaWrap,
              (!canProceed() || submitting) && styles.ctaDisabled,
              pressed && canProceed() && !submitting && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={
                [Colors.brand.blue, Colors.brand.green]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {submitting && step === 4 ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.ctaText,
                    (!canProceed() || submitting) && { color: "#9CA3AF" },
                  ]}
                >
                  {step === 4 ? "Let's explore" : step === 3 && communities.length === 0 ? "Skip" : "Continue"}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────
const CHIP_WIDTH = (screenWidth() - 50) / 2;

const styles = createThemedStyles({
  root: { flex: 1 },
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(20),
    paddingTop: rs(8),
    paddingBottom: rs(16),
  },
  backBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  backPlaceholder: { width: rs(40) },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
    minWidth: 72,
  },
  signOutLink: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: rs(6) },
  progressDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    backgroundColor: "#E5E7EB",
  },
  progressActive: {
    width: rs(28),
    borderRadius: rs(4),
    backgroundColor: Colors.brand.blue,
  },
  progressDone: { backgroundColor: Colors.brand.green },
  stepCounter: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.text.tertiary,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: rs(20), paddingBottom: rs(24) },

  // Step wrapper
  stepWrap: { alignItems: "center" },

  // Icon circle
  iconCircle: { marginBottom: rs(16), marginTop: rs(4) },
  iconGradient: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(22),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.blue,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconEmoji: { fontSize: rs(34) },

  // Titles
  stepTitle: {
    fontSize: rs(24),
    fontWeight: "800",
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: rs(8),
  },
  stepSub: {
    fontSize: rs(14),
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: rs(22),
    lineHeight: rs(20),
    paddingHorizontal: rs(8),
  },

  // ── Picker ──
  pickerSection: {
    width: "100%",
    marginBottom: rs(16),
  },
  pickerLabel: {
    fontSize: rs(12),
    fontWeight: "700",
    color: Colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: rs(8),
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
    backgroundColor: Colors.brand.blueLight,
    borderWidth: 1.5,
    borderColor: "#B3D9FF",
    borderRadius: rs(12),
    paddingHorizontal: rs(14),
    paddingVertical: rs(10),
    marginBottom: rs(8),
  },
  selectedBadgeText: {
    flex: 1,
    fontSize: rs(14),
    fontWeight: "700",
    color: Colors.brand.blue,
  },
  changePressable: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(8),
    backgroundColor: Colors.brand.blue + "18",
  },
  changeText: {
    fontSize: rs(12),
    fontWeight: "700",
    color: Colors.brand.blue,
  },
  searchWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: rs(14),
    paddingHorizontal: rs(12),
    paddingVertical: rs(11),
    gap: rs(8),
    marginBottom: rs(8),
  },
  searchInput: {
    flex: 1,
    fontSize: rs(14),
    color: Colors.text.primary,
    padding: 0,
  },
  listBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: rs(16),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  listScroll: { maxHeight: rs(180) },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(14),
    paddingVertical: rs(11),
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  listItemActive: { backgroundColor: Colors.brand.blueLight },
  listItemText: {
    fontSize: rs(14),
    color: Colors.text.primary,
    fontWeight: "500",
    flex: 1,
  },
  listItemTextActive: { color: Colors.brand.blue, fontWeight: "700" },
  listItemCode: {
    fontSize: rs(12),
    fontWeight: "600",
    color: Colors.text.tertiary,
    marginRight: rs(6),
  },
  noResults: { alignItems: "center", paddingVertical: rs(20), gap: rs(8) },
  noResultsText: {
    fontSize: rs(13),
    color: Colors.text.tertiary,
    textAlign: "center",
  },

  // Location summary card
  locationSummaryCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    backgroundColor: Colors.brand.blueLight,
    borderWidth: 1.5,
    borderColor: Colors.brand.blue + "40",
    borderRadius: rs(16),
    paddingHorizontal: rs(16),
    paddingVertical: rs(14),
    marginTop: rs(4),
    marginBottom: rs(4),
  },
  locationSummaryLabel: {
    fontSize: rs(9),
    fontWeight: "700",
    color: Colors.brand.blue,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: rs(2),
  },
  locationSummaryValue: {
    fontSize: rs(15),
    fontWeight: "800",
    color: Colors.text.primary,
  },

  // Tip box
  tipBox: {
    width: "100%",
    marginTop: rs(14),
    backgroundColor: Colors.brand.blueLight,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: "#B3D9FF",
    padding: rs(12),
  },
  tipText: {
    fontSize: rs(13),
    color: Colors.brand.blueDark,
    lineHeight: rs(18),
  },

  // Culture grid
  cultureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rs(10),
    width: "100%",
  },
  cultureChip: {
    width: CHIP_WIDTH,
    padding: rs(14),
    borderRadius: rs(16),
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  cultureChipActive: {
    borderColor: Colors.brand.blue,
    backgroundColor: Colors.brand.blueLight,
    shadowColor: Colors.brand.blue,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cultureIconWrap: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(12),
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rs(8),
  },
  cultureLabel: {
    fontSize: rs(13),
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: rs(2),
  },
  cultureLabelActive: { color: Colors.brand.blue },
  cultureDesc: {
    fontSize: rs(11),
    color: Colors.text.tertiary,
    lineHeight: rs(14),
  },
  cultureCheck: {
    position: "absolute",
    top: rs(10),
    right: rs(10),
  },

  // Count badge
  countRow: {
    marginTop: rs(16),
    alignItems: "center",
  },
  countBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: rs(20),
    paddingHorizontal: rs(14),
    paddingVertical: rs(6),
  },
  countText: {
    fontSize: rs(12),
    color: Colors.text.secondary,
    fontWeight: "600",
  },

  // Interests
  interestList: { width: "100%", gap: rs(10) },
  interestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    padding: rs(14),
    borderRadius: rs(16),
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  interestCardActive: {
    borderColor: Colors.brand.green,
    backgroundColor: Colors.brand.greenLight,
    shadowColor: Colors.brand.green,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  interestIconWrap: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(14),
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  interestIconWrapActive: {
    backgroundColor: Colors.brand.greenLight,
  },
  interestInfo: { flex: 1 },
  interestLabel: {
    fontSize: rs(14),
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: rs(2),
  },
  interestLabelActive: { color: Colors.brand.green },
  interestDesc: {
    fontSize: rs(12),
    color: Colors.text.secondary,
    lineHeight: rs(16),
  },
  interestCheckWrap: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  interestCheckWrapActive: {
    backgroundColor: Colors.brand.green,
    borderColor: Colors.brand.green,
  },

  // Summary card (Step 3)
  summaryCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    padding: rs(16),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
  },
  summaryIconWrap: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: Colors.brand.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryContent: { flex: 1 },
  summaryLabel: {
    fontSize: rs(10),
    fontWeight: "700",
    color: Colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: rs(5),
  },
  summaryValue: {
    fontSize: rs(16),
    fontWeight: "800",
    color: Colors.text.primary,
  },
  summarySubValue: {
    fontSize: rs(12),
    color: Colors.text.secondary,
    marginTop: rs(2),
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: rs(14),
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(6) },
  tagOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    backgroundColor: Colors.brand.orangeLight,
    borderRadius: rs(20),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
  },
  tagOrangeText: {
    fontSize: rs(12),
    fontWeight: "600",
    color: "#C05600",
  },
  tagGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    backgroundColor: Colors.brand.greenLight,
    borderRadius: rs(20),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
  },
  tagGreenText: {
    fontSize: rs(12),
    fontWeight: "600",
    color: Colors.brand.greenDark,
  },

  // What's next card
  whatsNextCard: {
    width: "100%",
    marginTop: rs(14),
    backgroundColor: "#F8FAFF",
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: "#E0EEFF",
    padding: rs(16),
  },
  whatsNextTitle: {
    fontSize: rs(13),
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: rs(12),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  whatsNextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    marginBottom: rs(10),
  },
  whatsNextIconWrap: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(10),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  whatsNextText: {
    fontSize: rs(14),
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: rs(18),
  },

  summaryHint: {
    fontSize: rs(12),
    color: Colors.text.tertiary,
    marginTop: rs(16),
    textAlign: "center",
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: rs(20),
    paddingTop: rs(12),
    paddingBottom: rs(8),
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  ctaWrap: { borderRadius: rs(16), overflow: "hidden" },
  ctaDisabled: { opacity: 0.4 },
  ctaGradient: {
    height: rs(54),
    borderRadius: rs(16),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: rs(17),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── Community step styles ──
  commCategoryBlock: {
    width: "100%",
    marginBottom: rs(18),
  },
  commCategoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(6),
    marginBottom: rs(10),
  },
  commCategoryHeader: {
    fontSize: rs(13),
    fontWeight: "800",
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  commChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rs(8),
  },
  commChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  commChipActive: {
    borderColor: Colors.brand.blue,
    backgroundColor: Colors.brand.blueLight,
  },
  commChipEmoji: { fontSize: rs(14) },
  commChipLabel: {
    fontSize: rs(12),
    fontWeight: "700",
    color: Colors.text.secondary,
  },
  commChipLabelActive: { color: Colors.brand.blue },
  commCheck: { marginLeft: rs(2) },

  // ── tagBlue (communities summary) ──
  tagBlue: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    backgroundColor: Colors.brand.blueLight,
    borderRadius: rs(20),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
  },
  tagBlueText: {
    fontSize: rs(12),
    fontWeight: "600",
    color: Colors.brand.blue,
  },

  // ── Agreement step ──
  agreementCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: rs(16),
  },
  agreementScroll: {
    maxHeight: rs(320),
  },
  agreementScrollContent: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(14),
  },
  agreementSectionTitle: {
    fontSize: rs(14),
    fontWeight: "800",
    color: Colors.text.primary,
    marginTop: rs(14),
    marginBottom: rs(6),
  },
  agreementText: {
    fontSize: rs(13),
    color: Colors.text.secondary,
    lineHeight: rs(20),
    marginBottom: rs(4),
  },
  policyLinkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(6),
    paddingVertical: rs(10),
    borderRadius: rs(12),
    borderWidth: 1.5,
  },
  policyLinkText: {
    fontSize: rs(13),
    fontWeight: "700",
  },
  agreementToggle: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    padding: rs(16),
    borderRadius: rs(16),
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginBottom: rs(12),
  },
  agreementToggleActive: {
    borderColor: Colors.brand.green,
    backgroundColor: Colors.brand.greenLight,
  },
  agreementCheckbox: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(6),
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  agreementCheckboxActive: {
    backgroundColor: Colors.brand.green,
    borderColor: Colors.brand.green,
  },
  agreementToggleText: {
    flex: 1,
    fontSize: rs(13),
    fontWeight: "600",
    color: Colors.text.secondary,
    lineHeight: rs(18),
  },
  agreementToggleTextActive: {
    color: Colors.brand.greenDark,
    fontWeight: "700",
  },
});
