import { palette } from "../src/theme/palette";
import { rs } from "../src/utils/responsive";
import React, { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/useTheme";
import { createThemedStyles } from '../src/theme/themedStyles';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { TYPE } from '../src/theme/d';
import { SPRING, layoutEase } from '../src/shared/motion/presets';
import { Chip, EmptyState, Reveal } from '../src/shared/d';
import { DPage, DRow, goBackOr } from '../src/shared/d/Page';
import { useBackState } from '../src/hooks/useBackState';

const BRAND_BLUE = palette.brandBlue;
const BRAND_GREEN = palette.brandGreen;

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
  { id: "email", icon: "mail-outline" as const, label: "Email us", desc: "support@comlinkr.com", color: BRAND_BLUE, action: () => Linking.openURL("mailto:support@comlinkr.com") },
  { id: "instagram", icon: "logo-instagram" as const, label: "Instagram", desc: "@comlinkr", color: palette.pinkL54, action: () => Linking.openURL("https://www.instagram.com/comlinkr?igsh=czM3bmtsMmdtM3dr") },
  { id: "linkedin", icon: "logo-linkedin" as const, label: "LinkedIn", desc: "ComLinkr", color: palette.skyL40, action: () => Linking.openURL("https://www.linkedin.com/company/comlinkr/") },
];

/** One question: tap to open; the chevron turns and the answer slides in (design D, plan 01). */
function FaqItem({ q, a, first, open, onToggle, helpful, onHelpful }: {
  q: string; a: string; first: boolean; open: boolean; onToggle: () => void; helpful: boolean; onHelpful: () => void;
}) {
  const { tc } = useTheme();
  const turn = useSharedValue(open ? 1 : 0);
  useEffect(() => { turn.set(withSpring(open ? 1 : 0, SPRING.settle)); }, [open, turn]);
  const chev = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 90}deg` }] }));
  return (
    <Animated.View layout={layoutEase} style={!first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight } : undefined}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={q}
        style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 }, pressed && { backgroundColor: tc.inputBg }]}>
        <Text style={[TYPE.bodyStrong, { flex: 1, color: tc.textPrimary, fontFamily: "Manrope_600SemiBold" }]}>{q}</Text>
        <Animated.View style={chev}><Ionicons name="chevron-forward" size={16} color={tc.textTertiary} /></Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(120)} style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={[TYPE.body, { color: tc.textSecondary }]}>{a}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
            <Text style={[TYPE.small, { color: tc.textTertiary }]}>Was this helpful?</Text>
            <Chip label="Yes" on={helpful} onPress={onHelpful} icon={<Ionicons name={helpful ? "thumbs-up" : "thumbs-up-outline"} size={14} color={helpful ? palette.white : tc.textSecondary} />} />
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export default function HelpSupportScreen() {
  const { tc } = useTheme();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useBackState("", { coalesceMs: 1200 });
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());

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

  const card = { borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" as const };

  return (
    <DPage title="Help" onBack={() => goBackOr("/(tabs)/feed")}>
      <Reveal i={0} style={{ marginHorizontal: 16, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tc.inputBg }}>
        <Ionicons name="search" size={18} color={tc.textTertiary} />
        <TextInput
          style={[TYPE.body, { flex: 1, color: tc.textPrimary, padding: 0 }]}
          placeholder="Search help"
          placeholderTextColor={tc.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          accessibilityLabel="Search help"
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={tc.textTertiary} />
          </Pressable>
        ) : null}
      </Reveal>

      {filteredSections.length === 0 ? (
        <EmptyState icon="search-outline" title="No answers found" sub={`Nothing matches “${searchQuery.trim()}”. Try other words, or ask the team below.`} actionLabel="Clear search" onAction={() => setSearchQuery("")} />
      ) : null}

      {filteredSections.map((section, sIdx) => (
        <Reveal key={section.title} i={sIdx + 1} style={{ marginHorizontal: 16, marginBottom: 18 }}>
          <Text style={[TYPE.overline, { color: tc.textTertiary, marginLeft: 14, marginBottom: 6 }]}>{section.title.replace(" & ", " and ")}</Text>
          <View style={card}>
            {section.items.map((item, iIdx) => {
              const key = `${section.title}-${iIdx}`;
              return (
                <FaqItem key={key} q={item.q} a={item.a} first={iIdx === 0} open={expandedItem === key} onToggle={() => toggleItem(key)}
                  helpful={helpfulIds.has(key)} onHelpful={() => markHelpful(key)} />
              );
            })}
          </View>
        </Reveal>
      ))}

      <Reveal i={filteredSections.length + 1} style={{ marginHorizontal: 16, marginBottom: 18 }}>
        <Text style={[TYPE.overline, { color: tc.textTertiary, marginLeft: 14, marginBottom: 6 }]}>Still stuck?</Text>
        <View style={card}>
          {CONTACT_OPTIONS.map((opt, i) => (
            <DRow key={opt.id} first={i === 0} icon={opt.icon} label={opt.label} value={opt.desc} onPress={opt.action} />
          ))}
        </View>
      </Reveal>

      <Reveal i={filteredSections.length + 2} style={{ marginHorizontal: 16, flexDirection: "row", gap: 12, padding: 16, borderRadius: 22, backgroundColor: tc.mintSoft }}>
        <Ionicons name="bulb-outline" size={22} color={tc.successText} />
        <View style={{ flex: 1 }}>
          <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>Ask the people around you</Text>
          <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 2 }]}>You can also ask in Community: fellow members often have great local tips.</Text>
        </View>
      </Reveal>
    </DPage>
  );
}

const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: palette.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralL95_2,
  },
  backBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: "rgba(26,107,174,0.15)",
    alignItems: "center", justifyContent: "center",
    shadowColor: palette.black, shadowOpacity: 0.08, shadowRadius: rs(6), shadowOffset: { width: 0, height: rs(2) }, elevation: 4,
  },
  headerTitle: { fontSize: rs(18), fontWeight: "800", color: palette.blueL10, letterSpacing: -0.3 },
  scroll: { flex: 1 },
  content: { paddingBottom: rs(40), backgroundColor: palette.white },

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
  heroTitle: { fontSize: rs(24), fontWeight: "900", color: palette.white, marginTop: rs(12), letterSpacing: -0.3 },
  heroSub: { fontSize: rs(14), color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: rs(8), lineHeight: rs(20), fontWeight: "500", paddingHorizontal: rs(10) },
  heroSearch: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    marginTop: rs(16), width: "100%",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: rs(14), paddingHorizontal: rs(14), paddingVertical: rs(10),
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  heroSearchInput: { flex: 1, fontSize: rs(14), color: palette.white, padding: 0 },

  // Section
  sectionHeader: { fontSize: rs(18), fontWeight: "800", color: palette.blueL10, letterSpacing: -0.3 },

  // FAQ
  faqContainer: { paddingHorizontal: rs(14), marginTop: rs(8) },
  faqHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: rs(4) },
  faqCountPill: {
    backgroundColor: BRAND_BLUE + "14", borderRadius: rs(8),
    paddingHorizontal: rs(8), paddingVertical: rs(3),
  },
  faqCountPillText: { fontSize: rs(11), fontWeight: "700", color: BRAND_BLUE },
  faqSection: {
    marginTop: rs(12), backgroundColor: palette.white, borderRadius: rs(16),
    borderWidth: 1, borderColor: palette.neutralL94_2, overflow: "hidden",
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
  faqSectionTitle: { fontSize: rs(15), fontWeight: "700", color: palette.blueL10 },
  faqSectionSub: { fontSize: rs(11), color: palette.gray400, marginTop: rs(1) },
  chevronCircle: {
    width: rs(28), height: rs(28), borderRadius: rs(14),
    backgroundColor: palette.neutralL96_4,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginLeft: rs(8),
  },
  chevronCircleActive: {
    backgroundColor: BRAND_BLUE + "12",
  },
  faqItems: { borderTopWidth: 1, borderTopColor: palette.neutralL95_5 },
  faqItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: rs(16), paddingVertical: rs(14), gap: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.neutralL95_5,
  },
  faqItemActive: { backgroundColor: BRAND_BLUE + "06" },
  faqDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: palette.gray300, flexShrink: 0 },
  faqQuestion: { fontSize: rs(14), fontWeight: "600", color: palette.gray700, flex: 1, lineHeight: rs(20) },
  chevronSmall: {
    width: rs(24), height: rs(24), borderRadius: rs(12),
    backgroundColor: palette.neutralL96_4,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginLeft: rs(4),
  },
  chevronSmallActive: {
    backgroundColor: BRAND_BLUE + "12",
  },
  faqAnswer: {
    paddingHorizontal: rs(16), paddingBottom: rs(14), paddingTop: rs(4), paddingLeft: rs(32),
    backgroundColor: BRAND_BLUE + "04",
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.neutralL95_5,
  },
  faqAnswerText: { fontSize: rs(13), color: palette.gray500, lineHeight: rs(21) },
  helpfulRow: {
    flexDirection: "row", alignItems: "center", gap: rs(10), marginTop: rs(12),
    paddingTop: rs(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.gray200,
  },
  helpfulLabel: { fontSize: rs(12), color: palette.gray400, fontWeight: "500" },
  helpfulBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    borderWidth: 1, borderColor: palette.gray200, borderRadius: rs(8),
    paddingHorizontal: rs(10), paddingVertical: rs(4),
  },
  helpfulBtnActive: { borderColor: BRAND_GREEN, backgroundColor: BRAND_GREEN + "10" },
  helpfulBtnText: { fontSize: rs(11), fontWeight: "600", color: palette.gray400 },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: rs(40), gap: rs(8) },
  emptyIconWrap: {
    width: rs(64), height: rs(64), borderRadius: rs(20),
    backgroundColor: palette.gray100, alignItems: "center", justifyContent: "center", marginBottom: rs(8),
  },
  emptyText: { fontSize: rs(15), fontWeight: "700", color: palette.gray400 },
  emptySubtext: { fontSize: rs(13), color: palette.gray300 },
  emptyBtn: {
    marginTop: rs(12), backgroundColor: BRAND_BLUE, borderRadius: rs(10),
    paddingHorizontal: rs(16), paddingVertical: rs(8),
  },
  emptyBtnText: { fontSize: rs(12), fontWeight: "700", color: palette.white },

  // Contact
  contactContainer: { paddingHorizontal: rs(14), marginTop: rs(28), backgroundColor: palette.white },
  contactSubtext: { fontSize: rs(13), color: palette.gray500, marginBottom: rs(14), fontWeight: "500" },
  contactCard: {
    backgroundColor: palette.white, borderRadius: rs(16), marginBottom: rs(10),
    borderWidth: 1, borderColor: palette.neutralL94_2,
    shadowColor: palette.black, shadowOpacity: 0.05, shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(2) }, elevation: 2,
  },
  contactCardInner: {
    flexDirection: "row", alignItems: "center", gap: rs(14), padding: rs(16),
  },
  contactIconBox: { width: rs(48), height: rs(48), borderRadius: rs(16), alignItems: "center", justifyContent: "center", flexShrink: 0 },
  contactLabel: { fontSize: rs(15), fontWeight: "700", color: palette.blueL10 },
  contactDesc: { fontSize: rs(12), color: palette.gray500, fontWeight: "500", marginTop: rs(2) },
  contactArrow: {
    width: rs(30), height: rs(30), borderRadius: rs(15),
    backgroundColor: BRAND_BLUE + "10",
    alignItems: "center", justifyContent: "center",
  },

  // Tip card
  tipCard: {
    marginHorizontal: rs(14), marginTop: rs(20), borderRadius: rs(18), overflow: "hidden",
    borderWidth: 1, borderColor: palette.neutralL94_2,
    backgroundColor: palette.white,
  },
  tipGrad: { flexDirection: "row", alignItems: "center", gap: rs(14), padding: rs(16) },
  tipIconWrap: {
    width: rs(44), height: rs(44), borderRadius: rs(14),
    backgroundColor: palette.brandTealLight, alignItems: "center", justifyContent: "center",
  },
  tipTitle: { fontSize: rs(14), fontWeight: "700", color: palette.blueL10, marginBottom: rs(2) },
  tipText: { fontSize: rs(12), color: palette.gray500, lineHeight: rs(18), fontWeight: "500" },

  // Footer
  footer: { alignItems: "center", marginTop: rs(32), paddingBottom: rs(20) },
  footerText: { fontSize: rs(13), fontWeight: "600", color: palette.gray400 },
  footerSub: { fontSize: rs(12), color: palette.gray300, marginTop: rs(4) },
});
