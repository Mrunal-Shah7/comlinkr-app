// src/shared/ui/Toast.tsx — Brand-colored toast, a lightweight alternative to
// Alert.alert for pure feedback (success/error/info) that doesn't require the
// user to make a decision. Confirm-before-action dialogs should stay as
// Alert.alert — toasts auto-dismiss and must never carry a choice.
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';
import { Colors } from '../../theme/colors';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string | null;
  type: ToastType;
  token: number;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

const DURATION_MS = 2500;
const ERROR_DURATION_MS = 4500;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  token: 0,
  show: (message, type = 'info') => set((s) => ({ message, type, token: s.token + 1 })),
  hide: () => set({ message: null }),
}));

/** Drop-in replacement for a plain Alert.alert(title) success/error toast. */
export function showToast(message: string, type: ToastType = 'info'): void {
  useToastStore.getState().show(message, type);
}

const TYPE_META: Record<ToastType, { bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: Colors.brand.green, icon: 'checkmark-circle' },
  error:   { bg: '#EF4444',          icon: 'alert-circle' },
  info:    { bg: Colors.brand.blue,  icon: 'information-circle' },
};

export function ToastHost() {
  const { message, type, token, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const [visibleType, setVisibleType] = useState<ToastType>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    setVisibleMessage(message);
    setVisibleType(type);

    if (hideTimer.current) clearTimeout(hideTimer.current);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
      ]).start(() => hide());
    }, type === 'error' ? ERROR_DURATION_MS : DURATION_MS);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!visibleMessage) return null;

  const meta = TYPE_META[visibleType];

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        s.wrap,
        { bottom: insets.bottom + 78, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[s.pill, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color="#FFF" />
        <Text style={s.text} numberOfLines={3}>{visibleMessage}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
