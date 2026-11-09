import { palette } from "../../../theme/palette";
import { usePaletteColor } from "../../../theme/themedStyles";
import { rs } from "../../../utils/responsive";
import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FadeImage, normalizeImageUri } from "../../../../components/FadeImage";
import { useVideoPlayer, VideoView } from "expo-video";
import { type NewsArticle } from "../news";
import { getArticleImage } from "../newsImages";

// ── Comlinkr LIVE NEWS card image ─────────────────────────────────────
// Light-themed branded card using Comlinkr brand colors (blue #1A6BAE, green #30855B).
export function ComlinkrNewsImage({ height, featured = false }: { height?: number; featured?: boolean }) {
  const h = height || 180;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, minHeight: h, overflow: "hidden" }}>
      {/* Base gradient: white → light blue */}
      <LinearGradient
        colors={[palette.white, palette.legacyBlueLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Subtle green accent — bottom-right */}
      <LinearGradient
        colors={["transparent", "rgba(48,133,91,0.10)"]}
        start={{ x: 0.4, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* ── Decorative node-graph (Comlinkr identity) ── */}
      {/* Top-left cluster */}
      <View style={{ position: "absolute", top: rs(14), left: rs(16), width: rs(8), height: rs(8), borderRadius: rs(4), backgroundColor: palette.brandGreen }} />
      <View style={{ position: "absolute", top: rs(28), left: rs(36), width: rs(5), height: rs(5), borderRadius: rs(2.5), backgroundColor: "rgba(48,133,91,0.45)" }} />
      <View style={{ position: "absolute", top: rs(16), left: rs(26), width: rs(14), height: rs(1.5), backgroundColor: "rgba(48,133,91,0.35)", transform: [{ rotate: "38deg" }] }} />
      {/* Top-right cluster */}
      <View style={{ position: "absolute", top: rs(14), right: rs(16), width: rs(8), height: rs(8), borderRadius: rs(4), backgroundColor: palette.brandBlue }} />
      <View style={{ position: "absolute", top: rs(28), right: rs(36), width: rs(5), height: rs(5), borderRadius: rs(2.5), backgroundColor: "rgba(26,107,174,0.45)" }} />
      <View style={{ position: "absolute", top: rs(16), right: rs(26), width: rs(14), height: rs(1.5), backgroundColor: "rgba(26,107,174,0.35)", transform: [{ rotate: "-38deg" }] }} />
      {/* Bottom-left */}
      <View style={{ position: "absolute", bottom: rs(16), left: rs(20), width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: "rgba(26,107,174,0.5)" }} />
      <View style={{ position: "absolute", bottom: rs(28), left: rs(38), width: rs(4), height: rs(4), borderRadius: rs(2), backgroundColor: "rgba(26,107,174,0.2)" }} />
      <View style={{ position: "absolute", bottom: rs(22), left: rs(28), width: rs(12), height: rs(1.5), backgroundColor: "rgba(26,107,174,0.25)", transform: [{ rotate: "-30deg" }] }} />
      {/* Bottom-right */}
      <View style={{ position: "absolute", bottom: rs(16), right: rs(20), width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: "rgba(48,133,91,0.5)" }} />

      {/* Large soft glow behind center */}
      <View style={{ position: "absolute", alignSelf: "center", top: h * 0.05, width: h * 1.1, height: h * 1.1, borderRadius: h * 0.55, backgroundColor: "rgba(26,107,174,0.06)" }} />

      {/* ── Center content ── */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: rs(3) }}>

        {/* Logo mark: search circle + magnifying handle */}
        <View style={{ alignItems: "center", justifyContent: "center", marginBottom: rs(1) }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "rgba(26,107,174,0.25)", backgroundColor: "rgba(26,107,174,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="search" size={15} color={palette.brandBlue} />
          </View>
          <View style={{ position: "absolute", bottom: 0, right: rs(-2), width: rs(8), height: rs(8), borderRadius: rs(4), backgroundColor: palette.brandGreen, borderWidth: 1.5, borderColor: palette.brandBlueLight }} />
        </View>

        {/* LIVE badge */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4), backgroundColor: "rgba(220,38,38,0.88)", paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(4) }}>
          <View style={{ width: rs(5), height: rs(5), borderRadius: rs(2.5), backgroundColor: palette.white }} />
          <Text style={{ color: palette.white, fontSize: 9, fontWeight: "900", letterSpacing: 1 }}>LIVE</Text>
        </View>

        {/* NEWS word */}
        <Text style={{ color: palette.brandBlue, fontSize: 15, fontWeight: "900", letterSpacing: 5, marginTop: rs(-1) }}>NEWS</Text>

        {/* COMLINKR brand */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4) }}>
          <View style={{ width: rs(1.5), height: rs(8), backgroundColor: palette.brandGreen, borderRadius: rs(1) }} />
          <Text style={{ color: palette.brandBlue, fontSize: rs(7), fontWeight: "800", letterSpacing: 3 }}>COMLINKR</Text>
          <View style={{ width: rs(1.5), height: rs(8), backgroundColor: palette.brandBlue, borderRadius: rs(1) }} />
        </View>

      </View>
    </View>
  );
}

// Keep alias so existing fallbackComponent references still compile
export function ComlinkrNewsFallback({ height }: { height?: number }) {
  return <ComlinkrNewsImage height={height} />;
}

export function StoryVideoThumb({ uri, style }: { uri: string; style: object }) {
  const player = useVideoPlayer(uri, (p) => { p.muted = true; p.pause(); });
  return <VideoView player={player} style={style as any} contentFit="cover" nativeControls={false} />;
}

/**
 * Live News card/modal hero: always paint category placeholder first, then overlay RSS image.
 * Publisher URLs often hang without onLoad/onError; FadeImage stayed at opacity 0 → gray box.
 */
export function NewsLeadImage({
  article,
  city,
  userCountry,
  style,
  remoteUri,
  featured = false,
  variant = "card",
}: {
  article: NewsArticle;
  city: string;
  userCountry: string;
  style: object;
  remoteUri: string | null | undefined;
  /** Taller featured card (list only) — matches `newsCardImg` + height 220 */
  featured?: boolean;
  /** Modal hero uses taller ComlinkrNewsImage */
  variant?: "card" | "modal";
}) {
  const pc = usePaletteColor();
  const remote = remoteUri?.trim();
  const hasFeedImage = !!remote;
  const placeholderUri = hasFeedImage ? getArticleImage(article, city, userCountry) : "";
  const [remoteOk, setRemoteOk] = useState(!!remote);

  useEffect(() => {
    setRemoteOk(!!remote);
  }, [remote]);

  const comlinkrHeight = variant === "modal" ? 240 : featured ? 120 : 100;
  const comlinkrFeatured = variant === "modal" || featured;

  return (
    <View style={[style, { backgroundColor: pc(palette.neutralL94, "backgroundColor"), overflow: "hidden" }]}>
      {hasFeedImage ? (
        <FadeImage // SPRINT-42: use the shared renderer for the feed-image placeholder layer.
          uri={normalizeImageUri(placeholderUri)} // SPRINT-42: normalize the placeholder asset.
          style={StyleSheet.absoluteFill}
          cachePolicy="disk"
          transition={300}
        />
      ) : (
        <ComlinkrNewsImage height={comlinkrHeight} featured={comlinkrFeatured} />
      )}
      {remote && remoteOk ? (
        <FadeImage // SPRINT-42: use the shared renderer for the remote feed-image layer.
          uri={normalizeImageUri(remote)} // SPRINT-42: normalize the remote asset.
          style={StyleSheet.absoluteFill}
          cachePolicy="disk"
          transition={300}
          onError={() => setRemoteOk(false)}
        />
      ) : null}
    </View>
  );
}
