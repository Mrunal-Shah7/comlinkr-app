import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { rs } from "../src/utils/responsive";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useGuestLocationStore } from "../src/store/guestLocation.store";
import { CITIES_BY_STATE, STATES_BY_COUNTRY } from "../src/data/locationData";
import { createThemedStyles } from '../src/theme/themedStyles';

const STATE_TO_COUNTRY: Record<string, string> = Object.entries(STATES_BY_COUNTRY).reduce(
  (acc, [country, states]) => {
    for (const state of states) acc[state] = country;
    return acc;
  },
  {} as Record<string, string>,
);

interface CityOption {
  city: string;
  state: string;
  country: string;
  /** e.g. "London" vs "London, Ontario" — only cities with name collisions get the state suffix. */
  label: string;
}

const ALL_CITY_OPTIONS: CityOption[] = (() => {
  const byName = new Map<string, CityOption[]>();
  for (const [state, cities] of Object.entries(CITIES_BY_STATE)) {
    const country = STATE_TO_COUNTRY[state] ?? "";
    for (const city of cities) {
      const opt: CityOption = { city, state, country, label: city };
      if (!byName.has(city)) byName.set(city, []);
      byName.get(city)!.push(opt);
    }
  }
  const options: CityOption[] = [];
  for (const group of byName.values()) {
    if (group.length > 1) {
      for (const opt of group) options.push({ ...opt, label: `${opt.city}, ${opt.state}` });
    } else {
      options.push(group[0]);
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
})();

/** Full-screen city search/picker — reused by the banner and the tappable hero city pill. */
export function GuestCityPickerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const setCity = useGuestLocationStore((s) => s.setCity);
  const { tc: tcTheme } = useTheme();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? ALL_CITY_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(search.trim().toLowerCase()))
    : ALL_CITY_OPTIONS;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close city picker">
            <Ionicons name="close" size={24} color={tcTheme.textPrimary} />
          </Pressable>
          <Text style={styles.modalTitle}>Choose your city</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for your city"
            placeholderTextColor={Colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.city}|${item.state}|${item.country}`}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={30}
          windowSize={10}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.cityRow, pressed && { backgroundColor: "#F5F9FF" }]}
              onPress={() => {
                void setCity(item.city, { state: item.state, country: item.country });
                onClose();
                setSearch("");
              }}
            >
              <Ionicons name="location-outline" size={16} color={Colors.brand.blue} />
              <Text style={styles.cityRowText}>{item.label}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No cities found — try a different search.</Text>
          }
        />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/** Dismissible banner prompting a browsing guest to pick a city (never blocks browsing). */
export function GuestCityBanner() {
  const city = useGuestLocationStore((s) => s.city);
  const [dismissed, setDismissed] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  if (city || dismissed) return null;

  return (
    <>
      <View style={styles.banner}>
        <LinearGradient colors={["#EEF6FF", "#F0FAF0"]} style={StyleSheet.absoluteFill} />
        <View style={styles.iconBox}>
          <Ionicons name="location" size={rs(14)} color="#FFF" />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Set your city</Text>
          <Text style={styles.bannerDesc}>See what's happening near you</Text>
        </View>
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [styles.setBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.setBtnText}>Set</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={rs(16)} color={Colors.text.tertiary} />
        </Pressable>
      </View>

      <GuestCityPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} />
    </>
  );
}

const styles = createThemedStyles({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    padding: rs(12),
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: "#BFDBFE",
    overflow: "hidden",
    marginHorizontal: rs(14),
    marginTop: rs(12),
    marginBottom: rs(12),
  },
  iconBox: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.brand.blue,
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: rs(12), fontWeight: "700", color: "#0A2550" },
  bannerDesc: { fontSize: rs(11), fontWeight: "500", color: "#3B5578", marginTop: 1 },
  setBtn: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    borderRadius: rs(8),
    backgroundColor: Colors.brand.blue,
  },
  setBtnText: { fontSize: rs(11), fontWeight: "800", color: "#FFF" },
  closeBtn: { padding: rs(2) },

  modalSafe: { flex: 1, backgroundColor: "#FFF" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(18),
    paddingVertical: rs(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: rs(16), fontWeight: "800", color: Colors.text.primary },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
    margin: rs(16),
    paddingHorizontal: rs(14),
    height: rs(46),
    borderRadius: rs(12),
    backgroundColor: "#F3F4F6",
  },
  searchInput: { flex: 1, fontSize: rs(14), color: Colors.text.primary },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    paddingHorizontal: rs(18),
    paddingVertical: rs(13),
  },
  cityRowText: { fontSize: rs(14), fontWeight: "600", color: Colors.text.primary },
  emptyText: {
    textAlign: "center",
    marginTop: rs(40),
    fontSize: rs(13),
    color: Colors.text.tertiary,
  },
});
