// src/shared/navigation/DTabBar.tsx — design D tab bar (plan 01).
//
// A floating glass bar: Explore, Listings, [+], Food, Community. The green indicator under the icons is
// "liquid": it follows the pager while it is dragged and stretches between two tabs
// (width = 22 + sin(π·f) × gap × 0.7, f = how far between them), then settles with a springy overshoot.
// The + opens the compose sheet, growing out of the button while the + turns into ×.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { ParamListBase, TabNavigationState } from 'expo-router/react-navigation';
import type { BottomTabDescriptorMap } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useTheme } from '../../theme/useTheme';
import { body } from '../../theme/d';
import { GradientFill, PressableScale } from '../d';
import { SPRING } from '../motion/presets';

export const TAB_BAR_HEIGHT = 66;
export const TAB_BAR_GAP = 12;
/** Space a tab screen must leave at the bottom of its scroll content so the last item clears the bar. */
export const tabBarClearance = (bottomInset: number) => TAB_BAR_HEIGHT + Math.max(bottomInset, 10) + TAB_BAR_GAP + 16;

type Props = {
  state: TabNavigationState<ParamListBase>;
  descriptors: BottomTabDescriptorMap;
  navigation: any;
  insets: { bottom: number };
  offset: SharedValue<number>;
  width: SharedValue<number>;
  onPlus: () => void;
  plusOpen: boolean;
};

export function DTabBar({ state, descriptors, navigation, insets, offset, width, onPlus, plusOpen }: Props) {
  const { tc } = useTheme();
  const reduce = useReducedMotion();
  const count = state.routes.length;
  const centers = useSharedValue<number[]>(new Array(count).fill(0));
  const [, force] = useState(0);

  // Pager progress 0..count-1, smoothed by a spring so the indicator overshoots a little when it settles.
  const raw = useDerivedValue(() => (width.value ? -offset.value / width.value : 0));
  const smooth = useDerivedValue(() => (reduce ? raw.value : withSpring(raw.value, SPRING.liquid)));

  const pill = useAnimatedStyle(() => {
    const c = centers.value;
    if (!c[0] || !c[count - 1]) return { opacity: 0 };
    const p = Math.max(0, Math.min(count - 1, smooth.value));
    const i = Math.min(count - 2, Math.floor(p));
    const f = Math.max(0, Math.min(1, p - i));
    const a = c[i], b = c[i + 1];
    const x = a + (b - a) * f;
    const fr = Math.max(0, Math.min(1, raw.value - Math.floor(raw.value)));
    const w = 22 + Math.sin(Math.PI * fr) * Math.abs(b - a) * 0.7;
    return { opacity: 1, width: w, transform: [{ translateX: x - w / 2 }] };
  });

  const plusRot = useSharedValue(0);
  useEffect(() => {
    plusRot.value = withTiming(plusOpen ? 45 : 0, { duration: reduce ? 0 : 350 });
  }, [plusOpen, reduce, plusRot]);
  const plusIcon = useAnimatedStyle(() => ({ transform: [{ rotate: `${plusRot.value}deg` }] }));

  // Several tabs report their layout in the same frame; collect them in a plain array (a shared value read
  // back on the JS thread can be stale) and publish a copy.
  const centersRef = useRef<number[]>(new Array(count).fill(0));
  const onLayoutTab = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width: w } = e.nativeEvent.layout;
    centersRef.current[i] = x + w / 2;
    centers.value = centersRef.current.slice();
    force((n) => n + 1);
  };

  const tab = (route: TabNavigationState<ParamListBase>['routes'][number], i: number) => {
    const { options } = descriptors[route.key];
    const focused = state.index === i;
    const color = focused ? tc.textPrimary : tc.textTertiary;
    const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
    const onPress = () => {
      const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !ev.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
    return (
      <Pressable key={route.key} onLayout={onLayoutTab(i)} onPress={onPress} onLongPress={onLongPress} style={s.tab}
        accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={options.tabBarAccessibilityLabel ?? label}>
        {options.tabBarIcon?.({ focused, color, size: 23 })}
        <Text style={[body(focused ? 700 : 600), { fontSize: 10.5, color, marginTop: 2 }]} numberOfLines={1}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: Math.max(insets.bottom, 10) + TAB_BAR_GAP }]}>
      <View style={[s.bar, { backgroundColor: tc.glass, borderColor: tc.glassLine }]}>
        <Animated.View pointerEvents="none" style={[s.pill, { backgroundColor: tc.mint, shadowColor: tc.mint }, pill]} />
        <View style={s.row}>
          {state.routes.slice(0, 2).map((r, i) => tab(r, i))}
          <PressableScale onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPlus(); }} scaleTo={0.92}
            accessibilityRole="button" accessibilityLabel="Post something" style={s.plusWrap}>
            <GradientFill style={s.plus}>
              <Animated.View style={plusIcon}><Ionicons name="add" size={28} color="#fff" /></Animated.View>
            </GradientFill>
          </PressableScale>
          {state.routes.slice(2).map((r, i) => tab(r, i + 2))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12 },
  bar: { height: TAB_BAR_HEIGHT, borderRadius: 24, borderWidth: 1, paddingHorizontal: 6, justifyContent: 'center',
    shadowColor: '#0F283C', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  row: { flexDirection: 'row', alignItems: 'center', height: '100%' },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', left: 6, bottom: 7, height: 4, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  plusWrap: { marginHorizontal: 4, borderRadius: 17, shadowColor: '#1A6BAE', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  plus: { width: 56, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
