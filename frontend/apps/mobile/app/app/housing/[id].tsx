// New File:
// apps/mobile/app/app/housing/[id].tsx
//
// Bridges incoming universal/App Links of the form
//   https://comlinkr.com/app/housing/<id>
// (the same path shape the web app uses for ListingDetailPage) into the
// existing, already-working listing deep-link handler in
// app/(tabs)/housing/index.tsx, which watches the `openListing` query
// param via useLocalSearchParams().
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
    router.replace({ pathname: "/housing", params: { openListing: id } });
  }, [id]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}