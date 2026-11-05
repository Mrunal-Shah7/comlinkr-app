import React, { useState, useEffect, useRef, useCallback } from "react"; // SPRINT-42:
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image"; // SPRINT-31:
import { FadeImage } from "../../../components/FadeImage"; // SPRINT-31:
import { LinearGradient } from "expo-linear-gradient";
import { createThemedStyles } from "../../../src/theme/themedStyles";
import { Ionicons } from "@expo/vector-icons";
import * as Brightness from "expo-brightness"; // SPRINT-42: raise screen brightness while QR is visible
import { Colors } from "../../../src/theme/colors";
import { useTheme } from "../../../src/theme/useTheme";
import { ApiError } from "../../../src/api/client";
import { getMyTicket, type EventTicket } from "../../../src/api/events.api";
import { appAlert } from '../../../src/shared/ui/Dialogs';

export default function EventRegistrationModal({
  visible,
  onClose,
  event,
  onRegistered,
}: {
  visible: boolean;
  onClose: () => void;
  event: any;
  onRegistered: (data: { name: string; email: string; phone: string; tickets: string }) => void | Promise<void>;
}) {
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [tickets, setTickets] = useState(1);
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [ticket, setTicket] = useState<EventTicket | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState(""); // SPRINT-42:
  const [registering, setRegistering] = useState(false); // SPRINT-42: await registration before ticket GET
  const priorBrightness = useRef<number | null>(null); // SPRINT-42: capture prior once per raise session
  const brightnessGenRef = useRef(0); // SPRINT-42: invalidate in-flight raise after cancel
  const { isDark, tc } = useTheme();

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

  // SPRINT-42: boost brightness while QR is on screen; restore on close/unmount
  useEffect(() => {
    if (!visible || !regSubmitted || !ticket?.qrCode) return; // SPRINT-42:
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
        /* brightness unavailable on some platforms */ // SPRINT-42:
      }
    })();
    return () => {
      cancelled = true; // SPRINT-42:
      restoreBrightness(); // SPRINT-42:
    };
  }, [visible, regSubmitted, ticket?.qrCode, restoreBrightness]);

  useEffect(() => {
    // SPRINT-42: restore when modal hides without going through resetForm
    if (!visible) restoreBrightness(); // SPRINT-42:
  }, [visible, restoreBrightness]);

  if (!event) return null;

  const isFree = event.price === "Free";
  const priceNum = isFree ? 0 : parseFloat((event.price ?? "0").replace("$", "")) || 0;
  const totalPrice = isFree ? "Free" : `$${(priceNum * tickets).toFixed(0)}`;

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const validatePhone = (v: string) => {
    if (!v.trim()) return true; // optional
    return /^\+?[\d\s\-().]{7,20}$/.test(v.trim());
  };

  const handleRegister = async () => {
    // SPRINT-42: validate, await registration, then fetch ticket (fixes race)
    let valid = true;
    if (!validateEmail(regEmail)) {
      setEmailError("Enter a valid email address");
      valid = false;
    } else {
      setEmailError("");
    }
    if (!validatePhone(regPhone)) {
      setPhoneError("Enter a valid phone number (e.g. +1 555 123 4567)");
      valid = false;
    } else {
      setPhoneError("");
    }
    if (!regName.trim() || !valid) return;
    setRegistering(true);
    setTicketError("");
    try {
      await onRegistered({ name: regName, email: regEmail, phone: regPhone, tickets: String(tickets) });
      setRegSubmitted(true);
      setTicketLoading(true);
      try {
        const t = await getMyTicket(event.id);
        setTicket(t);
      } catch (err) {
        setTicket(null);
        setTicketError(err instanceof ApiError ? err.message : "Could not load your ticket QR.");
      } finally {
        setTicketLoading(false);
      }
    } catch (err) {
      // SPRINT-42: do not swallow registration errors
      appAlert(
        "Registration failed",
        err instanceof ApiError ? err.message : "Could not complete registration. Try again.",
      );
    } finally {
      setRegistering(false);
    }
  };

  const resetForm = () => {
    restoreBrightness(); // SPRINT-42: reliable restore on close
    setRegName("");
    setRegEmail("");
    setRegPhone("");
    setTickets(1);
    setRegSubmitted(false);
    setTicket(null);
    setTicketLoading(false);
    setTicketError("");
    setRegistering(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={resetForm}>
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={resetForm} />
        <View style={[st.sheet, isDark && { backgroundColor: tc.sheetBg }]}>
          <View style={[st.handle, isDark && { backgroundColor: tc.borderMedium }]} />

          {regSubmitted ? (
            /* ── Success ── */
            <ScrollView
              contentContainerStyle={st.successWrap}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <LinearGradient colors={["#30855B", "#256B49"]} style={st.successCircle}>
                <Ionicons name="checkmark" size={42} color="#FFF" />
              </LinearGradient>
              <Text style={[st.successTitle, { color: tc.textPrimary }]}>You're Registered! 🎉</Text>
              <Text style={[st.successSub, { color: tc.textSecondary }]}>
                Confirmation sent to{" "}
                <Text style={{ fontWeight: "800", color: Colors.brand.blue }}>{regEmail}</Text>
              </Text>

              {/* Ticket visual */}
              <View style={[st.ticketVisual, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={st.ticketHeader}
                >
                  <Text style={st.ticketEmoji}>{event.emoji ?? "🎟️"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.ticketLabel}>YOUR TICKET</Text>
                    <Text style={st.ticketName} numberOfLines={2}>{event.title}</Text>
                  </View>
                </LinearGradient>

                <View style={[st.ticketBody, isDark && { backgroundColor: tc.cardBg }]}>
                  {[
                    { icon: "calendar-outline" as const, text: event.date ?? "TBD", color: Colors.brand.orange },
                    { icon: "time-outline" as const, text: event.time ?? "TBD", color: Colors.brand.blue },
                    { icon: "location-outline" as const, text: event.location ?? "TBD", color: Colors.brand.blue },
                    { icon: "ticket-outline" as const, text: `${tickets} ticket${tickets > 1 ? "s" : ""} · ${totalPrice}`, color: isFree ? Colors.brand.green : Colors.brand.orange },
                  ].map((row, i) => (
                    <View key={i} style={st.ticketRow}>
                      <View style={[st.ticketRowIcon, { backgroundColor: row.color + "18" }]}>
                        <Ionicons name={row.icon} size={13} color={row.color} />
                      </View>
                      <Text style={[st.ticketRowText, { color: tc.textPrimary }]}>{row.text}</Text>
                    </View>
                  ))}
                </View>

                {/* Tear line */}
                <View style={[st.tearRow, isDark && { backgroundColor: tc.cardBg }]}>
                  <View style={[st.tearCircleL, isDark && { backgroundColor: tc.sheetBg, borderColor: tc.borderLight }]} />
                  <View style={[st.tearLine, isDark && { backgroundColor: tc.borderLight }]} />
                  <View style={[st.tearCircleR, isDark && { backgroundColor: tc.sheetBg, borderColor: tc.borderLight }]} />
                </View>

                <View style={[st.qrStub, isDark && { backgroundColor: "#FFFFFF" }]}>
                  {ticketLoading ? (
                    <ActivityIndicator size="large" color={Colors.brand.blue} />
                  ) : ticket?.qrCode ? (
                    <>
                      {/* SPRINT-42: high-contrast arm's-length QR from server base64; synthetic id display-only */}
                      <View style={st.qrContrast}>
                        <Image
                          source={{ uri: ticket.qrCode.startsWith("data:") ? ticket.qrCode : `data:image/png;base64,${ticket.qrCode}` }}
                          style={{ width: 220, height: 220 }}
                          contentFit="contain"
                          cachePolicy="memory"
                        />
                      </View>
                      <Text style={[st.qrHint, { color: tc.textTertiary }]}>Scan QR at event entry</Text>
                      <Text style={{ fontSize: 10, color: tc.textTertiary, fontWeight: "600", marginTop: 2, letterSpacing: 1 }}>
                        #{ticket.id.slice(-8).toUpperCase()}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="qr-code-outline" size={60} color={tc.textTertiary} />
                      <Text style={[st.qrHint, { color: tc.textTertiary }]}>
                        {ticketError || "Scan QR at event entry"}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <Pressable style={st.doneBtn} onPress={resetForm}>
                <LinearGradient
                  colors={["#1A6BAE", "#30855B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={st.doneBtnGrad}
                >
                  <Text style={st.doneBtnText}>Done</Text>
                </LinearGradient>
              </Pressable>
              <View style={{ height: 28 }} />
            </ScrollView>
          ) : (
            /* ── Form ── */
            <View style={{ flex: 1 }}>
              {/* Event image header */}
              <View style={st.imgHeader}>
                <FadeImage uri={event.image} style={StyleSheet.absoluteFill} cachePolicy="disk" transition={300} />
                <LinearGradient
                  colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.80)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={st.registerPill}>
                  <Ionicons name="ticket-outline" size={10} color="#FFF" />
                  <Text style={st.registerPillText}>REGISTER</Text>
                </View>
                <Pressable onPress={resetForm} style={st.imgCloseBtn}>
                  <Ionicons name="close" size={16} color="#FFF" />
                </Pressable>
                <View style={st.imgHeaderBody}>
                  <Text style={st.imgHeaderEmoji}>{event.emoji ?? "🎟️"}</Text>
                  <Text style={st.imgHeaderTitle} numberOfLines={2}>{event.title}</Text>
                  {(event.date || event.time) && (
                    <View style={st.imgHeaderMeta}>
                      <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.8)" />
                      <Text style={st.imgHeaderMetaText}>
                        {[event.date, event.time].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={st.formScroll}
                keyboardShouldPersistTaps="handled"
                bounces={true}
              >
                {/* Price badge */}
                <View style={[st.priceBadge, {
                  backgroundColor: isFree
                    ? (isDark ? tc.inputBg : Colors.brand.greenLight)
                    : (isDark ? tc.inputBg : Colors.brand.orangeLight),
                  borderColor: isFree ? Colors.brand.green + "35" : Colors.brand.orange + "35",
                }]}>
                  <Ionicons name="ticket-outline" size={14} color={isFree ? Colors.brand.green : Colors.brand.orange} />
                  <Text style={[st.priceBadgeText, { color: isFree ? Colors.brand.green : Colors.brand.orange }]}>
                    {isFree ? "Free Entry" : `${event.price} per ticket`}
                  </Text>
                </View>

                {/* Fields card */}
                <View style={[st.formCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <View style={st.fieldGroup}>
                    <Text style={[st.fieldLabel, { color: tc.textTertiary }]}>Full Name</Text>
                    <View style={[st.inputWrap, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                      <Ionicons name="person-outline" size={16} color={tc.textTertiary} />
                      <TextInput
                        style={[st.input, { color: tc.textPrimary }]}
                        placeholder="Your full name"
                        placeholderTextColor={tc.textTertiary}
                        value={regName}
                        onChangeText={setRegName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={[st.formDivider, isDark && { backgroundColor: tc.borderLight }]} />
                  <View style={st.fieldGroup}>
                    <Text style={[st.fieldLabel, { color: tc.textTertiary }]}>Email Address</Text>
                    <View style={[st.inputWrap, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, !!emailError && { borderColor: "#EF4444" }]}>
                      <Ionicons name="mail-outline" size={16} color={emailError ? "#EF4444" : tc.textTertiary} />
                      <TextInput
                        style={[st.input, { color: tc.textPrimary }]}
                        placeholder="your@email.com"
                        placeholderTextColor={tc.textTertiary}
                        value={regEmail}
                        onChangeText={(v) => { setRegEmail(v); if (emailError) setEmailError(""); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    {!!emailError && <Text style={st.fieldError}>{emailError}</Text>}
                  </View>
                  <View style={[st.formDivider, isDark && { backgroundColor: tc.borderLight }]} />
                  <View style={st.fieldGroup}>
                    <Text style={[st.fieldLabel, { color: tc.textTertiary }]}>Phone (optional)</Text>
                    <View style={[st.inputWrap, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, !!phoneError && { borderColor: "#EF4444" }]}>
                      <Ionicons name="call-outline" size={16} color={phoneError ? "#EF4444" : tc.textTertiary} />
                      <TextInput
                        style={[st.input, { color: tc.textPrimary }]}
                        placeholder="+1 (555) 123-4567"
                        placeholderTextColor={tc.textTertiary}
                        value={regPhone}
                        onChangeText={(v) => { setRegPhone(v); if (phoneError) setPhoneError(""); }}
                        keyboardType="phone-pad"
                      />
                    </View>
                    {!!phoneError && <Text style={st.fieldError}>{phoneError}</Text>}
                  </View>
                </View>

                {/* Ticket stepper */}
                <View style={[st.ticketStepCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                  <Text style={[st.ticketStepTitle, { color: tc.textTertiary }]}>Number of Tickets</Text>
                  <View style={st.ticketStepRow}>
                    <Pressable
                      style={[st.ticketBtn, tickets <= 1 && st.ticketBtnDisabled, isDark && tickets > 1 && { backgroundColor: tc.inputBg, borderColor: Colors.brand.orange + "40" }]}
                      onPress={() => setTickets((t) => Math.max(1, t - 1))}
                    >
                      <Ionicons name="remove" size={20} color={tickets <= 1 ? tc.textTertiary : Colors.brand.orange} />
                    </Pressable>
                    <View style={[st.ticketCount, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                      <Text style={[st.ticketCountNum, { color: tc.textPrimary }]}>{tickets}</Text>
                      <Text style={[st.ticketCountLbl, { color: tc.textTertiary }]}>ticket{tickets > 1 ? "s" : ""}</Text>
                    </View>
                    <Pressable
                      style={[st.ticketBtn, tickets >= 4 && st.ticketBtnDisabled, isDark && tickets < 4 && { backgroundColor: tc.inputBg, borderColor: Colors.brand.orange + "40" }]}
                      onPress={() => setTickets((t) => Math.min(4, t + 1))}
                      disabled={tickets >= 4}
                    >
                      <Ionicons name="add" size={20} color={tickets >= 4 ? tc.textTertiary : Colors.brand.orange} />
                    </Pressable>
                    {!isFree && (
                      <View style={[st.totalBox, isDark && { backgroundColor: tc.inputBg, borderColor: Colors.brand.orange + "40" }]}>
                        <Text style={st.totalLabel}>Total</Text>
                        <Text style={[st.totalValue, { color: Colors.brand.orange }]}>{totalPrice}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Hosted by */}
                {event.host && (
                  <View style={[st.hostedRow, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                    <LinearGradient
                      colors={[Colors.brand.blue, Colors.brand.green]}
                      style={st.hostedAvatar}
                    >
                      <Ionicons name="person" size={17} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.hostedLabel, { color: tc.textTertiary }]}>Hosted by</Text>
                      <Text style={[st.hostedName, { color: tc.textPrimary }]}>{event.host}</Text>
                    </View>
                    <View style={st.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={11} color={Colors.brand.green} />
                      <Text style={st.verifiedText}>Verified</Text>
                    </View>
                  </View>
                )}

                <View style={{ height: 8 }} />
              </ScrollView>

              {/* CTA */}
              <View style={[st.ctaWrap, isDark && { backgroundColor: tc.cardBg, borderTopColor: tc.borderLight }]}>
                <Pressable
                  style={[st.confirmBtn, (!regName.trim() || !validateEmail(regEmail) || registering) && st.confirmBtnDisabled]}
                  onPress={() => void handleRegister()}
                  disabled={!regName.trim() || !validateEmail(regEmail) || registering}
                >
                  <LinearGradient
                    colors={(!regName.trim() || !validateEmail(regEmail) || registering) ? ["rgba(26,107,174,0.45)", "rgba(48,133,91,0.45)"] : ["#1A6BAE", "#257A86", "#30855B"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={st.confirmBtnGrad}
                  >
                    {registering ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="ticket-outline" size={18} color="#FFF" />
                        <Text style={st.confirmBtnText}>
                          Confirm{!isFree ? ` · ${totalPrice}` : " Registration"}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = createThemedStyles({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
    flex: 1,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
  },

  // ── Image header ──
  imgHeader: { height: 168, position: "relative", overflow: "hidden" },
  registerPill: {
    position: "absolute", top: 12, left: 14,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.brand.orange,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  registerPillText: { fontSize: 9, fontWeight: "800", color: "#FFF", letterSpacing: 1, textTransform: "uppercase" },
  imgCloseBtn: {
    position: "absolute", top: 10, right: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center", justifyContent: "center",
  },
  imgHeaderBody: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 14,
  },
  imgHeaderEmoji: { fontSize: 22, marginBottom: 2 },
  imgHeaderTitle: { fontSize: 18, fontWeight: "900", color: "#FFF", lineHeight: 23 },
  imgHeaderMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  imgHeaderMetaText: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "500" },

  formScroll: { paddingHorizontal: 14, paddingTop: 14 },

  // ── Price badge ──
  priceBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, alignSelf: "flex-start", marginBottom: 12,
  },
  priceBadgeText: { fontSize: 13, fontWeight: "700" },

  // ── Form card ──
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 18, borderWidth: 1, borderColor: "#F0F2F5",
    overflow: "hidden", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  formDivider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 14 },
  fieldGroup: { paddingHorizontal: 14, paddingVertical: 12 },
  fieldLabel: {
    fontSize: 10, fontWeight: "700", color: Colors.text.tertiary,
    letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12, borderWidth: 1.5, borderColor: "#E8EAED",
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: Colors.text.primary, fontWeight: "500" },
  fieldError: { fontSize: 11, color: "#EF4444", fontWeight: "600", marginTop: 5, marginLeft: 2 },

  // ── Ticket stepper ──
  ticketStepCard: {
    backgroundColor: "#FFF",
    borderRadius: 18, borderWidth: 1, borderColor: "#F0F2F5",
    padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  ticketStepTitle: {
    fontSize: 10, fontWeight: "700", color: Colors.text.tertiary,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10,
  },
  ticketStepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ticketBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: Colors.brand.orangeLight,
    borderWidth: 1, borderColor: Colors.brand.orange + "30",
    alignItems: "center", justifyContent: "center",
  },
  ticketBtnDisabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  ticketCount: {
    minWidth: 58, alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB",
    paddingVertical: 8, paddingHorizontal: 12,
  },
  ticketCountNum: { fontSize: 20, fontWeight: "900", color: Colors.text.primary },
  ticketCountLbl: { fontSize: 9, fontWeight: "700", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  totalBox: {
    marginLeft: "auto" as any,
    backgroundColor: Colors.brand.orangeLight,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.brand.orange + "30",
    paddingVertical: 8, paddingHorizontal: 14, alignItems: "center",
  },
  totalLabel: { fontSize: 9, fontWeight: "700", color: Colors.brand.orange, textTransform: "uppercase", letterSpacing: 0.6 },
  totalValue: { fontSize: 18, fontWeight: "900", marginTop: 1 },

  // ── Hosted by ──
  hostedRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: "#F0F2F5",
  },
  hostedAvatar: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  hostedLabel: { fontSize: 10, fontWeight: "700", color: Colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  hostedName: { fontSize: 13, fontWeight: "700", color: Colors.text.primary, marginTop: 1 },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.brand.greenLight,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  verifiedText: { fontSize: 10, fontWeight: "700", color: Colors.brand.green },

  // ── CTA ──
  ctaWrap: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30,
    backgroundColor: "#FFF",
    borderTopWidth: 1, borderTopColor: "#F0F2F5",
  },
  confirmBtn: { borderRadius: 16, overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.55 },
  confirmBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "900", color: "#FFF", letterSpacing: 0.2 },

  // ── Success ──
  successWrap: { alignItems: "center", paddingHorizontal: 22, paddingTop: 22 },
  successCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 18, elevation: 10,
  },
  successTitle: { fontSize: 22, fontWeight: "900", color: Colors.text.primary, marginBottom: 8, letterSpacing: -0.3 },
  successSub: { fontSize: 13, color: Colors.text.secondary, textAlign: "center", lineHeight: 20, marginBottom: 20 },

  // ── Ticket visual ──
  ticketVisual: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20, overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 18, elevation: 6,
    borderWidth: 1, borderColor: "#F0F2F5",
  },
  ticketHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 16,
  },
  ticketEmoji: { fontSize: 30 },
  ticketLabel: {
    fontSize: 9, fontWeight: "800", color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2, textTransform: "uppercase",
  },
  ticketName: { fontSize: 16, fontWeight: "900", color: "#FFF", lineHeight: 22, marginTop: 2 },
  ticketBody: { padding: 14, gap: 10 },
  ticketRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ticketRowIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  ticketRowText: { fontSize: 13, fontWeight: "600", color: Colors.text.primary },
  tearRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF" },
  tearCircleL: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#F9FAFB", marginLeft: -10,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  tearLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  tearCircleR: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#F9FAFB", marginRight: -10,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  qrStub: { alignItems: "center", paddingVertical: 18, gap: 6, backgroundColor: "#FFF" },
  qrContrast: { // SPRINT-42: white pad for high-contrast scan
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111827",
  },
  qrHint: { fontSize: 12, color: Colors.text.tertiary, fontWeight: "600" },

  doneBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  doneBtnGrad: { alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  doneBtnText: { fontSize: 15, fontWeight: "900", color: "#FFF" },
});
