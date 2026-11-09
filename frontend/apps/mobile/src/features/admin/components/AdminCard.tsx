// src/features/admin/components/AdminCard.tsx

import { palette } from "../../../theme/palette";
import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { createThemedStyles } from '../../../theme/themedStyles';

interface AdminCardProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; color: string };
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  rightContent?: React.ReactNode;
  accentColor?: string;
}

export function AdminCard({
  title, subtitle, badge, onPress, children, style, rightContent, accentColor,
}: AdminCardProps) {
  const accent = accentColor ?? badge?.color;
  const { tc, isDark } = useTheme();
  const cardStyle = [s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, style];

  const content = (
    <>
      {/* Left accent bar */}
      {accent && <View style={[s.accentBar, { backgroundColor: accent }]} />}

      <View style={[s.inner, accent ? s.innerIndented : null]}>
        {/* Header row */}
        <View style={s.headerRow}>
          <View style={s.titleGroup}>
            <Text style={[s.title, { color: tc.textPrimary }]} numberOfLines={2}>{title}</Text>
            {subtitle ? <Text style={[s.subtitle, { color: tc.textTertiary }]} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          <View style={s.rightGroup}>
            {badge && (
              <View style={[s.badge, { backgroundColor: badge.color + '15', borderColor: badge.color + '35' }]}>
                <View style={[s.badgeDot, { backgroundColor: badge.color }]} />
                <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            )}
            {rightContent}
          </View>
        </View>

        {/* Body */}
        {children && (
          <View style={[s.body, { borderTopColor: tc.borderLight }]}>
            {children}
          </View>
        )}
      </View>
    </>
  );

  // A plain View must not receive Pressable's style callback (CMP-08).
  if (!onPress) return <View style={cardStyle}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [cardStyle, pressed && { backgroundColor: isDark ? tc.cardElevated : palette.neutralL99_2, transform: [{ scale: 0.99 }] }]}
    >
      {content}
    </Pressable>
  );
}

const s = createThemedStyles({
  card: {
    backgroundColor: palette.white,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardPressed:   { backgroundColor: palette.neutralL99_2, transform: [{ scale: 0.99 }] },
  accentBar:     { width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, flexShrink: 0 },
  inner:         { flex: 1, padding: 15 },
  innerIndented: { paddingLeft: 14 },
  headerRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleGroup:    { flex: 1 },
  rightGroup:    { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  title:         { fontSize: 14, fontWeight: '800', marginBottom: 3, lineHeight: 19 },
  subtitle:      { fontSize: 12, lineHeight: 17 },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeDot:      { width: 5, height: 5, borderRadius: 3 },
  badgeText:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  body:          { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.neutralL95_5 },
});

export default AdminCard;
