/**
 * Auth API (aligned with Nest `/api/auth/*`)
 *
 * Login: POST /auth/login { identifier, password }
 * Register: POST /auth/register/initiate → POST /auth/register/verify
 * Profile updates: PATCH /users/me (see profile flows / onboarding module)
 */

import { api, setSessionCookie, clearSession, resetSessionExpiryGuard } from "./client";

export interface LoginPayload {
  /** Email or username — sent as `identifier`. */
  email: string;
  password: string;
}

export interface RegisterInitiatePayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

export interface RegisterVerifyPayload extends RegisterInitiatePayload {
  code: string;
}

/** Backend `UserResponse` (subset used by the app). */
export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
  phoneNumber?: string | null;
  role: string;
  onboardingDone: boolean;
  createdAt: string;
}

export type LoginResponse = { user: AuthUser; sessionCookie: string };

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>(
    "/auth/login",
    { identifier: payload.email.trim(), password: payload.password },
    { public: true }
  );
  await setSessionCookie(res.sessionCookie);
  resetSessionExpiryGuard(); // SPRINT-27
  return res;
}

export async function registerInitiate(payload: RegisterInitiatePayload): Promise<{ message: string }> {
  return api.post<{ message: string }>(
    "/auth/register/initiate",
    {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      fullName: payload.fullName.trim(),
      username: payload.username.trim().toLowerCase(),
    },
    { public: true }
  );
}

export async function registerVerify(payload: RegisterVerifyPayload): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>(
    "/auth/register/verify",
    {
      email: payload.email.trim().toLowerCase(),
      code: payload.code,
      password: payload.password,
      fullName: payload.fullName.trim(),
      username: payload.username.trim().toLowerCase(),
    },
    { public: true }
  );
  await setSessionCookie(res.sessionCookie);
  resetSessionExpiryGuard(); // SPRINT-27
  return res;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    await clearSession();
  }
}

export async function getMe(): Promise<AuthUser> {
  return api.get<AuthUser>("/auth/me");
}
