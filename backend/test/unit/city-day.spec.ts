/**
 * Plan 11 (TR-037): an event's day and time are read in its city's zone.
 */
import {
  cityInstant,
  cityToday,
  datePart,
  parseClock,
} from '../../src/common/utils/city-day';

describe('city-day', () => {
  it("gives the city's calendar day, not the UTC one", () => {
    // 05:00 UTC on 11 Nov is still 10 Nov in Los Angeles (UTC-8) and already 11 Nov in London.
    const now = new Date('2026-11-11T05:00:00Z');
    expect(cityToday('Los Angeles', now)).toBe('2026-11-10');
    expect(cityToday('London', now)).toBe('2026-11-11');
    expect(cityToday('Testville', now)).toBe('2026-11-11'); // unknown city: UTC
    expect(cityToday(null, now)).toBe('2026-11-11');
  });

  it('reads the date part of both stored shapes', () => {
    expect(datePart(new Date('2026-11-10T00:00:00Z'))).toBe('2026-11-10');
    expect(datePart('2026-08-23T17:24:00.000Z')).toBe('2026-08-23');
    expect(datePart('2026-03-15')).toBe('2026-03-15');
  });

  it('parses the clock texts the composer and older rows use', () => {
    expect(parseClock('6:00 PM')).toBe(18 * 60);
    expect(parseClock('12:30 am')).toBe(30);
    expect(parseClock('12 PM')).toBe(12 * 60);
    expect(parseClock('18:45')).toBe(18 * 60 + 45);
    expect(parseClock('13:00 PM')).toBeNull();
    expect(parseClock('soon')).toBeNull();
    expect(parseClock(null)).toBeNull();
  });

  it("turns a wall-clock time into the instant in the city's zone, across daylight saving", () => {
    // 6 PM in Los Angeles on 10 Nov (PST, UTC-8) is 02:00 UTC on 11 Nov.
    expect(
      cityInstant('2026-11-10', 18 * 60, 'Los Angeles').toISOString(),
    ).toBe('2026-11-11T02:00:00.000Z');
    // In July (PDT, UTC-7) it is 01:00 UTC.
    expect(
      cityInstant('2026-07-10', 18 * 60, 'Los Angeles').toISOString(),
    ).toBe('2026-07-11T01:00:00.000Z');
    expect(cityInstant('2026-07-10', 18 * 60, 'London').toISOString()).toBe(
      '2026-07-10T17:00:00.000Z',
    );
    expect(cityInstant('2026-07-10', 18 * 60, 'Testville').toISOString()).toBe(
      '2026-07-10T18:00:00.000Z',
    );
  });
});
