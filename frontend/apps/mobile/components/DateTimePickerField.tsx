import React, { useState } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
// import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
// New:
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { Ionicons } from "@expo/vector-icons";

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
  /** Override auto-detected color scheme — pass when rendered inside a Modal */
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

function formatTime(date: Date): string {
  const h    = date.getHours();
  const min  = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
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
  // "event" format is `formatDate`'s own output, e.g. "Mar 15, 2026" — parse it
  // explicitly rather than relying on the JS engine's free-form Date parsing,
  // which is not guaranteed consistent across platforms/engines (Hermes included).
  const event = str.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (event) {
    const month = MONTH_ABBR[event[1]];
    if (month !== undefined) return new Date(+event[3], month, +event[2]);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ─── Inline iOS bottom-sheet picker (no nested Modal) ────────────────────────
function InlinePickerSheet({
  visible,
  accentColor,
  onCancel,
  onDone,
  children,
  isDark,
}: {
  visible: boolean;
  accentColor: string;
  onCancel: () => void;
  onDone: () => void;
  children: React.ReactNode;
  isDark: boolean;
}) {
  if (!visible) return null;
  const bg     = isDark ? "#1E2D47" : "#FFFFFF";
  const border = isDark ? "#2D3F5C" : "#E2E8F0";
  const gray   = isDark ? "#9CA3AF" : "#9CA3AF";
  return (
    <View style={[styles.inlineSheet, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.toolbar, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={onCancel} hitSlop={10}>
          <Text style={[styles.toolbarBtn, { color: gray }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDone} hitSlop={10}>
          <Text style={[styles.toolbarBtn, { color: accentColor, fontWeight: "700" }]}>Done</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

// ─── DatePickerField ──────────────────────────────────────────────────────────

export function DatePickerField({
  value,
  onChange,
  placeholder = "Select date",
  accentColor = "#1A6BAE",
  style,
  textStyle,
  dateFormat = "display",
  minimumDate,
  forceDark,
}: PickerProps) {
  const scheme = useColorScheme();
  const isDark = forceDark ?? scheme === "dark";
  const [show, setShow]       = useState(false);
  const [pending, setPending] = useState<Date>(parseDate(value, dateFormat));

  const bg        = isDark ? "#1A2740" : "#FFFFFF";
  const border    = isDark ? "#2D3F5C" : "#E2E8F0";
  const textColor = isDark ? "#F1F5F9" : "#0F172A";
  const phColor   = isDark ? "#64748B" : "#9CA3AF";
  const chevColor = isDark ? "#64748B" : "#9CA3AF";

//   const onAndroid = (_: DateTimePickerEvent, selected?: Date) => {
//       setShow(false);
//       if (selected) onChange(formatDate(selected, dateFormat));
//     };
//
//     const onIOS = (_: DateTimePickerEvent, selected?: Date) => {
//       if (selected) setPending(selected);
//     };
//
//     const confirmIOS = () => {
//       onChange(formatDate(pending, dateFormat));
//       setShow(false);
//     };
//
//     const displayText = value
//       ? (() => {
//           try { return formatDate(parseDate(value, dateFormat), "event"); }
//           catch { return value; }
//         })()
//       : "";
//
//     return (
//       <>
//         <Pressable
//           style={[styles.field, { backgroundColor: bg, borderColor: border }, style]}
//           onPress={() => { setPending(parseDate(value, dateFormat)); setShow(true); }}
//         >
//           <Ionicons name="calendar-outline" size={16} color={accentColor} />
//           <Text
//             style={[styles.fieldText, { color: displayText ? textColor : phColor }, textStyle]}
//             numberOfLines={1}
//           >
//             {displayText || placeholder}
//           </Text>
//           <Ionicons name={show ? "chevron-up" : "chevron-down"} size={14} color={chevColor} />
//         </Pressable>
//
//         {process.env.EXPO_OS === "ios" ? (
//           <InlinePickerSheet
//             visible={show}
//             accentColor={accentColor}
//             onCancel={() => setShow(false)}
//             onDone={confirmIOS}
//             isDark={isDark}
//           >
//             <DateTimePicker
//               value={pending}
//               mode="date"
//               display="spinner"
//               onChange={onIOS}
//               minimumDate={minimumDate}
//               themeVariant={isDark ? "dark" : "light"}
//               style={{ width: "100%" }}
//             />
//           </InlinePickerSheet>
//         ) : (
//           show && (
//             <DateTimePicker
//               value={pending}
//               mode="date"
//               display="default"
//               onChange={onAndroid}
//               minimumDate={minimumDate}
//             />
//           )
//         )}
//       </>
//     );
//   }
  // New:
  const onIOS = (_: DateTimePickerEvent, selected?: Date) => {
      if (selected) setPending(selected);
    };

    const confirmIOS = () => {
      onChange(formatDate(pending, dateFormat));
      setShow(false);
    };

    const openAndroidPicker = () => {
      // Re-parse the currently displayed value fresh on every open (not from a stale
      // closure) so a date picked and saved once doesn't "stick" as the picker's
      // initial position on the next open.
      const initial = value ? parseDate(value, dateFormat) : new Date();
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        display: "default",
        ...(minimumDate ? { minimumDate } : {}),
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === "set" && selected) onChange(formatDate(selected, dateFormat));
        },
      });
    };

    const openPicker = () => {
      if (process.env.EXPO_OS === "android") {
        openAndroidPicker();
        return;
      }
      setPending(parseDate(value, dateFormat));
      setShow(true);
    };

    const displayText = value
      ? (() => {
          try { return formatDate(parseDate(value, dateFormat), "event"); }
          catch { return value; }
        })()
      : "";

    return (
      <>
        <Pressable
          style={[styles.field, { backgroundColor: bg, borderColor: border }, style]}
          onPress={openPicker}
        >
          <Ionicons name="calendar-outline" size={16} color={accentColor} />
          <Text
            style={[styles.fieldText, { color: displayText ? textColor : phColor }, textStyle]}
            numberOfLines={1}
          >
            {displayText || placeholder}
          </Text>
          <Ionicons name={show ? "chevron-up" : "chevron-down"} size={14} color={chevColor} />
        </Pressable>

        {process.env.EXPO_OS === "ios" && (
          <InlinePickerSheet
            visible={show}
            accentColor={accentColor}
            onCancel={() => setShow(false)}
            onDone={confirmIOS}
            isDark={isDark}
          >
            <DateTimePicker
              value={pending}
              mode="date"
              display="spinner"
              onChange={onIOS}
              minimumDate={minimumDate}
              themeVariant={isDark ? "dark" : "light"}
              style={{ width: "100%" }}
            />
          </InlinePickerSheet>
        )}
      </>
    );
  }

// ─── TimePickerField ──────────────────────────────────────────────────────────

export function TimePickerField({
  value,
  onChange,
  placeholder = "Select time",
  accentColor = "#1A6BAE",
  style,
  textStyle,
  forceDark,
}: Omit<PickerProps, "dateFormat" | "minimumDate">) {
  const scheme = useColorScheme();
  const isDark = forceDark ?? scheme === "dark";
  const [show, setShow]       = useState(false);
  const [pending, setPending] = useState<Date>(new Date());

  const bg        = isDark ? "#1A2740" : "#FFFFFF";
  const border    = isDark ? "#2D3F5C" : "#E2E8F0";
  const textColor = isDark ? "#F1F5F9" : "#0F172A";
  const phColor   = isDark ? "#64748B" : "#9CA3AF";
  const chevColor = isDark ? "#64748B" : "#9CA3AF";

//   const onAndroid = (_: DateTimePickerEvent, selected?: Date) => {
//       setShow(false);
//       if (selected) onChange(formatTime(selected));
//     };
//
//     const onIOS = (_: DateTimePickerEvent, selected?: Date) => {
//       if (selected) setPending(selected);
//     };
//
//     const confirmIOS = () => {
//       onChange(formatTime(pending));
//       setShow(false);
//     };
//
//     return (
//       <>
//         <Pressable
//           style={[styles.field, { backgroundColor: bg, borderColor: border }, style]}
//           onPress={() => setShow(true)}
//         >
//           <Ionicons name="time-outline" size={16} color={accentColor} />
//           <Text
//             style={[styles.fieldText, { color: value ? textColor : phColor }, textStyle]}
//             numberOfLines={1}
//           >
//             {value || placeholder}
//           </Text>
//           <Ionicons name={show ? "chevron-up" : "chevron-down"} size={14} color={chevColor} />
//         </Pressable>
//
//         {process.env.EXPO_OS === "ios" ? (
//           <InlinePickerSheet
//             visible={show}
//             accentColor={accentColor}
//             onCancel={() => setShow(false)}
//             onDone={confirmIOS}
//             isDark={isDark}
//           >
//             <DateTimePicker
//               value={pending}
//               mode="time"
//               display="spinner"
//               onChange={onIOS}
//               is24Hour={false}
//               themeVariant={isDark ? "dark" : "light"}
//               style={{ width: "100%" }}
//             />
//           </InlinePickerSheet>
//         ) : (
//           show && (
//             <DateTimePicker
//               value={pending}
//               mode="time"
//               display="default"
//               onChange={onAndroid}
//               is24Hour={false}
//             />
//           )
//         )}
//       </>
//     );
//   }
  // New:
  const onIOS = (_: DateTimePickerEvent, selected?: Date) => {
      if (selected) setPending(selected);
    };

    const confirmIOS = () => {
      onChange(formatTime(pending));
      setShow(false);
    };

    const openAndroidPicker = () => {
      DateTimePickerAndroid.open({
        value: pending,
        mode: "time",
        display: "default",
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === "set" && selected) onChange(formatTime(selected));
        },
      });
    };

    const openPicker = () => {
      if (process.env.EXPO_OS === "android") {
        openAndroidPicker();
        return;
      }
      setShow(true);
    };

    return (
      <>
        <Pressable
          style={[styles.field, { backgroundColor: bg, borderColor: border }, style]}
          onPress={openPicker}
        >
          <Ionicons name="time-outline" size={16} color={accentColor} />
          <Text
            style={[styles.fieldText, { color: value ? textColor : phColor }, textStyle]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <Ionicons name={show ? "chevron-up" : "chevron-down"} size={14} color={chevColor} />
        </Pressable>

        {process.env.EXPO_OS === "ios" && (
          <InlinePickerSheet
            visible={show}
            accentColor={accentColor}
            onCancel={() => setShow(false)}
            onDone={confirmIOS}
            isDark={isDark}
          >
            <DateTimePicker
              value={pending}
              mode="time"
              display="spinner"
              onChange={onIOS}
              is24Hour={false}
              themeVariant={isDark ? "dark" : "light"}
              style={{ width: "100%" }}
            />
          </InlinePickerSheet>
        )}
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
  inlineSheet: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    fontSize: 16,
  },
});
