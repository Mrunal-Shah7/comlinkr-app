// src/shared/d/Sheet.tsx — design D bottom sheet (plan 01).
// Rises with withSpring({ damping: 18, stiffness: 200 }); drag the handle or header down past 110 px (or flick)
// to close, otherwise it springs back. `grow` makes it grow out of the bottom centre (the + button):
// scale 0.25 → 1 with a fade. Reduce motion: a short fade only.
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { RADIUS, TYPE } from '../../theme/d';
import { SPRING } from '../motion/presets';

export function DSheet({ visible, onClose, title, children, grow, full, style }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode; grow?: boolean; full?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { tc } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0); // 0 hidden → 1 shown
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      p.value = reduce ? withTiming(1, { duration: 150 }) : withSpring(1, SPRING.sheet);
    } else if (mounted) {
      p.value = withTiming(0, { duration: reduce ? 120 : 260 }, (done) => { if (done) scheduleOnRN(setMounted, false); });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- p, drag and reduce are stable for the sheet's life

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => { drag.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) scheduleOnRN(onClose);
      else drag.value = withSpring(0, SPRING.sheet);
    });

  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value) * (1 - Math.min(drag.value / 600, 0.6)) }));
  const sheet = useAnimatedStyle(() => {
    if (reduce) return { opacity: p.value, transform: [{ translateY: drag.value }] };
    if (grow) {
      return {
        opacity: interpolate(p.value, [0, 0.4], [0, 1], 'clamp'),
        transform: [
          { translateY: interpolate(p.value, [0, 1], [height * 0.3, 0]) + drag.value },
          { scale: interpolate(p.value, [0, 1], [0.25, 1]) },
        ],
      };
    }
    return { transform: [{ translateY: interpolate(p.value, [0, 1], [height, 0]) + drag.value }] };
  });

  if (!mounted) return null;
  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.42)' }, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={[s.sheet, { backgroundColor: tc.sheetBg, paddingBottom: insets.bottom + 16, maxHeight: '88%' }, full && { height: '94%', maxHeight: '94%' }, { transformOrigin: 'bottom' }, sheet, style]}
        >
          <GestureDetector gesture={pan}>
            <View>
              <View style={[s.grab, { backgroundColor: tc.borderMedium }]} />
              {title ? (
                <View style={s.head}>
                  <Text style={[TYPE.section, { color: tc.textPrimary }]}>{title}</Text>
                  <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={s.x}><Ionicons name="close" size={22} color={tc.textPrimary} /></Pressable>
                </View>
              ) : null}
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  grab: { width: 38, height: 5, borderRadius: 9, alignSelf: 'center', marginTop: 8, marginBottom: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 },
  x: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});
