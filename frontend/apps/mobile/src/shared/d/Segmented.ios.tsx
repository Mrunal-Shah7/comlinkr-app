// src/shared/d/Segmented.ios.tsx — the iOS segmented control (SwiftUI Picker, segmented style) from @expo/ui (plan 02).
import type { StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Host } from '@expo/ui';
import { Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '../../theme/useTheme';
import type { SegmentedProps } from './Segmented.types';

export function Segmented({ items, value, onChange, style }: SegmentedProps & { style?: StyleProp<ViewStyle> }) {
  const { isDark } = useTheme();
  return (
    <Host matchContents={{ vertical: true }} colorScheme={isDark ? 'dark' : 'light'} style={style}>
      <Picker<string>
        selection={value}
        onSelectionChange={(k) => { if (k !== value) { void Haptics.selectionAsync(); onChange(k); } }}
        modifiers={[pickerStyle('segmented')]}
      >
        {items.map((it) => <Text key={it.key} modifiers={[tag(it.key)]}>{it.label}</Text>)}
      </Picker>
    </Host>
  );
}
