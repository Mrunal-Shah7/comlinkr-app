// src/shared/ui/Toast.tsx — design D toast (`.toast`): a glass pill that drops in from the top on the sheet
// spring (translateY −140 % → 0, 420 ms) and leaves upwards after 2 s. Toasts carry feedback only; the one
// exception is an optional action (Undo) for things the user can take back, which keeps it up for 4.5 s.
import { palette } from "../../theme/palette";
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';
import { useTheme } from '../../theme/useTheme';
import { body } from '../../theme/d';
import { SPRING } from '../motion/presets';

export type ToastType = 'success' | 'error' | 'info';
export type ToastAction = { label: string; onPress: () => void };

interface ToastState {
  message: string | null;
  type: ToastType;
  action: ToastAction | null;
  token: number;
  show: (message: string, type?: ToastType, action?: ToastAction | null) => void;
  hide: () => void;
}

const DURATION_MS = 2000;
const ERROR_DURATION_MS = 4000;
const ACTION_DURATION_MS = 4500;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  action: null,
  token: 0,
  show: (message, type = 'info', action = null) => set((s) => ({ message, type, action, token: s.token + 1 })),
  hide: () => set({ message: null, action: null }),
}));

/** Feedback toast. Pass `action` (for example Undo) only for something the user can take back. */
export function showToast(message: string, type: ToastType = 'info', action?: ToastAction): void {
  useToastStore.getState().show(message, type, action ?? null);
}

export function ToastHost() {
  const { message, type, action, token, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const { tc } = useTheme();
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<{ message: string; type: ToastType; action: ToastAction | null } | null>(null);
  const p = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    setShown({ message, type, action });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    p.set(0);
    p.set(reduce ? withTiming(1, { duration: 150 }) : withSpring(1, SPRING.sheet));
    const ms = action ? ACTION_DURATION_MS : type === 'error' ? ERROR_DURATION_MS : DURATION_MS;
    hideTimer.current = setTimeout(() => {
      p.set(withTiming(0, { duration: 260 }, (done) => { if (done) scheduleOnRN(hide); }));
    }, ms);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new token is a new toast
  }, [token]);

  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.get() * 1.4),
    transform: [{ translateY: reduce ? 0 : (1 - p.get()) * -70 }],
  }));

  if (!shown || !message) return null;
  const icon: keyof typeof Ionicons.glyphMap = shown.type === 'success' ? 'checkmark-circle' : shown.type === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor = shown.type === 'success' ? tc.mint : shown.type === 'error' ? tc.dangerText : tc.accentText;

  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[s.wrap, { top: insets.top + 8 }, a]}
    >
      <View pointerEvents={shown.action ? 'auto' : 'none'} style={[s.pill, { backgroundColor: tc.glass, borderColor: tc.glassLine }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={[body(600), s.text, { color: tc.textPrimary }]} numberOfLines={3}>{shown.message}</Text>
        {shown.action ? (
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            onPress={() => {
              const act = shown.action;
              if (hideTimer.current) clearTimeout(hideTimer.current);
              p.set(withTiming(0, { duration: 200 }, (done) => { if (done) scheduleOnRN(hide); }));
              act?.onPress();
            }}
          >
            <Text style={[body(700), { fontSize: 14, color: tc.accentText }]}>{shown.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 9999 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%',
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18, borderWidth: 1,
    shadowColor: palette.black, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 8,
  },
  text: { flexShrink: 1, fontSize: 14 },
});
