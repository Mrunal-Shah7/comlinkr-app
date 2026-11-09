// SPRINT-42: single event review row with FadeImage avatar (not coupled to restaurant data).
import { palette } from "../../src/theme/palette";
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FadeImage } from "../FadeImage";
import { LinkifiedText } from "../LinkifiedText";
import { resolveApiAssetUrl } from "../../src/api/feed.api";
import type { EventReview } from "../../src/api/events.api";
import { useTheme } from "../../src/theme/useTheme";

export function ReviewRow({
  review,
  canDelete,
  onDelete,
}: {
  review: EventReview;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  // SPRINT-42:
  const { tc, isDark } = useTheme();
  const full = Math.min(5, Math.max(0, Math.floor(review.rating)));
  const avatar = review.author.avatarUrl ? resolveApiAssetUrl(review.author.avatarUrl) : undefined;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? tc.sectionBg : palette.gray50 }]}>
      <View style={styles.header}>
        {avatar ? (
          <FadeImage uri={avatar} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPh, { backgroundColor: tc.inputBg }]}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: tc.textSecondary }}>
              {(review.author.name || "?").slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: tc.textPrimary }]} numberOfLines={1}>
            {review.author.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={{ color: palette.amber500, fontSize: 13 }}>
              {"★".repeat(full)}
              {"☆".repeat(5 - full)}
            </Text>
            <Text style={[styles.time, { color: tc.textTertiary }]}>
              {review.createdAt ? new Date(review.createdAt).toLocaleString() : ""}
            </Text>
          </View>
        </View>
        {canDelete && onDelete ? (
          <Pressable accessibilityLabel="Delete review" onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={palette.red600} />
          </Pressable>
        ) : null}
      </View>
      {!!review.content?.trim() && (
        <LinkifiedText text={review.content} style={[styles.body, { color: tc.textSecondary }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 12, marginBottom: 10 }, // SPRINT-42:
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, // SPRINT-42:
  avatar: { width: 36, height: 36, borderRadius: 18 }, // SPRINT-42:
  avatarPh: { alignItems: "center", justifyContent: "center" }, // SPRINT-42:
  name: { fontSize: 13, fontWeight: "700", marginBottom: 2 }, // SPRINT-42:
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }, // SPRINT-42:
  time: { fontSize: 11, fontWeight: "500" }, // SPRINT-42:
  body: { fontSize: 13, lineHeight: 19, marginTop: 8 }, // SPRINT-42:
});
