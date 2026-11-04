// src/shared/ui/Dialogs.tsx - theme-aware ConfirmDialog and ActionSheet (POP-01 / POP-02).
// Imperative API so call sites migrate from Alert.alert with minimal change:
//   if (await confirmDialog({ title, message, confirmLabel, destructive })) { ... }
//   const reason = await actionSheet({ title, options: [{ label, value }] });
// <DialogHost /> must be mounted once at the root.
import { useEffect } from 'react';
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
import { Colors } from '../../theme/colors';

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
        <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
          <Pressable style={[s.backdrop, { backgroundColor: tc.overlay }]} onPress={dismiss} accessible={false}>
            <Pressable
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
                          backgroundColor: isDestructive
                            ? '#EF4444'
                            : primary
                              ? Colors.brand.blue
                              : tc.inputBg,
                        },
                        pressed && s.pressed,
                      ]}
                      onPress={() => run(b)}
                    >
                      <Text style={[s.btnText, { color: primary || isDestructive ? '#FFFFFF' : tc.textPrimary }]}>
                        {b.text ?? 'OK'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      );
    }
    return (
      <Modal visible transparent animationType="slide" onRequestClose={dismiss} statusBarTranslucent>
        <Pressable style={[s.sheetBackdrop, { backgroundColor: tc.overlay }]} onPress={dismiss} accessible={false}>
          <Pressable
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
            <ScrollView style={s.optionList} bounces={false}>
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
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  if (current.kind === 'confirm') {
    const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive } = current.opts;
    return (
      <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
        <Pressable style={[s.backdrop, { backgroundColor: tc.overlay }]} onPress={dismiss} accessible={false}>
          <Pressable
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
                  { backgroundColor: destructive ? '#EF4444' : Colors.brand.blue },
                  pressed && s.pressed,
                ]}
                onPress={() => {
                  current.resolve(true);
                  close();
                }}
              >
                <Text style={[s.btnText, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  const { title, message, options, cancelLabel = 'Cancel' } = current.opts;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={[s.sheetBackdrop, { backgroundColor: tc.overlay }]} onPress={dismiss} accessible={false}>
        <Pressable
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
          <ScrollView style={s.optionList} bounces={false}>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  message: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  btnText: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 8, maxHeight: '85%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  optionList: { marginTop: 8, flexGrow: 0 },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { fontSize: 16, fontWeight: '600' },
  cancel: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
