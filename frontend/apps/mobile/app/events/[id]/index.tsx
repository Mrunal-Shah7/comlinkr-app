// SPRINT-30: deep link entry point for comlinkr://events/:id
// SPRINT-42: moved to [id]/index.tsx so check-in can live at [id]/check-in.tsx
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getEvent } from "../../../src/api/events.api";

export default function EventDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const eventId =
      typeof id === "string" ? id.trim() : Array.isArray(id) ? String(id[0] ?? "").trim() : "";
    if (!eventId) {
      setNotFound(true);
      return;
    }
    let cancelled = false;
    void getEvent(eventId)
      .then((e) => {
        if (cancelled) return;
        if (!e) {
          setNotFound(true);
          return;
        }
        router.replace({ pathname: "/(tabs)/feed", params: { openEvent: eventId } } as never);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

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
      <ActivityIndicator size="large" color="#0076EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#111" },
  btn: { paddingVertical: 10, paddingHorizontal: 16 },
  btnText: { color: "#0076EB", fontWeight: "600", fontSize: 16 },
});
