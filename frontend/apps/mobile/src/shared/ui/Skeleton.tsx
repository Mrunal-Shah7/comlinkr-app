// src/shared/ui/Skeleton.tsx — pulsing placeholders shown while lists load (instead of spinners).
import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";

export function SkeletonBlock({
  width = "100%",
  height,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { tc } = useTheme();
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: tc.skeletonBg }, style, animated]}
    />
  );
}

/** Placeholder matching the listing/restaurant card silhouette (photo + body rows). */
export function SkeletonCard({ imageHeight = 200 }: { imageHeight?: number }) {
  const { tc } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      {imageHeight > 0 ? <SkeletonBlock height={imageHeight} radius={0} /> : null}
      <View style={styles.body}>
        <View style={styles.row}>
          <SkeletonBlock width={38} height={38} radius={19} />
          <SkeletonBlock width="45%" height={14} />
        </View>
        <SkeletonBlock width="85%" height={18} />
        <SkeletonBlock width="55%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  body: { padding: 16, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
