import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { useAuthStore } from "../../../store/auth.store";
import { useGuestLocationStore } from "../../../store/guestLocation.store";

// ── Safe Renting Guide ───────────────────────────────────────────────────────
export type RentingStep = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  market: "UK" | "US" | null;
  title: string;
  desc: string;
};

export const SAFE_RENTING_STEPS: RentingStep[] = [
  {
    icon: "shield-checkmark-outline",
    color: Colors.brand.blue,
    bg: "#EEF5FF",
    market: null,
    title: "Verify before you pay",
    desc: "Always confirm the landlord has a Verified badge. Never pay a deposit without seeing proof of ownership.",
  },
  {
    icon: "home-outline",
    color: Colors.brand.green,
    bg: "#EAFBE9",
    market: null,
    title: "Visit before you commit",
    desc: "Always visit the property in person before paying anything. Refuse to pay anyone who won't let you see the property.",
  },
  {
    icon: "videocam-outline",
    color: "#7C3AED",
    bg: "#F3E8FF",
    market: null,
    title: "Relocating? Ask for a live video walkthrough",
    desc: "If you can't visit in person, message the landlord in-app to arrange a live video call — not a pre-recorded clip. Ask them to pan the camera at your direction and show their photo ID on screen.",
  },
  {
    icon: "lock-closed-outline",
    color: "#059669",
    bg: "#DCFCE7",
    market: null,
    title: "Your deposit is held in escrow — never pay outside the app",
    desc: "ComLinkr holds your security deposit in secure escrow until you physically confirm move-in in-app. If anyone asks you to pay via bank transfer, Zelle, crypto, or gift cards before that point — it is a scam. Report the listing immediately using the 'Report this listing' button.",
  },
  {
    icon: "chatbubble-ellipses-outline",
    color: Colors.brand.blue,
    bg: "#EEF5FF",
    market: null,
    title: "Keep all comms in ComLinkr chat",
    desc: "All messages and agreements are logged in-app. Avoid email or WhatsApp to protect yourself legally.",
  },
  {
    icon: "document-text-outline",
    color: "#7C3AED",
    bg: "#F3E8FF",
    market: null,
    title: "Use the in-app agreement",
    desc: "Sign the digital tenancy agreement within ComLinkr. Never sign a handwritten document outside the platform.",
  },
  // ── US-specific ──
  {
    icon: "card-outline",
    color: "#059669",
    bg: "#DCFCE7",
    market: "US",
    title: "US: Security deposit limits & return",
    desc: "Most states cap deposits at 1–2 months' rent. Landlords must return it within 14–30 days of move-out with an itemised list of any deductions.",
  },
  {
    icon: "people-outline",
    color: "#B45309",
    bg: "#FEF9C3",
    market: "US",
    title: "US: Fair Housing Act protection",
    desc: "Landlords cannot discriminate based on race, religion, national origin, sex, disability, or familial status. File a complaint with HUD (hud.gov) if you face discrimination.",
  },
  {
    icon: "construct-outline",
    color: "#7C3AED",
    bg: "#F3E8FF",
    market: "US",
    title: "US: Right to habitable housing",
    desc: "Landlords must maintain heat, hot water, structural safety, and pest control. Serious unresolved repairs may entitle you to withhold rent — check your state laws.",
  },
  // ── UK-specific ──
  {
    icon: "card-outline",
    color: "#DC2626",
    bg: "#FEE2E2",
    market: "UK",
    title: "UK: Deposit must be protected",
    desc: "Your landlord must place your deposit in a government-approved scheme (DPS, MyDeposits, or TDS) within 30 days or face a penalty of up to 3× the deposit amount.",
  },
  {
    icon: "alert-circle-outline",
    color: "#0076EB",
    bg: "#EEF5FF",
    market: "UK",
    title: "UK: Know your tenant rights",
    desc: "You're entitled to a Gas Safety Record, EPC (min. rating E), and at least 2 months' notice under Section 21 before eviction. Report illegal eviction to your local council.",
  },
  {
    icon: "business-outline",
    color: "#26B324",
    bg: "#EAFBE9",
    market: "UK",
    title: "UK: Check if agent is registered",
    desc: "Lettings agents in England must be registered with an approved redress scheme (Property Ombudsman or PRS) and hold Client Money Protection. Ask to see their certificates.",
  },
];

export function SafeRentingGuide() {
  const [expanded, setExpanded] = useState(false);
  const user = useAuthStore((s) => s.user);
  const guestCountry = useGuestLocationStore((s) => s.country);
  const { isDark, tc } = useTheme();
  // LST-05: only supported markets get market-specific guidance; everyone else gets the neutral guide.
  const country = user?.country || guestCountry;
  const market: "UK" | "US" | null = country === "United Kingdom" ? "UK" : country === "United States" ? "US" : null;

  const visibleSteps = SAFE_RENTING_STEPS.filter(
    (step) => step.market === null || step.market === market
  );

  return (
    <View style={[sg.card, { backgroundColor: tc.cardBg, borderColor: isDark ? tc.borderLight : "#FECACA" }]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={sg.header}
        accessibilityRole="button"
        accessibilityLabel="Safe Renting Guide"
        accessibilityState={{ expanded }}
      >
        <LinearGradient colors={["#DC2626", "#EF4444"]} style={sg.headerIcon}>
          <Ionicons name="warning-outline" size={14} color="#FFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[sg.headerTitle, { color: tc.textPrimary }]}>Safe Renting Guide</Text>
          <Text style={[sg.headerSub, { color: tc.textSecondary }]}>
            {market ? `${market} market — ` : ""}{visibleSteps.length} fraud-prevention steps
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={tc.textTertiary} />
      </Pressable>

      {expanded && (
        <View style={[sg.body, { borderTopColor: tc.borderLight }]}>
          {visibleSteps.map((step, i) => (
            <View key={i} style={sg.step}>
              <View style={[sg.stepIcon, { backgroundColor: isDark ? tc.inputBg : step.bg }]}>
                <Ionicons name={step.icon} size={15} color={step.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={sg.stepTitleRow}>
                  <Text style={[sg.stepTitle, { color: tc.textPrimary }]}>{step.title}</Text>
                  {step.market !== null && (
                    <View style={[sg.marketPill, { backgroundColor: step.market === "UK" ? "#DBEAFE" : "#DCFCE7" }]}>
                      <Text style={[sg.marketPillText, { color: step.market === "UK" ? "#1E40AF" : "#15803D" }]}>
                        {step.market}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[sg.stepDesc, { color: tc.textSecondary }]}>{step.desc}</Text>
              </View>
            </View>
          ))}
          {market === null ? (
            <View style={sg.footer}>
              <Ionicons name="alert-circle-outline" size={13} color={Colors.brand.blue} />
              <Text style={[sg.footerText, { color: tc.textSecondary }]}>
                Deposit, notice and eviction rules differ by country. Check your local tenant-protection authority before paying anything.
              </Text>
            </View>
          ) : null}
          <View style={sg.footer}>
            <Ionicons name="information-circle-outline" size={13} color={Colors.brand.blue} />
            <Text style={sg.footerText}>
              Report suspicious listings by tapping the share icon on any listing card and selecting "Report".
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export const sg = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    overflow: "hidden",
    shadowColor: "#DC2626",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7F1D1D",
  },
  headerSub: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 1,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FECACA",
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: 10,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0A2540",
    flex: 1,
  },
  marketPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  marketPillText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  stepDesc: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 4,
    padding: 10,
    backgroundColor: "#EEF5FF",
    borderRadius: 10,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    color: Colors.brand.blue,
    lineHeight: 16,
  },
});
