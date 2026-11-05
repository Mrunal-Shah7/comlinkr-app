/**
 * Design D (plan 01): posting a restaurant review needs a rating only; the text is optional.
 */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { appBaseUrl, createTestApp } from '../helpers/app';
import { disconnectFixtures, getTestPrisma, resetDatabase, seedUser } from '../helpers/fixtures';

describe('Design D: rating-only restaurant reviews', () => {
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

  async function restaurantFor(ownerId: string) {
    return getTestPrisma().restaurant.create({
      data: {
        ownerId,
        name: 'uit Taco Stand',
        cuisine: 'Mexican',
        address: '1 Test St',
        city: 'Los Angeles',
        country: 'United States',
        priceRange: 'MODERATE',
        availableServices: ['Dine-in'],
        tags: [],
      },
    });
  }

  it('accepts a review with a rating and no text, and updates the average', async () => {
    const owner = await seedUser({ label: 'owner' });
    const diner = await seedUser({ label: 'diner' });
    const r = await restaurantFor(owner.id);

    const res = await request(base).post(`/restaurants/${r.id}/reviews`).set('Cookie', diner.cookie).send({ rating: 4 });
    expect(res.status).toBe(201);

    const saved = await getTestPrisma().restaurantReview.findFirst({ where: { restaurantId: r.id } });
    expect(saved?.rating).toBe(4);
    expect(saved?.content).toBe('');
    const fresh = await getTestPrisma().restaurant.findUnique({ where: { id: r.id } });
    expect(fresh?.totalReviews).toBe(1);
  });

  it('still keeps text when it is given, and still rejects a missing rating', async () => {
    const owner = await seedUser({ label: 'owner2' });
    const diner = await seedUser({ label: 'diner2' });
    const r = await restaurantFor(owner.id);

    const noRating = await request(base).post(`/restaurants/${r.id}/reviews`).set('Cookie', diner.cookie).send({ content: 'Great tacos' });
    expect(noRating.status).toBe(400);

    const ok = await request(base).post(`/restaurants/${r.id}/reviews`).set('Cookie', diner.cookie).send({ rating: 5, content: '  Great tacos  ' });
    expect(ok.status).toBe(201);
    const saved = await getTestPrisma().restaurantReview.findFirst({ where: { restaurantId: r.id } });
    expect(saved?.content).toBe('Great tacos');
  });
});
