import { rs } from "../src/utils/responsive";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../src/store/auth.store";
import { Colors } from "../src/theme/colors";
import type { VerificationStatus, UserBadge } from "../src/store/auth.store";
import { useTheme } from "../src/theme/useTheme";
import {
  getMyBadgeStatus,
  getBadgeApplicationById,
  withdrawBadgeApplication,
  apiBadgeTypeToUserKey,
  userBadgeKeyToApi,
  type MyBadgeStatusRow,
} from "../src/api/badges.api";
import { ApiError } from "../src/api/client";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';

const BADGE_META: Record<string, { label: string; icon: string; gradient: [string, string]; unlocks: string }> = {
  landlord:         { label: "Verified Landlord",         icon: "home",       gradient: ["#0076EB", "#0054CC"], unlocks: "Post housing listings & manage properties" },
  restaurant_owner: { label: "Verified Restaurant Owner", icon: "restaurant", gradient: ["#26B324", "#1a8a18"], unlocks: "List & manage your restaurant" },
  agency:           { label: "Verified Agency",           icon: "business",   gradient: ["#FF7B00", "#E56800"], unlocks: "Post unlimited listings with agency branding" },
  local_reviewer:   { label: "Local Reviewer",            icon: "star",       gradient: ["#8B5CF6", "#6D3FD1"], unlocks: "Share trusted local reviews & recommendations" },
};

const STATUS_CONFIG: Record<VerificationStatus, {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
}> = {
  none: {
    label: "Not Applied",
    icon: "ellipse-outline",
    color: "#9CA3AF",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    desc: "Apply for this badge to show verified trust on your listings and profile.",
  },
  pending: {
    label: "Under Review",
    icon: "time",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    desc: "Your application is being reviewed by our team. You'll be notified within 48 hours.",
  },
  verified: {
    label: "Verified",
    icon: "checkmark-circle",
    color: "#16A34A",
    bg: "#F0FDF4",
    border: "#86EFAC",
    desc: "Your badge is active. You have full access to all associated features.",
  },
  rejected: {
    label: "Not Approved",
    icon: "close-circle",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    desc: "Your application was not approved. You can review the reason below and re-apply.",
  },
};

function BadgeStatusCard({
  badge,
  status,
  rejectionReason,
  onApply,
  onDemo,
  onWithdraw,
  withdrawing,
}: {
  badge: string;
  status: VerificationStatus;
  rejectionReason?: string;
  onApply: () => void;
  onDemo: () => void;
  onWithdraw?: () => void;
  withdrawing?: boolean;
}) {
  const meta = BADGE_META[badge];
  const statusCfg = STATUS_CONFIG[status];
  const { isDark, tc } = useTheme();

  return (
    <View style={[styles.statusCard, { borderColor: isDark ? tc.borderLight : statusCfg.border, backgroundColor: isDark ? tc.cardBg : statusCfg.bg }]}>
      {/* Badge header */}
      <View style={styles.statusCardHeader}>
        <LinearGradient
          colors={status === "verified" ? meta.gradient : ["#D1D5DB", "#9CA3AF"]}
          style={styles.badgeIconBox}
        >
          <Ionicons name={meta.icon as any} size={18} color="#FFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.badgeLabel, { color: tc.textPrimary }]}>{meta.label}</Text>
          <Text style={[styles.badgeUnlocks, { color: tc.textSecondary }]} numberOfLines={1}>{meta.unlocks}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusCfg.color + "18" }]}>
          <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.color} />
          <Text style={[styles.statusPillText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Status description */}
      <Text style={[styles.statusDesc, { color: tc.textSecondary }]}>{statusCfg.desc}</Text>

      {/* Rejection reason */}
      {status === "rejected" && rejectionReason && (
        <View style={[styles.rejectionBox, isDark && { backgroundColor: "#3B0A0A" }]}>
          <Ionicons name="information-circle" size={14} color="#DC2626" />
          <Text style={[styles.rejectionText, isDark && { color: "#FCA5A5" }]}>{rejectionReason}</Text>
        </View>
      )}

      {/* Verified — celebration banner */}
      {status === "verified" && (
        <View style={[styles.verifiedFeatures, isDark && { backgroundColor: "#0A2E18" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={[styles.verifiedClaimedTitle, isDark && { color: "#86EFAC" }]}>Badge Claimed & Verified!</Text>
          </View>
          <Text style={[styles.verifiedFeaturesText, isDark && { color: "#86EFAC" }]}>
            All features are unlocked and active. Your {meta.label} badge is publicly shown on your profile and listings.
          </Text>
        </View>
      )}

      {/* CTA buttons */}
      <View style={styles.statusCardActions}>
        {(status === "none" || status === "rejected") && (
          <Pressable
            onPress={onApply}
            style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.8 }]}
          >
            <LinearGradient
              colors={meta.gradient}
              style={styles.applyBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name={status === "rejected" ? "refresh" : "arrow-forward-circle"} size={14} color="#FFF" />
              <Text style={styles.applyBtnText}>
                {status === "rejected" ? "Re-apply" : "Apply Now"}
              </Text>
            </LinearGradient>
          </Pressable>
        )}

        {status === "pending" && (
          <View style={{ flex: 1, gap: rs(8) }}>
            <View style={styles.pendingNote}>
              <Ionicons name="time-outline" size={14} color="#D97706" />
              <Text style={styles.pendingNoteText}>Estimated: within 48 hours</Text>
            </View>
            {onWithdraw ? (
              <Pressable
                onPress={onWithdraw}
                disabled={withdrawing}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center", gap: rs(6), alignSelf: "flex-start" },
                  (pressed || withdrawing) && { opacity: 0.6 },
                ]}
              >
                {withdrawing ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
                )}
                <Text style={{ fontSize: rs(12), color: "#DC2626", fontWeight: "700" }}>Withdraw application</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* Demo: simulate approval (dev only) */}
        {status === "pending" && __DEV__ && (
          <Pressable onPress={onDemo} style={[styles.demoBtn, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
            <Ionicons name="flash" size={11} color={tc.textTertiary} />
            <Text style={[styles.demoBtnText, { color: tc.textTertiary }]}>Demo: Simulate Approval</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function mapRowToVerificationStatus(row: MyBadgeStatusRow | undefined): VerificationStatus {
  if (!row) return "none";
  switch (row.status) {
    case "APPROVED":
      return "verified";
    case "PENDING":
      return "pending";
    case "REJECTED":
      return "rejected";
    default:
      return "none";
  }
}

export default function VerificationStatusScreen() {
  const user = useAuthStore((s) => s.user);
  const updateBadgeStatus = useAuthStore((s) => s.updateBadgeStatus);
  const [statusRows, setStatusRows] = useState<MyBadgeStatusRow[]>([]);
  const [rejections, setRejections] = useState<Partial<Record<UserBadge, string>>>({});
  const [loading, setLoading] = useState(true);
  const [withdrawingBadge, setWithdrawingBadge] = useState<UserBadge | null>(null);

  const badges: UserBadge[] = ["landlord", "restaurant_owner", "agency", "local_reviewer"];

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMyBadgeStatus();
      setStatusRows(list);
      const r: Partial<Record<UserBadge, string>> = {};
      for (const row of list) {
        if (row.status === "REJECTED" && row.latestApplication?.id) {
          try {
            const detail = await getBadgeApplicationById(row.latestApplication.id);
            if (detail.adminNotes?.trim()) {
              r[apiBadgeTypeToUserKey(row.badgeType)] = detail.adminNotes.trim();
            }
          } catch {
            /* ignore */
          }
        }
      }
      setRejections(r);
    } catch {
      setStatusRows([]);
      setRejections({});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus])
  );

  const handleWithdraw = (badge: UserBadge) => {
    const row = statusRows.find((x) => x.badgeType === userBadgeKeyToApi(badge));
    const applicationId = row?.latestApplication?.id;
    if (!applicationId) return;
    appAlert(
      "Withdraw application?",
      "You can re-apply at any time after withdrawing.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            setWithdrawingBadge(badge);
            try {
              await withdrawBadgeApplication(applicationId);
              await loadStatus();
            } catch (err) {
              appAlert(
                "Could not withdraw",
                err instanceof ApiError ? err.message : "Please try again.",
              );
            } finally {
              setWithdrawingBadge(null);
            }
          },
        },
      ],
    );
  };

  const verificationStatus = (badge: UserBadge): VerificationStatus => {
    const row = statusRows.find((x) => x.badgeType === userBadgeKeyToApi(badge));
    return mapRowToVerificationStatus(row);
  };

  const handleApply = (badge: UserBadge) => {
    router.push({ pathname: "/apply-badge" as any, params: { badgeType: badge } });
  };

  const handleDemoApprove = (badge: UserBadge) => {
    appAlert(
      "Demo Mode",
      "Simulate admin approval for demonstration purposes?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            await updateBadgeStatus(badge, "verified");
            appAlert("Approved!", `Your ${BADGE_META[badge].label} badge is now active.`);
          },
        },
      ]
    );
  };

  const { isDark, tc } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: tc.sectionBg }, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>My Verification</Text>
          <Text style={[styles.headerSub, { color: tc.textSecondary }]}>Badge status & applications</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro card */}
        <LinearGradient
          colors={["#0076EB", "#26B324"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.introCard}
        >
          <Ionicons name="shield-checkmark" size={28} color="#FFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>ComLinkr Badges</Text>
            <Text style={styles.introDesc}>
              Badges show other members that landlords, restaurant owners and agencies are verified by our team.
            </Text>
          </View>
        </LinearGradient>

        {/* Badge status cards */}
        <Text style={[styles.sectionLabel, { color: tc.textTertiary }]}>BADGE STATUS</Text>

        {loading ? (
          <View style={{ paddingVertical: rs(28), alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.brand.blue} />
          </View>
        ) : (
          badges.map((badge) => (
            <BadgeStatusCard
              key={badge}
              badge={badge}
              status={verificationStatus(badge)}
              rejectionReason={rejections[badge]}
              onApply={() => handleApply(badge)}
              onDemo={() => handleDemoApprove(badge)}
              onWithdraw={() => handleWithdraw(badge)}
              withdrawing={withdrawingBadge === badge}
            />
          ))
        )}

        {/* Marketplace trust section */}
        <Text style={[styles.sectionLabel, { color: tc.textTertiary }]}>MARKETPLACE PROTECTION</Text>
        <View style={[styles.protectionCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <View style={styles.protectionHeader}>
            <LinearGradient colors={["#DC2626", "#EF4444"]} style={styles.protectionIcon}>
              <Ionicons name="shield" size={16} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.protectionTitle, { color: tc.textPrimary }]}>How We Protect Users</Text>
          </View>
          {[
            { icon: "checkmark-circle", text: "Every landlord & restaurant is identity-verified before posting" },
            { icon: "checkmark-circle", text: "UK properties cross-checked against Land Registry & EPC Register" },
            { icon: "checkmark-circle", text: "US properties validated against official address databases" },
            { icon: "checkmark-circle", text: "Community flagging: 3+ reports auto-hide a suspicious listing" },
            { icon: "checkmark-circle", text: "All badge revocations are permanent and immediately effective" },
          ].map((item, i) => (
            <View key={i} style={styles.protectionRow}>
              <Ionicons name={item.icon as any} size={14} color="#26B324" />
              <Text style={[styles.protectionText, { color: tc.textSecondary }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Help */}
        <View style={[styles.helpCard, { backgroundColor: isDark ? tc.pillBg : "#EEF5FF", borderColor: isDark ? tc.borderLight : "#BFDBFE" }]}>
          <Ionicons name="help-circle-outline" size={20} color={Colors.brand.blue} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.helpTitle, { color: isDark ? tc.textPrimary : "#1E40AF" }]}>Need help with your application?</Text>
            <Text style={[styles.helpDesc, { color: isDark ? tc.textSecondary : "#3B82F6" }]}>Contact our verification team at support@comlinkr.com</Text>
          </View>
          <Pressable onPress={() => router.push("/help-support" as any)}>
            <Text style={styles.helpLink}>Get Help</Text>
          </Pressable>
        </View>

        <View style={{ height: rs(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(14),
    paddingTop: rs(12),
    paddingBottom: rs(14),
    gap: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: rs(4),
    elevation: 2,
  },
  backBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: rs(17), fontWeight: "800", color: "#0A2540", letterSpacing: -0.3 },
  headerSub: { fontSize: rs(12), color: "#6B7280", marginTop: rs(1) },
  scroll: { paddingHorizontal: rs(16), paddingTop: rs(16) },

  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(14),
    padding: rs(16),
    borderRadius: rs(16),
    marginBottom: rs(20),
  },
  introTitle: { fontSize: rs(15), fontWeight: "800", color: "#FFF", marginBottom: rs(4) },
  introDesc: { fontSize: rs(12), color: "rgba(255,255,255,0.85)", lineHeight: rs(17) },

  sectionLabel: {
    fontSize: rs(11),
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: rs(10),
    marginTop: rs(4),
  },

  statusCard: {
    borderRadius: rs(16),
    borderWidth: 1.5,
    padding: rs(14),
    marginBottom: rs(12),
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    marginBottom: rs(10),
  },
  badgeIconBox: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(12),
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: { fontSize: rs(14), fontWeight: "800", color: "#0A2540", marginBottom: rs(2) },
  badgeUnlocks: { fontSize: rs(11), color: "#6B7280", fontWeight: "500" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(10),
  },
  statusPillText: { fontSize: rs(10), fontWeight: "800" },
  statusDesc: { fontSize: rs(12), color: "#4B5563", lineHeight: rs(17), marginBottom: rs(10) },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(6),
    backgroundColor: "#FEE2E2",
    padding: rs(10),
    borderRadius: rs(10),
    marginBottom: rs(10),
  },
  rejectionText: { flex: 1, fontSize: rs(12), color: "#991B1B", lineHeight: rs(16) },
  verifiedFeatures: {
    flexDirection: "column",
    backgroundColor: "#DCFCE7",
    padding: rs(10),
    borderRadius: rs(10),
    marginBottom: rs(10),
    gap: rs(4),
  },
  verifiedClaimedTitle: { fontSize: rs(13), fontWeight: "800", color: "#166534" },
  verifiedFeaturesText: { fontSize: rs(12), color: "#166534", fontWeight: "600", lineHeight: rs(17) },
  statusCardActions: { flexDirection: "row", alignItems: "center", gap: rs(10), flexWrap: "wrap" },
  applyBtn: { borderRadius: rs(10), overflow: "hidden" },
  applyBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(6),
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
  },
  applyBtnText: { fontSize: rs(12), fontWeight: "800", color: "#FFF" },
  pendingNote: { flexDirection: "row", alignItems: "center", gap: rs(6) },
  pendingNoteText: { fontSize: rs(12), color: "#D97706", fontWeight: "600" },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderRadius: rs(8),
    borderWidth: 1,
  },
  demoBtnText: { fontSize: rs(10), fontWeight: "600" },

  protectionCard: {
    borderRadius: rs(16),
    borderWidth: 1.5,
    padding: rs(14),
    marginBottom: rs(12),
  },
  protectionHeader: { flexDirection: "row", alignItems: "center", gap: rs(10), marginBottom: rs(12) },
  protectionIcon: { width: rs(32), height: rs(32), borderRadius: rs(10), alignItems: "center", justifyContent: "center" },
  protectionTitle: { fontSize: rs(14), fontWeight: "800", color: "#0A2540" },
  protectionRow: { flexDirection: "row", alignItems: "flex-start", gap: rs(8), marginBottom: rs(8) },
  protectionText: { flex: 1, fontSize: rs(13), color: "#374151", lineHeight: rs(18) },

  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    padding: rs(14),
    borderRadius: rs(14),
    borderWidth: 1,
    marginBottom: rs(4),
  },
  helpTitle: { fontSize: rs(13), fontWeight: "700", marginBottom: rs(2) },
  helpDesc: { fontSize: rs(11) },
  helpLink: { fontSize: rs(12), fontWeight: "800", color: Colors.brand.blue },
});
