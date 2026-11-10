// src/features/location/detectLocation.ts — plan 08 (TR-042): the user's city comes from the phone's location.
//
// Asks for the "while using the app" permission, reads one position, and turns it into a city with the phone's own
// reverse geocoder (expo-location), so the coordinates are not sent to a third party by the app.
//
// Development only: EXPO_PUBLIC_DEV_LOCATION="lat,lng" stands in for the GPS in a development build (__DEV__), so the
// app can be tested from outside the US and UK. Release builds ignore it.
import * as Location from 'expo-location';
import { Linking } from 'react-native';

export type DetectedLocation = {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  countryCode: string;
};

export type DetectResult =
  | { ok: true; location: DetectedLocation }
  | { ok: false; reason: 'denied' | 'blocked' | 'services-off' | 'no-fix' | 'no-city'; message: string };

const MESSAGES = {
  denied: 'ComLinkr needs your location to set your city. Allow it and try again.',
  blocked: 'Location is turned off for ComLinkr. Open settings, allow location, then try again.',
  'services-off': 'Your phone\'s location is off. Turn it on and try again.',
  'no-fix': 'Could not find your location. Move somewhere with a clearer signal and try again.',
  'no-city': 'Could not tell which city you are in. Try again in a moment.',
} as const;

function fail(reason: keyof typeof MESSAGES): DetectResult {
  return { ok: false, reason, message: MESSAGES[reason] };
}

function devCoordinates(): { latitude: number; longitude: number } | null {
  if (!__DEV__) return null;
  const raw = process.env.EXPO_PUBLIC_DEV_LOCATION?.trim();
  if (!raw) return null;
  const [lat, lng] = raw.split(',').map((x) => Number(x.trim()));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
}

export type PositionResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: 'denied' | 'blocked' | 'services-off' | 'no-fix' };

/**
 * One reading of the phone's position, asking for the "while using the app" permission first. Plan 13 (TR-032) uses
 * it for Nearby in Food; the position stays on the phone.
 */
export async function currentPosition(): Promise<PositionResult> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') return { ok: false, reason: perm.canAskAgain === false ? 'blocked' : 'denied' };
  const dev = devCoordinates();
  if (dev) return { ok: true, ...dev };
  if (!(await Location.hasServicesEnabledAsync())) return { ok: false, reason: 'services-off' };
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    const last = await Location.getLastKnownPositionAsync().catch(() => null);
    if (!last) return { ok: false, reason: 'no-fix' };
    return { ok: true, latitude: last.coords.latitude, longitude: last.coords.longitude };
  }
}

export async function detectLocation(): Promise<DetectResult> {
  const pos = await currentPosition();
  if (!pos.ok) return fail(pos.reason);
  const coords = { latitude: pos.latitude, longitude: pos.longitude };

  const places = await Location.reverseGeocodeAsync(coords).catch(() => []);
  const p = places[0];
  // Android's geocoder sometimes leaves `city` empty and gives the town as `subregion` or `district`.
  const city = (p?.city || p?.subregion || p?.district || '').trim();
  if (!p || !city || !p.country) return fail('no-city');
  return {
    ok: true,
    location: {
      ...coords,
      city,
      state: (p.region || p.subregion || city).trim(),
      country: p.country.trim(),
      countryCode: (p.isoCountryCode || '').trim().toUpperCase(),
    },
  };
}

/** The phone's settings page for this app, where a blocked location permission is turned back on. */
export function openLocationSettings(): void {
  void Linking.openSettings();
}

/**
 * Detect the location, save it as the signed-in user's city (source GPS) and refresh the stored user. Returns the
 * detection's failure for the caller to show, or null on success.
 */
export async function refreshCityFromLocation(): Promise<Extract<DetectResult, { ok: false }> | null> {
  const res = await detectLocation();
  if (!res.ok) return res;
  const [{ updateCityFromLocation }, { getMyFullProfile, mergeFullProfileIntoUser }, { useAuthStore }] = await Promise.all([
    import('../../services/http/onboardingService'),
    import('../../api/meProfile.api'),
    import('../../store/auth.store'),
  ]);
  await updateCityFromLocation(res.location);
  const fresh = await getMyFullProfile();
  await useAuthStore.getState().applyUser(mergeFullProfileIntoUser(fresh, useAuthStore.getState().user));
  return null;
}
