// apps/mobile/app/app/community/index.tsx
//
// Bridges incoming universal/App Links of the form
//   https://comlinkr.com/app/community?openQuestion=<id>
// into the existing, already-working question deep-link handler in
// app/(tabs)/community/index.tsx, which watches the `openQuestion` query
// param via useLocalSearchParams().
//
// This file renders nothing itself — it only exists so expo-router has a
// matching route for this URL shape, then immediately hands off.

import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function CommunityDeepLinkBridge() {
  const { openQuestion } = useLocalSearchParams<{ openQuestion?: string }>();

  useEffect(() => {
    if (!openQuestion) {
      router.replace("/(tabs)/community");
      return;
    }
    router.replace({ pathname: "/(tabs)/community", params: { openQuestion } });
  }, [openQuestion]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
