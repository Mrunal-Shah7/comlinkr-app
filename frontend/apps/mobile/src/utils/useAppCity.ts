// src/utils/useAppCity.ts - single resolver for the city every tab scopes its content to (REL-06).
// Signed-in users: their saved profile city. Guests: the city they picked. Otherwise: no city (no silent default).
import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/auth.store';
import { useGuestLocationStore } from '../store/guestLocation.store';

export function useAppCity(openGuestPicker?: () => void): {
  city: string;
  hasCity: boolean;
  isGuest: boolean;
  chooseCity: () => void;
} {
  const user = useAuthStore((s) => s.user);
  const guestCity = useGuestLocationStore((s) => s.city);
  const city = (user?.city && user.city.trim()) || guestCity || '';
  const isGuest = !user;

  // Signed-in users edit their saved location in the profile editor; guests use the city picker.
  const chooseCity = useCallback(() => {
    if (isGuest) openGuestPicker?.();
    else router.push('/edit-profile' as never);
  }, [isGuest, openGuestPicker]);

  return { city, hasCity: city.length > 0, isGuest, chooseCity };
}
