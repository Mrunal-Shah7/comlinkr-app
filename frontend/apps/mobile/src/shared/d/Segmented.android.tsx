// src/shared/d/Segmented.android.tsx — the Material 3 segmented button row (Jetpack Compose) from @expo/ui (plan 02).
import type { StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Host } from '@expo/ui';
import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from '../../theme/useTheme';
import type { SegmentedProps } from './Segmented.types';

export function Segmented({ items, value, onChange, style }: SegmentedProps & { style?: StyleProp<ViewStyle> }) {
  const { isDark, tc } = useTheme();
  return (
    <Host matchContents={{ vertical: true }} colorScheme={isDark ? 'dark' : 'light'} seedColor={tc.accent} style={style}>
      <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
        {items.map((it) => (
          <SegmentedButton
            key={it.key}
            selected={it.key === value}
            onClick={() => { if (it.key !== value) { void Haptics.selectionAsync(); onChange(it.key); } }}
          >
            <SegmentedButton.Label><Text maxLines={1}>{it.label}</Text></SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
