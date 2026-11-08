import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { useRequireAuth } from "../../../shared/hooks/useRequireAuth";
import { ApiError } from "../../../api/client";
import { rs } from "../../../utils/responsive";
import { reportHousingListing } from "../../../api/housing.api";
import { showToast } from "../../../shared/ui/Toast";

// ── Report Listing Modal ──────────────────────────────────────────────────────
export const REPORT_REASONS = [
  { icon: "information-circle-outline" as const, label: "Incorrect or misleading information" },
  { icon: "warning-outline" as const, label: "Spam or scam" },
  { icon: "home-outline" as const, label: "Already rented / no longer available" },
  { icon: "copy-outline" as const, label: "Duplicate listing" },
  { icon: "alert-circle-outline" as const, label: "Inappropriate content" },
  { icon: "ellipsis-horizontal-outline" as const, label: "Other" },
];

export function ReportListingModal({
  visible,
  listingId,
  listingTitle,
  onClose,
}: {
  visible: boolean;
  listingId: string;
  listingTitle: string;
  onClose: () => void;
}) {
  const [selected,  setSelected]  = useState<string | null>(null);
  const [details,   setDetails]   = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { isDark, tc } = useTheme();
  const { requireAuth } = useRequireAuth();

  const handleSubmit = async () => {
    if (!selected) {
      showToast("Please choose a reason for your report.", "error");
      return;
    }
    if (!requireAuth(undefined, "Sign in to report this listing.")) return;
    try {
      setSubmitting(true);
      const reason = details.trim().length > 0 ? `${selected}: ${details.trim()}` : selected;
      await reportHousingListing(listingId, reason);
      setSubmitted(true);
    } catch (error) {
      showToast(
        error instanceof ApiError ? error.message : "Could not submit report. Please try again.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelected(null);
    setDetails("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={rp.overlay}>
        <View style={[rp.sheet, isDark && { backgroundColor: tc.sheetBg }]}>
          {/* Header */}
          <View style={rp.header}>
            <LinearGradient
              colors={["#DC2626", "#B91C1C"]}
              style={rp.headerIcon}
            >
              <Ionicons name="flag-outline" size={14} color="#FFF" />
            </LinearGradient>
            <Text style={[rp.headerTitle, isDark && { color: tc.textPrimary }]}>Report Listing</Text>
            <Pressable onPress={handleClose} style={[rp.closeBtn, isDark && { backgroundColor: tc.inputBg }]}>
              <Ionicons name="close" size={18} color="#6B7280" />
            </Pressable>
          </View>

          {submitted ? (
            <View style={rp.successBody}>
              <LinearGradient
                colors={["#30855B", "#16A34A"]}
                style={rp.successIcon}
              >
                <Ionicons name="shield-checkmark" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={rp.successTitle}>Report Submitted</Text>
              <Text style={rp.successDesc}>
                Thank you for helping keep ComLinkr safe. Our Trust & Safety team will review this listing within 24 hours. If found in violation, it will be immediately removed and the landlord's badge revoked.
              </Text>
              <Pressable
                onPress={handleClose}
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  marginTop: 20,
                  alignSelf: "stretch",
                }}
              >
                <LinearGradient
                  colors={["#30855B", "#16A34A"]}
                  style={rp.doneBtn}
                >
                  <Text style={rp.doneBtnText}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[rp.listingName, isDark && { color: tc.textSecondary }]} numberOfLines={2}>
                "{listingTitle}"
              </Text>
              <Text style={[rp.sectionLabel, isDark && { color: tc.textSecondary }]}>
                What's wrong with this listing?
              </Text>

              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason.label}
                  onPress={() => setSelected(reason.label)}
                  style={[
                    rp.reasonRow,
                    isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight },
                    selected === reason.label && rp.reasonRowActive,
                  ]}
                >
                  <View
                    style={[
                      rp.reasonIcon,
                      {
                        backgroundColor:
                          selected === reason.label ? "#FEE2E2" : "#F5F7FA",
                      },
                    ]}
                  >
                    <Ionicons
                      name={reason.icon}
                      size={14}
                      color={
                        selected === reason.label ? "#DC2626" : "#6B7280"
                      }
                    />
                  </View>
                  <Text
                    style={[
                      rp.reasonText,
                      isDark && { color: tc.textSecondary },
                      selected === reason.label && rp.reasonTextActive,
                    ]}
                  >
                    {reason.label}
                  </Text>
                  <View
                    style={[
                      rp.radio,
                      selected === reason.label && rp.radioDone,
                    ]}
                  >
                    {selected === reason.label && (
                      <View style={rp.radioDot} />
                    )}
                  </View>
                </Pressable>
              ))}

              <Text style={[rp.sectionLabel, { marginTop: 18 }, isDark && { color: tc.textSecondary }]}>
                Additional details (optional)
              </Text>
              <TextInput
                style={[rp.detailsInput, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]}
                value={details}
                onChangeText={setDetails}
                placeholder="Describe what happened..."
                placeholderTextColor={tc.textTertiary}
                multiline
                numberOfLines={4}
              />

              <View style={[rp.anonNote, isDark && { backgroundColor: tc.inputBg }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={12}
                  color="#6B7280"
                />
                <Text style={[rp.anonNoteText, isDark && { color: tc.textSecondary }]}>
                  Your report is anonymous. The landlord will not be notified of who filed it.
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: rs(10), marginTop: rs(16) }}>
                <Pressable
                  onPress={handleClose}
                  style={{ flex: 1, paddingVertical: rs(14), borderRadius: rs(12), alignItems: "center", borderWidth: 1.5, borderColor: tc.borderLight, backgroundColor: tc.inputBg }}
                >
                  <Text style={{ fontSize: rs(14), fontWeight: "700", color: tc.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSubmit()}
                  disabled={submitting || !selected}
                  style={{ flex: 1, borderRadius: rs(12), overflow: "hidden", opacity: submitting || !selected ? 0.7 : 1 }}
                >
                  <LinearGradient
                    colors={["#DC2626", "#B91C1C"]}
                    style={rp.submitBtn}
                  >
                    <Ionicons name="flag-outline" size={16} color="#FFF" />
                    <Text style={rp.submitBtnText}>{submitting ? "Submitting..." : "Submit Report"}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export const rp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "86%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  listingName: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
    fontStyle: "italic",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 6,
  },
  reasonRowActive: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FCA5A5",
  },
  reasonIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  reasonTextActive: {
    color: "#DC2626",
    fontWeight: "700",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDone: {
    borderColor: "#DC2626",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  detailsInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 13,
    color: "#111827",
    height: 90,
    textAlignVertical: "top",
  },
  anonNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 10,
  },
  anonNoteText: {
    flex: 1,
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
  successBody: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  successIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  successDesc: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },
  doneBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
});
