import { rs } from "../src/utils/responsive";
import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Image,
} from "react-native";
import { FadeImage } from "../components/FadeImage"; // SPRINT-31:
import { LinkifiedText } from "../components/LinkifiedText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
import { RatingSummary, EventReviewsSection } from "../components/events"; // SPRINT-42:
import * as Brightness from "expo-brightness"; // SPRINT-42:
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';

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
function RegistrationModal({
  event,
  visible,
  onClose,
}: {
  event: EventItem | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tickets, setTickets] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<EventTicket | null>(null);
  const { isDark, tc } = useTheme();
  const priorBrightness = useRef<number | null>(null); // SPRINT-42: capture prior once per raise session
  const brightnessGenRef = useRef(0); // SPRINT-42: invalidate in-flight raise after cancel

  const restoreBrightness = useCallback(() => {
    // SPRINT-42: bump gen so a late setBrightness(1) cannot stick
    brightnessGenRef.current += 1; // SPRINT-42:
    const prior = priorBrightness.current; // SPRINT-42:
    if (prior != null) {
      // SPRINT-42:
      void Brightness.setBrightnessAsync(prior).catch(() => {}); // SPRINT-42:
      priorBrightness.current = null; // SPRINT-42:
    }
  }, []);

  useEffect(() => {
    // SPRINT-42: raise brightness while QR visible
    if (!visible || !submitted || !ticket?.qrCode) return; // SPRINT-42:
    const gen = ++brightnessGenRef.current; // SPRINT-42:
    let cancelled = false; // SPRINT-42:
    let sessionPrior: number | null = priorBrightness.current; // SPRINT-42: local prior for late-max restore
    void (async () => {
      // SPRINT-42:
      try {
        if (sessionPrior == null) {
          // SPRINT-42: capture prior once
          const current = await Brightness.getBrightnessAsync(); // SPRINT-42:
          if (cancelled || gen !== brightnessGenRef.current) return; // SPRINT-42:
          sessionPrior = current; // SPRINT-42:
          priorBrightness.current = current; // SPRINT-42:
        }
        if (cancelled || gen !== brightnessGenRef.current) return; // SPRINT-42:
        await Brightness.setBrightnessAsync(1); // SPRINT-42:
        if (cancelled || gen !== brightnessGenRef.current) {
          // SPRINT-42: late max after cancel — restore using session prior (ref may already be null)
          if (sessionPrior != null) void Brightness.setBrightnessAsync(sessionPrior).catch(() => {}); // SPRINT-42:
        }
      } catch {
        /* optional */ // SPRINT-42:
      }
    })();
    return () => {
      cancelled = true; // SPRINT-42:
      restoreBrightness(); // SPRINT-42:
    };
  }, [visible, submitted, ticket?.qrCode, restoreBrightness]);

  useEffect(() => {
    // SPRINT-42: restore when modal hides without handleClose
    if (!visible) restoreBrightness(); // SPRINT-42:
  }, [visible, restoreBrightness]);

  const handleClose = () => {
    restoreBrightness(); // SPRINT-42:
    setSubmitted(false);
    setName("");
    setEmail("");
    setTickets(1);
    setTicket(null);
    onClose();
  };

  if (!event) return null;
  const isFree = event.price === "Free";
  const priceNum = isFree ? 0 : parseFloat(event.price.replace("$", ""));
  const totalPrice = isFree ? "Free" : `$${(priceNum * tickets).toFixed(0)}`;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const issuedTicket = await registerWithDetails(event.id, {
        name: name.trim(),
        email: email.trim(),
        quantity: tickets,
      });
      setTicket(issuedTicket);
      setSubmitted(true);
    } catch (err) {
      appAlert(
        "Registration failed",
        err instanceof ApiError ? err.message : "Could not complete registration. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={rm.overlay} onPress={handleClose}>
        <Pressable style={[rm.sheet, { backgroundColor: tc.pageBg }]} onPress={() => {}}>
          <View style={rm.handle} />

          {submitted ? (
            /* ── Success state ── */
            <ScrollView contentContainerStyle={rm.successWrap} showsVerticalScrollIndicator={false}>
              <LinearGradient colors={["#22C55E", "#16A34A"]} style={rm.successCircle}>
                <Ionicons name="checkmark" size={42} color="#FFF" />
              </LinearGradient>
              <Text style={[rm.successTitle, { color: tc.textPrimary }]}>You're Registered! 🎉</Text>
              <Text style={[rm.successSub, { color: tc.textSecondary }]}>
                Confirmation sent to{" "}
                <Text style={{ fontWeight: "800", color: Colors.brand.blue }}>
                  {email || "your email"}
                </Text>
              </Text>

              {/* Ticket visual */}
              <View style={[rm.ticketVisual, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                {/* Ticket header */}
                <LinearGradient
                  colors={[Colors.brand.orange, "#CC5800"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={rm.ticketVisualHeader}
                >
                  <Text style={rm.ticketVisualEmoji}>{event.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={rm.ticketVisualLabel}>YOUR TICKET</Text>
                    <Text style={rm.ticketVisualName} numberOfLines={2}>{event.title}</Text>
                  </View>
                </LinearGradient>

                {/* Ticket detail rows */}
                <View style={rm.ticketDetailBlock}>
                  {[
                    { icon: "calendar-outline" as const, text: event.date, color: Colors.brand.orange },
                    { icon: "time-outline" as const, text: event.time, color: Colors.brand.blue },
                    { icon: "location-outline" as const, text: event.location, color: Colors.brand.blue },
                    { icon: "ticket-outline" as const, text: `${tickets} ticket${tickets > 1 ? "s" : ""} · ${totalPrice}`, color: isFree ? Colors.brand.green : Colors.brand.orange },
                  ].map((row, i) => (
                    <View key={i} style={rm.ticketDetailRow}>
                      <View style={[rm.ticketDetailIcon, { backgroundColor: row.color + "18" }]}>
                        <Ionicons name={row.icon} size={13} color={row.color} />
                      </View>
                      <Text style={[rm.ticketDetailText, { color: tc.textPrimary }]}>{row.text}</Text>
                    </View>
                  ))}
                </View>

                {/* Tear separator */}
                <View style={rm.ticketTear}>
                  <View style={rm.ticketTearCircleL} />
                  <View style={rm.ticketTearLine} />
                  <View style={rm.ticketTearCircleR} />
                </View>

                {/* QR code */}
                <View style={[rm.ticketQRStub, { backgroundColor: "#FFFFFF" }]}>
                  {ticket?.qrCode ? (
                    <View style={{ backgroundColor: "#FFFFFF", padding: rs(12), borderWidth: 1, borderColor: "#111827", borderRadius: rs(8) }}>
                      {/* SPRINT-42: arm's-length high-contrast server QR */}
                      <Image
                        source={{ uri: ticket.qrCode.startsWith("http") || ticket.qrCode.startsWith("data:") ? ticket.qrCode : `data:image/png;base64,${ticket.qrCode}` }}
                        style={{ width: rs(220), height: rs(220) }}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <Ionicons name="qr-code-outline" size={60} color={Colors.text.tertiary} />
                  )}
                  <Text style={rm.ticketQRHint}>Scan QR at event entry</Text>
                  {ticket?.id ? (
                    <Text style={{ fontSize: rs(10), color: Colors.text.tertiary, fontWeight: "600", letterSpacing: 1 }}>
                      #{ticket.id.slice(-8).toUpperCase()}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable style={rm.doneBtn} onPress={handleClose}>
                <LinearGradient
                  colors={[Colors.brand.green, "#16A34A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={rm.doneBtnGrad}
                >
                  <Text style={rm.doneBtnText}>Done</Text>
                </LinearGradient>
              </Pressable>
              <View style={{ height: rs(28) }} />
            </ScrollView>
          ) : (
            /* ── Form state ── */
            <>
              {/* Event image header */}
              <View style={rm.imgHeader}>
                <FadeImage uri={event.image} style={StyleSheet.absoluteFill} cachePolicy="disk" transition={300} />
                <LinearGradient
                  colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.80)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={rm.registerPill}>
                  <Ionicons name="ticket-outline" size={10} color="#FFF" />
                  <Text style={rm.registerPillText}>REGISTER</Text>
                </View>
                <Pressable onPress={handleClose} style={rm.imgCloseBtn}>
                  <Ionicons name="close" size={16} color="#FFF" />
                </Pressable>
                <View style={rm.imgHeaderBody}>
                  <Text style={rm.imgHeaderEmoji}>{event.emoji}</Text>
                  <Text style={rm.imgHeaderTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={rm.imgHeaderMeta}>
                    <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.8)" />
                    <Text style={rm.imgHeaderMetaText}>{event.date} · {event.time}</Text>
                  </View>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={rm.formScroll}>
                {/* Price badge */}
                <View style={[rm.priceBadge, {
                  backgroundColor: isFree ? Colors.brand.greenLight : Colors.brand.orangeLight,
                  borderColor: isFree ? Colors.brand.green + "35" : Colors.brand.orange + "35",
                }]}>
                  <Ionicons name="ticket-outline" size={14} color={isFree ? Colors.brand.green : Colors.brand.orange} />
                  <Text style={[rm.priceBadgeText, { color: isFree ? Colors.brand.green : Colors.brand.orange }]}>
                    {isFree ? "Free Entry" : `${event.price} per ticket`}
                  </Text>
                </View>

                {/* Fields card */}
                <View style={[rm.formCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <View style={rm.fieldGroup}>
                    <Text style={[rm.fieldLabel, { color: tc.textTertiary }]}>Full Name</Text>
                    <View style={[rm.inputWrap, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                      <Ionicons name="person-outline" size={16} color={Colors.text.tertiary} style={rm.inputIcon} />
                      <TextInput
                        style={[rm.input, { color: tc.textPrimary }]}
                        placeholder="Your full name"
                        placeholderTextColor={Colors.text.tertiary}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={rm.formDivider} />
                  <View style={rm.fieldGroup}>
                    <Text style={[rm.fieldLabel, { color: tc.textTertiary }]}>Email Address</Text>
                    <View style={[rm.inputWrap, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                      <Ionicons name="mail-outline" size={16} color={Colors.text.tertiary} style={rm.inputIcon} />
                      <TextInput
                        style={[rm.input, { color: tc.textPrimary }]}
                        placeholder="your@email.com"
                        placeholderTextColor={Colors.text.tertiary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </View>

                {/* Ticket count card */}
                <View style={[rm.ticketStepCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Text style={[rm.ticketStepTitle, { color: tc.textTertiary }]}>Number of Tickets</Text>
                  <View style={rm.ticketStepRow}>
                    <Pressable
                      style={[rm.ticketBtn, tickets <= 1 && rm.ticketBtnDisabled]}
                      onPress={() => setTickets((t) => Math.max(1, t - 1))}
                    >
                      <Ionicons name="remove" size={20} color={tickets <= 1 ? Colors.text.tertiary : Colors.brand.orange} />
                    </Pressable>
                    <View style={[rm.ticketCount, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
                      <Text style={[rm.ticketCountNum, { color: tc.textPrimary }]}>{tickets}</Text>
                      <Text style={[rm.ticketCountLbl, { color: tc.textTertiary }]}>ticket{tickets > 1 ? "s" : ""}</Text>
                    </View>
                    <Pressable
                      style={[rm.ticketBtn, tickets >= 10 && rm.ticketBtnDisabled]}
                      onPress={() => setTickets((t) => Math.min(10, t + 1))}
                    >
                      <Ionicons name="add" size={20} color={tickets >= 10 ? Colors.text.tertiary : Colors.brand.orange} />
                    </Pressable>
                    <View style={rm.totalBox}>
                      <Text style={rm.totalLabel}>Total</Text>
                      <Text style={[rm.totalValue, { color: isFree ? Colors.brand.green : Colors.brand.orange }]}>
                        {totalPrice}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Hosted by */}
                <View style={[rm.hostedRow, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <LinearGradient
                    colors={[Colors.brand.blue, Colors.brand.green]}
                    style={rm.hostedAvatar}
                  >
                    <Ionicons name="person" size={17} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[rm.hostedLabel, { color: tc.textTertiary }]}>Hosted by</Text>
                    <Text style={[rm.hostedName, { color: tc.textPrimary }]}>{event.host}</Text>
                  </View>
                  <View style={rm.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={11} color={Colors.brand.green} />
                    <Text style={rm.verifiedText}>Verified</Text>
                  </View>
                </View>

                <View style={{ height: rs(8) }} />
              </ScrollView>

              {/* CTA */}
              <View style={[rm.ctaWrap, { backgroundColor: tc.headerBg, borderTopColor: tc.borderLight }]}>
                <Pressable
                  style={[rm.confirmBtn, (!name.trim() || !email.trim() || submitting) && rm.confirmBtnDisabled]}
                  onPress={() => void handleConfirm()}
                  disabled={!name.trim() || !email.trim() || submitting}
                >
                  <LinearGradient
                    colors={(!name.trim() || !email.trim() || submitting) ? ["#D1D5DB", "#D1D5DB"] : [Colors.brand.orange, "#E56800"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={rm.confirmBtnGrad}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="ticket-outline" size={18} color="#FFF" />
                        <Text style={rm.confirmBtnText}>
                          Confirm{!isFree ? ` · ${totalPrice}` : " Registration"}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Event detail modal ────────────────────────────────────────────────────────
function EventDetailModal({
  event,
  visible,
  onClose,
  isInterested,
  onToggle,
  isSaved,
  onSaveToggle,
}: {
  event: EventItem | null;
  visible: boolean;
  onClose: () => void;
  isInterested: boolean;
  onToggle: () => void;
  isSaved: boolean;
  onSaveToggle: () => void;
}) {
  const [showRegModal, setShowRegModal] = useState(false);
  const [detailApi, setDetailApi] = useState<ApiEvent | null>(null); // SPRINT-42: load getEvent for reviews
  const { tc } = useTheme();
  const { requireAuth } = useRequireAuth();
  const isPast = event?.category === "past";

  useEffect(() => {
    // SPRINT-42: share EventReviewsSection with feed by loading full detail
    if (!visible || !event?.id) {
      setDetailApi(null);
      return;
    }
    let cancelled = false;
    void getEvent(event.id)
      .then((api) => {
        if (!cancelled) setDetailApi(api);
      })
      .catch(() => {
        if (!cancelled) setDetailApi(null);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, event?.id]);

  if (!event) return null;
  const isFree = event.price === "Free";
  const avg = detailApi?.averageRating ?? event.averageRating;
  const total = detailApi?.totalReviews ?? event.totalReviews;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[edm.root, { backgroundColor: tc.pageBg }]}>
        <View style={edm.heroWrap}>
          <FadeImage uri={event.image} style={edm.heroImg} cachePolicy="disk" transition={300} />
          <LinearGradient
            colors={["rgba(0,0,0,0.52)", "transparent", "rgba(0,0,0,0.82)"]}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity style={edm.backBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={edm.saveBtn} onPress={onSaveToggle} activeOpacity={0.8}>
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={isSaved ? Colors.brand.orange : "#FFF"}
            />
          </TouchableOpacity>
          <View style={edm.heroBadgeRow}>
            <View style={[edm.badge, { backgroundColor: isFree ? "#16A34A" : Colors.brand.orange }]}>
              <Ionicons name="ticket-outline" size={11} color="#FFF" />
              <Text style={edm.badgeText}>{event.price}</Text>
            </View>
            {isPast && (
              <View style={[edm.badge, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                <Text style={edm.badgeText}>Past Event</Text>
              </View>
            )}
          </View>
          <View style={edm.heroBottom}>
            <Text style={edm.heroEmoji}>{event.emoji}</Text>
            <Text style={edm.heroTitle}>{event.title}</Text>
            <RatingSummary // SPRINT-42: detail hero aggregate
              averageRating={avg}
              totalReviews={total}
              size="sm"
              textColor="#FFF"
              mutedColor="rgba(255,255,255,0.75)"
              style={{ marginBottom: rs(6) }}
            />
            <View style={edm.heroMeta}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={edm.heroMetaText}>{event.date} · {event.time}</Text>
              <View style={edm.heroDot} />
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={edm.heroMetaText}>{event.location}</Text>
            </View>
          </View>
        </View>

        <ScrollView style={[edm.scroll, { backgroundColor: tc.pageBg }]} contentContainerStyle={edm.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[edm.statsRow, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <View style={edm.statItem}>
              <Ionicons name="people" size={20} color={Colors.brand.blue} />
              <Text style={[edm.statNum, { color: tc.textPrimary }]}>{event.attendees + (isInterested ? 1 : 0)}</Text>
              <Text style={[edm.statLbl, { color: tc.textTertiary }]}>Going</Text>
            </View>
            <View style={edm.statDiv} />
            <View style={edm.statItem}>
              <Ionicons name="calendar-outline" size={20} color={Colors.brand.orange} />
              <Text style={[edm.statNum, { color: tc.textPrimary }]}>{event.date.split(",")[0]}</Text>
              <Text style={[edm.statLbl, { color: tc.textTertiary }]}>Date</Text>
            </View>
            <View style={edm.statDiv} />
            <View style={edm.statItem}>
              <Ionicons
                name="ticket-outline"
                size={20}
                color={isFree ? Colors.brand.green : Colors.brand.orange}
              />
              <Text style={[edm.statNum, { color: isFree ? Colors.brand.green : Colors.brand.orange }]}>
                {event.price}
              </Text>
              <Text style={[edm.statLbl, { color: tc.textTertiary }]}>Entry</Text>
            </View>
          </View>

          <View style={edm.tagRow}>
            {event.tags.map((tag) => (
              <View key={tag} style={[edm.tag, { backgroundColor: tc.sectionBg }]}>
                <Text style={[edm.tagText, { color: tc.textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={edm.section}>
            <Text style={[edm.sectionTitle, { color: tc.textPrimary }]}>About this Event</Text>
            <LinkifiedText text={event.desc} style={[edm.description, { color: tc.textSecondary }]} />
          </View>

          <View style={edm.section}>
            <Text style={[edm.sectionTitle, { color: tc.textPrimary }]}>Event Details</Text>
            <View style={[edm.detailGrid, { borderColor: tc.borderLight }]}>
              {[
                { icon: "calendar-outline" as const, label: "Date", value: event.date },
                { icon: "time-outline" as const, label: "Time", value: event.time },
                { icon: "location-outline" as const, label: "Venue", value: event.location },
                { icon: "person-outline" as const, label: "Hosted by", value: event.host },
                { icon: "ticket-outline" as const, label: "Admission", value: event.price },
                {
                  icon: "people-outline" as const,
                  label: "Attending",
                  value: `${event.attendees + (isInterested ? 1 : 0)} people`,
                },
              ].map((d, i, arr) => (
                <View
                  key={d.label}
                  style={[edm.detailRow, { backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={edm.detailIconBox}>
                    <Ionicons name={d.icon} size={16} color={Colors.brand.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[edm.detailLabel, { color: tc.textTertiary }]}>{d.label}</Text>
                    <Text style={[edm.detailValue, { color: tc.textPrimary }]}>{d.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* SPRINT-42: shared reviews section; always available (eligibility gates write) */}
          <View style={edm.section}>
            <EventReviewsSection
              eventId={event.id}
              detailEvent={
                detailApi
                  ? {
                      ...detailApi,
                      registeredByMe: isInterested || detailApi.registeredByMe,
                      isAttending: isInterested || detailApi.isAttending,
                    }
                  : null
              }
              onDetailRefreshed={(fresh) => setDetailApi(fresh)}
            />
          </View>

          <View style={{ height: rs(120) }} />
        </ScrollView>

        <View style={[edm.cta, { backgroundColor: tc.headerBg, borderTopColor: tc.borderLight }]}>
          {!isPast ? (
            <>
              <Pressable
                style={[edm.ctaInterested, isInterested && edm.ctaInterestedActive]}
                onPress={onToggle}
              >
                <Ionicons
                  name={isInterested ? "checkmark-circle" : "star-outline"}
                  size={18}
                  color={isInterested ? Colors.brand.green : Colors.brand.orange}
                />
                <Text style={[edm.ctaInterestedText, isInterested && { color: Colors.brand.green }]}>
                  {isInterested ? "Going" : "Interested"}
                </Text>
              </Pressable>
              <Pressable
                style={edm.ctaChat}
                onPress={() => {
                  if (!requireAuth(undefined, "Sign in to message the host.")) return;
                  router.push({
                    pathname: "/chat",
                    params: { eventTitle: event.title, recipientName: event.host, recipientType: "event" },
                  } as any);
                }}
              >
                <Ionicons name="chatbubbles-outline" size={19} color={Colors.brand.orange} />
              </Pressable>
              <Pressable
                style={{ flex: 1, borderRadius: rs(14), overflow: "hidden" }}
                onPress={() => { if (requireAuth(undefined, "Sign in to register for this event.")) setShowRegModal(true); }}
              >
                <LinearGradient
                  colors={[Colors.brand.orange, "#E56800"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={edm.ctaRSVP}
                >
                  <Ionicons name="ticket-outline" size={17} color="#FFF" />
                  <Text style={edm.ctaRSVPText}>Register / RSVP</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[edm.ctaChat, { flex: 1, backgroundColor: Colors.brand.blueLight, borderColor: "#BFDBFE" }]}
              onPress={() => {
                if (!requireAuth(undefined, "Sign in to message the host.")) return;
                router.push({
                  pathname: "/chat",
                  params: { eventTitle: event.title, recipientName: event.host, recipientType: "event" },
                } as any);
              }}
            >
              <Ionicons name="chatbubbles-outline" size={19} color={Colors.brand.blue} />
              <Text style={{ marginLeft: 8, fontWeight: "800", color: Colors.brand.blue }}>Message Host</Text>
            </Pressable>
          )}
        </View>
      </View>

      <RegistrationModal
        event={event}
        visible={showRegModal}
        onClose={() => setShowRegModal(false)}
      />
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const { isDark, tc } = useTheme();
  const user = useAuthStore((st) => st.user);
  const { requireAuth } = useRequireAuth();
  const guestCity = useGuestLocationStore((s) => s.city);
  const [tab, setTab] = useState<typeof TABS[number]>("Upcoming");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getEvents({ city: user?.city?.trim() || guestCity || undefined, pageSize: 50 });
      setEvents(res.data.map(toUiEvent));
      setSavedIds(new Set(res.data.filter((e) => e.savedByMe).map((e) => e.id)));
      setInterestedIds(new Set(res.data.filter((e) => e.isAttending || e.registeredByMe).map((e) => e.id)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, [user?.city, guestCity]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

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

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]}>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} style={[s.backBtn, { backgroundColor: tc.sectionBg }]} hitSlop={{ top: rs(10), bottom: rs(10), left: rs(10), right: rs(10) }}>
          <Ionicons name="chevron-back" size={20} color={tc.textPrimary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: tc.textPrimary }]}>Events</Text>
        <View style={{ width: s.backBtn.width }} />
      </View>

      {/* ── Hero banner ── */}
      <LinearGradient
        colors={[Colors.brand.orange, "#FF9A3C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.hero}
      >
        <View>
          <Text style={s.heroTitle}>Discover Events 🎊</Text>
          <Text style={s.heroDesc}>Find exciting events happening in your city</Text>
        </View>
        <View style={s.heroStat}>
          <Text style={s.heroStatNum}>{events.filter((e) => e.category === "upcoming").length}</Text>
          <Text style={s.heroStatLbl}>Upcoming</Text>
        </View>
      </LinearGradient>

      {/* ── Tabs ── */}
      <View style={[s.tabRow, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, { backgroundColor: tc.sectionBg }, active && s.tabActive]}>
              <Text style={[s.tabText, { color: tc.textSecondary }, active && s.tabTextActive]}>{t}</Text>
              {t === "Saved" && savedIds.size > 0 && (
                <View style={[s.tabBadge, active && { backgroundColor: "rgba(255,255,255,0.35)" }]}>
                  <Text style={s.tabBadgeText}>{savedIds.size}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(8), paddingHorizontal: rs(16), paddingVertical: rs(10), backgroundColor: tc.sectionBg }}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={{ flex: 1, fontSize: rs(13), fontWeight: "600", color: tc.textSecondary }}>{error}</Text>
        </View>
      ) : null}

      {/* ── Event list ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: rs(10) }}>
          <ActivityIndicator size="large" color={Colors.brand.orange} />
        </View>
      ) : (
      <ScrollView
        style={[s.scroll, { backgroundColor: tc.pageBg }]}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((event) => {
          const saved = savedIds.has(event.id);
          const interested = interestedIds.has(event.id);
          return (
            <Pressable key={event.id} style={[s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]} onPress={() => setSelectedEvent(event)}>
              {/* Card image */}
              <FadeImage uri={event.image} style={s.cardImg} />

              {/* Price overlay */}
              <View style={[s.priceOverlay, { backgroundColor: event.price === "Free" ? "#16A34A" : Colors.brand.orange }]}>
                <Text style={s.priceOverlayText}>{event.price}</Text>
              </View>

              {/* Save button overlay */}
              <Pressable
                style={s.saveOverlay}
                onPress={(e) => { e.stopPropagation(); toggleSave(event.id); }}
                hitSlop={{ top: rs(8), bottom: rs(8), left: rs(8), right: rs(8) }}
              >
                <Ionicons
                  name={saved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={saved ? Colors.brand.orange : "#FFF"}
                />
              </Pressable>

              <View style={s.cardBody}>
                {/* Date + title */}
                <View style={s.cardHeader}>
                  <View style={s.dateBadge}>
                    <Text style={s.dateBadgeDay}>{event.date.split(",")[0]}</Text>
                    <Text style={s.dateBadgeDate}>{event.date.split(", ")[1]?.split(" ").slice(0, 2).join(" ")}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: tc.textPrimary }]} numberOfLines={2}>
                      {event.emoji} {event.title}
                    </Text>
                    <RatingSummary // SPRINT-42: browse card aggregate
                      averageRating={event.averageRating}
                      totalReviews={event.totalReviews}
                      size="sm"
                      textColor={tc.textPrimary}
                      mutedColor={tc.textTertiary}
                      style={{ marginTop: rs(4) }}
                    />
                    <View style={s.cardMetaRow}>
                      <Ionicons name="time-outline" size={11} color={tc.textTertiary} />
                      <Text style={[s.cardMetaText, { color: tc.textTertiary }]}>{event.time}</Text>
                    </View>
                    <View style={s.cardMetaRow}>
                      <Ionicons name="location-outline" size={11} color={tc.textTertiary} />
                      <Text style={[s.cardMetaText, { color: tc.textTertiary }]}>{event.location}</Text>
                    </View>
                  </View>
                </View>

                {/* Tags */}
                <View style={s.tagRow}>
                  {event.tags.map((tag) => (
                    <View key={tag} style={[s.tag, { backgroundColor: tc.sectionBg }]}>
                      <Text style={[s.tagText, { color: tc.textSecondary }]}>{tag}</Text>
                    </View>
                  ))}
                  <View style={s.attendeeChip}>
                    <Ionicons name="people-outline" size={11} color={Colors.brand.blue} />
                    <Text style={s.attendeeText}>{event.attendees + (interested ? 1 : 0)} going</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={s.actions}>
                  <Pressable
                    style={[s.interestedBtn, interested && s.interestedBtnActive]}
                    onPress={(e) => { e.stopPropagation(); toggleInterested(event.id); }}
                  >
                    <Ionicons
                      name={interested ? "checkmark-circle" : "star-outline"}
                      size={15}
                      color={interested ? Colors.brand.green : Colors.brand.orange}
                    />
                    <Text style={[s.interestedBtnText, interested && { color: Colors.brand.green }]}>
                      {interested ? "Going" : "Interested"}
                    </Text>
                  </Pressable>

                  {event.category !== "past" && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                    >
                      <LinearGradient
                        colors={[Colors.brand.orange, "#E56800"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={s.rsvpBtn}
                      >
                        <Text style={s.rsvpBtnText}>RSVP</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}

        {filtered.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: rs(52) }}>🎊</Text>
            <Text style={[s.emptyTitle, { color: tc.textPrimary }]}>No events found</Text>
            <Text style={[s.emptyDesc, { color: tc.textSecondary }]}>
              {tab === "Saved"
                ? "Save events to find them here later"
                : "Check back soon for new events!"}
            </Text>
          </View>
        )}

        <View style={{ height: rs(40) }} />
      </ScrollView>
      )}

      {/* ── Event detail modal ── */}
      <EventDetailModal
        event={selectedEvent}
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isInterested={selectedEvent ? interestedIds.has(selectedEvent.id) : false}
        onToggle={() => selectedEvent && toggleInterested(selectedEvent.id)}
        isSaved={selectedEvent ? savedIds.has(selectedEvent.id) : false}
        onSaveToggle={() => selectedEvent && toggleSave(selectedEvent.id)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: rs(16), gap: rs(14) },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: rs(38), height: rs(38), borderRadius: rs(19),
    backgroundColor: "#F3F4F6",
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
  heroTitle: { fontSize: rs(19), fontWeight: "900", color: "#FFF", letterSpacing: -0.3 },
  heroDesc: { fontSize: rs(12), color: "rgba(255,255,255,0.88)", marginTop: rs(3), fontWeight: "500" },
  heroStat: { alignItems: "center" },
  heroStatNum: { fontSize: rs(28), fontWeight: "900", color: "#FFF" },
  heroStatLbl: { fontSize: rs(9), fontWeight: "700", color: "rgba(255,255,255,0.8)", letterSpacing: 1.2, textTransform: "uppercase" },

  // Tabs
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    gap: rs(8),
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  tab: {
    flex: 1, paddingVertical: rs(9), borderRadius: rs(12),
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: rs(5),
  },
  tabActive: { backgroundColor: Colors.brand.orange },
  tabText: { fontSize: rs(13), fontWeight: "700", color: Colors.text.secondary },
  tabTextActive: { color: "#FFF" },
  tabBadge: {
    minWidth: 18, height: rs(18), borderRadius: rs(9),
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: rs(4),
  },
  tabBadgeText: { fontSize: rs(10), fontWeight: "900", color: "#FFF" },

  // Card
  card: {
    backgroundColor: "#FFF",
    borderRadius: rs(18),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0F2F5",
    shadowColor: "#0A2540",
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
  priceOverlayText: { fontSize: rs(11), fontWeight: "800", color: "#FFF" },
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
  tag: { backgroundColor: "#F3F4F6", paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(8) },
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
  rsvpBtnText: { fontSize: rs(13), fontWeight: "800", color: "#FFF" },

  emptyState: { alignItems: "center", marginTop: rs(80), gap: rs(10) },
  emptyTitle: { fontSize: rs(17), fontWeight: "800", color: Colors.text.primary },
  emptyDesc: { fontSize: rs(13), color: Colors.text.secondary, textAlign: "center", paddingHorizontal: rs(30) },
});

// ── Modal styles ──────────────────────────────────────────────────────────────
const edm = createThemedStyles({
  root: { flex: 1, backgroundColor: "#F9FAFB" },

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
  badgeText: { fontSize: rs(11), fontWeight: "800", color: "#FFF" },
  heroBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: rs(18), paddingBottom: rs(20),
  },
  heroEmoji: { fontSize: rs(26), marginBottom: rs(4) },
  heroTitle: { fontSize: rs(22), fontWeight: "900", color: "#FFF", letterSpacing: -0.5, lineHeight: rs(28) },
  heroMeta: {
    flexDirection: "row", alignItems: "center", gap: rs(5), marginTop: rs(8), flexWrap: "wrap",
  },
  heroMetaText: { fontSize: rs(12), color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  heroDot: { width: rs(3), height: rs(3), borderRadius: rs(1.5), backgroundColor: "rgba(255,255,255,0.5)" },

  scroll: { flex: 1 },
  scrollContent: { padding: rs(16) },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: rs(20),
    padding: rs(20),
    marginBottom: rs(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.06,
    shadowRadius: rs(12),
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  statItem: { flex: 1, alignItems: "center", gap: rs(4) },
  statNum: { fontSize: rs(16), fontWeight: "900", color: Colors.text.primary },
  statLbl: { fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary, letterSpacing: 0.5 },
  statDiv: { width: rs(1), height: rs(48), backgroundColor: "#F0F2F5" },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(6), marginBottom: rs(16) },
  tag: { backgroundColor: "#F0F2F5", paddingHorizontal: rs(12), paddingVertical: rs(5), borderRadius: rs(10) },
  tagText: { fontSize: rs(12), fontWeight: "600", color: Colors.text.secondary },

  section: { marginBottom: rs(20) },
  sectionTitle: {
    fontSize: rs(15), fontWeight: "800", color: Colors.text.primary,
    marginBottom: rs(10), letterSpacing: -0.2,
  },
  description: { fontSize: rs(14), color: Colors.text.secondary, lineHeight: rs(22) },

  detailGrid: {
    borderRadius: rs(16), overflow: "hidden",
    borderWidth: 1, borderColor: "#F0F2F5",
  },
  detailRow: {
    flexDirection: "row", alignItems: "center", gap: rs(12),
    paddingHorizontal: rs(14), paddingVertical: rs(12),
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#F8F9FA",
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
    backgroundColor: "#FFF",
    borderTopWidth: 1, borderTopColor: "#F0F2F5",
    shadowColor: "#000",
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
  ctaRSVPText: { fontSize: rs(14), fontWeight: "900", color: "#FFF", letterSpacing: 0.3 },
});

// ── Registration modal styles ─────────────────────────────────────────────────
const rm = createThemedStyles({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: rs(28),
    borderTopRightRadius: rs(28),
    maxHeight: "92%",
    overflow: "hidden",
  },
  handle: {
    width: rs(40), height: rs(4), borderRadius: rs(2),
    backgroundColor: "#D1D5DB",
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
  registerPillText: { fontSize: rs(9), fontWeight: "800", color: "#FFF", letterSpacing: 1, textTransform: "uppercase" },
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
  imgHeaderTitle: { fontSize: rs(18), fontWeight: "900", color: "#FFF", lineHeight: rs(23) },
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
    backgroundColor: "#FFF",
    borderRadius: rs(18), borderWidth: 1, borderColor: "#F0F2F5",
    overflow: "hidden", marginBottom: rs(10),
    shadowColor: "#000", shadowOffset: { width: 0, height: rs(1) },
    shadowOpacity: 0.04, shadowRadius: rs(6), elevation: 1,
  },
  formDivider: { height: rs(1), backgroundColor: "#F3F4F6", marginHorizontal: rs(14) },
  fieldGroup: { paddingHorizontal: rs(14), paddingVertical: rs(12) },
  fieldLabel: {
    fontSize: rs(10), fontWeight: "700", color: Colors.text.tertiary,
    letterSpacing: 0.6, textTransform: "uppercase", marginBottom: rs(8),
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: rs(12), borderWidth: 1.5, borderColor: "#E8EAED",
    paddingHorizontal: rs(12), paddingVertical: rs(10), gap: rs(10),
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: rs(14), color: Colors.text.primary, fontWeight: "500" },

  // ── Ticket step card ──
  ticketStepCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(18), borderWidth: 1, borderColor: "#F0F2F5",
    padding: rs(14), marginBottom: rs(10),
    shadowColor: "#000", shadowOffset: { width: 0, height: rs(1) },
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
  ticketBtnDisabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  ticketCount: {
    minWidth: 58, alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: rs(12), borderWidth: 1.5, borderColor: "#E5E7EB",
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
    backgroundColor: "#FFF",
    borderRadius: rs(16), padding: rs(12),
    borderWidth: 1, borderColor: "#F0F2F5",
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
    backgroundColor: "#FFF",
    borderTopWidth: 1, borderTopColor: "#F0F2F5",
  },
  confirmBtn: { borderRadius: rs(16), overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.55 },
  confirmBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(8), paddingVertical: rs(16),
  },
  confirmBtnText: { fontSize: rs(15), fontWeight: "900", color: "#FFF", letterSpacing: 0.2 },

  // ── Success ──
  successWrap: { alignItems: "center", paddingHorizontal: rs(22), paddingTop: rs(22) },
  successCircle: {
    width: rs(88), height: rs(88), borderRadius: rs(44),
    alignItems: "center", justifyContent: "center",
    marginBottom: rs(16),
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: rs(8) },
    shadowOpacity: 0.35, shadowRadius: rs(18), elevation: 10,
  },
  successTitle: { fontSize: rs(22), fontWeight: "900", color: Colors.text.primary, marginBottom: rs(8), letterSpacing: -0.3 },
  successSub: { fontSize: rs(13), color: Colors.text.secondary, textAlign: "center", lineHeight: rs(20), marginBottom: rs(20) },

  // ── Ticket visual ──
  ticketVisual: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: rs(20), overflow: "hidden",
    marginBottom: rs(20),
    shadowColor: "#000", shadowOffset: { width: 0, height: rs(6) },
    shadowOpacity: 0.12, shadowRadius: rs(18), elevation: 6,
    borderWidth: 1, borderColor: "#F0F2F5",
  },
  ticketVisualHeader: {
    flexDirection: "row", alignItems: "center", gap: rs(12), padding: rs(16),
  },
  ticketVisualEmoji: { fontSize: rs(30) },
  ticketVisualLabel: {
    fontSize: rs(9), fontWeight: "800", color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2, textTransform: "uppercase",
  },
  ticketVisualName: { fontSize: rs(16), fontWeight: "900", color: "#FFF", lineHeight: rs(22), marginTop: rs(2) },
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
    backgroundColor: "#F9FAFB",
    marginLeft: rs(-10),
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  ticketTearLine: {
    flex: 1, height: rs(1),
    backgroundColor: "#E5E7EB",
  },
  ticketTearCircleR: {
    width: rs(20), height: rs(20), borderRadius: rs(10),
    backgroundColor: "#F9FAFB",
    marginRight: rs(-10),
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  ticketQRStub: { alignItems: "center", paddingVertical: rs(18), gap: rs(6) },
  ticketQRHint: { fontSize: rs(12), color: Colors.text.tertiary, fontWeight: "600" },

  doneBtn: { width: "100%", borderRadius: rs(16), overflow: "hidden" },
  doneBtnGrad: { alignItems: "center", justifyContent: "center", paddingVertical: rs(16) },
  doneBtnText: { fontSize: rs(15), fontWeight: "900", color: "#FFF" },
});
