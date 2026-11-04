import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { UserBadge, VerificationStatus } from "../src/store/auth.store";
import { rs } from "../src/utils/responsive";
import { createThemedStyles } from '../src/theme/themedStyles';

interface BadgeIndicatorProps {
  badge: UserBadge;
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const BADGE_META: Record<UserBadge, { icon: string; label: string; gradient: [string, string] }> = {
  landlord:         { icon: "home",        label: "Verified Landlord",    gradient: ["#0076EB", "#0054CC"] },
  restaurant_owner: { icon: "restaurant",  label: "Verified Business",    gradient: ["#26B324", "#1a8a18"] },
  agency:           { icon: "business",    label: "Verified Agency",      gradient: ["#FF7B00", "#E56800"] },
  local_reviewer:   { icon: "star",        label: "Local Reviewer",       gradient: ["#8B5CF6", "#6D28D9"] },
};

const STATUS_META: Record<VerificationStatus, { icon: string; color: string; bg: string; label: string }> = {
  none:     { icon: "ellipse-outline",  color: "#9CA3AF", bg: "#F3F4F6", label: "Not Applied" },
  pending:  { icon: "time",             color: "#F59E0B", bg: "#FFFBEB", label: "Pending Review" },
  verified: { icon: "checkmark-circle", color: "#26B324", bg: "#EAFBE9", label: "Verified" },
  rejected: { icon: "close-circle",     color: "#EF4444", bg: "#FEF2F2", label: "Not Approved" },
};

const SIZE_MAP = {
  sm: { iconBox: rs(20), iconSize: rs(10), fontSize: rs(10), statusIcon: rs(8) },
  md: { iconBox: rs(28), iconSize: rs(14), fontSize: rs(11), statusIcon: rs(10) },
  lg: { iconBox: rs(36), iconSize: rs(18), fontSize: rs(13), statusIcon: rs(13) },
};

export function BadgeIndicator({ badge, status, size = "md", showLabel = false }: BadgeIndicatorProps) {
  const meta = BADGE_META[badge];
  const statusMeta = STATUS_META[status];
  const sz = SIZE_MAP[size];

  return (
    <View style={styles.wrapper}>
      <View style={{ position: "relative" }}>
        <LinearGradient
          colors={status === "verified" ? meta.gradient : ["#D1D5DB", "#9CA3AF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.iconBox, { width: sz.iconBox, height: sz.iconBox, borderRadius: sz.iconBox / 2 }]}
        >
          <Ionicons name={meta.icon as any} size={sz.iconSize} color="#FFF" />
        </LinearGradient>
        {/* Status dot overlay */}
        <View style={[
          styles.statusDot,
          { backgroundColor: statusMeta.color, width: sz.statusIcon + 2, height: sz.statusIcon + 2, borderRadius: (sz.statusIcon + 2) / 2 },
        ]}>
          <Ionicons name={statusMeta.icon as any} size={sz.statusIcon} color="#FFF" />
        </View>
      </View>
      {showLabel && (
        <View style={[styles.labelPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.labelText, { color: statusMeta.color, fontSize: sz.fontSize }]}>
            {status === "verified" ? meta.label : statusMeta.label}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Compact pill shown on listing/restaurant cards */
export function VerifiedBadgePill({ badge }: { badge: UserBadge }) {
  const meta = BADGE_META[badge];
  return (
    <LinearGradient
      colors={meta.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.pill}
    >
      <Ionicons name={meta.icon as any} size={10} color="#FFF" />
      <Text style={styles.pillText}>{meta.label}</Text>
    </LinearGradient>
  );
}

const styles = createThemedStyles({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
  },
  iconBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  labelPill: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(10),
  },
  labelText: {
    fontWeight: "700",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(8),
  },
  pillText: {
    fontSize: rs(10),
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
  },
});
