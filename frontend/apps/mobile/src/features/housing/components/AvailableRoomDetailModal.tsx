import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal, useWindowDimensions, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { FadeImage } from "../../../../components/FadeImage";
import { useAuthStore } from "../../../store/auth.store";
import { formatPrice } from "../../../utils/currency";
import { appAlert } from "../../../shared/ui/Dialogs";
import { type AvailableRoom, computeRoomCompatibility, buildCurrentUserForMatch } from "../roommateModel";
import { getUserCurrencyCode } from "../utils";
import { ar } from "../styles/availableRoom.styles";

// ── Available Room Detail Modal ───────────────────────────────────────────────
export function AvailableRoomDetailModal({
  room,
  visible,
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
  visible: boolean;
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
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const currencyCode = getUserCurrencyCode(user);
  if (!room) return null;

  const compat = computeRoomCompatibility(room, buildCurrentUserForMatch(user));
  const compatColor = compat >= 80 ? Colors.brand.green : compat >= 60 ? Colors.brand.blue : Colors.brand.orange;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
        {/* Image carousel header */}
        <View style={{ height: 260, position: "relative" }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImgIdx(Math.round(e.nativeEvent.contentOffset.x / windowWidth))
            }
          >
            {room.images.map((uri, i) => (
              <FadeImage key={i} uri={uri} style={{ width: windowWidth, height: 260 }} cachePolicy="disk" transition={300} />
            ))}
          </ScrollView>
          <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80 }} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 }} />
          {/* Back button */}
          <Pressable
            onPress={onClose}
            style={{ position: "absolute", top: insets.top + 8, left: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </Pressable>
          {onToggleSave && !isOwner ? (
            <Pressable
              onPress={onToggleSave}
              style={{ position: "absolute", top: insets.top + 8, right: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={18} color={saved ? "#FBBF24" : "#FFF"} />
            </Pressable>
          ) : null}
          {/* Image counter */}
          <View style={{ position: "absolute", bottom: 14, right: 14, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, color: "#FFF", fontWeight: "700" }}>{imgIdx + 1}/{room.images.length}</Text>
          </View>
          {/* Price bottom-left */}
          <View style={{ position: "absolute", bottom: 14, left: 14 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: "#FFF" }}>{formatPrice(room.rentPerMonth, currencyCode)}<Text style={{ fontSize: 14, fontWeight: "500" }}>/mo</Text></Text>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 1 }}>{room.roomType} · {room.apartmentDesc}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Host + compat card */}
          <View style={[ar.detailCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <View style={ar.detailHostRow}>
              <View style={[ar.hostAvatarWrap, { borderColor: room.hostColor + "40", width: 54, height: 54, borderRadius: 27 }]}>
                <FadeImage uri={room.hostAvatar} style={{ width: 50, height: 50, borderRadius: 25 }} />
                {room.hostVerified && (
                  <View style={[ar.hostVerifiedBadge, { width: 16, height: 16, borderRadius: 8, bottom: -1, right: -1 }]}>
                    <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: tc.textPrimary }}>{room.hostName}</Text>
                <Text style={{ fontSize: 13, color: tc.textSecondary, marginTop: 1 }}>{room.hostOccupation}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                  <Ionicons name="location-sharp" size={11} color={Colors.brand.blue} />
                  <Text style={{ fontSize: 12, color: tc.textTertiary }}>{room.location}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: compatColor + "18", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, alignItems: "center" }}>
                <Text style={[ar.compatScore, { color: compatColor, fontSize: 18 }]}>{compat}%</Text>
                <Text style={[ar.compatLabel, { color: compatColor }]}>match</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: tc.textSecondary, lineHeight: 20, marginTop: 10 }}>{room.hostBio}</Text>
          </View>

          {room.api?.description ? (
            <View style={[ar.detailCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Text style={[ar.detailSectionTitle, isDark && { color: tc.textTertiary }]}>Description</Text>
              <Text style={{ fontSize: 14, color: tc.textSecondary, lineHeight: 22 }}>{room.api.description}</Text>
            </View>
          ) : null}

          {/* Key stats */}
          <View style={[ar.detailCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <Text style={[ar.detailSectionTitle, isDark && { color: tc.textTertiary }]}>Room Details</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                { icon: "cash-outline" as const, label: "Rent", value: `${formatPrice(room.rentPerMonth, currencyCode)}/mo`, color: Colors.brand.blue },
                { icon: "shield-outline" as const, label: "Deposit", value: formatPrice(room.deposit, currencyCode), color: Colors.brand.orange },
                { icon: "calendar-outline" as const, label: "Available", value: room.availableFrom, color: Colors.brand.green },
                { icon: "time-outline" as const, label: "Lease", value: room.leaseTerm, color: Colors.brand.blue },
                { icon: "cube-outline" as const, label: "Furnished", value: room.furnished ? "Yes" : "No", color: room.furnished ? Colors.brand.green : Colors.text.tertiary },
                { icon: "water-outline" as const, label: "Bathroom", value: room.privateBath ? "Private" : "Shared", color: room.privateBath ? Colors.brand.green : Colors.text.secondary },
                ...(room.api?.bathrooms != null
                  ? [{ icon: "water-outline" as const, label: "Baths", value: String(room.api.bathrooms), color: Colors.brand.blue }]
                  : []),
              ].map((stat) => (
                <View key={stat.label} style={[ar.statBox, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                  <View style={[ar.statIcon, { backgroundColor: stat.color + "18" }]}>
                    <Ionicons name={stat.icon} size={16} color={stat.color} />
                  </View>
                  <Text style={[ar.statVal, { color: tc.textPrimary }]}>{stat.value}</Text>
                  <Text style={[ar.statLabel, { color: tc.textTertiary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Residents */}
          <View style={[ar.detailCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <Text style={[ar.detailSectionTitle, isDark && { color: tc.textTertiary }]}>Living Situation</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="people" size={18} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: tc.textPrimary }}>
                  {room.currentResidents} of {room.totalRooms} rooms occupied
                </Text>
                <Text style={{ fontSize: 12, color: tc.textSecondary, marginTop: 1 }}>
                  {room.availableRooms} room{room.availableRooms > 1 ? "s" : ""} available · {room.genderPref}
                </Text>
              </View>
            </View>
          </View>

          {/* Amenities */}
          <View style={[ar.detailCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <Text style={[ar.detailSectionTitle, isDark && { color: tc.textTertiary }]}>Amenities</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {room.amenities.map((a) => (
                <View key={a} style={ar.amenityChip}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.brand.green} />
                  <Text style={ar.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* House rules */}
          <View style={[ar.detailCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <Text style={[ar.detailSectionTitle, isDark && { color: tc.textTertiary }]}>House Rules</Text>
            {room.houseRules.map((rule, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.brand.orangeLight, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  <Ionicons name="information-circle" size={13} color={Colors.brand.orange} />
                </View>
                <Text style={{ fontSize: 13, color: Colors.text.secondary, flex: 1, lineHeight: 18 }}>{rule}</Text>
              </View>
            ))}
          </View>

          {/* Lifestyle compatibility */}
          <View style={[ar.detailCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
            <Text style={[ar.detailSectionTitle, isDark && { color: tc.textTertiary }]}>Host's Lifestyle</Text>
            {[
              { icon: "sparkles" as const, label: "Cleanliness", value: room.cleanliness },
              { icon: "moon-outline" as const, label: "Sleep Schedule", value: room.sleepSchedule },
              { icon: "volume-medium-outline" as const, label: "Noise Level", value: room.noiseLevel },
              { icon: "people-outline" as const, label: "Guests", value: room.guestPolicy },
              { icon: "ban-outline" as const, label: "Smoking", value: room.smoking },
              { icon: "paw-outline" as const, label: "Pets", value: room.petFriendly ? "Pet Friendly" : "No Pets" },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0F2F5", ...(isDark && { borderBottomColor: tc.borderLight }) }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.brand.blueLight, alignItems: "center", justifyContent: "center", marginRight: 10, ...(isDark && { backgroundColor: tc.inputBg }) }}>
                  <Ionicons name={row.icon} size={14} color={Colors.brand.blue} />
                </View>
                <Text style={{ fontSize: 13, color: tc.textSecondary, flex: 1 }}>{row.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: tc.textPrimary }}>{row.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Fixed CTA */}
        <View style={[ar.detailCta, { paddingBottom: insets.bottom + 12 }, isDark && { backgroundColor: tc.cardBg, borderTopColor: tc.borderLight }]}>
          {isOwner ? (
            <View style={{ flex: 1, flexDirection: "row", gap: 10 }}>
              <Pressable
                style={[ar.detailMsgBtn, { flex: 1, justifyContent: "center" }]}
                onPress={() => onEdit?.(room)}
              >
                <Ionicons name="create-outline" size={17} color={Colors.brand.blue} />
                <Text style={ar.detailMsgText}>Edit</Text>
              </Pressable>
              {onDelete ? (
                <Pressable
                  style={[ar.detailMsgBtn, { flex: 1, justifyContent: "center", borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}
                  onPress={onDelete}
                >
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                  <Text style={[ar.detailMsgText, { color: "#DC2626" }]}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <Pressable
                style={ar.detailMsgBtn}
                onPress={() => {
                  if (!room.hostId) { appAlert("Host unavailable", "This host's contact info is not available."); return; }
                  // Dismiss this native Modal first; a route pushed while it is presented renders underneath it.
                  onClose();
                  const { isAuthed, user } = useAuthStore.getState();
                  if (!isAuthed) { router.push("/(auth)/login" as any); return; }
                  if (!user?.onboardingDone) { router.push("/(auth)/onboarding" as any); return; }
                  router.push({ pathname: "/chat", params: { recipientId: room.hostId, recipientName: room.hostName, recipientType: "room-host", returnTo: "housing" } } as any);
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={17} color={Colors.brand.blue} />
                <Text style={ar.detailMsgText}>Message</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
                onPress={
                  requested
                    ? undefined
                    : () => {
                        if (onApplyWithMessage) {
                          setApplyMsg("");
                          setApplySheet(true);
                        } else {
                          onRequest();
                        }
                      }
                }
              >
                <LinearGradient
                  colors={requested ? ["#F59E0B", "#D97706"] : [Colors.brand.blue, Colors.brand.green]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={ar.detailRequestBtn}
                >
                  <Ionicons name={requested ? "checkmark-circle" : "key"} size={17} color="#FFF" />
                  <Text style={ar.detailRequestText}>{requested ? "Application Sent" : "Apply"}</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </View>

        <Modal visible={applySheet} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setApplySheet(false)}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setApplySheet(false)}>
            <KeyboardAvoidingView
              style={{ flex: 1, justifyContent: "center", padding: 24 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
            <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: tc.cardBg, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: tc.borderLight }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: tc.textPrimary, marginBottom: 8 }}>Send application?</Text>
              <Text style={{ fontSize: 13, color: tc.textSecondary, marginBottom: 12 }}>Optional message to the host</Text>
              <TextInput
                value={applyMsg}
                onChangeText={setApplyMsg}
                placeholder="Introduce yourself..."
                placeholderTextColor={tc.textTertiary}
                multiline
                style={{
                  minHeight: 80,
                  borderWidth: 1,
                  borderColor: tc.borderLight,
                  borderRadius: 12,
                  padding: 12,
                  color: tc.textPrimary,
                  textAlignVertical: "top",
                }}
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <Pressable onPress={() => setApplySheet(false)} style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: tc.borderLight }}>
                  <Text style={{ fontWeight: "700", color: tc.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setApplySheet(false);
                    const msg = applyMsg.trim() || undefined;
                    onApplyWithMessage?.(msg);
                  }}
                  style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
                >
                  <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} style={{ paddingVertical: 12, alignItems: "center" }}>
                    <Text style={{ fontWeight: "800", color: "#FFF" }}>Send</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}
