// Design D `compose-listing` (c3.js): list a whole place one question per screen, photos first. Seven screens:
// photos, kind, rent, size, where, a few words, then a summary with optional extras as "+" chips. City, state,
// country and currency come from the profile. The draft is kept on the phone if you close it.
// It drives the composer's own state and submit, so validation and the server calls are the composer's.
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Animated, { FadeInLeft, FadeInRight, useAnimatedStyle, useReducedMotion, withSpring } from "react-native-reanimated";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../theme/useTheme";
import { RADIUS, TYPE, body, display } from "../../../theme/d";
import { SPRING } from "../../../shared/motion/presets";
import { Chip, GradientButton, Prefill, PressableScale, SoftButton, Stepper, useShake } from "../../../shared/d";
import { DatePickerField } from "../../../../components/DateTimePickerField";
import { showToast } from "../../../shared/ui/Toast";

const DRAFT_KEY = "draft.listing.v1";
export function clearListingDraft() { void AsyncStorage.removeItem(DRAFT_KEY).catch(() => {}); }

type Str = [string, (v: string) => void];
export type ListingQuestionsProps = {
  images: { uri: string }[];
  onAddPhotos: () => void;
  onRemovePhoto: (index: number) => void;
  propType: Str; price: Str; beds: Str; baths: Str; address: Str; body: Str; title: Str;
  currencySymbol: string; currencyCode: string;
  placeLine: string;
  extras: {
    deposit: Str; available: Str; leaseTerm: Str; petPolicy: Str; parking: Str; laundry: Str; sqft: Str;
    yearBuilt: Str; heating: Str; cooling: Str; utilities: Str; furnished: [boolean, (v: boolean) => void];
  };
  error: string | null;
  validateAddress: () => boolean;
  onPost: () => void;
  submitting: boolean;
  onClose: () => void;
};

const KINDS: [string, keyof typeof Ionicons.glyphMap, string][] = [
  ["Apartment", "business-outline", "In a building"],
  ["House", "home-outline", "The whole house"],
  ["Studio", "bed-outline", "One open room"],
  ["Room", "key-outline", "A room in a shared home"],
];
const EXTRAS: { k: keyof ListingQuestionsProps["extras"]; label: string; kind?: "money" | "date" | "number" | "switch"; ph?: string }[] = [
  { k: "deposit", label: "Deposit", kind: "money", ph: "e.g. 1,800" },
  { k: "available", label: "Available from", kind: "date" },
  { k: "leaseTerm", label: "Lease", ph: "e.g. 12 months" },
  { k: "furnished", label: "Furnished", kind: "switch" },
  { k: "petPolicy", label: "Pets", ph: "e.g. Cats and small dogs" },
  { k: "parking", label: "Parking", ph: "e.g. One space in the garage" },
  { k: "laundry", label: "Laundry", ph: "e.g. In the unit" },
  { k: "sqft", label: "Size", kind: "number", ph: "Square feet" },
  { k: "yearBuilt", label: "Year built", kind: "number", ph: "e.g. 1998" },
  { k: "heating", label: "Heating", ph: "e.g. Central" },
  { k: "cooling", label: "Cooling", ph: "e.g. Air conditioning" },
  { k: "utilities", label: "Utilities", ph: "e.g. Water included" },
];
const STEPS = 7;

export function ListingQuestions(p: ListingQuestionsProps) {
  const { tc, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [q, setQ] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [openExtras, setOpenExtras] = useState<string[]>([]);
  const { style: shakeStyle, shake } = useShake();
  const restored = useRef(false);

  // Defaults the design gives: an apartment, 1 bed, 1 bath.
  useEffect(() => {
    if (!p.propType[0]) p.propType[1]("Apartment");
    if (!p.beds[0]) p.beds[1]("1");
    if (!p.baths[0]) p.baths[1]("1");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, []);

  // The draft: restored once on open, saved a moment after anything changes.
  const fields: Record<string, Str> = { propType: p.propType, price: p.price, beds: p.beds, baths: p.baths, address: p.address, body: p.body, title: p.title, ...Object.fromEntries(Object.entries(p.extras).filter(([k]) => k !== "furnished")) as Record<string, Str> };
  useEffect(() => {
    void AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      restored.current = true;
      if (!raw) return;
      try {
        const d = JSON.parse(raw) as Record<string, string | boolean>;
        let any = false;
        for (const [k, f] of Object.entries(fields)) if (typeof d[k] === "string" && d[k]) { f[1](d[k] as string); any = true; }
        if (typeof d.furnished === "boolean") p.extras.furnished[1](d.furnished);
        if (any) showToast("Draft restored", "info");
      } catch { /* a bad draft is ignored */ }
    }).catch(() => { restored.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, []);
  const snapshot = JSON.stringify({ ...Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f[0]])), furnished: p.extras.furnished[0] });
  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => { void AsyncStorage.setItem(DRAFT_KEY, snapshot).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [snapshot]);

  const go = (n: number) => { setDir(n > q ? 1 : -1); setQ(n); };
  const next = () => {
    if (q === 0 && p.images.length === 0) { shake(); showToast("Add at least one photo", "error"); return; }
    if (q === 2 && !(parseFloat(p.price[0].replace(/,/g, "")) > 0)) { shake(); return; }
    if (q === 4 && !p.validateAddress()) { shake(); return; }
    if (q === 5 && !p.body[0].trim()) { shake(); return; }
    if (q === 5 && !p.title[0].trim()) p.title[1](suggestTitle());
    if (q < STEPS - 1) return go(q + 1);
    if (!p.title[0].trim()) { shake(); return; }
    p.onPost();
  };
  const back = () => (q > 0 ? go(q - 1) : p.onClose());
  const suggestTitle = () => {
    const kind = p.propType[0] || "Apartment";
    const place = p.placeLine.split(",")[0]?.trim();
    const size = kind === "Studio" || kind === "Room" ? kind.toLowerCase() : `${p.beds[0] || 1}-bed ${kind.toLowerCase()}`;
    return `${size.charAt(0).toUpperCase()}${size.slice(1)}${place ? ` in ${place}` : ""}`;
  };
  const starter = () => {
    const kind = (p.propType[0] || "apartment").toLowerCase();
    const place = p.placeLine.split(",")[0]?.trim();
    const beds = Number(p.beds[0]) || 0;
    const baths = Number(p.baths[0]) || 0;
    const parts = [
      `A ${kind}${place ? ` in ${place}` : ""}`,
      kind === "studio" || kind === "room" ? "" : ` with ${beds} bedroom${beds === 1 ? "" : "s"} and ${baths} bathroom${baths === 1 ? "" : "s"}`,
      ". ",
      p.extras.furnished[0] ? "Furnished. " : "",
      p.extras.available[0] ? `Available from ${p.extras.available[0]}. ` : "",
      "Message me to arrange a viewing.",
    ];
    const txt = parts.join("");
    if (reduce) return p.body[1](txt);
    let k = 0;
    const step = () => { k += 3; p.body[1](txt.slice(0, k)); if (k < txt.length) setTimeout(step, 12); };
    step();
  };

  const progress = useAnimatedStyle(() => ({ transform: [{ scaleX: reduce ? (q + 1) / STEPS : withSpring((q + 1) / STEPS, SPRING.settle) }] }));
  const priceNum = parseFloat(p.price[0].replace(/,/g, ""));
  const H = (title: string, sub: string) => (
    <>
      <Text style={[body(700), { fontSize: 13, color: tc.textSecondary }]}>{q + 1} of {STEPS}</Text>
      <Text style={[TYPE.question, { color: tc.textPrimary, marginTop: 4 }]}>{title}</Text>
      <Text style={[TYPE.body, { color: tc.textSecondary, marginTop: 6, marginBottom: 20 }]}>{sub}</Text>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
      <View style={[st.bar, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={st.ib}>
          <Ionicons name="chevron-back" size={24} color={tc.textPrimary} />
        </Pressable>
        <View style={[st.progress, { backgroundColor: tc.surface3 }]} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS, now: q + 1 }}>
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: "left", backgroundColor: tc.accent }, progress]} />
        </View>
        <Pressable onPress={() => { void AsyncStorage.setItem(DRAFT_KEY, snapshot); showToast("Draft saved. Finish it any time from Post.", "success"); }} hitSlop={8} style={{ paddingHorizontal: 10 }} accessibilityRole="button">
          <Text style={[body(700), { fontSize: 14, color: tc.accentText }]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View key={q} entering={reduce ? undefined : (dir > 0 ? FadeInRight : FadeInLeft).springify().damping(20).stiffness(200)} style={shakeStyle}>
          {q === 0 ? (
            <>
              {H("Show it off", "Add photos. The first one is the cover.")}
              <View style={st.slots}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const img = p.images[i];
                  return (
                    <PressableScale key={i} onPress={img ? () => p.onRemovePhoto(i) : p.onAddPhotos} accessibilityLabel={img ? `Remove photo ${i + 1}` : "Add photos"}
                      outerStyle={i === 0 ? { width: "100%" } : { width: "31%" }}
                      style={[st.slot, i === 0 && { aspectRatio: 16 / 10 }, { backgroundColor: tc.inputBg, borderColor: tc.borderMedium }]}>
                      {img ? (
                        <>
                          <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                          <View style={st.x}><Ionicons name="close" size={14} color="#fff" /></View>
                          {i === 0 ? <View style={st.cover}><Text style={[body(700), { fontSize: 11, color: "#fff" }]}>Cover</Text></View> : null}
                        </>
                      ) : (
                        <Ionicons name={i === 0 ? "camera-outline" : "add"} size={i === 0 ? 32 : 22} color={tc.textTertiary} />
                      )}
                    </PressableScale>
                  );
                })}
              </View>
              <Text style={[TYPE.small, { color: tc.textTertiary, marginTop: 10 }]}>Up to 6 photos · JPEG, PNG or WebP. Tap a photo to remove it.</Text>
            </>
          ) : q === 1 ? (
            <>
              {H("What kind of place?", "Pick one.")}
              <View style={{ gap: 10 }}>
                {KINDS.map(([k, icon, sub]) => {
                  const on = p.propType[0] === k;
                  return (
                    <PressableScale key={k} onPress={() => p.propType[1](k)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                      style={[st.choice, { backgroundColor: tc.cardBg, borderColor: on ? tc.accent : tc.glassLine, borderWidth: on ? 2 : 1 }]}>
                      <View style={[st.gi, { backgroundColor: on ? tc.accent : tc.accentSoft }]}><Ionicons name={icon} size={20} color={on ? "#fff" : tc.accentText} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{k}</Text>
                        <Text style={[TYPE.small, { color: tc.textSecondary }]}>{sub}</Text>
                      </View>
                      {on ? <Ionicons name="checkmark-circle" size={22} color={tc.accent} /> : null}
                    </PressableScale>
                  );
                })}
              </View>
            </>
          ) : q === 2 ? (
            <>
              {H("Rent per month?", `In ${p.currencyCode}, from your profile.`)}
              <View style={st.bignum}>
                <Text style={[display(800), { fontSize: 44, color: tc.textTertiary }]}>{p.currencySymbol}</Text>
                <TextInput value={p.price[0]} onChangeText={(v) => p.price[1](v.replace(/[^\d.,]/g, ""))} keyboardType="numeric" placeholder="1,800" placeholderTextColor={tc.textTertiary}
                  autoFocus style={[display(800), { flex: 1, fontSize: 44, color: tc.textPrimary, paddingVertical: 0 }]} accessibilityLabel="Rent per month" />
              </View>
            </>
          ) : q === 3 ? (
            <>
              {H("How big is it?", "Tap + or −.")}
              <View style={{ gap: 10 }}>
                <Stepper label="Bedrooms" value={Number(p.beds[0]) || 0} onChange={(v) => p.beds[1](String(v))} min={0} max={20} />
                <Stepper label="Bathrooms" value={Number(p.baths[0]) || 1} onChange={(v) => p.baths[1](String(v))} min={1} max={20} />
              </View>
            </>
          ) : q === 4 ? (
            <>
              {H("Where is it?", "Only the area is shown until you share the address.")}
              <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6 }]}>Street address</Text>
              <View style={[st.input, { backgroundColor: tc.inputBg }]}>
                <Ionicons name="location-outline" size={18} color={tc.textTertiary} />
                <TextInput value={p.address[0]} onChangeText={p.address[1]} placeholder="e.g. 1455 Sunset Blvd" placeholderTextColor={tc.textTertiary} autoFocus
                  style={[TYPE.body, { flex: 1, color: tc.textPrimary, paddingVertical: 0 }]} accessibilityLabel="Street address" />
              </View>
              {p.placeLine ? (
                <Prefill style={{ marginTop: 14 }}>
                  <Text style={[TYPE.body, { color: tc.textPrimary }]}>{p.placeLine}</Text>
                  <Text style={[TYPE.small, { color: tc.textSecondary }]}>From your profile</Text>
                </Prefill>
              ) : null}
            </>
          ) : q === 5 ? (
            <>
              {H("Say a few words", "What is it like to live there?")}
              <TextInput value={p.body[0]} onChangeText={p.body[1]} multiline maxLength={2000} placeholder="Bright, quiet, close to the park…" placeholderTextColor={tc.textTertiary}
                style={[TYPE.body, st.area, { backgroundColor: tc.inputBg, color: tc.textPrimary }]} accessibilityLabel="Description" />
              <SoftButton small ghost label="Write a starter for me" icon={<Ionicons name="sparkles-outline" size={16} color={tc.textPrimary} />} onPress={starter} outerStyle={{ marginTop: 12, alignSelf: "flex-start" }} />
            </>
          ) : (
            <>
              {H("Looks great ✦", "Add more now, or later.")}
              <View style={[st.summary, { backgroundColor: tc.cardBg, borderColor: tc.glassLine, borderWidth: isDark ? 1 : 0 }]}>
                {p.images[0] ? <Image source={{ uri: p.images[0].uri }} style={{ height: 150 }} contentFit="cover" /> : null}
                <View style={{ padding: 14 }}>
                  <TextInput value={p.title[0]} onChangeText={p.title[1]} maxLength={120} placeholder="A title" placeholderTextColor={tc.textTertiary}
                    style={[display(700), { fontSize: 18, color: tc.textPrimary, paddingVertical: 0 }]} accessibilityLabel="Title" />
                  <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 4 }]}>
                    {[priceNum > 0 ? `${p.currencySymbol}${priceNum.toLocaleString()} /mo` : "", p.propType[0], p.propType[0] === "Studio" || p.propType[0] === "Room" ? "" : `${p.beds[0]} bed`, `${p.baths[0]} bath`, p.placeLine.split(",")[0]].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </View>
              <Text style={[TYPE.small, { color: tc.textSecondary, marginTop: 16, marginBottom: 8 }]}>Optional extras</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {EXTRAS.map((x) => {
                  const on = openExtras.includes(x.k);
                  return <Chip key={x.k} label={`${on ? "" : "+ "}${x.label}`} on={on} onPress={() => setOpenExtras((o) => (on ? o.filter((k) => k !== x.k) : [...o, x.k]))} />;
                })}
              </View>
              <View style={{ marginTop: 12, gap: 12 }}>
                {EXTRAS.filter((x) => openExtras.includes(x.k)).map((x) => {
                  if (x.kind === "switch") {
                    const [v, set] = p.extras.furnished;
                    return (
                      <Animated.View key={x.k} entering={FadeInRight.duration(220)} style={st.switchRow}>
                        <Text style={[TYPE.body, { color: tc.textPrimary, flex: 1 }]}>Furnished</Text>
                        <Switch value={v} onValueChange={set} trackColor={{ true: tc.mint, false: tc.surface3 }} thumbColor="#fff" />
                      </Animated.View>
                    );
                  }
                  const [v, set] = p.extras[x.k] as Str;
                  return (
                    <Animated.View key={x.k} entering={FadeInRight.duration(220)}>
                      <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6 }]}>{x.label}</Text>
                      {x.kind === "date" ? (
                        <DatePickerField value={v} onChange={set} dateFormat="iso" placeholder="Choose a date" accentColor={tc.accent} minimumDate={new Date()} forceDark={isDark}
                          style={[st.input, { backgroundColor: tc.inputBg, borderWidth: 0 }]} textStyle={[TYPE.body, { color: tc.textPrimary }]} />
                      ) : (
                        <View style={[st.input, { backgroundColor: tc.inputBg }]}>
                          {x.kind === "money" ? <Text style={[TYPE.bodyStrong, { color: tc.textSecondary }]}>{p.currencySymbol}</Text> : null}
                          <TextInput value={v} onChangeText={set} placeholder={x.ph} placeholderTextColor={tc.textTertiary} keyboardType={x.kind ? "numeric" : "default"}
                            style={[TYPE.body, { flex: 1, color: tc.textPrimary, paddingVertical: 0 }]} accessibilityLabel={x.label} />
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </View>
            </>
          )}
          {p.error ? <Text style={[TYPE.small, { color: tc.dangerText, marginTop: 12 }]}>{p.error}</Text> : null}
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 18 }}>
        <GradientButton block label={q === STEPS - 1 ? "Post it" : "Next"} loading={p.submitting} onPress={next} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 6 },
  ib: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  progress: { flex: 1, height: 4, borderRadius: 4, overflow: "hidden", marginHorizontal: 8 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  slot: { aspectRatio: 1, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  x: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  cover: { position: "absolute", left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.5)" },
  choice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20 },
  gi: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bignum: { flexDirection: "row", alignItems: "center", gap: 6 },
  input: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: RADIUS.input },
  area: { minHeight: 150, textAlignVertical: "top", borderRadius: 16, padding: 14 },
  summary: { borderRadius: 24, overflow: "hidden" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
});
