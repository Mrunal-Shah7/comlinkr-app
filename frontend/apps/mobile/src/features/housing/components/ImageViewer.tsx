import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions } from "react-native";
import Reanimated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SPRING } from "../../../shared/motion/presets";
import { createDTypeStyles } from "../../../theme/themedStyles";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView as GHScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { FadeImage, resolveImageUri } from "../../../../components/FadeImage";
import { rs } from "../../../utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Image carousel with dots ─────────────────────────────────────────────────
export function ImageCarousel({
  images,
  width,
  height,
  showCounter = false,
  showDots = true,
  onPageChange,
  onImagePress,
}: {
  images: string[];
  width: number;
  height: number;
  showCounter?: boolean;
  showDots?: boolean;
  onPageChange?: (index: number) => void;
  onImagePress?: (index: number) => void;
}) {
  const [current, setCurrent] = useState(0);

  const handlePageChange = (index: number) => {
    setCurrent(index);
    onPageChange?.(index);
  };

  return (
    <View style={{ width, height }}>
      <GHScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          handlePageChange(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        scrollEventThrottle={16}
      >
        {images.map((uri, i) => (
          <Pressable key={i} onPress={() => onImagePress?.(i)} disabled={!onImagePress}>
            <FadeImage uri={uri} style={{ width, height }} cachePolicy="disk" transition={300} />
          </Pressable>
        ))}
      </GHScrollView>

      {/* Dot indicators — only shown when not managed externally */}
      {showDots && images.length > 1 && (
        <View style={cs.dotRow}>
          {images.map((_, i) => (
            <View key={i} style={[cs.dot, i === current && cs.dotActive]} />
          ))}
        </View>
      )}

      {/* Counter badge */}
      {showCounter && images.length > 1 && (
        <View style={cs.counter}>
          <Text style={cs.counterText}>
            {current + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Fullscreen image viewer with pinch-to-zoom ───────────────────────────────
// Gesture Handler + Reanimated: pinch, pan and the pull-down run on the UI thread. React only hears when a photo
// becomes zoomed or not (so the pager stops paging while a photo is zoomed in).
const MAX_ZOOM = 4;
const SETTLE = { duration: 300, dampingRatio: 1 } as const;

export function ZoomableImage({ uri, width, height, onZoom }: { uri: string; width: number; height: number; onZoom?: (zoomed: boolean) => void }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const reportZoom = (z: boolean) => { setZoomed(z); onZoom?.(z); };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.set(Math.max(1, Math.min(MAX_ZOOM, savedScale.get() * e.scale))); })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() <= 1.01) {
        scale.set(withSpring(1, SETTLE));
        savedScale.set(1);
        tx.set(withSpring(0, SETTLE)); ty.set(withSpring(0, SETTLE));
        savedTx.set(0); savedTy.set(0);
        scheduleOnRN(reportZoom, false);
      } else {
        scheduleOnRN(reportZoom, true);
      }
    });

  // Panning only moves a zoomed photo; unzoomed, the drag belongs to the pager and the pull-down.
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onStart(() => { savedTx.set(tx.get()); savedTy.set(ty.get()); })
    .onUpdate((e) => { tx.set(savedTx.get() + e.translationX); ty.set(savedTy.get() + e.translationY); });

  const reset = () => {
    scale.set(withSpring(1, SETTLE)); savedScale.set(1);
    tx.set(withSpring(0, SETTLE)); ty.set(withSpring(0, SETTLE));
    savedTx.set(0); savedTy.set(0);
    reportZoom(false);
  };
  const longPress = Gesture.LongPress().onStart(() => { scheduleOnRN(reset); });

  const gesture = Gesture.Exclusive(Gesture.Simultaneous(pinch, pan), longPress);
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { translateX: tx.get() }, { translateY: ty.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
        <Reanimated.View style={zoomStyle}>
          <FadeImage
            uri={resolveImageUri(uri)}
            style={{ width, height: height * 0.85 }}
            resizeMode="contain"
            cachePolicy="disk"
            transition={300}
            placeholderBg="transparent"
          />
        </Reanimated.View>
      </View>
    </GestureDetector>
  );
}

/** Design D `gallery`: black, a bar with back and "1 of n", photos side by side, "Swipe for more · pinch to
 *  zoom" below. Pull down (when not zoomed) drags the photo and fades the black; past 120 px, or a flick, closes. */
export function FullscreenImageViewer({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const scrollRef = useRef<GHScrollView>(null);
  const dragY = useSharedValue(0);
  const enter = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: startIndex * W, animated: false });
    enter.set(reduce ? 1 : withSpring(1, SPRING.sheet));
  }, [startIndex, W, enter, reduce]);

  const dismiss = Gesture.Pan()
    .enabled(!zoomed)
    .maxPointers(1)
    .activeOffsetY(12)
    .failOffsetX([-12, 12])
    .onUpdate((e) => { dragY.set(Math.max(0, e.translationY)); })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 1000) {
        dragY.set(withTiming(H, { duration: 200 }, (done) => { if (done) scheduleOnRN(onClose); }));
      } else {
        dragY.set(withSpring(0, { duration: 300, dampingRatio: 0.8, velocity: e.velocityY }));
      }
    });

  const bgStyle = useAnimatedStyle(() => ({ opacity: interpolate(dragY.get(), [0, 300], [1, 0.2], Extrapolation.CLAMP) }));
  const pageStyle = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateY: dragY.get() }, { scale: interpolate(enter.get(), [0, 1], [0.92, 1]) }],
  }));

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      {/* A React Native Modal is its own window: gestures inside it need their own root. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, bgStyle]} />
        <GestureDetector gesture={dismiss}>
          <View style={{ flex: 1 }}>
            <Reanimated.View style={[{ flex: 1 }, pageStyle]}>
              <GHScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                scrollEnabled={!zoomed}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
                style={{ flex: 1 }}
              >
                {images.map((uri, i) => (
                  <ZoomableImage key={i} uri={uri} width={W} height={H} onZoom={setZoomed} />
                ))}
              </GHScrollView>
            </Reanimated.View>
          </View>
        </GestureDetector>
        <Reanimated.View style={[gs.bar, { paddingTop: insets.top + 6 }, bgStyle]}>
          <Pressable onPress={onClose} hitSlop={12} style={gs.back} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color="#FFF" />
          </Pressable>
          <Text style={gs.count}>{idx + 1} of {images.length}</Text>
          <View style={gs.back} />
        </Reanimated.View>
        <Reanimated.Text style={[gs.hint, { bottom: insets.bottom + 34 }, bgStyle]}>
          {images.length > 1 ? "Swipe for more · pinch to zoom" : "Pinch to zoom"}
        </Reanimated.Text>
      </GestureHandlerRootView>
    </Modal>
  );
}

const gs = createDTypeStyles({
  bar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  count: { flex: 1, textAlign: "center", color: "#FFF", fontSize: 17, fontWeight: "700" },
  hint: { position: "absolute", left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
});

export const cs = createDTypeStyles({
  dotRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: rs(5),
    height: rs(5),
    borderRadius: rs(2.5),
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    width: rs(18),
    backgroundColor: "#FFFFFF",
  },
  counter: {
    position: "absolute",
    bottom: rs(12),
    right: rs(12),
    backgroundColor: "rgba(0,0,0,0.48)",
    borderRadius: rs(10),
    paddingHorizontal: rs(9),
    paddingVertical: rs(3),
  },
  counterText: {
    fontSize: rs(11),
    fontWeight: "700",
    color: "#FFF",
  },
});
