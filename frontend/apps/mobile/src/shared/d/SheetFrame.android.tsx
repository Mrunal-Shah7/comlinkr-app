// The Android frame of DSheet: Material 3's ModalBottomSheet from @expo/ui/jetpack-compose (TR-017).
// On the phone (Expo Go, SDK 57) the Material sheet always took the full screen height, whatever its content:
// RNHostView's matchContents was ignored, and a height set on the sheet left it pinned to the top. The universal
// BottomSheet then rested at Material's half-open point, so a tall sheet's footer sat under the navigation bar and a
// short one showed a blank band. So the native sheet here is full height and transparent, opened fully
// (skipPartiallyExpanded); the visible card is drawn in React Native at its bottom, and tapping the space above it
// closes the sheet like the scrim does. Material still gives the scrim, the drag to dismiss and Back. When the keyboard
// opens, the sheet's height drops by the keyboard's; the card shrinks (flexShrink) to fit what is left.
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Host, ModalBottomSheet, RNHostView, type ModalBottomSheetRef } from '@expo/ui/jetpack-compose';
import { fillMaxHeight } from '@expo/ui/jetpack-compose/modifiers';

const TRANSPARENT = '#00000000';

export function SheetFrame({ visible, onClose, containerColor, colorScheme, children }: {
  visible: boolean; onClose: () => void; full?: boolean; containerColor: string; colorScheme: 'light' | 'dark'; children: ReactElement;
}) {
  const { width } = useWindowDimensions();
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    let cancelled = false;
    sheetRef.current?.hide().then(() => {
      if (!cancelled) setMounted(false);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);
  if (!mounted) return null;
  return (
    <Host colorScheme={colorScheme} style={{ position: 'absolute', width }} pointerEvents="none">
      <ModalBottomSheet
        ref={sheetRef}
        onDismissRequest={onClose}
        skipPartiallyExpanded
        showDragHandle={false}
        containerColor={TRANSPARENT}
      >
        <RNHostView modifiers={[fillMaxHeight()]}>
          <View style={{ flex: 1, width, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessible={false} />
            <View style={[s.card, { backgroundColor: containerColor }]}>
              <View style={s.handle} />
              {children}
            </View>
          </View>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}

const s = StyleSheet.create({
  card: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', flexShrink: 1 },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.45)', alignSelf: 'center', marginTop: 12, marginBottom: 10 },
});
