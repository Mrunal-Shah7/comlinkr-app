import { palette } from "../src/theme/palette";
import { Switch } from "../src/shared/ui/Switch";
import { rs } from "../src/utils/responsive";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
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
import { useThemeStore } from "../src/store/theme.store";
import { TYPE } from "../src/theme/d";
import { GradientButton, Reveal } from "../src/shared/d";
import { DPage, goBackOr } from "../src/shared/d/Page";

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
    iconColors: [Colors.brand.blue, palette.blueL40] as [string, string],
    title: "Landlord Badge",
    desc: "Trusted-host badge for your property listings",
  },
  {
    key: "restaurant_owner",
    icon: "restaurant-outline",
    iconColors: [Colors.brand.green, palette.brandGreenDark] as [string, string],
    title: "Restaurant Owner Badge",
    desc: "Trusted badge on your restaurant listings",
  },
  {
    key: "agency",
    icon: "business-outline",
    iconColors: [Colors.brand.orange, palette.orangeL45] as [string, string],
    title: "Agency Badge",
    desc: "Apply for agency-level access",
  },
  {
    key: "local_reviewer",
    icon: "star-outline",
    iconColors: [palette.violet500, palette.legacyPurple] as [string, string],
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

// ── Rows (design D, plan 01) ──────────────────────────
const D_ROW = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 56 };
function SettingsRow({
  icon, title, desc, onPress, right, first,
}: {
  icon: string;
  iconColors?: [string, string];
  title: string;
  desc?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  first?: boolean;
}) {
  const { tc } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={title}
      style={({ pressed }) => [D_ROW, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }, pressed && { backgroundColor: tc.inputBg }]}>
      <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
        <Ionicons name={icon as any} size={17} color={tc.accentText} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[TYPE.body, { color: tc.textPrimary }]} numberOfLines={1}>{title}</Text>
        {desc ? <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={2}>{desc}</Text> : null}
      </View>
      {right !== undefined ? right : <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />}
    </Pressable>
  );
}

function ToggleRow({
  icon, title, desc, enabled, onToggle, disabled, first,
}: {
  icon: string;
  iconColors?: [string, string];
  title: string;
  desc?: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  first?: boolean;
}) {
  const { tc } = useTheme();
  return (
    <View style={[D_ROW, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }, disabled && { opacity: 0.65 }]}>
      <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tc.accentSoft }}>
        <Ionicons name={icon as any} size={17} color={tc.accentText} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[TYPE.body, { color: tc.textPrimary }]} numberOfLines={1}>{title}</Text>
        {desc ? <Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={2}>{desc}</Text> : null}
      </View>
      <Switch value={enabled} onValueChange={onToggle} disabled={disabled} accessibilityLabel={title} />
    </View>
  );
}

function DangerRow({ icon, title, onPress, first }: { icon: string; title: string; onPress: () => void; first?: boolean }) {
  const { tc } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}
      style={({ pressed }) => [D_ROW, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }, pressed && { backgroundColor: tc.inputBg }]}>
      <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239,68,68,0.12)" }}>
        <Ionicons name={icon as any} size={17} color={tc.dangerText} />
      </View>
      <Text style={[TYPE.body, { flex: 1, color: tc.dangerText }]}>{title}</Text>
    </Pressable>
  );
}

/** A labelled group: one rounded card, rows separated by hairlines (the first row gets `first`). */
function Group({ label, i = 0, children }: { label?: string; i?: number; children: React.ReactNode }) {
  const { tc } = useTheme();
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<{ first?: boolean }>[];
  if (items.length === 0) return null;
  return (
    <Reveal i={i} style={{ marginBottom: 18 }}>
      {label ? <Text style={[TYPE.overline, { color: tc.textTertiary, marginLeft: 14, marginBottom: 6 }]}>{label}</Text> : null}
      <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
        {items.map((c, k) => React.cloneElement(c, { first: k === 0 }))}
      </View>
    </Reveal>
  );
}
/** A row block with extra content under it (business previews). */
function Block({ first, children }: { first?: boolean; children: React.ReactNode }) {
  const { tc } = useTheme();
  return <View style={!first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight } : undefined}>{children}</View>;
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
    const showEvt = process.env.EXPO_OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = process.env.EXPO_OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
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
        <View style={[s.sheet, { backgroundColor: tc.sheetBg, borderTopLeftRadius: 30, borderTopRightRadius: 30 }, kbVisible && { maxHeight: "92%", paddingBottom: 0 }]}>
          <View style={[s.handle, { backgroundColor: tc.borderMedium }]} />
          <View style={[s.sheetHead, { borderBottomColor: tc.borderLight }]}>
            <Text style={[TYPE.section, { color: tc.textPrimary, flex: 1 }]}>{title}</Text>
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
    if (access === "approved") return <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />;
    const pending = access === "pending";
    return (
      <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: pending ? tc.warningBg : tc.inputBg }}>
        <Text style={[TYPE.label, { color: pending ? tc.warningText : tc.textSecondary }]}>{pending ? "Pending" : "Optional: verify"}</Text>
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

  const pendingBadges = badgeStatusRows ? badgeStatusRows.filter((r) => r.status === "PENDING").length : 0;
  return (
    <>
    <DPage title="Settings" onBack={() => goBackOr("/(tabs)/feed")}>
      {loadError ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: tc.warningBg }}>
          <Ionicons name="alert-circle-outline" size={18} color={tc.warningText} />
          <Text style={[TYPE.small, { flex: 1, color: tc.warningText }]}>{loadError}</Text>
        </View>
      ) : null}

      {settingsLoading && !settingsReady ? (
        <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 48 }} />
      ) : (
      <View style={{ paddingHorizontal: 16 }}>
        <Group label="Account" i={0}>
          <SettingsRow icon="person-outline" title="Account details" desc="Email and password" onPress={() => setAccountModal(true)} />
          <SettingsRow icon="id-card-outline" title="Profile" desc="Edit your public profile" onPress={() => router.push("/profile")} />
          <SettingsRow icon="location-outline" title="City" onPress={() => setCityModal(true)}
            right={<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Text style={[TYPE.small, { color: tc.textTertiary }]} numberOfLines={1}>{user?.city || "Not set"}</Text><Ionicons name="chevron-forward" size={16} color={tc.textTertiary} /></View>} />
          <SettingsRow icon="sparkles-outline" title="Culture and interests" onPress={() => setInterestsModal(true)} />
        </Group>

        <Group label="Notifications" i={1}>
          <ToggleRow icon="notifications-outline" title="Push notifications" desc="Event reminders and updates" enabled={pushEnabled} onToggle={onTogglePush} disabled={!settingsReady} />
          <ToggleRow icon="mail-outline" title="Email updates" desc="Summaries and alerts by email" enabled={emailEnabled} onToggle={onToggleEmail} disabled={!settingsReady} />
          <SettingsRow icon="options-outline" title="Notification preferences" desc="Choose what alerts you" onPress={() => setNotifsModal(true)} />
        </Group>

        <Group label="Appearance" i={2}>
          <ToggleRow icon={isDark ? "moon-outline" : "sunny-outline"} title="Dark mode" enabled={isDark} onToggle={() => useThemeStore.getState().toggle()} />
        </Group>

        <Group label="Privacy and safety" i={3}>
          <SettingsRow icon="eye-outline" title="Privacy" desc="Who can see you" onPress={() => setPrivacyModal(true)} />
          <SettingsRow icon="ban-outline" title="Blocked people" onPress={() => setBlockedModal(true)} />
          <SettingsRow icon="shield-checkmark-outline" title="Badges and verification"
            desc={badgeStatusRows ? (pendingBadges > 0 ? `${pendingBadges} application${pendingBadges === 1 ? "" : "s"} under review` : "See your badge applications") : "Loading…"}
            onPress={() => router.push("/verification-status" as any)} />
        </Group>

        <Group label="Badges" i={4}>
          {BADGE_ITEMS.map((badge) => {
            const st = badgeStatusForKey(badgeStatusRows, badge.key);
            const label = badgeActionLabel(st);
            const canOpenApply = st === "NOT_APPLIED" || st === "REJECTED" || st === null;
            const bg = st === "APPROVED" ? tc.mintSoft : st === "PENDING" ? tc.warningBg : tc.accentSoft;
            const fg = st === "APPROVED" ? tc.successText : st === "PENDING" ? tc.warningText : tc.accentText;
            return (
              <SettingsRow
                key={badge.key}
                icon={badge.icon}
                title={badge.title.replace(/ Badge$/, "")}
                desc={badge.desc}
                onPress={() => {
                  if (canOpenApply) router.push({ pathname: "/apply-badge" as any, params: { badgeType: badge.key } });
                  else router.push("/verification-status" as any);
                }}
                right={<View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: bg }}><Text style={[TYPE.label, { color: fg }]}>{label}</Text></View>}
              />
            );
          })}
        </Group>

        <Group label="Your business" i={5}>
          <Block>
            <SettingsRow first icon="home-outline" title="My listings" desc={listingSectionDesc} onPress={onPressMyListingsHeader} right={renderAccessPill(listingAccess)} />
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
            </Block>
          <Block>
            <SettingsRow first icon="restaurant-outline" title="My restaurants" desc={restaurantSectionDesc} onPress={onPressMyRestaurantsHeader} right={renderAccessPill(restaurantAccess)} />
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
            </Block>
        </Group>

        <Group label="About" i={6}>
          <SettingsRow icon="help-circle-outline" title="Help" onPress={() => router.push("/help-support" as any)} />
          <SettingsRow icon="document-text-outline" title="Terms and privacy" onPress={() => router.push("/privacy-policy" as any)} />
          <SettingsRow icon="information-circle-outline" title="Comlinkr" right={<Text style={[TYPE.small, { color: tc.textTertiary }]}>v{APP_VERSION}</Text>} />
        </Group>

        {isAdmin ? (
          <Group label="Administration" i={7}>
            <SettingsRow icon="shield-half-outline" title="Admin dashboard" desc="Users, content and the platform" onPress={() => router.push("/admin" as any)} />
          </Group>
        ) : null}

        <Reveal i={8} style={{ marginBottom: 18 }}>
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
            <DangerRow first icon="log-out-outline" title="Log out" onPress={handleLogout} />
            <DangerRow icon="trash-outline" title="Delete account" onPress={handleDeleteAccount} />
          </View>
        </Reveal>

        <Text style={[TYPE.small, { color: tc.textTertiary, textAlign: "center", fontSize: 11.5, marginTop: 6 }]}>© 2026 ComLinkr Ltd. All rights reserved.</Text>
      </View>
      )}
    </DPage>

      {/* ── Account Modal ── */}
      <SettingsModal visible={accountModal} onClose={() => setAccountModal(false)} title="Account details">
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
          <GradientButton block label="Save Changes" loading={accountSaving} onPress={() => void handleSaveAccount()} style={{ marginTop: 20 }} />
        </View>
      </SettingsModal>

      {/* ── Privacy Modal ── */}
      <SettingsModal visible={privacyModal} onClose={() => setPrivacyModal(false)} title="Privacy">
        <View style={s.modalBody}>
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
          <ToggleRow first
            icon="person-outline"
            title="Public profile"
            desc="Others can see your profile"
            enabled={profilePublic}
            onToggle={() => setProfilePublic((p) => !p)}
            disabled={privacySaving}
          />
          <ToggleRow
            icon="location-outline"
            iconColors={[palette.brandTeal, palette.amber500]}
            title="Show location"
            desc="Display city on profile"
            enabled={showLocation}
            onToggle={() => setShowLocation((p) => !p)}
            disabled={privacySaving}
          />
          <ToggleRow
            icon="flash-outline"
            iconColors={[palette.green600, palette.green500]}
            title="Activity status"
            desc="Show when you're online"
            enabled={showActivity}
            onToggle={() => setShowActivity((p) => !p)}
            disabled={privacySaving}
          />
          </View>
          <GradientButton block label="Save" loading={privacySaving} onPress={() => void handleSavePrivacy()} style={{ marginTop: 20 }} />
        </View>
      </SettingsModal>

      {/* ── Blocked Users Modal ── */}
      <SettingsModal visible={blockedModal} onClose={() => setBlockedModal(false)} title="Blocked people">
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
                      <View style={[s.blockedAvatar, { backgroundColor: isDark ? tc.inputBg : palette.gray200 }]}>
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
      <SettingsModal visible={cityModal} onClose={() => setCityModal(false)} title="Your city">
        <View style={s.modalBody}>
          <Text style={{ fontSize: rs(14), color: tc.textSecondary, marginBottom: rs(12) }}>
            Current city: <Text style={{ fontWeight: "700", color: tc.textPrimary }}>{user?.city || "Not set"}</Text>
          </Text>
          <Text style={{ fontSize: rs(13), color: tc.textSecondary, lineHeight: rs(18) }}>
            Your city determines the local content you see across Explore, Listings, Food and Community.
          </Text>
          <GradientButton block label={user?.city ? "Change city" : "Set your city"} onPress={() => { setCityModal(false); router.push("/edit-profile" as any); }} style={{ marginTop: 20 }} />
        </View>
      </SettingsModal>

      {/* ── Culture & Interests Modal ── */}
      <SettingsModal visible={interestsModal} onClose={() => setInterestsModal(false)} title="Culture and interests">
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
          <GradientButton block label={"Edit in Profile"} onPress={() => { setInterestsModal(false); router.push("/edit-profile" as any); }} style={{ marginTop: 20 }} />
        </View>
      </SettingsModal>

      {/* ── Notification Preferences Modal ── */}
      <SettingsModal visible={notifsModal} onClose={() => setNotifsModal(false)} title="Notification preferences">
        <View style={s.modalBody}>
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tc.glassLine, backgroundColor: tc.cardBg, overflow: "hidden" }}>
          <ToggleRow first
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
            iconColors={[palette.violet600, palette.purple500]}
            title="Comments"
            desc="Replies to your posts"
            enabled={notiComments}
            onToggle={() => setNotiComments((p) => !p)}
            disabled={notifPrefsSaving}
          />
          <ToggleRow
            icon="heart-outline"
            iconColors={[palette.pink500, palette.rose500]}
            title="Likes"
            desc="When someone likes your post"
            enabled={notiLikes}
            onToggle={() => setNotiLikes((p) => !p)}
            disabled={notifPrefsSaving}
          />
          <ToggleRow
            icon="mail-outline"
            iconColors={[Colors.brand.blue, palette.blueL40]}
            title="Messages"
            desc="Direct messages"
            enabled={notiMessages}
            onToggle={() => setNotiMessages((p) => !p)}
            disabled={notifPrefsSaving}
          />
          </View>
          <GradientButton block label="Save" loading={notifPrefsSaving} onPress={() => void handleSaveNotifCategories()} style={{ marginTop: 20 }} />
        </View>
      </SettingsModal>
    </>
  );
}

const s = createThemedStyles({
  safe: { flex: 1, backgroundColor: palette.neutralL96 },
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
    backgroundColor: palette.white,
    borderBottomWidth: 1, borderBottomColor: palette.neutralL95_2,
  },
  backBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: palette.neutralL97_2,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: rs(18), fontWeight: "800", color: Colors.text.primary, letterSpacing: -0.3 },

  // Section label
  sectionLabel: {
    fontSize: rs(11), fontWeight: "700", color: palette.skyL63_2,
    letterSpacing: 1.2, marginTop: rs(22), marginBottom: rs(10),
  },

  // Card shell (handles shadow + bg + border + radius)
  card: {
    backgroundColor: palette.white,
    borderRadius: rs(16),
    marginBottom: rs(8),
    shadowColor: palette.black,
    shadowOpacity: 0.07,
    shadowRadius: rs(8),
    shadowOffset: { width: 0, height: rs(2) },
    elevation: 3,
    borderWidth: 1,
    borderColor: palette.neutralL94_3,
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
    backgroundColor: palette.neutralL96,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  // Version badge
  versionBadge: {
    backgroundColor: palette.blueL97_2, borderRadius: rs(20),
    paddingHorizontal: rs(12), paddingVertical: rs(4),
  },
  versionText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },

  // Danger cards
  dangerCard: { borderColor: palette.red200 },
  deleteCard: { borderColor: palette.red300 },
  dangerBtn: {
    borderRadius: rs(16), borderWidth: 1.5,
    marginBottom: rs(10), overflow: "hidden",
  },
  deleteBtnBorder: { borderColor: palette.red300 },
  dangerBtnInner: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: rs(16), paddingVertical: rs(14), gap: rs(12),
  },
  dangerIconBox: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  dangerBtnTitle: { fontSize: rs(15), fontWeight: "700", color: palette.red600 },
  dangerBtnDesc: { fontSize: rs(12), fontWeight: "500", marginTop: rs(2) },

  // Modal
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: rs(26), borderTopRightRadius: rs(26),
    maxHeight: "82%", paddingBottom: rs(36),
  },
  handle: {
    width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: palette.gray300,
    alignSelf: "center", marginTop: rs(10), marginBottom: rs(6),
  },
  sheetHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: rs(20), paddingVertical: rs(14),
    borderBottomWidth: 1, borderBottomColor: palette.gray100,
  },
  sheetTitle: { fontSize: rs(17), fontWeight: "800", color: Colors.text.primary },
  closeBtn: {
    width: rs(32), height: rs(32), borderRadius: rs(16),
    backgroundColor: palette.gray100,
    alignItems: "center", justifyContent: "center",
  },
  modalBody: { padding: rs(20) },
  blockedRow: { flexDirection: "row", alignItems: "center", gap: rs(12), paddingVertical: rs(12), borderBottomWidth: StyleSheet.hairlineWidth },
  blockedAvatar: { width: rs(42), height: rs(42), borderRadius: rs(21), alignItems: "center", justifyContent: "center" },
  blockedAvatarImg: { width: rs(42), height: rs(42), borderRadius: rs(21), backgroundColor: palette.gray200 },
  unblockBtn: { paddingHorizontal: rs(14), paddingVertical: rs(6), borderRadius: rs(8), backgroundColor: palette.gray100, borderWidth: 1, borderColor: palette.gray200 },
  unblockBtnText: { fontSize: rs(12), fontWeight: "700", color: palette.gray700 },

  inputLabel: { fontSize: rs(13), fontWeight: "600", color: Colors.text.primary, marginBottom: rs(6) },
  input: {
    backgroundColor: palette.gray100, borderRadius: rs(12),
    paddingHorizontal: rs(14), paddingVertical: rs(12),
    fontSize: rs(15), color: Colors.text.primary,
    borderWidth: 1, borderColor: palette.gray200,
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
  saveBtnText: { fontSize: rs(15), fontWeight: "700", color: palette.white },

  pill: { backgroundColor: palette.blueL97_2, borderRadius: rs(20), paddingHorizontal: rs(14), paddingVertical: rs(6) },
  pillText: { fontSize: rs(13), fontWeight: "600", color: Colors.brand.blue },

  // Verification status "View All" badge
  verifyStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(4),
    backgroundColor: palette.brandGreenLight,
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
    borderColor: palette.blueL89,
  },
  applyBadgeBtnText: { fontSize: rs(12), fontWeight: "700", color: Colors.brand.blue },

  accessStatusPill: {
    borderRadius: rs(10),
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderWidth: 1,
    flexShrink: 0,
  },
  accessStatusPillTextPending: { fontSize: rs(12), fontWeight: "800", color: palette.amber600 },
  accessStatusPillTextBlocked: { fontSize: rs(10), fontWeight: "900", color: palette.gray400, letterSpacing: 0.3 },

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
    backgroundColor: palette.gray200,
  },
  bizPreviewThumbPh: { alignItems: "center", justifyContent: "center" },
  bizPreviewTitle: { fontSize: rs(13), fontWeight: "700" },
  bizPreviewSub: { fontSize: rs(11), marginTop: rs(2) },
  bizPreviewMeta: { fontSize: rs(12), fontWeight: "700" },

  // Admin badge
  adminBadge: {
    backgroundColor: palette.slate900,
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
  },
  adminBadgeText: { fontSize: rs(10), fontWeight: "900", color: palette.white, letterSpacing: 0.8 },
});
