import { rs } from "../src/utils/responsive";
/**
 * Property Agreement Flow — ComLinkr
 *
 * 5-step wizard covering Steps 4–7 of the Marketplace Authorization Plan:
 *   Step 1 – Rental / Purchase Application Form
 *   Step 2 – Offer Review (landlord's offer pre-populated)
 *   Step 3 – Digital Agreement (UK AST / US Lease)
 *   Step 4 – E-Signature
 *   Step 5 – Deposit Protection + Move-in Confirmation
 *
 * Accessible from the PropertyDetailModal ("Apply for Property" CTA).
 * Route params: propertyTitle, propertyAddress, price, deposit, landlordName,
 *               country ("UK" | "US"), dealType ("rent" | "buy")
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useAuthStore } from "../src/store/auth.store";
import { DatePickerField } from "../components/DateTimePickerField";
import {
  createApplication,
  saveStep,
  submitApplication,
  signApplication,
} from "../src/api/property-agreement.api";
import { ApiError } from "../src/api/client";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';

// ── Types ─────────────────────────────────────────────────────────────────────

type DealType = "rent" | "buy";
type Market   = "UK" | "US";
type Step     = 1 | 2 | 3 | 4 | 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPLOYMENT_OPTIONS = ["Employed", "Self-employed", "Student", "Retired", "Other"];
const INCOME_BANDS_UK    = ["Under £15k", "£15k–25k", "£25k–35k", "£35k–50k", "£50k–75k", "Over £75k"];
const INCOME_BANDS_US    = ["Under $25k", "$25k–40k", "$40k–60k", "$60k–85k", "$85k–120k", "Over $120k"];
const EMPLOYMENT_API_VALUES: Record<string, string> = {
  "Employed": "full_time", "Self-employed": "self_employed", "Student": "student", "Retired": "other", "Other": "other",
};
/** Approximate monthly income (number) from an annual band label such as "£25k–35k" / "Over $120k". */
function incomeBandToMonthly(band: string): number {
  const nums = (band.match(/\d+/g) ?? []).map(Number);
  if (nums.length === 0) return 0;
  const annual = (/under/i.test(band) ? nums[0] * 0.5
    : /over/i.test(band) ? nums[0]
    : (nums[0] + nums[1]) / 2) * 1000;
  return Math.round(annual / 12);
}
const DEPOSIT_SCHEMES_UK = ["Deposit Protection Service (DPS)", "MyDeposits", "Tenancy Deposit Scheme (TDS)"];
const DEPOSIT_SCHEMES_US = ["Held in escrow", "Landlord held account", "Third-party escrow service"];

const STEP_LABELS: Record<Step, string> = {
  1: "Application",
  2: "Review Offer",
  3: "Agreement",
  4: "E-Signature",
  5: "Move-in",
};

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }, (_, i) => {
        const n = (i + 1) as Step;
        const done    = n < current;
        const active  = n === current;
        return (
          <View key={n} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              done   && styles.stepCircleDone,
              active && styles.stepCircleActive,
            ]}>
              {done
                ? <Ionicons name="checkmark" size={12} color="#FFF" />
                : <Text style={[styles.stepNum, active && { color: "#FFF" }]}>{n}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, active && { color: Colors.brand.blue, fontWeight: "800" }]}>
              {STEP_LABELS[n]}
            </Text>
            {n < total && (
              <View style={[styles.stepLine, done && { backgroundColor: Colors.brand.blue }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function ChipRow({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  const { isDark, tc } = useTheme();
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          style={[styles.chip, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, value === opt && styles.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.chipText, { color: tc.textSecondary }, value === opt && styles.chipTextActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { tc } = useTheme();
  return (
    <Text style={[styles.fieldLabel, { color: tc.textPrimary }]}>
      {label}{required && <Text style={{ color: "#DC2626" }}> *</Text>}
    </Text>
  );
}

function InputField({
  label, value, onChange, placeholder, keyboardType, required, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean; multiline?: boolean;
}) {
  const { tc } = useTheme();
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <TextInput
        style={[styles.input, { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }, multiline && { height: rs(80), textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={tc.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

// ── UK AST Agreement text ─────────────────────────────────────────────────────

function buildAgreementText(
  landlordName: string,
  tenantName: string,
  address: string,
  price: string,
  deposit: string,
  startDate: string,
  duration: string,
  market: Market,
  dealType: DealType,
  conditions: string,
  depositScheme: string,
): string {
  if (market === "UK" && dealType === "rent") {
    return `ASSURED SHORTHOLD TENANCY AGREEMENT
Generated by ComLinkr · Document ID: CLR-AST-2026-${Math.random().toString(36).slice(2,8).toUpperCase()}

═══════════════════════════════════════════

PARTIES

Landlord: ${landlordName}
Tenant:   ${tenantName}

═══════════════════════════════════════════

PROPERTY

Address: ${address}

═══════════════════════════════════════════

TERM

Tenancy Start:   ${startDate}
Duration:        ${duration}
Tenancy Type:    Assured Shorthold Tenancy (AST)
Break Clause:    After 6 months, with 2 months' written notice by either party

═══════════════════════════════════════════

RENT & DEPOSIT

Monthly Rent:    ${price}/month
Payment Due:     1st of each month, via bank transfer
Security Deposit:${deposit}
Deposit Scheme:  ${depositScheme}
Deposit Law:     Under the Housing Act 2004, the landlord MUST protect this deposit in the named government-approved scheme within 30 days of receipt.

═══════════════════════════════════════════

SPECIAL CONDITIONS

${conditions || "No special conditions agreed."}

═══════════════════════════════════════════

STANDARD UK AST CLAUSES

1. LANDLORD'S OBLIGATIONS
   (a) To keep the structure and exterior of the property in good repair.
   (b) To ensure all gas appliances are checked annually (Gas Safety Regulations 1998).
   (c) To provide a valid Energy Performance Certificate (EPC) rated E or above.
   (d) To install and maintain working smoke alarms on every floor.
   (e) To protect the tenant's deposit in a government-approved scheme within 30 days.
   (f) To provide at least 24 hours' notice before entry for repairs (except emergencies).

2. TENANT'S OBLIGATIONS
   (a) To pay rent on time each month.
   (b) To keep the property in a clean and tidy condition.
   (c) To report any repairs or maintenance issues promptly.
   (d) Not to sublet any part of the property without written landlord consent.
   (e) Not to keep pets without prior written consent.
   (f) To allow access for repairs with reasonable notice.
   (g) To leave the property in the same condition as at move-in (fair wear & tear accepted).

3. NOTICE PERIODS
   Landlord to Tenant: Minimum 2 months' written notice (Section 21 Notice).
   Tenant to Landlord: Minimum 1 month's written notice.

4. TENANT'S RIGHT TO QUIET ENJOYMENT
   The landlord guarantees the tenant's right to quiet enjoyment of the property throughout the tenancy.

5. INVENTORY & CHECK-IN / CHECK-OUT
   A full inventory will be provided at check-in. Any damage beyond fair wear and tear may be deducted from the deposit at check-out.

6. LEGAL COMPLIANCE
   This agreement is governed by the laws of England and Wales. Both parties agree to comply with all applicable housing legislation including the Tenant Fees Act 2019, the Housing Act 1988 (as amended), and the Deregulation Act 2015.

═══════════════════════════════════════════

IMPORTANT DISCLAIMER

ComLinkr is a platform that facilitates connections between landlords and tenants. ComLinkr is NOT a legal party to this agreement, does NOT act as a letting agent, and is NOT responsible for enforcing the terms of this agreement. Both parties are advised to seek independent legal advice. This agreement template is provided for convenience and is not a substitute for professional legal counsel.

═══════════════════════════════════════════`;
  }

  // US Lease
  return `RESIDENTIAL LEASE AGREEMENT
Generated by ComLinkr · Document ID: CLR-LEASE-2026-${Math.random().toString(36).slice(2,8).toUpperCase()}

═══════════════════════════════════════════

PARTIES

Landlord: ${landlordName}
Tenant:   ${tenantName}

═══════════════════════════════════════════

PROPERTY

Address: ${address}

═══════════════════════════════════════════

LEASE TERM

Start Date:   ${startDate}
Duration:     ${duration}
Lease Type:   Fixed-term Residential Lease

═══════════════════════════════════════════

RENT & DEPOSIT

Monthly Rent:     ${price}/month
Due Date:         1st of each month
Security Deposit: ${deposit}
Deposit Held By:  ${depositScheme}
Late Fee:         5% of monthly rent if paid after the 5th of the month

═══════════════════════════════════════════

SPECIAL CONDITIONS

${conditions || "No special conditions agreed."}

═══════════════════════════════════════════

STANDARD LEASE CLAUSES

1. FAIR HOUSING
   This lease is offered in compliance with the Federal Fair Housing Act and applicable state fair housing laws. No discrimination based on race, color, national origin, religion, sex, familial status, or disability.

2. LANDLORD'S OBLIGATIONS
   (a) To maintain the property in habitable condition.
   (b) To make necessary repairs within a reasonable time.
   (c) To comply with all applicable building and housing codes.
   (d) To provide working smoke detectors and carbon monoxide detectors.
   (e) To provide 24 hours' notice before entry (except emergencies).

3. TENANT'S OBLIGATIONS
   (a) To pay rent on time each month.
   (b) To keep the premises clean and sanitary.
   (c) To dispose of garbage properly.
   (d) Not to damage the property beyond ordinary wear and tear.
   (e) Not to sublet without prior written consent.
   (f) To comply with all rules and regulations.

4. SECURITY DEPOSIT
   The security deposit will be held in accordance with applicable state law. It will be returned within 21 days of lease termination (or the period required by state law), less any deductions for damages beyond ordinary wear and tear.

5. UTILITIES
   Tenant is responsible for: electricity, gas, internet. Water/sewer: as agreed.

6. TERMINATION
   Either party may terminate with 30 days' written notice (or as required by applicable state law).

7. GOVERNING LAW
   This agreement is governed by the laws of the applicable state. Both parties agree to comply with all federal, state, and local housing laws.

═══════════════════════════════════════════

IMPORTANT DISCLAIMER

ComLinkr is a platform facilitating connections between landlords and tenants. ComLinkr is NOT a legal party to this agreement and is NOT responsible for enforcing its terms. This template is provided for convenience only. Both parties are strongly advised to consult a licensed attorney before signing.

═══════════════════════════════════════════`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PropertyAgreementScreen() {
  const { isDark, tc } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    propertyTitle?: string;
    propertyAddress?: string;
    price?: string;
    deposit?: string;
    landlordName?: string;
    listingId?: string;
    landlordId?: string;
    country?: string;
    dealType?: string;
  }>();

  const user = useAuthStore((s) => s.user);

  const propertyTitle  = params.propertyTitle  || "Property";
  const propertyAddress= params.propertyAddress|| "Address not specified";
  const price          = params.price          || "£1,500";
  const deposit        = params.deposit        || "£1,730";
  const landlordName   = params.landlordName   || "Landlord";
  const listingId      = params.listingId      || "";
  const market: Market = (params.country === "US" ? "US" : "UK");
  const dealType: DealType = (params.dealType === "buy" ? "buy" : "rent");

  const incomeBands = market === "UK" ? INCOME_BANDS_UK : INCOME_BANDS_US;
  const depositSchemes = market === "UK" ? DEPOSIT_SCHEMES_UK : DEPOSIT_SCHEMES_US;
  const currency = market === "UK" ? "£" : "$";

  // ── Step state ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Application fields
  const [fullName,       setFullName]       = useState(user?.name || "");
  const [currentAddress, setCurrentAddress] = useState(user?.city ? `${user.city}, ${user.stateProvince || ""}, ${user.country || ""}` : "");
  const [employment,     setEmployment]     = useState("");
  const [employer,       setEmployer]       = useState("");
  const [income,         setIncome]         = useState("");
  const [occupants,      setOccupants]      = useState("1");
  const [hasPets,        setHasPets]        = useState(false);
  const [petDetails,     setPetDetails]     = useState("");
  const [smokes,         setSmokes]         = useState(false);
  const [moveInDate,     setMoveInDate]     = useState("");
  const [landlordRef,    setLandlordRef]    = useState("");
  const [notes,          setNotes]          = useState("");
  const [viewingStatus,  setViewingStatus]  = useState<"in_person" | "video_tour" | "none" | "">("");

  // Step 2 — Offer review
  const [offerAccepted,  setOfferAccepted]  = useState<"accepted" | "negotiate" | null>(null);
  const [negotiateNote,  setNegotiateNote]  = useState("");

  // Step 3 — Agreement
  const [agreementRead,  setAgreementRead]  = useState(false);
  const [startDate,      setStartDateRaw]   = useState(moveInDate || (market === "UK" ? "01/04/2026" : "04/01/2026"));
  const startDateTouchedRef = useRef(false);
  const setStartDate = (v: string) => { startDateTouchedRef.current = true; setStartDateRaw(v); };
  // Suggest the move-in date as the lease start date by default, but only until the user
  // edits the lease start date field itself — after that, the two fields are independent.
  useEffect(() => {
    if (!startDateTouchedRef.current && moveInDate) setStartDateRaw(moveInDate);
  }, [moveInDate]);
  const [duration,       setDuration]       = useState(market === "UK" ? "12 months" : "12 months");
  const [conditions,     setConditions]     = useState("");
  const [selectedScheme, setSelectedScheme] = useState(depositSchemes[0]);

  // Step 4 — E-Signature
  const [tenantSigned,   setTenantSigned]   = useState(false);
  const [signatureName,  setSignatureName]  = useState("");

  // Step 5 — Done
  const [moveInConfirmed, setMoveInConfirmed] = useState(false);

  // ── API state ────────────────────────────────────────────────────────────────
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Navigation ───────────────────────────────────────────────────────────────

  const goNext = useCallback(async () => {
    if (step === 1) {
      if (!fullName.trim() || !employment || !income || !moveInDate.trim()) {
        appAlert("Missing Information", "Please fill in all required fields before continuing.");
        return;
      }
      // Create application on backend when Step 1 is completed
      if (listingId) {
        let stage = "create";
        try {
          setSubmitting(true);
          let appId = applicationId;
          if (!appId) {
            const app = await createApplication(listingId);
            appId = app.id;
            setApplicationId(app.id);
          }
          stage = "save";
          // Always (re)save step 1 so a failed save is retried instead of skipped.
          await saveStep(appId, 1, {
            fullName, currentAddress,
            email: user?.email, phone: (user as any)?.phone,
            employmentType: EMPLOYMENT_API_VALUES[employment] ?? "other",
            employerName: employer || undefined,
            monthlyIncome: incomeBandToMonthly(income),
            incomeBand: income,
            additionalOccupants: parseInt(occupants, 10) || 1,
            hasPets, petDescription: petDetails, smoking: smokes,
            moveInDate, previousLandlordReference: landlordRef || undefined,
            notes, viewingStatus: viewingStatus || undefined,
          });
        } catch (e) {
          setSubmitting(false);
          const status = e instanceof ApiError ? e.status : 0;
          const reason = e instanceof ApiError
            ? (status === 401 ? "Your session has expired. Please sign in again."
              : status === 404 ? (e.message.startsWith("Cannot ")
                ? "Tenancy applications aren't available on the server yet. Please contact support."
                : "This listing is no longer available.")
              : status === 409 ? "You have already applied for this property."
              : e.message || `Server error (${status}).`)
            : "We couldn't reach the server. Please check your connection and try again.";
          if (__DEV__) console.warn(`[property-agreement] step-1 ${stage} failed`, e);
          appAlert(
            stage === "create" ? "Could Not Start Application" : "Could Not Save Application",
            reason,
          );
          return;
        }
        setSubmitting(false);
      }
    }
    if (step === 2 && offerAccepted === null) {
      appAlert("Decision Required", "Please accept, negotiate, or decline the offer.");
      return;
    }
    if (step === 2 && offerAccepted === "negotiate") {
      appAlert(
        "Negotiation Sent",
        `Your note has been sent to ${landlordName}. The landlord will respond via chat. For this demo, we'll proceed to the agreement.`,
        [{ text: "Continue", onPress: () => setStep(3) }],
      );
      return;
    }
    if (step === 3 && !agreementRead) {
      appAlert("Please Read the Agreement", "Scroll through the full agreement before proceeding to sign.");
      return;
    }
    if (step === 4) {
      if (!signatureName.trim()) {
        appAlert("Signature Required", "Please type your full legal name to sign.");
        return;
      }
      // Submit and sign — this notifies the landlord via backend
      if (applicationId) {
        try {
          setSubmitting(true);
          await submitApplication(applicationId);
          await signApplication(applicationId, {
            signature: signatureName.trim(),
            signatureType: "typed",
            signedAt: new Date().toISOString(),
          });
        } catch {
          setSubmitting(false);
          appAlert(
            "Could Not Sign Agreement",
            "We couldn't save your signature. Please check your connection and try again — your agreement has not been signed yet.",
          );
          return;
        }
        setSubmitting(false);
      }
      setTenantSigned(true);
    }
    if (step < 5) setStep((s) => (s + 1) as Step);
  }, [step, fullName, employment, income, moveInDate, listingId, applicationId,
      currentAddress, employer, occupants, hasPets, petDetails, smokes, notes,
      offerAccepted, landlordName, agreementRead, signatureName, landlordRef, viewingStatus, user]);

  const goBack = () => {
    if (step === 1) {
      if (router.canGoBack()) router.back(); else router.replace("/(tabs)/housing" as any);
    } else {
      setStep((s) => (s - 1) as Step);
    }
  };

  const agreementText = buildAgreementText(
    landlordName, fullName || user?.name || "Tenant",
    propertyAddress, price, deposit,
    startDate, duration, market, dealType, conditions, selectedScheme,
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: tc.pillBg }, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: tc.textPrimary }]} numberOfLines={1}>
            {dealType === "buy" ? "Purchase Agreement" : "Tenancy Agreement"}
          </Text>
          <Text style={[styles.headerSub, { color: tc.textSecondary }]} numberOfLines={1}>{propertyTitle}</Text>
        </View>
        <View style={[styles.marketPill, { backgroundColor: market === "UK" ? "#EEF5FF" : "#FFF0E6" }]}>
          <Text style={[styles.marketPillText, { color: market === "UK" ? Colors.brand.blue : Colors.brand.orange }]}>
            {market}
          </Text>
        </View>
      </View>

      {/* Step indicator */}
      <View style={[styles.stepContainer, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <StepIndicator current={step} total={5} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — APPLICATION FORM
        ══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <View>
            <View style={[styles.sectionCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <View style={styles.sectionCardHeader}>
                <LinearGradient colors={[Colors.brand.blue, "#0054CC"]} style={styles.sectionIcon}>
                  <Ionicons name="document-text" size={16} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Your Application</Text>
              </View>
              <Text style={[styles.sectionDesc, { color: tc.textSecondary }]}>
                Complete this form to apply for <Text style={{ fontWeight: "700" }}>{propertyTitle}</Text>.
                The landlord will review your application and respond within 48 hours.
              </Text>
            </View>

            {/* Fraud notice */}
            <View style={[styles.fraudNote, { backgroundColor: isDark ? "#0A2A12" : "#F0FDF4", borderColor: isDark ? "#1A4A2A" : "#BBF7D0" }]}>
              <Ionicons name="shield-checkmark" size={15} color="#16A34A" />
              <Text style={styles.fraudNoteText}>
                All information you provide is kept confidential and shared only with the landlord of this property.
                Providing false information is a breach of ComLinkr's terms and may result in account suspension.
              </Text>
            </View>

            {/* Personal */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>PERSONAL DETAILS</Text>
            <InputField label="Full legal name" value={fullName} onChange={setFullName} placeholder="As on your ID" required />
            <InputField label="Current address" value={currentAddress} onChange={setCurrentAddress} placeholder="Street, City, Postcode/ZIP" required />

            {/* Employment */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>EMPLOYMENT</Text>
            <View style={styles.field}>
              <FieldLabel label="Employment status" required />
              <ChipRow options={EMPLOYMENT_OPTIONS} value={employment} onChange={setEmployment} />
            </View>
            {(employment === "Employed" || employment === "Self-employed") && (
              <InputField label="Employer / Business name" value={employer} onChange={setEmployer} placeholder="e.g. NHS, Google, Self" />
            )}
            <View style={styles.field}>
              <FieldLabel label="Annual income (approximate)" required />
              <ChipRow options={incomeBands} value={income} onChange={setIncome} />
            </View>

            {/* Occupancy */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>OCCUPANCY</Text>
            <InputField label="Number of occupants (incl. yourself)" value={occupants} onChange={setOccupants} keyboardType="numeric" required />
            <View style={styles.field}>
              <FieldLabel label="Do you have pets?" />
              <View style={styles.toggleRow}>
                <Pressable onPress={() => setHasPets(true)}  style={[styles.toggle, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, hasPets  && styles.toggleActive]}>
                  <Text style={[styles.toggleText, { color: tc.textSecondary }, hasPets  && styles.toggleTextActive]}>Yes</Text>
                </Pressable>
                <Pressable onPress={() => setHasPets(false)} style={[styles.toggle, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, !hasPets && styles.toggleActive]}>
                  <Text style={[styles.toggleText, { color: tc.textSecondary }, !hasPets && styles.toggleTextActive]}>No</Text>
                </Pressable>
              </View>
              {hasPets && (
                <InputField label="Pet type(s)" value={petDetails} onChange={setPetDetails} placeholder="e.g. 1 small dog, 2 cats" />
              )}
            </View>
            <View style={styles.field}>
              <FieldLabel label="Do you smoke?" />
              <View style={styles.toggleRow}>
                <Pressable onPress={() => setSmokes(true)}  style={[styles.toggle, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, smokes  && styles.toggleActive]}>
                  <Text style={[styles.toggleText, { color: tc.textSecondary }, smokes  && styles.toggleTextActive]}>Yes</Text>
                </Pressable>
                <Pressable onPress={() => setSmokes(false)} style={[styles.toggle, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, !smokes && styles.toggleActive]}>
                  <Text style={[styles.toggleText, { color: tc.textSecondary }, !smokes && styles.toggleTextActive]}>No</Text>
                </Pressable>
              </View>
            </View>

            {/* Dates & references */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>MOVE-IN & REFERENCES</Text>
            <View style={styles.field}>
              <FieldLabel label="Preferred move-in date" required />
              <DatePickerField
                value={moveInDate}
                onChange={setMoveInDate}
                placeholder="Select move-in date"
                accentColor={Colors.brand.blue}
                dateFormat={market === "UK" ? "uk" : "us"}
                minimumDate={new Date()}
                forceDark={isDark}
                textStyle={{ color: tc.textPrimary }}
                style={{ borderColor: tc.borderLight, backgroundColor: tc.inputBg }}
              />
            </View>
            <InputField
              label="Previous landlord reference (optional)"
              value={landlordRef}
              onChange={setLandlordRef}
              placeholder="Name & contact of previous landlord"
            />
            <InputField
              label="Additional notes to the landlord"
              value={notes}
              onChange={setNotes}
              placeholder="Anything else you'd like the landlord to know..."
              multiline
            />

            {/* Viewing status — optional */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>PROPERTY VIEWING (OPTIONAL)</Text>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { marginBottom: rs(10) }]}>
                Have you seen the property yet?
                <Text style={{ color: "#9CA3AF", fontWeight: "400" }}> — helps the landlord understand your situation</Text>
              </Text>
              {[
                {
                  value: "in_person" as const,
                  icon: "home-outline" as const,
                  label: "Yes — visited in person",
                  color: "#30855B",
                  bg: "#E3F1EA",
                  border: "#BBF7D0",
                },
                {
                  value: "video_tour" as const,
                  icon: "videocam-outline" as const,
                  label: "Yes — completed a live video tour",
                  color: "#7C3AED",
                  bg: "#FAF5FF",
                  border: "#E9D5FF",
                },
                {
                  value: "none" as const,
                  icon: "alert-circle-outline" as const,
                  label: "No — applying without a viewing",
                  color: "#D97706",
                  bg: "#FFFBEB",
                  border: "#FDE68A",
                },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setViewingStatus(opt.value)}
                  style={[
                    styles.viewingOption,
                    { backgroundColor: tc.inputBg, borderColor: tc.borderLight },
                    viewingStatus === opt.value && {
                      backgroundColor: opt.bg,
                      borderColor: opt.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.viewingOptionIcon,
                      { backgroundColor: viewingStatus === opt.value ? opt.bg : "#F5F7FA" },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={viewingStatus === opt.value ? opt.color : "#9CA3AF"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.viewingOptionText,
                      { color: tc.textSecondary },
                      viewingStatus === opt.value && { color: opt.color, fontWeight: "800" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <View
                    style={[
                      styles.viewingRadio,
                      viewingStatus === opt.value && { borderColor: opt.color },
                    ]}
                  >
                    {viewingStatus === opt.value && (
                      <View style={[styles.viewingRadioDot, { backgroundColor: opt.color }]} />
                    )}
                  </View>
                </Pressable>
              ))}

              {/* Advisory shown only when "no viewing" is selected */}
              {viewingStatus === "none" && (
                <View style={styles.viewingAdvisory}>
                  <Ionicons name="information-circle-outline" size={14} color="#D97706" />
                  <Text style={styles.viewingAdvisoryText}>
                    Applying without a viewing is allowed, but we strongly recommend requesting a live video tour first. Use the 'Can't Visit in Person?' section on the listing page to request one safely. Never pay a deposit before completing a verified tour.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — OFFER REVIEW
        ══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <View>
            <View style={[styles.sectionCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <View style={styles.sectionCardHeader}>
                <LinearGradient colors={["#257A86", "#E56800"]} style={styles.sectionIcon}>
                  <Ionicons name="document-attach" size={16} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Landlord's Offer</Text>
              </View>
              <Text style={[styles.sectionDesc, { color: tc.textSecondary }]}>
                {landlordName} has reviewed your application and made the following offer.
                Review the terms carefully before accepting.
              </Text>
            </View>

            {/* Offer card */}
            <View style={[styles.offerCard, { borderColor: isDark ? tc.borderMedium : "#BFDBFE" }]}>
              <LinearGradient colors={[Colors.brand.blue, "#0054CC"]} style={styles.offerCardHeader}>
                <Ionicons name="home" size={18} color="#FFF" />
                <Text style={styles.offerCardTitle}>{dealType === "rent" ? "Rental Offer" : "Purchase Offer"}</Text>
              </LinearGradient>
              <View style={[styles.offerCardBody, { backgroundColor: tc.cardBg }]}>
                <View style={styles.offerRow}>
                  <Text style={[styles.offerKey, { color: tc.textSecondary }]}>Property</Text>
                  <Text style={[styles.offerVal, { color: tc.textPrimary }]} numberOfLines={2}>{propertyAddress}</Text>
                </View>
                <View style={[styles.offerDivider, { backgroundColor: tc.divider }]} />
                <View style={styles.offerRow}>
                  <Text style={[styles.offerKey, { color: tc.textSecondary }]}>{dealType === "rent" ? "Monthly rent" : "Purchase price"}</Text>
                  <Text style={[styles.offerVal, { color: Colors.brand.blue, fontWeight: "800" }]}>{price}</Text>
                </View>
                <View style={[styles.offerDivider, { backgroundColor: tc.divider }]} />
                <View style={styles.offerRow}>
                  <Text style={[styles.offerKey, { color: tc.textSecondary }]}>Security deposit</Text>
                  <Text style={[styles.offerVal, { color: tc.textPrimary }]}>{deposit}</Text>
                </View>
                <View style={[styles.offerDivider, { backgroundColor: tc.divider }]} />
                <View style={styles.offerRow}>
                  <Text style={[styles.offerKey, { color: tc.textSecondary }]}>Tenancy start</Text>
                  <Text style={[styles.offerVal, { color: tc.textPrimary }]}>{startDate || (market === "UK" ? "01/04/2026" : "04/01/2026")}</Text>
                </View>
                <View style={[styles.offerDivider, { backgroundColor: tc.divider }]} />
                <View style={styles.offerRow}>
                  <Text style={[styles.offerKey, { color: tc.textSecondary }]}>Duration</Text>
                  <Text style={[styles.offerVal, { color: tc.textPrimary }]}>{duration}</Text>
                </View>
                <View style={[styles.offerDivider, { backgroundColor: tc.divider }]} />
                <View style={styles.offerRow}>
                  <Text style={[styles.offerKey, { color: tc.textSecondary }]}>Break clause</Text>
                  <Text style={[styles.offerVal, { color: tc.textPrimary }]}>After 6 months, 2 months' notice</Text>
                </View>
                <View style={[styles.offerDivider, { backgroundColor: tc.divider }]} />
                <View style={styles.offerRow}>
                  <Text style={[styles.offerKey, { color: tc.textSecondary }]}>Deposit scheme</Text>
                  <Text style={[styles.offerVal, { color: tc.textPrimary }]}>{depositSchemes[0]}</Text>
                </View>

                {/* Conditions */}
                <View style={[styles.offerRow, { flexDirection: "column", gap: rs(6) }]}>
                  <Text style={[styles.offerKey, { color: tc.textSecondary }]}>Conditions</Text>
                  {[
                    hasPets ? "Small pets allowed (with prior approval)" : "No pets allowed",
                    smokes  ? "Smoking allowed" : "No smoking inside the property",
                    "Professional cleaning required at end of tenancy",
                    market === "UK"
                      ? "Deposit protected in government-approved scheme within 30 days"
                      : "Deposit held per state security deposit laws",
                  ].map((c, i) => (
                    <View key={i} style={styles.conditionRow}>
                      <Ionicons name="ellipse" size={5} color={isDark ? tc.textTertiary : "#6B7280"} />
                      <Text style={[styles.conditionText, { color: tc.textSecondary }]}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Decision buttons */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>YOUR DECISION</Text>
            <View style={styles.decisionRow}>
              <Pressable
                onPress={() => setOfferAccepted("accepted")}
                style={[styles.decisionBtn, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, offerAccepted === "accepted" && styles.decisionBtnAccept]}
              >
                <Ionicons name="checkmark-circle" size={18} color={offerAccepted === "accepted" ? "#FFF" : "#16A34A"} />
                <Text style={[styles.decisionBtnText, { color: tc.textSecondary }, offerAccepted === "accepted" && { color: "#FFF" }]}>Accept Offer</Text>
              </Pressable>
              <Pressable
                onPress={() => setOfferAccepted("negotiate")}
                style={[styles.decisionBtn, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, offerAccepted === "negotiate" && styles.decisionBtnNegotiate]}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color={offerAccepted === "negotiate" ? "#FFF" : "#D97706"} />
                <Text style={[styles.decisionBtnText, { color: tc.textSecondary }, offerAccepted === "negotiate" && { color: "#FFF" }]}>Negotiate</Text>
              </Pressable>
            </View>

            {offerAccepted === "negotiate" && (
              <View style={styles.field}>
                <FieldLabel label="Your counter-proposal or questions" />
                <TextInput
                  style={[styles.input, { height: rs(90), textAlignVertical: "top", backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]}
                  value={negotiateNote}
                  onChangeText={setNegotiateNote}
                  placeholder={`e.g. "Could we reduce the rent to ${currency}1,400/mo? I can offer a 12-month lease."`}
                  placeholderTextColor={tc.textTertiary}
                  multiline
                />
              </View>
            )}

            <Pressable
              onPress={() =>
                appAlert(
                  "Decline Offer",
                  "Are you sure you want to decline this offer? You can re-apply later.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Decline", style: "destructive", onPress: () => router.back() },
                  ]
                )
              }
              style={styles.declineLink}
            >
              <Text style={styles.declineLinkText}>Decline this offer</Text>
            </Pressable>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3 — AGREEMENT TEXT
        ══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <View>
            <View style={[styles.sectionCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <View style={styles.sectionCardHeader}>
                <LinearGradient colors={["#7C3AED", "#6D28D9"]} style={styles.sectionIcon}>
                  <Ionicons name="document-text" size={16} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>
                  {market === "UK" ? "Assured Shorthold Tenancy (AST)" : "Residential Lease Agreement"}
                </Text>
              </View>
              <Text style={[styles.sectionDesc, { color: tc.textSecondary }]}>
                Read the complete agreement below. Both parties must agree to all terms before signing.
                Scroll to the bottom to confirm you have read it.
              </Text>
            </View>

            {/* Customise key terms */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>CUSTOMISE TERMS</Text>
            <View style={styles.field}>
              <FieldLabel label={market === "UK" ? "Tenancy start date" : "Lease start date"} />
              <DatePickerField
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
                forceDark={isDark}
                textStyle={{ color: tc.textPrimary }}
                accentColor={Colors.brand.blue}
                dateFormat={market === "UK" ? "uk" : "us"}
                minimumDate={new Date()}
                style={{ borderColor: tc.borderLight, backgroundColor: tc.inputBg }}
              />
            </View>
            <View style={styles.field}>
              <FieldLabel label="Duration" />
              <TextInput style={[styles.input, { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]} value={duration} onChangeText={setDuration} placeholderTextColor={tc.textTertiary} placeholder="12 months" />
            </View>
            <View style={styles.field}>
              <FieldLabel label="Special conditions (if any)" />
              <TextInput style={[styles.input, { height: rs(70), textAlignVertical: "top", backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]} value={conditions} onChangeText={setConditions} placeholderTextColor={tc.textTertiary} placeholder="Any agreed additions to the standard terms..." multiline />
            </View>
            <View style={styles.field}>
              <FieldLabel label={market === "UK" ? "Deposit protection scheme" : "Deposit held by"} required />
              <ChipRow options={depositSchemes} value={selectedScheme} onChange={setSelectedScheme} />
            </View>

            {/* Full agreement scroll area */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>FULL AGREEMENT TEXT</Text>
            <View style={[styles.agreementBox, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
              <ScrollView
                style={{ maxHeight: 340 }}
                showsVerticalScrollIndicator
                nestedScrollEnabled
                onScrollEndDrag={() => setAgreementRead(true)}
                onMomentumScrollEnd={() => setAgreementRead(true)}
              >
                <Text style={[styles.agreementText, { color: tc.textSecondary }]}>{agreementText}</Text>
                <Pressable
                  onPress={() => setAgreementRead(true)}
                  style={styles.readConfirmBtn}
                >
                  <Ionicons name="checkmark-circle" size={14} color={Colors.brand.green} />
                  <Text style={styles.readConfirmText}>I have read the full agreement</Text>
                </Pressable>
              </ScrollView>
            </View>

            {agreementRead && (
              <View style={styles.readBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                <Text style={styles.readBannerText}>Agreement read — you may proceed to sign</Text>
              </View>
            )}

            {/* Disclaimer */}
            <View style={[styles.disclaimerBox, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
              <Ionicons name="information-circle-outline" size={15} color={tc.textTertiary} />
              <Text style={[styles.disclaimerText, { color: tc.textTertiary }]}>
                ComLinkr is NOT a party to this agreement and assumes no legal responsibility for its enforcement.
                Both parties should retain a signed copy. You are strongly advised to seek independent legal advice.
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4 — E-SIGNATURE
        ══════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <View>
            <View style={[styles.sectionCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <View style={styles.sectionCardHeader}>
                <LinearGradient colors={["#30855B", "#256B49"]} style={styles.sectionIcon}>
                  <Ionicons name="pencil" size={16} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Sign the Agreement</Text>
              </View>
              <Text style={[styles.sectionDesc, { color: tc.textSecondary }]}>
                By signing, you confirm you have read and agree to all terms of the agreement.
              </Text>
            </View>

            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>YOUR SIGNATURE</Text>
            <View style={styles.field}>
              <FieldLabel label="Type your full legal name to sign" required />
              <TextInput
                style={[styles.input, styles.signatureInput, { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]}
                value={signatureName}
                onChangeText={setSignatureName}
                placeholder="Your full legal name"
                placeholderTextColor={tc.textTertiary}
                autoCapitalize="words"
              />
              {signatureName.trim().length > 0 && (
                <View style={[styles.signaturePreview, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                  <Text style={[styles.signaturePreviewLabel, { color: tc.textTertiary }]}>Signature preview:</Text>
                  <Text style={[styles.signatureFont, { color: tc.textPrimary, borderBottomColor: tc.textPrimary }]}>{signatureName}</Text>
                  <Text style={[styles.signatureTimestamp, { color: tc.textTertiary }]}>
                    {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              )}
            </View>

            {/* Landlord counter-sign note */}
            <View style={[styles.counterSignNote, { backgroundColor: isDark ? tc.pillBg : "#EEF5FF", borderColor: isDark ? tc.borderLight : "#BFDBFE" }]}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.brand.blue} />
              <Text style={[styles.counterSignText, { color: isDark ? tc.textSecondary : "#1E40AF" }]}>
                After you sign, <Text style={{ fontWeight: "700" }}>{landlordName}</Text> will be notified to counter-sign.
                Both signatures are required for the agreement to be legally binding.
              </Text>
            </View>

            {/* Legal disclaimer */}
            <View style={[styles.disclaimerBox, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
              <Ionicons name="shield-outline" size={15} color={tc.textTertiary} />
              <Text style={[styles.disclaimerText, { color: tc.textTertiary }]}>
                Your electronic signature has the same legal effect as a handwritten signature under the Electronic Communications Act 2000 (UK) and the E-SIGN Act (US).
                ComLinkr stores a SHA-256 hash of the signed document for tamper-proof verification.
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 5 — DEPOSIT & MOVE-IN
        ══════════════════════════════════════════════════════════════════ */}
        {step === 5 && (
          <View>
            {/* Success header */}
            <View style={[styles.successBanner, { backgroundColor: tc.cardBg, borderColor: isDark ? "#1A4A2A" : "#86EFAC" }]}>
              <LinearGradient colors={["#30855B", "#256B49"]} style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={32} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.successTitle, { color: tc.textPrimary }]}>Agreement Signed!</Text>
              <Text style={[styles.successSub, { color: tc.textSecondary }]}>
                Both parties have signed. A copy of the agreement has been saved to your Documents.
              </Text>
            </View>

            {/* Deposit protection */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>
              {market === "UK" ? "DEPOSIT PROTECTION — UK LAW" : "SECURITY DEPOSIT"}
            </Text>
            <View style={[styles.depositCard, { backgroundColor: tc.cardBg, borderColor: isDark ? tc.borderMedium : "#FCD34D" }]}>
              <View style={styles.depositCardHeader}>
                <Ionicons name="warning" size={18} color="#D97706" />
                <Text style={[styles.depositCardTitle, { color: tc.textPrimary }]}>
                  {market === "UK" ? "UK Law Reminder" : "Security Deposit Notice"}
                </Text>
              </View>
              {market === "UK" ? (
                <>
                  <Text style={[styles.depositCardText, { color: tc.textSecondary }]}>
                    Under the <Text style={{ fontWeight: "700" }}>Housing Act 2004</Text>, the landlord must protect
                    your deposit of <Text style={{ fontWeight: "700" }}>{deposit}</Text> in a government-approved scheme
                    within <Text style={{ fontWeight: "700" }}>30 days</Text> of receiving it.
                  </Text>
                  <Text style={[styles.depositCardText, { marginTop: rs(8), color: tc.textSecondary }]}>
                    Agreed scheme: <Text style={{ fontWeight: "700" }}>{selectedScheme}</Text>
                  </Text>
                  <View style={styles.schemeList}>
                    {DEPOSIT_SCHEMES_UK.map((s) => (
                      <View key={s} style={styles.schemeRow}>
                        <Ionicons
                          name={s === selectedScheme ? "checkmark-circle" : "ellipse-outline"}
                          size={14}
                          color={s === selectedScheme ? "#16A34A" : "#9CA3AF"}
                        />
                        <Text style={[styles.schemeText, { color: tc.textSecondary }, s === selectedScheme && { color: "#16A34A", fontWeight: "700" }]}>{s}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.depositLawNote, isDark && { color: "#FBBF24" }]}>
                    If your landlord fails to protect your deposit, you can claim 1–3× the deposit amount in court.
                    Contact Citizens Advice or Shelter for guidance.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.depositCardText, { color: tc.textSecondary }]}>
                    Your deposit of <Text style={{ fontWeight: "700" }}>{deposit}</Text> will be held as agreed:
                    <Text style={{ fontWeight: "700" }}> {selectedScheme}</Text>.
                  </Text>
                  <Text style={[styles.depositCardText, { marginTop: rs(8), color: tc.textSecondary }]}>
                    Under applicable state law, your deposit must be returned within 21 days of vacating the property
                    (or the period required by your state), less any deductions for damages beyond ordinary wear and tear.
                  </Text>
                  <Text style={[styles.depositLawNote, isDark && { color: "#FBBF24" }]}>
                    Fair Housing Act rights apply. Contact your state's housing authority or a local tenant advocacy group for guidance.
                  </Text>
                </>
              )}
            </View>

            {/* Move-in checklist */}
            <Text style={[styles.groupLabel, { color: tc.textTertiary }]}>MOVE-IN CHECKLIST</Text>
            <View style={[styles.checklistCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              {[
                { icon: "key-outline",             text: "Confirm key collection time with your landlord via chat" },
                { icon: "camera-outline",           text: "Take timestamped photos of every room on move-in day" },
                { icon: "document-text-outline",    text: "Complete and sign the inventory check-in form together" },
                { icon: "receipt-outline",          text: "Get a receipt for your deposit payment" },
                market === "UK"
                  ? { icon: "checkmark-circle-outline", text: "Confirm deposit protection: landlord must send you the deposit certificate" }
                  : { icon: "checkmark-circle-outline", text: "Request written confirmation of where deposit is held" },
                { icon: "wifi-outline",             text: "Register utilities in your name on or before move-in day" },
                { icon: "mail-outline",             text: "Update your address with HMRC/IRS, bank, and post office" },
              ].map((item, i) => (
                <View key={i} style={styles.checklistRow}>
                  <Ionicons name={item.icon as any} size={16} color={Colors.brand.blue} />
                  <Text style={[styles.checklistText, { color: tc.textSecondary }]}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Document saved note */}
            <View style={[styles.docSavedCard, { backgroundColor: isDark ? tc.inputBg : "#EEF5FF", borderColor: isDark ? tc.borderLight : "#BFDBFE" }]}>
              <LinearGradient colors={[Colors.brand.blue, "#0054CC"]} style={styles.docSavedIcon}>
                <Ionicons name="cloud-done" size={20} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.docSavedTitle, isDark && { color: tc.textPrimary }]}>Agreement saved to My Documents</Text>
                <Text style={[styles.docSavedSub, isDark && { color: tc.textSecondary }]}>
                  Accessible any time · Document ID: CLR-AST-2026-{Math.random().toString(36).slice(2,8).toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Help */}
            <View style={[styles.helpCard, { backgroundColor: isDark ? tc.pillBg : "#EEF5FF", borderColor: isDark ? tc.borderLight : "#BFDBFE" }]}>
              <Ionicons name="help-circle-outline" size={18} color={Colors.brand.blue} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.helpTitle, { color: isDark ? tc.textPrimary : "#1E40AF" }]}>Questions about your tenancy?</Text>
                <Text style={[styles.helpDesc, { color: isDark ? tc.textSecondary : "#3B82F6" }]}>
                  {market === "UK"
                    ? "Contact Shelter UK: shelter.org.uk or Citizens Advice"
                    : "Contact your local tenant advocacy group or HUD: hud.gov"}
                </Text>
              </View>
              <Pressable onPress={() => router.push("/help-support" as any)}>
                <Text style={styles.helpLink}>Help</Text>
              </Pressable>
            </View>

            <View style={{ height: rs(8) }} />
          </View>
        )}

        <View style={{ height: rs(24) }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA bar */}
      <View style={[styles.ctaBar, { backgroundColor: tc.headerBg, borderTopColor: tc.borderLight, paddingBottom: rs(12) + insets.bottom }]}>
        {step < 5 && (
          <>
            <Pressable onPress={goBack} style={[styles.ctaBack, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
              <Text style={[styles.ctaBackText, { color: tc.textSecondary }]}>{step === 1 ? "Cancel" : "Back"}</Text>
            </Pressable>
            <Pressable
              onPress={() => void goNext()}
              disabled={submitting}
              style={{ flex: 1, borderRadius: rs(14), overflow: "hidden", opacity: submitting ? 0.7 : 1 }}
            >
              <LinearGradient
                colors={
                  step === 4
                    ? ["#30855B", "#256B49"]
                    : step === 2 && offerAccepted === "accepted"
                    ? ["#30855B", "#256B49"]
                    : [Colors.brand.blue, "#0054CC"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGrad}
              >
                <Text style={styles.ctaText}>
                  {submitting ? "Please wait…" :
                   step === 1 ? "Submit Application" :
                   step === 2 && offerAccepted === "negotiate" ? "Send Counter-Offer" :
                   step === 2 ? "Accept & Continue" :
                   step === 3 ? "Proceed to Sign" :
                   step === 4 ? "Sign Agreement" :
                   "Done"}
                </Text>
                {!submitting && <Ionicons name="arrow-forward" size={16} color="#FFF" />}
              </LinearGradient>
            </Pressable>
          </>
        )}
        {step === 5 && (
          <Pressable
            onPress={() => router.replace("/(tabs)/housing" as any)}
            style={{ flex: 1, borderRadius: rs(14), overflow: "hidden" }}
          >
            <LinearGradient
              colors={["#30855B", "#256B49"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGrad}
            >
              <Ionicons name="home" size={16} color="#FFF" />
              <Text style={styles.ctaText}>Back to Housing</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#F5F6FA" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(14),
    paddingTop: rs(12),
    paddingBottom: rs(14),
    gap: rs(10),
    backgroundColor: "#FFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E6EA",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: rs(4),
    elevation: 2,
  },
  backBtn: {
    width: rs(36), height: rs(36), borderRadius: rs(12),
    backgroundColor: "#EEF5FF",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: rs(16), fontWeight: "800", color: "#0A2540", letterSpacing: -0.3, flex: 1 },
  headerSub:   { fontSize: rs(11), color: "#6B7280", marginTop: rs(2), fontWeight: "500" },
  marketPill: {
    borderRadius: rs(8),
    paddingHorizontal: rs(8), paddingVertical: rs(4),
  },
  marketPillText: { fontSize: rs(11), fontWeight: "800" },

  // Step indicator
  stepContainer: {
    backgroundColor: "#FFF",
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E6EA",
  },
  stepRow: { flexDirection: "row", alignItems: "flex-start" },
  stepItem: { flex: 1, alignItems: "center", position: "relative" },
  stepCircle: {
    width: rs(26), height: rs(26), borderRadius: rs(13),
    backgroundColor: "#E5E7EB",
    alignItems: "center", justifyContent: "center",
    marginBottom: rs(4),
  },
  stepCircleDone:   { backgroundColor: Colors.brand.blue },
  stepCircleActive: { backgroundColor: Colors.brand.blue },
  stepNum:   { fontSize: rs(11), fontWeight: "800", color: "#9CA3AF" },
  stepLabel: { fontSize: rs(9), fontWeight: "600", color: "#9CA3AF", textAlign: "center" },
  stepLine: {
    position: "absolute",
    top: rs(13), left: "50%",
    width: "100%", height: rs(2),
    backgroundColor: "#E5E7EB",
    zIndex: -1,
  },

  // Scroll
  scroll: { paddingHorizontal: rs(16), paddingTop: rs(16) },

  // Section card
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: rs(14),
    marginBottom: rs(14),
  },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", gap: rs(10), marginBottom: rs(8) },
  sectionIcon: { width: rs(32), height: rs(32), borderRadius: rs(10), alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: rs(15), fontWeight: "800", color: "#0A2540" },
  sectionDesc:  { fontSize: rs(12), color: "#4B5563", lineHeight: rs(18) },

  // Fraud note
  fraudNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(8),
    backgroundColor: "#F0FDF4",
    borderWidth: 1, borderColor: "#BBF7D0",
    borderRadius: rs(12),
    padding: rs(12),
    marginBottom: rs(16),
  },
  fraudNoteText: { flex: 1, fontSize: rs(12), color: "#166534", lineHeight: rs(17) },

  // Group label
  groupLabel: {
    fontSize: rs(10), fontWeight: "800", color: "#9CA3AF",
    letterSpacing: 0.8, textTransform: "uppercase",
    marginBottom: rs(10), marginTop: rs(8),
  },

  // Fields
  field: { marginBottom: rs(14) },
  fieldLabel: { fontSize: rs(13), fontWeight: "700", color: "#374151", marginBottom: rs(6) },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: rs(12),
    paddingHorizontal: rs(14), paddingVertical: rs(11),
    fontSize: rs(14), color: "#0A2540",
  },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: rs(8) },
  chip: {
    paddingHorizontal: rs(12), paddingVertical: rs(7),
    borderRadius: rs(10), borderWidth: 1.5, borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  chipActive: { backgroundColor: "#EEF5FF", borderColor: Colors.brand.blue },
  chipText: { fontSize: rs(12), fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: Colors.brand.blue, fontWeight: "700" },

  // Toggle yes/no
  toggleRow: { flexDirection: "row", gap: rs(10), marginBottom: rs(8) },
  toggle: {
    paddingHorizontal: rs(20), paddingVertical: rs(8),
    borderRadius: rs(10), borderWidth: 1.5, borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  toggleActive: { backgroundColor: "#EEF5FF", borderColor: Colors.brand.blue },
  toggleText: { fontSize: rs(13), fontWeight: "600", color: "#6B7280" },
  toggleTextActive: { color: Colors.brand.blue, fontWeight: "700" },

  // Offer card
  offerCard: {
    borderRadius: rs(16), overflow: "hidden",
    borderWidth: 1.5, borderColor: "#BFDBFE",
    marginBottom: rs(16),
    shadowColor: "#000", shadowOpacity: 0.06,
    shadowRadius: rs(8), shadowOffset: { width: 0, height: rs(2) },
    elevation: 3,
  },
  offerCardHeader: {
    flexDirection: "row", alignItems: "center", gap: rs(10),
    paddingHorizontal: rs(16), paddingVertical: rs(12),
  },
  offerCardTitle: { fontSize: rs(15), fontWeight: "800", color: "#FFF" },
  offerCardBody: { backgroundColor: "#FFF", padding: rs(16) },
  offerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: rs(10) },
  offerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#F3F4F6" },
  offerKey: { fontSize: rs(12), fontWeight: "600", color: "#6B7280", flex: 0.45 },
  offerVal: { fontSize: rs(13), fontWeight: "600", color: "#0A2540", flex: 0.55, textAlign: "right" },
  conditionRow: { flexDirection: "row", alignItems: "flex-start", gap: rs(8), marginTop: rs(4) },
  conditionText: { flex: 1, fontSize: rs(12), color: "#374151", lineHeight: rs(17) },

  // Decision
  decisionRow: { flexDirection: "row", gap: rs(10), marginBottom: rs(14) },
  decisionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(8),
    paddingVertical: rs(12), borderRadius: rs(12),
    borderWidth: 1.5, borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  decisionBtnAccept:    { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  decisionBtnNegotiate: { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" },
  decisionBtnText: { fontSize: rs(13), fontWeight: "700", color: "#374151" },
  declineLink: { alignSelf: "center", paddingVertical: rs(8) },
  declineLinkText: { fontSize: rs(12), color: "#DC2626", fontWeight: "600", textDecorationLine: "underline" },

  // Agreement
  agreementBox: {
    backgroundColor: "#FFF",
    borderRadius: rs(14),
    borderWidth: 1.5, borderColor: "#E5E7EB",
    padding: rs(14),
    marginBottom: rs(12),
  },
  agreementText: {
    fontFamily: "monospace",
    fontSize: rs(11),
    color: "#374151",
    lineHeight: rs(17),
  },
  readConfirmBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    marginTop: rs(16), alignSelf: "flex-start",
    backgroundColor: "#F0FDF4",
    borderRadius: rs(8), paddingHorizontal: rs(12), paddingVertical: rs(8),
  },
  readConfirmText: { fontSize: rs(12), color: "#16A34A", fontWeight: "700" },
  readBanner: {
    flexDirection: "row", alignItems: "center", gap: rs(8),
    backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#86EFAC",
    borderRadius: rs(10), padding: rs(10), marginBottom: rs(12),
  },
  readBannerText: { fontSize: rs(12), color: "#166534", fontWeight: "700" },
  disclaimerBox: {
    flexDirection: "row", alignItems: "flex-start", gap: rs(8),
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: rs(10), padding: rs(12), marginBottom: rs(12),
  },
  disclaimerText: { flex: 1, fontSize: rs(11), color: "#6B7280", lineHeight: rs(16) },

  // E-Signature
  signatureInput: { fontStyle: "italic", fontSize: rs(16) },
  signaturePreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: rs(10), borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: rs(12), marginTop: rs(8),
    alignItems: "center",
  },
  signaturePreviewLabel: { fontSize: rs(10), color: "#9CA3AF", marginBottom: rs(6) },
  signatureFont: {
    fontSize: rs(22), fontStyle: "italic", fontWeight: "300",
    color: "#0A2540", marginBottom: rs(4),
    borderBottomWidth: 1, borderBottomColor: "#0A2540",
    paddingBottom: rs(4), minWidth: 200, textAlign: "center",
  },
  signatureTimestamp: { fontSize: rs(10), color: "#9CA3AF", marginTop: rs(4) },
  twoFACard: {
    backgroundColor: "#FFF",
    borderRadius: rs(14), borderWidth: 1.5, borderColor: "#BFDBFE",
    padding: rs(14), marginBottom: rs(14),
  },
  twoFADesc: { fontSize: rs(13), color: "#374151", lineHeight: rs(19), marginBottom: rs(12) },
  sendCodeBtn: { borderRadius: rs(10), overflow: "hidden" },
  sendCodeGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(8),
    paddingVertical: rs(12),
  },
  sendCodeText: { fontSize: rs(14), fontWeight: "700", color: "#FFF" },
  resendText: { fontSize: rs(12), color: Colors.brand.blue, fontWeight: "600", marginTop: rs(8), textDecorationLine: "underline" },
  counterSignNote: {
    flexDirection: "row", alignItems: "flex-start", gap: rs(8),
    backgroundColor: "#EEF5FF", borderWidth: 1, borderColor: "#BFDBFE",
    borderRadius: rs(10), padding: rs(12), marginBottom: rs(12),
  },
  counterSignText: { flex: 1, fontSize: rs(12), color: "#1E40AF", lineHeight: rs(17) },

  // Step 5 success
  successBanner: {
    backgroundColor: "#FFF",
    borderRadius: rs(16), borderWidth: 1, borderColor: "#86EFAC",
    padding: rs(24), alignItems: "center", marginBottom: rs(20),
  },
  successIconCircle: {
    width: rs(64), height: rs(64), borderRadius: rs(32),
    alignItems: "center", justifyContent: "center",
    marginBottom: rs(12),
  },
  successTitle: { fontSize: rs(20), fontWeight: "900", color: "#0A2540", marginBottom: rs(6) },
  successSub:   { fontSize: rs(13), color: "#6B7280", textAlign: "center", lineHeight: rs(18) },

  depositCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(14), borderWidth: 1.5, borderColor: "#FCD34D",
    padding: rs(14), marginBottom: rs(16),
  },
  depositCardHeader: { flexDirection: "row", alignItems: "center", gap: rs(8), marginBottom: rs(10) },
  depositCardTitle:  { fontSize: rs(14), fontWeight: "800", color: "#0A2540" },
  depositCardText:   { fontSize: rs(13), color: "#374151", lineHeight: rs(18) },
  schemeList: { marginTop: rs(10), gap: rs(8) },
  schemeRow:  { flexDirection: "row", alignItems: "center", gap: rs(8) },
  schemeText: { fontSize: rs(13), color: "#6B7280" },
  depositLawNote: {
    marginTop: rs(12), fontSize: rs(11), color: "#92400E",
    lineHeight: rs(16), fontStyle: "italic",
  },

  checklistCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(14), borderWidth: 1, borderColor: "#E5E7EB",
    padding: rs(14), marginBottom: rs(16), gap: rs(10),
  },
  checklistRow: { flexDirection: "row", alignItems: "flex-start", gap: rs(10) },
  checklistText: { flex: 1, fontSize: rs(13), color: "#374151", lineHeight: rs(18) },

  docSavedCard: {
    flexDirection: "row", alignItems: "center", gap: rs(12),
    backgroundColor: "#EEF5FF", borderRadius: rs(14),
    borderWidth: 1, borderColor: "#BFDBFE",
    padding: rs(14), marginBottom: rs(14),
  },
  docSavedIcon: { width: rs(40), height: rs(40), borderRadius: rs(13), alignItems: "center", justifyContent: "center" },
  docSavedTitle: { fontSize: rs(13), fontWeight: "700", color: "#1E40AF", marginBottom: rs(2) },
  docSavedSub:   { fontSize: rs(11), color: "#3B82F6" },

  helpCard: {
    flexDirection: "row", alignItems: "center", gap: rs(12),
    backgroundColor: "#EEF5FF", padding: rs(14),
    borderRadius: rs(14), borderWidth: 1, borderColor: "#BFDBFE",
  },
  helpTitle: { fontSize: rs(13), fontWeight: "700", color: "#1E40AF", marginBottom: rs(2) },
  helpDesc:  { fontSize: rs(11), color: "#3B82F6" },
  helpLink:  { fontSize: rs(12), fontWeight: "800", color: Colors.brand.blue },

  // CTA bar
  ctaBar: {
    flexDirection: "row", gap: rs(10), alignItems: "center",
    paddingHorizontal: rs(16), paddingTop: rs(12),
    backgroundColor: "#FFF",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E4E6EA",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(-2) }, elevation: 6,
  },
  ctaBack: {
    paddingHorizontal: rs(18), paddingVertical: rs(14),
    borderRadius: rs(14), borderWidth: 1.5, borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  ctaBackText: { fontSize: rs(14), fontWeight: "700", color: "#6B7280" },
  ctaGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(8), paddingVertical: rs(14),
  },
  ctaText: { fontSize: rs(15), fontWeight: "800", color: "#FFF" },

  // Viewing status (optional, Step 1)
  viewingOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    paddingVertical: rs(11),
    paddingHorizontal: rs(12),
    borderRadius: rs(12),
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: rs(8),
  },
  viewingOptionIcon: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(9),
    alignItems: "center",
    justifyContent: "center",
  },
  viewingOptionText: {
    flex: 1,
    fontSize: rs(13),
    color: "#374151",
    fontWeight: "600",
  },
  viewingRadio: {
    width: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  viewingRadioDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
  },
  viewingAdvisory: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(8),
    backgroundColor: "#FFFBEB",
    borderRadius: rs(10),
    padding: rs(12),
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: rs(4),
  },
  viewingAdvisoryText: {
    flex: 1,
    fontSize: rs(12),
    color: "#92400E",
    lineHeight: rs(18),
  },
});
