// SPRINT-30: deep link entry point for comlinkr://events/:id
// SPRINT-42: moved to [id]/index.tsx so check-in can live at [id]/check-in.tsx
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../src/services/cache/queryKeys";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getEvent } from "../../../src/api/events.api";

export default function EventDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const eventId =
    typeof id === "string" ? id.trim() : Array.isArray(id) ? String(id[0] ?? "").trim() : "";
  const query = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () => getEvent(eventId),
    enabled: !!eventId,
  });
  const notFound = !eventId || query.isError || (query.isSuccess && !query.data);

  useEffect(() => {
    if (query.isSuccess && query.data) {
      router.replace({ pathname: "/(tabs)/feed", params: { openEvent: eventId } } as never);
    }
  }, [query.isSuccess, query.data, eventId, router]);

  if (notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Event not found</Text>
        <Pressable onPress={() => router.replace("/(tabs)/feed" as never)} style={styles.btn}>
          <Text style={styles.btnText}>Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1A6BAE" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#111" },
  btn: { paddingVertical: 10, paddingHorizontal: 16 },
  btnText: { color: "#1A6BAE", fontWeight: "600", fontSize: 16 },
});
