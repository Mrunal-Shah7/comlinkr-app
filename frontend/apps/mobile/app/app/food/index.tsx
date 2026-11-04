// apps/mobile/app/app/food/index.tsx
//
// Bridges incoming universal/App Links of the form
//   https://comlinkr.com/app/food?openRestaurant=<id>
// into the existing, already-working restaurant deep-link handler in
// app/(tabs)/food/index.tsx, which watches the `openRestaurant` query
// param via useLocalSearchParams().
//
// This file renders nothing itself — it only exists so expo-router has a
// matching route for this URL shape, then immediately hands off.

import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function FoodDeepLinkBridge() {
  const { openRestaurant } = useLocalSearchParams<{ openRestaurant?: string }>();

  useEffect(() => {
    if (!openRestaurant) {
      router.replace("/(tabs)/food");
      return;
    }
    router.replace({ pathname: "/(tabs)/food", params: { openRestaurant } });
  }, [openRestaurant]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
