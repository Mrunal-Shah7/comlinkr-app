import { useState } from "react";
import * as Haptics from "expo-haptics";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "../../src/theme/useTheme";
import { ComposeSheet } from "../../src/shared/navigation/ComposeSheet";

// Plan 02: the platform's own tab bar (NativeTabs): Material 3 bottom navigation on Android, the system tab bar on
// iOS. Tabs are peers and do not slide. The fifth trigger, Post, never opens a screen: it is disabled, so the bar
// stays on the current tab, and its tabPress opens the compose sheet.
export default function TabsLayout() {
  const { tc } = useTheme();
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <>
      <NativeTabs
        // Plan 05: Back retraces the tabs in the order visited, then leaves the app from the first tab.
        backBehavior="history"
        backgroundColor={tc.cardBg}
        tintColor={tc.accent}
        iconColor={{ default: tc.textSecondary, selected: tc.accent }}
        indicatorColor={tc.accentSoft}
        labelVisibilityMode="labeled"
        labelStyle={{ default: { color: tc.textSecondary }, selected: { color: tc.accent } }}
        screenListeners={({ route }) => ({
          tabPress: () => {
            void Haptics.selectionAsync();
            if (route.name === "post") setComposeOpen(true);
          },
        })}
      >
        <NativeTabs.Trigger name="feed/index" contentStyle={{ backgroundColor: tc.pageBg }}>
          <NativeTabs.Trigger.Icon sf={{ default: "safari", selected: "safari.fill" }} md="explore" />
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="housing/index" contentStyle={{ backgroundColor: tc.pageBg }}>
          <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
          <NativeTabs.Trigger.Label>Listings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="post" disabled accessibilityLabel="Post something">
          <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
          <NativeTabs.Trigger.Label>Post</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="food/index" contentStyle={{ backgroundColor: tc.pageBg }}>
          <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
          <NativeTabs.Trigger.Label>Food</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="community/index" contentStyle={{ backgroundColor: tc.pageBg }}>
          <NativeTabs.Trigger.Icon sf={{ default: "person.3", selected: "person.3.fill" }} md="groups" />
          <NativeTabs.Trigger.Label>Community</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <ComposeSheet visible={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  );
}
