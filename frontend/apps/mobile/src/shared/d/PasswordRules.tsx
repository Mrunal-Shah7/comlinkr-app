// src/shared/d/PasswordRules.tsx — design D sign-up: the password rules show as you type; each one ticks green
// with a small pop when it is met.
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { TYPE } from '../../theme/d';

export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One capital letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
];
export const passwordOk = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

function Rule({ label, met }: { label: string; met: boolean }) {
  const { tc } = useTheme();
  const reduce = useReducedMotion();
  const sc = useSharedValue(1);
  const was = useRef(met);
  useEffect(() => {
    if (met && !was.current && !reduce) sc.set(withSequence(withTiming(1.3, { duration: 110 }), withSpring(1, { damping: 12, stiffness: 260, mass: 1 })));
    was.current = met;
  }, [met, reduce, sc]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: sc.get() }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel={`${label}: ${met ? 'done' : 'not yet'}`}>
      <Animated.View style={a}>
        <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={17} color={met ? tc.mint : tc.textTertiary} />
      </Animated.View>
      <Text style={[TYPE.small, { color: met ? tc.textPrimary : tc.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function PasswordRules({ password }: { password: string }) {
  return (
    <View style={{ gap: 6, marginTop: 10, marginLeft: 2 }}>
      {PASSWORD_RULES.map((r) => <Rule key={r.label} label={r.label} met={r.test(password)} />)}
    </View>
  );
}
