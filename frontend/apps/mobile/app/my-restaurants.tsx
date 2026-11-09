import { Switch } from "../src/shared/ui/Switch";
import { rs } from "../src/utils/responsive";
import { useEffect, useState } from "react";
import { queryKeys } from "../src/services/cache/queryKeys";
import { useScreenQuery } from "../src/hooks/useScreenQuery";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Redirect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../src/store/auth.store";
import { usePermissions } from "../src/shared/hooks/usePermissions";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { getMyRestaurants, deleteRestaurant, updateRestaurant, type Restaurant, type CreateRestaurantPayload } from "../src/api/food.api";
import { showToast } from "../src/shared/ui/Toast";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';
import { Image } from 'expo-image';
import { TYPE } from '../src/theme/d';
import { EmptyState, GradientButton, GradientFill, Reveal, SoftButton, Tag } from '../src/shared/d';
import { DSheet } from '../src/shared/d/Sheet';
import { DPage, DRow, goBackOr } from '../src/shared/d/Page';


// ── Helpers ───────────────────────────────────────────────────────────────────

const VERIF_CONFIG = {
  verified:    { label: "Verified",    color: "#1A6BAE", bg: "#EEF5FF" },
  unverified:  { label: "Basic",       color: "#6B7280", bg: "#F3F4F6" },
};

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(2) }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={10}
          color={s <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"}
        />
      ))}
    </View>
  );
}

function RestaurantCard({
  restaurant,
  onDelete,
  onUpdate,
}: {
  restaurant: Restaurant;
  onDelete: (id: string) => void;
  onUpdate: (updated: Restaurant) => void;
}) {
  const verifCfg = restaurant.verified ? VERIF_CONFIG.verified : VERIF_CONFIG.unverified;
  const { isDark, tc } = useTheme();
  const listedDate = restaurant.createdAt
    ? new Date(restaurant.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

  // Manage modal state
  const [manageOpen, setManageOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(restaurant.name);
  const [editDescription, setEditDescription] = useState(restaurant.description ?? "");
  const [editAddress, setEditAddress] = useState(restaurant.address ?? "");
  const [editPhone, setEditPhone] = useState(restaurant.phone ?? restaurant.phoneNumber ?? "");
  const [editOpeningTime, setEditOpeningTime] = useState(restaurant.openingTime ?? "");
  const [editClosingTime, setEditClosingTime] = useState(restaurant.closingTime ?? "");
  const [editOpenNow, setEditOpenNow] = useState(restaurant.openNow);
  const [editWebsite, setEditWebsite] = useState(restaurant.website ?? "");

  const openManage = () => {
    setEditName(restaurant.name);
    setEditDescription(restaurant.description ?? "");
    setEditAddress(restaurant.address ?? "");
    setEditPhone(restaurant.phone ?? restaurant.phoneNumber ?? "");
    setEditOpeningTime(restaurant.openingTime ?? "");
    setEditClosingTime(restaurant.closingTime ?? "");
    setEditOpenNow(restaurant.openNow);
    setEditWebsite(restaurant.website ?? "");
    setEditMode(false);
    setManageOpen(true);
  };

  const saveEdits = async () => {
    if (!editName.trim()) { showToast("Please enter a restaurant name.", "error"); return; }
    setSaving(true);
    try {
      const payload: Partial<CreateRestaurantPayload> = {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        address: editAddress.trim() || undefined,
        phoneNumber: editPhone.trim() || undefined,
        openingTime: editOpeningTime.trim() || undefined,
        closingTime: editClosingTime.trim() || undefined,
        city: restaurant.city ?? "",
        country: restaurant.country ?? "US",
        priceRange: (restaurant.price?.toUpperCase() ?? "MODERATE") as CreateRestaurantPayload["priceRange"],
      };
      const updated = await updateRestaurant(restaurant.id, payload);
      onUpdate(updated);
      setEditMode(false);
      showToast("Your restaurant details have been updated.", "success");
    } catch {
      showToast("Could not save changes. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const tagV = (label: string, tone: "ok" | "warn" | "plain") => (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: tone === "ok" ? tc.mintSoft : tone === "warn" ? tc.warningBg : tc.inputBg }}>
      <Text style={[TYPE.label, { fontSize: 11, color: tone === "ok" ? tc.successText : tone === "warn" ? tc.warningText : tc.textSecondary }]}>{label}</Text>
    </View>
  );
  const photo = restaurant.images?.[0] || restaurant.image;
  const stats = ([
    ["Views", (restaurant as any).views],
    ["Likes", (restaurant as any).likes],
    ["Reviews", restaurant.reviews],
    ["Bookings", (restaurant as any).reservations],
  ] as [string, number | undefined][]).filter(([, v]) => typeof v === "number");
  return (
    <Reveal style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 24, overflow: "hidden", backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }}>
      {photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: 150 }} contentFit="cover" transition={200} /> : (
        <GradientFill style={{ height: 90, alignItems: "center", justifyContent: "center" }}><Ionicons name="restaurant" size={28} color="#fff" /></GradientFill>
      )}
      <View style={{ padding: 14, gap: 6 }}>
        <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>{[restaurant.reviews > 0 ? `★ ${restaurant.rating} (${restaurant.reviews})` : "", restaurant.cuisine, restaurant.city, listedDate ? `listed ${listedDate}` : ""].filter(Boolean).join(" · ")}</Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {restaurant.openNow ? tagV("Open now", "ok") : tagV("Closed", "plain")}
          {restaurant.verified ? tagV("Verified", "ok") : tagV(verifCfg.label, "warn")}
        </View>
        {stats.length ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            {stats.map(([k, v]) => (
              <View key={k} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 14, backgroundColor: tc.inputBg }}>
                <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{v}</Text>
                <Text style={[TYPE.small, { color: tc.textTertiary, fontSize: 11.5 }]}>{k}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <SoftButton small block label="Manage" outerStyle={{ flex: 1 }} onPress={openManage} />
          <SoftButton small block ghost label="Messages" outerStyle={{ flex: 1 }} onPress={() => router.push("/chat" as any)} />
          <Pressable onPress={() => appAlert("Delete restaurant", `Delete "${restaurant.name}"? Its reviews go with it.`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(restaurant.id) },
            ])} hitSlop={6} accessibilityRole="button" accessibilityLabel="Delete restaurant"
            style={{ width: 40, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239,68,68,0.12)" }}>
            <Ionicons name="trash-outline" size={17} color={tc.dangerText} />
          </Pressable>
        </View>
      </View>

      {/* ── Manage sheet ── */}
      <DSheet visible={manageOpen} onClose={() => { if (!saving) setManageOpen(false); }} title={restaurant.name} full>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={[TYPE.small, { color: tc.textSecondary }]}>{[restaurant.cuisine, restaurant.city].filter(Boolean).join(" · ")}</Text>
              <View style={{ flex: 1 }} />
              <Tag label={restaurant.openNow ? "Open now" : "Closed"} ok={restaurant.openNow} />
              <Tag label={verifCfg.label} ok={verifCfg.label === "Verified"} />
            </View>

            {restaurant.reviews > 0 ? (
              <View style={{ flexDirection: "row", borderRadius: 20, backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }}>
                {[
                  { v: restaurant.rating ? restaurant.rating.toFixed(1) : "", k: "Rating" },
                  { v: String(restaurant.reviews), k: restaurant.reviews === 1 ? "Review" : "Reviews" },
                ].filter((x) => x.v).map((x, i) => (
                  <View key={x.k} style={[{ flex: 1, alignItems: "center", paddingVertical: 12 }, i > 0 && { borderLeftWidth: 1, borderLeftColor: tc.borderLight }]}>
                    <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]}>{x.v}</Text>
                    <Text style={[TYPE.small, { color: tc.textSecondary }]}>{x.k}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[TYPE.overline, { color: tc.textTertiary, flex: 1 }]}>Details</Text>
              {editMode ? null : <SoftButton small label="Edit" onPress={() => setEditMode(true)} />}
            </View>

            {editMode ? (
              <>
                {[
                  { label: "Name", value: editName, onChange: setEditName, placeholder: "Restaurant name" },
                  { label: "Address", value: editAddress, onChange: setEditAddress, placeholder: "Full address" },
                  { label: "Phone", value: editPhone, onChange: setEditPhone, placeholder: "Phone number" },
                  { label: "Website", value: editWebsite, onChange: setEditWebsite, placeholder: "https://..." },
                  { label: "Opens", value: editOpeningTime, onChange: setEditOpeningTime, placeholder: "e.g. 09:00" },
                  { label: "Closes", value: editClosingTime, onChange: setEditClosingTime, placeholder: "e.g. 22:00" },
                ].map((field) => (
                  <View key={field.label}>
                    <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6 }]}>{field.label}</Text>
                    <TextInput value={field.value} onChangeText={field.onChange} placeholder={field.placeholder} placeholderTextColor={tc.textTertiary}
                      style={[TYPE.body, { minHeight: 50, borderRadius: 16, paddingHorizontal: 14, backgroundColor: tc.inputBg, color: tc.textPrimary }]} />
                  </View>
                ))}
                <View>
                  <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6 }]}>About</Text>
                  <TextInput value={editDescription} onChangeText={setEditDescription} placeholder="Describe your restaurant" placeholderTextColor={tc.textTertiary} multiline
                    style={[TYPE.body, { minHeight: 100, borderRadius: 16, padding: 14, backgroundColor: tc.inputBg, color: tc.textPrimary, textAlignVertical: "top" }]} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
                  <Text style={[TYPE.body, { color: tc.textPrimary, flex: 1 }]}>Open now</Text>
                  <Switch value={editOpenNow} onValueChange={setEditOpenNow} />
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <SoftButton block ghost label="Cancel" outerStyle={{ flex: 1 }} disabled={saving} onPress={() => setEditMode(false)} />
                  <GradientButton block label="Save" outerStyle={{ flex: 1.4 }} loading={saving} onPress={() => void saveEdits()} />
                </View>
              </>
            ) : (
              <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: tc.cardBg, borderWidth: 1, borderColor: tc.glassLine }}>
                {([
                  ["Address", editAddress], ["Phone", editPhone], ["Website", editWebsite],
                  ["Hours", editOpeningTime && editClosingTime ? `${editOpeningTime}–${editClosingTime}` : ""],
                  ["About", editDescription],
                ] as [string, string][]).filter(([, v]) => !!v).map(([k, v], i) => (
                  <View key={k} style={[{ flexDirection: "row", gap: 12, paddingVertical: 12, paddingHorizontal: 14 }, i > 0 && { borderTopWidth: 1, borderTopColor: tc.borderLight }]}>
                    <Text style={[TYPE.body, { fontSize: 14.5, color: tc.textSecondary, width: 74 }]}>{k}</Text>
                    <Text style={[TYPE.bodyStrong, { fontSize: 14.5, color: tc.textPrimary, flex: 1, textAlign: "right" }]}>{v}</Text>
                  </View>
                ))}
              </View>
            )}

            {restaurant.tags && restaurant.tags.length > 0 ? (
              <>
                <Text style={[TYPE.overline, { color: tc.textTertiary }]}>Tags</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{restaurant.tags.map((t) => <Tag key={t} label={t} />)}</View>
              </>
            ) : null}
            {restaurant.popularDishes && restaurant.popularDishes.length > 0 ? (
              <>
                <Text style={[TYPE.overline, { color: tc.textTertiary }]}>Popular dishes</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{restaurant.popularDishes.map((d) => <Tag key={d} label={d} ok />)}</View>
              </>
            ) : null}
            <Text style={[TYPE.small, { color: tc.textTertiary }]}>Listed {listedDate}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </DSheet>
    </Reveal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MyRestaurantsScreen() {
  const user = useAuthStore((s) => s.user);
  const { isVerifiedRestaurantOwner } = usePermissions();
  const { isDark, tc } = useTheme();
  const mine = useScreenQuery({
    queryKey: queryKeys.myRestaurants(),
    initial: [] as Restaurant[],
    staleTime: 0,
    queryFn: async () => {
      const data = await getMyRestaurants();
      // Backend may return wrapped { data: [...] } or flat array
      return (Array.isArray(data) ? data : ((data as any)?.data ?? [])) as Restaurant[];
    },
  });
  const restaurants = mine.data;
  const loading = mine.loading;
  const setRestaurants = mine.setData;
  useEffect(() => {
    if (mine.error) showToast((mine.error as any)?.message ?? "Could not load your restaurants.", "error");
  }, [mine.error]);

  const handleDelete = async (id: string) => {
    try {
      await deleteRestaurant(id);
      setRestaurants((p) => p.filter((r) => r.id !== id));
    } catch {
      showToast("Could not delete restaurant.", "error");
    }
  };

  const handleUpdate = (updated: Restaurant) => {
    setRestaurants((p) => p.map((r) => r.id === updated.id ? updated : r));
  };

  if (!user?.id) {
    return <Redirect href="/(auth)/login" />;
  }

  const badgeGradient: [string, string] = ["#30855B", "#256B49"];
  const totalReviews  = restaurants.reduce((acc, r) => acc + (r.reviews ?? 0), 0);
  const avgRating     = restaurants.length
    ? (restaurants.reduce((acc, r) => acc + r.rating, 0) / restaurants.length).toFixed(1)
    : "—";

  const RULES: [keyof typeof Ionicons.glyphMap, string][] = [
    ["shield-checkmark-outline", "Only list places you own or are allowed to manage."],
    ["ribbon-outline", "UK: a food hygiene rating (FHRS) and council registration with the FSA."],
    ["medkit-outline", "US: a local health department permit, and FDA registration where it applies."],
    ["alert-circle-outline", "List allergens accurately for every dish."],
    ["ban-outline", "False listings or health claims mean a permanent ban."],
  ];
  return (
    <DPage
      title="My restaurants"
      sub={restaurants.length ? [`${restaurants.length} listed`, avgRating !== "—" && totalReviews > 0 ? `★ ${avgRating} average` : "", totalReviews > 0 ? `${totalReviews} reviews` : ""].filter(Boolean).join(" · ") : undefined}
      onBack={() => goBackOr("/(tabs)/feed")}
      right={
        <Pressable onPress={() => router.push({ pathname: "/create-post" as any, params: { type: "restaurant" } })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add a restaurant"
          style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: tc.inputBg }]}>
          <Ionicons name="add" size={26} color={tc.textPrimary} />
        </Pressable>
      }
      refreshControl={<RefreshControl refreshing={mine.refreshing} onRefresh={mine.onRefresh} tintColor={tc.accent} />}
    >
      {loading ? <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 40 }} /> : null}

      {!loading && restaurants.length === 0 ? (
        <EmptyState icon="restaurant-outline" title="No restaurants yet" sub="Put your place on the map: a name, a photo and when you are open." actionLabel="Add my restaurant" onAction={() => router.push({ pathname: "/create-post" as any, params: { type: "restaurant" } })} />
      ) : restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} onDelete={handleDelete} onUpdate={handleUpdate} />)}

      {!loading ? (
        <Reveal style={{ marginHorizontal: 16, marginTop: 6, padding: 16, borderRadius: 22, backgroundColor: tc.mintSoft, flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Ionicons name="shield-checkmark" size={22} color={tc.successText} />
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{isVerifiedRestaurantOwner ? "Verified restaurant owner" : "Get the owner badge"}</Text>
            <Text style={[TYPE.small, { color: tc.textSecondary }]}>{isVerifiedRestaurantOwner ? "Your listings carry the trust mark." : "A trust mark on your restaurant listings."}</Text>
          </View>
          <SoftButton small label={isVerifiedRestaurantOwner ? "Details" : "Apply"} onPress={() => isVerifiedRestaurantOwner ? router.push("/verification-status" as any) : router.push({ pathname: "/apply-badge" as any, params: { badgeType: "restaurant_owner" } })} />
        </Reveal>
      ) : null}

      <Text style={[TYPE.overline, { color: tc.textTertiary, marginHorizontal: 30, marginTop: 24, marginBottom: 6 }]}>Food safety and the rules</Text>
      <View style={{ marginHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
        {RULES.map(([icon, text], i) => (
          <View key={text} style={[{ flexDirection: "row", gap: 12, padding: 14, alignItems: "center" }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }]}>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
              <Ionicons name={icon} size={17} color={tc.accentText} />
            </View>
            <Text style={[TYPE.small, { flex: 1, color: tc.textSecondary }]}>{text}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginHorizontal: 16, marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
        <DRow first icon="help-circle-outline" label="Help with a listing" value="support@comlinkr.com" onPress={() => router.push("/help-support" as any)} />
      </View>
    </DPage>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#F5F6FA" },

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
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: rs(17), fontWeight: "800", color: "#0A2540", letterSpacing: -0.3 },
  headerSub:   { fontSize: rs(12), color: "#6B7280", marginTop: rs(1) },
  addBtn:      { borderRadius: rs(12), overflow: "hidden" },
  addBtnGrad:  { width: rs(36), height: rs(36), alignItems: "center", justifyContent: "center" },

  scroll: { paddingHorizontal: rs(16), paddingTop: rs(16) },

  // ── Empty / locked state ────
  emptyAccess: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: rs(32),
    gap: rs(12),
  },
  emptyTitle: { fontSize: rs(18), fontWeight: "800", color: "#0A2540" },
  emptyDesc:  { fontSize: rs(13), color: "#6B7280", textAlign: "center", lineHeight: rs(19) },
  applyBtn:   { borderRadius: rs(14), overflow: "hidden", marginTop: rs(8) },
  applyBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: rs(24),
    paddingVertical: rs(13),
    gap: rs(8),
  },
  applyBtnText: { fontSize: rs(14), fontWeight: "800", color: "#FFF" },

  // ── Badge banner ────
  badgeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: rs(14),
    borderRadius: rs(16),
    marginBottom: rs(10),
  },
  badgeBannerLeft:  { flexDirection: "row", alignItems: "center", gap: rs(10), flex: 1 },
  badgeBannerTitle: { fontSize: rs(13), fontWeight: "800", color: "#FFF", marginBottom: rs(2) },
  badgeBannerSub:   { fontSize: rs(11), color: "rgba(255,255,255,0.85)" },
  badgeBannerLink:  { fontSize: rs(12), fontWeight: "800", color: "#FFF", textDecorationLine: "underline" },

  // ── Fraud banner ────
  fraudBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(8),
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: rs(12),
    padding: rs(12),
    marginBottom: rs(16),
  },
  fraudText: { flex: 1, fontSize: rs(12), color: "#991B1B", lineHeight: rs(17) },

  // ── Section label ────
  sectionLabel: {
    fontSize: rs(11),
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: rs(10),
    marginTop: rs(4),
  },

  // ── Overview stats ────
  statsRow:       { flexDirection: "row", gap: rs(10), marginBottom: rs(20) },
  overviewCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: rs(12),
    alignItems: "center",
    gap: rs(4),
  },
  overviewIconBox: { width: rs(36), height: rs(36), borderRadius: rs(12), alignItems: "center", justifyContent: "center" },
  overviewValue:   { fontSize: rs(16), fontWeight: "800", color: "#0A2540" },
  overviewLabel:   { fontSize: rs(10), color: "#9CA3AF", fontWeight: "600", textAlign: "center" },

  // ── Restaurant card ────
  restaurantCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(18),
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: rs(14),
    marginBottom: rs(14),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(2) },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    marginBottom: rs(8),
  },
  restaurantIcon: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(14),
    alignItems: "center",
    justifyContent: "center",
  },
  restaurantName: { fontSize: rs(15), fontWeight: "800", color: "#0A2540" },
  restaurantMeta: { fontSize: rs(12), color: "#6B7280", marginTop: rs(2) },
  openPill: {
    backgroundColor: "#DCFCE7",
    borderRadius: rs(6),
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
  },
  openPillText: { fontSize: rs(10), fontWeight: "700", color: "#16A34A" },
  statusPill: {
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
  },
  statusPillText: { fontSize: rs(10), fontWeight: "800" },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    marginBottom: rs(10),
  },
  addressText: { flex: 1, fontSize: rs(12), color: "#6B7280" },

  verifyRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    marginBottom: rs(12),
  },
  verifPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
  },
  verifPillText: { fontSize: rs(11), fontWeight: "700" },
  ratingGroup:   { flexDirection: "row", alignItems: "center", gap: rs(5) },
  ratingText:    { fontSize: rs(11), color: "#6B7280", fontWeight: "600" },

  // ── Stats grid ────
  statsGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: rs(12),
    marginBottom: rs(12),
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: rs(3),
  },
  statIconBox: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rs(2),
  },
  statValue: { fontSize: rs(13), fontWeight: "800", color: "#0A2540" },
  statLabel: { fontSize: rs(10), color: "#9CA3AF", fontWeight: "600" },

  // ── Services row ────
  servicesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: rs(6),
    marginBottom: rs(12),
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    backgroundColor: "#F0FDF4",
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
  },
  serviceChipText: { fontSize: rs(11), color: "#16A34A", fontWeight: "600" },
  listedSince:     { fontSize: rs(11), color: "#9CA3AF", marginLeft: "auto" as any },

  // ── Analytics grid ────
  analyticsGrid: {
    flexDirection: "row",
    gap: rs(8),
    marginBottom: rs(12),
  },
  analyticsCell: {
    flex: 1,
    alignItems: "center",
    borderRadius: rs(10),
    paddingVertical: rs(8),
    gap: rs(3),
  },
  analyticsIconBox: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rs(2),
  },
  analyticsValue: {
    fontSize: rs(14),
    fontWeight: "900",
  },
  analyticsLabel: {
    fontSize: rs(9),
    fontWeight: "700",
    color: "#9CA3AF",
    textAlign: "center",
  },

  // ── Card actions ────
  cardActions: {
    flexDirection: "row",
    gap: rs(8),
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: rs(12),
    flexWrap: "wrap",
  },
  actionBtn:    { borderRadius: rs(10), overflow: "hidden" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    backgroundColor: "#EEF5FF",
    borderRadius: rs(10),
  },
  msgBtn:       {},
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    borderRadius: rs(10),
  },
  deactivateBtn: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  actionBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(5),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
  },
  actionBtnText: { fontSize: rs(12), fontWeight: "700" },

  // ── Add new CTA ────
  addRestaurantCard: { borderRadius: rs(14), overflow: "hidden", marginBottom: rs(20) },
  addRestaurantGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rs(8),
    paddingVertical: rs(14),
  },
  addRestaurantText: { fontSize: rs(14), fontWeight: "800", color: "#FFF" },

  // ── Reviews ────
  reviewCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: rs(12),
    marginBottom: rs(10),
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(10),
    marginBottom: rs(8),
  },
  reviewAvatar: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(17),
    backgroundColor: "#30855B",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText:  { fontSize: rs(14), fontWeight: "800", color: "#FFF" },
  reviewerName:      { fontSize: rs(13), fontWeight: "700", color: "#0A2540" },
  reviewRestaurant:  { fontSize: rs(11), color: "#9CA3AF", marginTop: rs(1) },
  reviewTime:        { fontSize: rs(10), color: "#9CA3AF" },
  reviewComment:     { fontSize: rs(13), color: "#374151", lineHeight: rs(18), marginBottom: rs(8) },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    alignSelf: "flex-start",
  },
  replyBtnText: { fontSize: rs(12), color: "#1A6BAE", fontWeight: "600" },

  // ── Compliance ────
  complianceCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: rs(14),
    marginBottom: rs(12),
  },
  complianceHeader: { flexDirection: "row", alignItems: "center", gap: rs(10), marginBottom: rs(12) },
  complianceIcon:   { width: rs(32), height: rs(32), borderRadius: rs(10), alignItems: "center", justifyContent: "center" },
  complianceTitle:  { fontSize: rs(14), fontWeight: "800", color: "#0A2540" },
  complianceRow:    { flexDirection: "row", alignItems: "flex-start", gap: rs(8), marginBottom: rs(8) },
  complianceText:   { flex: 1, fontSize: rs(13), color: "#374151", lineHeight: rs(18) },

  // ── Help ────
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
    backgroundColor: "#EEF5FF",
    padding: rs(14),
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: rs(4),
  },
  helpTitle: { fontSize: rs(13), fontWeight: "700", color: "#1E40AF", marginBottom: rs(2) },
  helpDesc:  { fontSize: rs(11), color: "#3B82F6" },
  helpLink:  { fontSize: rs(12), fontWeight: "800", color: Colors.brand.blue },

  // ── New card layout ────
  cardTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    gap: rs(10),
  },
  restaurantIconSmall: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTopName: {
    fontSize: rs(15),
    fontWeight: "800",
    color: "#FFF",
    flex: 1,
  },
  cardTopCuisine: {
    fontSize: rs(11),
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: rs(1),
  },
  statusDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
  },
  cardBody: {
    padding: rs(14),
  },
});
