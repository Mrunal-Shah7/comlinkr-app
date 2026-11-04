import { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Animated, PanResponder, StyleSheet, Modal, Dimensions } from "react-native";
// Gesture-handler scrollers keep horizontal drags away from the tab-swipe pager.
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { FadeImage, resolveImageUri } from "../../../../components/FadeImage";
import { rs } from "../../../utils/responsive";

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

export function ZoomableImage({ uri, width, height }: { uri: string; width: number; height: number }) {
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
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: startIndex * W, animated: false });
  }, [startIndex, W]);

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.97)" }}>
        {/* Close */}
        <Pressable
          onPress={onClose}
          hitSlop={12}
//           style={{ position: "absolute", top: 52, right: 20, zIndex: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
          // New:
          style={{ position: "absolute", top: 52, right: 20, zIndex: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="close" size={22} color="#FFF" />
        </Pressable>
        {/* Counter */}
        {images.length > 1 && (
          <View style={{ position: "absolute", top: 58, left: 0, right: 0, zIndex: 15, alignItems: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "700" }}>{idx + 1} / {images.length}</Text>
          </View>
        )}
        {/* Pinch hint */}
        <View style={{ position: "absolute", bottom: 40, left: 0, right: 0, zIndex: 15, alignItems: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Pinch to zoom · Long press to reset</Text>
        </View>
        {/* Images */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
          style={{ flex: 1 }}
        >
          {images.map((uri, i) => (
            <ZoomableImage key={i} uri={uri} width={W} height={H} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export const cs = StyleSheet.create({
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
