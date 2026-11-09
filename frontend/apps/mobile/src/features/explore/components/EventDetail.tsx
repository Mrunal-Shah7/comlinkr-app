import { rs } from "../../../utils/responsive";
import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, Linking, ActivityIndicator, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { createThemedStyles } from "../../../theme/themedStyles";
import { FadeImage } from "../../../../components/FadeImage";
import { getEvent, getEventAttendees, type ApiEvent, type EventAttendee } from "../../../api/events.api";
import { getShareLink } from "../../../utils/shareLinks";
import { LinkifiedText } from "../../../../components/LinkifiedText";
import { RatingSummary, EventReviewsSection } from "../../../../components/events";
import { type ExploreEventRow, apiEventToExploreRow } from "../models";
import { CATEGORY_COLOR } from "../constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TYPE } from "../../../theme/d";
import { GradientButton, GradientFill, Reveal, SoftButton } from "../../../shared/d";

// ── Event Detail Modal ──────────────────────────────────
/** The body of the /events/[id] route (plan 03). */
export function EventDetail({
  event,
  apiEvent,
  onClose,
  isSaved,
  onToggleSave,
  isRegistered,
  onToggleGoing,
  onRegister,
  onMessageHost,
}: {
  event: ExploreEventRow | null;
  /** The by-id response the route already fetched; the detail then skips its own request. */
  apiEvent?: ApiEvent | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  isRegistered: boolean;
  onToggleGoing: () => void;
  onRegister?: () => void;
  onMessageHost?: () => void;
}) {
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regTickets, setRegTickets] = useState("1");
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  /** Fresh row from GET /events/:id so hero images match DB after upload (list can be stale). */
  const [detailFromApi, setDetailFromApi] = useState<ExploreEventRow | null>(null);
  const [detailApiEvent, setDetailApiEvent] = useState<ApiEvent | null>(null); // SPRINT-42: full detail for reviews/check-in
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesExpanded, setAttendeesExpanded] = useState(false);
  const { isDark, tc } = useTheme();
  const { width: screenW } = useWindowDimensions();

  useEffect(() => {
    setHeroIdx(0);
  }, [event?.id]);

  useEffect(() => {
    if (apiEvent) {
      setDetailApiEvent(apiEvent);
      setDetailFromApi(apiEventToExploreRow(apiEvent));
      return;
    }
    if (!event?.id) {
      setDetailFromApi(null);
      setDetailApiEvent(null); // SPRINT-42:
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const api = await getEvent(event.id);
        if (!cancelled) {
          setDetailApiEvent(api); // SPRINT-42:
          setDetailFromApi(apiEventToExploreRow(api));
        }
      } catch {
        if (!cancelled) {
          setDetailFromApi(null);
          setDetailApiEvent(null); // SPRINT-42:
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiEvent, event?.id]);

  useEffect(() => {
    if (!event?.isOwner || !event?.id) {
      setAttendees([]);
      return;
    }
    setAttendeesLoading(true);
    getEventAttendees(event.id)
      .then(setAttendees)
      .catch(() => setAttendees([]))
      .finally(() => setAttendeesLoading(false));
  }, [event?.id, event?.isOwner]);

  const insetsD = useSafeAreaInsets();
  if (!event) return null;
  /** Prefer detail for copy/images; keep RSVP/save/chat fields in sync with live list state. */
  const displayEvent: ExploreEventRow = detailFromApi
    ? {
        ...detailFromApi,
        registeredByMe: event.registeredByMe,
        isSaved: event.isSaved,
        canAccessChat: event.canAccessChat,
        conversationId: event.conversationId,
        interested: event.interested,
        // SPRINT-42: detail isOwner is authoritative; never prefer a stale list-row false
        isOwner:
          detailApiEvent != null
            ? !!detailApiEvent.isOwner
            : !!(detailFromApi.isOwner || event.isOwner),
        authorId: event.authorId,
      }
    : {
        ...event,
        // SPRINT-42:
        isOwner: detailApiEvent != null ? !!detailApiEvent.isOwner : !!event.isOwner,
      };
  const catColor = CATEGORY_COLOR[displayEvent.category] ?? { bg: "#EBF4FF", text: "#1A6BAE" };
  const isFree = displayEvent.price === "Free";
  const heroImages = displayEvent.images?.length ? displayEvent.images : [displayEvent.image];

  const handleRegister = () => {
    if (!regName.trim() || !regEmail.trim()) return;
    setRegSubmitted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShare = async () => {
    try {
      const link = getShareLink("event", displayEvent.id);
      await Share.share({
        title: displayEvent.title,
        message: `Check out "${displayEvent.title}" on ${displayEvent.date} at ${displayEvent.location}! 🎉\n\n${link}`,
        ...(process.env.EXPO_OS === "ios" ? { url: link } : {}),
      });
    } catch { /* ignore */ }
  };

  const handleDirections = () => {
    const encodedLoc = encodeURIComponent(displayEvent.location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedLoc}`);
  };

  const resetForm = () => {
    setShowRegForm(false);
    setRegName("");
    setRegEmail("");
    setRegPhone("");
    setRegTickets("1");
    setRegSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const glassBtn = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, color = "#fff") => (
    <Pressable key={label} onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,20,28,0.42)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
      <Ionicons name={icon} size={19} color={color} />
    </Pressable>
  );
  const facts = ([
    ["When", [displayEvent.date, displayEvent.time].filter(Boolean).join(" · ")],
    ["Where", displayEvent.location],
    ["Entry", displayEvent.price],
    ["Going", displayEvent.interested > 0 ? `${displayEvent.interested} ${displayEvent.interested === 1 ? "person" : "people"}` : ""],
  ] as [string, string][]).filter(([, v]) => !!v);
  const hasChat = !!(displayEvent.canAccessChat && displayEvent.conversationId);
  const owner = detailApiEvent?.isOwner ?? displayEvent.isOwner;
  const openChat = () => router.push({ pathname: "/chat", params: { conversationId: displayEvent.conversationId! } } as any);
  const messageHost = () => {
    if (onMessageHost) { onMessageHost(); return; }
    router.push({ pathname: "/chat", params: { recipientId: displayEvent.authorId, recipientName: displayEvent.host, recipientType: "dm" } } as any);
  };
  const h2 = (t: string) => <Text style={[TYPE.section, { color: tc.textPrimary, marginTop: 24, marginBottom: 10 }]}>{t}</Text>;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
        {/* Hero (swipe when there are several photos) */}
        <View style={{ height: 340 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(ev) => setHeroIdx(Math.round(ev.nativeEvent.contentOffset.x / screenW))}
            style={{ width: screenW, height: 340 }}>
            {heroImages.map((uri, i) => <FadeImage key={`${displayEvent.id}-hero-${i}`} uri={uri} style={{ width: screenW, height: 340 }} />)}
          </ScrollView>
          <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 130 }} pointerEvents="none" />
          <View style={{ position: "absolute", top: insetsD.top + 10, left: 14, right: 14, flexDirection: "row", gap: 8 }}>
            {glassBtn("chevron-back", "Back", handleClose)}
            <View style={{ flex: 1 }} />
            {glassBtn("share-outline", "Share", () => void handleShare())}
            {glassBtn(isSaved ? "bookmark" : "bookmark-outline", isSaved ? "Remove from saved" : "Save event", () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleSave(); })}
          </View>
          {heroImages.length > 1 ? (
            <View style={{ position: "absolute", bottom: 40, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={[TYPE.label, { color: "#fff" }]}>{heroIdx + 1} / {heroImages.length}</Text>
            </View>
          ) : null}
        </View>

        <ScrollView style={{ flex: 1, marginTop: -26, backgroundColor: tc.pageBg, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Reveal i={0}>
            <View style={{ alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: tc.accentSoft }}>
              <Text style={[TYPE.label, { color: tc.accentText }]}>{displayEvent.category}</Text>
            </View>
            <Text style={[TYPE.pageTitle, { fontSize: 26, lineHeight: 30, color: tc.textPrimary, marginTop: 10 }]}>{displayEvent.title}</Text>
            <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 4 }]}>Hosted by <Text style={{ color: tc.textPrimary, fontFamily: "Manrope_700Bold" }}>{displayEvent.host}</Text></Text>
            <RatingSummary averageRating={displayEvent.averageRating} totalReviews={displayEvent.totalReviews} size="sm" textColor={tc.textPrimary} mutedColor={tc.textTertiary} style={{ marginTop: 6 }} />
          </Reveal>

          <Reveal i={1} style={{ marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, paddingHorizontal: 14 }}>
            {facts.map(([k, v], i) => (
              <View key={k} style={[{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 12 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
                <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
                <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
              </View>
            ))}
          </Reveal>

          <Reveal i={2} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <SoftButton small ghost label="Directions" icon={<Ionicons name="navigate-outline" size={16} color={tc.textPrimary} />} onPress={handleDirections} />
            {hasChat ? <SoftButton small ghost label="Event chat" icon={<Ionicons name="chatbubbles-outline" size={16} color={tc.textPrimary} />} onPress={openChat} /> : null}
            {owner ? (
              <SoftButton small ghost label="Door check-in" icon={<Ionicons name="qr-code-outline" size={16} color={tc.textPrimary} />}
                onPress={() => router.push({ pathname: "/events/[id]/check-in", params: { id: displayEvent.id, title: displayEvent.title } } as any)} />
            ) : null}
          </Reveal>

          {displayEvent.desc ? (
            <Reveal i={3}>
              {h2("About")}
              <LinkifiedText text={displayEvent.desc} style={[TYPE.body, { color: tc.textSecondary, lineHeight: 23 }]} />
            </Reveal>
          ) : null}

          {h2("Host")}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg }}>
            <GradientFill style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
              <Text style={[TYPE.label, { color: "#fff", fontSize: 15 }]}>{displayEvent.host.split(" ").map((w) => w[0]).join("").slice(0, 2)}</Text>
            </GradientFill>
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{displayEvent.host}</Text>
              <Text style={[TYPE.small, { color: tc.textTertiary }]}>Organiser</Text>
            </View>
            {displayEvent.authorId && !hasChat && !owner ? <SoftButton small label="Message" onPress={messageHost} /> : null}
          </View>

          {displayEvent.isOwner ? (
            <View style={{ marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
              <Pressable onPress={() => setAttendeesExpanded((e) => !e)} accessibilityRole="button" accessibilityState={{ expanded: attendeesExpanded }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 }}>
                <Ionicons name="people-outline" size={18} color={tc.accentText} />
                <Text style={[TYPE.bodyStrong, { flex: 1, color: tc.textPrimary }]}>Who is coming · {displayEvent.interested}</Text>
                {attendeesLoading ? <ActivityIndicator size="small" color={tc.accent} /> : <Ionicons name={attendeesExpanded ? "chevron-up" : "chevron-down"} size={18} color={tc.textTertiary} />}
              </Pressable>
              {attendeesExpanded ? (
                attendees.length === 0 && !attendeesLoading ? (
                  <Text style={[TYPE.small, { color: tc.textTertiary, paddingHorizontal: 14, paddingBottom: 14 }]}>No one has signed up yet.</Text>
                ) : attendees.map((a, idx) => (
                  <View key={`${a.id}-${idx}`} style={{ flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }}>
                    {a.avatar ? <FadeImage uri={a.avatar} style={{ width: 40, height: 40, borderRadius: 20 }} /> : (
                      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
                        <Text style={[TYPE.label, { color: tc.accentText }]}>{(a.attendeeName ?? a.name).slice(0, 2).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{a.attendeeName ?? a.name}</Text>
                      <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>{[a.attendeeEmail, a.attendeePhone?.trim()].filter(Boolean).join(" · ")}</Text>
                      <Text style={[TYPE.small, { color: tc.textTertiary, fontSize: 12 }]}>{`${a.ticketCount ?? 1} ticket${(a.ticketCount ?? 1) === 1 ? "" : "s"} · ${new Date(a.registeredAt).toLocaleDateString()}`}</Text>
                    </View>
                  </View>
                ))
              ) : null}
            </View>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <EventReviewsSection
              eventId={displayEvent.id}
              detailEvent={detailApiEvent ? { ...detailApiEvent, registeredByMe: event.registeredByMe || detailApiEvent.registeredByMe, isAttending: event.registeredByMe || detailApiEvent.isAttending, isOwner: event.isOwner || detailApiEvent.isOwner } : null}
              onDetailRefreshed={(fresh) => { setDetailApiEvent(fresh); setDetailFromApi(apiEventToExploreRow(fresh)); }}
            />
          </View>
        </ScrollView>

        {/* Glass bar: the price and the next step */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: insetsD.bottom + 12, backgroundColor: tc.glass, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.glassLine }}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]}>{displayEvent.price}</Text>
            <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>{[displayEvent.date, displayEvent.time].filter(Boolean).join(" · ")}</Text>
          </View>
          {isRegistered ? (
            <SoftButton ghost label="Cancel RSVP" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleGoing(); }} />
          ) : owner ? (
            // The host cannot RSVP to their own event (the server refuses it), so say so instead of offering a button that fails.
            <Text style={[TYPE.bodyStrong, { color: tc.textSecondary }]}>You're hosting</Text>
          ) : (
            <GradientButton label="RSVP" onPress={onRegister} style={{ paddingHorizontal: 12 }} icon={<Ionicons name="ticket-outline" size={17} color="#fff" />} />
          )}
        </View>
      </View>
    </View>
  );
}

export const edm = createThemedStyles({
  root: { flex: 1, backgroundColor: "#FFF" },
  heroWrap: { height: rs(320), position: "relative" },
  heroImg: { ...StyleSheet.absoluteFill as any },
  backBtn: {
    position: "absolute", top: rs(48), left: rs(16),
    width: rs(42), height: rs(42), borderRadius: rs(21),
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  heroBadges: {
    position: "absolute", top: rs(50), right: rs(16),
    flexDirection: "row", gap: rs(8),
  },
  heroActionBtn: {
    width: rs(42), height: rs(42), borderRadius: rs(21),
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  catBadge: { paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(8) },
  catBadgeText: { fontSize: rs(11), fontWeight: "800", letterSpacing: 0.3 },
  priceBadge: { paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(8) },
  priceBadgeText: { fontSize: rs(11), fontWeight: "800", color: "#FFF" },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: rs(20) },
  heroTitle: { fontSize: rs(24), fontWeight: "900", color: "#FFF", lineHeight: rs(30), marginBottom: rs(8), letterSpacing: -0.3 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: rs(5) },
  heroMetaText: { fontSize: rs(13), color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  heroDot: { width: rs(3), height: rs(3), borderRadius: rs(2), backgroundColor: "rgba(255,255,255,0.5)" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: rs(20), paddingTop: rs(8), paddingBottom: rs(24) },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F7F9FC",
    borderRadius: rs(18), padding: rs(18), marginVertical: rs(14),
    borderWidth: 1, borderColor: "#ECEEF1",
  },
  statItem: { flex: 1, alignItems: "center", gap: rs(5) },
  statNum: { fontSize: rs(16), fontWeight: "900", color: Colors.text.primary },
  statLbl: { fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary, letterSpacing: 0.4 },
  statDiv: { width: rs(1), height: rs(40), backgroundColor: "#ECEEF1" },
  section: { marginBottom: rs(22) },
  sectionTitle: { fontSize: rs(16), fontWeight: "900", color: Colors.text.primary, marginBottom: rs(12), letterSpacing: -0.2 },
  description: { fontSize: rs(14), color: Colors.text.secondary, lineHeight: rs(23), fontWeight: "500" },
  detailGrid: { gap: rs(8) },
  detailRow: {
    flexDirection: "row", alignItems: "center", gap: rs(12),
    backgroundColor: "#F7F9FC", borderRadius: rs(14), padding: rs(14),
    borderWidth: 1, borderColor: "#ECEEF1",
  },
  detailIconBox: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: Colors.brand.blueLight,
    alignItems: "center", justifyContent: "center",
  },
  detailLabel: { fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: rs(14), fontWeight: "700", color: Colors.text.primary, marginTop: rs(2) },
  // Quick actions
  quickActionsRow: { flexDirection: "row", gap: rs(12) },
  quickActionItem: { flex: 1, alignItems: "center", gap: rs(8) },
  quickActionIcon: {
    width: rs(52), height: rs(52), borderRadius: rs(16),
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E7EFFA",
  },
  quickActionLabel: { fontSize: rs(11), fontWeight: "700", color: Colors.text.secondary, textAlign: "center" },
  // Registration form
  regOpenBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(14),
    paddingHorizontal: rs(18), paddingVertical: rs(18), borderRadius: rs(16),
  },
  regOpenBtnTitle: { fontSize: rs(15), fontWeight: "900", color: "#FFF" },
  regOpenBtnSub: { fontSize: rs(11), fontWeight: "600", color: "rgba(255,255,255,0.8)", marginTop: rs(2) },
  regForm: {
    backgroundColor: "#F8FAFC", borderRadius: rs(18), padding: rs(18),
    borderWidth: 1, borderColor: "#E7EFFA",
  },
  regFieldGroup: { marginBottom: rs(16) },
  regLabel: { fontSize: rs(12), fontWeight: "800", color: Colors.text.primary, marginBottom: rs(6), letterSpacing: 0.2 },
  regInputWrap: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    backgroundColor: "#FFF", borderRadius: rs(12), borderWidth: 1.5, borderColor: "#E7EFFA",
    paddingHorizontal: rs(14), paddingVertical: rs(12),
  },
  regInput: { flex: 1, fontSize: rs(14), fontWeight: "600", color: Colors.text.primary, padding: 0 },
  regTicketRow: { flexDirection: "row", gap: rs(8) },
  regTicketChip: {
    flex: 1, alignItems: "center", paddingVertical: rs(10),
    borderRadius: rs(10), backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E7EFFA",
  },
  regTicketChipActive: { borderColor: "#257A86", backgroundColor: "#E2F0F1" },
  regTicketText: { fontSize: rs(14), fontWeight: "700", color: Colors.text.secondary },
  regTicketTextActive: { color: "#257A86", fontWeight: "900" },
  regPriceSummary: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#E2F0F1", borderRadius: rs(12), padding: rs(14), marginBottom: rs(16),
    borderWidth: 1, borderColor: "#FECBA1",
  },
  regPriceLabel: { fontSize: rs(13), fontWeight: "700", color: Colors.text.secondary },
  regPriceValue: { fontSize: rs(16), fontWeight: "900", color: "#257A86" },
  regBtnRow: { flexDirection: "row", gap: rs(10) },
  regCancelBtn: {
    paddingHorizontal: rs(20), paddingVertical: rs(14),
    borderRadius: rs(12), borderWidth: 1.5, borderColor: "#E5E7EB",
  },
  regCancelText: { fontSize: rs(14), fontWeight: "700", color: Colors.text.secondary },
  regSubmitBtn: { flex: 1, borderRadius: rs(12), overflow: "hidden" },
  regSubmitGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(8), paddingVertical: rs(14), borderRadius: rs(12),
  },
  regSubmitText: { fontSize: rs(14), fontWeight: "800", color: "#FFF" },
  regSuccess: {
    alignItems: "center", backgroundColor: "#F0FDF4", borderRadius: rs(18),
    padding: rs(28), borderWidth: 1, borderColor: "#BBF7D0",
  },
  regSuccessIcon: { marginBottom: rs(12) },
  regSuccessTitle: { fontSize: rs(18), fontWeight: "900", color: "#16A34A", marginBottom: rs(8) },
  regSuccessDesc: { fontSize: rs(13), fontWeight: "600", color: Colors.text.secondary, textAlign: "center", lineHeight: rs(20) },
  regSuccessBtn: {
    marginTop: rs(16), backgroundColor: "#16A34A",
    paddingHorizontal: rs(28), paddingVertical: rs(12), borderRadius: rs(12),
  },
  regSuccessBtnText: { fontSize: rs(14), fontWeight: "800", color: "#FFF" },
  // Host card
  hostCard: {
    flexDirection: "row", alignItems: "center", gap: rs(14),
    backgroundColor: "#F7F9FC", borderRadius: rs(16), padding: rs(16),
    borderWidth: 1, borderColor: "#ECEEF1",
  },
  hostAvatar: { width: rs(48), height: rs(48), borderRadius: rs(14), alignItems: "center", justifyContent: "center" },
  hostInitials: { fontSize: rs(16), fontWeight: "900", color: "#FFF" },
  hostName: { fontSize: rs(15), fontWeight: "800", color: Colors.text.primary },
  hostSub: { fontSize: rs(11), fontWeight: "600", color: Colors.text.tertiary, marginTop: rs(2) },
  hostChatBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    backgroundColor: Colors.brand.blueLight, paddingHorizontal: rs(14), paddingVertical: rs(8),
    borderRadius: rs(10), borderWidth: 1, borderColor: "#D6E8FF",
  },
  hostChatText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },
  cta: {
    flexDirection: "row", flexWrap: "wrap", gap: rs(10), alignItems: "center",
    paddingHorizontal: rs(16), paddingVertical: rs(12), paddingBottom: rs(44),
    borderTopWidth: 1, borderTopColor: "#EEF2F8",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: rs(-3) },
    shadowOpacity: 0.05,
    shadowRadius: rs(10),
    elevation: 10,
  },
  ctaEventChat: {
    flexDirection: "row", alignItems: "center", gap: rs(8),
    paddingHorizontal: rs(14), paddingVertical: rs(12),
    borderRadius: rs(14), borderWidth: 1.5, borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  ctaEventChatText: { fontSize: rs(13), fontWeight: "800" },
  ctaCancelRsvp: {
    paddingHorizontal: rs(14), paddingVertical: rs(12), borderRadius: rs(14),
    borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  ctaCancelRsvpText: { fontSize: rs(13), fontWeight: "700" },
  ctaRSVP: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(7), height: rs(50), borderRadius: rs(16),
  },
  ctaRSVPText: { fontSize: rs(15), fontWeight: "900", color: "#FFF", letterSpacing: 0.3 },
  attendeesSection: {
    marginHorizontal: rs(4),
    marginBottom: rs(18),
    padding: rs(14),
    borderRadius: rs(16),
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attendeesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attendeesCount: { fontSize: rs(12), fontWeight: "700" },
  attendeesBody: { marginTop: rs(12) },
  attendeesEmpty: { fontSize: rs(13), fontWeight: "600", paddingVertical: rs(8) },
  attendeeRow: { flexDirection: "row", alignItems: "flex-start", gap: rs(12), paddingVertical: rs(12) },
  attendeeRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  attendeeAvatar: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  attendeeAvatarText: { fontSize: rs(14), fontWeight: "900", color: "#4338CA" },
  attendeeName: { fontSize: rs(14), fontWeight: "800" },
  attendeeMeta: { fontSize: rs(12), fontWeight: "600", marginTop: rs(2) },
});
