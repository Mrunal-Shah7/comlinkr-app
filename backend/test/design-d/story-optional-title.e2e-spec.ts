/**
 * Design D (plan 01): a story can be posted photo-first, without a title or a category.
 * No media file is sent, so nothing reaches the storage provider.
 */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { appBaseUrl, createTestApp } from '../helpers/app';
import { disconnectFixtures, getTestPrisma, resetDatabase, seedUser } from '../helpers/fixtures';

describe('Design D: stories without a title or category', () => {
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

  it('stores an empty title and the GENERAL category when both are left out', async () => {
    const author = await seedUser({ label: 'storyauthor' });
    const res = await request(base).post('/stories').set('Cookie', author.cookie).send({ mediaType: 'PHOTO' });
    expect(res.status).toBe(201);
    const saved = await getTestPrisma().story.findFirst({ where: { authorId: author.id } });
    expect(saved?.title).toBe('');
    expect(saved?.category).toBe('GENERAL');
  });

  it('keeps a given title and category, and still rejects an unknown category', async () => {
    const author = await seedUser({ label: 'storyauthor2' });
    const ok = await request(base).post('/stories').set('Cookie', author.cookie).send({ mediaType: 'PHOTO', title: '  Sunset at the pier  ', category: 'FOOD' });
    expect(ok.status).toBe(201);
    const saved = await getTestPrisma().story.findFirst({ where: { authorId: author.id } });
    expect(saved?.title).toBe('Sunset at the pier');
    expect(saved?.category).toBe('FOOD');

    const bad = await request(base).post('/stories').set('Cookie', author.cookie).send({ mediaType: 'PHOTO', category: 'NOPE' });
    expect(bad.status).toBe(400);
  });
});
