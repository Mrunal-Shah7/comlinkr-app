/**
 * Plan 14 (TR-029): follow and unfollow, the counts and lists, blocking, and the "New follower" notification.
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

describe('plan 14: follow', () => {
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

  const follow = (cookie: string, id: string) =>
    request(base).post(`/users/${id}/follow`).set('Cookie', cookie);
  const profile = (cookie: string, id: string) =>
    request(base).get(`/users/${id}`).set('Cookie', cookie);
  const data = (res: request.Response) => res.body?.data ?? res.body;

  it('follows and unfollows, with the counts and the profile flags', async () => {
    const a = await seedUser({ label: 'fa' });
    const b = await seedUser({ label: 'fb' });

    const on = await follow(a.cookie, b.id).expect(200);
    expect(data(on)).toEqual({ following: true, followersCount: 1 });

    const seenByA = data(await profile(a.cookie, b.id).expect(200));
    expect(seenByA.followedByMe).toBe(true);
    expect(seenByA.followingMe).toBe(false);
    expect(seenByA.stats).toMatchObject({
      followersCount: 1,
      followingCount: 0,
    });
    const seenByB = data(await profile(b.cookie, a.id).expect(200));
    expect(seenByB.followedByMe).toBe(false);
    expect(seenByB.followingMe).toBe(true);
    expect(seenByB.stats).toMatchObject({
      followersCount: 0,
      followingCount: 1,
    });

    const off = await follow(a.cookie, b.id).expect(200);
    expect(data(off)).toEqual({ following: false, followersCount: 0 });
    expect(await getTestPrisma().userFollow.count()).toBe(0);
  });

  it('refuses following yourself, an unknown user and a blocked user', async () => {
    const a = await seedUser({ label: 'fa' });
    const b = await seedUser({ label: 'fb' });
    const c = await seedUser({ label: 'fc' });
    const self = await follow(a.cookie, a.id).expect(400);
    expect(JSON.stringify(self.body)).toContain('CANNOT_FOLLOW_SELF');
    await follow(a.cookie, '00000000-0000-0000-0000-000000000000').expect(404);

    // a blocked b: neither can follow the other.
    await request(base)
      .post(`/users/${b.id}/block`)
      .set('Cookie', a.cookie)
      .expect(200);
    await follow(a.cookie, b.id).expect(404);
    await follow(b.cookie, a.id).expect(404);
    // c is unaffected.
    await follow(c.cookie, a.id).expect(200);
  });

  it('blocking removes the follows both ways', async () => {
    const a = await seedUser({ label: 'fa' });
    const b = await seedUser({ label: 'fb' });
    await follow(a.cookie, b.id).expect(200);
    await follow(b.cookie, a.id).expect(200);
    expect(await getTestPrisma().userFollow.count()).toBe(2);
    await request(base)
      .post(`/users/${a.id}/block`)
      .set('Cookie', b.cookie)
      .expect(200);
    expect(await getTestPrisma().userFollow.count()).toBe(0);
  });

  it('lists followers and following, newest first, with followedByMe', async () => {
    const me = await seedUser({ label: 'me' });
    const x = await seedUser({ label: 'fx' });
    const y = await seedUser({ label: 'fy' });
    await follow(x.cookie, me.id).expect(200);
    await follow(y.cookie, me.id).expect(200);
    await follow(me.cookie, x.id).expect(200);

    const followers = data(
      await request(base)
        .get('/users/me/followers')
        .set('Cookie', me.cookie)
        .expect(200),
    );
    const rows = followers.data ?? followers;
    expect(rows.map((r: any) => r.id)).toEqual([y.id, x.id]);
    expect(rows.find((r: any) => r.id === x.id).followedByMe).toBe(true);
    expect(rows.find((r: any) => r.id === y.id).followedByMe).toBe(false);
    expect(rows[0]).toMatchObject({ username: y.username, verified: false });

    const following = data(
      await request(base)
        .get('/users/me/following')
        .set('Cookie', me.cookie)
        .expect(200),
    );
    const frows = following.data ?? following;
    expect(frows.map((r: any) => r.id)).toEqual([x.id]);
    expect(frows[0].followedByMe).toBe(true);

    // An inactive follower drops out of the list and the count.
    await getTestPrisma().user.update({
      where: { id: y.id },
      data: { isActive: false },
    });
    const after = data(
      await request(base)
        .get('/users/me/followers')
        .set('Cookie', me.cookie)
        .expect(200),
    );
    expect((after.data ?? after).map((r: any) => r.id)).toEqual([x.id]);
  });

  it('notifies the person followed once for follow, unfollow, follow', async () => {
    const a = await seedUser({ label: 'fa' });
    const b = await seedUser({ label: 'fb' });
    await follow(a.cookie, b.id).expect(200);
    await follow(a.cookie, b.id).expect(200);
    await follow(a.cookie, b.id).expect(200);
    const rows = await getTestPrisma().notification.findMany({
      where: { userId: b.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'SYSTEM',
      title: 'New follower',
      body: 'S56 fa started following you',
      referenceType: 'USER',
      referenceId: a.id,
    });
    expect(
      await getTestPrisma().notification.count({ where: { userId: a.id } }),
    ).toBe(0);
  });
});
