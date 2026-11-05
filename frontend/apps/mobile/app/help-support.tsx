import { rs } from "../src/utils/responsive";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/useTheme";
import { createThemedStyles } from '../src/theme/themedStyles';

const BRAND_BLUE = "#1A6BAE";
const BRAND_GREEN = "#30855B";

// ── FAQ Data ──
const FAQ_SECTIONS = [
  {
    title: "Getting Started",
    icon: "rocket-outline" as const,
    items: [
      { q: "How do I create an account?", a: "Tap \"Sign Up\" on the welcome screen. You can register with your email, Google, or Apple ID. Fill in your name, city, and a short bio to get started." },
      { q: "How do I set up my profile?", a: "Go to your profile from the hamburger menu or the bottom tab. Tap \"Edit Profile\" to add your photo, bio, interests, and neighborhood." },
      { q: "Is ComLinkr free to use?", a: "Yes! ComLinkr is completely free to use, including posts, events, messaging, and listings." },
    ],
  },
  {
    title: "Feed & Posts",
    icon: "newspaper-outline" as const,
    items: [
      { q: "How do I create a post?", a: "Tap the \"+\" button on the bottom tab bar. Choose your post type (text, photo, event, listing, or poll), add your content, and tap \"Post\"." },
      { q: "How do I report inappropriate content?", a: "Tap the three-dot menu on any post and select \"Report\". Choose a reason and our moderation team will review it within 24 hours." },
      { q: "Why can't I see posts from other cities?", a: "ComLinkr is community-focused. Your feed shows content from your selected city. You can change your city from the feed hero section at any time." },
    ],
  },
  {
    title: "Housing & Listings",
    icon: "home-outline" as const,
    items: [
      { q: "How do I list my property?", a: "Go to \"Create Post\" and select \"Housing Listing\". Fill in the details like rent, bedrooms, amenities, and photos. Your listing will be visible to the community." },
      { q: "How does roommate matching work?", a: "Go to the Housing tab and switch to \"Find Roommates\". Our algorithm matches you based on lifestyle preferences, budget range, and shared interests." },
      { q: "How do I contact a landlord?", a: "On any listing card, tap the chat icon to send a direct message to the landlord. You can also tap \"View Full Details\" for more info." },
    ],
  },
  {
    title: "Account & Privacy",
    icon: "shield-outline" as const,
    items: [
      { q: "How do I change my password?", a: "Go to Settings → Account Security → Change Password. You'll need to enter your current password before setting a new one." },
      { q: "How do I delete my account?", a: "Go to Settings → Account → Delete Account. This action is permanent and will remove all your data, posts, and messages." },
      { q: "Who can see my profile?", a: "Your profile is visible to other ComLinkr members in your city. You can adjust visibility settings in Settings → Privacy." },
    ],
  },
];

const CONTACT_OPTIONS = [
  { id: "email", icon: "mail-outline" as const, label: "Email Us", desc: "support@comlinkr.com", color: BRAND_BLUE, action: () => Linking.openURL("mailto:support@comlinkr.com") },
  { id: "instagram", icon: "logo-instagram" as const, label: "Instagram", desc: "@comlinkr", color: "#E1306C", action: () => Linking.openURL("https://www.instagram.com/comlinkr?igsh=czM3bmtsMmdtM3dr") },
  { id: "linkedin", icon: "logo-linkedin" as const, label: "LinkedIn", desc: "ComLinkr", color: "#0A66C2", action: () => Linking.openURL("https://www.linkedin.com/company/comlinkr/") },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const { isDark, tc } = useTheme();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());

  const toggleSection = (idx: number) => {
    setExpandedSection(expandedSection === idx ? null : idx);
    setExpandedItem(null);
  };

  const toggleItem = (key: string) => {
    setExpandedItem(expandedItem === key ? null : key);
  };

  const markHelpful = (key: string) => {
    setHelpfulIds((p) => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  // Filter FAQs based on search
  const filteredSections = (() => {
    let sections = FAQ_SECTIONS;
    if (searchQuery.trim()) {
      sections = sections.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.a.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((section) => section.items.length > 0);
    }
    return sections;
  })();

  const totalFaqs = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} style={({ pressed }) => [s.backBtn, { backgroundColor: tc.sectionBg }, pressed && { opacity: 0.8, transform: [{ scale: 0.9 }] }]}>
          <Ionicons name="chevron-back" size={20} color={BRAND_BLUE} />
        </Pressable>
        <Text style={[s.headerTitle, { color: tc.textPrimary }]}>Help & Support</Text>
        <View style={{ width: rs(40) }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={[s.scroll, { backgroundColor: tc.pageBg }]}
        contentContainerStyle={[s.content, { backgroundColor: tc.pageBg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero banner */}
        <LinearGradient
          colors={[BRAND_BLUE, "#005BE0", BRAND_GREEN]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroBg1} />
          <View style={s.heroBg2} />
          <View style={s.heroIconContainer}>
            <View style={s.heroIconRing}>
              <Ionicons name="help-buoy-outline" size={36} color="#FFF" />
            </View>
          </View>
          <Text style={s.heroTitle}>How can we help?</Text>
          <Text style={s.heroSub}>Find answers to common questions or get in touch with our team.</Text>
          {/* Inline Search */}
          <View style={s.heroSearch}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
            <TextInput
              style={s.heroSearchInput}
              placeholder="Search for help..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>
            )}
          </View>
        </LinearGradient>

        {/* FAQ Sections */}
        <View style={s.faqContainer}>
          <View style={s.faqHeaderRow}>
            <Text style={[s.sectionHeader, { color: tc.textPrimary }]}>Frequently Asked Questions</Text>
            <View style={s.faqCountPill}>
              <Text style={s.faqCountPillText}>{totalFaqs} FAQs</Text>
            </View>
          </View>

          {filteredSections.length === 0 && (
            <View style={s.emptyState}>
              <View style={[s.emptyIconWrap, { backgroundColor: tc.sectionBg }]}>
                <Ionicons name="search-outline" size={36} color="#D1D5DB" />
              </View>
              <Text style={[s.emptyText, { color: tc.textSecondary }]}>No results found{searchQuery ? ` for "${searchQuery}"` : ""}</Text>
              <Text style={[s.emptySubtext, { color: tc.textTertiary }]}>Try a different search or browse by topic above</Text>
              <Pressable onPress={() => { setSearchQuery(""); }} style={s.emptyBtn}>
                <Text style={s.emptyBtnText}>Clear Filters</Text>
              </Pressable>
            </View>
          )}

          {filteredSections.map((section, sIdx) => (
            <View key={section.title} style={[s.faqSection, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, expandedSection === sIdx && s.faqSectionActive]}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => toggleSection(sIdx)}>
                <View style={s.faqSectionHeader}>
                  <View style={s.faqSectionLeft}>
                    <View style={[s.faqIconBox, { backgroundColor: expandedSection === sIdx ? BRAND_BLUE : BRAND_BLUE + "14" }]}>
                      <Ionicons name={section.icon} size={18} color={expandedSection === sIdx ? "#FFF" : BRAND_BLUE} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.faqSectionTitle, { color: tc.textPrimary }, expandedSection === sIdx && { color: BRAND_BLUE }]}>{section.title}</Text>
                      <Text style={[s.faqSectionSub, { color: tc.textTertiary }]}>{section.items.length} question{section.items.length !== 1 ? "s" : ""}</Text>
                    </View>
                  </View>
                  <View style={[s.chevronCircle, { backgroundColor: tc.sectionBg }, expandedSection === sIdx && s.chevronCircleActive]}>
                    <Ionicons name={expandedSection === sIdx ? "chevron-up" : "chevron-down"} size={14} color={expandedSection === sIdx ? BRAND_BLUE : "#B0B7C3"} />
                  </View>
                </View>
              </TouchableOpacity>

              {expandedSection === sIdx && (
                <View style={[s.faqItems, { borderTopColor: tc.borderLight }]}>
                  {section.items.map((item, iIdx) => {
                    const key = `${sIdx}-${iIdx}`;
                    const isOpen = expandedItem === key;
                    return (
                      <View key={key}>
                        <TouchableOpacity activeOpacity={0.8} onPress={() => toggleItem(key)}>
                          <View style={[s.faqItem, { borderBottomColor: tc.borderLight }, isOpen && s.faqItemActive]}>
                            <View style={[s.faqDot, isOpen && { backgroundColor: BRAND_BLUE }]} />
                            <Text style={[s.faqQuestion, { color: tc.textSecondary }, isOpen && { color: BRAND_BLUE, fontWeight: "700" }]}>{item.q}</Text>
                            <View style={[s.chevronSmall, { backgroundColor: tc.sectionBg }, isOpen && s.chevronSmallActive]}>
                              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={12} color={isOpen ? BRAND_BLUE : "#B0B7C3"} />
                            </View>
                          </View>
                        </TouchableOpacity>
                        {isOpen && (
                          <View style={[s.faqAnswer, { borderBottomColor: tc.borderLight }]}>
                            <Text style={[s.faqAnswerText, { color: tc.textSecondary }]}>{item.a}</Text>
                            <View style={[s.helpfulRow, { borderTopColor: tc.borderLight }]}>
                              <Text style={[s.helpfulLabel, { color: tc.textTertiary }]}>Was this helpful?</Text>
                              <TouchableOpacity
                                activeOpacity={0.75}
                                style={[s.helpfulBtn, { borderColor: tc.borderLight }, helpfulIds.has(key) && s.helpfulBtnActive]}
                                onPress={() => markHelpful(key)}
                              >
                                <Ionicons name={helpfulIds.has(key) ? "thumbs-up" : "thumbs-up-outline"} size={14} color={helpfulIds.has(key) ? BRAND_GREEN : "#9CA3AF"} />
                                <Text style={[s.helpfulBtnText, helpfulIds.has(key) && { color: BRAND_GREEN }]}>Yes</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Us */}
        <View style={[s.contactContainer, { backgroundColor: tc.pageBg }]}>
          <Text style={[s.sectionHeader, { color: tc.textPrimary }]}>Still need help?</Text>
          <Text style={[s.contactSubtext, { color: tc.textSecondary }]}>Our support team is always happy to assist you.</Text>

          {CONTACT_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.id} onPress={opt.action} activeOpacity={0.75} style={[s.contactCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <View style={s.contactCardInner}>
                <View style={[s.contactIconBox, { backgroundColor: opt.color + "14" }]}>
                  <Ionicons name={opt.icon} size={22} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.contactLabel, { color: tc.textPrimary }]}>{opt.label}</Text>
                  <Text style={[s.contactDesc, { color: tc.textSecondary }]}>{opt.desc}</Text>
                </View>
                <View style={s.contactArrow}>
                  <Ionicons name="arrow-forward" size={13} color={BRAND_BLUE} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community tip */}
        <View style={[s.tipCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <LinearGradient
            colors={isDark ? [tc.cardBg, tc.cardBg] : [BRAND_BLUE + "08", BRAND_GREEN + "08"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.tipGrad}
          >
            <View style={[s.tipIconWrap, isDark && { backgroundColor: "#2A1A00" }]}>
              <Ionicons name="bulb-outline" size={24} color="#257A86" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.tipTitle, { color: tc.textPrimary }]}>Community Tip</Text>
              <Text style={[s.tipText, { color: tc.textSecondary }]}>You can also ask questions in the Community tab — fellow members often have great local tips!</Text>
            </View>
          </LinearGradient>
        </View>

        {/* App info footer */}
        <View style={s.footer}>
          <Text style={[s.footerText, { color: tc.textTertiary }]}>ComLinkr v1.0.0</Text>
          <Text style={[s.footerSub, { color: tc.textTertiary }]}>Made with ❤️ for communities</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  backBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: "rgba(26,107,174,0.15)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: rs(6), shadowOffset: { width: 0, height: rs(2) }, elevation: 4,
  },
  headerTitle: { fontSize: rs(18), fontWeight: "800", color: "#0A1628", letterSpacing: -0.3 },
  scroll: { flex: 1 },
  content: { paddingBottom: rs(40), backgroundColor: "#FFFFFF" },

  // Hero
  hero: {
    margin: rs(14), borderRadius: rs(24), padding: rs(24), paddingBottom: rs(20),
    alignItems: "center", overflow: "hidden",
  },
  heroBg1: { position: "absolute", top: rs(-30), right: rs(-30), width: rs(120), height: rs(120), borderRadius: rs(60), backgroundColor: "rgba(255,255,255,0.07)" },
  heroBg2: { position: "absolute", bottom: rs(-20), left: rs(-20), width: rs(90), height: rs(90), borderRadius: rs(45), backgroundColor: "rgba(255,255,255,0.05)" },
  heroIconContainer: { marginBottom: rs(4) },
  heroIconRing: {
    width: rs(64), height: rs(64), borderRadius: rs(20),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  heroTitle: { fontSize: rs(24), fontWeight: "900", color: "#FFF", marginTop: rs(12), letterSpacing: -0.3 },
  heroSub: { fontSize: rs(14), color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: rs(8), lineHeight: rs(20), fontWeight: "500", paddingHorizontal: rs(10) },
  heroSearch: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    marginTop: rs(16), width: "100%",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: rs(14), paddingHorizontal: rs(14), paddingVertical: rs(10),
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  heroSearchInput: { flex: 1, fontSize: rs(14), color: "#FFF", padding: 0 },

  // Section
  sectionHeader: { fontSize: rs(18), fontWeight: "800", color: "#0A1628", letterSpacing: -0.3 },

  // FAQ
  faqContainer: { paddingHorizontal: rs(14), marginTop: rs(8) },
  faqHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: rs(4) },
  faqCountPill: {
    backgroundColor: BRAND_BLUE + "14", borderRadius: rs(8),
    paddingHorizontal: rs(8), paddingVertical: rs(3),
  },
  faqCountPillText: { fontSize: rs(11), fontWeight: "700", color: BRAND_BLUE },
  faqSection: {
    marginTop: rs(12), backgroundColor: "#FFF", borderRadius: rs(16),
    borderWidth: 1, borderColor: "#ECEEF1", overflow: "hidden",
  },
  faqSectionActive: {
    borderColor: BRAND_BLUE + "40",
  },
  faqSectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: rs(16),
  },
  faqSectionLeft: { flexDirection: "row", alignItems: "center", gap: rs(12), flex: 1 },
  faqIconBox: { width: rs(38), height: rs(38), borderRadius: rs(12), alignItems: "center", justifyContent: "center" },
  faqSectionTitle: { fontSize: rs(15), fontWeight: "700", color: "#0A1628" },
  faqSectionSub: { fontSize: rs(11), color: "#9CA3AF", marginTop: rs(1) },
  chevronCircle: {
    width: rs(28), height: rs(28), borderRadius: rs(14),
    backgroundColor: "#F3F5F7",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginLeft: rs(8),
  },
  chevronCircleActive: {
    backgroundColor: BRAND_BLUE + "12",
  },
  faqItems: { borderTopWidth: 1, borderTopColor: "#F0F2F5" },
  faqItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: rs(16), paddingVertical: rs(14), gap: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0F2F5",
  },
  faqItemActive: { backgroundColor: BRAND_BLUE + "06" },
  faqDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: "#D1D5DB", flexShrink: 0 },
  faqQuestion: { fontSize: rs(14), fontWeight: "600", color: "#374151", flex: 1, lineHeight: rs(20) },
  chevronSmall: {
    width: rs(24), height: rs(24), borderRadius: rs(12),
    backgroundColor: "#F3F5F7",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginLeft: rs(4),
  },
  chevronSmallActive: {
    backgroundColor: BRAND_BLUE + "12",
  },
  faqAnswer: {
    paddingHorizontal: rs(16), paddingBottom: rs(14), paddingTop: rs(4), paddingLeft: rs(32),
    backgroundColor: BRAND_BLUE + "04",
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0F2F5",
  },
  faqAnswerText: { fontSize: rs(13), color: "#6B7280", lineHeight: rs(21) },
  helpfulRow: {
    flexDirection: "row", alignItems: "center", gap: rs(10), marginTop: rs(12),
    paddingTop: rs(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB",
  },
  helpfulLabel: { fontSize: rs(12), color: "#9CA3AF", fontWeight: "500" },
  helpfulBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: rs(8),
    paddingHorizontal: rs(10), paddingVertical: rs(4),
  },
  helpfulBtnActive: { borderColor: BRAND_GREEN, backgroundColor: BRAND_GREEN + "10" },
  helpfulBtnText: { fontSize: rs(11), fontWeight: "600", color: "#9CA3AF" },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: rs(40), gap: rs(8) },
  emptyIconWrap: {
    width: rs(64), height: rs(64), borderRadius: rs(20),
    backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginBottom: rs(8),
  },
  emptyText: { fontSize: rs(15), fontWeight: "700", color: "#9CA3AF" },
  emptySubtext: { fontSize: rs(13), color: "#D1D5DB" },
  emptyBtn: {
    marginTop: rs(12), backgroundColor: BRAND_BLUE, borderRadius: rs(10),
    paddingHorizontal: rs(16), paddingVertical: rs(8),
  },
  emptyBtnText: { fontSize: rs(12), fontWeight: "700", color: "#FFF" },

  // Contact
  contactContainer: { paddingHorizontal: rs(14), marginTop: rs(28), backgroundColor: "#FFFFFF" },
  contactSubtext: { fontSize: rs(13), color: "#6B7280", marginBottom: rs(14), fontWeight: "500" },
  contactCard: {
    backgroundColor: "#FFFFFF", borderRadius: rs(16), marginBottom: rs(10),
    borderWidth: 1, borderColor: "#ECEEF1",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(2) }, elevation: 2,
  },
  contactCardInner: {
    flexDirection: "row", alignItems: "center", gap: rs(14), padding: rs(16),
  },
  contactIconBox: { width: rs(48), height: rs(48), borderRadius: rs(16), alignItems: "center", justifyContent: "center", flexShrink: 0 },
  contactLabel: { fontSize: rs(15), fontWeight: "700", color: "#0A1628" },
  contactDesc: { fontSize: rs(12), color: "#6B7280", fontWeight: "500", marginTop: rs(2) },
  contactArrow: {
    width: rs(30), height: rs(30), borderRadius: rs(15),
    backgroundColor: BRAND_BLUE + "10",
    alignItems: "center", justifyContent: "center",
  },

  // Tip card
  tipCard: {
    marginHorizontal: rs(14), marginTop: rs(20), borderRadius: rs(18), overflow: "hidden",
    borderWidth: 1, borderColor: "#ECEEF1",
    backgroundColor: "#FFFFFF",
  },
  tipGrad: { flexDirection: "row", alignItems: "center", gap: rs(14), padding: rs(16) },
  tipIconWrap: {
    width: rs(44), height: rs(44), borderRadius: rs(14),
    backgroundColor: "#E2F0F1", alignItems: "center", justifyContent: "center",
  },
  tipTitle: { fontSize: rs(14), fontWeight: "700", color: "#0A1628", marginBottom: rs(2) },
  tipText: { fontSize: rs(12), color: "#6B7280", lineHeight: rs(18), fontWeight: "500" },

  // Footer
  footer: { alignItems: "center", marginTop: rs(32), paddingBottom: rs(20) },
  footerText: { fontSize: rs(13), fontWeight: "600", color: "#9CA3AF" },
  footerSub: { fontSize: rs(12), color: "#D1D5DB", marginTop: rs(4) },
});
