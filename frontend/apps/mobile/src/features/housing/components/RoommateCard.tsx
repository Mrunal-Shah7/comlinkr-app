import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { FadeImage } from "../../../../components/FadeImage";
import { VerifiedBadgePill } from "../../../../components/BadgeIndicator";
import { useAuthStore } from "../../../store/auth.store";
import { formatPrice } from "../../../utils/currency";
import { appAlert } from "../../../shared/ui/Dialogs";
import { type Roommate, computeMatch, buildCurrentUserForMatch, COMMUNITY_DISPLAY, VIBE_DISPLAY } from "../roommateModel";
import { getUserCurrencyCode } from "../utils";
import { rm } from "../styles/roommate.styles";

// ── Roommate card ────────────────────────────────────────────────────────────
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
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const currencyCode = getUserCurrencyCode(user);
  const match = computeMatch(buildCurrentUserForMatch(user), roommate);
  const displayScore = roommate.apiMatchScore ?? match.score;
  const scoreColor =
    displayScore >= 80 ? Colors.brand.green : displayScore >= 60 ? Colors.brand.blue : Colors.brand.orange;
  const scoreBg =
    displayScore >= 80 ? "#DCFCE7" : displayScore >= 60 ? "#E6F4FE" : "#FFF3E6";
  const cs = roommate.connectionStatus ?? null;

  return (
    <View style={[rm.card, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      {/* ── Tappable: banner + avatar → opens modal ── */}
      <Pressable
        style={({ pressed }) => pressed && { opacity: 0.94 }}
        onPress={onPress}
      >
        {/* Gradient banner header */}
        <LinearGradient
          colors={[roommate.color + "28", roommate.color + "08"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={rm.cardBanner}
        >
          <View style={[rm.cardBannerCircle1, { backgroundColor: roommate.color + "18" }]} />
          <View style={[rm.cardBannerCircle2, { backgroundColor: roommate.color + "10" }]} />
          {/* Right: connection badge + verified chip + match score */}
          <View style={rm.cardBannerRight}>
            {cs === "accepted" && (
              <View style={[rm.cardConnectionBadge, { backgroundColor: Colors.brand.green }]}>
                <Ionicons name="checkmark-circle" size={10} color="#FFF" />
                <Text style={rm.cardConnectionText}>Connected</Text>
              </View>
            )}
            {cs === "pending_sent" && (
              <View style={[rm.cardConnectionBadge, { backgroundColor: "#F59E0B" }]}>
                <Ionicons name="time-outline" size={10} color="#FFF" />
                <Text style={rm.cardConnectionText}>Pending</Text>
              </View>
            )}
            <Pressable
              onPress={(e) => {
                (e as { stopPropagation?: () => void }).stopPropagation?.();
                onToggleSave();
              }}
              hitSlop={8}
              style={{ padding: 6, borderRadius: 999, backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.85)" }}
              accessibilityLabel={isSaved ? "Remove bookmark" : "Save profile"}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={16}
                color={isSaved ? Colors.brand.orange : isDark ? "#FFF" : Colors.brand.blue}
              />
            </Pressable>
            {roommate.verified && <VerifiedBadgePill badge="local_reviewer" />}
            <View style={[rm.cardScoreBadge, { backgroundColor: scoreBg, borderColor: scoreColor + "40" }]}>
              <Text style={[rm.cardScoreNum, { color: scoreColor }]}>{displayScore}%</Text>
              <Text style={[rm.cardScoreLbl, { color: scoreColor }]}>MATCH</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Avatar overlapping banner */}
        <View style={rm.cardAvatarWrap}>
          <FadeImage uri={roommate.avatar} style={[rm.cardAvatar, { borderColor: roommate.color + "50" }]} />
          {roommate.verified && (
            <View style={rm.cardVerified}>
              <Ionicons name="shield-checkmark" size={10} color="#FFF" />
            </View>
          )}
        </View>
      </Pressable>

      {/* ── Card body (tappable to open profile) ── */}
      <Pressable onPress={onPress} style={rm.cardBody}>
        {/* Name + occupation */}
        <Text style={[rm.cardName, { color: tc.textPrimary }]} numberOfLines={1}>{roommate.name}</Text>
        <Text style={[rm.cardOccupation, { color: tc.textSecondary }]} numberOfLines={1}>{roommate.occupation} · {roommate.age}</Text>
        <View style={rm.cardLocationRow}>
          <Ionicons name="location-sharp" size={10} color={Colors.brand.blue} />
          <Text style={rm.cardLocationText}>{roommate.location}</Text>
        </View>

        {/* Budget + Move-in + Sleep schedule */}
        <View style={[rm.cardQuickStats, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
          <View style={rm.cardQuickStat}>
            <View style={[rm.cardQuickIcon, { backgroundColor: Colors.brand.blueLight }]}>
              <Ionicons name="cash-outline" size={12} color={Colors.brand.blue} />
            </View>
            <Text style={[rm.cardQuickStatText, { color: tc.textPrimary }]}>
              {formatPrice(roommate.budgetMin, currencyCode)}–{formatPrice(roommate.budgetMax, currencyCode)}/mo
            </Text>
          </View>
          <View style={[rm.cardQuickStatDivider, isDark && { backgroundColor: tc.borderLight }]} />
          <View style={rm.cardQuickStat}>
            <View style={[rm.cardQuickIcon, { backgroundColor: Colors.brand.greenLight }]}>
              <Ionicons name="calendar-outline" size={12} color={Colors.brand.green} />
            </View>
            <Text style={[rm.cardQuickStatText, { color: tc.textPrimary }]}>{roommate.moveInDate}</Text>
          </View>
          <View style={[rm.cardQuickStatDivider, isDark && { backgroundColor: tc.borderLight }]} />
          <View style={rm.cardQuickStat}>
            <View style={[rm.cardQuickIcon, { backgroundColor: Colors.brand.blueLight }]}>
              <Ionicons name="moon-outline" size={12} color={Colors.brand.blue} />
            </View>
            <Text style={[rm.cardQuickStatText, { color: tc.textPrimary }]}>{roommate.sleepSchedule}</Text>
          </View>
        </View>

        {/* Bio */}
        <Text style={[rm.cardBio, { color: tc.textSecondary }]} numberOfLines={2}>{roommate.bio}</Text>

        {/* Shared tags */}
        {(match.sharedCommunities.length > 0 || match.sharedVibes.length > 0) && (
          <View style={rm.cardSharedRow}>
            <View style={rm.cardSharedLabel}>
              <Ionicons name="heart-circle" size={13} color={Colors.brand.green} />
              <Text style={rm.cardSharedLabelText}>In common</Text>
            </View>
            {match.sharedCommunities.slice(0, 2).map((c) => {
              const d = COMMUNITY_DISPLAY[c];
              return d ? (
                <View key={c} style={rm.cardSharedChip}>
                  <Ionicons name="globe-outline" size={11} color={Colors.brand.green} />
                  <Text style={rm.cardSharedText}>{d.label}</Text>
                </View>
              ) : null;
            })}
            {match.sharedVibes.slice(0, 2).map((v) => {
              const d = VIBE_DISPLAY[v];
              return d ? (
                <View key={v} style={rm.cardSharedChip}>
                  <Ionicons name={d.icon as any} size={11} color={Colors.brand.green} />
                  <Text style={rm.cardSharedText}>{d.label}</Text>
                </View>
              ) : null;
            })}
            {match.sharedCommunities.length + match.sharedVibes.length > 4 && (
              <View style={[rm.cardSharedChip, { backgroundColor: Colors.brand.blueLight, borderColor: "#D6E8FF" }]}>
                <Text style={[rm.cardSharedText, { color: Colors.brand.blue }]}>
                  +{match.sharedCommunities.length + match.sharedVibes.length - 4}
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>

      {/* ── CTA row — sits outside any outer Pressable so buttons fire independently ── */}
      <View style={[rm.cardCtaRow, isDark && { borderTopColor: tc.borderLight }]}>
        {cs === null && (
          <Pressable style={rm.cardMsgBtn} onPress={onConnect}>
            <Ionicons name="person-add-outline" size={14} color={Colors.brand.blue} />
            <Text style={rm.cardMsgText}>Connect</Text>
          </Pressable>
        )}
        {cs === "pending_sent" && (
          <Pressable
            style={[rm.cardMsgBtn, { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" }]}
            onPress={() => appAlert("Cancel Request", "Cancel the connection request?", [
              { text: "Keep", style: "cancel" },
              { text: "Cancel Request", style: "destructive", onPress: onCancelRequest },
            ])}
          >
            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
            <Text style={[rm.cardMsgText, { color: "#EF4444" }]}>Cancel Request</Text>
          </Pressable>
        )}
        {cs === "pending_received" && (
          <Pressable style={rm.cardMsgBtn} onPress={onPress}>
            <Ionicons name="mail-unread-outline" size={14} color={Colors.brand.blue} />
            <Text style={rm.cardMsgText}>Respond</Text>
          </Pressable>
        )}
        {cs === "accepted" && roommate.conversationId && (
          <Pressable
            style={rm.cardMsgBtn}
            onPress={() => onOpenConversation(roommate.conversationId!)}
          >
            <Ionicons name="chatbubble-ellipses" size={14} color={Colors.brand.blue} />
            <Text style={rm.cardMsgText}>Message</Text>
          </Pressable>
        )}
        <LinearGradient
          colors={[Colors.brand.blue, Colors.brand.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={rm.cardViewGrad}
        >
          <Pressable style={rm.cardViewBtn} onPress={onPress}>
            <Text style={rm.cardViewText}>View Profile</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </View>
  );
}
