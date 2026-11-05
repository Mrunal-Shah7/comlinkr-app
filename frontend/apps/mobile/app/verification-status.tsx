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
import { TYPE } from '../src/theme/d';
import { GradientButton, GradientFill, Reveal, SoftButton } from '../src/shared/d';
import { DPage, DRow, goBackOr } from '../src/shared/d/Page';

const BADGE_META: Record<string, { label: string; icon: string; gradient: [string, string]; unlocks: string }> = {
  landlord:         { label: "Verified landlord",         icon: "home",       gradient: ["#1A6BAE", "#0054CC"], unlocks: "Post housing listings & manage properties" },
  restaurant_owner: { label: "Verified restaurant owner", icon: "restaurant", gradient: ["#30855B", "#256B49"], unlocks: "List & manage your restaurant" },
  agency:           { label: "Verified agency",           icon: "business",   gradient: ["#257A86", "#E56800"], unlocks: "Post unlimited listings with agency branding" },
  local_reviewer:   { label: "Local reviewer",            icon: "star",       gradient: ["#8B5CF6", "#6D3FD1"], unlocks: "Share trusted local reviews & recommendations" },
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
    label: "Not applied",
    icon: "ellipse-outline",
    color: "#9CA3AF",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    desc: "Apply for this badge to show verified trust on your listings and profile.",
  },
  pending: {
    label: "In review",
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
    label: "Not approved",
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

  const tone = status === "verified" ? { bg: tc.mintSoft, fg: tc.successText } : status === "pending" ? { bg: tc.warningBg, fg: tc.warningText } : status === "rejected" ? { bg: "rgba(239,68,68,0.12)", fg: tc.dangerText } : { bg: tc.inputBg, fg: tc.textSecondary };
  const ICON: Record<string, keyof typeof Ionicons.glyphMap> = { landlord: "home-outline", restaurant_owner: "restaurant-outline", agency: "business-outline", local_reviewer: "star-outline" };
  const steps: [string, "done" | "cur" | "todo"][] = [["Application sent", "done"], ["Being reviewed", "cur"], ["Badge on your profile", "todo"]];
  return (
    <Reveal style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {status === "verified" ? (
          <GradientFill style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }}><Ionicons name={ICON[badge] ?? "ribbon-outline"} size={20} color="#fff" /></GradientFill>
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}><Ionicons name={ICON[badge] ?? "ribbon-outline"} size={20} color={tc.accentText} /></View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{meta.label}</Text>
          <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={2}>{meta.unlocks}</Text>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: tone.bg }}><Text style={[TYPE.label, { fontSize: 11, color: tone.fg }]}>{statusCfg.label}</Text></View>
      </View>

      {status === "pending" ? (
        <View style={{ marginTop: 14, marginLeft: 6 }}>
          {steps.map(([t, st], i) => (
            <View key={t} style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center", width: 16 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, marginTop: 3, backgroundColor: st === "done" ? tc.mint : st === "cur" ? tc.accent : tc.surface3, borderWidth: st === "cur" ? 3 : 0, borderColor: tc.accentSoft }} />
                {i < steps.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: st === "done" ? tc.mint : tc.surface3, marginVertical: 2 }} /> : null}
              </View>
              <View style={{ paddingBottom: 14, flex: 1 }}>
                <Text style={[TYPE.bodyStrong, { color: st === "todo" ? tc.textTertiary : tc.textPrimary, fontSize: 14 }]}>{t}</Text>
                {st === "cur" ? <Text style={[TYPE.small, { color: tc.textTertiary }]}>Usually within 48 hours</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 10 }]}>{statusCfg.desc}</Text>
      )}

      {status === "rejected" && rejectionReason ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10, padding: 10, borderRadius: 14, backgroundColor: "rgba(239,68,68,0.10)" }}>
          <Ionicons name="information-circle" size={16} color={tc.dangerText} />
          <Text style={[TYPE.small, { flex: 1, color: tc.textPrimary }]}>{rejectionReason}</Text>
        </View>
      ) : null}

      {status === "none" || status === "rejected" ? (
        <GradientButton small label={status === "rejected" ? "Apply again" : "Apply"} onPress={onApply} style={{ marginTop: 12 }} />
      ) : null}
      {status === "pending" && onWithdraw ? (
        <SoftButton small ghost label={withdrawing ? "Withdrawing…" : "Withdraw application"} disabled={withdrawing} onPress={onWithdraw} />
      ) : null}
      {status === "pending" && __DEV__ ? (
        <Pressable onPress={onDemo} hitSlop={6} style={{ marginTop: 10 }}><Text style={[TYPE.small, { color: tc.textTertiary, fontSize: 11.5 }]}>Dev only: simulate approval</Text></Pressable>
      ) : null}
    </Reveal>
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

  const PROTECT: [keyof typeof Ionicons.glyphMap, string][] = [
    ["person-circle-outline", "Every landlord and restaurant is identity-checked before posting."],
    ["map-outline", "UK homes are checked against the Land Registry and the EPC register."],
    ["navigate-outline", "US homes are checked against official address records."],
    ["flag-outline", "Three or more reports hide a suspicious listing straight away."],
    ["ban-outline", "A revoked badge is gone for good, from that moment."],
  ];
  return (
    <DPage title="Badge status" sub="Badges show people they can trust you." onBack={() => goBackOr("/(tabs)/feed")}>
      {loading ? <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 40 }} /> : badges.map((badge) => (
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
      ))}

      <Text style={[TYPE.overline, { color: tc.textTertiary, marginHorizontal: 30, marginTop: 16, marginBottom: 6 }]}>How we keep it safe</Text>
      <View style={{ marginHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
        {PROTECT.map(([icon, text], i) => (
          <View key={text} style={[{ flexDirection: "row", gap: 12, padding: 14, alignItems: "center" }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}><Ionicons name={icon} size={17} color={tc.accentText} /></View>
            <Text style={[TYPE.small, { flex: 1, color: tc.textSecondary }]}>{text}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginHorizontal: 16, marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
        <DRow first icon="help-circle-outline" label="Help with an application" value="support@comlinkr.com" onPress={() => router.push("/help-support" as any)} />
      </View>
    </DPage>
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
