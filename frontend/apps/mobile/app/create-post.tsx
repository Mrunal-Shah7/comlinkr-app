import { useEffect, useState, useRef } from "react"; // SPRINT-42: load authoritative post/listing data in edit mode.
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Animated,
  PanResponder, // SPRINT-42: implement dependency-free drag-to-reorder for listing images.
} from "react-native";

const { width: SW } = Dimensions.get("window");
// 2×2 grid: 16px padding each side, 14px gap between two columns
const GRID_GAP = 14;
const GRID_PAD = 16;
const GRID_CARD_W = Math.floor((SW - GRID_PAD * 2 - GRID_GAP) / 2);
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useAuthStore } from "../src/store/auth.store";
import { useRequireAuth } from "../src/shared/hooks/useRequireAuth";
import { useSidebarStore } from "../src/store/sidebar.store";
import { usePermissions } from "../src/shared/hooks/usePermissions";
import { createPost, getPost, updatePost, type FeedCategory, type UpdatePostPayload } from "../src/api/feed.api"; // SPRINT-42: reuse the composer for complete feed editing.
import { createEvent, uploadEventImages } from "../src/api/events.api";
import { createListing, getListing, removeListingImage, reorderListingImages, updateListing, uploadListingImages, type HousingListingImageRef, type ListingStatus, type UpdateListingPayload } from "../src/api/housing.api"; // SPRINT-42: add complete listing field and image editing.
import { formatPrice, getCurrencyForCountry } from "../src/utils/currency";
import { createSharedSpace, uploadSharedSpaceImages } from "../src/api/roommates.api";
import { getBusinessCurrency } from "../src/utils/currency";
import { createRestaurant, getRestaurants, submitReview, uploadRestaurantImages } from "../src/api/food.api";
import { createStory, type StoryMediaTypeApi, type StoryCategoryApi } from "../src/api/stories.api";
import { createChallenge, type ChallengeDurationApi, type ChallengeTypeApi } from "../src/api/challenges.api";
import { ApiError } from "../src/api/client";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from "react-native-svg";
import { DatePickerField, TimePickerField } from "../components/DateTimePickerField";
import { FadeImage } from "../components/FadeImage"; // SPRINT-42: render all persisted edit media through the shared image component.
import { File } from "expo-file-system"; // SPRINT-42: resolve image byte size when the picker omits fileSize.
import { appAlert } from '../src/shared/ui/Dialogs';

type AttachedMedia = {
  uri: string;
  name: string;
  mediaType: "photo" | "video";
  duration?: number;
  mimeType?: string; // SPRINT-42: validate listing image type before upload.
  fileSize?: number; // SPRINT-42: enforce the 5 MiB listing image limit client-side.
};

const SPRINT_42_MAX_IMAGE_BYTES = 5 * 1024 * 1024; // SPRINT-42: mirror the backend per-image limit.
const SPRINT_42_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]); // SPRINT-42: mirror accepted backend formats.
const FEED_TO_NEWS_LABEL: Record<FeedCategory, string> = { COMMUNITY: "Community", ANNOUNCEMENT: "Announcement", JOBS: "Jobs", ALERT: "Alert", DISCUSSION: "Discussion", QUESTION: "Question", TIP: "Tip" }; // SPRINT-42: prefill the existing category selector from API enums.

function propertyTypeToLabel(value: string): string { // SPRINT-42: prefill listing property type chips.
  return value === "HOUSE" ? "House" : value === "STUDIO" ? "Studio" : value === "ROOM" ? "Room" : "Apartment"; // SPRINT-42: map canonical backend enum to UI label.
} // SPRINT-42: end property type mapping.

function normalizeAvailableDateValue(value: unknown): string | undefined { // SPRINT-42: compare and PATCH availability as YYYY-MM-DD only.
  if (value == null || value === "") return undefined; // SPRINT-42: treat null/empty as unset.
  const raw = String(value).trim(); // SPRINT-42: accept ISO timestamps or date-only strings.
  if (!raw) return undefined; // SPRINT-42: blank after trim is unset.
  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})/); // SPRINT-42: strip time portion from API ISO strings.
  if (isoPrefix) return isoPrefix[1]; // SPRINT-42: keep the calendar date only.
  return parseFlexibleDateToIsoDate(raw) || undefined; // SPRINT-42: parse flexible UI date strings consistently.
} // SPRINT-42: end available-date normalizer.

function normalizeListingCompareValue(value: unknown): unknown { // SPRINT-42: make null/undefined/empty optional fields compare equal.
  if (value === null || value === undefined) return undefined; // SPRINT-42: collapse nullish empties.
  if (typeof value === "string" && value.trim() === "") return undefined; // SPRINT-42: collapse blank strings.
  if (Array.isArray(value) && value.length === 0) return undefined; // SPRINT-42: collapse empty arrays.
  return value; // SPRINT-42: keep concrete values.
} // SPRINT-42: end listing compare normalizer.

function listingFieldsEqual(a: unknown, b: unknown): boolean { // SPRINT-42: dirty-check with normalized empties.
  return JSON.stringify(normalizeListingCompareValue(a)) === JSON.stringify(normalizeListingCompareValue(b)); // SPRINT-42: structural compare after normalization.
} // SPRINT-42: end listing field equality helper.

function buildDirtyListingPayload(current: UpdateListingPayload, original: Record<string, unknown>): UpdateListingPayload { // SPRINT-42: emit only real changes with JSON-safe values.
  const dirty: Record<string, unknown> = {}; // SPRINT-42: accumulate present dirty keys only.
  for (const [key, value] of Object.entries(current)) { // SPRINT-42: walk every normalized current field.
    const prior = original[key]; // SPRINT-42: read the loaded baseline value.
    if (listingFieldsEqual(value, prior)) continue; // SPRINT-42: skip untouched fields including null vs undefined empties.
    if (value !== undefined && value !== null) { // SPRINT-42: keep concrete dirty values.
      dirty[key] = value; // SPRINT-42: include the changed field.
      continue; // SPRINT-42: next field.
    } // SPRINT-42: finish concrete dirty branch.
    if (typeof prior === "string" || (typeof normalizeListingCompareValue(prior) === "string")) { // SPRINT-42: clear prior string fields with an empty string the DTO accepts.
      dirty[key] = ""; // SPRINT-42: send an explicit clear rather than an omitted key.
    } else if (Array.isArray(prior)) { // SPRINT-42: clear prior array fields with an empty array.
      dirty[key] = []; // SPRINT-42: send an explicit empty amenities/tags clear.
    } // SPRINT-42: numeric clears are omitted because PartialType ignores undefined.
  } // SPRINT-42: finish dirty walk.
  return dirty as UpdateListingPayload; // SPRINT-42: return a body safe for JSON.stringify.
} // SPRINT-42: end dirty listing payload builder.

async function resolveListingImageByteSize(asset: { uri: string; fileSize?: number | null }): Promise<number | null> { // SPRINT-42: never assume zero when picker size is missing.
  if (typeof asset.fileSize === "number" && Number.isFinite(asset.fileSize) && asset.fileSize > 0) { // SPRINT-42: trust a positive picker-reported size.
    return asset.fileSize; // SPRINT-42: use the picker size.
  } // SPRINT-42: finish picker-size branch.
  try { // SPRINT-42: fall back to expo-file-system File metadata.
    const file = new File(asset.uri); // SPRINT-42: open the local picked URI.
    if (!file.exists) return null; // SPRINT-42: cannot measure a missing file safely.
    const size = file.size; // SPRINT-42: read bytes; 0 means unread/unreadable per expo-file-system.
    if (!size || size <= 0) return null; // SPRINT-42: surface inability instead of treating unread as zero.
    return size; // SPRINT-42: return measured bytes.
  } catch { // SPRINT-42: treat filesystem failures as undetermined.
    return null; // SPRINT-42: caller must reject undetermined size.
  } // SPRINT-42: finish filesystem size lookup.
} // SPRINT-42: end image byte-size resolver.

async function sprint42ImageError(asset: { uri: string; mimeType?: string | null; fileSize?: number | null }): Promise<string | null> { // SPRINT-42: validate selected listing media before multipart upload.
  const mime = asset.mimeType?.toLowerCase() || mimeForListingImage(asset.uri); // SPRINT-42: infer a MIME only when the picker omits it.
  if (!SPRINT_42_IMAGE_MIMES.has(mime)) return "Only JPEG, PNG, and WebP images are supported."; // SPRINT-42: reject unsupported image formats.
  const bytes = await resolveListingImageByteSize(asset); // SPRINT-42: require a real measured size before upload.
  if (bytes == null) return "Could not determine this image’s size. Please choose another photo."; // SPRINT-42: do not assume zero when size is unknown.
  if (bytes > SPRINT_42_MAX_IMAGE_BYTES) return "Each image must be 5 MiB or smaller."; // SPRINT-42: reject oversized images before network work.
  return null; // SPRINT-42: accept a valid image.
} // SPRINT-42: end listing image validation.

function DraggableListingImage({ image, index, count, onMove, onRemove, busy }: { image: HousingListingImageRef; index: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void; busy: boolean }) { // SPRINT-42: horizontal PanResponder reorder tile.
  const dragX = useRef(new Animated.Value(0)).current; // SPRINT-42: track the active drag translation.
  const indexRef = useRef(index); // SPRINT-42: keep drop math on the latest index.
  const countRef = useRef(count); // SPRINT-42: keep clamping on the latest complete length.
  const busyRef = useRef(busy); // SPRINT-42: block concurrent drags while imageBusy.
  const onMoveRef = useRef(onMove); // SPRINT-42: call the latest reorder handler.
  indexRef.current = index; // SPRINT-42: sync index each render without recreating the responder.
  countRef.current = count; // SPRINT-42: sync count each render.
  busyRef.current = busy; // SPRINT-42: sync busy each render.
  onMoveRef.current = onMove; // SPRINT-42: sync handler each render.
  const responder = useRef(PanResponder.create({ // SPRINT-42: use the built-in gesture responder without a package.
    onMoveShouldSetPanResponder: (_, gesture) => !busyRef.current && Math.abs(gesture.dx) > 6, // SPRINT-42: start only when idle and the drag is intentional.
    onPanResponderGrant: () => { // SPRINT-42: abort grant if a mutation started between shouldSet and grant.
      if (busyRef.current) dragX.setValue(0); // SPRINT-42: reset if busy won the race.
    }, // SPRINT-42: finish grant guard.
    onPanResponderMove: Animated.event([null, { dx: dragX }], { useNativeDriver: false }), // SPRINT-42: move the tile with the finger.
    onPanResponderRelease: (_, gesture) => { // SPRINT-42: convert the drop distance into a complete-order mutation.
      if (busyRef.current) { // SPRINT-42: ignore drops while another image mutation is in flight.
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start(); // SPRINT-42: settle without mutating order.
        return; // SPRINT-42: stop release handling.
      } // SPRINT-42: finish busy release guard.
      const from = indexRef.current; // SPRINT-42: use the live index for this tile.
      const total = countRef.current; // SPRINT-42: use the live complete image count.
      const delta = Math.round(gesture.dx / 98); // SPRINT-42: one thumbnail plus gap is approximately 98 points.
      const target = Math.max(0, Math.min(total - 1, from + delta)); // SPRINT-42: clamp the destination to valid image positions.
      Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start(); // SPRINT-42: settle the dragged tile after drop.
      if (target !== from) onMoveRef.current(from, target); // SPRINT-42: optimistically reorder only when the index changed.
    }, // SPRINT-42: finish drop handler.
    onPanResponderTerminate: () => Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start(), // SPRINT-42: reset interrupted drags.
  })).current; // SPRINT-42: keep one responder; refs supply fresh values.
  return ( // SPRINT-42: render persisted image controls.
    <Animated.View {...responder.panHandlers} style={{ width: 88, transform: [{ translateX: dragX }], zIndex: 2, opacity: busy ? 0.7 : 1 }}>
    {/* SPRINT-42: expose drag gestures on the whole tile and dim while busy. */}
      <FadeImage uri={image.url} style={{ width: 88, height: 88, borderRadius: 12 }} />
      {/* SPRINT-42: shared FadeImage preserves the backend image order. */}
      {index === 0 ? <View style={{ position: "absolute", left: 4, bottom: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: "#FFF", fontSize: 9, fontWeight: "800" }}>Primary photo</Text></View> : null}
      {/* SPRINT-42: clearly label the first persisted image. */}
      <Pressable disabled={busy} onPress={onRemove} style={{ position: "absolute", right: -5, top: -5, borderRadius: 12, backgroundColor: "#111827", padding: 4, opacity: busy ? 0.5 : 1 }}>
      {/* SPRINT-42: remove images independently from listing details. */}
        <Ionicons name="trash-outline" size={13} color="#FFF" />
        {/* SPRINT-42: identify the immediate remove action. */}
      </Pressable>
      {/* SPRINT-42: close remove control. */}
    </Animated.View> // SPRINT-42: close draggable image tile.
  ); // SPRINT-42: finish tile rendering.
} // SPRINT-42: end drag image component.

// ── Canonical post type palette (matches AppHeader CREATE_OPTIONS) ─────────────
const POST_TYPES = [
  {
    id: "news",
    icon: "newspaper-outline" as const,
    label: "News Post",
    desc: "Share updates & announcements",
    color: "#1A6BAE",
    bg: "#E3EDF6",
    gradient: ["#1A6BAE", "#0054CC"] as [string, string],
  },
  {
    id: "event",
    icon: "calendar-outline" as const,
    label: "Create Event",
    desc: "Organize a local event or meetup",
    color: "#257A86",
    bg: "#E2F0F1",
    gradient: ["#257A86", "#E56800"] as [string, string],
  },
  {
    id: "listing",
    icon: "home-outline" as const,
    label: "Add Listing",
    desc: "List your property for rent or sale",
    color: "#1A6BAE",
    bg: "#E3EDF6",
    gradient: ["#1A6BAE", "#0054CC"] as [string, string],
  },
  {
    id: "shared_space",
    icon: "people-circle-outline" as const,
    label: "List a Space",
    desc: "Offer a room or shared space for co-living",
    color: "#257A86",
    bg: "#FFF3E8",
    gradient: ["#257A86", "#E56800"] as [string, string],
  },
  {
    id: "restaurant",
    icon: "restaurant-outline" as const,
    label: "List My Restaurant",
    desc: "Register your restaurant on ComLinkr",
    color: "#30855B",
    bg: "#E3F1EA",
    gradient: ["#30855B", "#256B49"] as [string, string],
  },
  {
    id: "story",
    icon: "videocam-outline" as const,
    label: "Add Story",
    desc: "Upload a photo or video",
    color: "#1A6BAE",
    bg: "#E3EDF6",
    gradient: ["#1A6BAE", "#30855B"] as [string, string],
  },
  {
    id: "challenge",
    icon: "trophy-outline" as const,
    label: "Create Challenge",
    desc: "Start an interactive community challenge",
    color: "#257A86",
    bg: "#E2F0F1",
    gradient: ["#257A86", "#1A6BAE"] as [string, string],
  },
];

type PostType = typeof POST_TYPES[0];

const ALL_CATEGORIES = [
  "Community", "Events", "Food", "Housing", "Culture", "Local News", "Announcement",
  "Jobs", "Alert", "Discussion", "Question", "Tip", "Social", "Sports", "Music",
  "Arts", "Tech", "Health", "Education", "Fitness", "Explore", "Creative", "Green", "Trivia"
];

// Stories only support these 5 categories on the backend (see StoryCategoryApi) —
// showing ALL_CATEGORIES here would silently mis-file the story under "Culture".
const STORY_CATEGORY_OPTIONS = ["Events", "Food", "Housing", "Culture", "Local News"];

const NEWS_LABEL_TO_FEED: Record<string, FeedCategory> = {
  Community: "COMMUNITY",
  Announcement: "ANNOUNCEMENT",
  Jobs: "JOBS",
  Alert: "ALERT",
  Discussion: "DISCUSSION",
  Question: "QUESTION",
  Tip: "TIP",
};

function parseFlexibleDateToIsoDate(input: string): string | null {
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

function mapEventCategoryLabel(label: string): string {
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

function mapEventFormatLabel(label: string): string {
  if (label === "Virtual") return "VIRTUAL";
  if (label === "Hybrid") return "HYBRID";
  return "IN_PERSON";
}

function mapPropertyTypeLabel(label: string): "APARTMENT" | "HOUSE" | "STUDIO" | "ROOM" {
  if (label === "House") return "HOUSE";
  if (label === "Studio") return "STUDIO";
  if (label === "Room") return "ROOM";
  return "APARTMENT";
}

function mapStoryMediaUi(ui: "photo" | "video"): StoryMediaTypeApi {
  return ui === "photo" ? "PHOTO" : "VIDEO";
}

function mapStoryCategoryLabel(label: string): StoryCategoryApi {
  const m: Record<string, StoryCategoryApi> = {
    "events": "EVENTS", "food": "FOOD", "housing": "HOUSING",
    "culture": "CULTURE", "local news": "LOCAL_NEWS",
  };
  return m[label.toLowerCase()] ?? "CULTURE";
}

function mapChallengeTypeLabel(label: string): ChallengeTypeApi {
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

function mapChallengeDurationLabel(label: string): ChallengeDurationApi {
  const m: Record<string, ChallengeDurationApi> = {
    "1 Day": "ONE_DAY",
    "3 Days": "THREE_DAYS",
    "1 Week": "ONE_WEEK",
    "2 Weeks": "TWO_WEEKS",
    "1 Month": "ONE_MONTH",
  };
  return m[label] || "ONE_WEEK";
}

function mapRestaurantPriceChip(chip: string): "BUDGET" | "MODERATE" | "PREMIUM" | "LUXURY" {
  if (chip.includes("$$$$")) return "LUXURY";
  if (chip.includes("$$$") && !chip.includes("$$$$")) return "PREMIUM";
  if (chip.includes("$$") && !chip.includes("$$$")) return "MODERATE";
  return "BUDGET";
}

function splitHashtagInput(raw: string): string[] {
  return raw
    .split(/[,]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((s) => s.replace(/^#+/, "").trim())
    .filter(Boolean);
}

function parseReviewStars(label: string): number | null {
  const m: Record<string, number> = {
    "★★★★★ Excellent": 5,
    "★★★★ Great": 4,
    "★★★ Good": 3,
    "★★ Fair": 2,
    "★ Poor": 1,
  };
  return m[label] ?? null;
}

function mimeForListingImage(uri: string): string {
  const u = uri.toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

// ── Chip selectors ─────────────────────────────────────────────────────────────
function ChipSelect({
  options,
  value,
  onChange,
  color,
  bg,
  scroll,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  color: string;
  bg: string;
  /** One horizontally scrolling row instead of a tall wrapping block (long category lists). */
  scroll?: boolean;
}) {
  const { tc, isDark } = useTheme();
  const activeBg = isDark ? color + "2E" : bg;
  const Wrap = scroll ? ScrollView : View;
  const wrapProps = scroll
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: ch.scrollRow }
    : { style: ch.row };
  return (
    <Wrap {...(wrapProps as any)}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            style={[ch.chip, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, active && { backgroundColor: activeBg, borderColor: color }]}
            onPress={() => onChange(active ? "" : opt)}
          >
            <Text style={[ch.chipText, { color: tc.textSecondary }, active && { color, fontWeight: "700" }]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </Wrap>
  );
}

function ChipMulti({
  options,
  value,
  onChange,
  color,
  bg,
  scroll,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  color: string;
  bg: string;
  /** One horizontally scrolling row instead of a tall wrapping block (long category lists). */
  scroll?: boolean;
}) {
  const { tc, isDark } = useTheme();
  const activeBg = isDark ? color + "2E" : bg;
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((x) => x !== opt) : [...value, opt]);
  };
  const Wrap = scroll ? ScrollView : View;
  const wrapProps = scroll
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: ch.scrollRow }
    : { style: ch.row };
  return (
    <Wrap {...(wrapProps as any)}>
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <Pressable
            key={opt}
            style={[ch.chip, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, active && { backgroundColor: activeBg, borderColor: color }]}
            onPress={() => toggle(opt)}
          >
            {active && (
              <Ionicons name="checkmark" size={12} color={color} style={{ marginRight: 2 }} />
            )}
            <Text style={[ch.chipText, { color: tc.textSecondary }, active && { color, fontWeight: "700" }]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </Wrap>
  );
}

const ch = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scrollRow: { flexDirection: "row", gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E0E5EF",
    backgroundColor: "#F5F7FB",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5A6A7E",
  },
});

// ── Horizontal image thumbnail strip (restaurant / multi-photo posts) ─────────
function ImageThumbnailStrip({
  files,
  onRemove,
}: {
  files: AttachedMedia[];
  onRemove: (index: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4, paddingBottom: 4 }}
      style={{ marginBottom: 8 }}
    >
      {files.map((file, i) => (
        <View key={i} style={{ width: 100, height: 80, borderRadius: 12, overflow: "hidden", position: "relative" }}>
          <FadeImage uri={file.uri} style={{ width: "100%" as any, height: "100%" as any }} cachePolicy="memory" />
          {/* SPRINT-42: use shared FadeImage for selected media thumbnails. */}
          {file.mediaType === "video" && (
            <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" }}>
              <Ionicons name="play-circle" size={26} color="#FFF" />
            </View>
          )}
          <Pressable
            onPress={() => onRemove(i)}
            hitSlop={6}
            style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10 }}
          >
            <Ionicons name="close-circle" size={20} color="#FFF" />
          </Pressable>
          <View style={{ position: "absolute", bottom: 4, left: 4, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, color: "#FFF", fontWeight: "700" }}>{i + 1}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Attached file row ──────────────────────────────────────────────────────────
function AttachedFile({
  index,
  color,
  bg,
  uri,
  fileName,
  mediaType,
  duration,
  fileSize,
  onRemove,
}: {
  index: number;
  color: string;
  bg: string;
  uri: string;
  fileName: string;
  mediaType: "photo" | "video";
  duration?: number;
  fileSize?: number;
  onRemove: () => void;
}) {
  const sizeLabel =
    typeof fileSize === "number" && Number.isFinite(fileSize) && fileSize > 0
      ? `${(fileSize / 1024 / 1024).toFixed(1)}MB`
      : "—";
  return (
    <View style={[af.file, { backgroundColor: bg, borderColor: color + "40" }]}>
      <View style={af.thumb}>
        <FadeImage uri={uri} style={af.thumbImg} cachePolicy="memory" />
        {/* SPRINT-42: use shared FadeImage for attached file thumbnails. */}
        {mediaType === "video" && (
          <View style={af.videoOverlay}>
            <Ionicons name="play-circle" size={18} color="#FFF" />
            <Text style={af.videoLabel}>{duration ? `${Math.round(duration)}s` : "Video"}</Text>
          </View>
        )}
      </View>
      <Text style={[af.fileName, { color }]} numberOfLines={1}>
        {fileName}
      </Text>
      <Text style={af.fileSize}>{sizeLabel}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close-circle" size={18} color={color} />
      </Pressable>
    </View>
  );
}
const af = StyleSheet.create({
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: {
    width: "100%" as any,
    height: "100%" as any,
  },
  videoOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopLeftRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoLabel: {
    fontSize: 9,
    color: "#FFF",
    fontWeight: "700",
  },
  fileName: { flex: 1, fontSize: 13, fontWeight: "700" },
  fileSize: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
});

// ── Preview modal ──────────────────────────────────────────────────────────────
function PreviewModal({
  visible,
  onClose,
  type,
  title,
  body,
  attachedFiles,
  extraFields,
  location,
  userName,
  userInitials,
  // story-specific
  storyMediaType,
  storyCategory,
  storyHashtags,
  storyDuration,
  // event-specific
  eventDate,
  eventTime,
  eventCategory,
  // challenge-specific
  challengeType,
  challengeDuration,
  challengeGoal,
  challengeReward,
  challengeMaxParticipants,
  challengeHashtags,
  // listing-specific
  listingPrice,
  listingCurrency,
  listingDeposit,
  listingAvailable,
  listingAmenities,
  listingWalkScore,
  listingTransitInfo,
  listingIsVerified,
  // restaurant-specific
  restCuisine,
  restPriceRange,
  restFeatures,
}: {
  visible: boolean;
  onClose: () => void;
  type: PostType;
  title: string;
  body: string;
  attachedFiles: AttachedMedia[];
  extraFields: { label: string; value: string; icon: string }[];
  location?: string;
  userName: string;
  userInitials: string;
  storyMediaType?: string;
  storyCategory?: string;
  storyHashtags?: string;
  storyDuration?: string;
  eventDate?: string;
  eventTime?: string;
  eventCategory?: string;
  challengeType?: string;
  challengeDuration?: string;
  challengeGoal?: string;
  challengeReward?: string;
  challengeMaxParticipants?: string;
  challengeHashtags?: string;
  listingPrice?: string;
  listingCurrency?: string;
  listingDeposit?: string;
  listingAvailable?: string;
  listingAmenities?: string[];
  listingWalkScore?: string;
  listingTransitInfo?: string;
  listingIsVerified?: boolean;
  restCuisine?: string;
  restPriceRange?: string;
  restFeatures?: string[];
}) {
  const { isDark, tc } = useTheme();
  const renderStoryPreview = () => (
    <View style={[pv.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      {/* Story image */}
      <View style={[pv.storyImgWrap, { backgroundColor: "#0A2540" }]}>
        {attachedFiles.length > 0 ? (
          <View style={pv.storyImgPlaceholder}>
            <FadeImage uri={attachedFiles[0].uri} style={{ width: "100%" as any, height: "100%" as any }} cachePolicy="memory" />
            {/* SPRINT-42: use shared FadeImage for story preview media. */}
            {attachedFiles.length > 1 && (
              <View style={pv.imgCountBadge}>
                <Ionicons name="images" size={11} color="#FFF" />
                <Text style={pv.imgCountText}>+{attachedFiles.length - 1}</Text>
              </View>
            )}
          </View>
        ) : (
          <LinearGradient
            colors={type.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={pv.storyImgPlaceholder}
          >
            <Ionicons
              name={storyMediaType === "video" ? "videocam" : "image"}
              size={42}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={pv.storyImgLabel}>
              {storyMediaType === "video" ? "Your video / story will appear here" : "Your photo will appear here"}
            </Text>
          </LinearGradient>
        )}
        {/* Duration badge — photos omit seconds */}
        <View style={pv.storyDurBadge}>
          <Ionicons name={storyMediaType === "video" ? "videocam" : "image"} size={10} color="#FFF" />
          <Text style={pv.storyDurText}>
            {storyMediaType === "video" ? `${storyDuration || "30"}s` : "Photo"}
          </Text>
        </View>
        {/* NEW badge */}
        <View style={pv.storyNewBadge}>
          <Text style={pv.storyNewText}>NEW</Text>
        </View>
      </View>
      {/* Body */}
      <View style={pv.storyBody}>
        <View style={pv.storyAuthorRow}>
          <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.storyAv}>
            <Text style={{ fontSize: 11, fontWeight: "900", color: "#FFF" }}>{userInitials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[pv.storyAuthorName, { color: tc.textPrimary }]}>{userName}</Text>
              <Ionicons name="checkmark-circle" size={13} color="#60A5FA" />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={pv.storyTime}>Just now</Text>
              {storyCategory ? (
                <>
                  <View style={[pv.storyCatDot, { backgroundColor: type.color }]} />
                  <Text style={[pv.storyCatLabel, { color: type.color }]}>{storyCategory}</Text>
                </>
              ) : null}
            </View>
          </View>
          <Ionicons name="bookmark-outline" size={20} color="#9CA3AF" />
        </View>
        <Text style={[pv.storyTitle, { color: tc.textPrimary }]} numberOfLines={2}>
          {title.trim() ? title : "Story"}
        </Text>
        {body.trim() ? (
          <Text style={[pv.storyDesc, { color: tc.textSecondary }]} numberOfLines={2}>
            {body}
          </Text>
        ) : null}
        {/* Hashtags */}
        {storyHashtags ? (
          <View style={pv.storyHashRow}>
            {storyHashtags.split(",").map((h, i) => (
              <Text key={i} style={pv.storyHash}>{h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`}</Text>
            ))}
          </View>
        ) : null}
        {/* Engagement */}
        <View style={pv.storyEngBar}>
          <View style={pv.storyEngItem}>
            <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
            <Text style={pv.storyEngText}>0</Text>
          </View>
          <View style={pv.storyEngItem}>
            <Ionicons name="chatbubble-outline" size={15} color="#9CA3AF" />
            <Text style={pv.storyEngText}>0</Text>
          </View>
          <View style={pv.storyEngItem}>
            <Ionicons name="share-social-outline" size={15} color="#9CA3AF" />
            <Text style={pv.storyEngText}>0</Text>
          </View>
          <View style={pv.storyEngItem}>
            <Ionicons name="eye-outline" size={15} color="#9CA3AF" />
            <Text style={pv.storyEngText}>0</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ── Event-specific preview ──
  const renderEventPreview = () => (
    <View style={pv.eventCard}>
      {/* Big image area */}
      {attachedFiles.length > 0 ? (
        <View style={pv.eventImg}>
          <FadeImage uri={attachedFiles[0].uri} style={{ width: "100%" as any, height: "100%" as any }} cachePolicy="memory" />
          {/* SPRINT-42: use shared FadeImage for event preview media. */}
          {attachedFiles.length > 1 && (
            <View style={pv.imgCountBadge}>
              <Ionicons name="images" size={11} color="#FFF" />
              <Text style={pv.imgCountText}>+{attachedFiles.length - 1}</Text>
            </View>
          )}
        </View>
      ) : (
        <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.eventImg}>
          <Ionicons name="calendar" size={48} color="rgba(255,255,255,0.3)" />
        </LinearGradient>
      )}
      {/* Overlay content */}
      <LinearGradient
        colors={["transparent", "rgba(4,12,24,0.88)"]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
        style={pv.eventOverlay}
      >
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          <View style={[pv.eventCatBadge, { backgroundColor: type.bg }]}>
            <Text style={[pv.eventCatText, { color: type.color }]}>{eventCategory || "Event"}</Text>
          </View>
          {eventDate ? (
            <View style={pv.eventDateBadge}>
              <Ionicons name="calendar-outline" size={11} color="#FFF" />
              <Text style={pv.eventDateText}>{eventDate}</Text>
            </View>
          ) : null}
        </View>
        <Text style={pv.eventTitle} numberOfLines={2}>{title || "Your event title..."}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 }}>
          {eventTime ? (
            <>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.75)" />
              <Text style={pv.eventMeta}>{eventTime}</Text>
              <View style={pv.eventDot} />
            </>
          ) : null}
          {location ? (
            <>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.75)" />
              <Text style={pv.eventMeta}>{location}</Text>
            </>
          ) : null}
        </View>
        {/* Action row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="people" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>0 going</Text>
          </View>
          <View style={pv.eventIntBtn}>
            <Ionicons name="star-outline" size={14} color="#FFF" />
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFF" }}>Interested</Text>
          </View>
          <View style={{ borderRadius: 18, overflow: "hidden" }}>
            <LinearGradient colors={["#257A86", "#E56800"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pv.eventRsvp}>
              <Text style={{ fontSize: 11, fontWeight: "900", color: "#FFF", letterSpacing: 0.5 }}>RSVP</Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  // ── Challenge-specific preview ──
  const renderChallengePreview = () => (
    <View style={pv.challengeCard}>
      {/* Header gradient */}
      <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pv.challengeHeader}>
        <View style={pv.challengeHeaderDecor1} />
        <View style={pv.challengeHeaderDecor2} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <View style={pv.challengeTypePill}>
            <Ionicons name="trophy" size={11} color="#257A86" />
            <Text style={pv.challengeTypeText}>{challengeType || "CHALLENGE"}</Text>
          </View>
          {challengeDuration ? (
            <View style={pv.challengeDurPill}>
              <Ionicons name="time-outline" size={11} color="#FFF" />
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFF" }}>{challengeDuration}</Text>
            </View>
          ) : null}
        </View>
        <Text style={pv.challengeTitle} numberOfLines={2}>{title || "Your challenge title..."}</Text>
        {location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>{location}</Text>
          </View>
        ) : null}
      </LinearGradient>
      {/* Body */}
      <View style={[pv.challengeBody, { backgroundColor: tc.cardBg }]}>
        {/* Author */}
        <View style={pv.challengeAuthorRow}>
          <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.challengeAv}>
            <Text style={{ fontSize: 10, fontWeight: "900", color: "#FFF" }}>{userInitials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[pv.challengeAuthorName, { color: tc.textPrimary }]}>{userName}</Text>
            <Text style={[pv.challengeAuthorTime, { color: tc.textTertiary }]}>Just now · Preview</Text>
          </View>
          <View style={[pv.challengeStatusPill, { backgroundColor: "#DCFCE7" }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" }} />
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#15803D" }}>Active</Text>
          </View>
        </View>
        <Text style={[pv.challengeDesc, { color: tc.textSecondary }]} numberOfLines={3}>{body || "Challenge details will appear here..."}</Text>

        {/* Info chips */}
        <View style={pv.challengeInfoGrid}>
          {challengeGoal ? (
            <View style={[pv.challengeInfoChip, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="flag" size={12} color="#257A86" />
              <Text style={[pv.challengeInfoText, { color: "#C2410C" }]}>{challengeGoal}</Text>
            </View>
          ) : null}
          {challengeReward ? (
            <View style={[pv.challengeInfoChip, { backgroundColor: "#FEF9C3" }]}>
              <Ionicons name="gift" size={12} color="#CA8A04" />
              <Text style={[pv.challengeInfoText, { color: "#A16207" }]}>{challengeReward}</Text>
            </View>
          ) : null}
          {challengeMaxParticipants ? (
            <View style={[pv.challengeInfoChip, { backgroundColor: "#E3EDF6" }]}>
              <Ionicons name="people" size={12} color="#1A6BAE" />
              <Text style={[pv.challengeInfoText, { color: "#0054CC" }]}>Max {challengeMaxParticipants}</Text>
            </View>
          ) : null}
        </View>

        {/* Hashtags */}
        {challengeHashtags ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {challengeHashtags.split(",").map((h, i) => (
              <Text key={i} style={{ fontSize: 12, fontWeight: "700", color: type.color }}>
                {h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Progress bar */}
        <View style={pv.challengeProgress}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6B7280" }}>Participants</Text>
            <Text style={{ fontSize: 11, fontWeight: "800", color: type.color }}>0 / {challengeMaxParticipants || "∞"}</Text>
          </View>
          <View style={pv.challengeBarBg}>
            <View style={[pv.challengeBarFill, { width: "0%", backgroundColor: type.color }]} />
          </View>
        </View>

        {/* Action buttons */}
        <View style={pv.challengeActions}>
          <View style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}>
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pv.challengeJoinBtn}>
              <Ionicons name="flash" size={15} color="#FFF" />
              <Text style={pv.challengeJoinText}>Join Challenge</Text>
            </LinearGradient>
          </View>
          <Pressable style={[pv.challengeShareBtn, { backgroundColor: isDark ? tc.inputBg : "#F3F4F6", borderColor: tc.borderLight }]}>
            <Ionicons name="share-social-outline" size={17} color={tc.textSecondary} />
          </Pressable>
          <Pressable style={[pv.challengeShareBtn, { backgroundColor: isDark ? tc.inputBg : "#F3F4F6", borderColor: tc.borderLight }]}>
            <Ionicons name="bookmark-outline" size={17} color={tc.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  // ── Listing-specific preview (matches Housing tab card) ──
  const renderListingPreview = () => {
    const bedsVal = extraFields.find((f) => f.label === "Beds")?.value ?? "";
    const bathsVal = extraFields.find((f) => f.label === "Baths")?.value ?? "";
    const sqftVal = extraFields.find((f) => f.label === "Sqft")?.value ?? "";
    const propTypeVal = extraFields.find((f) => f.label === "Type")?.value ?? "";
    const currSymbol = listingCurrency === "GBP" ? "£" : listingCurrency === "EUR" ? "€" : "$";
    const priceNum = parseFloat((listingPrice ?? "").replace(/,/g, ""));
    const priceStr = !Number.isNaN(priceNum) && priceNum > 0 ? `${currSymbol}${listingPrice}/mo` : "Price TBD";
    const depositStr = listingDeposit?.trim() ? `Deposit ${currSymbol}${listingDeposit}` : null;
    const availStr = listingAvailable?.trim() || null;
    const walkNum = parseInt(listingWalkScore ?? "", 10);
    const walkColor = !Number.isNaN(walkNum) ? (walkNum >= 90 ? "#16A34A" : walkNum >= 70 ? "#B45309" : "#DC2626") : "#1A6BAE";
    const walkBg = !Number.isNaN(walkNum) ? (walkNum >= 90 ? "#DCFCE7" : walkNum >= 70 ? "#FEF9C3" : "#FEE2E2") : "#E3EDF6";

    return (
      <View style={[pv.listCard, { borderColor: tc.borderLight }]}>
        {/* Image area with scrim overlay */}
        <View style={pv.listCardImgWrap}>
          {attachedFiles.length > 0 ? (
            <FadeImage uri={attachedFiles[0].uri} style={StyleSheet.absoluteFill} cachePolicy="memory" /> // SPRINT-42: use shared FadeImage for listing preview media.
          ) : (
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="home" size={52} color="rgba(255,255,255,0.3)" />
              </View>
            </LinearGradient>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.48)"]}
            style={pv.listImageScrim}
            pointerEvents="none"
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {propTypeVal ? (
                <View style={pv.listTypePill}>
                  <Text style={pv.listTypePillText}>{propTypeVal.toUpperCase()}</Text>
                </View>
              ) : null}
              {availStr === "Immediate" ? (
                <View style={pv.listAvailNowPill}>
                  <View style={pv.listAvailDot} />
                  <Text style={pv.listAvailNowText}>Available Now</Text>
                </View>
              ) : null}
            </View>
            <Text style={pv.listImagePrice}>{priceStr}</Text>
            {location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={pv.listImageLocation} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
          </LinearGradient>
          {/* NEW badge */}
          <View style={pv.listNewBadge}><Text style={pv.listNewBadgeText}>NEW</Text></View>
          {attachedFiles.length > 1 && (
            <View style={pv.imgCountBadge}>
              <Ionicons name="images" size={11} color="#FFF" />
              <Text style={pv.imgCountText}>+{attachedFiles.length - 1}</Text>
            </View>
          )}
        </View>

        {/* Card body */}
        <View style={[pv.listCardBody, { backgroundColor: tc.cardBg }]}>
          {/* Landlord bar */}
          <View style={pv.listLandlordBar}>
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.listAv}>
              <Text style={pv.listAvText}>{userInitials}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[pv.listLandlordName, { color: tc.textPrimary }]} numberOfLines={1}>{userName}</Text>
                {listingIsVerified ? (
                  <View style={pv.listVerifiedBadge}>
                    <Ionicons name="shield-checkmark" size={10} color="#30855B" />
                    <Text style={pv.listVerifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={pv.listChatBtn}>
              <Ionicons name="chatbubble-ellipses" size={13} color="#FFF" />
              <Text style={pv.listChatBtnText}>Chat</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[pv.listTitle, { color: tc.textPrimary }]} numberOfLines={2}>{title || "Property title..."}</Text>

          {/* Deposit + available row */}
          {(depositStr || availStr) ? (
            <View style={pv.listSubRow}>
              {depositStr ? (
                <View style={[pv.listDepositPill, { borderColor: tc.borderLight }]}>
                  <Ionicons name="card-outline" size={11} color="#6B7280" />
                  <Text style={pv.listDepositText}>{depositStr}</Text>
                </View>
              ) : null}
              {availStr ? (
                <View style={pv.listAvailImmPill}>
                  <View style={pv.listAvailDotSmall} />
                  <Text style={pv.listAvailImmText}>{availStr === "Immediate" ? "Available Immediately" : availStr}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 4-col stats grid */}
          {(bedsVal || bathsVal || sqftVal) ? (
            <View style={[pv.listStatsGrid, { borderColor: tc.borderLight }]}>
              {[
                { icon: "bed-outline" as const, val: bedsVal || "–", lbl: "Beds", bg: "#EEF5FF", color: "#1A6BAE" },
                { icon: "water-outline" as const, val: bathsVal || "–", lbl: "Baths", bg: "#E3F1EA", color: "#30855B" },
                { icon: "resize-outline" as const, val: sqftVal || "–", lbl: "Sqft", bg: "#E2F0F1", color: "#257A86" },
                { icon: "business-outline" as const, val: propTypeVal || "–", lbl: "Type", bg: "#E3EDF6", color: "#1A6BAE" },
              ].map((st, idx) => (
                <View key={st.lbl} style={[pv.listStatCell, idx < 3 && pv.listStatCellBorder, idx < 3 && { borderRightColor: tc.borderLight }]}>
                  <View style={[pv.listStatIconBox, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon} size={14} color={st.color} />
                  </View>
                  <Text style={[pv.listStatVal, { color: tc.textPrimary }]}>{st.val}</Text>
                  <Text style={[pv.listStatLbl, { color: tc.textTertiary }]}>{st.lbl}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Walk + transit pills */}
          {(listingWalkScore || listingTransitInfo) ? (
            <View style={pv.listTransportRow}>
              {listingWalkScore ? (
                <View style={[pv.listTransportPill, { backgroundColor: walkBg }]}>
                  <Text style={[pv.listTransportText, { color: walkColor }]}>🚶 Walk {listingWalkScore}</Text>
                </View>
              ) : null}
              {listingTransitInfo ? (
                <View style={[pv.listTransportPill, { backgroundColor: "#E3EDF6" }]}>
                  <Text style={[pv.listTransportText, { color: "#1A6BAE" }]}>🚇 {listingTransitInfo}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Description */}
          {body ? (
            <Text style={[pv.listDesc, { color: tc.textSecondary }]} numberOfLines={2}>{body}</Text>
          ) : null}

          {/* Amenity chips */}
          {listingAmenities && listingAmenities.length > 0 ? (
            <View style={pv.listTagsRow}>
              {listingAmenities.slice(0, 4).map((tag, i) => (
                <View key={i} style={pv.listTagChip}>
                  <Ionicons name="checkmark-circle" size={11} color="#30855B" />
                  <Text style={pv.listTagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  // ── Restaurant preview (matches Food tab card) ──
  const renderRestaurantPreview = () => {
    const priceSymbol = (restPriceRange ?? "").includes("$$$$") ? "$$$$"
      : (restPriceRange ?? "").includes("$$$") ? "$$$"
      : (restPriceRange ?? "").includes("$$") ? "$$"
      : restPriceRange ? "$" : null;

    return (
      <View style={[pv.restCard, { borderColor: tc.borderLight }]}>
        {/* Image carousel / single image */}
        <View style={pv.restCardImgWrap}>
          {attachedFiles.length > 1 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={StyleSheet.absoluteFill}>
              {attachedFiles.map((f, i) => (
                <View key={i} style={{ width: SW - 32, height: 165 }}>
                  <FadeImage uri={f.uri} style={StyleSheet.absoluteFill} cachePolicy="memory" />
                  {/* SPRINT-42: use shared FadeImage for restaurant carousel media. */}
                </View>
              ))}
            </ScrollView>
          ) : attachedFiles.length === 1 ? (
            <FadeImage uri={attachedFiles[0].uri} style={StyleSheet.absoluteFill} cachePolicy="memory" /> // SPRINT-42: use shared FadeImage for restaurant preview media.
          ) : (
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="restaurant" size={44} color="rgba(255,255,255,0.3)" />
              </View>
            </LinearGradient>
          )}
          {/* Open badge */}
          <View style={pv.restStatusBadge}>
            <View style={pv.restStatusDot} />
            <Text style={pv.restStatusText}>Open · Preview</Text>
          </View>
          {/* Fav button */}
          <View style={pv.restFavBtn}>
            <Ionicons name="heart-outline" size={18} color="#FFF" />
          </View>
          {/* Price overlay */}
          {priceSymbol ? (
            <View style={pv.restPriceOverlay}>
              <Text style={pv.restPriceOverlayText}>{priceSymbol}</Text>
            </View>
          ) : null}
          {/* Image count pill */}
          {attachedFiles.length > 1 && (
            <View style={{ position: "absolute", top: 10, right: 48, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="images-outline" size={11} color="#FFF" />
              <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700" }}>{attachedFiles.length} photos</Text>
            </View>
          )}
        </View>

        {/* Card body */}
        <View style={[pv.restCardBody, { backgroundColor: tc.cardBg }]}>
          {/* Name + verified */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Text style={[pv.restName, { color: tc.textPrimary }]} numberOfLines={1}>{title || "Restaurant name..."}</Text>
          </View>
          {restCuisine ? (
            <Text style={[pv.restCuisine, { color: tc.textSecondary }]}>{restCuisine}</Text>
          ) : null}

          {/* Rating + location chips */}
          <View style={pv.restInfoRow}>
            <View style={pv.restRatingChip}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={pv.restRatingNum}>New</Text>
            </View>
            {location ? (
              <View style={pv.restDistChip}>
                <Ionicons name="location-outline" size={11} color="#6B7280" />
                <Text style={pv.restMetaText}>{location}</Text>
              </View>
            ) : null}
          </View>

          {/* Services row */}
          {restFeatures && restFeatures.length > 0 ? (
            <View style={pv.restServicesRow}>
              {restFeatures.slice(0, 3).map((sv, i) => (
                <View key={i} style={pv.restServiceChip}>
                  <Text style={pv.restServiceText}>{sv}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Description (popular dishes / review body) */}
          {body ? (
            <View style={pv.restDishesRow}>
              <Ionicons name="flame-outline" size={12} color="#257A86" />
              <Text style={[pv.restDishesText, { color: tc.textSecondary }]} numberOfLines={1}>{body}</Text>
            </View>
          ) : null}

          {/* Bottom action row */}
          <View style={[pv.restCardMeta, { borderTopColor: tc.borderLight }]}>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 }}>
              {extraFields.filter((f) => f.value && f.label !== "Cuisine" && f.label !== "Price" && f.label !== "Phone").slice(0, 2).map((f, i) => (
                <View key={i} style={pv.restCardTag}>
                  <Text style={pv.restCardTagText}>{f.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <View style={pv.restNavBtn}>
                <Ionicons name="navigate-outline" size={14} color="#1A6BAE" />
              </View>
              <View style={{ borderRadius: 10, overflow: "hidden" }}>
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={pv.restReserveBtn}
                >
                  <Ionicons name="calendar-outline" size={12} color="#FFF" />
                  <Text style={pv.restReserveBtnText}>Reserve</Text>
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ── News / community post preview (like PostCard in Feed) ──
  const renderNewsPreview = () => {
    const catField = extraFields.find((f) => f.label === "Category");
    const tagsField = extraFields.find((f) => f.label === "Tags");
    return (
      <View style={[pv.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
        {/* Gradient accent line */}
        <LinearGradient
          colors={type.gradient as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={pv.newsAccentLine}
        />
        {/* Image */}
        {attachedFiles.length > 0 && (
          <View style={[pv.newsImg, { overflow: "hidden" }]}>
            <FadeImage uri={attachedFiles[0].uri} style={StyleSheet.absoluteFill} cachePolicy="memory" />
            {/* SPRINT-42: use shared FadeImage for feed preview media. */}
            {attachedFiles.length > 1 && (
              <View style={pv.imgCountBadge}>
                <Ionicons name="images" size={11} color="#FFF" />
                <Text style={pv.imgCountText}>+{attachedFiles.length - 1}</Text>
              </View>
            )}
          </View>
        )}
        {/* Author row */}
        <View style={pv.authorRow}>
          <LinearGradient colors={type.gradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.avatar}>
            <Text style={pv.avatarText}>{userInitials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[pv.authorName, { color: tc.textPrimary }]}>{userName}</Text>
            </View>
            <Text style={[pv.postTime, { color: tc.textTertiary }]}>Just now</Text>
          </View>
          {catField?.value ? (
            <View style={[pv.newsCatBadge, { backgroundColor: type.bg }]}>
              <Text style={[pv.newsCatText, { color: type.color }]}>{catField.value}</Text>
            </View>
          ) : null}
        </View>
        {/* Title + body */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[pv.title, { color: tc.textPrimary, paddingHorizontal: 0, marginBottom: 6 }]} numberOfLines={2}>
            {title || "Your post title..."}
          </Text>
          <Text style={[pv.body, { color: tc.textSecondary, paddingHorizontal: 0 }]} numberOfLines={3}>
            {body || "Your content will appear here..."}
          </Text>
        </View>
        {/* Tags */}
        {tagsField?.value ? (
          <View style={{ flexDirection: "row", gap: 6, marginHorizontal: 16, marginBottom: 10, flexWrap: "wrap" }}>
            {tagsField.value.split(",").slice(0, 3).map((t, i) => (
              <View key={i} style={{ backgroundColor: type.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: type.color }}>#{t.trim()}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {/* Action bar */}
        <View style={pv.actionsRow}>
          <View style={pv.actionItem}><Ionicons name="heart-outline" size={17} color="#9CA3AF" /><Text style={pv.actionText}>0</Text></View>
          <View style={pv.actionItem}><Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" /><Text style={pv.actionText}>0</Text></View>
          <View style={pv.actionItem}><Ionicons name="share-social-outline" size={16} color="#9CA3AF" /><Text style={pv.actionText}>Share</Text></View>
          <View style={[pv.actionItem, { marginLeft: "auto" as any }]}><Ionicons name="bookmark-outline" size={16} color="#9CA3AF" /></View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={pv.overlay}>
        <View style={[pv.sheet, { backgroundColor: tc.pageBg }]}>
          <View style={pv.sheetHandle} />
          <View style={[pv.header, { borderBottomColor: tc.borderLight }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pv.headerBadge}>
                <Ionicons name={type.icon} size={11} color="#FFF" />
              </LinearGradient>
              <Text style={[pv.headerTitle, { color: tc.textPrimary }]}>Preview</Text>
            </View>
            <Pressable onPress={onClose} style={[pv.closeBtn, { backgroundColor: tc.inputBg }]}>
              <Ionicons name="close" size={18} color={tc.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Tab label */}
            <View style={[pv.feedTabHint, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="phone-portrait-outline" size={13} color={tc.textTertiary} />
              <Text style={[pv.feedTabHintText, { color: tc.textTertiary }]}>
                This is how it looks on the{" "}
                <Text style={{ fontWeight: "800", color: type.color }}>
                  {type.id === "story" ? "Stories" : type.id === "event" ? "Events" : type.id === "challenge" ? "Quests" : type.id === "listing" ? "Housing" : type.id === "shared_space" ? "Shared Space" : type.id === "restaurant" ? "Food" : "News"}
                </Text>{" "}feed
              </Text>
            </View>

            {type.id === "story" && renderStoryPreview()}
            {type.id === "event" && renderEventPreview()}
            {type.id === "challenge" && renderChallengePreview()}
            {type.id === "listing" && renderListingPreview()}
            {type.id === "shared_space" && renderListingPreview()}
            {type.id === "restaurant" && renderRestaurantPreview()}
            {type.id === "news" && renderNewsPreview()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const pv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "92%", paddingTop: 10,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB",
    alignSelf: "center", marginBottom: 14,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBadge: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  feedTabHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: 14, marginBottom: 6,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  feedTabHintText: { fontSize: 12, fontWeight: "600" },

  // ── Generic card (news / shared fallback) ──
  card: {
    margin: 16, borderRadius: 20, overflow: "hidden",
    borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  newsAccentLine: { height: 3, width: "100%" },
  newsImg: {
    height: 160, position: "relative" as any,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden",
  },
  imgCountBadge: {
    position: "absolute" as any, bottom: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  imgCountText: { fontSize: 11, fontWeight: "800", color: "#FFF" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, paddingHorizontal: 16, paddingTop: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "800", color: "#FFF" },
  authorName: { fontSize: 14, fontWeight: "700" },
  postTime: { fontSize: 11, marginTop: 1 },
  newsCatBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  newsCatText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 8, lineHeight: 23, letterSpacing: -0.3, paddingHorizontal: 16 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 12, paddingHorizontal: 16 },
  actionsRow: {
    flexDirection: "row", gap: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center", paddingHorizontal: 16, paddingBottom: 14,
  },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },

  // ── Story preview ──
  storyImgWrap: { width: "100%", height: 185, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden", position: "relative" },
  storyImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  storyImgLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.6)", marginTop: 4 },
  storyDurBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  storyDurText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  storyNewBadge: {
    position: "absolute", top: 10, left: 10,
    backgroundColor: "#1A6BAE", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  storyNewText: { fontSize: 8, fontWeight: "800", color: "#FFF", letterSpacing: 0.5 },
  storyBody: { padding: 14 },
  storyAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  storyAv: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  storyAuthorName: { fontSize: 14, fontWeight: "800" },
  storyTime: { fontSize: 11, fontWeight: "500", color: "#9CA3AF" },
  storyCatDot: { width: 4, height: 4, borderRadius: 2 },
  storyCatLabel: { fontSize: 11, fontWeight: "700" },
  storyTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21, marginBottom: 4 },
  storyDesc: { fontSize: 13, fontWeight: "500", color: "#6B7280", lineHeight: 18, marginBottom: 8 },
  storyHashRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  storyHash: { fontSize: 12, fontWeight: "700", color: "#1A6BAE" },
  storyEngBar: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E8EDF5",
  },
  storyEngItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  storyEngText: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },

  // ── Event preview ──
  eventCard: {
    margin: 16, borderRadius: 22, overflow: "hidden", height: 260,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  eventImg: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  eventOverlay: { ...StyleSheet.absoluteFill, padding: 16, justifyContent: "flex-end" },
  eventCatBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  eventCatText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  eventDateBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  eventDateText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  eventTitle: { fontSize: 20, fontWeight: "800", color: "#FFF", lineHeight: 26, marginBottom: 8, letterSpacing: -0.3 },
  eventMeta: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  eventDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  eventIntBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  eventRsvp: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  // ── Challenge preview ──
  challengeCard: {
    margin: 16, borderRadius: 22, overflow: "hidden", borderWidth: 1,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  challengeHeader: { padding: 18, paddingBottom: 20, overflow: "hidden", position: "relative" },
  challengeHeaderDecor1: {
    position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  challengeHeaderDecor2: {
    position: "absolute", bottom: -20, left: -20, width: 70, height: 70, borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  challengeTypePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  challengeTypeText: { fontSize: 10, fontWeight: "900", color: "#257A86", letterSpacing: 0.8, textTransform: "uppercase" },
  challengeDurPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  challengeTitle: { fontSize: 19, fontWeight: "900", color: "#FFF", lineHeight: 25, letterSpacing: -0.3 },
  challengeBody: { padding: 16 },
  challengeAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  challengeAv: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  challengeAuthorName: { fontSize: 13, fontWeight: "700" },
  challengeAuthorTime: { fontSize: 10, fontWeight: "500", color: "#9CA3AF" },
  challengeStatusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  challengeDesc: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  challengeInfoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  challengeInfoChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  challengeInfoText: { fontSize: 11, fontWeight: "700" },
  challengeProgress: { marginBottom: 14 },
  challengeBarBg: { height: 6, borderRadius: 3, backgroundColor: "#F3F4F6" },
  challengeBarFill: { height: 6, borderRadius: 3, minWidth: 2 },
  challengeActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  challengeJoinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 14 },
  challengeJoinText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  challengeShareBtn: {
    width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },

  // ── Listing preview (matches Housing tab card) ──
  listCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 1,
  },
  listCardImgWrap: { height: 220, position: "relative" as any, overflow: "hidden" },
  listImageScrim: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 110,
    paddingHorizontal: 14, paddingBottom: 14, justifyContent: "flex-end", gap: 4,
  },
  listTypePill: {
    backgroundColor: "rgba(26,107,174,0.88)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7,
  },
  listTypePillText: { fontSize: 10, fontWeight: "800", color: "#FFF", letterSpacing: 0.5 },
  listAvailNowPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(22,163,74,0.88)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7,
  },
  listAvailDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFF" },
  listAvailNowText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  listImagePrice: { fontSize: 20, fontWeight: "900", color: "#FFF", letterSpacing: -0.3 },
  listImageLocation: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  listNewBadge: {
    position: "absolute", top: 12, left: 12,
    backgroundColor: "#1A6BAE", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  listNewBadgeText: { fontSize: 9, fontWeight: "900", color: "#FFF", letterSpacing: 0.6 },
  listCardBody: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 },
  listLandlordBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  listAv: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  listAvText: { fontSize: 13, fontWeight: "900", color: "#FFF" },
  listLandlordName: { fontSize: 13, fontWeight: "700", flex: 1 },
  listVerifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#DCFCE7", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  listVerifiedText: { fontSize: 10, fontWeight: "700", color: "#30855B" },
  listChatBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#1A6BAE", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  listChatBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  listTitle: { fontSize: 16, fontWeight: "800", lineHeight: 22, marginBottom: 8 },
  listSubRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  listDepositPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
  },
  listDepositText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  listAvailImmPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#DCFCE7", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  listAvailDotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#22C55E" },
  listAvailImmText: { fontSize: 11, fontWeight: "700", color: "#15803D" },
  listStatsGrid: {
    flexDirection: "row", borderRadius: 12, borderWidth: 1,
    overflow: "hidden", marginBottom: 10,
  },
  listStatCell: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3 },
  listStatCellBorder: { borderRightWidth: 1 },
  listStatIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  listStatVal: { fontSize: 13, fontWeight: "800" },
  listStatLbl: { fontSize: 10, fontWeight: "500" },
  listTransportRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  listTransportPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  listTransportText: { fontSize: 11, fontWeight: "700" },
  listDesc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  listTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  listTagChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E3F1EA", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  listTagChipText: { fontSize: 11, fontWeight: "600", color: "#166534" },

  // ── Restaurant preview (matches Food tab card) ──
  restCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
    borderWidth: 1,
  },
  restCardImgWrap: { height: 165, position: "relative" as any, overflow: "hidden" },
  restStatusBadge: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(22,163,74,0.9)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  restStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF", opacity: 0.85 },
  restStatusText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  restFavBtn: {
    position: "absolute", top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  restPriceOverlay: {
    position: "absolute", bottom: 10, right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  restPriceOverlayText: { fontSize: 12, fontWeight: "800", color: "#FFF" },
  restCardBody: { padding: 14 },
  restName: { fontSize: 16, fontWeight: "800", flex: 1 },
  restCuisine: { fontSize: 12, marginBottom: 8 },
  restInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  restRatingChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#FFF8E6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  restRatingNum: { fontSize: 13, fontWeight: "700" },
  restDistChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  restMetaText: { fontSize: 11, fontWeight: "600" },
  restServicesRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  restServiceChip: {
    borderWidth: 1, borderColor: "#BBF7D0",
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3,
    backgroundColor: "#FAFFFC",
  },
  restServiceText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  restDishesRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  restDishesText: { fontSize: 11, flex: 1 },
  restCardMeta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 10, borderTopWidth: 1,
  },
  restCardTag: { backgroundColor: "#BBF7D0", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  restCardTagText: { fontSize: 10, fontWeight: "600", color: "#166534" },
  restNavBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#E3EDF6",
    alignItems: "center", justifyContent: "center",
  },
  restReserveBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  restReserveBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
});

// ── Section header helper ──────────────────────────────────────────────────────
function SectionLabel({ label, color }: { label: string; color: string }) {
  const { tc } = useTheme();
  return (
    <View style={s.sectionLabelRow}>
      <View style={[s.sectionDot, { backgroundColor: color }]} />
      <Text style={[s.sectionLabel, { color: tc.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ── Native-style media picker sheet (Android — iOS uses ActionSheetIOS) ──────
function MediaPickerSheet({
  visible,
  onClose,
  onLibrary,
  onCamera,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onLibrary: () => void;
  onCamera: () => void;
  title?: string;
}) {
  const { tc } = useTheme();
  const translateY = useRef(new Animated.Value(300)).current;

  const show = () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }).start();
  const hide = (cb?: () => void) => Animated.timing(translateY, { toValue: 300, duration: 200, useNativeDriver: true }).start(cb);

  if (visible) show();

  const dismiss = () => hide(onClose);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={dismiss} />
      <Animated.View style={[mps.sheet, { backgroundColor: tc.cardBg, transform: [{ translateY }] }]}>
        <View style={mps.handle} />
        {title ? <Text style={[mps.title, { color: tc.textSecondary }]}>{title}</Text> : null}
        <Pressable
          style={[mps.row, { borderBottomColor: tc.borderLight }]}
          onPress={() => { dismiss(); setTimeout(onLibrary, 220); }}
        >
          <View style={mps.iconBox}>
            <Ionicons name="images-outline" size={22} color="#1A6BAE" />
          </View>
          <Text style={[mps.rowText, { color: tc.textPrimary }]}>Photo Library</Text>
          <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
        </Pressable>
        <Pressable
          style={[mps.row, { borderBottomColor: tc.borderLight }]}
          onPress={() => { dismiss(); setTimeout(onCamera, 220); }}
        >
          <View style={[mps.iconBox, { backgroundColor: "#E2F0F1" }]}>
            <Ionicons name="camera-outline" size={22} color="#257A86" />
          </View>
          <Text style={[mps.rowText, { color: tc.textPrimary }]}>Camera</Text>
          <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
        </Pressable>
        <Pressable style={mps.cancelBtn} onPress={dismiss}>
          <Text style={mps.cancelText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const mps = StyleSheet.create({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 34, paddingTop: 10,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#E3EDF6", alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 16, fontWeight: "600" },
  cancelBtn: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, backgroundColor: "#F3F4F6", paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: 16, fontWeight: "700", color: "#374151" },
});

// ── Full form for a selected post type ────────────────────────────────────────
function PostForm({ type, onBack, initialMode, editId }: { type: PostType; onBack: () => void; initialMode?: string; editId?: string }) { // SPRINT-42: accept the entity id selected by owner-only edit actions.
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const {
    canPostListing,
    canPostRestaurant,
    canPostRestaurantReview,
    isAdmin,
    isVerifiedLandlord,
    isVerifiedAgency,
    isVerifiedRestaurantOwner,
  } = usePermissions();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedMedia[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [newsMoreOpen, setNewsMoreOpen] = useState(false);
  const [sourceLabel, setSourceLabel] = useState(""); // SPRINT-42: support the sixth editable feed field in create and edit.
  const [editLoading, setEditLoading] = useState(initialMode === "edit"); // SPRINT-42: block editing until authoritative detail data is loaded.
  const editOriginalRef = useRef<Record<string, unknown> | null>(null); // SPRINT-42: retain a non-persisted baseline for dirty-field PATCH.

  // ── Media picker sheet state (Android; iOS uses ActionSheetIOS) ──
  const [pickerSheetVisible, setPickerSheetVisible] = useState(false);
  const pickerResolveRef = useRef<{ onLibrary: () => void; onCamera: () => void } | null>(null);

  // Replaces appAlert("Add Media", ...) everywhere with native pickers
  const showMediaPicker = (onLibrary: () => void, onCamera: () => void, title?: string) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Photo Library", "Camera"], cancelButtonIndex: 0, title },
        (idx) => { if (idx === 1) onLibrary(); else if (idx === 2) onCamera(); }
      );
    } else {
      pickerResolveRef.current = { onLibrary, onCamera };
      setPickerSheetVisible(true);
    }
  };

  // ── Listing fields ──
  const [propType, setPropType] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [floor, setFloor] = useState("");
  const [available, setAvailable] = useState("");
  const [petPolicy, setPetPolicy] = useState("");
  const [parking, setParking] = useState("");
  const [laundry, setLaundry] = useState("");
  const [heating, setHeating] = useState("");
  const [cooling, setCooling] = useState("");
  const [utilities, setUtilities] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [furnished, setFurnished] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [listingStep, setListingStep] = useState(1);
  const userCountryCode =
    (user as any)?.userLocation?.countryCode ||
    (user?.country === "United Kingdom" ? "GB" : "US");
  const derivedListingCurrency = getCurrencyForCountry(userCountryCode);
  const [listingCurrency, setListingCurrency] = useState(derivedListingCurrency.code); // SPRINT-42: editable currency; edit mode loads the listing's actual currency.
  const [listingCity, setListingCity] = useState("");
  const [listingState, setListingState] = useState("");
  const [listingCountry, setListingCountry] = useState("");
  const [yearBuiltStr, setYearBuiltStr] = useState("");
  const [transitInfoStr, setTransitInfoStr] = useState("");
  const [walkScoreStr, setWalkScoreStr] = useState("");
  const [utilitiesText, setUtilitiesText] = useState("");
  const [listingFurnishedSwitch, setListingFurnishedSwitch] = useState(false);
  const [listingStepError, setListingStepError] = useState<string | null>(null);
  /** Listing photos only (Step 4); separate from `attachedFiles` used by other post types. */
  const [listingImages, setListingImages] = useState<AttachedMedia[]>([]);
  const [existingListingImages, setExistingListingImages] = useState<HousingListingImageRef[]>([]); // SPRINT-42: keep persisted images separate from detail fields and new picks.
  const [listingStatus, setListingStatus] = useState<ListingStatus>("AVAILABLE"); // SPRINT-42: expose the owner-controlled listing lifecycle.
  const [imageBusy, setImageBusy] = useState(false); // SPRINT-42: serialize immediate image mutations.

  const isEditing = initialMode === "edit" && !!editId; // SPRINT-42: distinguish entity editing from existing restaurant review mode.

  useEffect(() => { // SPRINT-42: prefill every supported field from the authoritative detail endpoint.
    if (!isEditing || !editId) { setEditLoading(false); return; } // SPRINT-42: preserve all existing creation modes.
    let cancelled = false; // SPRINT-42: avoid setting state after navigation away.
    setEditLoading(true); // SPRINT-42: show a deterministic loading gate.
    const load = async () => { // SPRINT-42: branch by the reused composer type.
      try { // SPRINT-42: surface load failures without partially populated forms.
        if (type.id === "news") { // SPRINT-42: load the standard feed post detail.
          const post = await getPost(editId); // SPRINT-42: fetch all six editable fields and persisted media.
          if (cancelled) return; // SPRINT-42: stop after unmount.
          const baseline = { title: post.title, content: post.content, category: post.category, tags: post.tags ?? [], location: post.location ?? "", sourceLabel: post.sourceLabel ?? "" }; // SPRINT-42: normalize nullable fields for dirty comparison.
          editOriginalRef.current = baseline; // SPRINT-42: save the original feed values in memory only.
          setTitle(post.title); setBody(post.content); setNewsCategory(FEED_TO_NEWS_LABEL[post.category as FeedCategory] ?? "Community"); // SPRINT-42: prefill required post fields.
          setNewsTags((post.tags ?? []).join(", ")); setLocation(post.location ?? ""); setSourceLabel(post.sourceLabel ?? ""); // SPRINT-42: prefill optional post fields.
          setAttachedFiles((post.media ?? []).map((m) => ({ uri: m.url, name: m.id, mediaType: "photo" as const }))); // SPRINT-42: show existing feed media read-only.
          setNewsMoreOpen(true); // SPRINT-42: reveal all editable post fields immediately.
        } else if (type.id === "listing") { // SPRINT-42: load the standard listing detail.
          const listing = await getListing(editId); // SPRINT-42: fetch all Sprint 37 editable fields and ordered images.
          if (cancelled) return; // SPRINT-42: stop after unmount.
          if (listing.isOwner !== true) { // SPRINT-42: deep-link edit must reject non-owners before prefill.
            appAlert("Not allowed", "You can only edit listings you own.", [{ text: "Back", onPress: () => router.back() }]); // SPRINT-42: clear ownership rejection.
            return; // SPRINT-42: do not populate the editor for a foreign listing.
          } // SPRINT-42: finish ownership gate.
          const orderedImages = [...(Array.isArray(listing.images) ? listing.images : [])].filter((image): image is HousingListingImageRef => !!image && typeof image === "object" && typeof (image as HousingListingImageRef).id === "string").sort((a, b) => a.order - b.order); // SPRINT-42: preserve canonical backend ordering.
          const baselineAmenities = Array.isArray(listing.amenities) && listing.amenities.length > 0 ? listing.amenities : Array.isArray(listing.tags) && listing.tags.length > 0 ? listing.tags : undefined; // SPRINT-42: prefer canonical amenities and avoid empty-array dirty noise.
          const availableDateNorm = normalizeAvailableDateValue(listing.availableDate ?? listing.available); // SPRINT-42: store availability as YYYY-MM-DD for dirty equality.
          const baseline: Record<string, unknown> = { // SPRINT-42: normalize every Sprint 37 editable listing field without fabricating empties.
            title: listing.title, // SPRINT-42: required title baseline.
            description: listing.description, // SPRINT-42: required description baseline.
            propertyType: listing.propertyType ?? listing.type, // SPRINT-42: canonical property enum baseline.
            price: listing.price, // SPRINT-42: price baseline.
            currency: (listing.currency ?? "USD").toUpperCase().slice(0, 8), // SPRINT-42: actual listing currency, not profile-derived.
            deposit: listing.deposit == null ? undefined : Number(listing.deposit), // SPRINT-42: null deposit compares equal to unset.
            bedrooms: listing.bedrooms ?? listing.beds ?? 0, // SPRINT-42: bedroom baseline.
            bathrooms: listing.bathrooms ?? listing.baths ?? 0, // SPRINT-42: bathroom baseline.
            sqft: listing.sqft == null ? undefined : listing.sqft, // SPRINT-42: null sqft compares equal to unset.
            floor: listing.floor == null || listing.floor === "" ? undefined : String(listing.floor), // SPRINT-42: string floor baseline.
            address: listing.address ?? "", // SPRINT-42: address baseline.
            neighborhood: listing.neighborhood == null || listing.neighborhood === "" ? undefined : listing.neighborhood, // SPRINT-42: optional neighborhood.
            city: listing.city ?? "", // SPRINT-42: city without profile fallback in edit mode.
            state: listing.state == null || listing.state === "" ? undefined : listing.state, // SPRINT-42: no profile state fallback.
            country: listing.country ?? "", // SPRINT-42: country without profile fallback in edit mode.
            availableDate: availableDateNorm, // SPRINT-42: date-only availability baseline.
            leaseTerm: listing.leaseTerm == null || listing.leaseTerm === "" ? undefined : listing.leaseTerm, // SPRINT-42: optional lease.
            isFurnished: listing.isFurnished ?? listing.furnished ?? false, // SPRINT-42: furnished baseline.
            petPolicy: listing.petPolicy == null || listing.petPolicy === "" ? undefined : listing.petPolicy, // SPRINT-42: optional pet policy.
            parking: listing.parking == null || listing.parking === "" ? undefined : listing.parking, // SPRINT-42: optional parking.
            laundry: listing.laundry == null || listing.laundry === "" ? undefined : listing.laundry, // SPRINT-42: optional laundry.
            heating: listing.heating == null || listing.heating === "" ? undefined : listing.heating, // SPRINT-42: optional heating.
            cooling: listing.cooling == null || listing.cooling === "" ? undefined : listing.cooling, // SPRINT-42: optional cooling.
            utilities: typeof listing.utilities === "string" && listing.utilities.trim() ? listing.utilities : Array.isArray(listing.utilities) && listing.utilities.length ? listing.utilities.join(", ") : undefined, // SPRINT-42: optional utilities string.
            yearBuilt: listing.yearBuilt == null ? undefined : listing.yearBuilt, // SPRINT-42: null year compares equal to unset.
            amenities: baselineAmenities, // SPRINT-42: amenities or undefined when empty.
            transitInfo: listing.transitInfo == null || listing.transitInfo === "" ? undefined : listing.transitInfo, // SPRINT-42: optional transit.
            walkScore: listing.walkScore == null ? undefined : listing.walkScore, // SPRINT-42: null walk score compares equal to unset.
            status: listing.status, // SPRINT-42: lifecycle status baseline.
          }; // SPRINT-42: finish normalized listing baseline.
          editOriginalRef.current = baseline; // SPRINT-42: save the listing baseline for dirty PATCH.
          setTitle(listing.title); setBody(listing.description); setPropType(propertyTypeToLabel(String(baseline.propertyType ?? "APARTMENT"))); setPrice(String(listing.price)); setDeposit(listing.deposit == null ? "" : String(listing.deposit)); // SPRINT-42: prefill core listing fields.
          setListingCurrency(String(baseline.currency ?? "USD")); // SPRINT-42: load the listing's persisted currency into editable state.
          setBeds(String(baseline.bedrooms ?? 0)); setBaths(String(baseline.bathrooms ?? 0)); setSqft(listing.sqft == null ? "" : String(listing.sqft)); setFloor(listing.floor == null ? "" : String(listing.floor)); // SPRINT-42: prefill rooms and size.
          setLocation(String(baseline.address ?? "")); setNeighborhood(listing.neighborhood ?? ""); setListingCity(listing.city ?? ""); setListingState(listing.state ?? ""); setListingCountry(listing.country ?? ""); // SPRINT-42: prefill address fields without coordinates or profile fallbacks.
          setAvailable(availableDateNorm ?? ""); setLeaseTerm(listing.leaseTerm ?? ""); setListingFurnishedSwitch(Boolean(baseline.isFurnished)); setPetPolicy(listing.petPolicy ?? ""); // SPRINT-42: prefill availability and policy fields with normalized date.
          setParking(listing.parking ?? ""); setLaundry(listing.laundry ?? ""); setHeating(listing.heating ?? ""); setCooling(listing.cooling ?? ""); setUtilitiesText(String(baseline.utilities ?? "")); // SPRINT-42: prefill services.
          setYearBuiltStr(listing.yearBuilt == null ? "" : String(listing.yearBuilt)); setAmenities(baselineAmenities ?? []); setTransitInfoStr(listing.transitInfo ?? ""); setWalkScoreStr(listing.walkScore == null ? "" : String(listing.walkScore)); // SPRINT-42: prefill remaining editable listing fields.
          setListingStatus(listing.status ?? "AVAILABLE"); setExistingListingImages(orderedImages); setListingStep(1); // SPRINT-42: prefill status and ordered image manager.
        } // SPRINT-42: finish supported edit types.
      } catch (error) { // SPRINT-42: report authoritative detail-load failures.
        appAlert("Could not load item", error instanceof ApiError ? error.message : "Please try again.", [{ text: "Back", onPress: () => router.back() }]); // SPRINT-42: show backend message where available.
      } finally { // SPRINT-42: release the loading gate.
        if (!cancelled) setEditLoading(false); // SPRINT-42: update only while mounted.
      } // SPRINT-42: finish edit load.
    }; // SPRINT-42: finish async loader.
    void load(); // SPRINT-42: begin edit prefill.
    return () => { cancelled = true; }; // SPRINT-42: cancel state writes after unmount.
  }, [editId, isEditing, type.id]); // SPRINT-42: reload only when the edited entity changes.

  // ── Restaurant mode — pre-set from route param (e.g. "Post Now" from local_reviewer badge) ──
  const [restaurantPostMode, setRestaurantPostMode] = useState<"owner" | "review">(
    initialMode === "review" ? "review" : "owner"
  );

  // ── Restaurant fields ──
  const [restName, setRestName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [avgPricePerPerson, setAvgPricePerPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [restTags, setRestTags] = useState<string[]>([]);
  const [restCity, setRestCity] = useState(user?.city ?? "");
  const [restState, setRestState] = useState("");
  const [restCountry, setRestCountry] = useState(user?.country ?? "");
  const [restWaitTime, setRestWaitTime] = useState("");

  // ── Local-review fields ──
  const [reviewRating, setReviewRating] = useState("");
  const [reviewDishes, setReviewDishes] = useState<string[]>([]);
  const [reviewVisitType, setReviewVisitType] = useState("");

  // ── Event fields ──
  const [eventCategory, setEventCategory] = useState("");
  const [eventFormat, setEventFormat] = useState("In-Person");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [ticketType, setTicketType] = useState("Free");
  const [ticketPrice, setTicketPrice] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");

  // ── News fields ──
  const [newsCategory, setNewsCategory] = useState("");
  const [newsTags, setNewsTags] = useState("");

  // ── Story fields ──
  const [storyCatPick, setStoryCatPick] = useState("");
  const [storyTagsInput, setStoryTagsInput] = useState("");

  // ── Challenge fields ──
  const [challengeType, setChallengeType] = useState("");
  const [challengeDuration, setChallengeDuration] = useState("");
  const [challengeGoal, setChallengeGoal] = useState("");
  const [challengeReward, setChallengeReward] = useState("");
  const [challengeMaxParticipants, setChallengeMaxParticipants] = useState("");
  const [challengeHashtags, setChallengeHashtags] = useState("");

  const [sharedSpacePrice, setSharedSpacePrice] = useState("");
  const [sharedSpaceDeposit, setSharedSpaceDeposit] = useState("");
  const [sharedSpaceCurrency, setSharedSpaceCurrency] = useState("USD");
  const [sharedSpaceRooms, setSharedSpaceRooms] = useState("1");
  const [sharedSpaceBaths, setSharedSpaceBaths] = useState("1");
  const [sharedSpaceTotalOccupants, setSharedSpaceTotalOccupants] = useState("1");
  const [sharedSpaceAvailableSpots, setSharedSpaceAvailableSpots] = useState("1");
  const [sharedSpaceCity, setSharedSpaceCity] = useState(user?.city ?? "");
  const [sharedSpaceState, setSharedSpaceState] = useState("");
  const [sharedSpaceCountry, setSharedSpaceCountry] = useState(user?.country ?? "");
  const [sharedSpacePetPolicy, setSharedSpacePetPolicy] = useState("");
  const [sharedSpaceSmoking, setSharedSpaceSmoking] = useState(false);
  const [sharedSpaceHouseRules, setSharedSpaceHouseRules] = useState("");
  const [sharedSpaceAmenities, setSharedSpaceAmenities] = useState<string[]>([]);

  const hasPhotoAttachment = attachedFiles.some((file) => file.mediaType === "photo");
  const hasVideoAttachment = attachedFiles.some((file) => file.mediaType === "video");
  /** Story: one photo or one video (type inferred from the file). */
  const storyHasRequiredMedia =
    attachedFiles.length > 0 && (hasPhotoAttachment || hasVideoAttachment);

  const listingPriceNum = parseFloat(price.replace(/,/g, ""));
  const listingBedsNum = parseInt(beds, 10);
  const listingBathsNum = parseFloat(String(baths).replace(",", "."));
  const listingCityEff = isEditing ? listingCity.trim() : (listingCity.trim() || user?.city?.trim() || ""); // SPRINT-42: edit mode never falls back to profile city.
  const listingCountryEff = isEditing ? listingCountry.trim() : (listingCountry.trim() || user?.country?.trim() || ""); // SPRINT-42: edit mode never falls back to profile country.
  const yearBuiltParsed = yearBuiltStr.trim() ? parseInt(yearBuiltStr, 10) : NaN;
  const yearBuiltOk =
    !yearBuiltStr.trim() ||
    (!Number.isNaN(yearBuiltParsed) && yearBuiltParsed >= 1800 && yearBuiltParsed <= 2100);
  const walkParsed = walkScoreStr.trim() ? parseInt(walkScoreStr, 10) : NaN;
  const walkOk =
    !walkScoreStr.trim() || (!Number.isNaN(walkParsed) && walkParsed >= 0 && walkParsed <= 100);
  const depositParsed = deposit.trim() ? parseFloat(deposit.replace(/,/g, "")) : undefined;
  const depositOk = depositParsed == null || (!Number.isNaN(depositParsed) && depositParsed >= 0); // SPRINT-42: deposit 0 is valid; require non-negative only.
  const listingValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    propType.length > 0 &&
    !Number.isNaN(listingPriceNum) &&
    listingPriceNum > 0 &&
    location.trim().length > 0 &&
    listingCityEff.length > 0 &&
    listingCountryEff.length > 0 &&
    !Number.isNaN(listingBedsNum) &&
    listingBedsNum >= 0 &&
    !Number.isNaN(listingBathsNum) &&
    listingBathsNum >= 0 &&
    yearBuiltOk &&
    walkOk &&
    depositOk;

  const validateListingStep = (step: number): boolean => {
    setListingStepError(null);
    if (step === 1) {
      if (!title.trim() || !body.trim() || !propType) {
        setListingStepError("Title, description, and property type are required.");
        return false;
      }
      if (Number.isNaN(listingPriceNum) || listingPriceNum <= 0) {
        setListingStepError("Enter a valid monthly rent.");
        return false;
      }
      if (deposit.trim()) {
        const d = parseFloat(deposit.replace(/,/g, ""));
        if (Number.isNaN(d) || d < 0) { // SPRINT-42: deposit may be zero; reject only negatives.
          setListingStepError("Deposit must be a non-negative number."); // SPRINT-42: match backend @Min(0).
          return false;
        }
      }
      return true;
    }
    if (step === 2) {
      if (Number.isNaN(listingBedsNum) || listingBedsNum < 0) {
        setListingStepError("Enter a valid bedroom count (0 or more).");
        return false;
      }
      if (Number.isNaN(listingBathsNum) || listingBathsNum < 0) {
        setListingStepError("Enter a valid bathroom count (0 or more, decimals allowed).");
        return false;
      }
      if (yearBuiltStr.trim() && !yearBuiltOk) {
        setListingStepError("Year built must be between 1800 and 2100.");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!location.trim()) {
        setListingStepError("Street address is required.");
        return false;
      }
      if (location.trim().length < 5) {
        setListingStepError("Please enter a complete street address (e.g. 123 Main St).");
        return false;
      }
      if (!/\d/.test(location.trim())) {
        setListingStepError("Street address must include a street number (e.g. 123 Main St).");
        return false;
      }
      if (!listingCityEff.length) {
        setListingStepError("City is required.");
        return false;
      }
      if (!listingCountryEff.length) {
        setListingStepError("Country is required.");
        return false;
      }
      if (walkScoreStr.trim() && !walkOk) {
        setListingStepError("Walk score must be between 0 and 100.");
        return false;
      }
      return true;
    }
    return true;
  };

  const eventValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    eventDate.trim().length > 0 &&
    eventTime.trim().length > 0 &&
    location.trim().length > 0;

  const challengeValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    challengeType.length > 0 &&
    challengeDuration.length > 0 &&
    challengeGoal.trim().length > 0 &&
    challengeReward.trim().length > 0;

  const sharedSpacePriceNum = parseFloat(sharedSpacePrice.replace(/,/g, ""));
  const sharedSpaceValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    location.trim().length > 0 &&
    sharedSpaceCity.trim().length > 0 &&
    sharedSpaceCountry.trim().length > 0 &&
    !Number.isNaN(sharedSpacePriceNum) &&
    sharedSpacePriceNum > 0 &&
    (parseInt(sharedSpaceRooms, 10) || 0) >= 1 &&
    (parseInt(sharedSpaceBaths, 10) || 0) >= 1 &&
    (parseInt(sharedSpaceTotalOccupants, 10) || 0) >= 1 &&
    (parseInt(sharedSpaceAvailableSpots, 10) || 0) >= 1;

  const restaurantOwnerValid =
    restName.trim().length > 0 &&
    body.trim().length > 0 &&
    cuisine.length > 0 &&
    priceRange.length > 0 &&
    location.trim().length > 0 &&
    restCity.trim().length > 0 &&
    restCountry.trim().length > 0;

  const reviewStars = parseReviewStars(reviewRating);
  const restaurantReviewValid =
    restName.trim().length > 0 &&
    body.trim().length > 0 &&
    reviewRating.length > 0 &&
    reviewStars != null;

  const canPost =
    type.id === "restaurant"
      ? restaurantPostMode === "owner"
        ? restaurantOwnerValid
        : restaurantReviewValid
      : type.id === "listing"
      ? listingValid && listingStep === 4
      : type.id === "shared_space"
      ? sharedSpaceValid
      : type.id === "story"
      ? storyHasRequiredMedia && title.trim().length > 0 && !!storyCatPick
      : type.id === "challenge"
      ? challengeValid
      : type.id === "event"
      ? eventValid
      : title.trim().length > 0 && body.trim().length > 0;

  const canSubmit = canPost && !submitting;

  const isStoryForm = type.id === "story";
  const mediaBtnTitle = isStoryForm
    ? attachedFiles.length > 0
      ? "Replace media"
      : "Add photo or video"
    : type.id === "shared_space"
      ? attachedFiles.length > 0
        ? "Add more photos"
        : "Add photos"
      : attachedFiles.length > 0
        ? "Add More Media"
        : "Add Media";
  const maxAttachUi = type.id === "shared_space" ? 6 : 5;
  const mediaBtnDesc = isStoryForm
    ? attachedFiles.length > 0
      ? "One item per story — tap to pick a different file"
      : "Pick one photo or one video (up to 2 minutes)"
    : type.id === "shared_space"
      ? attachedFiles.length > 0
        ? `${attachedFiles.length}/${maxAttachUi} photos — tap to add more`
        : "Tap to add up to 6 photos (optional)"
      : attachedFiles.length > 0
        ? `${attachedFiles.length}/${maxAttachUi} attached — tap to browse photos or videos`
        : "Tap to browse photos or videos";

  const acceptListingImages = async (assets: ImagePicker.ImagePickerAsset[]) => { // SPRINT-42: validate and either stage or immediately upload listing images.
    for (const asset of assets) { // SPRINT-42: validate each selected file including measured byte size.
      const error = await sprint42ImageError(asset); // SPRINT-42: mime + 5 MiB with filesystem fallback.
      if (error) { appAlert("Invalid image", error); return; } // SPRINT-42: explain type, unknown size, or size validation failure.
    } // SPRINT-42: finish per-asset validation.
    if (existingListingImages.length + listingImages.length + assets.length > 6) { appAlert("Max 6 photos", "A listing can have up to 6 photos."); return; } // SPRINT-42: enforce capacity across persisted and staged media.
    const files = assets.map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `listing_${existingListingImages.length + listingImages.length + index + 1}.jpg`, type: asset.mimeType ?? mimeForListingImage(asset.uri) })); // SPRINT-42: create backend-compatible multipart file metadata.
    if (isEditing && editId) { // SPRINT-42: apply image changes independently and immediately during edit.
      setImageBusy(true); // SPRINT-42: prevent overlapping image mutations.
      try { // SPRINT-42: retain authoritative backend errors.
        const images = await uploadListingImages(editId, files); // SPRINT-42: upload through the existing multipart implementation.
        setExistingListingImages([...images].sort((a, b) => a.order - b.order)); // SPRINT-42: consume the complete ordered response.
      } catch (errorValue) { // SPRINT-42: report immediate upload failure.
        appAlert("Upload failed", errorValue instanceof ApiError ? errorValue.message : "Could not upload images."); // SPRINT-42: show backend capacity messages exactly.
      } finally { setImageBusy(false); } // SPRINT-42: release image controls after upload.
      return; // SPRINT-42: do not stage edit-mode files for detail Save.
    } // SPRINT-42: finish immediate upload branch.
    setListingImages((previous) => [...previous, ...assets.map((asset, index) => ({ uri: asset.uri, name: files[index].name, mediaType: "photo" as const, mimeType: files[index].type, fileSize: asset.fileSize ?? undefined }))]); // SPRINT-42: retain validated create-mode images.
  }; // SPRINT-42: end listing image acceptance.

  const handleListingPickImages = () => { // SPRINT-42: add images while accounting for already-persisted edit media.
    if (existingListingImages.length + listingImages.length >= 6) { // SPRINT-42: enforce the complete listing capacity.
      appAlert("Max 6 photos", "You can add up to 6 listing photos."); // SPRINT-42: explain the capacity gate.
      return; // SPRINT-42: stop before opening the picker.
    } // SPRINT-42: finish capacity guard.
    const fromLibrary = async () => { // SPRINT-42: select one or more supported image files.
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Photo library access is needed."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: true,
        selectionLimit: 6 - existingListingImages.length - listingImages.length, quality: 0.85, // SPRINT-42: cap picker selection against persisted plus staged images.
      });
      if (!result.canceled && result.assets.length > 0) {
        await acceptListingImages(result.assets); // SPRINT-42: validate and apply selected files.
      }
    };
    const fromCamera = async () => { // SPRINT-42: capture a supported listing image.
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Camera access is needed."); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!result.canceled && result.assets[0]) {
        await acceptListingImages([result.assets[0]]); // SPRINT-42: validate and apply the captured image.
      }
    };
    showMediaPicker(fromLibrary, fromCamera, "Add Listing Photos");
  };

  const handleRemoveExistingListingImage = (image: HousingListingImageRef) => { // SPRINT-42: confirm before an immediate persisted-image removal.
    if (!editId || imageBusy) return; // SPRINT-42: require an active listing edit and idle image manager.
    appAlert("Remove photo?", "This image will be removed immediately.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: async () => { // SPRINT-42: make immediate behavior explicit.
      setImageBusy(true); // SPRINT-42: serialize remove with add/reorder.
      try { // SPRINT-42: preserve backend validation errors.
        const images = await removeListingImage(editId, image.id); // SPRINT-42: delete the selected persisted image.
        setExistingListingImages([...images].sort((a, b) => a.order - b.order)); // SPRINT-42: accept zero images as the valid empty state.
      } catch (errorValue) { appAlert("Remove failed", errorValue instanceof ApiError ? errorValue.message : "Could not remove the image."); } // SPRINT-42: surface backend errors.
      finally { setImageBusy(false); } // SPRINT-42: release the image manager.
    } }]); // SPRINT-42: close remove confirmation.
  }; // SPRINT-42: end immediate image removal.

  const handleMoveExistingListingImage = async (from: number, to: number) => { // SPRINT-42: optimistically persist a complete drag order.
    if (!editId || imageBusy || from === to) return; // SPRINT-42: ignore invalid or overlapping drops.
    const previous = existingListingImages; // SPRINT-42: retain the exact pre-drag order for rollback.
    const next = [...previous]; // SPRINT-42: create the optimistic image sequence.
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved); // SPRINT-42: move the dragged image to its drop index.
    setExistingListingImages(next.map((image, index) => ({ ...image, order: index }))); // SPRINT-42: update primary-photo labeling immediately.
    setImageBusy(true); // SPRINT-42: serialize the reorder request.
    try { // SPRINT-42: submit the complete exact-set image id order.
      const images = await reorderListingImages(editId, next.map((image) => image.id)); // SPRINT-42: persist the optimistic drop.
      setExistingListingImages([...images].sort((a, b) => a.order - b.order)); // SPRINT-42: reconcile with authoritative backend order.
    } catch (errorValue) { // SPRINT-42: revert a failed optimistic reorder.
      setExistingListingImages(previous); // SPRINT-42: restore the precise prior sequence.
      appAlert("Reorder failed", errorValue instanceof ApiError ? errorValue.message : "Could not reorder images."); // SPRINT-42: surface backend error text.
    } finally { setImageBusy(false); } // SPRINT-42: release image controls after drop.
  }; // SPRINT-42: end drag reorder handler.

  const handleAttachFile = () => {
    const maxAttach = type.id === "shared_space" ? 6 : 5;
    if (type.id !== "story" && attachedFiles.length >= maxAttach) {
      appAlert(`Max ${maxAttach} photos`, `You can attach up to ${maxAttach} images for this post type.`);
      return;
    }
    const isStory = type.id === "story";
    const imagesOnly = type.id === "shared_space";

    const fromLibrary = async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Photo library access is needed to attach images."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: imagesOnly ? ['images'] : ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: isStory ? 1 : (type.id === "shared_space" ? 6 : 5) - attachedFiles.length,
        quality: isStory ? 0.9 : 0.8,
        videoMaxDuration: isStory ? 120 : undefined,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newFiles = result.assets
          .filter((a) => !imagesOnly || (a.type || "image").toLowerCase() !== "video")
          .map((a, i) => {
            const isVideo = (a.type || "image").toLowerCase() === "video";
            return { uri: a.uri, name: a.fileName || `media_${attachedFiles.length + i + 1}.${isVideo ? "mp4" : "jpg"}`, mediaType: (isVideo ? "video" : "photo") as "photo" | "video", duration: a.duration } as AttachedMedia;
          });
        if (isStory) setAttachedFiles(newFiles.slice(0, 1));
        else setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, type.id === "shared_space" ? 6 : 5));
      }
    };
    const fromCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Camera access is needed to take photos."); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: imagesOnly ? ['images'] : ['images', 'videos'],
        quality: isStory ? 0.9 : 0.8, videoMaxDuration: isStory ? 120 : undefined,
      });
      if (!result.canceled && result.assets.length > 0) {
        const a = result.assets[0];
        const isVideo = !imagesOnly && (a.type || "image").toLowerCase() === "video";
        const newItem: AttachedMedia = { uri: a.uri, name: a.fileName || `camera_${attachedFiles.length + 1}.${isVideo ? "mp4" : "jpg"}`, mediaType: isVideo ? "video" : "photo", duration: a.duration ?? undefined };
        if (isStory) setAttachedFiles([newItem]);
        else setAttachedFiles((prev) => [...prev, newItem].slice(0, type.id === "shared_space" ? 6 : 5));
      }
    };
    showMediaPicker(fromLibrary, fromCamera, "Add Media");
  };

  const handleAttachSpecificMedia = (mediaType: "Images" | "Videos") => {
    const fromLibrary = async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", `Photo library access is needed to attach ${mediaType.toLowerCase()}.`); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === "Images" ? ['images'] : ['videos'],
        allowsMultipleSelection: false, selectionLimit: 1, quality: 0.9, videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets.length > 0) {
        const a = result.assets[0];
        const isVideo = (a.type || "image").toLowerCase() === "video";
        setAttachedFiles([{ uri: a.uri, name: a.fileName || `story_media.${isVideo ? "mp4" : "jpg"}`, mediaType: isVideo ? "video" : "photo", duration: a.duration ?? undefined, fileSize: a.fileSize ?? undefined }]);
      }
    };
    const fromCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { appAlert("Permission Required", "Camera access is needed to take a photo or record video."); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: mediaType === "Images" ? ['images'] : ['videos'], quality: 0.9, videoMaxDuration: 120 });
      if (!result.canceled && result.assets.length > 0) {
        const a = result.assets[0];
        const isVideo = (a.type || "image").toLowerCase() === "video";
        setAttachedFiles([{ uri: a.uri, name: a.fileName || `story_camera.${isVideo ? "mp4" : "jpg"}`, mediaType: isVideo ? "video" : "photo", duration: a.duration ?? undefined, fileSize: a.fileSize ?? undefined }]);
      }
    };
    showMediaPicker(fromLibrary, fromCamera, mediaType === "Images" ? "Add Photo" : "Add Video");
  };

  const handlePost = async () => {
    if (!user?.id) {
      appAlert("Sign in required", "Log in to publish content.");
      return;
    }
    if (isEditing && type.id === "news") { // SPRINT-42: enforce the feed PATCH contract before dirty comparison.
      if (title.trim().length < 1 || title.trim().length > 120) { appAlert("Invalid title", "Title must be between 1 and 120 characters."); return; } // SPRINT-42: validate title bounds.
      if (body.trim().length < 1 || body.trim().length > 2000) { appAlert("Invalid content", "Content must be between 1 and 2000 characters."); return; } // SPRINT-42: validate content bounds.
      if (location.trim().length > 200) { appAlert("Invalid location", "Location must be 200 characters or fewer."); return; } // SPRINT-42: validate location bound.
      if (sourceLabel.trim().length > 100) { appAlert("Invalid source label", "Source label must be 100 characters or fewer."); return; } // SPRINT-42: validate source-label bound.
      if (!newsCategory || !NEWS_LABEL_TO_FEED[newsCategory]) { appAlert("Invalid category", "Choose a valid category."); return; } // SPRINT-42: reject unmapped category values.
    } // SPRINT-42: finish feed edit validation.
    if (!canPost || submitting) return;

    const labels: Record<string, string> = {
      listing: "Listing Published! 🏠",
      shared_space: "Shared space listed! 🏠",
      restaurant: "Restaurant Added! 🍽️",
      event: "Event Created! 🎉",
      news: "Post Published! 📰",
      story: "Story Shared! 📸",
      challenge: "Challenge Created! 🏆",
    };
    const routeMap: Record<string, string> = {
      news: "/(tabs)/feed",
      event: "/(tabs)/feed",
      listing: "/(tabs)/housing",
      shared_space: "/(tabs)/housing",
      restaurant: "/(tabs)/food",
      story: "/(tabs)/feed",
      challenge: "/(tabs)/feed",
    };
    const targetRoute = routeMap[type.id] || "/(tabs)/feed";
    let createdListingId: string | undefined;
    const goAfterPublish = () => {
      if (type.id === "story") {
        router.push({ pathname: "/(tabs)/feed", params: { exploreTab: "Stories" } } as any);
      } else if (type.id === "listing" && createdListingId) {
        router.push({
          pathname: "/(tabs)/housing",
          params: { openListing: createdListingId },
        } as any);
      } else {
        router.push(targetRoute as any);
      }
    };

    setSubmitting(true);
    try {
      switch (type.id) {
        case "news": {
          const cat = newsCategory ? NEWS_LABEL_TO_FEED[newsCategory] ?? "COMMUNITY" : "COMMUNITY";
          const current = { title: title.trim(), content: body.trim(), category: cat, tags: newsTags ? newsTags.split(",").map((tag) => tag.trim()).filter(Boolean) : [], location: location.trim(), sourceLabel: sourceLabel.trim() }; // SPRINT-42: normalize all six editable feed fields.
          if (isEditing && editId) { // SPRINT-42: save only feed fields changed from the loaded detail.
            const original = editOriginalRef.current ?? {}; // SPRINT-42: read the in-memory edit baseline.
            const dirty = Object.fromEntries(Object.entries(current).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key]))) as UpdatePostPayload; // SPRINT-42: construct a dirty-field-only PATCH payload.
            if (Object.keys(dirty).length === 0) { router.back(); return; } // SPRINT-42: no changes navigates back without a request.
            await updatePost(editId, dirty); // SPRINT-42: PATCH and publish the immediate in-memory UI update.
            break; // SPRINT-42: skip create behavior in edit mode.
          } // SPRINT-42: finish feed update branch.
          await createPost({
            title: title.trim(),
            content: body.trim(),
            category: cat,
            tags: newsTags ? newsTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
            location: location.trim() || undefined,
            sourceLabel: sourceLabel.trim() || undefined, // SPRINT-42: support source attribution during creation too.
            mediaAssets: attachedFiles,
          });
          break;
        }
        case "event": {
          const dateIso = parseFlexibleDateToIsoDate(eventDate);
          if (!dateIso) {
            appAlert("Invalid date", "Enter a valid date (e.g. Mar 15, 2026 or 2026-03-15).");
            return;
          }
          if (ticketType === "Paid") {
            const p = parseFloat(ticketPrice);
            if (Number.isNaN(p) || p < 0) {
              appAlert("Ticket price", "Enter a valid price for paid tickets.");
              return;
            }
          }
          const createdEvent = await createEvent({
            title: title.trim(),
            description: body.trim(),
            category: mapEventCategoryLabel(eventCategory),
            format: mapEventFormatLabel(eventFormat),
            date: dateIso,
            startTime: eventTime.trim(),
            endTime: eventEndTime.trim() || undefined,
            venue: location.trim(),
            city: user.city?.trim() || "Unknown",
            ticketType: ticketType === "Paid" ? "PAID" : "FREE",
            ticketPrice: ticketType === "Paid" ? parseFloat(ticketPrice) : undefined,
            capacity: (() => {
              if (!maxAttendees.trim()) return undefined;
              const n = parseInt(maxAttendees, 10);
              return Number.isNaN(n) ? undefined : n;
            })(),
          });
          const eventPhotos = attachedFiles.filter((f) => f.mediaType === "photo");
          if (eventPhotos.length > 0 && createdEvent?.id) {
            await uploadEventImages(
              createdEvent.id,
              eventPhotos.map((f, i) => ({
                uri: f.uri,
                name: f.name || `event_${i + 1}.jpg`,
              })),
            );
          }
          break;
        }
        case "shared_space": {
          if (!sharedSpaceValid) {
            const missing: string[] = [];
            if (!title.trim()) missing.push("title");
            if (!body.trim()) missing.push("description");
            if (!location.trim()) missing.push("address");
            if (!sharedSpaceCity.trim()) missing.push("city");
            if (!sharedSpaceCountry.trim()) missing.push("country");
            if (Number.isNaN(sharedSpacePriceNum) || sharedSpacePriceNum <= 0) missing.push("monthly rent");
            appAlert("Missing information", `Please fill: ${missing.join(", ")}`);
            return;
          }
          const space = await createSharedSpace({
            title: title.trim(),
            description: body.trim(),
            address: location.trim(),
            city: sharedSpaceCity.trim(),
            state: sharedSpaceState.trim() || undefined,
            country: sharedSpaceCountry.trim(),
            price: sharedSpacePriceNum,
            currency: (sharedSpaceCurrency.trim() || "USD").toUpperCase().slice(0, 8),
            deposit: sharedSpaceDeposit.trim() ? parseFloat(sharedSpaceDeposit.replace(/,/g, "")) : undefined,
            rooms: parseInt(sharedSpaceRooms, 10) || 1,
            bathrooms: parseInt(sharedSpaceBaths, 10) || 1,
            totalOccupants: parseInt(sharedSpaceTotalOccupants, 10) || 1,
            availableSpots: parseInt(sharedSpaceAvailableSpots, 10) || 1,
            petPolicy: sharedSpacePetPolicy.trim() || undefined,
            smoking: sharedSpaceSmoking,
            amenities: sharedSpaceAmenities.length ? sharedSpaceAmenities : undefined,
            houseRules: sharedSpaceHouseRules.trim() ? [sharedSpaceHouseRules.trim()] : [],
          });
          const photoFiles = attachedFiles.filter((f) => f.mediaType === "photo");
          if (photoFiles.length > 0) {
            await uploadSharedSpaceImages(
              space.id,
              photoFiles.map((f, i) => ({
                uri: f.uri,
                name: f.name || `space_${i + 1}.jpg`,
                type: mimeForListingImage(f.uri),
              })),
            );
          }
          break;
        }
        case "listing": {
          if (!validateListingStep(1)) {
            setListingStep(1);
            return;
          }
          if (!validateListingStep(2)) {
            setListingStep(2);
            return;
          }
          if (!validateListingStep(3)) {
            setListingStep(3);
            return;
          }
          const depositNum = deposit.trim() ? parseFloat(deposit.replace(/,/g, "")) : undefined;
          const sqftNum = sqft.trim() ? parseInt(sqft, 10) : undefined;
          const floorStr = floor.trim() || undefined;
          const walkNum = walkScoreStr.trim() ? parseInt(walkScoreStr, 10) : NaN;
          const current: UpdateListingPayload = { // SPRINT-42: normalize every Sprint 37 editable listing detail without coordinates or images.
            title: title.trim(), // SPRINT-42: include the validated listing title.
            description: body.trim(), // SPRINT-42: include the validated listing description.
            propertyType: mapPropertyTypeLabel(propType), // SPRINT-42: persist the canonical property enum.
            price: listingPriceNum, // SPRINT-42: include monthly price.
            currency: (listingCurrency.trim() || "USD").toUpperCase().slice(0, 8), // SPRINT-42: use editable listing currency (loaded from listing in edit mode).
            deposit: depositNum != null && !Number.isNaN(depositNum) ? depositNum : undefined, // SPRINT-42: include optional deposit including zero.
            bedrooms: listingBedsNum, // SPRINT-42: include bedroom count.
            bathrooms: listingBathsNum, // SPRINT-42: include bathroom count.
            sqft: sqftNum != null && !Number.isNaN(sqftNum) ? sqftNum : undefined, // SPRINT-42: include optional area.
            floor: floorStr, // SPRINT-42: include optional floor.
            address: location.trim(), // SPRINT-42: include address without coordinates.
            neighborhood: neighborhood.trim() || undefined, // SPRINT-42: include optional neighborhood.
            city: listingCityEff, // SPRINT-42: include city (no profile fallback while editing).
            state: isEditing ? (listingState.trim() || undefined) : (listingState.trim() || user.stateProvince?.trim() || undefined), // SPRINT-42: edit mode never injects profile state.
            country: listingCountryEff, // SPRINT-42: include country (no profile fallback while editing).
            availableDate: available.trim() ? normalizeAvailableDateValue(available) : undefined, // SPRINT-42: compare/PATCH the same YYYY-MM-DD shape as baseline.
            leaseTerm: leaseTerm.trim() || undefined, // SPRINT-42: include optional lease term.
            isFurnished: listingFurnishedSwitch, // SPRINT-42: use the canonical furnished field.
            petPolicy: petPolicy.trim() || undefined, // SPRINT-42: include optional pet policy.
            parking: parking.trim() || undefined, // SPRINT-42: include optional parking.
            laundry: laundry.trim() || undefined, // SPRINT-42: include optional laundry.
            heating: heating.trim() || undefined, // SPRINT-42: include optional heating.
            cooling: cooling.trim() || undefined, // SPRINT-42: include optional cooling.
            utilities: utilitiesText.trim() || undefined, // SPRINT-42: include optional utilities.
            yearBuilt: yearBuiltStr.trim() && yearBuiltOk && !Number.isNaN(yearBuiltParsed) ? yearBuiltParsed : undefined, // SPRINT-42: include optional construction year.
            amenities: amenities.length ? amenities : undefined, // SPRINT-42: include canonical amenities.
            transitInfo: transitInfoStr.trim() || undefined, // SPRINT-42: include optional transit details.
            walkScore: !Number.isNaN(walkNum) ? walkNum : undefined, // SPRINT-42: include optional walk score.
            ...(isEditing ? { status: listingStatus } : {}), // SPRINT-42: expose status only to listing owners in edit mode.
          }; // SPRINT-42: finish normalized listing details.
          if (isEditing && editId) { // SPRINT-42: save listing details independently from immediate image operations.
            const original = editOriginalRef.current ?? {}; // SPRINT-42: read the loaded listing baseline.
            const dirty = buildDirtyListingPayload(current, original); // SPRINT-42: null/undefined empties compare equal; only real changes remain.
            const bodyKeys = Object.keys(dirty).filter((key) => (dirty as Record<string, unknown>)[key] !== undefined); // SPRINT-42: ensure the JSON body would contain at least one key.
            if (bodyKeys.length === 0) { router.back(); return; } // SPRINT-42: no-op Save navigates back without PATCH {}.
            await updateListing(editId, dirty); // SPRINT-42: PATCH dirty fields and publish the in-memory listing update.
            break; // SPRINT-42: skip listing creation and image staging in edit mode.
          } // SPRINT-42: finish listing edit branch.
          const listing = await createListing(current as Parameters<typeof createListing>[0]); // SPRINT-42: reuse fully validated normalized fields for listing creation.
          createdListingId = listing.id;
          const photoFiles = listingImages.filter((f) => f.mediaType === "photo");
          if (photoFiles.length > 0) {
            try {
              await uploadListingImages(
                listing.id,
                photoFiles.map((f, i) => ({
                  uri: f.uri,
                  name: f.name || `listing_${i + 1}.jpg`,
                  type: mimeForListingImage(f.uri),
                })),
              );
            } catch {
              appAlert(
                "Photos not uploaded",
                "Your listing was published, but some images failed to upload. Open the listing to try again.",
              );
            }
          }
          break;
        }
        case "restaurant": {
          if (restaurantPostMode === "owner") {
            // Validate address format — must be meaningful (not just whitespace or very short)
            if (location.trim().length < 5) {
              appAlert("Invalid Address", "Please enter a complete street address for your restaurant.");
              setSubmitting(false);
              return;
            }
            if (!/\d/.test(location.trim()) && location.trim().split(" ").length < 3) {
              appAlert("Invalid Address", "Address should include a street number and street name (e.g. 123 Main St).");
              setSubmitting(false);
              return;
            }
            if (phone.trim() && !/^\+?[\d\s\-().]{7,20}$/.test(phone.trim())) {
              appAlert("Invalid Phone Number", "Please enter a valid business phone number (e.g. +1 555 000 0000).");
              setSubmitting(false);
              return;
            }
            if (businessEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail.trim())) {
              appAlert("Invalid Email", "Please enter a valid business email address.");
              setSubmitting(false);
              return;
            }
          }
          if (restaurantPostMode === "review") {
            const rating = reviewStars!;
            const { data } = await getRestaurants({ search: restName.trim(), pageSize: 30 });
            const ql = restName.trim().toLowerCase();
            const exact = data.filter((r) => r.name.toLowerCase() === ql);
            const target = exact[0] ?? (data.length === 1 ? data[0] : undefined);
            if (!target) {
              appAlert(
                "Restaurant not found",
                exact.length > 1
                  ? "Multiple venues share that name. Open the restaurant in the Food tab and leave your review there."
                  : "We could not find a match. Check spelling or review from the restaurant page.",
              );
              return;
            }
            await submitReview(target.id, { rating, content: body.trim() });
          } else {
            const services = features.length > 0 ? features : ["Dine-in"];
            const tags = [businessType, cuisine].filter((x) => (x || "").trim().length > 0) as string[];
            const waitParsed = parseInt(restWaitTime.trim(), 10);
            const waitOk = !Number.isNaN(waitParsed) && waitParsed > 0;
            const avgPriceParsed = parseInt(avgPricePerPerson.trim(), 10);
            const avgPriceOk = !Number.isNaN(avgPriceParsed) && avgPriceParsed > 0;
            const restaurant = await createRestaurant({
              name: restName.trim(),
              cuisine: cuisine.trim(),
              description: body.trim(),
              address: location.trim(),
              city: restCity.trim(),
              state: restState.trim() || undefined,
              country: restCountry.trim(),
              phoneNumber: phone.trim() || undefined,
              priceRange: mapRestaurantPriceChip(priceRange),
              openingTime: openTime.trim() || undefined,
              closingTime: closeTime.trim() || undefined,
              availableServices: services,
              tags: tags.length ? tags : undefined,
              popularDishes: restTags.map((name, rank) => ({ name, rank: rank + 1 })),
              ...(waitOk ? { waitTimeMinutes: waitParsed } : {}),
              ...(avgPriceOk ? { avgPricePerPerson: avgPriceParsed } : {}),
              // FOD-02: business timezone/currency so every viewer sees the business's own hours and prices.
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
              ...(getBusinessCurrency(null, restCountry) ? { currency: getBusinessCurrency(null, restCountry)!.code } : {}),
            });
            const photoFiles = attachedFiles.filter((f) => f.mediaType === "photo");
            if (photoFiles.length > 0) {
              await uploadRestaurantImages(
                restaurant.id,
                photoFiles.map((f, i) => ({
                  uri: f.uri,
                  name: f.name || `restaurant_${i + 1}.jpg`,
                  type: mimeForListingImage(f.uri),
                })),
              );
            }
          }
          break;
        }
        case "story": {
          const mediaFile = attachedFiles[0];
          if (!mediaFile) break;
          const isPhoto = mediaFile.mediaType === "photo";
          const rawDur = mediaFile.duration;
          const durationSeconds =
            !isPhoto && rawDur != null && Number.isFinite(rawDur)
              ? Math.min(300, Math.max(1, Math.round(rawDur)))
              : undefined;
          const storyHashTagsParsed = storyTagsInput
            ? storyTagsInput.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean)
            : undefined;
          await createStory({
            title: title.trim(),
            mediaType: mapStoryMediaUi(isPhoto ? "photo" : "video"),
            category: mapStoryCategoryLabel(storyCatPick),
            details: body.trim() || undefined,
            hashtags: storyHashTagsParsed,
            location: location.trim() || undefined,
            durationSeconds,
            media: { uri: mediaFile.uri, name: mediaFile.name },
          });
          break;
        }
        case "challenge": {
          const maxP = challengeMaxParticipants.trim();
          await createChallenge({
            title: title.trim(),
            type: mapChallengeTypeLabel(challengeType),
            details: body.trim() || undefined,
            duration: mapChallengeDurationLabel(challengeDuration),
            goalCondition: challengeGoal.trim(),
            reward: challengeReward.trim(),
            maxParticipants: (() => {
              if (!maxP) return undefined;
              const n = parseInt(maxP, 10);
              return Number.isNaN(n) ? undefined : n;
            })(),
            hashtags: challengeHashtags.trim() ? splitHashtagInput(challengeHashtags) : undefined,
            location: location.trim() || undefined,
          });
          break;
        }
        default:
          break;
      }

      if (isEditing) { router.back(); return; } // SPRINT-42: return to the subscribed visible surface immediately after a successful PATCH.
      void useSidebarStore.getState().fetchSidebarData();
      appAlert(labels[type.id] ?? "Published! 🎉", "Your content was submitted.", [
        { text: "View", onPress: goAfterPublish },
        { text: "Done", onPress: goAfterPublish },
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Something went wrong. Try again.";
      appAlert("Could not publish", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Build preview extra fields
  const extraFields: { label: string; value: string; icon: string }[] = [];
  if (type.id === "listing") {
    if (propType) extraFields.push({ label: "Type", value: propType, icon: "home-outline" });
    if (price) {
      const parsedPrice = Number(price);
      extraFields.push({
        label: "Price",
        value: `${Number.isFinite(parsedPrice) ? formatPrice(parsedPrice, listingCurrency) : `${derivedListingCurrency.symbol}${price}`}/mo`,
        icon: "cash-outline",
      });
    }
    if (beds) extraFields.push({ label: "Beds", value: beds, icon: "bed-outline" });
    if (baths) extraFields.push({ label: "Baths", value: baths, icon: "water-outline" });
    if (sqft) extraFields.push({ label: "Sqft", value: sqft, icon: "resize-outline" });
    if (petPolicy) extraFields.push({ label: "Pets", value: petPolicy, icon: "paw-outline" });
    if (parking) extraFields.push({ label: "Parking", value: parking, icon: "car-outline" });
    if (available) extraFields.push({ label: "Available", value: available, icon: "calendar-outline" });
    if (laundry) extraFields.push({ label: "Laundry", value: laundry, icon: "shirt-outline" });
    if (heating) extraFields.push({ label: "Heating", value: heating, icon: "flame-outline" });
    if (cooling) extraFields.push({ label: "Cooling", value: cooling, icon: "snow-outline" });
    if (utilitiesText.trim()) extraFields.push({ label: "Utilities", value: utilitiesText.trim(), icon: "flash-outline" });
    if (leaseTerm.trim()) extraFields.push({ label: "Lease", value: leaseTerm.trim(), icon: "document-text-outline" });
    if (neighborhood) extraFields.push({ label: "Neighborhood", value: neighborhood, icon: "map-outline" });
    if (listingFurnishedSwitch) extraFields.push({ label: "Furnished", value: "Yes", icon: "bed-outline" });
  } else if (type.id === "restaurant") {
    if (cuisine) extraFields.push({ label: "Cuisine", value: cuisine, icon: "restaurant-outline" });
    if (priceRange) extraFields.push({ label: "Price", value: priceRange, icon: "cash-outline" });
    if (phone) extraFields.push({ label: "Phone", value: phone, icon: "call-outline" });
  } else if (type.id === "shared_space") {
    if (sharedSpacePrice) {
      const parsedRent = Number(sharedSpacePrice);
      extraFields.push({
        label: "Rent",
        value: `${Number.isFinite(parsedRent) ? formatPrice(parsedRent, listingCurrency) : `${derivedListingCurrency.symbol}${sharedSpacePrice}`}/mo`,
        icon: "cash-outline",
      });
    }
    if (sharedSpaceRooms) extraFields.push({ label: "Rooms", value: sharedSpaceRooms, icon: "home-outline" });
    if (sharedSpaceCity) extraFields.push({ label: "City", value: sharedSpaceCity, icon: "location-outline" });
  } else if (type.id === "event") {
    if (eventDate) extraFields.push({ label: "Date", value: eventDate, icon: "calendar-outline" });
    if (eventTime) extraFields.push({ label: "Time", value: eventTime, icon: "time-outline" });
    if (eventFormat) extraFields.push({ label: "Format", value: eventFormat, icon: "globe-outline" });
    if (ticketType === "Free") extraFields.push({ label: "Tickets", value: "Free", icon: "ticket-outline" });
    else if (ticketPrice) extraFields.push({ label: "Tickets", value: `$${ticketPrice}`, icon: "ticket-outline" });
    if (maxAttendees) extraFields.push({ label: "Capacity", value: maxAttendees, icon: "people-outline" });
  } else if (type.id === "news") {
    if (newsCategory) extraFields.push({ label: "Category", value: newsCategory, icon: "newspaper-outline" });
  } else if (type.id === "story") {
    const f0 = attachedFiles[0];
    if (f0) {
      extraFields.push({
        label: "Media",
        value: f0.mediaType === "video" ? "Video" : "Photo",
        icon: f0.mediaType === "video" ? "videocam-outline" : "image-outline",
      });
    }
  } else if (type.id === "challenge") {
    if (challengeType) extraFields.push({ label: "Type", value: challengeType, icon: "trophy-outline" });
    if (challengeDuration) extraFields.push({ label: "Duration", value: challengeDuration, icon: "time-outline" });
    if (challengeGoal) extraFields.push({ label: "Goal", value: challengeGoal, icon: "flag-outline" });
    if (challengeReward) extraFields.push({ label: "Reward", value: challengeReward, icon: "gift-outline" });
    if (challengeMaxParticipants) extraFields.push({ label: "Max", value: challengeMaxParticipants, icon: "people-outline" });
    if (challengeHashtags) extraFields.push({ label: "Tags", value: challengeHashtags, icon: "pricetag-outline" });
  }

  const storyPreviewMediaType =
    type.id === "story" && attachedFiles[0]?.mediaType === "video" ? "video" : "photo";
  const storyPreviewDuration =
    type.id === "story" &&
    attachedFiles[0]?.mediaType === "video" &&
    attachedFiles[0].duration != null &&
    Number.isFinite(attachedFiles[0].duration)
      ? String(Math.round(attachedFiles[0].duration))
      : "";

  const previewUserName = user?.name?.trim() || "You";
  const previewUserInitials = user?.name?.trim()
    ? user.name.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() ?? "").join("").slice(0, 2)
    : "ME";

  if (editLoading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: tc.pageBg }}><ActivityIndicator color={type.color} /><Text style={{ color: tc.textSecondary, marginTop: 10 }}>Loading editor…</Text></View>; // SPRINT-42: prevent editing stale defaults while detail data loads.

  return (
    <>
      {/* ── Header ── */}
      <LinearGradient
        colors={type.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerGrad}
      >
        <View style={s.header}>
          <Pressable
              onPress={onBack}
              style={s.backBtn}
              hitSlop={10}
            >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <View style={s.headerTypePill}>
            <Ionicons name={type.icon} size={13} color="#FFF" />
            <Text style={s.headerTypePillText} numberOfLines={1}>{type.label}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={[s.scroll, { backgroundColor: tc.pageBg }]}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ════════ LISTING FORM ════════ */}
        {type.id === "listing" && (
          <>
            {/* Soft verification boost notice */}
            {canPostListing &&
              !isAdmin &&
              !isVerifiedLandlord &&
              !isVerifiedAgency && (
              <View style={[s.modeLockedNotice, { borderColor: "#30855B", backgroundColor: isDark ? tc.successBg : "#F0FDF4" }]}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#15803D" />
                <Text style={[s.modeLockedText, { color: isDark ? tc.successText : "#14532D" }]}>
                  {"Anyone can list a property — "}
                  <Text style={{ fontWeight: "800" }}>Verified Property Host</Text>
                  {" badge holders get a trust indicator and higher visibility. "}
                  <Text
                    style={{ fontWeight: "800", color: "#15803D", textDecorationLine: "underline" }}
                    onPress={() => router.push({ pathname: "/apply-badge" as any, params: { badgeType: "landlord" } })}
                  >Get verified</Text>
                </Text>
              </View>
            )}
            <Text style={{ textAlign: "center", marginBottom: 6, color: tc.textSecondary, fontWeight: "800" }}>
              Step {listingStep} of 4
            </Text>
            {listingStepError ? (
              <Text style={{ color: "#DC2626", marginBottom: 10, fontWeight: "600", textAlign: "center" }}>
                {listingStepError}
              </Text>
            ) : null}

            {listingStep === 1 && (
            <>
            <SectionLabel label="TITLE" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Spacious 2BR in Downtown Manhattan"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            <SectionLabel label="PROPERTY TYPE" color={type.color} />
            <ChipSelect
              options={["Apartment", "House", "Studio", "Room"]}
              value={propType}
              onChange={setPropType}
              color={type.color}
              bg={type.bg}
            />

            <SectionLabel label="PRICE & FEES" color={type.color} />
            <View style={s.rowFields}>
              <View style={[s.inputWrap, { flex: 1, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                <View style={s.fieldWithIcon}>
                  <Text style={[s.fieldPrefix, { color: type.color }]}>{derivedListingCurrency.symbol}</Text>
                  <TextInput
                    style={[s.fieldInput, { color: tc.textPrimary }]}
                    placeholder="Rent/mo"
                    placeholderTextColor={tc.textTertiary}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={[s.inputWrap, { flex: 1, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                <View style={s.fieldWithIcon}>
                  <Text style={[s.fieldPrefix, { color: type.color }]}>{derivedListingCurrency.symbol}</Text>
                  <TextInput
                    style={[s.fieldInput, { color: tc.textPrimary }]}
                    placeholder="Deposit"
                    placeholderTextColor={tc.textTertiary}
                    value={deposit}
                    onChangeText={setDeposit}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <SectionLabel label="DESCRIPTION" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                placeholder="Describe the property — size, neighborhood, nearby transit, what makes it special..."
                placeholderTextColor={tc.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                maxLength={5000}
              />
              <Text style={s.charCount}>{body.length}/5000</Text>
            </View>
            </>
            )}

            {listingStep === 2 && (
            <>
            <SectionLabel label="ROOMS & SIZE" color={type.color} />
            <View style={s.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]}>Beds</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={tc.textTertiary}
                    value={beds}
                    onChangeText={setBeds}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]}>Baths</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={tc.textTertiary}
                    value={baths}
                    onChangeText={setBaths}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]}>Sqft</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={tc.textTertiary}
                    value={sqft}
                    onChangeText={setSqft}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]} numberOfLines={1}>Floor</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="e.g. 3rd"
                    placeholderTextColor={tc.textTertiary}
                    value={floor}
                    onChangeText={setFloor}
                  />
                </View>
              </View>
            </View>

            <SectionLabel label="AVAILABILITY" color={type.color} />
            <DatePickerField
              value={available}
              onChange={setAvailable}
              placeholder="Select available-from date"
              accentColor={type.color}
              dateFormat="event"
              minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
              style={{ borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
              textStyle={{ color: tc.textPrimary }}
              forceDark={isDark}
            />

            <SectionLabel label="YEAR BUILT (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. 2018"
                placeholderTextColor={tc.textTertiary}
                value={yearBuiltStr}
                onChangeText={setYearBuiltStr}
                keyboardType="numeric"
              />
            </View>

            <SectionLabel label="LEASE TERM (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. 12 months, Month-to-month"
                placeholderTextColor={tc.textTertiary}
                value={leaseTerm}
                onChangeText={setLeaseTerm}
              />
            </View>

            <SectionLabel label="FURNISHED" color={type.color} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: tc.cardBg,
                borderWidth: 1,
                borderColor: tc.borderLight,
              }}
            >
              <Text style={{ color: tc.textPrimary, fontWeight: "700" }}>Furnished</Text>
              <Switch
                value={listingFurnishedSwitch}
                onValueChange={setListingFurnishedSwitch}
                trackColor={{ false: "#D1D5DB", true: type.color }}
              />
            </View>

            </>
            )}

            {listingStep === 3 && (
            <>
            <SectionLabel label="PARKING (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. Street parking, 1 garage spot"
                placeholderTextColor={tc.textTertiary}
                value={parking}
                onChangeText={setParking}
              />
            </View>

            <SectionLabel label="LAUNDRY (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. In-unit washer/dryer"
                placeholderTextColor={tc.textTertiary}
                value={laundry}
                onChangeText={setLaundry}
              />
            </View>

            <SectionLabel label="HEATING (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. Central heat"
                placeholderTextColor={tc.textTertiary}
                value={heating}
                onChangeText={setHeating}
              />
            </View>

            <SectionLabel label="COOLING (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. Central A/C"
                placeholderTextColor={tc.textTertiary}
                value={cooling}
                onChangeText={setCooling}
              />
            </View>

            <SectionLabel label="UTILITIES" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.bodyInput, { color: tc.textPrimary, minHeight: 44 }]}
                placeholder="e.g. Tenant pays electric & gas"
                placeholderTextColor={tc.textTertiary}
                value={utilitiesText}
                onChangeText={setUtilitiesText}
              />
            </View>

            <SectionLabel label="NEIGHBORHOOD" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="map-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="e.g. Chelsea, Midtown, Williamsburg..."
                placeholderTextColor={tc.textTertiary}
                value={neighborhood}
                onChangeText={setNeighborhood}
              />
            </View>

            <SectionLabel label="CITY" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="City"
                placeholderTextColor={tc.textTertiary}
                value={listingCity}
                onChangeText={setListingCity}
              />
            </View>

            <SectionLabel label="STATE / PROVINCE (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="State or province"
                placeholderTextColor={tc.textTertiary}
                value={listingState}
                onChangeText={setListingState}
              />
            </View>

            <SectionLabel label="COUNTRY" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="Country"
                placeholderTextColor={tc.textTertiary}
                value={listingCountry}
                onChangeText={setListingCountry}
              />
            </View>

            <SectionLabel label="TRANSIT INFO (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. 2 min to 6 train"
                placeholderTextColor={tc.textTertiary}
                value={transitInfoStr}
                onChangeText={setTransitInfoStr}
              />
            </View>

            <SectionLabel label="WALK SCORE (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="0–100"
                placeholderTextColor={tc.textTertiary}
                value={walkScoreStr}
                onChangeText={setWalkScoreStr}
                keyboardType="numeric"
              />
            </View>

            <SectionLabel label="ADDRESS" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Full street address..."
                placeholderTextColor={tc.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>
            </>
            )}

            {listingStep === 4 && (
            <>
            {isEditing ? <><SectionLabel label="LISTING DETAILS — SAVED WITH BUTTON BELOW" color={type.color} /><SectionLabel label="STATUS" color={type.color} /><ChipSelect options={["AVAILABLE", "RENTED", "UNLISTED"]} value={listingStatus} onChange={(value) => setListingStatus(value as ListingStatus)} color={type.color} bg={type.bg} /></> : null}
            {/* SPRINT-42: separate owner detail/status Save from immediate image operations. */}
            <SectionLabel label="PET POLICY (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary, minHeight: 72 }]}
                placeholder="e.g. Cats allowed, no dogs"
                placeholderTextColor={tc.textTertiary}
                value={petPolicy}
                onChangeText={setPetPolicy}
                multiline
                textAlignVertical="top"
              />
            </View>

            <SectionLabel label="AMENITIES" color={type.color} />
            <ChipMulti
              options={[
                "Pet Friendly",
                "Gym",
                "Doorman",
                "Rooftop",
                "Pool",
                "Elevator",
                "Wheelchair Accessible",
                "Bike Storage",
                "Storage Unit",
                "Concierge",
                "In-Unit Laundry",
                "Dishwasher",
                "Balcony",
                "Backyard",
                "Parking Included",
              ]}
              value={amenities}
              onChange={setAmenities}
              color={type.color}
              bg={type.bg}
            />

            <SectionLabel label={isEditing ? "IMAGES — CHANGES APPLY IMMEDIATELY" : "PHOTOS (OPTIONAL, UP TO 6)"} color={type.color} />
            {/* SPRINT-42: explicitly separate image mutations from listing detail Save. */}
            <Pressable
              disabled={imageBusy} // SPRINT-42: prevent overlapping immediate image operations.
              onPress={() => void handleListingPickImages()}
              style={[s.mediaBtn, { backgroundColor: tc.cardBg, borderColor: type.color + "55" }]}
            >
              <LinearGradient
                colors={type.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.mediaIconCircle}
              >
                <Ionicons name="images-outline" size={22} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.mediaBtnTitle, { color: tc.textPrimary }]}>
                  {existingListingImages.length + listingImages.length > 0 ? "Add more photos" : "Add listing photos"}
                  {/* SPRINT-42: count persisted and staged listing images together. */}
                </Text>
                <Text style={[s.mediaBtnDesc, { color: tc.textSecondary }]}>
                  {existingListingImages.length + listingImages.length}/6 — JPEG, PNG, or WebP · max 5 MiB {/* SPRINT-42: state the enforced format, size, and complete count. */}
                </Text>
              </View>
              <View style={[s.mediaBtnPlus, { backgroundColor: type.bg }]}>
                <Ionicons name="add" size={16} color={type.color} />
              </View>
            </Pressable>
            {isEditing && existingListingImages.length === 0 ? <Text style={{ color: tc.textSecondary, marginTop: 10 }}>No listing images yet.</Text> : null}
            {/* SPRINT-42: zero images is a valid, calm empty state. */}
            {existingListingImages.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 6 }}>{existingListingImages.map((image, index) => <DraggableListingImage key={image.id} image={image} index={index} count={existingListingImages.length} busy={imageBusy} onMove={(from, to) => void handleMoveExistingListingImage(from, to)} onRemove={() => handleRemoveExistingListingImage(image)} />)}</ScrollView> : null}
            {/* SPRINT-42: render received-order persisted images with actual drag reorder controls. */}
            {listingImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {listingImages.map((f, idx) => (
                    <View key={`${f.uri}-${idx}`} style={{ position: "relative" }}>
                      <FadeImage uri={f.uri} style={{ width: 88, height: 88, borderRadius: 12 }} />
                      {/* SPRINT-42: use shared FadeImage for staged listing media. */}
                      <Pressable
                        onPress={() => setListingImages((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          backgroundColor: "#111827",
                          borderRadius: 12,
                          padding: 4,
                        }}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
            </>
            )}

            {type.id === "listing" && (
            <View style={{ marginTop: 16, marginBottom: 28, gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {listingStep > 1 ? (
                  <Pressable
                    onPress={() => {
                      setListingStepError(null);
                      setListingStep((s) => Math.max(1, s - 1));
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: tc.borderLight,
                      alignItems: "center",
                      backgroundColor: tc.cardBg,
                    }}
                  >
                    <Text style={{ color: tc.textPrimary, fontWeight: "800" }}>Back</Text>
                  </Pressable>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {listingStep < 4 ? (
                  <Pressable
                    onPress={() => {
                      if (validateListingStep(listingStep)) setListingStep((s) => Math.min(4, s + 1));
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: type.color,
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "800" }}>Next</Text>
                  </Pressable>
                ) : null}
              </View>
              {listingStep === 4 ? (
                <Pressable
                  onPress={canSubmit ? () => void handlePost() : undefined}
                  style={{ opacity: canSubmit ? 1 : 0.45, marginTop: 10 }}
                >
                  <LinearGradient colors={type.gradient} style={s.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {submitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="home" size={18} color="#FFF" />
                        <Text style={s.gradientBtnText}>{isEditing ? "Save Changes" : "Publish Listing"}</Text>
                        {/* SPRINT-42: make explicit detail-save behavior clear in edit mode. */}
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              ) : null}
            </View>
            )}
          </>
        )}

        {/* ════════ SHARED SPACE FORM ════════ */}
        {type.id === "shared_space" && (
          <>
            <SectionLabel label="TITLE" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Sunny room in shared Williamsburg loft"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            <SectionLabel label="DESCRIPTION" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                placeholder="Describe the space, housemates, vibe, and what you are looking for..."
                placeholderTextColor={tc.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={s.charCount}>{body.length}/2000</Text>
            </View>

            <SectionLabel label="MONTHLY RENT & FEES" color={type.color} />
            <View style={s.rowFields}>
              <View style={[s.inputWrap, { flex: 1, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                <View style={s.fieldWithIcon}>
                  <Text style={[s.fieldPrefix, { color: type.color }]}>$</Text>
                  <TextInput
                    style={[s.fieldInput, { color: tc.textPrimary }]}
                    placeholder="Rent/mo"
                    placeholderTextColor={tc.textTertiary}
                    value={sharedSpacePrice}
                    onChangeText={setSharedSpacePrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={[s.inputWrap, { flex: 1, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                <View style={s.fieldWithIcon}>
                  <Text style={[s.fieldPrefix, { color: type.color }]}>$</Text>
                  <TextInput
                    style={[s.fieldInput, { color: tc.textPrimary }]}
                    placeholder="Deposit"
                    placeholderTextColor={tc.textTertiary}
                    value={sharedSpaceDeposit}
                    onChangeText={setSharedSpaceDeposit}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
            <View style={[s.inputWrap, { marginTop: 10, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="Currency (e.g. USD)"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceCurrency}
                onChangeText={setSharedSpaceCurrency}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>

            <SectionLabel label="ROOMS & OCCUPANCY" color={type.color} />
            <Text style={{ fontSize: 12, color: tc.textTertiary, marginTop: -6, marginBottom: 10 }}>
              How many rooms/bathrooms the place has, and how many people live there vs. how many spots are still open.
            </Text>
            <View style={s.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]}>Rooms</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="1"
                    placeholderTextColor={tc.textTertiary}
                    value={sharedSpaceRooms}
                    onChangeText={setSharedSpaceRooms}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]}>Baths</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="1"
                    placeholderTextColor={tc.textTertiary}
                    value={sharedSpaceBaths}
                    onChangeText={setSharedSpaceBaths}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
            <View style={[s.rowFields, { marginTop: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]} numberOfLines={1}>Current occupants</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={tc.textTertiary}
                    value={sharedSpaceTotalOccupants}
                    onChangeText={setSharedSpaceTotalOccupants}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.miniFieldLabel, { color: tc.textTertiary }]} numberOfLines={1}>Open spots</Text>
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.fieldInput, s.fieldInputCenter, { color: tc.textPrimary }]}
                    placeholder="1"
                    placeholderTextColor={tc.textTertiary}
                    value={sharedSpaceAvailableSpots}
                    onChangeText={setSharedSpaceAvailableSpots}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <SectionLabel label="ADDRESS" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Street address"
                placeholderTextColor={tc.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <SectionLabel label="CITY" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="business-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="City"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceCity}
                onChangeText={setSharedSpaceCity}
              />
            </View>

            <SectionLabel label="STATE / PROVINCE (OPTIONAL)" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="map-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="State or province"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceState}
                onChangeText={setSharedSpaceState}
              />
            </View>

            <SectionLabel label="COUNTRY" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="earth-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Country"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceCountry}
                onChangeText={setSharedSpaceCountry}
              />
            </View>

            <SectionLabel label="PET POLICY (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary, paddingHorizontal: 12, paddingVertical: 12 }]}
                placeholder="e.g. Cats OK, no dogs"
                placeholderTextColor={tc.textTertiary}
                value={sharedSpacePetPolicy}
                onChangeText={setSharedSpacePetPolicy}
              />
            </View>

            <SectionLabel label="SMOKING ALLOWED" color={type.color} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: tc.cardBg,
                borderWidth: 1,
                borderColor: tc.borderLight,
              }}
            >
              <Text style={{ color: tc.textPrimary, fontWeight: "700" }}>Smoking permitted</Text>
              <Switch
                value={sharedSpaceSmoking}
                onValueChange={setSharedSpaceSmoking}
                trackColor={{ false: "#D1D5DB", true: type.color }}
              />
            </View>

            <SectionLabel label="HOUSE RULES (OPTIONAL)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary, minHeight: 88 }]}
                placeholder="Quiet hours, guests, shared spaces..."
                placeholderTextColor={tc.textTertiary}
                value={sharedSpaceHouseRules}
                onChangeText={setSharedSpaceHouseRules}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={s.charCount}>{sharedSpaceHouseRules.length}/500</Text>
            </View>

            <SectionLabel label="AMENITIES" color={type.color} />
            <ChipMulti
              options={[
                "Pet Friendly",
                "Gym",
                "Doorman",
                "Rooftop",
                "Pool",
                "Elevator",
                "Wheelchair Accessible",
                "Bike Storage",
                "Storage Unit",
                "Concierge",
                "In-Unit Laundry",
                "Dishwasher",
                "Balcony",
                "Backyard",
                "Parking Included",
              ]}
              value={sharedSpaceAmenities}
              onChange={setSharedSpaceAmenities}
              color={type.color}
              bg={type.bg}
            />
          </>
        )}

        {/* ════════ RESTAURANT FORM ════════ */}
        {type.id === "restaurant" && (
          <>
            {/* Notice box */}
            <View style={[s.ownerNotice, { borderColor: type.color + "40", backgroundColor: type.bg }]}>
              <Ionicons name="shield-checkmark" size={18} color={type.color} />
              <View style={{ flex: 1 }}>
                <Text style={[s.ownerNoticeTitle, { color: type.color }]}>Restaurant Posting on ComLinkr</Text>
                <Text style={s.ownerNoticeText}>
                  {"• "}
                  <Text style={{ fontWeight: "700" }}>Restaurant owners</Text>
                  {" — Anyone can add a business listing; the "}
                  <Text style={{ fontWeight: "700" }}>Restaurant Owner</Text>
                  {" badge adds a trusted indicator on your listing.\n"}
                  {"• "}
                  <Text style={{ fontWeight: "700" }}>Local Reviewers</Text>
                  {" — Community members with the "}
                  <Text style={{ fontWeight: "700" }}>Local Reviewer</Text>
                  {" badge can share recommendations and reviews from personal visits.\n"}
                  {"• Pick owner or community mode below — badges unlock trust signals where they apply."}
                </Text>
              </View>
            </View>

            {/* Mode selector */}
            <View style={s.modeSelectorRow}>
              <Pressable
                style={[s.modeTab, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, restaurantPostMode === "owner" && { backgroundColor: type.color, borderColor: type.color }]}
                onPress={() => setRestaurantPostMode("owner")}
              >
                <Ionicons name="storefront-outline" size={15} color={restaurantPostMode === "owner" ? "#FFF" : type.color} />
                <Text style={[s.modeTabText, { color: tc.textSecondary }, restaurantPostMode === "owner" && { color: "#FFF" }]}>I'm the Owner</Text>
              </Pressable>
              <Pressable
                style={[s.modeTab, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, restaurantPostMode === "review" && { backgroundColor: type.color, borderColor: type.color }]}
                onPress={() => setRestaurantPostMode("review")}
              >
                <Ionicons name="star-outline" size={15} color={restaurantPostMode === "review" ? "#FFF" : type.color} />
                <Text style={[s.modeTabText, { color: tc.textSecondary }, restaurantPostMode === "review" && { color: "#FFF" }]}>Community Post</Text>
              </Pressable>
            </View>

            {/* ── OWNER FORM ── */}
            {restaurantPostMode === "owner" && (
              <>
                {/* Soft verification boost notice */}
                {canPostRestaurant &&
                  !isAdmin &&
                  !isVerifiedRestaurantOwner && (
                  <View style={[s.modeLockedNotice, { borderColor: "#30855B", backgroundColor: isDark ? tc.successBg : "#F0FDF4" }]}>
                    <Ionicons name="shield-checkmark-outline" size={15} color="#15803D" />
                    <Text style={[s.modeLockedText, { color: isDark ? tc.successText : "#14532D" }]}>
                      {"Anyone can post — "}
                      <Text style={{ fontWeight: "800" }}>Verified Restaurant Owner</Text>
                      {" posts get a trust badge and more visibility. "}
                      <Text
                        style={{ fontWeight: "800", color: "#15803D", textDecorationLine: "underline" }}
                        onPress={() => router.push({ pathname: "/apply-badge" as any, params: { badgeType: "restaurant_owner" } })}
                      >Get verified</Text>
                    </Text>
                  </View>
                )}

                <SectionLabel label="OWNER / MANAGER NAME (OPTIONAL)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="person-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Your full name as owner or manager"
                    placeholderTextColor={tc.textTertiary}
                    value={ownerName}
                    onChangeText={setOwnerName}
                  />
                </View>

                <SectionLabel label="RESTAURANT NAME *" color={type.color} />
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.titleInput, { color: tc.textPrimary }]}
                    placeholder="e.g. Bella Napoli – Italian Kitchen"
                    placeholderTextColor={tc.textTertiary}
                    value={restName}
                    onChangeText={setRestName}
                    maxLength={100}
                  />
                  <Text style={s.charCount}>{restName.length}/100</Text>
                </View>

                <SectionLabel label="BUSINESS TYPE (OPTIONAL)" color={type.color} />
                <ChipSelect
                  options={["Restaurant", "Café", "Bar & Grill", "Food Truck", "Bakery", "Fast Food", "Fine Dining", "Other"]}
                  value={businessType}
                  onChange={setBusinessType}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="CUISINE TYPE *" color={type.color} />
                <ChipSelect
                  options={["Italian", "Mexican", "Japanese", "Thai", "Indian", "Chinese", "American", "Mediterranean", "Other"]}
                  value={cuisine}
                  onChange={setCuisine}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="PRICE RANGE" color={type.color} />
                <ChipSelect
                  options={["$ Budget", "$$ Mid-range", "$$$ Upscale", "$$$$ Fine Dining"]}
                  value={priceRange}
                  onChange={setPriceRange}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="AVERAGE PRICE PER PERSON (OPTIONAL)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="cash-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="e.g. 25"
                    placeholderTextColor={tc.textTertiary}
                    value={avgPricePerPerson}
                    onChangeText={(t) => setAvgPricePerPerson(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>

                <SectionLabel label="CONTACT DETAILS" color={type.color} />
                <View style={[s.locationField, { marginBottom: 8, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="call-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Business phone number"
                    placeholderTextColor={tc.textTertiary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[s.locationField, { marginBottom: 8, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="mail-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Business email address"
                    placeholderTextColor={tc.textTertiary}
                    value={businessEmail}
                    onChangeText={setBusinessEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={[s.locationField, { marginBottom: 8, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="globe-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Website (e.g. https://yourrestaurant.com)"
                    placeholderTextColor={tc.textTertiary}
                    value={website}
                    onChangeText={setWebsite}
                    autoCapitalize="none"
                  />
                </View>
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="logo-instagram" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="@instagram_handle (optional)"
                    placeholderTextColor={tc.textTertiary}
                    value={instagram}
                    onChangeText={setInstagram}
                    autoCapitalize="none"
                  />
                </View>

                <SectionLabel label="OPENING HOURS" color={type.color} />
                <View style={s.rowFields}>
                  <TimePickerField
                    value={openTime}
                    onChange={setOpenTime}
                    placeholder="Opening time"
                    accentColor={type.color}
                    style={{ flex: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
                    textStyle={{ color: tc.textPrimary }}
                    forceDark={isDark}
                  />
                  <TimePickerField
                    value={closeTime}
                    onChange={setCloseTime}
                    placeholder="Closing time"
                    accentColor={type.color}
                    style={{ flex: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
                    textStyle={{ color: tc.textPrimary }}
                    forceDark={isDark}
                  />
                </View>

                <SectionLabel label="SERVICES OFFERED" color={type.color} />
                <ChipMulti
                  options={["Dine-in", "Takeout", "Delivery", "Outdoor Seating", "Reservations", "Private Events", "Catering", "BYOB", "Vegan Options", "Halal", "Gluten-Free"]}
                  value={features}
                  onChange={setFeatures}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="SIGNATURE DISHES" color={type.color} />
                <ChipMulti
                  options={["Pizza", "Pasta", "Sushi", "Tacos", "Burgers", "Curry", "Ramen", "Salads", "Cocktails", "Desserts", "Seafood", "Steak", "Brunch"]}
                  value={restTags}
                  onChange={setRestTags}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="TELL YOUR STORY" color={type.color} />
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                    placeholder="Tell customers what makes your restaurant unique — your inspiration, ambiance, must-try dishes, and what to expect when they visit..."
                    placeholderTextColor={tc.textTertiary}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    textAlignVertical="top"
                    maxLength={2000}
                  />
                  <Text style={s.charCount}>{body.length}/2000</Text>
                </View>

                <SectionLabel label="RESTAURANT ADDRESS *" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="location-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Full business address..."
                    placeholderTextColor={tc.textTertiary}
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>

                <SectionLabel label="CITY *" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="business-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="City"
                    placeholderTextColor={tc.textTertiary}
                    value={restCity}
                    onChangeText={setRestCity}
                  />
                </View>

                <SectionLabel label="STATE / PROVINCE (Optional)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="map-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="State or province"
                    placeholderTextColor={tc.textTertiary}
                    value={restState}
                    onChangeText={setRestState}
                  />
                </View>

                <SectionLabel label="COUNTRY *" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="earth-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Country"
                    placeholderTextColor={tc.textTertiary}
                    value={restCountry}
                    onChangeText={setRestCountry}
                  />
                </View>

                <SectionLabel label="AVERAGE WAIT TIME (minutes, optional)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="hourglass-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="e.g. 20"
                    placeholderTextColor={tc.textTertiary}
                    value={restWaitTime}
                    onChangeText={setRestWaitTime}
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}

            {/* ── COMMUNITY / LOCAL REVIEWER FORM ── */}
            {restaurantPostMode === "review" && (
              <>
                {/* Soft verification boost notice */}
                {!canPostRestaurantReview && (
                  <View style={[s.modeLockedNotice, { borderColor: "#30855B", backgroundColor: isDark ? tc.successBg : "#F0FDF4" }]}>
                    <Ionicons name="shield-checkmark-outline" size={15} color="#15803D" />
                    <Text style={[s.modeLockedText, { color: isDark ? tc.successText : "#14532D" }]}>
                      {"Anyone can review — "}
                      <Text style={{ fontWeight: "800" }}>Local Reviewer</Text>
                      {" badge holders get a trust indicator and priority in search. "}
                      <Text
                        style={{ fontWeight: "800", color: "#15803D", textDecorationLine: "underline" }}
                        onPress={() => router.push({ pathname: "/apply-badge" as any, params: { badgeType: "local_reviewer" } })}
                      >Get verified</Text>
                    </Text>
                  </View>
                )}

                <SectionLabel label="RESTAURANT NAME *" color={type.color} />
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[s.titleInput, { color: tc.textPrimary }]}
                    placeholder="Name of the restaurant you visited"
                    placeholderTextColor={tc.textTertiary}
                    value={restName}
                    onChangeText={setRestName}
                    maxLength={100}
                  />
                  <Text style={s.charCount}>{restName.length}/100</Text>
                </View>

                <SectionLabel label="CUISINE TYPE (OPTIONAL)" color={type.color} />
                <ChipSelect
                  options={["Italian", "Mexican", "Japanese", "Thai", "Indian", "Chinese", "American", "Mediterranean", "Other"]}
                  value={cuisine}
                  onChange={setCuisine}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="PRICE RANGE (OPTIONAL)" color={type.color} />
                <ChipSelect
                  options={["$ Budget", "$$ Mid-range", "$$$ Upscale", "$$$$ Fine Dining"]}
                  value={priceRange}
                  onChange={setPriceRange}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="YOUR RATING *" color={type.color} />
                <ChipSelect
                  options={["★★★★★ Excellent", "★★★★ Great", "★★★ Good", "★★ Fair", "★ Poor"]}
                  value={reviewRating}
                  onChange={setReviewRating}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="TYPE OF VISIT" color={type.color} />
                <ChipSelect
                  options={["Dine-in", "Takeout", "Delivery", "First visit", "Regular"]}
                  value={reviewVisitType}
                  onChange={setReviewVisitType}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="DISHES YOU TRIED" color={type.color} />
                <ChipMulti
                  options={["Pizza", "Pasta", "Sushi", "Tacos", "Burgers", "Curry", "Ramen", "Salads", "Cocktails", "Desserts", "Seafood", "Steak", "Brunch"]}
                  value={reviewDishes}
                  onChange={setReviewDishes}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="YOUR REVIEW" color={type.color} />
                <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <TextInput
                    style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                    placeholder="Share your experience — what you loved, the ambiance, must-try dishes, and who you'd recommend it to..."
                    placeholderTextColor={tc.textTertiary}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    textAlignVertical="top"
                    maxLength={1000}
                  />
                  <Text style={s.charCount}>{body.length}/1000</Text>
                </View>

                <SectionLabel label="RESTAURANT LOCATION" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="location-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Neighborhood or address (e.g. Downtown Manhattan)"
                    placeholderTextColor={tc.textTertiary}
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
              </>
            )}
          </>
        )}

        {/* ════════ EVENT FORM ════════ */}
        {type.id === "event" && (
          <>
            <SectionLabel label="EVENT NAME" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Rooftop Sunset Social Mixer"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            <SectionLabel label="CATEGORY" color={type.color} />
            <ChipSelect
              options={ALL_CATEGORIES}
              scroll
              value={eventCategory}
              onChange={setEventCategory}
              color={type.color}
              bg={type.bg}
            />

            <SectionLabel label="FORMAT" color={type.color} />
            <ChipSelect
              options={["In-Person", "Virtual", "Hybrid"]}
              value={eventFormat}
              onChange={setEventFormat}
              color={type.color}
              bg={type.bg}
            />

            <SectionLabel label="DATE & TIME" color={type.color} />
            <DatePickerField
              value={eventDate}
              onChange={setEventDate}
              placeholder="Select event date"
              accentColor={type.color}
              dateFormat="event"
              minimumDate={new Date()}
              style={{ borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
              forceDark={isDark}
            />
            <View style={[s.rowFields, { marginTop: 8 }]}>
              <TimePickerField
                value={eventTime}
                onChange={setEventTime}
                placeholder="Start time"
                accentColor={type.color}
                style={{ flex: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
                textStyle={{ color: tc.textPrimary }}
                forceDark={isDark}
              />
              <TimePickerField
                value={eventEndTime}
                onChange={setEventEndTime}
                placeholder="End time"
                accentColor={type.color}
                style={{ flex: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg }}
                textStyle={{ color: tc.textPrimary }}
                forceDark={isDark}
              />
            </View>

            <SectionLabel label="TICKETS" color={type.color} />
            <ChipSelect
              options={["Free", "Paid"]}
              value={ticketType}
              onChange={(v) => setTicketType(v || "Free")}
              color={type.color}
              bg={type.bg}
            />
            {ticketType === "Paid" && (
              <View style={[s.locationField, { marginTop: 8, backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                <Text style={[s.fieldPrefix, { color: type.color }]}>$</Text>
                <TextInput
                  style={[s.locationInput, { color: tc.textPrimary }]}
                  placeholder="Ticket price per person"
                  placeholderTextColor={tc.textTertiary}
                  value={ticketPrice}
                  onChangeText={setTicketPrice}
                  keyboardType="numeric"
                />
              </View>
            )}

            <SectionLabel label="CAPACITY (OPTIONAL)" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="people-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Max attendees (leave blank for unlimited)"
                placeholderTextColor={tc.textTertiary}
                value={maxAttendees}
                onChangeText={setMaxAttendees}
                keyboardType="numeric"
              />
            </View>

            <SectionLabel label="EVENT DESCRIPTION" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary }]}
                placeholder="Describe your event — what to expect, who should attend, what to bring..."
                placeholderTextColor={tc.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={s.charCount}>{body.length}/2000</Text>
            </View>

            <SectionLabel label="VENUE / LOCATION" color={type.color} />
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location-outline" size={17} color={type.color} />
              <TextInput
                style={[s.locationInput, { color: tc.textPrimary }]}
                placeholder="Venue name or address"
                placeholderTextColor={tc.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </>
        )}

        {/* ════════ NEWS FORM ════════ */}
        {/* ── STORY FORM ── */}
        {type.id === "story" && (
          <>
            {/* Title */}
            <SectionLabel label="STORY TITLE *" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Sunset at the harbor 🌅"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            {/* Category */}
            <SectionLabel label="CATEGORY *" color={type.color} />
            <ChipSelect
              options={STORY_CATEGORY_OPTIONS}
              value={storyCatPick}
              onChange={setStoryCatPick}
              color={type.color}
              bg={type.bg}
            />

            {/* Description */}
            <SectionLabel label="DESCRIPTION (optional)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                placeholder="Tell your community what this story is about…"
                placeholderTextColor={tc.textTertiary}
                multiline
                style={[s.bodyInput, { color: tc.textPrimary }]}
                value={body}
                onChangeText={setBody}
                maxLength={400}
              />
              <Text style={s.charCount}>{body.length}/400</Text>
            </View>

            {/* Hashtags */}
            <SectionLabel label="HASHTAGS (optional)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary }]}
                placeholder="#community, #local, #weekend"
                placeholderTextColor={tc.textTertiary}
                value={storyTagsInput}
                onChangeText={setStoryTagsInput}
                autoCapitalize="none"
              />
            </View>

            {/* Location */}
            <SectionLabel label="LOCATION (optional)" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.fieldInput, { color: tc.textPrimary }]}
                placeholder="e.g. Riverside Park, New York"
                placeholderTextColor={tc.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

          </>
        )}

        {/* ── CHALLENGE FORM ── */}
        {type.id === "challenge" && (
          <>
            {/* Challenge Title */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>CHALLENGE TITLE</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="e.g. Best Sunset Shot 🌅"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            {/* Challenge Type */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>CHALLENGE TYPE</Text>
            </View>
            <ChipSelect
              options={ALL_CATEGORIES}
              scroll
              value={challengeType}
              onChange={setChallengeType}
              color={type.color}
              bg={type.bg}
            />

            {/* Challenge Details */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>CHALLENGE DETAILS</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                placeholder="What do participants need to do?"
                placeholderTextColor={tc.textTertiary}
                multiline
                style={[s.bodyInput, { color: tc.textPrimary }]}
                value={body}
                onChangeText={setBody}
                maxLength={500}
              />
              <Text style={s.charCount}>{body.length}/500</Text>
            </View>

            {/* Duration */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>CHALLENGE DURATION</Text>
            </View>
            <ChipSelect
              options={["1 Day", "3 Days", "1 Week", "2 Weeks", "1 Month"]}
              value={challengeDuration}
              onChange={setChallengeDuration}
              color={type.color}
              bg={type.bg}
            />

            {/* Goal */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>GOAL / WIN CONDITION *</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                placeholder="e.g. Most likes wins, First to finish, Best photo"
                placeholderTextColor={tc.textTertiary}
                style={[s.fieldInput, { color: tc.textPrimary }]}
                value={challengeGoal}
                onChangeText={setChallengeGoal}
              />
            </View>

            {/* Reward */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>REWARD / PRIZE *</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                placeholder="e.g. Bragging rights 🏆, Gift card, Featured on feed"
                placeholderTextColor={tc.textTertiary}
                style={[s.fieldInput, { color: tc.textPrimary }]}
                value={challengeReward}
                onChangeText={setChallengeReward}
              />
            </View>

            {/* Max Participants */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>MAX PARTICIPANTS (OPTIONAL)</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                placeholder="Leave empty for unlimited"
                placeholderTextColor={tc.textTertiary}
                style={[s.fieldInput, { color: tc.textPrimary }]}
                value={challengeMaxParticipants}
                onChangeText={setChallengeMaxParticipants}
                keyboardType="number-pad"
              />
            </View>

            {/* Hashtags */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>HASHTAGS</Text>
            </View>
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                placeholder="#SunsetChallenge, #NYCSunsets, #GoldenHour"
                placeholderTextColor={tc.textTertiary}
                style={[s.fieldInput, { color: tc.textPrimary }]}
                value={challengeHashtags}
                onChangeText={setChallengeHashtags}
              />
            </View>

            {/* Location */}
            <View style={s.sectionLabelRow}>
              <View style={[s.sectionDot, { backgroundColor: type.color }]} />
              <Text style={s.sectionLabel}>LOCATION</Text>
            </View>
            <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="location" size={18} color={type.color} />
              <TextInput
                placeholder="Where does this challenge happen?"
                placeholderTextColor={tc.textTertiary}
                style={[s.locationInput, { color: tc.textPrimary }]}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </>
        )}

        {type.id === "news" && (
          <>
            {/* ── Title — always visible ── */}
            <SectionLabel label="TITLE" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[s.titleInput, { color: tc.textPrimary }]}
                placeholder="What's happening in your community?"
                placeholderTextColor={tc.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={s.charCount}>{title.length}/120</Text>
            </View>

            {/* ── Content — always visible but compact ── */}
            <SectionLabel label="CONTENT" color={type.color} />
            <View style={[s.inputWrap, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <TextInput
                style={[{ textAlignVertical: "top" }, s.bodyInput, { color: tc.textPrimary, minHeight: 80 }]}
                placeholder="Share details with your community..."
                placeholderTextColor={tc.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={s.charCount}>{body.length}/2000</Text>
            </View>

            {/* ── More options toggle ── */}
            <Pressable
              onPress={() => setNewsMoreOpen((p) => !p)}
              style={[s.moreOptionsBtn, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}
            >
              <Ionicons name={newsMoreOpen ? "chevron-up" : "options-outline"} size={17} color={type.color} />
              <Text style={[s.moreOptionsBtnText, { color: type.color }]}>
                {newsMoreOpen ? "Less options" : "More options (category, tags, location)"}
              </Text>
            </Pressable>

            {newsMoreOpen && (
              <>
                <SectionLabel label="CATEGORY" color={type.color} />
                <ChipSelect
                  options={ALL_CATEGORIES}
              scroll
                  value={newsCategory}
                  onChange={setNewsCategory}
                  color={type.color}
                  bg={type.bg}
                />

                <SectionLabel label="TAGS (comma-separated)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="pricetag-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="e.g. jobs, housing, safety"
                    placeholderTextColor={tc.textTertiary}
                    value={newsTags}
                    onChangeText={setNewsTags}
                  />
                </View>

                <SectionLabel label="LOCATION (optional)" color={type.color} />
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Ionicons name="location-outline" size={17} color={type.color} />
                  <TextInput
                    style={[s.locationInput, { color: tc.textPrimary }]}
                    placeholder="Add a location if relevant"
                    placeholderTextColor={tc.textTertiary}
                    value={location}
                    onChangeText={setLocation}
                    maxLength={200} // SPRINT-42: enforce the feed location PATCH bound in the input.
                  />
                </View>
                <SectionLabel label="SOURCE LABEL (optional)" color={type.color} />
                {/* SPRINT-42: expose sourceLabel in create and edit modes. */}
                <View style={[s.locationField, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                {/* SPRINT-42: match existing optional feed controls. */}
                  <Ionicons name="link-outline" size={17} color={type.color} />
                  {/* SPRINT-42: identify source attribution. */}
                  <TextInput style={[s.locationInput, { color: tc.textPrimary }]} placeholder="e.g. City Council" placeholderTextColor={tc.textTertiary} value={sourceLabel} onChangeText={setSourceLabel} maxLength={100} />
                  {/* SPRINT-42: edit the bounded sourceLabel field. */}
                </View>
                {/* SPRINT-42: close source label field. */}
              </>
            )}
          </>
        )}

        {type.id === "news" && isEditing && ( // SPRINT-42: show persisted post media read-only because media is not PATCH-editable.
          <>
          {/* SPRINT-42: group read-only feed media. */}
            <SectionLabel label="EXISTING MEDIA (READ-ONLY)" color={type.color} />
            {/* SPRINT-42: make media edit behavior explicit. */}
            {attachedFiles.length === 0 ? <Text style={{ color: tc.textSecondary, marginBottom: 12 }}>No existing media.</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>{attachedFiles.map((file) => <FadeImage key={file.name} uri={file.uri} style={{ width: 112, height: 88, borderRadius: 12 }} />)}</ScrollView>}
            {/* SPRINT-42: render all existing post images through FadeImage without removal controls. */}
          </> // SPRINT-42: close read-only media group.
        )}
        {/* SPRINT-42: finish edit-only media rendering. */}

        {/* ── Photos (all types except listing and story) ── */}
        {type.id !== "listing" && type.id !== "story" && !(type.id === "news" && isEditing) && ( // SPRINT-42: hide the media picker while editing feed posts.
          <>
            <SectionLabel
              label={type.id === "shared_space" ? "PHOTOS (OPTIONAL, UP TO 6)" : "PHOTOS & VIDEOS"}
              color={type.color}
            />
            {attachedFiles.length > 0 && (
              type.id === "restaurant" || type.id === "shared_space"
                ? <ImageThumbnailStrip
                    files={attachedFiles}
                    onRemove={(i) => setAttachedFiles((p) => p.filter((__, j) => j !== i))}
                  />
                : <View style={{ marginBottom: 8 }}>
                    {attachedFiles.map((file, i) => (
                      <AttachedFile
                        key={i}
                        index={i}
                        color={type.color}
                        bg={type.bg}
                        uri={file.uri}
                        fileName={file.name}
                        mediaType={file.mediaType}
                        duration={file.duration}
                        fileSize={file.fileSize}
                        onRemove={() => setAttachedFiles((p) => p.filter((__, j) => j !== i))}
                      />
                    ))}
                  </View>
            )}
            <Pressable
              style={[s.mediaBtn, { backgroundColor: tc.cardBg, borderColor: type.color + "55" }]}
              onPress={handleAttachFile}
            >
              <LinearGradient
                colors={type.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.mediaIconCircle}
              >
                <Ionicons name="cloud-upload-outline" size={22} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.mediaBtnTitle, { color: tc.textPrimary }]}>{mediaBtnTitle}</Text>
                <Text style={[s.mediaBtnDesc, { color: tc.textSecondary }]}>{mediaBtnDesc}</Text>
              </View>
              <View style={[s.mediaBtnPlus, { backgroundColor: type.bg }]}>
                <Ionicons name="add" size={16} color={type.color} />
              </View>
            </Pressable>
          </>
        )}

        {/* ── Photos (Story explicitly) ── */}
        {type.id === "story" && (
          <>
            <SectionLabel label="PHOTO OR VIDEO *" color={type.color} />
            <Text style={{ fontSize: 13, color: tc.textSecondary, marginBottom: 12 }}>
              Pick one photo or one video (up to 2 min). Both are supported.
            </Text>
            {attachedFiles.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                {attachedFiles.map((file, i) => (
                  <AttachedFile
                    key={i}
                    index={i}
                    color={type.color}
                    bg={type.bg}
                    uri={file.uri}
                    fileName={file.name}
                    mediaType={file.mediaType}
                    duration={file.duration}
                    fileSize={file.fileSize}
                    onRemove={() => setAttachedFiles([])}
                  />
                ))}
              </View>
            )}

            {attachedFiles.length === 0 && (
              <>
                <Pressable
                  style={[s.mediaBtn, { backgroundColor: tc.cardBg, borderColor: type.color + "55" }]}
                  onPress={() => handleAttachSpecificMedia("Images")}
                >
                  <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.mediaIconCircle}>
                    <Ionicons name="image-outline" size={22} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.mediaBtnTitle, { color: tc.textPrimary }]}>Add Photo to Story</Text>
                    <Text style={[s.mediaBtnDesc, { color: tc.textSecondary }]}>Gallery or Camera</Text>
                  </View>
                  <View style={[s.mediaBtnPlus, { backgroundColor: type.bg }]}>
                    <Ionicons name="add" size={16} color={type.color} />
                  </View>
                </Pressable>

                <Pressable
                  style={[s.mediaBtn, { backgroundColor: tc.cardBg, borderColor: type.color + "55" }]}
                  onPress={() => handleAttachSpecificMedia("Videos")}
                >
                  <LinearGradient colors={["#30855B", "#256B49"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.mediaIconCircle}>
                    <Ionicons name="videocam-outline" size={22} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.mediaBtnTitle, { color: tc.textPrimary }]}>Add Video to Story</Text>
                    <Text style={[s.mediaBtnDesc, { color: tc.textSecondary }]}>Gallery or Camera</Text>
                  </View>
                  <View style={[s.mediaBtnPlus, { backgroundColor: type.bg }]}>
                    <Ionicons name="add" size={16} color={type.color} />
                  </View>
                </Pressable>
              </>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Bottom action bar: Preview + Publish (listing publishes from its own Step 4 button instead) ── */}
      <View style={[s.bottomBar, { backgroundColor: tc.cardBg, borderTopColor: tc.borderLight }]}>
        <Pressable
          onPress={() => setPreviewVisible(true)}
          style={[s.bottomBarPreviewBtn, { borderColor: tc.borderLight }, type.id === "listing" && { flex: 1 }]}
        >
          <Ionicons name="eye-outline" size={15} color={tc.textSecondary} />
          <Text style={[s.bottomBarPreviewText, { color: tc.textSecondary }]}>Preview</Text>
        </Pressable>
        {type.id !== "listing" && (
          <Pressable
            onPress={canSubmit ? () => void handlePost() : undefined}
            style={[s.bottomBarPublishBtn, { opacity: canSubmit ? 1 : 0.45 }]}
          >
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bottomBarPublishGrad}>
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={
                      type.id === "restaurant" ? "restaurant"
                      : type.id === "event" ? "calendar"
                      : type.id === "story" ? "videocam"
                      : type.id === "challenge" ? "trophy"
                      : type.id === "shared_space" ? "people-circle"
                      : "send"
                    }
                    size={16}
                    color="#FFF"
                  />
                  <Text style={s.bottomBarPublishText}>
                    {type.id === "restaurant"
                      ? restaurantPostMode === "review"
                        ? "Submit Review"
                        : "Add Restaurant"
                      : type.id === "event" ? "Create Event"
                      : type.id === "story" ? "Share Story"
                      : type.id === "challenge" ? "Launch Challenge"
                      : type.id === "shared_space" ? "Publish Space"
                      : "Publish Post"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Preview modal */}
      <PreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        type={type}
        title={type.id === "restaurant" ? restName : title}
        body={body}
        attachedFiles={type.id === "listing" ? listingImages : attachedFiles}
        extraFields={extraFields}
        location={location}
        userName={previewUserName}
        userInitials={previewUserInitials}
        storyMediaType={storyPreviewMediaType}
        storyCategory={storyCatPick}
        storyHashtags={storyTagsInput}
        storyDuration={storyPreviewDuration}
        eventDate={eventDate}
        eventTime={eventTime}
        eventCategory={eventCategory}
        challengeType={challengeType}
        challengeDuration={challengeDuration}
        challengeGoal={challengeGoal}
        challengeReward={challengeReward}
        challengeMaxParticipants={challengeMaxParticipants}
        challengeHashtags={challengeHashtags}
        listingPrice={price}
        listingCurrency={listingCurrency}
        listingDeposit={deposit}
        listingAvailable={available}
        listingAmenities={amenities}
        listingWalkScore={walkScoreStr}
        listingTransitInfo={transitInfoStr}
        listingIsVerified={isVerifiedLandlord || isVerifiedAgency}
        restCuisine={cuisine}
        restPriceRange={priceRange}
        restFeatures={features}
      />

      {/* ── Native media picker sheet (Android) ── */}
      {Platform.OS === "android" && (
        <MediaPickerSheet
          visible={pickerSheetVisible}
          onClose={() => setPickerSheetVisible(false)}
          onLibrary={() => { setPickerSheetVisible(false); pickerResolveRef.current?.onLibrary(); }}
          onCamera={() => { setPickerSheetVisible(false); pickerResolveRef.current?.onCamera(); }}
        />
      )}
    </>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function CreatePostScreen() {
  const { isDark, tc } = useTheme();
  const { requireAuth, isAuthed } = useRequireAuth();
  const params = useLocalSearchParams<{ type?: string; mode?: string; id?: string }>(); // SPRINT-42: receive the authoritative entity id for reused edit mode.
  const initialType = POST_TYPES.find((t) => t.id === params.type) ?? null;
  const [selectedType, setSelectedType] = useState<PostType | null>(initialType);
  // DEV-11: a reused route instance must follow a changed `type` param (e.g. consecutive deep links).
  const lastRouteTypeRef = useRef(params.type);
  useEffect(() => {
    if (lastRouteTypeRef.current === params.type) return;
    lastRouteTypeRef.current = params.type;
    setSelectedType(POST_TYPES.find((t) => t.id === params.type) ?? null);
  }, [params.type]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthed) {
      requireAuth(undefined, "Sign in to create posts, events, stories, and more.");
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/feed" as any);
      return;
    }
    setAuthChecked(true);
  }, [isAuthed, requireAuth]);

  if (!authChecked || !isAuthed) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.brand.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (selectedType) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <PostForm type={selectedType} onBack={params.type ? () => router.back() : () => setSelectedType(null)} initialMode={params.mode} editId={params.id} />
            {/* SPRINT-42: deep-linked type (from Listings/Food/etc.) returns to the originating screen; in-app chooser selection returns to the chooser. */}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
      {/* ── White header (matches app style) ── */}
      <View style={[s.chooserHeaderWhite, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} style={[s.backBtnWhite, { backgroundColor: tc.sectionBg }]} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Svg height={28} width={180}>
              <Defs>
                <SvgGradient id="createTitleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={Colors.brand.blue} />
                  <Stop offset="100%" stopColor={Colors.brand.green} />
                </SvgGradient>
              </Defs>
              <SvgText fill="url(#createTitleGrad)" fontSize={20} fontWeight="900" x="0" y={22} letterSpacing="-0.4">
                Create &amp; Share
              </SvgText>
            </Svg>
          <Text style={[s.chooserSubGrey, { color: tc.textSecondary }]}>What would you like to add?</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Post type grid (2 columns, wraps all types) ── */}
        <View style={s.typeGrid}>
          {Array.from({ length: Math.ceil(POST_TYPES.length / 2) }, (_, row) => row * 2).map((rowStart) => (
            <View key={rowStart} style={s.typeGridRow}>
              {POST_TYPES.slice(rowStart, rowStart + 2).map((type) => {
                return (
                <Pressable
                  key={type.id}
                  style={({ pressed }) => [
                    s.typeGridCard,
                    { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
                    pressed && { transform: [{ scale: 0.96 }] },
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  {/* Gradient top accent bar */}
                  <LinearGradient
                    colors={type.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.typeGridTopBar}
                  />

                  {/* Soft radial tint */}
                  <View style={[s.typeGridBg, { backgroundColor: isDark ? type.color + "1A" : type.bg, opacity: isDark ? 1 : 0.35 }]} />

                  {/* Content */}
                  <View style={[s.typeGridContent, { paddingBottom: 26 }]}>
                    {/* Icon */}
                    <View style={s.typeGridIconWrap}>
                      <LinearGradient
                        colors={type.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.typeGridIcon}
                      >
                        <Ionicons name={type.icon} size={24} color="#FFF" />
                      </LinearGradient>
                    </View>

                    {/* Label */}
                    <Text style={[s.typeGridLabel, { color: type.color }]} numberOfLines={1}>
                      {type.label}
                    </Text>

                    {/* Description */}
                    <Text style={[s.typeGridDesc, { color: tc.textSecondary }]} numberOfLines={2}>
                      {type.desc}
                    </Text>
                  </View>

                  {/* Arrow indicator at bottom right */}
                  <View style={[s.typeGridArrow, { backgroundColor: type.color + "12" }]}>
                    <Ionicons name="arrow-forward" size={14} color={type.color} />
                  </View>
                </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Pro Tips ── */}
        <View style={[s.tipsCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <View style={s.tipsHeader}>
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              style={s.tipsIconBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="bulb-outline" size={16} color="#FFF" />
            </LinearGradient>
            <Text style={[s.tipsTitle, { color: tc.textPrimary }]}>Pro Tips</Text>
          </View>
          {[
            "Add eye-catching photos to get significantly more views",
            "Include your location to reach the right local audience",
            "Write a clear, engaging description for better reach",
            "Fill in all details — complete posts rank higher",
            "Use specific details: price, date, address boost relevance",
            "Respond quickly to inquiries — speed builds trust",
          ].map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <View style={s.tipDot} />
              <Text style={[s.tipText, { color: tc.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* ── Suggestions ── */}
        <View style={[s.suggestionsCard, { backgroundColor: isDark ? "#0A1628" : "#F0F7FF", borderColor: tc.borderLight }]}>
          <View style={s.suggestionsHeader}>
            <LinearGradient
              colors={[Colors.brand.blue, Colors.brand.green]}
              style={s.tipsIconBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={16} color="#FFF" />
            </LinearGradient>
            <Text style={s.suggestionsTitle}>Suggestions</Text>
          </View>
          {[
            { icon: "camera-outline" as const, text: "Photos with natural light get 3× more engagement" },
            { icon: "megaphone-outline" as const, text: "Post during evenings for higher visibility" },
            { icon: "people-outline" as const, text: "Tag your community to reach more members" },
            { icon: "heart-outline" as const, text: "Authentic stories connect better than polished ads" },
          ].map((sug, i) => (
            <View key={i} style={s.sugRow}>
              <Ionicons name={sug.icon} size={15} color={Colors.brand.blue} />
              <Text style={[s.sugText, { color: tc.textSecondary }]}>{sug.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6FA" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  // Chooser header — white, matches AppHeader style
  chooserHeaderWhite: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E6EA",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backBtnWhite: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  chooserTitleBlue: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.brand.blue,
    letterSpacing: -0.4,
  },
  chooserSubGrey: {
    fontSize: 12,
    color: "#7A8B9E",
    marginTop: 2,
    fontWeight: "400",
  },

  // 2×2 post type grid
  typeGrid: {
    gap: GRID_GAP,
    marginBottom: 20,
  },
  typeGridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  typeGridCard: {
    width: GRID_CARD_W,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8EDF4",
    padding: 14,
    paddingTop: 18,
    paddingBottom: 12,
    shadowColor: "#0A1628",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: "hidden",
  },
  typeGridContent: {
    gap: 8,
  },
  typeGridBg: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 60,
    opacity: 0.35,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  typeGridIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  typeGridIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  typeGridLabel: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  typeGridDesc: {
    fontSize: 11,
    color: "#7A8B9E",
    lineHeight: 15,
  },
  typeGridTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  typeGridArrow: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsCard: {
    backgroundColor: "#F0F7FF",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.brand.blue + "18",
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.brand.blue,
    letterSpacing: -0.2,
  },
  sugRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  sugText: {
    fontSize: 12,
    color: "#3B5068",
    lineHeight: 17,
    flex: 1,
  },

  // Form header
  headerGrad: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  headerTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  headerTypePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  postBtn: {
    borderRadius: 12,
    overflow: "hidden",
    height: 36,
    justifyContent: "center",
  },
  postBtnGrad: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  postBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },

  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
  bottomBarPreviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  bottomBarPreviewText: { fontSize: 13, fontWeight: "700" },
  bottomBarPublishBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  bottomBarPublishGrad: {
    flexDirection: "row",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bottomBarPublishText: { fontSize: 14, fontWeight: "800", color: "#FFF" },

  // Owner notice
  ownerNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    marginBottom: 4,
  },
  ownerNoticeTitle: { fontSize: 13, fontWeight: "800", marginBottom: 3 },
  ownerNoticeText: { fontSize: 12, color: "#5A6A7E", lineHeight: 17 },

  // Mode selector (owner vs community post)
  modeSelectorRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginBottom: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E0E5EF",
    backgroundColor: "#F5F7FB",
  },
  modeTabText: { fontSize: 13, fontWeight: "700", color: "#5A6A7E" },
  modeLockedNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  modeLockedText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Section label
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionDot: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#5A6A7E",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },

  // Inputs
  inputWrap: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#0A2540",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  titleInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    fontSize: 16,
    fontWeight: "600",
    color: "#0A2540",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  bodyInput: {
    textAlignVertical: "top",
    padding: 14,
    fontSize: 14,
    color: "#0A2540",
    minHeight: 150,
    lineHeight: 22,
  },
  charCount: {
    textAlign: "right",
    paddingRight: 14,
    paddingBottom: 10,
    fontSize: 11,
    color: "#9CA3AF",
  },
  rowFields: {
    flexDirection: "row",
    gap: 8,
  },
  miniFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
    paddingLeft: 2,
  },
  fieldWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  fieldPrefix: {
    fontSize: 15,
    fontWeight: "700",
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#0A2540",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  fieldInputCenter: {
    textAlign: "center",
  },
  locationField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0A2540",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: "#0A2540",
    fontWeight: "500",
  },

  // Media upload
  mediaBtn: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  mediaIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBtnTitle: { fontSize: 14, fontWeight: "700", color: "#0A2540" },
  mediaBtnDesc: { fontSize: 12, color: "#8A9DB5", marginTop: 2 },
  mediaBtnPlus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  moreOptionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  moreOptionsBtnText: { fontSize: 14, fontWeight: "600" },

  // Gradient publish button
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientBtnText: { fontSize: 16, fontWeight: "800", color: "#FFF", letterSpacing: -0.2 },

  // Type cards (chooser) — kept for backward compatibility
  typeCard: { display: "none" } as any,
  typeIconBox: { display: "none" } as any,
  typeLabel: { fontSize: 0 } as any,
  typeDesc: { fontSize: 0 } as any,
  typeArrow: { display: "none" } as any,

  // Tips
  tipsCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 6,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  tipsIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A2540",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 9,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.brand.green,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#8A9DB5",
    lineHeight: 20,
  },
});
