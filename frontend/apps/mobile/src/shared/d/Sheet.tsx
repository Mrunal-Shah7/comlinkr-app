// src/shared/d/Sheet.tsx — design D bottom sheet (plan 01).
// Rises on SPRING.sheet; drag the handle or header down past 110 px (or flick)
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

export function DSheet({ visible, onClose, title, children, grow, growFrom, full, style }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode; grow?: boolean;
  /** With `grow`: the point the sheet grows out of and shrinks back into, as the distance from the screen's bottom edge
   *  to the centre of the + button (it is horizontally centred). Without it the sheet grows from the bottom edge. */
  growFrom?: { bottom: number };
  full?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { tc } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0); // 0 hidden → 1 shown
  const drag = useSharedValue(0);
  const sheetH = useSharedValue(0); // measured height, for scaling about the + button's centre

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.set(0);
      p.set(reduce ? withTiming(1, { duration: 150 }) : withSpring(1, SPRING.sheet));
    } else if (mounted) {
      p.set(withTiming(0, { duration: reduce ? 120 : 240 }, (done) => { if (done) scheduleOnRN(setMounted, false); }));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- p, drag and reduce are stable for the sheet's life

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => { drag.set(Math.max(0, e.translationY)); })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) scheduleOnRN(onClose);
      else drag.set(withSpring(0, SPRING.sheet));
    });

  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, p.get()) * (1 - Math.min(drag.get() / 600, 0.6)) }));
  const sheet = useAnimatedStyle(() => {
    if (reduce) return { opacity: p.get(), transform: [{ translateY: drag.get() }] };
    if (grow && growFrom) {
      // Scale about the + button's centre: the view scales about its own centre, so shift it by (O − C)(1 − s),
      // where O is the + centre and C the sheet's centre, both measured from the sheet's top. Until the sheet has
      // been measured it stays hidden, so the first frame cannot show it in the wrong place.
      const s = interpolate(p.get(), [0, 1], [0.04, 1]);
      const ty = (sheetH.get() / 2 - growFrom.bottom) * (1 - s);
      return {
        opacity: sheetH.get() ? interpolate(p.get(), [0, 0.08], [0, 1], 'clamp') : 0,
        transform: [{ translateY: ty + drag.get() }, { scale: s }],
      };
    }
    if (grow) {
      return {
        opacity: interpolate(p.get(), [0, 0.4], [0, 1], 'clamp'),
        transform: [
          { translateY: interpolate(p.get(), [0, 1], [height * 0.3, 0]) + drag.get() },
          { scale: interpolate(p.get(), [0, 1], [0.25, 1]) },
        ],
      };
    }
    return { transform: [{ translateY: interpolate(p.get(), [0, 1], [height, 0]) + drag.get() }] };
  });

  if (!mounted) return null;
  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.42)' }, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={[s.sheet, { backgroundColor: tc.sheetBg, paddingBottom: insets.bottom + 16, maxHeight: '88%' }, full && { height: '94%', maxHeight: '94%' }, { transformOrigin: grow && growFrom ? 'center' : 'bottom' }, sheet, style]}
          onLayout={growFrom ? (e) => { sheetH.set(e.nativeEvent.layout.height); } : undefined}
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
