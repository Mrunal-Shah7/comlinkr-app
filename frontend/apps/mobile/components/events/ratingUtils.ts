// SPRINT-42: shared event-review helpers (eligibility + display) independent of restaurant food UI.
import type { ApiEvent } from "../../src/api/events.api";
import { eventDayDate } from "../../src/utils/eventDay";

/** True when averageRating/totalReviews represent an unrated event — never show “0 stars”. */
export function hasEventRatings(averageRating: number | undefined | null, totalReviews: number | undefined | null): boolean {
  // SPRINT-42:
  const count = Number(totalReviews ?? 0) || 0;
  const avg = Number(averageRating ?? 0) || 0;
  return count > 0 && avg > 0;
}

/**
 * Mirror backend `eventHasEnded`: endTime → startTime → date fallback.
 * Uses local clock semantics to match EventsService.
 */
export function eventHasEnded(event: {
  date: string | Date;
  startTime?: string | null;
  endTime?: string | null;
}): boolean {
  // SPRINT-42:
  // Plan 11: the wall clock on the event's calendar day. The phone is in the event's city (plan 08), so its zone
  // stands in for the city's; the server makes the real check.
  const endedAt = eventDayDate(event.date);
  if (!endedAt) return false;
  endedAt.setHours(23, 59, 0, 0);
  const value = String(event.endTime ?? event.startTime ?? "").trim();
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (match) {
    let hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "AM" && hour === 12) hour = 0;
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (hour <= 23 && minute <= 59) endedAt.setHours(hour, minute, 0, 0);
  }
  return endedAt.getTime() < Date.now();
}

export type EventReviewWriteEligibility =
  | { kind: "hidden" } // SPRINT-42: organiser never writes
  | { kind: "pre_event" } // SPRINT-42: registered but event not ended
  | { kind: "eligible" } // SPRINT-42: may create
  | { kind: "already" } // SPRINT-42: hasReviewed / myReviewId from detail
  | { kind: "not_registered" }; // SPRINT-42: cannot write

/**
 * Write eligibility uses backend isOwner + active registration flags + ended check.
 * Caller review state comes only from detail hasReviewed / myReviewId — never list scanning.
 */
export function getEventReviewWriteEligibility(event: Pick<
  ApiEvent,
  "isOwner" | "registeredByMe" | "isAttending" | "hasReviewed" | "myReviewId" | "date" | "startTime" | "endTime"
>): EventReviewWriteEligibility {
  // SPRINT-42:
  if (event.isOwner) return { kind: "hidden" };
  const activeRegistration = !!(event.registeredByMe || event.isAttending);
  if (!activeRegistration) return { kind: "not_registered" };
  if (!eventHasEnded(event)) return { kind: "pre_event" };
  if (event.hasReviewed === true || (event.myReviewId != null && String(event.myReviewId).length > 0)) {
    return { kind: "already" };
  }
  return { kind: "eligible" };
}
