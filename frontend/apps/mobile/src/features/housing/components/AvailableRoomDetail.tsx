// AvailableRoomDetailModal — a room in a shared home (design D, plan 01: design screen "room-detail").
// Photo hero with glass buttons, a body that overlaps it, the host with the match, the facts as one list, the rules
// and amenities as chips, and a glass bar with Message and Apply. Apply with a note opens a D sheet.
import { palette } from "../../../theme/palette";
import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, useWindowDimensions, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { TYPE } from "../../../theme/d";
import { FadeImage } from "../../../../components/FadeImage";
import { useAuthStore } from "../../../store/auth.store";
import { formatPrice } from "../../../utils/currency";
import { appAlert } from "../../../shared/ui/Dialogs";
import { GradientButton, Reveal, SoftButton } from "../../../shared/d";
import { DSheet } from "../../../shared/d/Sheet";
import { type AvailableRoom, computeRoomCompatibility, buildCurrentUserForMatch } from "../roommateModel";
import { getUserCurrencyCode } from "../utils";

/** The body of the /room/[id] route (plan 03). */
export function AvailableRoomDetail({
  room,
  onClose,
  requested,
  onRequest,
  saved = false,
  onToggleSave,
  isOwner = false,
  onDelete,
  onEdit,
  onApplyWithMessage,
}: {
  room: AvailableRoom | null;
  onClose: () => void;
  requested: boolean;
  onRequest: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
  onEdit?: (room: AvailableRoom) => void;
  onApplyWithMessage?: (message?: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [imgIdx, setImgIdx] = useState(0);
  const [applySheet, setApplySheet] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const { tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const currencyCode = getUserCurrencyCode(user);
  if (!room) return null;

  const compat = computeRoomCompatibility(room, buildCurrentUserForMatch(user));
  const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "" && !/^(n\/a|—|-|0)$/i.test(String(v).trim());
  const facts = ([
    ["Rent", `${formatPrice(room.rentPerMonth, currencyCode)} /mo`],
    ["Deposit", room.deposit > 0 ? formatPrice(room.deposit, currencyCode) : ""],
    ["Available", room.availableFrom],
    ["Lease", room.leaseTerm],
    ["Furnished", room.furnished ? "Yes" : "No"],
    ["Bathroom", room.privateBath ? "Private" : "Shared"],
    ["Baths in the home", room.api?.bathrooms != null ? String(room.api.bathrooms) : ""],
  ] as [string, string][]).filter(([, v]) => has(v));
  const lifestyle = ([
    ["Cleanliness", room.cleanliness],
    ["Sleep", room.sleepSchedule],
    ["Noise", room.noiseLevel],
    ["Guests", room.guestPolicy],
    ["Smoking", room.smoking],
    ["Pets", room.petFriendly ? "Pet friendly" : "No pets"],
  ] as [string, string][]).filter(([, v]) => has(v));
  const glassBtn = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, color = palette.white) => (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,20,28,0.42)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
      <Ionicons name={icon} size={19} color={color} />
    </Pressable>
  );
  const list = (rows: [string, string][]) => (
    <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, paddingHorizontal: 14 }}>
      {rows.map(([k, v], i) => (
        <View key={k} style={[{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 12 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
          <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
          <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
        </View>
      ))}
    </View>
  );
  const h2 = (t: string) => <Text style={[TYPE.section, { color: tc.textPrimary, marginTop: 22, marginBottom: 10 }]}>{t}</Text>;
  const message = () => {
    if (!room.hostId) { appAlert("Host unavailable", "This host's contact details are not available."); return; }
    const { isAuthed, user: u } = useAuthStore.getState();
    if (!isAuthed) { router.push("/(auth)/login" as any); return; }
    if (!u?.onboardingDone) { router.push("/(auth)/onboarding" as any); return; }
    router.push({ pathname: "/chat", params: { recipientId: room.hostId, recipientName: room.hostName, recipientType: "room-host", returnTo: "housing" } } as any);
  };
  const apply = () => {
    if (requested) return;
    if (onApplyWithMessage) { setApplyMsg(""); setApplySheet(true); } else onRequest();
  };

  return (
    <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
        <View style={{ height: 320 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / windowWidth))}>
            {room.images.map((uri, i) => <FadeImage key={i} uri={uri} style={{ width: windowWidth, height: 320 }} cachePolicy="disk" transition={300} />)}
          </ScrollView>
          <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120 }} pointerEvents="none" />
          <View style={{ position: "absolute", top: insets.top + 10, left: 14, right: 14, flexDirection: "row", gap: 8 }}>
            {glassBtn("chevron-back", "Back", onClose)}
            <View style={{ flex: 1 }} />
            {onToggleSave && !isOwner ? glassBtn(saved ? "bookmark" : "bookmark-outline", saved ? "Remove from saved" : "Save room", onToggleSave) : null}
          </View>
          {room.images.length > 1 ? (
            <View style={{ position: "absolute", bottom: 40, right: 16, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={[TYPE.label, { color: palette.white }]}>{imgIdx + 1} / {room.images.length}</Text>
            </View>
          ) : null}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, marginTop: -26, backgroundColor: tc.pageBg, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <Reveal i={0}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: tc.mintSoft }}>
                <Text style={[TYPE.label, { color: tc.successText }]}>{room.availableRooms} of {room.totalRooms} {room.totalRooms === 1 ? "room" : "rooms"} free</Text>
              </View>
              {has(room.genderPref) ? <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: tc.accentSoft }}><Text style={[TYPE.label, { color: tc.accentText }]}>{/^any$/i.test(room.genderPref.trim()) ? "Open to anyone" : room.genderPref}</Text></View> : null}
            </View>
            <Text style={[TYPE.pageTitle, { fontSize: 26, lineHeight: 30, color: tc.textPrimary, marginTop: 10 }]}>{[room.roomType, room.apartmentDesc].filter(has).join(" · ") || "A room"}</Text>
            {has(room.location) ? <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 4 }]}>{room.location}</Text> : null}
          </Reveal>

          <Reveal i={1} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, padding: 12, borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg }}>
            <View>
              <FadeImage fallbackIcon="person" uri={room.hostAvatar} style={{ width: 50, height: 50, borderRadius: 25 }} />
              {room.hostVerified ? (
                <View style={{ position: "absolute", right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: tc.mint, borderWidth: 2, borderColor: tc.cardBg }}>
                  <Ionicons name="checkmark" size={10} color={palette.white} />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{room.hostName}</Text>
              {has(room.hostOccupation) ? <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>{room.hostOccupation}</Text> : null}
            </View>
            {/* A match against yourself means nothing: the owner sees no score. */}
            {isOwner ? null : (
              <View style={{ alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: tc.mintSoft }}>
                <Text style={[TYPE.cardTitle, { color: tc.successText }]}>{compat}%</Text>
                <Text style={[TYPE.label, { color: tc.successText, fontSize: 10.5 }]}>match</Text>
              </View>
            )}
          </Reveal>
          {has(room.hostBio) ? <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 10 }]}>{room.hostBio}</Text> : null}

          {room.api?.description ? (<>{h2("About the room")}<Text style={[TYPE.body, { color: tc.textSecondary, lineHeight: 23 }]}>{room.api.description}</Text></>) : null}

          {h2("The details")}
          {list(facts)}
          <Text style={[TYPE.small, { color: tc.textTertiary, marginTop: 8, marginLeft: 2 }]}>{room.currentResidents} {room.currentResidents === 1 ? "person lives" : "people live"} here now.</Text>

          {room.amenities.length ? (
            <>
              {h2("Amenities")}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {room.amenities.map((a) => <View key={a} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.borderMedium }}><Text style={[TYPE.label, { fontSize: 13, color: tc.textPrimary }]}>{a}</Text></View>)}
              </View>
            </>
          ) : null}

          {room.houseRules.length ? (
            <>
              {h2("House rules")}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {room.houseRules.map((r, i) => <View key={`${r}-${i}`} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: tc.accentSoft }}><Text style={[TYPE.label, { fontSize: 13, color: tc.accentText }]}>{r}</Text></View>)}
              </View>
            </>
          ) : null}

          {lifestyle.length ? (<>{h2("How the host lives")}{list(lifestyle)}</>) : null}
        </ScrollView>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: tc.glass, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.glassLine }}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]}>{formatPrice(room.rentPerMonth, currencyCode)}<Text style={[TYPE.small, { color: tc.textTertiary }]}> /mo</Text></Text>
            {has(room.availableFrom) ? <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>Move-in: {room.availableFrom}</Text> : null}
          </View>
          {isOwner ? (
            <>
              <SoftButton label="Edit" onPress={() => onEdit?.(room)} />
              {onDelete ? <SoftButton ghost label="Delete" onPress={onDelete} /> : null}
            </>
          ) : (
            <>
              <SoftButton label="Message" onPress={message} />
              {requested ? <SoftButton ghost label="Applied" disabled icon={<Ionicons name="checkmark" size={16} color={tc.successText} />} /> : <GradientButton label="Apply" onPress={apply} />}
            </>
          )}
        </View>

        <DSheet visible={applySheet} onClose={() => setApplySheet(false)} title="Apply for this room">
          <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
            <View style={{ paddingHorizontal: 18, paddingBottom: 12 }}>
              <Text style={[TYPE.small, { color: tc.textSecondary, marginBottom: 10 }]}>A short hello helps the host say yes.</Text>
              <TextInput
                value={applyMsg}
                onChangeText={setApplyMsg}
                placeholder="Introduce yourself (optional)"
                placeholderTextColor={tc.textTertiary}
                multiline
                style={[TYPE.body, { minHeight: 96, borderRadius: 18, padding: 14, backgroundColor: tc.inputBg, color: tc.textPrimary, textAlignVertical: "top" }]}
                accessibilityLabel="Message to the host"
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                <SoftButton ghost block label="Cancel" outerStyle={{ flex: 1 }} onPress={() => setApplySheet(false)} />
                <GradientButton block label="Send" outerStyle={{ flex: 1.4 }} onPress={() => { setApplySheet(false); onApplyWithMessage?.(applyMsg.trim() || undefined); }} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </DSheet>
    </View>
  );
}
