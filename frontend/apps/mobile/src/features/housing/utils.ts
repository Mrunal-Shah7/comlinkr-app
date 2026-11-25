import { rs, screenWidth } from "../../utils/responsive";
import { currencyForUser } from "../../utils/currency";

export const SW = screenWidth();
export const CARD_W = SW - rs(32); // 16px margin on each side

/** The user's currency code: the country they chose, then the one they were located in (currencyForUser). */
export function getUserCurrencyCode(user: unknown): string {
  return currencyForUser(user as Parameters<typeof currencyForUser>[0]).code;
}
