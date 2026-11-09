import { useRef } from "react";
// src/features/explore/components/EventCards.tsx — Explore → Events, design D (plan 01).
// Events show as a two-column grid of tiles (design C): a square photo with a glass date chip, the title, then
// "N going · price". Save stays on the tile; RSVP, chat and the rest live in the event detail.
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { FadeImage } from "../../../../components/FadeImage";
import { useTheme } from "../../../theme/useTheme";
import { TYPE, body, display } from "../../../theme/d";
import { PressableScale } from "../../../shared/d";
import { DetailLink, detailHref } from "../../../shared/d/DetailLink";
import { SPRING } from "../../../shared/motion/presets";
import { EVENT_IMAGE_BY_CATEGORY, type ExploreEventRow } from "../models";

export function EventTile({ event, isSaved, onToggleSave, onPress }: {
  event: ExploreEventRow;
  isSaved: boolean;
  onToggleSave: () => void;
  onPress?: () => void;
}) {
  const { tc } = useTheme();
  const sc = useSharedValue(1);
  const imgRef = useRef<View>(null);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: sc.get() }] }));
  const fallback = EVENT_IMAGE_BY_CATEGORY[event.category] ?? EVENT_IMAGE_BY_CATEGORY.Community;
  const meta = [event.interested > 0 ? `${event.interested} going` : "", event.price].filter(Boolean).join(" · ");
  return (
    <DetailLink href={detailHref.event(event.id)} style={{ flex: 1 }}
      actions={[{ title: isSaved ? "Remove from saved" : "Save event", icon: isSaved ? "bookmark.slash" : "bookmark", onPress: onToggleSave }]}>
    <PressableScale onPress={() => onPress?.()} outerStyle={{ flex: 1 }} style={s.tile} accessibilityRole="button" accessibilityLabel={`${event.title}, ${event.date}`}>
      <View>
        <View ref={imgRef} collapsable={false}><FadeImage uri={event.image} fallbackUri={fallback} style={s.img} /></View>
        <View style={[s.chip, { backgroundColor: tc.glass, borderColor: tc.glassLine }]}>
          <Text style={[body(800), { fontSize: 12.5, color: tc.textPrimary }]} numberOfLines={1}>{event.date}</Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => { sc.set(withSequence(withTiming(0.8, { duration: 90 }), withSpring(1.15, SPRING.press), withSpring(1, SPRING.press))); onToggleSave(); }}
          style={[s.save, { backgroundColor: tc.glass, borderColor: tc.glassLine }]}
          accessibilityRole="button" accessibilityLabel={isSaved ? "Remove from saved" : "Save event"} accessibilityState={{ selected: isSaved }}
        >
          <Animated.View style={pop}><Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={17} color={isSaved ? tc.accentText : tc.textPrimary} /></Animated.View>
        </Pressable>
      </View>
      <Text style={[display(700), { fontSize: 14.5, lineHeight: 17, color: tc.textPrimary, marginTop: 8, marginHorizontal: 2 }]} numberOfLines={2}>{event.title}</Text>
      {meta ? <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 2, marginHorizontal: 2 }]} numberOfLines={1}>{meta}</Text> : null}
    </PressableScale>
    </DetailLink>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1 },
  img: { width: "100%", aspectRatio: 1, borderRadius: 22 , borderCurve: "continuous"},
  chip: { position: "absolute", left: 8, bottom: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderCurve: "continuous", borderWidth: 1, maxWidth: "80%" },
  save: { position: "absolute", right: 8, top: 8, width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
