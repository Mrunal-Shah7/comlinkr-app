// src/features/admin/components/StatsWidget.tsx

import { palette } from "../../../theme/palette";
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@theme/colors';
import { createThemedStyles } from '../../../theme/themedStyles';

interface StatsWidgetProps {
  label: string;
  value: number | string;
  subLabel?: string;
  trend?: number;
  color?: string;
  icon?: string;
  gradient?: [string, string];
}

const DEFAULT_GRADIENTS: Record<string, [string, string]> = {
  [Colors.brand.blue]:  [Colors.brand.blue,  palette.blueL40_2],
  [Colors.brand.green]: [Colors.brand.green,  palette.greenL32],
  [palette.amber500]:            [palette.amber500,            palette.amber600],
  [palette.legacyOrange]:            [palette.legacyOrange,            palette.orangeL44],
  [palette.red500]:            [palette.red500,            palette.redL46],
  [palette.violet500]:            [palette.violet500,            palette.legacyPurple],
};

export const StatsWidget: React.FC<StatsWidgetProps> = ({
  label, value, subLabel, trend, color = Colors.brand.blue, icon, gradient,
}) => {
  const formatted = typeof value === 'number' && value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value;
  const trendPositive = trend !== undefined && trend >= 0;
  const gradientColors = gradient ?? DEFAULT_GRADIENTS[color] ?? ([color, color] as [string, string]);

  return (
    <View style={s.card}>
      <View style={s.top}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.iconBox}
        >
          {icon && <Ionicons name={icon as any} size={17} color={palette.white} />}
        </LinearGradient>
        {trend !== undefined && (
          <View style={[s.trendPill, { backgroundColor: trendPositive ? palette.greenL95 : palette.red50 }]}>
            <Ionicons
              name={trendPositive ? 'trending-up' : 'trending-down'}
              size={10}
              color={trendPositive ? Colors.brand.green : palette.red500}
            />
            <Text style={[s.trendText, { color: trendPositive ? Colors.brand.green : palette.red500 }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[s.value, { color }]}>{formatted}</Text>
      <Text style={s.label}>{label}</Text>
      {subLabel ? <Text style={s.subLabel}>{subLabel}</Text> : null}
      <View style={[s.accent, { backgroundColor: color }]} />
    </View>
  );
};

const s = createThemedStyles({
  card: {
    backgroundColor: palette.white,
    borderRadius: 18,
    padding: 16,
    width: '47%',
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  top:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconBox:   { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  trendText: { fontSize: 10, fontWeight: '700' },
  value:     { fontSize: 26, fontWeight: '900', letterSpacing: -0.8, marginBottom: 3 },
  label:     { fontSize: 11, color: Colors.text.secondary, fontWeight: '600', letterSpacing: 0.2 },
  subLabel:  { fontSize: 10, color: Colors.text.tertiary, marginTop: 3 },
  accent:    { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
});

export default StatsWidget;
