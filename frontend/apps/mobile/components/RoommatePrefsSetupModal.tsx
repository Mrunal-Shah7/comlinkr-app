import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { DatePickerField } from "./DateTimePickerField";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { rs } from "../src/utils/responsive";
import { updateRoommatePreferences } from "../src/api/roommates.api";
import type { UpdateRoommatePreferencesPayload } from "../src/utils/roommatePrefsMap";
import { ApiError } from "../src/api/client";
import { useAuthStore } from "../src/store/auth.store";

const SLEEP_OPTIONS = [
  { label: "Early Bird", value: "EARLY_BIRD" as const },
  { label: "Night Owl", value: "NIGHT_OWL" as const },
  { label: "Flexible", value: "FLEXIBLE" as const },
];
const CLEAN_OPTIONS = [
  { label: "Very Clean", value: "CLEAN" as const },
  { label: "Moderate", value: "MODERATE" as const },
  { label: "Relaxed", value: "RELAXED" as const },
];
const NOISE_OPTIONS = [
  { label: "Quiet", value: "QUIET" as const },
  { label: "Moderate", value: "MODERATE" as const },
  { label: "Social", value: "SOCIAL" as const },
];
const GUEST_OPTIONS = [
  { label: "Never", value: "NEVER" as const },
  { label: "Occasionally", value: "OCCASIONALLY" as const },
  { label: "Frequently", value: "FREQUENTLY" as const },
];

type Props = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSkipSession: () => void;
  onSaved: () => void;
};

export function RoommatePrefsSetupModal({ visible, userId, onClose, onSkipSession, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const { tc } = useTheme();
  const updateRoommatePrefs = useAuthStore((s) => s.updateRoommatePrefs);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [isLooking, setIsLooking] = useState(false);

  const [sleepSchedule, setSleepSchedule] = useState<string | undefined>(undefined);
  const [cleanliness, setCleanliness] = useState<string | undefined>(undefined);
  const [noiseTolerance, setNoiseTolerance] = useState<string | undefined>(undefined);
  const [guestsFrequency, setGuestsFrequency] = useState<string | undefined>(undefined);

  const [petFriendly, setPetFriendly] = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [workFromHome, setWorkFromHome] = useState(false);
  const [aboutMe, setAboutMe] = useState("");

  const resetAndClose = () => {
    setStep(1);
    setErr(null);
    onClose();
  };

  const handleSkip = () => {
    onSkipSession();
    resetAndClose();
  };

  const validateStep1 = (): boolean => {
    const hasMin = budgetMin.trim().length > 0;
    const hasMax = budgetMax.trim().length > 0;
    if (hasMin !== hasMax) {
      setErr("Enter both min and max budget, or leave both empty.");
      return false;
    }
    if (hasMin && hasMax) {
      const a = parseInt(budgetMin, 10);
      const b = parseInt(budgetMax, 10);
      if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0 || a > b) {
        setErr("Budget min/max must be valid numbers and min ≤ max.");
        return false;
      }
    }
    setErr(null);
    return true;
  };

  const submit = async () => {
    setErr(null);
    const body: UpdateRoommatePreferencesPayload = {
      isLooking,
      petFriendly,
      smokingAllowed,
      workFromHome,
      aboutMe: aboutMe.trim() || undefined,
    };
    if (budgetMin.trim() && budgetMax.trim()) {
      body.budgetMin = parseInt(budgetMin, 10);
      body.budgetMax = parseInt(budgetMax, 10);
    }
    if (moveInDate.trim()) body.moveInDate = moveInDate.trim().slice(0, 10);
    if (sleepSchedule) body.sleepSchedule = sleepSchedule as UpdateRoommatePreferencesPayload["sleepSchedule"];
    if (cleanliness) body.cleanliness = cleanliness as UpdateRoommatePreferencesPayload["cleanliness"];
    if (noiseTolerance) body.noiseTolerance = noiseTolerance as UpdateRoommatePreferencesPayload["noiseTolerance"];
    if (guestsFrequency) body.guestsFrequency = guestsFrequency as UpdateRoommatePreferencesPayload["guestsFrequency"];

    body.isLooking = true;
    setSaving(true);
    try {
      await updateRoommatePreferences(body);
      // Sync prefs into auth store so match scores recalculate immediately
      await updateRoommatePrefs({
        budgetMin: body.budgetMin,
        budgetMax: body.budgetMax,
        moveInDate: body.moveInDate,
        petFriendly: body.petFriendly,
        smoking: body.smokingAllowed,
        workFromHome: body.workFromHome,
        cleanliness: body.cleanliness?.toLowerCase(),
        sleepSchedule: body.sleepSchedule?.toLowerCase().replace("_", " "),
        noiseLevel: body.noiseTolerance?.toLowerCase(),
        guestPolicy: body.guestsFrequency?.toLowerCase(),
      });
      await AsyncStorage.setItem(`@comlinkr/rm_prefs_done_${userId}`, "1");
      onSaved();
      resetAndClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setErr(null);
    if (step < 3) setStep((s) => s + 1);
    else void submit();
  };

  const goBack = () => {
    setErr(null);
    if (step > 1) setStep((s) => s - 1);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.backdrop, { paddingTop: insets.top + 40 }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
        <View style={[styles.sheet, { backgroundColor: tc.sheetBg, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.stepInd, { color: tc.textTertiary }]}>Step {step} of 3</Text>
            <Pressable onPress={handleSkip} hitSlop={10}>
              <Text style={{ color: Colors.brand.blue, fontWeight: "700", fontSize: 14 }}>Skip for now</Text>
            </Pressable>
          </View>

          {err ? (
            <Text style={styles.errorText}>{err}</Text>
          ) : null}

          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {step === 1 && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Budget & move-in</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.input, { color: tc.textPrimary, borderColor: tc.borderLight, backgroundColor: tc.inputBg }]}
                    placeholder="Min $"
                    placeholderTextColor={tc.textTertiary}
                    keyboardType="numeric"
                    value={budgetMin}
                    onChangeText={setBudgetMin}
                  />
                  <TextInput
                    style={[styles.input, { color: tc.textPrimary, borderColor: tc.borderLight, backgroundColor: tc.inputBg }]}
                    placeholder="Max $"
                    placeholderTextColor={tc.textTertiary}
                    keyboardType="numeric"
                    value={budgetMax}
                    onChangeText={setBudgetMax}
                  />
                </View>
                <DatePickerField
                  value={moveInDate}
                  onChange={setMoveInDate}
                  placeholder="Select move-in date"
                  accentColor="#0076EB"
                  dateFormat="iso"
                  minimumDate={new Date()}
                  style={{ borderColor: tc.borderLight, backgroundColor: tc.inputBg }}
                />
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleTitle, { color: tc.textPrimary }]}>I&apos;m actively looking for a roommate</Text>
                    <Text style={[styles.toggleSub, { color: tc.textSecondary }]}>When on, you can appear in roommate search.</Text>
                  </View>
                  <Switch value={isLooking} onValueChange={setIsLooking} trackColor={{ false: "#D1D5DB", true: Colors.brand.blue }} />
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={{ gap: 16 }}>
                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Lifestyle</Text>
                {[
                  { label: "Sleep schedule", options: SLEEP_OPTIONS, val: sleepSchedule, set: setSleepSchedule },
                  { label: "Cleanliness", options: CLEAN_OPTIONS, val: cleanliness, set: setCleanliness },
                  { label: "Noise tolerance", options: NOISE_OPTIONS, val: noiseTolerance, set: setNoiseTolerance },
                  { label: "Guest frequency", options: GUEST_OPTIONS, val: guestsFrequency, set: setGuestsFrequency },
                ].map((row) => (
                  <View key={row.label}>
                    <Text style={[styles.chipGroupLabel, { color: tc.textSecondary }]}>{row.label}</Text>
                    <View style={styles.chipRow}>
                      {row.options.map((o) => (
                        <Pressable
                          key={o.value}
                          onPress={() => row.set(o.value)}
                          style={[
                            styles.chip,
                            { borderColor: tc.borderLight, backgroundColor: tc.inputBg },
                            row.val === o.value && { backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue },
                          ]}
                        >
                          <Text style={[styles.chipText, { color: tc.textPrimary }]}>{o.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {step === 3 && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>About you</Text>
                {[
                  { title: "Pet friendly", v: petFriendly, set: setPetFriendly },
                  { title: "Smoking allowed", v: smokingAllowed, set: setSmokingAllowed },
                  { title: "Work from home", v: workFromHome, set: setWorkFromHome },
                ].map((t) => (
                  <View key={t.title} style={styles.toggleRow}>
                    <Text style={[styles.toggleTitle, { color: tc.textPrimary }]}>{t.title}</Text>
                    <Switch value={t.v} onValueChange={t.set} trackColor={{ false: "#D1D5DB", true: Colors.brand.blue }} />
                  </View>
                ))}
                <TextInput
                  style={[styles.textArea, { color: tc.textPrimary, borderColor: tc.borderLight, backgroundColor: tc.inputBg }]}
                  placeholder="Tell potential roommates a bit about yourself (optional)"
                  placeholderTextColor={tc.textTertiary}
                  multiline
                  maxLength={500}
                  value={aboutMe}
                  onChangeText={setAboutMe}
                />
                <Text style={{ fontSize: 11, color: tc.textTertiary }}>{aboutMe.length}/500</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footerRow}>
            {step > 1 ? (
              <Pressable onPress={goBack} style={[styles.secondaryBtn, { borderColor: tc.borderLight }]}>
                <Text style={{ color: tc.textPrimary, fontWeight: "700" }}>Back</Text>
              </Pressable>
            ) : (
              <View style={{ width: 88 }} />
            )}
            <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={goNext} disabled={saving}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} style={styles.primaryBtn}>
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{step === 3 ? "Save & Find Roommates" : "Next"}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    paddingHorizontal: rs(20),
    paddingTop: rs(10),
  },
  handle: {
    alignSelf: "center",
    width: rs(44),
    height: rs(5),
    borderRadius: rs(3),
    backgroundColor: "#D1D5DB",
    marginBottom: rs(12),
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rs(12),
  },
  stepInd: { fontSize: rs(13), fontWeight: "600" },
  sectionTitle: { fontSize: rs(17), fontWeight: "800" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: rs(12),
    paddingVertical: rs(12),
    fontSize: rs(15),
  },
  textArea: {
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
    minHeight: rs(100),
    textAlignVertical: "top",
    fontSize: rs(15),
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: rs(12) },
  toggleTitle: { fontSize: rs(15), fontWeight: "700", flex: 1 },
  toggleSub: { fontSize: rs(12), marginTop: rs(2) },
  chipGroupLabel: { fontSize: rs(12), fontWeight: "700", marginBottom: rs(6) },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(8) },
  chip: { paddingHorizontal: rs(12), paddingVertical: rs(8), borderRadius: rs(20), borderWidth: 1 },
  chipText: { fontSize: rs(12), fontWeight: "700" },
  footerRow: { flexDirection: "row", gap: rs(10), marginTop: rs(16), alignItems: "center" },
  secondaryBtn: {
    width: rs(88),
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rs(14),
    borderRadius: rs(12),
    borderWidth: 1,
  },
  primaryBtn: {
    paddingVertical: rs(15),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rs(14),
  },
  primaryBtnText: { color: "#FFF", fontWeight: "800", fontSize: rs(15) },
  errorText: { color: "#DC2626", fontSize: rs(13), marginBottom: rs(8), fontWeight: "600" },
});
