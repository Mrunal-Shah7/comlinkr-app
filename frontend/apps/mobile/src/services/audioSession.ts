// SPRINT-40: central audio-session modes shared by voice recording and playback
import { setAudioModeAsync } from "expo-audio";

export async function configureVoiceRecordingAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    allowsBackgroundRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: "doNotMix",
  });
}

export async function configureVoicePlaybackAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    allowsBackgroundRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: "doNotMix",
  });
}
