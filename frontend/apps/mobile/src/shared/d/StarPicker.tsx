// src/shared/d/StarPicker.tsx — design D `.stars`: tap or drag across five stars. A star that lights up pops
// to 1.25 on a springy curve; the label under the row names the rating.
import { useEffect, useRef, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { TYPE } from '../../theme/d';

export const STAR_LABELS = ['Not good', 'Okay', 'Good', 'Very good', 'Loved it'];
const GOLD = '#F5B300';

function Star({ on, size }: { on: boolean; size: number }) {
  const { tc } = useTheme();
  const reduce = useReducedMotion();
  const sc = useSharedValue(1);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current && !reduce) sc.set(withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, { damping: 12, stiffness: 260, mass: 1 })));
    was.current = on;
  }, [on, reduce, sc]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: sc.get() }] }));
  return (
    <Animated.View style={a}>
      <Ionicons name={on ? 'star' : 'star-outline'} size={size} color={on ? GOLD : tc.surface3} />
    </Animated.View>
  );
}

export function StarPicker({ value, onChange, size = 40, hint = 'Tap or drag across the stars' }: {
  value: number; onChange: (v: number) => void; size?: number; hint?: string;
}) {
  const { tc } = useTheme();
  const [w, setW] = useState(0);
  const width = useSharedValue(0);
  const last = useRef(value);
  last.current = value;
  const set = (v: number) => {
    if (v === last.current) return;
    last.current = v;
    void Haptics.selectionAsync();
    onChange(v);
  };
  const pick = (x: number) => {
    'worklet';
    if (width.get() <= 0) return;
    const v = Math.min(5, Math.max(1, Math.ceil((x / width.get()) * 5)));
    scheduleOnRN(set, v);
  };
  const pan = Gesture.Pan().minDistance(0).onBegin((e) => pick(e.x)).onUpdate((e) => pick(e.x));
  return (
    <View style={{ alignItems: 'center' }}>
      <GestureDetector gesture={pan}>
        <View
          onLayout={(e: LayoutChangeEvent) => { setW(e.nativeEvent.layout.width); width.set(e.nativeEvent.layout.width); }}
          accessibilityRole="adjustable"
          accessibilityLabel="Rating"
          accessibilityValue={{ min: 1, max: 5, now: value || 0, text: value ? `${value} stars, ${STAR_LABELS[value - 1]}` : 'No rating' }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onChange(Math.min(5, Math.max(1, (value || 0) + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
          style={{ flexDirection: 'row', gap: 6, paddingVertical: 6 }}
        >
          {[1, 2, 3, 4, 5].map((n) => <Star key={n} on={n <= value} size={size} />)}
        </View>
      </GestureDetector>
      <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 4, opacity: w ? 1 : 0 }]}>{value ? STAR_LABELS[value - 1] : hint}</Text>
    </View>
  );
}
