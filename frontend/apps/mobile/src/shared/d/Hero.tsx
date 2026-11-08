// src/shared/d/Hero.tsx — design D "card to detail" (`data-flip` / `data-hero`): the card's photo grows into the
// detail's hero. A card calls `rememberHero(ref, uri)` as it is pressed; the detail calls `takeHero()` when it
// opens and, if a fresh origin is there, renders <HeroExpand> over itself while its own content fades in.
// Reduce motion, or no origin: the detail opens as before.
import { useEffect, useLayoutEffect } from "react";
import { StyleSheet, useWindowDimensions, type View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { FadeImage } from "../../../components/FadeImage";

export type HeroOrigin = { x: number; y: number; w: number; h: number; uri: string; at: number };
let pending: HeroOrigin | null = null;

/** Measure the pressed card's photo, keep it for the detail, then open the detail (`then`). */
export function rememberHero(ref: View | null, uri: string | undefined, then: () => void) {
  if (!ref || !uri) return then();
  ref.measureInWindow((x, y, w, h) => { if (w > 0 && h > 0) pending = { x, y, w, h, uri, at: Date.now() }; then(); });
}
/** The origin for a detail opening now (taken once; ignored if older than a second). */
export function takeHero(): HeroOrigin | null {
  const o = pending;
  pending = null;
  return o && Date.now() - o.at < 1000 ? o : null;
}

/** The photo flying from the card to the hero (0, 0, full width, `height`), corners 24 → 0, on the sheet spring. */
/** `onLanded`: the photo is in place (show the page under it); `onDone`: the page has faded in, remove the photo. */
export function HeroExpand({ origin, height, onLanded, onDone }: { origin: HeroOrigin; height: number; onLanded: () => void; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useLayoutEffect(() => {
    if (reduce) { onLanded(); onDone(); return; }
    // The page starts fading in while the photo settles; the photo goes once the page is in.
    const t1 = setTimeout(onLanded, 230);
    const t2 = setTimeout(onDone, 480);
    // The prototype's EASE_SHEET: cubic-bezier(.32, 1.18, .52, 1), a slight overshoot; 380 ms (was 480).
    p.set(withTiming(1, { duration: 380, easing: Easing.bezier(0.32, 1.18, 0.52, 1) }));
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per origin
  }, []);
  const a = useAnimatedStyle(() => {
    const k = p.get();
    return {
      left: origin.x + (0 - origin.x) * k,
      top: origin.y + (0 - origin.y) * k,
      width: origin.w + (width - origin.w) * k,
      height: origin.h + (height - origin.h) * k,
      borderRadius: 24 * (1 - Math.min(1, k)),
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[st.fly, a]}>
      <FadeImage uri={origin.uri} style={StyleSheet.absoluteFill} transition={0} cachePolicy="memory-disk" />
    </Animated.View>
  );
}

/** The detail's own content stays hidden while the photo flies, then fades in once it lands (240 ms). */
export function useHeroFade(flying: boolean) {
  const o = useSharedValue(0);
  useLayoutEffect(() => {
    o.set(flying ? 0 : withTiming(1, { duration: 240 }));
  }, [flying, o]);
  return useAnimatedStyle(() => ({ opacity: o.get() }));
}

const st = StyleSheet.create({
  fly: { position: "absolute", overflow: "hidden", zIndex: 50 },
});
