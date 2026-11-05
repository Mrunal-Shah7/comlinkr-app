// SPRINT-42: organiser door check-in — industrial/utilitarian QR scanner + status totals.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../src/theme/colors";
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
import { rs } from "../../../src/utils/responsive";
import { appAlert } from '../../../src/shared/ui/Dialogs';
import { createThemedStyles } from '../../../src/theme/themedStyles';

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

function formatTotalDisplay(value: number | null, available: boolean): string {
  // SPRINT-42: never show fake zeros when totals were stripped from the envelope
  if (!available || value == null) return "Unavailable"; // SPRINT-42:
  return String(value); // SPRINT-42:
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

  useEffect(() => {
    // SPRINT-42: detail authority before camera/status — never mount CameraView for non-owners
    if (!eventId) {
      setOwnerGate("error"); // SPRINT-42:
      setOwnerError("Missing event id."); // SPRINT-42:
      return;
    }
    let cancelled = false; // SPRINT-42:
    setOwnerGate("loading"); // SPRINT-42:
    setOwnerError(""); // SPRINT-42:
    void getEvent(eventId)
      .then((ev) => {
        if (cancelled) return; // SPRINT-42:
        if (!ev.isOwner) {
          // SPRINT-42:
          setOwnerGate("denied"); // SPRINT-42:
          appAlert("Organiser only", "Only the event organiser can use door check-in.", [
            { text: "OK", onPress: () => router.back() }, // SPRINT-42:
          ]);
          return;
        }
        setEventTitle(ev.title?.trim() || (typeof title === "string" ? title : "Event")); // SPRINT-42:
        setOwnerGate("owner"); // SPRINT-42:
      })
      .catch((err) => {
        if (cancelled) return; // SPRINT-42:
        setOwnerGate("error"); // SPRINT-42:
        setOwnerError(err instanceof ApiError ? err.message : "Could not verify organiser access."); // SPRINT-42:
      });
    return () => {
      cancelled = true; // SPRINT-42:
    };
  }, [eventId, router, title]);

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
        color: "#DC2626",
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
        color: "#EA580C",
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
            color: "#16A34A",
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
            color: "#DC2626",
          });
          break;
        case "WRONG_EVENT":
          showOutcome({
            kind: "WRONG_EVENT",
            title: "WRONG EVENT",
            subtitle: "Valid ticket for another event.",
            color: "#EA580C",
            name,
          });
          break;
        case "ALREADY_CHECKED_IN":
          showOutcome({
            kind: "ALREADY_CHECKED_IN",
            title: "ALREADY CHECKED IN",
            subtitle: "Ticket was already checked in.",
            color: "#D97706",
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
            color: "#DC2626",
            name,
          });
          break;
        default:
          showOutcome({
            kind: "INVALID_TICKET",
            title: "INVALID TICKET",
            subtitle: result.message || "Unrecognised result.",
            color: "#DC2626",
          });
      }
    } catch (err) {
      // SPRINT-42: network / non-ticket HTTP errors — no admission decision recorded
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        showOutcome({
          kind: "NETWORK_ERROR",
          title: "NOT AUTHORIZED",
          subtitle: err.message,
          color: "#6B7280",
        });
      } else {
        showOutcome({
          kind: "NETWORK_ERROR",
          title: "COULD NOT VERIFY",
          subtitle: "Could not verify—no admission decision was recorded",
          color: "#6B7280",
        });
      }
    } finally {
      setBusy(false); // SPRINT-42: do not clear inflightRef here — only on dismissOutcome
    }
  };

  if (!eventId || ownerGate === "error") {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: tc.pageBg }]}>
        <Text style={{ color: tc.textPrimary, padding: 24 }}>{ownerError || "Missing event id."}</Text>
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 24 }}>
          <Text style={{ color: Colors.brand.blue, fontWeight: "700" }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (ownerGate === "loading" || ownerGate === "denied") {
    // SPRINT-42: loading/denied — never mount CameraView
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: "#091218", justifyContent: "center", alignItems: "center" }]}>
        {ownerGate === "loading" ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Text style={{ color: "#FFF", fontWeight: "800", paddingHorizontal: 28, textAlign: "center" }}>
              Only the event organiser can use door check-in.
            </Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
              <Text style={{ color: "#9CA3AF", fontWeight: "700" }}>Go back</Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: "#091218", justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#FFF" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    const permanent = permission.canAskAgain === false;
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: "#091218" }]}>
        <View style={styles.permWrap}>
          <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
          <Text style={styles.permTitle}>Camera access needed</Text>
          <Text style={styles.permBody}>
            ComLinkr uses your camera to scan event ticket QR codes at check-in.
          </Text>
          {permanent ? (
            <Pressable style={styles.permBtn} onPress={() => void Linking.openSettings()}>
              <Text style={styles.permBtnText}>Open Settings</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.permBtn} onPress={() => void requestPermission()}>
              <Text style={styles.permBtnText}>Allow Camera</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: "#9CA3AF", fontWeight: "700" }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const totalsAvailable = totals.totalsAvailable; // SPRINT-42:

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: "#091218" }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>DOOR CHECK-IN</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle}</Text>
        </View>
        <Pressable onPress={() => void refreshStatus()} hitSlop={10}>
          <Ionicons name="refresh" size={20} color="#FFF" />
        </Pressable>
      </View>

      {/* Totals — ticket quantities (Unavailable when envelope strips siblings) */}
      <View style={styles.totalsRow}>
        <View style={styles.totalBox}>
          <Text style={[styles.totalNum, !totalsAvailable && styles.totalUnavailable]}>
            {formatTotalDisplay(totals.totalRegistered, totalsAvailable)}
          </Text>
          <Text style={styles.totalLbl}>Registered</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={[styles.totalNum, { color: totalsAvailable ? "#4ADE80" : "#9CA3AF" }, !totalsAvailable && styles.totalUnavailable]}>
            {formatTotalDisplay(totals.checkedIn, totalsAvailable)}
          </Text>
          <Text style={styles.totalLbl}>Checked in</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={[styles.totalNum, { color: totalsAvailable ? "#FBBF24" : "#9CA3AF" }, !totalsAvailable && styles.totalUnavailable]}>
            {formatTotalDisplay(totals.remaining, totalsAvailable)}
          </Text>
          <Text style={styles.totalLbl}>Remaining</Text>
        </View>
      </View>
      {!totalsAvailable ? (
        <Text style={styles.totalsLimitNote}>
          {/* SPRINT-42: */}
          Totals unavailable — backend TransformInterceptor drops top-level totals from check-in status responses that also include data/meta.
        </Text>
      ) : null}

      {/* Scanner — only after owner gate */}
      <View style={styles.scannerWrap}>
        {scanning && !outcome ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }} // SPRINT-42:
            onBarcodeScanned={handleBarcode}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111827", alignItems: "center", justifyContent: "center" }]}>
            {busy ? <ActivityIndicator color="#FFF" size="large" /> : null}
          </View>
        )}
        <View style={styles.scanFrame} pointerEvents="none" />
        {!scanning && !outcome && !busy ? (
          <Pressable style={styles.resumeBtn} onPress={() => setScanning(true)}>
            <Text style={styles.resumeText}>Tap to resume scanning</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Outcome overlay */}
      {outcome ? (
        <Pressable style={[styles.outcomeOverlay, { backgroundColor: outcome.color }]} onPress={dismissOutcome}>
          <Text style={styles.outcomeKind}>{outcome.title}</Text>
          {outcome.name ? <Text style={styles.outcomeName}>{outcome.name}</Text> : null}
          {outcome.quantity != null ? (
            <Text style={styles.outcomeMeta}>{outcome.quantity} ticket{outcome.quantity === 1 ? "" : "s"}</Text>
          ) : null}
          {outcome.checkedInAt ? (
            <Text style={styles.outcomeMeta}>Checked in: {outcome.checkedInAt}</Text>
          ) : null}
          <Text style={styles.outcomeSub}>{outcome.subtitle}</Text>
          {outcome.kind === "NETWORK_ERROR" ? (
            <Pressable
              style={styles.retryChip}
              onPress={(e) => {
                e.stopPropagation?.();
                dismissOutcome();
              }}
            >
              <Text style={styles.retryText}>Retry scan</Text>
            </Pressable>
          ) : (
            <Text style={styles.tapDismiss}>Tap anywhere to continue</Text>
          )}
        </Pressable>
      ) : null}

      {/* Filter + lookup list */}
      <View style={[styles.listPanel, { backgroundColor: isDark ? tc.cardBg : "#F3F4F6" }]}>
        <View style={styles.filterRow}>
          {([
            { key: undefined, label: "All" },
            { key: "checked_in" as const, label: "Checked in" },
            { key: "remaining" as const, label: "Remaining" },
          ]).map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={String(f.key)}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, on && { backgroundColor: "#30855B" }]}
              >
                <Text style={[styles.filterText, on && { color: "#FFF" }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.lookupNote, { color: tc.textTertiary }]}>
          Lookup list for verification only — manual lookup check-in is unavailable (no endpoint route).
        </Text>
        {statusLoading ? (
          <ActivityIndicator color={Colors.brand.blue} style={{ marginVertical: 12 }} />
        ) : statusError ? (
          <Text style={{ color: "#DC2626", padding: 12 }}>{statusError}</Text>
        ) : (
          <FlatList
            data={attendees}
            keyExtractor={(a, i) => `${a.ticketId ?? a.id}-${i}`}
            style={{ maxHeight: rs(180) }}
            renderItem={({ item }) => (
              <View style={styles.attendeeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.attendeeName, { color: tc.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: tc.textTertiary, fontSize: 11 }}>
                    {item.ticketCount} ticket{item.ticketCount === 1 ? "" : "s"}
                    {item.checkedIn ? ` · in ${formatCheckedInAt(item.checkedInAt)}` : " · remaining"}
                  </Text>
                </View>
                <Ionicons
                  name={item.checkedIn ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={item.checkedIn ? "#16A34A" : tc.textTertiary}
                />
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ color: tc.textTertiary, padding: 12, fontSize: 13 }}>No registrations in this filter.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  root: { flex: 1 }, // SPRINT-42:
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  }, // SPRINT-42:
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  }, // SPRINT-42:
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1.2,
  }, // SPRINT-42:
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#FFF" }, // SPRINT-42:
  totalsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 6,
  }, // SPRINT-42:
  totalBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  }, // SPRINT-42:
  totalNum: { fontSize: 20, fontWeight: "900", color: "#FFF" }, // SPRINT-42:
  totalUnavailable: { fontSize: 11, fontWeight: "800", color: "#9CA3AF" }, // SPRINT-42:
  totalLbl: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginTop: 2, textTransform: "uppercase" }, // SPRINT-42:
  totalsLimitNote: {
    // SPRINT-42:
    marginHorizontal: 14,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: "600",
    color: "#FBBF24",
    lineHeight: 15,
  }, // SPRINT-42:
  scannerWrap: {
    marginHorizontal: 14,
    height: rs(260),
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#374151",
  }, // SPRINT-42:
  scanFrame: {
    position: "absolute",
    top: "18%",
    left: "18%",
    right: "18%",
    bottom: "18%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
  }, // SPRINT-42:
  resumeBtn: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  }, // SPRINT-42:
  resumeText: { color: "#FFF", fontWeight: "800", fontSize: 15 }, // SPRINT-42:
  outcomeOverlay: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 16,
    padding: 20,
    minHeight: rs(140),
    justifyContent: "center",
  }, // SPRINT-42:
  outcomeKind: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.5,
  }, // SPRINT-42:
  outcomeName: { fontSize: 18, fontWeight: "800", color: "#FFF", marginTop: 8 }, // SPRINT-42:
  outcomeMeta: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.9)", marginTop: 4 }, // SPRINT-42:
  outcomeSub: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginTop: 8 }, // SPRINT-42:
  tapDismiss: { marginTop: 14, fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.75)" }, // SPRINT-42:
  retryChip: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  }, // SPRINT-42:
  retryText: { color: "#FFF", fontWeight: "800" }, // SPRINT-42:
  listPanel: {
    flex: 1,
    marginTop: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 12,
  }, // SPRINT-42:
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 8 }, // SPRINT-42:
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  }, // SPRINT-42:
  filterText: { fontSize: 12, fontWeight: "800", color: "#374151" }, // SPRINT-42:
  lookupNote: { fontSize: 11, fontWeight: "600", marginBottom: 8, lineHeight: 15 }, // SPRINT-42:
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    gap: 10,
  }, // SPRINT-42:
  attendeeName: { fontSize: 14, fontWeight: "700" }, // SPRINT-42:
  permWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }, // SPRINT-42:
  permTitle: { color: "#FFF", fontSize: 18, fontWeight: "900", marginTop: 14 }, // SPRINT-42:
  permBody: { color: "#9CA3AF", textAlign: "center", marginTop: 8, lineHeight: 20 }, // SPRINT-42:
  permBtn: {
    marginTop: 20,
    backgroundColor: Colors.brand.blue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  }, // SPRINT-42:
  permBtnText: { color: "#FFF", fontWeight: "900" }, // SPRINT-42:
});
