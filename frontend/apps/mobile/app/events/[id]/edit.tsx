// The host edits their event (plan 11, TR-037). Opened from Edit on the event's page. The city, category, format and
// photos are fixed after creation; the server ignores a city and makes the checks create makes.
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEvent, updateEvent, type CreateEventPayload } from "../../../src/api/events.api";
import { ApiError } from "../../../src/api/client";
import { DPage } from "../../../src/shared/d/Page";
import { Segmented } from "../../../src/shared/d";
import { DatePickerField, TimePickerField } from "../../../components/DateTimePickerField";
import { parseFlexibleDateToIsoDate } from "../../../src/features/compose/mappers";
import { appAlert } from "../../../src/shared/ui/Dialogs";
import { showToast } from "../../../src/shared/ui/Toast";
import { useTheme } from "../../../src/theme/useTheme";
import { TYPE } from "../../../src/theme/d";
import { queryKeys } from "../../../src/services/cache/queryKeys";
import { closeDetail, useIdParam } from "../../../src/hooks/useDetailRoute";
import { cityTodayIso, eventDayDate } from "../../../src/utils/eventDay";

type Form = {
  title: string;
  description: string;
  date: string; // "Mar 15, 2026", as the composer's picker gives it
  startTime: string;
  endTime: string;
  venue: string;
  capacity: string;
  paid: boolean;
  price: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toForm(e: Awaited<ReturnType<typeof getEvent>>): Form {
  const d = eventDayDate(e.date);
  return {
    title: e.title ?? "",
    description: e.description ?? "",
    date: d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : "",
    startTime: e.startTime ?? "",
    endTime: e.endTime ?? "",
    venue: e.venue ?? "",
    capacity: e.capacity != null ? String(e.capacity) : "",
    paid: e.ticketType === "PAID",
    price: e.ticketPrice != null && Number(e.ticketPrice) > 0 ? String(Number(e.ticketPrice)) : "",
  };
}

export default function EditEventScreen() {
  const id = useIdParam();
  const qc = useQueryClient();
  const { tc, isDark } = useTheme();
  const q = useQuery({ queryKey: [...queryKeys.event(id), "edit"], queryFn: () => getEvent(id), enabled: !!id, staleTime: 0 });
  const [form, setForm] = useState<Form | null>(null);
  const [initial, setInitial] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data && !initial) {
      const f = toForm(q.data);
      setForm(f);
      setInitial(f);
    }
  }, [q.data, initial]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const dirty = !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial);

  const leave = () => {
    if (!dirty) { closeDetail(); return; }
    appAlert("Discard your changes?", undefined, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: closeDetail },
    ]);
  };

  const save = async () => {
    if (!form || !initial || !q.data || saving) return;
    const title = form.title.trim();
    const venue = form.venue.trim();
    const day = parseFlexibleDateToIsoDate(form.date);
    if (!title) return showToast("Give the event a title.", "error");
    if (!venue) return showToast("Say where the event is.", "error");
    if (!day) return showToast("Choose a date.", "error");
    if (!form.startTime.trim()) return showToast("Choose a start time.", "error");
    if (form.date !== initial.date && day < cityTodayIso(q.data.city)) return showToast("The date has passed.", "error");
    const capacity = form.capacity.trim() ? Number(form.capacity) : undefined;
    if (capacity != null && (!Number.isInteger(capacity) || capacity < 1)) return showToast("Capacity is a whole number.", "error");
    const price = Number(form.price);
    if (form.paid && !(price > 0)) return showToast("A paid event needs a price.", "error");

    // Send only what changed.
    const payload: Partial<CreateEventPayload> = {};
    if (title !== initial.title.trim()) payload.title = title;
    if (form.description.trim() !== initial.description.trim()) payload.description = form.description.trim();
    if (form.date !== initial.date) payload.date = day;
    if (form.startTime !== initial.startTime) payload.startTime = form.startTime;
    if (form.endTime !== initial.endTime) payload.endTime = form.endTime;
    if (venue !== initial.venue.trim()) payload.venue = venue;
    if (form.capacity !== initial.capacity && capacity != null) payload.capacity = capacity;
    if (form.paid !== initial.paid || form.price !== initial.price) {
      payload.ticketType = form.paid ? "PAID" : "FREE";
      payload.ticketPrice = form.paid ? price : 0;
    }
    if (Object.keys(payload).length === 0) { closeDetail(); return; }

    setSaving(true);
    try {
      await updateEvent(id, payload);
      void qc.invalidateQueries({ queryKey: queryKeys.event(id) });
      void qc.invalidateQueries({ queryKey: ["events", "list"] });
      void qc.invalidateQueries({ queryKey: ["feed", "hero"] });
      void qc.invalidateQueries({ queryKey: queryKeys.saved() });
      const told = payload.date || payload.startTime || payload.endTime || payload.venue;
      showToast(told && q.data.attendeeCount > 0 ? "Saved. The people going have been told." : "Saved.", "success");
      router.back();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, input: React.ReactNode, hint?: string) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={[TYPE.label, { color: tc.textSecondary, marginBottom: 6, marginLeft: 2 }]}>{label}</Text>
      {input}
      {hint ? <Text style={[TYPE.small, { color: tc.textTertiary, marginTop: 5, marginLeft: 2, fontSize: 12 }]}>{hint}</Text> : null}
    </View>
  );
  const inputBox = { minHeight: 50, borderRadius: 16, paddingHorizontal: 14, backgroundColor: tc.inputBg, justifyContent: "center" as const };
  const inputText = [TYPE.body, { color: tc.textPrimary, paddingVertical: 12 }];
  const picker = { borderColor: tc.borderLight, backgroundColor: tc.cardBg };

  return (
    <DPage
      title="Edit event"
      largeTitle="hidden"
      onBack={leave}
      right={
        <Pressable onPress={() => void save()} disabled={!form || saving} hitSlop={8} accessibilityRole="button" accessibilityLabel="Save event"
          style={{ paddingHorizontal: 12, height: 42, justifyContent: "center" }}>
          {saving ? <ActivityIndicator size="small" color={tc.accent} /> : <Text style={[TYPE.bodyStrong, { color: form ? tc.accentText : tc.textTertiary }]}>Save</Text>}
        </Pressable>
      }
    >
      {!form ? (
        <View style={{ paddingVertical: 60, alignItems: "center" }}>
          {q.isError ? <Text style={[TYPE.body, { color: tc.textSecondary }]}>Could not load the event.</Text> : <ActivityIndicator color={tc.accent} />}
        </View>
      ) : q.data && !q.data.isOwner ? (
        <Text style={[TYPE.body, { color: tc.textSecondary, paddingHorizontal: 18, paddingVertical: 40, textAlign: "center" }]}>Only the host can edit this event.</Text>
      ) : (
        <View style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 }}>
          {field("Title", <View style={inputBox}><TextInput style={inputText} value={form.title} onChangeText={(t) => set("title", t)} maxLength={120} placeholder="Event title" placeholderTextColor={tc.textTertiary} /></View>)}
          {field("About", <View style={[inputBox, { paddingVertical: 4 }]}><TextInput style={[inputText, { minHeight: 110, textAlignVertical: "top" }]} value={form.description} onChangeText={(t) => set("description", t)} multiline placeholder="What happens, who it's for" placeholderTextColor={tc.textTertiary} /></View>)}
          {field("Date", <DatePickerField value={form.date} onChange={(v) => set("date", v)} dateFormat="event" minimumDate={eventDayDate(cityTodayIso(q.data?.city)) ?? undefined} style={picker} textStyle={{ color: tc.textPrimary }} forceDark={isDark} accentColor={tc.accent} />)}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>{field("Starts", <TimePickerField value={form.startTime} onChange={(v) => set("startTime", v)} placeholder="Start" style={picker} textStyle={{ color: tc.textPrimary }} forceDark={isDark} accentColor={tc.accent} />)}</View>
            <View style={{ flex: 1 }}>{field("Ends", <TimePickerField value={form.endTime} onChange={(v) => set("endTime", v)} placeholder="End" style={picker} textStyle={{ color: tc.textPrimary }} forceDark={isDark} accentColor={tc.accent} />)}</View>
          </View>
          {field("Where", <View style={inputBox}><TextInput style={inputText} value={form.venue} onChangeText={(t) => set("venue", t)} placeholder="Venue or address" placeholderTextColor={tc.textTertiary} /></View>, `In ${q.data?.city ?? "the event's city"}. The city cannot be changed.`)}
          {field("Capacity", <View style={inputBox}><TextInput style={inputText} value={form.capacity} onChangeText={(t) => set("capacity", t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="No limit" placeholderTextColor={tc.textTertiary} /></View>,
            q.data && q.data.attendeeCount > 0 ? `${q.data.attendeeCount} registered so far.` : undefined)}
          {field("Entry", <Segmented items={[{ key: "free", label: "Free" }, { key: "paid", label: "Paid" }]} value={form.paid ? "paid" : "free"} onChange={(k) => set("paid", k === "paid")} />)}
          {form.paid ? field("Price", <View style={inputBox}><TextInput style={inputText} value={form.price} onChangeText={(t) => set("price", t.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={tc.textTertiary} /></View>) : null}
          {q.data && q.data.attendeeCount > 0 ? (
            <Text style={[TYPE.small, { color: tc.textTertiary, marginTop: 6 }]}>If you change the date, time or place, everyone registered gets a notification.</Text>
          ) : null}
        </View>
      )}
    </DPage>
  );
}
