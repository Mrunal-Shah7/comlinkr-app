// apps/mobile/app/app/feed/index.tsx
//
// Bridges incoming universal/App Links of the form
//   https://comlinkr.com/app/feed?openPost=<id>
//   https://comlinkr.com/app/feed?openEvent=<id>
//   https://comlinkr.com/app/feed?openStory=<id>
// into the existing, already-working post/event/story deep-link handlers in
// app/(tabs)/feed/index.tsx, which watch these query params via
// useLocalSearchParams().
//
// This file renders nothing itself — it only exists so expo-router has a
// matching route for this URL shape, then immediately hands off.

import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function FeedDeepLinkBridge() {
  const { openPost, openEvent, openStory } = useLocalSearchParams<{
    openPost?: string;
    openEvent?: string;
    openStory?: string;
  }>();

  useEffect(() => {
    if (openPost) {
      router.replace({ pathname: "/(tabs)/feed", params: { openPost } });
      return;
    }
    if (openEvent) {
      router.replace(`/events/${encodeURIComponent(openEvent)}` as never);
      return;
    }
    if (openStory) {
      router.replace({ pathname: "/(tabs)/feed", params: { openStory } });
      return;
    }
    router.replace("/(tabs)/feed");
  }, [openPost, openEvent, openStory]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
