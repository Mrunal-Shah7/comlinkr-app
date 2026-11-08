// Split out of app/create-post.tsx (TR-013, point 9b).
import { View, Text, Pressable } from "react-native";
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { SPRING } from "../../shared/motion/presets";
import { Ionicons } from "@expo/vector-icons";
import { type HousingListingImageRef } from "../../api/housing.api";
import { FadeImage } from "../../../components/FadeImage";
import { TILE_STEP } from "./constants";

export function DraggableListingImage({ image, index, count, onMove, onRemove, busy }: { image: HousingListingImageRef; index: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void; busy: boolean }) {
  const dragX = useSharedValue(0);
  const drop = (dx: number) => {
    const target = Math.max(0, Math.min(count - 1, index + Math.round(dx / TILE_STEP)));
    if (target !== index) onMove(index, target);
  };
  const pan = Gesture.Pan()
    .enabled(!busy)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onUpdate((e) => { dragX.set(e.translationX); })
    .onEnd((e) => { scheduleOnRN(drop, e.translationX); })
    .onFinalize(() => { dragX.set(withSpring(0, SPRING.settle)); });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.get() }] }));
  return (
    <GestureDetector gesture={pan}>
      <Reanimated.View style={[{ width: 88, zIndex: 2, opacity: busy ? 0.7 : 1 }, dragStyle]}>
        <FadeImage uri={image.url} style={{ width: 88, height: 88, borderRadius: 12 }} />
        {index === 0 ? <View style={{ position: "absolute", left: 4, bottom: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: "#FFF", fontSize: 9, fontWeight: "800" }}>Primary photo</Text></View> : null}
        <Pressable disabled={busy} onPress={onRemove} accessibilityLabel="Remove photo" hitSlop={8} style={{ position: "absolute", right: -5, top: -5, borderRadius: 12, backgroundColor: "#111827", padding: 4, opacity: busy ? 0.5 : 1 }}>
          <Ionicons name="trash-outline" size={13} color="#FFF" />
        </Pressable>
      </Reanimated.View>
    </GestureDetector>
  );
}
