// src/utils/afterTransition.ts
//
// Replacement for the deprecated InteractionManager.runAfterInteractions. Tab/stack transitions
// don't register as "interactions", so work scheduled that way ran mid-animation and caused the
// tab-switch jank. This waits out the transition (tab shift ~150ms, page swipe settle ~250ms)
// and then one more frame, so fetch results and re-renders land after the screen has settled.

const TRANSITION_MS = 280;

/** Runs `task` once the current screen transition has settled. Returns a cancel function. */
export function runAfterTransition(task: () => void, delayMs: number = TRANSITION_MS): () => void {
  let frame: number | null = null;
  const timer = setTimeout(() => {
    frame = requestAnimationFrame(() => {
      frame = null;
      task();
    });
  }, delayMs);
  return () => {
    clearTimeout(timer);
    if (frame != null) cancelAnimationFrame(frame);
  };
}
