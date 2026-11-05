import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { type Listing } from "../listingModel";

// ── Remote Viewing Panel ──────────────────────────────────────────────────────
export const REMOTE_VIEWING_CHECKLIST = [
  { icon: "home-outline" as const,          text: "Walk through every room — including storage, garage, or basement" },
  { icon: "business-outline" as const,      text: "Check building exterior and entrance match the listing photos" },
  { icon: "water-outline" as const,         text: "Run taps and flush toilets to check water pressure and drainage" },
  { icon: "flash-outline" as const,         text: "Test light switches and confirm all visible appliances are working" },
  { icon: "cloud-outline" as const,         text: "Inspect walls and ceilings for damp, mould, or water stains" },
  { icon: "lock-closed-outline" as const,   text: "Check door locks, window latches, and any security features" },
  { icon: "map-outline" as const,           text: "Ask for a view from windows to get a feel for the neighbourhood" },
  { icon: "car-outline" as const,           text: "Confirm parking, bin areas, and shared spaces if applicable" },
  { icon: "chatbubble-outline" as const,    text: "Ask about move-in date, included utilities, and lease length" },
  { icon: "pricetag-outline" as const,      text: "Clarify pet policy, subletting rules, and what's negotiable" },
];

export function RemoteViewingPanel({
  listing,
  videoTourRequested,
  onRequestVideoTour,
  showRequestButton = true,
  videoTourLoading = false,
}: {
  listing: Listing;
  videoTourRequested: boolean;
  onRequestVideoTour: () => void;
  /** When false, hide the CTA (e.g. owner or non-available listing). */
  showRequestButton?: boolean;
  videoTourLoading?: boolean;
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checked,       setChecked]       = useState<boolean[]>(
    REMOTE_VIEWING_CHECKLIST.map(() => false),
  );
  const { isDark, tc } = useTheme();

  const checkedCount = checked.filter(Boolean).length;

  const toggleCheck = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  return (
    <View style={[rvp.wrap, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={rvp.header}>
        <LinearGradient colors={["#7C3AED", "#6D28D9"]} style={rvp.headerIcon}>
          <Ionicons name="videocam-outline" size={14} color="#FFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[rvp.headerTitle, isDark && { color: tc.textPrimary }]}>Can't Visit in Person?</Text>
          <Text style={rvp.headerSub}>Request a secure live video tour</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9CA3AF"
        />
      </Pressable>

      {expanded && (
        <View style={rvp.body}>
          {/* Trust note */}
          <View style={rvp.trustNote}>
            <Ionicons name="shield-checkmark" size={13} color="#7C3AED" />
            <Text style={rvp.trustNoteText}>
              ComLinkr recommends completing a live video tour before paying any deposit. Tours are logged and time-stamped for your protection.
            </Text>
          </View>

          {/* Request video tour button */}
          {!showRequestButton ? null : videoTourRequested ? (
            <View style={rvp.requestedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#30855B" />
              <Text style={rvp.requestedText}>
                Video Tour Requested — awaiting landlord confirmation
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={videoTourLoading ? undefined : onRequestVideoTour}
              style={{ borderRadius: 14, overflow: "hidden", opacity: videoTourLoading ? 0.7 : 1 }}
            >
              <LinearGradient
                colors={["#7C3AED", "#6D28D9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={rvp.requestBtn}
              >
                {videoTourLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="videocam-outline" size={17} color="#FFF" />
                    <Text style={rvp.requestBtnText}>Request Live Video Tour</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}

          {/* Escrow note */}
          <View style={rvp.escrowNote}>
            <Ionicons name="lock-closed-outline" size={13} color="#059669" />
            <Text style={rvp.escrowNoteText}>
              Your deposit is held in ComLinkr secure escrow until move-in is confirmed in-app. Never pay anyone directly outside the platform.
            </Text>
          </View>

          {/* Checklist toggle */}
          <Pressable
            onPress={() => setChecklistOpen((v) => !v)}
            style={rvp.checklistToggle}
          >
            <Text style={[rvp.checklistToggleText, isDark && { color: tc.textSecondary }]}>
              Video Tour Safety Checklist
            </Text>
            <View style={rvp.checklistBadge}>
              <Text style={rvp.checklistBadgeText}>
                {checkedCount}/{REMOTE_VIEWING_CHECKLIST.length}
              </Text>
            </View>
            <Ionicons
              name={checklistOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color="#6B7280"
            />
          </Pressable>

          {checklistOpen && (
            <View style={rvp.checklistBody}>
              {REMOTE_VIEWING_CHECKLIST.map((item, i) => (
                <Pressable
                  key={i}
                  onPress={() => toggleCheck(i)}
                  style={rvp.checkItem}
                >
                  <View style={[rvp.checkBox, checked[i] && rvp.checkBoxDone]}>
                    {checked[i] && (
                      <Ionicons name="checkmark" size={11} color="#FFF" />
                    )}
                  </View>
                  <View
                    style={[
                      rvp.checkIconBox,
                      { backgroundColor: checked[i] ? "#DCFCE7" : "#F3E8FF" },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={12}
                      color={checked[i] ? "#30855B" : "#7C3AED"}
                    />
                  </View>
                  <Text
                    style={[
                      rvp.checkItemText,
                      isDark && { color: tc.textSecondary },
                      checked[i] && rvp.checkItemDone,
                    ]}
                    numberOfLines={3}
                  >
                    {item.text}
                  </Text>
                </Pressable>
              ))}
              {checkedCount === REMOTE_VIEWING_CHECKLIST.length && (
                <View style={rvp.allDoneBanner}>
                  <Ionicons name="shield-checkmark" size={14} color="#30855B" />
                  <Text style={rvp.allDoneText}>
                    All checks complete — you're ready to apply safely!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export const rvp = StyleSheet.create({
  wrap: {
    marginTop: 22,
    backgroundColor: "#FAF5FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4B5563",
  },
  headerSub: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "600",
    marginTop: 1,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  trustNote: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#F3E8FF",
    borderRadius: 10,
    padding: 10,
  },
  trustNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#5B21B6",
    lineHeight: 17,
    fontWeight: "500",
  },
  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
  },
  requestBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  requestedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  requestedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  escrowNote: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  escrowNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#065F46",
    lineHeight: 17,
    fontWeight: "500",
  },
  checklistToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E9D5FF",
    marginTop: 2,
  },
  checklistToggleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  checklistBadge: {
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  checklistBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  checklistBody: {
    gap: 6,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxDone: {
    backgroundColor: "#30855B",
    borderColor: "#30855B",
  },
  checkIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  checkItemText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
    lineHeight: 17,
  },
  checkItemDone: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  allDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  allDoneText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
});
