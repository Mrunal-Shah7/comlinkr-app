import { palette } from "../src/theme/palette";
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, TextInput, FlatList, KeyboardAvoidingView } from "react-native";
import { DSheet } from "../src/shared/d/Sheet";
import { TYPE } from "../src/theme/d";
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

  const current = useGuestLocationStore((s) => s.city);
  // Design D `city`: "Your city" in the D sheet; search, then rows with a pin; the current city has a check.
  return (
    <DSheet visible={visible} onClose={onClose} title="Your city" full>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 18, marginBottom: 12, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tcTheme.inputBg }}>
          <Ionicons name="search" size={18} color={tcTheme.textTertiary} />
          <TextInput
            style={[TYPE.body, { flex: 1, color: tcTheme.textPrimary, paddingVertical: 0 }]}
            placeholder="Search a city"
            placeholderTextColor={tcTheme.textTertiary}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search a city"
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.city}|${item.state}|${item.country}`}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={30}
          windowSize={10}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const on = current === item.city;
            return (
              <Pressable
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12 }, pressed && { backgroundColor: tcTheme.inputBg }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  void setCity(item.city, { state: item.state, country: item.country });
                  onClose();
                  setSearch("");
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: tcTheme.accentSoft }}>
                  <Ionicons name="location-outline" size={18} color={tcTheme.accentText} />
                </View>
                <Text style={[TYPE.body, { flex: 1, color: tcTheme.textPrimary }]}>{item.label}</Text>
                {on ? <Ionicons name="checkmark" size={20} color={tcTheme.mint} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={[TYPE.body, { color: tcTheme.textSecondary, paddingHorizontal: 18, paddingTop: 12 }]}>No city matches that. Try another spelling.</Text>}
        />
      </KeyboardAvoidingView>
    </DSheet>
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
        <LinearGradient colors={[palette.skyL97, palette.neutralL96_3]} style={StyleSheet.absoluteFill} />
        <View style={styles.iconBox}>
          <Ionicons name="location" size={rs(14)} color={palette.white} />
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
    borderColor: palette.blue200,
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
  bannerTitle: { fontSize: rs(12), fontWeight: "700", color: palette.blueL18 },
  bannerDesc: { fontSize: rs(11), fontWeight: "500", color: palette.skyL35, marginTop: 1 },
  setBtn: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    borderRadius: rs(8),
    backgroundColor: Colors.brand.blue,
  },
  setBtnText: { fontSize: rs(11), fontWeight: "800", color: palette.white },
  closeBtn: { padding: rs(2) },

  modalSafe: { flex: 1, backgroundColor: palette.white },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(18),
    paddingVertical: rs(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
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
    backgroundColor: palette.gray100,
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
