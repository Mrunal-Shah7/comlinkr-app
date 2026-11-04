// src/theme/useTheme.ts — Central theme hook + color palettes
import { useThemeStore } from '../store/theme.store';

export type ThemeColors = {
  // Backgrounds
  pageBg: string;
  secondaryBg: string;
  cardBg: string;
  cardElevated: string;
  inputBg: string;
  headerBg: string;
  sheetBg: string;
  sectionBg: string;
  statsBg: string;
  pillBg: string;
  // Borders & Dividers
  borderLight: string;
  borderMedium: string;
  divider: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  // Misc
  overlay: string;
  skeletonBg: string;
  tagBg: string;
  tagBorder: string;
  // Semantic surfaces (UI-01) — resolve through the active palette, never static colors
  warningBg: string;
  warningBorder: string;
  warningText: string;
  dangerText: string;
  successBg: string;
  successText: string;
  iconButtonBg: string;
  chipBg: string;
  chipText: string;
};

export const LIGHT_THEME: ThemeColors = {
  pageBg:       '#F0F3F8',
  secondaryBg:  '#FFFFFF',
  cardBg:       '#FFFFFF',
  cardElevated: '#FFFFFF',
  inputBg:      '#F3F4F6',
  headerBg:     '#FFFFFF',
  sheetBg:      '#FFFFFF',
  sectionBg:    '#F0F3F8',
  statsBg:      '#FAFBFE',
  pillBg:       '#EEF5FF',
  borderLight:  '#E5E7EB',
  borderMedium: '#D1D5DB',
  divider:      '#F0F3F8',
  textPrimary:  '#111827',
  textSecondary:'#6B7280',
  textTertiary: '#9CA3AF',
  overlay:      'rgba(0,0,0,0.50)',
  skeletonBg:   '#E8EAF0',
  tagBg:        '#EEF5FF',
  tagBorder:    '#D6E8FF',
  warningBg:    '#FFF7ED',
  warningBorder:'#FED7AA',
  warningText:  '#9A3412',
  dangerText:   '#DC2626',
  successBg:    '#EAFBE9',
  successText:  '#1A8A18',
  iconButtonBg: '#FFFFFF',
  chipBg:       '#F3F4F6',
  chipText:     '#374151',
};

export const DARK_THEME: ThemeColors = {
  pageBg:       '#0D1526',
  secondaryBg:  '#111E33',
  cardBg:       '#182236',
  cardElevated: '#1E2D47',
  inputBg:      '#1A2840',
  headerBg:     '#111E33',
  sheetBg:      '#131E33',
  sectionBg:    '#0F1824',
  statsBg:      '#111927',
  pillBg:       '#0E1F3D',
  borderLight:  '#1F3050',
  borderMedium: '#2A3F5F',
  divider:      '#162030',
  textPrimary:  '#F1F5F9',
  textSecondary:'#94A3B8',
  textTertiary: '#64748B',
  overlay:      'rgba(0,0,0,0.75)',
  skeletonBg:   '#162030',
  tagBg:        '#0E1F3D',
  tagBorder:    '#1F3050',
  warningBg:    '#2A1D12',
  warningBorder:'#5B3A1A',
  warningText:  '#FDBA74',
  dangerText:   '#F87171',
  successBg:    '#12301A',
  successText:  '#4ADE80',
  iconButtonBg: '#1E2D47',
  chipBg:       '#1A2840',
  chipText:     '#CBD5E1',
};

export function useTheme(): { isDark: boolean; tc: ThemeColors } {
  const isDark = useThemeStore((s) => s.isDark);
  return { isDark, tc: isDark ? DARK_THEME : LIGHT_THEME };
}
