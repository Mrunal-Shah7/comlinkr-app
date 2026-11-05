// components/HamburgerMenu.tsx — the "You" sheet (design D, plan 01).
// A bottom sheet (DSheet): your profile row, then grouped rows that share one icon style (problem 6), the theme
// switch, and Log out in its own group. Guests see a sign-in card and the account-neutral rows only.
import React, { useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../src/store/auth.store";
import { useThemeStore } from "../src/store/theme.store";
import { resolveAvatarDisplayUrl } from "../src/api/meProfile.api";
import { useSidebarStore } from "../src/store/sidebar.store";
import { LIST_FETCH_TTL_MS } from "../src/store/listFetchCache.store";
import { appAlert } from "../src/shared/ui/Dialogs";
import { useTheme } from "../src/theme/useTheme";
import { TYPE, body } from "../src/theme/d";
import { DSheet } from "../src/shared/d/Sheet";
import { GradientButton, GradientFill, PressableScale, Reveal } from "../src/shared/d";

type Item = { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; route: string; group: number };

const BASE_MENU: Item[] = [
  { id: "myposts",       label: "My posts",        icon: "document-text-outline",    route: "/myposts",            group: 0 },
  { id: "saved",         label: "Saved",           icon: "bookmark-outline",         route: "/saved",              group: 0 },
  { id: "mylistings",    label: "My listings",     icon: "home-outline",             route: "/my-listings",        group: 0 },
  { id: "myrestaurants", label: "My restaurants",  icon: "restaurant-outline",       route: "/my-restaurants",     group: 0 },
  { id: "landlord",      label: "Landlord space",  icon: "business-outline",         route: "/landlord-dashboard", group: 0 },
  { id: "messages",      label: "Messages",        icon: "chatbubble-outline",       route: "/chat",               group: 1 },
  { id: "notifications", label: "Notifications",   icon: "notifications-outline",    route: "/notifications",      group: 1 },
  { id: "settings",      label: "Settings",        icon: "settings-outline",         route: "/settings",           group: 1 },
  { id: "help",          label: "Help",            icon: "help-circle-outline",      route: "/help-support",       group: 2 },
  { id: "privacy",       label: "Privacy policy",  icon: "shield-checkmark-outline", route: "/privacy-policy",     group: 2 },
];
/** Menu shown to guests (not signed in) — only account-neutral items, no personal data. */
const GUEST_MENU: Item[] = [
  { id: "help",    label: "Help",           icon: "help-circle-outline",      route: "/help-support",   group: 2 },
  { id: "privacy", label: "Privacy policy", icon: "shield-checkmark-outline", route: "/privacy-policy", group: 2 },
];

interface Props { visible: boolean; onClose: () => void; }

export default function HamburgerMenu({ visible, onClose }: Props) {
  const router = useRouter();
  const { tc } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const sessionCity = useSidebarStore((s) => s.sessionCity);
  const sessionAvatar = useSidebarStore((s) => s.sessionAvatar);
  const unreadNotifCount = useSidebarStore((s) => s.unreadNotifCount);
  const aggregateSavedTotal = useSidebarStore((s) => s.aggregateSavedTotal) ?? 0;
  const myListingsCount = useSidebarStore((s) => s.myListingsCount) ?? 0;
  const myRestaurantsCount = useSidebarStore((s) => s.myRestaurantsCount) ?? 0;
  const postsCount = useSidebarStore((s) => s.sidebarStats?.postsCount) ?? 0;

  useEffect(() => {
    // Guests have no session: every sidebar endpoint would answer 401 (TR-002).
    if (!visible || !isAuthed) return;
    void useSidebarStore.getState().refreshIfStale(LIST_FETCH_TTL_MS);
  }, [visible, isAuthed]);

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 280);
  };
  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      appAlert("Log out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: () => { void logout(); useSidebarStore.getState().clear(); } },
      ]);
    }, 320);
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const groups = useMemo(() => {
    const base = !isAuthed ? GUEST_MENU : BASE_MENU.filter((item) => {
      // Listing / restaurant / landlord management only once the user has posted one.
      if (item.id === "mylistings" || item.id === "landlord") return myListingsCount > 0;
      if (item.id === "myrestaurants") return myRestaurantsCount > 0;
      return true;
    });
    const all = isAdmin ? [...base, { id: "admin", label: "Admin panel", icon: "shield-outline", route: "/admin", group: 3 } as Item] : base;
    return [0, 1, 2, 3].map((g) => all.filter((i) => i.group === g)).filter((g) => g.length > 0);
  }, [isAuthed, isAdmin, myListingsCount, myRestaurantsCount]);

  const value = (id: string): string | null => {
    if (id === "myposts" && postsCount > 0) return String(postsCount);
    if (id === "saved" && aggregateSavedTotal > 0) return String(aggregateSavedTotal);
    if (id === "mylistings" && myListingsCount > 0) return String(myListingsCount);
    if (id === "myrestaurants" && myRestaurantsCount > 0) return String(myRestaurantsCount);
    return null;
  };

  const initials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CL";
  const cityLabel = (sessionCity ?? user?.city)?.trim() || "";
  const avatarUri = resolveAvatarDisplayUrl(sessionAvatar ?? user?.avatarUrl ?? null);

  const row = (item: Item, first: boolean) => (
    <Pressable key={item.id} onPress={() => go(item.route)} accessibilityRole="button" accessibilityLabel={item.label}
      style={({ pressed }) => [m.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.borderLight }, pressed && { backgroundColor: tc.inputBg }]}>
      <View style={[m.icon, { backgroundColor: tc.accentSoft }]}><Ionicons name={item.icon} size={17} color={tc.accentText} /></View>
      <Text style={[TYPE.body, { flex: 1, color: tc.textPrimary }]}>{item.label}</Text>
      {item.id === "notifications" && unreadNotifCount > 0 ? (
        <View style={[m.badge, { backgroundColor: tc.accent }]}><Text style={[body(800), { color: "#fff", fontSize: 11.5 }]}>{unreadNotifCount > 99 ? "99+" : unreadNotifCount}</Text></View>
      ) : value(item.id) ? <Text style={[TYPE.small, { color: tc.textTertiary }]}>{value(item.id)}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
    </Pressable>
  );

  return (
    <DSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
        {isAuthed ? (
          <Reveal i={0}>
            <PressableScale onPress={() => go("/profile")} style={m.me} accessibilityRole="button" accessibilityLabel="My profile">
              <GradientFill style={m.ring}>
                <View style={[m.ringIn, { borderColor: tc.sheetBg }]}>
                  {avatarUri ? <Image source={{ uri: avatarUri }} style={m.av} contentFit="cover" /> : <GradientFill style={m.av}><Text style={[body(800), { color: "#fff", fontSize: 17 }]}>{initials}</Text></GradientFill>}
                </View>
              </GradientFill>
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]} numberOfLines={1}>{user?.name ?? "You"}</Text>
                <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>{[user?.username ? `@${user.username}` : "", cityLabel].filter(Boolean).join(" · ")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tc.textTertiary} />
            </PressableScale>
          </Reveal>
        ) : (
          <Reveal i={0} style={[m.guest, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
            <Text style={[TYPE.cardTitle, { color: tc.textPrimary }]}>You’re browsing as a guest</Text>
            <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 2, marginBottom: 12 }]}>Sign in to post, save and message.</Text>
            <GradientButton block label="Sign in or create an account" onPress={() => go("/(auth)/login")} />
          </Reveal>
        )}

        {groups.map((g, gi) => (
          <Reveal key={gi} i={gi + 1} style={[m.group, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
            {g.map((item, ii) => row(item, ii === 0))}
          </Reveal>
        ))}

        <Reveal i={groups.length + 1} style={[m.group, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
          <View style={m.row}>
            <View style={[m.icon, { backgroundColor: tc.accentSoft }]}><Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={17} color={tc.accentText} /></View>
            <Text style={[TYPE.body, { flex: 1, color: tc.textPrimary }]}>Dark mode</Text>
            <Switch value={isDark} onValueChange={() => toggleTheme()} trackColor={{ false: tc.surface3, true: tc.mint }} thumbColor="#fff" />
          </View>
        </Reveal>

        {isAuthed ? (
          <Reveal i={groups.length + 2} style={[m.group, { backgroundColor: tc.cardBg, borderColor: tc.glassLine }]}>
            <Pressable onPress={handleLogout} style={({ pressed }) => [m.row, pressed && { backgroundColor: tc.inputBg }]} accessibilityRole="button" accessibilityLabel="Log out">
              <View style={[m.icon, { backgroundColor: "rgba(239,68,68,0.12)" }]}><Ionicons name="log-out-outline" size={17} color={tc.dangerText} /></View>
              <Text style={[TYPE.body, { flex: 1, color: tc.dangerText }]}>Log out</Text>
            </Pressable>
          </Reveal>
        ) : null}
      </ScrollView>
    </DSheet>
  );
}

const m = StyleSheet.create({
  me: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, marginBottom: 10 },
  ring: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  ringIn: { width: 54, height: 54, borderRadius: 27, borderWidth: 2.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  av: { width: 49, height: 49, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  guest: { padding: 16, borderRadius: 22, borderWidth: 1, marginBottom: 12 },
  group: { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, minHeight: 52 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
});
