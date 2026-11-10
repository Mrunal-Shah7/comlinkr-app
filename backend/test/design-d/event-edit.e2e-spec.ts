/**
 * Plan 11 (TR-037): the host edits and cancels an event; the people registered are told; event days are read in
 * the city's time zone.
 */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { appBaseUrl, createTestApp } from '../helpers/app';
import { cityToday } from '../../src/common/utils/city-day';
import {
  disconnectFixtures,
  getTestPrisma,
  resetDatabase,
  seedUser,
} from '../helpers/fixtures';

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);

describe('plan 11: editing and cancelling an event', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await createTestApp();
    base = appBaseUrl(app);
  });
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    await app.close();
    await disconnectFixtures();
  });

  async function event(
    hostId: string,
    opts: { day?: string; city?: string; attendees?: string[] } = {},
  ) {
    const prisma = getTestPrisma();
    const city = opts.city ?? 'Los Angeles';
    const day = opts.day ?? addDays(cityToday(city), 5);
    const e = await prisma.event.create({
      data: {
        authorId: hostId,
        title: 'Plan 11 meetup',
        description: 'A meetup',
        category: 'SOCIAL',
        format: 'IN_PERSON',
        date: new Date(`${day}T00:00:00Z`),
        startTime: '6:00 PM',
        endTime: '8:00 PM',
        venue: 'Echo Park',
        city,
        attendeeCount: opts.attendees?.length ?? 0,
        attendees: opts.attendees?.length
          ? { create: opts.attendees.map((userId) => ({ userId })) }
          : undefined,
      },
    });
    return e.id;
  }
  const notes = (userId: string) =>
    getTestPrisma().notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

  it('the host edits; changes of date, time and place notify the people registered; city is ignored', async () => {
    const host = await seedUser({ label: 'eh' });
    const guest = await seedUser({ label: 'eg' });
    const id = await event(host.id, { attendees: [guest.id] });
    const newDay = addDays(cityToday('Los Angeles'), 9);

    const res = await request(base)
      .patch(`/events/${id}`)
      .set('Cookie', host.cookie)
      .send({
        title: 'Plan 11 meetup (moved)',
        date: newDay,
        startTime: '7:00 PM',
        venue: 'Silver Lake',
        city: 'London',
      })
      .expect(200);
    const body = res.body.data ?? res.body;
    expect(body.title).toBe('Plan 11 meetup (moved)');

    const row = await getTestPrisma().event.findUniqueOrThrow({
      where: { id },
    });
    expect(row.city).toBe('Los Angeles');
    expect(row.date.toISOString()).toBe(`${newDay}T00:00:00.000Z`);
    expect(row.venue).toBe('Silver Lake');

    const n = await notes(guest.id);
    expect(n).toHaveLength(1);
    expect(n[0].title).toBe('"Plan 11 meetup (moved)" has changed');
    expect(n[0].body).toContain('date, time and place');
    expect(n[0].referenceId).toBe(id);
    expect(await notes(host.id)).toHaveLength(0);

    // A title-only edit tells nobody.
    await request(base)
      .patch(`/events/${id}`)
      .set('Cookie', host.cookie)
      .send({ title: 'Again' })
      .expect(200);
    expect(await notes(guest.id)).toHaveLength(1);
  });

  it('refuses another user, a paid event without a price, a capacity below the registered, a past date', async () => {
    const host = await seedUser({ label: 'rh' });
    const other = await seedUser({ label: 'ro' });
    const a = await seedUser({ label: 'r1' });
    const b = await seedUser({ label: 'r2' });
    const id = await event(host.id, { attendees: [a.id, b.id] });

    await request(base)
      .patch(`/events/${id}`)
      .set('Cookie', other.cookie)
      .send({ title: 'Mine' })
      .expect(403);
    await request(base)
      .patch(`/events/${id}`)
      .set('Cookie', host.cookie)
      .send({ ticketType: 'PAID' })
      .expect(400);
    await request(base)
      .patch(`/events/${id}`)
      .set('Cookie', host.cookie)
      .send({ capacity: 1 })
      .expect(400);
    await request(base)
      .patch(`/events/${id}`)
      .set('Cookie', host.cookie)
      .send({ capacity: 2 })
      .expect(200);
    await request(base)
      .patch(`/events/${id}`)
      .set('Cookie', host.cookie)
      .send({ date: addDays(cityToday('Los Angeles'), -2) })
      .expect(400);
  });

  it('cancelling keeps the event, marked Cancelled, and tells the people registered once (plan 15)', async () => {
    const host = await seedUser({ label: 'ch' });
    const guest = await seedUser({ label: 'cg' });
    const id = await event(host.id, { attendees: [guest.id] });

    await request(base)
      .delete(`/events/${id}`)
      .set('Cookie', guest.cookie)
      .expect(403);
    await request(base)
      .delete(`/events/${id}`)
      .set('Cookie', host.cookie)
      .expect(200);
    const row = await getTestPrisma().event.findUnique({ where: { id } });
    expect(row?.cancelledAt).toBeInstanceOf(Date);
    expect(
      await getTestPrisma().eventAttendee.count({
        where: { eventId: id, status: 'ACTIVE' },
      }),
    ).toBe(1);
    // A second cancel changes nothing and sends nothing.
    await request(base)
      .delete(`/events/${id}`)
      .set('Cookie', host.cookie)
      .expect(200);
    const n = await notes(guest.id);
    expect(n.map((x) => x.title)).toEqual(['"Plan 11 meetup" was cancelled']);
    expect(n[0]).toMatchObject({ referenceType: 'EVENT', referenceId: id });

    // The page still opens, marked Cancelled.
    const page = await request(base)
      .get(`/events/${id}`)
      .set('Cookie', guest.cookie)
      .expect(200);
    expect(page.body.data ?? page.body).toMatchObject({
      cancelled: true,
      registeredByMe: true,
    });
  });

  it('a cancelled event leaves the feed, stays in the lists, and refuses new activity (plan 15)', async () => {
    const host = await seedUser({ label: 'xh' });
    const guest = await seedUser({ label: 'xg' });
    const other = await seedUser({ label: 'xo' });
    const id = await event(host.id, { attendees: [guest.id] });
    await request(base)
      .post(`/events/${id}/save`)
      .set('Cookie', guest.cookie)
      .expect(201);
    await request(base)
      .delete(`/events/${id}`)
      .set('Cookie', host.cookie)
      .expect(200);
    const ids = (res: request.Response) => {
      const d = res.body.data ?? res.body;
      return ((d.items ?? d.data ?? d) as { id: string }[]).map((e) => e.id);
    };

    const feed = await request(base)
      .get('/events?city=Los%20Angeles')
      .set('Cookie', other.cookie)
      .expect(200);
    expect(ids(feed)).not.toContain(id);
    const stories = await request(base)
      .get('/events/stories?city=Los%20Angeles')
      .set('Cookie', other.cookie)
      .expect(200);
    expect(JSON.stringify(stories.body)).not.toContain(id);
    for (const [path, who] of [
      ['/events/registered', guest],
      ['/events/saved', guest],
      ['/events/me', host],
    ] as const) {
      const res = await request(base)
        .get(path)
        .set('Cookie', who.cookie)
        .expect(200);
      expect(JSON.stringify(res.body)).toContain(id);
      expect(JSON.stringify(res.body)).toContain('"cancelled":true');
    }

    const cancelled = (res: request.Response) =>
      expect(JSON.stringify(res.body)).toContain('EVENT_CANCELLED');
    cancelled(
      await request(base)
        .post(`/events/${id}/register`)
        .set('Cookie', other.cookie)
        .send({})
        .expect(409),
    );
    cancelled(
      await request(base)
        .patch(`/events/${id}`)
        .set('Cookie', host.cookie)
        .send({ title: 'Back on' })
        .expect(409),
    );
    cancelled(
      await request(base)
        .post(`/events/${id}/save`)
        .set('Cookie', other.cookie)
        .expect(409),
    );
    cancelled(
      await request(base)
        .get(`/events/${id}/ticket`)
        .set('Cookie', guest.cookie)
        .expect(409),
    );
    // Unsaving still works.
    const unsave = await request(base)
      .post(`/events/${id}/save`)
      .set('Cookie', guest.cookie)
      .expect(201);
    expect((unsave.body.data ?? unsave.body).saved).toBe(false);

    // The door refuses the ticket.
    const reg = await getTestPrisma().eventAttendee.findFirstOrThrow({
      where: { eventId: id, userId: guest.id },
    });
    const scan = await request(base)
      .post(`/events/${id}/check-in`)
      .set('Cookie', host.cookie)
      .send({ ticketId: reg.id })
      .expect(200);
    expect(scan.body.data ?? scan.body).toMatchObject({
      admitted: false,
      reasonCode: 'EVENT_CANCELLED',
    });
  });

  it("lists an event dated today in the city all day, and filters by the city's calendar day", async () => {
    const host = await seedUser({ label: 'uh' });
    const today = cityToday('Los Angeles');
    const todayId = await event(host.id, { day: today });
    const yesterdayId = await event(host.id, { day: addDays(today, -1) });
    const laterId = await event(host.id, { day: addDays(today, 3) });

    const list = await request(base)
      .get('/events?city=Los%20Angeles&limit=50')
      .set('Cookie', host.cookie)
      .expect(200);
    const ids = (list.body.data?.data ?? list.body.data ?? list.body).map(
      (e: { id: string }) => e.id,
    );
    expect(ids).toEqual(expect.arrayContaining([todayId, laterId]));
    expect(ids).not.toContain(yesterdayId);

    const day = await request(base)
      .get(`/events?city=Los%20Angeles&date=${addDays(today, 3)}&limit=50`)
      .set('Cookie', host.cookie)
      .expect(200);
    const dayIds = (day.body.data?.data ?? day.body.data ?? day.body).map(
      (e: { id: string }) => e.id,
    );
    expect(dayIds).toEqual([laterId]);
  });
});
