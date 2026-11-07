// src/shared/ui/EdgeSwipeBack.tsx
//
// Android swipe-back for stack screens: drag from the left edge and the screen follows the finger;
// release past ~30% width (or flick) to go back. iOS already gets this natively from the Stack's
// `fullScreenGestureEnabled`. On Android devices with gesture navigation the system back gesture
// claims the edge first, so this mainly helps 3-button navigation users.

import type { ReactNode } from "react";
import { Platform, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const EDGE_WIDTH = 28;

export function EdgeSwipeBack({
  enabled,
  onBack,
  children,
}: {
  enabled: boolean;
  onBack: () => void;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const tx = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  // Always render the same wrapper (toggling it would remount the screen); only the gesture is gated.
  const back = () => {
    onBack();
    setTimeout(() => {
      tx.value = 0;
    }, 350);
  };

  const pan = Gesture.Pan()
    .enabled(enabled && Platform.OS === "android")
    .hitSlop({ left: 0, width: EDGE_WIDTH })
    .activeOffsetX(12)
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      tx.value = Math.max(0, e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX > width * 0.3 || e.velocityX > 800) {
        tx.value = withTiming(width, { duration: 180 });
        scheduleOnRN(back);
      } else {
        tx.value = withSpring(0, { damping: 22, stiffness: 260, mass: 1 });
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
