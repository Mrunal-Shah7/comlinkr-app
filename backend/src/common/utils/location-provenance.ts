// src/common/utils/location-provenance.ts — plan 08 (TR-042): a city sent with the phone's coordinates was detected
// from its location (GPS); one sent without them was typed (MANUAL), as older app versions still do.
import { LocationSource } from '@prisma/client';

export function locationProvenance(dto: {
  latitude?: number;
  longitude?: number;
}): {
  source: LocationSource;
  latitude: number | null;
  longitude: number | null;
} {
  const gps =
    typeof dto.latitude === 'number' && typeof dto.longitude === 'number';
  return {
    source: gps ? LocationSource.GPS : LocationSource.MANUAL,
    latitude: gps ? dto.latitude! : null,
    longitude: gps ? dto.longitude! : null,
  };
}
