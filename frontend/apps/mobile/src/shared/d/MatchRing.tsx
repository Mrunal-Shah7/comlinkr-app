// src/shared/d/MatchRing.tsx — the match ring (design D, plan 01): the green arc sweeps from 0 to the score over
// 900 ms (Easing.out(cubic)) and the number counts up with it. Reduce motion: shown at once.
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedReaction, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { display } from "../../theme/d";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function MatchRing({ score, size = 72, stroke = 6 }: { score: number; size?: number; stroke?: number }) {
  const { tc } = useTheme();
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(reduce ? score : 0);
  const [shown, setShown] = useState(reduce ? score : 0);

  useEffect(() => {
    p.value = reduce ? score : withDelay(250, withTiming(score, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [score, reduce, p]);
  useAnimatedReaction(() => Math.round(p.value), (v, prev) => { if (v !== prev) runOnJS(setShown)(v); });
  const arc = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, p.value)) / 100) }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`${score}% match`}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={tc.surface3} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={tc.mint} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} animatedProps={arc} />
      </Svg>
      <Text style={[display(800), { fontSize: size * 0.24, color: tc.textPrimary }]}>{shown}%</Text>
    </View>
  );
}
