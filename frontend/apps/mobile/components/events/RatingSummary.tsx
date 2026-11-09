// SPRINT-42: compact aggregate rating display for event cards/detail (unrated when count=0).
import { palette } from "../../src/theme/palette";
import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hasEventRatings } from "./ratingUtils";
import { createThemedStyles } from '../../src/theme/themedStyles';

export function RatingSummary({
  averageRating,
  totalReviews,
  size = "md",
  tint = palette.amber500,
  mutedColor = palette.gray400,
  textColor,
  style,
  labelStyle,
  showUnratedLabel = false,
}: {
  averageRating: number;
  totalReviews: number;
  size?: "sm" | "md";
  tint?: string;
  mutedColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  /** When true, show “No ratings yet” instead of rendering nothing for unrated events. */
  showUnratedLabel?: boolean;
}) {
  // SPRINT-42:
  const rated = hasEventRatings(averageRating, totalReviews);
  const iconSize = size === "sm" ? 12 : 14;
  const fontSize = size === "sm" ? 11 : 13;

  if (!rated) {
    if (!showUnratedLabel) return null;
    return (
      <View style={[styles.row, style]}>
        <Ionicons name="star-outline" size={iconSize} color={mutedColor} />
        <Text style={[{ fontSize, fontWeight: "600", color: mutedColor }, labelStyle]}>No ratings yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <Ionicons name="star" size={iconSize} color={tint} />
      <Text style={[{ fontSize, fontWeight: "800", color: textColor ?? palette.gray900 }, labelStyle]}>
        {averageRating.toFixed(1)}
      </Text>
      <Text style={[{ fontSize: fontSize - 1, fontWeight: "600", color: mutedColor }, labelStyle]}>
        ({totalReviews})
      </Text>
    </View>
  );
}

const styles = createThemedStyles({
  row: { flexDirection: "row", alignItems: "center", gap: 4 }, // SPRINT-42:
});
