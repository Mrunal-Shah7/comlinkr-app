import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { UserBadge } from "../src/store/auth.store";
import { rs } from "../src/utils/responsive";
import { createThemedStyles } from '../src/theme/themedStyles';

type LockStatus = "locked" | "pending" | "rejected";

interface LockedPostCardProps {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  gradient: [string, string];
  lockStatus: LockStatus;
  requiredBadge: UserBadge;
  width: number;
}

const LOCK_COPY: Record<LockStatus, { headline: string; sub: string; btnLabel: string; btnColor: string }> = {
  locked: {
    headline: "Verification Required",
    sub: "Apply for badge to unlock",
    btnLabel: "Apply Now",
    btnColor: "#1A6BAE",
  },
  pending: {
    headline: "Under Review",
    sub: "Application pending — check back in 48h",
    btnLabel: "View Status",
    btnColor: "#F59E0B",
  },
  rejected: {
    headline: "Application Rejected",
    sub: "Review feedback and re-apply",
    btnLabel: "Re-apply",
    btnColor: "#EF4444",
  },
};

export function LockedPostCard({
  id,
  icon,
  label,
  desc,
  color,
  bg,
  gradient,
  lockStatus,
  requiredBadge,
  width,
}: LockedPostCardProps) {
  const copy = LOCK_COPY[lockStatus];

  const handlePress = () => {
    if (lockStatus === "pending") {
      router.push("/verification-status" as any);
    } else {
      router.push({ pathname: "/apply-badge" as any, params: { badgeType: requiredBadge } });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { width, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      {/* Gradient top accent bar — muted */}
      <LinearGradient
        colors={["#D1D5DB", "#9CA3AF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topBar}
      />

      {/* Soft background tint */}
      <View style={[styles.bgTint, { backgroundColor: "#F9FAFB" }]} />

      {/* Lock overlay */}
      <View style={styles.lockOverlay}>
        <View style={[styles.lockCircle, { borderColor: color + "30" }]}>
          <Ionicons
            name={lockStatus === "pending" ? "time" : lockStatus === "rejected" ? "close-circle" : "lock-closed"}
            size={rs(20)}
            color={copy.btnColor}
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Dimmed icon */}
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={["#D1D5DB", "#9CA3AF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBox}
          >
            <Ionicons name={icon as any} size={rs(22)} color="#FFF" />
          </LinearGradient>
        </View>

        {/* Label */}
        <Text style={[styles.label, { color: "#6B7280" }]} numberOfLines={1}>
          {label}
        </Text>

        {/* Lock headline */}
        <Text style={styles.lockHeadline} numberOfLines={1}>{copy.headline}</Text>
        <Text style={styles.lockSub} numberOfLines={2}>{copy.sub}</Text>

        {/* CTA button */}
        <Pressable
          onPress={handlePress}
          style={[styles.ctaBtn, { backgroundColor: copy.btnColor }]}
        >
          <Text style={styles.ctaBtnText}>{copy.btnLabel}</Text>
          <Ionicons name="arrow-forward" size={rs(10)} color="#FFF" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = createThemedStyles({
  card: {
    borderRadius: rs(18),
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    minHeight: rs(160),
    position: "relative",
  },
  topBar: {
    height: rs(4),
    width: "100%",
  },
  bgTint: {
    ...StyleSheet.absoluteFill,
    top: rs(4),
  },
  lockOverlay: {
    position: "absolute",
    top: rs(10),
    right: rs(10),
    zIndex: 2,
  },
  lockCircle: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: rs(14),
    paddingTop: rs(10),
    flex: 1,
  },
  iconWrap: {
    marginBottom: rs(10),
  },
  iconBox: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(12),
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: rs(13),
    fontWeight: "700",
    marginBottom: rs(4),
  },
  lockHeadline: {
    fontSize: rs(11),
    fontWeight: "700",
    color: "#374151",
    marginBottom: rs(2),
  },
  lockSub: {
    fontSize: rs(10),
    fontWeight: "500",
    color: "#9CA3AF",
    lineHeight: rs(13),
    marginBottom: rs(10),
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(4),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderRadius: rs(8),
    alignSelf: "flex-start",
  },
  ctaBtnText: {
    fontSize: rs(10),
    fontWeight: "800",
    color: "#FFF",
  },
});
