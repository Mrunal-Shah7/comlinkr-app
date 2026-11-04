import { rs } from "../src/utils/responsive";
import { useCallback, useEffect, useState } from "react"; // SPRINT-42: focus refetch + listing update subscription.
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect, useFocusEffect } from "expo-router"; // SPRINT-42: refetch My Listings on focus after edits.
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../src/store/auth.store";
import { usePermissions } from "../src/shared/hooks/usePermissions";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { formatPrice } from "../src/utils/currency";
import { getMyListings, deleteListing, updateListing, listingImageUrlList, subscribeToListingUpdates, type HousingListing, type HousingListingImageRef } from "../src/api/housing.api"; // SPRINT-42: consume ordered images and in-memory listing updates.
import { FadeImage } from "../components/FadeImage"; // SPRINT-42: render listing media through the shared image component.
import { getSharedSpaces, deleteSharedSpace, getSpaceApplications, decideSpaceApplication, type SharedSpaceListing, type SpaceApplicant } from "../src/api/roommates.api";
import { showToast } from "../src/shared/ui/Toast";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';

type VerificationLevel = "basic" | "verified" | "fully_verified";

const VERIFICATION_PILL: Record<VerificationLevel, { label: string; color: string; bg: string }> = {
  basic:          { label: "Basic Verified",  color: "#3B82F6", bg: "#EFF6FF" },
  verified:       { label: "Verified",         color: "#26B324", bg: "#EAFBE9" },
  fully_verified: { label: "Fully Verified",   color: "#D97706", bg: "#FFFBEB" },
};

const LISTING_STATUS_PILL: Record<"AVAILABLE" | "RENTED" | "UNLISTED", { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: "Active",   color: "#26B324", bg: "#EAFBE9" },
  RENTED:    { label: "Rented",   color: "#DC2626", bg: "#FEE2E2" },
  UNLISTED:  { label: "Unlisted", color: "#6B7280", bg: "#F3F4F6" },
};

function StatChip({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  const { tc } = useTheme();
  return (
    <View style={[styles.statChip, { backgroundColor: tc.sectionBg }]}>
      <Ionicons name={icon as any} size={11} color="#6B7280" />
      <Text style={[styles.statValue, { color: tc.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: tc.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function MyListingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { isVerifiedLandlord, isVerifiedAgency } = usePermissions();
  const { isDark, tc } = useTheme();
  const [listings, setListings] = useState<HousingListing[]>([]);
  const [sharedSpaces, setSharedSpaces] = useState<SharedSpaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applicantsMap, setApplicantsMap] = useState<Record<string, SpaceApplicant[]>>({});
  const [applicantsLoading, setApplicantsLoading] = useState<Record<string, boolean>>({});
  const [expandedApplicants, setExpandedApplicants] = useState<Record<string, boolean>>({});
  const [expandedApplicant, setExpandedApplicant] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});

  const handleToggleListingStatus = async (listing: HousingListing) => {
    const nextStatus = listing.status === "RENTED" ? "AVAILABLE" : "RENTED";
    setStatusUpdating((p) => ({ ...p, [listing.id]: true }));
    try {
      const updated = await updateListing(listing.id, { status: nextStatus });
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, status: updated.status ?? nextStatus } : l)));
      showToast(nextStatus === "RENTED" ? "Marked as rented." : "Marked as available.", "success");
    } catch {
      showToast("Could not update listing status. Try again.", "error");
    } finally {
      setStatusUpdating((p) => ({ ...p, [listing.id]: false }));
    }
  };

  const loadApplicants = async (spaceId: string) => {
    setApplicantsLoading((p) => ({ ...p, [spaceId]: true }));
    try {
      const apps = await getSpaceApplications(spaceId);
      setApplicantsMap((p) => ({ ...p, [spaceId]: Array.isArray(apps) ? apps : [] }));
    } catch {
      setApplicantsMap((p) => ({ ...p, [spaceId]: [] }));
    } finally {
      setApplicantsLoading((p) => ({ ...p, [spaceId]: false }));
    }
  };

  const toggleApplicants = (spaceId: string) => {
    const nowOpen = !expandedApplicants[spaceId];
    setExpandedApplicants((p) => ({ ...p, [spaceId]: nowOpen }));
    if (nowOpen && !applicantsMap[spaceId]) void loadApplicants(spaceId);
  };

  const handleDecide = async (spaceId: string, appId: string, decision: "approved" | "rejected") => {
    appAlert(
      decision === "approved" ? "Approve Applicant?" : "Reject Applicant?",
      decision === "approved"
        ? "This will mark the application as approved. The applicant will be notified."
        : "This will reject the application. The applicant will be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: decision === "approved" ? "Approve" : "Reject",
          style: decision === "approved" ? "default" : "destructive",
          onPress: async () => {
            try {
              const updated = await decideSpaceApplication(spaceId, appId, decision);
              setApplicantsMap((p) => ({
                ...p,
                [spaceId]: (p[spaceId] ?? []).map((a) => a.id === appId ? { ...a, status: updated.status } : a),
              }));
            } catch {
              showToast("Could not update application. Try again.", "error");
            }
          },
        },
      ],
    );
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [listRes, spaceRes] = await Promise.allSettled([
        getMyListings({ pageSize: 50 }),
        getSharedSpaces({ pageSize: 50 }),
      ]);
      if (listRes.status === "fulfilled") {
        setListings(Array.isArray(listRes.value.data) ? listRes.value.data : []);
      }
      if (spaceRes.status === "fulfilled") {
        const all = Array.isArray(spaceRes.value.data) ? spaceRes.value.data : [];
        setSharedSpaces(all.filter((s) => s.isOwner === true));
      }
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => subscribeToListingUpdates((update) => { // SPRINT-42: patch My Listings immediately after field/image edits.
    setListings((prev) => prev.map((row) => { // SPRINT-42: update matching owner rows.
      if (row.id !== update.id) return row; // SPRINT-42: leave other listings alone.
      if (update.listing) return update.listing; // SPRINT-42: replace with the full PATCH response.
      if (update.images) return { ...row, images: update.images as HousingListingImageRef[] }; // SPRINT-42: replace ordered images from image ops.
      return row; // SPRINT-42: ignore empty events.
    })); // SPRINT-42: finish owner-list patch.
  }), []); // SPRINT-42: subscribe for this screen lifetime.

  useFocusEffect( // SPRINT-42: refetch owner listings on focus without a 10-minute gate.
    useCallback(() => { // SPRINT-42: silent refresh when returning from the editor.
      void load(true); // SPRINT-42: pull authoritative my-listings after edits.
    }, []), // SPRINT-42: stable focus callback.
  ); // SPRINT-42: end my-listings focus refresh.

  const isTrustedHost = isVerifiedLandlord || isVerifiedAgency;

  if (!user?.id) {
    return <Redirect href="/(auth)/login" />;
  }

  const badgeGradient: [string, string] = isVerifiedAgency ? ["#FF7B00", "#E56800"] : ["#0076EB", "#0054CC"];
  const badgeLabel = isVerifiedAgency ? "Verified Agency" : "Verified Landlord";
  const maxListings = isVerifiedAgency ? "Unlimited" : "5";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} style={[styles.backBtn, { backgroundColor: tc.sectionBg }]} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>My Listings</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/create-post" as any, params: { type: "listing" } })}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.brand.blue} />
        </View>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={Colors.brand.blue} />}
      >
        {/* Trusted host banner or optional verification CTA */}
        {isTrustedHost ? (
          <LinearGradient colors={badgeGradient} style={styles.badgeBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={styles.badgeBannerIcon}>
              <Ionicons name={isVerifiedAgency ? "business" : "home"} size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeBannerTitle}>{badgeLabel}</Text>
              <Text style={styles.badgeBannerDesc}>Max {maxListings} active listings • Trusted host badge on your listings</Text>
            </View>
            <View style={styles.badgeBannerCheck}>
              <Ionicons name="checkmark-circle" size={22} color="rgba(255,255,255,0.9)" />
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.badgeBanner, { backgroundColor: tc.sectionBg, borderWidth: 1, borderColor: tc.borderLight }]}>
            <View style={[styles.badgeBannerIcon, { backgroundColor: isDark ? tc.inputBg : "#E5E7EB" }]}>
              <Ionicons name="home-outline" size={20} color={tc.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.badgeBannerTitle, { color: tc.textPrimary }]}>Your listings</Text>
              <Text style={[styles.badgeBannerDesc, { color: tc.textSecondary }]}>
                Apply for a Verified Landlord or Agency badge to show a trust indicator on your listings.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/apply-badge" as any)}
              style={{ paddingVertical: rs(8), paddingHorizontal: rs(12) }}
            >
              <Text style={{ fontWeight: "700", color: Colors.brand.blue, fontSize: rs(13) }}>Apply</Text>
            </Pressable>
          </View>
        )}

        {/* Anti-fraud reminder */}
        <View style={styles.fraudReminder}>
          <Ionicons name="shield-checkmark" size={14} color="#DC2626" />
          <Text style={styles.fraudReminderText}>
            <Text style={{ fontWeight: "700" }}>Reminder: </Text>
            Never request payment from tenants before a verified viewing. All deposits must be handled through official channels.
          </Text>
        </View>

        {/* Stats overview */}
        <View style={styles.overviewRow}>
          {[
            { icon: "home-outline", value: listings.length, label: "Listings" },
            { icon: "key-outline", value: sharedSpaces.length, label: "Spaces" },
            { icon: "checkmark-circle-outline", value: listings.filter((l) => l.isVerified ?? l.verified).length, label: "Verified" }, // SPRINT-42: use canonical verification alias.
            { icon: "star-outline", value: listings.filter((l) => l.isFeatured ?? l.featured).length, label: "Featured" }, // SPRINT-42: use canonical featured alias.
          ].map((s, i) => (
            <View key={i} style={[styles.overviewCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <LinearGradient colors={["#0076EB", "#26B324"]} style={styles.overviewIcon}>
                <Ionicons name={s.icon as any} size={14} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.overviewValue, { color: tc.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.overviewLabel, { color: tc.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Listing cards */}
        <Text style={[styles.sectionLabel, { color: tc.textTertiary }]}>YOUR LISTINGS</Text>

        {!loading && listings.length === 0 ? (
          <View style={styles.emptyListings}>
            <Ionicons name="home-outline" size={36} color={tc.borderMedium} />
            <Text style={[styles.emptyTitle, { color: tc.textPrimary }]}>No listings yet</Text>
            <Text style={[styles.emptyDesc, { color: tc.textSecondary }]}>Tap the + button to create your first listing.</Text>
          </View>
        ) : (
          listings.map((listing) => {
            const beds = listing.beds ?? listing.bedrooms ?? 0;
            const baths = listing.baths ?? listing.bathrooms ?? 0;
            const addr = listing.address || listing.location || "";
            const isVerified = listing.isVerified ?? listing.verified ?? false; // SPRINT-42: use the canonical backend verification field.
            const isFeatured = listing.isFeatured ?? listing.featured ?? false; // SPRINT-42: use the canonical backend featured field.
            const images = listingImageUrlList(listing.images); // SPRINT-42: retain backend image.order with a valid empty array.
            const verif = isVerified // SPRINT-42: drive verification presentation from canonical state.
              ? VERIFICATION_PILL.verified
              : VERIFICATION_PILL.basic;
            const postedDate = listing.availableDate ?? listing.available ? new Date(String(listing.availableDate ?? listing.available)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""; // SPRINT-42: prefer canonical availableDate.
            return (
              <View key={listing.id} style={[styles.listingCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
                {images[0] ? <FadeImage uri={images[0]} style={{ width: "100%", height: rs(150), borderRadius: rs(12), marginBottom: rs(12) }} /> : <View style={{ width: "100%", height: rs(90), borderRadius: rs(12), marginBottom: rs(12), backgroundColor: tc.inputBg, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={24} color={tc.textTertiary} /><Text style={{ color: tc.textTertiary, fontSize: rs(11), marginTop: rs(4) }}>No images</Text></View>}
                {/* SPRINT-42: render the ordered primary image or a zero-image empty state. */}
                <View style={styles.listingCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listingTitle, { color: tc.textPrimary }]} numberOfLines={1}>{listing.title}</Text>
                    <View style={styles.listingAddressRow}>
                      <Ionicons name="location-outline" size={11} color={tc.textTertiary} />
                      <Text style={[styles.listingAddress, { color: tc.textTertiary }]} numberOfLines={1}>{addr}</Text>
                    </View>
                  </View>
                  {(() => {
                    const statusKey = (listing.status as "AVAILABLE" | "RENTED" | "UNLISTED" | undefined) ?? "AVAILABLE";
                    const pill = isFeatured
                      ? { label: "Featured", color: "#D97706", bg: "#FFFBEB" }
                      : LISTING_STATUS_PILL[statusKey] ?? LISTING_STATUS_PILL.AVAILABLE;
                    return (
                      <View style={[styles.statusBadge, { backgroundColor: pill.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: pill.color }]}>{pill.label}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Price & specs */}
                <View style={styles.listingMeta}>
                  <Text style={styles.listingPrice}>{formatPrice(listing.price, listing.currency ?? "USD")}/mo</Text>
                  <View style={styles.listingSpecs}>
                    {beds > 0 ? (
                      <>
                        <Text style={[styles.listingSpec, { color: tc.textSecondary }]}>{beds} {beds === 1 ? "bed" : "beds"}</Text>
                        <View style={[styles.specDot, { backgroundColor: tc.borderLight }]} />
                      </>
                    ) : <Text style={[styles.listingSpec, { color: tc.textSecondary }]}>Studio</Text>}
                    {baths > 0 && <Text style={[styles.listingSpec, { color: tc.textSecondary }]}>{baths} bath</Text>}
                    {listing.sqft ? (
                      <>
                        <View style={[styles.specDot, { backgroundColor: tc.borderLight }]} />
                        <Text style={[styles.listingSpec, { color: tc.textSecondary }]}>{listing.sqft} sqft</Text>
                      </>
                    ) : null}
                  </View>
                </View>

                {/* Verification pill */}
                <View style={[styles.verifPill, { backgroundColor: verif.bg }]}>
                  <Ionicons name="checkmark-circle" size={11} color={verif.color} />
                  <Text style={[styles.verifPillText, { color: verif.color }]}>{verif.label}</Text>
                </View>

                {/* Tags */}
                {listing.tags && listing.tags.length > 0 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(6), marginTop: rs(8) }}>
                    {listing.tags.slice(0, 4).map((tag) => (
                      <View key={tag} style={{ backgroundColor: "#EEF5FF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                        <Text style={{ fontSize: rs(10), fontWeight: "600", color: Colors.brand.blue }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Actions */}
                <View style={styles.cardActions}>
                  <Pressable onPress={() => router.push({ pathname: "/create-post", params: { type: "listing", mode: "edit", id: listing.id } } as any)} style={[styles.deactivateBtn, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                  {/* SPRINT-42: my-listings endpoint is owner-only, so every listing can open Edit. */}
                    <Ionicons name="pencil-outline" size={14} color={Colors.brand.blue} />
                    {/* SPRINT-42: identify listing edit. */}
                    <Text style={[styles.deactivateBtnText, { color: Colors.brand.blue }]}>Edit</Text>
                    {/* SPRINT-42: label owner edit action. */}
                  </Pressable>
                  {/* SPRINT-42: close listing edit action. */}
                  <Pressable
                    onPress={() => void handleToggleListingStatus(listing)}
                    disabled={!!statusUpdating[listing.id]}
                    style={[styles.deactivateBtn, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, statusUpdating[listing.id] && { opacity: 0.5 }]}
                  >
                    {statusUpdating[listing.id] ? (
                      <ActivityIndicator size="small" color={tc.textSecondary} />
                    ) : (
                      <Ionicons name={listing.status === "RENTED" ? "checkmark-circle-outline" : "home-outline"} size={14} color={tc.textSecondary} />
                    )}
                    <Text style={[styles.deactivateBtnText, isDark && { color: tc.textSecondary }]}>{listing.status === "RENTED" ? "Mark Available" : "Mark Rented"}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => appAlert("Delete Listing", "Are you sure you want to delete this listing?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: async () => {
                        try { await deleteListing(listing.id); setListings((p) => p.filter((l) => l.id !== listing.id)); }
                        catch { showToast("Could not delete listing.", "error"); }
                      }},
                    ])}
                    style={[styles.deactivateBtn, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}
                  >
                    <Ionicons name="trash-outline" size={14} color={tc.textSecondary} />
                    <Text style={[styles.deactivateBtnText, isDark && { color: tc.textSecondary }]}>Delete</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push("/landlord-dashboard" as any)}
                    style={styles.chatBtn}
                  >
                    <LinearGradient colors={["#0076EB", "#26B324"]} style={styles.chatBtnGrad}>
                      <Ionicons name="chatbubble-outline" size={14} color="#FFF" />
                      <Text style={styles.chatBtnText}>Inquiries</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {/* ── Shared Spaces (My Space listings) ── */}
        <Text style={[styles.sectionLabel, { color: tc.textTertiary, marginTop: rs(20) }]}>MY SHARED SPACES</Text>

        {!loading && sharedSpaces.length === 0 ? (
          <View style={styles.emptyListings}>
            <Ionicons name="key-outline" size={36} color={tc.borderMedium} />
            <Text style={[styles.emptyTitle, { color: tc.textPrimary }]}>No shared spaces yet</Text>
            <Text style={[styles.emptyDesc, { color: tc.textSecondary }]}>List a spare room or shared space to find a compatible housemate.</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/create-post" as any, params: { type: "shared_space" } })}
              style={{ borderRadius: rs(10), overflow: "hidden", marginTop: rs(12), alignSelf: "center", minWidth: rs(140) }}
            >
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} style={[styles.chatBtnGrad, { paddingHorizontal: rs(20) }]}>
                <Ionicons name="add" size={14} color="#FFF" />
                <Text style={styles.chatBtnText}>List a Space</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          sharedSpaces.map((space) => (
            <View key={space.id} style={[styles.listingCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <View style={styles.listingCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listingTitle, { color: tc.textPrimary }]} numberOfLines={1}>{space.title}</Text>
                  <View style={styles.listingAddressRow}>
                    <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                    <Text style={[styles.listingAddress, { color: tc.textTertiary }]} numberOfLines={1}>
                      {space.address || space.city}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "#EAFBE9" }]}>
                  <Text style={[styles.statusBadgeText, { color: "#26B324" }]}>
                    {space.availableSpots > 0 ? `${space.availableSpots} spot${space.availableSpots > 1 ? "s" : ""} open` : "Full"}
                  </Text>
                </View>
              </View>

              <View style={styles.listingMeta}>
                <Text style={styles.listingPrice}>{formatPrice(space.price, "USD")}/mo</Text>
                <View style={styles.listingSpecs}>
                  <Text style={[styles.listingSpec, { color: tc.textSecondary }]}>{space.rooms} room{space.rooms !== 1 ? "s" : ""}</Text>
                  <View style={[styles.specDot, { backgroundColor: tc.borderLight }]} />
                  <Text style={[styles.listingSpec, { color: tc.textSecondary }]}>{space.bathrooms} bath</Text>
                  {space.applicationCount != null && space.applicationCount > 0 ? (
                    <>
                      <View style={[styles.specDot, { backgroundColor: tc.borderLight }]} />
                      <Text style={[styles.listingSpec, { color: Colors.brand.blue }]}>{space.applicationCount} applicant{space.applicationCount !== 1 ? "s" : ""}</Text>
                    </>
                  ) : null}
                </View>
              </View>

              {space.amenities && space.amenities.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(6), marginTop: rs(8) }}>
                  {space.amenities.slice(0, 4).map((a) => (
                    <View key={a} style={{ backgroundColor: "#EEF5FF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                      <Text style={{ fontSize: rs(10), fontWeight: "600", color: Colors.brand.blue }}>{a}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Applicants toggle button */}
              <Pressable
                onPress={() => toggleApplicants(space.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: rs(6), marginTop: rs(10), paddingVertical: rs(8), paddingHorizontal: rs(10), borderRadius: rs(10), backgroundColor: expandedApplicants[space.id] ? "#EEF5FF" : tc.sectionBg, borderWidth: 1, borderColor: expandedApplicants[space.id] ? Colors.brand.blue + "33" : tc.borderLight }}
              >
                <Ionicons name="people-outline" size={15} color={Colors.brand.blue} />
                <Text style={{ flex: 1, fontSize: rs(13), fontWeight: "700", color: Colors.brand.blue }}>
                  {space.applicationCount != null && space.applicationCount > 0
                    ? `${space.applicationCount} Applicant${space.applicationCount !== 1 ? "s" : ""}`
                    : "Applicants"}
                </Text>
                {applicantsLoading[space.id]
                  ? <ActivityIndicator size="small" color={Colors.brand.blue} />
                  : <Ionicons name={expandedApplicants[space.id] ? "chevron-up" : "chevron-down"} size={15} color={Colors.brand.blue} />}
              </Pressable>

              {/* Applicants panel */}
              {expandedApplicants[space.id] && (
                <View style={{ marginTop: rs(6) }}>
                  {(applicantsMap[space.id] ?? []).length === 0 && !applicantsLoading[space.id] ? (
                    <View style={{ padding: rs(14), alignItems: "center", gap: rs(6) }}>
                      <Ionicons name="person-outline" size={28} color={tc.borderMedium} />
                      <Text style={{ fontSize: rs(13), color: tc.textTertiary, textAlign: "center" }}>No applications yet</Text>
                    </View>
                  ) : (
                    (applicantsMap[space.id] ?? []).map((app) => {
                      const isOpen = expandedApplicant === app.id;
                      const statusColor = app.status === "approved" ? "#26B324" : app.status === "rejected" ? "#EF4444" : "#D97706";
                      const statusBg = app.status === "approved" ? "#EAFBE9" : app.status === "rejected" ? "#FEF2F2" : "#FFFBEB";
                      return (
                        <View key={app.id} style={{ marginBottom: rs(8), borderRadius: rs(12), borderWidth: 1, borderColor: tc.borderLight, backgroundColor: tc.cardBg, overflow: "hidden" }}>
                          {/* Applicant row */}
                          <Pressable
                            onPress={() => setExpandedApplicant(isOpen ? null : app.id)}
                            style={{ flexDirection: "row", alignItems: "center", padding: rs(12), gap: rs(10) }}
                          >
                            <View style={{ width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: Colors.brand.blue + "22", alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: rs(15), fontWeight: "800", color: Colors.brand.blue }}>
                                {app.applicant.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: rs(14), fontWeight: "700", color: tc.textPrimary }}>{app.applicant.name}</Text>
                              <Text style={{ fontSize: rs(12), color: tc.textTertiary }}>@{app.applicant.username}{app.applicant.city ? ` · ${app.applicant.city}` : ""}</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6) }}>
                              <View style={{ paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(6), backgroundColor: statusBg }}>
                                <Text style={{ fontSize: rs(10), fontWeight: "700", color: statusColor, textTransform: "capitalize" }}>{app.status}</Text>
                              </View>
                              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={14} color={tc.textTertiary} />
                            </View>
                          </Pressable>

                          {/* Expanded detail */}
                          {isOpen && (
                            <View style={{ paddingHorizontal: rs(12), paddingBottom: rs(12), gap: rs(8) }}>
                              {/* Applied date */}
                              <Text style={{ fontSize: rs(11), color: tc.textTertiary }}>
                                Applied {new Date(app.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                              </Text>

                              {/* Message */}
                              {app.message ? (
                                <View style={{ backgroundColor: tc.sectionBg, borderRadius: rs(10), padding: rs(10) }}>
                                  <Text style={{ fontSize: rs(11), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(3) }}>MESSAGE</Text>
                                  <Text style={{ fontSize: rs(13), color: tc.textPrimary, lineHeight: rs(18) }}>{app.message}</Text>
                                </View>
                              ) : null}

                              {/* Roommate prefs if available */}
                              {app.applicant.roommatePrefs ? (
                                <View style={{ backgroundColor: "#EEF5FF", borderRadius: rs(10), padding: rs(10), gap: rs(4) }}>
                                  <Text style={{ fontSize: rs(11), fontWeight: "700", color: Colors.brand.blue, marginBottom: rs(2) }}>PREFERENCES</Text>
                                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(6) }}>
                                    {app.applicant.roommatePrefs.budgetMin != null && app.applicant.roommatePrefs.budgetMax != null && (
                                      <View style={{ backgroundColor: isDark ? tc.cardBg : "#FFF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                                        <Text style={{ fontSize: rs(11), color: Colors.brand.blue, fontWeight: "600" }}>${app.applicant.roommatePrefs.budgetMin}–${app.applicant.roommatePrefs.budgetMax}/mo</Text>
                                      </View>
                                    )}
                                    {app.applicant.roommatePrefs.moveInDate ? (
                                      <View style={{ backgroundColor: isDark ? tc.cardBg : "#FFF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                                        <Text style={{ fontSize: rs(11), color: tc.textSecondary, fontWeight: "600" }}>Move-in: {app.applicant.roommatePrefs.moveInDate}</Text>
                                      </View>
                                    ) : null}
                                    {app.applicant.roommatePrefs.sleepSchedule ? (
                                      <View style={{ backgroundColor: isDark ? tc.cardBg : "#FFF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                                        <Text style={{ fontSize: rs(11), color: tc.textSecondary, fontWeight: "600" }}>{app.applicant.roommatePrefs.sleepSchedule}</Text>
                                      </View>
                                    ) : null}
                                    {app.applicant.roommatePrefs.cleanliness ? (
                                      <View style={{ backgroundColor: isDark ? tc.cardBg : "#FFF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                                        <Text style={{ fontSize: rs(11), color: tc.textSecondary, fontWeight: "600" }}>{app.applicant.roommatePrefs.cleanliness}</Text>
                                      </View>
                                    ) : null}
                                    {app.applicant.roommatePrefs.petFriendly != null && (
                                      <View style={{ backgroundColor: isDark ? tc.cardBg : "#FFF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                                        <Text style={{ fontSize: rs(11), color: tc.textSecondary, fontWeight: "600" }}>{app.applicant.roommatePrefs.petFriendly ? "Pets OK" : "No pets"}</Text>
                                      </View>
                                    )}
                                    {app.applicant.roommatePrefs.smoking != null && (
                                      <View style={{ backgroundColor: isDark ? tc.cardBg : "#FFF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                                        <Text style={{ fontSize: rs(11), color: tc.textSecondary, fontWeight: "600" }}>{app.applicant.roommatePrefs.smoking ? "Smoker" : "Non-smoker"}</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              ) : null}

                              {/* Bio */}
                              {app.applicant.bio ? (
                                <View style={{ backgroundColor: tc.sectionBg, borderRadius: rs(10), padding: rs(10) }}>
                                  <Text style={{ fontSize: rs(11), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(3) }}>ABOUT</Text>
                                  <Text style={{ fontSize: rs(13), color: tc.textPrimary, lineHeight: rs(18) }} numberOfLines={3}>{app.applicant.bio}</Text>
                                </View>
                              ) : null}

                              {/* Actions */}
                              {app.status === "pending" && (
                                <View style={{ flexDirection: "row", gap: rs(8), marginTop: rs(4) }}>
                                  <Pressable
                                    onPress={() => void handleDecide(space.id, app.id, "rejected")}
                                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(4), paddingVertical: rs(9), borderRadius: rs(10), backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5" }}
                                  >
                                    <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                                    <Text style={{ fontSize: rs(13), fontWeight: "700", color: "#EF4444" }}>Decline</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => void handleDecide(space.id, app.id, "approved")}
                                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(4), paddingVertical: rs(9), borderRadius: rs(10), backgroundColor: "#EAFBE9", borderWidth: 1, borderColor: "#86EFAC" }}
                                  >
                                    <Ionicons name="checkmark-circle-outline" size={15} color="#26B324" />
                                    <Text style={{ fontSize: rs(13), fontWeight: "700", color: "#26B324" }}>Approve</Text>
                                  </Pressable>
                                </View>
                              )}
                              {app.status !== "pending" && (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6), paddingVertical: rs(6) }}>
                                  <Ionicons name={app.status === "approved" ? "checkmark-circle" : "close-circle"} size={15} color={statusColor} />
                                  <Text style={{ fontSize: rs(12), color: statusColor, fontWeight: "600", textTransform: "capitalize" }}>Application {app.status}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => appAlert("Delete Space", "Are you sure?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: async () => {
                      try {
                        await deleteSharedSpace(space.id);
                        setSharedSpaces((p) => p.filter((s) => s.id !== space.id));
                      } catch { showToast("Could not delete space.", "error"); }
                    }},
                  ])}
                  style={[styles.deactivateBtn, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}
                >
                  <Ionicons name="trash-outline" size={14} color={tc.textSecondary} />
                  <Text style={[styles.deactivateBtnText, isDark && { color: tc.textSecondary }]}>Delete</Text>
                </Pressable>
                <Pressable onPress={() => router.push("/chat" as any)} style={styles.chatBtn}>
                  <LinearGradient colors={["#0076EB", "#26B324"]} style={styles.chatBtnGrad}>
                    <Ionicons name="chatbubble-outline" size={14} color="#FFF" />
                    <Text style={styles.chatBtnText}>Inquiries</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* UK-specific compliance note */}
        <View style={[styles.complianceCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <LinearGradient colors={["#1E3A8A", "#1E40AF"]} style={styles.complianceIcon}>
            <Text style={{ fontSize: rs(12) }}>🇬🇧</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.complianceTitle, isDark && { color: tc.textPrimary }]}>UK Landlord Requirements</Text>
            <Text style={[styles.complianceText, isDark && { color: tc.textSecondary }]}>
              All UK rental listings must include a valid EPC certificate (min. E rating), gas safety certificate, and deposit protection scheme information. Failure to comply can result in badge revocation.
            </Text>
          </View>
        </View>

        {/* US compliance note */}
        <View style={[styles.complianceCard, { marginTop: rs(8) }, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <View style={[styles.complianceIcon, { backgroundColor: "#1E3A5F", alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: rs(12) }}>🇺🇸</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.complianceTitle, isDark && { color: tc.textPrimary }]}>US Fair Housing Act</Text>
            <Text style={[styles.complianceText, isDark && { color: tc.textSecondary }]}>
              All listings must comply with the Fair Housing Act. Discriminatory language or criteria based on race, color, religion, sex, national origin, disability, or familial status is strictly prohibited.
            </Text>
          </View>
        </View>

        {/* Remote Tenant Safety — landlord guide */}
        <View style={[styles.remoteSafetyCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <View style={styles.remoteSafetyHeader}>
            <LinearGradient colors={["#7C3AED", "#6D28D9"]} style={styles.remoteSafetyIcon}>
              <Ionicons name="videocam-outline" size={16} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.remoteSafetyTitle, { color: tc.textPrimary }]}>Remote Tenant Safety</Text>
              <Text style={styles.remoteSafetySub}>
                Protecting both parties when tenants can't visit in person
              </Text>
            </View>
          </View>

          {/* Landlord tips */}
          {[
            {
              icon: "person-circle-outline" as const,
              color: "#0076EB",
              bg: "#EEF5FF",
              title: "Verify the tenant's identity first",
              desc: "Before conducting a video tour, ask the prospective tenant to confirm their ComLinkr verified profile. Only show the property to users with a verified government ID on file.",
            },
            {
              icon: "videocam-outline" as const,
              color: "#0076EB",
              bg: "#EEF5FF",
              title: "Conduct tours via ComLinkr chat only",
              desc: "Always schedule and confirm video tours through in-app messages — never via WhatsApp, email, or phone call. This creates a timestamped record protecting you against false claims.",
            },
            {
              icon: "lock-closed-outline" as const,
              color: "#059669",
              bg: "#DCFCE7",
              title: "Deposits go through escrow — always",
              desc: "Never ask tenants to pay a deposit directly to you before move-in is confirmed. ComLinkr's escrow system protects both parties. Bypassing it violates our terms and risks badge revocation.",
            },
            {
              icon: "document-text-outline" as const,
              color: "#D97706",
              bg: "#FFFBEB",
              title: "Use the in-app agreement before move-in",
              desc: "Ensure both parties have signed the ComLinkr digital tenancy agreement before handing over keys. This is your legal protection if a dispute arises.",
            },
          ].map((tip, i) => (
            <View key={i} style={[styles.remoteTip, isDark && { borderTopColor: tc.borderLight }]}>
              <View style={[styles.remoteTipIcon, { backgroundColor: tip.bg }]}>
                <Ionicons name={tip.icon} size={14} color={tip.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.remoteTipTitle, { color: tc.textPrimary }]}>{tip.title}</Text>
                <Text style={[styles.remoteTipDesc, { color: tc.textSecondary }]}>{tip.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: rs(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#F5F6FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(14),
    paddingTop: rs(12),
    paddingBottom: rs(14),
    backgroundColor: "#FFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E6EA",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: rs(4),
    elevation: 2,
  },
  backBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: rs(17), fontWeight: "800", color: "#0A2540" },
  addBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: Colors.brand.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: rs(16), paddingTop: rs(16) },

  badgeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    padding: rs(14),
    borderRadius: rs(16),
    marginBottom: rs(12),
  },
  badgeBannerIcon: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(12),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeBannerTitle: { fontSize: rs(14), fontWeight: "800", color: "#FFF", marginBottom: rs(2) },
  badgeBannerDesc: { fontSize: rs(11), color: "rgba(255,255,255,0.85)" },
  badgeBannerCheck: { marginLeft: rs(4) },

  fraudReminder: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(8),
    backgroundColor: "#FEF2F2",
    padding: rs(12),
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: rs(16),
  },
  fraudReminderText: { flex: 1, fontSize: rs(12), color: "#991B1B", lineHeight: rs(17) },

  overviewRow: { flexDirection: "row", gap: rs(10), marginBottom: rs(20) },
  overviewCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: rs(14),
    padding: rs(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  overviewIcon: { width: rs(28), height: rs(28), borderRadius: rs(9), alignItems: "center", justifyContent: "center", marginBottom: rs(6) },
  overviewValue: { fontSize: rs(18), fontWeight: "900", color: "#0A2540", marginBottom: rs(2) },
  overviewLabel: { fontSize: rs(10), color: "#6B7280", fontWeight: "600" },

  sectionLabel: {
    fontSize: rs(11),
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: rs(10),
  },

  listingCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: rs(14),
    marginBottom: rs(12),
  },
  listingCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: rs(10), marginBottom: rs(8) },
  listingTitle: { fontSize: rs(14), fontWeight: "800", color: "#0A2540", marginBottom: rs(3) },
  listingAddressRow: { flexDirection: "row", alignItems: "center", gap: rs(4) },
  listingAddress: { fontSize: rs(11), color: "#9CA3AF", flex: 1 },
  statusBadge: { paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(8) },
  statusBadgeText: { fontSize: rs(10), fontWeight: "800" },
  listingMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: rs(8) },
  listingPrice: { fontSize: rs(16), fontWeight: "900", color: Colors.brand.blue },
  listingSpecs: { flexDirection: "row", alignItems: "center", gap: rs(6) },
  listingSpec: { fontSize: rs(11), color: "#6B7280", fontWeight: "600" },
  specDot: { width: rs(3), height: rs(3), borderRadius: rs(2), backgroundColor: "#D1D5DB" },
  verifPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(8),
    alignSelf: "flex-start",
    marginBottom: rs(10),
  },
  verifPillText: { fontSize: rs(10), fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: rs(8), marginBottom: rs(12) },
  statChip: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: "#F9FAFB", paddingHorizontal: rs(8), paddingVertical: rs(5), borderRadius: rs(8) },
  statValue: { fontSize: rs(12), fontWeight: "800", color: "#0A2540" },
  statLabel: { fontSize: rs(11), color: "#6B7280" },
  cardActions: { flexDirection: "row", gap: rs(8), alignItems: "center" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderRadius: rs(10),
    borderWidth: 1.5,
    borderColor: Colors.brand.blue,
    backgroundColor: "#EEF5FF",
  },
  editBtnText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },
  deactivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderRadius: rs(10),
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  deactivateBtnText: { fontSize: rs(12), fontWeight: "700", color: "#6B7280" },
  chatBtn: { flex: 1, borderRadius: rs(10), overflow: "hidden" },
  chatBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(6),
    paddingVertical: rs(8),
  },
  chatBtnText: { fontSize: rs(12), fontWeight: "800", color: "#FFF" },

  complianceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(12),
    backgroundColor: "#EFF6FF",
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: rs(12),
  },
  complianceIcon: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    alignItems: "center",
    justifyContent: "center",
  },
  complianceTitle: { fontSize: rs(13), fontWeight: "800", color: "#1E3A8A", marginBottom: rs(4) },
  complianceText: { fontSize: rs(12), color: "#1E40AF", lineHeight: rs(17) },

  emptyAccess: { flex: 1, alignItems: "center", justifyContent: "center", padding: rs(32), gap: rs(12) },
  emptyListings: { alignItems: "center", padding: rs(32), gap: rs(8) },
  emptyTitle: { fontSize: rs(17), fontWeight: "800", color: "#374151" },
  emptyDesc: { fontSize: rs(13), color: "#6B7280", textAlign: "center", lineHeight: rs(18) },
  applyBtn: { borderRadius: rs(14), overflow: "hidden", marginTop: rs(8) },
  applyBtnGrad: { paddingHorizontal: rs(24), paddingVertical: rs(14) },
  applyBtnText: { fontSize: rs(14), fontWeight: "800", color: "#FFF" },

  // Remote Tenant Safety card
  remoteSafetyCard: {
    backgroundColor: "#FAF5FF",
    borderRadius: rs(16),
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: rs(14),
    marginTop: rs(16),
    gap: rs(12),
  },
  remoteSafetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
  },
  remoteSafetyIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(11),
    alignItems: "center",
    justifyContent: "center",
  },
  remoteSafetyTitle: {
    fontSize: rs(14),
    fontWeight: "800",
    color: "#4B5563",
    marginBottom: rs(2),
  },
  remoteSafetySub: {
    fontSize: rs(11),
    color: "#7C3AED",
    fontWeight: "600",
  },
  videoRequestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3E8FF",
    borderRadius: rs(10),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
  },
  videoRequestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
  },
  videoRequestCount: {
    fontSize: rs(12),
    fontWeight: "700",
    color: "#7C3AED",
  },
  videoRequestCta: {},
  videoRequestCtaText: {
    fontSize: rs(12),
    fontWeight: "700",
    color: "#0076EB",
  },
  remoteTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(10),
    paddingTop: rs(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E9D5FF",
  },
  remoteTipIcon: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(9),
    alignItems: "center",
    justifyContent: "center",
    marginTop: rs(1),
  },
  remoteTipTitle: {
    fontSize: rs(12),
    fontWeight: "800",
    color: "#374151",
    marginBottom: rs(3),
  },
  remoteTipDesc: {
    fontSize: rs(11),
    color: "#6B7280",
    lineHeight: rs(16),
  },
});
