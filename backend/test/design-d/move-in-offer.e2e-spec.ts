/**
 * Plan 12 (TR-036): no move-in before the home is available; the terms are sent with the application, the landlord
 * approves, then the tenant signs or declines the offer.
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
import { StorageService } from '../../src/modules/storage/storage.service';

const addDays = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe('plan 12: move-in date and the order of the offer', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await createTestApp();
    base = appBaseUrl(app);
    // The agreement PDF would go to the real storage service: keep it local.
    jest
      .spyOn(app.get(StorageService), 'uploadPrivateFile')
      .mockResolvedValue('documents/test/agreement.pdf');
  });
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    await app.close();
    await disconnectFixtures();
  });

  async function setup(availableDate: string | null) {
    const prisma = getTestPrisma();
    const landlord = await seedUser({ label: 'll' });
    const tenant = await seedUser({ label: 'tn' });
    const badgeApp = await prisma.badgeApplication.create({
      data: {
        userId: landlord.id,
        badgeType: 'LANDLORD',
        status: 'APPROVED',
        fullLegalName: 'Test Landlord',
        businessPhone: '+15550000000',
      },
    });
    await prisma.userBadge.create({
      data: {
        userId: landlord.id,
        badgeType: 'LANDLORD',
        applicationId: badgeApp.id,
      },
    });
    const listing = await prisma.housingListing.create({
      data: {
        ownerId: landlord.id,
        title: 'Plan 12 flat',
        description: 'A flat',
        propertyType: 'APARTMENT',
        price: 1500,
        deposit: 1500,
        bedrooms: 1,
        bathrooms: 1,
        address: '1 Test Street',
        city: 'Los Angeles',
        country: 'US',
        availableDate: availableDate
          ? new Date(`${availableDate}T19:56:50Z`)
          : null,
      },
    });
    const created = await request(base)
      .post('/property-applications')
      .set('Cookie', tenant.cookie)
      .send({ listingId: listing.id })
      .expect(201);
    const id = (created.body.data ?? created.body).id as string;
    return { landlord, tenant, id };
  }

  const step1 = (moveInDate: string) => ({
    fullName: 'Test Tenant',
    currentAddress: 'Los Angeles',
    email: 'tenant@example.test',
    phone: '+15550000001',
    employmentType: 'full_time',
    monthlyIncome: 5000,
    moveInDate,
  });

  it('refuses a move-in before the available day, in step 1 and step 4', async () => {
    const day = addDays(20);
    const { tenant, id } = await setup(day);
    const early = await request(base)
      .patch(`/property-applications/${id}/step/1`)
      .set('Cookie', tenant.cookie)
      .send(step1(addDays(18)))
      .expect(400);
    expect(JSON.stringify(early.body)).toContain('MOVE_IN_BEFORE_AVAILABLE');
    await request(base)
      .patch(`/property-applications/${id}/step/1`)
      .set('Cookie', tenant.cookie)
      .send(step1(day))
      .expect(200);
    await request(base)
      .patch(`/property-applications/${id}/step/4`)
      .set('Cookie', tenant.cookie)
      .send({ leaseTerm: '12 months', moveInDate: addDays(19) })
      .expect(400);
    // Without termsRead / termsAgreed (plan 12), on or after the day.
    await request(base)
      .patch(`/property-applications/${id}/step/4`)
      .set('Cookie', tenant.cookie)
      .send({ leaseTerm: '6 months', moveInDate: addDays(25) })
      .expect(200);
  });

  it('adds no rule when the listing has no available day', async () => {
    const { tenant, id } = await setup(null);
    await request(base)
      .patch(`/property-applications/${id}/step/1`)
      .set('Cookie', tenant.cookie)
      .send(step1(addDays(1)))
      .expect(200);
  });

  async function sendAndApprove(s: Awaited<ReturnType<typeof setup>>) {
    await request(base)
      .patch(`/property-applications/${s.id}/step/1`)
      .set('Cookie', s.tenant.cookie)
      .send(step1(addDays(30)))
      .expect(200);
    await request(base)
      .patch(`/property-applications/${s.id}/step/4`)
      .set('Cookie', s.tenant.cookie)
      .send({ leaseTerm: '12 months', moveInDate: addDays(30) })
      .expect(200);
    await request(base)
      .post(`/property-applications/${s.id}/submit`)
      .set('Cookie', s.tenant.cookie)
      .expect(200);
    await request(base)
      .patch(`/property-applications/${s.id}/decision`)
      .set('Cookie', s.landlord.cookie)
      .send({ decision: 'approved' })
      .expect(200);
  }

  const sign = (s: Awaited<ReturnType<typeof setup>>) =>
    request(base)
      .post(`/property-applications/${s.id}/sign`)
      .set('Cookie', s.tenant.cookie)
      .send({
        signature: 'Test Tenant',
        signatureType: 'typed',
        signedAt: new Date().toISOString(),
      });

  it('send, approve, then sign makes the agreement', async () => {
    const s = await setup(addDays(10));
    await sendAndApprove(s);
    const res = await sign(s).expect(200);
    expect((res.body.data ?? res.body).status).toBe('signed');
    const doc = await getTestPrisma().userDocument.findFirst({
      where: { userId: s.tenant.id },
    });
    expect(doc?.fileKey).toBe('documents/test/agreement.pdf');
    // Once signed, it can no longer be withdrawn.
    await request(base)
      .delete(`/property-applications/${s.id}`)
      .set('Cookie', s.tenant.cookie)
      .expect(409);
  });

  it('refuses signing before the landlord approves (TR-048)', async () => {
    const s = await setup(addDays(10));
    await request(base)
      .patch(`/property-applications/${s.id}/step/1`)
      .set('Cookie', s.tenant.cookie)
      .send(step1(addDays(30)))
      .expect(200);
    await request(base)
      .post(`/property-applications/${s.id}/submit`)
      .set('Cookie', s.tenant.cookie)
      .expect(200);
    const early = await sign(s).expect(409);
    expect(JSON.stringify(early.body)).toContain('NOT_APPROVED');
    const row = await getTestPrisma().propertyApplication.findUniqueOrThrow({
      where: { id: s.id },
    });
    expect(row.tenantSignedAt).toBeNull();
    expect(row.signature).toBeNull();
    // Once approved, the same signature goes through.
    await request(base)
      .patch(`/property-applications/${s.id}/decision`)
      .set('Cookie', s.landlord.cookie)
      .send({ decision: 'approved' })
      .expect(200);
    const late = await sign(s).expect(200);
    expect((late.body.data ?? late.body).status).toBe('signed');
  });

  it('declining an approved offer withdraws it and tells the landlord', async () => {
    const s = await setup(addDays(10));
    await sendAndApprove(s);
    await request(base)
      .delete(`/property-applications/${s.id}`)
      .set('Cookie', s.tenant.cookie)
      .expect(200);
    const row = await getTestPrisma().propertyApplication.findUniqueOrThrow({
      where: { id: s.id },
    });
    expect(row.status).toBe('WITHDRAWN');
    const told = await getTestPrisma().notification.findMany({
      where: { userId: s.landlord.id, title: 'Application withdrawn' },
    });
    expect(told).toHaveLength(1);
    // A withdrawn offer cannot be signed.
    expect((await sign(s)).status).toBeGreaterThanOrEqual(400);
  });
});
