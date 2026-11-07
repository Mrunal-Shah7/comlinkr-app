/**
 * Base API client (Expo Router / app directory)
 *
 * Expects Nest `TransformInterceptor` + `HttpExceptionFilter` shapes.
 * Auth: session cookie stored in SecureStore, sent as `Cookie` on protected routes.
 */

import * as SecureStore from "expo-secure-store";
import { router } from "expo-router"; // SPRINT-27

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const DEBUG_API =
  process.env.EXPO_PUBLIC_DEBUG_API === "true" ||
  (__DEV__ && process.env.EXPO_PUBLIC_DEBUG_API !== "false");

const SESSION_KEY =
  process.env.EXPO_PUBLIC_SESSION_COOKIE_STORAGE_KEY ?? "comlinkr_session_cookie";

// SPRINT-27: prevent 401 redirect loops
let sessionExpiryHandled = false;

export function resetSessionExpiryGuard(): void {
  sessionExpiryHandled = false;
}

async function handleSessionExpired(): Promise<void> {
  if (sessionExpiryHandled) return;
  const { useAuthStore } = await import("../store/auth.store"); // SPRINT-27: avoid circular import
  // Guests were never signed in — a 401 on a personalized/protected call is expected,
  // not an expired session. Only force the login redirect for someone who WAS authed.
  if (!useAuthStore.getState().isAuthed) return;
  sessionExpiryHandled = true;
  await useAuthStore.getState().clearLocalAuth();
  router.replace("/(auth)/login");
}

const SENSITIVE_KEYS = /pass(word)?|secret|token|code|cookie|otp|signature|authorization|ssn|identity/i;

/** SEC-08: strip credentials/PII from diagnostic request bodies. */
function redactBody(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) return value ?? null;
  if (Array.isArray(value)) return value.map((v) => redactBody(v, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SENSITIVE_KEYS.test(k) ? "[redacted]" : redactBody(v, depth + 1),
      ]),
    );
  }
  return value;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getSessionCookie(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function setSessionCookie(cookie: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, cookie);
}

/** @deprecated Use clearSession */
export async function clearTokens(): Promise<void> {
  await clearSession();
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    /* missing key */
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

// A request the network never answers would otherwise leave its screen spinning forever.
const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

/** fetch with a deadline; a timeout surfaces as ApiError(0, "TIMEOUT") so screens show their error state. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(0, "TIMEOUT", "The server took too long to answer. Check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

interface RequestOptions {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  public?: boolean;
}

async function buildHeaders(isPublic: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (!isPublic) {
    const cookie = await getSessionCookie();
    if (cookie) headers["Cookie"] = cookie;
  }
  return headers;
}

function unwrapSuccess(json: Record<string, unknown>): unknown {
  if (json.success === true && "data" in json) {
    const data = json.data;
    if (json.meta !== undefined) {
      // Pagination responses come in as: { success: true, data: [...], meta: {...} }.
      // Preserve `data` as-is (do not spread arrays), since callers expect `res.data`.
      // SPRINT-41: Sessions list also returns top-level `truncated` — keep it beside data/meta.
      const unwrapped: Record<string, unknown> = { data, meta: json.meta }; // SPRINT-41:
      if ("truncated" in json) { // SPRINT-41:
        unwrapped.truncated = json.truncated; // SPRINT-41:
      } // SPRINT-41:
      return unwrapped; // SPRINT-41:
    }
    if (json.nextCursor !== undefined && Array.isArray(data)) {
      return { data, nextCursor: json.nextCursor };
    }
    return data;
  }
  return json;
}

async function parseResponse<T>(res: Response, isPublic = false): Promise<T> {
  const text = await res.text();
  let json: Record<string, unknown> = {};

  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (!res.ok) throw new ApiError(res.status, "PARSE_ERROR", text || res.statusText);
  }

  if (!res.ok) {
    // SPRINT-27: global 401 — clear auth and redirect (skip public auth endpoints)
    if (res.status === 401 && !isPublic) {
      void handleSessionExpired();
    }
    const err = json.error as Record<string, unknown> | undefined;
    throw new ApiError(
      res.status,
      (err?.code as string) ?? "API_ERROR",
      (err?.message as string) ?? (typeof json.message === "string" ? json.message : res.statusText),
      err?.details
    );
  }

  return unwrapSuccess(json) as T;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers: extra = {}, public: isPublic = false } = options;
  const url = path.startsWith("http") ? path : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const startedAt = Date.now();

  const headers = await buildHeaders(isPublic);
  Object.assign(headers, extra);

  if (DEBUG_API) {
    // Keep logs concise and avoid exposing session cookie content.
    const safeHeaders = { ...headers };
    if ("Cookie" in safeHeaders) safeHeaders.Cookie = "[redacted]";
    // eslint-disable-next-line no-console
    console.log(`[API] -> ${method} ${url}`, {
      public: isPublic,
      headers: safeHeaders,
      body: redactBody(body),
    });
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method,
        headers,
        credentials: "include",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      REQUEST_TIMEOUT_MS,
    );
  } catch (error) {
    if (DEBUG_API) {
      // eslint-disable-next-line no-console
      console.log(`[API] xx ${method} ${url} (${Date.now() - startedAt}ms)`, error);
    }
    throw error;
  }

  if (DEBUG_API) {
    // eslint-disable-next-line no-console
    console.log(`[API] <- ${res.status} ${method} ${url} (${Date.now() - startedAt}ms)`);
  }

  try {
    return await parseResponse<T>(res, isPublic);
  } catch (error) {
    if (DEBUG_API) {
      // eslint-disable-next-line no-console
      console.log(`[API] !! ${method} ${url} parse/error`, error);
    }
    throw error;
  }
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),

  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),

  delete: <T>(path: string, opts?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

/** POST multipart (e.g. avatar). Do not set Content-Type — boundary is set automatically. */
export async function postFormData<T = unknown>(path: string, formData: FormData): Promise<T> {
  const cookie = await getSessionCookie();
  const url = path.startsWith("http")
    ? path
    : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetchWithTimeout(
    url,
    { method: "POST", headers, body: formData, credentials: "include" },
    UPLOAD_TIMEOUT_MS,
  );
  return parseResponse<T>(res, false);
}
