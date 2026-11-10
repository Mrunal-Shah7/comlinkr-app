/**
 * Plan 17 (TR-052): marking a quest done. Self-reported by members while the quest runs; a second call changes
 * nothing; the counts show in the list and the detail; leaving drops the completion; the host can mark it done.
 */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { appBaseUrl, createTestApp } from '../helpers/app';
import {
  disconnectFixtures,
  getTestPrisma,
  resetDatabase,
  seedUser,
} from '../helpers/fixtures';

describe('plan 17: marking a quest done', () => {
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

  async function quest(authorId: string, opts: { ended?: boolean } = {}) {
    const now = Date.now();
    const c = await getTestPrisma().challenge.create({
      data: {
        authorId,
        title: 'Plan 17 quest',
        type: 'FITNESS',
        duration: 'ONE_WEEK',
        goalCondition: 'Run 5 km',
        reward: 'Bragging rights',
        participantCount: 1,
        startsAt: new Date(now - 86_400_000),
        endsAt: new Date(opts.ended ? now - 60_000 : now + 6 * 86_400_000),
        participants: { create: { userId: authorId } },
      },
    });
    return c.id;
  }
  const body = (r: request.Response) => r.body.data ?? r.body;
  const detail = async (id: string, cookie: string) =>
    body(
      await request(base)
        .get(`/challenges/${id}`)
        .set('Cookie', cookie)
        .expect(200),
    );
  const fromList = async (id: string, cookie: string) => {
    const res = await request(base)
      .get('/challenges')
      .set('Cookie', cookie)
      .expect(200);
    const list = (res.body.data ?? []) as { id: string }[];
    return list.find((q) => q.id === id) as Record<string, unknown>;
  };

  it('a member marks done and undoes it; a second call changes nothing; the counts follow', async () => {
    const host = await seedUser({ label: 'ph' });
    const member = await seedUser({ label: 'pm' });
    const id = await quest(host.id);
    await request(base)
      .post(`/challenges/${id}/join`)
      .set('Cookie', member.cookie)
      .expect(201);

    let d = await detail(id, member.cookie);
    expect(d.completedCount).toBe(0);
    expect(d.isCompleted).toBe(false);

    const done = await request(base)
      .post(`/challenges/${id}/complete`)
      .set('Cookie', member.cookie)
      .expect(201);
    expect(body(done)).toEqual({ completed: true, completedCount: 1 });
    const first = await getTestPrisma().challengeParticipant.findUniqueOrThrow({
      where: { challengeId_userId: { challengeId: id, userId: member.id } },
    });
    expect(first.completedAt).not.toBeNull();

    // Again: still one, and the first time is kept.
    const again = await request(base)
      .post(`/challenges/${id}/complete`)
      .set('Cookie', member.cookie)
      .expect(201);
    expect(body(again).completedCount).toBe(1);
    const second = await getTestPrisma().challengeParticipant.findUniqueOrThrow(
      {
        where: { challengeId_userId: { challengeId: id, userId: member.id } },
      },
    );
    expect(second.completedAt?.getTime()).toBe(first.completedAt?.getTime());

    d = await detail(id, member.cookie);
    expect(d.completedCount).toBe(1);
    expect(d.isCompleted).toBe(true);
    const mine = d.participants.find((p: { id: string }) => p.id === member.id);
    const hosts = d.participants.find((p: { id: string }) => p.id === host.id);
    expect(mine.completedAt).toBeTruthy();
    expect(hosts.completedAt).toBeNull();

    // The host sees the count, and is not done themself.
    const asHost = await fromList(id, host.cookie);
    expect(asHost.completedCount).toBe(1);
    expect(asHost.isCompleted).toBe(false);
    const asMember = await fromList(id, member.cookie);
    expect(asMember.isCompleted).toBe(true);

    const undone = await request(base)
      .delete(`/challenges/${id}/complete`)
      .set('Cookie', member.cookie)
      .expect(200);
    expect(body(undone)).toEqual({ completed: false, completedCount: 0 });
    await request(base)
      .delete(`/challenges/${id}/complete`)
      .set('Cookie', member.cookie)
      .expect(200);
    d = await detail(id, member.cookie);
    expect(d.completedCount).toBe(0);
    expect(d.isCompleted).toBe(false);
  });

  it('the host can mark done; leaving drops a completion', async () => {
    const host = await seedUser({ label: 'lh' });
    const member = await seedUser({ label: 'lm' });
    const id = await quest(host.id);
    await request(base)
      .post(`/challenges/${id}/complete`)
      .set('Cookie', host.cookie)
      .expect(201);
    await request(base)
      .post(`/challenges/${id}/join`)
      .set('Cookie', member.cookie)
      .expect(201);
    await request(base)
      .post(`/challenges/${id}/complete`)
      .set('Cookie', member.cookie)
      .expect(201);
    expect((await detail(id, host.cookie)).completedCount).toBe(2);

    await request(base)
      .delete(`/challenges/${id}/join`)
      .set('Cookie', member.cookie)
      .expect(200);
    const d = await detail(id, host.cookie);
    expect(d.completedCount).toBe(1);
    expect(d.isCompleted).toBe(true);

    // Joining again starts not done.
    await request(base)
      .post(`/challenges/${id}/join`)
      .set('Cookie', member.cookie)
      .expect(201);
    expect((await detail(id, member.cookie)).isCompleted).toBe(false);
  });

  it('refuses a non-member, an ended quest and an unknown one', async () => {
    const host = await seedUser({ label: 'rh' });
    const stranger = await seedUser({ label: 'rs' });
    const id = await quest(host.id);
    await request(base)
      .post(`/challenges/${id}/complete`)
      .set('Cookie', stranger.cookie)
      .expect(403);
    await request(base)
      .delete(`/challenges/${id}/complete`)
      .set('Cookie', stranger.cookie)
      .expect(403);

    const ended = await quest(host.id, { ended: true });
    await request(base)
      .post(`/challenges/${ended}/complete`)
      .set('Cookie', host.cookie)
      .expect(400);
    expect((await detail(ended, host.cookie)).completedCount).toBe(0);

    await request(base)
      .post('/challenges/00000000-0000-4000-8000-000000000000/complete')
      .set('Cookie', host.cookie)
      .expect(404);
    await request(base).post(`/challenges/${id}/complete`).expect(401);
  });
});
