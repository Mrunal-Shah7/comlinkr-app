// src/shared/navigation/SwipeTabs.tsx
//
// Bottom-tab navigator whose screens sit side by side in a horizontal strip, so a swipe drags the
// current tab out and the neighbouring tab in with the finger (pager-style), instead of the stock
// bottom-tabs fade. Built on React Navigation's TabRouter + the stock BottomTabBar, so routes,
// deep links, `tabPress`/`tabLongPress` listeners and `useScrollToTop` behave exactly as before.
// Pure JS (gesture-handler + Reanimated, already in the shipped binaries) → OTA-safe.
//
// Performance: tabs stay mounted; tabs more than one position away from the focused tab are frozen
// (no re-renders while hidden). Direct neighbours stay live so they are drawn when they peek in.
//
// Gesture arbitration: the pan only activates after a clearly horizontal move (±28px) and fails on
// early vertical movement (±14px), so vertical scrolling and pull-to-refresh are untouched. Inner
// horizontal scrollers (chip rows, carousels) claim the touch first and keep it.

import { Suspense, memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Dimensions, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { withLayoutContext } from "expo-router";
import {
  Screen,
  TabActions,
  TabRouter,
  createNavigatorFactory,
  useNavigationBuilder,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
} from "expo-router/react-navigation";
import {
  BottomTabBar,
  type BottomTabNavigationEventMap,
  type BottomTabNavigationOptions,
  type BottomTabNavigatorProps,
} from "expo-router/build/react-navigation/bottom-tabs";
import type { BottomTabDescriptorMap } from "expo-router/build/react-navigation/bottom-tabs/types";

const COMMIT_FRACTION = 0.22;
const COMMIT_VELOCITY = 700;
const EDGE_RESISTANCE = 0.25;
const SETTLE = { duration: 260, easing: Easing.out(Easing.cubic) };

// Suspense-based freeze (same technique as react-freeze): while `freeze` is true the subtree keeps
// its state but React skips rendering it.
function Suspender({ freeze, children }: { freeze: boolean; children: ReactNode }) {
  const cache = useRef<{ promise?: Promise<void>; resolve?: () => void }>({}).current;
  if (freeze) {
    if (!cache.promise) cache.promise = new Promise<void>((resolve) => (cache.resolve = resolve));
    throw cache.promise;
  }
  if (cache.promise) {
    cache.resolve?.();
    cache.promise = undefined;
  }
  return <>{children}</>;
}

function Freeze({ freeze, children }: { freeze: boolean; children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Suspender freeze={freeze}>{children}</Suspender>
    </Suspense>
  );
}

type TabDescriptor = BottomTabDescriptorMap[string];

// One tab page. Memoized so a tab switch only re-renders pages whose focus/freeze state or route
// (params) changed. Descriptor identity changes on every navigator render, but tab options here are
// static, so it is deliberately ignored.
const TabPage = memo(
  function TabPage({
    descriptor,
    focused,
    frozen,
  }: {
    descriptor: TabDescriptor;
    route: TabDescriptor["route"];
    focused: boolean;
    frozen: boolean;
  }) {
    return (
      <Freeze freeze={frozen}>
        <Screen
          focused={focused}
          route={descriptor.route}
          navigation={descriptor.navigation}
          headerShown={false}
          header={null}
        >
          {descriptor.render()}
        </Screen>
      </Freeze>
    );
  },
  (prev, next) => prev.route === next.route && prev.focused === next.focused && prev.frozen === next.frozen,
);

function SwipeTabsNavigator({
  id,
  initialRouteName,
  backBehavior,
  UNSTABLE_routeNamesChangeBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
  UNSTABLE_router,
  renderTabBar,
}: BottomTabNavigatorProps & {
  /** Design D (plan 01): draw a custom, floating tab bar that follows the pager (offset and page width). */
  renderTabBar?: (p: {
    state: TabNavigationState<ParamListBase>;
    descriptors: BottomTabDescriptorMap;
    navigation: any;
    insets: { bottom: number };
    offset: SharedValue<number>;
    width: SharedValue<number>;
  }) => ReactNode;
}) {
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    BottomTabNavigationOptions,
    BottomTabNavigationEventMap
  >(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    UNSTABLE_routeNamesChangeBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
    UNSTABLE_router,
  });
  const insets = useSafeAreaInsets();
  const count = state.routes.length;

  const [width, setWidth] = useState(() => Dimensions.get("window").width);
  const widthSV = useSharedValue(width);
  const indexSV = useSharedValue(state.index);
  const offset = useSharedValue(-state.index * width);
  const dragStart = useSharedValue(0);

  // Index changes (tab bar tap, swipe commit, deep link) slide the strip. A swipe commit continues
  // from wherever the finger let go; jumps of more than one tab snap, because the tabs in between
  // are frozen and would slide past blank.
  const lastIndexRef = useRef(state.index);
  const lastWidthRef = useRef(width);
  useEffect(() => {
    const prev = lastIndexRef.current;
    const widthChanged = lastWidthRef.current !== width;
    lastIndexRef.current = state.index;
    lastWidthRef.current = width;
    indexSV.set(state.index);
    widthSV.set(width);
    const target = -state.index * width;
    if (widthChanged || Math.abs(prev - state.index) > 1) {
      cancelAnimation(offset);
      offset.set(target);
    } else {
      offset.set(withTiming(target, SETTLE));
    }
  }, [state.index, width, indexSV, widthSV, offset]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const commit = useCallback(
    (target: number) => {
      const current = stateRef.current;
      const route = current.routes[target];
      if (!route || target === current.index) return;
      void Haptics.selectionAsync();
      navigation.dispatch({ ...TabActions.jumpTo(route.name), target: current.key });
    },
    [navigation],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-28, 28])
    .failOffsetY([-14, 14])
    .onStart(() => {
      cancelAnimation(offset);
      dragStart.set(offset.get());
    })
    .onUpdate((e) => {
      const w = widthSV.get();
      const i = indexSV.get();
      // At most one tab either way per swipe; resist past the first/last tab.
      let x = Math.min(-(i - 1) * w, Math.max(-(i + 1) * w, dragStart.get() + e.translationX));
      const min = -(count - 1) * w;
      if (x > 0) x *= EDGE_RESISTANCE;
      else if (x < min) x = min + (x - min) * EDGE_RESISTANCE;
      offset.set(x);
    })
    .onEnd((e) => {
      const w = widthSV.get();
      const i = indexSV.get();
      const moved = -(offset.get() + i * w); // > 0 → towards the next tab
      const far = Math.abs(moved) > w * COMMIT_FRACTION;
      const fast = Math.abs(e.velocityX) > COMMIT_VELOCITY && Math.sign(-e.velocityX) === Math.sign(moved);
      let target = i;
      if (far || fast) {
        if (moved > 0 && i < count - 1) target = i + 1;
        else if (moved < 0 && i > 0) target = i - 1;
      }
      offset.set(withTiming(-target * w, SETTLE));
      if (target !== i) {
        indexSV.set(target);
        scheduleOnRN(commit, target);
      }
    });

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) setWidth(w);
  };

  return (
    <NavigationContent>
      <View style={styles.root}>
        <GestureDetector gesture={pan}>
          <View style={styles.pager} onLayout={onLayout}>
            {/* The strip must be as wide as all pages: Android only routes native touches (scrolling) to
                views inside their parent's bounds. */}
            <Animated.View style={[styles.strip, { width: width * count }, stripStyle]}>
              {state.routes.map((route, i) => {
                const descriptor = descriptors[route.key];
                const focused = i === state.index;
                return (
                  <View
                    key={route.key}
                    style={[styles.page, { left: i * width, width }, descriptor.options.sceneStyle]}
                    importantForAccessibility={focused ? "auto" : "no-hide-descendants"}
                    accessibilityElementsHidden={!focused}
                  >
                    <TabPage
                      descriptor={descriptor}
                      route={route}
                      focused={focused}
                      frozen={Math.abs(i - state.index) > 1}
                    />
                  </View>
                );
              })}
            </Animated.View>
          </View>
        </GestureDetector>
        {renderTabBar
          ? renderTabBar({ state, descriptors, navigation, insets, offset, width: widthSV })
          : <BottomTabBar state={state} descriptors={descriptors} navigation={navigation} insets={insets} />}
      </View>
    </NavigationContent>
  );
}

// createNavigatorFactory is typed `any`; keep the real props so <SwipeTabs> options/listeners type-check.
const SwipeTabNavigator = createNavigatorFactory(SwipeTabsNavigator)().Navigator as typeof SwipeTabsNavigator;

export const SwipeTabs = withLayoutContext<
  BottomTabNavigationOptions,
  typeof SwipeTabNavigator,
  TabNavigationState<ParamListBase>,
  BottomTabNavigationEventMap
>(SwipeTabNavigator);

const styles = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1, overflow: "hidden" },
  strip: { position: "absolute", top: 0, bottom: 0, left: 0 },
  page: { position: "absolute", top: 0, bottom: 0 },
});
