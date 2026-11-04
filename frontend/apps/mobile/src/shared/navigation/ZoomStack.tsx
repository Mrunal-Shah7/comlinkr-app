// src/shared/navigation/ZoomStack.tsx — design D screen transitions (plan 01).
//
// A pushed screen zooms in from 0.88 with 44 px corners to full size on a spring with a little overshoot
// (damping 18, stiffness 190); the screen behind scales to 0.94 and dims to about 60%. Back is the reverse in
// 340 ms. An edge swipe from the left still goes back (on Android too). With the phone's reduce-motion setting
// on, screens cross-fade instead.
//
// This is the JS stack that ships inside expo-router (react-navigation/stack), so the transition can be drawn
// exactly; the native stack only offers fixed animations.
import { withLayoutContext } from 'expo-router';
import type { ParamListBase, StackNavigationState } from 'expo-router/build/react-navigation/routers';
import {
  CardStyleInterpolators,
  createStackNavigator,
  type StackCardInterpolationProps,
  type StackCardInterpolatedStyle,
  type StackNavigationEventMap,
  type StackNavigationOptions,
} from 'expo-router/build/react-navigation/stack';
import { SPRING } from '../motion/presets';

const { Navigator } = createStackNavigator();

export const ZoomStack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator,
  StackNavigationState<ParamListBase>,
  StackNavigationEventMap
>(Navigator);

export function forZoom({ current, next }: StackCardInterpolationProps): StackCardInterpolatedStyle {
  const p = current.progress;
  const behind = next
    ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94], extrapolate: 'clamp' })
    : 1;
  return {
    cardStyle: {
      opacity: p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
      borderRadius: p.interpolate({ inputRange: [0, 1], outputRange: [44, 0], extrapolate: 'clamp' }),
      overflow: 'hidden',
      transform: [
        { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
        { scale: behind },
      ],
    },
    overlayStyle: {
      opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4], extrapolate: 'clamp' }),
    },
  };
}

export function zoomOptions(reduceMotion: boolean, bg: string): StackNavigationOptions {
  return {
    headerShown: false,
    cardStyle: { backgroundColor: bg },
    cardOverlayEnabled: true,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    gestureResponseDistance: 28,
    cardStyleInterpolator: reduceMotion ? CardStyleInterpolators.forFadeFromCenter : forZoom,
    transitionSpec: reduceMotion
      ? { open: { animation: 'timing', config: { duration: 150 } }, close: { animation: 'timing', config: { duration: 150 } } }
      : {
          open: { animation: 'spring', config: { ...SPRING.push, overshootClamping: false, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } },
          close: { animation: 'timing', config: { duration: 340 } },
        },
  };
}
