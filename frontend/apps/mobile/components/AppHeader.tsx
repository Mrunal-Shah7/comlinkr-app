// components/AppHeader.tsx — the top bar of the four tabs (design D, plan 01).
//
// Left: your avatar in a gradient ring (opens the menu). Centre: the tab's title, which fades into the bar as
// the page's large title scrolls away (interpolate(scrollY, [0, 64], [0, 1])); the bar's glass background
// fades in with it. Right: notifications and messages, each with a dot while something is unread.
// The prototype's search button is left out: there is no city-wide search behind it yet (plan 01).
import { palette } from "../src/theme/palette";
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import HamburgerMenu from "./HamburgerMenu";
import { useTheme } from "../src/theme/useTheme";
import { TYPE, body } from "../src/theme/d";
import { GradientFill } from "../src/shared/d";
import { FadeImage } from "./FadeImage";
import { useAuthStore } from "../src/store/auth.store";
import { useSidebarStore } from "../src/store/sidebar.store";
import { useRequireAuth } from "../src/shared/hooks/useRequireAuth";
import { getUnreadCount } from "../src/api/chat.api";
import { resolveApiAssetUrl } from "../src/api/feed.api";

export const APP_HEADER_HEIGHT = 56;

export default function AppHeader({ title, scrollY }: { title?: string; scrollY?: SharedValue<number> }) {
  const router = useRouter();
  const { tc } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { requireAuth } = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const unreadNotif = useSidebarStore((s) => s.unreadNotifCount);
  const { data: chatUnread } = useQuery({
    queryKey: ["chat-unread-count"],
    queryFn: getUnreadCount,
    enabled: !!user,
    staleTime: 60_000,
  });

  const barBg = useAnimatedStyle(() => ({ opacity: scrollY ? interpolate(scrollY.value, [0, 64], [0, 1], "clamp") : 1 }));
  const titleStyle = useAnimatedStyle(() => {
    const c = scrollY ? interpolate(scrollY.value, [0, 64], [0, 1], "clamp") : 1;
    return { opacity: c, transform: [{ translateY: (1 - c) * 6 }] };
  });

  const initials = (user?.name ?? "Guest").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const avatarUri = user?.avatarUrl ? resolveApiAssetUrl(user.avatarUrl) : null;

  const iconBtn = (icon: keyof typeof Ionicons.glyphMap, label: string, dot: boolean, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [s.ib, pressed && { backgroundColor: tc.inputBg }]}>
      <Ionicons name={icon} size={22} color={tc.textPrimary} />
      {dot ? <View style={[s.dot, { borderColor: tc.pageBg }]} /> : null}
    </Pressable>
  );

  return (
    <>
      <View style={s.header}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tc.glass, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tc.glassLine }, barBg]} />
        <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open menu" style={s.avBtn}>
          <GradientFill style={s.ring}>
            <View style={[s.avInner, { borderColor: tc.pageBg }]}>
              {avatarUri ? <FadeImage uri={avatarUri} style={s.avImg} /> : (
                <GradientFill style={s.avImg}><Text style={[body(800), { color: palette.white, fontSize: 11 }]}>{initials}</Text></GradientFill>
              )}
            </View>
          </GradientFill>
        </Pressable>

        {title ? (
          <Animated.View pointerEvents="none" style={[s.titleWrap, titleStyle]}>
            <Text style={[TYPE.bar, { color: tc.textPrimary }]} numberOfLines={1}>{title}</Text>
          </Animated.View>
        ) : null}

        <View style={s.right}>
          {iconBtn("notifications-outline", "Notifications", unreadNotif > 0, () => {
            if (!requireAuth(undefined, "Sign in to see your notifications.")) return;
            router.push("/notifications" as any);
          })}
          {iconBtn("chatbubble-outline", "Messages", (chatUnread?.count ?? 0) > 0, () => {
            if (!requireAuth(undefined, "Sign in to message other members.")) return;
            router.push("/chat" as any);
          })}
        </View>
      </View>

      <HamburgerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const s = StyleSheet.create({
  header: { height: APP_HEADER_HEIGHT, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, zIndex: 10 },
  avBtn: { padding: 4 },
  ring: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avInner: { width: 33, height: 33, borderRadius: 17, borderWidth: 2.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avImg: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  titleWrap: { position: "absolute", left: 64, right: 104, alignItems: "center" },
  right: { marginLeft: "auto", flexDirection: "row", gap: 2 },
  ib: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 9, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: palette.red500, borderWidth: 2 },
});
