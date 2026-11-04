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
  // Design D (plan 01)
  accent: string;
  accentSoft: string;
  accentText: string;
  mint: string;
  mintSoft: string;
  glass: string;
  glassLine: string;
  surface3: string;
};

export const LIGHT_THEME: ThemeColors = {
  pageBg:       '#F2F6F8',
  secondaryBg:  '#FFFFFF',
  cardBg:       '#FFFFFF',
  cardElevated: '#FFFFFF',
  inputBg:      '#E7EFF2',
  headerBg:     '#F2F6F8',
  sheetBg:      '#FFFFFF',
  sectionBg:    '#F2F6F8',
  statsBg:      '#F7FAFB',
  pillBg:       '#E3EDF6',
  borderLight:  '#E1E9ED',
  borderMedium: '#CFDBE1',
  divider:      '#E7EFF2',
  textPrimary:  '#0F1A21',
  textSecondary:'#4F6470',
  textTertiary: '#8A9DA8',
  overlay:      'rgba(0,0,0,0.42)',
  skeletonBg:   '#E7EFF2',
  tagBg:        '#E3EDF6',
  tagBorder:    '#CFE0EE',
  warningBg:    '#FFF7ED',
  warningBorder:'#FED7AA',
  warningText:  '#9A3412',
  dangerText:   '#DC2626',
  successBg:    '#E3F1EA',
  successText:  '#256B49',
  iconButtonBg: '#FFFFFF',
  chipBg:       '#FFFFFF',
  chipText:     '#0F1A21',
  // Design D (plan 01)
  accent: '#1A6BAE',
  accentSoft: 'rgba(26,107,174,0.12)',
  accentText: '#155A93',
  mint: '#30855B',
  mintSoft: 'rgba(48,133,91,0.14)',
  glass: 'rgba(255,255,255,0.86)',
  glassLine: 'rgba(15,26,33,0.08)',
  surface3: '#D6E3E9',
};

export const DARK_THEME: ThemeColors = {
  pageBg:       '#091218',
  secondaryBg:  '#10202A',
  cardBg:       '#10202A',
  cardElevated: '#172B37',
  inputBg:      '#172B37',
  headerBg:     '#091218',
  sheetBg:      '#10202A',
  sectionBg:    '#091218',
  statsBg:      '#10202A',
  pillBg:       '#0F2A3E',
  borderLight:  '#1A2C37',
  borderMedium: '#25394A',
  divider:      '#14232D',
  textPrimary:  '#EEF5F8',
  textSecondary:'#9DB4C0',
  textTertiary: '#66808E',
  overlay:      'rgba(0,0,0,0.60)',
  skeletonBg:   '#172B37',
  tagBg:        '#0F2A3E',
  tagBorder:    '#1D3E57',
  warningBg:    '#2A1D12',
  warningBorder:'#5B3A1A',
  warningText:  '#FDBA74',
  dangerText:   '#F87171',
  successBg:    '#12301F',
  successText:  '#5DB98A',
  iconButtonBg: '#172B37',
  chipBg:       '#10202A',
  chipText:     '#EEF5F8',
  // Design D (plan 01)
  accent: '#1A6BAE',
  accentSoft: 'rgba(26,107,174,0.24)',
  accentText: '#7DB4E2',
  mint: '#30855B',
  mintSoft: 'rgba(48,133,91,0.22)',
  glass: 'rgba(16,32,42,0.90)',
  glassLine: 'rgba(255,255,255,0.09)',
  surface3: '#213A49',
};

export function useTheme(): { isDark: boolean; tc: ThemeColors } {
  const isDark = useThemeStore((s) => s.isDark);
  return { isDark, tc: isDark ? DARK_THEME : LIGHT_THEME };
}
