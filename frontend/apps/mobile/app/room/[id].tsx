// A shared space (spare room) detail (plan 03). Opened from the Roommates tab's Available Rooms and Saved.
import { useState } from "react";
import { View, ActivityIndicator, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSharedSpace,
  applyToSharedSpace,
  toggleFavoriteSharedSpace,
  deleteSharedSpace,
} from "../../src/api/roommates.api";
import { ApiError } from "../../src/api/client";
import { type AvailableRoom, toUiAvailableRoom } from "../../src/features/housing/roommateModel";
import { AvailableRoomDetail } from "../../src/features/housing/components/AvailableRoomDetail";
import { EditSharedSpaceModal } from "../../src/features/housing/components/EditSharedSpaceModal";
import { useRoomRequested } from "../../src/features/housing/localProgress";
import { useAuthStore } from "../../src/store/auth.store";
import { useRequireAuth } from "../../src/shared/hooks/useRequireAuth";
import { showToast } from "../../src/shared/ui/Toast";
import { appAlert } from "../../src/shared/ui/Dialogs";
import { useTheme } from "../../src/theme/useTheme";
import { queryKeys } from "../../src/services/cache/queryKeys";
import { closeDetail, findCachedRow, useIdParam } from "../../src/hooks/useDetailRoute";

export default function RoomDetailScreen() {
  const id = useIdParam();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { requireAuth } = useRequireAuth();
  const { tc } = useTheme();
  const { requested, markRequested } = useRoomRequested(id);
  const [editing, setEditing] = useState<AvailableRoom | null>(null);
  const key = ["housing", "detail", "room", id, userId ?? ""];

  const q = useQuery<AvailableRoom>({
    queryKey: key,
    queryFn: async () => toUiAvailableRoom(await getSharedSpace(id)),
    enabled: !!id,
    staleTime: 0,
    initialData: () => findCachedRow<AvailableRoom>(qc, ["housing", "rooms"], id)?.row,
    initialDataUpdatedAt: 0,
  });

  const refreshLists = () => {
    void qc.invalidateQueries({ queryKey: ["housing", "rooms"] });
    void qc.invalidateQueries({ queryKey: queryKeys.saved() });
  };

  const apply = async (message?: string) => {
    if (!requireAuth(undefined, "Sign in to request this shared space.")) return;
    try {
      await applyToSharedSpace(id, message?.trim() || undefined);
      void markRequested();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "";
      if (msg.toLowerCase().includes("already applied")) void markRequested();
      showToast(msg || "Could not send request. Please try again.", "error");
    }
  };

  const toggleSave = async () => {
    if (!requireAuth(undefined, "Sign in to save this space and find it later.")) return;
    try {
      const { saved } = await toggleFavoriteSharedSpace(id);
      qc.setQueryData<AvailableRoom>(key, (r) => (r?.api ? { ...r, api: { ...r.api, isSaved: saved, savedByMe: saved } } : r));
      refreshLists();
    } catch {
      showToast("Could not update bookmark. Please try again.", "error");
    }
  };

  const confirmDelete = () =>
    appAlert("Delete this listing?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSharedSpace(id);
            refreshLists();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Shared space deleted.", "success");
            closeDetail();
          } catch (err) {
            showToast(err instanceof ApiError ? err.message : "Could not delete. Try again.", "error");
          }
        },
      },
    ]);

  const room = q.data ?? null;
  if (!room) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: tc.pageBg, padding: 24 }}>
        {q.isError ? (
          <>
            <Text style={{ color: tc.textPrimary, fontSize: 17, fontWeight: "600", textAlign: "center" }}>This space may have been removed.</Text>
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

  const isOwner = !!room.api?.isOwner;
  return (
    <>
      <AvailableRoomDetail
        room={room}
        onClose={closeDetail}
        requested={requested}
        onRequest={() => void apply()}
        saved={!!room.api?.isSaved}
        isOwner={isOwner}
        onToggleSave={() => void toggleSave()}
        onDelete={isOwner ? confirmDelete : undefined}
        onEdit={isOwner ? (r) => setEditing(r) : undefined}
        onApplyWithMessage={(msg) => void apply(msg)}
      />
      <EditSharedSpaceModal
        room={editing}
        onClose={() => setEditing(null)}
        onSaved={(merged) => {
          qc.setQueryData<AvailableRoom>(key, merged);
          refreshLists();
        }}
      />
    </>
  );
}
