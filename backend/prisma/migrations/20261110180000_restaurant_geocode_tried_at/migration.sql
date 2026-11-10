-- Plan 13 (TR-032): when a restaurant address was last sent to the geocoder.
ALTER TABLE "Restaurant" ADD COLUMN "geocodeTriedAt" TIMESTAMP(3);
