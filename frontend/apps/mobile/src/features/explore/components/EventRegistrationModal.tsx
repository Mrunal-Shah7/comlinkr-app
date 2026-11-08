// The RSVP sheet (design D, `event-register` and `event-ticket`): the event, a ticket stepper, name and email
// from your profile (Change opens the fields), Confirm · price. After confirming, the ticket flips in
// (perspective 800, rotateX −80° → 0 on the sheet spring) with the QR from the server.
import React, { useState, useEffect, useRef, useCallback } from "react"; // SPRINT-42:
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image"; // SPRINT-31:
import { FadeImage } from "../../../../components/FadeImage"; // SPRINT-31:
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import * as Brightness from "expo-brightness"; // SPRINT-42: raise screen brightness while QR is visible
import { useTheme } from "../../../theme/useTheme";
import { ApiError } from "../../../api/client";
import { getMyTicket, type EventTicket } from "../../../api/events.api";
import { appAlert } from "../../../shared/ui/Dialogs";
import { DSheet } from "../../../shared/d/Sheet";
import { GradientButton, Prefill, PressableScale, Stepper, Tag } from "../../../shared/d";
import Input from "../../../shared/ui/Input";
import { TYPE, body, display } from "../../../theme/d";
import { SPRING } from "../../../shared/motion/presets";
import { useAuthStore } from "../../../store/auth.store";

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
  const user = useAuthStore((s) => s.user);
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);
  // Name, email and phone come from the profile each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setRegName(user?.name ?? "");
    setRegEmail(user?.email ?? "");
    setRegPhone(user?.phone ?? "");
    setEditing(!user?.name || !user?.email);
  }, [visible, user?.name, user?.email, user?.phone]);
  // The ticket flip.
  const flip = useSharedValue(0);
  useEffect(() => {
    if (!regSubmitted) { flip.set(0); return; }
    flip.set(reduce ? withTiming(1, { duration: 160 }) : withSpring(1, SPRING.sheet));
  }, [regSubmitted, reduce, flip]);
  const flipStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, flip.get() * 1.6),
    transform: [{ perspective: 800 }, { rotateX: `${(1 - flip.get()) * -80}deg` }],
  }));

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
    setEditing(false);
    onClose();
  };

  const when = [event.date, event.time].filter(Boolean).join(" · ");
  const canConfirm = !!regName.trim() && validateEmail(regEmail) && !registering;

  return (
    <DSheet visible={visible} onClose={resetForm} title={regSubmitted ? "Your ticket" : "RSVP"}>
      {regSubmitted ? (
        <ScrollView contentContainerStyle={st.sb} showsVerticalScrollIndicator={false}>
          <Animated.View style={[st.ticket, { backgroundColor: tc.cardBg, borderColor: tc.glassLine, borderWidth: isDark ? 1 : 0 }, { transformOrigin: "top" }, flipStyle]}>
            <View style={{ padding: 18, paddingHorizontal: 20 }}>
              <Tag label="Confirmed" ok icon="checkmark" />
              <Text style={[display(700), { fontSize: 21, color: tc.textPrimary, marginTop: 10, marginBottom: 4 }]} numberOfLines={3}>{event.title}</Text>
              {when ? <Text style={[TYPE.body, { color: tc.textSecondary }]}>{when}</Text> : null}
              {event.location ? <Text style={[TYPE.body, { color: tc.textSecondary }]}>{event.location}</Text> : null}
              <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 12 }]}>
                {regName} · {tickets} ticket{tickets > 1 ? "s" : ""}{isFree ? "" : ` · ${totalPrice}`}
              </Text>
            </View>
            <View style={[st.tq, { borderTopColor: tc.borderMedium }]}>
              {ticketLoading ? (
                <ActivityIndicator size="large" color={tc.accent} style={{ height: 220 }} />
              ) : ticket?.qrCode ? (
                <Animated.View entering={FadeIn.duration(260)} style={{ alignItems: "center" }}>
                  {/* SPRINT-42: high-contrast arm's-length QR from server base64; synthetic id display-only */}
                  <View style={st.qrContrast}>
                    <Image
                      source={{ uri: ticket.qrCode.startsWith("data:") ? ticket.qrCode : `data:image/png;base64,${ticket.qrCode}` }}
                      style={{ width: 200, height: 200 }}
                      contentFit="contain"
                      cachePolicy="memory"
                    />
                  </View>
                  <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 12 }]}>Show this at the door</Text>
                  <Text style={[body(600), { fontSize: 11, color: tc.textTertiary, marginTop: 2, letterSpacing: 1 }]}>#{ticket.id.slice(-8).toUpperCase()}</Text>
                </Animated.View>
              ) : (
                <Text style={[TYPE.small, { color: tc.textSecondary, textAlign: "center" }]}>{ticketError || "Show this at the door"}</Text>
              )}
            </View>
          </Animated.View>
          <Text style={[TYPE.small, { color: tc.textSecondary, textAlign: "center", marginTop: 12 }]}>
            Confirmation sent to {regEmail}
          </Text>
          <GradientButton label="Done" block onPress={resetForm} outerStyle={{ marginTop: 16 }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={st.sb} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={st.evRow}>
            <FadeImage uri={event.image} style={st.evImg} cachePolicy="disk" transition={200} />
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={2}>{event.title}</Text>
              {when ? <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 2 }]}>{when}</Text> : null}
            </View>
          </View>
          <Stepper label="Tickets" value={tickets} onChange={setTickets} min={1} max={4} />
          <View style={{ height: 14 }} />
          {editing ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <Input label="Name" value={regName} onChangeText={setRegName} autoCapitalize="words" placeholder="Your full name" />
              <Input label="Email" value={regEmail} onChangeText={(v) => { setRegEmail(v); if (emailError) setEmailError(""); }} error={emailError || undefined}
                keyboardType="email-address" autoCapitalize="none" placeholder="your@email.com" />
              <Input label="Phone (optional)" value={regPhone} onChangeText={(v) => { setRegPhone(v); if (phoneError) setPhoneError(""); }} error={phoneError || undefined}
                keyboardType="phone-pad" placeholder="+1 555 123 4567" />
            </Animated.View>
          ) : (
            <Prefill right={
              <PressableScale onPress={() => setEditing(true)} hitSlop={8} accessibilityLabel="Change name or email">
                <Text style={[body(700), { fontSize: 14, color: tc.accentText }]}>Change</Text>
              </PressableScale>
            }>
              <Text style={[TYPE.body, { color: tc.textPrimary }]} numberOfLines={1}>
                <Text style={body(700)}>{regName}</Text> · {regEmail}
              </Text>
              <Text style={[TYPE.small, { color: tc.textSecondary }]}>From your profile</Text>
            </Prefill>
          )}
          {!!emailError && !editing ? <Text style={[TYPE.small, { color: tc.dangerText, marginTop: 6 }]}>{emailError}</Text> : null}
          <View style={{ height: 18 }} />
          <GradientButton label={`Confirm · ${totalPrice}`} block loading={registering} disabled={!canConfirm} onPress={() => void handleRegister()} />
        </ScrollView>
      )}
    </DSheet>
  );
}

const st = StyleSheet.create({
  sb: { paddingHorizontal: 18, paddingBottom: 8 },
  evRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14 },
  evImg: { width: 56, height: 56, borderRadius: 12, overflow: "hidden" },
  ticket: { marginHorizontal: 6, marginTop: 4, borderRadius: 28, overflow: "hidden", shadowColor: "#0F283C", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  tq: { alignItems: "center", padding: 20, borderTopWidth: 2, borderStyle: "dashed" },
  qrContrast: { backgroundColor: "#FFFFFF", padding: 10, borderRadius: 14 },
});
