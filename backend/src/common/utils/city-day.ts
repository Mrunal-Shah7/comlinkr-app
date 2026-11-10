// src/common/utils/city-day.ts
//
// Plan 11 (TR-037): an event's day is a calendar date and its time a wall-clock text ("6:00 PM"), both in the event
// city's time zone. These helpers read them there, never in the server's or a phone's zone. An unknown city falls
// back to UTC.

import { cityTimezone } from './city-timezone';

function zoneOf(city: string | null | undefined): string {
  return (city && cityTimezone(city)) || 'UTC';
}

/** Today's calendar date (`YYYY-MM-DD`) in the city's zone at `now`. */
export function cityToday(
  city: string | null | undefined,
  now: Date = new Date(),
): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zoneOf(city),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** The calendar date part of a stored event date (UTC midnight, or an older full instant). */
export function datePart(date: Date | string): string {
  return (typeof date === 'string' ? date : date.toISOString()).slice(0, 10);
}

/** A calendar date as the UTC-midnight `Date` the events table stores and compares. */
export function dayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** "6:00 PM", "18:00", "6 pm" → minutes after midnight; null when the text is not a clock time. */
export function parseClock(text: string | null | undefined): number | null {
  const m = (text ?? '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  const meridiem = m[3]?.toUpperCase();
  if (meridiem && (hour < 1 || hour > 12)) return null;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** The instant at which the wall clock in the city reads `minutes` after midnight on `day`. */
export function cityInstant(
  day: string,
  minutes: number,
  city: string | null | undefined,
): Date {
  const tz = zoneOf(city);
  const guess = Date.parse(`${day}T00:00:00.000Z`) + minutes * 60_000;
  // The zone's offset at that moment: format the guess in the zone and read the difference back. Two passes settle
  // a guess that lands across a daylight-saving change.
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(t));
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second'),
    );
    return asUtc - t;
  };
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t);
  return new Date(t);
}
