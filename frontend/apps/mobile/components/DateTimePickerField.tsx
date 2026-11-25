// components/DateTimePickerField.tsx: a date field and a time field with the app's own pickers.
//
// Both used to open the platform's picker (a grey Material dialog on Android, a spinner on iOS) that ignored the
// app's colours. They now open an inline panel under the field, drawn with the theme: a month calendar for dates,
// hour and minute chips for times. Inline, not a sheet, because several forms using them already sit in a sheet.
import { palette } from "../src/theme/palette";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/theme/useTheme";
import { TYPE } from "../src/theme/d";

type DateFormat = "display" | "iso" | "uk" | "us" | "event";

interface PickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  accentColor?: string;
  style?: object;
  textStyle?: object;
  dateFormat?: DateFormat;
  minimumDate?: Date;
  /** Kept for callers; the colours now follow the app theme. */
  forceDark?: boolean;
}

function formatDate(date: Date, fmt: DateFormat): string {
  const d   = date.getDate();
  const m   = date.getMonth();
  const y   = date.getFullYear();
  const dd  = String(d).padStart(2, "0");
  const mm  = String(m + 1).padStart(2, "0");
  const mon = date.toLocaleString("en-US", { month: "short" });
  if (fmt === "iso")   return `${y}-${mm}-${dd}`;
  if (fmt === "uk")    return `${dd}/${mm}/${y}`;
  if (fmt === "us")    return `${mm}/${dd}/${y}`;
  if (fmt === "event") return `${mon} ${d}, ${y}`;
  return `${dd} ${mon} ${y}`;
}

function formatTime(h24: number, min: number): string {
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12  = h24 % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

const MONTH_ABBR: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDate(str: string, fmt: DateFormat = "display"): Date {
  if (!str) return new Date();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const slash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    // "us" writes MM/DD/YYYY, everything else (including "uk") writes DD/MM/YYYY — must match formatDate's own output.
    const [, a, b, y] = slash;
    const [mm, dd] = fmt === "us" ? [a, b] : [b, a];
    return new Date(+y, +mm - 1, +dd);
  }
  // "event" format is formatDate's own output ("Mar 15, 2026"): parsed explicitly, not by the engine's free-form
  // Date parsing.
  const event = str.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (event) {
    const month = MONTH_ABBR[event[1]];
    if (month !== undefined) return new Date(+event[3], month, +event[2]);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** "7:30 PM", "19:30" or "" → hours (0-23) and minutes; null when it cannot be read. */
function parseTime(str: string): { h: number; m: number } | null {
  const t = str.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!t) return null;
  let h = +t[1];
  const m = +t[2];
  if (t[3]) {
    const pm = /p/i.test(t[3]);
    h = (h % 12) + (pm ? 12 : 0);
  }
  return h < 24 && m < 60 ? { h, m } : null;
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** The field both pickers share: icon, value or placeholder, chevron. */
function Field({ icon, text, placeholder, open, accent, style, textStyle, onPress, label }: {
  icon: keyof typeof Ionicons.glyphMap; text: string; placeholder: string; open: boolean; accent: string;
  style?: object; textStyle?: object; onPress: () => void; label: string;
}) {
  const { tc } = useTheme();
  return (
    <Pressable
      style={[styles.field, { backgroundColor: tc.inputBg, borderColor: open ? accent : tc.borderLight }, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text ? `${label}: ${text}` : placeholder}
      accessibilityState={{ expanded: open }}
    >
      <Ionicons name={icon} size={16} color={accent} />
      <Text style={[styles.fieldText, { color: text ? tc.textPrimary : tc.textTertiary }, textStyle]} numberOfLines={1}>
        {text || placeholder}
      </Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={tc.textTertiary} />
    </Pressable>
  );
}

// ─── DatePickerField ──────────────────────────────────────────────────────────

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function DatePickerField({
  value,
  onChange,
  placeholder = "Select date",
  accentColor,
  style,
  textStyle,
  dateFormat = "display",
  minimumDate,
}: PickerProps) {
  const { tc } = useTheme();
  const accent = accentColor ?? tc.accent;
  const [open, setOpen] = useState(false);
  const selected = value ? parseDate(value, dateFormat) : null;
  // The month on show; starts at the chosen date, or this month.
  const [month, setMonth] = useState(() => {
    const d = selected ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const minTime = minimumDate ? dayStart(minimumDate) : null;
  const today = dayStart(new Date());
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) out.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);
  // No going back past the month of the minimum date.
  const canGoBack = minTime === null || new Date(month.getFullYear(), month.getMonth(), 0).getTime() >= minTime;

  const toggle = () => {
    if (!open) {
      const d = selected ?? (minimumDate && dayStart(minimumDate) > today ? minimumDate : new Date());
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    setOpen(!open);
  };

  const pick = (d: Date) => {
    void Haptics.selectionAsync();
    onChange(formatDate(d, dateFormat));
    setOpen(false);
  };

  const shown = selected ? formatDate(selected, "event") : "";
  return (
    <>
      <Field icon="calendar-outline" text={shown} placeholder={placeholder} open={open} accent={accent} style={style}
        textStyle={textStyle} onPress={toggle} label="Date" />
      {open ? (
        <View style={[styles.panel, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => canGoBack && setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              hitSlop={8} style={[styles.navBtn, { backgroundColor: tc.chipBg, opacity: canGoBack ? 1 : 0.35 }]}
              accessibilityRole="button" accessibilityLabel="Previous month" disabled={!canGoBack}>
              <Ionicons name="chevron-back" size={18} color={tc.textPrimary} />
            </Pressable>
            <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>
              {month.toLocaleString("en-US", { month: "long", year: "numeric" })}
            </Text>
            <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              hitSlop={8} style={[styles.navBtn, { backgroundColor: tc.chipBg }]}
              accessibilityRole="button" accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={18} color={tc.textPrimary} />
            </Pressable>
          </View>
          {/* One row per week, each cell flex: 1: seven percentage widths rounded past 100% and wrapped Sunday. */}
          <View style={styles.row}>
            {WEEKDAYS.map((w, i) => (
              <View key={`w${i}`} style={[styles.cell, styles.headCell]}>
                <Text style={[TYPE.label, { color: tc.textTertiary }]}>{w}</Text>
              </View>
            ))}
          </View>
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) => cells.slice(w * 7, w * 7 + 7)).map((week, w) => (
            <View key={`r${w}`} style={styles.row}>
              {Array.from({ length: 7 }, (_, j) => week[j] ?? null).map((d, j) => {
                if (!d) return <View key={`e${w}-${j}`} style={styles.cell} />;
                const t = d.getTime();
                const disabled = minTime !== null && t < minTime;
                const isSel = selected !== null && dayStart(selected) === t;
                const isToday = t === today;
                return (
                  <View key={t} style={styles.cell}>
                    <Pressable
                      onPress={() => pick(d)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityLabel={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      accessibilityState={{ selected: isSel, disabled }}
                      style={[styles.day, isSel && { backgroundColor: accent }, !isSel && isToday && { borderWidth: 1.5, borderColor: accent }]}
                    >
                      <Text style={[TYPE.bodyStrong, { fontSize: 14, color: isSel ? palette.white : disabled ? tc.textTertiary : tc.textPrimary, opacity: disabled ? 0.45 : 1 }]}>
                        {d.getDate()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

// ─── TimePickerField ──────────────────────────────────────────────────────────

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 15, 30, 45];

export function TimePickerField({
  value,
  onChange,
  placeholder = "Select time",
  accentColor,
  style,
  textStyle,
}: Omit<PickerProps, "dateFormat" | "minimumDate">) {
  const { tc } = useTheme();
  const accent = accentColor ?? tc.accent;
  const [open, setOpen] = useState(false);
  const current = parseTime(value);
  // The time being chosen; starts at the field's value, or 7:00 PM.
  const [h12, setH12] = useState(12);
  const [min, setMin] = useState(0);
  const [pm, setPm] = useState(true);

  const toggle = () => {
    if (!open) {
      const t = current ?? { h: 19, m: 0 };
      setH12(t.h % 12 || 12);
      setMin(t.m);
      setPm(t.h >= 12);
    }
    setOpen(!open);
  };

  const done = () => {
    void Haptics.selectionAsync();
    onChange(formatTime((h12 % 12) + (pm ? 12 : 0), min));
    setOpen(false);
  };

  const chip = (label: string, on: boolean, onPress: () => void, key: string | number) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[styles.chip, { backgroundColor: on ? accent : tc.inputBg }]}>
      <Text style={[TYPE.bodyStrong, { fontSize: 14, color: on ? palette.white : tc.textPrimary }]}>{label}</Text>
    </Pressable>
  );
  // A minute off the quarter hours (from a saved value) still shows as a chip.
  const minutes = MINUTES.includes(min) ? MINUTES : [...MINUTES, min].sort((a, b) => a - b);

  return (
    <>
      <Field icon="time-outline" text={current ? formatTime(current.h, current.m) : value} placeholder={placeholder}
        open={open} accent={accent} style={style} textStyle={textStyle} onPress={toggle} label="Time" />
      {open ? (
        <View style={[styles.panel, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <Text style={[TYPE.overline, { color: tc.textTertiary, marginBottom: 8 }]}>Hour</Text>
          <View style={styles.chips}>{HOURS.map((h) => chip(String(h), h12 === h, () => setH12(h), `h${h}`))}</View>
          <Text style={[TYPE.overline, { color: tc.textTertiary, marginTop: 14, marginBottom: 8 }]}>Minutes</Text>
          <View style={styles.chips}>{minutes.map((m) => chip(`:${String(m).padStart(2, "0")}`, min === m, () => setMin(m), `m${m}`))}</View>
          <View style={[styles.footer, { borderTopColor: tc.divider }]}>
            <View style={[styles.ampm, { backgroundColor: tc.inputBg }]}>
              {(["AM", "PM"] as const).map((p) => {
                const on = (p === "PM") === pm;
                return (
                  <Pressable key={p} onPress={() => setPm(p === "PM")} accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={[styles.ampmBtn, on && { backgroundColor: accent }]}>
                    <Text style={[TYPE.bodyStrong, { fontSize: 14, color: on ? palette.white : tc.textSecondary }]}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={done} accessibilityRole="button" accessibilityLabel={`Set ${formatTime((h12 % 12) + (pm ? 12 : 0), min)}`}
              style={[styles.doneBtn, { backgroundColor: accent }]}>
              <Text style={[TYPE.button, { color: palette.white }]}>Set {formatTime((h12 % 12) + (pm ? 12 : 0), min)}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  fieldText: {
    fontSize: 15,
    flex: 1,
  },
  // Full width of its container: in a row of two fields (start / end time), the row wraps and the open panel
  // takes a line of its own instead of squeezing in beside them.
  panel: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 8,
    padding: 12,
  },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  navBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row" },
  cell: { flex: 1, height: 44, alignItems: "center", justifyContent: "center" },
  headCell: { height: 28 },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  // Six hours or four minutes to a row, stretched to the panel's width.
  chip: { flexGrow: 1, flexBasis: "14%", minWidth: 48, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, alignItems: "center" },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  ampm: { flexDirection: "row", borderRadius: 12, padding: 3 },
  ampmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  doneBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
});
