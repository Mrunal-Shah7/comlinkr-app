// SPRINT-40: voice-message playback and delivery-state renderer
import { useEffect, useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { rs } from "../src/utils/responsive";
import {
  getVoicePlaybackSnapshot,
  stopVoicePlaybackIfActive,
  subscribeVoicePlayback,
  toggleVoicePlayback,
} from "../src/services/audioPlayback";
import { createThemedStyles } from '../src/theme/themedStyles';

export type VoiceDeliveryState = "sent" | "uploading" | "failed";

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function VoiceMessageBubble({
  messageId,
  url,
  durationSeconds,
  isOwn,
  deliveryState,
  deliveryError,
  onRetryDelivery,
}: {
  messageId: string;
  url: string;
  durationSeconds: number;
  isOwn: boolean;
  deliveryState: VoiceDeliveryState;
  deliveryError?: string;
  onRetryDelivery?: () => void;
}) {
  const playback = useSyncExternalStore(
    subscribeVoicePlayback,
    getVoicePlaybackSnapshot,
    getVoicePlaybackSnapshot,
  );
  const isActive = playback.activeMessageId === messageId;
  // Prefer the real duration reported by the native player once it's loaded — the
  // server-provided durationSeconds can be wrong (e.g. a stale/default value), which
  // otherwise makes the progress bar and "current / total" label look broken once
  // playback runs past that reported length.
  const effectiveDuration = isActive && playback.playerDuration ? playback.playerDuration : durationSeconds;
  const progress = isActive
    ? Math.min(1, Math.max(0, playback.currentTime / Math.max(1, effectiveDuration)))
    : 0;
  const playbackError = isActive ? playback.errorMessage : null;
  const canPlay = deliveryState === "sent" && Boolean(url);

  useEffect(
    () => () => {
      stopVoicePlaybackIfActive(messageId);
    },
    [messageId],
  );

  return (
    <View
      style={[
        styles.bubble,
        { backgroundColor: isOwn ? Colors.brand.blue : "#FFFFFF" },
        !isOwn && styles.incomingBubble,
      ]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isActive && playback.playing ? "Pause voice message" : "Play voice message"}
          disabled={!canPlay}
          onPress={() => void toggleVoicePlayback(messageId, url)}
          style={[
            styles.playButton,
            { backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : Colors.brand.blueLight },
          ]}
        >
          {deliveryState === "uploading" || (isActive && playback.buffering && !playback.loaded) ? (
            <ActivityIndicator size="small" color={isOwn ? "#FFFFFF" : Colors.brand.blue} />
          ) : (
            <Ionicons
              name={isActive && playback.playing ? "pause" : "play"}
              size={rs(18)}
              color={isOwn ? "#FFFFFF" : Colors.brand.blue}
            />
          )}
        </Pressable>

        <View style={styles.progressColumn}>
          <View
            style={[
              styles.track,
              { backgroundColor: isOwn ? "rgba(255,255,255,0.28)" : "#D9E7F7" },
            ]}
          >
            <View
              style={[
                styles.progress,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: isOwn ? "#FFFFFF" : Colors.brand.blue,
                },
              ]}
            />
          </View>
          <Text style={[styles.duration, { color: isOwn ? "rgba(255,255,255,0.9)" : Colors.text.secondary }]}>
            {deliveryState === "uploading"
              ? "Uploading…"
              : isActive && playback.currentTime > 0
                ? `${formatDuration(playback.currentTime)} / ${formatDuration(effectiveDuration)}`
                : formatDuration(durationSeconds)}
          </Text>
        </View>
      </View>

      {deliveryState === "failed" ? (
        <View style={styles.errorRow}>
          <Text style={[styles.errorText, { color: isOwn ? "#FFE4E4" : Colors.text.error }]} numberOfLines={2}>
            {deliveryError || "Voice message failed to send."}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Retry sending voice message" onPress={onRetryDelivery}>
            <Text style={[styles.retryText, { color: isOwn ? "#FFFFFF" : Colors.brand.blue }]}>Retry</Text>
          </Pressable>
        </View>
      ) : playbackError ? (
        <View style={styles.errorRow}>
          <Text style={[styles.errorText, { color: isOwn ? "#FFE4E4" : Colors.text.error }]} numberOfLines={2}>
            {playbackError}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry playing voice message"
            onPress={() => void toggleVoicePlayback(messageId, url)}
          >
            <Text style={[styles.retryText, { color: isOwn ? "#FFFFFF" : Colors.brand.blue }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = createThemedStyles({
  bubble: {
    minWidth: rs(190),
    maxWidth: rs(270),
    borderRadius: rs(18),
    paddingHorizontal: rs(12),
    paddingVertical: rs(11),
  },
  incomingBubble: {
    shadowColor: "#0A2540",
    shadowOpacity: 0.07,
    shadowRadius: rs(5),
    shadowOffset: { width: 0, height: rs(2) },
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: rs(10) },
  playButton: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    alignItems: "center",
    justifyContent: "center",
  },
  progressColumn: { flex: 1, gap: rs(6) },
  track: { height: rs(4), borderRadius: rs(2), overflow: "hidden" },
  progress: { height: "100%", borderRadius: rs(2) },
  duration: { fontSize: rs(10), fontWeight: "700" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: rs(8), marginTop: rs(8) },
  errorText: { flex: 1, fontSize: rs(10), fontWeight: "600" },
  retryText: { fontSize: rs(11), fontWeight: "900" },
});
