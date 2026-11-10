// src/modules/food/geocoding.service.ts
//
// Plan 13 (TR-032): turns a restaurant's public address into coordinates with OpenStreetMap's Nominatim, so the app
// can tell how near a restaurant is. Only the business address is sent, never anything about a user. Nominatim's
// usage policy: at most one request a second, a User-Agent that names the application, and results cached.
// Off in tests and when GEOCODING_ENABLED=false.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GeocodeResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: 'not-found' | 'unavailable' };

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Comlinkr/1.0 (+https://comlinkr.com)';
const MIN_GAP_MS = 1100;

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<string, GeocodeResult>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastAt = 0;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    if (this.config.get<string>('NODE_ENV') === 'test') return false;
    return this.config.get<string>('GEOCODING_ENABLED', 'true') !== 'false';
  }

  /** One address → coordinates. Requests are queued one at a time, at least 1.1 s apart. */
  geocode(parts: {
    address: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }): Promise<GeocodeResult> {
    const q = [parts.address, parts.city, parts.state, parts.country]
      .map((x) => (x ?? '').trim())
      .filter(Boolean)
      .join(', ');
    const key = q.toLowerCase();
    const hit = this.cache.get(key);
    if (hit) return Promise.resolve(hit);
    if (!this.enabled || !q) {
      return Promise.resolve({ ok: false, reason: 'unavailable' });
    }
    const run = this.queue.then(() => this.request(q, key));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async request(q: string, key: string): Promise<GeocodeResult> {
    const wait = this.lastAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastAt = Date.now();
    const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        this.logger.warn(`Nominatim answered ${resp.status}`);
        return { ok: false, reason: 'unavailable' };
      }
      const rows = (await resp.json()) as { lat?: string; lon?: string }[];
      const lat = Number(rows[0]?.lat);
      const lng = Number(rows[0]?.lon);
      const result: GeocodeResult =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? { ok: true, latitude: lat, longitude: lng }
          : { ok: false, reason: 'not-found' };
      this.cache.set(key, result);
      return result;
    } catch (e) {
      this.logger.warn(`Nominatim request failed: ${(e as Error).message}`);
      return { ok: false, reason: 'unavailable' };
    }
  }
}
