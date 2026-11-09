// SPRINT-42: interactive 1–5 star input for event review composer (restaurant-visual, event-owned).
import { palette } from "../../src/theme/palette";
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function StarRatingInput({
  value,
  onChange,
  size = 32,
  color = palette.amber500,
  disabled = false,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
  color?: string;
  disabled?: boolean;
}) {
  // SPRINT-42:
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          disabled={disabled}
          onPress={() => onChange(star)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${star} ${star === 1 ? "star" : "stars"}`}
          accessibilityState={{ selected: value === star, disabled: !!disabled }}
        >
          <Ionicons name={value >= star ? "star" : "star-outline"} size={size} color={color} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 }, // SPRINT-42:
});
