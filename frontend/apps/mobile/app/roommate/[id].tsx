// A roommate profile (plan 03). Opened from the Roommates tab, Saved and notifications. Signed-in users only.
import { View, ActivityIndicator, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRoommate,
  connectWithRoommate,
  acceptRoommateConnection,
  declineRoommateConnection,
  toggleRoommateSave,
} from "../../src/api/roommates.api";
import { ApiError } from "../../src/api/client";
import { type Roommate, toUiRoommate } from "../../src/features/housing/roommateModel";
import { RoommateDetail } from "../../src/features/housing/components/RoommateDetail";
import { useAuthStore } from "../../src/store/auth.store";
import { showToast } from "../../src/shared/ui/Toast";
import { useTheme } from "../../src/theme/useTheme";
import { queryKeys } from "../../src/services/cache/queryKeys";
import { closeDetail, findCachedRow, useIdParam } from "../../src/hooks/useDetailRoute";

export default function RoommateDetailScreen() {
  const id = useIdParam();
  const qc = useQueryClient();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const userId = useAuthStore((s) => s.user?.id);
  const { tc } = useTheme();
  const key = ["housing", "detail", "roommate", id, userId ?? ""];

  const q = useQuery<Roommate>({
    queryKey: key,
    queryFn: async () => toUiRoommate(await getRoommate(id)),
    enabled: !!id && isAuthed,
    staleTime: 0,
    initialData: () => findCachedRow<Roommate>(qc, ["housing", "roommates"], id)?.row,
    initialDataUpdatedAt: 0,
  });

  // Patch the open profile and send the Roommates list to refetch, so Back shows the same state.
  const patch = (fn: (r: Roommate) => Roommate) => {
    qc.setQueryData<Roommate>(key, (prev) => (prev ? fn(prev) : prev));
    void qc.invalidateQueries({ queryKey: ["housing", "roommates"] });
  };

  const connect = async () => {
    try {
      const res = await connectWithRoommate(id);
      patch((r) => ({ ...r, connectionStatus: "pending_sent", conversationId: res.conversationId ?? r.conversationId }));
    } catch {
      showToast("Could not connect. Please try again.", "error");
      void q.refetch();
    }
  };
  const accept = async () => {
    try {
      const { conversationId } = await acceptRoommateConnection(id);
      patch((r) => ({ ...r, connectionStatus: "accepted", conversationId: conversationId ?? r.conversationId }));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not accept. Try again.", "error");
    }
  };
  const decline = async (failure: string) => {
    try {
      await declineRoommateConnection(id);
      patch((r) => ({ ...r, connectionStatus: null, conversationId: null }));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : failure, "error");
    }
  };
  const toggleSave = async () => {
    try {
      const { saved } = await toggleRoommateSave(id);
      patch((r) => ({ ...r, isSaved: saved }));
      void qc.invalidateQueries({ queryKey: queryKeys.saved() });
    } catch {
      showToast("Could not update save. Please try again.", "error");
    }
  };

  const roommate = q.data ?? null;
  if (!roommate) {
    const message = !isAuthed
      ? "Sign in to view roommate profiles."
      : q.isError
        ? "This roommate profile may no longer be active."
        : null;
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: tc.pageBg, padding: 24 }}>
        {message ? (
          <>
            <Text style={{ color: tc.textPrimary, fontSize: 17, fontWeight: "600", textAlign: "center" }}>{message}</Text>
            {!isAuthed ? (
              <Pressable onPress={() => router.push("/(auth)/login" as never)} accessibilityRole="button" hitSlop={8}>
                <Text style={{ color: tc.accentText, fontSize: 16, fontWeight: "600" }}>Sign in</Text>
              </Pressable>
            ) : null}
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
    <RoommateDetail
      roommate={roommate}
      onClose={closeDetail}
      isBookmarked={!!roommate.isSaved}
      onToggleBookmark={() => void toggleSave()}
      onConnect={() => void connect()}
      onAccept={() => void accept()}
      onDecline={() => void decline("Could not decline. Try again.")}
      onCancelRequest={() => void decline("Could not cancel. Try again.")}
    />
  );
}
