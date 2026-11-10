/**
 * Plan 10 (TR-038): leaving a quest. The count moves only when a membership is removed; the author and an ended
 * quest are refused; leaving frees a place on a full quest.
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

describe('plan 10: leaving a quest', () => {
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

  async function quest(
    authorId: string,
    opts: { max?: number; ended?: boolean } = {},
  ) {
    const now = Date.now();
    const c = await getTestPrisma().challenge.create({
      data: {
        authorId,
        title: 'Plan 10 quest',
        type: 'EXPLORE',
        duration: 'ONE_WEEK',
        goalCondition: 'Visit three parks',
        reward: 'Bragging rights',
        maxParticipants: opts.max ?? null,
        participantCount: 1,
        startsAt: new Date(now - 86_400_000),
        endsAt: new Date(opts.ended ? now - 60_000 : now + 6 * 86_400_000),
        participants: { create: { userId: authorId } },
      },
    });
    return c.id;
  }
  const count = async (id: string) =>
    (await getTestPrisma().challenge.findUniqueOrThrow({ where: { id } }))
      .participantCount;
  const body = (r: request.Response) => r.body.data ?? r.body;

  it('a member leaves; leaving again or as a non-member changes nothing', async () => {
    const author = await seedUser({ label: 'qa' });
    const member = await seedUser({ label: 'qm' });
    const stranger = await seedUser({ label: 'qs' });
    const id = await quest(author.id);

    await request(base)
      .post(`/challenges/${id}/join`)
      .set('Cookie', member.cookie)
      .expect(201);
    expect(await count(id)).toBe(2);

    const left = await request(base)
      .delete(`/challenges/${id}/join`)
      .set('Cookie', member.cookie)
      .expect(200);
    expect(body(left)).toEqual({ joined: false, participantCount: 1 });

    await request(base)
      .delete(`/challenges/${id}/join`)
      .set('Cookie', member.cookie)
      .expect(200);
    await request(base)
      .delete(`/challenges/${id}/join`)
      .set('Cookie', stranger.cookie)
      .expect(200);
    expect(await count(id)).toBe(1);

    const detail = await request(base)
      .get(`/challenges/${id}`)
      .set('Cookie', member.cookie)
      .expect(200);
    expect(body(detail).isJoined).toBeFalsy();
    expect(body(detail).participants.map((p: { id: string }) => p.id)).toEqual([
      author.id,
    ]);

    // Joining again works.
    await request(base)
      .post(`/challenges/${id}/join`)
      .set('Cookie', member.cookie)
      .expect(201);
    expect(await count(id)).toBe(2);
  });

  it('refuses the author and an ended quest, and 404s an unknown one', async () => {
    const author = await seedUser({ label: 'ra' });
    const member = await seedUser({ label: 'rm' });
    const id = await quest(author.id);
    await request(base)
      .delete(`/challenges/${id}/join`)
      .set('Cookie', author.cookie)
      .expect(400);
    expect(await count(id)).toBe(1);

    const ended = await quest(author.id, { ended: true });
    await getTestPrisma().challengeParticipant.create({
      data: { challengeId: ended, userId: member.id },
    });
    await getTestPrisma().challenge.update({
      where: { id: ended },
      data: { participantCount: 2 },
    });
    await request(base)
      .delete(`/challenges/${ended}/join`)
      .set('Cookie', member.cookie)
      .expect(400);
    expect(await count(ended)).toBe(2);

    await request(base)
      .delete('/challenges/00000000-0000-4000-8000-000000000000/join')
      .set('Cookie', member.cookie)
      .expect(404);
  });

  it('leaving a full quest frees the place', async () => {
    const author = await seedUser({ label: 'fa' });
    const one = await seedUser({ label: 'f1' });
    const two = await seedUser({ label: 'f2' });
    const id = await quest(author.id, { max: 2 });

    await request(base)
      .post(`/challenges/${id}/join`)
      .set('Cookie', one.cookie)
      .expect(201);
    await request(base)
      .post(`/challenges/${id}/join`)
      .set('Cookie', two.cookie)
      .expect(400);
    await request(base)
      .delete(`/challenges/${id}/join`)
      .set('Cookie', one.cookie)
      .expect(200);
    await request(base)
      .post(`/challenges/${id}/join`)
      .set('Cookie', two.cookie)
      .expect(201);
    expect(await count(id)).toBe(2);
  });
});
