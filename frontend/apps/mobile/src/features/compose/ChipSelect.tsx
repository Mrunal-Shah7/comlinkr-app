// Split out of app/create-post.tsx (TR-013, point 9b).
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { createThemedStyles } from "../../theme/themedStyles";
import { PressableScale } from "../../shared/d";

// ── Chip selectors ─────────────────────────────────────────────────────────────
export function ChipSelect({
  options,
  value,
  onChange,
  color,
  bg,
  scroll,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  color: string;
  bg: string;
  /** One horizontally scrolling row instead of a tall wrapping block (long category lists). */
  scroll?: boolean;
}) {
  const { tc, isDark } = useTheme();
  const activeBg = isDark ? color + "2E" : bg;
  const Wrap = scroll ? ScrollView : View;
  const wrapProps = scroll
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: ch.scrollRow }
    : { style: ch.row };
  return (
    <Wrap {...(wrapProps as any)}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <PressableScale
            key={opt}
            scaleTo={0.94}
            style={[ch.chip, { backgroundColor: tc.cardBg, borderColor: tc.borderMedium }, active && { backgroundColor: tc.mint, borderColor: tc.mint }]}
            onPress={() => onChange(active ? "" : opt)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            
            <Text style={[ch.chipText, { color: active ? "#fff" : tc.textPrimary }]}>
              {opt}
            </Text>
          </PressableScale>
        );
      })}
    </Wrap>
  );
}

export function ChipMulti({
  options,
  value,
  onChange,
  color,
  bg,
  scroll,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  color: string;
  bg: string;
  /** One horizontally scrolling row instead of a tall wrapping block (long category lists). */
  scroll?: boolean;
}) {
  const { tc, isDark } = useTheme();
  const activeBg = isDark ? color + "2E" : bg;
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((x) => x !== opt) : [...value, opt]);
  };
  const Wrap = scroll ? ScrollView : View;
  const wrapProps = scroll
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: ch.scrollRow }
    : { style: ch.row };
  return (
    <Wrap {...(wrapProps as any)}>
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <PressableScale
            key={opt}
            scaleTo={0.94}
            style={[ch.chip, { backgroundColor: tc.cardBg, borderColor: tc.borderMedium }, active && { backgroundColor: tc.mint, borderColor: tc.mint }]}
            onPress={() => toggle(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {active && <Ionicons name="checkmark" size={13} color="#fff" style={{ marginRight: 3 }} />}
            <Text style={[ch.chipText, { color: active ? "#fff" : tc.textPrimary }]}>
              {opt}
            </Text>
          </PressableScale>
        );
      })}
    </Wrap>
  );
}

export const ch = createThemedStyles({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scrollRow: { flexDirection: "row", gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E5EF",
    backgroundColor: "#F5F7FB",
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#5A6A7E",
  },
});
