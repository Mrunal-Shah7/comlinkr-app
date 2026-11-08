import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { TYPE, body, display } from "../../../theme/d";
import { GradientFill } from "../../../shared/d";
import { type WyrCardModel } from "../models";

/** One option: after a vote its bar fills to the share of votes (withTiming 800 ms) and the % fades in. */
function Option({ label, pct, voted, mine, onPress }: { label: string; pct: number; voted: boolean; mine: boolean; onPress: () => void }) {
  const { tc } = useTheme();
  const w = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(voted ? pct : 0, { duration: 800, easing: Easing.out(Easing.cubic) }));
    o.set(withTiming(voted ? 1 : 0, { duration: 400 }));
  }, [voted, pct, w, o]);
  const bar = useAnimatedStyle(() => ({ width: `${w.get()}%` }));
  const num = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: mine }} accessibilityLabel={voted ? `${label}, ${pct}%` : label}
      style={[s.opt, { backgroundColor: tc.inputBg }, mine && { borderColor: tc.accent, borderWidth: 1.5 }]}>
      <Animated.View style={[s.fill, bar]}><GradientFill colors={[tc.accentSoft, tc.mintSoft] as const} style={StyleSheet.absoluteFill} /></Animated.View>
      <Text style={[body(700), { flex: 1, color: tc.textPrimary, fontSize: 15 }]} numberOfLines={2}>{label}</Text>
      <Animated.Text style={[body(800), { color: tc.textPrimary, fontSize: 14 }, num]}>{pct}%</Animated.Text>
    </Pressable>
  );
}

/** Would-you-rather poll card, design D (plan 01). */
export function WYRCard({
  wyr, index, total, voted,
  onVote, onPrev, onNext,
}: {
  wyr: WyrCardModel;
  index: number; total: number;
  voted: "A" | "B" | undefined;
  onVote: (v: "A" | "B") => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { tc, isDark } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: tc.cardBg, borderWidth: isDark ? 1 : 0, borderColor: tc.glassLine }]}>
      <View style={s.meta}>
        {wyr.category ? <View style={[s.tag, { backgroundColor: tc.accentSoft }]}><Text style={[body(700), { fontSize: 11.5, color: tc.accentText }]}>{wyr.category}</Text></View> : null}
        <Text style={[TYPE.small, { color: tc.textSecondary, flex: 1 }]}>Question {wyr.questionNum} of {wyr.questionTotal}</Text>
        <Pressable onPress={onPrev} disabled={index === 0} hitSlop={6} style={[s.nav, { opacity: index === 0 ? 0.35 : 1 }]} accessibilityLabel="Previous question"><Ionicons name="chevron-back" size={18} color={tc.textPrimary} /></Pressable>
        <Pressable onPress={onNext} disabled={index === total - 1} hitSlop={6} style={[s.nav, { opacity: index === total - 1 ? 0.35 : 1 }]} accessibilityLabel="Next question"><Ionicons name="chevron-forward" size={18} color={tc.textPrimary} /></Pressable>
      </View>
      <Text style={[display(700), { fontSize: 20, lineHeight: 24, color: tc.textPrimary, marginTop: 10, marginBottom: 14 }]} numberOfLines={4}>{wyr.question}</Text>
      <Option label={wyr.optionA.label} pct={wyr.optionA.pct} voted={!!voted} mine={voted === "A"} onPress={() => onVote("A")} />
      <Option label={wyr.optionB.label} pct={wyr.optionB.pct} voted={!!voted} mine={voted === "B"} onPress={() => onVote("B")} />
      <View style={s.foot}>
        <Text style={[TYPE.small, { color: tc.textSecondary, flex: 1 }]}>
          {wyr.totalVotes > 0 ? `${wyr.totalVotes} voted` : "Be the first to vote"}{voted ? " · tap your choice again to clear it" : ""}
        </Text>
        {index < total - 1 ? (
          <Pressable onPress={onNext} hitSlop={6}><Text style={[body(700), { color: tc.accentText }]}>Next →</Text></Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 24, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: "#0F283C", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  nav: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  opt: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 18, marginBottom: 8, overflow: "hidden", borderWidth: 1.5, borderColor: "transparent" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  foot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
});

// Kept for callers that imported the old style sheet.
export const wc = s;
