import { rs, screenWidth } from "../../utils/responsive";
import { getCurrencyForCountry } from "../../utils/currency";

export const SW = screenWidth();
export const CARD_W = SW - rs(32); // 16px margin on each side

export function getUserCurrencyCode(user: unknown): string {
  const u = user as { userLocation?: { countryCode?: string | null } | null; country?: string | null } | null;
  const countryCode =
    u?.userLocation?.countryCode ??
    (u?.country === "United Kingdom" ? "GB" : "US");
  return getCurrencyForCountry(countryCode).code;
}
