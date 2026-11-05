import { rs } from "../src/utils/responsive";
import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/useTheme";

const BRAND_BLUE = "#1A6BAE";
const BRAND_GREEN = "#30855B";

export const PRIVACY_POLICY_VERSION = "2.0";
const LAST_UPDATED = "July 7, 2026";

const SECTIONS = [
  {
    id: "intro",
    icon: "information-circle-outline" as const,
    title: "1. Introduction & Scope",
    content: [
      {
        subtitle: "1.1 Who We Are",
        text: "This Privacy Policy explains how ComLinkr Ltd. (\"ComLinkr,\" \"we,\" \"us,\" or \"our\") collects, uses, discloses, and protects information when you use the ComLinkr mobile application, website, and related services (collectively, the \"Service\"). This Policy applies to all users of the Service, including people browsing content, people who create restaurant, housing, or roommate listings, and people who post community content.",
      },
      {
        subtitle: "1.2 Relationship to Our Terms of Service",
        text: "This Privacy Policy is incorporated into and forms part of our Terms of Service. By creating an account or using the Service, you acknowledge that you have read and understood how we handle your information as described here.",
      },
      {
        subtitle: "1.3 Age Restriction",
        text: "The Service is intended only for users who are at least 18 years old. We do not knowingly collect personal information from anyone under 18. See Section 10 (Children's Privacy) for details.",
      },
    ],
  },
  {
    id: "collect",
    icon: "clipboard-outline" as const,
    title: "2. Information We Collect",
    content: [
      {
        subtitle: "2.1 Information You Provide Directly",
        text: "Account registration: your name, username, email address, password (stored only as a securely hashed value, never in plain text), and city/state/country you select during onboarding. Profile details: optional bio, profile photo, interests, and cultural preferences you choose to add. Third-party sign-in: if you register with Google or Apple Sign In, we receive your name and email address (and, if you use Apple Sign In, the private relay email Apple may provide) from that provider.",
      },
      {
        subtitle: "2.2 Content You Create",
        text: "Community posts, comments, questions and answers, reviews and star ratings, restaurant and housing/roommate listings (including photos, videos, pricing, descriptions, and business contact details you choose to publish), direct messages sent through in-app chat, and reports you submit about other content or users.",
      },
      {
        subtitle: "2.3 Location Information",
        text: "We use the city you select during onboarding (or update in Settings) to show you relevant local restaurants, listings, and community content. We only access your device's precise GPS location if you explicitly grant location permission for a specific feature that requests it (for example, showing nearby events or calculating listing distance); you can revoke this permission at any time in your device settings.",
      },
      {
        subtitle: "2.4 Camera & Photo Library",
        text: "If you choose to add a photo or video to a restaurant listing, housing listing, community post, or your profile, the app requests access to your camera or photo library solely to let you capture or select that image. We only access and upload the specific photo or video you choose — we do not scan or upload your entire camera roll.",
      },
      {
        subtitle: "2.5 Device & Usage Information",
        text: "We automatically collect technical information such as device type, operating system and version, app version, general (non-precise) network information, crash logs, and usage patterns such as which screens and features you use, how long you use them, and general engagement metrics. This helps us diagnose bugs and improve the Service.",
      },
      {
        subtitle: "2.6 Payment & Transaction Information",
        text: "Where the Service facilitates a security deposit, escrow, or paid feature, payment details are processed by our third-party payment processor; ComLinkr does not directly store your full card number or bank account credentials on our own servers.",
      },
      {
        subtitle: "2.7 Verification & Badge Applications",
        text: "If you apply for a Verified Landlord, Verified Property Host, or other trust badge, we collect the identity documents, business documents, or other verification materials you submit for the sole purpose of reviewing that application.",
      },
    ],
  },
  {
    id: "use",
    icon: "settings-outline" as const,
    title: "3. How We Use Your Information",
    content: [
      {
        subtitle: "3.1 To Provide and Operate the Service",
        text: "We use your information to create and maintain your account, display your profile and content to other users as intended, power search and filtering (for example by city or cuisine), process reservations and connection requests, and enable in-app messaging between users.",
      },
      {
        subtitle: "3.2 To Personalize Your Experience",
        text: "We use your city, interests, and usage patterns to personalize your feed, suggest relevant events, restaurants, and listings, and rank content we believe is most relevant to you.",
      },
      {
        subtitle: "3.3 To Communicate With You",
        text: "We send push notifications about activity on your posts, new messages, reservation updates, and events you may be interested in, as well as transactional emails (such as verification codes, security alerts, and account notices). You can manage push notification preferences in Settings → Notifications; we may still send essential account, security, and legal notices even if you disable other notifications.",
      },
      {
        subtitle: "3.4 For Safety, Security & Trust",
        text: "We use account and content information, including automated content moderation and human review of reports, to detect and prevent fraud, scams, spam, and violations of our Community Standards; to verify identity for trust badges; and to investigate and respond to reports of abusive users or objectionable content as described in our Terms of Service.",
      },
      {
        subtitle: "3.5 To Improve the Service",
        text: "We analyze aggregate usage data to understand which features are used, identify bugs, and prioritize improvements to the app.",
      },
      {
        subtitle: "3.6 Legal Bases (EEA/UK Users)",
        text: "If you are located in the European Economic Area or United Kingdom, we process your information based on: performance of our contract with you (providing the Service you signed up for), our legitimate interests (such as safety, fraud prevention, and improving the Service), your consent (such as for optional location permissions or marketing communications), and compliance with legal obligations.",
      },
    ],
  },
  {
    id: "share",
    icon: "people-outline" as const,
    title: "4. How We Share Your Information",
    content: [
      {
        subtitle: "4.1 Visibility to Other Users",
        text: "Your profile, posts, comments, reviews, and listings are visible to other ComLinkr members according to the visibility settings of that content — for example, community posts are visible within your community, and restaurant/housing listings are publicly browsable within the app. Direct messages are only visible to the participants in that conversation. If you submit a report, the reported user does not see your identity as the reporter.",
      },
      {
        subtitle: "4.2 Service Providers",
        text: "We share information with trusted third-party service providers who perform services on our behalf, including cloud hosting and storage, push notification delivery, email delivery, analytics (including Firebase/Google Analytics), and payment processing for escrow or paid features. These providers are contractually bound to protect your information and may only use it to provide services to us, not for their own independent purposes.",
      },
      {
        subtitle: "4.3 Legal Requirements & Safety",
        text: "We may access, preserve, or disclose your information if we believe in good faith it is necessary to: comply with a law, regulation, legal process, or government request; enforce our Terms of Service and investigate potential violations; detect, prevent, or otherwise address fraud, security, or technical issues; or protect the rights, property, or safety of ComLinkr, our users, or the public, including in an emergency involving a risk of harm.",
      },
      {
        subtitle: "4.4 Business Transfers",
        text: "If ComLinkr is involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale of some or all of its assets, your information may be transferred as part of that transaction. We will notify you of any such change in ownership or control of your personal information.",
      },
      {
        subtitle: "4.5 With Your Consent",
        text: "We may share information with third parties in other ways not described above if we have your consent to do so.",
      },
      {
        subtitle: "4.6 No Sale of Personal Information",
        text: "We do not sell your personal information to data brokers or advertisers, and we do not share your personal information with third parties for their own independent marketing purposes without your consent.",
      },
    ],
  },
  {
    id: "retention",
    icon: "time-outline" as const,
    title: "5. Data Retention",
    content: [
      {
        subtitle: "5.1 How Long We Keep Information",
        text: "We retain your account information and content for as long as your account is active, and as needed to provide the Service to you. If you delete a specific piece of content, we remove it from public view and delete it from our active systems within a reasonable period, subject to Section 5.2.",
      },
      {
        subtitle: "5.2 Retention After Account Deletion",
        text: "When you delete your account (Settings → Account → Delete Account), we permanently delete or irreversibly anonymize your personal information within a reasonable period, except where we are required or permitted to retain certain information for longer — for example, to comply with legal, tax, or accounting obligations, to resolve disputes, to enforce our agreements, or to investigate fraud, abuse, or violations of our Terms of Service that occurred prior to deletion. Messages you sent to other users may remain visible to those users after your account is deleted, shown as sent by a deleted account.",
      },
    ],
  },
  {
    id: "security",
    icon: "lock-closed-outline" as const,
    title: "6. Data Security",
    content: [
      {
        subtitle: "6.1 Encryption",
        text: "All data transmitted between your device and our servers is encrypted in transit using industry-standard TLS/SSL protocols. Passwords are never stored in plain text; we store only a securely hashed and salted representation of your password.",
      },
      {
        subtitle: "6.2 Access Controls",
        text: "We restrict access to personal information to personnel who need it to perform their job functions, and we log and monitor access to sensitive systems.",
      },
      {
        subtitle: "6.3 No Absolute Guarantee",
        text: "No method of transmission over the internet or electronic storage is 100% secure. While we work hard to protect your information using industry-standard safeguards, we cannot guarantee its absolute security. If we become aware of a security breach that affects your personal information, we will notify you and any applicable regulator as required by law.",
      },
    ],
  },
  {
    id: "rights",
    icon: "hand-left-outline" as const,
    title: "7. Your Rights & Choices",
    content: [
      {
        subtitle: "7.1 Access, Correction & Portability",
        text: "You can view and update most of your profile information at any time through your profile and account settings. You may request a copy of your personal data in a portable format by contacting support@comlinkr.com.",
      },
      {
        subtitle: "7.2 Deletion",
        text: "You can permanently delete your account and associated personal data at any time from Settings → Account → Delete Account. This action is irreversible. See Section 5.2 for what may be retained after deletion and why.",
      },
      {
        subtitle: "7.3 Notification Preferences",
        text: "You can manage or disable push notifications at any time from Settings → Notifications, and manage email preferences from the unsubscribe link in any non-essential email.",
      },
      {
        subtitle: "7.4 Location Permission",
        text: "You can revoke location permission at any time through your device's operating system settings; some location-dependent features (such as \"nearby\" sorting) will not function correctly without it.",
      },
      {
        subtitle: "7.5 Additional Rights for Specific Regions",
        text: "If you are a resident of California, you have rights under the California Consumer Privacy Act (CCPA/CPRA), including the right to know what personal information we collect, the right to delete it, the right to correct inaccurate information, and the right to opt out of the sale or sharing of personal information (we do not sell personal information). If you are located in the EEA or UK, you have rights under the GDPR, including the rights described above as well as the right to object to or restrict certain processing and the right to lodge a complaint with your local data protection authority. To exercise any of these rights, contact support@comlinkr.com; we will respond within the time required by applicable law.",
      },
      {
        subtitle: "7.6 No Discrimination",
        text: "We will not discriminate against you, or provide you a lesser level of service, for exercising any privacy right described in this section.",
      },
    ],
  },
  {
    id: "thirdparty",
    icon: "link-outline" as const,
    title: "8. Third-Party Sign-In & Services",
    content: [
      {
        subtitle: "8.1 Google & Apple Sign In",
        text: "If you choose to register or log in using Google or Apple Sign In, those providers will share limited profile information (such as your name and email address) with us to create and authenticate your account, in accordance with their own privacy policies. We do not receive your Google or Apple account password.",
      },
      {
        subtitle: "8.2 Analytics Providers",
        text: "We use Firebase Analytics (a Google service) to understand aggregate, non-identifying usage patterns such as which screens are viewed and how often. Firebase may process this data in accordance with Google's own privacy policy.",
      },
      {
        subtitle: "8.3 Maps & Location Services",
        text: "Where the app displays maps or directions (for example, restaurant or listing addresses), it may use a third-party mapping service, which processes the address or coordinates needed to render that map.",
      },
      {
        subtitle: "8.4 Links to Other Sites",
        text: "Restaurant and listing profiles may include links to third-party websites or social media (such as a restaurant's own website or Instagram handle). We are not responsible for the privacy practices of those third-party sites, and this Policy does not apply to them.",
      },
    ],
  },
  {
    id: "cookies",
    icon: "globe-outline" as const,
    title: "9. Local Storage & Similar Technologies",
    content: [
      {
        subtitle: "9.1 On-Device Storage",
        text: "ComLinkr uses secure on-device storage to save your login session, preferences (such as theme and notification settings), and cached content so the app loads faster and works better offline.",
      },
      {
        subtitle: "9.2 Analytics Identifiers",
        text: "Our analytics provider may use device or app-instance identifiers to distinguish sessions and measure usage in aggregate. We do not use this data to track you across unrelated third-party apps or websites for advertising purposes.",
      },
    ],
  },
  {
    id: "children",
    icon: "people-circle-outline" as const,
    title: "10. Children's Privacy",
    content: [
      {
        subtitle: "10.1 Minimum Age",
        text: "ComLinkr is intended only for users aged 18 and older, and is not directed to children. We do not knowingly collect personal information from anyone under the age of 18, and in no case do we knowingly collect personal information from children under 13.",
      },
      {
        subtitle: "10.2 If We Learn We Collected a Minor's Data",
        text: "If we become aware that we have inadvertently collected personal information from someone under 18, we will take reasonable steps to promptly delete that information and terminate the associated account. If you believe a child has provided us with personal information, please contact support@comlinkr.com immediately.",
      },
    ],
  },
  {
    id: "international",
    icon: "earth-outline" as const,
    title: "11. International Data Transfers",
    content: [
      {
        subtitle: "11.1 Where Your Data Is Processed",
        text: "ComLinkr and the service providers we use may process and store your information in countries other than the one in which you live. Where we transfer personal information internationally, we take steps intended to provide an adequate level of protection, such as relying on service providers that are subject to standard contractual clauses or equivalent safeguards recognized under applicable data protection law.",
      },
    ],
  },
  {
    id: "changes",
    icon: "document-text-outline" as const,
    title: "12. Changes to This Policy",
    content: [
      {
        subtitle: "12.1 Updates and Versioning",
        text: `This Privacy Policy is versioned (current version ${PRIVACY_POLICY_VERSION}, last updated ${LAST_UPDATED}). We may update this Policy from time to time to reflect changes in our practices, the Service, or legal requirements.`,
      },
      {
        subtitle: "12.2 Notice of Material Changes",
        text: "If we make material changes to this Policy, we will notify you through the app, by email, or by another reasonable method, and update the \"Last updated\" date above. Continued use of ComLinkr after changes take effect constitutes your acceptance of the updated Policy.",
      },
    ],
  },
  {
    id: "contact",
    icon: "mail-outline" as const,
    title: "13. Contact Us",
    content: [
      {
        subtitle: "13.1 Questions or Requests",
        text: "If you have questions about this Privacy Policy, or want to exercise any of the rights described in Section 7, please contact our privacy team at support@comlinkr.com. We aim to respond to all privacy inquiries within a reasonable time and in accordance with applicable law.",
      },
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { isDark, tc } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [expandedSection, setExpandedSection] = React.useState<string | null>("collect");
  const [readSections, setReadSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    if (expandedSection !== id) {
      // Mark previously opened section as read
      if (expandedSection) {
        setReadSections((p) => new Set(p).add(expandedSection));
      }
    }
    setExpandedSection(expandedSection === id ? null : id);
  };

  const readCount = readSections.size + (expandedSection ? 1 : 0);
  const progress = Math.min((readCount / SECTIONS.length) * 100, 100);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} style={({ pressed }) => [s.backBtn, { backgroundColor: tc.sectionBg }, pressed && { opacity: 0.8, transform: [{ scale: 0.9 }] }]}>
          <Ionicons name="chevron-back" size={20} color={BRAND_BLUE} />
        </Pressable>
        <Text style={[s.headerTitle, { color: tc.textPrimary }]}>Privacy Policy</Text>
        <View style={{ width: rs(40) }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={[s.scroll, { backgroundColor: tc.pageBg }]}
        contentContainerStyle={[s.content, { backgroundColor: tc.pageBg }]}
        showsVerticalScrollIndicator={false}
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
          <View style={s.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={36} color="rgba(255,255,255,0.95)" />
          </View>
          <Text style={s.heroTitle}>Your Privacy Matters</Text>
          <Text style={s.heroSub}>We're committed to protecting your personal information and being transparent about how we use it.</Text>
          <View style={s.heroBadge}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={s.heroBadgeText}>Version {PRIVACY_POLICY_VERSION} · Last updated: {LAST_UPDATED}</Text>
          </View>
        </LinearGradient>

        {/* Quick summary */}
        <View style={[s.summaryCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <View style={s.summaryHeader}>
            <View style={s.summaryIconWrap}>
              <Ionicons name="flash-outline" size={16} color={BRAND_BLUE} />
            </View>
            <Text style={[s.summaryTitle, { color: tc.textPrimary }]}>Quick Summary</Text>
          </View>
          <View style={s.summaryGrid}>
            {[
              { icon: "checkmark-circle" as const, text: "We never sell your data", color: BRAND_GREEN },
              { icon: "lock-closed" as const, text: "Encrypted in transit", color: BRAND_GREEN },
              { icon: "person-circle" as const, text: "You control your data", color: BRAND_BLUE },
              { icon: "trash-outline" as const, text: "Delete anytime", color: "#257A86" },
            ].map((item, idx) => (
              <View key={idx} style={s.summaryItem}>
                <View style={[s.summaryItemIcon, { backgroundColor: item.color + "14" }]}>
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={[s.summaryItemText, { color: tc.textSecondary }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reading progress */}
        <View style={[s.progressCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <View style={s.progressHeader}>
            <Ionicons name="book-outline" size={16} color={BRAND_BLUE} />
            <Text style={[s.progressTitle, { color: tc.textPrimary }]}>Reading Progress</Text>
            <Text style={s.progressPct}>{Math.round(progress)}%</Text>
          </View>
          <View style={[s.progressBar, { backgroundColor: tc.sectionBg }]}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={[s.progressSub, { color: tc.textTertiary }]}>{readCount} of {SECTIONS.length} sections reviewed</Text>
        </View>

        {/* Table of contents */}
        <View style={[s.tocCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <Text style={[s.tocTitle, { color: tc.textPrimary }]}>Table of Contents</Text>
          <View style={s.tocList}>
            {SECTIONS.map((section, idx) => {
              const isActive = expandedSection === section.id;
              const isRead = readSections.has(section.id);
              return (
                <TouchableOpacity
                  key={section.id}
                  activeOpacity={0.75}
                  onPress={() => setExpandedSection(section.id)}
                >
                  <View style={[s.tocItem, isActive && s.tocItemActive]}>
                    <View style={[s.tocNumberWrap, isActive && { backgroundColor: BRAND_BLUE }, isRead && !isActive && { backgroundColor: BRAND_GREEN }]}>
                      {isRead && !isActive ? (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      ) : (
                        <Text style={[s.tocNumber, (isActive || isRead) && { color: "#FFF" }]}>{idx + 1}</Text>
                      )}
                    </View>
                    <Text style={[s.tocItemText, { color: tc.textSecondary }, isActive && { color: BRAND_BLUE, fontWeight: "700" }]}>{section.title}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Policy Sections */}
        <View style={s.sectionsContainer}>
          {SECTIONS.map((section, sIdx) => {
            const isExpanded = expandedSection === section.id;
            const isRead = readSections.has(section.id);
            return (
              <View key={section.id} style={[s.policySection, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, isExpanded && s.policySectionExpanded]}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => toggleSection(section.id)}>
                  <View style={s.policySectionHeader}>
                    <View style={s.policySectionLeft}>
                      <View style={[s.policySectionNum, isRead && !isExpanded && { backgroundColor: BRAND_GREEN }, !isExpanded && !isRead && { backgroundColor: "#D1D5DB" }]}>
                        {isRead && !isExpanded ? (
                          <Ionicons name="checkmark" size={12} color="#FFF" />
                        ) : (
                          <Text style={s.policySectionNumText}>{sIdx + 1}</Text>
                        )}
                      </View>
                      <View style={[s.policySectionIconBox, { backgroundColor: isExpanded ? BRAND_BLUE + "14" : tc.sectionBg }]}>
                        <Ionicons name={section.icon} size={18} color={isExpanded ? BRAND_BLUE : "#9CA3AF"} />
                      </View>
                      <Text style={[s.policySectionTitle, { color: tc.textPrimary }, isExpanded && { color: BRAND_BLUE }]}>{section.title}</Text>
                    </View>
                    <View style={[s.chevronCircle, { backgroundColor: tc.sectionBg }, isExpanded && s.chevronCircleActive]}>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={isExpanded ? BRAND_BLUE : "#B0B7C3"} />
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[s.policySectionContent, { borderTopColor: tc.borderLight }]}>
                    {section.content.map((item, iIdx) => (
                      <View key={iIdx} style={s.policyItem}>
                        <View style={s.policyItemHeader}>
                          <View style={s.policyItemDot} />
                          <Text style={[s.policySubtitle, { color: tc.textPrimary }]}>{item.subtitle}</Text>
                        </View>
                        <Text style={[s.policyText, { color: tc.textSecondary }]}>{item.text}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Contact section */}
        <View style={[s.contactCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <LinearGradient
            colors={isDark ? [tc.cardBg, tc.cardBg] : [BRAND_BLUE + "08", BRAND_GREEN + "08"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.contactGradient}
          >
            <View style={s.contactIconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={BRAND_BLUE} />
            </View>
            <Text style={[s.contactTitle, { color: tc.textPrimary }]}>Questions about your privacy?</Text>
            <Text style={[s.contactSub, { color: tc.textSecondary }]}>Contact our privacy team at support@comlinkr.com</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.contactBtn}
              onPress={() => Linking.openURL("mailto:support@comlinkr.com?subject=Privacy%20Question")}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6) }}>
                <Ionicons name="mail-outline" size={14} color="#FFF" />
                <Text style={s.contactBtnText}>Email Privacy Team</Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={[s.footerText, { color: tc.textTertiary }]}>© 2026 ComLinkr Ltd. All rights reserved.</Text>
          <Text style={[s.footerSub, { color: tc.textTertiary }]}>Version {PRIVACY_POLICY_VERSION} · Last updated {LAST_UPDATED}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
    margin: rs(14), borderRadius: rs(24), padding: rs(24), paddingBottom: rs(28),
    alignItems: "center", overflow: "hidden",
  },
  heroBg1: { position: "absolute", top: rs(-30), right: rs(-30), width: rs(120), height: rs(120), borderRadius: rs(60), backgroundColor: "rgba(255,255,255,0.07)" },
  heroBg2: { position: "absolute", bottom: rs(-20), left: rs(-20), width: rs(90), height: rs(90), borderRadius: rs(45), backgroundColor: "rgba(255,255,255,0.05)" },
  heroIconWrap: {
    width: rs(64), height: rs(64), borderRadius: rs(20),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  heroTitle: { fontSize: rs(24), fontWeight: "900", color: "#FFF", marginTop: rs(14), letterSpacing: -0.3 },
  heroSub: { fontSize: rs(14), color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: rs(8), lineHeight: rs(20), fontWeight: "500", paddingHorizontal: rs(10) },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    marginTop: rs(14), backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(20),
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  heroBadgeText: { fontSize: rs(11), fontWeight: "600", color: "rgba(255,255,255,0.85)" },

  // Summary card
  summaryCard: {
    marginHorizontal: rs(14), marginBottom: rs(14),
    backgroundColor: "#FFF", borderRadius: rs(18),
    padding: rs(16), borderWidth: 1, borderColor: "#ECEEF1",
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(14) },
  summaryIconWrap: {
    width: rs(30), height: rs(30), borderRadius: rs(10),
    backgroundColor: BRAND_BLUE + "14",
    alignItems: "center", justifyContent: "center",
  },
  summaryTitle: { fontSize: rs(16), fontWeight: "800", color: "#0A1628" },
  summaryGrid: { gap: rs(10) },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: rs(10) },
  summaryItemIcon: {
    width: rs(30), height: rs(30), borderRadius: rs(10),
    alignItems: "center", justifyContent: "center",
  },
  summaryItemText: { fontSize: rs(14), fontWeight: "600", color: "#374151" },

  // Progress card
  progressCard: {
    marginHorizontal: rs(14), marginBottom: rs(14),
    backgroundColor: "#FFF", borderRadius: rs(18),
    padding: rs(16), borderWidth: 1, borderColor: "#ECEEF1",
  },
  progressHeader: { flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10) },
  progressTitle: { fontSize: rs(14), fontWeight: "700", color: "#0A1628", flex: 1 },
  progressPct: { fontSize: rs(14), fontWeight: "800", color: BRAND_BLUE },
  progressBar: {
    height: rs(6), borderRadius: rs(3), backgroundColor: "#F3F4F6", overflow: "hidden",
  },
  progressFill: {
    height: rs(6), borderRadius: rs(3), backgroundColor: BRAND_GREEN,
  },
  progressSub: { fontSize: rs(11), color: "#9CA3AF", marginTop: rs(8), fontWeight: "500" },

  // Table of contents
  tocCard: {
    marginHorizontal: rs(14), marginBottom: rs(18),
    backgroundColor: "#FFF", borderRadius: rs(18),
    padding: rs(16), borderWidth: 1, borderColor: "#ECEEF1",
  },
  tocTitle: { fontSize: rs(14), fontWeight: "800", color: "#0A1628", marginBottom: rs(12), letterSpacing: -0.2 },
  tocList: { gap: rs(2) },
  tocItem: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    justifyContent: "space-between",
    paddingVertical: rs(11), paddingHorizontal: rs(10), borderRadius: rs(12),
  },
  tocItemActive: {
    backgroundColor: BRAND_BLUE + "08",
  },
  tocNumberWrap: {
    width: rs(26), height: rs(26), borderRadius: rs(13),
    backgroundColor: BRAND_BLUE + "14",
    alignItems: "center", justifyContent: "center",
  },
  tocNumber: {
    fontSize: rs(12), fontWeight: "700", color: BRAND_BLUE,
  },
  tocItemText: { flex: 1, fontSize: rs(13), fontWeight: "600", color: "#374151" },
  // Policy sections
  sectionsContainer: { paddingHorizontal: rs(14) },
  policySection: {
    marginBottom: rs(10), backgroundColor: "#FFF", borderRadius: rs(18),
    borderWidth: 1, borderColor: "#ECEEF1", overflow: "hidden",
  },
  policySectionExpanded: {
    borderColor: BRAND_BLUE + "40",
  },
  policySectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: rs(16),
  },
  policySectionLeft: { flexDirection: "row", alignItems: "center", gap: rs(10), flex: 1 },
  policySectionNum: {
    width: rs(24), height: rs(24), borderRadius: rs(12),
    backgroundColor: BRAND_BLUE,
    alignItems: "center", justifyContent: "center",
  },
  policySectionNumText: { fontSize: rs(12), fontWeight: "800", color: "#FFF" },
  policySectionIconBox: { width: rs(36), height: rs(36), borderRadius: rs(10), alignItems: "center", justifyContent: "center" },
  policySectionTitle: { fontSize: rs(15), fontWeight: "700", color: "#0A1628", flex: 1 },
  policySectionContent: {
    borderTopWidth: 1, borderTopColor: "#F0F2F5",
    paddingHorizontal: rs(16), paddingVertical: rs(12),
  },
  policyItem: { marginBottom: rs(14) },
  policyItemHeader: { flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(4) },
  policyItemDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: BRAND_BLUE },
  policySubtitle: { fontSize: rs(14), fontWeight: "700", color: "#374151" },
  policyText: { fontSize: rs(13), color: "#6B7280", lineHeight: rs(20), paddingLeft: rs(14) },

  // Contact card
  contactCard: {
    marginHorizontal: rs(14), marginTop: rs(20),
    borderRadius: rs(18), overflow: "hidden",
    borderWidth: 1, borderColor: "#ECEEF1",
    backgroundColor: "#FFFFFF",
  },
  contactGradient: {
    padding: rs(24), alignItems: "center",
  },
  contactIconWrap: {
    width: rs(52), height: rs(52), borderRadius: rs(16),
    backgroundColor: BRAND_BLUE + "14",
    alignItems: "center", justifyContent: "center",
  },
  contactTitle: { fontSize: rs(16), fontWeight: "800", color: "#0A1628", marginTop: rs(12), textAlign: "center" },
  contactSub: { fontSize: rs(13), color: "#6B7280", marginTop: rs(6), textAlign: "center", fontWeight: "500" },
  contactBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    marginTop: rs(14), backgroundColor: BRAND_BLUE, borderRadius: rs(12),
    paddingHorizontal: rs(20), paddingVertical: rs(10),
  },
  contactBtnText: { fontSize: rs(13), fontWeight: "700", color: "#FFF" },

  // Footer
  footer: { alignItems: "center", marginTop: rs(28), paddingBottom: rs(20) },
  footerText: { fontSize: rs(12), fontWeight: "600", color: "#9CA3AF" },
  footerSub: { fontSize: rs(11), color: "#D1D5DB", marginTop: rs(4) },

  // Chevron indicators
  chevronCircle: {
    width: rs(28), height: rs(28), borderRadius: rs(14),
    backgroundColor: "#F3F5F7",
    alignItems: "center", justifyContent: "center",
  },
  chevronCircleActive: {
    backgroundColor: BRAND_BLUE + "12",
  },
});
