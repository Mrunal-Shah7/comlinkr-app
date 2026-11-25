type CurrencyInfo = { code: string; symbol: string };

const USD: CurrencyInfo = { code: 'USD', symbol: '$' };
const GBP: CurrencyInfo = { code: 'GBP', symbol: '£' };
const EUR: CurrencyInfo = { code: 'EUR', symbol: '€' };

/** ISO 3166 country code → the currency prices there are quoted in. */
const COUNTRY_CODE_TO_CURRENCY: Record<string, CurrencyInfo> = {
  US: USD,
  GB: GBP,
  IN: { code: 'INR', symbol: '₹' },
  CA: { code: 'CAD', symbol: '$' },
  AU: { code: 'AUD', symbol: '$' },
  NZ: { code: 'NZD', symbol: '$' },
  SG: { code: 'SGD', symbol: '$' },
  AE: { code: 'AED', symbol: 'AED ' },
  IE: EUR, DE: EUR, FR: EUR, ES: EUR, IT: EUR, NL: EUR, BE: EUR, PT: EUR, AT: EUR, FI: EUR,
};

/** Currency for a country code; US dollars when the code is unknown. */
export function getCurrencyForCountry(
  countryCode: string | null | undefined,
): CurrencyInfo {
  return COUNTRY_CODE_TO_CURRENCY[(countryCode ?? '').trim().toUpperCase()] ?? USD;
}

/** The symbol written before an amount in this currency ("$", "£", "AED "); the code itself when unknown. */
export function currencySymbol(currencyCode: string | null | undefined): string {
  const code = (currencyCode ?? '').trim().toUpperCase();
  if (!code) return '$';
  return Object.values(COUNTRY_CODE_TO_CURRENCY).find((c) => c.code === code)?.symbol ?? `${code} `;
}

/**
 * "$1,250", "£650", "€12.50". The symbol comes from the currency, not the phone's locale: `Intl` wrote "US$15" on a
 * phone set to British English, which read as a different currency.
 */
export function formatPrice(price: number, currencyCode: string): string {
  const n = Number(price || 0);
  const digits = Number.isInteger(n) ? 0 : 2;
  return `${currencySymbol(currencyCode)}${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function getPriceRangeSymbol(
  priceRange: string | null | undefined,
  countryCode: string | null | undefined,
): string {
  if (!priceRange) return '—';
  if (countryCode === 'GB') return priceRange.replace(/\$/g, '£');
  return priceRange;
}

const COUNTRY_NAME_TO_CURRENCY: Record<string, CurrencyInfo> = {
  'united states': { code: 'USD', symbol: '$' },
  us: { code: 'USD', symbol: '$' },
  usa: { code: 'USD', symbol: '$' },
  gb: { code: 'GBP', symbol: '£' },
  uk: { code: 'GBP', symbol: '£' },
  in: { code: 'INR', symbol: '₹' },
  'united kingdom': { code: 'GBP', symbol: '£' },
  india: { code: 'INR', symbol: '₹' },
  canada: { code: 'CAD', symbol: '$' },
  australia: { code: 'AUD', symbol: '$' },
  ireland: { code: 'EUR', symbol: '€' },
  germany: { code: 'EUR', symbol: '€' },
  france: { code: 'EUR', symbol: '€' },
  spain: { code: 'EUR', symbol: '€' },
  italy: { code: 'EUR', symbol: '€' },
  netherlands: { code: 'EUR', symbol: '€' },
  'united arab emirates': { code: 'AED', symbol: 'AED ' },
  'new zealand': { code: 'NZD', symbol: '$' },
  belgium: EUR,
  portugal: EUR,
  austria: EUR,
  finland: EUR,
  singapore: { code: 'SGD', symbol: '$' },
};

/** Currency of a business, from its own ISO code or its country name. Null when it cannot be determined (never guess from the viewer). */
export function getBusinessCurrency(
  currencyCode: string | null | undefined,
  countryName: string | null | undefined,
): CurrencyInfo | null {
  if (currencyCode && /^[A-Z]{3}$/.test(currencyCode)) {
    const known = Object.values(COUNTRY_NAME_TO_CURRENCY).find((c) => c.code === currencyCode);
    return known ?? { code: currencyCode, symbol: currencyCode };
  }
  return COUNTRY_NAME_TO_CURRENCY[(countryName ?? '').trim().toLowerCase()] ?? null;
}

type UserLike = { country?: string | null; countryCode?: string | null; userLocation?: { countryCode?: string | null } | null } | null | undefined;

/**
 * The currency of the country the user chose (profile or onboarding), then of the country the phone located them
 * in, then US dollars. The chosen country comes first: the located one used to win, so changing the country
 * did not change the prices.
 */
export function currencyForUser(user: UserLike, guestCountry?: string | null): CurrencyInfo {
  const byName = (name?: string | null) => COUNTRY_NAME_TO_CURRENCY[(name ?? '').trim().toLowerCase()];
  return byName(user?.country)
    ?? (user?.countryCode || user?.userLocation?.countryCode ? getCurrencyForCountry((user?.countryCode || user?.userLocation?.countryCode) as string) : undefined)
    ?? byName(guestCountry)
    ?? USD;
}

export type { CurrencyInfo };
