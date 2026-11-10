// src/shared/d/ScrollTabs.tsx: a row of text tabs with an underline that scrolls sideways when it does not fit.
// Plan 16 (TR-050): Explore has six tabs since "Following"; the platform segmented control cut their labels
// ("Follo", "Stori"), so Explore uses this instead. It reads differently from the chip rows under it on purpose.
import { useEffect, useRef } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/useTheme';
import { FONT } from '../../theme/d';
import type { SegmentedProps } from './Segmented.types';

export function ScrollTabs({ items, value, onChange, style }: SegmentedProps & { style?: StyleProp<ViewStyle> }) {
  const { tc } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  // Keep the selected tab in view (it can be chosen from elsewhere, e.g. the bento's "Quests").
  useEffect(() => {
    const x = offsets.current[value];
    if (x != null) scroller.current?.scrollTo({ x: Math.max(0, x - 24), animated: true });
  }, [value]);

  return (
    <View style={[{ borderBottomWidth: 1, borderBottomColor: tc.borderLight }, style]} accessibilityRole="tablist">
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {items.map((it) => {
          const on = it.key === value;
          return (
            <Pressable
              key={it.key}
              onLayout={(e: LayoutChangeEvent) => { offsets.current[it.key] = e.nativeEvent.layout.x; }}
              onPress={() => { if (!on) { void Haptics.selectionAsync(); onChange(it.key); } }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              hitSlop={4}
              style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 9, borderBottomWidth: 3, borderBottomColor: on ? tc.accent : 'transparent', marginBottom: -1 }}
            >
              <Text style={{ fontFamily: on ? FONT.bodyBold : FONT.bodySemi, fontSize: 15, color: on ? tc.textPrimary : tc.textSecondary }}>{it.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
