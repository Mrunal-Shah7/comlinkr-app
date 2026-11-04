// SPRINT-42: full event reviews section — newest-first pagination, eligibility, create/edit/delete + aggregate refetch.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../src/theme/colors";
import { useTheme } from "../../src/theme/useTheme";
import { ApiError } from "../../src/api/client";
import {
  getEvent,
  getEventReviews,
  submitEventReview,
  updateEventReview,
  deleteEventReview,
  type ApiEvent,
  type EventReview,
} from "../../src/api/events.api";
import { RatingSummary } from "./RatingSummary";
import { ReviewRow } from "./ReviewRow";
import { ReviewComposer } from "./ReviewComposer";
import { getEventReviewWriteEligibility } from "./ratingUtils";
import { appAlert } from '../../src/shared/ui/Dialogs';
import { showToast } from '../../src/shared/ui/Toast';

const PAGE_SIZE = 10; // SPRINT-42:

export function EventReviewsSection({
  eventId,
  detailEvent,
  onDetailRefreshed,
}: {
  eventId: string;
  /** Authoritative detail from GET /events/:id (hasReviewed / myReviewId / aggregates / ownership). */
  detailEvent: ApiEvent | null;
  onDetailRefreshed?: (event: ApiEvent) => void;
}) {
  // SPRINT-42:
  const { tc } = useTheme();
  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [localDetail, setLocalDetail] = useState<ApiEvent | null>(detailEvent);
  const loadGenRef = useRef(0); // SPRINT-42: cancel stale sequential loads

  useEffect(() => {
    setLocalDetail(detailEvent);
  }, [detailEvent]);

  const refreshDetail = useCallback(async () => {
    // SPRINT-42: refetch aggregates + caller review state after every mutation
    const fresh = await getEvent(eventId);
    setLocalDetail(fresh);
    onDetailRefreshed?.(fresh);
    return fresh;
  }, [eventId, onDetailRefreshed]);

  /**
   * One controlled sequential list pagination: load pages until myReviewId is found (when hasReviewed),
   * or just the first page when the caller has no review yet. Avoids per-row N+1.
   */ // SPRINT-42:
  const loadReviewsFindingOwn = useCallback(
    async (findReviewId: string | null | undefined, options?: { openEdit?: boolean }) => {
      // SPRINT-42:
      const gen = ++loadGenRef.current; // SPRINT-42:
      setLoading(true); // SPRINT-42:
      setLoadingMore(false); // SPRINT-42:
      if (!options?.openEdit) setEditing(false); // SPRINT-42:
      try {
        let nextPage = 1; // SPRINT-42:
        let accumulated: EventReview[] = []; // SPRINT-42:
        let more = false; // SPRINT-42:
        do {
          // SPRINT-42: sequential pages until own review found or exhausted
          if (gen !== loadGenRef.current) return; // SPRINT-42:
          if (nextPage > 1) setLoadingMore(true); // SPRINT-42:
          const res = await getEventReviews(eventId, { page: nextPage, pageSize: PAGE_SIZE }); // SPRINT-42:
          if (gen !== loadGenRef.current) return; // SPRINT-42:
          accumulated = nextPage === 1 ? res.data : [...accumulated, ...res.data]; // SPRINT-42:
          setReviews(accumulated); // SPRINT-42:
          setPage(res.page); // SPRINT-42:
          more = res.hasMore; // SPRINT-42:
          setHasMore(more); // SPRINT-42:
          const found = findReviewId ? accumulated.some((r) => r.id === findReviewId) : true; // SPRINT-42:
          if (found || !more) {
            // SPRINT-42:
            if (options?.openEdit && findReviewId && found) setEditing(true); // SPRINT-42: 409 → functional edit
            break; // SPRINT-42:
          }
          nextPage = res.page + 1; // SPRINT-42:
        } while (true); // SPRINT-42:
      } catch {
        if (gen === loadGenRef.current) setReviews([]); // SPRINT-42:
      } finally {
        if (gen === loadGenRef.current) {
          // SPRINT-42:
          setLoading(false); // SPRINT-42:
          setLoadingMore(false); // SPRINT-42:
        }
      }
    },
    [eventId],
  );

  const loadMore = useCallback(async () => {
    // SPRINT-42: manual append — one next page only
    if (!hasMore || loading || loadingMore) return; // SPRINT-42:
    setLoadingMore(true); // SPRINT-42:
    try {
      const res = await getEventReviews(eventId, { page: page + 1, pageSize: PAGE_SIZE }); // SPRINT-42:
      setReviews((prev) => [...prev, ...res.data]); // SPRINT-42:
      setPage(res.page); // SPRINT-42:
      setHasMore(res.hasMore); // SPRINT-42:
    } catch {
      /* keep existing pages */ // SPRINT-42:
    } finally {
      setLoadingMore(false); // SPRINT-42:
    }
  }, [eventId, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    // SPRINT-42: when detail says hasReviewed, keep paging until myReviewId is in the list
    const findId =
      detailEvent?.hasReviewed === true && detailEvent.myReviewId
        ? String(detailEvent.myReviewId)
        : null; // SPRINT-42:
    void loadReviewsFindingOwn(findId); // SPRINT-42:
  }, [eventId, detailEvent?.hasReviewed, detailEvent?.myReviewId, loadReviewsFindingOwn]);

  const event = localDetail;
  const eligibility = event
    ? getEventReviewWriteEligibility(event)
    : ({ kind: "not_registered" } as const);
  const myReviewId = event?.myReviewId ?? null;
  const myReview = myReviewId ? reviews.find((r) => r.id === myReviewId) : undefined;
  const otherReviews = reviews.filter((r) => r.id !== myReviewId);
  const isOrganiser = !!event?.isOwner;
  const seekingOwnReview = // SPRINT-42:
    eligibility.kind === "already" && !!myReviewId && !myReview && (loading || loadingMore || hasMore); // SPRINT-42:

  const afterMutation = async (opts?: { openEdit?: boolean }) => {
    // SPRINT-42:
    const fresh = await refreshDetail(); // SPRINT-42:
    const findId =
      fresh.hasReviewed === true && fresh.myReviewId ? String(fresh.myReviewId) : null; // SPRINT-42:
    await loadReviewsFindingOwn(findId, { openEdit: opts?.openEdit === true }); // SPRINT-42:
  };

  const handleCreate = async (payload: { rating: number; content: string }) => {
    // SPRINT-42:
    setSubmitting(true);
    try {
      await submitEventReview(eventId, payload);
      await afterMutation();
      showToast("Thanks for sharing your experience.", "success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // SPRINT-42: duplicate — refetch detail, page until own review, open edit
        await afterMutation({ openEdit: true }); // SPRINT-42:
        appAlert("Already reviewed", "You already reviewed this event. You can edit your review.");
      } else {
        appAlert(
          "Could not submit review",
          err instanceof ApiError ? err.message : "Try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (payload: { rating: number; content: string }) => {
    // SPRINT-42: edit only the caller's review
    if (!myReviewId) return;
    setSubmitting(true);
    try {
      await updateEventReview(eventId, myReviewId, payload);
      await afterMutation();
      showToast("Your changes were saved.", "success");
    } catch (err) {
      appAlert(
        "Could not update review",
        err instanceof ApiError ? err.message : "Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (reviewId: string, isOwn: boolean) => {
    // SPRINT-42: author or organiser may delete; confirm first
    appAlert(
      "Delete review",
      isOwn ? "Remove your review? This cannot be undone." : "Delete this review as organiser?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteEventReview(eventId, reviewId);
                await afterMutation();
                showToast(isOwn ? "You can submit a new review anytime." : "The review was removed.", "success");
              } catch (err) {
                appAlert(
                  "Could not delete",
                  err instanceof ApiError ? err.message : "Try again.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const avg = Number(event?.averageRating ?? 0) || 0;
  const total = Number(event?.totalReviews ?? 0) || 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: tc.textPrimary }]}>Reviews</Text>
        <RatingSummary
          averageRating={avg}
          totalReviews={total}
          textColor={tc.textPrimary}
          mutedColor={tc.textTertiary}
          showUnratedLabel
        />
      </View>

      {/* Write / edit area */}
      {eligibility.kind === "hidden" ? null : eligibility.kind === "pre_event" ? (
        <View style={[styles.notice, { backgroundColor: tc.sectionBg, borderColor: tc.borderLight }]}>
          <Ionicons name="time-outline" size={16} color={Colors.brand.orange} />
          <Text style={[styles.noticeText, { color: tc.textSecondary }]}>
            Reviews open after the event.
          </Text>
        </View>
      ) : eligibility.kind === "eligible" ? (
        <ReviewComposer mode="create" submitting={submitting} onSubmit={handleCreate} />
      ) : eligibility.kind === "already" ? (
        seekingOwnReview ? (
          <ActivityIndicator color={Colors.brand.blue} style={{ marginVertical: 8 }} />
        ) : editing && myReview ? (
          <ReviewComposer
            mode="edit"
            initialRating={myReview.rating}
            initialContent={myReview.content}
            submitting={submitting}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        ) : myReview ? (
          <View style={{ marginBottom: 8 }}>
            <View style={styles.ownActions}>
              <Pressable
                onPress={() => setEditing(true)}
                hitSlop={8}
                style={styles.ownActionBtn}
              >
                <Ionicons name="pencil" size={16} color={Colors.brand.blue} />
                <Text style={{ color: Colors.brand.blue, fontWeight: "700", fontSize: 12 }}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(myReview.id, true)}
                hitSlop={8}
                style={styles.ownActionBtn}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 12 }}>Delete</Text>
              </Pressable>
            </View>
            <ReviewRow review={myReview} />
          </View>
        ) : (
          <Text style={{ color: tc.textTertiary, marginBottom: 10, fontSize: 13 }}>
            You have already reviewed this event.
          </Text>
        )
      ) : null}

      {loading && reviews.length === 0 ? (
        <ActivityIndicator color={Colors.brand.blue} style={{ marginVertical: 12 }} />
      ) : otherReviews.length === 0 && !myReview ? (
        <Text style={[styles.empty, { color: tc.textTertiary }]}>
          No reviews yet. Be the first to share your experience.
        </Text>
      ) : (
        otherReviews.map((r) => (
          <ReviewRow
            key={r.id}
            review={r}
            canDelete={isOrganiser}
            onDelete={isOrganiser ? () => confirmDelete(r.id, false) : undefined}
          />
        ))
      )}

      {hasMore ? (
        <Pressable
          onPress={() => void loadMore()}
          disabled={loadingMore}
          style={[styles.loadMore, { borderColor: tc.borderLight }]}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color={Colors.brand.blue} />
          ) : (
            <Text style={{ color: Colors.brand.blue, fontWeight: "800", fontSize: 13 }}>Load more</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 8 }, // SPRINT-42:
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  }, // SPRINT-42:
  title: { fontSize: 16, fontWeight: "800" }, // SPRINT-42:
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  }, // SPRINT-42:
  noticeText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 }, // SPRINT-42:
  empty: { fontSize: 13, marginBottom: 8 }, // SPRINT-42:
  ownActions: { flexDirection: "row", gap: 14, marginBottom: 6, justifyContent: "flex-end" }, // SPRINT-42:
  ownActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 }, // SPRINT-42:
  loadMore: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  }, // SPRINT-42:
});
