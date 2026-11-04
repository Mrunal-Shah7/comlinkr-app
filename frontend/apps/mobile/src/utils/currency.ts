type CurrencyInfo = { code: string; symbol: string };

export function getCurrencyForCountry(
  countryCode: string | null | undefined,
): CurrencyInfo {
  if (countryCode === 'GB') return { code: 'GBP', symbol: '£' };
  return { code: 'USD', symbol: '$' };
}

export function formatPrice(price: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    const symbol = currencyCode === 'GBP' ? '£' : '$';
    return `${symbol}${Number(price || 0).toLocaleString()}`;
  }
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
  'united arab emirates': { code: 'AED', symbol: 'AED' },
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
