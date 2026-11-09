/**
 * responsive.ts — Comlinkr Universal Responsive Utility
 *
 * HOW IT WORKS:
 * - Base design width is 390 (iPhone 14 / standard phone).
 * - On a 390px phone:  scale(18) === 18   → zero change, pixel-perfect.
 * - On a 768px tablet: scale(18) === 35.4 → properly sized for tablet.
 *
 * USAGE:
 *   import { rs, vs, ms, isTablet, hp, wp } from '@/src/utils/responsive';
 *
 *   fontSize: rs(14)          // responsive font size
 *   padding: rs(12)           // responsive padding / spacing
 *   height: vs(48)            // responsive vertical size
 *   width: ms(200, 0.4)       // moderate scale (less aggressive)
 *   if (isTablet()) { ... }   // conditional tablet layout
 *   width: wp(90)             // 90% of screen width
 *   height: hp(50)            // 50% of screen height
 */

import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH  = 390;  // iPhone 14 design base (portrait)
const BASE_HEIGHT = 844;  // iPhone 14 design base (portrait)
const MAX_SCALE   = 1.35; // cap: stops growing beyond 35% of base (tablet/large screen)

/**
 * Get the current window dimensions at call time.
 * NOTE: For components that need live updates on orientation change,
 * use the useResponsive() hook instead.
 */
// Dimensions.get, not useWindowDimensions: rs() runs outside React, inside StyleSheet.create at module scope.
// The app is portrait-only (app.config.js), so the width does not change while it runs.
function getDims() {
  const { width, height } = Dimensions.get('window');
  return { width, height };
}

/**
 * rs() — Responsive Scale (horizontal / font sizes / spacing)
 * Scales a value proportionally to screen width.
 * On iPhone 14 (390px) this returns the exact input value.
 */
export function rs(size: number): number {
  const { width } = getDims();
  const ratio = Math.min(width / BASE_WIDTH, MAX_SCALE);
  return Math.round(PixelRatio.roundToNearestPixel(size * ratio));
}

/**
 * vs() — Vertical Scale
 * Scales a value proportionally to screen height.
 * Use for heights, vertical padding/margin.
 */
export function vs(size: number): number {
  const { height } = getDims();
  const ratio = Math.min(height / BASE_HEIGHT, MAX_SCALE);
  return Math.round(PixelRatio.roundToNearestPixel(size * ratio));
}

/**
 * ms() — Moderate Scale
 * A blend of scaled + original. factor controls aggressiveness.
 * factor=0   → no scaling (returns original size)
 * factor=0.5 → half scaling (default, safe for fonts)
 * factor=1   → same as rs()
 * Use for values that should only grow partially on large screens.
 */
export function ms(size: number, factor: number = 0.5): number {
  const { width } = getDims();
  const ratio = Math.min(width / BASE_WIDTH, MAX_SCALE);
  const scaled = size + (size * (ratio - 1) * factor);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
}

/**
 * wp() — Width Percentage
 * Returns a pixel value equal to the given percentage of screen width.
 * wp(100) === full screen width
 */
export function wp(percentage: number): number {
  const { width } = getDims();
  return Math.round((percentage / 100) * width);
}

/**
 * hp() — Height Percentage
 * Returns a pixel value equal to the given percentage of screen height.
 */
export function hp(percentage: number): number {
  const { height } = getDims();
  return Math.round((percentage / 100) * height);
}

/**
 * isTablet() — Returns true if screen width >= 768px (iPad / Android tablet)
 */
export function isTablet(): boolean {
  return getDims().width >= 768;
}

/**
 * screenWidth() — Current screen width in pixels
 */
export function screenWidth(): number {
  return getDims().width;
}

/**
 * screenHeight() — Current screen height in pixels
 */
export function screenHeight(): number {
  return getDims().height;
}

/**
 * tabletMaxWidth() — Constrains a width to not exceed a sensible max on tablets.
 * Use for cards/containers: width: tabletMaxWidth(wp(100))
 */
export function tabletMaxWidth(value: number, max: number = 680): number {
  return Math.min(value, max);
}

/**
 * numColumns() — Returns ideal number of grid columns based on screen width.
 * colWidth: minimum width each column should be (in base dp)
 */
export function numColumns(colWidth: number = 160): number {
  const { width } = getDims();
  return Math.max(1, Math.floor(width / rs(colWidth)));
}
