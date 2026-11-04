import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { FadeImage } from "../../components/FadeImage"; // SPRINT-31:
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../src/theme/colors";
import { useTheme } from "../../src/theme/useTheme";

export default function EventRegistrationModal({
  visible,
  onClose,
  event,
  onRegistered,
}: {
  visible: boolean;
  onClose: () => void;
  event: any;
  onRegistered: (data: { name: string; email: string; phone: string; tickets: string }) => void;
}) {
  const { tc } = useTheme();
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [tickets, setTickets] = useState(1);
  const [regSubmitted, setRegSubmitted] = useState(false);

  if (!event) return null;

  const isFree = event.price === "Free";
  const priceNum = isFree ? 0 : parseFloat((event.price ?? "0").replace("$", "")) || 0;
  const totalPrice = isFree ? "Free" : `$${(priceNum * tickets).toFixed(0)}`;

  const handleRegister = () => {
    if (!regName.trim() || !regEmail.trim()) return;
    setRegSubmitted(true);
    onRegistered({ name: regName, email: regEmail, phone: regPhone, tickets: String(tickets) });
  };

  const resetForm = () => {
    setRegName("");
    setRegEmail("");
    setRegPhone("");
    setTickets(1);
    setRegSubmitted(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={resetForm}>
      <Pressable style={st.overlay} onPress={resetForm}>
        <View style={[st.sheet, { backgroundColor: tc.sheetBg }]} onStartShouldSetResponder={() => true}>
          <View style={[st.handle, { backgroundColor: tc.borderMedium }]} />

          {regSubmitted ? (
            /* ── Success ── */
            <ScrollView contentContainerStyle={st.successWrap} showsVerticalScrollIndicator={false}>
              <LinearGradient colors={["#22C55E", "#16A34A"]} style={st.successCircle}>
                <Ionicons name="checkmark" size={42} color="#FFF" />
              </LinearGradient>
              <Text style={[st.successTitle, { color: tc.textPrimary }]}>You're Registered! 🎉</Text>
              <Text style={[st.successSub, { color: tc.textSecondary }]}>
                Confirmation sent to{" "}
                <Text style={{ fontWeight: "800", color: Colors.brand.blue }}>{regEmail}</Text>
              </Text>

              {/* Ticket visual */}
              <View style={[st.ticketVisual, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                <LinearGradient
                  colors={[Colors.brand.orange, "#CC5800"]}
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

                <View style={st.ticketBody}>
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
                      <Text style={st.ticketRowText}>{row.text}</Text>
                    </View>
                  ))}
                </View>

                {/* Tear line */}
                <View style={st.tearRow}>
                  <View style={st.tearCircleL} />
                  <View style={st.tearLine} />
                  <View style={st.tearCircleR} />
                </View>

                <View style={st.qrStub}>
                  <Ionicons name="qr-code-outline" size={60} color={Colors.text.tertiary} />
                  <Text style={st.qrHint}>Scan QR at event entry</Text>
                </View>
              </View>

              <Pressable style={st.doneBtn} onPress={resetForm}>
                <LinearGradient
                  colors={[Colors.brand.green, "#16A34A"]}
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
            <>
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

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.formScroll}>
                {/* Price badge */}
                <View style={[st.priceBadge, {
                  backgroundColor: isFree ? Colors.brand.greenLight : Colors.brand.orangeLight,
                  borderColor: isFree ? Colors.brand.green + "35" : Colors.brand.orange + "35",
                }]}>
                  <Ionicons name="ticket-outline" size={14} color={isFree ? Colors.brand.green : Colors.brand.orange} />
                  <Text style={[st.priceBadgeText, { color: isFree ? Colors.brand.green : Colors.brand.orange }]}>
                    {isFree ? "Free Entry" : `${event.price} per ticket`}
                  </Text>
                </View>

                {/* Fields card */}
                <View style={st.formCard}>
                  <View style={st.fieldGroup}>
                    <Text style={st.fieldLabel}>Full Name</Text>
                    <View style={st.inputWrap}>
                      <Ionicons name="person-outline" size={16} color={Colors.text.tertiary} />
                      <TextInput
                        style={st.input}
                        placeholder="Your full name"
                        placeholderTextColor={Colors.text.tertiary}
                        value={regName}
                        onChangeText={setRegName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={st.formDivider} />
                  <View style={st.fieldGroup}>
                    <Text style={st.fieldLabel}>Email Address</Text>
                    <View style={st.inputWrap}>
                      <Ionicons name="mail-outline" size={16} color={Colors.text.tertiary} />
                      <TextInput
                        style={st.input}
                        placeholder="your@email.com"
                        placeholderTextColor={Colors.text.tertiary}
                        value={regEmail}
                        onChangeText={setRegEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={st.formDivider} />
                  <View style={st.fieldGroup}>
                    <Text style={st.fieldLabel}>Phone (optional)</Text>
                    <View style={st.inputWrap}>
                      <Ionicons name="call-outline" size={16} color={Colors.text.tertiary} />
                      <TextInput
                        style={st.input}
                        placeholder="+1 (555) 123-4567"
                        placeholderTextColor={Colors.text.tertiary}
                        value={regPhone}
                        onChangeText={setRegPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* Ticket stepper */}
                <View style={st.ticketStepCard}>
                  <Text style={st.ticketStepTitle}>Number of Tickets</Text>
                  <View style={st.ticketStepRow}>
                    <Pressable
                      style={[st.ticketBtn, tickets <= 1 && st.ticketBtnDisabled]}
                      onPress={() => setTickets((t) => Math.max(1, t - 1))}
                    >
                      <Ionicons name="remove" size={20} color={tickets <= 1 ? Colors.text.tertiary : Colors.brand.orange} />
                    </Pressable>
                    <View style={st.ticketCount}>
                      <Text style={st.ticketCountNum}>{tickets}</Text>
                      <Text style={st.ticketCountLbl}>ticket{tickets > 1 ? "s" : ""}</Text>
                    </View>
                    <Pressable
                      style={[st.ticketBtn, tickets >= 10 && st.ticketBtnDisabled]}
                      onPress={() => setTickets((t) => Math.min(10, t + 1))}
                    >
                      <Ionicons name="add" size={20} color={tickets >= 10 ? Colors.text.tertiary : Colors.brand.orange} />
                    </Pressable>
                    {!isFree && (
                      <View style={st.totalBox}>
                        <Text style={st.totalLabel}>Total</Text>
                        <Text style={[st.totalValue, { color: Colors.brand.orange }]}>{totalPrice}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Hosted by */}
                {event.host && (
                  <View style={st.hostedRow}>
                    <LinearGradient
                      colors={[Colors.brand.blue, Colors.brand.green]}
                      style={st.hostedAvatar}
                    >
                      <Ionicons name="person" size={17} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={st.hostedLabel}>Hosted by</Text>
                      <Text style={st.hostedName}>{event.host}</Text>
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
              <View style={st.ctaWrap}>
                <Pressable
                  style={[st.confirmBtn, (!regName.trim() || !regEmail.trim()) && st.confirmBtnDisabled]}
                  onPress={handleRegister}
                  disabled={!regName.trim() || !regEmail.trim()}
                >
                  <LinearGradient
                    colors={(!regName.trim() || !regEmail.trim()) ? ["#D1D5DB", "#D1D5DB"] : [Colors.brand.orange, "#E56800"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={st.confirmBtnGrad}
                  >
                    <Ionicons name="ticket-outline" size={18} color="#FFF" />
                    <Text style={st.confirmBtnText}>
                      Confirm{!isFree ? ` · ${totalPrice}` : " Registration"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
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
  tearRow: { flexDirection: "row", alignItems: "center" },
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
  qrStub: { alignItems: "center", paddingVertical: 18, gap: 6 },
  qrHint: { fontSize: 12, color: Colors.text.tertiary, fontWeight: "600" },

  doneBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  doneBtnGrad: { alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  doneBtnText: { fontSize: 15, fontWeight: "900", color: "#FFF" },
});
