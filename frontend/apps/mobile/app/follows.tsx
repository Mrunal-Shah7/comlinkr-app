// Plan 14 (TR-029): your followers and the people you follow. Opened from the counts line on your own profile.
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { getMyFollowers, getMyFollowing, toggleFollow, type Follower } from "../src/api/profile.api";
import { resolveApiAssetUrl } from "../src/api/feed.api";
import { ApiError } from "../src/api/client";
import { DPage } from "../src/shared/d/Page";
import { EmptyState, Segmented, SoftButton } from "../src/shared/d";
import { appAlert } from "../src/shared/ui/Dialogs";
import { useTheme } from "../src/theme/useTheme";
import { TYPE } from "../src/theme/d";
import { queryKeys } from "../src/services/cache/queryKeys";
import { useInfiniteScreenQuery } from "../src/hooks/useInfiniteScreenQuery";
import { UserAvatar } from "../components/UserAvatar";

type Kind = "followers" | "following";
const PAGE = 20;

export default function FollowsScreen() {
  const { tc } = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [kind, setKind] = useState<Kind>(params.tab === "following" ? "following" : "followers");
  const [busy, setBusy] = useState<string | null>(null);

  const q = useInfiniteScreenQuery<Follower>({
    queryKey: queryKeys.follows(kind),
    getId: (f) => f.id,
    fetchPage: async (page) => {
      const res = await (kind === "followers" ? getMyFollowers : getMyFollowing)({ page, pageSize: PAGE });
      return { items: res.data, hasMore: res.hasMore };
    },
  });

  const followBack = async (f: Follower) => {
    if (busy) return;
    setBusy(f.id);
    try {
      const res = await toggleFollow(f.id);
      q.setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, followedByMe: res.following } : x)));
      void qc.invalidateQueries({ queryKey: queryKeys.follows("following") });
      void qc.invalidateQueries({ queryKey: queryKeys.publicProfile(f.id) });
    } catch (e) {
      appAlert("Could not follow", e instanceof ApiError ? e.message : "Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <DPage
      title="Follows"
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.onRefresh} tintColor={tc.accent} />}
    >
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Segmented
          items={[{ key: "followers", label: "Followers" }, { key: "following", label: "Following" }]}
          value={kind}
          onChange={(k) => setKind(k as Kind)}
        />
      </View>

      {q.loading ? (
        <ActivityIndicator color={tc.accent} style={{ marginTop: 48 }} />
      ) : q.error ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load" sub="Check your connection and try again." actionLabel="Try again" onAction={() => void q.refetch()} />
      ) : q.items.length === 0 ? (
        kind === "followers"
          ? <EmptyState icon="people-outline" title="No followers yet" sub="When someone follows you, they show here." />
          : <EmptyState icon="person-add-outline" title="Not following anyone" sub="Follow people from their profile to find them again here." />
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {q.items.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => router.push({ pathname: "/public-profile", params: { userId: f.id } } as never)}
              accessibilityRole="button"
              accessibilityLabel={f.name}
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }, pressed && { opacity: 0.7 }]}
            >
              <UserAvatar name={f.name || f.username} uri={f.avatar ? resolveApiAssetUrl(f.avatar) : undefined} size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{f.name || f.username}</Text>
                <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>
                  {[f.username ? `@${f.username}` : "", f.city ?? ""].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {kind === "followers" && !f.followedByMe ? (
                <SoftButton small label="Follow back" disabled={busy === f.id} onPress={() => void followBack(f)} />
              ) : null}
            </Pressable>
          ))}
          {q.hasMore ? (
            <Pressable onPress={q.loadMore} disabled={q.loadingMore} accessibilityRole="button" accessibilityLabel="Load more"
              style={{ minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: tc.glassLine }}>
              {q.loadingMore ? <ActivityIndicator size="small" color={tc.accent} /> : <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>Load more</Text>}
            </Pressable>
          ) : null}
        </View>
      )}
    </DPage>
  );
}
