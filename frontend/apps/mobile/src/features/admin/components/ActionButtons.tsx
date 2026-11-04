// src/features/admin/components/ActionButtons.tsx

import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminActionType, ACTION_CONFIGS } from '../types';
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';

type Variant = 'primary' | 'success' | 'danger' | 'warning' | 'ghost';

const VARIANT_CONFIG: Record<Variant, {
  gradient: [string, string];
  textColor: string;
  iconColor: string;
}> = {
  success: { gradient: [Colors.brand.green,  '#1A8A18'],  textColor: '#FFF', iconColor: '#FFF' },
  danger:  { gradient: ['#EF4444',            '#C72626'],  textColor: '#FFF', iconColor: '#FFF' },
  warning: { gradient: ['#F59E0B',            '#D97706'],  textColor: '#FFF', iconColor: '#FFF' },
  primary: { gradient: [Colors.brand.blue,    '#0054CC'],  textColor: '#FFF', iconColor: '#FFF' },
  ghost:   { gradient: ['#F3F4F6',            '#E8EAED'],  textColor: Colors.text.secondary, iconColor: Colors.text.tertiary },
};

const ACTION_ICONS: Record<AdminActionType, string> = {
  approve:        'checkmark-circle',
  reject:         'close-circle',
  suspend:        'pause-circle',
  delete:         'trash',
  restore:        'refresh-circle',
  warn:           'warning',
  ban:            'ban',
  grant_badge:    'shield-checkmark',
  revoke_badge:   'shield',
  remove_content: 'trash',
  feature:        'star',
};

interface ActionButtonsProps {
  actions: AdminActionType[];
  onAction: (action: AdminActionType) => void;
}

export function ActionButtons({ actions, onAction }: ActionButtonsProps) {
  const handlePress = (action: AdminActionType) => {
    const config = ACTION_CONFIGS[action];
    if (config.requiresConfirmation) {
      appAlert(
        'Confirm Action',
        config.confirmMessage ?? 'Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: config.label,
            style: (action === 'delete' || action === 'ban') ? 'destructive' : 'default',
            onPress: () => onAction(action),
          },
        ],
      );
    } else {
      onAction(action);
    }
  };

  return (
    <View style={s.row}>
      {actions.map((action) => {
        const config  = ACTION_CONFIGS[action];
        const variant = (config.variant as Variant) ?? 'ghost';
        const vc      = VARIANT_CONFIG[variant];
        return (
          <Pressable
            key={action}
            onPress={() => handlePress(action)}
            style={({ pressed }) => [s.btnWrap, pressed && s.btnPressed]}
          >
            <LinearGradient
              colors={vc.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.btn}
            >
              <Ionicons name={ACTION_ICONS[action] as any} size={13} color={vc.iconColor} />
              <Text style={[s.btnText, { color: vc.textColor }]}>{config.label}</Text>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = createThemedStyles({
  row:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnWrap:    { borderRadius: 11, overflow: 'hidden', shadowColor: '#0A2540', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  btnPressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  btn:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11 },
  btnText:    { fontSize: 12, fontWeight: '800', letterSpacing: 0.1 },
});

export default ActionButtons;
