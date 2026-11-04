import { useEffect } from "react";
import { router } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "../../src/theme/colors";
import { useTheme } from "../../src/theme/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { rs } from "../../src/utils/responsive";
import { SwipeTabs } from "../../src/shared/navigation/SwipeTabs";
import { useRequireAuth } from "../../src/shared/hooks/useRequireAuth";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  icon: IoniconName;
  iconFocused: IoniconName;
  label: string;
}

const TABS: Record<string, TabConfig> = {
  Explore:   { icon: "compass-outline",    iconFocused: "compass",    label: "Explore"   },
  Listings:  { icon: "home-outline",       iconFocused: "home",       label: "Listings"  },
  Food:      { icon: "restaurant-outline", iconFocused: "restaurant", label: "Food"      },
  Community: { icon: "people-outline",     iconFocused: "people",     label: "Community" },
};

// Long-press a tab → jump straight into creating content for that section.
const LONG_PRESS_ACTIONS: Record<string, { href: any; authMessage: string }> = {
  "feed/index":      { href: { pathname: "/create-post", params: { type: "news" } },       authMessage: "Sign in to share with your neighbourhood." },
  "housing/index":   { href: { pathname: "/create-post", params: { type: "listing" } },    authMessage: "Sign in to publish a property listing." },
  "food/index":      { href: { pathname: "/create-post", params: { type: "restaurant" } }, authMessage: "Sign in to add a restaurant." },
  "community/index": { href: { pathname: "/community", params: { ask: "1" } },             authMessage: "Sign in to ask your neighbors a question." },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { isDark } = useTheme();
  const cfg = TABS[name];
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 240 });
  }, [focused, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: 0.6 + 0.4 * progress.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * progress.value }, { scale: 1 + 0.06 * progress.value }],
  }));

  const inactiveColor = isDark ? "#5B6F8C" : "#94A3B8";

  return (
    <View style={is.iconWrap}>
      <Animated.View
        style={[is.pill, { backgroundColor: isDark ? "rgba(56,152,255,0.16)" : "rgba(0,118,235,0.10)" }, pillStyle]}
      />
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? cfg.iconFocused : cfg.icon}
          size={rs(22)}
          color={focused ? Colors.brand.blue : inactiveColor}
        />
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { requireAuth } = useRequireAuth();

  const bottomInset     = insets.bottom;
  const tabPaddingBottom = Math.max(bottomInset, Platform.OS === "android" ? 8 : 10);
  const tabBarHeight    = rs(58) + tabPaddingBottom;

  return (
    // Tabs sit side by side: swiping drags the neighbouring tab in with the finger (SwipeTabs).
    <SwipeTabs
      screenListeners={({ route }) => ({
        tabPress: () => {
          void Haptics.selectionAsync();
        },
        tabLongPress: () => {
          const action = LONG_PRESS_ACTIONS[route.name];
          if (!action) return;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (!requireAuth(undefined, action.authMessage)) return;
          // Community's token makes each long-press open the composer exactly once.
          router.push(route.name === "community/index" ? { pathname: "/community", params: { ask: String(Date.now()) } } : action.href);
        },
      })}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: isDark ? "#0B1526" : "#F3F6FB",
        },
        tabBarStyle: {
          backgroundColor: isDark ? "#0E1724" : "#FFFFFF",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
          height: tabBarHeight,
          paddingBottom: tabPaddingBottom,
          paddingTop: rs(7),
          paddingHorizontal: rs(6),
          elevation: 16,
          shadowColor: isDark ? "#000" : "#0A2550",
          shadowOpacity: isDark ? 0.45 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: rs(10.5),
          fontWeight: "700",
          letterSpacing: 0.2,
          marginTop: rs(3),
          includeFontPadding: false,
        },
        tabBarActiveTintColor: Colors.brand.blue,
        tabBarInactiveTintColor: isDark ? "#5B6F8C" : "#94A3B8",
        tabBarItemStyle: {
          paddingVertical: rs(2),
        },
      }}
    >
      <SwipeTabs.Screen
        name="feed/index"
        options={{
          tabBarLabel: "Explore",
          tabBarAccessibilityLabel: "Explore. Long press to create a post.",
          tabBarIcon: ({ focused }) => <TabIcon name="Explore" focused={focused} />,
        }}
      />
      <SwipeTabs.Screen
        name="housing/index"
        options={{
          tabBarLabel: "Listings",
          tabBarAccessibilityLabel: "Listings. Long press to post a listing.",
          tabBarIcon: ({ focused }) => <TabIcon name="Listings" focused={focused} />,
        }}
      />
      <SwipeTabs.Screen
        name="food/index"
        options={{
          tabBarLabel: "Food",
          tabBarAccessibilityLabel: "Food. Long press to add a restaurant.",
          tabBarIcon: ({ focused }) => <TabIcon name="Food" focused={focused} />,
        }}
      />
      <SwipeTabs.Screen
        name="community/index"
        options={{
          tabBarLabel: "Community",
          tabBarAccessibilityLabel: "Community. Long press to ask a question.",
          tabBarIcon: ({ focused }) => <TabIcon name="Community" focused={focused} />,
        }}
      />
    </SwipeTabs>
  );
}

const is = StyleSheet.create({
  iconWrap: {
    width: rs(56),
    height: rs(30),
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: rs(15),
  },
});
