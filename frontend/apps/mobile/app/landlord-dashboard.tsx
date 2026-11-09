import { palette } from "../src/theme/palette";
import { rs } from "../src/utils/responsive";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect } from "expo-router";
import { queryKeys } from "../src/services/cache/queryKeys";
import { useScreenQuery } from "../src/hooks/useScreenQuery";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useAuthStore } from "../src/store/auth.store";
import {
  getReceivedApplications,
  decideApplication,
  type PropertyApplication,
  type ApplicationStatus,
} from "../src/api/property-agreement.api";
import { getMyListings, type HousingListing } from "../src/api/housing.api";
import { ApiError } from "../src/api/client";
import { showToast } from "../src/shared/ui/Toast";
import { createThemedStyles } from '../src/theme/themedStyles';
import { TYPE } from '../src/theme/d';
import { EmptyState, GradientButton, GradientFill, PersonAvatar, PressableScale, Reveal, Segmented, SoftButton } from '../src/shared/d';
import { DSheet } from '../src/shared/d/Sheet';
import { DPage, DRow, goBackOr } from '../src/shared/d/Page';

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { label: string; color: string; bg: string; icon: string }> = {
  draft:        { label: "Draft",        color: palette.gray500, bg: palette.gray100,  icon: "document-outline" },
  submitted:    { label: "Submitted",    color: palette.skyL41, bg: palette.blueL97_2,  icon: "paper-plane-outline" },
  under_review: { label: "Under Review", color: palette.amber600, bg: palette.yellowL95,  icon: "hourglass-outline" },
  approved:     { label: "Approved",     color: palette.green600, bg: palette.green50,  icon: "checkmark-circle" },
  rejected:     { label: "Rejected",     color: palette.red600, bg: palette.red50,  icon: "close-circle" },
  signed:       { label: "Signed",       color: palette.violet500, bg: palette.violet50,  icon: "create-outline" },
  withdrawn:    { label: "Withdrawn",    color: palette.gray400, bg: palette.gray50,  icon: "remove-circle-outline" },
};

function statusMeta(s: ApplicationStatus) {
  return STATUS_META[s] ?? { label: s, color: palette.gray500, bg: palette.gray100, icon: "help-circle-outline" };
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main Component ────────────────────────────────────────────────────────────

type Tab = "applications" | "listings";

/** A card that rises in like `Reveal`, then slides off sideways when a decision is made (approve right,
 *  decline left: translateX ±110 %, opacity 0, 300 ms). */
function SlideAway({ i, leaving, children }: { i: number; leaving?: "approved" | "rejected"; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    if (!leaving) { x.set(0); o.set(1); return; }
    const to = (leaving === "approved" ? 1 : -1) * width * 1.1;
    if (reduce) { o.set(withTiming(0, { duration: 200 })); return; }
    x.set(withTiming(to, { duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    o.set(withTiming(0, { duration: 300 }));
  }, [leaving, reduce, width, x, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ translateX: x.get() }] }));
  return (
    <Reveal i={i} style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <Animated.View style={a}>{children}</Animated.View>
    </Reveal>
  );
}

export default function LandlordDashboard() {
  const { isDark, tc } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>("applications");
  const dash = useScreenQuery({
    queryKey: queryKeys.landlordDashboard(),
    initial: { applications: [] as PropertyApplication[], listings: [] as HousingListing[] },
    refetchOnFocus: false,
    queryFn: async () => {
      const [apps, listingsRes] = await Promise.all([
        getReceivedApplications().catch(() => [] as PropertyApplication[]),
        getMyListings({ page: 1, pageSize: 50 }).catch(() => ({ data: [] as HousingListing[] })),
      ]);
      return {
        applications: apps,
        listings: (Array.isArray((listingsRes as any)?.data) ? (listingsRes as any).data : []) as HousingListing[],
      };
    },
  });
  const { applications, listings } = dash.data;
  const loading = dash.loading;
  const refreshing = dash.refreshing;
  const error = dash.error ? (dash.error instanceof ApiError ? dash.error.message : "Could not load data.") : null;
  const setDash = dash.setData;
  const setApplications = useCallback(
    (fn: (p: PropertyApplication[]) => PropertyApplication[]) => setDash((d) => ({ ...d, applications: fn(d.applications) })),
    [setDash],
  );

  // Detail modal
  const [selectedApp, setSelectedApp] = useState<PropertyApplication | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [deciding, setDeciding] = useState(false);

  const onRefresh = dash.onRefresh;

  // One tap on a card: decide, slide the card off to its side, then move it down the list.
  const [leaving, setLeaving] = useState<Record<string, "approved" | "rejected">>({});
  const quickDecide = async (a: PropertyApplication, decision: "approved" | "rejected") => {
    if (leaving[a.id]) return;
    try {
      const updated = await decideApplication(a.id, decision);
      setLeaving((m) => ({ ...m, [a.id]: decision }));
      setTimeout(() => {
        setApplications((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        setLeaving((m) => { const n = { ...m }; delete n[a.id]; return n; });
      }, 320);
      showToast(decision === "approved" ? `Approved. ${a.personalInfo?.fullName?.split(" ")[0] || "The applicant"} will hear from you.` : "Declined. The applicant is told.", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not process decision.", "error");
    }
  };

  const handleDecide = async (decision: "approved" | "rejected") => {
    if (!selectedApp) return;
    setDeciding(true);
    try {
      const updated = await decideApplication(selectedApp.id, decision, decisionNote.trim() || undefined);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSelectedApp(updated);
      setDecisionNote("");
      showToast(
        decision === "approved"
          ? "Application approved. The applicant will be notified."
          : "Application rejected. The applicant will be notified.",
        "success",
      );
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not process decision.", "error");
    } finally {
      setDeciding(false);
    }
  };

  // ── Summary counts ──────────────────────────────────────────────────────────
  const pendingCount = applications.filter((a) => a.status === "submitted" || a.status === "under_review").length;
  const approvedCount = applications.filter((a) => a.status === "approved" || a.status === "signed").length;
  const activeListings = listings.filter((l) => (l as any).status !== "inactive" && (l as any).status !== "archived").length;

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  const tone = (s: ApplicationStatus): "ok" | "warn" | "plain" | "accent" =>
    s === "approved" || s === "signed" ? "ok" : s === "submitted" || s === "under_review" ? "warn" : s === "rejected" || s === "withdrawn" ? "plain" : "accent";
  const tagD = (label: string, t: "ok" | "warn" | "plain" | "accent") => (
    <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: t === "ok" ? tc.mintSoft : t === "warn" ? tc.warningBg : t === "accent" ? tc.accentSoft : tc.inputBg }}>
      <Text style={[TYPE.label, { fontSize: 11, color: t === "ok" ? tc.successText : t === "warn" ? tc.warningText : t === "accent" ? tc.accentText : tc.textSecondary }]}>{label}</Text>
    </View>
  );
  const card = { borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg };
  const appRows = (a: PropertyApplication) => ([
    ["Move-in", a.agreementTerms?.moveInDate ? formatDate(a.agreementTerms.moveInDate) : ""],
    ["Income", a.financialDetails?.monthlyIncome ? `$${a.financialDetails.monthlyIncome.toLocaleString()} /mo` : ""],
    ["Job", [a.personalInfo?.jobTitle, a.personalInfo?.employerName].filter(Boolean).join(", ")],
  ] as [string, string][]).filter(([, v]) => !!v);
  const order = (s: ApplicationStatus) => (s === "submitted" || s === "under_review" ? 0 : s === "draft" ? 2 : 1);
  const sortedApps = [...applications].sort((x, y) => order(x.status) - order(y.status));

  return (
    <DPage
      title={tab === "applications" ? "Applications" : "Your listings"}
      sub={[pendingCount > 0 ? `${pendingCount} waiting` : "", approvedCount > 0 ? `${approvedCount} approved` : "", activeListings > 0 ? `${activeListings} listing${activeListings === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ") || undefined}
      onBack={() => goBackOr("/(tabs)/feed")}
      right={
        <Pressable onPress={() => router.push({ pathname: "/create-post" as any, params: { type: "listing" } })} hitSlop={8} accessibilityRole="button" accessibilityLabel="New listing"
          style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: tc.inputBg }]}>
          <Ionicons name="add" size={26} color={tc.textPrimary} />
        </Pressable>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.accent} />}
    >
      <Segmented
        style={{ marginHorizontal: 16, marginBottom: 14 }}
        items={[{ key: "applications", label: applications.length ? `Applications · ${applications.length}` : "Applications" }, { key: "listings", label: listings.length ? `Listings · ${listings.length}` : "Listings" }]}
        value={tab}
        onChange={(k) => setTab(k as Tab)}
      />

      {loading ? (
        <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title="Could not load" sub={error} actionLabel="Try again" onAction={() => { void dash.refetch(); }} />
      ) : tab === "applications" ? (
        sortedApps.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No applications yet" sub="When someone applies for one of your homes, it shows up here." />
        ) : sortedApps.map((a, i) => {
          const meta = statusMeta(a.status);
          const rows = appRows(a);
          const name = a.personalInfo?.fullName || "Applicant";
          return (
            <SlideAway key={a.id} i={i} leaving={leaving[a.id]}>
              <PressableScale onPress={() => { setSelectedApp(a); setDecisionNote(""); }} accessibilityRole="button" accessibilityLabel={`${name}, ${meta.label}`} style={[card, { padding: 14 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <PersonAvatar name={name} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{name}</Text>
                    <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>for {a.listingTitle || "your listing"}</Text>
                  </View>
                  {tagD(meta.label, tone(a.status))}
                </View>
                {rows.length ? (
                  <View style={{ marginTop: 12, borderRadius: 16, paddingHorizontal: 12, backgroundColor: tc.inputBg }}>
                    {rows.map(([k, v], j) => (
                      <View key={k} style={[{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 9 }, j > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
                        <Text style={[TYPE.small, { color: tc.textSecondary }]}>{k}</Text>
                        <Text style={[TYPE.small, { color: tc.textPrimary, fontFamily: "Manrope_700Bold", flexShrink: 1, textAlign: "right" }]}>{v}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={[TYPE.small, { color: tc.textTertiary, marginTop: 8, fontSize: 12 }]}>{a.submittedAt ? `Sent ${formatDate(a.submittedAt)}` : `Started ${formatDate(a.createdAt)}`}</Text>
                {a.status === "submitted" || a.status === "under_review" ? (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <SoftButton small block ghost label="Decline" outerStyle={{ flex: 1 }} onPress={() => void quickDecide(a, "rejected")} />
                    <GradientButton small block label="Approve" outerStyle={{ flex: 1 }} onPress={() => void quickDecide(a, "approved")} />
                  </View>
                ) : null}
              </PressableScale>
            </SlideAway>
          );
        })
      ) : listings.length === 0 ? (
        <EmptyState icon="home-outline" title="No listings yet" sub="List a place to start getting applications." actionLabel="List a place" onAction={() => router.push({ pathname: "/create-post" as any, params: { type: "listing" } })} />
      ) : (
        <View style={[card, { marginHorizontal: 16, overflow: "hidden" }]}>
          {listings.map((l, i) => (
            <DRow key={l.id} first={i === 0} icon="home-outline" label={l.title}
              value={[l.price ? `$${Number(l.price).toLocaleString()} /mo` : "", l.bedrooms ? `${l.bedrooms} bed` : ""].filter(Boolean).join(" · ") || undefined}
              onPress={() => router.push({ pathname: "/my-listings" as any })} />
          ))}
        </View>
      )}

      {/* Application detail */}
      <DSheet visible={!!selectedApp} onClose={() => setSelectedApp(null)} title={selectedApp?.listingTitle || "Application"}>
        {selectedApp ? (
          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ marginBottom: 12 }}>{tagD(statusMeta(selectedApp.status).label, tone(selectedApp.status))}</View>
            <View style={[card, { paddingHorizontal: 14 }]}>
              {([
                ["Sent", selectedApp.submittedAt ? formatDate(selectedApp.submittedAt) : ""],
                ["Steps done", `${selectedApp.currentStep} of 5`],
                ["Name", selectedApp.personalInfo?.fullName ?? ""],
                ["Email", selectedApp.personalInfo?.email ?? ""],
                ["Phone", selectedApp.personalInfo?.phone ?? ""],
                ["Employer", selectedApp.personalInfo?.employerName ?? ""],
                ["Job", selectedApp.personalInfo?.jobTitle ?? ""],
                ["Income", selectedApp.financialDetails?.monthlyIncome ? `$${selectedApp.financialDetails.monthlyIncome.toLocaleString()} /mo` : ""],
                ["Rent agreed", selectedApp.agreementTerms?.rentAmount ? `$${selectedApp.agreementTerms.rentAmount.toLocaleString()} /mo` : ""],
                ["Move-in", selectedApp.agreementTerms?.moveInDate ? formatDate(selectedApp.agreementTerms.moveInDate) : ""],
                ["Lease", selectedApp.agreementTerms?.leaseTerm ?? ""],
                ["Your decision", selectedApp.landlordDecision ? (selectedApp.landlordDecision === "approved" ? "Approved" : "Rejected") : ""],
                ["Your note", selectedApp.landlordNote ?? ""],
                ["Decided", selectedApp.decidedAt ? formatDate(selectedApp.decidedAt) : ""],
              ] as [string, string][]).filter(([, v]) => !!v).map(([k, v], j) => (
                <View key={k} style={[{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 11 }, j > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
                  <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
                  <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
                </View>
              ))}
            </View>
            {selectedApp.status === "submitted" || selectedApp.status === "under_review" ? (
              <View style={{ marginTop: 16 }}>
                <TextInput
                  style={[TYPE.body, { minHeight: 70, borderRadius: 16, padding: 14, backgroundColor: tc.inputBg, color: tc.textPrimary, textAlignVertical: "top" }]}
                  placeholder="A note for the applicant (optional)"
                  placeholderTextColor={tc.textTertiary}
                  value={decisionNote}
                  onChangeText={setDecisionNote}
                  multiline
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <SoftButton block ghost label="Decline" outerStyle={{ flex: 1 }} disabled={deciding} onPress={() => void handleDecide("rejected")} />
                  <GradientButton block label="Approve" outerStyle={{ flex: 1 }} loading={deciding} onPress={() => void handleDecide("approved")} />
                </View>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </DSheet>
    </DPage>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const st = createThemedStyles({
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: rs(16), paddingVertical: rs(12), borderBottomWidth: 1,
  },
  backBtn: { width: rs(38), height: rs(38), alignItems: "center", justifyContent: "center" },
  addBtn: { width: rs(38), height: rs(38), alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: rs(16), fontWeight: "700" },

  hero: {
    margin: rs(16), borderRadius: rs(18), padding: rs(18),
    shadowColor: Colors.brand.green, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: rs(6), marginBottom: rs(6) },
  heroLabel: { fontSize: rs(10), fontWeight: "800", color: palette.greenL80, letterSpacing: 2 },
  heroTitle: { fontSize: rs(20), fontWeight: "900", color: palette.white, letterSpacing: -0.3 },
  heroSub: { fontSize: rs(12), color: "rgba(255,255,255,0.85)", marginTop: rs(4), fontWeight: "500" },

  summaryRow: { flexDirection: "row", gap: rs(10), paddingHorizontal: rs(16), marginBottom: rs(16) },
  summaryCard: {
    flex: 1, borderRadius: rs(14), borderWidth: 1, padding: rs(12),
    alignItems: "center", gap: rs(4),
  },
  summaryIconBox: { width: rs(40), height: rs(40), borderRadius: rs(12), alignItems: "center", justifyContent: "center" },
  summaryNum: { fontSize: rs(22), fontWeight: "900" },
  summaryLabel: { fontSize: rs(10), fontWeight: "600" },

  tabRow: {
    flexDirection: "row", marginHorizontal: rs(16), borderRadius: rs(12), padding: rs(4), marginBottom: rs(8),
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(6), paddingVertical: rs(9), borderRadius: rs(10),
  },
  tabBtnActive: { shadowColor: palette.black, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: rs(13), fontWeight: "700" },

  sectionHdr: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    paddingHorizontal: rs(16), paddingVertical: rs(10), borderBottomWidth: 1,
  },
  sectionHdrText: { fontSize: rs(12), fontWeight: "800", letterSpacing: 0.5 },

  appCard: {
    flexDirection: "row", alignItems: "center", gap: rs(12),
    marginHorizontal: rs(16), marginTop: rs(10), borderRadius: rs(14), borderWidth: 1,
    padding: rs(14),
  },
  appCardIconBox: { width: rs(44), height: rs(44), borderRadius: rs(12), alignItems: "center", justifyContent: "center" },
  appCardTitle: { fontSize: rs(14), fontWeight: "700", marginBottom: rs(2) },
  appCardSub: { fontSize: rs(12), marginBottom: rs(2) },
  appCardDate: { fontSize: rs(11) },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  statusText: { fontSize: rs(11), fontWeight: "700" },

  emptyWrap: { alignItems: "center", paddingVertical: rs(40), paddingHorizontal: rs(32) },
  emptyTitle: { fontSize: rs(16), fontWeight: "700", marginTop: rs(12) },
  emptySub: { fontSize: rs(13), textAlign: "center", marginTop: rs(6), lineHeight: rs(18) },
  retryBtn: {
    marginTop: rs(16), paddingVertical: rs(10), paddingHorizontal: rs(24), borderRadius: rs(12),
  },

  // Detail modal sheet
  detailSheet: {
    borderTopLeftRadius: rs(24), borderTopRightRadius: rs(24),
    padding: rs(20), maxHeight: "90%",
  },
  sheetHandle: {
    width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: palette.gray300,
    alignSelf: "center", marginBottom: rs(16),
  },
  detailHeader: { marginBottom: rs(16) },
  detailTitle: { fontSize: rs(18), fontWeight: "800", marginTop: rs(8) },
  detailSub: { fontSize: rs(12), marginTop: rs(4) },

  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: rs(10), borderBottomWidth: StyleSheet.hairlineWidth, gap: rs(12),
  },
  infoLabel: { fontSize: rs(12), fontWeight: "600", flex: 1 },
  infoValue: { fontSize: rs(13), fontWeight: "700", flex: 2, textAlign: "right" },

  decisionTitle: { fontSize: rs(15), fontWeight: "800", marginBottom: rs(10) },
  noteInput: {
    borderWidth: 1.5, borderRadius: rs(12), paddingHorizontal: rs(14), paddingVertical: rs(10),
    fontSize: rs(14), minHeight: rs(72), textAlignVertical: "top", marginBottom: rs(12),
  },
  decisionBtns: { flexDirection: "row", gap: rs(10) },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(6), borderRadius: rs(12), borderWidth: 1.5, borderColor: palette.red600,
    paddingVertical: rs(13), backgroundColor: palette.red50,
  },
  rejectBtnText: { fontSize: rs(14), fontWeight: "700", color: palette.red600 },
  approveGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(6), paddingVertical: rs(13), borderRadius: rs(12),
  },
  approveBtnText: { fontSize: rs(14), fontWeight: "700", color: palette.white },

  closeSheetBtn: {
    marginTop: rs(12), paddingVertical: rs(14), borderRadius: rs(14), alignItems: "center",
  },
  closeSheetText: { fontSize: rs(15), fontWeight: "700" },
});
