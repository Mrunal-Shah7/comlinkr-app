// An event's detail (plan 03). Opened from Explore, the Events screen, Saved, chat and links
// (comlinkr://events/:id, /app/feed?openEvent=<id>). Check-in lives beside it at [id]/check-in.tsx.
import { useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteEvent, getEvent, registerForEvent, unregisterFromEvent, toggleSaveEvent, type ApiEvent } from "../../../src/api/events.api";
import { ApiError } from "../../../src/api/client";
import { type ExploreEventRow, apiEventToExploreRow } from "../../../src/features/explore/models";
import { EventDetail } from "../../../src/features/explore/components/EventDetail";
import EventRegistrationModal from "../../../src/features/explore/components/EventRegistrationModal";
import { useRequireAuth } from "../../../src/shared/hooks/useRequireAuth";
import { useAuthStore } from "../../../src/store/auth.store";
import { useSidebarStore } from "../../../src/store/sidebar.store";
import { useNotificationStore } from "../../../src/store/notifications.store";
import { showToast } from "../../../src/shared/ui/Toast";
import { appAlert } from "../../../src/shared/ui/Dialogs";
import { useTheme } from "../../../src/theme/useTheme";
import { queryKeys } from "../../../src/services/cache/queryKeys";
import { closeDetail, useIdParam } from "../../../src/hooks/useDetailRoute";

type Detail = { api: ApiEvent; row: ExploreEventRow };

export default function EventDetailScreen() {
  const id = useIdParam();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { requireAuth } = useRequireAuth();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { tc } = useTheme();
  const [regOpen, setRegOpen] = useState(false);
  const key = [...queryKeys.event(id), userId ?? ""];

  const q = useQuery<Detail>({
    queryKey: key,
    queryFn: async () => {
      const api = await getEvent(id);
      return { api, row: apiEventToExploreRow(api) };
    },
    enabled: !!id,
    staleTime: 0,
  });

  const patch = (fn: (r: ExploreEventRow) => ExploreEventRow) =>
    qc.setQueryData<Detail>(key, (d) => (d ? { ...d, row: fn(d.row) } : d));
  // Explore and the Events screen read their lists through the cache; send them to refetch.
  const refreshLists = () => {
    void qc.invalidateQueries({ queryKey: ["events", "list"] });
    void qc.invalidateQueries({ queryKey: ["feed", "hero"] });
    void qc.invalidateQueries({ queryKey: queryKeys.saved() });
  };

  const toggleSave = async (row: ExploreEventRow) => {
    if (!requireAuth(undefined, "Sign in to save events for later.")) return;
    try {
      const res = await toggleSaveEvent(row.id);
      const saved = res.saved === true;
      patch((r) => ({ ...r, isSaved: saved }));
      useSidebarStore.getState().incrementSaved(saved ? 1 : -1);
      refreshLists();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not update save. Please try again.", "error");
    }
  };

  const toggleGoing = async (row: ExploreEventRow) => {
    if (!requireAuth(undefined, "Sign in to RSVP and get event updates.")) return;
    const next = !row.registeredByMe;
    const before = row;
    patch((r) => ({ ...r, registeredByMe: next, interested: Math.max(0, r.interested + (next ? 1 : -1)) }));
    try {
      if (next) {
        const res = await registerForEvent(row.id, {});
        const cid = res.conversationId ?? undefined;
        patch((r) => ({
          ...r,
          registeredByMe: true,
          interested: typeof res.attendees === "number" ? res.attendees : r.interested,
          conversationId: cid ?? r.conversationId,
          canAccessChat: cid != null ? true : r.canAccessChat,
        }));
      } else {
        const res = await unregisterFromEvent(row.id);
        const attendees = typeof res.attendees === "number" ? res.attendees : undefined;
        const cid = res.conversationId ?? undefined;
        patch((r) => ({
          ...r,
          registeredByMe: false,
          interested: attendees ?? r.interested,
          conversationId: cid ?? r.conversationId,
          canAccessChat: r.isOwner && (attendees ?? 0) > 0 && (cid ?? r.conversationId) != null,
        }));
      }
      refreshLists();
    } catch (e) {
      patch(() => before);
      showToast(
        e instanceof ApiError ? e.message : next ? "Could not RSVP. Please try again." : "Could not cancel RSVP. Please try again.",
        "error",
      );
    }
  };

  // Plan 11: the host cancels from the page. Everyone registered is told by the server before the event goes.
  const cancelEvent = (r: ExploreEventRow) => {
    const going = r.interested;
    appAlert(
      "Cancel this event?",
      going > 0
        ? `It will be removed, and the ${going === 1 ? "person" : `${going} people`} registered will be told.`
        : "It will be removed.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel event",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent(r.id);
              refreshLists();
              void qc.invalidateQueries({ queryKey: ["me"] });
              qc.removeQueries({ queryKey: queryKeys.event(r.id) });
              showToast("Event cancelled.", "success");
              closeDetail();
            } catch (e) {
              showToast(e instanceof ApiError ? e.message : "Could not cancel the event. Please try again.", "error");
            }
          },
        },
      ],
    );
  };

  const row = q.data?.row ?? null;
  if (!row) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: tc.pageBg, padding: 24 }}>
        {q.isError || !id ? (
          <>
            <Text style={{ color: tc.textPrimary, fontSize: 17, fontWeight: "600" }}>Event not found</Text>
            <Pressable onPress={closeDetail} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: tc.accentText, fontSize: 16, fontWeight: "600" }}>Go back</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={tc.accentText} />
        )}
      </View>
    );
  }

  return (
    <>
      <EventDetail
        event={row}
        apiEvent={q.data?.api}
        onClose={closeDetail}
        isSaved={!!row.isSaved}
        onToggleSave={() => void toggleSave(row)}
        isRegistered={!!row.registeredByMe}
        onToggleGoing={() => void toggleGoing(row)}
        onRegister={() => {
          if (!requireAuth(undefined, "Sign in to register for this event.")) return;
          setRegOpen(true);
        }}
        onMessageHost={() => {
          if (!row.authorId) return;
          if (!requireAuth(undefined, "Sign in to message the host.")) return;
          router.push({ pathname: "/chat", params: { recipientId: row.authorId, recipientName: row.host, recipientType: "dm" } } as never);
        }}
        onEdit={() => router.push({ pathname: "/events/[id]/edit", params: { id: row.id } } as never)}
        onCancelEvent={() => cancelEvent(row)}
      />
      <EventRegistrationModal
        visible={regOpen}
        event={row}
        onClose={() => setRegOpen(false)}
        onRegistered={async ({ name, email, phone, tickets }) => {
          addNotification({
            type: "registration",
            emoji: "🎟️",
            title: `Registered for ${row.title}`,
            desc: `${name} (${email}) reserved ${tickets} ticket${tickets === "1" ? "" : "s"}`,
          });
          const res = await registerForEvent(row.id, {
            attendeeName: name,
            attendeeEmail: email,
            attendeePhone: phone || undefined,
            ticketCount: parseInt(tickets, 10) || 1,
          });
          const cid = res.conversationId ?? undefined;
          patch((r) => ({
            ...r,
            registeredByMe: true,
            interested: typeof res.attendees === "number" ? res.attendees : r.interested + 1,
            conversationId: cid ?? r.conversationId,
            canAccessChat: cid != null ? true : r.canAccessChat,
          }));
          refreshLists();
        }}
      />
    </>
  );
}
