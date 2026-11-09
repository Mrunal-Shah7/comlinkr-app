// SPRINT-31: shared expo-image replacement for Animated.Image fade-in helpers
import { palette } from "../src/theme/palette";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Image, type ImageContentFit } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/theme/useTheme";

export type FadeImageResizeMode = "cover" | "contain" | "stretch" | "center";

function toContentFit(mode: FadeImageResizeMode): ImageContentFit {
  if (mode === "stretch") return "fill";
  if (mode === "center") return "none"; // SPRINT-31: RN center ≈ expo-image none
  if (mode === "contain") return "contain";
  return "cover";
}

export function normalizeImageUri(u: string): string {
  const s = u.trim();
  if (s.startsWith("//")) return `https:${s}`; // SPRINT-31
  return s;
}

export function resolveImageUri(uri: unknown): string {
  if (typeof uri === "string" && uri.length > 0) return normalizeImageUri(uri);
  if (uri && typeof uri === "object" && typeof (uri as { url?: unknown }).url === "string") {
    return normalizeImageUri((uri as { url: string }).url);
  }
  return "";
}

export function FadeImage({
  uri,
  style,
  resizeMode = "cover",
  fallbackIcon = "image-outline",
  fallbackComponent,
  fallbackUri,
  cachePolicy = "memory-disk",
  transition = 200,
  showLoadingSpinner = false,
  placeholderBg,
  accessibilityLabel,
  onError, // SPRINT-42: allow composed image surfaces to retain their existing failure behavior.
}: {
  uri: unknown;
  style: object;
  resizeMode?: FadeImageResizeMode;
  fallbackIcon?: string;
  fallbackComponent?: React.ReactNode;
  fallbackUri?: string;
  cachePolicy?: "memory-disk" | "disk" | "memory";
  transition?: number;
  showLoadingSpinner?: boolean;
  placeholderBg?: string;
  /** Describe the image for screen readers; omit for purely decorative images. */
  accessibilityLabel?: string;
  onError?: () => void; // SPRINT-42: optional caller notification after the shared fallback engages.
}) {
  const { isDark, tc } = useTheme();
  const bg = placeholderBg ?? (isDark ? tc.skeletonBg : palette.neutralL94);
  const iconColor = isDark ? tc.textTertiary : palette.blueL74;
  const [activeUri, setActiveUri] = useState(() => resolveImageUri(uri));
  const [usedFallback, setUsedFallback] = useState(false);
  const [errored, setErrored] = useState(false);
  const [loading, setLoading] = useState(showLoadingSpinner);

  useEffect(() => {
    setActiveUri(resolveImageUri(uri));
    setUsedFallback(false);
    setErrored(false);
    setLoading(showLoadingSpinner);
  }, [uri, showLoadingSpinner]);

  const handleError = () => {
    if (!usedFallback && fallbackUri && activeUri !== fallbackUri) {
      setUsedFallback(true);
      setActiveUri(fallbackUri);
      setErrored(false);
      return;
    }
    setErrored(true);
    setLoading(false);
    onError?.(); // SPRINT-42: notify callers that need to hide or replace a failed remote layer.
  };

  const noUri = !resolveImageUri(uri);
  const contentFit = toContentFit(resizeMode);

  return (
    <View
      style={[
        style,
        { backgroundColor: bg, overflow: "hidden", alignItems: "center", justifyContent: "center" },
      ]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
    >
      {errored || noUri ? (
        fallbackComponent ?? <Ionicons name={fallbackIcon as any} size={32} color={iconColor} />
      ) : (
        <>
          {loading && showLoadingSpinner ? (
            <ActivityIndicator size="small" color={iconColor} style={{ position: "absolute", zIndex: 1 }} />
          ) : null}
          <Image
            key={activeUri}
            source={{ uri: activeUri }}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
            cachePolicy={cachePolicy}
            transition={transition}
            onLoadStart={() => showLoadingSpinner && setLoading(true)}
            onLoad={() => setLoading(false)}
            onError={handleError}
          />
        </>
      )}
    </View>
  );
}
