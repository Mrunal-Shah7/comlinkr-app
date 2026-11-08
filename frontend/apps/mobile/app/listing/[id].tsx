// A home listing's detail (plan 03). Opened from the Listings tab, Saved, notifications, chat and share links
// (/app/housing/<id>).
import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Pressable } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getListing, toggleListingSave, deleteListing } from "../../src/api/housing.api";
import { ApiError } from "../../src/api/client";
import { type Listing, toUiListing } from "../../src/features/housing/listingModel";
import { PropertyDetail } from "../../src/features/housing/components/PropertyDetail";
import { useListingJourney } from "../../src/features/housing/localProgress";
import { useAuthStore } from "../../src/store/auth.store";
import { useRequireAuth } from "../../src/shared/hooks/useRequireAuth";
import { showToast } from "../../src/shared/ui/Toast";
import { appAlert } from "../../src/shared/ui/Dialogs";
import { useTheme } from "../../src/theme/useTheme";
import { queryKeys } from "../../src/services/cache/queryKeys";
import { closeDetail, findCachedRow, useIdParam } from "../../src/hooks/useDetailRoute";

type Detail = { listing: Listing; saved: boolean };

export default function ListingDetailScreen() {
  const id = useIdParam();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { requireAuth } = useRequireAuth();
  const { tc } = useTheme();
  const journey = useListingJourney(id);

  const q = useQuery<Detail>({
    queryKey: ["housing", "detail", id, userId ?? ""],
    queryFn: async () => {
      const row = await getListing(id);
      return { listing: toUiListing(row, userId), saved: row.isSaved === true || row.savedByMe === true };
    },
    enabled: !!id,
    staleTime: 0,
    // From a list: show its row at once (the fetch above refreshes it). Home rows sit in pages with `savedIds`.
    initialData: () => {
      const hit = findCachedRow<Listing>(qc, ["housing"], id, (k) => !["roommates", "rooms", "detail"].includes(String(k[1])));
      if (!hit) return undefined;
      const pages = (hit.data as { pages?: { savedIds?: string[] }[] }).pages ?? [];
      return { listing: hit.row, saved: pages.some((p) => p.savedIds?.includes(id)) };
    },
    initialDataUpdatedAt: 0,
  });

  const [saved, setSaved] = useState(q.data?.saved ?? false);
  useEffect(() => {
    if (q.data) setSaved(q.data.saved);
  }, [q.data]);

  const refreshLists = () => {
    void qc.invalidateQueries({ queryKey: ["housing"] });
    void qc.invalidateQueries({ queryKey: queryKeys.myListings() });
    void qc.invalidateQueries({ queryKey: queryKeys.saved() });
  };

  const toggleSave = async () => {
    if (!requireAuth(undefined, "Sign in to save listings and find them later.")) return;
    try {
      const res = await toggleListingSave(id);
      setSaved(res.saved);
      refreshLists();
    } catch {
      showToast("Could not update save. Please try again.", "error");
    }
  };

  const confirmDelete = () =>
    appAlert("Delete this listing?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteListing(id);
            refreshLists();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Listing deleted.", "success");
            closeDetail();
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : "Could not delete. Try again.", "error");
          }
        },
      },
    ]);

  const listing = q.data?.listing ?? null;
  if (!listing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: tc.pageBg, padding: 24 }}>
        {q.isError ? (
          <>
            <Text style={{ color: tc.textPrimary, fontSize: 17, fontWeight: "600" }}>This listing may have been removed.</Text>
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
    <PropertyDetail
      // Remount once the stored journey step has loaded, so the detail starts from it.
      key={journey.loaded ? "journey" : "loading"}
      listing={listing}
      initialJourneyStep={journey.step}
      onJourneyStepChange={(lid, step) => void journey.save(lid, step)}
      onClose={closeDetail}
      onDelete={listing.isOwner ? confirmDelete : undefined}
      onEdit={
        listing.isOwner
          ? () => router.push({ pathname: "/create-post", params: { type: "listing", mode: "edit", id } } as never)
          : undefined
      }
      isBookmarked={saved}
      onToggleBookmark={() => void toggleSave()}
    />
  );
}
