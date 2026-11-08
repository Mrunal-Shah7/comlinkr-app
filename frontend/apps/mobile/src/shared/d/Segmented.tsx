// src/shared/d/Segmented.tsx — fallback for platforms without a native segmented control (web): the universal
// @expo/ui Picker. iOS and Android load Segmented.ios.tsx / Segmented.android.tsx (plan 02).
import type { StyleProp, ViewStyle } from 'react-native';
import { Host, Picker } from '@expo/ui';
import type { SegmentedProps } from './Segmented.types';

export function Segmented({ items, value, onChange, style }: SegmentedProps & { style?: StyleProp<ViewStyle> }) {
  return (
    <Host matchContents style={style}>
      <Picker selectedValue={value} onValueChange={(k) => onChange(String(k))}>
        {items.map((it) => <Picker.Item key={it.key} label={it.label} value={it.key} />)}
      </Picker>
    </Host>
  );
}
