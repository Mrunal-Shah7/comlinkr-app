// src/services/http/notificationService.ts

import { api } from './apiClient';
import { ApiResponse, PaginatedResponse } from '@shared/types/api';

/** In-app notification row from GET /notifications (shape depends on backend). */
export type InAppNotification = Record<string, unknown>;

const notificationService = {
  getNotifications: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<InAppNotification>>('/notifications', { params }),

  markAsRead: (notificationId: string) =>
    api.patch<ApiResponse<null>>(`/notifications/${notificationId}/read`),

  markAllAsRead: () => api.patch<ApiResponse<null>>('/notifications/read-all'),

  getUnreadCount: () =>
    api.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count'),

  getPreferences: () => api.get<ApiResponse<unknown>>('/notifications/preferences'),

  updatePreferences: (body: unknown) =>
    api.patch<ApiResponse<unknown>>('/notifications/preferences', body as object),
};

export default notificationService;
