import { palette } from "../../../theme/palette";
import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from "react-native";
import { DSheet } from "../../../shared/d/Sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { useAuthStore } from "../../../store/auth.store";
import { getCurrencyForCountry } from "../../../utils/currency";
import { getUserCurrencyCode } from "../utils";
import { ar } from "../styles/availableRoom.styles";

// ── List Your Space Modal ─────────────────────────────────────────────────────
export function ListYourSpaceModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const currencyCode = getUserCurrencyCode(user);
  const currencySymbol = getCurrencyForCountry(
    (user as { userLocation?: { countryCode?: string | null } | null; country?: string | null } | null)?.userLocation?.countryCode ??
      ((user as { country?: string | null } | null)?.country === "United Kingdom" ? "GB" : "US"),
  ).symbol;
  const [roomType, setRoomType] = useState<"Private Room" | "Shared Room" | "Full Apartment">("Private Room");
  const [rent, setRent] = useState("");
  const [availFrom, setAvailFrom] = useState("");
  const [desc, setDesc] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [privateBath, setPrivateBath] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { isDark, tc } = useTheme();

  const reset = () => {
    setRoomType("Private Room");
    setRent(""); setAvailFrom(""); setDesc("");
    setFurnished(false); setPrivateBath(false);
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!rent.trim() || !availFrom.trim()) return;
    setSubmitted(true);
    setTimeout(() => { onSubmit(); reset(); }, 2000);
  };

  const ROOM_TYPES: Array<"Private Room" | "Shared Room" | "Full Apartment"> = ["Private Room", "Shared Room", "Full Apartment"];

  return (
    <DSheet visible={visible} onClose={reset} full>
        <View style={{ flex: 1, backgroundColor: tc.sheetBg }}>
          {/* Header */}
          <LinearGradient
            colors={[Colors.brand.blue, Colors.brand.green]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ margin: 14, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="home" size={22} color={palette.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "900", color: palette.white }}>List Your Space</Text>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Share your spare room with neighbours</Text>
            </View>
            <Pressable onPress={reset} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={17} color={palette.white} />
            </Pressable>
          </LinearGradient>

          {submitted ? (
            <View style={{ alignItems: "center", padding: 36 }}>
              <LinearGradient colors={[Colors.brand.green, palette.green600]} style={{ width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="checkmark" size={40} color={palette.white} />
              </LinearGradient>
              <Text style={{ fontSize: 20, fontWeight: "900", color: tc.textPrimary, marginBottom: 8 }}>Space Listed!</Text>
              <Text style={{ fontSize: 14, color: tc.textSecondary, textAlign: "center", lineHeight: 20 }}>
                Your room is now visible to people looking for a place to move in. We'll notify you when someone requests to view it.
              </Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {/* Room type selector */}
              <Text style={[ar.listLabel, { color: tc.textTertiary }]}>Room Type</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {ROOM_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setRoomType(t)}
                    style={{
                      flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center",
                      backgroundColor: roomType === t ? Colors.brand.blue : (isDark ? tc.inputBg : palette.white),
                      borderWidth: 1.5, borderColor: roomType === t ? Colors.brand.blue : (isDark ? tc.borderLight : palette.gray200),
                    }}
                  >
                    <Ionicons
                      name={t === "Private Room" ? "bed-outline" : t === "Shared Room" ? "people-outline" : "home-outline"}
                      size={18}
                      color={roomType === t ? palette.white : Colors.text.tertiary}
                    />
                    <Text style={{ fontSize: 10, fontWeight: "700", color: roomType === t ? palette.white : Colors.text.secondary, marginTop: 4, textAlign: "center" }}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Rent input */}
              <Text style={[ar.listLabel, { color: tc.textTertiary }]}>{`Monthly Rent (${currencyCode})`}</Text>
              <View style={[ar.listInput, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.text.tertiary }}>{currencySymbol}</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: tc.textPrimary, fontWeight: "600" }}
                  placeholder="e.g. 1200"
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="number-pad"
                  value={rent}
                  onChangeText={setRent}
                />
              </View>

              {/* Available from */}
              <Text style={[ar.listLabel, { color: tc.textTertiary }]}>Available From</Text>
              <View style={[ar.listInput, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                <Ionicons name="calendar-outline" size={16} color={Colors.text.tertiary} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: tc.textPrimary, fontWeight: "500" }}
                  placeholder="e.g. Apr 1, 2026 or Immediate"
                  placeholderTextColor={Colors.text.tertiary}
                  value={availFrom}
                  onChangeText={setAvailFrom}
                />
              </View>

              {/* Toggles */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                <Pressable
                  onPress={() => setFurnished((v) => !v)}
                  style={[ar.toggle, !furnished && isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, furnished && { backgroundColor: Colors.brand.blue + "18", borderColor: Colors.brand.blue }]}
                >
                  <Ionicons name="cube-outline" size={16} color={furnished ? Colors.brand.blue : Colors.text.tertiary} />
                  <Text style={[ar.toggleText, { color: tc.textSecondary }, furnished && { color: Colors.brand.blue }]}>Furnished</Text>
                  {furnished && <Ionicons name="checkmark-circle" size={14} color={Colors.brand.blue} />}
                </Pressable>
                <Pressable
                  onPress={() => setPrivateBath((v) => !v)}
                  style={[ar.toggle, !privateBath && isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, privateBath && { backgroundColor: Colors.brand.green + "18", borderColor: Colors.brand.green }]}
                >
                  <Ionicons name="water-outline" size={16} color={privateBath ? Colors.brand.green : Colors.text.tertiary} />
                  <Text style={[ar.toggleText, { color: tc.textSecondary }, privateBath && { color: Colors.brand.green }]}>Private Bath</Text>
                  {privateBath && <Ionicons name="checkmark-circle" size={14} color={Colors.brand.green} />}
                </Pressable>
              </View>

              {/* Description */}
              <Text style={[ar.listLabel, { color: tc.textTertiary }]}>Tell people about the space (optional)</Text>
              <View style={[ar.listInput, { height: 90, alignItems: "flex-start", paddingTop: 12 }, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: tc.textPrimary, lineHeight: 20 }}
                  placeholder="Describe your apartment, vibe, what you're looking for in a roommate..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                  value={desc}
                  onChangeText={setDesc}
                />
              </View>

              <View style={{ height: 8 }} />
            </ScrollView>
          )}

          {!submitted && (
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: isDark ? tc.cardBg : palette.white, borderTopWidth: 1, borderTopColor: isDark ? tc.borderLight : palette.neutralL95_5 }}>
              <Pressable
                onPress={handleSubmit}
                disabled={!rent.trim() || !availFrom.trim()}
                style={{ borderRadius: 14, overflow: "hidden", opacity: (!rent.trim() || !availFrom.trim()) ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={[Colors.brand.blue, Colors.brand.green]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 }}
                >
                  <Ionicons name="home" size={18} color={palette.white} />
                  <Text style={{ fontSize: 15, fontWeight: "900", color: palette.white }}>Post My Space</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>
    </DSheet>
  );
}
