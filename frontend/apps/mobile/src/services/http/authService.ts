// src/services/http/authService.ts

import { api } from './apiClient';
import {
  ApiResponse,
  SessionCookieHeader,
  UserProfile,
  LoginRequest,
  RegisterInitiatePayload,
  RegisterVerifyPayload,
} from '@shared/types/api';

/** Backend auth user (session login payload). */
export interface BackendAuthUser {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  phoneNumber?: string | null;
  role: string;
  onboardingDone: boolean;
  createdAt: string;
  /** From `UserLocation` when the user has completed location onboarding. */
  city?: string | null;
}

export type AuthPayload = { user: BackendAuthUser; sessionCookie: SessionCookieHeader };
export type OAuthNeedsUsername = { needsUsername: true; tempToken: string };

function unwrapData<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body && (body as { success?: boolean }).success === true) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** Map GET /auth/me (or onboarding complete) user payload into app UserProfile. */
export function profileFromBackendAuthUser(u: BackendAuthUser): UserProfile {
  return mapAuthUser(u);
}

function mapAuthUser(u: BackendAuthUser): UserProfile {
  const parts = (u.name || '').trim().split(/\s+/);
  const firstName = parts[0] || u.username;
  const lastName = parts.slice(1).join(' ') || '';
  const created =
    typeof u.createdAt === 'string' ? u.createdAt : new Date(u.createdAt as unknown as string).toISOString();
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    firstName,
    lastName,
    role: (u.role || 'USER') as UserProfile['role'],
    isVerified: false,
    isActive: true,
    onboardingDone: u.onboardingDone,
    avatar: u.avatarUrl ?? undefined,
    bio: u.bio ?? undefined,
    phone: u.phoneNumber ?? undefined,
    city: u.city?.trim() || undefined,
    createdAt: created,
    updatedAt: created,
  };
}

function wrapAuthSuccess(
  inner: AuthPayload,
): ApiResponse<{ user: UserProfile; sessionCookie: SessionCookieHeader }> {
  return {
    success: true,
    message: 'OK',
    data: {
      user: mapAuthUser(inner.user),
      sessionCookie: inner.sessionCookie,
    },
    timestamp: new Date().toISOString(),
  };
}

function isOAuthNeedsUsername(value: unknown): value is OAuthNeedsUsername {
  return (
    !!value &&
    typeof value === 'object' &&
    'needsUsername' in value &&
    (value as { needsUsername?: unknown }).needsUsername === true &&
    typeof (value as { tempToken?: unknown }).tempToken === 'string'
  );
}

const authService = {
  login: async (data: LoginRequest) => {
    const body = await api.post<{ success: boolean; data: AuthPayload }>('/auth/login', {
      identifier: data.email.trim(),
      password: data.password,
    });
    const inner = unwrapData<AuthPayload>(body);
    return wrapAuthSuccess(inner);
  },

  registerInitiate: (data: RegisterInitiatePayload) =>
    api.post<{ success: boolean; data?: { message?: string }; message?: string }>(
      '/auth/register/initiate',
      {
        email: data.email.trim().toLowerCase(),
        password: data.password,
        fullName: data.fullName.trim(),
        username: data.username.trim().toLowerCase(),
      }
    ),

  registerVerify: async (data: RegisterVerifyPayload) => {
    const body = await api.post<{ success: boolean; data: AuthPayload }>('/auth/register/verify', {
      email: data.email.trim().toLowerCase(),
      code: data.code,
      password: data.password,
      fullName: data.fullName.trim(),
      username: data.username.trim().toLowerCase(),
    });
    const inner = unwrapData<AuthPayload>(body);
    return wrapAuthSuccess(inner);
  },

  googleAuth: async (
    idToken: string,
  ): Promise<
    | ApiResponse<{ user: UserProfile; sessionCookie: SessionCookieHeader }>
    | OAuthNeedsUsername
  > => {
    const body = await api.post<
      { success: boolean; data: AuthPayload | OAuthNeedsUsername } | AuthPayload | OAuthNeedsUsername
    >('/auth/google', { idToken });
    const inner = unwrapData<AuthPayload | OAuthNeedsUsername>(body);
    if (isOAuthNeedsUsername(inner)) return inner;
    return wrapAuthSuccess(inner);
  },

  googleComplete: async (tempToken: string, username: string) => {
    const body = await api.post<{ success: boolean; data: AuthPayload }>('/auth/google/complete', {
      tempToken,
      username: username.trim().toLowerCase(),
    });
    const inner = unwrapData<AuthPayload>(body);
    return wrapAuthSuccess(inner);
  },

  appleAuth: async (
    idToken: string,
    fullName?: string | null,
    authorizationCode?: string | null, // SPRINT-39: optional Apple authorization code for refresh-token exchange
  ): Promise<
    | ApiResponse<{ user: UserProfile; sessionCookie: SessionCookieHeader }>
    | OAuthNeedsUsername
  > => {
    // SPRINT-39: build body additively; omit authorizationCode entirely when absent (never send null)
    const requestBody: { idToken: string; fullName?: string; authorizationCode?: string } = {
      idToken,
      fullName: fullName ?? undefined,
    };
    if (typeof authorizationCode === 'string' && authorizationCode.trim().length > 0) {
      requestBody.authorizationCode = authorizationCode.trim(); // SPRINT-39:
    }
    const body = await api.post<
      { success: boolean; data: AuthPayload | OAuthNeedsUsername } | AuthPayload | OAuthNeedsUsername
    >('/auth/apple', requestBody);
    const inner = unwrapData<AuthPayload | OAuthNeedsUsername>(body);
    if (isOAuthNeedsUsername(inner)) return inner;
    return wrapAuthSuccess(inner);
  },

  appleComplete: async (tempToken: string, username: string) => {
    const body = await api.post<{ success: boolean; data: AuthPayload }>('/auth/apple/complete', {
      tempToken,
      username: username.trim().toLowerCase(),
    });
    const inner = unwrapData<AuthPayload>(body);
    return wrapAuthSuccess(inner);
  },

  logout: () => api.post<{ success?: boolean }>('/auth/logout'),

  getMe: async () => {
    const body = await api.get<{ success: boolean; data: BackendAuthUser }>('/auth/me');
    const u = unwrapData<BackendAuthUser>(body);
    return {
      success: true as const,
      message: 'OK',
      data: profileFromBackendAuthUser(u),
      timestamp: new Date().toISOString(),
    } as ApiResponse<UserProfile>;
  },

  forgotPassword: (email: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email: email.trim().toLowerCase() }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post<ApiResponse<null>>('/auth/reset-password', {
      email: email.trim().toLowerCase(),
      code,
      newPassword,
    }),
};

export default authService;
