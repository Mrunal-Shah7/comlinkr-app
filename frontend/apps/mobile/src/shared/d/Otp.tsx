// src/shared/d/Otp.tsx — the 6-digit code boxes of design D (plan 01, design screens "otp" and "forgot").
// One hidden TextInput holds the code (so paste, autofill and the number pad all work); six boxes show it.
// Motion: each digit pops in on a spring, a wrong code shakes the row (useShake), and a right code sweeps the boxes
// green from left to right. Reduce motion keeps the colours and drops the movement.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TYPE, display } from "../../theme/d";
import { useShake } from "./index";

export type OtpHandle = { shake: () => void; focus: () => void };

function Box({ ch, active, ok, index }: { ch: string; active: boolean; ok: boolean; index: number }) {
  const { tc } = useTheme();
  const reduce = useReducedMotion();
  const pop = useSharedValue(1);
  const green = useSharedValue(0);
  useEffect(() => {
    if (ch && !reduce) pop.set(withSequence(withTiming(1.14, { duration: 90 }), withSpring(1, { damping: 14, stiffness: 320, mass: 1 })));
  }, [ch, reduce, pop]);
  useEffect(() => {
    green.set(ok ? (reduce ? 1 : withDelay(index * 55, withTiming(1, { duration: 220 }))) : 0);
  }, [ok, index, reduce, green]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const g = useAnimatedStyle(() => ({ opacity: green.get() }));
  return (
    <Animated.View style={[s.box, { backgroundColor: tc.inputBg, borderColor: active ? tc.accent : ch ? tc.borderMedium : "transparent" }, a]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 16, backgroundColor: tc.mintSoft, borderWidth: 1.5, borderColor: tc.mint }, g]} />
      <Text style={[display(800), { fontSize: 26, color: tc.textPrimary }]}>{ch}</Text>
    </Animated.View>
  );
}

export const OtpBoxes = forwardRef<OtpHandle, {
  value: string;
  onChange: (v: string) => void;
  /** Called once when the sixth digit is typed. */
  onComplete?: (v: string) => void;
  ok?: boolean;
  autoFocus?: boolean;
  length?: number;
}>(function OtpBoxes({ value, onChange, onComplete, ok = false, autoFocus, length = 6 }, ref) {
  const input = useRef<TextInput>(null);
  const { style, shake } = useShake();
  // A wrong code shakes the row, then the boxes empty so the next try starts clean (design D `otp`).
  useImperativeHandle(ref, () => ({
    shake: () => { shake(); setTimeout(() => { onChange(""); input.current?.focus(); }, 440); },
    focus: () => input.current?.focus(),
  }), [shake, onChange]);
  const digits = value.replace(/\D/g, "").slice(0, length);
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityRole="none" accessibilityLabel={`Code, ${digits.length} of ${length} digits`}>
      <Animated.View style={[s.row, style]}>
        {Array.from({ length }).map((_, i) => (
          <Box key={i} index={i} ch={digits[i] ?? ""} active={!ok && i === Math.min(digits.length, length - 1)} ok={ok} />
        ))}
      </Animated.View>
      <TextInput
        ref={input}
        value={digits}
        onChangeText={(t) => {
          const v = t.replace(/\D/g, "").slice(0, length);
          onChange(v);
          if (v.length === length && digits.length < length) onComplete?.(v);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        style={s.hidden}
        accessibilityLabel="Verification code"
      />
    </Pressable>
  );
});

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
  box: { width: 48, height: 58, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});

/** "Send again in 0:30", counting down; then a "Send again" link that restarts the count when pressed. */
export function ResendCode({ onResend, seconds = 30, busy }: { onResend: () => void | Promise<void>; seconds?: number; busy?: boolean }) {
  const { tc } = useTheme();
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (left > 0) {
    return (
      <Text style={[TYPE.small, { color: tc.textTertiary, textAlign: "center" }]} accessibilityLiveRegion="polite">
        Send again in 0:{String(left).padStart(2, "0")}
      </Text>
    );
  }
  return (
    <Pressable onPress={async () => { await onResend(); setLeft(seconds); }} disabled={busy} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "center" }}>
      <Text style={[TYPE.small, { color: tc.accentText, fontFamily: "Manrope_700Bold", opacity: busy ? 0.5 : 1 }]}>Send again</Text>
    </Pressable>
  );
}
