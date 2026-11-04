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
} from "react-native";
import { Image } from "expo-image"; // SPRINT-31:
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useAuthStore } from "../src/store/auth.store";
import { resolveApiAssetUrl } from "../src/api/feed.api";
import {
  getPublicProfile,
  getUserPosts,
  toggleFollow,
  blockUser as blockUserApi,
  reportUser,
  type PublicProfile,
} from "../src/api/profile.api";
import { ApiError } from "../src/api/client";
import { useBlockStore } from "../src/store/block.store";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';
import { showToast } from '../src/shared/ui/Toast';

const ACHIEVEMENT_ICONS: Record<string, { icon: string; color: string }> = {
  homefinder:       { icon: "home",                 color: "#0060D0" },
  foodie:           { icon: "restaurant",           color: "#FF7B00" },
  connector:        { icon: "people",               color: "#26B324" },
  storyteller:      { icon: "book",                 color: "#8B5CF6" },
  explorer:         { icon: "compass",              color: "#06B6D4" },
  neighborly:       { icon: "heart",                color: "#EF4444" },
  local_expert:     { icon: "star",                 color: "#F59E0B" },
  event_host:       { icon: "calendar",             color: "#EC4899" },
  verified_landlord:{ icon: "shield-checkmark",     color: "#0060D0" },
  verified_owner:   { icon: "shield-checkmark",     color: "#26B324" },
};

function Avatar({ name, uri, size = 88 }: { name: string; uri?: string; size?: number }) {
  const colors = ["#0060D0", "#26B324", "#6D28D9", "#D97706", "#DC2626", "#0891B2", "#DB2777"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const bg = colors[Math.abs(h) % colors.length];
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : (
        <Text style={{ fontSize: size * 0.34, fontWeight: "800", color: "#FFF" }}>{initials}</Text>
      )}
    </View>
  );
}

type PostLike = { id: string; title: string; content: string; createdAt: string; likesCount: number; commentsCount: number };

export default function PublicProfileScreen() {
  const { isDark, tc } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const currentUser = useAuthStore((s) => s.user);
  const { blockUser: blockUserStore } = useBlockStore();
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params.userId?.trim() ?? "";

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<PostLike[]>([]);
  const [postsFailed, setPostsFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!userId) {
      setError("No user specified.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [prof, postsRes] = await Promise.all([
        getPublicProfile(userId),
        getUserPosts(userId, { page: 1, pageSize: 10 }).then((r) => ({ ok: true as const, r })).catch(() => ({ ok: false as const, r: { data: [] } })),
      ]);
      setProfile(prof);
      setFollowing(prof.followedByMe);
      setPostsFailed(!postsRes.ok);
      const rawPosts = Array.isArray((postsRes.r as any)?.data) ? (postsRes.r as any).data : [];
      setPosts(rawPosts as PostLike[]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!loadedRef.current) {
        loadedRef.current = true;
        void load();
      }
    }, [load])
  );

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    const prev = following;
    setFollowing(!prev);
    try {
      const res = await toggleFollow(profile.id);
      setFollowing(res.following);
    } catch (e) {
      setFollowing(prev);
      appAlert("Error", e instanceof ApiError ? e.message : "Could not update follow.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    router.push({ pathname: "/chat" as any, params: { recipientId: profile.id } });
  };

  const handleBlock = () => {
    if (!profile) return;
    appAlert(
      "Block User",
      `Block ${profile.name}? They won't be able to message you or see your content.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUserApi(profile.id);
              await blockUserStore({ id: profile.id, name: profile.name, avatar: profile.avatar });
              showToast(`${profile.name} has been blocked.`, "success");
              if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any);
            } catch (e) {
              appAlert("Error", e instanceof ApiError ? e.message : "Could not block user.");
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    if (!profile) return;
    appAlert(
      "Report User",
      "Why are you reporting this user?",
      [
        { text: "Spam", onPress: () => void reportUser(profile.id, "Spam") },
        { text: "Harassment", onPress: () => void reportUser(profile.id, "Harassment") },
        { text: "Inappropriate content", onPress: () => void reportUser(profile.id, "Inappropriate content") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const isOwnProfile = currentUser?.id && profile?.id && String(currentUser.id) === String(profile.id);

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: tc.pageBg }]} edges={["top"]}>
      {/* Header */}
      <View style={[st.header, { backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }]}>
        <Pressable style={st.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} hitSlop={10}>
          <Ionicons name="chevron-back" size={rs(22)} color={tc.textPrimary} />
        </Pressable>
        <Text style={[st.headerTitle, { color: tc.textPrimary }]}>Profile</Text>
        {!isOwnProfile && profile ? (
          <Pressable style={st.moreBtn} onPress={handleReport} hitSlop={10}>
            <Ionicons name="flag-outline" size={rs(20)} color="#DC2626" />
          </Pressable>
        ) : (
          <View style={{ width: rs(38) }} />
        )}
      </View>

      {loading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.brand.green} />
          <Text style={[st.loadingText, { color: tc.textTertiary }]}>Loading profile…</Text>
        </View>
      ) : error ? (
        <View style={st.loadingWrap}>
          <Ionicons name="person-outline" size={48} color="#CBD5E1" />
          <Text style={[st.loadingText, { color: tc.textSecondary, marginTop: 12 }]}>{error}</Text>
          <Pressable onPress={() => { loadedRef.current = false; void load(); }} style={st.retryBtn}>
            <Text style={{ color: Colors.brand.green, fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Hero gradient */}
          <LinearGradient
            colors={[Colors.brand.greenDark, Colors.brand.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.heroBg}
          />

          {/* Avatar + basic info */}
          <View style={st.avatarSection}>
            <View style={st.avatarWrap}>
              <Avatar
                name={profile.name}
                uri={profile.avatar ? resolveApiAssetUrl(profile.avatar) : undefined}
                size={88}
              />
              {profile.verified && (
                <View style={st.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#FFF" />
                </View>
              )}
            </View>
            <Text style={[st.name, { color: tc.textPrimary }]}>{profile.name}</Text>
            <Text style={[st.username, { color: tc.textTertiary }]}>@{profile.username}</Text>
            {(profile.city || profile.country) && (
              <View style={st.locationRow}>
                <Ionicons name="location-outline" size={13} color={tc.textTertiary} />
                <Text style={[st.locationText, { color: tc.textTertiary }]}>
                  {[profile.city, profile.stateProvince, profile.country].filter(Boolean).join(", ")}
                </Text>
              </View>
            )}
            {profile.bio ? (
              <Text style={[st.bio, { color: tc.textSecondary }]}>{profile.bio}</Text>
            ) : null}
            <Text style={[st.joinedText, { color: tc.textTertiary }]}>
              Joined {new Date(profile.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
          </View>

          {/* Action buttons */}
          {!isOwnProfile ? (
            <View style={st.actionRow}>
              <Pressable
                style={[st.followBtn, following && { backgroundColor: isDark ? tc.inputBg : "#F3F4F6", borderWidth: 1.5, borderColor: tc.borderLight }]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                {following ? (
                  <>
                    <Ionicons name="checkmark" size={16} color={tc.textSecondary} />
                    <Text style={[st.followBtnText, { color: tc.textSecondary }]}>Following</Text>
                  </>
                ) : (
                  <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.followGrad}>
                    <Ionicons name="person-add-outline" size={16} color="#FFF" />
                    <Text style={[st.followBtnText, { color: "#FFF" }]}>Follow</Text>
                  </LinearGradient>
                )}
              </Pressable>
              <Pressable style={[st.messageBtn, { backgroundColor: isDark ? tc.inputBg : "#EEF5FF", borderColor: Colors.brand.blue }]} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={16} color={Colors.brand.blue} />
                <Text style={[st.messageBtnText, { color: Colors.brand.blue }]}>Message</Text>
              </Pressable>
              <Pressable style={[st.blockBtn, { backgroundColor: isDark ? tc.inputBg : "#FEF2F2" }]} onPress={handleBlock} hitSlop={4}>
                <Ionicons name="ban-outline" size={18} color="#DC2626" />
              </Pressable>
            </View>
          ) : null}

          {/* Stats */}
          <View style={[st.statsCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            {[
              { label: "Posts", value: profile.stats.postsCount, icon: "document-text-outline" as const, color: Colors.brand.blue },
              { label: "Saved", value: profile.stats.savedCount, icon: "bookmark-outline" as const, color: "#F59E0B" },
              { label: "Events", value: profile.stats.eventsCount, icon: "calendar-outline" as const, color: "#8B5CF6" },
              { label: "Neighbors", value: profile.stats.neighborsCount, icon: "people-outline" as const, color: Colors.brand.green },
            ].map((s, i, arr) => (
              <View key={s.label} style={[st.statItem, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: tc.borderLight }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
                <Text style={[st.statNum, { color: tc.textPrimary }]}>{s.value ?? 0}</Text>
                <Text style={[st.statLabel, { color: tc.textTertiary }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Achievements */}
          {profile.achievements.filter((a) => a.earned).length > 0 ? (
            <View style={[st.section, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Text style={[st.sectionTitle, { color: tc.textPrimary }]}>Achievements</Text>
              <View style={st.achievementsGrid}>
                {profile.achievements.filter((a) => a.earned).map((a) => {
                  const meta = ACHIEVEMENT_ICONS[a.id] ?? { icon: "ribbon-outline", color: "#6B7280" };
                  return (
                    <View key={a.id} style={[st.achievementChip, { backgroundColor: isDark ? tc.inputBg : `${meta.color}10` }]}>
                      <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                      <Text style={[st.achievementLabel, { color: isDark ? tc.textSecondary : meta.color }]}>{a.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Recent posts */}
          {posts.length > 0 ? (
            <View style={[st.section, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Text style={[st.sectionTitle, { color: tc.textPrimary }]}>Recent Posts</Text>
              {posts.map((p) => (
                <View key={p.id} style={[st.postCard, { backgroundColor: isDark ? tc.inputBg : "#F9FAFB", borderColor: tc.borderLight }]}>
                  {p.title ? (
                    <Text style={[st.postTitle, { color: tc.textPrimary }]} numberOfLines={1}>{p.title}</Text>
                  ) : null}
                  <Text style={[st.postContent, { color: tc.textSecondary }]} numberOfLines={3}>{p.content}</Text>
                  <View style={st.postMeta}>
                    <View style={st.postMetaChip}>
                      <Ionicons name="heart-outline" size={12} color={tc.textTertiary} />
                      <Text style={[st.postMetaText, { color: tc.textTertiary }]}>{p.likesCount ?? 0}</Text>
                    </View>
                    <View style={st.postMetaChip}>
                      <Ionicons name="chatbubble-outline" size={12} color={tc.textTertiary} />
                      <Text style={[st.postMetaText, { color: tc.textTertiary }]}>{p.commentsCount ?? 0}</Text>
                    </View>
                    <Text style={[st.postDate, { color: tc.textTertiary }]}>{new Date(p.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[st.section, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Text style={[st.sectionTitle, { color: tc.textPrimary }]}>Recent Posts</Text>
              <Text style={[st.emptyText, { color: tc.textTertiary }]}>{postsFailed ? "Posts are unavailable right now. Pull back later to retry." : "No public posts yet."}</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const st = createThemedStyles({
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: rs(16), paddingVertical: rs(12),
    borderBottomWidth: 1,
  },
  backBtn: { width: rs(38), height: rs(38), alignItems: "center", justifyContent: "center" },
  moreBtn: { width: rs(38), height: rs(38), alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: rs(16), fontWeight: "700" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  loadingText: { fontSize: rs(14), marginTop: rs(8) },
  retryBtn: { marginTop: rs(16), paddingVertical: rs(8), paddingHorizontal: rs(24), borderRadius: rs(10), backgroundColor: Colors.brand.green + "15" },

  heroBg: { height: rs(120) },

  avatarSection: {
    alignItems: "center",
    marginTop: -rs(44),
    paddingHorizontal: rs(20),
    paddingBottom: rs(16),
  },
  avatarWrap: { position: "relative" },
  verifiedBadge: {
    position: "absolute", bottom: 2, right: 2,
    width: rs(24), height: rs(24), borderRadius: rs(12),
    backgroundColor: Colors.brand.green, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFF",
  },
  name: { fontSize: rs(22), fontWeight: "800", marginTop: rs(12), letterSpacing: -0.3 },
  username: { fontSize: rs(13), marginTop: rs(2) },
  locationRow: { flexDirection: "row", alignItems: "center", gap: rs(4), marginTop: rs(6) },
  locationText: { fontSize: rs(13) },
  bio: { fontSize: rs(14), textAlign: "center", marginTop: rs(8), lineHeight: rs(20), paddingHorizontal: rs(16) },
  joinedText: { fontSize: rs(12), marginTop: rs(6) },

  actionRow: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    paddingHorizontal: rs(20), marginBottom: rs(16),
  },
  followBtn: {
    flex: 1, height: rs(44), borderRadius: rs(12), overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  followGrad: {
    flex: 1, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(6),
  },
  followBtnText: { fontSize: rs(14), fontWeight: "700" },
  messageBtn: {
    flex: 1, height: rs(44), borderRadius: rs(12), borderWidth: 1.5,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(6),
  },
  messageBtnText: { fontSize: rs(14), fontWeight: "700" },
  blockBtn: {
    width: rs(44), height: rs(44), borderRadius: rs(12),
    alignItems: "center", justifyContent: "center",
  },

  statsCard: {
    flexDirection: "row", marginHorizontal: rs(16), marginBottom: rs(16),
    borderRadius: rs(16), borderWidth: 1, overflow: "hidden",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: rs(14), gap: rs(4) },
  statNum: { fontSize: rs(18), fontWeight: "800" },
  statLabel: { fontSize: rs(11) },

  section: {
    marginHorizontal: rs(16), marginBottom: rs(16),
    borderRadius: rs(16), borderWidth: 1, padding: rs(16),
  },
  sectionTitle: { fontSize: rs(16), fontWeight: "700", marginBottom: rs(12) },

  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: rs(8) },
  achievementChip: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    paddingHorizontal: rs(12), paddingVertical: rs(8), borderRadius: rs(10),
  },
  achievementLabel: { fontSize: rs(12), fontWeight: "700" },

  postCard: {
    borderRadius: rs(12), borderWidth: 1, padding: rs(12), marginBottom: rs(10),
  },
  postTitle: { fontSize: rs(14), fontWeight: "700", marginBottom: rs(4) },
  postContent: { fontSize: rs(13), lineHeight: rs(18) },
  postMeta: { flexDirection: "row", alignItems: "center", gap: rs(12), marginTop: rs(8) },
  postMetaChip: { flexDirection: "row", alignItems: "center", gap: rs(4) },
  postMetaText: { fontSize: rs(12) },
  postDate: { fontSize: rs(11), marginLeft: "auto" },

  emptyText: { fontSize: rs(13), textAlign: "center", paddingVertical: rs(8) },
});
