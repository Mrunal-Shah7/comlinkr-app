import { palette } from "../src/theme/palette";
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
import { router, Redirect, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../src/services/cache/queryKeys";
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
import { TYPE, display } from '../src/theme/d';
import { EmptyState, GradientButton, GradientFill, Reveal, SoftButton, TileIn } from '../src/shared/d';
import { DPage, goBackOr } from '../src/shared/d/Page';

const ACHIEVEMENT_ICONS: Record<string, { icon: string; color: string }> = {
  homefinder:       { icon: "home",                 color: palette.skyL41 },
  foodie:           { icon: "restaurant",           color: palette.brandTeal },
  connector:        { icon: "people",               color: palette.brandGreen },
  storyteller:      { icon: "book",                 color: palette.violet500 },
  explorer:         { icon: "compass",              color: palette.cyan500 },
  neighborly:       { icon: "heart",                color: palette.red500 },
  local_expert:     { icon: "star",                 color: palette.amber500 },
  event_host:       { icon: "calendar",             color: palette.pink500 },
  verified_landlord:{ icon: "shield-checkmark",     color: palette.skyL41 },
  verified_owner:   { icon: "shield-checkmark",     color: palette.brandGreen },
};

function Avatar({ name, uri, size = 88 }: { name: string; uri?: string; size?: number }) {
  const colors = [palette.brandBlue, palette.brandTeal, palette.brandGreen, palette.brandBlueDark, palette.brandGreenDark];
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
        <Text style={[display(800), { fontSize: size * 0.34, color: palette.white }]}>{initials}</Text>
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

  const query = useQuery({
    queryKey: queryKeys.publicProfile(userId),
    queryFn: async () => {
      const [prof, postsRes] = await Promise.all([
        getPublicProfile(userId),
        getUserPosts(userId, { page: 1, pageSize: 10 }).then((r) => ({ ok: true as const, r })).catch(() => ({ ok: false as const, r: { data: [] } })),
      ]);
      const rawPosts = Array.isArray((postsRes.r as any)?.data) ? (postsRes.r as any).data : [];
      return { profile: prof, posts: rawPosts as PostLike[], postsFailed: !postsRes.ok };
    },
    enabled: !!userId,
  });
  const profile: PublicProfile | null = query.data?.profile ?? null;
  const posts: PostLike[] = query.data?.posts ?? [];
  const postsFailed = query.data?.postsFailed ?? false;
  const loading = !!userId && query.isPending;
  const error = !userId
    ? "No user specified."
    : query.error
      ? (query.error instanceof ApiError ? query.error.message : "Could not load profile.")
      : null;
  // Follow is toggled optimistically on screen; the server's answer replaces it.
  const [followOverride, setFollowing] = useState<boolean | null>(null);
  const following = followOverride ?? profile?.followedByMe ?? false;
  const [followLoading, setFollowLoading] = useState(false);

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

  const more = () => {
    if (!profile) return;
    appAlert(profile.name, undefined, [
      { text: "Report", onPress: handleReport },
      { text: "Block", style: "destructive", onPress: handleBlock },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const card = { borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg };
  const h2 = (t: string) => <Text style={[TYPE.section, { color: tc.textPrimary, marginTop: 24, marginBottom: 10, marginHorizontal: 18 }]}>{t}</Text>;

  return (
    <DPage
      title={profile?.name ?? "Profile"}
      largeTitle="hidden"
      onBack={() => goBackOr("/(tabs)/feed")}
      right={!isOwnProfile && profile ? (
        <Pressable onPress={more} hitSlop={8} accessibilityRole="button" accessibilityLabel="More options"
          style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: tc.inputBg }]}>
          <Ionicons name="ellipsis-horizontal" size={22} color={tc.textPrimary} />
        </Pressable>
      ) : null}
    >
      {loading ? (
        <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 80 }} />
      ) : error ? (
        <EmptyState icon="person-outline" title="Could not load this profile" sub={error} actionLabel="Try again" onAction={() => { void query.refetch(); }} />
      ) : profile ? (
        <>
          <Reveal i={0} style={{ alignItems: "center", paddingTop: 6, paddingHorizontal: 24 }}>
            <GradientFill style={{ width: 98, height: 98, borderRadius: 49, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: tc.pageBg, overflow: "hidden" }}>
                <Avatar name={profile.name} uri={profile.avatar ? resolveApiAssetUrl(profile.avatar) : undefined} size={86} />
              </View>
            </GradientFill>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
              <Text style={[TYPE.pageTitle, { fontSize: 28, color: tc.textPrimary, textAlign: "center" }]}>{profile.name}</Text>
              {profile.verified ? <Ionicons name="checkmark-circle" size={22} color={tc.mint} accessibilityLabel="Verified" /> : null}
            </View>
            <Text style={[TYPE.small, { color: tc.textSecondary, textAlign: "center", marginTop: 2 }]}>
              {[profile.username ? `@${profile.username}` : "", [profile.city, profile.country].filter(Boolean).join(", "), profile.joinedAt ? `member since ${new Date(profile.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""].filter(Boolean).join(" · ")}
            </Text>
            {profile.bio ? <Text style={[TYPE.body, { color: tc.textSecondary, textAlign: "center", marginTop: 8 }]}>{profile.bio}</Text> : null}
            {!isOwnProfile ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                <GradientButton small label="Message" icon={<Ionicons name="chatbubble-outline" size={15} color={palette.white} />} onPress={handleMessage} />
                <SoftButton small label={following ? "Following" : "Follow"} icon={following ? <Ionicons name="checkmark" size={15} color={tc.accentText} /> : undefined} disabled={followLoading} onPress={handleFollow} />
              </View>
            ) : null}
          </Reveal>

          <Reveal i={1} style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 20 }}>
            {[
              { label: "Posts", value: profile.stats.postsCount },
              { label: "Saved", value: profile.stats.savedCount },
              { label: "Events", value: profile.stats.eventsCount },
              { label: "Neighbours", value: profile.stats.neighborsCount },
            ].map((s) => (
              <View key={s.label} style={[card, { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 18 }]}>
                <Text style={[display(800), { fontSize: 22, color: tc.textPrimary }]}>{s.value ?? 0}</Text>
                <Text style={[TYPE.small, { color: tc.textTertiary }]}>{s.label}</Text>
              </View>
            ))}
          </Reveal>

          {profile.achievements.filter((a) => a.earned).length > 0 ? (
            <>
              {h2("Badges")}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 }}>
                {profile.achievements.filter((a) => a.earned).map((a, i) => {
                  const meta = ACHIEVEMENT_ICONS[a.id] ?? { icon: "ribbon-outline", color: palette.gray500 };
                  return (
                    <TileIn key={a.id} i={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: tc.mintSoft }}>
                      <Ionicons name={meta.icon as any} size={15} color={tc.successText} />
                      <Text style={[TYPE.label, { fontSize: 13, color: tc.textPrimary }]}>{a.label}</Text>
                    </TileIn>
                  );
                })}
              </View>
            </>
          ) : null}

          {h2("Posts")}
          {posts.length > 0 ? posts.map((p, i) => (
            <Reveal key={p.id} i={i + 2} style={[card, { marginHorizontal: 16, marginBottom: 10, padding: 14 }]}>
              {p.title ? <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]} numberOfLines={1}>{p.title}</Text> : null}
              {p.content?.trim() ? <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: p.title ? 4 : 0 }]} numberOfLines={3}>{p.content}</Text> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="heart-outline" size={14} color={tc.textTertiary} /><Text style={[TYPE.small, { color: tc.textTertiary }]}>{p.likesCount ?? 0}</Text></View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="chatbubble-outline" size={14} color={tc.textTertiary} /><Text style={[TYPE.small, { color: tc.textTertiary }]}>{p.commentsCount ?? 0}</Text></View>
                <Text style={[TYPE.small, { color: tc.textTertiary, marginLeft: "auto" }]}>{new Date(p.createdAt).toLocaleDateString()}</Text>
              </View>
            </Reveal>
          )) : (
            <Text style={[TYPE.small, { color: tc.textTertiary, marginHorizontal: 18 }]}>{postsFailed ? "Posts are unavailable right now. Come back later." : "No public posts yet."}</Text>
          )}
        </>
      ) : null}
    </DPage>
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
    borderWidth: 2, borderColor: palette.white,
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
