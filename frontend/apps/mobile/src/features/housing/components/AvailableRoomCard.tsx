import { View, Text, Pressable, StyleSheet } from "react-native";
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

// ══════════════════════════════════════════════════════════════════════════════
// AVAILABLE ROOM CARD
// ══════════════════════════════════════════════════════════════════════════════
export function AvailableRoomCard({
  room,
  onPress,
  requested = false,
  onRequest,
  isOwner = false,
}: {
  room: AvailableRoom;
  onPress: () => void;
  requested?: boolean;
  onRequest: () => void;
  isOwner?: boolean;
}) {
  const { isDark, tc } = useTheme();
  const user = useAuthStore((s) => s.user);
  const currencyCode = getUserCurrencyCode(user);
  const compat = computeRoomCompatibility(room, buildCurrentUserForMatch(user));
  const compatColor = compat >= 80 ? Colors.brand.green : compat >= 60 ? Colors.brand.blue : Colors.brand.orange;
  const compatBg = compat >= 80 ? "#DCFCE7" : compat >= 60 ? "#E3EDF6" : "#E2F0F1";

  return (
    <View style={[ar.card, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      {/* Room photo */}
      <Pressable onPress={onPress} style={ar.imageWrap}>
        <FadeImage uri={room.images[0]} style={ar.image} cachePolicy="disk" transition={300} />
        {/* Overlays */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)"]}
          style={StyleSheet.absoluteFill}
        />
        {/* Room type badge */}
        <View style={ar.typeBadge}>
          <Ionicons name="home" size={10} color="#FFF" />
          <Text style={ar.typeBadgeText}>{room.roomType}</Text>
        </View>
        {/* Available badge */}
        <View style={ar.availBadge}>
          <View style={ar.availDot} />
          <Text style={ar.availBadgeText}>
            {room.availableRooms} room{room.availableRooms > 1 ? "s" : ""} available
          </Text>
        </View>
        {/* Compatibility chip */}
        <View style={[ar.compatChip, { backgroundColor: compatBg }]}>
          <Text style={[ar.compatScore, { color: compatColor }]}>{compat}%</Text>
          <Text style={[ar.compatLabel, { color: compatColor }]}>match</Text>
        </View>
        {/* Price overlay */}
        <View style={ar.priceOverlay}>
          <Text style={ar.priceText}>{formatPrice(room.rentPerMonth, currencyCode)}</Text>
          <Text style={ar.priceSub}>/mo</Text>
        </View>
      </Pressable>

      {/* Card body */}
      <Pressable onPress={onPress} style={ar.body}>
        {/* Host row */}
        <View style={ar.hostRow}>
          <View style={[ar.hostAvatarWrap, { borderColor: room.hostColor + "40" }]}>
            <FadeImage uri={room.hostAvatar} style={ar.hostAvatar} />
            {room.hostVerified && (
              <View style={ar.hostVerifiedBadge}>
                <Ionicons name="shield-checkmark" size={9} color="#FFF" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ar.hostName, { color: tc.textPrimary }]}>{room.hostName}</Text>
            <Text style={[ar.hostOccupation, { color: tc.textSecondary }]}>{room.hostOccupation}</Text>
          </View>
          <View style={ar.apartmentPill}>
            <Text style={ar.apartmentPillText}>{room.apartmentDesc}</Text>
          </View>
        </View>

        {/* Location + availability */}
        <View style={ar.locationRow}>
          <Ionicons name="location-sharp" size={11} color={Colors.brand.blue} />
          <Text style={[ar.locationText, { color: tc.textSecondary }]}>{room.neighborhood}</Text>
          {room.availableFrom ? (
            <>
              <View style={ar.dot} />
              <Ionicons name="calendar-outline" size={11} color={Colors.brand.green} />
              <Text style={[ar.dateText, { color: tc.textSecondary }]}>
                {room.availableFrom === "Immediate" ? "Available now" : `From ${room.availableFrom}`}
              </Text>
            </>
          ) : null}
        </View>

        {/* Quick chips */}
        <View style={ar.chipsRow}>
          <View style={[ar.chip, { backgroundColor: room.furnished ? "#E3EDF6" : "#F3F4F6" }]}>
            <Ionicons name="cube-outline" size={11} color={room.furnished ? Colors.brand.blue : Colors.text.tertiary} />
            <Text style={[ar.chipText, { color: room.furnished ? Colors.brand.blue : Colors.text.tertiary }]}>
              {room.furnished ? "Furnished" : "Unfurnished"}
            </Text>
          </View>
          {room.petFriendly && (
            <View style={[ar.chip, { backgroundColor: "#E2F0F1" }]}>
              <Ionicons name="paw-outline" size={11} color={Colors.brand.orange} />
              <Text style={[ar.chipText, { color: Colors.brand.orange }]}>Pets OK</Text>
            </View>
          )}
        </View>

        {/* Resident count */}
        <View style={ar.residentRow}>
          <Ionicons name="people-outline" size={12} color={Colors.text.tertiary} />
          <Text style={[ar.residentText, { color: tc.textTertiary }]}>
            {room.currentResidents} resident{room.currentResidents !== 1 ? "s" : ""} · {room.totalRooms}BR · {room.leaseTerm}
          </Text>
          <Text style={ar.genderPref}>{room.genderPref}</Text>
        </View>
      </Pressable>

      {/* CTA row — hidden for the listing owner */}
      {!isOwner && (
        <View style={[ar.ctaRow, isDark && { borderTopColor: tc.borderLight }]}>
          <Pressable
            style={[ar.msgBtn, !room.hostId && { opacity: 0.4 }]}
            disabled={!room.hostId}
            onPress={() => {
              if (!room.hostId) { appAlert("Host unavailable", "This host's contact info is not available."); return; }
              router.push({ pathname: "/chat", params: { recipientId: room.hostId, recipientName: room.hostName, recipientType: "room-host", returnTo: "housing" } } as any);
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={Colors.brand.blue} />
            <Text style={ar.msgBtnText}>Message Host</Text>
          </Pressable>
          <Pressable
            style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
            onPress={!requested ? onRequest : undefined}
          >
            <LinearGradient
              colors={requested ? ["#F59E0B", "#D97706"] : [Colors.brand.blue, Colors.brand.green]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={ar.requestBtn}
            >
              <Ionicons name={requested ? "time-outline" : "key-outline"} size={14} color="#FFF" />
              <Text style={ar.requestBtnText}>{requested ? "Request Sent" : "Request to Move In"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}
