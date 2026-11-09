// Door check-in (design D `check-in`): the scanner in a rounded box with a sweeping line, live counts that roll
// up on each admission, and the list of who is in. SPRINT-42 rules kept: owner gate before the camera, one scan at a time.
import { palette } from "../../../src/theme/palette";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../src/services/cache/queryKeys";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Easing, ZoomIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "../../../src/theme/useTheme";
import { ApiError } from "../../../src/api/client";
import {
  checkInEventTicket,
  getEvent,
  getEventCheckInStatus,
  type EventCheckInAttendee,
  type EventCheckInFilter,
  type EventCheckInReasonCode,
  type EventCheckInResult,
} from "../../../src/api/events.api";
import { appAlert } from "../../../src/shared/ui/Dialogs";
import { showToast } from "../../../src/shared/ui/Toast";
import { DPage } from "../../../src/shared/d/Page";
import { Chip, EmptyState, PersonAvatar, PressableScale, Reveal, RollNumber, Tag } from "../../../src/shared/d";
import { TYPE, body, display } from "../../../src/theme/d";

type OutcomeKind = EventCheckInReasonCode | "NETWORK_ERROR" | "PARSE_ERROR"; // SPRINT-42:

type OutcomeState = {
  kind: OutcomeKind;
  title: string;
  subtitle: string;
  color: string;
  name?: string;
  quantity?: number;
  checkedInAt?: string;
};

type OwnerGate = "loading" | "owner" | "denied" | "error"; // SPRINT-42: detail isOwner before camera

function parseTicketPayload(raw: string): { eventId: string; attendeeId: string } | null {
  // SPRINT-42: require JSON with eventId + attendeeId strings; never title / synthetic id
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    const eventId = obj.eventId;
    const attendeeId = obj.attendeeId;
    if (typeof eventId !== "string" || !eventId.trim()) return null;
    if (typeof attendeeId !== "string" || !attendeeId.trim()) return null;
    return { eventId: eventId.trim(), attendeeId: attendeeId.trim() };
  } catch {
    return null;
  }
}

function formatCheckedInAt(value: string | Date | null | undefined): string {
  // SPRINT-42:
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function EventCheckInScreen() {
  // SPRINT-42:
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const eventId = typeof id === "string" ? id.trim() : Array.isArray(id) ? String(id[0] ?? "").trim() : "";
  const router = useRouter();
  const { tc, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [ownerGate, setOwnerGate] = useState<OwnerGate>("loading"); // SPRINT-42:
  const [ownerError, setOwnerError] = useState(""); // SPRINT-42:
  const [eventTitle, setEventTitle] = useState(typeof title === "string" ? title : "Event"); // SPRINT-42:
  const [scanning, setScanning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<OutcomeState | null>(null);
  const lastCodeRef = useRef<string | null>(null);
  const lastCodeAtRef = useRef(0);
  const inflightRef = useRef(false); // SPRINT-42: sync lock — clear only on outcome dismiss

  const [filter, setFilter] = useState<EventCheckInFilter | undefined>(undefined);
  const [totals, setTotals] = useState<{
    totalRegistered: number | null;
    checkedIn: number | null;
    remaining: number | null;
    totalsAvailable: boolean;
  }>({ totalRegistered: null, checkedIn: null, remaining: null, totalsAvailable: false }); // SPRINT-42:
  const [attendees, setAttendees] = useState<EventCheckInAttendee[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const knownRef = useRef<Set<string> | null>(null); // rows seen so far; null until the first list arrives

  // The organiser check reads the event through React Query (TR-013); fetched fresh on every visit.
  const ownerQuery = useQuery({
    queryKey: [...queryKeys.event(String(eventId ?? "")), "check-in"],
    queryFn: () => getEvent(String(eventId)),
    enabled: !!eventId,
    staleTime: 0,
  });
  useEffect(() => {
    // SPRINT-42: detail authority before camera/status — never mount CameraView for non-owners
    if (!eventId) {
      setOwnerGate("error");
      setOwnerError("Missing event id.");
      return;
    }
    if (ownerQuery.isPending) {
      setOwnerGate("loading");
      setOwnerError("");
      return;
    }
    if (ownerQuery.isError) {
      const err = ownerQuery.error;
      setOwnerGate("error");
      setOwnerError(err instanceof ApiError ? err.message : "Could not verify organiser access.");
      return;
    }
    const ev = ownerQuery.data;
    if (!ev.isOwner) {
      setOwnerGate("denied");
      appAlert("Organiser only", "Only the event organiser can use door check-in.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }
    setEventTitle(ev.title?.trim() || (typeof title === "string" ? title : "Event"));
    setOwnerGate("owner");
  }, [eventId, ownerQuery.isPending, ownerQuery.isError, ownerQuery.error, ownerQuery.data, router, title]);

  const refreshStatus = useCallback(async () => {
    // SPRINT-42:
    if (!eventId || ownerGate !== "owner") return; // SPRINT-42:
    setStatusLoading(true);
    setStatusError("");
    try {
      const res = await getEventCheckInStatus(eventId, { page: 1, pageSize: 50, filter });
      setTotals({
        totalRegistered: res.totalRegistered, // SPRINT-42:
        checkedIn: res.checkedIn, // SPRINT-42:
        remaining: res.remaining, // SPRINT-42:
        totalsAvailable: res.totalsAvailable, // SPRINT-42:
      });
      setAttendees(res.data);
      if (knownRef.current == null) knownRef.current = new Set(res.data.map((x) => `${x.ticketId ?? x.id}:${x.checkedIn ? 1 : 0}`));
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Could not load check-in status.");
    } finally {
      setStatusLoading(false);
    }
  }, [eventId, filter, ownerGate]);

  useEffect(() => {
    if (ownerGate === "owner") void refreshStatus(); // SPRINT-42:
  }, [ownerGate, refreshStatus]);

  const showOutcome = (next: OutcomeState) => {
    // SPRINT-42:
    setOutcome(next);
    setScanning(false);
    if (next.kind === "ADMITTED" && next.name) showToast(`${next.name.split(" ")[0]} checked in`, "success");
  };

  const dismissOutcome = () => {
    // SPRINT-42: one large-tap dismissal resumes scanning; clear sync lock here only
    setOutcome(null);
    setScanning(true);
    lastCodeRef.current = null;
    inflightRef.current = false; // SPRINT-42:
  };

  const handleBarcode = async ({ data }: { data: string }) => {
    // SPRINT-42:
    if (!scanning || !eventId || inflightRef.current) return; // SPRINT-42: sync in-flight ref
    const now = Date.now();
    if (lastCodeRef.current === data && now - lastCodeAtRef.current < 2500) return; // same-code debounce
    lastCodeRef.current = data;
    lastCodeAtRef.current = now;
    inflightRef.current = true; // SPRINT-42: lock before any async work / different-QR overlap

    const parsed = parseTicketPayload(data);
    if (!parsed) {
      showOutcome({
        kind: "INVALID_TICKET",
        title: "INVALID TICKET",
        subtitle: "Unrecognised QR payload.",
        color: palette.red600,
      });
      setBusy(false); // SPRINT-42:
      return; // SPRINT-42: lock cleared on dismissOutcome only
    }

    // SPRINT-42: validate payload eventId against route event ID; never compare title
    if (parsed.eventId !== eventId) {
      showOutcome({
        kind: "WRONG_EVENT",
        title: "WRONG EVENT",
        subtitle: "Valid ticket for another event.",
        color: palette.orange600,
      });
      setBusy(false); // SPRINT-42:
      return; // SPRINT-42:
    }

    setBusy(true);
    setScanning(false);
    try {
      const result: EventCheckInResult = await checkInEventTicket(eventId, parsed.attendeeId);
      const name = result.attendee?.name;
      const quantity = result.attendee?.ticketCount;
      switch (result.reasonCode) {
        case "ADMITTED":
          showOutcome({
            kind: "ADMITTED",
            title: "ADMITTED",
            subtitle: "Ticket accepted. Attendee checked in.",
            color: palette.green600,
            name,
            quantity,
          });
          void refreshStatus(); // SPRINT-42: refresh totals after ADMITTED
          break;
        case "INVALID_TICKET":
          showOutcome({
            kind: "INVALID_TICKET",
            title: "INVALID TICKET",
            subtitle: result.message || "Ticket not recognised.",
            color: palette.red600,
          });
          break;
        case "WRONG_EVENT":
          showOutcome({
            kind: "WRONG_EVENT",
            title: "WRONG EVENT",
            subtitle: "Valid ticket for another event.",
            color: palette.orange600,
            name,
          });
          break;
        case "ALREADY_CHECKED_IN":
          showOutcome({
            kind: "ALREADY_CHECKED_IN",
            title: "ALREADY CHECKED IN",
            subtitle: "Ticket was already checked in.",
            color: palette.amber600,
            name,
            quantity,
            checkedInAt: formatCheckedInAt(result.checkedInAt),
          });
          break;
        case "REGISTRATION_CANCELLED":
          showOutcome({
            kind: "REGISTRATION_CANCELLED",
            title: "REGISTRATION CANCELLED",
            subtitle: result.message || "This registration was cancelled.",
            color: palette.red600,
            name,
          });
          break;
        default:
          showOutcome({
            kind: "INVALID_TICKET",
            title: "INVALID TICKET",
            subtitle: result.message || "Unrecognised result.",
            color: palette.red600,
          });
      }
    } catch (err) {
      // SPRINT-42: network / non-ticket HTTP errors — no admission decision recorded
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        showOutcome({
          kind: "NETWORK_ERROR",
          title: "NOT AUTHORIZED",
          subtitle: err.message,
          color: palette.gray500,
        });
      } else {
        showOutcome({
          kind: "NETWORK_ERROR",
          title: "COULD NOT VERIFY",
          subtitle: "Could not verify—no admission decision was recorded",
          color: palette.gray500,
        });
      }
    } finally {
      setBusy(false); // SPRINT-42: do not clear inflightRef here — only on dismissOutcome
    }
  };

  const sentence = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
  const outcomeTone = (k: OutcomeKind) =>
    k === "ADMITTED" ? { bg: tc.mint, icon: "checkmark-circle" as const }
    : k === "ALREADY_CHECKED_IN" || k === "WRONG_EVENT" ? { bg: palette.orangeL42, icon: "alert-circle" as const }
    : k === "NETWORK_ERROR" ? { bg: palette.inkSecondary, icon: "cloud-offline" as const }
    : { bg: palette.redL48, icon: "close-circle" as const };

  if (!eventId || ownerGate === "error") {
    return (
      <DPage title="Door check-in" onBack={() => router.back()}>
        <EmptyState icon="alert-circle-outline" title="Could not open check-in" sub={ownerError || "Missing event id."} actionLabel="Go back" onAction={() => router.back()} />
      </DPage>
    );
  }

  if (ownerGate === "loading" || ownerGate === "denied" || !permission) {
    // SPRINT-42: loading/denied — never mount CameraView
    return (
      <DPage title="Door check-in" sub={eventTitle} onBack={() => router.back()}>
        {ownerGate === "denied" ? (
          <EmptyState icon="lock-closed-outline" title="Organiser only" sub="Only the event organiser can use door check-in." actionLabel="Go back" onAction={() => router.back()} />
        ) : (
          <ActivityIndicator color={tc.accent} style={{ marginTop: 40 }} />
        )}
      </DPage>
    );
  }

  if (!permission.granted) {
    const permanent = permission.canAskAgain === false;
    return (
      <DPage title="Door check-in" sub={eventTitle} onBack={() => router.back()}>
        <EmptyState
          icon="camera-outline"
          title="Camera access needed"
          sub="Comlinkr uses the camera to scan ticket QR codes at the door."
          actionLabel={permanent ? "Open settings" : "Allow camera"}
          onAction={() => (permanent ? void Linking.openSettings() : void requestPermission())}
        />
      </DPage>
    );
  }

  const totalsAvailable = totals.totalsAvailable; // SPRINT-42:
  const tone = outcome ? outcomeTone(outcome.kind) : null;
  const numStyle = [display(700), { fontSize: 18, color: tc.textPrimary, textAlign: "center" as const }];

  return (
    <DPage
      title="Door check-in"
      sub={eventTitle}
      onBack={() => router.back()}
      right={
        <PressableScale onPress={() => void refreshStatus()} hitSlop={10} accessibilityLabel="Refresh" style={[st.iconBtn, { backgroundColor: tc.glass, borderColor: tc.glassLine }]}>
          <Ionicons name="refresh" size={19} color={tc.textPrimary} />
        </PressableScale>
      }
    >
      {/* Scanner — only after owner gate */}
      <Reveal i={0}>
        <View style={st.scanbox}>
          {scanning && !outcome ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }} // SPRINT-42:
              onBarcodeScanned={handleBarcode}
            />
          ) : null}
          <ScanCorners />
          {scanning && !outcome && !busy ? <ScanLine color={tc.mint} /> : null}
          {busy ? <ActivityIndicator color={palette.white} size="large" style={StyleSheet.absoluteFill} /> : null}
          {!scanning && !outcome && !busy ? (
            <Pressable style={st.center} onPress={() => setScanning(true)}>
              <Text style={[body(700), { color: palette.white }]}>Tap to scan again</Text>
            </Pressable>
          ) : null}
          {outcome && tone ? (
            <Animated.View entering={ZoomIn.springify().damping(16).stiffness(220).mass(1)} style={[StyleSheet.absoluteFill, { backgroundColor: tone.bg }]}>
              <Pressable style={[st.center, { padding: 18 }]} onPress={dismissOutcome} accessibilityRole="button" accessibilityLabel={`${sentence(outcome.title)}. Tap to scan the next ticket`}>
                <Ionicons name={tone.icon} size={44} color={palette.white} />
                <Text style={[display(800), { color: palette.white, fontSize: 24, marginTop: 6, textAlign: "center" }]}>{sentence(outcome.title)}</Text>
                {outcome.name ? <Text style={[body(700), { color: palette.white, fontSize: 16, marginTop: 4 }]} numberOfLines={1}>{outcome.name}</Text> : null}
                {outcome.quantity != null ? <Text style={[body(500), st.outMeta]}>{outcome.quantity} ticket{outcome.quantity === 1 ? "" : "s"}</Text> : null}
                {outcome.checkedInAt ? <Text style={[body(500), st.outMeta]}>Checked in {outcome.checkedInAt}</Text> : null}
                <Text style={[body(500), st.outMeta, { textAlign: "center" }]}>{outcome.subtitle}</Text>
                <Text style={[body(700), { color: palette.white, marginTop: 10 }]}>{outcome.kind === "NETWORK_ERROR" ? "Tap to try again" : "Tap for the next ticket"}</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Reveal>

      {totalsAvailable ? (
        <Reveal i={1}>
          <View style={[st.stats, { backgroundColor: tc.cardBg, borderColor: tc.glassLine, borderWidth: isDark ? 1 : 0 }]}>
            {[
              { v: totals.checkedIn ?? 0, k: "Checked in" },
              { v: totals.totalRegistered ?? 0, k: "Registered" },
              { v: totals.remaining ?? 0, k: "Remaining" },
            ].map((x, i) => (
              <View key={x.k} style={[st.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: tc.borderLight }]}>
                <RollNumber value={x.v} style={numStyle} />
                <Text style={[TYPE.small, { color: tc.textSecondary }]}>{x.k}</Text>
              </View>
            ))}
          </View>
        </Reveal>
      ) : null}

      <Reveal i={2} style={st.chips}>
        {([
          { key: undefined, label: "All" },
          { key: "checked_in" as const, label: "Checked in" },
          { key: "remaining" as const, label: "Remaining" },
        ]).map((f) => (
          <Chip key={String(f.key)} label={f.label} on={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </Reveal>

      {statusLoading && attendees.length === 0 ? (
        <ActivityIndicator color={tc.accent} style={{ marginVertical: 16 }} />
      ) : statusError ? (
        <Text style={[TYPE.body, { color: tc.dangerText, paddingHorizontal: 16 }]}>{statusError}</Text>
      ) : attendees.length === 0 ? (
        <Text style={[TYPE.body, { color: tc.textSecondary, paddingHorizontal: 16, paddingVertical: 12 }]}>No one here yet.</Text>
      ) : (
        <View>
          {attendees.map((item, i) => (
            <AttendeeRow key={`${item.ticketId ?? item.id}-${i}`} i={i} item={item} known={knownRef} />
          ))}
        </View>
      )}
    </DPage>
  );
}

/** The four corner brackets of `.scanbox::before`. */
function ScanCorners() {
  const c = { position: "absolute" as const, width: 46, height: 46, borderColor: "rgba(255,255,255,0.85)" };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[c, { top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 20 }]} />
      <View style={[c, { top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 20 }]} />
      <View style={[c, { bottom: 18, left: 18, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 20 }]} />
      <View style={[c, { bottom: 18, right: 18, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 20 }]} />
    </View>
  );
}

/** The green scan line that sweeps from 30 px to 206 px and back (2.2 s, ease-in-out). */
function ScanLine({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(30);
  useEffect(() => {
    if (reduce) return;
    y.set(withRepeat(withTiming(206, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true));
    return () => cancelAnimation(y);
  }, [reduce, y]);
  const a = useAnimatedStyle(() => ({ top: y.get() }));
  return <Animated.View pointerEvents="none" style={[st.line, { backgroundColor: color, shadowColor: color }, reduce ? { top: 118 } : a]} />;
}

/** A row in the list. Rows that arrive after the first load slide down with a green flash (600 ms). */
function AttendeeRow({ item, i, known }: { item: EventCheckInAttendee; i: number; known: React.MutableRefObject<Set<string> | null> }) {
  const { tc } = useTheme();
  const key = `${item.ticketId ?? item.id}:${item.checkedIn ? 1 : 0}`;
  const [isNew] = useState(() => known.current != null && !known.current.has(key));
  useEffect(() => { known.current?.add(key); }, [known, key]);
  const flash = useSharedValue(isNew ? 1 : 0);
  useEffect(() => { if (isNew) flash.set(withTiming(0, { duration: 600 })); }, [isNew, flash]);
  const a = useAnimatedStyle(() => ({ backgroundColor: `rgba(48,133,91,${0.18 * flash.get()})`, transform: [{ translateY: -12 * flash.get() }] }));
  return (
    <Reveal i={i + 3}>
      <Animated.View style={[st.row, a]}>
        <PersonAvatar name={item.name} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[TYPE.small, { color: tc.textSecondary }]}>
            {item.ticketCount} ticket{item.ticketCount === 1 ? "" : "s"}
            {item.checkedIn ? ` · ${formatCheckedInAt(item.checkedInAt)}` : " · not here yet"}
          </Text>
        </View>
        {item.checkedIn ? <Tag label="In" ok icon="checkmark" /> : null}
      </Animated.View>
    </Reveal>
  );
}

const st = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scanbox: { width: 240, height: 240, alignSelf: "center", marginVertical: 20, borderRadius: 28, overflow: "hidden", backgroundColor: palette.neutralL06 },
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  line: { position: "absolute", left: 24, right: 24, height: 2, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  outMeta: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },
  stats: { flexDirection: "row", marginHorizontal: 16, marginBottom: 18, borderRadius: 24, shadowColor: palette.shadowNavy, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
});
