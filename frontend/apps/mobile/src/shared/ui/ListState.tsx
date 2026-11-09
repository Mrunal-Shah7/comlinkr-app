// src/shared/ui/ListState.tsx - one contract for loading / error / empty / filtered-empty / needs-city (UI-05).
import { palette } from "../../theme/palette";
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';
import { SkeletonCard } from './Skeleton';

type IconName = keyof typeof Ionicons.glyphMap;

export type ListStateKind = 'loading' | 'error' | 'empty' | 'filtered-empty' | 'needs-city';

interface ListStateProps {
  kind: ListStateKind;
  /** Overrides the default title. */
  title?: string;
  message?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  /** Secondary action (e.g. clear filters). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Loading placeholder shape: photo cards (default) or text rows. */
  skeleton?: 'card' | 'row';
}

const DEFAULTS: Record<ListStateKind, { icon: IconName; title: string; message?: string; action?: string }> = {
  loading: { icon: 'hourglass-outline', title: 'Loading...' },
  error: { icon: 'cloud-offline-outline', title: "Couldn't load this", message: 'Check your connection and try again.', action: 'Retry' },
  empty: { icon: 'file-tray-outline', title: 'Nothing here yet' },
  'filtered-empty': { icon: 'search-outline', title: 'No matches', message: 'Try a different search or clear your filters.', action: 'Clear filters' },
  'needs-city': {
    icon: 'location-outline',
    title: 'Choose your city',
    message: 'Pick your city to see what is happening near you.',
    action: 'Choose city',
  },
};

export function ListState({ kind, title, message, icon, actionLabel, onAction, secondaryLabel, onSecondary, skeleton = 'card' }: ListStateProps) {
  const { tc } = useTheme();
  const d = DEFAULTS[kind];

  if (kind === 'loading') {
    return (
      <View style={s.loading} accessibilityRole="progressbar" accessibilityLabel={title ?? d.title}>
        <SkeletonCard imageHeight={skeleton === 'card' ? 160 : 0} />
        <SkeletonCard imageHeight={skeleton === 'card' ? 160 : 0} />
      </View>
    );
  }

  const label = actionLabel ?? d.action;
  return (
    <View style={[s.box, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]} accessibilityRole="summary">
      <Ionicons name={icon ?? d.icon} size={40} color={tc.textTertiary} />
      <Text style={[s.title, { color: tc.textPrimary }]}>{title ?? d.title}</Text>
      {(message ?? d.message) ? <Text style={[s.message, { color: tc.textSecondary }]}>{message ?? d.message}</Text> : null}
      {label && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onAction} style={s.action}>
          <Text style={s.actionText}>{label}</Text>
        </Pressable>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Pressable accessibilityRole="button" accessibilityLabel={secondaryLabel} onPress={onSecondary} style={s.secondary}>
          <Text style={[s.secondaryText, { color: Colors.brand.blue }]}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  loading: { paddingTop: 8 },
  box: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 6,
  },
  title: { fontSize: 15, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  action: { marginTop: 12, minHeight: 44, paddingHorizontal: 22, borderRadius: 12, backgroundColor: Colors.brand.blue, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: palette.white, fontSize: 14, fontWeight: '700' },
  secondary: { minHeight: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 13, fontWeight: '600' },
});
