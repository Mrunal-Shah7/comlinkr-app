import { useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { router, Redirect, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import Reanimated, { ZoomOut } from "react-native-reanimated";
import { TYPE } from "../src/theme/d";
import { EmptyState, PressableScale, Reveal, Segmented } from "../src/shared/d";
import { DPage, goBackOr } from "../src/shared/d/Page";

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
  const { tc } = useTheme();
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

  const isToday = (iso: string) => { const d = new Date(iso); const n = new Date(); return d.toDateString() === n.toDateString(); };
  const today = visible.filter((n) => isToday(n.createdAt));
  const earlier = visible.filter((n) => !isToday(n.createdAt));
  const row = (item: AppNotification, i: number) => (
    <Reveal key={item.id} i={i}>
      <PressableScale onPress={() => void handlePress(item)} accessibilityRole="button" accessibilityLabel={item.title}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
          <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[item.read ? TYPE.body : TYPE.bodyStrong, { color: tc.textPrimary }]}>{item.title}</Text>
          {item.desc ? <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={2}>{item.desc}</Text> : null}
          <Text style={[TYPE.small, { color: tc.textTertiary, fontSize: 12, marginTop: 2 }]}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        {!item.read ? <Reanimated.View exiting={ZoomOut.duration(260)} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: tc.accent }} /> : null}
      </PressableScale>
    </Reveal>
  );

  return (
    <DPage
      title="Notifications"
      sub={unreadCount > 0 ? `${unreadCount} unread` : items.length > 0 ? "All caught up" : undefined}
      onBack={() => goBackOr("/(tabs)/feed")}
      right={unreadCount > 0 ? (
        <Pressable onPress={handleMarkAllRead} disabled={markingAll} hitSlop={8} style={{ paddingHorizontal: 10, height: 42, justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Mark all as read">
          {markingAll ? <ActivityIndicator size="small" color={tc.accent} /> : <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>Read all</Text>}
        </Pressable>
      ) : null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.accent} />}
    >
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: tc.warningBg }}>
          <Ionicons name="alert-circle-outline" size={18} color={tc.warningText} />
          <Text style={[TYPE.small, { flex: 1, color: tc.warningText }]}>{error}</Text>
        </View>
      ) : null}
      <Segmented
        style={{ marginHorizontal: 16, marginBottom: 10 }}
        items={[{ key: "all", label: "All" }, { key: "unread", label: `Unread (${unreadCount})` }]}
        value={filter}
        onChange={(k) => setFilter(k as "all" | "unread")}
      />
      {loading ? <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 48 }} /> : null}
      {!loading && today.length ? <Text style={[TYPE.overline, { color: tc.textTertiary, marginHorizontal: 18, marginTop: 8, marginBottom: 2 }]}>Today</Text> : null}
      {!loading ? today.map(row) : null}
      {!loading && earlier.length ? <Text style={[TYPE.overline, { color: tc.textTertiary, marginHorizontal: 18, marginTop: 14, marginBottom: 2 }]}>Earlier</Text> : null}
      {!loading ? earlier.map((n, i) => row(n, i + today.length)) : null}
      {!loading && visible.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title={items.length === 0 ? "No notifications yet" : "All caught up"}
          sub={items.length === 0 ? "When someone interacts with your content, you will see it here." : filter === "unread" ? "You have no unread notifications." : "Nothing to show in this view."}
        />
      ) : null}
    </DPage>
  );
}
