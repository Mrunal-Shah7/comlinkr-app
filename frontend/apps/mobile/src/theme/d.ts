// src/theme/d.ts — design D tokens (plan 01): fonts, radii, the brand gradient and type roles.
// Values come from docs/design/2026-11-05-redesign/src/{a,c,d}.css; keep them in step with the prototype.
import type { TextStyle } from 'react-native';

/** The app's gradient, sampled from the owner's screenshot. Use with expo-linear-gradient at 135°. */
export const GRADIENT = ['#1A6BAE', '#257A86', '#30855B'] as const;
export const GRADIENT_START = { x: 0, y: 0 } as const;
export const GRADIENT_END = { x: 1, y: 1 } as const;

export const RADIUS = { tile: 24, card: 24, sheet: 30, button: 18, input: 16, chip: 14, small: 10, pill: 999 } as const;

/** Font families loaded in app/_layout.tsx. On Android each weight is its own family name. */
export const FONT = {
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyHeavy: 'Manrope_800ExtraBold',
  display: 'BricolageGrotesque_700Bold',
  displayMedium: 'BricolageGrotesque_500Medium',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
} as const;

/** Body text in a weight, without fontWeight (Android would fake bold on a custom font). */
export function body(weight: 400 | 500 | 600 | 700 | 800 = 400): TextStyle {
  const f = { 400: FONT.body, 500: FONT.bodyMedium, 600: FONT.bodySemi, 700: FONT.bodyBold, 800: FONT.bodyHeavy }[weight];
  return { fontFamily: f };
}
/** Headings in Bricolage Grotesque. */
export function display(weight: 500 | 700 | 800 = 700): TextStyle {
  const f = { 500: FONT.displayMedium, 700: FONT.display, 800: FONT.displayHeavy }[weight];
  return { fontFamily: f };
}

/** Type roles from the prototype (px at 1×; screens pass them through rs() where they already scale). */
export const TYPE = {
  pageTitle: { ...display(800), fontSize: 34, letterSpacing: -1 } as TextStyle,
  question: { ...display(800), fontSize: 32, letterSpacing: -1, lineHeight: 34 } as TextStyle,
  section: { ...display(700), fontSize: 21 } as TextStyle,
  cardTitle: { ...display(700), fontSize: 17, lineHeight: 20 } as TextStyle,
  tileBig: { ...display(800), fontSize: 40, lineHeight: 42, letterSpacing: -1.2 } as TextStyle,
  bar: { ...display(700), fontSize: 17 } as TextStyle,
  body: { ...body(400), fontSize: 15, lineHeight: 21 } as TextStyle,
  bodyStrong: { ...body(700), fontSize: 15 } as TextStyle,
  small: { ...body(500), fontSize: 13 } as TextStyle,
  label: { ...body(700), fontSize: 12, letterSpacing: 0.3 } as TextStyle,
  overline: { ...body(600), fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' } as TextStyle,
  button: { ...body(700), fontSize: 15.5 } as TextStyle,
} as const;
