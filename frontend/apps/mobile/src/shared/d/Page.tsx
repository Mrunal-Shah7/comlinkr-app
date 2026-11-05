// src/shared/d/Page.tsx — the frame of a pushed screen in design D (plan 01): a back button, the screen's title
// that fades into a glass bar as the large title scrolls away (interpolate(scrollY, [0, 64], [0, 1])), an optional
// action on the right, a large title with a subtitle, then the content. `footer` sits under the scroll area
// (a glass action bar, an input bar).
import { type ReactElement, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type RefreshControlProps, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { TYPE } from "../../theme/d";

export function goBackOr(fallback: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as any);
}

export function DPage({ title, sub, right, children, footer, refreshControl, contentStyle, onBack, largeTitle = true, scroll = true }: {
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  onBack?: () => void;
  largeTitle?: boolean;
  /** false: children fill the space under the bar (a list that scrolls itself). */
  scroll?: boolean;
}) {
  const { tc } = useTheme();
  const y = useSharedValue(largeTitle ? 0 : 64);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const bar = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 64], [0, 1], "clamp") }));
  const t = useAnimatedStyle(() => {
    const c = interpolate(y.value, [0, 64], [0, 1], "clamp");
    return { opacity: c, transform: [{ translateY: (1 - c) * 6 }] };
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.pageBg }} edges={["top"]}>
      <View style={s.bar}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tc.glass, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tc.glassLine }, bar]} />
        <Pressable onPress={onBack ?? (() => goBackOr("/(tabs)/feed"))} hitSlop={8} style={({ pressed }) => [s.ib, pressed && { backgroundColor: tc.inputBg }]} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={tc.textPrimary} />
        </Pressable>
        <Animated.View pointerEvents="none" style={[s.title, t]}>
          <Text style={[TYPE.bar, { color: tc.textPrimary }]} numberOfLines={1}>{title}</Text>
        </Animated.View>
        <View style={s.right}>{right}</View>
      </View>
      {scroll ? (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} refreshControl={refreshControl} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={[{ paddingBottom: 40 }, contentStyle]}>
          {largeTitle ? (
            <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
              <Text style={[TYPE.pageTitle, { color: tc.textPrimary }]}>{title}</Text>
              {sub ? <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 2 }]}>{sub}</Text> : null}
            </View>
          ) : null}
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

/** A grouped list block (settings style): rounded card, rows separated by hairlines. */
export function DGroup({ label, children, style }: { label?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { tc } = useTheme();
  return (
    <View style={[{ marginHorizontal: 16, marginBottom: 16 }, style]}>
      {label ? <Text style={[TYPE.overline, { color: tc.textTertiary, marginLeft: 14, marginBottom: 6 }]}>{label}</Text> : null}
      <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

/** One row in a DGroup: icon tile, label, value or chevron. */
export function DRow({ icon, label, value, onPress, danger, first, right }: {
  icon?: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void; danger?: boolean; first?: boolean; right?: ReactNode;
}) {
  const { tc } = useTheme();
  const color = danger ? tc.dangerText : tc.textPrimary;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={label}
      style={({ pressed }) => [s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }, pressed && { backgroundColor: tc.inputBg }]}>
      {icon ? <View style={[s.icon, { backgroundColor: danger ? "rgba(239,68,68,0.12)" : tc.accentSoft }]}><Ionicons name={icon} size={17} color={danger ? tc.dangerText : tc.accentText} /></View> : null}
      <Text style={[TYPE.body, { flex: 1, color }]} numberOfLines={1}>{label}</Text>
      {right ?? (value ? <Text style={[TYPE.small, { color: tc.textTertiary, maxWidth: "50%" }]} numberOfLines={1}>{value}</Text> : null)}
      {onPress && !danger && !right ? <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, zIndex: 10 },
  ib: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { position: "absolute", left: 64, right: 64, alignItems: "center" },
  right: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, minHeight: 52 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
