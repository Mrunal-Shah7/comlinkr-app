// src/modules/food/food-geocode.cron.ts
//
// Plan 13 (TR-032): every minute, geocode up to four restaurants that have no coordinates and whose address has not
// been tried since it last changed. An address the geocoder cannot find is not tried again until it changes; a
// failed request (network, rate limit) is retried on a later run.

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { GeocodingService } from './geocoding.service';

// Nominatim limits scheduled scripts to 4 requests a minute.
const BATCH = 4;

@Injectable()
export class FoodGeocodeCron {
  private readonly logger = new Logger(FoodGeocodeCron.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GeocodingService,
  ) {}

  @Cron('* * * * *')
  async run(): Promise<number> {
    if (this.running || !this.geocoding.enabled) return 0;
    this.running = true;
    let found = 0;
    try {
      const rows = await this.prisma.restaurant.findMany({
        where: { latitude: null, geocodeTriedAt: null },
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          country: true,
        },
        orderBy: { createdAt: 'desc' },
        take: BATCH,
      });
      for (const r of rows) {
        const res = await this.geocoding.geocode(r);
        if (!res.ok && res.reason === 'unavailable') break; // try again next minute
        await this.prisma.restaurant.updateMany({
          // Only if the address is still the one that was geocoded.
          where: {
            id: r.id,
            address: r.address,
            city: r.city,
            geocodeTriedAt: null,
          },
          data: res.ok
            ? {
                latitude: res.latitude,
                longitude: res.longitude,
                geocodeTriedAt: new Date(),
              }
            : { geocodeTriedAt: new Date() },
        });
        if (res.ok) found++;
      }
      if (rows.length)
        this.logger.log(`Geocoded ${found} of ${rows.length} restaurants`);
    } finally {
      this.running = false;
    }
    return found;
  }
}
