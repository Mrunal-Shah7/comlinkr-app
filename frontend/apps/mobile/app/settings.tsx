import { rs } from "../src/utils/responsive";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { FadeImage } from "../components/FadeImage"; // SPRINT-42: use the shared renderer for every settings image.
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Redirect, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import { useAuthStore, type UserBadge, type VerificationStatus } from "../src/store/auth.store";
import { useBlockStore } from "../src/store/block.store";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { ApiError } from "../src/api/client";
import {
  getSettingsAccount,
  getSettingsPrivacy,
  getSettingsBlockedUsers,
  updateSettingsAccount,
  updateSettingsPrivacy,
  unblockSettingsUser,
  requestAccountDeletion,
  type BlockedUserEntry,
} from "../src/api/settings.api";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../src/api/notifications.api";
import { resolveAvatarDisplayUrl } from "../src/api/meProfile.api";
import {
  getMyBadgeStatus,
  userBadgeKeyToApi,
  apiBadgeTypeToUserKey,
  type MyBadgeStatusRow,
  type MyBadgeStatusState,
  type UserBadgeKey,
} from "../src/api/badges.api";
import { getMyListings, listingImageUrlList, subscribeToListingUpdates, type HousingListing } from "../src/api/housing.api"; // SPRINT-42: preview ordered images and live listing updates.
import { getMyRestaurants, type Restaurant } from "../src/api/food.api";
import { showToast } from "../src/shared/ui/Toast";
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';

// Badge config for verification section
const BADGE_ITEMS: {
  key: UserBadgeKey;
  icon: string;
  iconColors: [string, string];
  title: string;
  desc: string;
}[] = [
  {
    key: "landlord",
    icon: "home-outline",
    iconColors: [Colors.brand.blue, "#0052CC"] as [string, string],
    title: "Landlord Badge",
    desc: "Trusted-host badge for your property listings",
  },
  {
    key: "restaurant_owner",
    icon: "restaurant-outline",
    iconColors: [Colors.brand.green, "#256B49"] as [string, string],
    title: "Restaurant Owner Badge",
    desc: "Trusted badge on your restaurant listings",
  },
  {
    key: "agency",
    icon: "business-outline",
    iconColors: [Colors.brand.orange, "#E56800"] as [string, string],
    title: "Agency Badge",
    desc: "Apply for agency-level access",
  },
  {
    key: "local_reviewer",
    icon: "star-outline",
    iconColors: ["#8B5CF6", "#6D3FD1"] as [string, string],
    title: "Local Reviewer Badge",
    desc: "Share trusted reviews in your area",
  },
];

function badgeStatusForKey(rows: MyBadgeStatusRow[] | null, key: UserBadgeKey): MyBadgeStatusState | null {
  if (!rows?.length) return null;
  const api = userBadgeKeyToApi(key);
  return rows.find((r) => r.badgeType === api)?.status ?? null;
}

function badgeActionLabel(status: MyBadgeStatusState | null): string {
  if (status == null) return "…";
  switch (status) {
    case "APPROVED":
      return "Verified";
    case "PENDING":
      return "Pending";
    case "REJECTED":
      return "Re-apply";
    default:
      return "Apply";
  }
}

/** Landlord or Agency badge status — listing is allowed for all signed-in users; badge adds trust */
type ListingAccess = "approved" | "pending" | "none";

function listingAccessState(rows: MyBadgeStatusRow[] | null, isAdmin: boolean): ListingAccess {
  if (isAdmin) return "approved";
  if (!rows?.length) return "none";
  const landlord = rows.find((r) => r.badgeType === "LANDLORD");
  const agency = rows.find((r) => r.badgeType === "AGENCY");
  if ([landlord, agency].some((r) => r?.status === "APPROVED")) return "approved";
  if ([landlord, agency].some((r) => r?.status === "PENDING")) return "pending";
  return "none";
}

function restaurantAccessState(rows: MyBadgeStatusRow[] | null, isAdmin: boolean): ListingAccess {
  if (isAdmin) return "approved";
  if (!rows?.length) return "none";
  const ro = rows.find((r) => r.badgeType === "RESTAURANT_OWNER");
  if (ro?.status === "APPROVED") return "approved";
  if (ro?.status === "PENDING") return "pending";
  return "none";
}

function mediaUrl(path: string | undefined | null): string | null {
  return resolveAvatarDisplayUrl(path ?? null);
}

// ── Pressable settings row card ──────────────────────────
function SettingsRow({
  icon,
  iconColors = [Colors.brand.blue, Colors.brand.green] as [string, string],
  title,
  desc,
  onPress,
  right,
}: {
  icon: string;
  iconColors?: [string, string];
  title: string;
  desc?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const { isDark, tc } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      <View style={s.cardInner}>
        <LinearGradient colors={iconColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
          <Ionicons name={icon as any} size={18} color="#FFF" />
        </LinearGradient>
        <View style={s.cardText}>
          <Text style={[s.cardTitle, { color: tc.textPrimary }]}>{title}</Text>
          {desc ? <Text style={[s.cardDesc, { color: tc.textSecondary }]}>{desc}</Text> : null}
        </View>
        {right !== undefined ? right : (
          <View style={[s.chevronBox, { backgroundColor: isDark ? tc.inputBg : "#F0F3F8" }]}>
            <Ionicons name="chevron-forward" size={14} color={tc.textTertiary} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Toggle row card ──────────────────────────────────────
function ToggleRow({
  icon,
  iconColors = ["#7C3AED", "#A855F7"] as [string, string],
  title,
  desc,
  enabled,
  onToggle,
  disabled,
}: {
  icon: string;
  iconColors?: [string, string];
  title: string;
  desc?: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const { tc } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, disabled && { opacity: 0.65 }]}>
      <View style={s.cardInner}>
        <LinearGradient colors={iconColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
          <Ionicons name={icon as any} size={18} color="#FFF" />
        </LinearGradient>
        <View style={s.cardText}>
          <Text style={[s.cardTitle, { color: tc.textPrimary }]}>{title}</Text>
          {desc ? <Text style={[s.cardDesc, { color: tc.textSecondary }]}>{desc}</Text> : null}
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: "#D1D5DB", true: Colors.brand.blue }}
          thumbColor="#FFF"
        />
      </View>
    </View>
  );
}

// ── Bottom-sheet modal ───────────────────────────────────
function SettingsModal({
  visible, onClose, title, children,
}: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const { tc } = useTheme();
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(showEvt, () => setKbVisible(true));
    const b = Keyboard.addListener(hideEvt, () => setKbVisible(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent>
      {/* "padding" lifts the whole sheet above the keyboard; "height" shrank the overlay and let the keyboard cover inputs. */}
      <KeyboardAvoidingView
        style={s.overlay}
        behavior="padding"
      >
        <View style={[s.sheet, { backgroundColor: tc.sheetBg }, kbVisible && { maxHeight: "92%", paddingBottom: 0 }]}>
          <View style={[s.handle, { backgroundColor: tc.borderMedium }]} />
          <View style={[s.sheetHead, { borderBottomColor: tc.borderLight }]}>
            <Text style={[s.sheetTitle, { color: tc.textPrimary }]}>{title}</Text>
            <Pressable onPress={onClose} style={[s.closeBtn, { backgroundColor: tc.inputBg }]}>
              <Ionicons name="close" size={18} color={tc.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{ flexGrow: 1, paddingBottom: kbVisible ? rs(24) : 0 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Sync badge API rows → auth store so the profile/hamburger-menu always show up-to-date badge status. */
function mapBadgeRowsToUserFields(rows: MyBadgeStatusRow[]): { verificationStatus: Record<UserBadge, VerificationStatus>; badges: UserBadge[] } {
  const verificationStatus: Record<UserBadge, VerificationStatus> = {
    landlord: "none", restaurant_owner: "none", agency: "none", local_reviewer: "none",
  };
  const badges: UserBadge[] = [];
  for (const row of rows) {
    const key = apiBadgeTypeToUserKey(row.badgeType);
    if (row.status === "APPROVED") { verificationStatus[key] = "verified"; badges.push(key); }
    else if (row.status === "PENDING") verificationStatus[key] = "pending";
    else if (row.status === "REJECTED") verificationStatus[key] = "rejected";
    else verificationStatus[key] = "none";
  }
  return { verificationStatus, badges };
}

// ── Main screen ──────────────────────────────────────────
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function SettingsScreen() {
  const { isDark, tc } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const user = useAuthStore((s) => s.user);
  const isAdmin = (user as { role?: string })?.role === "admin" || (user as { role?: string })?.role === "superadmin";

  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const [accountModal, setAccountModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [blockedModal, setBlockedModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const [interestsModal, setInterestsModal] = useState(false);
  const [notifsModal, setNotifsModal] = useState(false);

  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editPassword, setEditPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);

  const [profilePublic, setProfilePublic] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);

  const [notiEvents, setNotiEvents] = useState(true);
  const [notiComments, setNotiComments] = useState(true);
  const [notiLikes, setNotiLikes] = useState(false);
  const [notiMessages, setNotiMessages] = useState(true);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false);

  type DisplayBlockedUser = BlockedUserEntry & { localOnly?: boolean };
  const [blockedRows, setBlockedRows] = useState<DisplayBlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [badgeStatusRows, setBadgeStatusRows] = useState<MyBadgeStatusRow[] | null>(null);
  const [listingPreview, setListingPreview] = useState<HousingListing[]>([]);
  const [restaurantPreview, setRestaurantPreview] = useState<Restaurant[]>([]);
  const [businessPreviewLoading, setBusinessPreviewLoading] = useState(false);

  const firstSettingsLoad = useRef(true);

  const loadSettingsFromApi = useCallback(async () => {
    setLoadError(null);
    if (firstSettingsLoad.current) setSettingsLoading(true);
    try {
      const [notif, privacy, account, badges] = await Promise.all([
        getNotificationPreferences(),
        getSettingsPrivacy(),
        getSettingsAccount(),
        getMyBadgeStatus().catch(() => [] as MyBadgeStatusRow[]),
      ]);
      setBadgeStatusRows(badges);

      // Sync approved badges → auth store so profile/hamburger-menu reflect real backend state
      const { verificationStatus: syncedStatus, badges: syncedBadges } = mapBadgeRowsToUserFields(badges);
      const storeUser = useAuthStore.getState().user;
      if (storeUser) {
        await useAuthStore.getState().applyUser({ ...storeUser, verificationStatus: syncedStatus, badges: syncedBadges });
      }

      const admin =
        (useAuthStore.getState().user as { role?: string } | null)?.role === "admin" ||
        (useAuthStore.getState().user as { role?: string } | null)?.role === "superadmin";
      const la = listingAccessState(badges, admin);
      const ra = restaurantAccessState(badges, admin);
      setBusinessPreviewLoading(true);
      try {
        if (la === "approved") {
          try {
            const lp = await getMyListings({ pageSize: 5 });
            setListingPreview(lp.data);
          } catch {
            setListingPreview([]);
          }
        } else {
          setListingPreview([]);
        }
        if (ra === "approved") {
          try {
            const rp = await getMyRestaurants();
            setRestaurantPreview(rp.slice(0, 5));
          } catch {
            setRestaurantPreview([]);
          }
        } else {
          setRestaurantPreview([]);
        }
      } finally {
        setBusinessPreviewLoading(false);
      }
      setPushEnabled(notif.pushEnabled);
      setEmailEnabled(notif.emailEnabled);
      setNotiEvents(notif.eventsNearby);
      setNotiComments(notif.comments);
      setNotiLikes(notif.likes);
      setNotiMessages(notif.messages);
      setProfilePublic(privacy.publicProfile);
      setShowLocation(privacy.showLocation);
      setShowActivity(privacy.activityStatus);
      setEditEmail(account.email);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load settings.";
      setLoadError(msg);
    } finally {
      setSettingsLoading(false);
      firstSettingsLoad.current = false;
      setSettingsReady(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettingsFromApi();
    }, [loadSettingsFromApi])
  );

  useEffect(() => subscribeToListingUpdates((update) => { // SPRINT-42: patch Settings My Listings preview immediately after edits.
    setListingPreview((prev) => prev.map((row) => { // SPRINT-42: update matching preview rows.
      if (row.id !== update.id) return row; // SPRINT-42: leave other previews alone.
      if (update.listing) return update.listing; // SPRINT-42: replace with the full PATCH response.
      if (update.images) return { ...row, images: update.images }; // SPRINT-42: refresh ordered thumbnails.
      return row; // SPRINT-42: ignore empty events.
    })); // SPRINT-42: finish preview patch.
  }), []); // SPRINT-42: subscribe while Settings is mounted.

  useEffect(() => {
    if (!blockedModal) return;
    let cancelled = false;
    setBlockedLoading(true);

    const mergeBlocked = async () => {
      let apiRows: BlockedUserEntry[] = [];
      try {
        apiRows = await getSettingsBlockedUsers();
      } catch {
        apiRows = [];
      }

      // Merge locally-stored blocked users that aren't already in the API list
      const localUsers = useBlockStore.getState().blockedUsers;
      const apiUserIds = new Set(apiRows.map((r) => r.user.id));
      const localOnlyRows: (BlockedUserEntry & { localOnly: true })[] = localUsers
        .filter((u) => !apiUserIds.has(u.id))
        .map((u) => ({
          id: u.id,
          user: { id: u.id, username: "", name: u.name, avatarUrl: u.avatar ?? null },
          blockedAt: u.blockedAt,
          localOnly: true as const,
        }));

      if (!cancelled) setBlockedRows([...apiRows, ...localOnlyRows]);
    };

    mergeBlocked().finally(() => {
      if (!cancelled) setBlockedLoading(false);
    });

    return () => { cancelled = true; };
  }, [blockedModal]);

  useEffect(() => {
    if (!accountModal) {
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    }
  }, [accountModal]);

  const patchNotifPrefs = useCallback(async (partial: Parameters<typeof updateNotificationPreferences>[0]) => {
    try {
      const next = await updateNotificationPreferences(partial);
      setPushEnabled(next.pushEnabled);
      setEmailEnabled(next.emailEnabled);
      setNotiEvents(next.eventsNearby);
      setNotiComments(next.comments);
      setNotiLikes(next.likes);
      setNotiMessages(next.messages);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Update failed.";
      showToast(msg, "error");
      void loadSettingsFromApi();
    }
  }, [loadSettingsFromApi]);

  const onTogglePush = useCallback(() => {
    const next = !pushEnabled;
    setPushEnabled(next);
    void patchNotifPrefs({ pushEnabled: next });
  }, [pushEnabled, patchNotifPrefs]);

  const onToggleEmail = useCallback(() => {
    const next = !emailEnabled;
    setEmailEnabled(next);
    void patchNotifPrefs({ emailEnabled: next });
  }, [emailEnabled, patchNotifPrefs]);

  const handleLogout = () => {
    appAlert("Log Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => void logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    appAlert(
      "Delete account",
      "Your account will be scheduled for deletion. You will be signed out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: async () => {
            try {
              await requestAccountDeletion();
              await logout();
              router.replace("/(auth)/login" as any);
            } catch (e) {
              const msg = e instanceof ApiError ? e.message : "Request failed.";
              showToast(msg, "error");
            }
          },
        },
      ]
    );
  };

  const handleSaveAccount = async () => {
    if (!editEmail.includes("@")) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    const emailChanged = editEmail.trim().toLowerCase() !== (user?.email || "").toLowerCase();
    const passwordChanged = editPassword.trim().length > 0;
    if (!emailChanged && !passwordChanged) {
      showToast("Change your email or enter a new password, or tap Cancel.", "error");
      return;
    }
    if (!currentPassword.trim()) {
      showToast("Enter your current password to update your account.", "error");
      return;
    }
    setAccountSaving(true);
    try {
      await updateSettingsAccount({
        currentPassword: currentPassword,
        ...(emailChanged ? { newEmail: editEmail.trim().toLowerCase() } : {}),
        ...(passwordChanged ? { newPassword: editPassword.trim() } : {}),
      });
      if (emailChanged && user) {
        await updateProfile({
          name: user.name,
          username: user.username,
          email: editEmail.trim().toLowerCase(),
          bio: user.bio ?? "",
          phone: user.phone ?? "",
          city: user.city ?? "",
          country: user.country ?? "",
          stateProvince: user.stateProvince ?? "",
          vibe: user.vibe ?? [],
          culture: user.culture ?? [],
          interests: user.interests ?? [],
          communities: user.communities ?? [],
        });
      }
      showToast("Account updated successfully.", "success");
      setAccountModal(false);
      setCurrentPassword("");
      setEditPassword("");
      void loadSettingsFromApi();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Update failed.";
      showToast(msg, "error");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    try {
      await updateSettingsPrivacy({
        publicProfile: profilePublic,
        showLocation: showLocation,
        activityStatus: showActivity,
      });
      setPrivacyModal(false);
      showToast("Privacy settings updated.", "success");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Update failed.";
      showToast(msg, "error");
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleSaveNotifCategories = async () => {
    setNotifPrefsSaving(true);
    try {
      await updateNotificationPreferences({
        eventsNearby: notiEvents,
        comments: notiComments,
        likes: notiLikes,
        messages: notiMessages,
      });
      setNotifsModal(false);
      showToast("Notification preferences updated.", "success");
      void loadSettingsFromApi();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Update failed.";
      showToast(msg, "error");
    } finally {
      setNotifPrefsSaving(false);
    }
  };

  const handleUnblock = (row: BlockedUserEntry & { localOnly?: boolean }) => {
    const name = row.user.name || row.user.username;
    appAlert(`Unblock ${name}?`, "They will be able to interact with you again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          try {
            if (!row.localOnly) {
              await unblockSettingsUser(row.user.id);
            }
            // Always clear from local block store as well
            await useBlockStore.getState().unblockUser(row.user.id);
            setBlockedRows((prev) => prev.filter((r) => r.user.id !== row.user.id));
          } catch (e) {
            const msg = e instanceof ApiError ? e.message : "Unblock failed.";
            showToast(msg, "error");
          }
        },
      },
    ]);
  };

  const listingAccess = listingAccessState(badgeStatusRows, isAdmin);
  const restaurantAccess = restaurantAccessState(badgeStatusRows, isAdmin);

  const onPressMyListingsHeader = () => {
    if (listingAccess === "pending") {
      router.push("/verification-status" as any);
      return;
    }
    router.push("/my-listings" as any);
  };

  const onPressMyRestaurantsHeader = () => {
    if (restaurantAccess === "pending") {
      router.push("/verification-status" as any);
      return;
    }
    router.push("/my-restaurants" as any);
  };

  const renderAccessPill = (access: ListingAccess) => {
    if (access === "approved") {
      return (
        <View style={[s.chevronBox, { backgroundColor: isDark ? tc.inputBg : "#F0F3F8" }]}>
          <Ionicons name="chevron-forward" size={14} color={tc.textTertiary} />
        </View>
      );
    }
    if (access === "pending") {
      return (
        <View style={[s.accessStatusPill, { backgroundColor: isDark ? "#2A1A00" : "#FEF3C7", borderColor: "#FDE68A" }]}>
          <Text style={s.accessStatusPillTextPending}>Pending</Text>
        </View>
      );
    }
    return (
      <View style={[s.accessStatusPill, { backgroundColor: isDark ? "#1C1917" : "#F3F4F6", borderColor: tc.borderLight }]}>
        <Text style={s.accessStatusPillTextBlocked}>Optional: verify</Text>
      </View>
    );
  };

  const listingSectionDesc =
    listingAccess === "approved"
      ? businessPreviewLoading
        ? "Loading your listings…"
        : listingPreview.length > 0
          ? `${listingPreview.length} listing${listingPreview.length === 1 ? "" : "s"} on your account`
          : "No listings yet — tap to add one"
      : listingAccess === "pending"
        ? "Landlord or agency verification in progress"
        : "Manage listings — verify for a trusted-host badge";

  const restaurantSectionDesc =
    restaurantAccess === "approved"
      ? businessPreviewLoading
        ? "Loading your restaurants…"
        : restaurantPreview.length > 0
          ? `${restaurantPreview.length} restaurant${restaurantPreview.length === 1 ? "" : "s"} on your account`
          : "No restaurants yet — tap to add one"
      : restaurantAccess === "pending"
        ? "Restaurant owner verification in progress"
        : "Manage restaurants — verify for owner trust badge";

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tc.pageBg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight }]}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any); }} style={({ pressed }) => [s.backBtn, { backgroundColor: tc.iconButtonBg, borderWidth: 1, borderColor: tc.borderLight }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={20} color={Colors.brand.blue} />
        </Pressable>
        <Text style={[s.headerTitle, { color: tc.textPrimary }]}>Settings</Text>
        <View style={{ width: rs(40) }} />
      </View>

      {loadError ? (
        <View style={[s.errorBanner, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={[s.errorBannerText, { color: tc.textSecondary }]}>{loadError}</Text>
        </View>
      ) : null}

      {settingsLoading && !settingsReady ? (
        <View style={s.initialLoading}>
          <ActivityIndicator size="large" color={Colors.brand.blue} />
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1, opacity: settingsLoading && !settingsReady ? 0 : 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        pointerEvents={settingsLoading && !settingsReady ? "none" : "auto"}
      >

        {/* ACCOUNT */}
        <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>ACCOUNT</Text>
        <SettingsRow
          icon="person-outline"
          iconColors={[Colors.brand.blue, "#0052CC"]}
          title="Account details"
          desc="Update email and password"
          onPress={() => setAccountModal(true)}
        />
        <SettingsRow
          icon="id-card-outline"
          iconColors={["#7C3AED", "#A855F7"]}
          title="Profile"
          desc="Edit your public profile"
          onPress={() => router.push("/profile")}
        />

        {/* PREFERENCES */}
        <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>PREFERENCES</Text>
        <SettingsRow
          icon="location-outline"
          iconColors={["#257A86", "#F59E0B"]}
          title="City"
          desc={user?.city || "Update your location"}
          onPress={() => setCityModal(true)}
        />
        <SettingsRow
          icon="sparkles-outline"
          iconColors={["#EC4899", "#F43F5E"]}
          title="Culture & interests"
          desc="Tailor your feed"
          onPress={() => setInterestsModal(true)}
        />

        {/* NOTIFICATIONS */}
        <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>NOTIFICATIONS</Text>
        <ToggleRow
          icon="notifications-outline"
          iconColors={["#257A86", "#F59E0B"]}
          title="Push notifications"
          desc="Event reminders and updates"
          enabled={pushEnabled}
          onToggle={onTogglePush}
          disabled={!settingsReady}
        />
        <ToggleRow
          icon="mail-outline"
          iconColors={[Colors.brand.blue, Colors.brand.green]}
          title="Email updates"
          desc="Summaries and alerts by email"
          enabled={emailEnabled}
          onToggle={onToggleEmail}
          disabled={!settingsReady}
        />
        <SettingsRow
          icon="options-outline"
          iconColors={["#7C3AED", "#6366F1"]}
          title="Notification preferences"
          desc="Manage alerts per category"
          onPress={() => setNotifsModal(true)}
        />

        {/* PRIVACY & SAFETY */}
        <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>PRIVACY & SAFETY</Text>
        <SettingsRow
          icon="lock-closed-outline"
          iconColors={["#16A34A", "#22C55E"]}
          title="Privacy"
          desc="Manage visibility"
          onPress={() => setPrivacyModal(true)}
        />
        <SettingsRow
          icon="shield-outline"
          iconColors={["#DC2626", "#EF4444"]}
          title="Blocked users"
          desc="Manage blocked profiles"
          onPress={() => setBlockedModal(true)}
        />
        <SettingsRow
          icon="document-text-outline"
          iconColors={["#6366F1", "#818CF8"]}
          title="Privacy policy"
          desc="How we handle your data"
          onPress={() => router.push("/privacy-policy" as any)}
        />

        {/* SUPPORT */}
        <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>SUPPORT</Text>
        <SettingsRow
          icon="help-circle-outline"
          iconColors={[Colors.brand.blue, Colors.brand.green]}
          title="Help & Support"
          desc="FAQs and contact"
          onPress={() => router.push("/help-support" as any)}
        />

        {/* ABOUT */}
        <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>ABOUT</Text>
        <SettingsRow
          icon="information-circle-outline"
          iconColors={[Colors.brand.green, "#16A34A"]}
          title="ComLinkr"
          desc={`Version ${APP_VERSION}`}
          right={
            <View style={s.versionBadge}>
              <Text style={s.versionText}>v{APP_VERSION}</Text>
            </View>
          }
        />

        {/* BUSINESS & VERIFICATION */}
        <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>BUSINESS & VERIFICATION</Text>
        <SettingsRow
          icon="shield-checkmark-outline"
          iconColors={[Colors.brand.blue, Colors.brand.green]}
          title="My Verification Status"
          desc={
            badgeStatusRows
              ? (() => {
                  const n = badgeStatusRows.filter((r) => r.status === "PENDING").length;
                  return n > 0 ? `${n} application${n === 1 ? "" : "s"} under review` : "View all badge statuses & applications";
                })()
              : "Loading…"
          }
          onPress={() => router.push("/verification-status" as any)}
          right={
            <View style={s.verifyStatusBadge}>
              <Ionicons name="checkmark-circle" size={13} color={Colors.brand.green} />
              <Text style={s.verifyStatusText}>View All</Text>
            </View>
          }
        />
        {BADGE_ITEMS.map((badge) => {
          const st = badgeStatusForKey(badgeStatusRows, badge.key);
          const label = badgeActionLabel(st);
          const canOpenApply = st === "NOT_APPLIED" || st === "REJECTED" || st === null;
          const labelColor =
            st === "APPROVED" ? Colors.brand.green : st === "PENDING" ? "#D97706" : Colors.brand.blue;
          return (
            <SettingsRow
              key={badge.key}
              icon={badge.icon}
              iconColors={badge.iconColors}
              title={badge.title}
              desc={badge.desc}
              onPress={() => {
                if (canOpenApply) {
                  router.push({ pathname: "/apply-badge" as any, params: { badgeType: badge.key } });
                } else {
                  router.push("/verification-status" as any);
                }
              }}
              right={
                <View style={[s.applyBadgeBtn, st === "APPROVED" && { backgroundColor: "#E3F1EA", borderColor: "#BBF7D0" }]}>
                  <Text style={[s.applyBadgeBtnText, { color: labelColor }]}>{label}</Text>
                </View>
              }
            />
          );
        })}
        <View style={[s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <TouchableOpacity onPress={onPressMyListingsHeader} activeOpacity={0.75}>
            <View style={s.cardInner}>
              <LinearGradient colors={[Colors.brand.blue, "#0052CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
                <Ionicons name="list-outline" size={18} color="#FFF" />
              </LinearGradient>
              <View style={s.cardText}>
                <Text style={[s.cardTitle, { color: tc.textPrimary }]}>My Listings</Text>
                <Text style={[s.cardDesc, { color: tc.textSecondary }]}>{listingSectionDesc}</Text>
              </View>
              {renderAccessPill(listingAccess)}
            </View>
          </TouchableOpacity>
          {listingAccess === "approved" && (
            <View style={[s.bizPreviewSection, { borderTopColor: tc.borderLight }]}>
              {businessPreviewLoading ? (
                <View style={s.bizPreviewLoading}>
                  <ActivityIndicator size="small" color={Colors.brand.blue} />
                </View>
              ) : listingPreview.length === 0 ? (
                <Text style={[s.bizPreviewEmpty, { color: tc.textTertiary }]}>No property listings yet.</Text>
              ) : (
                listingPreview.map((l) => {
                  const thumbFirst = listingImageUrlList(l.images)[0];
                  const thumb = thumbFirst ? mediaUrl(thumbFirst) : null;
                  return (
                    <TouchableOpacity
                      key={l.id}
                      activeOpacity={0.75}
                      onPress={() => router.push("/my-listings" as any)}
                      style={s.bizPreviewRow}
                    >
                      {thumb ? (
                        <FadeImage // SPRINT-42: render the order-sorted listing preview through FadeImage.
                          uri={thumb} // SPRINT-42: pass the canonical primary listing URL.
                          style={s.bizPreviewThumb}
                        />
                      ) : (
                        <View style={[s.bizPreviewThumb, s.bizPreviewThumbPh, { backgroundColor: tc.inputBg }]}>
                          <Ionicons name="home-outline" size={16} color={tc.textTertiary} />
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[s.bizPreviewTitle, { color: tc.textPrimary }]}>
                          {l.title}
                        </Text>
                        <Text numberOfLines={1} style={[s.bizPreviewSub, { color: tc.textSecondary }]}>
                          {l.location || l.address || "—"}
                        </Text>
                      </View>
                      <Text style={[s.bizPreviewMeta, { color: tc.textTertiary }]}>
                        {typeof l.price === "number" ? `$${l.price}` : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>

        <View style={[s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <TouchableOpacity onPress={onPressMyRestaurantsHeader} activeOpacity={0.75}>
            <View style={s.cardInner}>
              <LinearGradient colors={[Colors.brand.green, "#256B49"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
                <Ionicons name="fast-food-outline" size={18} color="#FFF" />
              </LinearGradient>
              <View style={s.cardText}>
                <Text style={[s.cardTitle, { color: tc.textPrimary }]}>My Restaurants</Text>
                <Text style={[s.cardDesc, { color: tc.textSecondary }]}>{restaurantSectionDesc}</Text>
              </View>
              {renderAccessPill(restaurantAccess)}
            </View>
          </TouchableOpacity>
          {restaurantAccess === "approved" && (
            <View style={[s.bizPreviewSection, { borderTopColor: tc.borderLight }]}>
              {businessPreviewLoading ? (
                <View style={s.bizPreviewLoading}>
                  <ActivityIndicator size="small" color={Colors.brand.green} />
                </View>
              ) : restaurantPreview.length === 0 ? (
                <Text style={[s.bizPreviewEmpty, { color: tc.textTertiary }]}>No restaurants yet.</Text>
              ) : (
                restaurantPreview.map((r) => {
                  const thumb = r.image ? mediaUrl(r.image) : null;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      activeOpacity={0.75}
                      onPress={() => router.push("/my-restaurants" as any)}
                      style={s.bizPreviewRow}
                    >
                      {thumb ? (
                        <FadeImage // SPRINT-42: keep all settings previews on the shared image component.
                          uri={thumb} // SPRINT-42: pass the restaurant preview URL.
                          style={s.bizPreviewThumb}
                        />
                      ) : (
                        <View style={[s.bizPreviewThumb, s.bizPreviewThumbPh, { backgroundColor: tc.inputBg }]}>
                          <Ionicons name="restaurant-outline" size={16} color={tc.textTertiary} />
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[s.bizPreviewTitle, { color: tc.textPrimary }]}>
                          {r.name}
                        </Text>
                        <Text numberOfLines={1} style={[s.bizPreviewSub, { color: tc.textSecondary }]}>
                          {[r.cuisine, r.city].filter(Boolean).join(" · ") || "—"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={tc.textTertiary} />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* ADMIN PANEL (admin/superadmin only) */}
        {isAdmin && (
          <>
            <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>ADMINISTRATION</Text>
            <SettingsRow
              icon="shield-half-outline"
              iconColors={["#0F172A", "#1E293B"]}
              title="Admin Dashboard"
              desc="Manage users, content & platform"
              onPress={() => router.push("/admin" as any)}
              right={
                <View style={[s.adminBadge]}>
                  <Text style={s.adminBadgeText}>ADMIN</Text>
                </View>
              }
            />
          </>
        )}

        {/* DANGER ZONE */}
        <Text style={[s.sectionLabel, { color: tc.textTertiary }]}>DANGER ZONE</Text>

        <TouchableOpacity onPress={handleLogout} activeOpacity={0.85} style={[s.dangerBtn, { backgroundColor: isDark ? "#1A0A0A" : "#FFF5F5", borderColor: isDark ? "#3D1515" : "#FECACA" }]}>
          <View style={s.dangerBtnInner}>
            <View style={[s.dangerIconBox, { backgroundColor: isDark ? "#3D1515" : "#FEE2E2" }]}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.dangerBtnTitle}>Log out</Text>
              <Text style={[s.dangerBtnDesc, { color: isDark ? "#F87171" : "#EF4444" }]}>Sign out of your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDeleteAccount} activeOpacity={0.85} style={[s.dangerBtn, s.deleteBtnBorder, { backgroundColor: isDark ? "#1A0A0A" : "#FFF5F5", borderColor: isDark ? "#5A1515" : "#FCA5A5" }]}>
          <View style={s.dangerBtnInner}>
            <View style={[s.dangerIconBox, { backgroundColor: isDark ? "#5A1515" : "#FEE2E2" }]}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.dangerBtnTitle}>Delete account</Text>
              <Text style={[s.dangerBtnDesc, { color: isDark ? "#F87171" : "#EF4444" }]}>Permanently remove your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </View>
        </TouchableOpacity>

        <View style={{ height: rs(32) }} />
        <View style={{ alignItems: "center", paddingBottom: rs(20), gap: rs(3) }}>
          <Text style={{ fontSize: rs(11), color: tc.textTertiary, fontWeight: "600" }}>© 2026 ComLinkr Ltd.</Text>
          <Text style={{ fontSize: rs(10), color: tc.textTertiary, fontWeight: "500" }}>All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* ── Account Modal ── */}
      <SettingsModal visible={accountModal} onClose={() => setAccountModal(false)} title="Account Details">
        <View style={s.modalBody}>
          <Text style={[s.helperNote, { color: tc.textSecondary }]}>
            Enter your current password to change your email or set a new password.
          </Text>
          <Text style={[s.inputLabel, { color: tc.textPrimary }]}>Current password</Text>
          <View style={[s.inputRow, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
            <TextInput
              style={[s.inputInRow, { color: tc.textPrimary }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Required for any change"
              placeholderTextColor={tc.textTertiary}
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => setShowCurrentPassword((v) => !v)}
              hitSlop={10}
              accessibilityLabel={showCurrentPassword ? "Hide password" : "Show password"}
              style={s.inputEyeBtn}
            >
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={tc.textSecondary}
              />
            </Pressable>
          </View>
          <Text style={[s.inputLabel, { marginTop: rs(16), color: tc.textPrimary }]}>Email</Text>
          <TextInput
            style={[s.input, { backgroundColor: tc.inputBg, borderColor: tc.borderLight, color: tc.textPrimary }]}
            value={editEmail}
            onChangeText={setEditEmail}
            placeholder="your@email.com"
            placeholderTextColor={tc.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={[s.inputLabel, { marginTop: rs(16), color: tc.textPrimary }]}>New password (optional)</Text>
          <View style={[s.inputRow, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
            <TextInput
              style={[s.inputInRow, { color: tc.textPrimary }]}
              value={editPassword}
              onChangeText={setEditPassword}
              placeholder="Leave blank to keep current"
              placeholderTextColor={tc.textTertiary}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => setShowNewPassword((v) => !v)}
              hitSlop={10}
              accessibilityLabel={showNewPassword ? "Hide new password" : "Show new password"}
              style={s.inputEyeBtn}
            >
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={tc.textSecondary}
              />
            </Pressable>
          </View>
          <Pressable onPress={() => void handleSaveAccount()} style={[s.saveBtn, accountSaving && { opacity: 0.75 }]} disabled={accountSaving}>
            {accountSaving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </Pressable>
        </View>
      </SettingsModal>

      {/* ── Privacy Modal ── */}
      <SettingsModal visible={privacyModal} onClose={() => setPrivacyModal(false)} title="Privacy Settings">
        <View style={s.modalBody}>
          <ToggleRow
            icon="person-outline"
            title="Public profile"
            desc="Others can see your profile"
            enabled={profilePublic}
            onToggle={() => setProfilePublic((p) => !p)}
            disabled={privacySaving}
          />
          <ToggleRow
            icon="location-outline"
            iconColors={["#257A86", "#F59E0B"]}
            title="Show location"
            desc="Display city on profile"
            enabled={showLocation}
            onToggle={() => setShowLocation((p) => !p)}
            disabled={privacySaving}
          />
          <ToggleRow
            icon="flash-outline"
            iconColors={["#16A34A", "#22C55E"]}
            title="Activity status"
            desc="Show when you're online"
            enabled={showActivity}
            onToggle={() => setShowActivity((p) => !p)}
            disabled={privacySaving}
          />
          <Pressable onPress={() => void handleSavePrivacy()} style={[s.saveBtn, privacySaving && { opacity: 0.75 }]} disabled={privacySaving}>
            {privacySaving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Save</Text>}
          </Pressable>
        </View>
      </SettingsModal>

      {/* ── Blocked Users Modal ── */}
      <SettingsModal visible={blockedModal} onClose={() => setBlockedModal(false)} title="Blocked Users">
        <View style={s.modalBody}>
          {blockedLoading ? (
            <View style={{ paddingVertical: rs(28), alignItems: "center" }}>
              <ActivityIndicator color={Colors.brand.blue} />
            </View>
          ) : blockedRows.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: rs(32) }}>
              <Text style={{ fontSize: rs(40), marginBottom: rs(12) }}>🛡️</Text>
              <Text style={{ fontSize: rs(16), fontWeight: "700", color: tc.textPrimary, marginBottom: rs(4) }}>No blocked users</Text>
              <Text style={{ fontSize: rs(13), color: tc.textSecondary, textAlign: "center", lineHeight: rs(18) }}>
                When you block someone from their profile, they appear here. They cannot see your profile or message you.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: rs(12), color: tc.textTertiary, marginBottom: rs(12), lineHeight: rs(17) }}>
                Blocked users cannot see your posts or interact with you. You can unblock them at any time.
              </Text>
              {blockedRows.map((row) => {
                const avatarUri = resolveAvatarDisplayUrl(row.user.avatarUrl);
                return (
                  <View key={row.id} style={[s.blockedRow, { borderBottomColor: tc.borderLight }]}>
                    {avatarUri ? (
                      <FadeImage // SPRINT-42: keep blocked-user avatars on the shared image component.
                        uri={avatarUri} // SPRINT-42: pass the resolved avatar URL.
                        style={s.blockedAvatarImg}
                      />
                    ) : (
                      <View style={[s.blockedAvatar, { backgroundColor: isDark ? tc.inputBg : "#E5E7EB" }]}>
                        <Ionicons name="person" size={18} color={tc.textTertiary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: rs(14), fontWeight: "700", color: tc.textPrimary }}>{row.user.name}</Text>
                      <Text style={{ fontSize: rs(11), color: tc.textTertiary, marginTop: rs(1) }}>@{row.user.username}</Text>
                      <Text style={{ fontSize: rs(11), color: tc.textTertiary, marginTop: rs(2) }}>
                        Blocked {new Date(row.blockedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Pressable style={s.unblockBtn} onPress={() => handleUnblock(row)}>
                      <Text style={s.unblockBtnText}>Unblock</Text>
                    </Pressable>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </SettingsModal>

      {/* ── City Modal ── */}
      <SettingsModal visible={cityModal} onClose={() => setCityModal(false)} title="Your City">
        <View style={s.modalBody}>
          <Text style={{ fontSize: rs(14), color: tc.textSecondary, marginBottom: rs(12) }}>
            Current city: <Text style={{ fontWeight: "700", color: tc.textPrimary }}>{user?.city || "Not set"}</Text>
          </Text>
          <Text style={{ fontSize: rs(13), color: tc.textSecondary, lineHeight: rs(18) }}>
            Your city determines the local content you see across Explore, Listings, Food and Community.
          </Text>
          <Pressable
            onPress={() => { setCityModal(false); router.push("/edit-profile" as any); }}
            style={s.saveBtn}
            accessibilityRole="button"
            accessibilityLabel={user?.city ? "Change your city" : "Set your city"}
          >
            <Text style={s.saveBtnText}>{user?.city ? "Change city" : "Set your city"}</Text>
          </Pressable>
        </View>
      </SettingsModal>

      {/* ── Culture & Interests Modal ── */}
      <SettingsModal visible={interestsModal} onClose={() => setInterestsModal(false)} title="Culture & Interests">
        <View style={s.modalBody}>
          <Text style={{ fontSize: rs(13), color: tc.textSecondary, lineHeight: rs(18), marginBottom: rs(12) }}>
            Your interests help us show you the most relevant content.
          </Text>
          {(user?.interests && (user.interests as string[]).length > 0) ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(8), marginBottom: rs(16) }}>
              {(user.interests as string[]).map((interest) => (
                <View key={interest} style={[s.pill, isDark && { backgroundColor: tc.inputBg }]}>
                  <Text style={[s.pillText, isDark && { color: tc.textPrimary }]}>{interest}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: rs(13), color: tc.textTertiary, marginBottom: rs(16) }}>
              No interests added yet. Edit your profile to add them.
            </Text>
          )}
          <Pressable
            onPress={() => { setInterestsModal(false); router.push("/edit-profile" as any); }}
            style={s.saveBtn}
          >
            <Text style={s.saveBtnText}>Edit in Profile</Text>
          </Pressable>
        </View>
      </SettingsModal>

      {/* ── Notification Preferences Modal ── */}
      <SettingsModal visible={notifsModal} onClose={() => setNotifsModal(false)} title="Notification Preferences">
        <View style={s.modalBody}>
          <ToggleRow
            icon="calendar-outline"
            iconColors={[Colors.brand.blue, Colors.brand.green]}
            title="Events nearby"
            desc="New events in your area"
            enabled={notiEvents}
            onToggle={() => setNotiEvents((p) => !p)}
            disabled={notifPrefsSaving}
          />
          <ToggleRow
            icon="chatbubble-outline"
            iconColors={["#7C3AED", "#A855F7"]}
            title="Comments"
            desc="Replies to your posts"
            enabled={notiComments}
            onToggle={() => setNotiComments((p) => !p)}
            disabled={notifPrefsSaving}
          />
          <ToggleRow
            icon="heart-outline"
            iconColors={["#EC4899", "#F43F5E"]}
            title="Likes"
            desc="When someone likes your post"
            enabled={notiLikes}
            onToggle={() => setNotiLikes((p) => !p)}
            disabled={notifPrefsSaving}
          />
          <ToggleRow
            icon="mail-outline"
            iconColors={[Colors.brand.blue, "#0052CC"]}
            title="Messages"
            desc="Direct messages"
            enabled={notiMessages}
            onToggle={() => setNotiMessages((p) => !p)}
            disabled={notifPrefsSaving}
          />
          <Pressable onPress={() => void handleSaveNotifCategories()} style={[s.saveBtn, notifPrefsSaving && { opacity: 0.75 }]} disabled={notifPrefsSaving}>
            {notifPrefsSaving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Save</Text>}
          </Pressable>
        </View>
      </SettingsModal>
    </SafeAreaView>
  );
}

const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: "#F0F3F8" },
  content: { paddingHorizontal: rs(16), paddingTop: rs(8) },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  errorBannerText: { flex: 1, fontSize: rs(13), fontWeight: "600" },
  initialLoading: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: rs(48) },
  helperNote: { fontSize: rs(13), lineHeight: rs(18), marginBottom: rs(14) },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: rs(16), paddingVertical: rs(14),
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#EEF0F4",
  },
  backBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: "#F0F5FF",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: rs(18), fontWeight: "800", color: Colors.text.primary, letterSpacing: -0.3 },

  // Section label
  sectionLabel: {
    fontSize: rs(11), fontWeight: "700", color: "#8FA0B4",
    letterSpacing: 1.2, marginTop: rs(22), marginBottom: rs(10),
  },

  // Card shell (handles shadow + bg + border + radius)
  card: {
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    marginBottom: rs(8),
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: rs(8),
    shadowOffset: { width: 0, height: rs(2) },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },

  // Inner row (always horizontal)
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rs(13),
    paddingHorizontal: rs(14),
    gap: rs(14),
  },

  iconBox: {
    width: rs(38), height: rs(38), borderRadius: rs(11),
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: rs(14), fontWeight: "700", color: Colors.text.primary },
  cardDesc: { fontSize: rs(12), color: Colors.text.secondary, marginTop: rs(1) },
  chevronBox: {
    width: rs(26), height: rs(26), borderRadius: rs(8),
    backgroundColor: "#F0F3F8",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  // Version badge
  versionBadge: {
    backgroundColor: "#EEF5FF", borderRadius: rs(20),
    paddingHorizontal: rs(12), paddingVertical: rs(4),
  },
  versionText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },

  // Danger cards
  dangerCard: { borderColor: "#FECACA" },
  deleteCard: { borderColor: "#FCA5A5" },
  dangerBtn: {
    borderRadius: rs(16), borderWidth: 1.5,
    marginBottom: rs(10), overflow: "hidden",
  },
  deleteBtnBorder: { borderColor: "#FCA5A5" },
  dangerBtnInner: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: rs(16), paddingVertical: rs(14), gap: rs(12),
  },
  dangerIconBox: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  dangerBtnTitle: { fontSize: rs(15), fontWeight: "700", color: "#DC2626" },
  dangerBtnDesc: { fontSize: rs(12), fontWeight: "500", marginTop: rs(2) },

  // Modal
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: rs(26), borderTopRightRadius: rs(26),
    maxHeight: "82%", paddingBottom: rs(36),
  },
  handle: {
    width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: "#D1D5DB",
    alignSelf: "center", marginTop: rs(10), marginBottom: rs(6),
  },
  sheetHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: rs(20), paddingVertical: rs(14),
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  sheetTitle: { fontSize: rs(17), fontWeight: "800", color: Colors.text.primary },
  closeBtn: {
    width: rs(32), height: rs(32), borderRadius: rs(16),
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  modalBody: { padding: rs(20) },
  blockedRow: { flexDirection: "row", alignItems: "center", gap: rs(12), paddingVertical: rs(12), borderBottomWidth: StyleSheet.hairlineWidth },
  blockedAvatar: { width: rs(42), height: rs(42), borderRadius: rs(21), alignItems: "center", justifyContent: "center" },
  blockedAvatarImg: { width: rs(42), height: rs(42), borderRadius: rs(21), backgroundColor: "#E5E7EB" },
  unblockBtn: { paddingHorizontal: rs(14), paddingVertical: rs(6), borderRadius: rs(8), backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  unblockBtnText: { fontSize: rs(12), fontWeight: "700", color: "#374151" },

  inputLabel: { fontSize: rs(13), fontWeight: "600", color: Colors.text.primary, marginBottom: rs(6) },
  input: {
    backgroundColor: "#F3F4F6", borderRadius: rs(12),
    paddingHorizontal: rs(14), paddingVertical: rs(12),
    fontSize: rs(15), color: Colors.text.primary,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: rs(12),
    borderWidth: 1,
    paddingRight: rs(4),
  },
  inputInRow: {
    flex: 1,
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    fontSize: rs(15),
  },
  inputEyeBtn: { padding: rs(8), justifyContent: "center", alignItems: "center" },
  saveBtn: {
    marginTop: rs(20), backgroundColor: Colors.brand.blue,
    borderRadius: rs(14), paddingVertical: rs(14), alignItems: "center",
  },
  saveBtnText: { fontSize: rs(15), fontWeight: "700", color: "#FFF" },

  pill: { backgroundColor: "#EEF5FF", borderRadius: rs(20), paddingHorizontal: rs(14), paddingVertical: rs(6) },
  pillText: { fontSize: rs(13), fontWeight: "600", color: Colors.brand.blue },

  // Verification status "View All" badge
  verifyStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    backgroundColor: "#E3F1EA",
    borderRadius: rs(20),
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
  },
  verifyStatusText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.green },

  // Apply badge button
  applyBadgeBtn: {
    backgroundColor: Colors.brand.blueLight,
    borderRadius: rs(10),
    paddingHorizontal: rs(12),
    paddingVertical: rs(5),
    borderWidth: 1,
    borderColor: "#C8DEFF",
  },
  applyBadgeBtnText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },

  accessStatusPill: {
    borderRadius: rs(10),
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderWidth: 1,
    flexShrink: 0,
  },
  accessStatusPillTextPending: { fontSize: rs(12), fontWeight: "800", color: "#D97706" },
  accessStatusPillTextBlocked: { fontSize: rs(10), fontWeight: "900", color: "#9CA3AF", letterSpacing: 0.3 },

  bizPreviewSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: rs(12),
    paddingBottom: rs(10),
    paddingTop: rs(4),
  },
  bizPreviewLoading: { paddingVertical: rs(14), alignItems: "center" },
  bizPreviewEmpty: { fontSize: rs(12), paddingVertical: rs(10), paddingHorizontal: rs(4) },
  bizPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    paddingVertical: rs(10),
    paddingHorizontal: rs(4),
  },
  bizPreviewThumb: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(10),
    backgroundColor: "#E5E7EB",
  },
  bizPreviewThumbPh: { alignItems: "center", justifyContent: "center" },
  bizPreviewTitle: { fontSize: rs(13), fontWeight: "700" },
  bizPreviewSub: { fontSize: rs(11), marginTop: rs(2) },
  bizPreviewMeta: { fontSize: rs(12), fontWeight: "700" },

  // Admin badge
  adminBadge: {
    backgroundColor: "#0F172A",
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
  },
  adminBadgeText: { fontSize: rs(10), fontWeight: "900", color: "#FFF", letterSpacing: 0.8 },
});
