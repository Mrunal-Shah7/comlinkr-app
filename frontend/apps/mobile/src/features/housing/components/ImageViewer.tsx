import { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Animated, PanResponder, StyleSheet, Modal, Dimensions } from "react-native";
import { createDTypeStyles } from "../../../theme/themedStyles";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
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
export function pinchDistance(touches: { pageX: number; pageY: number }[]): number {
  if (touches.length < 2) return 0;
  const [a, b] = touches;
  return Math.sqrt((a.pageX - b.pageX) ** 2 + (a.pageY - b.pageY) ** 2);
}

export function ZoomableImage({ uri, width, height, onZoom }: { uri: string; width: number; height: number; onZoom?: (zoomed: boolean) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const pinchStartDist = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastTranslateX.current = (translateX as any)._value;
        lastTranslateY.current = (translateY as any)._value;
        pinchStartDist.current = 0;
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          // Pinch zoom via change in distance between the two touches
          const dist = pinchDistance(touches as any);
          if (pinchStartDist.current === 0) {
            pinchStartDist.current = dist;
            return;
          }
          const ratio = dist / pinchStartDist.current;
          scale.setValue(Math.max(1, Math.min(4, lastScale.current * ratio)));
        } else if (gs.numberActiveTouches === 1 && lastScale.current > 1) {
          translateX.setValue(lastTranslateX.current + gs.dx);
          translateY.setValue(lastTranslateY.current + gs.dy);
        }
      },
      onPanResponderRelease: () => {
        lastScale.current = Math.max(1, Math.min(4, (scale as any)._value));
        onZoom?.(lastScale.current > 1);
        pinchStartDist.current = 0;
        if (lastScale.current === 1) {
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          ]).start();
          lastTranslateX.current = 0;
          lastTranslateY.current = 0;
        } else {
          lastTranslateX.current = (translateX as any)._value;
          lastTranslateY.current = (translateY as any)._value;
        }
      },
    })
  ).current;

  const resetZoom = () => {
    lastScale.current = 1;
    onZoom?.(false);
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable onPress={undefined} onLongPress={resetZoom} style={{ width, height, alignItems: "center", justifyContent: "center" }} {...panResponder.panHandlers}>
      <Animated.View style={{ transform: [{ scale }, { translateX }, { translateY }] }}>
        <FadeImage
          uri={resolveImageUri(uri)}
          style={{ width, height: height * 0.85 }}
          resizeMode="contain"
          cachePolicy="disk"
          transition={300}
          placeholderBg="transparent"
        />
      </Animated.View>
    </Pressable>
  );
}

/** Design D `gallery`: black, a bar with back and "1 of n", photos side by side, "Swipe for more · pinch to
 *  zoom" below. Swipe down (when not zoomed) drags the photo and fades the black; past 120 px it closes. */
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
  const W = Dimensions.get("window").width;
  const H = Dimensions.get("window").height;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const zoomed = useRef(false);
  const dragY = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: startIndex * W, animated: false });
    Animated.spring(enter, { toValue: 1, damping: 18, stiffness: 200, mass: 1, useNativeDriver: true }).start();
  }, [startIndex, W, enter]);

  const dismiss = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, g) =>
        !zoomed.current && evt.nativeEvent.touches.length === 1 && g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1) {
          Animated.timing(dragY, { toValue: H, duration: 200, useNativeDriver: true }).start(onClose);
        } else {
          Animated.spring(dragY, { toValue: 0, damping: 18, stiffness: 200, mass: 1, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current;

  const bgOpacity = dragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.2], extrapolate: "clamp" });
  const scaleIn = enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: bgOpacity }]} />
      <View style={{ flex: 1 }} {...dismiss.panHandlers}>
        <Animated.View style={{ flex: 1, opacity: enter, transform: [{ translateY: dragY }, { scale: scaleIn }] }}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
            style={{ flex: 1 }}
          >
            {images.map((uri, i) => (
              <ZoomableImage key={i} uri={uri} width={W} height={H} onZoom={(z) => { zoomed.current = z; }} />
            ))}
          </ScrollView>
        </Animated.View>
        <Animated.View style={[gs.bar, { paddingTop: insets.top + 6, opacity: bgOpacity }]}>
          <Pressable onPress={onClose} hitSlop={12} style={gs.back} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color="#FFF" />
          </Pressable>
          <Text style={gs.count}>{idx + 1} of {images.length}</Text>
          <View style={gs.back} />
        </Animated.View>
        <Animated.Text style={[gs.hint, { bottom: insets.bottom + 34, opacity: bgOpacity }]}>
          {images.length > 1 ? "Swipe for more · pinch to zoom" : "Pinch to zoom"}
        </Animated.Text>
      </View>
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
