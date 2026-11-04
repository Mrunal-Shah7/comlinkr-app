import { rs } from "../../../utils/responsive";
import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TouchableOpacity, Dimensions, Linking, ActivityIndicator, Share, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { FadeImage } from "../../../../components/FadeImage";
import { getEvent, getEventAttendees, type ApiEvent, type EventAttendee } from "../../../api/events.api";
import { getShareLink } from "../../../utils/shareLinks";
import { LinkifiedText } from "../../../../components/LinkifiedText";
import { RatingSummary, EventReviewsSection } from "../../../../components/events";
import { type ExploreEventRow, apiEventToExploreRow } from "../models";
import { CATEGORY_COLOR } from "../constants";

// ── Event Detail Modal ──────────────────────────────────
export function EventDetailModal({
  event,
  visible,
  onClose,
  isSaved,
  onToggleSave,
  isRegistered,
  onToggleGoing,
  onRegister,
  onMessageHost,
}: {
  event: ExploreEventRow | null;
  visible: boolean;
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
  const screenW = Dimensions.get("window").width;

  useEffect(() => {
    setHeroIdx(0);
  }, [event?.id]);

  useEffect(() => {
    if (!visible || !event?.id) {
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
  }, [visible, event?.id]);

  useEffect(() => {
    if (!visible || !event?.isOwner || !event?.id) {
      setAttendees([]);
      return;
    }
    setAttendeesLoading(true);
    getEventAttendees(event.id)
      .then(setAttendees)
      .catch(() => setAttendees([]))
      .finally(() => setAttendeesLoading(false));
  }, [visible, event?.id, event?.isOwner]);

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
  const catColor = CATEGORY_COLOR[displayEvent.category] ?? { bg: "#EBF4FF", text: "#0076EB" };
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
        ...(Platform.OS === "ios" ? { url: link } : {}),
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <View style={[edm.root, { backgroundColor: tc.pageBg }]}>
        {/* Hero image(s) — swipe when multiple */}
        <View style={edm.heroWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(ev) => {
              const x = ev.nativeEvent.contentOffset.x;
              setHeroIdx(Math.round(x / screenW));
            }}
            style={{ width: screenW, height: rs(320) }}
            contentContainerStyle={{ flexDirection: "row" }}
          >
            {heroImages.map((uri, i) => (
              <FadeImage
                key={`${displayEvent.id}-hero-${i}`}
                uri={uri}
                style={{ width: screenW, height: rs(320) }}
              />
            ))}
          </ScrollView>
          {heroImages.length > 1 ? (
            <View
              style={{
                position: "absolute",
                bottom: rs(100),
                alignSelf: "center",
                backgroundColor: "rgba(0,0,0,0.45)",
                paddingHorizontal: rs(10),
                paddingVertical: rs(4),
                borderRadius: rs(12),
              }}
            >
              <Text style={{ color: "#FFF", fontSize: rs(11), fontWeight: "800" }}>
                {heroIdx + 1} / {heroImages.length}
              </Text>
            </View>
          ) : null}
          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "transparent", "rgba(0,0,0,0.80)"]}
            style={StyleSheet.absoluteFill}
          />
          {/* Back button */}
          <TouchableOpacity style={edm.backBtn} onPress={handleClose}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          {/* Top-right action buttons */}
          <View style={edm.heroBadges}>
            <TouchableOpacity style={edm.heroActionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={edm.heroActionBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleSave(); }}>
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={18} color={isSaved ? "#FBBF24" : "#FFF"} />
            </TouchableOpacity>
          </View>
          {/* Title + meta overlay */}
          <View style={edm.heroBottom}>
            <View style={{ flexDirection: "row", gap: rs(7), marginBottom: rs(8) }}>
              <View style={[edm.catBadge, { backgroundColor: catColor.bg }]}>
                <Text style={[edm.catBadgeText, { color: catColor.text }]}>{displayEvent.category}</Text>
              </View>
              <View style={[edm.priceBadge, { backgroundColor: isFree ? "#16A34A" : "#FF7B00" }]}>
                <Text style={edm.priceBadgeText}>{displayEvent.price}</Text>
              </View>
            </View>
            <Text style={edm.heroTitle}>{displayEvent.title}</Text>
            <RatingSummary // SPRINT-42: detail hero aggregate
              averageRating={displayEvent.averageRating}
              totalReviews={displayEvent.totalReviews}
              size="sm"
              textColor="#FFF"
              mutedColor="rgba(255,255,255,0.75)"
              style={{ marginBottom: rs(6) }}
            />
            <View style={edm.heroMeta}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={edm.heroMetaText}>{displayEvent.date} · {displayEvent.time}</Text>
              <View style={edm.heroDot} />
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={edm.heroMetaText}>{displayEvent.location}</Text>
            </View>
          </View>
        </View>

        {/* Scrollable content */}
        <ScrollView style={edm.scroll} contentContainerStyle={edm.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={true}>
          {/* Stats row */}
          <View style={[edm.statsRow, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
            <View style={edm.statItem}>
              <Ionicons name="people" size={20} color={Colors.brand.blue} />
              <Text style={[edm.statNum, { color: tc.textPrimary }]}>{displayEvent.interested}</Text>
              <Text style={[edm.statLbl, { color: tc.textTertiary }]}>Going</Text>
            </View>
            <View style={[edm.statDiv, isDark && { backgroundColor: tc.borderLight }]} />
            <View style={edm.statItem}>
              <Ionicons name="calendar" size={20} color="#FF7B00" />
              <Text style={[edm.statNum, { color: tc.textPrimary }]}>{displayEvent.date}</Text>
              <Text style={[edm.statLbl, { color: tc.textTertiary }]}>Date</Text>
            </View>
            <View style={[edm.statDiv, isDark && { backgroundColor: tc.borderLight }]} />
            <View style={edm.statItem}>
              <Ionicons name="ticket" size={20} color={isFree ? "#16A34A" : "#FF7B00"} />
              <Text style={[edm.statNum, { color: isFree ? "#16A34A" : "#FF7B00" }]}>{displayEvent.price}</Text>
              <Text style={[edm.statLbl, { color: tc.textTertiary }]}>Entry</Text>
            </View>
          </View>

          {/* About */}
          <View style={edm.section}>
            <Text style={[edm.sectionTitle, { color: tc.textPrimary }]}>About this Event</Text>
            <LinkifiedText text={displayEvent.desc} style={[edm.description, { color: tc.textSecondary }]} />
            <Text style={[edm.description, { color: tc.textSecondary }]}>
              {"\n"}Join the community for this exciting event hosted by {displayEvent.host}. Whether you're new in town or a long-time resident, this is a great opportunity to connect with your neighbors and build lasting relationships.
            </Text>
          </View>

          {/* Event Details */}
          <View style={edm.section}>
            <Text style={[edm.sectionTitle, { color: tc.textPrimary }]}>Event Details</Text>
            <View style={edm.detailGrid}>
              {[
                { icon: "calendar-outline" as const, label: "Date", value: displayEvent.date, color: "#FF7B00" },
                { icon: "time-outline" as const, label: "Time", value: displayEvent.time, color: Colors.brand.blue },
                { icon: "location-outline" as const, label: "Venue", value: displayEvent.location, color: "#16A34A" },
                { icon: "person-outline" as const, label: "Hosted by", value: displayEvent.host, color: "#8B5CF6" },
                { icon: "ticket-outline" as const, label: "Admission", value: displayEvent.price, color: "#FF7B00" },
                { icon: "people-outline" as const, label: "Attending", value: `${displayEvent.interested} people`, color: Colors.brand.blue },
              ].map((d) => (
                <View key={d.label} style={[edm.detailRow, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                  <View style={[edm.detailIconBox, { backgroundColor: `${d.color}15` }]}>
                    <Ionicons name={d.icon} size={16} color={d.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[edm.detailLabel, { color: tc.textTertiary }]}>{d.label}</Text>
                    <Text style={[edm.detailValue, { color: tc.textPrimary }]}>{d.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={edm.section}>
            <Text style={[edm.sectionTitle, { color: tc.textPrimary }]}>Quick Actions</Text>
            <View style={edm.quickActionsRow}>
              <TouchableOpacity style={edm.quickActionItem} onPress={handleDirections}>
                <View style={[edm.quickActionIcon, { backgroundColor: isDark ? tc.inputBg : "#EBF5FF" }]}>
                  <Ionicons name="navigate-outline" size={20} color={Colors.brand.blue} />
                </View>
                <Text style={[edm.quickActionLabel, { color: tc.textSecondary }]}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={edm.quickActionItem} onPress={handleShare}>
                <View style={[edm.quickActionIcon, { backgroundColor: isDark ? tc.inputBg : "#F0FDF4" }]}>
                  <Ionicons name="share-social-outline" size={20} color="#16A34A" />
                </View>
                <Text style={[edm.quickActionLabel, { color: tc.textSecondary }]}>Share</Text>
              </TouchableOpacity>
              {displayEvent.canAccessChat && displayEvent.conversationId ? (
                <TouchableOpacity
                  style={edm.quickActionItem}
                  onPress={() =>
                    router.push({
                      pathname: "/chat",
                      params: { conversationId: displayEvent.conversationId! },
                    } as any)
                  }
                >
                  <View style={[edm.quickActionIcon, { backgroundColor: isDark ? tc.inputBg : "#FFF7ED" }]}>
                    <Ionicons name="chatbubbles-outline" size={20} color="#FF7B00" />
                  </View>
                  <Text style={[edm.quickActionLabel, { color: tc.textSecondary }]}>Event Chat</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Host info */}
          {displayEvent.isOwner ? (
            <View
              style={[
                edm.attendeesSection,
                isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight },
              ]}
            >
              <Pressable
                onPress={() => setAttendeesExpanded((e) => !e)}
                style={edm.attendeesHeader}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(8) }}>
                  <Ionicons name="people" size={18} color={Colors.brand.blue} />
                  <Text style={[edm.sectionTitle, { color: tc.textPrimary, marginBottom: 0 }]}>Attendees</Text>
                  <Text style={[edm.attendeesCount, { color: tc.textSecondary }]}>
                    [{displayEvent.interested} registered]
                  </Text>
                </View>
                {attendeesLoading ? (
                  <ActivityIndicator size="small" color={Colors.brand.blue} />
                ) : (
                  <Ionicons name={attendeesExpanded ? "chevron-up" : "chevron-down"} size={18} color={tc.textTertiary} />
                )}
              </Pressable>
              {attendeesExpanded ? (
                <View style={edm.attendeesBody}>
                  {attendeesLoading ? (
                    <View style={{ paddingVertical: rs(12), alignItems: "center" }}>
                      <ActivityIndicator color={Colors.brand.blue} />
                    </View>
                  ) : attendees.length === 0 ? (
                    <Text style={[edm.attendeesEmpty, { color: tc.textSecondary }]}>No one has RSVP'd yet.</Text>
                  ) : (
                    attendees.map((a, idx) => (
                      <View
                        key={`${a.id}-${idx}`}
                        style={[
                          edm.attendeeRow,
                          idx < attendees.length - 1 && edm.attendeeRowDivider,
                          isDark && { borderBottomColor: tc.borderLight },
                        ]}
                      >
                        <View style={edm.attendeeAvatar}>
                          {a.avatar ? (
                            <FadeImage uri={a.avatar} style={{ width: rs(40), height: rs(40), borderRadius: rs(20) }} /> // SPRINT-42: render attendee avatars with FadeImage.
                          ) : (
                            <Text style={edm.attendeeAvatarText}>
                              {(a.attendeeName ?? a.name).slice(0, 2).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[edm.attendeeName, { color: tc.textPrimary }]} numberOfLines={1}>
                            {a.attendeeName ?? a.name}
                          </Text>
                          <Text style={[edm.attendeeMeta, { color: tc.textSecondary }]} numberOfLines={1}>
                            {a.attendeeEmail ?? "—"}
                          </Text>
                          <Text style={[edm.attendeeMeta, { color: tc.textTertiary }]}>
                            Phone: {a.attendeePhone?.trim() ? a.attendeePhone : "—"}
                          </Text>
                          <Text style={[edm.attendeeMeta, { color: tc.textTertiary }]}>
                            Tickets: {a.ticketCount ?? 1}
                          </Text>
                          <Text style={[edm.attendeeMeta, { color: tc.textTertiary }]}>
                            Registered: {new Date(a.registeredAt).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={edm.section}>
            <Text style={[edm.sectionTitle, { color: tc.textPrimary }]}>Hosted By</Text>
            <View style={[edm.hostCard, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
              <LinearGradient colors={[Colors.brand.blue, "#0055CC"]} style={edm.hostAvatar}>
                <Text style={edm.hostInitials}>{displayEvent.host.split(" ").map(w => w[0]).join("").slice(0, 2)}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[edm.hostName, { color: tc.textPrimary }]}>{displayEvent.host}</Text>
                <Text style={[edm.hostSub, { color: tc.textTertiary }]}>Event Organizer · Verified</Text>
              </View>
              {displayEvent.authorId && !(displayEvent.canAccessChat && displayEvent.conversationId) ? (
                <TouchableOpacity
                  style={[edm.hostChatBtn, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderMedium }]}
                  onPress={() => {
                    if (onMessageHost) {
                      onMessageHost();
                      return;
                    }
                    router.push({
                      pathname: "/chat",
                      params: {
                        recipientId: displayEvent.authorId,
                        recipientName: displayEvent.host,
                        recipientType: "dm",
                      },
                    } as any);
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={Colors.brand.blue} />
                  <Text style={edm.hostChatText}>Message</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* SPRINT-42: reviews after host block; full implementation prefers feed getEvent detail */}
          <View style={edm.section}>
            <EventReviewsSection
              eventId={displayEvent.id}
              detailEvent={
                detailApiEvent
                  ? {
                      ...detailApiEvent,
                      registeredByMe: event.registeredByMe || detailApiEvent.registeredByMe,
                      isAttending: event.registeredByMe || detailApiEvent.isAttending,
                      isOwner: event.isOwner || detailApiEvent.isOwner,
                    }
                  : null
              }
              onDetailRefreshed={(fresh) => {
                setDetailApiEvent(fresh);
                setDetailFromApi(apiEventToExploreRow(fresh));
              }}
            />
          </View>

          {/* SPRINT-42: door check-in reachable from feed event detail only when detail isOwner */}
          {(detailApiEvent?.isOwner ?? displayEvent.isOwner) ? (
            <View style={edm.section}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/events/[id]/check-in",
                    params: { id: displayEvent.id, title: displayEvent.title },
                  } as any)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: rs(8),
                  backgroundColor: isDark ? tc.inputBg : "#111827",
                  paddingVertical: rs(14),
                  borderRadius: rs(14),
                }}
              >
                <Ionicons name="qr-code-outline" size={18} color="#FFF" />
                <Text style={{ color: "#FFF", fontWeight: "900", fontSize: rs(14) }}>Door Check-In</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ height: rs(30) }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[edm.cta, isDark && { backgroundColor: tc.cardBg, borderTopColor: tc.borderLight }]}>
          {displayEvent.canAccessChat && displayEvent.conversationId ? (
            <Pressable
              style={[
                edm.ctaEventChat,
                isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/chat",
                  params: { conversationId: displayEvent.conversationId! },
                } as any)
              }
            >
              <Ionicons name="chatbubbles-outline" size={18} color={Colors.brand.blue} />
              <Text style={[edm.ctaEventChatText, { color: tc.textPrimary }]}>Event Chat</Text>
            </Pressable>
          ) : null}
          {isRegistered ? (
            <Pressable
              style={[
                edm.ctaCancelRsvp,
                isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleGoing();
              }}
            >
              <Text style={[edm.ctaCancelRsvpText, { color: tc.textSecondary }]}>Cancel RSVP</Text>
            </Pressable>
          ) : (
            <Pressable
              style={{ flex: 1, borderRadius: rs(14), overflow: "hidden", minWidth: 120 }}
              onPress={onRegister}
            >
              <LinearGradient
                colors={["#FF7B00", "#E56800"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={edm.ctaRSVP}
              >
                <Ionicons name="ticket-outline" size={17} color="#FFF" />
                <Text style={edm.ctaRSVPText}>Register / RSVP</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

export const edm = StyleSheet.create({
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
  regTicketChipActive: { borderColor: "#FF7B00", backgroundColor: "#FFF3E6" },
  regTicketText: { fontSize: rs(14), fontWeight: "700", color: Colors.text.secondary },
  regTicketTextActive: { color: "#FF7B00", fontWeight: "900" },
  regPriceSummary: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#FFF3E6", borderRadius: rs(12), padding: rs(14), marginBottom: rs(16),
    borderWidth: 1, borderColor: "#FECBA1",
  },
  regPriceLabel: { fontSize: rs(13), fontWeight: "700", color: Colors.text.secondary },
  regPriceValue: { fontSize: rs(16), fontWeight: "900", color: "#FF7B00" },
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
