import { rs } from "../src/utils/responsive";
import { useState, useCallback, useRef } from "react";
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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect, useFocusEffect } from "expo-router";
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

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { label: string; color: string; bg: string; icon: string }> = {
  draft:        { label: "Draft",        color: "#6B7280", bg: "#F3F4F6",  icon: "document-outline" },
  submitted:    { label: "Submitted",    color: "#0060D0", bg: "#EEF5FF",  icon: "paper-plane-outline" },
  under_review: { label: "Under Review", color: "#D97706", bg: "#FFF8E6",  icon: "hourglass-outline" },
  approved:     { label: "Approved",     color: "#16A34A", bg: "#F0FDF4",  icon: "checkmark-circle" },
  rejected:     { label: "Rejected",     color: "#DC2626", bg: "#FEF2F2",  icon: "close-circle" },
  signed:       { label: "Signed",       color: "#8B5CF6", bg: "#F5F3FF",  icon: "create-outline" },
  withdrawn:    { label: "Withdrawn",    color: "#9CA3AF", bg: "#F9FAFB",  icon: "remove-circle-outline" },
};

function statusMeta(s: ApplicationStatus) {
  return STATUS_META[s] ?? { label: s, color: "#6B7280", bg: "#F3F4F6", icon: "help-circle-outline" };
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main Component ────────────────────────────────────────────────────────────

type Tab = "applications" | "listings";

export default function LandlordDashboard() {
  const { isDark, tc } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>("applications");
  const [applications, setApplications] = useState<PropertyApplication[]>([]);
  const [listings, setListings] = useState<HousingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail modal
  const [selectedApp, setSelectedApp] = useState<PropertyApplication | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [deciding, setDeciding] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [apps, listingsRes] = await Promise.all([
        getReceivedApplications().catch(() => [] as PropertyApplication[]),
        getMyListings({ page: 1, pageSize: 50 }).catch(() => ({ data: [] as HousingListing[] })),
      ]);
      setApplications(apps);
      setListings(Array.isArray((listingsRes as any)?.data) ? (listingsRes as any).data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!loadedRef.current) {
        loadedRef.current = true;
        void loadData();
      }
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData(true);
  }, [loadData]);

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

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: tc.pageBg }]} edges={["top"]}>
      {/* Header */}
      <View style={[st.header, { backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }]}>
        <Pressable style={st.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} hitSlop={10}>
          <Ionicons name="chevron-back" size={rs(22)} color={tc.textPrimary} />
        </Pressable>
        <Text style={[st.headerTitle, { color: tc.textPrimary }]}>Landlord Dashboard</Text>
        <Pressable style={st.addBtn} onPress={() => router.push("/create-post" as any)} hitSlop={10}>
          <Ionicons name="add" size={rs(22)} color={Colors.brand.green} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.green} colors={[Colors.brand.green]} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero */}
        <LinearGradient
          colors={[Colors.brand.greenDark, Colors.brand.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.hero}
        >
          <View style={st.heroRow}>
            <Ionicons name="home" size={rs(12)} color="#A7F3D0" />
            <Text style={st.heroLabel}>LANDLORD SPACE</Text>
          </View>
          <Text style={st.heroTitle}>
            {user?.name?.split(" ")[0] ? `Hi ${user.name.split(" ")[0]},` : "Welcome,"} Manage Your Space
          </Text>
          <Text style={st.heroSub}>Track applications, listings, and tenants all in one place.</Text>
        </LinearGradient>

        {/* Summary cards */}
        <View style={st.summaryRow}>
          {[
            { icon: "time-outline" as const, label: "Pending", value: pendingCount, color: "#D97706", bg: "#FFF8E6" },
            { icon: "checkmark-circle-outline" as const, label: "Approved", value: approvedCount, color: "#16A34A", bg: "#F0FDF4" },
            { icon: "business-outline" as const, label: "Listings", value: activeListings, color: Colors.brand.blue, bg: "#EEF5FF" },
          ].map((s) => (
            <View key={s.label} style={[st.summaryCard, { backgroundColor: isDark ? tc.cardBg : s.bg, borderColor: isDark ? tc.borderLight : `${s.color}30` }]}>
              <View style={[st.summaryIconBox, { backgroundColor: `${s.color}18` }]}>
                <Ionicons name={s.icon} size={rs(20)} color={s.color} />
              </View>
              <Text style={[st.summaryNum, { color: s.color }]}>{s.value}</Text>
              <Text style={[st.summaryLabel, { color: tc.textTertiary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={[st.tabRow, { backgroundColor: isDark ? tc.inputBg : "#F3F4F6" }]}>
          {([["applications", "document-text-outline", "Applications"], ["listings", "home-outline", "My Listings"]] as const).map(([key, icon, label]) => (
            <Pressable
              key={key}
              style={[st.tabBtn, tab === key && st.tabBtnActive, tab === key && { backgroundColor: tc.cardBg }]}
              onPress={() => setTab(key)}
            >
              <Ionicons name={icon} size={rs(14)} color={tab === key ? Colors.brand.green : tc.textTertiary} />
              <Text style={[st.tabBtnText, { color: tab === key ? Colors.brand.greenDark : tc.textTertiary }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.brand.green} />
          </View>
        ) : error ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Ionicons name="alert-circle-outline" size={40} color="#CBD5E1" />
            <Text style={[st.emptyTitle, { color: tc.textSecondary }]}>{error}</Text>
            <Pressable onPress={() => { loadedRef.current = false; void loadData(); }} style={st.retryBtn}>
              <Text style={{ color: Colors.brand.green, fontWeight: "700" }}>Retry</Text>
            </Pressable>
          </View>
        ) : tab === "applications" ? (
          <ApplicationsList
            applications={applications}
            isDark={isDark}
            tc={tc}
            onSelect={(app) => { setSelectedApp(app); setDecisionNote(""); }}
          />
        ) : (
          <ListingsList listings={listings} isDark={isDark} tc={tc} />
        )}
      </ScrollView>

      {/* Application Detail Modal */}
      <Modal
        visible={!!selectedApp}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedApp(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedApp(null)} />
          {selectedApp ? (
            <View style={[st.detailSheet, { backgroundColor: tc.cardBg }]}>
              <View style={st.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Status + title */}
                <View style={st.detailHeader}>
                  <View style={[st.statusBadge, { backgroundColor: statusMeta(selectedApp.status).bg }]}>
                    <Ionicons name={statusMeta(selectedApp.status).icon as any} size={13} color={statusMeta(selectedApp.status).color} />
                    <Text style={[st.statusText, { color: statusMeta(selectedApp.status).color }]}>{statusMeta(selectedApp.status).label}</Text>
                  </View>
                  <Text style={[st.detailTitle, { color: tc.textPrimary }]}>{selectedApp.listingTitle || `Listing #${selectedApp.listingId.slice(0, 8)}`}</Text>
                  <Text style={[st.detailSub, { color: tc.textTertiary }]}>Application ID: {selectedApp.id.slice(0, 12)}…</Text>
                </View>

                {/* Info rows */}
                {[
                  { label: "Submitted", value: formatDate(selectedApp.submittedAt) },
                  { label: "Created", value: formatDate(selectedApp.createdAt) },
                  { label: "Step Completed", value: `Step ${selectedApp.currentStep}/5` },
                  selectedApp.personalInfo?.fullName ? { label: "Applicant Name", value: selectedApp.personalInfo.fullName } : null,
                  selectedApp.personalInfo?.email ? { label: "Email", value: selectedApp.personalInfo.email } : null,
                  selectedApp.personalInfo?.phone ? { label: "Phone", value: selectedApp.personalInfo.phone } : null,
                  selectedApp.personalInfo?.employerName ? { label: "Employer", value: selectedApp.personalInfo.employerName } : null,
                  selectedApp.personalInfo?.jobTitle ? { label: "Job Title", value: selectedApp.personalInfo.jobTitle } : null,
                  selectedApp.financialDetails?.monthlyIncome ? { label: "Monthly Income", value: `$${selectedApp.financialDetails.monthlyIncome.toLocaleString()}` } : null,
                  selectedApp.agreementTerms?.rentAmount ? { label: "Rent Agreed", value: `$${selectedApp.agreementTerms.rentAmount.toLocaleString()}/mo` } : null,
                  selectedApp.agreementTerms?.moveInDate ? { label: "Move-in Date", value: formatDate(selectedApp.agreementTerms.moveInDate) } : null,
                  selectedApp.agreementTerms?.leaseTerm ? { label: "Lease Term", value: selectedApp.agreementTerms.leaseTerm } : null,
                  selectedApp.landlordDecision ? { label: "Your Decision", value: selectedApp.landlordDecision === "approved" ? "✅ Approved" : "❌ Rejected" } : null,
                  selectedApp.landlordNote ? { label: "Your Note", value: selectedApp.landlordNote } : null,
                  selectedApp.decidedAt ? { label: "Decided On", value: formatDate(selectedApp.decidedAt) } : null,
                ].filter(Boolean).map((row) => row && (
                  <View key={row.label} style={[st.infoRow, { borderBottomColor: tc.borderLight }]}>
                    <Text style={[st.infoLabel, { color: tc.textTertiary }]}>{row.label}</Text>
                    <Text style={[st.infoValue, { color: tc.textPrimary }]}>{row.value}</Text>
                  </View>
                ))}

                {/* Decision section — only for actionable statuses */}
                {(selectedApp.status === "submitted" || selectedApp.status === "under_review") ? (
                  <View style={{ paddingTop: 16 }}>
                    <Text style={[st.decisionTitle, { color: tc.textPrimary }]}>Make a Decision</Text>
                    <TextInput
                      style={[st.noteInput, { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]}
                      placeholder="Optional note for applicant…"
                      placeholderTextColor={tc.textTertiary}
                      value={decisionNote}
                      onChangeText={setDecisionNote}
                      multiline
                    />
                    <View style={st.decisionBtns}>
                      <Pressable
                        style={[st.rejectBtn, { opacity: deciding ? 0.6 : 1 }]}
                        onPress={() => void handleDecide("rejected")}
                        disabled={deciding}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                        <Text style={st.rejectBtnText}>Reject</Text>
                      </Pressable>
                      <Pressable
                        style={{ flex: 1, borderRadius: rs(12), overflow: "hidden", opacity: deciding ? 0.6 : 1 }}
                        onPress={() => void handleDecide("approved")}
                        disabled={deciding}
                      >
                        <LinearGradient colors={[Colors.brand.green, Colors.brand.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.approveGrad}>
                          {deciding ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                              <Text style={st.approveBtnText}>Approve</Text>
                            </>
                          )}
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                <View style={{ height: 20 }} />
              </ScrollView>

              <Pressable style={[st.closeSheetBtn, { backgroundColor: isDark ? tc.inputBg : "#F3F4F6" }]} onPress={() => setSelectedApp(null)}>
                <Text style={[st.closeSheetText, { color: tc.textSecondary }]}>Close</Text>
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ApplicationsList({ applications, isDark, tc, onSelect }: {
  applications: PropertyApplication[];
  isDark: boolean;
  tc: any;
  onSelect: (a: PropertyApplication) => void;
}) {
  if (applications.length === 0) {
    return (
      <View style={st.emptyWrap}>
        <Ionicons name="document-outline" size={48} color="#CBD5E1" />
        <Text style={[st.emptyTitle, { color: tc.textSecondary }]}>No applications yet</Text>
        <Text style={[st.emptySub, { color: tc.textTertiary }]}>When tenants apply to your listings, they'll appear here.</Text>
      </View>
    );
  }

  const byStatus = (s: ApplicationStatus) => applications.filter((a) => a.status === s);
  const pending = [...byStatus("submitted"), ...byStatus("under_review")];
  const decided = [...byStatus("approved"), ...byStatus("signed"), ...byStatus("rejected"), ...byStatus("withdrawn")];
  const drafts = byStatus("draft");

  return (
    <View style={{ paddingTop: 4 }}>
      {pending.length > 0 && <SectionHeader title={`Needs Action (${pending.length})`} icon="time-outline" color="#D97706" tc={tc} />}
      {pending.map((a) => <AppCard key={a.id} app={a} isDark={isDark} tc={tc} onPress={() => onSelect(a)} />)}

      {decided.length > 0 && <SectionHeader title={`Decided (${decided.length})`} icon="checkmark-done-outline" color="#16A34A" tc={tc} />}
      {decided.map((a) => <AppCard key={a.id} app={a} isDark={isDark} tc={tc} onPress={() => onSelect(a)} />)}

      {drafts.length > 0 && <SectionHeader title={`Drafts (${drafts.length})`} icon="document-outline" color="#6B7280" tc={tc} />}
      {drafts.map((a) => <AppCard key={a.id} app={a} isDark={isDark} tc={tc} onPress={() => onSelect(a)} />)}
    </View>
  );
}

function SectionHeader({ title, icon, color, tc }: { title: string; icon: string; color: string; tc: any }) {
  return (
    <View style={[st.sectionHdr, { borderBottomColor: tc.borderLight }]}>
      <Ionicons name={icon as any} size={rs(14)} color={color} />
      <Text style={[st.sectionHdrText, { color }]}>{title}</Text>
    </View>
  );
}

function AppCard({ app, isDark, tc, onPress }: { app: PropertyApplication; isDark: boolean; tc: any; onPress: () => void }) {
  const meta = statusMeta(app.status);
  return (
    <Pressable
      style={({ pressed }) => [st.appCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, pressed && { opacity: 0.88 }]}
      onPress={onPress}
    >
      <View style={[st.appCardIconBox, { backgroundColor: `${meta.color}15` }]}>
        <Ionicons name={meta.icon as any} size={rs(22)} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.appCardTitle, { color: tc.textPrimary }]} numberOfLines={1}>
          {app.listingTitle || `Listing #${app.listingId.slice(0, 10)}`}
        </Text>
        {app.personalInfo?.fullName ? (
          <Text style={[st.appCardSub, { color: tc.textSecondary }]} numberOfLines={1}>
            <Ionicons name="person-outline" size={11} color={tc.textTertiary} /> {app.personalInfo.fullName}
          </Text>
        ) : (
          <Text style={[st.appCardSub, { color: tc.textTertiary }]}>Applicant ID: {app.applicantId.slice(0, 10)}…</Text>
        )}
        <Text style={[st.appCardDate, { color: tc.textTertiary }]}>
          {app.submittedAt ? `Submitted ${formatDate(app.submittedAt)}` : `Created ${formatDate(app.createdAt)}`}
        </Text>
      </View>
      <View>
        <View style={[st.statusBadge, { backgroundColor: meta.bg, alignSelf: "flex-end" }]}>
          <Text style={[st.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={rs(16)} color={tc.textTertiary} style={{ marginTop: rs(6), alignSelf: "flex-end" }} />
      </View>
    </Pressable>
  );
}

function ListingsList({ listings, isDark, tc }: { listings: HousingListing[]; isDark: boolean; tc: any }) {
  if (listings.length === 0) {
    return (
      <View style={st.emptyWrap}>
        <Ionicons name="home-outline" size={48} color="#CBD5E1" />
        <Text style={[st.emptyTitle, { color: tc.textSecondary }]}>No listings yet</Text>
        <Text style={[st.emptySub, { color: tc.textTertiary }]}>Create your first property listing to start receiving applications.</Text>
        <Pressable
          onPress={() => router.push("/create-post" as any)}
          style={[st.retryBtn, { backgroundColor: Colors.brand.green + "15" }]}
        >
          <Text style={{ color: Colors.brand.greenDark, fontWeight: "700" }}>+ Add Listing</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 4 }}>
      {listings.map((l) => (
        <Pressable
          key={l.id}
          style={({ pressed }) => [st.appCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, pressed && { opacity: 0.88 }]}
          onPress={() => router.push({ pathname: "/my-listings" as any })}
        >
          <View style={[st.appCardIconBox, { backgroundColor: Colors.brand.blue + "15" }]}>
            <Ionicons name="home-outline" size={rs(22)} color={Colors.brand.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.appCardTitle, { color: tc.textPrimary }]} numberOfLines={1}>{l.title}</Text>
            <Text style={[st.appCardSub, { color: tc.textSecondary }]} numberOfLines={1}>
              {l.address || l.location || l.neighborhood || "—"}
            </Text>
            <Text style={[st.appCardDate, { color: tc.textTertiary }]}>
              {l.price ? `$${Number(l.price).toLocaleString()}/mo` : "Price TBD"}
              {l.bedrooms ? ` · ${l.bedrooms} bed` : ""}
              {l.bathrooms ? ` · ${l.bathrooms} bath` : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={rs(16)} color={tc.textTertiary} />
        </Pressable>
      ))}
    </View>
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
  heroLabel: { fontSize: rs(10), fontWeight: "800", color: "#A7F3D0", letterSpacing: 2 },
  heroTitle: { fontSize: rs(20), fontWeight: "900", color: "#FFF", letterSpacing: -0.3 },
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
  tabBtnActive: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
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
    width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: "#D1D5DB",
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
    gap: rs(6), borderRadius: rs(12), borderWidth: 1.5, borderColor: "#DC2626",
    paddingVertical: rs(13), backgroundColor: "#FEF2F2",
  },
  rejectBtnText: { fontSize: rs(14), fontWeight: "700", color: "#DC2626" },
  approveGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(6), paddingVertical: rs(13), borderRadius: rs(12),
  },
  approveBtnText: { fontSize: rs(14), fontWeight: "700", color: "#FFF" },

  closeSheetBtn: {
    marginTop: rs(12), paddingVertical: rs(14), borderRadius: rs(14), alignItems: "center",
  },
  closeSheetText: { fontSize: rs(15), fontWeight: "700" },
});
