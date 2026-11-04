// SPRINT-40: one shared lazy audio player coordinates every voice-message bubble
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from "expo-audio";
import type { EventSubscription } from "expo-modules-core";
import { configureVoicePlaybackAudioMode } from "./audioSession";

export type VoicePlaybackSnapshot = {
  activeMessageId: string | null;
  currentTime: number;
  /** Real duration reported by the native player once the source has loaded, in seconds. Null until known. */
  playerDuration: number | null;
  playing: boolean;
  buffering: boolean;
  loaded: boolean;
  errorMessage: string | null;
};

const EMPTY_SNAPSHOT: VoicePlaybackSnapshot = {
  activeMessageId: null,
  currentTime: 0,
  playerDuration: null,
  playing: false,
  buffering: false,
  loaded: false,
  errorMessage: null,
};

let snapshot = EMPTY_SNAPSHOT;
let player: AudioPlayer | null = null;
let statusSubscription: EventSubscription | null = null;
let loadTimeout: ReturnType<typeof setTimeout> | null = null;
let playbackOperation = 0; // SPRINT-40: invalidates async starts after navigation/background cleanup
const listeners = new Set<() => void>();

function publish(next: VoicePlaybackSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function clearLoadTimeout(): void {
  if (!loadTimeout) return;
  clearTimeout(loadTimeout);
  loadTimeout = null;
}

function handleStatus(status: AudioStatus): void {
  if (!snapshot.activeMessageId) return;
  if (status.isLoaded) clearLoadTimeout();

  if (status.didJustFinish) {
    void player?.seekTo(0);
    publish(EMPTY_SNAPSHOT);
    return;
  }

  if (/error|failed/i.test(status.playbackState)) {
    clearLoadTimeout();
    player?.pause();
    publish({
      ...snapshot,
      currentTime: 0,
      playing: false,
      buffering: false,
      loaded: false,
      errorMessage: "This voice message could not be played.",
    });
    return;
  }

  publish({
    ...snapshot,
    currentTime: Math.max(0, status.currentTime),
    playerDuration: status.isLoaded && status.duration > 0 ? status.duration : snapshot.playerDuration,
    playing: status.playing,
    buffering: status.isBuffering,
    loaded: status.isLoaded,
    errorMessage: status.isLoaded ? null : snapshot.errorMessage, // SPRINT-40: retain Retry until a source actually loads
  });
}

function ensurePlayer(): AudioPlayer {
  if (player) return player;
  player = createAudioPlayer(null, { updateInterval: 250, downloadFirst: false });
  statusSubscription = player.addListener("playbackStatusUpdate", handleStatus);
  return player;
}

export function subscribeVoicePlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVoicePlaybackSnapshot(): VoicePlaybackSnapshot {
  return snapshot;
}

export async function toggleVoicePlayback(messageId: string, url: string): Promise<void> {
  const operation = ++playbackOperation; // SPRINT-40:
  try {
    await configureVoicePlaybackAudioMode();
    if (operation !== playbackOperation) return; // SPRINT-40: thread may have unmounted during audio-mode setup
    const activePlayer = ensurePlayer();

    if (snapshot.activeMessageId === messageId) {
      if (snapshot.playing) {
        activePlayer.pause();
        publish({ ...snapshot, playing: false });
      } else if (snapshot.loaded && !snapshot.errorMessage) {
        if (snapshot.currentTime > 0 && activePlayer.duration > 0 && snapshot.currentTime >= activePlayer.duration) {
          await activePlayer.seekTo(0);
        }
        if (operation !== playbackOperation) return; // SPRINT-40:
        activePlayer.play();
        publish({ ...snapshot, playing: true, errorMessage: null });
      } else { // SPRINT-40: a failed/timed-out source must be replaced before Retry can work
        activePlayer.replace(url); // SPRINT-40:
        publish({ // SPRINT-40:
          activeMessageId: messageId, // SPRINT-40:
          currentTime: 0, // SPRINT-40:
          playerDuration: null,
          playing: true, // SPRINT-40:
          buffering: true, // SPRINT-40:
          loaded: false, // SPRINT-40:
          errorMessage: null, // SPRINT-40:
        }); // SPRINT-40:
        clearLoadTimeout(); // SPRINT-40:
        loadTimeout = setTimeout(() => { // SPRINT-40:
          if (snapshot.activeMessageId !== messageId || snapshot.loaded) return; // SPRINT-40:
          activePlayer.pause(); // SPRINT-40:
          publish({ ...snapshot, playing: false, buffering: false, errorMessage: "This voice message took too long to load." }); // SPRINT-40:
        }, 15000); // SPRINT-40:
        activePlayer.play(); // SPRINT-40:
      }
      return;
    }

    activePlayer.pause();
    activePlayer.replace(url);
    publish({
      activeMessageId: messageId,
      currentTime: 0,
      playerDuration: null,
      playing: true,
      buffering: true,
      loaded: false,
      errorMessage: null,
    });
    clearLoadTimeout();
    loadTimeout = setTimeout(() => {
      if (snapshot.activeMessageId !== messageId || snapshot.loaded) return;
      activePlayer.pause();
      publish({
        ...snapshot,
        playing: false,
        buffering: false,
        errorMessage: "This voice message took too long to load.",
      });
    }, 15000);
    activePlayer.play();
  } catch (error) {
    if (operation !== playbackOperation) return; // SPRINT-40: cleanup won the race; do not revive an off-screen snapshot
    clearLoadTimeout();
    console.warn("[Sprint 40] Voice playback failed", error);
    publish({
      activeMessageId: messageId,
      currentTime: 0,
      playerDuration: null,
      playing: false,
      buffering: false,
      loaded: false,
      errorMessage: "This voice message could not be played.",
    });
  }
}

export function stopVoicePlaybackIfActive(messageId: string): void {
  if (snapshot.activeMessageId !== messageId) return;
  stopAndReleaseVoicePlayback();
}

// export function stopAndReleaseVoicePlayback(): void {
//   playbackOperation += 1; // SPRINT-40: cancel any toggle awaiting audio-mode configuration
//   clearLoadTimeout();
//   try {
//     player?.pause();
//     statusSubscription?.remove();
//     player?.remove();
//   } catch {
//     // Resource cleanup is best effort during navigation/backgrounding.
//   }
//   player = null;
//   statusSubscription = null;
//   publish(EMPTY_SNAPSHOT);
// }

// New:
export function stopAndReleaseVoicePlayback(): void {
  playbackOperation += 1; // invalidate any in-flight toggle before touching native resources
  clearLoadTimeout();
  // Detach the status listener FIRST — this stops the native side from firing
  // callbacks into JS while the player itself is being torn down, which is a
  // common source of native crashes on Android media players.
  try { statusSubscription?.remove(); } catch { /* best effort */ }
  try { player?.pause(); } catch { /* best effort */ }
  try { player?.remove(); } catch { /* best effort */ }
  player = null;
  statusSubscription = null;
  publish(EMPTY_SNAPSHOT);
}
