import { create } from "zustand";

export type NotificationType = "like" | "comment" | "follow" | "event" | "housing" | "community" | "system" | "registration";

export interface Notification {
  id: string;
  type: NotificationType;
  emoji: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "read" | "time">) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

function getNowTime() {
  // Returns a string like "2m ago" or "now"
  return "now";
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (n) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      notifications: [
        {
          ...n,
          id,
          read: false,
          time: getNowTime(),
        },
        ...state.notifications,
      ],
    }));
  },
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
  clearAll: () => {
    set({ notifications: [] });
  },
}));
