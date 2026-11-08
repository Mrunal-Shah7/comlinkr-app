import { rs } from "../src/utils/responsive";
import { useEffect, useRef, useState } from "react";
import Reanimated, { ZoomIn } from "react-native-reanimated";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image"; // SPRINT-31:
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../src/store/auth.store";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import {
  getMyFullProfile,
  mergeFullProfileIntoUser,
  patchMyProfile,
  removeMyAvatar,
  resolveAvatarDisplayUrl,
  uploadMyAvatar,
} from "../src/api/meProfile.api";
import {
  COMMUNITY_SLUG_TO_UI_ID,
  INTEREST_SLUG_TO_UI_ID,
  syncProfileSelectionsToApi,
  VIBE_SLUG_TO_UI_ID,
} from "../src/services/http/onboardingService";
import { COUNTRIES, STATES_BY_COUNTRY, CITIES_BY_STATE, COUNTRY_INFO } from "../src/data/locationData";
import { validatePhoneNumber, formatPhoneHint, sanitizePhoneInput } from "../src/utils/phoneValidation";

function countryToPhoneMarket(country: string): string {
  if (country === "United States" || country === "Canada") return "US";
  if (country === "United Kingdom") return "UK";
  if (country === "India") return "IN";
  return "INTL";
}
import { showToast } from "../src/shared/ui/Toast";
import { apiErrorMessage } from "../src/utils/apiErrorMessage";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { TYPE, display } from '../src/theme/d';
import { Chip, GradientButton, GradientFill, PressableScale, Reveal } from '../src/shared/d';
import { DPage, goBackOr } from '../src/shared/d/Page';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ─── Lifestyle & Culture (matches onboarding Step 2) ─────────────────────────
const CULTURE_OPTIONS = [
  { id: "coffee",    label: "Coffee Culture",    emoji: "☕", desc: "Cafés & morning rituals" },
  { id: "art",       label: "Art & Museums",      emoji: "🎨", desc: "Galleries & creative spaces" },
  { id: "fitness",   label: "Fitness & Health",   emoji: "💪", desc: "Gyms, yoga & active life" },
  { id: "nightlife", label: "Nightlife",           emoji: "🌙", desc: "Bars, clubs & evening out" },
  { id: "family",    label: "Family Life",         emoji: "👨‍👩‍👧", desc: "Parks & kid-friendly spots" },
  { id: "wellness",  label: "Wellness",            emoji: "🧘", desc: "Mindfulness & self-care" },
  { id: "foodie",    label: "Foodie",              emoji: "🍕", desc: "Restaurants & culinary adventures" },
  { id: "outdoor",   label: "Outdoor",             emoji: "🏕️", desc: "Hiking, parks & nature" },
  { id: "tech",      label: "Tech & Innovation",   emoji: "💡", desc: "Meetups & startups" },
  { id: "music",     label: "Music & Events",      emoji: "🎵", desc: "Concerts & local artists" },
  { id: "sports",    label: "Sports & Games",      emoji: "⚽", desc: "Teams & watch parties" },
  { id: "volunteer", label: "Volunteering",        emoji: "🤝", desc: "Community service" },
];

// ─── Interests (matches onboarding Step 3) ───────────────────────────────────
const INTEREST_OPTIONS = [
  { id: "housing",   label: "Housing & Real Estate",   icon: "🏠", desc: "Find rentals, homes & roommates" },
  { id: "food",      label: "Food & Dining",           icon: "🍽️", desc: "Discover local restaurants & eateries" },
  { id: "community", label: "Community & Social",      icon: "👥", desc: "Connect with locals & neighbors" },
  { id: "events",    label: "Events & Entertainment",  icon: "🎉", desc: "Never miss what's happening nearby" },
  { id: "jobs",      label: "Jobs & Careers",          icon: "💼", desc: "Local opportunities & networking" },
  { id: "health",    label: "Health & Wellness",       icon: "🏥", desc: "Doctors, clinics & wellness services" },
  { id: "education", label: "Education & Learning",    icon: "📚", desc: "Schools, tutors & local courses" },
  { id: "shopping",  label: "Shopping & Services",     icon: "🛍️", desc: "Local shops, deals & recommendations" },
];

// ─── Communities (matches onboarding Step 4 — full 80+ options) ──────────────
const COMMUNITY_OPTIONS = [
  // Cultural & Heritage
  { id: "south-asian",     label: "South Asian",             emoji: "🇮🇳", category: "Cultural & Heritage" },
  { id: "east-asian",      label: "East Asian",              emoji: "🌏", category: "Cultural & Heritage" },
  { id: "southeast-asian", label: "Southeast Asian",         emoji: "🌺", category: "Cultural & Heritage" },
  { id: "latin-american",  label: "Latin American",          emoji: "🌎", category: "Cultural & Heritage" },
  { id: "african",         label: "African & Afro-Diaspora", emoji: "🌍", category: "Cultural & Heritage" },
  { id: "caribbean",       label: "Caribbean",               emoji: "🌊", category: "Cultural & Heritage" },
  { id: "middle-eastern",  label: "Middle Eastern",          emoji: "🕌", category: "Cultural & Heritage" },
  { id: "european",        label: "European",                emoji: "🇪🇺", category: "Cultural & Heritage" },
  { id: "pacific-islander",label: "Pacific Islander",        emoji: "🏝️", category: "Cultural & Heritage" },
  { id: "indigenous",      label: "Indigenous & First Nations",emoji: "🪶",category: "Cultural & Heritage" },
  { id: "south-american",  label: "South American",          emoji: "🦜", category: "Cultural & Heritage" },
  { id: "central-asian",   label: "Central Asian",           emoji: "🐎", category: "Cultural & Heritage" },
  // Lifestyle
  { id: "expat",           label: "Expat",                   emoji: "✈️", category: "Lifestyle" },
  { id: "digital-nomad",   label: "Digital Nomad",           emoji: "💻", category: "Lifestyle" },
  { id: "student",         label: "Student",                 emoji: "🎓", category: "Lifestyle" },
  { id: "young-professional",label:"Young Professional",     emoji: "💼", category: "Lifestyle" },
  { id: "new-in-town",     label: "New in Town",             emoji: "🗺️", category: "Lifestyle" },
  { id: "retiree",         label: "Retiree & Seniors",       emoji: "🌅", category: "Lifestyle" },
  { id: "parent",          label: "Parents & Families",      emoji: "👨‍👩‍👧", category: "Lifestyle" },
  { id: "pet-owner",       label: "Pet Owners",              emoji: "🐾", category: "Lifestyle" },
  // Professional
  { id: "tech-startup",    label: "Tech & Startups",         emoji: "🚀", category: "Professional" },
  { id: "creative-pro",    label: "Creatives & Artists",     emoji: "🎨", category: "Professional" },
  { id: "healthcare-pro",  label: "Healthcare Workers",      emoji: "🏥", category: "Professional" },
  { id: "educator-pro",    label: "Educators & Teachers",    emoji: "📚", category: "Professional" },
  { id: "entrepreneur",    label: "Entrepreneurs",           emoji: "💡", category: "Professional" },
  { id: "finance-biz",     label: "Finance & Business",      emoji: "📊", category: "Professional" },
  { id: "legal-gov",       label: "Legal & Government",      emoji: "⚖️", category: "Professional" },
  // Social & Cause
  { id: "lgbtq",           label: "LGBTQ+",                  emoji: "🌈", category: "Social & Cause" },
  { id: "womens-network",  label: "Women's Network",         emoji: "💜", category: "Social & Cause" },
  { id: "veterans",        label: "Veterans",                emoji: "🎖️", category: "Social & Cause" },
  { id: "eco-conscious",   label: "Eco-Conscious",           emoji: "🌿", category: "Social & Cause" },
  { id: "volunteer-net",   label: "Volunteer Network",       emoji: "🤝", category: "Social & Cause" },
  { id: "disability",      label: "Disability Community",    emoji: "♿", category: "Social & Cause" },
  { id: "mental-health",   label: "Mental Health Advocates", emoji: "🧠", category: "Social & Cause" },
  // Faith & Spiritual
  { id: "christian",       label: "Christian",               emoji: "✝️", category: "Faith & Spiritual" },
  { id: "muslim",          label: "Muslim",                  emoji: "☪️", category: "Faith & Spiritual" },
  { id: "jewish",          label: "Jewish",                  emoji: "✡️", category: "Faith & Spiritual" },
  { id: "hindu",           label: "Hindu",                   emoji: "🕉️", category: "Faith & Spiritual" },
  { id: "buddhist",        label: "Buddhist",                emoji: "☸️", category: "Faith & Spiritual" },
  { id: "interfaith",      label: "Interfaith & Spiritual",  emoji: "🙏", category: "Faith & Spiritual" },
  // National & Diaspora — Latin America
  { id: "mexican",         label: "Mexican",                 emoji: "🇲🇽", category: "National & Diaspora" },
  { id: "brazilian",       label: "Brazilian",               emoji: "🇧🇷", category: "National & Diaspora" },
  { id: "colombian",       label: "Colombian",               emoji: "🇨🇴", category: "National & Diaspora" },
  { id: "cuban",           label: "Cuban",                   emoji: "🇨🇺", category: "National & Diaspora" },
  { id: "dominican",       label: "Dominican",               emoji: "🇩🇴", category: "National & Diaspora" },
  { id: "puerto-rican",    label: "Puerto Rican",            emoji: "🇵🇷", category: "National & Diaspora" },
  { id: "venezuelan",      label: "Venezuelan",              emoji: "🇻🇪", category: "National & Diaspora" },
  { id: "peruvian",        label: "Peruvian",                emoji: "🇵🇪", category: "National & Diaspora" },
  // National & Diaspora — South Asia
  { id: "indian",          label: "Indian",                  emoji: "🇮🇳", category: "National & Diaspora" },
  { id: "pakistani",       label: "Pakistani",               emoji: "🇵🇰", category: "National & Diaspora" },
  { id: "bangladeshi",     label: "Bangladeshi",             emoji: "🇧🇩", category: "National & Diaspora" },
  { id: "sri-lankan",      label: "Sri Lankan",              emoji: "🇱🇰", category: "National & Diaspora" },
  { id: "nepali",          label: "Nepali",                  emoji: "🇳🇵", category: "National & Diaspora" },
  // National & Diaspora — East / SE Asia
  { id: "chinese",         label: "Chinese",                 emoji: "🇨🇳", category: "National & Diaspora" },
  { id: "korean",          label: "Korean",                  emoji: "🇰🇷", category: "National & Diaspora" },
  { id: "japanese",        label: "Japanese",                emoji: "🇯🇵", category: "National & Diaspora" },
  { id: "filipino",        label: "Filipino",                emoji: "🇵🇭", category: "National & Diaspora" },
  { id: "vietnamese",      label: "Vietnamese",              emoji: "🇻🇳", category: "National & Diaspora" },
  { id: "thai",            label: "Thai",                    emoji: "🇹🇭", category: "National & Diaspora" },
  { id: "indonesian",      label: "Indonesian",              emoji: "🇮🇩", category: "National & Diaspora" },
  // National & Diaspora — Europe
  { id: "british",         label: "British",                 emoji: "🇬🇧", category: "National & Diaspora" },
  { id: "irish",           label: "Irish",                   emoji: "🇮🇪", category: "National & Diaspora" },
  { id: "spanish",         label: "Spanish",                 emoji: "🇪🇸", category: "National & Diaspora" },
  { id: "french",          label: "French",                  emoji: "🇫🇷", category: "National & Diaspora" },
  { id: "italian",         label: "Italian",                 emoji: "🇮🇹", category: "National & Diaspora" },
  { id: "greek",           label: "Greek",                   emoji: "🇬🇷", category: "National & Diaspora" },
  { id: "portuguese",      label: "Portuguese",              emoji: "🇵🇹", category: "National & Diaspora" },
  { id: "polish",          label: "Polish",                  emoji: "🇵🇱", category: "National & Diaspora" },
  { id: "ukrainian",       label: "Ukrainian",               emoji: "🇺🇦", category: "National & Diaspora" },
  { id: "russian",         label: "Russian",                 emoji: "🇷🇺", category: "National & Diaspora" },
  { id: "german",          label: "German",                  emoji: "🇩🇪", category: "National & Diaspora" },
  { id: "romanian",        label: "Romanian",                emoji: "🇷🇴", category: "National & Diaspora" },
  // National & Diaspora — Africa
  { id: "nigerian",        label: "Nigerian",                emoji: "🇳🇬", category: "National & Diaspora" },
  { id: "ghanaian",        label: "Ghanaian",                emoji: "🇬🇭", category: "National & Diaspora" },
  { id: "kenyan",          label: "Kenyan",                  emoji: "🇰🇪", category: "National & Diaspora" },
  { id: "ethiopian",       label: "Ethiopian",               emoji: "🇪🇹", category: "National & Diaspora" },
  { id: "somali",          label: "Somali",                  emoji: "🇸🇴", category: "National & Diaspora" },
  { id: "zimbabwean",      label: "Zimbabwean",              emoji: "🇿🇼", category: "National & Diaspora" },
  { id: "south-african",   label: "South African",           emoji: "🇿🇦", category: "National & Diaspora" },
  // National & Diaspora — Caribbean
  { id: "jamaican",        label: "Jamaican",                emoji: "🇯🇲", category: "National & Diaspora" },
  { id: "trinidadian",     label: "Trinidadian",             emoji: "🇹🇹", category: "National & Diaspora" },
  { id: "haitian",         label: "Haitian",                 emoji: "🇭🇹", category: "National & Diaspora" },
  // National & Diaspora — Middle East / North Africa
  { id: "egyptian",        label: "Egyptian",                emoji: "🇪🇬", category: "National & Diaspora" },
  { id: "moroccan",        label: "Moroccan",                emoji: "🇲🇦", category: "National & Diaspora" },
  { id: "lebanese",        label: "Lebanese",                emoji: "🇱🇧", category: "National & Diaspora" },
  { id: "iranian",         label: "Iranian / Persian",       emoji: "🇮🇷", category: "National & Diaspora" },
  { id: "turkish",         label: "Turkish",                 emoji: "🇹🇷", category: "National & Diaspora" },
  { id: "afghan",          label: "Afghan",                  emoji: "🇦🇫", category: "National & Diaspora" },
  { id: "syrian",          label: "Syrian",                  emoji: "🇸🇾", category: "National & Diaspora" },
  { id: "arab",            label: "Arab",                    emoji: "🕌", category: "National & Diaspora" },
];

const COMMUNITY_CATEGORIES = [
  "Cultural & Heritage", "National & Diaspora", "Lifestyle",
  "Professional", "Social & Cause", "Faith & Spiritual",
];

function isLocalAssetUri(uri: string | null): boolean {
  if (!uri) return false;
  return (
    uri.startsWith("file:") ||
    uri.startsWith("content:") ||
    uri.startsWith("ph://") ||
    uri.startsWith("assets-library:")
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function LocationPickerField({
  label,
  value,
  items,
  onSelect,
  disabled,
  placeholder,
  showFlags,
  accentColor = Colors.brand.blue,
  tc,
}: {
  label: string;
  value: string;
  items: string[];
  onSelect: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  showFlags?: boolean;
  accentColor?: string;
  tc: ReturnType<typeof import("../src/theme/useTheme").useTheme>["tc"];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? items.filter((i) => i.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <>
      <Pressable
        onPress={() => { if (!disabled) setOpen(true); }}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            minHeight: 50,
            paddingHorizontal: 14,
            borderRadius: 16,
            backgroundColor: tc.inputBg,
            gap: 8,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        {showFlags && value && COUNTRY_INFO[value]?.flag ? (
          <Text style={{ fontSize: rs(18) }}>{COUNTRY_INFO[value].flag}</Text>
        ) : (
          <Ionicons name="location-outline" size={16} color={value ? tc.accentText : tc.textTertiary} />
        )}
        <Text style={[TYPE.body, { flex: 1, color: value ? tc.textPrimary : tc.textTertiary }]}>
          {value || placeholder}
        </Text>
        {value ? (
          <Pressable onPress={(e) => { e.stopPropagation(); onSelect(""); }} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={tc.textTertiary} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={16} color={tc.textTertiary} />
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: rs(16), paddingVertical: rs(14), borderBottomWidth: 1, borderBottomColor: tc.borderLight, gap: rs(10) }}>
            <Text style={{ flex: 1, fontSize: rs(17), fontWeight: "800", color: tc.textPrimary }}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={tc.textPrimary} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", margin: rs(12), paddingHorizontal: rs(12), borderWidth: 1, borderRadius: rs(12), borderColor: tc.borderLight, backgroundColor: tc.inputBg, gap: rs(8) }}>
            <Ionicons name="search-outline" size={16} color={tc.textTertiary} />
            <TextInput
              style={{ flex: 1, paddingVertical: rs(11), fontSize: rs(15), color: tc.textPrimary }}
              placeholder={`Search ${label.toLowerCase()}...`}
              placeholderTextColor={tc.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={tc.textTertiary} />
              </Pressable>
            )}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onSelect(item); setSearch(""); setOpen(false); }}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: rs(16), paddingVertical: rs(14), borderBottomWidth: 1, borderBottomColor: tc.borderLight, gap: rs(10), backgroundColor: value === item ? (accentColor + "18") : "transparent" }}
              >
                {showFlags && COUNTRY_INFO[item]?.flag ? (
                  <Text style={{ fontSize: rs(20) }}>{COUNTRY_INFO[item].flag}</Text>
                ) : null}
                <Text style={{ flex: 1, fontSize: rs(15), fontWeight: value === item ? "700" : "500", color: tc.textPrimary }}>{item}</Text>
                {value === item && <Ionicons name="checkmark-circle" size={18} color={accentColor} />}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", paddingVertical: rs(32), color: tc.textTertiary, fontSize: rs(14) }}>No results found</Text>
            }
          />
        </View>
      </Modal>
    </>
  );
}

export default function EditProfileScreen() {
  const { isDark, tc } = useTheme();
  const isAuthed = useAuthStore((st) => st.isAuthed);
  const user = useAuthStore((st) => st.user);
  const applyUser = useAuthStore((st) => st.applyUser);

  const [profileLoading, setProfileLoading] = useState(true);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");
  const availableStates = country ? (STATES_BY_COUNTRY[country] ?? []) : [];
  const availableCities = stateProvince ? (CITIES_BY_STATE[stateProvince] ?? []) : [];
  const [selectedCulture, setSelectedCulture] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  // Accounts that never chose interests (e.g. seeded admins) may still save a location-only change.
  const hadInterestsAtLoad = useRef(true);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [activeCommunityCategory, setActiveCommunityCategory] = useState<string>("Cultural & Heritage");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const pendingAvatarMime = useRef<string | null>(null);
  const serverAvatarPathAtLoad = useRef<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getMyFullProfile();
        if (cancelled) return;
        setName(p.name || "");
        setUsername(p.username || "");
        setEmail(p.email || "");
        setPhone(p.phoneNumber || "");
        setBio(p.bio || "");
        setCountry(p.location?.country || "");
        setStateProvince(p.location?.state || "");
        setCity(p.location?.city || "");
        const v = p.vibes.map((x) => VIBE_SLUG_TO_UI_ID[x.slug]).filter(Boolean) as string[];
        const i = p.interests.map((x) => INTEREST_SLUG_TO_UI_ID[x.slug]).filter(Boolean) as string[];
        const c = p.communities.map((x) => COMMUNITY_SLUG_TO_UI_ID[x.slug]).filter(Boolean) as string[];
        setSelectedCulture([...new Set(v)]);
        setSelectedInterests(i);
        hadInterestsAtLoad.current = i.length > 0;
        setSelectedCommunities(c);
        serverAvatarPathAtLoad.current = p.avatarUrl;
        pendingAvatarMime.current = null;
        setProfileImage(resolveAvatarDisplayUrl(p.avatarUrl));
      } catch {
        const u = useAuthStore.getState().user;
        if (!cancelled && u) {
          setName(u.name || "");
          setUsername(u.username || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setBio(u.bio || "");
          setCountry(u.country || "");
          setStateProvince(u.stateProvince || "");
          setCity(u.city || "");
          setSelectedCulture([...new Set([...(u.vibe || []), ...(u.culture || [])])]);
          setSelectedInterests(u.interests || []);
          hadInterestsAtLoad.current = (u.interests || []).length > 0;
          setSelectedCommunities(u.communities || []);
          serverAvatarPathAtLoad.current = null;
          setProfileImage(null);
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "CL";

  const pickImage = async (source: "library" | "camera") => {
    try {
      setImageLoading(true);
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { showToast("Camera access is needed.", "error"); return; }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { showToast("Photo library access is needed.", "error"); return; }
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        showToast(`Max size is ${MAX_FILE_SIZE_MB}MB.`, "error"); return;
      }
      if (asset.mimeType && !ALLOWED_TYPES.includes(asset.mimeType)) {
        showToast("Please upload a JPEG, PNG, or WebP image.", "error"); return;
      }
      setProfileImage(asset.uri);
      pendingAvatarMime.current =
        asset.mimeType && ALLOWED_TYPES.includes(asset.mimeType) ? asset.mimeType : "image/jpeg";
    } catch {
      showToast("Failed to pick image. Please try again.", "error");
    } finally {
      setImageLoading(false);
    }
  };

  const showImageOptions = () => {
    appAlert(profileImage ? "Change Photo" : "Add Profile Photo", "Choose a source", [
      { text: "Choose from Library", onPress: () => pickImage("library") },
      { text: "Take Photo", onPress: () => pickImage("camera") },
      ...(profileImage ? [{ text: "Remove Photo", style: "destructive" as const, onPress: () => { setProfileImage(null); pendingAvatarMime.current = null; } }] : []),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const toggle = (val: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const handleSave = async () => {
    // Name
    const trimName = name.trim();
    if (!trimName) { showToast("Please enter your full name.", "error"); return; }
    if (trimName.length < 2) { showToast("Your name must be at least 2 characters.", "error"); return; }
    if (trimName.length > 60) { showToast("Name must be under 60 characters.", "error"); return; }

    // Username
    const trimUsername = username.trim().toLowerCase();
    if (!trimUsername) { showToast("Please enter a username.", "error"); return; }
    if (trimUsername.length < 3) { showToast("Username must be at least 3 characters.", "error"); return; }
    if (trimUsername.length > 30) { showToast("Username must be under 30 characters.", "error"); return; }
    if (!/^[a-z0-9_]+$/.test(trimUsername)) {
      showToast("Username may only contain lowercase letters, numbers, and underscores.", "error");
      return;
    }

    // Email
    const trimEmail = email.trim();
    if (!trimEmail) { showToast("Please enter your email address.", "error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimEmail)) {
      showToast("Please enter a valid email address (e.g. name@example.com).", "error");
      return;
    }

    // Phone (optional)
    if (phone.trim()) {
      const phoneCheck = validatePhoneNumber(phone, countryToPhoneMarket(country));
      if (!phoneCheck.valid) {
        showToast(phoneCheck.error ?? "Please enter a valid phone number.", "error");
        return;
      }
    }

    // Interests
    if (selectedInterests.length === 0 && hadInterestsAtLoad.current) {
      showToast("Please select at least one interest so we can personalise your feed.", "error");
      return;
    }

    // Location — validated by the picker (only valid values selectable)
    if (!country.trim()) {
      showToast("Please select your country.", "error");
      return;
    }
    const hasStates = (STATES_BY_COUNTRY[country] ?? []).length > 0;
    if (hasStates && !stateProvince.trim()) {
      showToast(
        `Please select your ${country === "Canada" ? "province" : "state"} within ${country}.`,
        "error",
      );
      return;
    }
    const hasCities = (CITIES_BY_STATE[stateProvince] ?? []).length > 0;
    if (hasCities && !city.trim()) {
      showToast("Please select your city.", "error");
      return;
    }
    setSaving(true);
    try {
      await patchMyProfile({
        fullName: name.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        // The API rejects an empty phone string; only send it when the user entered one.
        ...(phone.trim() ? { phoneNumber: phone.trim() } : {}),
      });
      await syncProfileSelectionsToApi({
        country: country.trim(),
        stateProvince: stateProvince.trim(),
        city: city.trim(),
        cultureUiIds: selectedCulture,
        interestUiIds: selectedInterests,
        communityUiIds: selectedCommunities,
      });
      const hadServerAvatar = !!serverAvatarPathAtLoad.current;
      const isLocal = profileImage != null && isLocalAssetUri(profileImage);
      const clearedAvatar = profileImage == null && hadServerAvatar;
      if (isLocal && profileImage) {
        const mime = pendingAvatarMime.current || "image/jpeg";
        await uploadMyAvatar(profileImage, mime);
      } else if (clearedAvatar) {
        await removeMyAvatar();
      }
      const fresh = await getMyFullProfile();
      await applyUser(mergeFullProfileIntoUser(fresh, useAuthStore.getState().user));
      serverAvatarPathAtLoad.current = fresh.avatarUrl;
      setProfileImage(resolveAvatarDisplayUrl(fresh.avatarUrl));
      pendingAvatarMime.current = null;
      if (router.canGoBack()) router.back(); else router.replace("/profile" as any);
    } catch (e) {
      showToast(apiErrorMessage(e, "Could not save profile."), "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Save as you go ──────────────────────────────────────────────────────────
  type SaveKey = "photo" | "name" | "username" | "phone" | "bio" | "place" | "prefs";
  const [saveState, setSaveState] = useState<Partial<Record<SaveKey, "saving" | "ok" | "err">>>({});
  const mark = (k: SaveKey, v: "saving" | "ok" | "err") => setSaveState((m) => ({ ...m, [k]: v }));
  const lastSaved = useRef<{ name: string; username: string; phone: string; bio: string } | null>(null);
  const prefsReady = useRef(false);
  useEffect(() => {
    if (profileLoading || lastSaved.current) return;
    lastSaved.current = { name: name.trim(), username: username.trim().toLowerCase(), phone: phone.trim(), bio: bio.trim() };
    setTimeout(() => { prefsReady.current = true; }, 0);
  }, [profileLoading, name, username, phone, bio]);
  const refreshUser = async () => {
    const fresh = await getMyFullProfile();
    await applyUser(mergeFullProfileIntoUser(fresh, useAuthStore.getState().user));
    return fresh;
  };
  const textError = (k: "name" | "username" | "phone" | "bio"): string | null => {
    if (k === "name") {
      const v = name.trim();
      if (!v) return "Please enter your full name.";
      if (v.length < 2) return "Your name must be at least 2 characters.";
      if (v.length > 60) return "Name must be under 60 characters.";
    }
    if (k === "username") {
      const v = username.trim().toLowerCase();
      if (!v) return "Please enter a username.";
      if (v.length < 3) return "Username must be at least 3 characters.";
      if (v.length > 30) return "Username must be under 30 characters.";
      if (!/^[a-z0-9_]+$/.test(v)) return "Username may only contain lowercase letters, numbers, and underscores.";
    }
    if (k === "phone" && phone.trim()) {
      const c = validatePhoneNumber(phone, countryToPhoneMarket(country));
      if (!c.valid) return c.error ?? "Please enter a valid phone number.";
    }
    return null;
  };
  const saveText = async (k: "name" | "username" | "phone" | "bio", quiet = false) => {
    if (!lastSaved.current) return;
    const value = k === "username" ? username.trim().toLowerCase() : k === "name" ? name.trim() : k === "phone" ? phone.trim() : bio.trim();
    if (value === lastSaved.current[k]) return;
    const err = textError(k);
    if (err) { if (quiet) return; mark(k, "err"); showToast(err, "error"); return; }
    if (k === "phone" && !value) return; // the API rejects an empty phone; leaving it empty keeps the old one
    mark(k, "saving");
    try {
      await patchMyProfile(k === "name" ? { fullName: value } : k === "username" ? { username: value } : k === "phone" ? { phoneNumber: value } : { bio: value });
      lastSaved.current = { ...lastSaved.current, [k]: value };
      await refreshUser();
      mark(k, "ok");
    } catch (ex) {
      mark(k, "err");
      showToast(apiErrorMessage(ex, "Could not save."), "error");
    }
  };
  // Text also saves a second after typing stops (closing the Android keyboard does not blur the field);
  // problems are only reported when you leave the field.
  useEffect(() => {
    if (!lastSaved.current) return;
    const t = setTimeout(() => { for (const k of ["name", "username", "phone", "bio"] as const) void saveText(k, true); }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveText reads the latest values
  }, [name, username, phone, bio]);
  // Location and the chips save a moment after they change, once they are complete.
  useEffect(() => {
    if (!prefsReady.current) return;
    const hasStates = (STATES_BY_COUNTRY[country] ?? []).length > 0;
    const hasCities = (CITIES_BY_STATE[stateProvince] ?? []).length > 0;
    if (!country.trim() || (hasStates && !stateProvince.trim()) || (hasCities && !city.trim())) return;
    if (selectedInterests.length === 0 && hadInterestsAtLoad.current) return;
    const t = setTimeout(() => {
      mark("place", "saving"); mark("prefs", "saving");
      void syncProfileSelectionsToApi({
        country: country.trim(), stateProvince: stateProvince.trim(), city: city.trim(),
        cultureUiIds: selectedCulture, interestUiIds: selectedInterests, communityUiIds: selectedCommunities,
      }).then(refreshUser).then(() => { mark("place", "ok"); mark("prefs", "ok"); })
        .catch((ex) => { mark("place", "err"); mark("prefs", "err"); showToast(apiErrorMessage(ex, "Could not save."), "error"); });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshUser and mark only use stable setters
  }, [country, stateProvince, city, selectedCulture, selectedInterests, selectedCommunities]);
  // A new photo uploads right away; removing it removes it.
  const lastPhoto = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (profileLoading) return;
    if (lastPhoto.current === undefined) { lastPhoto.current = profileImage; return; }
    if (profileImage === lastPhoto.current) return;
    lastPhoto.current = profileImage;
    const isLocal = profileImage != null && isLocalAssetUri(profileImage);
    if (!isLocal && profileImage != null) return;
    mark("photo", "saving");
    void (async () => {
      try {
        if (isLocal && profileImage) await uploadMyAvatar(profileImage, pendingAvatarMime.current || "image/jpeg");
        else if (serverAvatarPathAtLoad.current) await removeMyAvatar();
        const fresh = await refreshUser();
        serverAvatarPathAtLoad.current = fresh.avatarUrl;
        pendingAvatarMime.current = null;
        lastPhoto.current = resolveAvatarDisplayUrl(fresh.avatarUrl);
        setProfileImage(lastPhoto.current);
        mark("photo", "ok");
      } catch (ex) {
        mark("photo", "err");
        showToast(apiErrorMessage(ex, "Could not save the photo."), "error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the photo changes
  }, [profileImage, profileLoading]);
  const savedMark = (k: SaveKey) => {
    const v = saveState[k];
    if (!v) return null;
    if (v === "saving") return <ActivityIndicator size="small" color={tc.textTertiary} style={{ transform: [{ scale: 0.7 }] }} />;
    return (
      <Reanimated.View key={v} entering={ZoomIn.springify().damping(14).stiffness(260).mass(1)}>
        <Ionicons name={v === "ok" ? "checkmark-circle" : "alert-circle"} size={16} color={v === "ok" ? tc.mint : tc.dangerText} accessibilityLabel={v === "ok" ? "Saved" : "Not saved"} />
      </Reanimated.View>
    );
  };

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  const field = (label: string, input: React.ReactNode, hint?: string, k?: SaveKey) => (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6, marginLeft: 2 }}>
        <Text style={[TYPE.label, { color: tc.textSecondary }]}>{label}</Text>
        {k ? savedMark(k) : null}
      </View>
      {input}
      {hint ? <Text style={[TYPE.small, { color: tc.textTertiary, marginTop: 5, marginLeft: 2, fontSize: 12 }]}>{hint}</Text> : null}
    </View>
  );
  const inputBox = { minHeight: 50, borderRadius: 16, paddingHorizontal: 14, backgroundColor: tc.inputBg, justifyContent: "center" as const };
  const inputText = [TYPE.body, { color: tc.textPrimary, paddingVertical: 12 }];
  const group = (t: string, k?: SaveKey) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18, marginBottom: 10, marginLeft: 2 }}>
      <Text style={[TYPE.overline, { color: tc.textTertiary }]}>{t}</Text>
      {k ? savedMark(k) : null}
    </View>
  );
  const busy = saving || profileLoading;

  return (
    <DPage
      title="Edit profile"
      largeTitle="hidden"
      onBack={() => goBackOr("/profile")}
      right={
        <Pressable onPress={handleSave} disabled={busy} hitSlop={8} accessibilityRole="button" accessibilityLabel="Save profile" style={{ paddingHorizontal: 12, height: 42, justifyContent: "center" }}>
          {saving ? <ActivityIndicator size="small" color={tc.accent} /> : <Text style={[TYPE.bodyStrong, { color: busy ? tc.textTertiary : tc.accentText }]}>Done</Text>}
        </Pressable>
      }
    >
      {profileLoading ? (
        <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 80 }} />
      ) : (
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <View style={{ paddingHorizontal: 16 }}>
          {/* Photo */}
          <Reveal i={0} style={{ alignItems: "center", marginBottom: 14 }}>
            <PressableScale onPress={showImageOptions} accessibilityRole="button" accessibilityLabel={profileImage ? "Change photo" : "Add a photo"}>
              <GradientFill style={{ width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: tc.pageBg, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={{ width: "100%", height: "100%" }} contentFit={isLocalAssetUri(profileImage) ? "contain" : "cover"} cachePolicy={isLocalAssetUri(profileImage) ? "memory" : "memory-disk"} transition={200} />
                  ) : (
                    <Text style={[display(800), { color: "#fff", fontSize: 28 }]}>{initials}</Text>
                  )}
                </View>
              </GradientFill>
              <View style={{ position: "absolute", right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: tc.accent, borderWidth: 2, borderColor: tc.pageBg }}>
                {imageLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={14} color="#FFF" />}
              </View>
            </PressableScale>
            <Pressable onPress={showImageOptions} hitSlop={8} style={{ marginTop: 10 }} accessibilityRole="button">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>{profileImage ? "Change photo" : "Add a photo"}</Text>
                {savedMark("photo")}
              </View>
            </Pressable>
            <Text style={[TYPE.small, { color: tc.textTertiary, fontSize: 12, marginTop: 2 }]}>JPEG, PNG or WebP, up to {MAX_FILE_SIZE_MB} MB</Text>
          </Reveal>

          <Reveal i={1}>
            {field("Name", <View style={inputBox}><TextInput style={inputText} value={name} onChangeText={setName} onBlur={() => void saveText("name")} placeholder="Your full name" placeholderTextColor={tc.textTertiary} /></View>, undefined, "name")}
            {field("Username", <View style={inputBox}><TextInput style={inputText} value={username} onChangeText={setUsername} onBlur={() => void saveText("username")} placeholder="username" placeholderTextColor={tc.textTertiary} autoCapitalize="none" /></View>, undefined, "username")}
            {field("Email", <View style={[inputBox, { opacity: 0.7 }]}><TextInput style={inputText} value={email} editable={false} placeholder="email@example.com" placeholderTextColor={tc.textTertiary} keyboardType="email-address" autoCapitalize="none" /></View>, "Change your email in Settings, Account details.")}
            {field("Phone", <View style={inputBox}><TextInput style={inputText} value={phone} onChangeText={(t) => setPhone(sanitizePhoneInput(t, countryToPhoneMarket(country)))} onBlur={() => void saveText("phone")} placeholder="+1 (555) 000-0000" placeholderTextColor={tc.textTertiary} keyboardType="phone-pad" /></View>, phone.trim().length > 0 ? formatPhoneHint(countryToPhoneMarket(country)) : undefined, "phone")}
            {field("Bio", <View style={[inputBox, { paddingVertical: 4 }]}><TextInput style={[inputText, { minHeight: 90, textAlignVertical: "top" }]} value={bio} onChangeText={setBio} onBlur={() => void saveText("bio")} placeholder="A line about you" placeholderTextColor={tc.textTertiary} multiline maxLength={200} /></View>, `${bio.length}/200`, "bio")}
          </Reveal>

          <Reveal i={2}>
            {group("Where you live", "place")}
            {field("Country", <LocationPickerField label="Country" value={country} items={COUNTRIES} onSelect={(v) => { setCountry(v); setStateProvince(""); setCity(""); }} placeholder="Choose a country" showFlags tc={tc} />)}
            {country.length > 0 && availableStates.length > 0
              ? field(country === "United States" ? "State" : country === "Canada" ? "Province" : country === "United Kingdom" ? "Region" : "State or province",
                <LocationPickerField label={country === "United States" ? "State" : country === "Canada" ? "Province" : "State or province"} value={stateProvince} items={availableStates} onSelect={(v) => { setStateProvince(v); setCity(""); }} placeholder="Choose one" tc={tc} />)
              : null}
            {stateProvince.length > 0 && availableCities.length > 0
              ? field("City", <LocationPickerField label="City" value={city} items={availableCities} onSelect={setCity} placeholder="Choose a city" tc={tc} />)
              : null}
          </Reveal>

          <Reveal i={3}>
            {group("Your vibe", "prefs")}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CULTURE_OPTIONS.map((item) => (
                <Chip key={item.id} label={item.label} on={selectedCulture.includes(item.id)} onPress={() => toggle(item.id, selectedCulture, setSelectedCulture)} />
              ))}
            </View>

            {group("Interests")}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {INTEREST_OPTIONS.map((item) => (
                <Chip key={item.id} label={item.label} on={selectedInterests.includes(item.id)} onPress={() => toggle(item.id, selectedInterests, setSelectedInterests)} />
              ))}
            </View>

            {group(selectedCommunities.length > 0 ? `Communities · ${selectedCommunities.length} chosen` : "Communities")}
            <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 10 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {COMMUNITY_CATEGORIES.map((cat) => {
                const n = COMMUNITY_OPTIONS.filter((o) => o.category === cat && selectedCommunities.includes(o.id)).length;
                return <Segmentish key={cat} label={n > 0 ? `${cat} · ${n}` : cat} on={activeCommunityCategory === cat} onPress={() => setActiveCommunityCategory(cat)} />;
              })}
            </GHScrollView>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {COMMUNITY_OPTIONS.filter((item) => item.category === activeCommunityCategory).map((item) => (
                <Chip key={item.id} label={`${item.emoji ? item.emoji + " " : ""}${item.label}`} on={selectedCommunities.includes(item.id)} onPress={() => toggle(item.id, selectedCommunities, setSelectedCommunities)} />
              ))}
            </View>
          </Reveal>

          <Text style={[TYPE.small, { color: tc.textTertiary, textAlign: "center", marginTop: 24 }]}>Changes save as you go.</Text>
        </View>
      </KeyboardAvoidingView>
      )}
    </DPage>
  );
}

/** A category tab: outlined until chosen, then the accent tint (the chips below it are the choices). */
function Segmentish({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { tc } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }}
      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: on ? tc.accent : tc.borderMedium, backgroundColor: on ? tc.accentSoft : "transparent" }}>
      <Text style={[TYPE.label, { fontSize: 13, color: on ? tc.accentText : tc.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#F0F3F8" },
  content: { paddingBottom: rs(40) },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: rs(16), paddingVertical: rs(12),
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#EEF0F4",
  },
  backBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: "#F0F5FF", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: rs(18), fontWeight: "800", color: Colors.text.primary, letterSpacing: -0.3 },
  saveBtn: { paddingHorizontal: rs(22), paddingVertical: rs(9), borderRadius: rs(999), minWidth: 64, alignItems: "center" },
  saveBtnText: { fontSize: rs(13), fontWeight: "800", color: "#FFF" },

  avatarSection: { alignItems: "center", paddingVertical: rs(24), backgroundColor: "#FFF", marginBottom: 0 },
  avatarGrad: {
    width: rs(96), height: rs(96), borderRadius: rs(48),
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#FFF",
    shadowColor: Colors.brand.blue, shadowOpacity: 0.2, shadowRadius: rs(10),
    shadowOffset: { width: 0, height: rs(4) }, elevation: 8,
  },
  avatarImage: {
    width: rs(96), height: rs(96), borderRadius: rs(48),
    borderWidth: 3, borderColor: "#FFF",
    elevation: 8,
  },
  avatarInitials: { fontSize: rs(32), fontWeight: "900", color: "#FFF" },
  cameraBadge: {
    position: "absolute", bottom: rs(2), right: rs(2),
    width: rs(28), height: rs(28), borderRadius: rs(14),
    backgroundColor: Colors.brand.blue,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#FFF", elevation: 5,
  },
  changePhotoBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    marginTop: rs(12), paddingHorizontal: rs(16), paddingVertical: rs(8),
    borderRadius: rs(999), backgroundColor: Colors.brand.blueLight,
    borderWidth: 1, borderColor: "#D6E8FF",
  },
  changePhotoText: { fontSize: rs(13), fontWeight: "700", color: Colors.brand.blue },
  photoHint: { fontSize: rs(11), color: Colors.text.tertiary, marginTop: rs(6) },

  sectionLabel: {
    fontSize: rs(11), fontWeight: "700", color: "#8FA0B4",
    letterSpacing: 1.2, marginTop: rs(22), marginBottom: rs(10), paddingHorizontal: rs(16),
  },
  section: {
    marginHorizontal: rs(16), backgroundColor: "#FFF",
    borderRadius: rs(16), borderWidth: 1, borderColor: "#ECEEF2",
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(2) }, elevation: 2,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#EDF2F8", marginHorizontal: rs(14) },
  inputGroup: { padding: rs(14) },
  inputLabel: { fontSize: rs(10), fontWeight: "800", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: rs(5) },
  input: { fontSize: rs(15), color: Colors.text.primary, fontWeight: "600", padding: 0 },

  bioInput: { padding: rs(14), fontSize: rs(14), color: Colors.text.primary, fontWeight: "600", minHeight: 80, textAlignVertical: "top", lineHeight: rs(20) },
  charCount: { textAlign: "right", paddingRight: rs(14), paddingBottom: rs(10), fontSize: rs(11), fontWeight: "600", color: Colors.text.tertiary },

  chipSection: { flexDirection: "row", flexWrap: "wrap", gap: rs(8), paddingHorizontal: rs(16) },
  chip: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    paddingHorizontal: rs(12), paddingVertical: rs(8), borderRadius: rs(12),
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#ECEEF2",
  },
  chipActive: { backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue },
  chipText: { fontSize: rs(13), fontWeight: "600", color: Colors.text.secondary },
  chipTextActive: { color: Colors.brand.blue, fontWeight: "700" },
  communityEmoji: { fontSize: rs(15) },

  // Culture chips (wider card style)
  cultureChip: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    paddingHorizontal: rs(14), paddingVertical: rs(10), borderRadius: rs(14),
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#ECEEF2",
    width: "47%",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: rs(4), elevation: 1,
  },
  cultureChipActive: { backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue },
  cultureEmoji: { fontSize: rs(22) },
  cultureLabel: { fontSize: rs(13), fontWeight: "700", color: Colors.text.primary },
  cultureLabelActive: { color: Colors.brand.blue },
  cultureDesc: { fontSize: rs(10), color: Colors.text.tertiary, marginTop: rs(1) },

  // Interest chips (full-width card style)
  interestChip: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    paddingHorizontal: rs(14), paddingVertical: rs(11), borderRadius: rs(14),
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#ECEEF2",
    width: "100%",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: rs(4), elevation: 1,
  },
  interestChipActive: { backgroundColor: "#F0FFF4", borderColor: Colors.brand.green },
  interestIcon: { fontSize: rs(22) },
  interestLabel: { fontSize: rs(14), fontWeight: "700", color: Colors.text.primary },
  interestLabelActive: { color: Colors.brand.green },
  interestDesc: { fontSize: rs(11), color: Colors.text.tertiary, marginTop: rs(1) },

  // Community category filter tabs
  categoryTabRow: { paddingHorizontal: rs(16), gap: rs(8) },
  categoryTab: {
    flexDirection: "row", alignItems: "center", gap: rs(5),
    paddingHorizontal: rs(14), paddingVertical: rs(7), borderRadius: rs(999),
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#ECEEF2",
  },
  categoryTabActive: { backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue },
  categoryTabText: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary },
  categoryTabTextActive: { color: Colors.brand.blue, fontWeight: "700" },
  categoryBadge: {
    width: rs(17), height: rs(17), borderRadius: rs(9), backgroundColor: Colors.brand.blue,
    alignItems: "center", justifyContent: "center",
  },
  categoryBadgeText: { fontSize: rs(9), fontWeight: "800", color: "#FFF" },

  communitySelectedRow: { marginHorizontal: rs(16), marginTop: rs(10), paddingVertical: rs(8) },
  communitySelectedLabel: { fontSize: rs(12), fontWeight: "600", color: Colors.text.tertiary, textAlign: "center" },

  gradientBtn: {
    marginHorizontal: rs(16), paddingVertical: rs(16), borderRadius: rs(16),
    alignItems: "center",
    shadowColor: Colors.brand.blue, shadowOpacity: 0.25, shadowRadius: rs(12),
    shadowOffset: { width: 0, height: rs(4) }, elevation: 6,
  },
  gradientBtnText: { fontSize: rs(16), fontWeight: "800", color: "#FFF", letterSpacing: 0.3 },
});
