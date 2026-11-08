import type { ReactElement } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { TYPE, body, display } from "../../../theme/d";
import { GradientFill, PressableScale, SoftButton } from "../../../shared/d";
import { FadeImage } from "../../../../components/FadeImage";
import { useAuthStore } from "../../../store/auth.store";
import { formatPrice } from "../../../utils/currency";
import { appAlert } from "../../../shared/ui/Dialogs";
import { type Roommate, computeMatch, buildCurrentUserForMatch, COMMUNITY_DISPLAY, VIBE_DISPLAY } from "../roommateModel";
import { getUserCurrencyCode } from "../utils";

/** A roommate in Listings → Roommates, design D (plan 01): ringed photo, name, job and budget, up to two things
 *  you share, and the match % in green. Budget hides when it is not set (no "$0–$0", rule B6). */
export function RoommateCard({
  roommate,
  onPress,
  onConnect,
  onCancelRequest,
  onOpenConversation,
  isSaved,
  onToggleSave,
}: {
  roommate: Roommate;
  onPress: () => void;
  onConnect: () => void;
  onCancelRequest: () => void;
  onOpenConversation: (conversationId: string) => void;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const { tc, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const currencyCode = getUserCurrencyCode(user);
  const match = computeMatch(buildCurrentUserForMatch(user), roommate);
  const score = roommate.apiMatchScore ?? match.score;
  const cs = roommate.connectionStatus ?? null;
  const budget = roommate.budgetMin > 0 && roommate.budgetMax > 0 ? `${formatPrice(roommate.budgetMin, currencyCode)}–${formatPrice(roommate.budgetMax, currencyCode)}` : "";
  const shared = [
    ...match.sharedCommunities.map((c) => COMMUNITY_DISPLAY[c]?.label ?? c),
    ...match.sharedVibes.map((v) => VIBE_DISPLAY[v]?.label ?? v),
  ].slice(0, 2);

  let action: ReactElement | null = null;
  if (cs === null) action = <SoftButton small label="Connect" icon={<Ionicons name="person-add-outline" size={15} color={tc.accentText} />} onPress={onConnect} />;
  else if (cs === "pending_sent") action = (
    <SoftButton small ghost label="Cancel request" onPress={() => appAlert("Cancel request", "Cancel the connection request?", [
      { text: "Keep", style: "cancel" },
      { text: "Cancel request", style: "destructive", onPress: onCancelRequest },
    ])} />
  );
  else if (cs === "pending_received") action = <SoftButton small label="Respond" icon={<Ionicons name="mail-unread-outline" size={15} color={tc.accentText} />} onPress={onPress} />;
  else if (cs === "accepted" && roommate.conversationId) action = <SoftButton small label="Message" icon={<Ionicons name="chatbubble-ellipses-outline" size={15} color={tc.accentText} />} onPress={() => onOpenConversation(roommate.conversationId!)} />;

  return (
    <View style={[s.card, { backgroundColor: tc.cardBg, borderWidth: isDark ? 1 : 0, borderColor: tc.glassLine }]}>
      <PressableScale onPress={onPress} style={s.top} accessibilityRole="button" accessibilityLabel={`${roommate.name}, ${score}% match`}>
        <GradientFill colors={[tc.mint, tc.accent] as const} style={s.ring}>
          <View style={[s.ringIn, { borderColor: tc.cardBg }]}>
            {roommate.avatar ? <FadeImage uri={roommate.avatar} style={s.av} /> : <GradientFill style={s.av}><Text style={[body(800), { color: "#fff" }]}>{roommate.initials}</Text></GradientFill>}
          </View>
        </GradientFill>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[display(700), { fontSize: 17, color: tc.textPrimary }]} numberOfLines={1}>{roommate.name}{roommate.age > 0 ? `, ${roommate.age}` : ""}</Text>
          <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>{[roommate.occupation, budget].filter(Boolean).join(" · ")}</Text>
          {shared.length ? (
            <View style={s.tags}>
              {shared.map((t) => <View key={t} style={[s.tag, { backgroundColor: tc.mintSoft }]}><Text style={[body(700), { fontSize: 11.5, color: tc.successText }]} numberOfLines={1}>{t}</Text></View>)}
            </View>
          ) : null}
        </View>
        <Text style={[display(800), { fontSize: 26, color: tc.mint }]}>{score}%</Text>
      </PressableScale>
      <View style={s.foot}>
        {cs === "pending_sent" ? <View style={[s.state, { backgroundColor: tc.warningBg }]}><Text style={[body(700), { fontSize: 12, color: tc.warningText }]}>Pending</Text></View> : null}
        {cs === "accepted" ? <View style={[s.state, { backgroundColor: tc.mintSoft }]}><Text style={[body(700), { fontSize: 12, color: tc.successText }]}>Connected</Text></View> : null}
        <View style={{ flex: 1 }} />
        <Pressable onPress={onToggleSave} hitSlop={8} style={s.save} accessibilityRole="button" accessibilityLabel={isSaved ? "Remove from saved" : "Save"} accessibilityState={{ selected: isSaved }}>
          <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={19} color={isSaved ? tc.accentText : tc.textSecondary} />
        </Pressable>
        {action}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 24, padding: 14, shadowColor: "#0F283C", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  ring: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  ringIn: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  av: { width: 51, height: 51, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  tags: { flexDirection: "row", gap: 4, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, maxWidth: 140 },
  foot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  state: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  save: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
