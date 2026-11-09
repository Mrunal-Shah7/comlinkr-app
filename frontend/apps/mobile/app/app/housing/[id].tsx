// New File:
// apps/mobile/app/app/housing/[id].tsx
//
// Bridges incoming universal/App Links of the form
//   https://comlinkr.com/app/housing/<id>
// (the same path shape the web app uses for ListingDetailPage) to the listing detail route,
// app/listing/[id].tsx (plan 03).
//
// This file renders nothing itself — it only exists so expo-router has a
// matching route for this URL shape, then immediately hands off.

import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function HousingDeepLinkBridge() {
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if (!id) {
      router.replace("/housing");
      return;
    }
    router.replace(`/listing/${encodeURIComponent(String(id))}` as never);
  }, [id]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}