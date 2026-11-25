// The currency prices are shown in for this user: the country they chose, then the country they were located in,
// then a guest's chosen city's country, then US dollars (see currencyForUser).
import { useMemo } from "react";
import { useAuthStore } from "../store/auth.store";
import { useGuestLocationStore } from "../store/guestLocation.store";
import { currencyForUser, type CurrencyInfo } from "../utils/currency";

export function useUserCurrency(): CurrencyInfo {
  const user = useAuthStore((s) => s.user);
  const guestCountry = useGuestLocationStore((s) => s.country);
  return useMemo(() => currencyForUser(user as Parameters<typeof currencyForUser>[0], guestCountry), [user, guestCountry]);
}

/** The same, read once outside React (mappers that build rows from API data). */
export function userCurrencyNow(): CurrencyInfo {
  return currencyForUser(
    useAuthStore.getState().user as Parameters<typeof currencyForUser>[0],
    useGuestLocationStore.getState().country,
  );
}
