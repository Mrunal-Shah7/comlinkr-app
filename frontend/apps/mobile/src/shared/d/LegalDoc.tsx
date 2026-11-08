// src/shared/d/LegalDoc.tsx — terms and privacy in design D (plan 01, design screen "legal"): a long read with a
// contents card whose rows scroll to their section, then every section in full (headings, then paragraphs).
import { useRef, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { TYPE, display } from "../../theme/d";
import { Reveal } from "./index";
import { DPage, goBackOr } from "./Page";

export type LegalSection = { id: string; title: string; content: { subtitle: string; text: string }[] };

export function LegalDoc({ title, version, updated, sections, intro, outro }: {
  title: string; version: string; updated: string; sections: LegalSection[]; intro?: ReactNode; outro?: ReactNode;
}) {
  const { tc } = useTheme();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const wrapY = useRef(0);
  const bodyY = useRef(0);
  const ys = useRef<Record<string, number>>({});
  const words = sections.reduce((n, s) => n + s.content.reduce((m, c) => m + c.text.split(/\s+/).length + c.subtitle.split(/\s+/).length, 0), 0);
  const mins = Math.max(1, Math.round(words / 220));
  const jump = (id: string) => scrollRef.current?.scrollTo({ y: Math.max(0, wrapY.current + bodyY.current + (ys.current[id] ?? 0) - 6), animated: true });
  // The titles carry their own number ("1. Acceptance of Terms"); the contents card shows it apart.
  const split = (t: string) => { const m = /^(\d+)\.\s*(.*)$/.exec(t); return m ? { n: m[1], t: m[2].replace(/ & /g, " and ") } : { n: "", t }; };

  return (
    <DPage title={title} sub={`Version ${version} · Updated ${updated} · ${mins} min read`} onBack={() => goBackOr("/(tabs)/feed")} scrollRef={scrollRef}>
      <View style={{ paddingHorizontal: 16 }} onLayout={(e) => { wrapY.current = e.nativeEvent.layout.y; }}>
        {intro}
        <Reveal i={0} style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
          {sections.map((s, i) => {
            const { n, t } = split(s.title);
            return (
              <Pressable key={s.id} onPress={() => jump(s.id)} accessibilityRole="button" accessibilityLabel={`Go to ${t}`}
                style={({ pressed }) => [styles.toc, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }, pressed && { opacity: 0.6 }]}>
                <Text style={[TYPE.body, { flex: 1, color: tc.textPrimary }]}>{n ? `${n}. ` : ""}{t}</Text>
                <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
              </Pressable>
            );
          })}
        </Reveal>

        <View onLayout={(e) => { bodyY.current = e.nativeEvent.layout.y; }}>
          {sections.map((s) => {
            const { n, t } = split(s.title);
            return (
              <View key={s.id} onLayout={(e) => { ys.current[s.id] = e.nativeEvent.layout.y; }} style={{ marginTop: 22 }}>
                <Text style={[display(700), { fontSize: 19, color: tc.textPrimary, marginBottom: 8 }]}>{n ? `${n}. ` : ""}{t}</Text>
                {s.content.map((c, k) => (
                  <View key={k} style={{ marginBottom: 12 }}>
                    <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, marginBottom: 3 }]}>{c.subtitle}</Text>
                    <Text style={[TYPE.body, { color: tc.textSecondary, lineHeight: 23 }]}>{c.text}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
        {outro}
        <Text style={[TYPE.small, { color: tc.textTertiary, textAlign: "center", marginTop: 18, fontSize: 11.5 }]}>© 2026 ComLinkr Ltd. All rights reserved.</Text>
      </View>
    </DPage>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14 },
  toc: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
});
