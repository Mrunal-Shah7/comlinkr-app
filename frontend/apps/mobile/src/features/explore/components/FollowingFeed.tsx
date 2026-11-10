// Plan 16 (TR-050): Explore's Following tab. What the people you follow posted, newest first, from any city: news
// posts, events, stories and quests. Each row says who posted it and opens the item.
import { memo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getFollowingFeed, resolveApiAssetUrl, type FollowingItem } from "../../../api/feed.api";
import { useInfiniteScreenQuery } from "../../../hooks/useInfiniteScreenQuery";
import { EmptyState, Tag } from "../../../shared/d";
import { FadeImage } from "../../../../components/FadeImage";
import { useTheme } from "../../../theme/useTheme";
import { TYPE } from "../../../theme/d";
import { eventDayDate } from "../../../utils/eventDay";
import { UserAvatar } from "../../../../components/UserAvatar";

export const FOLLOWING_FEED_KEY = ["feed", "following"] as const;

const KIND: Record<FollowingItem["type"], { label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  NEWS: { label: "Post", icon: "newspaper-outline" },
  EVENT: { label: "Event", icon: "calendar-outline" },
  STORY: { label: "Story", icon: "camera-outline" },
  CHALLENGE: { label: "Quest", icon: "trophy-outline" },
};

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A second line that says what the item is about, from its own data (rule B6: nothing when there is no data). */
function detail(item: FollowingItem): string {
  const m = item.metadata ?? {};
  if (item.type === "EVENT") {
    const d = typeof m.date === "string" ? eventDayDate(m.date) : null;
    return [d ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "", typeof m.venue === "string" ? m.venue : "", typeof m.city === "string" ? m.city : ""].filter(Boolean).join(" · ");
  }
  if (item.type === "CHALLENGE") {
    const n = Number(m.participantCount);
    return Number.isFinite(n) && n > 0 ? `${n} joined` : "";
  }
  return "";
}

function open(item: FollowingItem, onOpenPost: (id: string) => void) {
  if (item.type === "NEWS") onOpenPost(item.id);
  else if (item.type === "EVENT") router.push(`/events/${encodeURIComponent(item.id)}` as never);
  else if (item.type === "STORY") router.push({ pathname: "/story-viewer", params: { storyId: item.id } } as never);
  else router.push(`/quest/${encodeURIComponent(item.id)}` as never);
}

const Row = memo(function Row({ item, onOpenPost }: { item: FollowingItem; onOpenPost: (id: string) => void }) {
  const { tc } = useTheme();
  const kind = KIND[item.type];
  const sub = detail(item);
  return (
    <Pressable
      onPress={() => open(item, onOpenPost)}
      accessibilityRole="button"
      accessibilityLabel={`${kind.label} by ${item.author.name}: ${item.title}`}
      style={({ pressed }) => [{ flexDirection: "row", gap: 12, padding: 12, borderRadius: 20, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }, pressed && { opacity: 0.75 }]}
    >
      <UserAvatar name={item.author.name || item.author.username} uri={item.author.avatar ? resolveApiAssetUrl(item.author.avatar) : undefined} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>
          <Text style={{ color: tc.textPrimary, fontFamily: "Manrope_700Bold" }}>{item.author.name || item.author.username}</Text>
          {`  ·  ${ago(item.createdAt)}`}
        </Text>
        <Text style={[TYPE.cardTitle, { color: tc.textPrimary, marginTop: 4 }]} numberOfLines={2}>{item.title}</Text>
        {sub ? <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 2 }]} numberOfLines={1}>{sub}</Text> : null}
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <Tag label={kind.label} icon={kind.icon} />
        </View>
      </View>
      {item.image ? <FadeImage uri={resolveApiAssetUrl(item.image)} style={{ width: 72, height: 72, borderRadius: 14 }} /> : null}
    </Pressable>
  );
});

export function FollowingFeed({ signedIn, onSignIn, onOpenPost }: { signedIn: boolean; onSignIn: () => void; onOpenPost: (id: string) => void }) {
  const { tc } = useTheme();
  const q = useInfiniteScreenQuery<FollowingItem>({
    queryKey: [...FOLLOWING_FEED_KEY],
    getId: (i) => `${i.type}-${i.id}`,
    enabled: signedIn,
    fetchPage: (page) => getFollowingFeed(page, 20),
  });

  if (!signedIn) {
    return <EmptyState icon="people-outline" title="See what people you follow post" sub="Sign in, then follow people from their profile." actionLabel="Sign in" onAction={onSignIn} />;
  }
  if (q.loading) return <ActivityIndicator color={tc.accent} style={{ marginTop: 40 }} />;
  if (q.error) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load" sub="Check your connection and try again." actionLabel="Try again" onAction={() => void q.refetch()} />;
  }
  if (q.items.length === 0) {
    return <EmptyState icon="person-add-outline" title="Nothing here yet" sub="Follow people from their profile, and their posts, events, stories and quests show here." />;
  }
  return (
    <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 16 }}>
      {q.items.map((item) => <Row key={`${item.type}-${item.id}`} item={item} onOpenPost={onOpenPost} />)}
      {q.hasMore ? (
        <Pressable onPress={q.loadMore} disabled={q.loadingMore} accessibilityRole="button" accessibilityLabel="Load more"
          style={{ minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: tc.glassLine }}>
          {q.loadingMore ? <ActivityIndicator size="small" color={tc.accent} /> : <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>Load more</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}
