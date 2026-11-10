// A quest's own page (plan 10, TR-038). Opened from a quest card in Explore › Quests and from links
// (comlinkr://quest/:id, /app/feed?openQuest=<id>). Join, leave, share; the host sees that they started it.
import { Fragment } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getChallenge, joinChallenge, leaveChallenge, type ApiChallengeDetail } from "../../src/api/challenges.api";
import { ApiError } from "../../src/api/client";
import { DPage } from "../../src/shared/d/Page";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientButton, PersonAvatar, Reveal, SoftButton, TileLabel } from "../../src/shared/d";
import { FadeImage } from "../../components/FadeImage";
import { appAlert } from "../../src/shared/ui/Dialogs";
import { showToast } from "../../src/shared/ui/Toast";
import { useRequireAuth } from "../../src/shared/hooks/useRequireAuth";
import { useAuthStore } from "../../src/store/auth.store";
import { useTheme } from "../../src/theme/useTheme";
import { TYPE } from "../../src/theme/d";
import { closeDetail, useIdParam } from "../../src/hooks/useDetailRoute";
import { getShareLink } from "../../src/utils/shareLinks";

const TYPE_LABEL: Record<string, string> = {
  PHOTO: "Photo", FITNESS: "Fitness", FOOD: "Food", EXPLORE: "Explore",
  SOCIAL: "Social", CREATIVE: "Creative", GREEN: "Green", TRIVIA: "Trivia",
};

function timeLeft(endsAt: string | undefined, status: string): string | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (status !== "ACTIVE" || diff <= 0) return "Ended";
  // Round up, as on the card: a week-long quest created a minute ago has 7 days left.
  if (diff >= 86400000) { const d = Math.ceil(diff / 86400000); return `${d} day${d === 1 ? "" : "s"} left`; }
  const h = Math.ceil(diff / 3600000);
  return `${h} hour${h === 1 ? "" : "s"} left`;
}

export default function QuestDetailScreen() {
  const id = useIdParam();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { requireAuth } = useRequireAuth();
  const { tc } = useTheme();
  const insets = useSafeAreaInsets();
  const key = ["quest", id, userId ?? ""];

  const q = useQuery<ApiChallengeDetail>({ queryKey: key, queryFn: () => getChallenge(id), enabled: !!id, staleTime: 0 });
  // Explore reads its quests through the ["feed", "quests", …] cache; mark it stale so it refetches on return.
  const refreshLists = () => void qc.invalidateQueries({ queryKey: ["feed", "quests"] });

  const quest = q.data;
  if (!quest) {
    return (
      <DPage title="Quest" largeTitle={false} onBack={closeDetail}>
        <View style={{ alignItems: "center", paddingTop: 80, gap: 14 }}>
          {q.isError || !id ? (
            <>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, fontSize: 17 }]}>Quest not found</Text>
              <Pressable onPress={closeDetail} accessibilityRole="button" hitSlop={8}>
                <Text style={[TYPE.bodyStrong, { color: tc.accentText, fontSize: 16 }]}>Go back</Text>
              </Pressable>
            </>
          ) : <ActivityIndicator color={tc.accentText} />}
        </View>
      </DPage>
    );
  }

  const isHost = !!userId && quest.author?.id === userId;
  const ended = timeLeft(quest.endsAt, quest.status) === "Ended";
  const count = quest.totalParticipants ?? quest.participantCount ?? 0;
  const max = quest.maxParticipants ?? 0;
  const left = timeLeft(quest.endsAt, quest.status);

  const join = async () => {
    if (!requireAuth(undefined, "Sign in to join this quest.")) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await joinChallenge(quest.id);
      await q.refetch();
      refreshLists();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not join the quest. Please try again.", "error");
    }
  };

  const leave = () => {
    appAlert("Leave this quest?", "You can join again while it is running.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveChallenge(quest.id);
            await q.refetch();
            refreshLists();
            showToast("You left the quest.");
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : "Could not leave the quest. Please try again.", "error");
          }
        },
      },
    ]);
  };

  const share = () => void Share.share({
    message: `${quest.title}${quest.details ? ` — ${quest.details}` : ""}\n\nJoin this quest on ComLinkr: ${getShareLink("quest", quest.id)}`,
  });

  const facts: [string, string][] = [];
  if (quest.goalCondition) facts.push(["Goal", quest.goalCondition]);
  if (quest.reward) facts.push(["Reward", quest.reward]);
  if (left) facts.push(["Time", left]);
  if (quest.location) facts.push(["Where", quest.location]);

  return (
    <DPage
      title={quest.title}
      onBack={closeDetail}
      right={
        <Pressable onPress={share} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share quest" style={s.iconBtn}>
          <Ionicons name="share-social-outline" size={21} color={tc.textPrimary} />
        </Pressable>
      }
      footer={
        <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 12 }}>
          {isHost ? (
            <SoftButton block label="You started this quest" icon={<Ionicons name="trophy-outline" size={16} color={tc.accentText} />} />
          ) : ended ? (
            <SoftButton block label="This quest has ended" disabled />
          ) : quest.isJoined ? (
            <SoftButton block label="Leave quest" onPress={leave} icon={<Ionicons name="exit-outline" size={16} color={tc.textPrimary} />} />
          ) : quest.isFull ? (
            <SoftButton block label="This quest is full" disabled />
          ) : (
            <GradientButton block label="Join quest" onPress={() => void join()} />
          )}
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
      <Reveal i={0}>
        <TileLabel>{[TYPE_LABEL[quest.type] ?? quest.type, quest.isJoined && !isHost ? "Joined" : null].filter(Boolean).join(" · ").toUpperCase()}</TileLabel>
        {quest.author ? (
          <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 6 }]}>
            Started by <Text style={{ color: tc.textPrimary, fontFamily: "Manrope_700Bold" }}>{isHost ? "you" : quest.author.name}</Text>
          </Text>
        ) : null}
        {quest.details ? <Text style={[TYPE.body, { color: tc.textPrimary, marginTop: 12 }]}>{quest.details}</Text> : null}
      </Reveal>

      {facts.length > 0 ? (
        <Reveal i={1} style={[s.card, { borderColor: tc.glassLine, backgroundColor: tc.cardBg }]}>
          {facts.map(([k, v], i) => (
            <View key={k} style={[s.fact, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.glassLine }]}>
              <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
            </View>
          ))}
        </Reveal>
      ) : null}

      {quest.hashtags?.length ? (
        <Text style={[TYPE.small, { color: tc.accentText, marginTop: 14 }]}>
          {quest.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join("  ")}
        </Text>
      ) : null}

      <Reveal i={2} style={{ marginTop: 22 }}>
        <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, fontSize: 16 }]}>
          {max > 0 ? `${count} of ${max} joined` : `${count} joined`}
        </Text>
        <View style={{ marginTop: 10, gap: 10 }}>
          {quest.participants.map((p) => (
            <Fragment key={p.id}>
              <View style={s.person}>
                {p.avatarUrl
                  ? <FadeImage uri={p.avatarUrl} style={{ width: 36, height: 36, borderRadius: 18 }} fallbackIcon="person" />
                  : <PersonAvatar name={p.name || p.username} size={36} />}
                <Text style={[TYPE.body, { color: tc.textPrimary, flex: 1 }]} numberOfLines={1}>
                  {p.id === userId ? "You" : p.name || p.username}
                </Text>
                {p.id === quest.author?.id ? <Text style={[TYPE.small, { color: tc.textTertiary }]}>Started it</Text> : null}
              </View>
            </Fragment>
          ))}
          {count > quest.participants.length ? (
            <Text style={[TYPE.small, { color: tc.textSecondary }]}>and {count - quest.participants.length} more</Text>
          ) : null}
        </View>
      </Reveal>
      </View>
    </DPage>
  );
}

const s = StyleSheet.create({
  iconBtn: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  card: { marginTop: 16, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14 },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 12 },
  person: { flexDirection: "row", alignItems: "center", gap: 12 },
});
