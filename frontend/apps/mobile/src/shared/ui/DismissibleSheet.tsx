// src/shared/ui/DismissibleSheet.tsx
//
// Swipe-down-to-dismiss for full-screen detail modals (listing, roommate, restaurant, article,
// post). Wrap the modal content in <DismissibleSheet onDismiss>, then wrap the non-scrolling top
// region (hero image / header bar) in <SheetDragArea>. Pulling down on that region drags the whole
// sheet; releasing past the threshold (or flicking) closes it, otherwise it springs back.
// Horizontal carousels inside the drag area keep working: the pan fails on sideways movement.
//
// Also provides the GestureHandlerRootView that gesture-handler needs inside RN <Modal> on Android.

import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { SPRING } from "../motion/presets";

const DISMISS_DISTANCE = 140;
const DISMISS_VELOCITY = 900;

type SheetCtx = { ty: SharedValue<number>; dismiss: () => void; height: number };
const Ctx = createContext<SheetCtx | null>(null);

export function DismissibleSheet({
  onDismiss,
  children,
  style,
}: {
  onDismiss: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { height } = useWindowDimensions();
  const ty = useSharedValue(0);
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    borderTopLeftRadius: Math.min(ty.value / 4, 24),
    borderTopRightRadius: Math.min(ty.value / 4, 24),
  }));
  const dismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
    // The modal unmounts or slides away; reset for the next presentation.
    setTimeout(() => {
      ty.value = 0;
    }, 400);
  };

  return (
    <GestureHandlerRootView style={styles.fill}>
      <Ctx.Provider value={{ ty, dismiss, height }}>
        <Animated.View style={[styles.fill, { overflow: "hidden" }, style, sheetStyle]}>{children}</Animated.View>
      </Ctx.Provider>
    </GestureHandlerRootView>
  );
}

/** Region that starts the pull-down drag (hero image, header bar, grabber). */
export function SheetDragArea({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ctx = useContext(Ctx);
  if (!ctx) return <>{children}</>;
  const { ty, dismiss, height } = ctx;

  const pan = Gesture.Pan()
    .activeOffsetY(16)
    .failOffsetX([-14, 14])
    .onUpdate((e) => {
      ty.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        ty.value = withTiming(height, { duration: 200 });
        scheduleOnRN(dismiss);
      } else {
        ty.value = withSpring(0, SPRING.sheet);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}

/** Small grabber pill hinting that the sheet can be pulled down. */
export function SheetGrabber({ color }: { color: string }) {
  return <Animated.View style={[styles.grabber, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, marginTop: 8, marginBottom: 4 },
});
