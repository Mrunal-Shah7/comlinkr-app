import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { FadeImage } from "../../../../components/FadeImage";
import { useAuthStore } from "../../../store/auth.store";
import { DismissibleSheet, SheetDragArea } from "../../../shared/ui/DismissibleSheet";
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
export function RoommateDetailModal({
  roommate,
  visible,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onConnect,
  onAccept,
  onDecline,
  onCancelRequest,
}: {
  roommate: Roommate | null;
  visible: boolean;
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <DismissibleSheet onDismiss={onClose} style={{ backgroundColor: tc.sheetBg }}>
        {/* ── Header ── */}
        <SheetDragArea>
        <LinearGradient
          colors={isDark ? [tc.cardElevated, tc.inputBg] : ["#EBF4FF", "#D6E8FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[rm.modalHeader, { paddingTop: insets.top + 12 }]}
        >
          <Pressable onPress={onClose} style={rm.modalBackBtn}>
            <Ionicons name="chevron-back" size={20} color={tc.textPrimary} />
          </Pressable>
          <Text style={[rm.modalHeaderTitle, { color: tc.textPrimary }]}>Roommate Profile</Text>
          <Pressable onPress={onToggleBookmark} style={rm.modalBackBtn} accessibilityLabel={isBookmarked ? "Remove bookmark" : "Save profile"}>
            <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={20} color={isBookmarked ? "#FF7B00" : tc.textPrimary} />
          </Pressable>
        </LinearGradient>
        </SheetDragArea>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile hero ── */}
          <View style={[rm.modalProfileHero, isDark && { borderBottomColor: tc.borderLight }]}>
            <View style={rm.modalAvatarWrap}>
              <FadeImage uri={roommate.avatar} style={rm.modalAvatar} />
              {roommate.verified && (
                <View style={rm.modalVerifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                </View>
              )}
            </View>
            <Text style={[rm.modalName, { color: tc.textPrimary }]}>{roommate.name}</Text>
            <Text style={[rm.modalOccupation, { color: tc.textSecondary }]}>
              {roommate.occupation} · {roommate.age} · {roommate.gender}
            </Text>
            <View style={rm.modalLocationRow}>
              <Ionicons name="location-sharp" size={12} color={Colors.brand.blue} />
              <Text style={rm.modalLocationText}>{roommate.location}</Text>
            </View>

            {/* Connection status badge (compact; full UI in footer) */}
            {cs === "pending_sent" && (
              <View style={[rm.modalConnectionBadge, { backgroundColor: "#F59E0B" }]}>
                <Ionicons name="time-outline" size={13} color="#FFF" />
                <Text style={rm.modalConnectionText}>Request Sent</Text>
              </View>
            )}
            {cs === "accepted" && (
              <View style={[rm.modalConnectionBadge, { backgroundColor: Colors.brand.green }]}>
                <Ionicons name="checkmark-circle" size={13} color="#FFF" />
                <Text style={rm.modalConnectionText}>Connected</Text>
              </View>
            )}

            {/* Score ring */}
            <View style={[rm.modalScoreCard, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
              <View style={[rm.modalScoreRing, { borderColor: scoreColor }, isDark && { backgroundColor: tc.cardBg }]}>
                <Text style={[rm.modalScoreNum, { color: scoreColor }]}>{displayScore}%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[rm.modalScoreTitle, { color: tc.textPrimary }]}>Compatibility Score</Text>
                <Text style={[rm.modalScoreSub, { color: tc.textSecondary }]}>
                  {match.sharedCommunities.length} shared communities · {match.sharedVibes.length} shared vibes
                </Text>
              </View>
            </View>
          </View>

          {/* ── Bio ── */}
          <View style={rm.modalSection}>
            <Text style={[rm.modalSectionTitle, { color: tc.textPrimary }]}>About</Text>
            <LinkifiedText text={roommate.bio} style={[rm.modalBio, { color: tc.textSecondary }]} />
          </View>

          {/* ── Housing Preferences ── */}
          <View style={rm.modalSection}>
            <Text style={[rm.modalSectionTitle, { color: tc.textPrimary }]}>Housing Preferences</Text>
            <View style={rm.modalStatsRow}>
              <View style={[rm.modalStatCard, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                <Ionicons name="cash-outline" size={20} color={Colors.brand.blue} />
                <Text style={[rm.modalStatVal, { color: tc.textPrimary }]}>
                  {formatPrice(roommate.budgetMin, currencyCode)}–{formatPrice(roommate.budgetMax, currencyCode)}
                </Text>
                <Text style={[rm.modalStatLabel, { color: tc.textTertiary }]}>Monthly Budget</Text>
              </View>
              <View style={[rm.modalStatCard, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                <Ionicons name="calendar-outline" size={20} color={Colors.brand.green} />
                <Text style={[rm.modalStatVal, { color: tc.textPrimary }]}>{roommate.moveInDate}</Text>
                <Text style={[rm.modalStatLabel, { color: tc.textTertiary }]}>Move-in Date</Text>
              </View>
              <View style={[rm.modalStatCard, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                <Ionicons name="moon-outline" size={20} color={Colors.brand.blue} />
                <Text style={[rm.modalStatVal, { color: tc.textPrimary }]}>{roommate.sleepSchedule}</Text>
                <Text style={[rm.modalStatLabel, { color: tc.textTertiary }]}>Sleep Schedule</Text>
              </View>
            </View>

            {/* Lifestyle quick-glance chips */}
            <View style={rm.modalLifestyleChips}>
              {[
                { icon: "sparkles" as const,         label: roommate.cleanliness,  bg: Colors.brand.blueLight,  color: Colors.brand.blue },
                { icon: "volume-medium-outline" as const, label: roommate.noiseLevel, bg: Colors.brand.greenLight, color: Colors.brand.green },
                { icon: "paw-outline" as const,      label: roommate.pets,         bg: Colors.brand.orangeLight, color: Colors.brand.orange },
                { icon: "ban-outline" as const,      label: `Smoking: ${roommate.smoking}`, bg: "#FEE2E2", color: "#DC2626" },
                { icon: "people-outline" as const,   label: `Guests: ${roommate.guestPolicy}`, bg: Colors.brand.blueLight, color: Colors.brand.blue },
                { icon: "laptop-outline" as const,   label: roommate.workFromHome ? "WFH" : "Office", bg: Colors.brand.greenLight, color: Colors.brand.green },
              ].map((chip) => (
                <View key={chip.label} style={[rm.modalLifestyleChip, { backgroundColor: chip.bg }]}>
                  <Ionicons name={chip.icon} size={12} color={chip.color} />
                  <Text style={[rm.modalLifestyleChipText, { color: chip.color }]}>{chip.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Shared Tags ── */}
          {(match.sharedCommunities.length > 0 ||
            match.sharedVibes.length > 0 ||
            match.sharedInterests.length > 0) && (
            <View style={rm.modalSection}>
              <Text style={[rm.modalSectionTitle, { color: tc.textPrimary }]}>What You Have in Common</Text>
              <View style={rm.sharedTagsWrap}>
                {match.sharedCommunities.map((c) => {
                  const d = COMMUNITY_DISPLAY[c];
                  return d ? <SharedTagPill key={c} icon="globe-outline" label={d.label} /> : null;
                })}
                {match.sharedVibes.map((v) => {
                  const d = VIBE_DISPLAY[v];
                  return d ? <SharedTagPill key={v} icon={d.icon} label={d.label} /> : null;
                })}
                {match.sharedInterests.map((i) => {
                  const d = INTEREST_DISPLAY[i];
                  return d ? <SharedTagPill key={i} icon={d.icon} label={d.label} /> : null;
                })}
              </View>
            </View>
          )}

          {/* ── All Vibes ── */}
          <View style={rm.modalSection}>
            <Text style={[rm.modalSectionTitle, { color: tc.textPrimary }]}>Their Vibes</Text>
            <View style={rm.sharedTagsWrap}>
              {roommate.vibes.map((v) => {
                const d = VIBE_DISPLAY[v];
                const isShared = match.sharedVibes.includes(v);
                return d ? (
                  <View
                    key={v}
                    style={[
                      rm.sharedTagPill,
                      isShared
                        ? { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }
                        : { backgroundColor: "#F5F7FA", borderColor: "#E5EBF4" },
                      !isShared && isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight },
                    ]}
                  >
                    <Ionicons
                      name={d.icon as any}
                      size={12}
                      color={isShared ? Colors.brand.green : (isDark ? tc.textTertiary as string : Colors.text.tertiary)}
                    />
                    <Text
                      style={[
                        rm.sharedTagText,
                        isShared ? { color: Colors.brand.green } : { color: Colors.text.secondary },
                        !isShared && isDark && { color: tc.textSecondary },
                      ]}
                    >
                      {d.label}
                    </Text>
                    {isShared && <Ionicons name="checkmark" size={11} color={Colors.brand.green} />}
                  </View>
                ) : null;
              })}
            </View>
          </View>

          {/* ── Lifestyle Preferences ── */}
          <View style={rm.modalSection}>
            <Text style={[rm.modalSectionTitle, { color: tc.textPrimary }]}>Lifestyle</Text>
            <View style={rm.prefGrid}>
              <PrefRow
                icon="sparkles"
                label="Cleanliness"
                value={roommate.cleanliness}
                match={cu.cleanliness === roommate.cleanliness}
              />
              <PrefRow
                icon="moon-outline"
                label="Sleep Schedule"
                value={roommate.sleepSchedule}
                match={cu.sleepSchedule === roommate.sleepSchedule}
              />
              <PrefRow
                icon="volume-medium-outline"
                label="Noise Level"
                value={roommate.noiseLevel}
                match={cu.noiseLevel === roommate.noiseLevel}
              />
              <PrefRow
                icon="people-outline"
                label="Guest Policy"
                value={roommate.guestPolicy}
                match={cu.guestPolicy === roommate.guestPolicy}
              />
              <PrefRow
                icon="ban-outline"
                label="Smoking"
                value={roommate.smoking}
                match={cu.smoking === roommate.smoking}
              />
              <PrefRow
                icon="paw-outline"
                label="Pets"
                value={roommate.pets}
                match={
                  cu.pets === roommate.pets ||
                  roommate.pets === "Pet Friendly" ||
                  cu.pets === "Pet Friendly"
                }
              />
              <PrefRow
                icon="laptop-outline"
                label="Works from Home"
                value={roommate.workFromHome ? "Yes" : "No"}
                match={cu.workFromHome === roommate.workFromHome}
              />
            </View>
          </View>
        </ScrollView>

        {/* ── Bottom CTA (connection state is mutually exclusive) ── */}
        <View style={[rm.modalCtaBar, { paddingBottom: insets.bottom + 12 }, isDark && { backgroundColor: tc.cardBg, borderTopColor: tc.borderLight }]}>
          {cs === null && (
            <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={onConnect}>
              <LinearGradient
                colors={[Colors.brand.blue, Colors.brand.green]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={rm.modalCtaPrimary}
              >
                <Ionicons name="people" size={17} color="#FFF" />
                <Text style={rm.modalCtaPrimaryText}>Connect</Text>
              </LinearGradient>
            </Pressable>
          )}
          {cs === "pending_sent" && (
            <View style={{ flex: 1, gap: 8 }}>
              <View style={[rm.modalCtaPrimary, { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" }]}>
                <Ionicons name="time-outline" size={17} color="#9CA3AF" />
                <Text style={[rm.modalCtaPrimaryText, { color: "#9CA3AF" }]}>Request Sent</Text>
              </View>
              <Pressable
                onPress={() => {
                  appAlert("Cancel Request", "Are you sure you want to cancel the connection request?", [
                    { text: "Keep", style: "cancel" },
                    { text: "Cancel Request", style: "destructive", onPress: onCancelRequest },
                  ]);
                }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 6 }}
              >
                <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#EF4444" }}>Cancel Request</Text>
              </Pressable>
            </View>
          )}
          {cs === "pending_received" && (
            <View style={{ flex: 1, flexDirection: "row", gap: 10 }}>
              <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={onAccept}>
                <LinearGradient
                  colors={[Colors.brand.green, "#16A34A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={rm.modalCtaPrimary}
                >
                  <Ionicons name="checkmark-circle" size={17} color="#FFF" />
                  <Text style={rm.modalCtaPrimaryText}>Accept Request</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                  backgroundColor: "#FEE2E2",
                  borderWidth: 1,
                  borderColor: "#FECACA",
                }}
                onPress={onDecline}
              >
                <Ionicons name="close-circle-outline" size={17} color="#DC2626" />
                <Text style={[rm.modalCtaPrimaryText, { color: "#DC2626" }]}>Decline</Text>
              </Pressable>
            </View>
          )}
          {cs === "accepted" && (
            <Pressable
              style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
              onPress={() => {
                if (roommate.conversationId?.trim()) {
                  router.push({
                    pathname: "/chat",
                    params: { conversationId: roommate.conversationId, returnTo: "housing" },
                  } as any);
                } else {
                  // Fall back to recipientId — startOrGetConversation will find or create the thread
                  router.push({
                    pathname: "/chat",
                    params: { recipientId: roommate.id, recipientName: roommate.name, recipientType: "roommate", returnTo: "housing" },
                  } as any);
                }
              }}
            >
              <LinearGradient
                colors={[Colors.brand.green, "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={rm.modalCtaPrimary}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={17} color="#FFF" />
                <Text style={rm.modalCtaPrimaryText}>Message</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </DismissibleSheet>
    </Modal>
  );
}
