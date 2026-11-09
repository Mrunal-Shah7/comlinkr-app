/**
 * TR-017: GET /news/articles/:id — the article route's by-id read. The live cache is seeded directly, so the test
 * never calls Google News.
 */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { NewsService } from '../../src/modules/news/news.service';
import { appBaseUrl, createTestApp } from '../helpers/app';
import {
  disconnectFixtures,
  getTestPrisma,
  resetDatabase,
  seedUser,
} from '../helpers/fixtures';

describe('TR-017 news article by id', () => {
  let app: INestApplication;
  let base: string;
  let news: NewsService;

  beforeAll(async () => {
    app = await createTestApp();
    base = appBaseUrl(app);
    news = app.get(NewsService);
  });

  beforeEach(async () => {
    await resetDatabase();
    (news as unknown as { cache: Map<string, unknown> }).cache.clear();
  });

  afterAll(async () => {
    await app.close();
    await disconnectFixtures();
  });

  it('answers from the live cache, for guests too', async () => {
    const article = {
      id: 'g-test-0-abc',
      title: 'Cached headline',
      description: 'Summary',
      url: 'https://example.test/a',
      image: null,
      source: 'Example',
      publishedAt: new Date().toISOString(),
      category: 'local',
    };
    (news as unknown as { cache: Map<string, unknown> }).cache.set('t', {
      ts: Date.now(),
      phase: 'full',
      cachedAt: new Date().toISOString(),
      data: [article],
    });
    const res = await request(base)
      .get(`/news/articles/${article.id}`)
      .expect(200);
    expect(res.body.data).toMatchObject({
      id: article.id,
      title: 'Cached headline',
      description: 'Summary',
    });
  });

  it('falls back to a saved copy, then 404s for an unknown id', async () => {
    const u = await seedUser({ label: 'na' });
    await getTestPrisma().newsArticleSave.create({
      data: {
        userId: u.id,
        articleId: 'g-old-3-def',
        title: 'Saved headline',
        url: 'https://example.test/b',
        source: 'Saved source',
      },
    });
    const res = await request(base)
      .get('/news/articles/g-old-3-def')
      .expect(200);
    expect(res.body.data).toMatchObject({
      id: 'g-old-3-def',
      title: 'Saved headline',
      source: 'Saved source',
      description: '',
    });

    await request(base).get('/news/articles/g-missing-1-x').expect(404);
    // Literal routes still win over :id.
    await request(base).get('/news/articles/saved').expect(401);
  });
});
