// src/features/food/foodShared.tsx
//
// Helpers, small components and styles shared by the Food tab and the restaurant detail route (plan 03),
// moved out of app/(tabs)/food/index.tsx.
import { palette } from "../../theme/palette";
import { useState } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { FlatList as GHFlatList } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { FadeImage } from "../../../components/FadeImage";
import type { Restaurant } from "../../api/food.api";
import { rs } from "../../utils/responsive";
import { cityTimezone } from "../../utils/cityTimezone";
import { getPriceRangeSymbol, getBusinessCurrency, formatPrice } from "../../utils/currency";
import { createThemedStyles } from '../../theme/themedStyles';

export function restaurantIsMine(r: Restaurant, userId: string | undefined): boolean {
  if (!userId) return false;
  if (r.isOwner) return true;
  if (r.ownerId && String(r.ownerId) === String(userId)) return true;
  const oid = r.owner?.id;
  return !!oid && String(oid) === String(userId);
}

export function safeList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function itemLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const v = value as { name?: unknown; label?: unknown; value?: unknown };
    if (typeof v.name === "string") return v.name;
    if (typeof v.label === "string") return v.label;
    if (typeof v.value === "string") return v.value;
  }
  return String(value ?? "");
}

export function distanceMiles(value: string | null | undefined): number {
  const n = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/** "9:00 PM" (the app's time picker) or "21:00" (seeded and older listings); -1 when it is neither. */
export function parseTimeMins(t: string): number {
  const h24 = t.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (h24) return parseInt(h24[1], 10) * 60 + parseInt(h24[2], 10);
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return -1;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes since midnight in the business's timezone; null when the timezone is unknown (the phone's clock is not the business's clock). */
export function minutesNowInTimezone(timezone?: string | null): number | null {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const m = Number(parts.find((p) => p.type === "minute")?.value);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  } catch {
    return null;
  }
}

export type Availability = { state: "open" | "closed" | "hours" | "unknown"; label: string };

/**
 * FOD-01/02: explicit availability model. Equal opening/closing times are treated as "hours not usable"
 * rather than assumed 24-hour operation.
 */
export function getAvailability(r: Restaurant): Availability {
  // The owner's "Temporarily closed" switch wins over the hours (owner's decision, F-13).
  if (r.temporarilyClosed) return { state: "closed", label: "Temporarily closed" };
  const open = r.openingTime?.trim();
  const close = r.closingTime?.trim();
  const op = open ? parseTimeMins(open) : -1;
  const cl = close ? parseTimeMins(close) : -1;
  if (op === -1 || cl === -1 || op === cl) return { state: "unknown", label: "Hours not provided" };
  // Owner-given time zone first; otherwise the city's, when the app knows it (seeded and older listings have none).
  const cur = minutesNowInTimezone(r.timezone || cityTimezone(r.city));
  if (cur === null) return { state: "hours", label: `Hours ${open} – ${close}` };
  const isOpen = cl > op ? cur >= op && cur < cl : cur >= op || cur < cl;
  return isOpen
    ? { state: "open", label: `Open · closes ${close}` }
    : { state: "closed", label: `Closed · opens ${open}` };
}

export function restaurantIsOpen(r: Restaurant): boolean {
  return getAvailability(r).state === "open";
}

/** Prefer the owner-entered average price per person in the business's own currency; otherwise fall back to the $/$$/$$$ tier. */
export function getDisplayPrice(r: Restaurant, _viewerCountryCode?: string | null | undefined): string {
  const currency = getBusinessCurrency(r.currency, r.country);
  if (typeof r.avgPricePerPerson === "number" && r.avgPricePerPerson > 0 && currency) {
    return formatPrice(r.avgPricePerPerson, currency.code);
  }
  // Tier symbols are relative, so only relabel them when the business currency is known.
  return currency && currency.code === "GBP" ? getPriceRangeSymbol(r.price, "GB") : (r.price || "—");
}

export function hasDistance(r: Restaurant): boolean {
  return !!r.distance && r.distance !== "—";
}

/** Plan 13 (TR-032): Nearby is restaurants within this many miles of the phone. */
export const NEARBY_MILES = 3;

export function hasCoordinates(r: Restaurant): boolean {
  return r.latitude != null && r.longitude != null && Number.isFinite(r.latitude) && Number.isFinite(r.longitude);
}

/** Great-circle distance in miles, one decimal. */
export function milesBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

export function hasReservations(r: Restaurant): boolean {
  return safeList(r.services as unknown as string[]).some((s) =>
    itemLabel(s).toLowerCase().includes("reserv")
  );
}

/** SPRINT-29: convert picker display time to API HH:MM */
export function toApiTime(display: string): string | null {
  const t = display.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m12) return null;
  let h = parseInt(m12[1], 10);
  const min = m12[2];
  const ampm = m12[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/** SPRINT-29: normalize date picker value to YYYY-MM-DD */
export function toApiDate(display: string): string | null {
  const t = display.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const CUISINES = ["All", "Italian", "Mexican", "Thai", "Japanese", "Indian", "American", "Chinese", "Mediterranean", "Vietnamese", "Korean", "Greek", "French", "Middle Eastern", "Ethiopian"];

export const TABS = [
  { key: "all", label: "All", emoji: "🍽️" },
  { key: "open", label: "Open Now", emoji: "🟢" },
  { key: "top", label: "Top Rated", emoji: "⭐" },
  { key: "nearby", label: "Nearby", emoji: "📍" },
  { key: "favorites", label: "Saved", emoji: "❤️" },
];

export const SORT_OPTIONS = ["Rating", "Distance", "Reviews"] as const;
export type SortOption = typeof SORT_OPTIONS[number];

export const REPORT_REASONS = [
  "Incorrect or misleading information",
  "Spam or scam",
  "Inappropriate content",
  "Harassment or hate",
  "Duplicate listing",
  "Other",
] as const;





export function ImageCarousel({ images, height = rs(165), itemWidth, onImagePress }: { images: string[]; height?: number; itemWidth?: number; onImagePress?: (idx: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width: windowW } = useWindowDimensions();
  const w = itemWidth ?? windowW - rs(32);
  if (!images || images.length === 0) return null;
  if (images.length === 1) return (
    <Pressable onPress={() => onImagePress?.(0)} style={{ width: "100%", height }}>
      <FadeImage uri={images[0]} style={{ width: "100%", height }} cachePolicy="disk" transition={300} />
    </Pressable>
  );
  return (
    <View style={{ width: "100%", height }}>
      <GHFlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / w);
          setActiveIndex(idx);
        }}
        renderItem={({ item, index }) => (
          <Pressable style={{ width: w, height }} onPress={() => onImagePress?.(index)}>
            <FadeImage uri={item} style={{ width: w, height }} cachePolicy="disk" transition={300} />
          </Pressable>
        )}
        getItemLayout={(_, i) => ({ length: w, offset: w * i, index: i })}
      />
      {/* Dot indicators */}
      <View style={carouselSt.dots}>
        {images.map((_, i) => (
          <View key={i} style={[carouselSt.dot, i === activeIndex && carouselSt.dotActive]} />
        ))}
      </View>
      {/* Image counter badge */}
      <View style={carouselSt.counter}>
        <Ionicons name="images-outline" size={10} color={palette.white} />
        <Text style={carouselSt.counterText}>{activeIndex + 1}/{images.length}</Text>
      </View>
    </View>
  );
}

export const carouselSt = createThemedStyles({
  dots: {
    position: "absolute", bottom: rs(8), alignSelf: "center",
    flexDirection: "row", gap: rs(5),
  },
  dot: {
    width: rs(6), height: rs(6), borderRadius: rs(3),
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    backgroundColor: palette.white, width: rs(18), borderRadius: rs(3),
  },
  counter: {
    position: "absolute", bottom: rs(28), right: rs(8),
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: rs(12),
    paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  counterText: { fontSize: rs(10), fontWeight: "700", color: palette.white },
}, { fonts: false });

export const EMPTY_RESTAURANTS: Restaurant[] = [];
export const restaurantId = (r: Restaurant) => r.id;

export const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: palette.gray50 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  hero: { marginHorizontal: rs(16), marginTop: rs(12), marginBottom: 0, borderRadius: rs(18), paddingHorizontal: rs(18), paddingVertical: rs(14), overflow: "hidden", shadowColor: Colors.brand.green, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  heroDecor1: { display: "none" },
  heroDecor2: { display: "none" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: rs(6), marginBottom: rs(4) },
  heroLabel: { fontSize: rs(10), fontWeight: "800", color: palette.green300, letterSpacing: 2 },
  heroTitle: { fontSize: rs(20), fontWeight: "900", color: palette.white, letterSpacing: -0.4 },
  heroSub: { fontSize: rs(12.5), color: "rgba(255,255,255,0.85)", marginTop: rs(3), fontWeight: "500" },

  searchWrap: { flexDirection: "row", alignItems: "center", gap: rs(10), marginHorizontal: rs(16), marginTop: rs(10), marginBottom: rs(10), backgroundColor: palette.white, borderRadius: rs(14), borderWidth: 1, borderColor: palette.gray200, paddingHorizontal: rs(14), height: rs(44) },
  searchInput: { flex: 1, fontSize: rs(14), color: Colors.text.primary, fontWeight: "400" },

  tabScroll: { marginTop: rs(12) },
  tab: { flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: palette.gray100, borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(7), marginRight: rs(8) },
  tabActive: { backgroundColor: Colors.brand.greenDark },
  tabText: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary },
  tabTextActive: { color: palette.white, fontWeight: "700" },
  tabBadge: { backgroundColor: "rgba(0,0,0,0.06)", borderRadius: rs(6), paddingHorizontal: rs(5), paddingVertical: rs(1) },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  tabBadgeText: { fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary },

  cuisineScroll: { marginTop: rs(10) },
  cuisineChip: { borderWidth: 1, borderColor: palette.gray200, borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(7), marginRight: rs(8), backgroundColor: palette.white },
  cuisineChipActive: { borderColor: Colors.brand.green, backgroundColor: Colors.brand.greenLight },
  cuisineText: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary },
  cuisineTextActive: { color: Colors.brand.greenDark, fontWeight: "700" },

  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    marginTop: rs(10),
    marginBottom: rs(8),
    gap: rs(8),
  },
  resultsCount: {
    fontSize: rs(12),
    fontWeight: "600",
    color: Colors.text.tertiary,
    flex: 1,
  },
  resultCount: { fontSize: rs(13), fontWeight: "500", color: Colors.text.tertiary, flex: 1 },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(8),
    paddingVertical: rs(5),
    borderRadius: rs(10),
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  sortChipActive: {
    backgroundColor: Colors.brand.green + "18",
    borderColor: Colors.brand.green,
  },
  sortChipText: {
    fontSize: rs(10),
    fontWeight: "600",
    color: Colors.text.tertiary,
  },
  sortChipTextActive: {
    color: Colors.brand.greenDark,
  },
  addRestaurantFab: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.green,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addRestaurantFabGrad: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(10),
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    marginHorizontal: rs(16), marginBottom: rs(14), backgroundColor: palette.white,
    borderRadius: rs(18), overflow: "hidden",
    shadowColor: palette.black, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: palette.neutralL95_5,
  },

  // Image area
  cardImage: { width: "100%", height: rs(165) },
  statusBadge: {
    position: "absolute", top: rs(10), left: rs(10),
    flexDirection: "row", alignItems: "center", gap: rs(5),
    paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(10),
  },
  statusOpen: { backgroundColor: "rgba(22,163,74,0.9)" },
  statusNeutral: { backgroundColor: "rgba(55,65,81,0.9)" },
  statusClosed: { backgroundColor: "rgba(220,38,38,0.9)" },
  statusDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: palette.white, opacity: 0.85 },
  statusText: { fontSize: rs(11), fontWeight: "700", color: palette.white },
  bookmarkIconBtn: {
    position: "absolute", top: rs(10), right: rs(48),
    width: rs(34), height: rs(34), borderRadius: rs(17),
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  favIconBtn: {
    position: "absolute", top: rs(10), right: rs(10),
    width: rs(34), height: rs(34), borderRadius: rs(17),
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  priceOverlay: {
    position: "absolute", bottom: rs(10), right: rs(10),
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: rs(9), paddingVertical: rs(4), borderRadius: rs(8),
  },
  priceOverlayText: { fontSize: rs(12), fontWeight: "800", color: palette.white },

  // Card body
  cardBody: { padding: rs(14) },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: rs(7), marginBottom: rs(2) },
  cardName: { fontSize: rs(16), fontWeight: "800", color: Colors.text.primary, flex: 1 },
  vBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(3),
    backgroundColor: palette.green100, paddingHorizontal: rs(7), paddingVertical: rs(3), borderRadius: rs(8),
  },
  vText: { fontSize: rs(10), fontWeight: "700", color: Colors.brand.green },
  cardCuisine: { fontSize: rs(12), color: Colors.text.secondary, marginBottom: rs(8) },

  // Rating + info row
  infoRow: { flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10), flexWrap: "wrap" },
  ratingChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: palette.yellowL95, borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  ratingNum: { fontSize: rs(13), fontWeight: "700", color: Colors.text.primary },
  reviewCount: { fontSize: rs(11), color: Colors.text.tertiary },
  distChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: palette.gray100, borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  metaText: { fontSize: rs(11), fontWeight: "600", color: Colors.text.secondary },
  waitChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: palette.brandTealLight, borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  waitText: { fontSize: rs(11), fontWeight: "600", color: palette.brandTeal },
  priceChip: {
    borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
    backgroundColor: palette.green50,
  },
  priceText: { fontSize: rs(12), fontWeight: "800", color: Colors.brand.greenDark },

  // Services row
  servicesRow: { flexDirection: "row", gap: rs(6), marginBottom: rs(8), flexWrap: "wrap" },
  serviceChip: {
    borderWidth: 1, borderColor: Colors.brand.greenLight,
    borderRadius: rs(7), paddingHorizontal: rs(9), paddingVertical: rs(3),
    backgroundColor: palette.neutralL99_3,
  },
  serviceText: { fontSize: rs(10), fontWeight: "700", color: Colors.brand.greenDark },

  // Popular dishes
  dishesRow: { flexDirection: "row", alignItems: "center", gap: rs(4), marginBottom: rs(10) },
  dishesLabel: { fontSize: rs(11), fontWeight: "700", color: palette.brandTeal },
  dishesText: { fontSize: rs(11), color: Colors.text.secondary, flex: 1 },

  // Bottom row: tags + actions
  cardMeta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: rs(10), borderTopWidth: 1, borderTopColor: palette.gray100,
  },
  cardTags: { flexDirection: "row", gap: rs(6), flexWrap: "wrap" },
  cardTag: { backgroundColor: Colors.brand.greenLight, borderRadius: rs(6), paddingHorizontal: rs(7), paddingVertical: rs(3) },
  cardTagText: { fontSize: rs(10), fontWeight: "600", color: Colors.brand.greenDark },
  reportBtn: {
    width: rs(30), height: rs(30), borderRadius: rs(8),
    backgroundColor: palette.gray100,
    alignItems: "center", justifyContent: "center",
  },
  chatBtn: {
    width: rs(34), height: rs(34), borderRadius: rs(10),
    backgroundColor: Colors.brand.blueLight,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "transparent",
  },
  orderBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(5),
    paddingHorizontal: rs(12), paddingVertical: rs(8), borderRadius: rs(10),
  },
  orderBtnText: { fontSize: rs(12), fontWeight: "700", color: palette.white },

  empty: { alignItems: "center", paddingVertical: rs(40), marginHorizontal: rs(16) },
  emptyTitle: { fontSize: rs(15), fontWeight: "600", marginTop: rs(12) },
  emptyDesc: { fontSize: rs(13), marginTop: rs(4), textAlign: "center" },
}, { fonts: false });

/* ── Restaurant Detail Modal Styles ────────────────────────── */
export const rdm = createThemedStyles({
  backBtn: {
    position: "absolute", top: 50, left: 16, width: 38, height: 38,
    borderRadius: 12, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  heroTopRight: {
    position: "absolute", top: 50, right: 16, flexDirection: "row", gap: 10,
  },
  heroActionBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  heroBottom: { position: "absolute", bottom: 16, left: 16, right: 16 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: palette.white },
  heroTitle: { fontSize: 24, fontWeight: "800", color: palette.white },
  heroCuisine: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    backgroundColor: palette.gray50, borderRadius: 16, paddingVertical: 16, marginVertical: 16,
  },
  statItem: { alignItems: "center", gap: 4 },
  statNum: { fontSize: 18, fontWeight: "800", color: Colors.text.primary },
  statLbl: { fontSize: 11, color: Colors.text.tertiary },
  statDiv: { width: 1, height: 32, backgroundColor: palette.gray200 },

  // Section
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: Colors.text.primary, marginBottom: 12 },

  // Quick Actions
  quickActionsRow: { flexDirection: "row", justifyContent: "space-around" },
  quickAction: { alignItems: "center", gap: 8 },
  quickActionIcon: {
    width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  quickActionLabel: { fontSize: 11, fontWeight: "600", color: Colors.text.secondary },

  // Detail grid
  detailGrid: { gap: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  detailLabel: { fontSize: 11, color: Colors.text.tertiary },
  detailValue: { fontSize: 14, fontWeight: "600", color: Colors.text.primary },

  // Services
  serviceChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: palette.green50, borderWidth: 1, borderColor: palette.green200,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  serviceChipText: { fontSize: 13, fontWeight: "600", color: palette.green600 },

  // Popular dishes
  dishRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: palette.neutralL98_8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  dishNum: {
    width: 24, height: 24, borderRadius: 8, backgroundColor: palette.brandTeal,
    alignItems: "center", justifyContent: "center",
  },
  dishNumText: { fontSize: 12, fontWeight: "700", color: palette.white },
  dishName: { fontSize: 14, fontWeight: "600", color: Colors.text.primary, flex: 1 },

  // Tags
  tagChip: { backgroundColor: Colors.brand.blueLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagChipText: { fontSize: 12, fontWeight: "600", color: Colors.brand.blue },

  // Rate & Review
  rateRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  reviewInputWrap: {
    borderWidth: 1.5, borderColor: palette.gray200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  reviewInput: { fontSize: 14, minHeight: 72, textAlignVertical: "top", lineHeight: 20 },
  reviewSubmitBtn: { borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  reviewSubmitGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 12,
  },
  reviewSubmitText: { fontSize: 14, fontWeight: "700", color: palette.white },
  userReview: {
    backgroundColor: palette.gray50, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  reviewTime: { fontSize: 11, color: Colors.text.tertiary },
  reviewText: { fontSize: 13, color: Colors.text.secondary },

  // Bottom CTA bar
  ctaBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: palette.gray100, backgroundColor: palette.white,
  },
  ctaReserve: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1.5, borderColor: Colors.brand.blue, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  ctaReserveFull: { flex: 1, justifyContent: "center" },
  ctaReserveText: { fontSize: 14, fontWeight: "700", color: Colors.brand.blue },
  ctaOrder: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  ctaOrderText: { fontSize: 14, fontWeight: "700", color: palette.white },
}, { fonts: false });
