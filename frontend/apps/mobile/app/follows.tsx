// Plan 14 (TR-029): your followers and the people you follow. Opened from the counts line on your own profile.
// Plan 16 (TR-051): and the requests to follow you (a private account), with Accept and Decline. The Requests tab
// shows while there are requests, or when a "Follow request" notification opened the screen.
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptFollowRequest,
  declineFollowRequest,
  getMyFollowers,
  getMyFollowing,
  getMyFollowRequests,
  toggleFollow,
  type Follower,
} from "../src/api/profile.api";
import { resolveApiAssetUrl } from "../src/api/feed.api";
import { ApiError } from "../src/api/client";
import { DPage } from "../src/shared/d/Page";
import { EmptyState, GradientButton, Segmented, SoftButton } from "../src/shared/d";
import { appAlert } from "../src/shared/ui/Dialogs";
import { showToast } from "../src/shared/ui/Toast";
import { useTheme } from "../src/theme/useTheme";
import { TYPE } from "../src/theme/d";
import { queryKeys } from "../src/services/cache/queryKeys";
import { useInfiniteScreenQuery } from "../src/hooks/useInfiniteScreenQuery";
import { UserAvatar } from "../components/UserAvatar";

type Kind = "followers" | "following" | "requests";
const PAGE = 20;
const FETCH: Record<Kind, typeof getMyFollowers> = {
  followers: getMyFollowers,
  following: getMyFollowing,
  requests: getMyFollowRequests,
};

export default function FollowsScreen() {
  const { tc } = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [kind, setKind] = useState<Kind>(
    params.tab === "following" ? "following" : params.tab === "requests" ? "requests" : "followers",
  );
  const [busy, setBusy] = useState<string | null>(null);

  // Plan 16: how many requests wait (one row is enough to know; the server sends the total).
  const requestsCount = useQuery({
    queryKey: [...queryKeys.follows("requests"), "count"],
    queryFn: async () => (await getMyFollowRequests({ page: 1, pageSize: 1 })).total,
  });
  const waiting = requestsCount.data ?? 0;
  const showRequests = waiting > 0 || kind === "requests";

  const q = useInfiniteScreenQuery<Follower>({
    queryKey: queryKeys.follows(kind),
    getId: (f) => f.id,
    fetchPage: async (page) => {
      const res = await FETCH[kind]({ page, pageSize: PAGE });
      return { items: res.data, hasMore: res.hasMore };
    },
  });

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ["me", "follows"] });
    void qc.invalidateQueries({ queryKey: ["me"] });
  };

  const followBack = async (f: Follower) => {
    if (busy) return;
    setBusy(f.id);
    try {
      const res = await toggleFollow(f.id);
      // A private account gets a request: the button goes either way.
      q.setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, followedByMe: res.following || !!res.requested } : x)));
      if (res.requested) showToast("Request sent.", "info");
      void qc.invalidateQueries({ queryKey: queryKeys.follows("following") });
      void qc.invalidateQueries({ queryKey: queryKeys.publicProfile(f.id) });
    } catch (e) {
      appAlert("Could not follow", e instanceof ApiError ? e.message : "Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const answer = async (f: Follower, accept: boolean) => {
    if (busy) return;
    setBusy(f.id);
    try {
      if (accept) await acceptFollowRequest(f.id);
      else await declineFollowRequest(f.id);
      q.setItems((prev) => prev.filter((x) => x.id !== f.id));
      showToast(accept ? `${f.name || f.username} now follows you.` : "Request declined.", accept ? "success" : "info");
      refreshAll();
    } catch (e) {
      appAlert(accept ? "Could not accept" : "Could not decline", e instanceof ApiError ? e.message : "Try again in a moment.");
      void q.refetch();
    } finally {
      setBusy(null);
    }
  };

  const tabs = [
    { key: "followers", label: "Followers" },
    { key: "following", label: "Following" },
    ...(showRequests ? [{ key: "requests", label: waiting > 0 ? `Requests · ${waiting}` : "Requests" }] : []),
  ];

  return (
    <DPage
      title="Follows"
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={() => { void requestsCount.refetch(); q.onRefresh(); }} tintColor={tc.accent} />}
    >
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Segmented items={tabs} value={kind} onChange={(k) => setKind(k as Kind)} />
      </View>

      {q.loading ? (
        <ActivityIndicator color={tc.accent} style={{ marginTop: 48 }} />
      ) : q.error ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load" sub="Check your connection and try again." actionLabel="Try again" onAction={() => void q.refetch()} />
      ) : q.items.length === 0 ? (
        kind === "followers"
          ? <EmptyState icon="people-outline" title="No followers yet" sub="When someone follows you, they show here." />
          : kind === "following"
            ? <EmptyState icon="person-add-outline" title="Not following anyone" sub="Follow people from their profile to find them again here." />
            : <EmptyState icon="checkmark-done-outline" title="No requests" sub="When your profile is private, people who ask to follow you wait here." />
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
              {kind === "requests" ? (
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <GradientButton small label="Accept" disabled={busy === f.id} onPress={() => void answer(f, true)} />
                  <SoftButton small ghost label="Decline" disabled={busy === f.id} onPress={() => void answer(f, false)} />
                </View>
              ) : kind === "followers" && !f.followedByMe ? (
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
