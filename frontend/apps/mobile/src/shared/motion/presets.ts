// src/shared/motion/presets.ts — design D motion values (plan 01), the same numbers the prototype's notes give.
// Reanimated respects the phone's reduce-motion setting for layout animations (ReduceMotion.System);
// hand-driven animations check useReducedMotion() and fall back to short fades.
import { Easing, FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';

export const SPRING = {
  /** Push / zoom of a new screen: a little overshoot. */
  push: { damping: 18, stiffness: 190, mass: 1 },
  /** Bottom sheets. */
  sheet: { damping: 18, stiffness: 200, mass: 1 },
  /** Press feedback and small pops. */
  press: { damping: 15, stiffness: 320, mass: 0.6 },
  /** Tab pager and indicators settling. */
  settle: { damping: 24, stiffness: 240, mass: 1 },
  /** Liquid tab indicator: springy overshoot (cubic-bezier(.34,1.56,.64,1) in the prototype). */
  liquid: { damping: 14, stiffness: 220, mass: 0.9 },
} as const;

export const TIMING = {
  reveal: 520,
  stagger: 45,
  fast: 180,
  step: 340,
  sheen: 900,
  ring: 900,
  easeOut: Easing.out(Easing.cubic),
} as const;

/** Staggered entrance for list rows and tiles: rise 14 px and fade in, 45 ms apart (capped at 12). */
export const revealIn = (i = 0) =>
  FadeInDown.duration(TIMING.reveal).delay(Math.min(i, 12) * TIMING.stagger).easing(Easing.out(Easing.cubic)).withInitialValues({ transform: [{ translateY: 14 }], opacity: 0 });

/** Bento tiles pop in: scale 0.96 → 1 with a fade, 45 ms apart. */
export const tileIn = (i = 0) => ZoomIn.springify().damping(16).stiffness(220).delay(Math.min(i, 12) * TIMING.stagger).withInitialValues({ transform: [{ scale: 0.96 }] });

export const fadeIn = FadeIn.duration(220);
export const fadeOut = FadeOut.duration(180);

/** Wrong-input shake: 0, −8, 7, −5, 3, 0 px over 420 ms. */
export const SHAKE = [0, -8, 7, -5, 3, 0];
