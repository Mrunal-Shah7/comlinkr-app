import { palette } from "../../../theme/palette";
import { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Share, useWindowDimensions, StyleSheet } from "react-native";
import { TYPE, body, display } from "../../../theme/d";
import { GradientButton, Reveal, SoftButton } from "../../../shared/d";
import { has } from "./DListingCards";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { VerifiedBadgePill } from "../../../../components/BadgeIndicator";
import { useAuthStore } from "../../../store/auth.store";
import { useRequireAuth } from "../../../shared/hooks/useRequireAuth";
import { getShareLink } from "../../../utils/shareLinks";
import { LinkifiedText } from "../../../../components/LinkifiedText";
import { appAlert } from "../../../shared/ui/Dialogs";
import { md } from "../styles/propertyDetail.styles";
import { type Listing, navigateToLandlordChat } from "../listingModel";
import { ImageCarousel } from "./ImageViewer";
import { openGallery } from "../galleryStore";
import { LandlordAvatar } from "./LandlordAvatar";
import { ReportListingModal } from "./ReportListingModal";

// ── Detail row helper ────────────────────────────────────────────────────────
export function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { isDark, tc } = useTheme();
  return (
    <View style={md.detailRow}>
      <View style={[md.detailIconBox, isDark && { backgroundColor: tc.inputBg }]}>
        <Ionicons name={icon} size={14} color={Colors.brand.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[md.detailLabel, { color: tc.textTertiary }]}>{label}</Text>
        <Text style={[md.detailValue, { color: tc.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

// ── Icons for amenities and details (TR-066) ────────────────────────────────
type IconName = keyof typeof Ionicons.glyphMap;
const AMENITY_ICONS: [RegExp, IconName][] = [
  [/wi-?fi|internet|broadband/i, "wifi-outline"],
  // Before laundry: "Dishwasher" contains "washer".
  [/dishwasher|kitchen/i, "restaurant-outline"],
  [/parking|garage|\bcar\b/i, "car-outline"],
  [/laundry|washer|dryer/i, "shirt-outline"],
  [/gym|fitness/i, "barbell-outline"],
  [/pet|dog|cat/i, "paw-outline"],
  [/pool|swim/i, "water-outline"],
  [/air ?con|\bac\b|a\/c|cooling/i, "snow-outline"],
  [/heat/i, "flame-outline"],
  [/balcony|terrace|patio|garden|yard/i, "leaf-outline"],
  [/elevator|lift/i, "swap-vertical-outline"],
  [/doorman|concierge/i, "person-outline"],
  [/furnish/i, "bed-outline"],
  [/storage/i, "cube-outline"],
  [/rooftop|roof/i, "business-outline"],
  [/security|cctv|gated/i, "shield-checkmark-outline"],
  [/bike|bicycle/i, "bicycle-outline"],
  [/transit|metro|subway|train|bus/i, "train-outline"],
];
function amenityIcon(tag: string): IconName {
  return AMENITY_ICONS.find(([re]) => re.test(tag))?.[1] ?? "checkmark-circle-outline";
}
const DETAIL_ICONS: Record<string, IconName> = {
  Available: "calendar-outline", Deposit: "wallet-outline", Lease: "document-text-outline", Furnishing: "bed-outline",
  Pets: "paw-outline", Parking: "car-outline", Laundry: "shirt-outline", Heating: "flame-outline", Cooling: "snow-outline",
  Utilities: "flash-outline", "Year built": "hammer-outline", Neighbourhood: "map-outline",
};
/** How many amenities, and which key facts, show before "More details". */
const FIRST_AMENITIES = 6;
const GLANCE_KEYS = ["Deposit", "Lease", "Pets", "Furnishing", "Parking", "Laundry", "Neighbourhood"];
/** A description longer than this is shown as a three-line preview first. */
const LONG_DESCRIPTION = 180;

// ── Property detail (the body of the /listing/[id] route, plan 03) ───────────
export function PropertyDetail({
  listing,
  onClose,
  onDelete,
  onEdit, // SPRINT-42: expose owner listing edit from detail.
  initialJourneyStep = 0,
  onJourneyStepChange,
  isBookmarked,
  onToggleBookmark,
}: {
  listing: Listing | null;
  onClose: () => void;
  /** Delete own listing (confirmation handled by parent). */
  onDelete?: () => void;
  onEdit?: () => void; // SPRINT-42: route backend-authorized owners to shared listing edit mode.
  initialJourneyStep?: number;
  onJourneyStepChange?: (listingId: string, step: number) => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [journeyStep,         setJourneyStep]         = useState(initialJourneyStep); // 0=none,1=interested,2=enquired,3=viewing,4=applied
  const [showReportModal,     setShowReportModal]     = useState(false);
  // TR-066: the first view shows the essentials; "More details" opens the rest.
  const [showAll,             setShowAll]             = useState(false);
  const { isDark, tc } = useTheme();
  const { requireAuth } = useRequireAuth();
  const navLockRef = useRef(false); // blocks repeat taps while a close-then-navigate is pending

  // Sync initialJourneyStep whenever a different listing is opened
  useEffect(() => { setJourneyStep(initialJourneyStep); setShowAll(false); }, [listing?.id]);
  // A step changed elsewhere (sending or withdrawing an application) shows when the detail is back in front.
  useEffect(() => { setJourneyStep(initialJourneyStep); }, [initialJourneyStep]);

  const advanceJourneyStep = (step: number) => {
    if (step > journeyStep) {
      setJourneyStep(step);
      if (listing) onJourneyStepChange?.(listing.id, step);
    }
  };

  if (!listing) return null;

  // Determine market from listing address heuristics
  const isUK = listing.address.includes("London") || listing.address.includes("UK") || listing.address.includes("Manchester") || listing.price.includes("£");
  const market = isUK ? "UK" : "US";

  const JOURNEY_STEPS = [
    { icon: "compass-outline",      label: "Exploring" },
    { icon: "chatbubble-outline",   label: "Enquired" },
    { icon: "calendar-outline",     label: "Viewing" },
    { icon: "document-text-outline",label: "Applied" },
    { icon: "pencil-outline",       label: "Signed" },
  ];

  // The detail is a route (plan 03): the next screen is pushed on top of it, and Back returns here.
  const navigateAfterClose = (go: () => void, _delayMs = 0) => {
    if (navLockRef.current) return; // a double tap would push the screen twice
    navLockRef.current = true;
    go();
    setTimeout(() => { navLockRef.current = false; }, 600);
  };

  const messageLandlord = () => {
    const { isAuthed, user } = useAuthStore.getState();
    navigateAfterClose(() => navigateToLandlordChat(listing), isAuthed && user?.onboardingDone ? 0 : 400);
  };

  const handleRequestViewing = () => {
    const { isAuthed, user } = useAuthStore.getState();
    if (!isAuthed || !user?.onboardingDone) {
      navigateAfterClose(() => { requireAuth(undefined, "Sign in to request a viewing."); }, 400);
      return;
    }
    advanceJourneyStep(2);
    appAlert(
      "Request a Viewing",
      `Message ${listing.landlord.name} to arrange a viewing time. Use the chat to agree on a slot that works for both of you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Chat",
          onPress: () => {
            advanceJourneyStep(3);
            navigateAfterClose(() => navigateToLandlordChat(listing!));
          },
        },
      ],
    );
  };

  const handleApply = () => {
    // Auth prompt runs after the modal is gone too, so its "Sign In" route isn't hidden behind it.
    const { isAuthed, user } = useAuthStore.getState();
    const needsPrompt = !isAuthed || !user?.onboardingDone;
    navigateAfterClose(() => {
      if (!requireAuth(undefined, "Sign in to apply for this listing.")) return;
      router.push({
      pathname: "/property-agreement" as any,
      params: {
        listingId:       listing.id,
        landlordId:      listing.landlord.id,
        propertyTitle:   listing.title,
        propertyAddress: listing.address,
        price:           listing.price,
        deposit:         listing.deposit,
        landlordName:    listing.landlord.name,
        country:         market,
        dealType:        "rent",
        availableDay:    listing.availableDay ?? "",
      },
      });
    }, needsPrompt ? 400 : 0);
  };

  const CAROUSEL_H = 350;
  const statusMeta = listing.listingStatus === "RENTED" ? "Rented" : listing.listingStatus === "UNLISTED" ? "Unlisted" : null;
  const facts: { v: string; l: string; icon: IconName }[] = [
    { v: listing.beds > 0 ? String(listing.beds) : "", l: listing.beds === 1 ? "Bed" : "Beds", icon: "bed-outline" as IconName },
    { v: listing.baths > 0 ? String(listing.baths) : "", l: listing.baths === 1 ? "Bath" : "Baths", icon: "water-outline" as IconName },
    { v: has(listing.sqft) ? listing.sqft : "", l: "Sq ft", icon: "resize-outline" as IconName },
    // The label already says "Floor": "2nd Floor" shows as "2nd".
    { v: has(listing.floor) ? String(listing.floor).replace(/\s*(floor|flr|fl)\.?$/i, "").trim() || String(listing.floor) : "", l: "Floor", icon: "layers-outline" as IconName },
  ].filter((x) => x.v);
  const details = ([
    ["Available", listing.available], ["Deposit", listing.deposit], ["Lease", listing.leaseTerm], ["Furnishing", listing.furnished],
    ["Pets", listing.petPolicy], ["Parking", listing.parking], ["Laundry", listing.laundry], ["Heating", listing.heating],
    ["Cooling", listing.cooling], ["Utilities", listing.utilities], ["Year built", listing.yearBuilt], ["Neighbourhood", listing.neighborhood],
  ] as [string, string][]).filter(([, v]) => has(v));
  // "Available" is already the green tag at the top.
  const glance = GLANCE_KEYS.map((k) => details.find(([key]) => key === k)).filter((d): d is [string, string] => !!d).slice(0, 4);
  const restDetails = details.filter(([k]) => k !== "Available" && !glance.some(([g]) => g === k));
  const longDescription = has(listing.description) && listing.description.length > LONG_DESCRIPTION;
  const hasMore = longDescription || listing.tags.length > FIRST_AMENITIES || restDetails.length > 0;
  const share = () => {
    const link = getShareLink("listing", listing.id);
    Share.share({ title: listing.title, message: `${listing.title} — ${listing.price}/mo at ${listing.address}. Check it out on ComLinkr!\n\n${link}`, ...(process.env.EXPO_OS === "ios" ? { url: link } : {}) });
  };
  const more = () => appAlert(listing.title, undefined, [
    { text: "Share", onPress: share },
    ...(!listing.isOwner ? [{ text: "Report this listing", style: "destructive" as const, onPress: () => setShowReportModal(true) }] : []),
    { text: "Cancel", style: "cancel" },
  ]);
  const glassBtn = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, color = tc.textPrimary) => (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: tc.glass, borderWidth: 1, borderColor: tc.glassLine }}>
      <Ionicons name={icon} size={19} color={color} />
    </Pressable>
  );
  const section = (title: string) => <Text style={[TYPE.section, { color: tc.textPrimary, marginTop: 22, marginBottom: 10 }]}>{title}</Text>;
  const unavailable = !!listing.listingStatus && listing.listingStatus !== "AVAILABLE" && !listing.isOwner;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
        {/* ── Photos, with glass buttons (design D, plan 01) ── */}
        <View style={{ height: CAROUSEL_H }}>
          <ImageCarousel images={listing.images} width={windowWidth} height={CAROUSEL_H} showCounter onImagePress={(idx) => openGallery(listing.images, idx)} />
          <View style={{ position: "absolute", top: insets.top + 10, left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
            {glassBtn("chevron-back", "Back", onClose)}
            <View style={{ flex: 1 }} />
            {listing.isOwner && onEdit ? glassBtn("pencil-outline", "Edit listing", onEdit) : null}
            {listing.isOwner && onDelete ? glassBtn("trash-outline", "Delete listing", onDelete, tc.dangerText) : null}
            {glassBtn(isBookmarked ? "bookmark" : "bookmark-outline", isBookmarked ? "Remove from saved" : "Save listing", () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleBookmark(); }, isBookmarked ? tc.accentText : tc.textPrimary)}
            {glassBtn("ellipsis-horizontal", "More options", more)}
          </View>
        </View>

        {/* ── The page rises over the photo with rounded corners ── */}
        <ScrollView
          style={{ flex: 1, marginTop: -26, backgroundColor: tc.pageBg, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Reveal i={0} style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {has(listing.type) ? <View style={[pd.tag, { backgroundColor: tc.accentSoft }]}><Text style={[TYPE.label, { color: tc.accentText }]}>{listing.type}</Text></View> : null}
            {statusMeta
              ? <View style={[pd.tag, { backgroundColor: tc.warningBg }]}><Text style={[TYPE.label, { color: tc.warningText }]}>{statusMeta}</Text></View>
              : has(listing.available) ? <View style={[pd.tag, { backgroundColor: tc.mintSoft }]}><Text style={[TYPE.label, { color: tc.successText }]}>{/now|immediate/i.test(listing.available) ? "Available now" : `From ${listing.available}`}</Text></View> : null}
            {listing.verified ? <VerifiedBadgePill badge="landlord" /> : null}
          </Reveal>
          <Reveal i={1}>
            <Text style={[display(800), { fontSize: 25, lineHeight: 29, color: tc.textPrimary }]}>{listing.title}</Text>
            {has(listing.address) ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                <Ionicons name="location-outline" size={15} color={tc.textSecondary} />
                <Text style={[TYPE.small, { color: tc.textSecondary, flex: 1 }]}>{listing.address}</Text>
              </View>
            ) : null}
          </Reveal>

          {facts.length ? (
            <Reveal i={2} style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              {facts.map((x) => (
                <View key={x.l} style={[pd.fact, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
                  <Ionicons name={x.icon} size={18} color={tc.accentText} style={{ marginBottom: 4 }} />
                  {/* A long value ("2nd Floor") gets a smaller size and may wrap to two lines instead of being cut off. */}
                  <Text style={[display(800), { fontSize: String(x.v).length > 5 ? 15 : 19, lineHeight: String(x.v).length > 5 ? 18 : 23, color: tc.textPrimary, textAlign: "center" }]} numberOfLines={2}>{x.v}</Text>
                  <Text style={[TYPE.small, { color: tc.textSecondary, fontSize: 12 }]}>{x.l}</Text>
                </View>
              ))}
            </Reveal>
          ) : null}

          {/* ── At a glance: four key facts with icons (TR-066) ── */}
          {glance.length ? (
            <Reveal i={3} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {glance.map(([k, v]) => (
                <View key={k} style={[pd.glance, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
                  <View style={[pd.glanceIcon, { backgroundColor: tc.accentSoft }]}>
                    <Ionicons name={DETAIL_ICONS[k] ?? "information-circle-outline"} size={16} color={tc.accentText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPE.small, { color: tc.textTertiary, fontSize: 12 }]}>{k}</Text>
                    <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, fontSize: 14 }]} numberOfLines={2}>{v}</Text>
                  </View>
                </View>
              ))}
            </Reveal>
          ) : null}

          {has(listing.description) ? (
            <Reveal i={4}>
              {section("About this place")}
              <LinkifiedText text={listing.description} style={[TYPE.body, { color: tc.textSecondary }]} numberOfLines={showAll || !longDescription ? undefined : 3} />
            </Reveal>
          ) : null}

          {listing.tags.length ? (
            <Reveal i={5}>
              {section("What it has")}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(showAll ? listing.tags : listing.tags.slice(0, FIRST_AMENITIES)).map((tag) => (
                  <View key={tag} style={[pd.amen, { backgroundColor: tc.cardBg, borderColor: tc.borderMedium }]}>
                    <Ionicons name={amenityIcon(tag)} size={15} color={tc.accentText} />
                    <Text style={[body(600), { fontSize: 13.5, color: tc.textPrimary }]}>{tag}</Text>
                  </View>
                ))}
                {!showAll && listing.tags.length > FIRST_AMENITIES ? (
                  <View style={[pd.amen, { backgroundColor: tc.chipBg, borderColor: tc.chipBg }]}>
                    <Text style={[body(600), { fontSize: 13.5, color: tc.textSecondary }]}>+{listing.tags.length - FIRST_AMENITIES} more</Text>
                  </View>
                ) : null}
              </View>
            </Reveal>
          ) : null}

          {/* ── The rest of the facts, behind "More details" ── */}
          {showAll && restDetails.length ? (
            <Reveal>
              {section("Details")}
              <View style={[pd.dl, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
                {restDetails.map(([k, v], i) => (
                  <View key={k} style={[pd.dlRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name={DETAIL_ICONS[k] ?? "information-circle-outline"} size={17} color={tc.textTertiary} />
                      <Text style={[TYPE.body, { color: tc.textSecondary }]}>{k}</Text>
                    </View>
                    <Text style={[TYPE.bodyStrong, { color: tc.textPrimary, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
                  </View>
                ))}
              </View>
            </Reveal>
          ) : null}

          {hasMore ? (
            <SoftButton
              block
              label={showAll ? "Fewer details" : "More details"}
              icon={<Ionicons name={showAll ? "chevron-up" : "chevron-down"} size={18} color={tc.accentText} />}
              onPress={() => { void Haptics.selectionAsync(); setShowAll(!showAll); }}
              outerStyle={{ marginTop: 18 }}
            />
          ) : null}

          {/* Journey: only once you have contacted the owner (design D, problem 12) */}
          {journeyStep >= 2 && (
            <Reveal>
              {section("Your journey")}
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                {JOURNEY_STEPS.map((st, i) => {
                  const done = i < journeyStep;
                  return (
                    <View key={i} style={{ flex: 1, alignItems: "center" }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: done ? tc.mint : tc.inputBg }}>
                        <Ionicons name={st.icon as any} size={14} color={done ? palette.white : tc.textTertiary} />
                      </View>
                      <Text style={[TYPE.small, { fontSize: 11, marginTop: 4, color: done ? tc.textPrimary : tc.textTertiary }]}>{st.label}</Text>
                    </View>
                  );
                })}
              </View>
            </Reveal>
          )}

          {section("Listed by")}
          <Pressable onPress={messageLandlord} style={[pd.owner, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]} accessibilityRole="button" accessibilityLabel={`Message ${listing.landlord.name}`}>
            <LandlordAvatar uri={listing.landlord.avatarUrl} initials={listing.landlord.initials} color={listing.landlord.color} diameter={48} style={md.landlordAvatar} textStyle={md.landlordInitials} />
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{listing.landlord.name}</Text>
              {listing.landlord?.since ? <Text style={[TYPE.small, { color: tc.textSecondary }]}>Member since {listing.landlord.since}</Text> : null}
            </View>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={tc.accentText} />
          </Pressable>

          {!unavailable && journeyStep < 3 ? (
            <Pressable onPress={handleRequestViewing} hitSlop={6} style={{ alignSelf: "center", marginTop: 16 }} accessibilityRole="button">
              <Text style={[TYPE.bodyStrong, { color: tc.accentText }]}>Ask to see it first</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {/* ── Glass bar: price, Message, the next step ── */}
        <View style={[pd.bar, { paddingBottom: insets.bottom + 12, backgroundColor: tc.glass, borderTopColor: tc.glassLine }]}>
          {unavailable ? (
            <Text style={[TYPE.bodyStrong, { flex: 1, textAlign: "center", color: tc.textSecondary }]}>
              {listing.listingStatus === "RENTED" ? "This property has been rented." : "This listing is no longer available."}
            </Text>
          ) : (
            <>
              <View style={{ marginRight: "auto" }}>
                <Text style={[display(800), { fontSize: 19, color: tc.textPrimary }]}>{listing.price}</Text>
                {has(listing.priceNote) ? <Text style={[TYPE.small, { color: tc.textSecondary, fontSize: 12 }]}>{listing.priceNote}</Text> : null}
              </View>
              <SoftButton label="Message" onPress={() => { if (journeyStep < 2) setJourneyStep(2); messageLandlord(); }} />
              {journeyStep < 4 ? <GradientButton label="Apply" onPress={() => { if (journeyStep < 2) setJourneyStep(2); handleApply(); }} /> : null}
              {journeyStep >= 4 ? <GradientButton label="Agreement" onPress={handleApply} accessibilityLabel="View agreement" /> : null}
            </>
          )}
        </View>

        <ReportListingModal visible={showReportModal} listingId={listing.id} listingTitle={listing.title} onClose={() => setShowReportModal(false)} />
      </View>

    </>
  );
}

const pd = StyleSheet.create({
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  fact: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 6, borderRadius: 18, borderWidth: 1 },
  glance: { width: "46%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 18, borderWidth: 1 },
  glanceIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  amen: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  dl: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14 },
  dlRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 12 },
  owner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, borderWidth: 1 },
  bar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
