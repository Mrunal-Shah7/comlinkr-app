import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useThemeStore } from "../src/store/theme.store";
import HamburgerMenu from "./HamburgerMenu";
import { rs } from "../src/utils/responsive";
import { useRequireAuth } from "../src/shared/hooks/useRequireAuth";

const BRAND_BLUE  = Colors.brand.blue;
const BRAND_GREEN = "#26B324";

export default function AppHeader() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDark = useThemeStore((s) => s.isDark);
  const { requireAuth } = useRequireAuth();

  const menuBg      = isDark ? "rgba(255,255,255,0.08)" : "#F0F4FA";
  const menuBorder  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";

  return (
    <>
      <View style={[s.header, {
        backgroundColor: isDark ? "#0E1724" : "#FFFFFF",
        borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)",
      }]}>

        {/* Hamburger */}
        <Pressable
          onPress={() => setDrawerOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          style={({ pressed }) => [
            s.menuBtn,
            {
              backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.12)" : "#E8ECF2") : menuBg,
              borderColor: menuBorder,
            },
          ]}
        >
          <Ionicons name="menu" size={rs(20)} color={isDark ? "#C5D5E8" : "#334155"} />
        </Pressable>

        {/* Wordmark — center */}
        <View style={s.wordmarkWrap} pointerEvents="none">
          <Text style={[s.brandName, { color: BRAND_BLUE }]}>ComLinkr</Text>
          <Text style={s.brandTag}>WE FIND FOR YOU</Text>
        </View>

        {/* Right: Chat */}
        <Pressable
          onPress={() => {
            if (!requireAuth(undefined, "Sign in to message other members.")) return;
            router.push("/chat" as any);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open messages"
          style={({ pressed }) => [
            s.chatBtn,
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Ionicons name="chatbubble-ellipses" size={rs(20)} color="#FFF" />
        </Pressable>
      </View>

      <HamburgerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(14),
    paddingTop: rs(10),
    paddingBottom: rs(10),
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 10,
  },

  menuBtn: {
    width: rs(38), height: rs(38), borderRadius: rs(12),
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },

  wordmarkWrap: {
    position: "absolute",
    left: 0, right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: rs(18),
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: rs(22),
    includeFontPadding: false,
  },
  brandTag: {
    fontSize: rs(7),
    fontWeight: "800",
    color: BRAND_GREEN,
    letterSpacing: 1.6,
    lineHeight: rs(10),
    textTransform: "uppercase",
    includeFontPadding: false,
  },

  chatBtn: {
    width: rs(36), height: rs(36), borderRadius: rs(11),
    alignItems: "center", justifyContent: "center",
    backgroundColor: BRAND_BLUE,
  },
});
