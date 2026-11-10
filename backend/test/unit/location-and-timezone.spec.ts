/**
 * Unit tests for plan 08 (TR-042: the city comes from the phone's location, an admin can override it) and TR-033
 * (a restaurant's opening hours use its city's time zone, not the creating phone's).
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LocationSource } from '@prisma/client';
import { OnboardingService } from '../../src/modules/onboarding/onboarding.service';
import { SettingsService } from '../../src/modules/settings/settings.service';
import { AdminService } from '../../src/modules/admin/admin.service';
import { FoodService } from '../../src/modules/food/food.service';
import { RoommatesService } from '../../src/modules/roommates/roommates.service';
import { cityTimezone } from '../../src/common/utils/city-timezone';
import { locationProvenance } from '../../src/common/utils/location-provenance';

const LA = {
  country: 'United States', countryCode: 'US', dialCode: '+1', state: 'California', city: 'Los Angeles',
};

describe('locationProvenance', () => {
  it('marks a city sent with coordinates as GPS and keeps them', () => {
    expect(locationProvenance({ latitude: 34.05, longitude: -118.24 })).toEqual({
      source: LocationSource.GPS, latitude: 34.05, longitude: -118.24,
    });
  });
  it('marks a city sent without coordinates (an older app) as MANUAL', () => {
    expect(locationProvenance({})).toEqual({ source: LocationSource.MANUAL, latitude: null, longitude: null });
    expect(locationProvenance({ latitude: 34.05 })).toEqual({ source: LocationSource.MANUAL, latitude: null, longitude: null });
  });
});

describe('onboarding and settings write where the city came from', () => {
  const upsert = jest.fn();
  const prisma = { userLocation: { upsert } } as any;
  beforeEach(() => upsert.mockReset().mockResolvedValue({}));

  it('onboarding stores GPS and the coordinates', async () => {
    await new OnboardingService(prisma, {} as any).setLocation('u1', { ...LA, latitude: 34.05, longitude: -118.24 });
    const arg = upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({ userId: 'u1', city: 'Los Angeles', source: 'GPS', latitude: 34.05, longitude: -118.24 });
    expect(arg.update).toMatchObject({ city: 'Los Angeles', source: 'GPS' });
  });

  it('settings without coordinates stores MANUAL', async () => {
    await new SettingsService(prisma, {} as any).updateCity('u1', LA);
    expect(upsert.mock.calls[0][0].update).toMatchObject({ city: 'Los Angeles', source: 'MANUAL', latitude: null, longitude: null });
  });
});

describe('AdminService.setUserLocation', () => {
  const make = (adminRole: string, target: object | null) => {
    const upsert = jest.fn().mockResolvedValue({ city: 'London', state: 'England', country: 'United Kingdom', source: 'ADMIN' });
    const findUnique = jest.fn().mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === 'admin' ? { role: adminRole, isActive: true } : target));
    const prisma = { user: { findUnique }, userLocation: { upsert } } as any;
    const svc = new AdminService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    return { svc, upsert };
  };
  const london = { country: 'United Kingdom', countryCode: 'GB', dialCode: '+44', state: 'England', city: 'London' };

  it('writes the city as ADMIN, without coordinates', async () => {
    const { svc, upsert } = make('ADMIN', { id: 'u1' });
    const res = await svc.setUserLocation('admin', 'u1', london);
    expect(upsert.mock.calls[0][0].update).toMatchObject({ city: 'London', source: 'ADMIN', latitude: null, longitude: null });
    expect(res).toMatchObject({ userId: 'u1', city: 'London', source: 'ADMIN' });
  });

  it('refuses a caller who is no longer an admin', async () => {
    const { svc, upsert } = make('USER', { id: 'u1' });
    await expect(svc.setUserLocation('admin', 'u1', london)).rejects.toBeInstanceOf(ForbiddenException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown user', async () => {
    const { svc } = make('ADMIN', null);
    await expect(svc.setUserLocation('admin', 'nobody', london)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('the roommate profile does not move the user (plan 08)', () => {
  const make = (existing: object | null) => {
    const create = jest.fn().mockResolvedValue({});
    const update = jest.fn();
    const upsert = jest.fn();
    const prisma = { userLocation: { findUnique: jest.fn().mockResolvedValue(existing), create, update, upsert } } as any;
    const svc = new RoommatesService(prisma, {} as any, { getPublicBaseUrl: () => '' } as any) as any;
    return { svc, create, update, upsert };
  };

  it('leaves an existing city alone', async () => {
    const { svc, create, update, upsert } = make({ userId: 'u1', city: 'Los Angeles' });
    await svc.syncListingLocation('u1', { city: 'London', stateProvince: 'England', country: 'United Kingdom' });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('fills the city only when the user has none', async () => {
    const { svc, create } = make(null);
    await svc.syncListingLocation('u1', { city: 'Austin', stateProvince: 'Texas' });
    expect(create.mock.calls[0][0].data).toMatchObject({ userId: 'u1', city: 'Austin', state: 'Texas' });
  });
});

describe('restaurant time zone follows its city (TR-033)', () => {
  it('knows the cities the app serves', () => {
    expect(cityTimezone('Los Angeles')).toBe('America/Los_Angeles');
    expect(cityTimezone(' London ')).toBe('Europe/London');
    expect(cityTimezone('Testville')).toBeUndefined();
  });

  const makeFood = (existing: object) => {
    const create = jest.fn().mockResolvedValue({ id: 'r1' });
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      restaurant: { create, update, findUnique: jest.fn().mockResolvedValue(existing) },
    } as any;
    const svc = new FoodService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(svc, 'getRestaurantById').mockResolvedValue({} as any);
    return { svc, create, update };
  };

  it('an edit sets the city zone even when the phone sent its own', async () => {
    const { svc, update } = makeFood({ id: 'r1', ownerId: 'o1', city: 'Los Angeles', timezone: 'Asia/Kolkata' });
    await svc.updateRestaurant('o1', 'r1', { timezone: 'Asia/Kolkata' } as any);
    expect(update.mock.calls[0][0].data.timezone).toBe('America/Los_Angeles');
  });

  it('an edit in an unknown city keeps the zone that was sent', async () => {
    const { svc, update } = makeFood({ id: 'r1', ownerId: 'o1', city: 'Testville', timezone: null });
    await svc.updateRestaurant('o1', 'r1', { timezone: 'America/Chicago' } as any);
    expect(update.mock.calls[0][0].data.timezone).toBe('America/Chicago');
  });
});
