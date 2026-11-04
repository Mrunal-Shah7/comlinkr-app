import { rs } from "../../../utils/responsive";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { FadeImage } from "../../../../components/FadeImage";
import { RatingSummary } from "../../../../components/events";
import { type ExploreEventRow, EVENT_IMAGE_BY_CATEGORY } from "../models";
import { CATEGORY_COLOR } from "../constants";

// ── Featured event card (Events tab) ─────────────────────
export function FeaturedEventCard({
  event,
  isSaved,
  onToggleSave,
  isRegistered,
  onToggleGoing,
  canAccessEventChat,
  conversationId,
  onPress,
  rsvp,
}: {
  event: ExploreEventRow;
  isSaved: boolean;
  onToggleSave: () => void;
  isRegistered: boolean;
  onToggleGoing: () => void;
  canAccessEventChat: boolean;
  conversationId: string | null;
  onPress?: () => void;
  rsvp?: () => void;
}) {
  const catColor = CATEGORY_COLOR[event.category] ?? { bg: "#EBF4FF", text: "#0076EB" };
  const feFallback =
    EVENT_IMAGE_BY_CATEGORY[event.category] ?? EVENT_IMAGE_BY_CATEGORY.Community;
  return (
    <Pressable style={fe.card} onPress={onPress}>
      <FadeImage uri={event.image} fallbackUri={feFallback} style={fe.img} />
      <LinearGradient
        colors={["transparent", "rgba(4,12,24,0.88)"]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
        style={fe.overlay}
      >
        {/* Badges row */}
        <View style={fe.badgeRow}>
          <View style={[fe.catBadge, { backgroundColor: catColor.bg }]}>
            <Text style={[fe.catText, { color: catColor.text }]}>{event.category}</Text>
          </View>
          <View style={fe.dateBadge}>
            <Ionicons name="calendar-outline" size={11} color="#FFF" />
            <Text style={fe.dateText}>{event.date}</Text>
          </View>
        </View>

        <Text style={fe.title} numberOfLines={2}>{event.title}</Text>
        <RatingSummary // SPRINT-42: featured card aggregate
          averageRating={event.averageRating}
          totalReviews={event.totalReviews}
          size="sm"
          textColor="#FFF"
          mutedColor="rgba(255,255,255,0.7)"
          style={{ marginBottom: rs(6) }}
        />
        <View style={fe.meta}>
          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.75)" />
          <Text style={fe.metaText}>{event.time}</Text>
          <View style={fe.dot} />
          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.75)" />
          <Text style={fe.metaText}>{event.location}</Text>
        </View>
        {/* Action row — flex-wrapped so nothing clips */}
        <View style={fe.bottom}>
          <View style={fe.goingPill}>
            <Ionicons name="people" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={fe.goingText}>{event.interested} going</Text>
          </View>

          {/* Save (bookmark) */}
          <Pressable
            style={[fe.intBtn, isSaved && fe.saveBtnActive]}
            onPress={onToggleSave}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={14}
              color={isSaved ? "#FBBF24" : "#FFF"}
            />
            <Text style={[fe.intBtnText, isSaved && fe.saveBtnTextActive]}>
              {isSaved ? "Saved" : "Save"}
            </Text>
          </Pressable>

          {/* Event group chat — only when server allows access */}
          {canAccessEventChat && conversationId ? (
            <Pressable
              style={fe.chatIconBtn}
              onPress={() =>
                router.push({ pathname: "/chat", params: { conversationId } } as any)
              }
            >
              <Ionicons name="chatbubbles-outline" size={12} color="#FFF" />
            </Pressable>
          ) : null}

          {/* RSVP / attendance */}
          {isRegistered ? (
            <Pressable
              style={[fe.intBtn, fe.goingBtnActive]}
              onPress={onToggleGoing}
            >
              <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
              <Text style={[fe.intBtnText, fe.goingBtnTextActive]}>Going</Text>
            </Pressable>
          ) : (
            <Pressable style={{ borderRadius: rs(18), overflow: "hidden" }} onPress={rsvp}>
              <LinearGradient
                colors={["#FF7B00", "#E56800"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={fe.rsvpBtn}
              >
                <Text style={fe.rsvpText}>RSVP</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export const fe = StyleSheet.create({
  card: {
    marginHorizontal: rs(14),
    marginTop: rs(14),
    borderRadius: rs(22),
    overflow: "hidden",
    height: rs(240),
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: rs(16),
    elevation: 8,
  },
  img: { ...StyleSheet.absoluteFill },
  overlay: {
    ...StyleSheet.absoluteFill,
    padding: rs(16),
    justifyContent: "flex-end",
  },
  badgeRow: { flexDirection: "row", gap: rs(8), marginBottom: rs(10) },
  catBadge: { paddingHorizontal: rs(9), paddingVertical: rs(4), borderRadius: rs(8) },
  catText: { fontSize: rs(10), fontWeight: "800", letterSpacing: 0.5 },
  dateBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: rs(9), paddingVertical: rs(4), borderRadius: rs(8),
  },
  dateText: { fontSize: rs(10), fontWeight: "700", color: "#FFF" },
  title: { fontSize: rs(20), fontWeight: "800", color: "#FFF", lineHeight: rs(26), marginBottom: rs(8), letterSpacing: -0.3 },
  meta: { flexDirection: "row", alignItems: "center", gap: rs(5), marginBottom: rs(12) },
  metaText: { fontSize: rs(12), color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  dot: { width: rs(3), height: rs(3), borderRadius: rs(2), backgroundColor: "rgba(255,255,255,0.4)" },
  bottom: {
    flexDirection: "row", alignItems: "center", justifyContent: "flex-start",
    gap: rs(8),
    flexWrap: "wrap",
  },
  goingPill: { flexDirection: "row", alignItems: "center", gap: rs(5) },
  goingText: { fontSize: rs(11), fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  intBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: rs(10), paddingVertical: rs(7), borderRadius: rs(20),
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  saveBtnActive: { backgroundColor: "rgba(251,191,36,0.22)", borderColor: "#FBBF24" },
  saveBtnTextActive: { color: "#FDE68A" },
  goingBtnActive: { backgroundColor: "rgba(74,222,128,0.2)", borderColor: "#4ADE80" },
  goingBtnTextActive: { color: "#4ADE80" },
  intBtnText: { fontSize: rs(11), fontWeight: "700", color: "#FFF" },
  chatIconBtn: {
    width: rs(28), height: rs(28), borderRadius: rs(14),
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  rsvpBtn: {
    paddingHorizontal: rs(14), paddingVertical: rs(7), borderRadius: rs(18),
    alignItems: "center", justifyContent: "center",
  },
  rsvpText: { fontSize: rs(11), fontWeight: "900", color: "#FFF", letterSpacing: 0.5 },
});

// ── Event card with action row ────────────────────────────
export function EventRowCard({
  event,
  isSaved,
  onToggleSave,
  isRegistered,
  onToggleGoing,
  canAccessEventChat,
  conversationId,
  onPress,
  rsvp,
}: {
  event: ExploreEventRow;
  isSaved: boolean;
  onToggleSave: () => void;
  isRegistered: boolean;
  onToggleGoing: () => void;
  canAccessEventChat: boolean;
  conversationId: string | null;
  onPress?: () => void;
  rsvp?: () => void;
}) {
  const { tc, isDark } = useTheme();
  const catColor = CATEGORY_COLOR[event.category] ?? { bg: "#EBF4FF", text: "#0076EB" };
  const isFree = event.price === "Free";
  const erFallback =
    EVENT_IMAGE_BY_CATEGORY[event.category] ?? EVENT_IMAGE_BY_CATEGORY.Community;
  return (
    <Pressable style={[er.card, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]} onPress={onPress}>
      {/* Top: thumbnail + info */}
      <View style={er.topSection}>
        <View>
          <FadeImage uri={event.image} fallbackUri={erFallback} style={er.thumb} />
          <View style={[er.priceBadge, { backgroundColor: isFree ? "#DCFCE7" : "#FFF3E6" }]}>
            <Text style={[er.priceText, { color: isFree ? "#16A34A" : "#FF7B00" }]}>{event.price}</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: rs(4) }}>
          <View style={er.topRow}>
            <View style={[er.catChip, { backgroundColor: catColor.bg }]}>
              <Text style={[er.catText, { color: catColor.text }]}>{event.category}</Text>
            </View>
            <Text style={[er.hostText, isDark && { color: tc.textSecondary }]} numberOfLines={1}>{event.host}</Text>
          </View>
          <Text style={[er.title, isDark && { color: tc.textPrimary }]} numberOfLines={2}>{event.title}</Text>
          <RatingSummary // SPRINT-42: event row card aggregate
            averageRating={event.averageRating}
            totalReviews={event.totalReviews}
            size="sm"
            textColor={tc.textPrimary}
            mutedColor={tc.textTertiary}
          />
          <Text style={[er.desc, isDark && { color: tc.textSecondary }]} numberOfLines={1}>{event.desc}</Text>
          <View style={er.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={Colors.brand.orange} />
            <Text style={er.meta}>{event.date} · {event.time}</Text>
          </View>
          <View style={er.metaRow}>
            <Ionicons name="location-outline" size={11} color={isDark ? tc.textTertiary : Colors.text.tertiary} />
            <Text style={[er.loc, isDark && { color: tc.textTertiary }]} numberOfLines={1}>{event.location}</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[er.divider, isDark && { backgroundColor: tc.borderLight }]} />

      {/* Action row */}
      <View style={er.actionRow}>
        <View style={er.goingWrap}>
          <Ionicons name="people" size={12} color={isDark ? tc.textSecondary : Colors.text.tertiary} />
          <Text style={[er.goingText, isDark && { color: tc.textSecondary }]}>{event.interested} going</Text>
        </View>
        <View style={[er.actionsRight, { flexWrap: "wrap", justifyContent: "flex-end" }]}>
          {canAccessEventChat && conversationId ? (
            <Pressable
              style={er.chatBtn}
              onPress={() =>
                router.push({ pathname: "/chat", params: { conversationId } } as any)
              }
            >
              <Ionicons name="chatbubbles-outline" size={13} color={Colors.brand.orange} />
            </Pressable>
          ) : null}
          <Pressable
            style={[er.intBtn, isSaved && er.saveRowBtnActive]}
            onPress={onToggleSave}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={14}
              color={isSaved ? "#D97706" : Colors.brand.orange}
            />
            <Text style={[er.intText, isSaved && { color: "#D97706" }]}>
              {isSaved ? "Saved" : "Save"}
            </Text>
          </Pressable>
          {isRegistered ? (
            <Pressable style={[er.intBtn, er.intBtnActive]} onPress={onToggleGoing}>
              <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
              <Text style={[er.intText, { color: "#16A34A" }]}>Going</Text>
            </Pressable>
          ) : (
            <Pressable style={{ borderRadius: rs(12), overflow: "hidden" }} onPress={rsvp}>
              <LinearGradient
                colors={["#FF7B00", "#E56800"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={er.rsvpBtn}
              >
                <Text style={er.rsvpText}>RSVP</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export const er = StyleSheet.create({
  card: {
    backgroundColor: "#FFF", borderRadius: rs(18),
    marginBottom: rs(12), borderWidth: 1, borderColor: "#ECEEF1",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: rs(10), elevation: 3,
    overflow: "hidden",
  },
  topSection: { flexDirection: "row", alignItems: "flex-start", gap: rs(12), padding: rs(14) },
  thumb: { width: rs(90), height: rs(100), borderRadius: rs(14) },
  priceBadge: {
    position: "absolute", bottom: rs(5), left: rs(5),
    paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: rs(6),
  },
  priceText: { fontSize: rs(9), fontWeight: "800", letterSpacing: 0.3 },
  topRow: { flexDirection: "row", alignItems: "center", gap: rs(6) },
  catChip: { paddingHorizontal: rs(7), paddingVertical: rs(2), borderRadius: rs(6) },
  catText: { fontSize: rs(9), fontWeight: "800", letterSpacing: 0.3 },
  hostText: { fontSize: rs(10), color: Colors.text.tertiary, fontWeight: "500", flex: 1 },
  title: { fontSize: rs(13), fontWeight: "700", color: Colors.text.primary, lineHeight: rs(18) },
  desc: { fontSize: rs(11), color: Colors.text.secondary, lineHeight: rs(16) },
  metaRow: { flexDirection: "row", alignItems: "center", gap: rs(4) },
  meta: { fontSize: rs(11), color: Colors.brand.orange, fontWeight: "600" },
  loc: { fontSize: rs(11), color: Colors.text.tertiary, fontWeight: "400", flex: 1 },

  divider: { height: rs(1), backgroundColor: "#F3F5F8", marginHorizontal: 0 },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(12),
    paddingVertical: rs(9),
  },
  goingWrap: { flexDirection: "row", alignItems: "center", gap: rs(4) },
  goingText: { fontSize: rs(11), fontWeight: "600", color: Colors.text.tertiary },
  actionsRight: { flexDirection: "row", alignItems: "center", gap: rs(6) },
  chatBtn: {
    width: rs(28), height: rs(28), borderRadius: rs(14),
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFF3E6",
  },
  intBtn: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "#FFF3E6",
    paddingHorizontal: rs(10), paddingVertical: rs(7), borderRadius: rs(20),
  },
  saveRowBtnActive: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FBBF24" },
  intBtnActive: { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#16A34A" },
  intText: { fontSize: rs(11), fontWeight: "700", color: Colors.brand.orange },
  rsvpBtn: {
    paddingHorizontal: rs(14), paddingVertical: rs(7), borderRadius: rs(12),
    alignItems: "center", justifyContent: "center",
    shadowColor: "#FF7B00", shadowOpacity: 0.3, shadowRadius: rs(4), elevation: 3,
  },
  rsvpText: { fontSize: rs(11), fontWeight: "900", color: "#FFF", letterSpacing: 0.5 },
});
