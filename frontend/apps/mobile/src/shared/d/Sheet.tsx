// src/shared/d/Sheet.tsx — bottom sheet (plan 02): the platform's own sheet from @expo/ui (a SwiftUI sheet on iOS,
// a Material 3 ModalBottomSheet on Android), with its own drag to dismiss, scrim and Back handling. The title row
// and the content are React Native views hosted inside it (RNHostView, so touches and scrolling reach React Native).
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Host, RNHostView } from '@expo/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { TYPE } from '../../theme/d';


export function DSheet({ visible, onClose, title, children, full, style }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode;
  /** Open at full height (forms); otherwise the sheet sizes to its content, up to 88% of the screen. */
  full?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { isDark, tc } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // The native sheet does not move React Native content above the keyboard; growing the content by the keyboard's
  // height lifts the fields into view.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); setKb(0); };
  }, [visible]);
  return (
    <Host colorScheme={isDark ? 'dark' : 'light'} style={s.host} pointerEvents="box-none">
      <BottomSheet isPresented={visible} onDismiss={onClose} snapPoints={full || kb ? ['full'] : undefined} contentPadding={0} containerColor={tc.sheetBg}>
        <RNHostView matchContents={{ vertical: true }}>
          <View
            style={[{ width: '100%', backgroundColor: tc.sheetBg, paddingBottom: (kb || insets.bottom) + 16, maxHeight: height * (full ? 0.94 : 0.88) }, full && { height: height * 0.94 }, style]}
          >
            {title ? (
              <View style={s.head}>
                <Text style={[TYPE.section, { color: tc.textPrimary }]}>{title}</Text>
                <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={s.x}><Ionicons name="close" size={22} color={tc.textPrimary} /></Pressable>
              </View>
            ) : null}
            {children}
          </View>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
}

const s = StyleSheet.create({
  host: { position: 'absolute', width: 0, height: 0 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 },
  x: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});
