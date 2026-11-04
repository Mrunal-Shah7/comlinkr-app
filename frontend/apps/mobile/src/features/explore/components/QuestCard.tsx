import { memo } from "react";
import { View, Text, Pressable, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { rs } from "../../../utils/responsive";
import type { ApiChallenge } from "../../../api/challenges.api";

const QUEST_TYPE_META: Record<string, { gradient: [string, string]; color: string; darkBg: string; lightBg: string; icon: string }> = {
  PHOTO:    { gradient: ["#7C3AED", "#5B21B6"], color: "#7C3AED", darkBg: "#1E0A3C", lightBg: "#F5F3FF", icon: "camera-outline" },
  FITNESS:  { gradient: ["#DC2626", "#991B1B"], color: "#DC2626", darkBg: "#2A0A0A", lightBg: "#FEF2F2", icon: "barbell-outline" },
  FOOD:     { gradient: ["#D97706", "#92400E"], color: "#D97706", darkBg: "#261A00", lightBg: "#FFFBEB", icon: "restaurant-outline" },
  EXPLORE:  { gradient: ["#0076EB", "#0054CC"], color: "#0076EB", darkBg: "#001A3D", lightBg: "#EFF6FF", icon: "compass-outline" },
  SOCIAL:   { gradient: ["#26B324", "#166534"], color: "#26B324", darkBg: "#052010", lightBg: "#F0FDF4", icon: "people-outline" },
  CREATIVE: { gradient: ["#DB2777", "#9D174D"], color: "#DB2777", darkBg: "#2A0A1A", lightBg: "#FDF2F8", icon: "color-palette-outline" },
  GREEN:    { gradient: ["#16A34A", "#14532D"], color: "#16A34A", darkBg: "#052A10", lightBg: "#F0FDF4", icon: "leaf-outline" },
  TRIVIA:   { gradient: ["#FF7B00", "#C2410C"], color: "#FF7B00", darkBg: "#261000", lightBg: "#FFF7ED", icon: "help-circle-outline" },
};

const DURATION_LABELS: Record<string, string> = {
  ONE_DAY: "1 Day", THREE_DAYS: "3 Days", ONE_WEEK: "1 Week", TWO_WEEKS: "2 Weeks", ONE_MONTH: "1 Month",
};

/** A quest card in Explore → Quests — styled to match the challenge preview card in create-post. */
export const QuestCard = memo(function QuestCard({
  quest,
  isJoined,
  city,
  onJoin,
}: {
  quest: ApiChallenge;
  isJoined: boolean;
  city: string;
  /** Called only while not joined yet; the screen handles auth + the API call. Must be stable. */
  onJoin: (quest: ApiChallenge) => void;
}) {
  const { isDark } = useTheme();
  const meta = QUEST_TYPE_META[quest.type] ?? { gradient: ["#FF7B00", "#C2410C"] as [string, string], color: "#FF7B00", darkBg: "#261000", lightBg: "#FFF7ED", icon: "star-outline" };
  const endsAt = quest.endsAt ? new Date(quest.endsAt) : null;
  const timeLeft = endsAt ? (() => {
    const diff = endsAt.getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400000);
    if (days >= 1) return `${days}d left`;
    const hrs = Math.floor(diff / 3600000);
    return `${hrs}h left`;
  })() : null;
  const participants = quest.participantsCount ?? 0;
  const maxP = quest.maxParticipants ?? 0;
  const progressPct = maxP > 0 ? Math.min(100, Math.round((participants / maxP) * 100)) : 0;
  const durLabel = DURATION_LABELS[quest.duration] ?? quest.duration;

  return (
    <View
      style={{ backgroundColor: isDark ? "#0D1829" : "#FFF", borderRadius: rs(20), overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: rs(12), shadowOffset: { width: 0, height: rs(3) }, elevation: 4 }}
    >
      {/* Gradient header — matches challenge preview card in create-post */}
      <LinearGradient
        colors={meta.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ padding: rs(16), paddingBottom: rs(20), position: "relative", overflow: "hidden" }}
      >
        {/* Type + duration pills */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6), marginBottom: rs(10) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(8) }}>
            <Ionicons name="trophy" size={11} color="#FF7B00" />
            <Text style={{ fontSize: rs(10), fontWeight: "800", color: "#FFF", letterSpacing: 0.8 }}>{quest.type}</Text>
          </View>
          {durLabel ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(8) }}>
              <Ionicons name="time-outline" size={11} color="#FFF" />
              <Text style={{ fontSize: rs(10), fontWeight: "700", color: "#FFF" }}>{durLabel}</Text>
            </View>
          ) : null}
          {timeLeft ? (
            <View style={{ marginLeft: "auto" as any, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: rs(8), paddingVertical: rs(4), borderRadius: rs(8) }}>
              <Text style={{ fontSize: rs(10), fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>{timeLeft}</Text>
            </View>
          ) : null}
        </View>
        {/* Title */}
        <Text style={{ fontSize: rs(17), fontWeight: "900", color: "#FFF", letterSpacing: -0.3 }} numberOfLines={2}>{quest.title}</Text>
        {/* Location */}
        {quest.location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4), marginTop: rs(6) }}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.75)" />
            <Text style={{ fontSize: rs(11), fontWeight: "600", color: "rgba(255,255,255,0.75)" }}>{quest.location}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Body */}
      <View style={{ padding: rs(16), backgroundColor: isDark ? "#0D1829" : "#FFF" }}>
        {/* Author / status row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(10), marginBottom: rs(12) }}>
          <View style={{ width: rs(34), height: rs(34), borderRadius: rs(10), overflow: "hidden", flexShrink: 0 }}>
            <LinearGradient colors={meta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={meta.icon as any} size={rs(18)} color="#FFF" />
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rs(13), fontWeight: "700", color: isDark ? "#F1F5F9" : "#0A1628" }}>Community Challenge</Text>
            <Text style={{ fontSize: rs(11), fontWeight: "500", color: isDark ? "#64748B" : "#9CA3AF" }}>Active · {city}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: isDark ? "#0A2E14" : "#DCFCE7", borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4) }}>
            <View style={{ width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: isDark ? "#4ADE80" : "#22C55E" }} />
            <Text style={{ fontSize: rs(10), fontWeight: "700", color: isDark ? "#4ADE80" : "#15803D" }}>Active</Text>
          </View>
        </View>

        {/* Description */}
        {quest.details ? (
          <Text style={{ fontSize: rs(13), color: isDark ? "#94A3B8" : "#6B7280", lineHeight: rs(20), marginBottom: rs(12), fontWeight: "500" }} numberOfLines={3}>
            {quest.details}
          </Text>
        ) : null}

        {/* Info chips grid — goal / reward / max participants */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(8), marginBottom: rs(12) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: isDark ? "#2D1200" : "#FFF7ED", borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(6) }}>
            <Ionicons name="flag" size={12} color="#FF7B00" />
            <Text style={{ fontSize: rs(12), fontWeight: "600", color: isDark ? "#FB923C" : "#C2410C" }} numberOfLines={1}>{quest.goalCondition}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: isDark ? "#2A2000" : "#FEF9C3", borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(6) }}>
            <Ionicons name="gift" size={12} color={isDark ? "#FCD34D" : "#CA8A04"} />
            <Text style={{ fontSize: rs(12), fontWeight: "600", color: isDark ? "#FCD34D" : "#A16207" }} numberOfLines={1}>{quest.reward}</Text>
          </View>
          {maxP > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), backgroundColor: isDark ? "#001A3D" : "#E6F4FE", borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(6) }}>
              <Ionicons name="people" size={12} color={isDark ? "#60A5FA" : "#0076EB"} />
              <Text style={{ fontSize: rs(12), fontWeight: "600", color: isDark ? "#60A5FA" : "#0054CC" }}>Max {maxP}</Text>
            </View>
          ) : null}
        </View>

        {/* Hashtags */}
        {quest.hashtags?.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(6), marginBottom: rs(12) }}>
            {quest.hashtags.map((h, i) => (
              <Text key={i} style={{ fontSize: rs(12), fontWeight: "700", color: meta.color }}>
                {h.startsWith("#") ? h : `#${h}`}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Progress bar */}
        <View style={{ marginBottom: rs(14) }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: rs(6) }}>
            <Text style={{ fontSize: rs(11), fontWeight: "700", color: isDark ? "#64748B" : "#6B7280" }}>Participants</Text>
            <Text style={{ fontSize: rs(11), fontWeight: "800", color: meta.color }}>{participants} / {maxP > 0 ? maxP : "∞"}</Text>
          </View>
          <View style={{ height: rs(6), borderRadius: rs(3), backgroundColor: isDark ? "#1F3050" : "#E9EDF5", overflow: "hidden" }}>
            <View style={{ height: rs(6), borderRadius: rs(3), backgroundColor: meta.color, width: `${progressPct}%` as any }} />
          </View>
        </View>

        {/* Action buttons — join + share + bookmark */}
        <View style={{ flexDirection: "row", gap: rs(8) }}>
          <Pressable
            onPress={() => {
              if (isJoined) return;
              onJoin(quest);
            }}
            style={({ pressed }) => ({ flex: 1, borderRadius: rs(14), overflow: "hidden", opacity: pressed ? 0.85 : 1 })}
          >
            {isJoined ? (
              <View style={{ backgroundColor: isDark ? "#0A2E14" : "#DCFCE7", paddingVertical: rs(12), alignItems: "center", borderRadius: rs(14), flexDirection: "row", justifyContent: "center", gap: rs(6) }}>
                <Ionicons name="checkmark-circle" size={16} color={isDark ? "#4ADE80" : "#16A34A"} />
                <Text style={{ fontSize: rs(14), fontWeight: "800", color: isDark ? "#4ADE80" : "#15803D" }}>Quest Joined</Text>
              </View>
            ) : (
              <LinearGradient colors={meta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: rs(12), alignItems: "center", borderRadius: rs(14), flexDirection: "row", justifyContent: "center", gap: rs(6) }}>
                <Ionicons name="flash" size={15} color="#FFF" />
                <Text style={{ fontSize: rs(14), fontWeight: "800", color: "#FFF" }}>Join Challenge</Text>
              </LinearGradient>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void Share.share({
                message: `${quest.title}${quest.details ? ` — ${quest.details}` : ""}\n\nJoin this quest on ComLinkr!`,
              });
            }}
            style={{ width: rs(46), height: rs(46), borderRadius: rs(14), backgroundColor: isDark ? "#1A2840" : "#F3F4F6", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: isDark ? "#1F3050" : "#E5E7EB" }}
          >
            <Ionicons name="share-social-outline" size={18} color={isDark ? "#94A3B8" : "#6B7280"} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});
