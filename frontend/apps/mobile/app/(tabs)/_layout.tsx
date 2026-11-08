import { useState } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { ColorValue } from "react-native";
import { useTheme } from "../../src/theme/useTheme";
import { SwipeTabs } from "../../src/shared/navigation/SwipeTabs";
import { DTabBar } from "../../src/shared/navigation/DTabBar";
import { ComposeSheet } from "../../src/shared/navigation/ComposeSheet";
import { useRequireAuth } from "../../src/shared/hooks/useRequireAuth";

type IoniconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { icon: IoniconName; iconFocused: IoniconName }> = {
  Explore:   { icon: "compass-outline",    iconFocused: "compass"    },
  Listings:  { icon: "home-outline",       iconFocused: "home"       },
  Food:      { icon: "restaurant-outline", iconFocused: "restaurant" },
  Community: { icon: "people-outline",     iconFocused: "people"     },
};
const tabIcon = (name: string) => ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
  <Ionicons name={focused ? ICONS[name].iconFocused : ICONS[name].icon} size={size} color={color} />
);

// Long-press a tab → jump straight into creating content for that section.
const LONG_PRESS_ACTIONS: Record<string, { href: any; authMessage: string }> = {
  "feed/index":      { href: { pathname: "/create-post", params: { type: "news" } },       authMessage: "Sign in to share with your neighbourhood." },
  "housing/index":   { href: { pathname: "/create-post", params: { type: "listing" } },    authMessage: "Sign in to publish a property listing." },
  "food/index":      { href: { pathname: "/create-post", params: { type: "restaurant" } }, authMessage: "Sign in to add a restaurant." },
  "community/index": { href: { pathname: "/community", params: { ask: "1" } },             authMessage: "Sign in to ask your neighbors a question." },
};

// Design D (plan 01): a floating glass tab bar with a central + and a liquid indicator (DTabBar). Pages run
// under the bar; each tab screen leaves tabBarClearance() at the bottom of its scroll content.
export default function TabsLayout() {
  const { tc } = useTheme();
  const { requireAuth } = useRequireAuth();
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <>
      {/* Tabs sit side by side: swiping drags the neighbouring tab in with the finger (SwipeTabs). */}
      <SwipeTabs
        renderTabBar={(p) => <DTabBar {...p} plusOpen={composeOpen} onPlus={() => setComposeOpen(true)} />}
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
          sceneStyle: { backgroundColor: tc.pageBg },
        }}
      >
        <SwipeTabs.Screen
          name="feed/index"
          options={{ tabBarLabel: "Explore", tabBarAccessibilityLabel: "Explore. Long press to create a post.", tabBarIcon: tabIcon("Explore") }}
        />
        <SwipeTabs.Screen
          name="housing/index"
          options={{ tabBarLabel: "Listings", tabBarAccessibilityLabel: "Listings. Long press to post a listing.", tabBarIcon: tabIcon("Listings") }}
        />
        <SwipeTabs.Screen
          name="food/index"
          options={{ tabBarLabel: "Food", tabBarAccessibilityLabel: "Food. Long press to add a restaurant.", tabBarIcon: tabIcon("Food") }}
        />
        <SwipeTabs.Screen
          name="community/index"
          options={{ tabBarLabel: "Community", tabBarAccessibilityLabel: "Community. Long press to ask a question.", tabBarIcon: tabIcon("Community") }}
        />
      </SwipeTabs>
      <ComposeSheet visible={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  );
}
