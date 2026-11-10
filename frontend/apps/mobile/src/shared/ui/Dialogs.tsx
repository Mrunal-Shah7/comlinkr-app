// src/shared/ui/Dialogs.tsx - theme-aware ConfirmDialog and ActionSheet (POP-01 / POP-02).
// Imperative API so call sites migrate from Alert.alert with minimal change:
//   if (await confirmDialog({ title, message, confirmLabel, destructive })) { ... }
//   const reason = await actionSheet({ title, options: [{ label, value }] });
// <DialogHost /> must be mounted once at the root.
import { palette } from "../../theme/palette";
import { useEffect, type ReactNode } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useTheme } from '../../theme/useTheme';
import Animated, { FadeIn, SlideInDown, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { TYPE, display } from '../../theme/d';
import { GradientFill } from '../d';

/**
 * The dialog's layer. On Android it is drawn in the app's own window, like the sheets (plan 07, TR-041): a Modal
 * opens its own window, which shows the navigation bar the app hides. DialogHost is mounted after the sheet portal,
 * so a dialog sits above an open sheet. On iOS the native sheets are presented above React Native, so a Modal is
 * still needed there to show a dialog over a sheet. Back is handled by DialogHost's own listener.
 */
function DialogLayer({ onRequestClose, children }: { onRequestClose: () => void; children: ReactNode }) {
  if (process.env.EXPO_OS === 'android') {
    return <Animated.View entering={FadeIn.duration(160)} style={StyleSheet.absoluteFill}>{children}</Animated.View>;
  }
  return <Modal visible transparent animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent>{children}</Modal>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface SheetOption<T extends string = string> {
  label: string;
  value: T;
  destructive?: boolean;
}

export interface ActionSheetOptions<T extends string = string> {
  title?: string;
  message?: string;
  options: SheetOption<T>[];
  cancelLabel?: string;
}

export interface AppAlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: (value?: string) => void;
}

type DialogRequest =
  | { kind: 'alert'; title: string; message?: string; buttons: AppAlertButton[]; cancelable: boolean }
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'sheet'; opts: ActionSheetOptions; resolve: (v: string | null) => void };

interface DialogState {
  current: DialogRequest | null;
  queue: DialogRequest[];
  push: (r: DialogRequest) => void;
  close: () => void;
}

const useDialogStore = create<DialogState>((set, get) => ({
  current: null,
  queue: [],
  push: (r) => {
    if (get().current) set((s) => ({ queue: [...s.queue, r] }));
    else set({ current: r });
  },
  close: () => {
    const [next, ...rest] = get().queue;
    set({ current: next ?? null, queue: rest });
  },
}));

/**
 * Drop-in, theme-aware replacement for Alert.alert (same argument shape).
 * 1-2 buttons render as a dialog, 3+ buttons as a scrollable action sheet with an explicit Cancel.
 */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: { cancelable?: boolean },
): void {
  const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  const hasCancel = list.some((b) => b.style === 'cancel');
  useDialogStore.getState().push({
    kind: 'alert',
    title,
    message,
    buttons: list,
    cancelable: options?.cancelable ?? (hasCancel || list.length === 1),
  });
}

/** Resolves true on confirm, false on cancel/back/backdrop. */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) =>
    useDialogStore.getState().push({ kind: 'confirm', opts, resolve }),
  );
}

/** Resolves the chosen option value, or null when dismissed via Cancel/back/backdrop. */
export function actionSheet<T extends string>(opts: ActionSheetOptions<T>): Promise<T | null> {
  return new Promise((resolve) =>
    useDialogStore.getState().push({
      kind: 'sheet',
      opts: opts as ActionSheetOptions,
      resolve: resolve as (v: string | null) => void,
    }),
  );
}

export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  const close = useDialogStore((s) => s.close);
  const { tc } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();

  function dismiss() {
    if (!current) return;
    if (current.kind === 'alert') {
      if (!current.cancelable) return;
      const cancel = current.buttons.find((b) => b.style === 'cancel');
      close();
      cancel?.onPress?.();
      return;
    }
    if (current.kind === 'confirm') current.resolve(false);
    else current.resolve(null);
    close();
  }

  useEffect(() => {
    if (!current) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;

  if (current.kind === 'alert') {
    const { title, message, buttons } = current;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const actionBtns = buttons.filter((b) => b !== cancelBtn);
    const run = (b: AppAlertButton) => {
      close();
      // Let the modal unmount before running follow-up work (matches native Alert timing).
      setTimeout(() => b.onPress?.(), 0);
    };
    if (buttons.length <= 2) {
      return (
        <DialogLayer onRequestClose={dismiss}>
          <Pressable style={[s.backdrop, { backgroundColor: tc.overlay }]} onPress={dismiss} accessible={false}>
            <AnimatedPressable
              entering={reduce ? undefined : ZoomIn.springify().damping(22).stiffness(320).mass(1).withInitialValues({ transform: [{ scale: 0.86 }] })}
              style={[s.dialog, { backgroundColor: tc.sheetBg, borderColor: tc.borderLight }]}
              onPress={() => {}}
              accessibilityViewIsModal
            >
              <Text style={[s.title, { color: tc.textPrimary }]} accessibilityRole="header">{title}</Text>
              {!!message && <Text style={[s.message, { color: tc.textSecondary }]}>{message}</Text>}
              <View style={s.row}>
                {buttons.map((b, i) => {
                  const isCancel = b === cancelBtn;
                  const isDestructive = b.style === 'destructive';
                  const primary = !isCancel && buttons.length > 1 ? true : buttons.length === 1;
                  return (
                    <Pressable
                      key={`${b.text ?? 'ok'}-${i}`}
                      accessibilityRole="button"
                      accessibilityLabel={b.text ?? 'OK'}
                      style={({ pressed }) => [
                        s.btn,
                        {
                          backgroundColor: isDestructive ? palette.redL59 : primary ? 'transparent' : tc.inputBg,
                        },
                        pressed && s.pressed,
                      ]}
                      onPress={() => run(b)}
                    >
                      {primary && !isDestructive ? <GradientFill style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} /> : null}
                      <Text style={[s.btnText, { color: primary || isDestructive ? palette.white : tc.textPrimary }]}>
                        {b.text ?? 'OK'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </AnimatedPressable>
          </Pressable>
        </DialogLayer>
      );
    }
    return (
      <DialogLayer onRequestClose={dismiss}>
        <Pressable style={[s.sheetBackdrop, { backgroundColor: tc.overlay }]} onPress={dismiss} accessible={false}>
          <AnimatedPressable
            entering={reduce ? undefined : SlideInDown.springify().damping(24).stiffness(260).mass(1)}
            style={[
              s.sheet,
              { backgroundColor: tc.sheetBg, borderColor: tc.borderLight, paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
            onPress={() => {}}
            accessibilityViewIsModal
          >
            <View style={[s.grabber, { backgroundColor: tc.borderMedium }]} />
            <Text style={[s.title, { color: tc.textPrimary }]} accessibilityRole="header">{title}</Text>
            {!!message && <Text style={[s.message, { color: tc.textSecondary }]}>{message}</Text>}
            <ScrollView style={[s.optionList, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]} bounces={false}>
              {actionBtns.map((b, i) => (
                <Pressable
                  key={`${b.text ?? 'opt'}-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={b.text ?? 'OK'}
                  style={({ pressed }) => [s.option, { borderColor: tc.borderLight }, pressed && { backgroundColor: tc.inputBg }]}
                  onPress={() => run(b)}
                >
                  <Text style={[s.optionText, { color: b.style === 'destructive' ? tc.dangerText : tc.textPrimary }]}>
                    {b.text ?? 'OK'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelBtn?.text ?? 'Cancel'}
              style={({ pressed }) => [s.cancel, { backgroundColor: tc.inputBg }, pressed && s.pressed]}
              onPress={() => {
                close();
                if (cancelBtn) setTimeout(() => cancelBtn.onPress?.(), 0);
              }}
            >
              <Text style={[s.btnText, { color: tc.textPrimary }]}>{cancelBtn?.text ?? 'Cancel'}</Text>
            </Pressable>
          </AnimatedPressable>
        </Pressable>
      </DialogLayer>
    );
  }

  if (current.kind === 'confirm') {
    const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive } = current.opts;
    return (
      <DialogLayer onRequestClose={dismiss}>
        <Pressable style={[s.backdrop, { backgroundColor: tc.overlay }]} onPress={dismiss} accessible={false}>
          <AnimatedPressable
            entering={reduce ? undefined : ZoomIn.springify().damping(22).stiffness(320).mass(1).withInitialValues({ transform: [{ scale: 0.86 }] })}
            style={[s.dialog, { backgroundColor: tc.sheetBg, borderColor: tc.borderLight }]}
            onPress={() => {}}
            accessibilityViewIsModal
          >
            <Text style={[s.title, { color: tc.textPrimary }]} accessibilityRole="header">{title}</Text>
            {!!message && <Text style={[s.message, { color: tc.textSecondary }]}>{message}</Text>}
            <View style={s.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                style={({ pressed }) => [s.btn, { backgroundColor: tc.inputBg }, pressed && s.pressed]}
                onPress={dismiss}
              >
                <Text style={[s.btnText, { color: tc.textPrimary }]}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                style={({ pressed }) => [
                  s.btn,
                  { backgroundColor: destructive ? palette.redL59 : 'transparent' },
                  pressed && s.pressed,
                ]}
                onPress={() => {
                  current.resolve(true);
                  close();
                }}
              >
                {!destructive ? <GradientFill style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} /> : null}
                <Text style={[s.btnText, { color: palette.white }]}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </AnimatedPressable>
        </Pressable>
      </DialogLayer>
    );
  }

  const { title, message, options, cancelLabel = 'Cancel' } = current.opts;
  return (
    <DialogLayer onRequestClose={dismiss}>
      <Pressable style={[s.sheetBackdrop, { backgroundColor: tc.overlay }]} onPress={dismiss} accessible={false}>
        <AnimatedPressable
          entering={reduce ? undefined : SlideInDown.springify().damping(24).stiffness(260).mass(1)}
          style={[
            s.sheet,
            { backgroundColor: tc.sheetBg, borderColor: tc.borderLight, paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
          onPress={() => {}}
          accessibilityViewIsModal
        >
          <View style={[s.grabber, { backgroundColor: tc.borderMedium }]} />
          {!!title && <Text style={[s.title, { color: tc.textPrimary }]} accessibilityRole="header">{title}</Text>}
          {!!message && <Text style={[s.message, { color: tc.textSecondary }]}>{message}</Text>}
          <ScrollView style={[s.optionList, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]} bounces={false}>
            {options.map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                accessibilityLabel={o.label}
                style={({ pressed }) => [s.option, { borderColor: tc.borderLight }, pressed && { backgroundColor: tc.inputBg }]}
                onPress={() => {
                  current.resolve(o.value);
                  close();
                }}
              >
                <Text style={[s.optionText, { color: o.destructive ? tc.dangerText : tc.textPrimary }]}>{o.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={({ pressed }) => [s.cancel, { backgroundColor: tc.inputBg }, pressed && s.pressed]}
            onPress={dismiss}
          >
            <Text style={[s.btnText, { color: tc.textPrimary }]}>{cancelLabel}</Text>
          </Pressable>
        </AnimatedPressable>
      </Pressable>
    </DialogLayer>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 22, gap: 8 },
  title: { ...display(700), fontSize: 20 },
  message: { ...TYPE.body },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, overflow: 'hidden' },
  btnText: { ...TYPE.button },
  pressed: { opacity: 0.85 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 8, maxHeight: '85%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  optionList: { marginTop: 10, flexGrow: 0, borderRadius: 20, borderWidth: 1 },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { ...TYPE.body, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  cancel: { minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
