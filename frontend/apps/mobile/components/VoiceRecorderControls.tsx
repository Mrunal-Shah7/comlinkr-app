// SPRINT-40: tap-to-record composer controls, permission handling, duration, and cleanup
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Keyboard, Linking, Pressable, StyleSheet, Text, View } from "react-native"; // SPRINT-40:
import { Ionicons } from "@expo/vector-icons";
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import { Colors } from "../src/theme/colors";
import { rs } from "../src/utils/responsive";
import {
  configureVoicePlaybackAudioMode,
  configureVoiceRecordingAudioMode,
} from "../src/services/audioSession";
import { stopAndReleaseVoicePlayback } from "../src/services/audioPlayback"; // SPRINT-40:
import { appAlert } from '../src/shared/ui/Dialogs';
import { createThemedStyles } from '../src/theme/themedStyles';

const MAX_RECORDING_MS = 600_000;

const PLATFORM_AUDIO_MIME: Record<"ios" | "android", "audio/mp4"> = {
  ios: "audio/mp4",
  android: "audio/mp4",
};

export type CompletedVoiceRecording = {
  uri: string;
  durationSeconds: number;
  mimeType: "audio/mp4";
  fileName: string;
};

type ReadyRecording = CompletedVoiceRecording & { maximumReached: boolean };

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.min(600, Math.round(seconds)));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function deleteTemporaryVoiceRecording(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn("[Sprint 40] Temporary voice recording cleanup failed", error);
  }
}

export function VoiceRecorderControls({
  disabled,
  onRecordingReady,
  onActiveChange, // SPRINT-40:
}: {
  disabled: boolean;
  onRecordingReady: (recording: CompletedVoiceRecording) => void;
  onActiveChange?: (active: boolean) => void; // SPRINT-40:
}) {
  const [mode, setMode] = useState<"idle" | "recording" | "ready">("idle");
  const [readyRecording, setReadyRecording] = useState<ReadyRecording | null>(null);
  const [nativeFinishSequence, setNativeFinishSequence] = useState(0); // SPRINT-40: observe forDuration completion even after native duration resets
  const [nativeErrorMessage, setNativeErrorMessage] = useState<string | null>(null); // SPRINT-40:
  const nativeFinishBaselineRef = useRef(0); // SPRINT-40: distinguish this take from prior stop events
  const readyRecordingRef = useRef<ReadyRecording | null>(null); // SPRINT-40: unmount cleanup without deleting a draft handed to upload
  readyRecordingRef.current = readyRecording; // SPRINT-40:
  const finishingRef = useRef(false);
  const startingRef = useRef(false); // SPRINT-40: prevent overlapping permission/prepare calls
  const interruptionAlertShownRef = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const durationMillisRef = useRef(0); // SPRINT-40: latch duration before native auto-stop resets status
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => { // SPRINT-40:
    if (status.hasError) setNativeErrorMessage(status.error || "Recording was interrupted."); // SPRINT-40:
    if (status.isFinished) setNativeFinishSequence((value) => value + 1); // SPRINT-40:
  }); // SPRINT-40:
  const recorderState = useAudioRecorderState(recorder, 250);
  if (mode === "recording") { // SPRINT-40:
    durationMillisRef.current = Math.max(durationMillisRef.current, recorderState.durationMillis); // SPRINT-40:
  } // SPRINT-40:

  useEffect(() => { // SPRINT-40: let the composer hide text controls without remounting the recorder
    onActiveChange?.(mode !== "idle"); // SPRINT-40:
  }, [mode, onActiveChange]); // SPRINT-40:

  const showPermissionMessage = useCallback((permanent: boolean) => {
    appAlert(
      "Microphone access needed",
      permanent
        ? "Microphone access is disabled for ComLinkr. Open system settings to enable it before recording a voice message."
        : "Voice messages require microphone access. You can enable it in system settings.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const existing = await getRecordingPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) {
      showPermissionMessage(true);
      return false;
    }
    const requested = await requestRecordingPermissionsAsync();
    if (requested.granted) return true;
    showPermissionMessage(!requested.canAskAgain);
    return false;
  }, [showPermissionMessage]);

  const resetToPlaybackMode = useCallback(async () => {
    try {
      await configureVoicePlaybackAudioMode();
    } catch (error) {
      console.warn("[Sprint 40] Could not reset playback audio mode", error);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || modeRef.current !== "idle" || startingRef.current) return; // SPRINT-40:
    startingRef.current = true; // SPRINT-40:
    try {
      const permitted = await ensurePermission();
      if (!permitted) return;
      Keyboard.dismiss(); // SPRINT-40:
      stopAndReleaseVoicePlayback(); // SPRINT-40: recording and playback never overlap
      await configureVoiceRecordingAudioMode();
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY); // SPRINT-40: force a fresh native URI before every take
      durationMillisRef.current = 0; // SPRINT-40:
      nativeFinishBaselineRef.current = nativeFinishSequence; // SPRINT-40:
      setNativeErrorMessage(null); // SPRINT-40:
      recorder.record({ forDuration: 600 });
      interruptionAlertShownRef.current = false;
      setMode("recording");
    } catch (error) {
      console.warn("[Sprint 40] Voice recording could not start", error);
      await resetToPlaybackMode();
      appAlert("Could not record", "ComLinkr could not start the microphone. Please try again.");
    } finally {
      startingRef.current = false; // SPRINT-40:
    }
  }, [disabled, ensurePermission, nativeFinishSequence, recorder, resetToPlaybackMode]); // SPRINT-40:

  const finishRecording = useCallback(
    async (offerBeforeSending: boolean) => {
      if (finishingRef.current || modeRef.current !== "recording") return;
      finishingRef.current = true;
      try {
        const beforeStop = recorder.getStatus();
        if (beforeStop.isRecording) await recorder.stop();
        const afterStop = recorder.getStatus();
        const durationMillis = Math.min(
          MAX_RECORDING_MS,
          Math.max(durationMillisRef.current, beforeStop.durationMillis, afterStop.durationMillis), // SPRINT-40:
        );
        const uri = recorder.uri ?? afterStop.url;
        await resetToPlaybackMode();
        const roundedSeconds = Math.round(durationMillis / 1000);

        if (!uri || roundedSeconds < 1) {
          if (uri) deleteTemporaryVoiceRecording(uri);
          setReadyRecording(null);
          setMode("idle");
          durationMillisRef.current = 0; // SPRINT-40:
          return;
        }

        const platform = process.env.EXPO_OS === "ios" ? "ios" : "android";
        const completed: ReadyRecording = {
          uri,
          durationSeconds: Math.min(600, Math.max(1, roundedSeconds)),
          mimeType: PLATFORM_AUDIO_MIME[platform],
          fileName: `voice-message-${Date.now()}.m4a`,
          maximumReached: offerBeforeSending,
        };

        if (offerBeforeSending) {
          setReadyRecording(completed);
          setMode("ready");
          appAlert("Maximum length reached", "Voice messages can be up to 10 minutes. Send or discard this recording.");
        } else {
          setReadyRecording(null);
          setMode("idle");
          durationMillisRef.current = 0; // SPRINT-40:
          onRecordingReady(completed);
        }
      } catch (error) {
        console.warn("[Sprint 40] Voice recording could not stop", error);
        const uri = recorder.uri;
        if (uri) deleteTemporaryVoiceRecording(uri);
        await resetToPlaybackMode();
        setReadyRecording(null);
        setMode("idle");
        durationMillisRef.current = 0; // SPRINT-40:
        appAlert("Recording cancelled", "The recording was interrupted and was not saved.");
      } finally {
        finishingRef.current = false;
      }
    },
    [onRecordingReady, recorder, resetToPlaybackMode],
  );

  const discardRecording = useCallback(
    async (interrupted = false) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      try {
        const status = recorder.getStatus();
        if (status.isRecording) await recorder.stop();
        const uri = readyRecordingRef.current?.uri ?? recorder.uri ?? status.url; // SPRINT-40:
        if (uri) deleteTemporaryVoiceRecording(uri);
      } catch {
        const uri = readyRecordingRef.current?.uri ?? recorder.uri; // SPRINT-40:
        if (uri) deleteTemporaryVoiceRecording(uri);
      } finally {
        await resetToPlaybackMode();
        setReadyRecording(null);
        setMode("idle");
        durationMillisRef.current = 0; // SPRINT-40:
        finishingRef.current = false;
      }
      if (interrupted && !interruptionAlertShownRef.current) {
        interruptionAlertShownRef.current = true;
        appAlert("Recording cancelled", "The recording stopped because ComLinkr was interrupted or moved to the background.");
      }
    },
    [recorder, resetToPlaybackMode], // SPRINT-40:
  );

  useEffect(() => {
    if (mode !== "recording") return;
    if (recorderState.durationMillis >= 599_500) { // SPRINT-40: latch and stop before native status clears at forDuration
      void finishRecording(true);
    }
  }, [finishRecording, mode, recorderState.durationMillis]);

  useEffect(() => {
    if (mode === "recording" && nativeFinishSequence > nativeFinishBaselineRef.current && !nativeErrorMessage) { // SPRINT-40: this take's forDuration completed natively
      durationMillisRef.current = MAX_RECORDING_MS; // SPRINT-40: native stop may already have reset duration to zero
      void finishRecording(true); // SPRINT-40:
    } // SPRINT-40:
  }, [finishRecording, mode, nativeErrorMessage, nativeFinishSequence]); // SPRINT-40:

  useEffect(() => {
    if (mode === "recording" && (recorderState.mediaServicesDidReset || nativeErrorMessage)) { // SPRINT-40:
      void discardRecording(true);
    }
  }, [discardRecording, mode, nativeErrorMessage, recorderState.mediaServicesDidReset]); // SPRINT-40:

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && modeRef.current === "recording") {
        void discardRecording(true);
      }
    });
    return () => subscription.remove();
  }, [discardRecording]);

  useEffect(() => () => { // SPRINT-40: clean recorder-owned temp files only on component unmount
    const readyUri = readyRecordingRef.current?.uri; // SPRINT-40:
    if (readyUri) deleteTemporaryVoiceRecording(readyUri); // SPRINT-40:
    // Only touch the native recorder if we were actually mid-recording — by unmount time
    // (e.g. navigating back from the chat thread) expo-audio may have already released the
    // underlying native AudioRecorder, and calling getStatus()/stop() on a released instance
    // throws "first argument cannot be cast to expo.modules.audio.AudioRecorder".
    if (modeRef.current !== "recording") return; // SPRINT-40:
    try { // SPRINT-40:
      const status = recorder.getStatus(); // SPRINT-40:
      if (status.isRecording) { // SPRINT-40:
        void recorder.stop().then(() => { // SPRINT-40:
          if (recorder.uri) deleteTemporaryVoiceRecording(recorder.uri); // SPRINT-40:
          return resetToPlaybackMode(); // SPRINT-40:
        }).catch(() => {}); // SPRINT-40: recorder may already be released by the native side
      } // SPRINT-40:
    } catch { // SPRINT-40: recorder already released — nothing left to clean up natively
      /* no-op */ // SPRINT-40:
    } // SPRINT-40:
  }, [recorder, resetToPlaybackMode]); // SPRINT-40:

  if (mode === "recording") {
    const elapsedSeconds = Math.min(600, Math.round(recorderState.durationMillis / 1000));
    return (
      <View style={styles.recordingBar}>
        <View style={styles.recordingLabel}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingTime}>{formatDuration(elapsedSeconds)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel voice recording"
          onPress={() => void discardRecording(false)}
          style={styles.cancelButton}
        >
          <Ionicons name="trash-outline" size={rs(18)} color={Colors.text.error} />
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop and send voice recording"
          onPress={() => void finishRecording(false)}
          style={styles.sendButton}
        >
          <Ionicons name="send" size={rs(16)} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  if (mode === "ready" && readyRecording) {
    return (
      <View style={styles.recordingBar}>
        <Text style={styles.readyText}>{formatDuration(readyRecording.durationSeconds)} recorded</Text>
        <Pressable accessibilityRole="button" onPress={() => void discardRecording(false)} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Discard</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send ten minute voice recording"
          onPress={() => {
            const completed = readyRecording;
            readyRecordingRef.current = null; // SPRINT-40: ownership transfers to the upload queue
            setReadyRecording(null);
            setMode("idle");
            onRecordingReady(completed);
          }}
          style={styles.sendButton}
        >
          <Ionicons name="send" size={rs(16)} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Record a voice message"
      accessibilityHint="Tap to start recording"
      disabled={disabled}
      onPress={() => void startRecording()}
      style={({ pressed }) => [styles.micButton, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons name="mic-outline" size={rs(20)} color={disabled ? Colors.text.tertiary : Colors.brand.blue} />
    </Pressable>
  );
}

const styles = createThemedStyles({
  micButton: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    backgroundColor: "rgba(26,107,174,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.5 },
  recordingBar: {
    flex: 1,
    minHeight: rs(46),
    flexDirection: "row",
    alignItems: "center",
    gap: rs(10),
    paddingLeft: rs(14),
    paddingRight: rs(5),
    borderRadius: rs(23),
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  recordingLabel: { flex: 1, flexDirection: "row", alignItems: "center", gap: rs(8) },
  recordingDot: { width: rs(9), height: rs(9), borderRadius: rs(5), backgroundColor: Colors.text.error },
  recordingTime: { fontSize: rs(14), fontWeight: "900", color: Colors.text.primary, fontVariant: ["tabular-nums"] },
  readyText: { flex: 1, fontSize: rs(13), fontWeight: "800", color: Colors.text.primary },
  cancelButton: { flexDirection: "row", alignItems: "center", gap: rs(4), paddingHorizontal: rs(7), paddingVertical: rs(8) },
  cancelText: { fontSize: rs(11), fontWeight: "800", color: Colors.text.error },
  sendButton: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    backgroundColor: Colors.brand.blue,
    alignItems: "center",
    justifyContent: "center",
  },
});
