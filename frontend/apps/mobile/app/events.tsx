import { palette } from "../src/theme/palette";
import { rs } from "../src/utils/responsive";
import React, { useState, useEffect, useMemo } from "react";
import { queryKeys } from "../src/services/cache/queryKeys";
import { useScreenQuery } from "../src/hooks/useScreenQuery";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { FadeImage } from "../components/FadeImage"; // SPRINT-31:
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useAuthStore } from "../src/store/auth.store";
import { useGuestLocationStore } from "../src/store/guestLocation.store";
import { useRequireAuth } from "../src/shared/hooks/useRequireAuth";
import { ApiError } from "../src/api/client";
import {
  getEvents,
  getEvent,
  toggleSaveEvent,
  registerForEvent,
  unregisterFromEvent,
  registerWithDetails,
  type ApiEvent,
  type EventTicket,
} from "../src/api/events.api";
import * as Brightness from "expo-brightness"; // SPRINT-42:
import { appAlert } from '../src/shared/ui/Dialogs';
import { TYPE, display } from '../src/theme/d';
import { EmptyState, PressableScale, Reveal, Segmented } from '../src/shared/d';
import EventRegistrationModal from '../src/features/explore/components/EventRegistrationModal';
import type { ExploreEventRow } from '../src/features/explore/models';
import { DPage, goBackOr } from '../src/shared/d/Page';
import { createThemedStyles } from '../src/theme/themedStyles';
import { useBackState } from '../src/hooks/useBackState';

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  SOCIAL: "🎉",
  SPORTS: "🏃",
  MUSIC: "🎵",
  ARTS: "🎨",
  FOOD_DRINK: "🍳",
  TECH: "💻",
  HEALTH: "🧘",
  COMMUNITY: "🤝",
  EDUCATION: "📚",
};

/** The shared event detail takes Explore's row shape. */
function toExploreRow(ev: EventItem, saved: boolean, going: boolean): ExploreEventRow {
  return {
    id: ev.id, title: ev.title, date: ev.date, time: ev.time, location: ev.location, image: ev.image, images: ev.image ? [ev.image] : [],
    interested: ev.attendees, category: ev.tags[0] ?? "", price: ev.price, desc: ev.desc, host: ev.host, emoji: ev.emoji,
    registeredByMe: going, isSaved: saved, isOwner: ev.isOwner, authorId: "", conversationId: null, canAccessChat: false,
    averageRating: ev.averageRating, totalReviews: ev.totalReviews, rawDate: ev.rawDate, startTimeRaw: ev.startTimeRaw, endTimeRaw: ev.endTimeRaw,
    isAttending: going, hasReviewed: ev.hasReviewed, myReviewId: ev.myReviewId,
  };
}

type EventItem = {
  id: string;
  emoji: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  price: string;
  tags: string[];
  category: "upcoming" | "past";
  image: string;
  desc: string;
  host: string;
  averageRating: number; // SPRINT-42:
  totalReviews: number; // SPRINT-42:
  rawDate: string; // SPRINT-42:
  startTimeRaw: string; // SPRINT-42:
  endTimeRaw: string | null; // SPRINT-42:
  isOwner: boolean; // SPRINT-42:
  registeredByMe: boolean; // SPRINT-42:
  isAttending: boolean; // SPRINT-42:
  hasReviewed?: boolean; // SPRINT-42:
  myReviewId?: string | null; // SPRINT-42:
};

function formatEventDateLabel(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function toUiEvent(e: ApiEvent): EventItem {
  const isPast = (() => {
    try {
      const d = new Date(e.date);
      return !isNaN(d.getTime()) && d.getTime() < Date.now();
    } catch {
      return false;
    }
  })();
  return {
    id: e.id,
    emoji: CATEGORY_EMOJI[e.category?.toUpperCase?.() ?? ""] || "🎊",
    title: e.title,
    date: formatEventDateLabel(e.date),
    time: e.endTime ? `${e.startTime} – ${e.endTime}` : e.startTime,
    location: e.venue,
    attendees: e.attendeeCount,
    price: e.ticketType === "FREE" || !e.ticketPrice ? "Free" : `$${e.ticketPrice}`,
    tags: [e.category],
    category: isPast ? "past" : "upcoming",
    image: e.images?.[0] || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=75",
    desc: e.description,
    host: e.author?.name || "Event Host",
    averageRating: Number(e.averageRating ?? 0) || 0, // SPRINT-42:
    totalReviews: Number(e.totalReviews ?? 0) || 0, // SPRINT-42:
    rawDate: String(e.date ?? ""), // SPRINT-42:
    startTimeRaw: String(e.startTime ?? ""), // SPRINT-42:
    endTimeRaw: e.endTime ?? null, // SPRINT-42:
    isOwner: !!e.isOwner, // SPRINT-42:
    registeredByMe: !!(e.registeredByMe || e.isAttending), // SPRINT-42:
    isAttending: !!(e.isAttending || e.registeredByMe), // SPRINT-42:
    hasReviewed: e.hasReviewed === true, // SPRINT-42:
    myReviewId: e.myReviewId ?? null, // SPRINT-42:
  };
}

const TABS = ["Upcoming", "Past", "Saved"] as const;

// ── Registration modal ────────────────────────────────────────────────────────
// ── Main screen ───────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const { isDark, tc } = useTheme();
  const user = useAuthStore((st) => st.user);
  const { requireAuth } = useRequireAuth();
  const guestCity = useGuestLocationStore((s) => s.city);
  const [tab, setTab] = useBackState<typeof TABS[number]>("Upcoming");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());

  const eventsCity = user?.city?.trim() || guestCity || undefined;
  const eventsQ = useScreenQuery({
    queryKey: [...queryKeys.eventsList({ city: eventsCity ?? "" }), user?.id ?? ""],
    initial: [] as ApiEvent[],
    staleTime: 0,
    queryFn: async () => (await getEvents({ city: eventsCity, pageSize: 50 })).data,
  });
  const events = useMemo(() => eventsQ.data.map(toUiEvent), [eventsQ.data]);
  const loading = eventsQ.loading;
  const error = eventsQ.error ? (eventsQ.error instanceof ApiError ? eventsQ.error.message : "Could not load events.") : "";
  const loadEvents = eventsQ.refetch;
  // Saved and attending flags start from each fetch; taps change them locally.
  const eventsFetchedAt = eventsQ.dataUpdatedAt;
  useEffect(() => {
    if (!eventsFetchedAt) return;
    setSavedIds(new Set(eventsQ.data.filter((e) => e.savedByMe).map((e) => e.id)));
    setInterestedIds(new Set(eventsQ.data.filter((e) => e.isAttending || e.registeredByMe).map((e) => e.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsFetchedAt]);

  const filtered =
    tab === "Saved"
      ? events.filter((e) => savedIds.has(e.id))
      : events.filter((e) => e.category === tab.toLowerCase());

  const toggleSave = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to save events for later.")) return;
    const wasSaved = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      await toggleSaveEvent(id);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(id) : next.delete(id);
        return next;
      });
      appAlert("Could not update", "Try again.");
    }
  };


  const toggleInterested = async (id: string) => {
    if (!requireAuth(undefined, "Sign in to RSVP and get event updates.")) return;
    const wasInterested = interestedIds.has(id);
    setInterestedIds((prev) => {
      const next = new Set(prev);
      wasInterested ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      if (wasInterested) {
        await unregisterFromEvent(id);
      } else {
        await registerForEvent(id);
      }
    } catch {
      setInterestedIds((prev) => {
        const next = new Set(prev);
        wasInterested ? next.add(id) : next.delete(id);
        return next;
      });
      appAlert("Could not update", "Try again.");
    }
  };

  const upcomingCount = events.filter((e) => e.category === "upcoming").length;
  return (
    <>
    <DPage title="Events" sub={upcomingCount > 0 ? `${upcomingCount} coming up near you` : undefined} onBack={() => goBackOr("/(tabs)/feed")}>
      <Segmented
        style={{ marginHorizontal: 16, marginBottom: 14 }}
        items={TABS.map((t) => ({ key: t, label: t === "Saved" && savedIds.size > 0 ? `Saved · ${savedIds.size}` : t }))}
        value={tab}
        onChange={(k) => setTab(k as typeof TABS[number])}
      />

      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: tc.warningBg }}>
          <Ionicons name="alert-circle-outline" size={18} color={tc.warningText} />
          <Text style={[TYPE.small, { flex: 1, color: tc.warningText }]}>{error}</Text>
        </View>
      ) : null}

      {loading ? <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 40 }} /> : null}

      {!loading && filtered.map((event, i) => {
        const saved = savedIds.has(event.id);
        const interested = interestedIds.has(event.id);
        const day = event.date.split(",")[0]?.toUpperCase() ?? "";
        const num = event.date.split(" ").pop() ?? "";
        const going = event.attendees + (interested ? 1 : 0);
        const past = event.category === "past";
        return (
          <Reveal key={event.id} i={i} style={{ marginHorizontal: 16, marginBottom: 10 }}>
            <PressableScale onPress={() => router.push(`/events/${encodeURIComponent(event.id)}` as never)} accessibilityRole="button" accessibilityLabel={`${event.title}, ${event.date}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, opacity: past ? 0.75 : 1 }}>
              <View style={{ width: 54, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
                <Text style={[TYPE.label, { color: tc.accentText, fontSize: 11 }]}>{day}</Text>
                <Text style={[display(800), { fontSize: 22, color: tc.textPrimary, lineHeight: 24 }]}>{num}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]} numberOfLines={2}>{event.title}</Text>
                <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>{[event.time, event.location].filter(Boolean).join(" · ")}</Text>
                <Text style={[TYPE.small, { color: interested ? tc.successText : tc.textTertiary }]} numberOfLines={1}>
                  {[interested ? "You are going" : going > 0 ? `${going} going` : "", event.price].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <View>
                <FadeImage uri={event.image} style={{ width: 60, height: 60, borderRadius: 14 }} />
                <Pressable onPress={() => void toggleSave(event.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={saved ? "Remove from saved" : "Save event"}
                  style={{ position: "absolute", top: -6, right: -6, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: tc.sheetBg, borderWidth: 1, borderColor: tc.glassLine }}>
                  <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={14} color={saved ? tc.accentText : tc.textSecondary} />
                </Pressable>
              </View>
            </PressableScale>
          </Reveal>
        );
      })}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={tab === "Saved" ? "No saved events" : tab === "Past" ? "No past events" : "Nothing coming up yet"}
          sub={tab === "Saved" ? "Tap the bookmark on an event to keep it here." : "Host one: tap + and choose An event."}
        />
      ) : null}
    </DPage>

    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: palette.gray50 },
  scroll: { flex: 1 },
  scrollContent: { padding: rs(16), gap: rs(14) },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  backBtn: {
    width: rs(38), height: rs(38), borderRadius: rs(19),
    backgroundColor: palette.gray100,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: rs(18), fontWeight: "800", color: Colors.text.primary },

  // Hero
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(20),
    paddingVertical: rs(18),
  },
  heroTitle: { fontSize: rs(19), fontWeight: "900", color: palette.white, letterSpacing: -0.3 },
  heroDesc: { fontSize: rs(12), color: "rgba(255,255,255,0.88)", marginTop: rs(3), fontWeight: "500" },
  heroStat: { alignItems: "center" },
  heroStatNum: { fontSize: rs(28), fontWeight: "900", color: palette.white },
  heroStatLbl: { fontSize: rs(9), fontWeight: "700", color: "rgba(255,255,255,0.8)", letterSpacing: 1.2, textTransform: "uppercase" },

  // Tabs
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    gap: rs(8),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralL95_5,
  },
  tab: {
    flex: 1, paddingVertical: rs(9), borderRadius: rs(12),
    backgroundColor: palette.gray100,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: rs(5),
  },
  tabActive: { backgroundColor: Colors.brand.orange },
  tabText: { fontSize: rs(13), fontWeight: "700", color: Colors.text.secondary },
  tabTextActive: { color: palette.white },
  tabBadge: {
    minWidth: 18, height: rs(18), borderRadius: rs(9),
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: rs(4),
  },
  tabBadgeText: { fontSize: rs(10), fontWeight: "900", color: palette.white },

  // Card
  card: {
    backgroundColor: palette.white,
    borderRadius: rs(18),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.neutralL95_5,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.06,
    shadowRadius: rs(10),
    elevation: 2,
  },
  cardImg: { width: "100%", height: rs(160) },
  priceOverlay: {
    position: "absolute",
    top: rs(12), left: rs(12),
    paddingHorizontal: rs(10), paddingVertical: rs(4),
    borderRadius: rs(10),
  },
  priceOverlayText: { fontSize: rs(11), fontWeight: "800", color: palette.white },
  saveOverlay: {
    position: "absolute",
    top: rs(10), right: rs(12),
    width: rs(34), height: rs(34), borderRadius: rs(17),
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center", justifyContent: "center",
  },
  cardBody: { padding: rs(14) },
  cardHeader: { flexDirection: "row", gap: rs(12), marginBottom: rs(10) },
  dateBadge: {
    width: rs(52), height: rs(52), borderRadius: rs(14),
    backgroundColor: Colors.brand.orange + "15",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  dateBadgeDay: { fontSize: rs(11), fontWeight: "800", color: Colors.brand.orange, textTransform: "uppercase" },
  dateBadgeDate: { fontSize: rs(13), fontWeight: "900", color: Colors.brand.orange, marginTop: rs(1) },
  cardTitle: { fontSize: rs(15), fontWeight: "800", color: Colors.text.primary, lineHeight: rs(21), flex: 1 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: rs(4), marginTop: rs(3) },
  cardMetaText: { fontSize: rs(11), color: Colors.text.tertiary, fontWeight: "500" },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(6), marginBottom: rs(12) },
  tag: { backgroundColor: palette.gray100, paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(8) },
  tagText: { fontSize: rs(11), fontWeight: "600", color: Colors.text.secondary },
  attendeeChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: Colors.brand.blueLight,
    paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(8),
  },
  attendeeText: { fontSize: rs(11), fontWeight: "700", color: Colors.brand.blue },

  actions: { flexDirection: "row", gap: rs(8) },
  interestedBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(6),
    paddingVertical: rs(10), borderRadius: rs(12),
    backgroundColor: Colors.brand.orange + "12",
    borderWidth: 1, borderColor: Colors.brand.orange + "25",
  },
  interestedBtnActive: {
    backgroundColor: Colors.brand.greenLight,
    borderColor: Colors.brand.green + "40",
  },
  interestedBtnText: { fontSize: rs(13), fontWeight: "700", color: Colors.brand.orange },
  rsvpBtn: { paddingHorizontal: rs(22), paddingVertical: rs(10), borderRadius: rs(12), alignItems: "center", justifyContent: "center" },
  rsvpBtnText: { fontSize: rs(13), fontWeight: "800", color: palette.white },

  emptyState: { alignItems: "center", marginTop: rs(80), gap: rs(10) },
  emptyTitle: { fontSize: rs(17), fontWeight: "800", color: Colors.text.primary },
  emptyDesc: { fontSize: rs(13), color: Colors.text.secondary, textAlign: "center", paddingHorizontal: rs(30) },
});

// ── Modal styles ──────────────────────────────────────────────────────────────
const edm = createThemedStyles({
  root: { flex: 1, backgroundColor: palette.gray50 },

  heroWrap: { height: rs(290), position: "relative" },
  heroImg: { width: "100%", height: "100%" },

  backBtn: {
    position: "absolute", top: rs(48), left: rs(16),
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center", justifyContent: "center",
  },
  saveBtn: {
    position: "absolute", top: rs(48), right: rs(16),
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center", justifyContent: "center",
  },
  heroBadgeRow: {
    position: "absolute", top: rs(100), left: rs(16),
    flexDirection: "row", gap: rs(8),
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: rs(5),
    paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(10),
  },
  badgeText: { fontSize: rs(11), fontWeight: "800", color: palette.white },
  heroBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: rs(18), paddingBottom: rs(20),
  },
  heroEmoji: { fontSize: rs(26), marginBottom: rs(4) },
  heroTitle: { fontSize: rs(22), fontWeight: "900", color: palette.white, letterSpacing: -0.5, lineHeight: rs(28) },
  heroMeta: {
    flexDirection: "row", alignItems: "center", gap: rs(5), marginTop: rs(8), flexWrap: "wrap",
  },
  heroMetaText: { fontSize: rs(12), color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  heroDot: { width: rs(3), height: rs(3), borderRadius: rs(1.5), backgroundColor: "rgba(255,255,255,0.5)" },

  scroll: { flex: 1 },
  scrollContent: { padding: rs(16) },

  statsRow: {
    flexDirection: "row",
    backgroundColor: palette.white,
    borderRadius: rs(20),
    padding: rs(20),
    marginBottom: rs(16),
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.06,
    shadowRadius: rs(12),
    elevation: 3,
    borderWidth: 1,
    borderColor: palette.neutralL95_5,
  },
  statItem: { flex: 1, alignItems: "center", gap: rs(4) },
  statNum: { fontSize: rs(16), fontWeight: "900", color: Colors.text.primary },
  statLbl: { fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary, letterSpacing: 0.5 },
  statDiv: { width: rs(1), height: rs(48), backgroundColor: palette.neutralL95_5 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(6), marginBottom: rs(16) },
  tag: { backgroundColor: palette.neutralL95_5, paddingHorizontal: rs(12), paddingVertical: rs(5), borderRadius: rs(10) },
  tagText: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary },

  section: { marginBottom: rs(20) },
  sectionTitle: {
    fontSize: rs(15), fontWeight: "800", color: Colors.text.primary,
    marginBottom: rs(10), letterSpacing: -0.2,
  },
  description: { fontSize: rs(14), color: Colors.text.secondary, lineHeight: rs(22) },

  detailGrid: {
    borderRadius: rs(16), overflow: "hidden",
    borderWidth: 1, borderColor: palette.neutralL95_5,
  },
  detailRow: {
    flexDirection: "row", alignItems: "center", gap: rs(12),
    paddingHorizontal: rs(14), paddingVertical: rs(12),
    backgroundColor: palette.white,
    borderBottomWidth: 1, borderBottomColor: palette.neutralL98_5,
  },
  detailIconBox: {
    width: rs(36), height: rs(36), borderRadius: rs(10),
    backgroundColor: Colors.brand.blueLight,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  detailLabel: {
    fontSize: rs(10), color: Colors.text.tertiary, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  detailValue: { fontSize: rs(14), color: Colors.text.primary, fontWeight: "600", marginTop: rs(2) },

  // CTA
  cta: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    paddingHorizontal: rs(16), paddingVertical: rs(14), paddingBottom: rs(44),
    backgroundColor: palette.white,
    borderTopWidth: 1, borderTopColor: palette.neutralL95_5,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: rs(-3) },
    shadowOpacity: 0.05,
    shadowRadius: rs(10),
    elevation: 10,
  },
  ctaInterested: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    paddingHorizontal: rs(14), paddingVertical: rs(13),
    borderRadius: rs(14),
    backgroundColor: Colors.brand.orange + "14",
    borderWidth: 1, borderColor: Colors.brand.orange + "30",
  },
  ctaInterestedActive: {
    backgroundColor: Colors.brand.greenLight,
    borderColor: Colors.brand.green + "50",
  },
  ctaInterestedText: { fontSize: rs(13), fontWeight: "700", color: Colors.brand.orange },
  ctaChat: {
    width: rs(46), height: rs(46), borderRadius: rs(14),
    backgroundColor: Colors.brand.orange + "14",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.brand.orange + "30",
  },
  ctaRSVP: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(8), paddingVertical: rs(15), borderRadius: rs(16),
  },
  ctaRSVPText: { fontSize: rs(14), fontWeight: "900", color: palette.white, letterSpacing: 0.3 },
});

// ── Registration modal styles ─────────────────────────────────────────────────
const rm = createThemedStyles({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: palette.gray50,
    borderTopLeftRadius: rs(28),
    borderTopRightRadius: rs(28),
    maxHeight: "92%",
    overflow: "hidden",
  },
  handle: {
    width: rs(40), height: rs(4), borderRadius: rs(2),
    backgroundColor: palette.gray300,
    alignSelf: "center",
    marginTop: rs(10),
  },

  // ── Image header ──
  imgHeader: { height: rs(168), position: "relative", overflow: "hidden" },
  registerPill: {
    position: "absolute", top: rs(12), left: rs(14),
    flexDirection: "row", alignItems: "center", gap: rs(5),
    backgroundColor: Colors.brand.orange,
    paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(20),
  },
  registerPillText: { fontSize: rs(9), fontWeight: "800", color: palette.white, letterSpacing: 1, textTransform: "uppercase" },
  imgCloseBtn: {
    position: "absolute", top: rs(10), right: rs(14),
    width: rs(30), height: rs(30), borderRadius: rs(15),
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center", justifyContent: "center",
  },
  imgHeaderBody: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: rs(16), paddingBottom: rs(14),
  },
  imgHeaderEmoji: { fontSize: rs(22), marginBottom: rs(2) },
  imgHeaderTitle: { fontSize: rs(18), fontWeight: "900", color: palette.white, lineHeight: rs(23) },
  imgHeaderMeta: { flexDirection: "row", alignItems: "center", gap: rs(5), marginTop: rs(5) },
  imgHeaderMetaText: { fontSize: rs(11), color: "rgba(255,255,255,0.85)", fontWeight: "500" },

  formScroll: { paddingHorizontal: rs(14), paddingTop: rs(14) },

  // ── Price badge ──
  priceBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    paddingHorizontal: rs(12), paddingVertical: rs(8), borderRadius: rs(12),
    borderWidth: 1, alignSelf: "flex-start", marginBottom: rs(12),
  },
  priceBadgeText: { fontSize: rs(13), fontWeight: "700" },

  // ── Form card ──
  formCard: {
    backgroundColor: palette.white,
    borderRadius: rs(18), borderWidth: 1, borderColor: palette.neutralL95_5,
    overflow: "hidden", marginBottom: rs(10),
    shadowColor: palette.black, shadowOffset: { width: 0, height: rs(1) },
    shadowOpacity: 0.04, shadowRadius: rs(6), elevation: 1,
  },
  formDivider: { height: rs(1), backgroundColor: palette.gray100, marginHorizontal: rs(14) },
  fieldGroup: { paddingHorizontal: rs(14), paddingVertical: rs(12) },
  fieldLabel: {
    fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary,
    letterSpacing: 0.6, textTransform: "uppercase", marginBottom: rs(8),
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: palette.gray50,
    borderRadius: rs(12), borderWidth: 1.5, borderColor: palette.neutralL92,
    paddingHorizontal: rs(12), paddingVertical: rs(10), gap: rs(10),
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: rs(14), color: Colors.text.primary, fontWeight: "500" },

  // ── Ticket step card ──
  ticketStepCard: {
    backgroundColor: palette.white,
    borderRadius: rs(18), borderWidth: 1, borderColor: palette.neutralL95_5,
    padding: rs(14), marginBottom: rs(10),
    shadowColor: palette.black, shadowOffset: { width: 0, height: rs(1) },
    shadowOpacity: 0.04, shadowRadius: rs(6), elevation: 1,
  },
  ticketStepTitle: {
    fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: rs(10),
  },
  ticketStepRow: { flexDirection: "row", alignItems: "center", gap: rs(10) },
  ticketBtn: {
    width: rs(42), height: rs(42), borderRadius: rs(13),
    backgroundColor: Colors.brand.orangeLight,
    borderWidth: 1, borderColor: Colors.brand.orange + "30",
    alignItems: "center", justifyContent: "center",
  },
  ticketBtnDisabled: { backgroundColor: palette.gray100, borderColor: palette.gray200 },
  ticketCount: {
    minWidth: 58, alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: rs(12), borderWidth: 1.5, borderColor: palette.gray200,
    paddingVertical: rs(8), paddingHorizontal: rs(12),
  },
  ticketCountNum: { fontSize: rs(20), fontWeight: "900", color: Colors.text.primary },
  ticketCountLbl: { fontSize: rs(9), fontWeight: "700", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  totalBox: {
    marginLeft: "auto" as any,
    backgroundColor: Colors.brand.orangeLight,
    borderRadius: rs(12), borderWidth: 1, borderColor: Colors.brand.orange + "30",
    paddingVertical: rs(8), paddingHorizontal: rs(14), alignItems: "center",
  },
  totalLabel: { fontSize: rs(9), fontWeight: "700", color: Colors.brand.orange, textTransform: "uppercase", letterSpacing: 0.6 },
  totalValue: { fontSize: rs(18), fontWeight: "900", marginTop: rs(1) },

  // ── Hosted by ──
  hostedRow: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    backgroundColor: palette.white,
    borderRadius: rs(16), padding: rs(12),
    borderWidth: 1, borderColor: palette.neutralL95_5,
  },
  hostedAvatar: {
    width: rs(38), height: rs(38), borderRadius: rs(12),
    alignItems: "center", justifyContent: "center",
  },
  hostedLabel: { fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  hostedName: { fontSize: rs(13), fontWeight: "700", color: Colors.text.primary, marginTop: rs(1) },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: Colors.brand.greenLight,
    paddingHorizontal: rs(8), paddingVertical: rs(4), borderRadius: rs(8),
  },
  verifiedText: { fontSize: rs(10), fontWeight: "700", color: Colors.brand.green },

  // ── CTA ──
  ctaWrap: {
    paddingHorizontal: rs(16), paddingTop: rs(12), paddingBottom: rs(30),
    backgroundColor: palette.white,
    borderTopWidth: 1, borderTopColor: palette.neutralL95_5,
  },
  confirmBtn: { borderRadius: rs(16), overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.55 },
  confirmBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(8), paddingVertical: rs(16),
  },
  confirmBtnText: { fontSize: rs(15), fontWeight: "900", color: palette.white, letterSpacing: 0.2 },

  // ── Success ──
  successWrap: { alignItems: "center", paddingHorizontal: rs(22), paddingTop: rs(22) },
  successCircle: {
    width: rs(88), height: rs(88), borderRadius: rs(44),
    alignItems: "center", justifyContent: "center",
    marginBottom: rs(16),
    shadowColor: palette.green600,
    shadowOffset: { width: 0, height: rs(8) },
    shadowOpacity: 0.35, shadowRadius: rs(18), elevation: 10,
  },
  successTitle: { fontSize: rs(22), fontWeight: "900", color: Colors.text.primary, marginBottom: rs(8), letterSpacing: -0.3 },
  successSub: { fontSize: rs(13), color: Colors.text.secondary, textAlign: "center", lineHeight: rs(20), marginBottom: rs(20) },

  // ── Ticket visual ──
  ticketVisual: {
    width: "100%",
    backgroundColor: palette.white,
    borderRadius: rs(20), overflow: "hidden",
    marginBottom: rs(20),
    shadowColor: palette.black, shadowOffset: { width: 0, height: rs(6) },
    shadowOpacity: 0.12, shadowRadius: rs(18), elevation: 6,
    borderWidth: 1, borderColor: palette.neutralL95_5,
  },
  ticketVisualHeader: {
    flexDirection: "row", alignItems: "center", gap: rs(12), padding: rs(16),
  },
  ticketVisualEmoji: { fontSize: rs(30) },
  ticketVisualLabel: {
    fontSize: rs(9), fontWeight: "800", color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2, textTransform: "uppercase",
  },
  ticketVisualName: { fontSize: rs(16), fontWeight: "900", color: palette.white, lineHeight: rs(22), marginTop: rs(2) },
  ticketDetailBlock: { padding: rs(14), gap: rs(10) },
  ticketDetailRow: { flexDirection: "row", alignItems: "center", gap: rs(10) },
  ticketDetailIcon: {
    width: rs(28), height: rs(28), borderRadius: rs(8),
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  ticketDetailText: { fontSize: rs(13), fontWeight: "600", color: Colors.text.primary },
  ticketTear: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 0,
  },
  ticketTearCircleL: {
    width: rs(20), height: rs(20), borderRadius: rs(10),
    backgroundColor: palette.gray50,
    marginLeft: rs(-10),
    borderWidth: 1, borderColor: palette.gray200,
  },
  ticketTearLine: {
    flex: 1, height: rs(1),
    backgroundColor: palette.gray200,
  },
  ticketTearCircleR: {
    width: rs(20), height: rs(20), borderRadius: rs(10),
    backgroundColor: palette.gray50,
    marginRight: rs(-10),
    borderWidth: 1, borderColor: palette.gray200,
  },
  ticketQRStub: { alignItems: "center", paddingVertical: rs(18), gap: rs(6) },
  ticketQRHint: { fontSize: rs(12), color: Colors.text.tertiary, fontWeight: "600" },

  doneBtn: { width: "100%", borderRadius: rs(16), overflow: "hidden" },
  doneBtnGrad: { alignItems: "center", justifyContent: "center", paddingVertical: rs(16) },
  doneBtnText: { fontSize: rs(15), fontWeight: "900", color: palette.white },
});
