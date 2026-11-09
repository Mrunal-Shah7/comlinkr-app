import { palette } from "../src/theme/palette";
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
import { router, Redirect } from "expo-router";
import { queryKeys } from "../src/services/cache/queryKeys";
import { useScreenQuery } from "../src/hooks/useScreenQuery";
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
import { TYPE } from '../src/theme/d';
import { EmptyState, GradientButton, GradientFill, PressableScale, Reveal, Segmented, SoftButton } from '../src/shared/d';
import { DPage, goBackOr } from '../src/shared/d/Page';

type VerificationLevel = "basic" | "verified" | "fully_verified";

const VERIFICATION_PILL: Record<VerificationLevel, { label: string; color: string; bg: string }> = {
  basic:          { label: "Basic Verified",  color: palette.blue500, bg: palette.blue50 },
  verified:       { label: "Verified",         color: palette.brandGreen, bg: palette.brandGreenLight },
  fully_verified: { label: "Fully Verified",   color: palette.amber600, bg: palette.amber50 },
};

const LISTING_STATUS_PILL: Record<"AVAILABLE" | "RENTED" | "UNLISTED", { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: "Active",   color: palette.brandGreen, bg: palette.brandGreenLight },
  RENTED:    { label: "Rented",   color: palette.red600, bg: palette.red100 },
  UNLISTED:  { label: "Unlisted", color: palette.gray500, bg: palette.gray100 },
};

function StatChip({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  const { tc } = useTheme();
  return (
    <View style={[styles.statChip, { backgroundColor: tc.sectionBg }]}>
      <Ionicons name={icon as any} size={11} color={palette.gray500} />
      <Text style={[styles.statValue, { color: tc.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: tc.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function MyListingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { isVerifiedLandlord, isVerifiedAgency } = usePermissions();
  const { isDark, tc } = useTheme();
  // Owner listings refetch on every focus (staleTime 0): the editor may have changed them.
  const mine = useScreenQuery({
    queryKey: queryKeys.myListings(),
    initial: { listings: [] as HousingListing[], sharedSpaces: [] as SharedSpaceListing[] },
    staleTime: 0,
    queryFn: async () => {
      const [listRes, spaceRes] = await Promise.allSettled([
        getMyListings({ pageSize: 50 }),
        getSharedSpaces({ pageSize: 50 }),
      ]);
      const listings = listRes.status === "fulfilled" && Array.isArray(listRes.value.data) ? listRes.value.data : [];
      const all = spaceRes.status === "fulfilled" && Array.isArray(spaceRes.value.data) ? spaceRes.value.data : [];
      return { listings, sharedSpaces: all.filter((s) => s.isOwner === true) };
    },
  });
  const { listings, sharedSpaces } = mine.data;
  const loading = mine.loading;
  const setMine = mine.setData;
  const setListings = (fn: (p: HousingListing[]) => HousingListing[]) => setMine((d) => ({ ...d, listings: fn(d.listings) }));
  const setSharedSpaces = (fn: (p: SharedSpaceListing[]) => SharedSpaceListing[]) => setMine((d) => ({ ...d, sharedSpaces: fn(d.sharedSpaces) }));
  const [applicantsMap, setApplicantsMap] = useState<Record<string, SpaceApplicant[]>>({});
  const [applicantsLoading, setApplicantsLoading] = useState<Record<string, boolean>>({});
  const [expandedApplicants, setExpandedApplicants] = useState<Record<string, boolean>>({});
  const [expandedApplicant, setExpandedApplicant] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});
  const [panel, setPanel] = useState<"homes" | "rooms">("homes");

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

  useEffect(() => subscribeToListingUpdates((update) => { // SPRINT-42: patch My Listings immediately after field/image edits.
    setMine((d) => ({ ...d, listings: d.listings.map((row) => { // SPRINT-42: update matching owner rows.
      if (row.id !== update.id) return row; // SPRINT-42: leave other listings alone.
      if (update.listing) return update.listing; // SPRINT-42: replace with the full PATCH response.
      if (update.images) return { ...row, images: update.images as HousingListingImageRef[] }; // SPRINT-42: replace ordered images from image ops.
      return row; // SPRINT-42: ignore empty events.
    }) })); // SPRINT-42: finish owner-list patch.
  }), [setMine]); // SPRINT-42: subscribe for this screen lifetime.

  const isTrustedHost = isVerifiedLandlord || isVerifiedAgency;

  if (!user?.id) {
    return <Redirect href="/(auth)/login" />;
  }

  const badgeGradient: [string, string] = isVerifiedAgency ? [palette.brandTeal, palette.orangeL45] : [palette.brandBlue, palette.blueL40_2];
  const badgeLabel = isVerifiedAgency ? "Verified Agency" : "Verified Landlord";
  const maxListings = isVerifiedAgency ? "Unlimited" : "5";

  const card = { borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg };
  const tag = (label: string, tone: "ok" | "warn" | "plain" | "accent") => {
    const bg = tone === "ok" ? tc.mintSoft : tone === "warn" ? tc.warningBg : tone === "accent" ? tc.accentSoft : tc.inputBg;
    const fg = tone === "ok" ? tc.successText : tone === "warn" ? tc.warningText : tone === "accent" ? tc.accentText : tc.textSecondary;
    return <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: bg }}><Text style={[TYPE.label, { color: fg, fontSize: 11 }]}>{label}</Text></View>;
  };
  const listingMenu = (listing: HousingListing) => appAlert(listing.title, undefined, [
    { text: "Edit", onPress: () => router.push({ pathname: "/create-post", params: { type: "listing", mode: "edit", id: listing.id } } as any) },
    { text: listing.status === "RENTED" ? "Mark available" : "Mark rented", onPress: () => void handleToggleListingStatus(listing) },
    { text: "Inquiries", onPress: () => router.push("/landlord-dashboard" as any) },
    { text: "Delete", style: "destructive", onPress: () => appAlert("Delete listing", "Delete this listing? People who saved it will no longer see it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteListing(listing.id); setListings((p) => p.filter((l) => l.id !== listing.id)); }
        catch { showToast("Could not delete listing.", "error"); }
      } },
    ]) },
    { text: "Cancel", style: "cancel" },
  ]);
  const TIPS: [keyof typeof Ionicons.glyphMap, string, string][] = [
    ["shield-checkmark-outline", "Never take money before a viewing", "Deposits go through official channels, after a verified viewing."],
    ["person-circle-outline", "Check who you are talking to", "Before a video tour, ask the tenant to confirm their verified Comlinkr profile."],
    ["videocam-outline", "Keep tours in Comlinkr chat", "Arrange and confirm tours in the app, so there is a record that protects you both."],
    ["document-text-outline", "Sign the agreement before keys", "Both sides sign the in-app tenancy agreement before move-in."],
    ["flag-outline", "UK: EPC, gas safety, deposit protection", "UK listings need a valid EPC (E or better), a gas safety certificate and a protected deposit."],
    ["scale-outline", "US: the Fair Housing Act applies", "No criteria based on race, colour, religion, sex, national origin, disability or family status."],
  ];

  return (
    <DPage
      title="My listings"
      sub={isTrustedHost ? `${badgeLabel} · up to ${maxListings.toLowerCase()} live listings` : undefined}
      onBack={() => goBackOr("/(tabs)/feed")}
      right={
        <Pressable onPress={() => router.push({ pathname: "/create-post" as any, params: { type: panel === "rooms" ? "shared_space" : "listing" } })} hitSlop={8} accessibilityRole="button" accessibilityLabel={panel === "rooms" ? "List a room" : "New listing"}
          style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: tc.inputBg }]}>
          <Ionicons name="add" size={26} color={tc.textPrimary} />
        </Pressable>
      }
      refreshControl={<RefreshControl refreshing={mine.refreshing} onRefresh={mine.onRefresh} tintColor={tc.accent} />}
    >
      <Segmented
        style={{ marginHorizontal: 16, marginBottom: 14 }}
        items={[{ key: "homes", label: listings.length ? `Homes · ${listings.length}` : "Homes" }, { key: "rooms", label: sharedSpaces.length ? `Rooms · ${sharedSpaces.length}` : "Rooms" }]}
        value={panel}
        onChange={(k) => setPanel(k as "homes" | "rooms")}
      />

      {loading ? <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 40 }} /> : null}

      {!loading && panel === "homes" ? (
        listings.length === 0 ? (
          <EmptyState icon="home-outline" title="No listings yet" sub="Put a whole place up for rent: the photos, the rent and the details renters ask about." actionLabel="List a place" onAction={() => router.push({ pathname: "/create-post" as any, params: { type: "listing" } })} />
        ) : (
          <>
            {listings.map((listing, i) => {
              const beds = listing.beds ?? listing.bedrooms ?? 0;
              const baths = listing.baths ?? listing.bathrooms ?? 0;
              const images = listingImageUrlList(listing.images);
              const isFeatured = listing.isFeatured ?? listing.featured ?? false;
              const status = (listing.status as "AVAILABLE" | "RENTED" | "UNLISTED" | undefined) ?? "AVAILABLE";
              const meta = [`${formatPrice(listing.price, listing.currency ?? "USD")} /mo`, beds > 0 ? `${beds} bed` : "Studio", baths > 0 ? `${baths} bath` : "", listing.address || listing.location || ""].filter(Boolean).join(" · ");
              return (
                <Reveal key={listing.id} i={i} style={{ marginHorizontal: 16, marginBottom: 10 }}>
                  <PressableScale onPress={() => listingMenu(listing)} accessibilityRole="button" accessibilityLabel={listing.title}
                    style={[card, { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, opacity: statusUpdating[listing.id] ? 0.5 : 1 }]}>
                    {images[0] ? <FadeImage uri={images[0]} style={{ width: 92, height: 80, borderRadius: 16 }} /> : (
                      <View style={{ width: 92, height: 80, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: tc.inputBg }}><Ionicons name="image-outline" size={22} color={tc.textTertiary} /></View>
                    )}
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {isFeatured ? tag("Featured", "accent") : status === "RENTED" ? tag("Rented", "plain") : status === "UNLISTED" ? tag("Unlisted", "plain") : tag("Live", "ok")}
                        {(listing.isVerified ?? listing.verified) ? tag("Verified", "ok") : null}
                      </View>
                      <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]} numberOfLines={1}>{listing.title}</Text>
                      <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>{meta}</Text>
                    </View>
                    {statusUpdating[listing.id] ? <ActivityIndicator size="small" color={tc.accent} /> : <Ionicons name="ellipsis-horizontal" size={20} color={tc.textSecondary} />}
                  </PressableScale>
                </Reveal>
              );
            })}
            <SoftButton block label="See inquiries" icon={<Ionicons name="people-outline" size={18} color={tc.accentText} />} onPress={() => router.push("/landlord-dashboard" as any)} style={{ marginHorizontal: 16, marginTop: 6 }} />
          </>
        )
      ) : null}

      {!loading && panel === "rooms" ? (
        sharedSpaces.length === 0 ? (
          <EmptyState icon="key-outline" title="No rooms listed" sub="Rent out a spare room and find a housemate who fits." actionLabel="Rent out a room" onAction={() => router.push({ pathname: "/create-post" as any, params: { type: "shared_space" } })} />
        ) : sharedSpaces.map((space, i) => (
          <Reveal key={space.id} i={i} style={[card, { marginHorizontal: 16, marginBottom: 12, padding: 14 }]}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                {space.availableSpots > 0 ? tag(`${space.availableSpots} spot${space.availableSpots > 1 ? "s" : ""} open`, "ok") : tag("Full", "plain")}
                <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]} numberOfLines={1}>{space.title}</Text>
                <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>{[`${formatPrice(space.price, "USD")} /mo`, `${space.rooms} room${space.rooms !== 1 ? "s" : ""}`, `${space.bathrooms} bath`, space.address || space.city].filter(Boolean).join(" · ")}</Text>
              </View>
              <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete room listing" onPress={() => appAlert("Delete room listing", "Delete this room listing?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: async () => {
                  try { await deleteSharedSpace(space.id); setSharedSpaces((p) => p.filter((s) => s.id !== space.id)); }
                  catch { showToast("Could not delete space.", "error"); }
                } },
              ])} style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={19} color={tc.textSecondary} />
              </Pressable>
            </View>

            <Pressable onPress={() => toggleApplicants(space.id)} accessibilityRole="button" accessibilityState={{ expanded: !!expandedApplicants[space.id] }}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: tc.accentSoft }}>
              <Ionicons name="people-outline" size={16} color={tc.accentText} />
              <Text style={[TYPE.bodyStrong, { flex: 1, color: tc.accentText }]}>
                {space.applicationCount ? `${space.applicationCount} application${space.applicationCount !== 1 ? "s" : ""}` : "Applications"}
              </Text>
              {applicantsLoading[space.id] ? <ActivityIndicator size="small" color={tc.accent} /> : <Ionicons name={expandedApplicants[space.id] ? "chevron-up" : "chevron-down"} size={16} color={tc.accentText} />}
            </Pressable>

            {expandedApplicants[space.id] ? (
              <View style={{ marginTop: 8, gap: 8 }}>
                {(applicantsMap[space.id] ?? []).length === 0 && !applicantsLoading[space.id] ? (
                  <Text style={[TYPE.small, { color: tc.textTertiary, textAlign: "center", paddingVertical: 10 }]}>No applications yet</Text>
                ) : (applicantsMap[space.id] ?? []).map((app) => {
                  const isOpen = expandedApplicant === app.id;
                  const p = app.applicant.roommatePrefs;
                  const prefs = p ? [
                    p.budgetMin != null && p.budgetMax != null ? `$${p.budgetMin}–$${p.budgetMax} /mo` : "",
                    p.moveInDate ? `Move-in ${p.moveInDate}` : "", p.sleepSchedule ?? "", p.cleanliness ?? "",
                    p.petFriendly != null ? (p.petFriendly ? "Pets OK" : "No pets") : "", p.smoking != null ? (p.smoking ? "Smoker" : "Non-smoker") : "",
                  ].filter(Boolean) : [];
                  return (
                    <View key={app.id} style={{ borderRadius: 16, backgroundColor: tc.surface3 ?? tc.inputBg, overflow: "hidden" }}>
                      <Pressable onPress={() => setExpandedApplicant(isOpen ? null : app.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                        <GradientFill style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
                          <Text style={[TYPE.label, { color: palette.white, fontSize: 14 }]}>{app.applicant.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</Text>
                        </GradientFill>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{app.applicant.name}</Text>
                          <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>@{app.applicant.username}{app.applicant.city ? ` · ${app.applicant.city}` : ""}</Text>
                        </View>
                        {tag(app.status.charAt(0).toUpperCase() + app.status.slice(1), app.status === "approved" ? "ok" : app.status === "rejected" ? "plain" : "warn")}
                      </Pressable>
                      {isOpen ? (
                        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
                          <Text style={[TYPE.small, { color: tc.textTertiary }]}>Applied {new Date(app.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</Text>
                          {app.message ? <Text style={[TYPE.body, { color: tc.textPrimary }]}>“{app.message}”</Text> : null}
                          {prefs.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{prefs.map((t) => <View key={t}>{tag(t, "accent")}</View>)}</View> : null}
                          {app.applicant.bio ? <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={3}>{app.applicant.bio}</Text> : null}
                          {app.status === "pending" ? (
                            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                              <SoftButton small ghost block label="Decline" outerStyle={{ flex: 1 }} onPress={() => void handleDecide(space.id, app.id, "rejected")} />
                              <GradientButton small block label="Approve" outerStyle={{ flex: 1 }} onPress={() => void handleDecide(space.id, app.id, "approved")} />
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Reveal>
        ))
      ) : null}

      {!loading && !isTrustedHost ? (
        <Reveal style={{ marginHorizontal: 16, marginTop: 18, padding: 16, borderRadius: 22, backgroundColor: tc.mintSoft, flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Ionicons name="shield-checkmark" size={22} color={tc.successText} />
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>Get the verified host badge</Text>
            <Text style={[TYPE.small, { color: tc.textSecondary }]}>A trust mark on every listing you post.</Text>
          </View>
          <SoftButton small label="Apply" onPress={() => router.push("/apply-badge" as any)} />
        </Reveal>
      ) : null}

      <Text style={[TYPE.overline, { color: tc.textTertiary, marginHorizontal: 30, marginTop: 24, marginBottom: 6 }]}>Renting it out safely</Text>
      <View style={[card, { marginHorizontal: 16, overflow: "hidden" }]}>
        {TIPS.map(([icon, title, desc], i) => (
          <View key={title} style={[{ flexDirection: "row", gap: 12, padding: 14 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
              <Ionicons name={icon} size={17} color={tc.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{title}</Text>
              <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 2 }]}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </DPage>
  );
}

const styles = createThemedStyles({
  safe: { flex: 1, backgroundColor: palette.neutralL97_9 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(14),
    paddingTop: rs(12),
    paddingBottom: rs(14),
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutralL91_2,
    shadowColor: palette.black,
    shadowOpacity: 0.04,
    shadowRadius: rs(4),
    elevation: 2,
  },
  backBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: palette.blueL97_2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: rs(17), fontWeight: "800", color: palette.navy },
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
  badgeBannerTitle: { fontSize: rs(14), fontWeight: "800", color: palette.white, marginBottom: rs(2) },
  badgeBannerDesc: { fontSize: rs(11), color: "rgba(255,255,255,0.85)" },
  badgeBannerCheck: { marginLeft: rs(4) },

  fraudReminder: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(8),
    backgroundColor: palette.red50,
    padding: rs(12),
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: palette.red200,
    marginBottom: rs(16),
  },
  fraudReminderText: { flex: 1, fontSize: rs(12), color: palette.red800, lineHeight: rs(17) },

  overviewRow: { flexDirection: "row", gap: rs(10), marginBottom: rs(20) },
  overviewCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: rs(14),
    padding: rs(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  overviewIcon: { width: rs(28), height: rs(28), borderRadius: rs(9), alignItems: "center", justifyContent: "center", marginBottom: rs(6) },
  overviewValue: { fontSize: rs(18), fontWeight: "900", color: palette.navy, marginBottom: rs(2) },
  overviewLabel: { fontSize: rs(10), color: palette.gray500, fontWeight: "600" },

  sectionLabel: {
    fontSize: rs(11),
    fontWeight: "800",
    color: palette.gray400,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: rs(10),
  },

  listingCard: {
    backgroundColor: palette.white,
    borderRadius: rs(16),
    borderWidth: 1,
    borderColor: palette.gray200,
    padding: rs(14),
    marginBottom: rs(12),
  },
  listingCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: rs(10), marginBottom: rs(8) },
  listingTitle: { fontSize: rs(14), fontWeight: "800", color: palette.navy, marginBottom: rs(3) },
  listingAddressRow: { flexDirection: "row", alignItems: "center", gap: rs(4) },
  listingAddress: { fontSize: rs(11), color: palette.gray400, flex: 1 },
  statusBadge: { paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(8) },
  statusBadgeText: { fontSize: rs(10), fontWeight: "800" },
  listingMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: rs(8) },
  listingPrice: { fontSize: rs(16), fontWeight: "900", color: Colors.brand.blue },
  listingSpecs: { flexDirection: "row", alignItems: "center", gap: rs(6) },
  listingSpec: { fontSize: rs(11), color: palette.gray500, fontWeight: "600" },
  specDot: { width: rs(3), height: rs(3), borderRadius: rs(2), backgroundColor: palette.gray300 },
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
  statChip: { flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: palette.gray50, paddingHorizontal: rs(8), paddingVertical: rs(5), borderRadius: rs(8) },
  statValue: { fontSize: rs(12), fontWeight: "800", color: palette.navy },
  statLabel: { fontSize: rs(11), color: palette.gray500 },
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
    backgroundColor: palette.blueL97_2,
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
    borderColor: palette.gray200,
    backgroundColor: palette.gray50,
  },
  deactivateBtnText: { fontSize: rs(12), fontWeight: "700", color: palette.gray500 },
  chatBtn: { flex: 1, borderRadius: rs(10), overflow: "hidden" },
  chatBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(6),
    paddingVertical: rs(8),
  },
  chatBtnText: { fontSize: rs(12), fontWeight: "800", color: palette.white },

  complianceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(12),
    backgroundColor: palette.blue50,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: palette.blue200,
    padding: rs(12),
  },
  complianceIcon: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    alignItems: "center",
    justifyContent: "center",
  },
  complianceTitle: { fontSize: rs(13), fontWeight: "800", color: palette.blueL33, marginBottom: rs(4) },
  complianceText: { fontSize: rs(12), color: palette.blue800, lineHeight: rs(17) },

  emptyAccess: { flex: 1, alignItems: "center", justifyContent: "center", padding: rs(32), gap: rs(12) },
  emptyListings: { alignItems: "center", padding: rs(32), gap: rs(8) },
  emptyTitle: { fontSize: rs(17), fontWeight: "800", color: palette.gray700 },
  emptyDesc: { fontSize: rs(13), color: palette.gray500, textAlign: "center", lineHeight: rs(18) },
  applyBtn: { borderRadius: rs(14), overflow: "hidden", marginTop: rs(8) },
  applyBtnGrad: { paddingHorizontal: rs(24), paddingVertical: rs(14) },
  applyBtnText: { fontSize: rs(14), fontWeight: "800", color: palette.white },

  // Remote Tenant Safety card
  remoteSafetyCard: {
    backgroundColor: palette.purple50,
    borderRadius: rs(16),
    borderWidth: 1,
    borderColor: palette.violetL92,
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
    color: palette.gray600,
    marginBottom: rs(2),
  },
  remoteSafetySub: {
    fontSize: rs(11),
    color: palette.violet600,
    fontWeight: "600",
  },
  videoRequestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.purple100,
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
    color: palette.violet600,
  },
  videoRequestCta: {},
  videoRequestCtaText: {
    fontSize: rs(12),
    fontWeight: "700",
    color: palette.brandBlue,
  },
  remoteTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(10),
    paddingTop: rs(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.violetL92,
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
    color: palette.gray700,
    marginBottom: rs(3),
  },
  remoteTipDesc: {
    fontSize: rs(11),
    color: palette.gray500,
    lineHeight: rs(16),
  },
});
