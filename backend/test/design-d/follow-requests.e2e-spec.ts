/**
 * Plan 16 (TR-049, TR-050, TR-051, TR-053): follow requests for private accounts, the Following feed, the "New
 * followers" switch, and settings PATCHes that change only the fields sent.
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

describe('plan 16: follow requests, the Following feed, the switch', () => {
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

  const data = (res: request.Response) => res.body?.data ?? res.body;
  const rows = (res: request.Response) => {
    const d = data(res);
    return (d.data ?? d) as any[];
  };
  const follow = (cookie: string, id: string) =>
    request(base).post(`/users/${id}/follow`).set('Cookie', cookie).expect(200);
  const makePrivate = (id: string) =>
    getTestPrisma().privacySettings.upsert({
      where: { userId: id },
      create: { userId: id, publicProfile: false },
      update: { publicProfile: false },
    });
  const titles = async (userId: string) =>
    (
      await getTestPrisma().notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      })
    ).map((n) => n.title);

  it('a private account gets a request; cancel, request again, accept', async () => {
    const owner = await seedUser({ label: 'po' });
    const fan = await seedUser({ label: 'pf' });
    await makePrivate(owner.id);

    expect(data(await follow(fan.cookie, owner.id))).toEqual({
      following: false,
      requested: true,
      followersCount: 0,
    });
    const seen = data(
      await request(base)
        .get(`/users/${owner.id}`)
        .set('Cookie', fan.cookie)
        .expect(200),
    );
    expect(seen).toMatchObject({
      followRequested: true,
      followedByMe: false,
      isPrivate: true,
    });
    expect(seen.stats).toBeUndefined();

    // Tapping again cancels the request.
    expect(data(await follow(fan.cookie, owner.id))).toMatchObject({
      following: false,
      requested: false,
    });
    expect(await getTestPrisma().userFollow.count()).toBe(0);
    await follow(fan.cookie, owner.id);

    const reqs = await request(base)
      .get('/users/me/follow-requests')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(rows(reqs).map((r) => r.id)).toEqual([fan.id]);
    // Pending rows are not followers.
    const followers = await request(base)
      .get('/users/me/followers')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(rows(followers)).toHaveLength(0);

    // Only the owner can accept, and only a pending request.
    await request(base)
      .post(`/users/me/follow-requests/${owner.id}/accept`)
      .set('Cookie', fan.cookie)
      .expect(404);
    const ok = await request(base)
      .post(`/users/me/follow-requests/${fan.id}/accept`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(data(ok)).toEqual({ accepted: true, followersCount: 1 });
    await request(base)
      .post(`/users/me/follow-requests/${fan.id}/accept`)
      .set('Cookie', owner.cookie)
      .expect(404);

    const after = data(
      await request(base)
        .get(`/users/${owner.id}`)
        .set('Cookie', fan.cookie)
        .expect(200),
    );
    expect(after).toMatchObject({ followedByMe: true, followRequested: false });
    expect(after.isPrivate).toBeUndefined();
    expect(after.stats).toMatchObject({ followersCount: 1 });

    // One request notice (the second request within the week is not repeated), one accepted notice.
    expect(await titles(owner.id)).toEqual(['Follow request']);
    expect(await titles(fan.id)).toEqual(['Follow request accepted']);
    const req = await getTestPrisma().notification.findFirstOrThrow({
      where: { userId: owner.id },
    });
    expect(req).toMatchObject({
      referenceType: 'FOLLOW_REQUEST',
      referenceId: fan.id,
    });
  });

  it('declines silently; a private account shows its posts only to accepted followers', async () => {
    const owner = await seedUser({ label: 'do' });
    const fan = await seedUser({ label: 'df' });
    const other = await seedUser({ label: 'dx' });
    await makePrivate(owner.id);
    await getTestPrisma().feedPost.create({
      data: {
        authorId: owner.id,
        title: 'Private post',
        content: 'Hello',
        category: 'COMMUNITY',
      },
    });
    const posts = (cookie: string) =>
      request(base)
        .get(`/users/${owner.id}/posts`)
        .set('Cookie', cookie)
        .expect(200);

    await follow(other.cookie, owner.id);
    await request(base)
      .delete(`/users/me/follow-requests/${other.id}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(await getTestPrisma().userFollow.count()).toBe(0);
    expect(await titles(other.id)).toEqual([]);
    expect(rows(await posts(other.cookie))).toHaveLength(0);

    await follow(fan.cookie, owner.id);
    expect(rows(await posts(fan.cookie))).toHaveLength(0);
    await request(base)
      .post(`/users/me/follow-requests/${fan.id}/accept`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(rows(await posts(fan.cookie)).map((p) => p.title)).toEqual([
      'Private post',
    ]);
    expect(rows(await posts(other.cookie))).toHaveLength(0);
  });

  it('going public accepts the waiting requests; a privacy PATCH keeps the fields not sent (TR-053)', async () => {
    const owner = await seedUser({ label: 'go' });
    const fan = await seedUser({ label: 'gf' });
    const patchPrivacy = (body: object) =>
      request(base)
        .patch('/settings/privacy')
        .set('Cookie', owner.cookie)
        .send(body)
        .expect(200);
    await patchPrivacy({ showLocation: false });
    await patchPrivacy({ publicProfile: false });
    const mid = await getTestPrisma().privacySettings.findUniqueOrThrow({
      where: { userId: owner.id },
    });
    expect(mid).toMatchObject({ publicProfile: false, showLocation: false });

    await follow(fan.cookie, owner.id);
    await patchPrivacy({ publicProfile: true });
    const row = await getTestPrisma().userFollow.findFirstOrThrow({});
    expect(row.status).toBe('ACCEPTED');
    const end = await getTestPrisma().privacySettings.findUniqueOrThrow({
      where: { userId: owner.id },
    });
    expect(end.showLocation).toBe(false);
  });

  it('a preferences PATCH keeps the fields not sent, and the switch mutes follow notices (TR-049, TR-053)', async () => {
    const me = await seedUser({ label: 'nm' });
    const fan = await seedUser({ label: 'nf' });
    const patch = (body: object) =>
      request(base)
        .patch('/notifications/preferences')
        .set('Cookie', me.cookie)
        .send(body)
        .expect(200);
    await patch({ likes: true, messages: false });
    await patch({ pushEnabled: false });
    const prefs =
      await getTestPrisma().notificationPreference.findUniqueOrThrow({
        where: { userId: me.id },
      });
    expect(prefs).toMatchObject({
      pushEnabled: false,
      likes: true,
      messages: false,
      followers: true,
    });

    await patch({ followers: false });
    await follow(fan.cookie, me.id);
    expect(await titles(me.id)).toEqual([]);
    await patch({ followers: true });
    await follow(fan.cookie, me.id); // unfollow
    await follow(fan.cookie, me.id); // follow again: told now
    expect(await titles(me.id)).toEqual(['New follower']);
  });

  it('the Following feed lists what the people you follow posted, newest first, with paging', async () => {
    const me = await seedUser({ label: 'fm' });
    const prisma = getTestPrisma();
    const people = await Promise.all(
      Array.from({ length: 50 }, (_, i) => seedUser({ label: `f${i}` })),
    );
    for (const p of people) await follow(me.cookie, p.id);
    const t0 = Date.now() - 3_600_000;
    await prisma.feedPost.createMany({
      data: people.map((p, i) => ({
        authorId: p.id,
        title: `Post ${i}`,
        content: 'x',
        category: 'COMMUNITY' as const,
        createdAt: new Date(t0 + i * 1000),
      })),
    });
    const host = people[0];
    const day = new Date(Date.now() + 5 * 86_400_000);
    await prisma.event.create({
      data: {
        authorId: host.id,
        title: 'Live event',
        description: 'x',
        category: 'SOCIAL',
        format: 'IN_PERSON',
        date: day,
        startTime: '6:00 PM',
        venue: 'Park',
        city: 'Los Angeles',
        createdAt: new Date(t0 + 100_000),
      },
    });
    await prisma.event.create({
      data: {
        authorId: host.id,
        title: 'Cancelled event',
        description: 'x',
        category: 'SOCIAL',
        format: 'IN_PERSON',
        date: day,
        startTime: '6:00 PM',
        venue: 'Park',
        city: 'Los Angeles',
        cancelledAt: new Date(),
      },
    });
    await prisma.feedPost.create({
      data: {
        authorId: host.id,
        title: 'Unpublished',
        content: 'x',
        category: 'COMMUNITY',
        isPublished: false,
      },
    });
    await prisma.story.create({
      data: {
        authorId: host.id,
        title: 'Old story',
        mediaType: 'PHOTO',
        category: 'EVENTS',
        mediaUrl: 'stories/x.jpg',
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await prisma.challenge.create({
      data: {
        authorId: host.id,
        title: 'A quest',
        type: 'PHOTO',
        duration: 'ONE_DAY',
        goalCondition: 'x',
        reward: 'x',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(t0 + 200_000),
      },
    });
    // Someone not followed, and a pending request, add nothing.
    const stranger = await seedUser({ label: 'fs' });
    await prisma.feedPost.create({
      data: {
        authorId: stranger.id,
        title: 'Stranger post',
        content: 'x',
        category: 'COMMUNITY',
      },
    });
    await makePrivate(stranger.id);
    await follow(me.cookie, stranger.id);

    const page = (n: number) =>
      request(base)
        .get(`/feed/following?page=${n}&limit=20`)
        .set('Cookie', me.cookie)
        .expect(200);
    const first = (await page(1)).body;
    expect(first.data).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(first.data[0]).toMatchObject({
      type: 'CHALLENGE',
      title: 'A quest',
      author: { id: host.id },
    });
    expect(first.data[1]).toMatchObject({ type: 'EVENT', title: 'Live event' });
    expect(first.data[2].title).toBe('Post 49');
    const third = (await page(3)).body;
    expect(third.data).toHaveLength(12);
    expect(third.hasMore).toBe(false);
    const all = [
      ...first.data,
      ...(await page(2)).body.data,
      ...third.data,
    ].map((r: any) => r.title);
    expect(new Set(all).size).toBe(52);
    for (const hidden of [
      'Cancelled event',
      'Unpublished',
      'Old story',
      'Stranger post',
    ])
      expect(all).not.toContain(hidden);

    // Nobody followed: an empty list.
    const empty = (
      await request(base)
        .get('/feed/following')
        .set('Cookie', stranger.cookie)
        .expect(200)
    ).body;
    expect(empty).toMatchObject({ data: [], hasMore: false });
  });
});
