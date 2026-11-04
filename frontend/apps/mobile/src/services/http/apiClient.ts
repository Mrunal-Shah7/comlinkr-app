// src/services/http/apiClient.ts

import axios, { AxiosInstance, AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

let getSessionCookie: (() => string | null) | null = null;

export const configureSessionAuth = (sessionCookieGetter: () => string | null) => {
  getSessionCookie = sessionCookieGetter;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

function setCookieHeader(config: InternalAxiosRequestConfig, value: string): void {
  let headers = config.headers;
  if (!headers) {
    headers = new AxiosHeaders();
    config.headers = headers;
  }
  if (typeof (headers as AxiosHeaders).set === 'function') {
    (headers as AxiosHeaders).set('Cookie', value);
  } else {
    (headers as Record<string, string>).Cookie = value;
  }
}

apiClient.interceptors.request.use((config) => {
  if (getSessionCookie) {
    const cookie = getSessionCookie();
    if (cookie) {
      setCookieHeader(config, cookie);
    }
  }
  return config;
});

/** Thrown for API error bodies so callers can branch on `code` (e.g. REGION_NOT_SUPPORTED). */
export class HttpApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpApiError';
  }
}

function extractErrorMessageFromBody(data: unknown): string | null {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const err = o.error as Record<string, unknown> | undefined;
    if (err && typeof err.message === 'string') {
      const details = err.details as Array<{ field?: string; message?: string }> | undefined;
      if (Array.isArray(details) && details.length > 0) {
        const parts = details.map((d) => d.message || d.field).filter(Boolean);
        if (parts.length) return `${err.message}: ${parts.join('; ')}`;
      }
      return err.message;
    }
    if (typeof o.message === 'string') return o.message;
  }
  if (typeof data === 'string' && data.trim()) {
    const t = data.trim().slice(0, 200);
    return t.startsWith('<') ? 'Server returned HTML (wrong URL or proxy?)' : t;
  }
  return null;
}

function messageForNetworkError(error: AxiosError): string {
  const axiosMsg = error.message || 'Network error';
  const code = error.code;
  let out = `Cannot reach API at ${BASE_URL}. `;
  if (code === 'ECONNREFUSED' || axiosMsg === 'Network Error') {
    out +=
      'Is the Nest server running? On the same Wi‑Fi, use your PC LAN IP in EXPO_PUBLIC_API_BASE_URL and open port 4000 in the firewall.';
  } else if (code === 'ENOTFOUND') {
    out += 'Check the hostname in EXPO_PUBLIC_API_BASE_URL.';
  } else if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
    out += 'Request timed out — check VPN, firewall, and that the device can ping your PC.';
  } else {
    out += `${axiosMsg}${code ? ` (${code})` : ''}`;
  }
  if (Platform.OS === 'android' && BASE_URL.startsWith('http://')) {
    out += ' Android blocks cleartext HTTP unless usesCleartextTraffic is enabled (see app.config.js).';
  }
  return out;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const data = error.response?.data;
    const fromBody = extractErrorMessageFromBody(data);

    if (!error.response) {
      return Promise.reject(new Error(messageForNetworkError(error)));
    }

    if (fromBody) {
      let code = 'API_ERROR';
      if (data && typeof data === 'object') {
        const errObj = (data as Record<string, unknown>).error as Record<string, unknown> | undefined;
        if (typeof errObj?.code === 'string') code = errObj.code;
      }
      return Promise.reject(new HttpApiError(error.response.status, code, fromBody));
    }

    const status = error.response?.status;
    return Promise.reject(
      new Error(
        status
          ? `Request failed (${status}). ${typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 120)}`
          : 'Request failed'
      )
    );
  }
);

export const api = {
  get: <T>(url: string, config?: object) =>
    apiClient.get<T>(url, config).then((r) => r.data),

  post: <T>(url: string, data?: object, config?: object) =>
    apiClient.post<T>(url, data, config).then((r) => r.data),

  put: <T>(url: string, data?: object, config?: object) =>
    apiClient.put<T>(url, data, config).then((r) => r.data),

  patch: <T>(url: string, data?: object, config?: object) =>
    apiClient.patch<T>(url, data, config).then((r) => r.data),

  delete: <T>(url: string, config?: object) =>
    apiClient.delete<T>(url, config).then((r) => r.data),
};

export default apiClient;
