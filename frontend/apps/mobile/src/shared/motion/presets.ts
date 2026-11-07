// src/shared/motion/presets.ts — design D motion values (plan 01), the same numbers the prototype's notes give.
// Reanimated respects the phone's reduce-motion setting for layout animations (ReduceMotion.System);
// hand-driven animations check useReducedMotion() and fall back to short fades.
//
// Reanimated 4 fills in any spring value a call leaves out with mass 4, stiffness 900, damping 120 (Reanimated 3
// used 1, 100, 10). A spring written as `{ damping: 18, stiffness: 200 }` or `.springify().damping(18)` therefore
// runs on mass 4: about a third as damped and twice as slow as the numbers suggest, which made sheets, dialogs and
// tiles wobble for a second or more. Every spring in the app names damping, stiffness and mass.
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';

export const SPRING = {
  /** Push / zoom of a new screen: a hint of overshoot, at rest in about 0.35 s. */
  push: { damping: 24, stiffness: 260, mass: 1 },
  /** Bottom sheets. */
  sheet: { damping: 24, stiffness: 260, mass: 1 },
  /** Press feedback and small pops. */
  press: { damping: 15, stiffness: 320, mass: 0.6 },
  /** Tab pager and indicators settling. */
  settle: { damping: 24, stiffness: 240, mass: 1 },
  /** Liquid tab indicator: a small overshoot (cubic-bezier(.34,1.56,.64,1) in the prototype). */
  liquid: { damping: 18, stiffness: 260, mass: 0.9 },
} as const;

export const TIMING = {
  reveal: 360,
  stagger: 35,
  fast: 180,
  step: 340,
  sheen: 900,
  ring: 650,
  easeOut: Easing.out(Easing.cubic),
} as const;

/** Staggered entrance for list rows and tiles: rise 14 px and fade in, 35 ms apart (capped at 8). */
export const revealIn = (i = 0) =>
  FadeInDown.duration(TIMING.reveal).delay(Math.min(i, 8) * TIMING.stagger).easing(Easing.out(Easing.cubic)).withInitialValues({ transform: [{ translateY: 14 }], opacity: 0 });

/** Bento tiles pop in: scale 0.96 → 1 with a fade, 35 ms apart. */
export const tileIn = (i = 0) => ZoomIn.springify().damping(20).stiffness(260).mass(1).delay(Math.min(i, 8) * TIMING.stagger).withInitialValues({ transform: [{ scale: 0.96 }] });

/** A card or row growing or shrinking in place (expand / collapse, a row removed from a list). Timed, not a spring:
 *  an overshooting height inside a list header or a FlatList cell flickers on Android. */
export const layoutEase = LinearTransition.duration(220).easing(Easing.out(Easing.cubic));

export const fadeIn = FadeIn.duration(220);
export const fadeOut = FadeOut.duration(180);

/** Wrong-input shake: 0, −8, 7, −5, 3, 0 px over 420 ms. */
export const SHAKE = [0, -8, 7, -5, 3, 0];
