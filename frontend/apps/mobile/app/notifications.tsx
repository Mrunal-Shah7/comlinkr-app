import { rs } from "../src/utils/responsive";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { ApiError } from "../src/api/client";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "../src/api/notifications.api";
import { useSidebarStore } from "../src/store/sidebar.store";
import { useAuthStore } from "../src/store/auth.store";
import { createThemedStyles } from '../src/theme/themedStyles';

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function NotificationsScreen() {
  const { isDark, tc } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getNotifications({ page: 1, pageSize: 50 });
      setItems(res.data);
      useSidebarStore.getState().resetUnread();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load notifications.";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const unreadCount = items.filter((n) => !n.read).length;
  const visible = filter === "all" ? items : items.filter((n) => !n.read);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not mark all as read.";
      setError(msg);
    } finally {
      setMarkingAll(false);
    }
  }, [unreadCount]);

  const handlePress = useCallback(async (n: AppNotification) => {
    // Mark read first (optimistic)
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
      } catch { /* ignore — still mark locally */ }
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    // Navigate to the relevant content
    if (n.targetType === "post" && n.targetId) {
      router.push({ pathname: "/(tabs)/feed", params: { openPost: n.targetId } } as any);
    } else if (n.targetType === "listing" && n.targetId) {
      router.push({ pathname: "/(tabs)/housing", params: { openListing: n.targetId } } as any);
    } else if (n.targetType === "restaurant" && n.targetId) {
      router.push({ pathname: "/(tabs)/food", params: { openRestaurant: n.targetId } } as any);
    } else if (n.type === "message") {
      if (n.targetId) router.push({ pathname: "/chat", params: { conversationId: n.targetId } } as any);
      else router.push("/chat" as any);
    } else if (n.type === "badge") {
      router.push("/verification-status" as any);
    }
  }, []);

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]}>
      <View style={[s.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.9 }] }]}>
          <Ionicons name="chevron-back" size={20} color={Colors.brand.blue} />
        </Pressable>
        <Text style={[s.headerTitle, { color: tc.textPrimary }]}>Notifications</Text>
        <Pressable
          style={[s.backBtn, markingAll && { opacity: 0.6 }]}
          onPress={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color={Colors.brand.blue} />
          ) : (
            <Text style={{ fontSize: rs(13), color: Colors.brand.blue, fontWeight: "600" }}>✓</Text>
          )}
        </Pressable>
      </View>

      {error ? (
        <View style={[s.errorBanner, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={[s.errorText, { color: tc.textSecondary }]}>{error}</Text>
        </View>
      ) : null}

      <View style={[s.filterRow, { backgroundColor: tc.cardBg }]}>
        <Pressable
          onPress={() => setFilter("all")}
          style={[s.filterBtn, filter === "all" && s.filterActive, filter !== "all" && isDark && { backgroundColor: tc.inputBg }]}
        >
          <Text
            style={[s.filterText, filter === "all" && s.filterTextActive, filter !== "all" && isDark && { color: tc.textSecondary }]}
          >
            All
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("unread")}
          style={[s.filterBtn, filter === "unread" && s.filterActive, filter !== "unread" && isDark && { backgroundColor: tc.inputBg }]}
        >
          <Text
            style={[
              s.filterText,
              filter === "unread" && s.filterTextActive,
              filter !== "unread" && isDark && { color: tc.textSecondary },
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.blue} />}
      >
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.brand.blue} />
          </View>
        ) : null}

        {!loading &&
          visible.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void handlePress(item)}
              style={[s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, !item.read && s.cardUnread]}
            >
              <View style={[s.cardIcon, { backgroundColor: isDark ? tc.inputBg : "#F3F4F6" }]}>
                <Text style={{ fontSize: rs(20) }}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: tc.textPrimary }, !item.read && { fontWeight: "800" }]}>{item.title}</Text>
                <Text style={[s.cardDesc, { color: tc.textSecondary }]} numberOfLines={2}>
                  {item.desc}
                </Text>
                <Text style={[s.cardTime, { color: tc.textTertiary }]}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={s.unreadDot} />}
            </Pressable>
          ))}

        {!loading && visible.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="notifications-outline" size={rs(44)} color={tc.textTertiary} />
            <Text style={[s.emptyTitle, { color: tc.textPrimary }]}>
              {items.length === 0 ? "No notifications yet" : "All caught up!"}
            </Text>
            <Text style={[s.emptyDesc, { color: tc.textSecondary }]}>
              {items.length === 0
                ? "When someone interacts with your content, you will see it here."
                : filter === "unread"
                  ? "You have no unread notifications."
                  : "Nothing to show in this view."}
            </Text>
          </View>
        )}

        <View style={{ height: rs(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: rs(16), gap: rs(8) },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    borderBottomWidth: 1,
  },
  errorText: { flex: 1, fontSize: rs(13), fontWeight: "600" },

  loadingWrap: { paddingVertical: rs(48), alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,118,235,0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(2) },
    elevation: 4,
  },
  headerTitle: { fontSize: rs(18), fontWeight: "800", color: Colors.text.primary },

  filterRow: { flexDirection: "row", paddingHorizontal: rs(16), paddingVertical: rs(12), gap: rs(8), backgroundColor: "#FFF" },
  filterBtn: { paddingHorizontal: rs(18), paddingVertical: rs(8), borderRadius: rs(20), backgroundColor: "#F3F4F6" },
  filterActive: { backgroundColor: Colors.brand.blue },
  filterText: { fontSize: rs(13), fontWeight: "600", color: Colors.text.secondary },
  filterTextActive: { color: "#FFF" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: rs(14),
    borderRadius: rs(14),
    gap: rs(12),
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardUnread: { backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue + "30" },
  cardIcon: { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: rs(13), fontWeight: "600", color: Colors.text.primary },
  cardDesc: { fontSize: rs(12), color: Colors.text.secondary, marginTop: rs(2) },
  cardTime: { fontSize: rs(10), color: Colors.text.tertiary, marginTop: rs(3) },
  unreadDot: { width: rs(8), height: rs(8), borderRadius: rs(4), backgroundColor: Colors.brand.blue },

  emptyState: { alignItems: "center", marginTop: rs(80), gap: rs(8) },
  emptyTitle: { fontSize: rs(16), fontWeight: "700", color: Colors.text.primary },
  emptyDesc: { fontSize: rs(13), color: Colors.text.secondary, textAlign: "center", paddingHorizontal: rs(24) },
});
