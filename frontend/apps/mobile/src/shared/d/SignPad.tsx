// src/shared/d/SignPad.tsx — design D `canvas.sign`: sign with a finger on a soft panel (150 px high).
// The strokes are drawn with react-native-svg while signing. The finger is tracked by a Gesture Handler pan and
// the path grows on the UI thread (Reanimated animated props), so React does not re-render per touch move; each
// finished stroke is handed to JS once. `toPng()` rasterises the strokes into an 8-bit greyscale PNG (stored
// deflate, no extra library) and returns a data URI that the server accepts as a drawn signature
// (`signatureType: "drawn"`, under its 100 000-character limit).
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../../theme/useTheme';
import { RADIUS } from '../../theme/d';

type Pt = [number, number];
export type SignPadHandle = { clear: () => void; isEmpty: () => boolean; toPng: () => string | null };

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const SignPad = forwardRef<SignPadHandle, { onChange?: (signed: boolean) => void; onDrawing?: (drawing: boolean) => void; height?: number }>(function SignPad({ onChange, onDrawing, height = 150 }, ref) {
  const { tc } = useTheme();
  const strokes = useRef<Pt[][]>([]); // finished strokes, for toPng
  const size = useRef({ w: 0, h: height });
  const doneD = useSharedValue('');   // path of the finished strokes
  const liveD = useSharedValue('');   // path of the stroke being drawn
  const livePts = useSharedValue<number[]>([]); // x, y, x, y… of the stroke being drawn

  const finishStroke = (flat: number[]) => {
    const s: Pt[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) s.push([flat[i], flat[i + 1]]);
    if (s.length) strokes.current = [...strokes.current, s];
    onDrawing?.(false);
    onChange?.(strokes.current.length > 0);
  };
  const startStroke = () => onDrawing?.(true);

  const pan = Gesture.Pan()
    .minDistance(0) // a tap leaves a dot, and the pad claims the touch before the page can scroll
    .maxPointers(1)
    .shouldCancelWhenOutside(false)
    .onStart((e) => {
      livePts.set([e.x, e.y]);
      liveD.set(`M${e.x.toFixed(1)} ${e.y.toFixed(1)} l0.1 0`);
      scheduleOnRN(startStroke);
    })
    .onUpdate((e) => {
      livePts.modify((v) => { 'worklet'; v.push(e.x, e.y); return v; });
      liveD.set(`${liveD.get()} L${e.x.toFixed(1)} ${e.y.toFixed(1)}`);
    })
    .onFinalize(() => {
      const pts = livePts.get();
      if (!pts.length) return;
      doneD.set(`${doneD.get()} ${liveD.get()}`);
      liveD.set('');
      livePts.set([]);
      scheduleOnRN(finishStroke, pts.slice());
    });

  useImperativeHandle(ref, () => ({
    clear: () => { strokes.current = []; doneD.set(''); liveD.set(''); livePts.set([]); onChange?.(false); },
    isEmpty: () => strokes.current.length === 0,
    toPng: () => (strokes.current.length ? rasterPng(strokes.current, size.current.w, size.current.h) : null),
  }));

  const pathProps = useAnimatedProps(() => ({ d: `${doneD.get()} ${liveD.get()}`.trim() || 'M0 0' }));
  return (
    <GestureDetector gesture={pan}>
      <View
        collapsable={false}
        onLayout={(e: LayoutChangeEvent) => { size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
        accessibilityLabel="Signature pad. Sign with your finger."
        style={{ height, borderRadius: RADIUS.input, backgroundColor: tc.inputBg, overflow: 'hidden' }}
      >
        <Svg width="100%" height="100%">
          <AnimatedPath animatedProps={pathProps} stroke={tc.textPrimary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </View>
    </GestureDetector>
  );
});

/* ---------- PNG ---------- */
function rasterPng(strokes: Pt[][], w: number, h: number): string {
  const W = Math.max(1, Math.min(360, Math.round(w)));
  const k = W / Math.max(1, w);
  const H = Math.max(1, Math.round(h * k));
  const px = new Uint8Array(W * H).fill(255);
  const r = 1.4;
  const dot = (cx: number, cy: number) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      if (y < 0 || y >= H) continue;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 0 || x >= W) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px[y * W + x] = 0;
      }
    }
  };
  for (const s of strokes) {
    for (let i = 0; i < s.length; i++) {
      const [x1, y1] = s[i];
      const [x0, y0] = i ? s[i - 1] : s[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * k * 2));
      for (let t = 0; t <= steps; t++) dot((x0 + ((x1 - x0) * t) / steps) * k, (y0 + ((y1 - y0) * t) / steps) * k);
    }
  }
  // Scanlines: filter byte 0, then the row.
  const raw = new Uint8Array((W + 1) * H);
  for (let y = 0; y < H; y++) raw.set(px.subarray(y * W, (y + 1) * W), y * (W + 1) + 1);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H); ihdr[8] = 8; ihdr[9] = 0; // 8-bit greyscale
  const png = concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlibStored(raw)), chunk('IEND', new Uint8Array(0))]);
  let bin = '';
  for (let i = 0; i < png.length; i += 0x8000) bin += String.fromCharCode(...png.subarray(i, i + 0x8000));
  return 'data:image/png;base64,' + btoa(bin);
}
function zlibStored(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  for (let i = 0; i < data.length || i === 0; i += 65535) {
    const block = data.subarray(i, Math.min(data.length, i + 65535));
    const last = i + 65535 >= data.length ? 1 : 0;
    const head = new Uint8Array([last, block.length & 255, block.length >> 8, ~block.length & 255, (~block.length >> 8) & 255]);
    parts.push(head, block);
    if (data.length === 0) break;
  }
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) { a = (a + data[i]) % 65521; b = (b + a) % 65521; }
  parts.push(u32((b << 16) | a));
  return concat(parts);
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Uint8Array): Uint8Array {
  const t = new Uint8Array([...type].map((ch) => ch.charCodeAt(0)));
  return concat([u32(data.length), t, data, u32(crc32(concat([t, data])))]);
}
function u32(n: number): Uint8Array { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0); return b; }
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
