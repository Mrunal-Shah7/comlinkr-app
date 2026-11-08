// src/features/housing/components/DListingCards.tsx — Listings cards, design D (plan 01; layout from design C).
// The first home is a feature card; the rest are two-column tiles with the price in a glass chip on the photo.
// Missing values are hidden, never shown as "N/A" (TR-001, rule B6).
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { TYPE, body, display } from "../../../theme/d";
import { PressableScale } from "../../../shared/d";
import { SPRING } from "../../../shared/motion/presets";
import { FadeImage } from "../../../../components/FadeImage";
import type { Listing } from "../listingModel";
import type { AvailableRoom } from "../roommateModel";
import { useAuthStore } from "../../../store/auth.store";
import { formatPrice } from "../../../utils/currency";
import { getUserCurrencyCode } from "../utils";

/** True when a model value carries real data (the models fill gaps with "N/A", "—" or 0). */
export function has(v: string | number | null | undefined): boolean {
  if (v == null) return false;
  if (typeof v === "number") return v > 0;
  const t = v.trim();
  return t !== "" && t !== "N/A" && t !== "—" && t !== "-" && t !== "0";
}

export function listingFacts(l: Listing): string[] {
  return [
    l.beds > 0 ? `${l.beds} bed` : l.type?.toLowerCase() === "studio" ? "Studio" : "",
    l.baths > 0 ? `${l.baths} bath` : "",
    has(l.sqft) ? `${l.sqft} sq ft` : "",
  ].filter(Boolean);
}

function SaveButton({ saved, onPress, glass }: { saved: boolean; onPress: () => void; glass?: boolean }) {
  const { tc } = useTheme();
  const sc = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sc.get() }] }));
  return (
    <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={saved ? "Remove from saved" : "Save"} accessibilityState={{ selected: saved }}
      onPress={(e) => { e.stopPropagation?.(); sc.set(withSequence(withTiming(0.8, { duration: 90 }), withSpring(1.15, SPRING.press), withSpring(1, SPRING.press))); onPress(); }}
      style={[s.save, glass && { backgroundColor: tc.glass, borderColor: tc.glassLine, borderWidth: 1 }]}>
      <Animated.View style={st}><Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={18} color={saved ? tc.accentText : tc.textPrimary} /></Animated.View>
    </Pressable>
  );
}

export const ListingFeature = memo(function ListingFeature({ listing: l, saved, onToggleSaveId, onOpen }: {
  listing: Listing; saved: boolean; onToggleSaveId: (id: string) => void; onOpen: (l: Listing) => void;
}) {
  const { tc, isDark } = useTheme();
  const facts = listingFacts(l);
  return (
    <PressableScale onPress={() => onOpen(l)} style={[s.feat, { backgroundColor: tc.cardBg, borderWidth: isDark ? 1 : 0, borderColor: tc.glassLine }]} accessibilityRole="button" accessibilityLabel={`${l.title}, ${l.price} a month`}>
      <View style={{ padding: 6 }}>
        <FadeImage uri={l.images[0]} style={s.featImg} />
        <View style={s.featTop}>{l.isNew ? <View style={[s.glassTag, { backgroundColor: tc.glass, borderColor: tc.glassLine }]}><Text style={[body(700), { fontSize: 12, color: tc.textPrimary }]}>✦ New</Text></View> : <View />}<SaveButton glass saved={saved} onPress={() => onToggleSaveId(l.id)} /></View>
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 14 }}>
        <Text style={[display(700), { fontSize: 18, lineHeight: 22, color: tc.textPrimary }]} numberOfLines={2}>{l.title}</Text>
        <View style={s.metaRow}>
          <Text style={[display(800), { fontSize: 19, color: tc.textPrimary }]}>{l.price}<Text style={[body(500), { fontSize: 13, color: tc.textSecondary }]}>/mo</Text></Text>
          {has(l.location) ? <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>{l.location}</Text> : null}
          {facts.length ? <Text style={[TYPE.small, { color: tc.textSecondary }]}>{facts.slice(0, 2).join(" · ")}</Text> : null}
        </View>
      </View>
    </PressableScale>
  );
});

export const ListingTile = memo(function ListingTile({ listing: l, saved, onToggleSaveId, onOpen }: {
  listing: Listing; saved: boolean; onToggleSaveId: (id: string) => void; onOpen: (l: Listing) => void;
}) {
  const { tc } = useTheme();
  return (
    <PressableScale onPress={() => onOpen(l)} outerStyle={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${l.title}, ${l.price} a month`}>
      <View>
        <FadeImage uri={l.images[0]} style={s.tileImg} />
        <View style={[s.price, { backgroundColor: tc.glass, borderColor: tc.glassLine }]}><Text style={[body(800), { fontSize: 13.5, color: tc.textPrimary }]}>{l.price}</Text></View>
        <View style={{ position: "absolute", top: 8, right: 8 }}><SaveButton glass saved={saved} onPress={() => onToggleSaveId(l.id)} /></View>
      </View>
      <Text style={[display(700), { fontSize: 14.5, lineHeight: 17, color: tc.textPrimary, marginTop: 8, marginHorizontal: 2 }]} numberOfLines={1}>{l.title}</Text>
      {has(l.location) ? <Text style={[TYPE.small, { color: tc.textSecondary, marginHorizontal: 2 }]} numberOfLines={1}>{l.location}</Text> : null}
    </PressableScale>
  );
});

export const RoomTile = memo(function RoomTile({ room, onOpen }: { room: AvailableRoom; onOpen: (r: AvailableRoom) => void }) {
  const { tc } = useTheme();
  const user = useAuthStore((st) => st.user);
  const price = room.rentPerMonth > 0 ? formatPrice(room.rentPerMonth, getUserCurrencyCode(user)) : "";
  const title = room.api?.title || [room.roomType, room.neighborhood || room.location].filter(Boolean).join(" · ");
  const meta = [
    room.availableRooms > 0 ? `${room.availableRooms} free` : "",
    room.currentResidents > 0 ? `${room.currentResidents} living there` : "",
  ].filter(Boolean).join(" · ");
  return (
    <PressableScale onPress={() => onOpen(room)} outerStyle={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={title}>
      <View>
        <FadeImage uri={room.images[0]} style={s.tileImg} />
        {price ? <View style={[s.price, { backgroundColor: tc.glass, borderColor: tc.glassLine }]}><Text style={[body(800), { fontSize: 13.5, color: tc.textPrimary }]}>{price}</Text></View> : null}
      </View>
      <Text style={[display(700), { fontSize: 14.5, lineHeight: 17, color: tc.textPrimary, marginTop: 8, marginHorizontal: 2 }]} numberOfLines={2}>{title}</Text>
      {meta ? <Text style={[TYPE.small, { color: tc.textSecondary, marginHorizontal: 2 }]} numberOfLines={1}>{meta}</Text> : null}
    </PressableScale>
  );
});

const s = StyleSheet.create({
  feat: { marginHorizontal: 16, marginBottom: 14, borderRadius: 24, overflow: "hidden", shadowColor: "#0F283C", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  // Width set outright: margin plus aspectRatio alone left the photo about 22 dp short of the card on the right.
  featImg: { width: "100%", borderRadius: 22, aspectRatio: 16 / 11 },
  featTop: { position: "absolute", top: 18, left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  glassTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  metaRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 10, marginTop: 6 },
  save: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tileImg: { width: "100%", aspectRatio: 1, borderRadius: 22 },
  price: { position: "absolute", left: 8, bottom: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
});
