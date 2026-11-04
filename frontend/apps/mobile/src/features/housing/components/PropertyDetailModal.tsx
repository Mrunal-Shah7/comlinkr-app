import { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Modal, Share, useWindowDimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { VerifiedBadgePill } from "../../../../components/BadgeIndicator";
import { useAuthStore } from "../../../store/auth.store";
import { useRequireAuth } from "../../../shared/hooks/useRequireAuth";
import { DismissibleSheet, SheetDragArea } from "../../../shared/ui/DismissibleSheet";
import { getShareLink } from "../../../utils/shareLinks";
import { LinkifiedText } from "../../../../components/LinkifiedText";
import { appAlert } from "../../../shared/ui/Dialogs";
import { md } from "../styles/propertyDetail.styles";
import { type Listing, navigateToLandlordChat } from "../listingModel";
import { ImageCarousel, FullscreenImageViewer } from "./ImageViewer";
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

// ── Property detail modal ────────────────────────────────────────────────────
export function PropertyDetailModal({
  listing,
  visible,
  onClose,
  onDelete,
  onEdit, // SPRINT-42: expose owner listing edit from detail.
  initialJourneyStep = 0,
  onJourneyStepChange,
  isBookmarked,
  onToggleBookmark,
}: {
  listing: Listing | null;
  visible: boolean;
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
  const [fsVisible,           setFsVisible]           = useState(false);
  const [fsStartIdx,          setFsStartIdx]          = useState(0);
  const { isDark, tc } = useTheme();
  const { requireAuth } = useRequireAuth();
  const navLockRef = useRef(false); // blocks repeat taps while a close-then-navigate is pending

  // Sync initialJourneyStep whenever a different listing is opened
  useEffect(() => { setJourneyStep(initialJourneyStep); }, [listing?.id]);

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

  // This detail view is a native <Modal>; a route pushed while it is still presented renders
  // underneath it (screen looks stuck). Dismiss it first, then navigate once the dismissal finishes.
  const navigateAfterClose = (go: () => void, delayMs = 0) => {
    // Each extra tap during the delay used to queue another push, stacking the screen several times.
    if (navLockRef.current) return;
    navLockRef.current = true;
    onClose();
    // No artificial delay: closing unmounts the Modal and the route is pushed in the same tick,
    // so the new screen starts sliding in while the Modal is already on its way out.
    if (delayMs > 0) setTimeout(go, delayMs); else go(); // delay only for alerts, which iOS drops while a Modal is dismissing
    setTimeout(() => { navLockRef.current = false; }, 600); // only guards against double taps
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
      },
      });
    }, needsPrompt ? 400 : 0);
  };

  const CAROUSEL_H = 300;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <DismissibleSheet onDismiss={onClose} style={{ backgroundColor: tc.sheetBg }}>
        {/* ── Full-bleed carousel ── */}
        <SheetDragArea style={{ height: CAROUSEL_H }}>
          <ImageCarousel
            images={listing.images}
            width={windowWidth}
            height={CAROUSEL_H}
            showCounter
            onImagePress={(idx) => { setFsStartIdx(idx); setFsVisible(true); }}
          />

          {/* Gradient scrim at top for button visibility */}
          <LinearGradient
            colors={["rgba(0,0,0,0.18)", "transparent"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + 70,
            }}
          />

          {/* Floating controls */}
          <View
            style={{
              position: "absolute",
              top: insets.top + 10,
              left: 14,
              right: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Pressable onPress={onClose} style={md.floatBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {listing.isOwner && onEdit ? <Pressable onPress={onEdit} style={md.floatBtn} accessibilityLabel="Edit listing"><Ionicons name="pencil-outline" size={18} color={Colors.brand.blue} /></Pressable> : null}
              {/* SPRINT-42: show Edit only for backend isOwner listing detail. */}
              {listing.isOwner && onDelete ? (
                <Pressable onPress={onDelete} style={md.floatBtn} accessibilityLabel="Delete listing">
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleBookmark();
                }}
                style={md.floatBtn}
                accessibilityLabel={isBookmarked ? "Remove bookmark" : "Save listing"}
              >
                <Ionicons
                  name={isBookmarked ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={isBookmarked ? "#FF7B00" : Colors.text.secondary}
                />
              </Pressable>
              <Pressable
                style={md.floatBtn}
                onPress={() => {
                  const link = getShareLink("listing", listing.id);
                  Share.share({
                    title: listing.title,
                    message: `${listing.title} — ${listing.price}/mo at ${listing.address}. Check it out on ComLinkr!\n\n${link}`,
                    ...(Platform.OS === "ios" ? { url: link } : {}),
                  });
                }}
              >
                <Ionicons name="share-outline" size={18} color={Colors.text.secondary} />
              </Pressable>
            </View>
          </View>
        </SheetDragArea>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Price + badges */}
          <View style={md.priceRow}>
            <View>
              <Text style={md.priceMain}>{listing.price}</Text>
              <Text style={[md.priceNote, { color: tc.textTertiary }]}>{listing.priceNote}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {(() => {
                const statusMeta =
                  listing.listingStatus === "RENTED"
                    ? { label: "Rented", bg: "#FEE2E2", dot: "#DC2626" }
                    : listing.listingStatus === "UNLISTED"
                    ? { label: "Unlisted", bg: "#F1F5F9", dot: "#64748B" }
                    : { label: "Available", bg: "#D1FAE5", dot: "#059669" };
                return (
                  <View style={[md.statusBadge, { backgroundColor: statusMeta.bg }]}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusMeta.dot }} />
                    <Text style={[md.statusText, { color: statusMeta.dot }]}>{statusMeta.label}</Text>
                  </View>
                );
              })()}
              {listing.verified && <VerifiedBadgePill badge="landlord" />}
            </View>
          </View>

          {/* Title & location */}
          <Text style={[md.modalTitle, { color: tc.textPrimary }]}>{listing.title}</Text>
          <View style={md.locationRow}>
            <Ionicons name="location-sharp" size={13} color={Colors.brand.blue} />
            <Text style={[md.locationText, { color: tc.textSecondary }]}>{listing.address}</Text>
          </View>

          {/* Stats bar */}
          <View style={[md.statsBar, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
            <View style={md.statBox}>
              <Ionicons name="bed-outline" size={22} color={Colors.brand.blue} />
              <Text style={[md.statNum, { color: tc.textPrimary }]}>{listing.beds === 0 ? "—" : listing.beds}</Text>
              <Text style={[md.statLbl, { color: tc.textTertiary }]}>Beds</Text>
            </View>
            <View style={md.statDivider} />
            <View style={md.statBox}>
              <Ionicons name="water-outline" size={22} color={Colors.brand.blue} />
              <Text style={[md.statNum, { color: tc.textPrimary }]}>{listing.baths}</Text>
              <Text style={[md.statLbl, { color: tc.textTertiary }]}>Baths</Text>
            </View>
            <View style={md.statDivider} />
            <View style={md.statBox}>
              <Ionicons name="resize-outline" size={22} color={Colors.brand.blue} />
              <Text style={[md.statNum, { color: tc.textPrimary }]}>{listing.sqft}</Text>
              <Text style={[md.statLbl, { color: tc.textTertiary }]}>Sq Ft</Text>
            </View>
            <View style={md.statDivider} />
            <View style={md.statBox}>
              <Ionicons name="business-outline" size={22} color={Colors.brand.blue} />
              <Text style={[md.statNum, { fontSize: 11, color: tc.textPrimary }]} numberOfLines={1}>
                {listing.floor}
              </Text>
              <Text style={[md.statLbl, { color: tc.textTertiary }]}>Floor</Text>
            </View>
          </View>

          {/* Description */}
          <View style={md.section}>
            <Text style={[md.sectionTitle, { color: tc.textPrimary }]}>About this property</Text>
            <LinkifiedText text={listing.description} style={[md.description, { color: tc.textSecondary }]} />
          </View>

          {/* Property details grid */}
          <View style={md.section}>
            <Text style={[md.sectionTitle, { color: tc.textPrimary }]}>Property Details</Text>
            <View style={md.detailGrid}>
              <DetailRow icon="calendar-outline" label="Available" value={listing.available} />
              <DetailRow icon="card-outline" label="Security Deposit" value={listing.deposit} />
              <DetailRow icon="home-outline" label="Year Built" value={listing.yearBuilt} />
              <DetailRow icon="car-outline" label="Parking" value={listing.parking} />
              <DetailRow icon="paw-outline" label="Pet Policy" value={listing.petPolicy} />
              <DetailRow icon="cube-outline" label="Property Type" value={listing.type} />
              <DetailRow icon="shirt-outline" label="Laundry" value={listing.laundry} />
              <DetailRow icon="flame-outline" label="Heating" value={listing.heating} />
              <DetailRow icon="snow-outline" label="Cooling" value={listing.cooling} />
              <DetailRow icon="flash-outline" label="Utilities" value={listing.utilities} />
              <DetailRow icon="document-text-outline" label="Lease Term" value={listing.leaseTerm} />
              <DetailRow icon="map-outline" label="Neighborhood" value={listing.neighborhood} />
              <DetailRow icon="bed-outline" label="Furnished" value={listing.furnished} />
            </View>
          </View>

          {/* Amenities */}
          <View style={md.section}>
            <Text style={[md.sectionTitle, { color: tc.textPrimary }]}>Amenities & Features</Text>
            <View style={md.tagsWrap}>
              {listing.tags.map((tag) => (
                <View key={tag} style={md.amenityTag}>
                  <Ionicons name="checkmark-circle" size={13} color={Colors.brand.green} />
                  <Text style={md.amenityText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Journey progress */}
          {journeyStep > 0 && (
            <View style={md.section}>
              <Text style={[md.sectionTitle, { color: tc.textPrimary }]}>Your Journey</Text>
              <View style={md.journeyRow}>
                {JOURNEY_STEPS.map((s, i) => {
                  const done   = i < journeyStep;
                  const active = i === journeyStep - 1;
                  return (
                    <View key={i} style={md.journeyItem}>
                      <View style={[md.journeyDot, done && md.journeyDotDone, active && md.journeyDotActive]}>
                        <Ionicons name={s.icon as any} size={12} color={done || active ? "#FFF" : "#9CA3AF"} />
                      </View>
                      <Text style={[md.journeyLabel, (done || active) && { color: Colors.brand.blue }]}>{s.label}</Text>
                      {i < JOURNEY_STEPS.length - 1 && (
                        <View style={[md.journeyLine, done && { backgroundColor: Colors.brand.blue }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Landlord card */}
          <View style={md.section}>
            <Text style={[md.sectionTitle, { color: tc.textPrimary }]}>Listed by</Text>
            <View style={[md.landlordCard, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
              <LandlordAvatar
                uri={listing.landlord.avatarUrl}
                initials={listing.landlord.initials}
                color={listing.landlord.color}
                diameter={50}
                style={md.landlordAvatar}
                textStyle={md.landlordInitials}
              />
              <View style={{ flex: 1 }}>
                <Text style={[md.landlordName, { color: tc.textPrimary }]}>{listing.landlord.name}</Text>
                {listing.verified && <View style={{ marginTop: 4 }}><VerifiedBadgePill badge="landlord" /></View>}
                {listing.landlord?.since ? (
                  <Text style={[md.landlordMeta, { color: tc.textSecondary, marginTop: 2 }]}>
                    Member since {listing.landlord.since}
                  </Text>
                ) : null}
              </View>
              <Pressable style={[md.msgLandlordBtn, isDark && { backgroundColor: tc.inputBg }]} onPress={messageLandlord}>
                <Ionicons name="chatbubble-outline" size={16} color={Colors.brand.blue} />
              </Pressable>
            </View>
          </View>

          {/* ── Report this listing (not your own) ── */}
          {!listing.isOwner ? (
            <Pressable
              onPress={() => setShowReportModal(true)}
              style={md.reportLink}
            >
              <Ionicons name="flag-outline" size={13} color="#DC2626" />
              <Text style={md.reportLinkText}>Report this listing</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {/* ── Bottom CTA ── */}
        <View style={[md.ctaBar, { paddingBottom: insets.bottom + 12 }, isDark && { backgroundColor: tc.cardBg, borderTopColor: tc.borderLight }]}>
          {listing.listingStatus && listing.listingStatus !== "AVAILABLE" && !listing.isOwner ? (
            <View style={{ flex: 1, alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ color: tc.textSecondary, fontSize: 13, fontWeight: "700" }}>
                {listing.listingStatus === "RENTED" ? "This property has been rented." : "This listing is no longer available."}
              </Text>
            </View>
          ) : (
            <>
          {/* Message Landlord — always visible */}
          <Pressable
            style={md.ctaSecondary}
            onPress={() => {
              if (journeyStep < 2) setJourneyStep(2);
              messageLandlord();
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={17} color={Colors.brand.blue} />
            <Text style={md.ctaSecondaryText}>Message</Text>
          </Pressable>

          {/* Primary CTA — changes based on journey step */}
          {(journeyStep === 0 || journeyStep === 1) && (
            <View style={{ flex: 1, gap: 8 }}>
              <Pressable style={{ borderRadius: 14, overflow: "hidden" }} onPress={handleRequestViewing}>
                <LinearGradient colors={["#FF7B00", "#E56800"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={md.ctaPrimary}>
                  <Ionicons name="calendar-outline" size={17} color="#FFF" />
                  <Text style={md.ctaPrimaryText}>Request Viewing</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={() => {
                  setJourneyStep(2);
                  handleApply();
                }}
                style={md.skipViewingBtn}
              >
                <Ionicons name="document-text-outline" size={13} color={Colors.brand.blue} />
                <Text style={md.skipViewingText}>Skip viewing — Apply directly</Text>
              </Pressable>
            </View>
          )}
          {journeyStep >= 2 && journeyStep < 4 && (
            <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={handleApply}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.blueDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={md.ctaPrimary}>
                <Ionicons name="document-text-outline" size={17} color="#FFF" />
                <Text style={md.ctaPrimaryText}>Apply for Property</Text>
              </LinearGradient>
            </Pressable>
          )}
          {journeyStep >= 4 && (
            <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={handleApply}>
              <LinearGradient colors={["#26B324", "#1a8a18"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={md.ctaPrimary}>
                <Ionicons name="document-text-outline" size={17} color="#FFF" />
                <Text style={md.ctaPrimaryText}>View Agreement</Text>
              </LinearGradient>
            </Pressable>
          )}
            </>
          )}
        </View>

        {/* ── Report Listing Sheet ── */}
        <ReportListingModal
          visible={showReportModal}
          listingId={listing.id}
          listingTitle={listing.title}
          onClose={() => setShowReportModal(false)}
        />
      </DismissibleSheet>

      {/* ── Fullscreen Image Viewer ── */}
      {fsVisible && (
        <FullscreenImageViewer
          images={listing.images}
          startIndex={fsStartIdx}
          onClose={() => setFsVisible(false)}
        />
      )}
    </Modal>
  );
}
