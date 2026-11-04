// src/utils/phoneValidation.ts
// Market-aware phone number validation for badge verification forms.
// US validation follows NANP (North American Numbering Plan, per NANPA/FCC rules).
// UK validation follows Ofcom's National Telephone Numbering Plan.

export type MarketCode = string;

export interface PhoneValidationResult {
  valid: boolean;
  /** E.164-formatted number, only set when valid: true */
  e164?: string;
  error?: string;
}

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * NANP rules (US/Canada):
 * - 10 digits: NXX-NXX-XXXX where N = 2-9, X = 0-9
 * - Area code and exchange code cannot start with 0 or 1
 * - Area code and exchange code cannot have both middle digits as 9 (N9X reserved historically, but not enforced broadly)
 * - Optional leading "1" country code
 */
function validateUS(raw: string): PhoneValidationResult {
  let d = digitsOnly(raw);

  if (d.length === 11 && d.startsWith("1")) {
    d = d.slice(1);
  }

  if (d.length !== 10) {
    return { valid: false, error: "Enter a valid 10-digit US phone number, e.g. (555) 123-4567." };
  }

  const areaCode = d.slice(0, 3);
  const exchangeCode = d.slice(3, 6);
  const lineNumber = d.slice(6, 10);

  const areaFirst = areaCode[0];
  const exchangeFirst = exchangeCode[0];

  if (areaFirst === "0" || areaFirst === "1") {
    return { valid: false, error: "Invalid area code — US area codes cannot start with 0 or 1." };
  }
  if (exchangeCode[1] === "1" && exchangeCode[2] === "1") {
    return { valid: false, error: "Invalid phone number — exchange code cannot be an N11 service code (e.g. 911, 411)." };
  }
  if (exchangeFirst === "0" || exchangeFirst === "1") {
    return { valid: false, error: "Invalid phone number — the exchange code cannot start with 0 or 1." };
  }
  if (/^(\d)\1{9}$/.test(d)) {
    return { valid: false, error: "Enter a real phone number." };
  }

  return { valid: true, e164: `+1${areaCode}${exchangeCode}${lineNumber}` };
}

/**
 * UK rules (Ofcom National Telephone Numbering Plan):
 * - Mobile: 07xxx xxxxxx (11 digits starting 07), maps to +447xxxxxxxxx (10 digits after +44)
 * - Landline/geographic & non-geographic (02x, 01xxx, 03xx, 08xx): 10-11 digits starting with 0
 * - Country code +44 drops the leading 0 of the trunk prefix
 */
function validateUK(raw: string): PhoneValidationResult {
  let d = digitsOnly(raw);

  if (d.startsWith("44")) {
    d = "0" + d.slice(2);
  } else if (d.startsWith("0044")) {
    d = "0" + d.slice(4);
  }

  if (!d.startsWith("0")) {
    return { valid: false, error: "Enter a valid UK phone number starting with 0 (or +44), e.g. 07700 900000." };
  }

  const nsn = d.slice(1); // national significant number, after trunk 0

  const isMobile = /^7\d{9}$/.test(nsn);
  const isValidLength = nsn.length === 9 || nsn.length === 10;

  if (d.length === 11 && (isMobile || /^[1238]\d{8,9}$/.test(nsn))) {
    // valid geographic/mobile/non-geographic number
  } else if (!(isValidLength && /^[1238]\d+$/.test(nsn))) {
    return { valid: false, error: "Enter a valid UK phone number, e.g. 07700 900000 or 020 7946 0958." };
  }

  if (d.length !== 11) {
    return { valid: false, error: "UK phone numbers must have 11 digits including the leading 0 (e.g. 07700 900000)." };
  }

  if (/^0(\d)\1{9}$/.test(d)) {
    return { valid: false, error: "Enter a real phone number." };
  }

  return { valid: true, e164: `+44${nsn}` };
}

/**
 * India: 10-digit mobile numbers starting 6-9, optional +91 / 91 / 0 prefix.
 */
function validateIN(raw: string): PhoneValidationResult {
  let d = digitsOnly(raw);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);

  if (d.length !== 10) {
    return { valid: false, error: "Enter a valid 10-digit Indian mobile number, e.g. 98765 43210." };
  }
  if (!/^[6-9]/.test(d)) {
    return { valid: false, error: "Indian mobile numbers must start with 6, 7, 8 or 9." };
  }
  if (/^(\d)\1{9}$/.test(d) || "01234567890123456789".includes(d) || "98765432109876543210".includes(d)) {
    return { valid: false, error: "Enter a real phone number." };
  }
  return { valid: true, e164: `+91${d}` };
}

/**
 * Validates a phone number according to the numbering plan rules of the given market.
 * Falls back to a loose international check (E.164-ish, 8-15 digits) for markets
 * without a dedicated validator yet.
 */
export function validatePhoneNumber(raw: string, market: MarketCode): PhoneValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: "Phone number is required." };
  }

  if (market === "US") return validateUS(trimmed);
  if (market === "UK") return validateUK(trimmed);
  if (market === "IN") return validateIN(trimmed);

  const d = digitsOnly(trimmed);
  if (d.length < 8 || d.length > 15) {
    return { valid: false, error: "Enter a valid phone number (8–15 digits, include your country code)." };
  }
  if (/^(\d)\1+$/.test(d) || "01234567890123456789".includes(d) || "98765432109876543210".includes(d)) {
    return { valid: false, error: "Enter a real phone number." };
  }
  return { valid: true, e164: trimmed.startsWith("+") ? trimmed : `+${d}` };
}

export function formatPhoneHint(market: MarketCode): string {
  if (market === "US") return "US format: (555) 123-4567 or +1 555 123 4567";
  if (market === "UK") return "UK format: 07700 900000 or +44 7700 900000";
  if (market === "IN") return "India format: 98765 43210 or +91 98765 43210";
  return "Include country code, e.g. +1 555 123 4567";
}

// New:
/**
 * Maximum number of raw digits allowed while typing, per market.
 */
function maxDigitsForMarket(market: MarketCode): number {
  if (market === "US") return 11;
  if (market === "UK") return 13;
  if (market === "IN") return 12;
  return 15;
}

export function sanitizePhoneInput(raw: string, market: MarketCode): string {
  const hasLeadingPlus = raw.trim().startsWith("+");
  const digits = digitsOnly(raw).slice(0, maxDigitsForMarket(market));
  return hasLeadingPlus ? `+${digits}` : digits;
}