/**
 * Notifications API
 *
 * Endpoints:
 *   GET    /notifications               — list notifications (paginated)
 *   PATCH  /notifications/:id/read      — mark one as read
 *   PATCH  /notifications/read-all      — mark all as read
 *   DELETE /notifications/:id           — delete one notification
 *   DELETE /notifications               — clear all notifications
 *   GET    /notifications/unread-count  — badge count
 *   POST   /notifications/push-token    — register push token
 *   DELETE /notifications/push-token    — unregister push token
 */

import { api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "event"
  | "housing"
  | "community"
  | "system"
  | "registration"
  | "badge"
  | "message"
  | "report"
  | "reservation_new"       // owner gets this when user books a table
  | "reservation_confirmed" // user gets this when owner confirms
  | "reservation_cancelled"; // user gets this when owner cancels

export interface AppNotification {
  id: string;
  type: NotificationType;
  emoji: string;
  title: string;
  desc: string;
  read: boolean;
  /** Deep-link target (e.g. post id, listing id) */
  targetId?: string;
  targetType?: string;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** Raw row from Nest `NotificationsService.getNotifications` */
interface BackendNotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

const PRISMA_TYPE_TO_APP: Record<string, NotificationType> = {
  LIKE: "like",
  COMMENT: "comment",
  MESSAGE: "message",
  EVENT_NEARBY: "event",
  BADGE_UPDATE: "badge",
  SYSTEM: "system",
};

const TYPE_EMOJI: Record<string, string> = {
  LIKE: "❤️",
  COMMENT: "💬",
  MESSAGE: "✉️",
  EVENT_NEARBY: "📅",
  BADGE_UPDATE: "🏅",
  SYSTEM: "🔔",
};

function mapNotifType(prismaType: string): NotificationType {
  return PRISMA_TYPE_TO_APP[prismaType] ?? "system";
}

function emojiForType(prismaType: string): string {
  return TYPE_EMOJI[prismaType] ?? "🔔";
}

function toIso(createdAt: string | Date): string {
  if (typeof createdAt === "string") return createdAt;
  try {
    return new Date(createdAt).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function mapBackendNotificationToApp(n: BackendNotificationRow): AppNotification {
  return {
    id: n.id,
    type: mapNotifType(n.type),
    emoji: emojiForType(n.type),
    title: n.title,
    desc: n.body,
    read: n.isRead,
    targetId: n.referenceId ?? undefined,
    targetType: n.referenceType ?? undefined,
    createdAt: toIso(n.createdAt),
  };
}

function toPagedNotifications(raw: unknown): PaginatedNotifications {
  const o = raw as {
    data?: BackendNotificationRow[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  };
  if (o?.meta) {
    return {
      data: (o.data ?? []).map(mapBackendNotificationToApp),
      page: o.meta.page,
      pageSize: o.meta.limit,
      total: o.meta.total,
      hasMore: o.meta.page < o.meta.totalPages,
    };
  }
  return {
    data: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function getNotifications(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedNotifications> {
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  if (params.pageSize != null) e.set("limit", String(params.pageSize));
  const qs = e.toString() ? `?${e.toString()}` : "";
  return api.get<unknown>(`/notifications${qs}`).then(toPagedNotifications);
}

export function markNotificationRead(id: string): Promise<void> {
  return api.patch(`/notifications/${id}/read`);
}

export function markAllNotificationsRead(): Promise<void> {
  return api.patch("/notifications/read-all");
}

export function deleteNotification(id: string): Promise<void> {
  return api.delete(`/notifications/${id}`);
}

export function clearAllNotifications(): Promise<void> {
  return api.delete("/notifications");
}

/** Backend returns `{ unreadCount }`. */
export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  const r = await api.get<{ unreadCount: number }>("/notifications/unread-count");
  return { count: r.unreadCount };
}

/** Matches Nest `NotificationPreference` / `UpdateNotificationPreferencesDto`. */
export interface NotificationPreferenceSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  eventsNearby: boolean;
  comments: boolean;
  likes: boolean;
  messages: boolean;
  /** Plan 16: new follower, follow request, follow request accepted. Absent on older servers (on). */
  followers?: boolean;
}

export function getNotificationPreferences(): Promise<NotificationPreferenceSettings> {
  return api.get<NotificationPreferenceSettings>("/notifications/preferences");
}

export function updateNotificationPreferences(
  partial: Partial<NotificationPreferenceSettings>
): Promise<NotificationPreferenceSettings> {
  return api.patch<NotificationPreferenceSettings>("/notifications/preferences", partial);
}

export function registerPushToken(token: string, platform: "ios" | "android"): Promise<void> {
  return api.post("/notifications/push-token", { token, platform });
}

export function unregisterPushToken(): Promise<void> {
  return api.delete("/notifications/push-token");
}
