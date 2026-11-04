import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../src/store/auth.store";
import { useThemeStore } from "../src/store/theme.store";
import { resolveAvatarDisplayUrl } from "../src/api/meProfile.api";
import { useSidebarStore } from "../src/store/sidebar.store";
import { LIST_FETCH_TTL_MS } from "../src/store/listFetchCache.store";
import { rs, wp, isTablet } from "../src/utils/responsive";
import { appAlert } from '../src/shared/ui/Dialogs';

const DRAWER_WIDTH = isTablet() ? Math.min(wp(45), 420) : rs(310);

const BRAND_BLUE   = "#0076EB";
const BRAND_GREEN  = "#26B324";
const BRAND_ORANGE = "#FF7B00";

const BASE_MENU = [
  { id: "profile",       label: "My Profile",      icon: "person-circle-outline"    as const, route: "/profile",          iconColors: [BRAND_BLUE,   "#0054CC"]   as [string, string], section: "MY ACCOUNT" },
  { id: "myposts",       label: "My Posts",         icon: "document-text-outline"    as const, route: "/myposts",          iconColors: [BRAND_ORANGE, "#CC5500"]   as [string, string] },
  { id: "mylistings",    label: "My Listings",      icon: "home-outline"             as const, route: "/my-listings",          iconColors: [BRAND_BLUE,   "#0054CC"]   as [string, string] },
  { id: "myrestaurants", label: "My Restaurants",   icon: "restaurant-outline"       as const, route: "/my-restaurants",       iconColors: [BRAND_GREEN,  "#1a8a18"]   as [string, string] },
  { id: "landlord",      label: "Landlord Space",   icon: "business-outline"         as const, route: "/landlord-dashboard",   iconColors: [BRAND_ORANGE, "#CC5500"]   as [string, string] },
  { id: "saved",         label: "Saved",            icon: "bookmark-outline"         as const, route: "/saved",            iconColors: [BRAND_GREEN,  "#1a8a18"]   as [string, string] },
  { id: "notifications", label: "Notifications",    icon: "notifications-outline"    as const, route: "/notifications",    iconColors: [BRAND_ORANGE, "#CC5500"]   as [string, string], section: "ACTIVITY" },
  { id: "settings",      label: "Settings",         icon: "settings-outline"         as const, route: "/settings",         iconColors: [BRAND_BLUE,   "#0054CC"]   as [string, string], section: "MORE" },
  { id: "help",          label: "Help & Support",   icon: "help-circle-outline"      as const, route: "/help-support",     iconColors: [BRAND_BLUE,   "#005BE0"]   as [string, string] },
  { id: "privacy",       label: "Privacy Policy",   icon: "shield-checkmark-outline" as const, route: "/privacy-policy",   iconColors: [BRAND_BLUE,   BRAND_GREEN] as [string, string] },
];

/** Menu shown to guests (not signed in) — only account-neutral items, no personal data. */
const GUEST_MENU = [
  { id: "help",    label: "Help & Support", icon: "help-circle-outline"      as const, route: "/help-support",   iconColors: [BRAND_BLUE, "#005BE0"]   as [string, string], section: "MORE" },
  { id: "privacy", label: "Privacy Policy", icon: "shield-checkmark-outline" as const, route: "/privacy-policy", iconColors: [BRAND_BLUE, BRAND_GREEN] as [string, string] },
];

interface Props { visible: boolean; onClose: () => void; }

export default function HamburgerMenu({ visible, onClose }: Props) {
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const isAuthed   = useAuthStore((s) => s.isAuthed);
  const user       = useAuthStore((s) => s.user);
  const logout     = useAuthStore((s) => s.logout);
  const isDark     = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const sessionCity = useSidebarStore((s) => s.sessionCity);
  const sessionAvatar = useSidebarStore((s) => s.sessionAvatar);
  const unreadNotifCount = useSidebarStore((s) => s.unreadNotifCount);
  const aggregateSavedTotal = useSidebarStore((s) => s.aggregateSavedTotal) ?? 0;
  const myListingsCount = useSidebarStore((s) => s.myListingsCount) ?? 0;
  const myRestaurantsCount = useSidebarStore((s) => s.myRestaurantsCount) ?? 0;

  const [mounted, setMounted] = useState(false);
  const slideAnim    = useRef(new Animated.Value(-DRAWER_WIDTH - 20)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const rowScales    = useRef(Array.from({ length: 20 }, () => new Animated.Value(1))).current;
  const darkRowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { if (visible) setMounted(true); }, [visible]);

  useEffect(() => {
    // Guests have no session: every sidebar endpoint would answer 401 (TR-002).
    if (!visible || !isAuthed) return;
    void useSidebarStore.getState().refreshIfStale(LIST_FETCH_TTL_MS);
  }, [visible, isAuthed]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,    { toValue: -DRAWER_WIDTH - 20, duration: 210, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 170, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, mounted]);

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 280);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      appAlert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            void logout();
            useSidebarStore.getState().clear();
          },
        },
      ]);
    }, 320);
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const MENU = useMemo(() => {
    if (!isAuthed) return GUEST_MENU;
    // Only show listing/restaurant/landlord management once the user has actually posted something —
    // posting itself needs no badge/verification, this just keeps the menu relevant.
    const filtered = BASE_MENU.filter((item) => {
      if (item.id === "mylistings") return myListingsCount > 0;
      if (item.id === "myrestaurants") return myRestaurantsCount > 0;
      if (item.id === "landlord") return myListingsCount > 0;
      return true;
    });
    if (!isAdmin) return filtered;
    return [
      ...filtered,
      {
        id: "admin",
        label: "Admin Panel",
        icon: "shield-checkmark-outline" as const,
        route: "/admin",
        iconColors: [BRAND_ORANGE, "#CC5500"] as [string, string],
        section: "ADMIN",
      },
    ];
  }, [isAuthed, isAdmin, myListingsCount, myRestaurantsCount]);

  const pressIn  = (i: number) => Animated.spring(rowScales[i], { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 10 }).start();
  const pressOut = (i: number) => Animated.spring(rowScales[i], { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }).start();

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "CL";

  const cityLabel = (sessionCity ?? user?.city)?.trim() || "Your City";
  const avatarDisplayUri = resolveAvatarDisplayUrl(sessionAvatar ?? user?.avatarUrl ?? null);
  const sidebarStats = useSidebarStore((s) => s.sidebarStats);
  const postsCount = sidebarStats?.postsCount ?? 0;

  if (!mounted) return null;

  // ─── Theme tokens ──────────────────────────────────────────────────────────
  const drawerBg      = isDark ? "#0B1423" : "#FFFFFF";
  const borderColor   = isDark ? "#1A2D44" : "#ECEEF2";
  const textPrimary   = isDark ? "#F0F5FB" : "#0A1628";
  const textSecondary = isDark ? "#7A98B8" : "#6B7280";
  const textTertiary  = isDark ? "#415E7A" : "#9CA3AF";
  const sectionClr    = isDark ? "#3468A8" : "#94A8C4";
  const rowPressBg    = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const rowSepColor   = isDark ? "#141F2E" : "#F3F4F7";
  const chevronColor  = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.13)";
  const switchOff     = isDark ? "#243245" : "#D1D5DB";

  let lastSection: string | undefined;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,4,16,0.72)", opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View style={[s.drawer, { backgroundColor: drawerBg, transform: [{ translateX: slideAnim }] }]}>

        {/* ─── HEADER ─── */}
        <View style={{ paddingTop: insets.top }}>
          {/* Top strip with gradient accent + close */}
          <LinearGradient
            colors={isDark ? ["#0B1423", "#0E1C32"] : ["#F8FAFF", "#FFFFFF"]}
            style={[s.headerStrip, { borderBottomColor: borderColor }]}
          >
            <View style={s.headerTopRow}>
              <View>
                <Text style={[s.appName, { color: BRAND_BLUE }]}>ComLinkr</Text>
                <Text style={[s.appTag, { color: BRAND_GREEN }]}>WE FIND FOR YOU</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [
                  s.closeBtn,
                  {
                    backgroundColor: pressed ? (isDark ? "#1C2E45" : "#E8EBF0") : (isDark ? "#131F30" : "#F0F2F6"),
                    borderColor: borderColor,
                  },
                ]}
              >
                <Ionicons name="close" size={rs(16)} color={textSecondary} />
              </Pressable>
            </View>

            {!isAuthed ? (
              /* Guest sign-in card */
              <View style={s.guestCard}>
                <LinearGradient colors={[BRAND_BLUE, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.guestIconWrap}>
                  <Ionicons name="person-outline" size={rs(22)} color="#FFF" />
                </LinearGradient>
                <Text style={[s.guestTitle, { color: textPrimary }]}>You're browsing as a guest</Text>
                <Text style={[s.guestSub, { color: textSecondary }]}>Sign in to post, save, message & more</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => go("/(auth)/login")}
                  style={{ width: "100%", marginTop: rs(12) }}
                >
                  <LinearGradient colors={[BRAND_BLUE, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.guestSignInBtn}>
                    <Text style={s.guestSignInBtnText}>Sign In / Create Account</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
            {/* Avatar row */}
            <View style={s.profileRow}>
              <View style={s.avatarWrap}>
                <View style={[s.avatarRing, { borderColor: isDark ? "#1E3555" : "#E0E8F5" }]}>
                  {avatarDisplayUri ? (
                    <Image
                      source={{ uri: avatarDisplayUri }}
                      style={s.avatarImg}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                  ) : (
                    <LinearGradient colors={[BRAND_BLUE, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Text style={s.avatarInitials}>{initials}</Text>
                      </View>
                    </LinearGradient>
                  )}
                </View>
                <View style={[s.onlineDot, { borderColor: drawerBg }]} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6), flexWrap: "wrap" }}>
                  <Text style={[s.userName, { color: textPrimary }]} numberOfLines={1}>{user?.name || "ComLinkr User"}</Text>
                  {isAdmin ? (
                    <View style={[s.adminChip, { backgroundColor: isDark ? "#0A2040" : "#EBF4FF", borderColor: isDark ? "#1B3D66" : "#BAD8FF" }]}>
                      <Ionicons name="shield-checkmark" size={rs(8)} color={BRAND_BLUE} />
                      <Text style={[s.adminChipText, { color: BRAND_BLUE }]}>ADMIN</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[s.userEmail, { color: textSecondary }]} numberOfLines={1}>{user?.email || "member@comlinkr.com"}</Text>
                <View style={[s.cityChip, { backgroundColor: isDark ? "#071810" : "#F0FDF4", borderColor: isDark ? "#153020" : "#D1FAE5" }]}>
                  <Ionicons name="location-sharp" size={rs(10)} color={BRAND_GREEN} />
                  <Text style={[s.cityText, { color: BRAND_GREEN }]} numberOfLines={1}>{cityLabel}</Text>
                </View>
              </View>
            </View>

            {/* Mini stats row */}
            <View style={[s.statsRow, { borderColor: borderColor, backgroundColor: isDark ? "#0D1826" : "#F7F9FD" }]}>
              <View style={s.statItem}>
                <Text style={[s.statNum, { color: textPrimary }]}>{postsCount}</Text>
                <Text style={[s.statLabel, { color: textTertiary }]}>Posts</Text>
              </View>
              <View style={[s.statDivider, { backgroundColor: borderColor }]} />
              <View style={s.statItem}>
                <Text style={[s.statNum, { color: textPrimary }]}>{aggregateSavedTotal}</Text>
                <Text style={[s.statLabel, { color: textTertiary }]}>Saved</Text>
              </View>
              <View style={[s.statDivider, { backgroundColor: borderColor }]} />
              <TouchableOpacity style={s.statItem} onPress={() => go("/edit-profile")} activeOpacity={0.8}>
                <LinearGradient colors={[BRAND_BLUE, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.editChip}>
                  <Ionicons name="pencil" size={rs(11)} color="#FFF" />
                  <Text style={s.editChipText}>Edit</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
              </>
            )}
          </LinearGradient>
        </View>

        {/* ─── MENU ─── */}
        <ScrollView
          style={{ flex: 1, backgroundColor: drawerBg }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: rs(8) }}
        >
          {MENU.map((item, idx) => {
            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;
            const nextItem = MENU[idx + 1];
            const showSep  = !!nextItem && !nextItem.section;

            return (
              <View key={item.id}>
                {showSection && (
                  <View style={s.sectionRow}>
                    <Text style={[s.sectionLabel, { color: sectionClr }]}>{item.section}</Text>
                    <View style={[s.sectionLine, { backgroundColor: borderColor }]} />
                  </View>
                )}

                <Animated.View style={{ transform: [{ scale: rowScales[idx] }] }}>
                  <Pressable
                    onPress={() => go(item.route)}
                    onPressIn={() => pressIn(idx)}
                    onPressOut={() => pressOut(idx)}
                    style={({ pressed }) => [s.menuRow, { backgroundColor: pressed ? rowPressBg : "transparent" }]}
                  >
                    <View style={[s.iconBox, { borderRadius: rs(11), overflow: "hidden" }]}>
                      <LinearGradient colors={item.iconColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconGrad}>
                        <Ionicons name={item.icon} size={rs(18)} color="#FFF" />
                      </LinearGradient>
                    </View>

                    <Text style={[s.rowLabel, { color: textPrimary }]}>{item.label}</Text>

                    <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: rs(6) }}>
                      {item.id === "notifications" && unreadNotifCount > 0 ? (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{unreadNotifCount > 99 ? "99+" : String(unreadNotifCount)}</Text>
                        </View>
                      ) : item.id === "saved" && aggregateSavedTotal > 0 ? (
                        <View style={[s.savedBadge, { backgroundColor: isDark ? "#0A1F40" : "#EBF4FF", borderColor: isDark ? "#1C3060" : "#D6E4FF" }]}>
                          <Text style={[s.savedBadgeText, { color: BRAND_BLUE }]}>{aggregateSavedTotal > 99 ? "99+" : String(aggregateSavedTotal)}</Text>
                        </View>
                      ) : null}
                      <Ionicons name="chevron-forward" size={rs(13)} color={chevronColor} />
                    </View>
                  </Pressable>
                </Animated.View>

                {showSep && <View style={[s.rowSep, { backgroundColor: rowSepColor }]} />}
              </View>
            );
          })}

          {/* Appearance */}
          <View style={s.sectionRow}>
            <Text style={[s.sectionLabel, { color: sectionClr }]}>APPEARANCE</Text>
            <View style={[s.sectionLine, { backgroundColor: borderColor }]} />
          </View>
          <View style={s.menuRow}>
            <View style={[s.iconBox, { borderRadius: rs(11), overflow: "hidden" }]}>
              <LinearGradient
                colors={isDark ? ["#4A6CF7", "#7E3AF2"] : ["#F59E0B", "#EF4444"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.iconGrad}
              >
                <Ionicons name={isDark ? "moon" : "sunny"} size={rs(18)} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={[s.rowLabel, { color: textPrimary }]}>{isDark ? "Dark Mode" : "Light Mode"}</Text>
            <Switch
              value={isDark}
              onValueChange={() => toggleTheme()}
              trackColor={{ false: switchOff, true: BRAND_BLUE }}
              thumbColor={isDark ? "#E6F2FF" : "#FFFFFF"}
              ios_backgroundColor={switchOff}
              style={{ marginLeft: "auto" }}
            />
          </View>
        </ScrollView>

        {/* ─── LOGOUT ─── */}
        {isAuthed && (
        <View style={[s.footer, { borderTopColor: borderColor, paddingBottom: insets.bottom + rs(6), backgroundColor: drawerBg }]}>
          <Animated.View style={{ transform: [{ scale: darkRowScale }] }}>
            <Pressable
              onPress={handleLogout}
              onPressIn={() => Animated.spring(darkRowScale, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 10 }).start()}
              onPressOut={() => Animated.spring(darkRowScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start()}
              style={({ pressed }) => [
                s.menuRow,
                { backgroundColor: pressed ? (isDark ? "rgba(220,38,38,0.10)" : "rgba(220,38,38,0.05)") : "transparent" },
              ]}
            >
              <View style={[s.iconBox, { borderRadius: rs(11), overflow: "hidden" }]}>
                <LinearGradient colors={["#EF4444", "#B91C1C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconGrad}>
                  <Ionicons name="log-out-outline" size={rs(18)} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={s.logoutLabel}>Log Out</Text>
              <Ionicons name="chevron-forward" size={rs(13)} color={isDark ? "rgba(239,68,68,0.3)" : "rgba(220,38,38,0.25)"} style={{ marginLeft: "auto" }} />
            </Pressable>
          </Animated.View>
        </View>
        )}

      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  guestCard: {
    alignItems: "center",
    paddingVertical: rs(18),
    paddingHorizontal: rs(8),
  },
  guestIconWrap: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(26),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rs(10),
  },
  guestTitle: {
    fontSize: rs(15),
    fontWeight: "800",
    textAlign: "center",
  },
  guestSub: {
    fontSize: rs(12.5),
    fontWeight: "500",
    textAlign: "center",
    marginTop: rs(3),
  },
  guestSignInBtn: {
    borderRadius: rs(12),
    paddingVertical: rs(12),
    alignItems: "center",
    justifyContent: "center",
  },
  guestSignInBtnText: {
    fontSize: rs(13.5),
    fontWeight: "800",
    color: "#FFF",
  },
  drawer: {
    position: "absolute",
    top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH,
    borderTopRightRadius: rs(22),
    borderBottomRightRadius: rs(22),
    shadowColor: "#000",
    shadowOffset: { width: 12, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 48,
    overflow: "hidden",
  },

  // Header
  headerStrip: {
    paddingHorizontal: rs(18),
    paddingBottom: rs(16),
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: rs(14),
    paddingBottom: rs(16),
  },
  appName: { fontSize: rs(17), fontWeight: "900", letterSpacing: -0.5 },
  appTag:  { fontSize: rs(7),  fontWeight: "800", letterSpacing: 1.8, marginTop: rs(1) },
  closeBtn: {
    width: rs(32), height: rs(32), borderRadius: rs(16),
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },

  // Profile
  profileRow: { flexDirection: "row", alignItems: "flex-start", gap: rs(14), marginBottom: rs(14) },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatarRing: {
    width: rs(58), height: rs(58), borderRadius: rs(29),
    overflow: "hidden", borderWidth: 2,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitials: { fontSize: rs(20), fontWeight: "900", color: "#FFF", letterSpacing: 0.5 },
  onlineDot: {
    position: "absolute", bottom: rs(1), right: rs(1),
    width: rs(12), height: rs(12), borderRadius: rs(6),
    backgroundColor: "#22C55E", borderWidth: 2,
  },

  userName: { fontSize: rs(15), fontWeight: "800", letterSpacing: -0.2, flexShrink: 1 },
  adminChip: {
    flexDirection: "row", alignItems: "center", gap: rs(3),
    borderWidth: 1, paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: rs(6),
  },
  adminChipText: { fontSize: rs(8), fontWeight: "900", letterSpacing: 0.8 },
  userEmail: { fontSize: rs(12), marginTop: rs(3), fontWeight: "500" },
  cityChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    marginTop: rs(7), alignSelf: "flex-start",
    borderWidth: 1, paddingHorizontal: rs(8), paddingVertical: rs(3),
    borderRadius: rs(20),
  },
  cityText: { fontSize: rs(11), fontWeight: "700" },

  // Stats bar
  statsRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: rs(14),
    paddingVertical: rs(10), paddingHorizontal: rs(4),
  },
  statItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  statNum:   { fontSize: rs(16), fontWeight: "800", letterSpacing: -0.3 },
  statLabel: { fontSize: rs(10), fontWeight: "600", marginTop: rs(1) },
  statDivider: { width: 1, height: rs(28) },
  editChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(20),
  },
  editChipText: { fontSize: rs(12), fontWeight: "700", color: "#FFF" },

  // Menu
  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: rs(18), paddingTop: rs(18), paddingBottom: rs(6),
    gap: rs(10),
  },
  sectionLabel: { fontSize: rs(9), fontWeight: "800", letterSpacing: 2.2 },
  sectionLine:  { flex: 1, height: 1 },

  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: rs(18), paddingVertical: rs(10),
    gap: rs(13),
  },
  iconBox: { flexShrink: 0 },
  iconGrad: {
    width: rs(38), height: rs(38),
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { fontSize: rs(14), fontWeight: "700", letterSpacing: -0.1 },
  rowSep: { height: StyleSheet.hairlineWidth, marginLeft: rs(69), marginRight: rs(18) },

  badge: {
    minWidth: rs(20), height: rs(20), borderRadius: rs(10),
    backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center",
    paddingHorizontal: rs(5),
  },
  badgeText: { fontSize: rs(10), fontWeight: "800", color: "#FFF" },
  savedBadge: {
    minWidth: rs(20), height: rs(20), borderRadius: rs(10),
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: rs(5),
  },
  savedBadgeText: { fontSize: rs(10), fontWeight: "800" },

  // Footer
  footer: { borderTopWidth: 1 },
  logoutLabel: { fontSize: rs(14), fontWeight: "700", color: "#EF4444", letterSpacing: -0.1 },
});
