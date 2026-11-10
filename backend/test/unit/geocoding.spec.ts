/**
 * Plan 13 (TR-032): restaurant addresses are geocoded with Nominatim, one request at a time, cached; the cron fills
 * in coordinates and does not retry an address the geocoder could not find.
 */
import { GeocodingService } from '../../src/modules/food/geocoding.service';
import { FoodGeocodeCron } from '../../src/modules/food/food-geocode.cron';

const config = (env: Record<string, string> = {}) =>
  ({
    get: (k: string, d?: string) => env[k] ?? d,
  }) as any;

describe('GeocodingService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('sends only the address, names the app, spaces requests and caches', async () => {
    const calls: { url: string; at: number; ua: string }[] = [];
    global.fetch = jest.fn((url: any, init: any) => {
      calls.push({
        url: String(url),
        at: Date.now(),
        ua: init.headers['User-Agent'],
      });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ lat: '34.05', lon: '-118.24' }]),
      } as any);
    }) as any;
    const svc = new GeocodingService(config());
    const a = svc.geocode({
      address: '211 Olympic Blvd',
      city: 'Los Angeles',
      country: 'United States',
    });
    const b = svc.geocode({
      address: '222 York Blvd',
      city: 'Los Angeles',
      country: 'United States',
    });
    expect(await a).toEqual({ ok: true, latitude: 34.05, longitude: -118.24 });
    await b;
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain(
      'q=211%20Olympic%20Blvd%2C%20Los%20Angeles%2C%20United%20States',
    );
    expect(calls[0].ua).toBe('ComLinkr/1.0 (+https://comlinkr.com)');
    expect(calls[1].at - calls[0].at).toBeGreaterThanOrEqual(1000);
    // Same address again: from the cache.
    await svc.geocode({
      address: '211 olympic blvd',
      city: 'los angeles',
      country: 'united states',
    });
    expect(calls).toHaveLength(2);
  }, 10_000);

  it('reports not-found and unavailable, and is off in tests', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any),
    ) as any;
    expect(
      await new GeocodingService(config()).geocode({ address: 'Nowhere 1' }),
    ).toEqual({
      ok: false,
      reason: 'not-found',
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 429 } as any),
    ) as any;
    expect(
      await new GeocodingService(config()).geocode({ address: 'Busy 1' }),
    ).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    const off = new GeocodingService(config({ NODE_ENV: 'test' }));
    expect(off.enabled).toBe(false);
    expect(
      new GeocodingService(config({ GEOCODING_ENABLED: 'false' })).enabled,
    ).toBe(false);
  });
});

describe('FoodGeocodeCron', () => {
  it('stores coordinates, marks a not-found address tried, stops on an unavailable geocoder', async () => {
    const rows = [
      { id: 'a', address: '1 A St', city: 'LA', state: null, country: 'US' },
      { id: 'b', address: 'nowhere', city: 'LA', state: null, country: 'US' },
      { id: 'c', address: '3 C St', city: 'LA', state: null, country: 'US' },
      { id: 'd', address: '4 D St', city: 'LA', state: null, country: 'US' },
    ];
    const prisma: any = {
      restaurant: {
        findMany: jest.fn().mockResolvedValue(rows),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const geocoding: any = {
      enabled: true,
      geocode: jest
        .fn()
        .mockResolvedValueOnce({ ok: true, latitude: 1, longitude: 2 })
        .mockResolvedValueOnce({ ok: false, reason: 'not-found' })
        .mockResolvedValueOnce({ ok: false, reason: 'unavailable' }),
    };
    const found = await new FoodGeocodeCron(prisma, geocoding).run();
    expect(found).toBe(1);
    expect(geocoding.geocode).toHaveBeenCalledTimes(3); // d is left for the next run
    const updates = prisma.restaurant.updateMany.mock.calls.map(
      (c: any) => c[0],
    );
    expect(updates).toHaveLength(2);
    expect(updates[0].data).toMatchObject({ latitude: 1, longitude: 2 });
    expect(updates[1].data.latitude).toBeUndefined();
    expect(updates[1].data.geocodeTriedAt).toBeInstanceOf(Date);
    expect(updates[1].where).toMatchObject({
      id: 'b',
      address: 'nowhere',
      geocodeTriedAt: null,
    });
  });
});
