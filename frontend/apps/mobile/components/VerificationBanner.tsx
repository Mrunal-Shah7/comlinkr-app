import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { UserBadge, VerificationStatus } from "../src/store/auth.store";
import { rs } from "../src/utils/responsive";
import { createThemedStyles } from '../src/theme/themedStyles';

interface VerificationBannerProps {
  badge: UserBadge;
  status: VerificationStatus;
  rejectionReason?: string;
}

const BADGE_LABEL: Record<UserBadge, string> = {
  landlord:         "Landlord",
  restaurant_owner: "Restaurant Owner",
  agency:           "Agency",
  local_reviewer:   "Local Reviewer",
};

export function VerificationBanner({ badge, status, rejectionReason }: VerificationBannerProps) {
  if (status === "none") return null;

  const label = BADGE_LABEL[badge];

  if (status === "pending") {
    return (
      <View style={[styles.banner, styles.pendingBanner]}>
        <LinearGradient colors={["#FFFBEB", "#FEF3C7"]} style={styles.bannerBg} />
        <View style={[styles.iconBox, { backgroundColor: "#F59E0B" }]}>
          <Ionicons name="time" size={rs(14)} color="#FFF" />
        </View>
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { color: "#92400E" }]}>
            {label} Verification Pending
          </Text>
          <Text style={[styles.bannerDesc, { color: "#78350F" }]}>
            Our team is reviewing your application. You'll be notified within 48 hours.
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/verification-status" as any)}
          style={({ pressed }) => [styles.checkBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.checkBtnText}>Check</Text>
        </Pressable>
      </View>
    );
  }

  if (status === "verified") {
    return (
      <View style={[styles.banner, styles.verifiedBanner]}>
        <LinearGradient colors={["#E3F1EA", "#DCFCE7"]} style={styles.bannerBg} />
        <View style={[styles.iconBox, { backgroundColor: "#30855B" }]}>
          <Ionicons name="checkmark-circle" size={rs(14)} color="#FFF" />
        </View>
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { color: "#14532D" }]}>
            Verified {label}
          </Text>
          <Text style={[styles.bannerDesc, { color: "#166534" }]}>
            Your badge is active. You can now post and manage your listings.
          </Text>
        </View>
      </View>
    );
  }

  if (status === "rejected") {
    return (
      <View style={[styles.banner, styles.rejectedBanner]}>
        <LinearGradient colors={["#FEF2F2", "#FEE2E2"]} style={styles.bannerBg} />
        <View style={[styles.iconBox, { backgroundColor: "#EF4444" }]}>
          <Ionicons name="close-circle" size={rs(14)} color="#FFF" />
        </View>
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { color: "#7F1D1D" }]}>
            {label} Application Not Approved
          </Text>
          {rejectionReason ? (
            <Text style={[styles.bannerDesc, { color: "#991B1B" }]} numberOfLines={2}>
              Reason: {rejectionReason}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push({ pathname: "/apply-badge" as any, params: { badgeType: badge } })}
          style={({ pressed }) => [styles.reapplyBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.reapplyBtnText}>Re-apply</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = createThemedStyles({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    padding: rs(12),
    borderRadius: rs(14),
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    marginBottom: rs(12),
  },
  bannerBg: {
    ...StyleSheet.absoluteFill,
  },
  pendingBanner: { borderColor: "#FDE68A" },
  verifiedBanner: { borderColor: "#86EFAC" },
  rejectedBanner: { borderColor: "#FECACA" },
  iconBox: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: rs(12),
    fontWeight: "700",
    marginBottom: 2,
  },
  bannerDesc: {
    fontSize: rs(11),
    fontWeight: "500",
    lineHeight: rs(15),
  },
  checkBtn: {
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderRadius: rs(8),
    backgroundColor: "#F59E0B",
  },
  checkBtnText: {
    fontSize: rs(11),
    fontWeight: "800",
    color: "#FFF",
  },
  reapplyBtn: {
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderRadius: rs(8),
    backgroundColor: "#EF4444",
  },
  reapplyBtnText: {
    fontSize: rs(11),
    fontWeight: "800",
    color: "#FFF",
  },
});
