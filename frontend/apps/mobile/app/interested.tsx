import { rs } from "../src/utils/responsive";
import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image"; // SPRINT-31:
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { resolveApiAssetUrl } from "../src/api/feed.api";
import {
  getInterestedItems,
  removeInterested,
  type InterestedItem,
} from "../src/api/favorites.api";
import { ApiError } from "../src/api/client";
import AppHeader from "../components/AppHeader";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string; route: string }> = {
  listing:    { label: "Housing",   color: Colors.brand.blue,   bg: "#EEF5FF",  icon: "home-outline",       route: "/(tabs)/housing" },
  restaurant: { label: "Food",      color: "#257A86",           bg: "#E2F0F1",  icon: "restaurant-outline", route: "/(tabs)/food" },
  event:      { label: "Event",     color: "#8B5CF6",           bg: "#F5F3FF",  icon: "calendar-outline",   route: "/(tabs)/feed" },
  post:       { label: "Post",      color: "#0891B2",           bg: "#ECFEFF",  icon: "document-text-outline",route: "/(tabs)/feed" },
  question:   { label: "Q&A",       color: Colors.brand.green,  bg: "#F0FDF4",  icon: "help-circle-outline", route: "/(tabs)/community" },
};

// Interested is housing-only (DEV-03); the list is a single Housing view.
const TABS: { key: string; label: string; icon: string }[] = [
  { key: "all",        label: "Housing",  icon: "home-outline" },
];

export default function InterestedScreen() {
  const { isDark, tc } = useTheme();
  const [items, setItems] = useState<InterestedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await getInterestedItems({ pageSize: 100 });
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 404 ? e.message : "Could not load your interested listings. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loadedRef.current) {
        loadedRef.current = true;
        void load();
      }
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadedRef.current = false;
    void load(true);
  }, [load]);

  const handleRemove = (item: InterestedItem) => {
    appAlert("Remove Interest", "Remove this item from your interested list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeInterested(item.type, item.contentId);
            setItems((prev) => prev.filter((x) => x.id !== item.id));
          } catch (e) {
            appAlert("Error", e instanceof ApiError ? e.message : "Could not remove.");
          }
        },
      },
    ]);
  };

  const filtered = activeTab === "all" ? items : items.filter((i) => i.type === activeTab);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]} edges={["top"]}>
      <AppHeader />

      {/* Header */}
      <View style={[s.pageHeader, { backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }]}>
        <Pressable style={s.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} hitSlop={10}>
          <Ionicons name="chevron-back" size={rs(22)} color={tc.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: tc.textPrimary }]}>Interested</Text>
          <Text style={[s.headerSub, { color: tc.textTertiary }]}>{items.length} item{items.length !== 1 ? "s" : ""} saved</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.tabScroll, { backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }]}
        contentContainerStyle={s.tabScrollContent}
      >
        {TABS.map((t) => {
          const count = t.key === "all" ? items.length : items.filter((i) => i.type === t.key).length;
          const active = activeTab === t.key;
          return (
            <Pressable key={t.key} style={[s.tab, active && s.tabActive]} onPress={() => setActiveTab(t.key)}>
              <Ionicons name={t.icon as any} size={rs(13)} color={active ? "#FFF" : tc.textSecondary} />
              <Text style={[s.tabText, { color: active ? "#FFF" : tc.textSecondary }]}>{t.label}</Text>
              {count > 0 && (
                <View style={[s.tabBadge, { backgroundColor: active ? "rgba(255,255,255,0.28)" : tc.borderLight }]}>
                  <Text style={[s.tabBadgeText, { color: active ? "#FFF" : tc.textSecondary }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: rs(16), gap: rs(12) }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.blue} colors={[Colors.brand.blue]} />
        }
      >
        {loading && items.length === 0 ? (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={Colors.brand.blue} />
            <Text style={[s.loadingText, { color: tc.textTertiary }]}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={s.centerWrap}>
            <Ionicons name="alert-circle-outline" size={44} color="#CBD5E1" />
            <Text style={[s.emptyTitle, { color: tc.textSecondary }]}>{error}</Text>
            <Pressable style={s.retryBtn} onPress={() => { loadedRef.current = false; void load(); }}>
              <Text style={{ color: Colors.brand.green, fontWeight: "700" }}>Retry</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.centerWrap}>
            <LinearGradient colors={[Colors.brand.blue + "20", Colors.brand.green + "20"]} style={s.emptyIconBg}>
              <Ionicons name="heart-outline" size={40} color={Colors.brand.blue} />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: tc.textPrimary }]}>Nothing here yet</Text>
            <Text style={[s.emptySub, { color: tc.textTertiary }]}>
              {activeTab === "all"
                ? "Mark listings, food spots, and events as interested to see them here."
                : `No interested ${activeTab} items yet.`}
            </Text>
          </View>
        ) : (
          filtered.map((item) => {
            const meta = TYPE_META[item.type] ?? { label: item.type, color: "#6B7280", bg: "#F3F4F6", icon: "bookmark-outline", route: "/" };
            const imgUri = item.image ? resolveApiAssetUrl(item.image) : null;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, pressed && { opacity: 0.92 }]}
                onPress={() => router.push(meta.route as any)}
              >
                {/* Image */}
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={s.cardImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                ) : (
                  <View style={[s.cardImagePlaceholder, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={rs(28)} color={meta.color} />
                  </View>
                )}

                {/* Content */}
                <View style={s.cardContent}>
                  <View style={[s.typeBadge, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={rs(11)} color={meta.color} />
                    <Text style={[s.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={[s.cardTitle, { color: tc.textPrimary }]} numberOfLines={2}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={[s.cardSub, { color: tc.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
                  ) : null}
                  {item.tags && item.tags.length > 0 ? (
                    <View style={s.tagsRow}>
                      {item.tags.slice(0, 3).map((tag, i) => (
                        <View key={`${item.id}-tag-${i}`} style={[s.tagChip, { backgroundColor: isDark ? tc.inputBg : meta.bg }]}>
                          <Text style={[s.tagText, { color: meta.color }]}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text style={[s.cardDate, { color: tc.textTertiary }]}>
                    Saved {new Date(item.markedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>

                {/* Remove button */}
                <Pressable
                  style={s.removeBtn}
                  onPress={(e) => { e.stopPropagation?.(); handleRemove(item); }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={rs(22)} color="#CBD5E1" />
                </Pressable>
              </Pressable>
            );
          })
        )}

        <View style={{ height: rs(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = createThemedStyles({
  safe: { flex: 1 },
  pageHeader: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    paddingHorizontal: rs(16), paddingVertical: rs(12), borderBottomWidth: 1,
  },
  backBtn: { width: rs(38), height: rs(38), alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: rs(18), fontWeight: "800" },
  headerSub: { fontSize: rs(12), marginTop: rs(1) },

  tabScroll: { maxHeight: rs(56), borderBottomWidth: 1 },
  tabScrollContent: { flexDirection: "row", alignItems: "center", paddingHorizontal: rs(12), paddingVertical: rs(10), gap: rs(8) },
  tab: { flexDirection: "row", alignItems: "center", gap: rs(5), paddingVertical: rs(8), paddingHorizontal: rs(12), borderRadius: rs(12), backgroundColor: "#F3F4F6" },
  tabActive: { backgroundColor: Colors.brand.blue },
  tabText: { fontSize: rs(12), fontWeight: "700" },
  tabBadge: { minWidth: rs(18), height: rs(18), borderRadius: rs(9), alignItems: "center", justifyContent: "center", paddingHorizontal: rs(4) },
  tabBadgeText: { fontSize: rs(10), fontWeight: "800" },

  centerWrap: { alignItems: "center", paddingVertical: rs(48) },
  loadingText: { fontSize: rs(13), marginTop: rs(10) },
  emptyIconBg: { width: rs(80), height: rs(80), borderRadius: rs(24), alignItems: "center", justifyContent: "center", marginBottom: rs(16) },
  emptyTitle: { fontSize: rs(17), fontWeight: "700", textAlign: "center", marginBottom: rs(6) },
  emptySub: { fontSize: rs(13), textAlign: "center", lineHeight: rs(18), paddingHorizontal: rs(32) },
  retryBtn: { marginTop: rs(16), paddingVertical: rs(10), paddingHorizontal: rs(24), borderRadius: rs(12), backgroundColor: Colors.brand.green + "15" },

  card: {
    flexDirection: "row", borderRadius: rs(16), borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardImage: { width: rs(90), height: rs(90) },
  cardImagePlaceholder: { width: rs(90), height: rs(90), alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, padding: rs(12), gap: rs(4) },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: rs(4), paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(8), alignSelf: "flex-start" },
  typeBadgeText: { fontSize: rs(10), fontWeight: "800" },
  cardTitle: { fontSize: rs(14), fontWeight: "700", lineHeight: rs(18) },
  cardSub: { fontSize: rs(12), lineHeight: rs(16) },
  tagsRow: { flexDirection: "row", gap: rs(4), flexWrap: "wrap" },
  tagChip: { borderRadius: rs(6), paddingHorizontal: rs(7), paddingVertical: rs(2) },
  tagText: { fontSize: rs(10), fontWeight: "700" },
  cardDate: { fontSize: rs(11), marginTop: rs(2) },
  removeBtn: { padding: rs(10), alignSelf: "flex-start" },
});
