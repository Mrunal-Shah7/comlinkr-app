import { rs } from "../src/utils/responsive";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore, getMarketCode } from "../src/store/auth.store";
import type { UserBadge } from "../src/store/auth.store";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { ApiError } from "../src/api/client";
import {
  submitBadgeApplication,
  userBadgeKeyToApi,
  apiBadgeTypeToUserKey,
  getMyBadgeStatus,
  type PickedDocument,
  type SubmitBadgeApplicationFields,
  type MyBadgeStatusRow,
} from "../src/api/badges.api";
// import { validatePhoneNumber, formatPhoneHint } from "../src/utils/phoneValidation";
// New:
import { validatePhoneNumber, formatPhoneHint, sanitizePhoneInput } from "../src/utils/phoneValidation";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';
import Animated, { FadeInRight, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { TYPE } from '../src/theme/d';
import { SPRING } from '../src/shared/motion/presets';
import { GradientButton, GradientFill, PressableScale } from '../src/shared/d';
import { DPage, goBackOr } from '../src/shared/d/Page';

const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10MB — matches the "max 10MB" copy shown in the upload UI

async function pickVerificationDocument(): Promise<PickedDocument | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") {
    appAlert("Permission needed", "Allow photo library access to upload verification documents.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], // SPRINT-30
    allowsMultipleSelection: false,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  if (typeof a.fileSize === "number" && a.fileSize > MAX_DOC_BYTES) {
    appAlert("File too large", "Please choose an image under 10MB.");
    return null;
  }
  const name = a.fileName ?? `document-${Date.now()}.jpg`;
  const type = a.mimeType ?? "image/jpeg";
  return { uri: a.uri, name, type };
}

// ── Badge configuration ────────────────────────────────────────────────────────
// DocSection used by MARKET_DOCS
type DocSection = { section: string; items: string[] };

const BADGE_CONFIG: Record<UserBadge, {
  label: string;
  icon: string;
  gradient: [string, string];
  description: string;
  unlocks: string[];
  requirements: string[];
  /** Add a key per MarketCode when launching in a new country. Falls back to "US" if not found. */
  marketNotes: Record<string, string>;
}> = {
  landlord: {
    label: "Verified Property Host",
    icon: "home",
    gradient: ["#1A6BAE", "#30855B"],
    description: "List your property for rent, accommodation sharing, or short-stay on ComLinkr. Open to property owners and authorized managers.",
    unlocks: ["Verified trust badge on all your listings", "Priority placement in housing search results", "Direct tenant messaging"],
    requirements: ["Passport or government-issued photo ID", "Proof of right to list the property (ownership deed, tenancy agreement, or management authorization)", "Contact phone number", "Property address you intend to list"],
    marketNotes: {
      US: "Accepted ID: Passport, driver's license, or state ID. For the property: title deed, mortgage statement, property tax bill, tenancy agreement, or written owner authorization.",
      UK: "Accepted ID: Passport, driving licence, or BRP. For the property: HM Land Registry title, mortgage statement, council tax bill, tenancy agreement, or written owner authorization.",
    },
  },
  restaurant_owner: {
    label: "Verified Restaurant Owner",
    icon: "restaurant",
    gradient: ["#1A6BAE", "#30855B"],
    description: "Register your restaurant on ComLinkr and connect with local food lovers.",
    unlocks: ["Verified Business badge on your restaurant posts", "Priority placement in food search results", "Reply to community reviews", "Manage menu & hours"],
    requirements: ["Business registration number / license", "Government-issued ID", "Business phone and email", "Restaurant physical address"],
    marketNotes: {
      US: "Accepted: EIN confirmation, state business license, or food service permit.",
      UK: "Accepted: Companies House registration number, food hygiene certificate, or local authority business license.",
    },
  },
  agency: {
    label: "Verified Agency",
    icon: "business",
    gradient: ["#1A6BAE", "#30855B"],
    description: "Manage and list properties on behalf of multiple landlords. Ideal for lettings agencies.",
    unlocks: ["Unlimited listings", "Agency branding on all listings", "Priority search placement", "Multi-agent team support", "Agency Dashboard"],
    requirements: ["Registered company/agency name", "Business registration certificate", "Agency license number (if applicable)", "Primary contact name and title", "Business phone and email"],
    marketNotes: {
      US: "Accepted: State real estate agency license, broker license, or business registration certificate.",
      UK: "Accepted: Companies House registration, ARLA Propertymark / NAEA membership, and client money protection certificate.",
    },
  },
  local_reviewer: {
    label: "Local Reviewer",
    icon: "star",
    gradient: ["#1A6BAE", "#30855B"],
    description: "Share trusted restaurant recommendations and community reviews as a verified local.",
    unlocks: [
      "Trusted reviewer badge on your profile and all reviews",
      "Priority placement in community review search results",
      "Higher visibility for your restaurant recommendations",
      "Access to the Community Post form on restaurant listings",
    ],
    requirements: [
      "Government-issued photo ID (to verify you're a real person)",
      "Your neighborhood or area you regularly visit",
      "A brief bio about your food interests and local knowledge",
    ],
    marketNotes: {
      US: "Accepted ID: Driver's license, passport, or state ID. No business documents required — this badge is for community members.",
      UK: "Accepted ID: Passport, driving licence, or BRP. No business registration needed — open to all verified community members.",
    },
  },
};

const ALL_BADGE_KEYS = Object.keys(BADGE_CONFIG) as UserBadge[];

function rowForBadge(rows: MyBadgeStatusRow[] | null, badge: UserBadge): MyBadgeStatusRow | undefined {
  if (!rows?.length) return undefined;
  return rows.find((r) => apiBadgeTypeToUserKey(r.badgeType) === badge);
}

/** New application allowed only when never applied or last outcome was rejected. */
function canStartNewBadgeApplication(row: MyBadgeStatusRow | undefined): boolean {
  if (!row) return true;
  return row.status === "NOT_APPLIED" || row.status === "REJECTED";
}

function badgeBlockedMessage(row: MyBadgeStatusRow | undefined): { title: string; message: string } | null {
  if (!row) return null;
  if (row.status === "PENDING") {
    return {
      title: "Application in review",
      message:
        "You already have a pending application for this badge. Check Verification Status for updates, or wait for a decision before applying again.",
    };
  }
  if (row.status === "APPROVED") {
    return {
      title: "You already have this badge",
      message: "This badge is active on your account. You do not need to apply again.",
    };
  }
  return null;
}

// ── US & UK Anti-Fraud Guidelines shown during application ────────────────────
const FRAUD_GUIDELINES = [
  "ComLinkr NEVER asks you to pay to list a property or register a restaurant.",
  "Never ask tenants or customers for payment before a verified viewing or confirmed booking.",
  "All communication with tenants must happen through ComLinkr's in-app chat for your protection.",
  "Do not share personal financial information outside of official ComLinkr verification flows.",
  "Fake listings or misrepresented properties result in immediate permanent badge revocation.",
  "Listings must accurately reflect the real property — photos, price, and address must match exactly.",
];

// ── Per-market accepted document lists ────────────────────────────────────────
// To add a new country: add a top-level key matching its MarketCode (e.g. "CA", "AU").
// Each badge type needs its own array of { section, items[] } groups.
const MARKET_DOCS: Record<string, Record<UserBadge, DocSection[]>> = {
  US: {
    landlord: [
      {
        section: "Photo ID (one required)",
        items: [
          "US passport or passport card",
          "State-issued driver's license",
          "State-issued ID card",
          "Permanent Resident Card (Green Card)",
        ],
      },
      {
        section: "Proof of Right to List the Property (one required)",
        items: [
          "Passport or government-issued photo ID (primary, all markets)",
          "County recorder / Register of Deeds title deed",
          "Mortgage statement showing property address",
          "Property tax bill in your name",
          "Closing disclosure or settlement statement",
          "Signed tenancy or lease agreement (if you are a tenant subletting)",
          "Written authorization from the property owner (if managing on their behalf)",
        ],
      },
      {
        section: "Compliance (recommended)",
        items: [
          "Landlord registration certificate (required in some cities/states)",
          "Lead paint disclosure (mandatory for pre-1978 properties)",
          "Certificate of Occupancy or Certificate of Inspection",
        ],
      },
    ],
    restaurant_owner: [
      {
        section: "Photo ID (one required)",
        items: [
          "US passport or passport card",
          "State-issued driver's license",
          "State-issued ID card",
        ],
      },
      {
        section: "Business Registration (one required)",
        items: [
          "IRS EIN confirmation letter (CP 575 or 147C)",
          "State or county business license",
          "Food service establishment permit (from local health dept.)",
          "Food handler / food manager certification",
        ],
      },
      {
        section: "Trading Compliance (recommended)",
        items: [
          "Certificate of Occupancy (from local building dept.)",
          "Liquor / beer-and-wine license (if serving alcohol)",
          "General liability insurance certificate",
        ],
      },
    ],
    agency: [
      {
        section: "Photo ID (one required)",
        items: [
          "US passport or passport card",
          "State-issued driver's license",
        ],
      },
      {
        section: "Agency Registration (one or more required)",
        items: [
          "State real estate broker license",
          "Business registration certificate (Secretary of State)",
          "NAR / local Board of Realtors membership (if applicable)",
        ],
      },
      {
        section: "Compliance (recommended)",
        items: [
          "Errors & Omissions (E&O) insurance certificate",
          "Trust / escrow account documentation",
          "Fair Housing compliance training certificate",
        ],
      },
    ],
    local_reviewer: [
      {
        section: "Photo ID (one required)",
        items: [
          "US passport or passport card",
          "State-issued driver's license",
          "State-issued ID card",
          "Permanent Resident Card (Green Card)",
        ],
      },
      {
        section: "Optional Supporting Document",
        items: [
          "Utility bill or bank statement showing your local address",
          "Any document confirming your area of residence",
        ],
      },
    ],
  },
  UK: {
    landlord: [
      {
        section: "Photo ID (one required)",
        items: [
          "UK or EU passport",
          "UK driving licence (full or provisional)",
          "Biometric Residence Permit (BRP)",
          "National Identity Card (EU nationals)",
        ],
      },
      {
        section: "Proof of Right to List the Property (one required)",
        items: [
          "Passport or government-issued photo ID (primary, all markets)",
          "HM Land Registry title register (official copy)",
          "Mortgage statement showing property address",
          "Council tax bill in your name",
          "Solicitor's completion letter",
          "Signed tenancy or assured shorthold tenancy (AST) agreement",
          "Written authorization from the property owner (if managing on their behalf)",
        ],
      },
      {
        section: "Property Compliance (recommended)",
        items: [
          "Energy Performance Certificate (EPC) — min. rating E",
          "Gas Safety Certificate (CP12) if gas appliances fitted",
          "Electrical Installation Condition Report (EICR)",
          "Houses in Multiple Occupation (HMO) licence if applicable",
        ],
      },
    ],
    restaurant_owner: [
      {
        section: "Photo ID (one required)",
        items: [
          "UK or EU passport",
          "UK driving licence (full or provisional)",
          "Biometric Residence Permit (BRP)",
        ],
      },
      {
        section: "Business Registration (one required)",
        items: [
          "Companies House Certificate of Incorporation (8-digit CRN)",
          "Local authority food business registration",
          "Food Safety / Food Hygiene Certificate (Level 2 minimum)",
          "Food Hygiene Rating Scheme (FHRS) certificate",
        ],
      },
      {
        section: "Trading Compliance (recommended)",
        items: [
          "Premises licence (if serving alcohol)",
          "Public liability insurance certificate",
          "VAT registration certificate (if applicable)",
        ],
      },
    ],
    local_reviewer: [
      {
        section: "Photo ID (one required)",
        items: [
          "UK or EU passport",
          "UK driving licence (full or provisional)",
          "Biometric Residence Permit (BRP)",
          "National Identity Card (EU nationals)",
        ],
      },
      {
        section: "Optional Supporting Document",
        items: [
          "Utility bill or bank statement showing your local address",
          "Any document confirming your area of residence",
        ],
      },
    ],
    agency: [
      {
        section: "Photo ID (one required)",
        items: [
          "UK or EU passport",
          "UK driving licence (full or provisional)",
        ],
      },
      {
        section: "Agency Registration (one or more required)",
        items: [
          "Companies House Certificate of Incorporation",
          "ARLA Propertymark membership certificate",
          "NAEA Propertymark membership certificate",
          "The Property Ombudsman (TPO) registration",
          "Propertymark Client Money Protection certificate",
        ],
      },
      {
        section: "Compliance (recommended)",
        items: [
          "Anti-money laundering (AML) registration with HMRC",
          "Professional indemnity insurance certificate",
          "ICO data protection registration number",
        ],
      },
    ],
  },
  // ── Add new markets below — copy one of the blocks above and update the docs ──
  // CA: { landlord: [...], restaurant_owner: [...], agency: [...], local_reviewer: [...] },
  // AU: { ... },
};

// ── Per-market UI labels & card config ────────────────────────────────────────
// To add a new country: add a key matching its MarketCode. All fields are required
// except landlordOptionalDoc (shown instead of optionalDoc for landlord badge only).
type MarketLabels = {
  govIdDoc: string;
  agencyLicenseLabel: string;
  agencyLicensePlaceholder: string;
  optionalDoc: string;
  landlordOptionalDoc?: string;
  marketDisplayName: string;
  docsCardTitle: string;
  docsCardNote?: string;
  docsCardGradient: [string, string];
};

const MARKET_LABELS: Record<string, MarketLabels> = {
  US: {
    govIdDoc: "Passport or Government-Issued Photo ID",
    agencyLicenseLabel: "Agency License Number",
    agencyLicensePlaceholder: "State real estate license number",
    optionalDoc: "Property / Business Photo (optional)",
    marketDisplayName: "United States",
    docsCardTitle: "US Accepted Documents",
    docsCardGradient: ["#002868", "#BF0A30"],
  },
  UK: {
    govIdDoc: "Passport, Driving Licence, or BRP",
    agencyLicenseLabel: "Companies House Number / Agency License",
    agencyLicensePlaceholder: "8-digit Companies House number",
    optionalDoc: "Property / Business Photo (optional)",
    landlordOptionalDoc: "EPC / Gas Safety Certificate (optional)",
    marketDisplayName: "United Kingdom",
    docsCardTitle: "UK Accepted Documents",
    docsCardNote: "Documents in Welsh are also accepted. Foreign-language documents must include a certified English translation.",
    docsCardGradient: ["#003087", "#1A6BAE"],
  },
  // CA: {
  //   govIdDoc: "Passport, Provincial ID, or PR Card",
  //   agencyLicenseLabel: "Provincial Real Estate Council License",
  //   agencyLicensePlaceholder: "e.g. RECA or RECO license number",
  //   optionalDoc: "Property / Business Photo (optional)",
  //   marketDisplayName: "Canada",
  //   docsCardTitle: "CA Accepted Documents",
  //   docsCardGradient: ["#FF0000", "#D80000"],
  // },
};

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number; idleColor?: string }) {
  const { tc } = useTheme();
  const p = useSharedValue((current + 1) / total);
  useEffect(() => { p.value = withSpring((current + 1) / total, SPRING.settle); }, [current, total, p]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.min(1, p.value) * 100}%` }));
  return (
    <View style={{ height: 4, borderRadius: 4, backgroundColor: tc.surface3, overflow: "hidden", marginHorizontal: 16, marginBottom: 6 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: current + 1 }}>
      <Animated.View style={[{ height: "100%", borderRadius: 3, overflow: "hidden" }, fill]}><GradientFill style={StyleSheet.absoluteFill} /></Animated.View>
    </View>
  );
}

// ── Field component ────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  required,
  hint,
  multiline,
  error,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric" | "url";
  required?: boolean;
  hint?: string;
  multiline?: boolean;
  error?: string | null;
  onBlur?: () => void;
}) {
  const { tc } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6, marginLeft: 2 }]}>
        {label}
        {required ? <Text style={{ color: tc.dangerText }}> *</Text> : null}
      </Text>
      {hint ? <Text style={[TYPE.small, { color: tc.textTertiary, marginBottom: 6, marginLeft: 2, fontSize: 12 }]}>{hint}</Text> : null}
      <TextInput
        style={[
          TYPE.body,
          { minHeight: multiline ? 96 : 50, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: tc.inputBg, color: tc.textPrimary, borderWidth: 1, borderColor: error ? tc.dangerText : "transparent" },
        ]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={tc.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" || keyboardType === "url" ? "none" : "words"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        accessibilityLabel={label}
      />
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, marginLeft: 2 }}>
          <Ionicons name="alert-circle" size={14} color={tc.dangerText} />
          <Text style={[TYPE.small, { color: tc.dangerText, fontSize: 12 }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Document upload placeholder ───────────────────────────────────────────────
function DocUploadRow({
  label,
  required,
  uploaded,
  uploadedDetail,
  onPress,
}: {
  label: string;
  required?: boolean;
  uploaded: boolean;
  uploadedDetail?: string;
  onPress: () => void;
}) {
  const { tc } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, marginBottom: 10, borderRadius: 18, borderWidth: 1, borderStyle: uploaded ? "solid" : "dashed", borderColor: uploaded ? tc.mint : tc.borderMedium, backgroundColor: uploaded ? tc.mintSoft : tc.cardBg }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: uploaded ? tc.mint : tc.accentSoft }}>
        <Ionicons name={uploaded ? "checkmark" : "cloud-upload-outline"} size={18} color={uploaded ? "#FFF" : tc.accentText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>
          {label}
          {required ? <Text style={{ color: tc.dangerText }}> *</Text> : null}
        </Text>
        <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={2}>{uploaded ? (uploadedDetail ?? "Added") : "Tap to add a photo (JPG or PNG, up to 10 MB)"}</Text>
      </View>
      <Ionicons name={uploaded ? "create-outline" : "chevron-forward"} size={16} color={tc.textTertiary} />
    </PressableScale>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ApplyBadgeScreen() {
  const { isDark, tc } = useTheme();
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams<{ badgeType?: string }>();
  const user = useAuthStore((s) => s.user);

  const market = getMarketCode(user?.country);
  const labels: MarketLabels = MARKET_LABELS[market] ?? MARKET_LABELS["US"];

  // Determine pre-selected badge (deep link); step 0 until status is loaded and validated
  const preselected = (params.badgeType as UserBadge | undefined) ?? null;
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(preselected);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [badgeRows, setBadgeRows] = useState<MyBadgeStatusRow[] | null>(null);
  const [badgeStatusLoading, setBadgeStatusLoading] = useState(true);
  const preselectHandledRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setBadgeStatusLoading(true);
        try {
          const rows = await getMyBadgeStatus();
          if (!cancelled) {
            preselectHandledRef.current = false;
            setBadgeRows(rows);
          }
        } catch {
          if (!cancelled) {
            preselectHandledRef.current = false;
            setBadgeRows([]);
          }
        } finally {
          if (!cancelled) setBadgeStatusLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    if (badgeRows === null || preselectHandledRef.current) return;
    preselectHandledRef.current = true;
    if (!preselected) return;
    const row = rowForBadge(badgeRows, preselected);
    if (canStartNewBadgeApplication(row)) {
      setSelectedBadge(preselected);
      // Only skip the chooser when still on step 0 (avoids resetting progress after refetch)
      setStep((s) => (s === 0 ? 1 : s));
    } else {
      const blocked = badgeBlockedMessage(row);
      if (blocked) {
        appAlert(blocked.title, blocked.message, [
          { text: "OK", style: "default" },
          { text: "View status", onPress: () => router.push("/verification-status" as any) },
        ]);
      }
      setSelectedBadge(null);
      setStep((s) => (s <= 1 ? 0 : s));
    }
  }, [badgeRows, preselected]);

  const prevPreselectedRef = useRef(preselected);
  useEffect(() => {
    if (prevPreselectedRef.current !== preselected) {
      prevPreselectedRef.current = preselected;
      preselectHandledRef.current = false;
    }
  }, [preselected]);

  const eligibleBadges = useMemo(() => {
    if (badgeRows === null) return null;
    return ALL_BADGE_KEYS.filter((b) => canStartNewBadgeApplication(rowForBadge(badgeRows, b)));
  }, [badgeRows]);

  /** When opening via `?badgeType=` and that badge can still be applied, progress dots skip the chooser step. */
  const preselectedSkipsChooser =
    Boolean(preselected) &&
    badgeRows !== null &&
    canStartNewBadgeApplication(rowForBadge(badgeRows, preselected as UserBadge)) &&
    step >= 1;

  useEffect(() => {
    if (eligibleBadges === null || !selectedBadge) return;
    if (!eligibleBadges.includes(selectedBadge)) setSelectedBadge(null);
  }, [eligibleBadges, selectedBadge]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(user?.name || "");
  const [businessPhone, setBusinessPhone] = useState(user?.phone || "");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [businessEmail, setBusinessEmail] = useState(user?.email || "");
  const [propertyAddress, setPropertyAddress] = useState("");
  // Restaurant
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  // Agency
  const [agencyName, setAgencyName] = useState("");
  const [agencyLicense, setAgencyLicense] = useState("");
  const [propertiesManaged, setPropertiesManaged] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  // Local reviewer fields
  const [reviewerNeighborhood, setReviewerNeighborhood] = useState("");
  const [reviewerBio, setReviewerBio] = useState("");
  const [ownershipType, setOwnershipType] = useState<"OWN" | "MANAGE">("OWN");
  /** Order: index 0 = government ID (API); then type-specific; then optional. */
  const [fileGovId, setFileGovId] = useState<PickedDocument | null>(null);
  const [fileSecondary, setFileSecondary] = useState<PickedDocument | null>(null);
  const [fileOptional, setFileOptional] = useState<PickedDocument | null>(null);
  // Terms agreement
  const [termsAgreed, setTermsAgreed] = useState(false);

  const config = selectedBadge ? BADGE_CONFIG[selectedBadge] : null;

  // ── Step 0: Badge type selection ────────────────────────────────────────────
  const renderBadgeSelect = () => {
    if (badgeRows === null) {
      return (
        <View style={[styles.section, { alignItems: "center", paddingVertical: rs(48) }]}>
          <ActivityIndicator size="large" color={Colors.brand.blue} />
          <Text style={[styles.stepDesc, { color: tc.textSecondary, marginTop: rs(14) }]}>Loading your badge status…</Text>
        </View>
      );
    }

    if (eligibleBadges && eligibleBadges.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>All set for now</Text>
          <Text style={[styles.stepDesc, { color: tc.textSecondary }]}>
            You already hold every badge type, or you have applications still in review. Manage status anytime from Verification.
          </Text>
          <Pressable
            onPress={() => router.push("/verification-status" as any)}
            style={{ marginTop: rs(16) }}
          >
            <LinearGradient colors={["#1A6BAE", "#30855B"]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.nextBtnText}>Open verification status</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    const handleContinueFromChooser = () => {
      if (!selectedBadge) return;
      const row = rowForBadge(badgeRows, selectedBadge);
      const blocked = badgeBlockedMessage(row);
      if (blocked) {
        appAlert(blocked.title, blocked.message, [
          { text: "OK" },
          { text: "View status", onPress: () => router.push("/verification-status" as any) },
        ]);
        return;
      }
      if (!canStartNewBadgeApplication(row)) return;
      setStep(1);
    };

    return (
      <View style={styles.section}>
        <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>Choose a badge</Text>
        <Text style={[styles.stepDesc, { color: tc.textSecondary }]}>What best describes your role on ComLinkr?</Text>
        <Text style={[styles.badgeChooserHint, { color: tc.textTertiary }]}>
          Badges you already have, or that are awaiting review, are hidden. Rejected applications can be submitted again.
        </Text>

        {eligibleBadges!.map((badge) => {
          const cfg = BADGE_CONFIG[badge];
          const isSelected = selectedBadge === badge;
          return (
            <Pressable
              key={badge}
              onPress={() => setSelectedBadge(badge)}
              style={[
                styles.badgeOption,
                { borderColor: tc.borderLight, backgroundColor: tc.cardBg },
                isSelected && { borderColor: Colors.brand.blue, backgroundColor: tc.pillBg },
              ]}
            >
              <LinearGradient
                colors={isSelected ? cfg.gradient : [tc.borderLight, tc.borderMedium]}
                style={styles.badgeOptionIcon}
              >
                <Ionicons name={cfg.icon as any} size={20} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.badgeOptionLabel, { color: tc.textPrimary }, isSelected && { color: cfg.gradient[0] }]}>
                  {cfg.label}
                </Text>
                <Text style={[styles.badgeOptionDesc, { color: tc.textSecondary }]}>{cfg.description}</Text>
              </View>
              <View style={[styles.badgeRadio, { borderColor: tc.borderMedium }, isSelected && { borderColor: cfg.gradient[0] }]}>
                {isSelected && <View style={[styles.badgeRadioDot, { backgroundColor: cfg.gradient[0] }]} />}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleContinueFromChooser}
          style={{ opacity: selectedBadge ? 1 : 0.4, marginTop: rs(8) }}
          disabled={!selectedBadge || badgeStatusLoading}
        >
          <LinearGradient
            colors={selectedBadge ? BADGE_CONFIG[selectedBadge].gradient : ["#9CA3AF", "#6B7280"]}
            style={styles.nextBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  // ── Step 1: What you unlock + requirements ──────────────────────────────────
  const renderRequirements = (embedded = false) => {
    if (!config || !selectedBadge) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>What you get</Text>
        <View style={[styles.unlockCard, { borderColor: tc.borderLight }]}>
          <LinearGradient colors={config.gradient} style={styles.unlockCardHeader}>
            <Ionicons name={config.icon as any} size={22} color="#FFF" />
            <Text style={styles.unlockCardTitle}>{config.label}</Text>
          </LinearGradient>
          <View style={[styles.unlockCardBody, { backgroundColor: tc.cardBg }]}>
            {config.unlocks.map((u, i) => (
              <View key={i} style={styles.unlockRow}>
                <Ionicons name="checkmark-circle" size={14} color="#30855B" />
                <Text style={[styles.unlockText, { color: tc.textSecondary }]}>{u}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.stepTitle, { marginTop: rs(20), color: tc.textPrimary }]}>You will need</Text>
        <View style={styles.requirementsList}>
          {config.requirements.map((req, i) => (
            <View key={i} style={styles.requirementRow}>
              <View style={styles.requirementNum}>
                <Text style={styles.requirementNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.requirementText, { color: tc.textSecondary }]}>{req}</Text>
            </View>
          ))}
        </View>

        {/* Market-specific guidance */}
        <View style={[styles.marketNote, isDark && { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
          <Ionicons name="flag" size={13} color={Colors.brand.blue} />
          <Text style={[styles.marketNoteText, isDark && { color: "#93C5FD" }]}>
            <Text style={{ fontWeight: "700" }}>{labels.marketDisplayName}: </Text>
            {config.marketNotes[market] ?? config.marketNotes["US"]}
          </Text>
        </View>

        {!embedded && (
        <View style={styles.navRow}>
          {!preselected && (
            <Pressable onPress={() => setStep(0)} style={[styles.backBtn, { borderColor: tc.borderLight, backgroundColor: tc.cardBg }]}>
              <Ionicons name="chevron-back" size={16} color={Colors.brand.blue} />
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setStep(2)} style={{ flex: 1 }}>
            <LinearGradient colors={config.gradient} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.nextBtnText}>Start</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </View>
        )}
      </View>
    );
  };

  // Whether the details page is complete (used by its Continue button).
  const detailsPhoneOk = validatePhoneNumber(businessPhone, market).valid;
  const step2Valid = fullName.trim().length > 0 && businessPhone.trim().length > 0 && detailsPhoneOk &&
    (selectedBadge === "landlord" ? propertyAddress.trim().length > 0 : true) &&
    (selectedBadge === "restaurant_owner" ? restaurantName.trim().length > 0 && restaurantAddress.trim().length > 0 : true) &&
    (selectedBadge === "agency" ? agencyName.trim().length > 0 : true) &&
    (selectedBadge === "local_reviewer" ? reviewerNeighborhood.trim().length > 0 && reviewerBio.trim().length > 0 : true);
  const step3Valid = selectedBadge === "local_reviewer" ? !!fileGovId : !!fileGovId && !!fileSecondary;

  // ── Step 2: Business details form ───────────────────────────────────────────
  const renderForm = (embedded = false) => {
    if (!config || !selectedBadge) return null;
    const phoneValidation = validatePhoneNumber(businessPhone, market);
    const phoneError = phoneTouched && businessPhone.trim().length > 0 && !phoneValidation.valid
      ? phoneValidation.error
      : null;

    return (
      <View style={styles.section}>
        <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>Your details</Text>
        <Text style={[styles.stepDesc, { color: tc.textSecondary }]}>All information must be accurate and match your official documents.</Text>

        <Field label="Full Legal Name" value={fullName} onChangeText={setFullName} placeholder="As it appears on your ID" required />
        <Field
          label="Business Phone"
          value={businessPhone}
          onChangeText={(v) => {
//             setBusinessPhone(v);
// New:
               setBusinessPhone(sanitizePhoneInput(v, market));
            if (!phoneTouched) setPhoneTouched(true);
          }}
          onBlur={() => setPhoneTouched(true)}
          placeholder={market === "UK" ? "07700 900000 or +44 7700 900000" : "(555) 123-4567 or +1 555 123 4567"}
          hint={formatPhoneHint(market)}
          keyboardType="phone-pad"
          required
          error={phoneError}
        />
        <Field label="Business Email" value={businessEmail} onChangeText={setBusinessEmail} placeholder="your@business.com" keyboardType="email-address" />

        {selectedBadge === "landlord" && (
          <>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: tc.textSecondary }]}>
                Your relationship to the property<Text style={styles.required}> *</Text>
              </Text>
              <View style={styles.ownershipRow}>
                <Pressable
                  onPress={() => setOwnershipType("OWN")}
                  style={[
                    styles.ownershipBtn,
                    { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
                    ownershipType === "OWN" && styles.ownershipBtnActive,
                  ]}
                >
                  <Ionicons
                    name={ownershipType === "OWN" ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={ownershipType === "OWN" ? Colors.brand.blue : tc.textTertiary}
                  />
                  <Text style={[styles.ownershipBtnText, { color: tc.textPrimary }, ownershipType === "OWN" && styles.ownershipBtnTextActive]}>
                    I own this property
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setOwnershipType("MANAGE")}
                  style={[
                    styles.ownershipBtn,
                    { backgroundColor: tc.cardBg, borderColor: tc.borderLight },
                    ownershipType === "MANAGE" && styles.ownershipBtnActive,
                  ]}
                >
                  <Ionicons
                    name={ownershipType === "MANAGE" ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={ownershipType === "MANAGE" ? Colors.brand.blue : tc.textTertiary}
                  />
                  <Text style={[styles.ownershipBtnText, { color: tc.textPrimary }, ownershipType === "MANAGE" && styles.ownershipBtnTextActive]}>
                    I manage it for the owner
                  </Text>
                </Pressable>
              </View>
            </View>
            <Field label="Property Address" value={propertyAddress} onChangeText={setPropertyAddress} placeholder="Full address of the property you intend to list" required multiline />
          </>
        )}

        {selectedBadge === "restaurant_owner" && (
          <>
            <Field label="Restaurant / Business Name" value={restaurantName} onChangeText={setRestaurantName} placeholder="e.g. Mario's Italian Kitchen" required />
            <Field label="Cuisine Type" value={cuisineType} onChangeText={setCuisineType} placeholder="e.g. Italian, Indian, American" />
            <Field label="Restaurant Address" value={restaurantAddress} onChangeText={setRestaurantAddress} placeholder="Full physical address of your restaurant" required multiline />
          </>
        )}

        {selectedBadge === "local_reviewer" && (
          <>
            <Field
              label="Your Neighborhood / Area"
              value={reviewerNeighborhood}
              onChangeText={setReviewerNeighborhood}
              placeholder="e.g. Brooklyn, NY or Shoreditch, London"
              required
            />
            <Field
              label="About You as a Local Reviewer"
              value={reviewerBio}
              onChangeText={setReviewerBio}
              placeholder="Tell us about your food interests and local knowledge — what cuisines you love, neighborhoods you frequent, and why you want to be a trusted local reviewer..."
              required
              multiline
            />
          </>
        )}

        {selectedBadge === "agency" && (
          <>
            <Field label="Agency / Company Name" value={agencyName} onChangeText={setAgencyName} placeholder="e.g. Smith & Partners Lettings" required />
            <Field
              label="Number of Properties Managed"
              value={propertiesManaged}
              onChangeText={setPropertiesManaged}
              placeholder="Approximate number"
              keyboardType="numeric"
            />
            <Field label="Company Website" value={companyWebsite} onChangeText={setCompanyWebsite} placeholder="https://yourcompany.com" keyboardType="url" />
          </>
        )}

        {!embedded && (
        <View style={styles.navRow}>
          <Pressable onPress={() => setStep(1)} style={[styles.backBtn, { borderColor: tc.borderLight, backgroundColor: tc.cardBg }]}>
            <Ionicons name="chevron-back" size={16} color={Colors.brand.blue} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
          <Pressable
            onPress={() => step2Valid && setStep(selectedBadge === "restaurant_owner" ? 4 : 3)}
            style={[{ flex: 1 }, !step2Valid && { opacity: 0.4 }]}
          >
            <LinearGradient colors={config.gradient} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.nextBtnText}>{selectedBadge === "restaurant_owner" ? "Review & Submit" : "Upload Documents"}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </View>
        )}
      </View>
    );
  };

  // ── Step 3: Document upload ─────────────────────────────────────────────────
  const renderDocuments = (embedded = false) => {
    if (!config || !selectedBadge) return null;

    const secondaryLabel =
      selectedBadge === "landlord"
        ? "Proof of right to list (deed, lease, or authorization)"
        : selectedBadge === "agency"
          ? "Business registration certificate"
          : "Business license / registration";

    const pickGov = async () => {
      const d = await pickVerificationDocument();
      if (d) setFileGovId(d);
    };
    const pickSecondary = async () => {
      const d = await pickVerificationDocument();
      if (d) setFileSecondary(d);
    };
    const pickOptional = async () => {
      const d = await pickVerificationDocument();
      if (d) setFileOptional(d);
    };

    return (
      <View style={styles.section}>
        <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>Add your documents</Text>
        <Text style={[styles.stepDesc, { color: tc.textSecondary }]}>
          Photos from your library (JPG/PNG). Max 10MB each. Documents are reviewed by our verification team and kept confidential.
        </Text>

        {/* Market-specific accepted document guide — shown for any market in MARKET_DOCS */}
        {MARKET_DOCS[market] && (
          <View style={[styles.ukDocsCard, isDark && { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
            <View style={[styles.ukDocsHeader, { }]}>
              <LinearGradient colors={labels.docsCardGradient} style={styles.ukDocsFlag}>
                <Text style={styles.ukDocsFlagText}>{market}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ukDocsTitle, { color: tc.textPrimary }]}>{labels.docsCardTitle}</Text>
                <Text style={[styles.ukDocsSub, { color: tc.textSecondary }]}>All documents must be current, clear, and unaltered.</Text>
              </View>
            </View>
            {MARKET_DOCS[market][selectedBadge].map((group) => (
              <View key={group.section} style={styles.ukDocsGroup}>
                <Text style={styles.ukDocsGroupTitle}>{group.section}</Text>
                {group.items.map((item, i) => (
                  <View key={i} style={styles.ukDocsItem}>
                    <Ionicons name="document-text-outline" size={12} color={Colors.brand.blue} />
                    <Text style={[styles.ukDocsItemText, isDark && { color: "#93C5FD" }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
            {labels.docsCardNote && (
              <View style={[styles.ukDocsNote, isDark && { backgroundColor: "#0A1628" }]}>
                <Ionicons name="information-circle-outline" size={13} color="#60A5FA" />
                <Text style={[styles.ukDocsNoteText, isDark && { color: "#93C5FD" }]}>{labels.docsCardNote}</Text>
              </View>
            )}
          </View>
        )}

        <DocUploadRow
          label={labels.govIdDoc}
          required
          uploaded={!!fileGovId}
          uploadedDetail={fileGovId?.name}
          onPress={pickGov}
        />
        {selectedBadge !== "local_reviewer" && (
          <DocUploadRow
            label={secondaryLabel}
            required
            uploaded={!!fileSecondary}
            uploadedDetail={fileSecondary?.name}
            onPress={pickSecondary}
          />
        )}
        {selectedBadge !== "local_reviewer" && (
          <DocUploadRow
            label={(selectedBadge === "landlord" && labels.landlordOptionalDoc) || labels.optionalDoc}
            uploaded={!!fileOptional}
            uploadedDetail={fileOptional?.name}
            onPress={pickOptional}
          />
        )}

        {/* Fraud guidelines */}
        <View style={[styles.fraudCard, isDark && { backgroundColor: "#1A0505", borderColor: "#7F1D1D" }]}>
          <View style={styles.fraudHeader}>
            <LinearGradient colors={["#DC2626", "#EF4444"]} style={styles.fraudIcon}>
              <Ionicons name="shield-checkmark" size={14} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.fraudTitle, isDark && { color: "#FCA5A5" }]}>ComLinkr Safety Guidelines</Text>
          </View>
          {FRAUD_GUIDELINES.map((g, i) => (
            <View key={i} style={styles.fraudRow}>
              <View style={styles.fraudDot} />
              <Text style={[styles.fraudText, isDark && { color: "#FCA5A5" }]}>{g}</Text>
            </View>
          ))}
        </View>

        {!embedded && (
        <View style={styles.navRow}>
          <Pressable onPress={() => setStep(2)} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={16} color={Colors.brand.blue} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
          <Pressable onPress={() => step3Valid && setStep(4)} style={[{ flex: 1 }, !step3Valid && { opacity: 0.4 }]}>
            <LinearGradient colors={config.gradient} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.nextBtnText}>Review & Submit</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </View>
        )}
      </View>
    );
  };

  // ── Step 4: Review & submit ─────────────────────────────────────────────────
  const renderReview = () => {
    if (!config || !selectedBadge) return null;

    const handleSubmit = async () => {
      if (!termsAgreed) {
        appAlert("Agreement Required", "Please confirm that all information is accurate before submitting.");
        return;
      }
      const phoneCheck = validatePhoneNumber(businessPhone, market);
      if (!phoneCheck.valid) {
        appAlert("Invalid phone number", phoneCheck.error ?? "Enter a valid business phone number.");
        setStep(1);
        return;
      }
      const docs: PickedDocument[] = [];
      if (selectedBadge === "local_reviewer") {
        if (fileGovId) docs.push(fileGovId);
      } else {
        if (fileGovId) docs.push(fileGovId);
        if (fileSecondary) docs.push(fileSecondary);
        if (fileOptional) docs.push(fileOptional);
      }
      if (!docs.length) {
        appAlert("Documents", "Add at least your government ID.");
        return;
      }

      setSubmitting(true);
      try {
        const badgeType = userBadgeKeyToApi(selectedBadge);
        const fields: SubmitBadgeApplicationFields = {
          badgeType,
          fullLegalName: fullName.trim(),
          businessPhone: phoneCheck.e164 ?? businessPhone.trim(),
        };
        if (businessEmail.trim()) fields.businessEmail = businessEmail.trim();
        if (selectedBadge === "landlord") {
          fields.ownershipType = ownershipType;
          fields.propertyAddress = propertyAddress.trim();
        }
        if (selectedBadge === "restaurant_owner") {
          fields.restaurantName = restaurantName.trim();
          if (cuisineType.trim()) fields.cuisineType = cuisineType.trim();
          fields.restaurantAddress = restaurantAddress.trim();
        }
        if (selectedBadge === "agency") {
          fields.agencyName = agencyName.trim();
          if (agencyLicense.trim()) fields.agencyLicense = agencyLicense.trim();
          if (propertiesManaged.trim()) {
            const n = parseInt(propertiesManaged, 10);
            if (!Number.isNaN(n)) fields.propertiesManaged = n;
          }
          if (companyWebsite.trim()) fields.companyWebsite = companyWebsite.trim();
        }
        if (selectedBadge === "local_reviewer") {
          fields.neighborhoodArea = reviewerNeighborhood.trim();
          fields.reviewerBio = reviewerBio.trim();
        }

        await submitBadgeApplication(fields, docs);
        setStep(5);
      } catch (e: unknown) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to submit. Please try again.";
        appAlert("Could not submit", msg);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <View style={styles.section}>
        <Text style={[styles.stepTitle, { color: tc.textPrimary }]}>Check and send</Text>

        <View style={[styles.summaryCard, { borderColor: tc.borderLight }]}>
          <LinearGradient colors={config.gradient} style={styles.summaryHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name={config.icon as any} size={20} color="#FFF" />
            <Text style={styles.summaryHeaderText}>{config.label}</Text>
          </LinearGradient>
          <View style={[styles.summaryBody, { backgroundColor: tc.cardBg }]}>
            {[
              { label: "Name", value: fullName },
              { label: "Phone", value: businessPhone },
              { label: "Email", value: businessEmail || "Not provided" },
              ...(selectedBadge === "landlord" ? [
                { label: "Property", value: propertyAddress },
              ] : []),
              ...(selectedBadge === "restaurant_owner" ? [
                { label: "Restaurant", value: restaurantName },
                { label: "Cuisine", value: cuisineType || "Not specified" },
                { label: "Address", value: restaurantAddress },
              ] : []),
              ...(selectedBadge === "agency" ? [
                { label: "Agency", value: agencyName },
                ...(agencyLicense.trim() ? [{ label: "License #", value: agencyLicense }] : []),
                { label: "Properties", value: propertiesManaged || "Not specified" },
              ] : []),
              { label: "Documents", value: `${[fileGovId, fileSecondary, fileOptional].filter(Boolean).length} file(s) selected` },
              { label: "Market", value: labels.marketDisplayName },
            ].map((row, i) => (
              <View key={i} style={[styles.summaryRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight, paddingTop: rs(8) }]}>
                <Text style={[styles.summaryLabel, { color: tc.textTertiary }]}>{row.label}</Text>
                <Text style={[styles.summaryValue, { color: tc.textPrimary }]} numberOfLines={2}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Terms agreement */}
        <Pressable onPress={() => setTermsAgreed((v) => !v)} style={styles.termsRow}>
          <View style={[styles.checkbox, { borderColor: tc.borderMedium }, termsAgreed && styles.checkboxActive]}>
            {termsAgreed && <Ionicons name="checkmark" size={12} color="#FFF" />}
          </View>
          <Text style={[styles.termsText, { color: tc.textSecondary }]}>
            I confirm all information provided is accurate and I agree to ComLinkr's{" "}
            <Text style={{ color: Colors.brand.blue }}>Verification Terms of Service</Text> and{" "}
            <Text style={{ color: Colors.brand.blue }}>fraud prevention policy</Text>.
          </Text>
        </Pressable>

        <View style={styles.navRow}>
          <Pressable onPress={() => setStep(1)} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={16} color={Colors.brand.blue} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !termsAgreed}
            style={[{ flex: 1 }, (!termsAgreed || submitting) && { opacity: 0.5 }]}
          >
            <LinearGradient colors={config.gradient} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="send" size={16} color="#FFF" />
              <Text style={styles.nextBtnText}>{submitting ? "Submitting..." : "Submit Application"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  };

  // ── Step 5: Confirmation ────────────────────────────────────────────────────
  const renderConfirmation = () => (
    <View style={[styles.section, { alignItems: "center", paddingTop: rs(40) }]}>
      <LinearGradient colors={["#1A6BAE", "#30855B"]} style={styles.successCircle}>
        <Ionicons name="checkmark" size={40} color="#FFF" />
      </LinearGradient>
      <Text style={[styles.successTitle, { color: tc.textPrimary }]}>Application Submitted!</Text>
      <Text style={[styles.successDesc, { color: tc.textSecondary }]}>
        Your {config?.label} verification is now under review. Our team will respond within 48 hours.
      </Text>

      <View style={styles.nextStepsList}>
        {[
          "Our team reviews your documents",
          "You'll receive a push notification with the decision",
          "Once approved, your badge activates immediately",
        ].map((step, i) => (
          <View key={i} style={styles.nextStepRow}>
            <LinearGradient colors={["#1A6BAE", "#30855B"]} style={styles.nextStepNum}>
              <Text style={styles.nextStepNumText}>{i + 1}</Text>
            </LinearGradient>
            <Text style={[styles.nextStepText, { color: tc.textSecondary }]}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: rs(12), marginTop: rs(32), width: "100%" }}>
        <Pressable onPress={() => router.push("/verification-status" as any)} style={[styles.outlineBtn, { flex: 1 }]}>
          <Text style={styles.outlineBtnText}>See status</Text>
        </Pressable>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} style={{ flex: 1 }}>
          <LinearGradient colors={["#1A6BAE", "#30855B"]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.nextBtnText}>Back to Home</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );

  // Current visible step index for dot indicator (skip chooser when deep-linked to an eligible badge)
  const visible = step === 0 ? 0 : step <= 3 ? 1 : 2;
  const adjustedTotal = preselectedSkipsChooser ? 2 : 3;
  const adjustedStep = preselectedSkipsChooser ? Math.max(0, visible - 1) : visible;
  const stepName = ["Choose", "Your details", "Send"][visible];

  const goBackStep = () => {
    const atEntryPoint = step <= 0 || step >= 5 || (step === 1 && Boolean(preselected));
    if (atEntryPoint) { goBackOr("/(tabs)/feed"); return; }
    setStep(step === 4 ? 1 : step - 1);
  };
  return (
    <DPage
      title={step >= 5 ? "Application sent" : "Get a badge"}
      sub={step < 5 ? `Step ${adjustedStep + 1} of ${adjustedTotal} · ${stepName}` : undefined}
      onBack={goBackStep}
    >
      {step < 5 ? <StepDots total={adjustedTotal} current={adjustedStep} /> : null}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View key={step} style={{ paddingHorizontal: 16, paddingTop: 10 }} entering={reduceMotion ? undefined : FadeInRight.springify().damping(20).stiffness(200).mass(1)}>
          {step === 0 && renderBadgeSelect()}
          {step === 1 && (
            <>
              {renderRequirements(true)}
              {renderForm(true)}
              {selectedBadge !== "restaurant_owner" ? renderDocuments(true) : null}
              <GradientButton
                block
                label="Continue"
                disabled={!(step2Valid && (selectedBadge === "restaurant_owner" || step3Valid))}
                onPress={() => setStep(4)}
                outerStyle={{ marginTop: 8, marginBottom: 12 }}
              />
            </>
          )}
          {step === 4 && renderReview()}
          {step === 5 && renderConfirmation()}
        </Animated.View>
      </KeyboardAvoidingView>
    </DPage>
  );
}

const styles = createThemedStyles({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(14),
    paddingTop: rs(12),
    paddingBottom: rs(14),
    gap: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: rs(4),
    elevation: 2,
  },
  headerBack: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: rs(16),
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerBadgeIcon: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    alignItems: "center",
    justifyContent: "center",
  },
  stepDots: {
    flexDirection: "row",
    gap: rs(5),
    marginTop: rs(4),
  },
  stepDot: {
    height: rs(4),
    borderRadius: rs(2),
  },
  stepDotActive: { width: rs(24), backgroundColor: Colors.brand.blue },
  stepDotDone: { width: rs(16), backgroundColor: Colors.brand.green },
  scroll: { paddingHorizontal: rs(16), paddingTop: rs(16) },
  section: {},

  // ── Badge selection ──
  stepTitle: { fontSize: rs(17), fontWeight: "800", marginBottom: rs(4) },
  stepDesc: { fontSize: rs(13), lineHeight: rs(18), marginBottom: rs(16) },
  badgeChooserHint: { fontSize: rs(11), lineHeight: rs(16), marginBottom: rs(12) },
  badgeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    padding: rs(14),
    borderRadius: rs(14),
    borderWidth: 1.5,
    marginBottom: rs(10),
  },
  badgeOptionSelected: { borderColor: Colors.brand.blue },
  badgeOptionIcon: { width: rs(40), height: rs(40), borderRadius: rs(12), alignItems: "center", justifyContent: "center" },
  badgeOptionLabel: { fontSize: rs(14), fontWeight: "700", marginBottom: rs(2) },
  badgeOptionDesc: { fontSize: rs(12), lineHeight: rs(16) },
  badgeRadio: {
    width: rs(20),
    height: rs(20),
    borderRadius: rs(10),
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRadioDot: { width: rs(10), height: rs(10), borderRadius: rs(5) },

  // ── What you unlock ──
  unlockCard: { borderRadius: rs(16), overflow: "hidden", borderWidth: 1, marginBottom: rs(4) },
  unlockCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    padding: rs(14),
  },
  unlockCardTitle: { fontSize: rs(15), fontWeight: "800", color: "#FFF" },
  unlockCardBody: { padding: rs(14), gap: rs(8) },
  unlockRow: { flexDirection: "row", alignItems: "center", gap: rs(8) },
  unlockText: { fontSize: rs(13), fontWeight: "500", flex: 1 },
  requirementsList: { gap: rs(10), marginBottom: rs(12) },
  requirementRow: { flexDirection: "row", alignItems: "flex-start", gap: rs(10) },
  requirementNum: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(11),
    backgroundColor: Colors.brand.blue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: rs(1),
  },
  requirementNumText: { fontSize: rs(11), fontWeight: "800", color: "#FFF" },
  requirementText: { flex: 1, fontSize: rs(13), lineHeight: rs(18) },
  marketNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(8),
    backgroundColor: "#EEF5FF",
    padding: rs(12),
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: rs(16),
  },
  marketNoteText: { flex: 1, fontSize: rs(12), color: "#1E40AF", lineHeight: rs(17) },

  // ── Form fields ──
  field: { marginBottom: rs(14) },
  fieldLabel: { fontSize: rs(12), fontWeight: "700", marginBottom: rs(4), textTransform: "uppercase", letterSpacing: 0.3 },
  fieldHint: { fontSize: rs(11), marginBottom: rs(6), lineHeight: rs(15) },
  required: { color: "#EF4444" },
  fieldInput: {
    borderRadius: rs(12),
    borderWidth: 1.5,
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    fontSize: rs(14),
  },
  fieldInputMulti: { height: rs(80), textAlignVertical: "top" },
  fieldErrorRow: { flexDirection: "row", alignItems: "center", gap: rs(5), marginTop: rs(5) },
  fieldErrorText: { fontSize: rs(11), color: "#DC2626", flex: 1, lineHeight: rs(15) },
  ownershipRow: { flexDirection: "row", gap: rs(10) },
  ownershipBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
    padding: rs(12),
    borderRadius: rs(12),
    borderWidth: 1.5,
  },
  ownershipBtnActive: { borderColor: Colors.brand.blue },
  ownershipBtnText: { fontSize: rs(12), fontWeight: "600", flex: 1 },
  ownershipBtnTextActive: { color: Colors.brand.blue, fontWeight: "700" },

  // ── Document upload ──
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    padding: rs(14),
    borderRadius: rs(14),
    borderWidth: 1.5,
    marginBottom: rs(10),
  },
  docRowUploaded: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  docIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    alignItems: "center",
    justifyContent: "center",
  },
  docIconDone: { backgroundColor: Colors.brand.green },
  docLabel: { fontSize: rs(13), fontWeight: "700", marginBottom: rs(2) },
  docSub: { fontSize: rs(11) },

  // ── UK document guide ──
  ukDocsCard: {
    backgroundColor: "#F0F4FF",
    borderRadius: rs(14),
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    padding: rs(14),
    marginBottom: rs(14),
  },
  ukDocsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    marginBottom: rs(12),
  },
  ukDocsFlag: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(10),
    alignItems: "center",
    justifyContent: "center",
  },
  ukDocsFlagText: {
    fontSize: rs(11),
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  ukDocsTitle: {
    fontSize: rs(13),
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: rs(1),
  },
  ukDocsSub: {
    fontSize: rs(11),
    color: "#3B5998",
  },
  ukDocsGroup: {
    marginBottom: rs(10),
  },
  ukDocsGroupTitle: {
    fontSize: rs(11),
    fontWeight: "800",
    color: Colors.brand.blue,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: rs(5),
  },
  ukDocsItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(7),
    marginBottom: rs(4),
  },
  ukDocsItemText: {
    flex: 1,
    fontSize: rs(12),
    color: "#1E40AF",
    lineHeight: rs(17),
  },
  ukDocsNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(7),
    marginTop: rs(4),
    padding: rs(10),
    backgroundColor: "#DBEAFE",
    borderRadius: rs(10),
  },
  ukDocsNoteText: {
    flex: 1,
    fontSize: rs(11),
    color: "#1E40AF",
    lineHeight: rs(16),
  },

  // ── Fraud guidelines ──
  fraudCard: {
    borderRadius: rs(14),
    borderWidth: 1.5,
    borderColor: "#FECACA",
    padding: rs(14),
    marginTop: rs(12),
    marginBottom: rs(16),
  },
  fraudHeader: { flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10) },
  fraudIcon: { width: rs(26), height: rs(26), borderRadius: rs(8), alignItems: "center", justifyContent: "center" },
  fraudTitle: { fontSize: rs(13), fontWeight: "800", color: "#7F1D1D" },
  fraudRow: { flexDirection: "row", alignItems: "flex-start", gap: rs(8), marginBottom: rs(6) },
  fraudDot: { width: rs(5), height: rs(5), borderRadius: rs(3), backgroundColor: "#EF4444", marginTop: rs(5) },
  fraudText: { flex: 1, fontSize: rs(12), color: "#991B1B", lineHeight: rs(17) },

  // ── Summary / review ──
  summaryCard: { borderRadius: rs(16), overflow: "hidden", borderWidth: 1, marginBottom: rs(16) },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: rs(10), padding: rs(14) },
  summaryHeaderText: { fontSize: rs(15), fontWeight: "800", color: "#FFF" },
  summaryBody: { padding: rs(14), gap: rs(10) },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  summaryLabel: { fontSize: rs(12), fontWeight: "600", width: rs(90) },
  summaryValue: { flex: 1, fontSize: rs(13), fontWeight: "700", textAlign: "right" },

  // ── Terms checkbox ──
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: rs(10), marginBottom: rs(16) },
  checkbox: {
    width: rs(20),
    height: rs(20),
    borderRadius: rs(6),
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: rs(2),
  },
  checkboxActive: { backgroundColor: Colors.brand.blue, borderColor: Colors.brand.blue },
  termsText: { flex: 1, fontSize: rs(12), lineHeight: rs(17) },

  // ── Navigation ──
  navRow: { flexDirection: "row", gap: rs(10), marginTop: rs(8) },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    paddingHorizontal: rs(14),
    paddingVertical: rs(14),
    borderRadius: rs(14),
    borderWidth: 1.5,
  },
  backBtnText: { fontSize: rs(14), fontWeight: "700", color: Colors.brand.blue },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(8),
    paddingVertical: rs(14),
    borderRadius: rs(14),
  },
  nextBtnText: { fontSize: rs(14), fontWeight: "800", color: "#FFF" },

  // ── Success screen ──
  successCircle: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rs(20),
  },
  successTitle: { fontSize: rs(22), fontWeight: "900", marginBottom: rs(10), textAlign: "center" },
  successDesc: { fontSize: rs(14), textAlign: "center", lineHeight: rs(20), marginBottom: rs(24), paddingHorizontal: rs(16) },
  nextStepsList: { gap: rs(12), width: "100%" },
  nextStepRow: { flexDirection: "row", alignItems: "center", gap: rs(12) },
  nextStepNum: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(14),
    alignItems: "center",
    justifyContent: "center",
  },
  nextStepNumText: { fontSize: rs(12), fontWeight: "800", color: "#FFF" },
  nextStepText: { flex: 1, fontSize: rs(13), fontWeight: "500" },
  outlineBtn: {
    paddingVertical: rs(14),
    borderRadius: rs(14),
    borderWidth: 1.5,
    borderColor: Colors.brand.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { fontSize: rs(14), fontWeight: "700", color: Colors.brand.blue },
});
