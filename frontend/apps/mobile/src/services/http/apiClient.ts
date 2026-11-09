// src/services/http/apiClient.ts
//
// The auth and onboarding services' client, now a thin layer over the app's fetch client (src/api/client.ts):
// one HTTP stack, no axios (expo-data-fetching). It keeps what these callers relied on:
// - the raw response body, not unwrapped (authService and onboardingService unwrap `{ success, data }` themselves);
// - validation details joined into the error message ("Validation failed: email must be an email");
// - a readable message when the API cannot be reached at all;
// - `HttpApiError` with `status` and `code` (onboarding branches on REGION_NOT_SUPPORTED).

import { ApiError, request } from '../../api/client';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

/** Thrown for API error bodies so callers can branch on `code`. Same class as the fetch client's `ApiError`. */
export const HttpApiError = ApiError;
export type HttpApiError = ApiError;

function withDetails(e: ApiError): ApiError {
  const details = e.details as Array<{ field?: string; message?: string }> | undefined;
  if (!Array.isArray(details) || details.length === 0) return e;
  const parts = details.map((d) => d.message || d.field).filter(Boolean);
  return parts.length ? new ApiError(e.status, e.code, `${e.message}: ${parts.join('; ')}`, e.details) : e;
}

function networkMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Network error';
  let out = `Cannot reach API at ${BASE_URL}. `;
  out += /network request failed/i.test(raw)
    ? 'Is the Nest server running? On the same Wi-Fi, use your PC LAN IP in EXPO_PUBLIC_API_BASE_URL and open port 4000 in the firewall.'
    : raw;
  if (process.env.EXPO_OS === 'android' && BASE_URL.startsWith('http://')) {
    out += ' Android blocks cleartext HTTP unless usesCleartextTraffic is enabled (see app.config.js).';
  }
  return out;
}

async function call<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: object): Promise<T> {
  try {
    return await request<T>(url, { method, body, raw: true });
  } catch (e) {
    if (e instanceof ApiError) throw withDetails(e);
    throw new Error(networkMessage(e));
  }
}

export const api = {
  get: <T>(url: string) => call<T>('GET', url),
  post: <T>(url: string, data?: object) => call<T>('POST', url, data),
  put: <T>(url: string, data?: object) => call<T>('PUT', url, data),
  patch: <T>(url: string, data?: object) => call<T>('PATCH', url, data),
  delete: <T>(url: string) => call<T>('DELETE', url),
};
