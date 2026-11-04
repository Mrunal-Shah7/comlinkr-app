import { rs } from "../src/utils/responsive";
import { useEffect, useState } from "react";
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
  Switch,
  KeyboardAvoidingView,
  Platform,
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


// ── Helpers ───────────────────────────────────────────────────────────────────

const VERIF_CONFIG = {
  verified:    { label: "Verified",    color: "#0076EB", bg: "#EEF5FF" },
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

  return (
    <View style={[styles.restaurantCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      {/* Colored top bar */}
      <LinearGradient colors={["#26B324", "#1a8a18"]} style={styles.cardTopBar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(10) }}>
          <View style={styles.restaurantIconSmall}>
            <Ionicons name="restaurant" size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTopName} numberOfLines={1}>{restaurant.name}</Text>
            <Text style={styles.cardTopCuisine} numberOfLines={1}>
              {restaurant.cuisine}{restaurant.city ? ` · ${restaurant.city}` : ""}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: restaurant.openNow ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)" }]}>
            <View style={[styles.statusDot, { backgroundColor: restaurant.openNow ? "#A7F3A0" : "#FECACA" }]} />
            <Text style={[styles.statusPillText, { color: "#FFF" }]}>
              {restaurant.openNow ? "Open" : "Closed"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cardBody}>
        {/* Address */}
        {restaurant.address ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={[styles.addressText, { color: tc.textSecondary }]} numberOfLines={1}>{restaurant.address}</Text>
          </View>
        ) : null}

        {/* Verification + Rating row */}
        <View style={styles.verifyRatingRow}>
          <View style={[styles.verifPill, { backgroundColor: verifCfg.bg }]}>
            <Ionicons name="shield-checkmark" size={11} color={verifCfg.color} />
            <Text style={[styles.verifPillText, { color: verifCfg.color }]}>{verifCfg.label}</Text>
          </View>
          <View style={styles.ratingGroup}>
            <StarRow rating={restaurant.rating} />
            <Text style={[styles.ratingText, { color: tc.textSecondary }]}>{restaurant.rating} ({restaurant.reviews} reviews)</Text>
          </View>
        </View>

        {/* Services */}
        {restaurant.services && restaurant.services.length > 0 ? (
          <View style={styles.servicesRow}>
            {restaurant.services.map((svc) => (
              <View key={svc} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{svc}</Text>
              </View>
            ))}
            {listedDate ? <Text style={[styles.listedSince, { color: tc.textTertiary }]}>Listed {listedDate}</Text> : null}
          </View>
        ) : null}

        {/* Popular dishes */}
        {restaurant.popularDishes && restaurant.popularDishes.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(6), marginBottom: rs(12) }}>
            {restaurant.popularDishes.slice(0, 4).map((dish) => (
              <View key={dish} style={{ backgroundColor: Colors.brand.greenLight, borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                <Text style={{ fontSize: rs(10), fontWeight: "600", color: Colors.brand.green }}>{dish}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Analytics grid */}
        <View style={styles.analyticsGrid}>
          {[
            { icon: "eye-outline" as const,          color: "#0076EB", bg: "#EEF5FF", label: "Views",        value: (restaurant as any).views        ?? 0 },
            { icon: "heart-outline" as const,         color: "#EF4444", bg: "#FEF2F2", label: "Likes",        value: (restaurant as any).likes        ?? 0 },
            { icon: "chatbubble-outline" as const,    color: "#26B324", bg: "#EAFBE9", label: "Comments",     value: (restaurant as any).commentsCount ?? restaurant.reviews ?? 0 },
            { icon: "calendar-outline" as const,      color: "#FF7B00", bg: "#FFF3E6", label: "Reservations", value: (restaurant as any).reservations ?? 0 },
          ].map((stat) => (
            <View key={stat.label} style={[styles.analyticsCell, { backgroundColor: stat.bg }]}>
              <View style={[styles.analyticsIconBox, { backgroundColor: stat.color + "22" }]}>
                <Ionicons name={stat.icon} size={rs(14)} color={stat.color} />
              </View>
              <Text style={[styles.analyticsValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.analyticsLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { borderTopColor: tc.borderLight }]}>
          <Pressable
            onPress={openManage}
            style={({ pressed }) => [styles.actionBtn, styles.msgBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="settings-outline" size={13} color={Colors.brand.green} />
            <Text style={[styles.actionBtnText, { color: Colors.brand.green }]}>Manage</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/chat" as any)}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#EEF5FF", borderColor: Colors.brand.blue + "33", borderWidth: 1 }, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="chatbubble-outline" size={13} color={Colors.brand.blue} />
            <Text style={[styles.actionBtnText, { color: Colors.brand.blue }]}>Messages</Text>
          </Pressable>
          <Pressable
            onPress={() => appAlert("Delete Restaurant", `Delete "${restaurant.name}"?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(restaurant.id) },
            ])}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1 }, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="trash-outline" size={13} color="#DC2626" />
            <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Delete</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Manage Modal ── */}
      <Modal visible={manageOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setManageOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: tc.pageBg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* Modal header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(12), borderBottomWidth: 1, borderBottomColor: tc.borderLight, backgroundColor: tc.cardBg }}>
            <Pressable onPress={() => setManageOpen(false)} style={{ width: rs(36), height: rs(36), borderRadius: rs(10), backgroundColor: tc.sectionBg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={20} color={tc.textSecondary} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: rs(10) }}>
              <Text style={{ fontSize: rs(16), fontWeight: "800", color: tc.textPrimary }} numberOfLines={1}>{restaurant.name}</Text>
              <Text style={{ fontSize: rs(12), color: tc.textTertiary }}>{restaurant.cuisine}{restaurant.city ? ` · ${restaurant.city}` : ""}</Text>
            </View>
            <Pressable
              onPress={() => editMode ? void saveEdits() : setEditMode(true)}
              style={{ paddingHorizontal: rs(14), paddingVertical: rs(8), borderRadius: rs(10), backgroundColor: editMode ? Colors.brand.green : Colors.brand.blue, opacity: saving ? 0.7 : 1 }}
            >
              {saving
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={{ fontSize: rs(13), fontWeight: "700", color: "#FFF" }}>{editMode ? "Save" : "Edit"}</Text>}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: rs(16), gap: rs(14) }} showsVerticalScrollIndicator={false}>
            {/* Status banner */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: rs(10), padding: rs(12), borderRadius: rs(12), backgroundColor: restaurant.openNow ? "#EAFBE9" : "#FEF2F2", borderWidth: 1, borderColor: restaurant.openNow ? "#86EFAC" : "#FECACA" }}>
              <View style={{ width: rs(10), height: rs(10), borderRadius: rs(5), backgroundColor: restaurant.openNow ? "#26B324" : "#EF4444" }} />
              <Text style={{ flex: 1, fontSize: rs(13), fontWeight: "700", color: restaurant.openNow ? "#26B324" : "#EF4444" }}>{restaurant.openNow ? "Currently Open" : "Currently Closed"}</Text>
              <Text style={{ fontSize: rs(12), color: tc.textTertiary }}>{restaurant.closingTime ? `Closes ${restaurant.closingTime}` : ""}</Text>
            </View>

            {/* Analytics */}
            <View style={{ flexDirection: "row", gap: rs(8) }}>
              {[
                { icon: "eye-outline", color: "#0076EB", bg: "#EEF5FF", label: "Views", value: (restaurant as any).views ?? 0 },
                { icon: "heart-outline", color: "#EF4444", bg: "#FEF2F2", label: "Likes", value: (restaurant as any).likes ?? 0 },
                { icon: "chatbubble-outline", color: "#26B324", bg: "#EAFBE9", label: "Reviews", value: restaurant.reviews ?? 0 },
                { icon: "calendar-outline", color: "#FF7B00", bg: "#FFF3E6", label: "Reserv.", value: (restaurant as any).reservations ?? 0 },
              ].map((s) => (
                <View key={s.label} style={{ flex: 1, alignItems: "center", padding: rs(8), borderRadius: rs(10), backgroundColor: s.bg }}>
                  <Ionicons name={s.icon as any} size={rs(16)} color={s.color} />
                  <Text style={{ fontSize: rs(14), fontWeight: "800", color: s.color, marginTop: rs(3) }}>{s.value}</Text>
                  <Text style={{ fontSize: rs(10), color: tc.textTertiary, fontWeight: "600" }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Info / edit fields */}
            <Text style={{ fontSize: rs(11), fontWeight: "700", color: tc.textTertiary, letterSpacing: 0.5 }}>RESTAURANT DETAILS</Text>

            {[
              { label: "Name", value: editName, onChange: setEditName, placeholder: "Restaurant name" },
              { label: "Address", value: editAddress, onChange: setEditAddress, placeholder: "Full address" },
              { label: "Phone", value: editPhone, onChange: setEditPhone, placeholder: "Phone number" },
              { label: "Website", value: editWebsite, onChange: setEditWebsite, placeholder: "https://..." },
              { label: "Opening Time", value: editOpeningTime, onChange: setEditOpeningTime, placeholder: "e.g. 09:00" },
              { label: "Closing Time", value: editClosingTime, onChange: setEditClosingTime, placeholder: "e.g. 22:00" },
            ].map((field) => (
              <View key={field.label} style={{ gap: rs(4) }}>
                <Text style={{ fontSize: rs(12), fontWeight: "600", color: tc.textSecondary }}>{field.label}</Text>
                {editMode ? (
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={tc.textTertiary}
                    style={{ fontSize: rs(14), color: tc.textPrimary, backgroundColor: tc.inputBg, borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(10) }}
                  />
                ) : (
                  <Text style={{ fontSize: rs(14), color: field.value ? tc.textPrimary : tc.textTertiary, paddingVertical: rs(2) }}>{field.value || "Not set"}</Text>
                )}
              </View>
            ))}

            {/* Description */}
            <View style={{ gap: rs(4) }}>
              <Text style={{ fontSize: rs(12), fontWeight: "600", color: tc.textSecondary }}>Description</Text>
              {editMode ? (
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Describe your restaurant..."
                  placeholderTextColor={tc.textTertiary}
                  multiline
                  numberOfLines={4}
                  style={{ fontSize: rs(14), color: tc.textPrimary, backgroundColor: tc.inputBg, borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(10), minHeight: rs(90), textAlignVertical: "top" }}
                />
              ) : (
                <Text style={{ fontSize: rs(14), color: editDescription ? tc.textPrimary : tc.textTertiary, lineHeight: rs(20) }}>{editDescription || "No description"}</Text>
              )}
            </View>

            {/* Open now toggle (edit mode only) */}
            {editMode && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: rs(12), borderRadius: rs(10), backgroundColor: tc.sectionBg }}>
                <Text style={{ fontSize: rs(14), fontWeight: "600", color: tc.textPrimary }}>Mark as Open Now</Text>
                <Switch value={editOpenNow} onValueChange={setEditOpenNow} trackColor={{ false: tc.borderLight, true: Colors.brand.green }} thumbColor="#FFF" />
              </View>
            )}

            {/* Tags & services (read only) */}
            {restaurant.tags && restaurant.tags.length > 0 && (
              <>
                <Text style={{ fontSize: rs(11), fontWeight: "700", color: tc.textTertiary, letterSpacing: 0.5 }}>TAGS</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(6) }}>
                  {restaurant.tags.map((t) => (
                    <View key={t} style={{ backgroundColor: "#EEF5FF", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                      <Text style={{ fontSize: rs(11), fontWeight: "600", color: Colors.brand.blue }}>{t}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Popular dishes (read only) */}
            {restaurant.popularDishes && restaurant.popularDishes.length > 0 && (
              <>
                <Text style={{ fontSize: rs(11), fontWeight: "700", color: tc.textTertiary, letterSpacing: 0.5 }}>POPULAR DISHES</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(6) }}>
                  {restaurant.popularDishes.map((d) => (
                    <View key={d} style={{ backgroundColor: Colors.brand.greenLight ?? "#EAFBE9", borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
                      <Text style={{ fontSize: rs(11), fontWeight: "600", color: Colors.brand.green }}>{d}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Listed info */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: rs(8), borderTopWidth: 1, borderTopColor: tc.borderLight }}>
              <Text style={{ fontSize: rs(12), color: tc.textTertiary }}>Listed {listedDate}</Text>
              <View style={[{ paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(6) }, { backgroundColor: verifCfg.bg }]}>
                <Text style={{ fontSize: rs(11), fontWeight: "700", color: verifCfg.color }}>{verifCfg.label}</Text>
              </View>
            </View>

            <View style={{ height: rs(24) }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MyRestaurantsScreen() {
  const user = useAuthStore((s) => s.user);
  const { isVerifiedRestaurantOwner } = usePermissions();
  const { isDark, tc } = useTheme();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getMyRestaurants();
      // Backend may return wrapped { data: [...] } or flat array
      const rows = Array.isArray(data) ? data : ((data as any)?.data ?? []);
      setRestaurants(rows);
    } catch (e) {
      if (!silent) {
        const msg = (e as any)?.message ?? "Could not load your restaurants.";
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

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

  const badgeGradient: [string, string] = ["#26B324", "#1a8a18"];
  const totalReviews  = restaurants.reduce((acc, r) => acc + (r.reviews ?? 0), 0);
  const avgRating     = restaurants.length
    ? (restaurants.reduce((acc, r) => acc + r.rating, 0) / restaurants.length).toFixed(1)
    : "—";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.pageBg }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: tc.sectionBg }, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>My Restaurants</Text>
          <Text style={[styles.headerSub, { color: tc.textSecondary }]}>Manage your food listings</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: "/create-post" as any })}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
        >
          <LinearGradient colors={["#26B324", "#1a8a18"]} style={styles.addBtnGrad}>
            <Ionicons name="add" size={18} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.brand.green} />
        </View>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={Colors.brand.green} />}
      >
        {isVerifiedRestaurantOwner ? (
          <LinearGradient colors={badgeGradient} style={styles.badgeBanner}>
            <View style={styles.badgeBannerLeft}>
              <Ionicons name="shield-checkmark" size={20} color="#FFF" />
              <View>
                <Text style={styles.badgeBannerTitle}>Verified Restaurant Owner</Text>
                <Text style={styles.badgeBannerSub}>Trusted indicator shown on your listings</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/verification-status" as any)}>
              <Text style={styles.badgeBannerLink}>Details</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <View style={[styles.badgeBanner, { backgroundColor: tc.sectionBg, borderWidth: 1, borderColor: tc.borderLight }]}>
            <Ionicons name="restaurant-outline" size={20} color="#6B7280" style={{ flexShrink: 0 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.badgeBannerTitle, { color: tc.textPrimary }]}>Your restaurants</Text>
              <Text style={[styles.badgeBannerSub, { color: tc.textSecondary }]}>
                Apply for the Restaurant Owner badge to show a trust indicator on your listings.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/apply-badge" as any, params: { badgeType: "restaurant_owner" } })
              }
              style={{ flexShrink: 0, paddingLeft: rs(8) }}
            >
              <Text style={[styles.badgeBannerLink, { color: Colors.brand.blue }]}>Apply</Text>
            </Pressable>
          </View>
        )}

        {/* Fraud prevention reminder — collapsed, smaller */}
        <View style={[styles.fraudBanner, { backgroundColor: isDark ? "#1A0606" : "#FFF5F5", borderColor: isDark ? "#5A1515" : "#FECACA" }]}>
          <Ionicons name="information-circle-outline" size={14} color="#DC2626" />
          <Text style={[styles.fraudText, { color: isDark ? "#FCA5A5" : "#B91C1C" }]}>
            Only list restaurants you own or are authorised to manage.
          </Text>
        </View>

        {/* Overview stats */}
        <Text style={[styles.sectionLabel, { color: tc.textTertiary }]}>OVERVIEW</Text>
        <View style={styles.statsRow}>
          {[
            { icon: "restaurant",        label: "Listed",     value: restaurants.length.toString(),                   color: "#26B324" },
            { icon: "checkmark-circle",  label: "Verified",   value: restaurants.filter((r) => r.verified).length.toString(), color: "#0076EB" },
            { icon: "star-outline",      label: "Avg Rating", value: avgRating.toString(),                             color: "#FF7B00" },
            { icon: "chatbubble-outline",label: "Reviews",    value: totalReviews.toString(),                          color: "#16A34A" },
          ].map((s) => (
            <View key={s.label} style={[styles.overviewCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <View style={[styles.overviewIconBox, { backgroundColor: s.color + "18" }]}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={[styles.overviewValue, { color: tc.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.overviewLabel, { color: tc.textTertiary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Restaurant cards */}
        <Text style={[styles.sectionLabel, { color: tc.textTertiary }]}>MY RESTAURANTS</Text>
        {!loading && restaurants.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: rs(32), gap: rs(8) }}>
            <Ionicons name="restaurant-outline" size={36} color="#D1D5DB" />
            <Text style={{ fontSize: rs(16), fontWeight: "700", color: tc.textPrimary }}>No restaurants yet</Text>
            <Text style={{ fontSize: rs(13), color: tc.textSecondary, textAlign: "center" }}>Tap the + button to list your first restaurant.</Text>
          </View>
        ) : (
          restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))
        )}




        {/* Food safety compliance */}
        <Text style={[styles.sectionLabel, { color: tc.textTertiary }]}>COMPLIANCE & FOOD SAFETY</Text>
        <View style={[styles.complianceCard, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <View style={styles.complianceHeader}>
            <LinearGradient colors={["#26B324", "#1a8a18"]} style={styles.complianceIcon}>
              <Ionicons name="shield-checkmark" size={16} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.complianceTitle, { color: tc.textPrimary }]}>Food Safety Requirements</Text>
          </View>
          {[
            { icon: "checkmark-circle", text: "UK: Food Hygiene Rating (FHRS) certificate required for all listed restaurants", color: "#26B324" },
            { icon: "checkmark-circle", text: "UK: FSA registration mandatory; premises must be registered with your local council", color: "#26B324" },
            { icon: "checkmark-circle", text: "US: Local health department permit required for all food service establishments", color: "#0076EB" },
            { icon: "checkmark-circle", text: "US: FDA food facility registration required for applicable establishments", color: "#0076EB" },
            { icon: "alert-circle",     text: "Allergen information must be accurately listed for all menu items", color: "#FF7B00" },
            { icon: "alert-circle",     text: "Fraudulent listings or false health certification claims result in permanent ban", color: "#DC2626" },
          ].map((item, i) => (
            <View key={i} style={styles.complianceRow}>
              <Ionicons name={item.icon as any} size={14} color={item.color} />
              <Text style={[styles.complianceText, { color: tc.textSecondary }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Help card */}
        <View style={[styles.helpCard, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <Ionicons name="help-circle-outline" size={20} color={Colors.brand.blue} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.helpTitle, isDark && { color: tc.textPrimary }]}>Need help with your restaurant listing?</Text>
            <Text style={[styles.helpDesc, isDark && { color: tc.textSecondary }]}>Contact our team at support@comlinkr.com</Text>
          </View>
          <Pressable onPress={() => router.push("/help-support" as any)}>
            <Text style={styles.helpLink}>Get Help</Text>
          </Pressable>
        </View>

        <View style={{ height: rs(40) }} />
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: "#26B324",
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
  replyBtnText: { fontSize: rs(12), color: "#0076EB", fontWeight: "600" },

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
