import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { TYPE } from "../../../theme/d";
import { GradientButton, GradientFill, Reveal, SoftButton } from "../../../shared/d";
import { MatchRing } from "../../../shared/d/MatchRing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { FadeImage } from "../../../../components/FadeImage";
import { useAuthStore } from "../../../store/auth.store";
import { formatPrice } from "../../../utils/currency";
import { LinkifiedText } from "../../../../components/LinkifiedText";
import { appAlert } from "../../../shared/ui/Dialogs";
import { rm } from "../styles/roommate.styles";
import { type Roommate, buildCurrentUserForMatch, computeMatch, COMMUNITY_DISPLAY, VIBE_DISPLAY, INTEREST_DISPLAY } from "../roommateModel";
import { getUserCurrencyCode } from "../utils";

// ── Shared tag pill ──────────────────────────────────────────────────────────
export function SharedTagPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={rm.sharedTagPill}>
      <Ionicons name={icon as any} size={12} color={Colors.brand.green} />
      <Text style={rm.sharedTagText}>{label}</Text>
    </View>
  );
}

// ── Preference row for detail modal ──────────────────────────────────────────
export function PrefRow({
  icon,
  label,
  value,
  match,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  match: boolean;
}) {
  const { isDark, tc } = useTheme();
  return (
    <View style={rm.prefRow}>
      <View style={[rm.prefIconBox, match && { backgroundColor: "#DCFCE7" }, !match && isDark && { backgroundColor: tc.inputBg }]}>
        <Ionicons name={icon} size={14} color={match ? Colors.brand.green : tc.textTertiary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rm.prefLabel, { color: tc.textTertiary }]}>{label}</Text>
        <Text style={[rm.prefValue, { color: tc.textPrimary }]}>{value}</Text>
      </View>
      {match && <Ionicons name="checkmark-circle" size={16} color={Colors.brand.green} />}
    </View>
  );
}

// ── Roommate detail modal ────────────────────────────────────────────────────
/** The body of the /roommate/[id] route (plan 03). */
export function RoommateDetail({
  roommate,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onConnect,
  onAccept,
  onDecline,
  onCancelRequest,
}: {
  roommate: Roommate | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onConnect?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancelRequest?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const currencyCode = getUserCurrencyCode(user);
  if (!roommate) return null;

  const cu = buildCurrentUserForMatch(user);
  const match = computeMatch(cu, roommate);
  const displayScore = roommate.apiMatchScore ?? match.score;
  const scoreColor =
    displayScore >= 80 ? Colors.brand.green : displayScore >= 60 ? Colors.brand.blue : Colors.brand.orange;
  const cs = roommate.connectionStatus ?? null;

  const shared = [
    ...match.sharedCommunities.map((c) => COMMUNITY_DISPLAY[c]?.label).filter(Boolean),
    ...match.sharedVibes.map((v) => VIBE_DISPLAY[v]?.label).filter(Boolean),
    ...match.sharedInterests.map((i) => INTEREST_DISPLAY[i]?.label).filter(Boolean),
  ] as string[];
  const lookingFor = ([
    ["Budget", roommate.budgetMin > 0 && roommate.budgetMax > 0 ? `${formatPrice(roommate.budgetMin, currencyCode)}–${formatPrice(roommate.budgetMax, currencyCode)} /mo` : ""],
    ["Move-in", roommate.moveInDate && !/not set/i.test(roommate.moveInDate) ? roommate.moveInDate : ""],
    ["Area", roommate.location],
  ] as [string, string][]).filter(([, v]) => !!v);
  const lifestyle: [string, string, boolean][] = [
    ["Cleanliness", roommate.cleanliness, cu.cleanliness === roommate.cleanliness],
    ["Sleep", roommate.sleepSchedule, cu.sleepSchedule === roommate.sleepSchedule],
    ["Noise", roommate.noiseLevel, cu.noiseLevel === roommate.noiseLevel],
    ["Guests", roommate.guestPolicy, cu.guestPolicy === roommate.guestPolicy],
    ["Smoking", roommate.smoking, cu.smoking === roommate.smoking],
    ["Pets", roommate.pets, cu.pets === roommate.pets || roommate.pets === "Pet Friendly" || cu.pets === "Pet Friendly"],
    ["Works from home", roommate.workFromHome ? "Yes" : "No", cu.workFromHome === roommate.workFromHome],
  ];
  const section = (t: string) => <Text style={[TYPE.section, { color: tc.textPrimary, marginTop: 22, marginBottom: 10 }]}>{t}</Text>;
  const openChat = () => {
    if (roommate.conversationId?.trim()) {
      router.push({ pathname: "/chat", params: { conversationId: roommate.conversationId, returnTo: "housing" } } as any);
    } else {
      router.push({ pathname: "/chat", params: { recipientId: roommate.id, recipientName: roommate.name, recipientType: "roommate", returnTo: "housing" } } as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: insets.top + 8, paddingHorizontal: 10, paddingBottom: 4 }}>
            <Pressable onPress={onClose} hitSlop={6} style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={22} color={tc.textPrimary} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={onToggleBookmark} hitSlop={6} style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }} accessibilityLabel={isBookmarked ? "Remove from saved" : "Save profile"}>
              <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={21} color={isBookmarked ? tc.accentText : tc.textPrimary} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {/* ── Profile head (design D, plan 01) ── */}
          <Reveal i={0} style={{ alignItems: "center", paddingTop: 4 }}>
            <GradientFill colors={[tc.mint, tc.accent] as const} style={{ width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: tc.pageBg, overflow: "hidden" }}>
                <FadeImage uri={roommate.avatar} style={{ width: "100%", height: "100%" }} />
              </View>
            </GradientFill>
            <Text style={[TYPE.pageTitle, { fontSize: 25, color: tc.textPrimary, marginTop: 10, textAlign: "center" }]}>{roommate.name}{roommate.age > 0 ? `, ${roommate.age}` : ""}</Text>
            <Text style={[TYPE.small, { color: tc.textSecondary, textAlign: "center" }]}>{[roommate.occupation, roommate.location].filter(Boolean).join(" · ")}</Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
              {roommate.verified ? <View style={[rd.tag, { backgroundColor: tc.mintSoft }]}><Text style={[TYPE.label, { color: tc.successText }]}>Verified</Text></View> : null}
              {cs === "pending_sent" ? <View style={[rd.tag, { backgroundColor: tc.warningBg }]}><Text style={[TYPE.label, { color: tc.warningText }]}>Request sent</Text></View> : null}
              {cs === "accepted" ? <View style={[rd.tag, { backgroundColor: tc.mintSoft }]}><Text style={[TYPE.label, { color: tc.successText }]}>Connected</Text></View> : null}
            </View>
          </Reveal>

          <Reveal i={1} style={[rd.card, { backgroundColor: tc.cardBg, borderColor: tc.glassLine, marginTop: 16 }]}>
            <MatchRing score={displayScore} />
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{displayScore >= 70 ? "Strong match" : displayScore >= 45 ? "Good match" : "Some things in common"}</Text>
              <Text style={[TYPE.small, { color: tc.textSecondary }]}>{shared.length ? `You share ${shared.length} ${shared.length === 1 ? "thing" : "things"}.` : "Based on your preferences."}</Text>
            </View>
          </Reveal>

          {shared.length ? (
            <Reveal i={2}>
              {section("What you have in common")}
              <View style={rd.wrap}>{shared.map((t) => <View key={t} style={[rd.chip, { backgroundColor: tc.mint }]}><Text style={[TYPE.label, { color: "#fff", fontSize: 13 }]}>{t}</Text></View>)}</View>
            </Reveal>
          ) : null}

          {roommate.bio ? (
            <Reveal i={3}>
              {section("About")}
              <LinkifiedText text={roommate.bio} style={[TYPE.body, { color: tc.textSecondary }]} />
            </Reveal>
          ) : null}

          {lookingFor.length ? (
            <Reveal i={4}>
              {section("Looking for")}
              <View style={[rd.dl, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
                {lookingFor.map(([k, v], i) => (
                  <View key={k} style={[rd.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
                    <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
                    <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
                  </View>
                ))}
              </View>
            </Reveal>
          ) : null}

          {roommate.vibes.some((v) => !!VIBE_DISPLAY[v]) ? (
            <Reveal i={5}>
              {section("Their vibes")}
              <View style={rd.wrap}>
                {roommate.vibes.map((v) => {
                  const d = VIBE_DISPLAY[v];
                  if (!d) return null;
                  const on = match.sharedVibes.includes(v);
                  return <View key={v} style={[rd.chip, { backgroundColor: on ? tc.mintSoft : tc.cardBg, borderWidth: 1, borderColor: on ? tc.mint : tc.borderMedium }]}><Text style={[TYPE.label, { fontSize: 13, color: on ? tc.successText : tc.textPrimary }]}>{d.label}</Text></View>;
                })}
              </View>
            </Reveal>
          ) : null}

          <Reveal i={6}>
            {section("Lifestyle")}
            <View style={[rd.dl, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
              {lifestyle.map(([k, v, same], i) => (
                <View key={k} style={[rd.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
                  <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{v}</Text>
                    {same ? <Ionicons name="checkmark-circle" size={16} color={tc.mint} /> : null}
                  </View>
                </View>
              ))}
            </View>
          </Reveal>
        </ScrollView>

        {/* ── Glass bar: the next step for this connection ── */}
        <View style={[rd.bar, { paddingBottom: insets.bottom + 12, backgroundColor: tc.glass, borderTopColor: tc.glassLine }]}>
          {cs === null ? <GradientButton block label="Connect" outerStyle={{ flex: 1 }} onPress={onConnect} /> : null}
          {cs === "pending_sent" ? (
            <SoftButton block ghost label="Cancel request" outerStyle={{ flex: 1 }} onPress={() => appAlert("Cancel request", "Are you sure you want to cancel the connection request?", [
              { text: "Keep", style: "cancel" },
              { text: "Cancel request", style: "destructive", onPress: onCancelRequest },
            ])} />
          ) : null}
          {cs === "pending_received" ? (
            <>
              <SoftButton block ghost label="Decline" outerStyle={{ flex: 1 }} onPress={onDecline} />
              <GradientButton block label="Accept" outerStyle={{ flex: 1 }} onPress={onAccept} />
            </>
          ) : null}
          {cs === "accepted" ? <GradientButton block label="Message" outerStyle={{ flex: 1 }} onPress={openChat} /> : null}
        </View>
    </View>
  );
}

const rd = StyleSheet.create({
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 24, borderWidth: 1 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  dl: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, paddingVertical: 12 },
  bar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
