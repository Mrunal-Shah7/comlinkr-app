import { palette } from "../../../theme/palette";
import { memo } from "react";
import { View, Text, Pressable, Share, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { TYPE, body, display } from "../../../theme/d";
import { BentoTile, GradientButton, GradientFill, SoftButton, TileLabel } from "../../../shared/d";
import type { ApiChallenge } from "../../../api/challenges.api";

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PHOTO: "camera-outline", FITNESS: "barbell-outline", FOOD: "restaurant-outline", EXPLORE: "compass-outline",
  SOCIAL: "people-outline", CREATIVE: "color-palette-outline", GREEN: "leaf-outline", TRIVIA: "help-circle-outline",
};

/** A quest in Explore → Quests, as a bento tile (design D, plan 01). Missing parts are hidden (B6). */
export const QuestCard = memo(function QuestCard({
  quest,
  isJoined,
  onJoin,
  onOpen,
}: {
  quest: ApiChallenge;
  isJoined: boolean;
  city: string;
  /** Called only while not joined yet; the screen handles auth + the API call. Must be stable. */
  onJoin: (quest: ApiChallenge) => void;
  /** Opens the quest's own page (plan 10). Must be stable. */
  onOpen?: (quest: ApiChallenge) => void;
}) {
  const { tc } = useTheme();
  const endsAt = quest.endsAt ? new Date(quest.endsAt) : null;
  const timeLeft = endsAt ? (() => {
    const diff = endsAt.getTime() - Date.now();
    if (diff <= 0) return "ENDED";
    // Round up: a one-week quest created a minute ago has 7 days left, not 6.
    if (diff >= 86400000) return `${Math.ceil(diff / 86400000)}D LEFT`;
    return `${Math.ceil(diff / 3600000)}H LEFT`;
  })() : null;
  const participants = quest.participantCount ?? 0;
  const done = quest.completedCount ?? 0; // plan 17
  const maxP = quest.maxParticipants ?? 0;
  const pct = maxP > 0 ? Math.min(100, Math.round((participants / maxP) * 100)) : 0;
  const share = () => void Share.share({ message: `${quest.title}${quest.details ? ` — ${quest.details}` : ""}\n\nJoin this quest on ComLinkr!` });

  return (
    <BentoTile style={{ minHeight: 0 }} onPress={onOpen ? () => onOpen(quest) : undefined} accessibilityLabel={`Quest: ${quest.title}`}>
      <View style={s.head}>
        <GradientFill style={s.icon}><Ionicons name={TYPE_ICON[quest.type] ?? "trophy-outline"} size={20} color={palette.white} /></GradientFill>
        <View style={{ flex: 1 }}>
          <TileLabel>{[quest.type, timeLeft].filter(Boolean).join(" · ")}</TileLabel>
          <Text style={[display(700), { fontSize: 17, lineHeight: 20, color: tc.textPrimary, marginTop: 2 }]} numberOfLines={2}>{quest.title}</Text>
        </View>
        <Pressable onPress={() => { void Haptics.selectionAsync(); share(); }} hitSlop={8} style={s.share} accessibilityRole="button" accessibilityLabel="Share quest">
          <Ionicons name="share-social-outline" size={19} color={tc.textSecondary} />
        </Pressable>
      </View>

      {quest.details ? <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 10 }]} numberOfLines={3}>{quest.details}</Text> : null}

      {quest.goalCondition || quest.reward ? (
        <View style={{ gap: 6, marginTop: 10 }}>
          {quest.goalCondition ? (
            <View style={s.row}><Ionicons name="flag-outline" size={15} color={tc.accentText} /><Text style={[body(600), s.rowText, { color: tc.textPrimary }]} numberOfLines={2}>{quest.goalCondition}</Text></View>
          ) : null}
          {quest.reward ? (
            <View style={s.row}><Ionicons name="trophy-outline" size={15} color={tc.mint} /><Text style={[body(600), s.rowText, { color: tc.textPrimary }]} numberOfLines={2}>{quest.reward}</Text></View>
          ) : null}
        </View>
      ) : null}

      {participants > 0 ? (
        <View style={{ marginTop: 12 }}>
          <Text style={[TYPE.small, { color: tc.textSecondary, marginBottom: 6 }]}>{(maxP > 0 ? `${participants} of ${maxP} joined` : `${participants} joined`) + (done > 0 ? ` · ${done} done` : "")}</Text>
          {maxP > 0 ? (
            <View style={[s.track, { backgroundColor: tc.surface3 }]}><GradientFill style={[s.fill, { width: `${pct}%` }]} /></View>
          ) : null}
        </View>
      ) : null}

      {quest.hashtags?.length ? (
        <Text style={[TYPE.small, { color: tc.accentText, marginTop: 10 }]} numberOfLines={1}>{quest.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join("  ")}</Text>
      ) : null}

      <View style={{ marginTop: 12 }}>
        {isJoined
          ? <SoftButton small label={quest.isCompleted ? "Done" : "Joined"} icon={<Ionicons name={quest.isCompleted ? "trophy" : "checkmark-circle"} size={16} color={tc.accentText} />} />
          : <GradientButton small label="Join" onPress={() => onJoin(quest)} />}
      </View>
    </BentoTile>
  );
});

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  share: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { fontSize: 13.5, flex: 1 },
  track: { height: 6, borderRadius: 9, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 9 },
});
