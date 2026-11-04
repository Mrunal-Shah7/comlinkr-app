import { rs } from "../../../utils/responsive";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { type WyrCardModel } from "../models";

// ── WYR card (brand blue, no purple) ─────────────────────
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
    <View style={[wc.card, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      <LinearGradient colors={[Colors.brand.blue, "#0054CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={wc.header}>
        <View style={wc.headerLeft}>
          <Ionicons name="flash" size={14} color="#FFF" />
          <Text style={wc.headerTitle}>Would You Rather</Text>
        </View>
        <View style={wc.votesPill}>
          <Ionicons name="people" size={11} color="rgba(255,255,255,0.9)" />
          <Text style={wc.votesText}>{wyr.totalVotes} votes</Text>
        </View>
        <View style={wc.navRow}>
          <Pressable style={[wc.navBtn, index === 0 && { opacity: 0.4 }]} onPress={onPrev}>
            <Ionicons name="arrow-back" size={14} color="#FFF" />
          </Pressable>
          <Pressable style={[wc.navBtn, index === total - 1 && { opacity: 0.4 }]} onPress={onNext}>
            <Ionicons name="arrow-forward" size={14} color="#FFF" />
          </Pressable>
        </View>
      </LinearGradient>

      <Text style={wc.category}>{wyr.category} · QUESTION {wyr.questionNum} OF {wyr.questionTotal}</Text>
      <Text style={[wc.wyrQuestion, { color: tc.textPrimary }]} numberOfLines={4}>
        {wyr.question}
      </Text>

      {(["A", "B"] as const).map((opt) => {
        const data = opt === "A" ? wyr.optionA : wyr.optionB;
        const isActive = voted === opt;
        return (
          <View key={opt}>
            <Pressable
              onPress={() => onVote(opt)}
              style={[wc.opt, isActive && (opt === "A" ? wc.optActiveA : wc.optActiveB), isDark && !isActive && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}
            >
              <View style={[wc.optLabel, isActive && (opt === "A" ? wc.optLabelA : wc.optLabelB), isDark && !isActive && { backgroundColor: tc.sectionBg }]}>
                <Text style={[wc.optLabelText, isActive && { color: "#FFF" }, isDark && !isActive && { color: tc.textSecondary }]}>{opt}</Text>
              </View>
              {/* active options have a LIGHT background — keep dark text; only use light text for unselected in dark mode */}
              <Text style={[wc.optText, isDark && !isActive && { color: tc.textPrimary }]} numberOfLines={2}>{data.label}</Text>
              {voted && (
                <Text style={[wc.pct,
                  isActive && { color: opt === "A" ? Colors.brand.blue : Colors.brand.green, fontWeight: "800" },
                  isDark && !isActive && { color: tc.textSecondary },
                ]}>
                  {data.pct}%
                </Text>
              )}
            </Pressable>
            {opt === "A" && <Text style={[wc.or, isDark && { color: tc.textTertiary }]}>OR</Text>}
          </View>
        );
      })}

      <View style={[wc.footer, isDark && { borderTopColor: tc.borderLight }]}>
        <Ionicons name="bar-chart-outline" size={13} color={isDark ? tc.textTertiary : Colors.text.tertiary} />
        <Text style={[wc.footerText, isDark && { color: tc.textTertiary }]}>
          {wyr.totalVotes} neighbors voted
          {voted
            ? " · Tap the other option to switch, or your choice again to clear your vote"
            : ""}
        </Text>
        {index < total - 1 && (
          <Pressable onPress={onNext} style={wc.nextBtn}>
            <Text style={wc.nextText}>Next →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export const wc = StyleSheet.create({
  card: { marginHorizontal: rs(14), marginTop: rs(14), backgroundColor: "#FFF", borderRadius: rs(18), borderWidth: 1, borderColor: "#ECEEF1", overflow: "hidden", shadowColor: Colors.brand.blue, shadowOpacity: 0.1, shadowRadius: rs(12), elevation: 4 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: rs(14), paddingVertical: rs(11), gap: rs(8) },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: rs(6), flex: 1 },
  headerTitle: { fontSize: rs(13), fontWeight: "800", color: "#FFF", letterSpacing: 0.2 },
  votesPill: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(10) },
  votesText: { fontSize: rs(11), fontWeight: "600", color: "rgba(255,255,255,0.92)" },
  navRow: { flexDirection: "row", gap: rs(4) },
  navBtn: { width: rs(28), height: rs(28), borderRadius: rs(14), backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  category: { fontSize: rs(10), fontWeight: "700", color: Colors.brand.blue, letterSpacing: 1, paddingHorizontal: rs(16), paddingTop: rs(14), paddingBottom: rs(4) },
  wyrQuestion: { fontSize: rs(14), fontWeight: "600", lineHeight: rs(20), paddingHorizontal: rs(16), paddingBottom: rs(10) },
  opt: { flexDirection: "row", alignItems: "center", gap: rs(12), marginHorizontal: rs(14), marginVertical: rs(4), padding: rs(14), borderRadius: rs(14), borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#FAFAFA" },
  optActiveA: { borderColor: Colors.brand.blue, backgroundColor: Colors.brand.blueLight },
  optActiveB: { borderColor: Colors.brand.green, backgroundColor: "#EAFBE9" },
  optLabel: { width: rs(28), height: rs(28), borderRadius: rs(14), backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optLabelA: { backgroundColor: Colors.brand.blue },
  optLabelB: { backgroundColor: Colors.brand.green },
  optLabelText: { fontSize: rs(13), fontWeight: "800", color: Colors.text.secondary },
  optText: { flex: 1, fontSize: rs(14), fontWeight: "600", color: Colors.text.primary, lineHeight: rs(20) },
  pct: { fontSize: rs(14), fontWeight: "700", color: Colors.text.tertiary },
  or: { textAlign: "center", fontSize: rs(11), fontWeight: "800", color: Colors.text.tertiary, letterSpacing: 2, paddingVertical: rs(4) },
  footer: { flexDirection: "row", alignItems: "center", gap: rs(6), paddingHorizontal: rs(16), paddingVertical: rs(12), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#ECEEF1", marginTop: rs(8) },
  footerText: { flex: 1, fontSize: rs(12), color: Colors.text.tertiary },
  nextBtn: { paddingHorizontal: rs(10), paddingVertical: rs(4) },
  nextText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },
});
