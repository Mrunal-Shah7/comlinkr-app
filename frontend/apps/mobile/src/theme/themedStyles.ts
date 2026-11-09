// src/theme/themedStyles.ts
// Drop-in replacement for StyleSheet.create() for screens that were authored with a static light palette
// (admin pages, a few legacy components). Style objects are resolved lazily when a component reads `s.name`,
// mapping the static light-theme neutrals onto the active palette. Brand/status colors are left untouched.
// New code should read `useTheme().tc` directly instead of using this shim.
import { StyleSheet } from 'react-native';
import { useThemeStore } from '../store/theme.store';
import { DARK_THEME } from './useTheme';
import { body, display } from './d';

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
  // Design D's light brand tints (plan 01).
  '#e3edf6': DARK_THEME.accentSoft,
  '#e3f1ea': DARK_THEME.mintSoft,
  '#e2f0f1': DARK_THEME.accentSoft,
  '#f2f6f8': DARK_THEME.pageBg,
  '#e7eff2': DARK_THEME.inputBg,
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
  // Design D's light text colours (Colors.text.*, plan 01).
  '#0f1a21': DARK_THEME.textPrimary,
  '#4f6470': DARK_THEME.textSecondary,
  '#8a9da8': DARK_THEME.textTertiary,
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

const BORDER = new Set(['#e1e9ed', '#cfdbe1', '#e5e7eb', '#f0f2f5', '#f3f4f6', '#e8edf4', '#f0f3f8', '#e2e8f0', '#f1f5f9']);

/** A hex colour as hue (0–360), saturation and lightness (0–1); null for anything else. */
function hsl(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(hex);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return [0, 0, l];
  const sat = d / (1 - Math.abs(2 * l - 1));
  const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hue * 60 + 360) % 360, sat, l];
}
const css = (h: number, s: number, l: number) => `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;

/** For a colour no table above names (TR-017, point 1): light neutrals become dark surfaces, light tints a dark
 *  shade of their hue, dark and mid-grey text light text. Saturated brand and status colours and light text
 *  (white on a brand button) are left alone. */
function fallback(prop: string, key: string): string | null {
  const c = hsl(key);
  if (!c) return null;
  const [h, s, l] = c;
  const neutral = s < 0.25;
  if (prop === 'backgroundColor') {
    if (l < 0.94) return null;
    if (neutral) return l >= 0.985 ? DARK_THEME.cardBg : DARK_THEME.inputBg;
    return css(h, 0.35, 0.14);
  }
  if (prop === 'color') {
    if (neutral && l <= 0.3) return DARK_THEME.textPrimary;
    if (neutral && l <= 0.6) return DARK_THEME.textSecondary;
    if (!neutral && l <= 0.32) return css(h, Math.min(s, 0.8), 0.75);
    return null;
  }
  if (l < 0.85) return null;
  return neutral ? DARK_THEME.borderLight : css(h, 0.3, 0.24);
}

function mapValue(prop: string, value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const key = norm(value);
  if (prop === 'color') return TEXT[key] ?? fallback(prop, key) ?? value;
  if (prop === 'backgroundColor') {
    // Near-opaque white chrome (header circles, pills) becomes the elevated icon-button surface.
    if (/^rgba\(255,\s*255,\s*255,\s*0?\.(8|9)\d*\)$/.test(key)) return DARK_THEME.iconButtonBg;
    return SURFACE[key] ?? fallback(prop, key) ?? value;
  }
  if (prop.startsWith('border') && prop.endsWith('Color')) {
    if (BORDER.has(key)) return DARK_THEME.borderLight;
    if (key.startsWith('rgba(0,0,0,0.0') || key.startsWith('rgba(0, 0, 0, 0.0')) return DARK_THEME.borderLight;
    return SURFACE[key] ?? fallback('borderColor', key) ?? value;
  }
  return value;
}

/** A colour used outside a stylesheet (an icon's `color`, `placeholderTextColor`, an inline background), mapped
 *  for the active theme like the styles are. Reading it subscribes the component to the theme, so it redraws on
 *  a toggle. Use `prop` 'backgroundColor' or 'borderColor' for surfaces; the default is text. */
export function usePaletteColor() {
  const isDark = useThemeStore((st) => st.isDark);
  return (value: string, prop: 'color' | 'backgroundColor' | 'borderColor' = 'color'): string =>
    isDark ? (mapValue(prop, value) as string) : value;
}

function mapStyle(style: any): any {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) out[k] = mapValue(k, v);
  return out;
}

/** Design D base coat (plan 01), both themes: text styles take Manrope (Bricolage for large bold headings) in the
 *  weight they asked for. Android cannot pick a weight of a custom font from fontWeight, so fontWeight goes. */
function toWeight(w: unknown): 400 | 500 | 600 | 700 | 800 {
  const n = w === 'bold' ? 700 : w === 'normal' || w == null ? 400 : Number(w);
  if (!Number.isFinite(n) || n <= 400) return 400;
  if (n >= 800) return 800;
  return (Math.round(n / 100) * 100) as 500 | 600 | 700;
}
function dType(style: any): any {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style;
  if (style.fontFamily || (style.fontSize == null && style.fontWeight == null)) return style;
  const { fontWeight, ...rest } = style;
  const w = toWeight(fontWeight);
  const big = typeof style.fontSize === 'number' && style.fontSize >= 22 && w >= 700;
  return { ...rest, ...(big ? display(w >= 800 ? 800 : 700) : body(w)) };
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  styles: T | StyleSheet.NamedStyles<T>,
  options: { fonts?: boolean } = {},
): T {
  // fonts: false keeps the file's own type (colour only), for screens moved over without a font change.
  const typed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(styles)) typed[k] = options.fonts === false ? v : dType(v);
  const base = StyleSheet.create(typed as any) as T;
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

/** Fonts only (design D, plan 01): for screens that are dark on purpose in both themes (story viewer, gallery,
 *  scanner), where mapping light surfaces to dark ones would break white-on-black controls. */
export function createDTypeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  styles: T | StyleSheet.NamedStyles<T>,
): T {
  const typed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(styles)) typed[k] = dType(v);
  return StyleSheet.create(typed as any) as T;
}
