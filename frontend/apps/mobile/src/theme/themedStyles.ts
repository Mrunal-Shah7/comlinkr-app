// src/theme/themedStyles.ts
// Drop-in replacement for StyleSheet.create() for screens that were authored with a static light palette
// (admin pages, a few legacy components). Style objects are resolved lazily when a component reads `s.name`,
// mapping the static light-theme neutrals onto the active palette. Brand/status colors are left untouched.
// New code should read `useTheme().tc` directly instead of using this shim.
import { StyleSheet } from 'react-native';
import { useThemeStore } from '../store/theme.store';
import { DARK_THEME } from './useTheme';

const norm = (v: string) => v.trim().toLowerCase();

const SURFACE: Record<string, string> = {
  '#fff': DARK_THEME.cardBg,
  '#ffffff': DARK_THEME.cardBg,
  '#fafbfe': DARK_THEME.statsBg,
  '#f8fafc': DARK_THEME.inputBg,
  '#f9fafb': DARK_THEME.pageBg,
  '#f3f4f6': DARK_THEME.inputBg,
  '#f0f2f5': DARK_THEME.inputBg,
  '#f0f3f8': DARK_THEME.pageBg,
  '#f4f6fa': DARK_THEME.pageBg,
  '#f0f5ff': DARK_THEME.iconButtonBg,
  '#e8ecf2': DARK_THEME.inputBg,
  '#f5f7fa': DARK_THEME.pageBg,
  '#f1f5f9': DARK_THEME.inputBg,
  '#e5e7eb': DARK_THEME.borderLight,
  '#ebf5ff': DARK_THEME.pillBg,
  '#eef5ff': DARK_THEME.pillBg,
  '#e6f4fe': DARK_THEME.pillBg,
  '#f0f9ff': DARK_THEME.pillBg,
  '#fef2f2': '#2A1517',
  '#fee2e2': '#2A1517',
  '#fff3e6': DARK_THEME.warningBg,
  '#fffbeb': DARK_THEME.warningBg,
  '#fff7ed': DARK_THEME.warningBg,
  '#fef9c3': DARK_THEME.warningBg,
  '#f3e8ff': '#231A3A',
  '#f3f0ff': '#231A3A',
  '#f5f3ff': '#231A3A',
  '#eafbe9': DARK_THEME.successBg,
  '#f0fdf4': DARK_THEME.successBg,
  '#dcfce7': DARK_THEME.successBg,
};

const TEXT: Record<string, string> = {
  '#111827': DARK_THEME.textPrimary,
  '#111': DARK_THEME.textPrimary,
  '#1f2937': DARK_THEME.textPrimary,
  '#0a2540': DARK_THEME.textPrimary,
  '#0f172a': DARK_THEME.textPrimary,
  '#374151': DARK_THEME.chipText,
  '#4b5563': DARK_THEME.textSecondary,
  '#6b7280': DARK_THEME.textSecondary,
  '#9ca3af': DARK_THEME.textTertiary,
  '#7f1d1d': '#FCA5A5',
  '#991b1b': '#FCA5A5',
  '#92400e': DARK_THEME.warningText,
  '#b45309': DARK_THEME.warningText,
};

const BORDER = new Set(['#e5e7eb', '#f0f2f5', '#f3f4f6', '#e8edf4', '#f0f3f8', '#e2e8f0', '#f1f5f9']);

function mapValue(prop: string, value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const key = norm(value);
  if (prop === 'color') return TEXT[key] ?? value;
  if (prop === 'backgroundColor') {
    // Near-opaque white chrome (header circles, pills) becomes the elevated icon-button surface.
    if (/^rgba\(255,\s*255,\s*255,\s*0?\.(8|9)\d*\)$/.test(key)) return DARK_THEME.iconButtonBg;
    return SURFACE[key] ?? value;
  }
  if (prop.startsWith('border') && prop.endsWith('Color')) {
    if (BORDER.has(key)) return DARK_THEME.borderLight;
    if (key.startsWith('rgba(0,0,0,0.0') || key.startsWith('rgba(0, 0, 0, 0.0')) return DARK_THEME.borderLight;
    return SURFACE[key] ?? value;
  }
  return value;
}

function mapStyle(style: any): any {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) out[k] = mapValue(k, v);
  return out;
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  styles: T | StyleSheet.NamedStyles<T>,
): T {
  const base = StyleSheet.create(styles) as T;
  let darkCache: Partial<Record<keyof T, any>> = {};
  return new Proxy(base, {
    get(target, prop: string | symbol) {
      const value = (target as any)[prop];
      if (typeof prop === 'symbol' || !useThemeStore.getState().isDark) return value;
      if (!(prop in darkCache)) (darkCache as any)[prop] = mapStyle(value);
      return (darkCache as any)[prop];
    },
  });
}
