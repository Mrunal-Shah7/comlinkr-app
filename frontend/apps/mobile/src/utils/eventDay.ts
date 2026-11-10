// src/utils/eventDay.ts
//
// Plan 11 (TR-037): an event's `date` is a calendar day stored at UTC midnight, and its times are wall-clock texts in
// the event city's zone. Read the date part; never pass the stored instant through the phone's zone, which shows the
// previous day west of UTC (rule B10).

import { cityTimezone } from "./cityTimezone";

/** `YYYY-MM-DD` from a stored event date (an ISO instant or a plain date). */
export function eventDayIso(date: string | Date): string {
  return (typeof date === "string" ? date : date.toISOString()).slice(0, 10);
}

/** A local `Date` at noon on the event's calendar day, safe to format with `toLocaleDateString`. */
export function eventDayDate(date: string | Date): Date | null {
  const m = eventDayIso(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

/** Today's calendar day in the city's zone (the phone's zone when the city is unknown). */
export function cityTodayIso(city?: string | null, now: Date = new Date()): string {
  const tz = city ? cityTimezone(city) : undefined;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  }
}
