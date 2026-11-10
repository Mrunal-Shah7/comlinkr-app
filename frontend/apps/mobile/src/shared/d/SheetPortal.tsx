// src/shared/d/SheetPortal.tsx — Android sheets drawn in the app's own window (plan 07, TR-041).
//
// A native sheet or React Native Modal opens its own Android dialog window, and that window shows the navigation bar
// the app hides (plan 04). So on Android DSheet does not open a window: SheetFrame.android.tsx hands its content to
// this store, and <SheetPortalHost /> (mounted once in app/_layout.tsx, after the stack, so above the screens and the
// native tab bar) draws it: the scrim, the card sliding up, drag down on the handle to close, Back to close, and the
// card lifted above the keyboard.
//
// The content renders under the root, not under the screen that opened it: it keeps its props and closures, but
// hooks inside it read the root's context (no screen-scoped navigation hooks inside sheet content).
import { useEffect, type ReactElement } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedKeyboard, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Entry = {
  visible: boolean; onClose: () => void; children: ReactElement; seq: number;
  /** 'sheet': DSheet's card (scrim, handle, drag). 'layer': a full-screen layer whose content draws its own backdrop
   *  (InWindowModal, the screens' own React Native Modals before plan 07). */
  kind: 'sheet' | 'layer';
  containerColor?: string;
  animation?: 'slide' | 'fade' | 'none';
};

type PortalState = {
  sheets: Record<string, Entry>;
  put: (id: string, entry: Omit<Entry, 'seq'>) => void;
  remove: (id: string) => void;
};

let seq = 0;

export const useSheetPortal = create<PortalState>((set) => ({
  sheets: {},
  put: (id, entry) => set((st) => ({ sheets: { ...st.sheets, [id]: { ...entry, seq: st.sheets[id]?.seq ?? ++seq } } })),
  remove: (id) => set((st) => {
    if (!st.sheets[id]) return st;
    const next = { ...st.sheets };
    delete next[id];
    return { sheets: next };
  }),
}));

export function SheetPortalHost() {
  const sheets = useSheetPortal((s) => s.sheets);
  const ordered = Object.entries(sheets).sort(([, a], [, b]) => a.seq - b.seq);
  return (
    <>
      {ordered.map(([id, e]) => e.kind === 'layer'
        ? <InWindowLayer key={id} visible={e.visible} onClose={e.onClose} animation={e.animation ?? 'fade'}>{e.children}</InWindowLayer>
        : <InWindowSheet key={id} visible={e.visible} onClose={e.onClose} containerColor={e.containerColor ?? 'transparent'}>{e.children}</InWindowSheet>)}
    </>
  );
}

const CLOSE_DISTANCE = 90;
const CLOSE_VELOCITY = 900;

function InWindowSheet({ visible, onClose, containerColor, children }: {
  visible: boolean; onClose: () => void; containerColor: string; children: ReactElement;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const keyboard = useAnimatedKeyboard();
  const drag = useSharedValue(0);

  // Android Back closes the open sheet first. The newest listener runs first, so a sheet opened over a screen with
  // its own Back history (useBackState) takes Back before the screen does.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => { if (visible) drag.set(0); }, [visible, drag]);

  const pan = Gesture.Pan()
    .onUpdate((e) => { drag.set(Math.max(0, e.translationY)); })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) scheduleOnRN(onClose);
      else drag.set(withTiming(0, { duration: 180 }));
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.get() }],
    marginBottom: keyboard.height.get(),
  }));

  // The layer stays mounted so the scrim and the card, its direct children, can play their exit animations.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {visible ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(200)}
          exiting={reduceMotion ? undefined : FadeOut.duration(180)}
          style={[StyleSheet.absoluteFill, s.scrim]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
      ) : null}
      {visible ? (
        <Animated.View
          entering={reduceMotion ? undefined : SlideInDown.duration(260)}
          exiting={reduceMotion ? undefined : SlideOutDown.duration(200)}
          style={[s.card, { backgroundColor: containerColor, paddingBottom: insets.bottom }, cardStyle]}
          accessibilityViewIsModal
        >
          <GestureDetector gesture={pan}>
            <View style={s.grab} accessibilityLabel="Drag down to close">
              <View style={s.handle} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

function InWindowLayer({ visible, onClose, animation, children }: {
  visible: boolean; onClose: () => void; animation: 'slide' | 'fade' | 'none'; children: ReactElement;
}) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);
  const still = reduceMotion || animation === 'none';
  // A native Modal window resizes for the keyboard; this layer is in the app's window, so it shrinks itself instead
  // and a centred dialog or a full-screen form keeps its fields and buttons above the keyboard.
  const keyboard = useAnimatedKeyboard();
  const lift = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.get() }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {visible ? (
        <Animated.View
          entering={still ? undefined : animation === 'slide' ? SlideInDown.duration(260) : FadeIn.duration(180)}
          exiting={still ? undefined : animation === 'slide' ? SlideOutDown.duration(200) : FadeOut.duration(160)}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[StyleSheet.absoluteFill, lift]}>{children}</Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  card: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', flexShrink: 1 },
  grab: { paddingTop: 12, paddingBottom: 10, alignItems: 'center' },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.45)' },
});
