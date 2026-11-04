// src/services/http/userService.ts

import { api } from './apiClient';
import { ApiResponse, UserProfile } from '@shared/types/api';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  phone?: string;
}

function toBackendProfileBody(data: UpdateProfilePayload): Record<string, string | undefined> {
  const fullName =
    data.firstName != null || data.lastName != null
      ? [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
      : undefined;
  return {
    ...(fullName ? { fullName } : {}),
    ...(data.username != null ? { username: data.username } : {}),
    ...(data.bio != null ? { bio: data.bio } : {}),
    ...(data.phone != null ? { phoneNumber: data.phone } : {}),
  };
}

const userService = {
  getMe: () => api.get<ApiResponse<unknown>>('/users/me'),

  updateProfile: (data: UpdateProfilePayload) =>
    api.patch<ApiResponse<unknown>>('/users/me', toBackendProfileBody(data)),

  deleteAccount: () => api.post<ApiResponse<unknown>>('/settings/delete-account'),

  getUserById: (userId: string) => api.get<ApiResponse<unknown>>(`/users/${userId}`),

  getMyPosts: (params?: { page?: number; limit?: number }) =>
    api.get<unknown>('/users/me/posts', { params }),
};

export default userService;
