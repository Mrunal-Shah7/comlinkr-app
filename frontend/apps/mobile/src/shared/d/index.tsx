// src/shared/d/index.tsx — design D building blocks (plan 01). Screens compose these instead of styling
// buttons, chips, tiles and segmented controls themselves, so every screen moves and looks the same.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { GRADIENT, GRADIENT_END, GRADIENT_START, RADIUS, TYPE, body } from '../../theme/d';
import { SHAKE, SPRING, TIMING, revealIn, tileIn } from '../motion/presets';

/* ---------- press feedback ---------- */
type PressableScaleProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  /** Layout for the touchable wrapper itself (flex, width, margins) — use for tiles that share a row. */
  outerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number; children?: ReactNode; haptic?: boolean;
};
/** Scales to 0.96 with a spring while pressed (the prototype's `.press`). */
export function PressableScale({ style, outerStyle, scaleTo = 0.96, children, haptic, onPressIn, onPressOut, onPress, ...rest }: PressableScaleProps) {
  const s = useSharedValue(1);
  const reduce = useReducedMotion();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
      style={outerStyle}
      onPress={(e) => { if (haptic) void Haptics.selectionAsync(); onPress?.(e); }}
      onPressIn={(e) => { if (!reduce) s.value = withSpring(scaleTo, SPRING.press); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, SPRING.press); onPressOut?.(e); }}
    >
      <Animated.View style={[style, a]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------- gradient fill ---------- */
export function GradientFill({ style, children, colors = GRADIENT }: { style?: StyleProp<ViewStyle>; children?: ReactNode; colors?: readonly [string, string, ...string[]] }) {
  return (
    <LinearGradient colors={colors as unknown as [string, string, ...string[]]} start={GRADIENT_START} end={GRADIENT_END} style={style}>
      {children}
    </LinearGradient>
  );
}

/* ---------- buttons ---------- */
type BtnProps = { label: string; onPress?: () => void; icon?: ReactNode; disabled?: boolean; block?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; outerStyle?: StyleProp<ViewStyle>; accessibilityLabel?: string; loading?: boolean };
/** Primary action: the brand gradient with a soft glow (`.btn.pri`). */
export function GradientButton({ label, onPress, icon, disabled, block, small, style, outerStyle, accessibilityLabel, loading }: BtnProps) {
  const h = small ? 36 : 50;
  return (
    <PressableScale disabled={disabled || loading} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} outerStyle={outerStyle}
      style={[{ borderRadius: small ? 12 : RADIUS.button, opacity: disabled ? 0.4 : 1, alignSelf: block ? 'stretch' : 'flex-start' }, s.glow, style]}>
      <GradientFill style={[s.btn, { height: h, borderRadius: small ? 12 : RADIUS.button, paddingHorizontal: small ? 14 : 20 }]}>
        {loading ? <ActivityIndicator color="#fff" /> : <>{icon}<Text style={[TYPE.button, { color: '#fff', fontSize: small ? 14 : 15.5 }]}>{label}</Text></>}
      </GradientFill>
    </PressableScale>
  );
}
/** Secondary (`.btn.sec`) and outline (`.btn.ghost`) buttons. */
export function SoftButton({ label, onPress, icon, disabled, block, small, style, outerStyle, ghost, accessibilityLabel }: BtnProps & { ghost?: boolean }) {
  const { tc } = useTheme();
  return (
    <PressableScale disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} outerStyle={outerStyle}
      style={[s.btn, { height: small ? 36 : 50, borderRadius: small ? 12 : RADIUS.button, paddingHorizontal: small ? 14 : 20, opacity: disabled ? 0.4 : 1, alignSelf: block ? 'stretch' : 'flex-start' },
        ghost ? { backgroundColor: tc.cardBg, borderWidth: 1.5, borderColor: tc.borderMedium } : { backgroundColor: tc.accentSoft }, style]}>
      {icon}
      <Text style={[TYPE.button, { color: ghost ? tc.textPrimary : tc.accentText, fontSize: small ? 14 : 15.5 }]}>{label}</Text>
    </PressableScale>
  );
}

/* ---------- chips ---------- */
/** Filter chip: surface with a hairline; selected = green fill, white text (`.chip.on` in D). */
export function Chip({ label, on, onPress, icon, style }: { label: string; on?: boolean; onPress?: () => void; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { tc } = useTheme();
  const sc = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }}
      onPress={() => { sc.value = withSequence(withTiming(0.92, { duration: 90 }), withSpring(1, SPRING.press)); onPress?.(); }}>
      <Animated.View style={[s.chip, { backgroundColor: on ? tc.mint : tc.chipBg, borderColor: on ? tc.mint : tc.borderMedium }, a, style]}>
        {icon}
        <Text style={[body(600), { fontSize: 13.5, color: on ? '#fff' : tc.textSecondary }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ---------- segmented control with a sliding gradient indicator ---------- */
export function Segmented({ items, value, onChange, style }: { items: { key: string; label: string }[]; value: string; onChange: (k: string) => void; style?: StyleProp<ViewStyle> }) {
  const { tc } = useTheme();
  const [lay, setLay] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0), w = useSharedValue(0);
  const cur = lay[value];
  useEffect(() => {
    if (!cur) return;
    if (w.value === 0) { x.value = cur.x; w.value = cur.w; return; }
    x.value = withSpring(cur.x, SPRING.settle);
    w.value = withSpring(cur.w, SPRING.settle);
  }, [cur, x, w]);
  const ind = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value, opacity: w.value ? 1 : 0 }));
  const onItem = useCallback((k: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLay((p) => (p[k]?.x === lx && p[k]?.w === width ? p : { ...p, [k]: { x: lx, w: width } }));
  }, []);
  return (
    <View style={[s.seg, { backgroundColor: tc.glass, borderColor: tc.glassLine }, style]}>
      <Animated.View style={[s.segInd, ind]} pointerEvents="none"><GradientFill style={StyleSheet.absoluteFill} /></Animated.View>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onLayout={onItem(it.key)} onPress={() => { if (!on) { void Haptics.selectionAsync(); onChange(it.key); } }}
            style={s.segBtn} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[body(700), { fontSize: 13, color: on ? '#fff' : tc.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- entrance animations ---------- */
/** Wrap list rows: rise and fade in, 45 ms apart. */
export function Reveal({ i = 0, children, style }: { i?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  // Only the first screenful animates in, so rows a virtualised list remounts while scrolling do not replay it.
  return <Animated.View entering={i < 14 ? revealIn(i) : undefined} style={style}>{children}</Animated.View>;
}
/** Wrap bento tiles: pop in from 0.96, 45 ms apart. */
export function TileIn({ i = 0, children, style }: { i?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={tileIn(i)} style={style}>{children}</Animated.View>;
}

/* ---------- shake ---------- */
/** Returns an animated style and a trigger that shakes a view sideways (wrong code, missing field). */
export function useShake() {
  const t = useSharedValue(0);
  const reduce = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: t.value }] }));
  const shake = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (reduce) return;
    t.value = withSequence(...SHAKE.slice(1).map((v) => withTiming(v, { duration: 420 / SHAKE.length })));
  }, [reduce, t]);
  return { style, shake };
}

/* ---------- bento tile ---------- */
export type TileTone = 'plain' | 'gradient' | 'mint';
/** A bento tile (`.bt-tile`): 24 px corners, surface with shadow, or the gradient / green fill. */
export function BentoTile({ tone = 'plain', style, children, onPress, accessibilityLabel }: { tone?: TileTone; style?: StyleProp<ViewStyle>; children: ReactNode; onPress?: () => void; accessibilityLabel?: string }) {
  const { tc, isDark } = useTheme();
  const inner = tone === 'gradient'
    ? <GradientFill style={[s.tile, style]}>{children}</GradientFill>
    : <View style={[s.tile, tone === 'mint' ? { backgroundColor: tc.mint } : { backgroundColor: tc.cardBg, borderWidth: isDark ? 1 : 0, borderColor: tc.glassLine }, style]}>{children}</View>;
  if (!onPress) return <View style={[s.tileShadow, { borderRadius: RADIUS.tile }]}>{inner}</View>;
  return <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel} style={[s.tileShadow, { borderRadius: RADIUS.tile }]}>{inner}</PressableScale>;
}
/** The small caps label at the top of a tile. */
export function TileLabel({ children, light, style }: { children: ReactNode; light?: boolean; style?: StyleProp<TextStyle> }) {
  const { tc } = useTheme();
  return <Text style={[body(600), { fontSize: 12, letterSpacing: 0.3, color: light ? 'rgba(255,255,255,0.8)' : tc.textSecondary }, style]}>{children}</Text>;
}

export const dStyles = StyleSheet.create({
  card: { borderRadius: RADIUS.card, overflow: 'hidden' },
});

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  glow: { shadowColor: '#1A6BAE', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 7, borderRadius: RADIUS.chip, borderWidth: 1 },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 18, borderWidth: 1 },
  segInd: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 14, overflow: 'hidden', shadowColor: '#1A6BAE', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  segBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 3, alignItems: 'center', borderRadius: 14 },
  tile: { borderRadius: RADIUS.tile, padding: 14, overflow: 'hidden', minHeight: 118 },
  stepper: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  stepCtl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F283C', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  prefill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, alignSelf: 'flex-start' },
  tileShadow: { shadowColor: '#0F283C', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
});

/* ---------- empty state ---------- */
/** One empty state for every list (problem 14): an icon in a soft tile, a title, a line, an optional action. */
export function EmptyState({ icon, title, sub, actionLabel, onAction }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; actionLabel?: string; onAction?: () => void;
}) {
  const { tc } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 30 }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: tc.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Ionicons name={icon} size={32} color={tc.accentText} />
      </View>
      <Text style={[TYPE.cardTitle, { color: tc.textPrimary, textAlign: 'center' }]}>{title}</Text>
      {sub ? <Text style={[TYPE.body, { color: tc.textSecondary, textAlign: 'center', marginTop: 6 }]}>{sub}</Text> : null}
      {actionLabel && onAction ? <View style={{ marginTop: 16 }}><GradientButton small label={actionLabel} onPress={onAction} /></View> : null}
    </View>
  );
}

/* ---------- stepper ---------- */
/** `.stepper`: label on the left, − value + on the right. The number rolls in from the side it moved
 *  (translateY ±60 %, 240 ms); pressing past a limit shakes the row. */
export function Stepper({ label, value, onChange, min = 0, max = 99, style }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; style?: StyleProp<ViewStyle>;
}) {
  const { tc } = useTheme();
  const reduce = useReducedMotion();
  const { style: shakeStyle, shake } = useShake();
  const y = useSharedValue(0);
  const o = useSharedValue(1);
  const num = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  const step = (d: number) => {
    const v = Math.min(max, Math.max(min, value + d));
    if (v === value) return shake();
    void Haptics.selectionAsync();
    onChange(v);
    if (reduce) return;
    y.value = d > 0 ? 12 : -12; o.value = 0;
    y.value = withTiming(0, { duration: 240 }); o.value = withTiming(1, { duration: 240 });
  };
  const btn = (d: number, icon: 'remove' | 'add') => (
    <PressableScale onPress={() => step(d)} scaleTo={0.88} accessibilityLabel={d > 0 ? 'More' : 'Less'}
      style={[s.stepBtn, { backgroundColor: tc.cardBg }]}>
      <Ionicons name={icon} size={20} color={tc.textPrimary} />
    </PressableScale>
  );
  return (
    <Animated.View style={[s.stepper, { backgroundColor: tc.inputBg }, shakeStyle, style]}>
      <Text style={[TYPE.body, { color: tc.textPrimary, flex: 1 }]}>{label}</Text>
      <View style={s.stepCtl}>
        {btn(-1, 'remove')}
        <View style={{ minWidth: 22, alignItems: 'center', overflow: 'hidden' }}>
          <Animated.Text style={[body(700), { fontSize: 17, color: tc.textPrimary }, num]}>{value}</Animated.Text>
        </View>
        {btn(1, 'add')}
      </View>
    </Animated.View>
  );
}

/* ---------- prefill and tag ---------- */
/** `.prefill`: a green-tinted card with a check, for values taken from the profile. */
export function Prefill({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { tc } = useTheme();
  return (
    <View style={[s.prefill, { backgroundColor: tc.mintSoft }, style]}>
      <Ionicons name="checkmark" size={20} color={tc.mint} />
      <View style={{ flex: 1 }}>{children}</View>
      {right}
    </View>
  );
}
/** `.tag` (accent) and `.tag.ok` (green). */
export function Tag({ label, ok, icon, style }: { label: string; ok?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle> }) {
  const { tc } = useTheme();
  const color = ok ? tc.mint : tc.accentText;
  return (
    <View style={[s.tag, { backgroundColor: ok ? tc.mintSoft : tc.accentSoft }, style]}>
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
      <Text style={[body(700), { fontSize: 11.5, color }]}>{label}</Text>
    </View>
  );
}

/* ---------- person avatar ---------- */
/** The prototype's `PERSON`: initials on a two-tone gradient whose hue comes from the name. */
export function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}
export function PersonAvatar({ name, size = 40, hue }: { name: string; size?: number; hue?: number }) {
  const h = hue ?? hueOf(name || '?');
  const ini = (name || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <LinearGradient colors={[`hsl(${h}, 70%, 58%)`, `hsl(${(h + 30) % 360}, 65%, 44%)`]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[body(700), { color: '#fff', fontSize: Math.round(size * 0.38) }]}>{ini}</Text>
    </LinearGradient>
  );
}

/* ---------- rolling number ---------- */
/** A number that rolls in from below when it goes up and from above when it goes down (260 ms). */
export function RollNumber({ value, style }: { value: number | string; style?: StyleProp<TextStyle> }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  const o = useSharedValue(1);
  const [prev, setPrev] = useState(value);
  useEffect(() => {
    if (prev === value) return;
    const up = Number(value) >= Number(prev);
    setPrev(value);
    if (reduce) return;
    y.value = up ? 10 : -10; o.value = 0;
    y.value = withTiming(0, { duration: 260 }); o.value = withTiming(1, { duration: 260 });
  }, [value, prev, reduce, y, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return <View style={{ overflow: 'hidden' }}><Animated.Text style={[style, a]}>{value}</Animated.Text></View>;
}
