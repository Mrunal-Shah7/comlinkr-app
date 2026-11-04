import { useEffect, useState } from "react";
import SectionHeader from "../../../app/layout/SectionHeader";
import Card from "../../../shared/ui/Card";
import Button from "../../../shared/ui/Button";
import Skeleton from "../../../shared/ui/Skeleton";
import EmptyState from "../../../shared/ui/EmptyState";
import { mockNotifications } from "../../../shared/data/mock/mockNotifications";
import { getNotifications, setNotifications, NotificationItem } from "../../../shared/lib/storage";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const stored = getNotifications();
    if (stored.length === 0) {
      setNotifications(mockNotifications);
      setItems(mockNotifications);
    } else {
      setItems(stored);
    }
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const markAllRead = () => {
    const next = items.map((item) => ({ ...item, read: true }));
    setItems(next);
    setNotifications(next);
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Notifications"
        action={
          <Button variant="outline" tone="gray" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        }
      />
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" description="You’re all caught up." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
                <p className="text-xs text-gray-400">{item.time}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.type === "event"
                    ? "bg-orange-100 text-orange-700"
                    : item.type === "saved"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                }`}
              >
                {item.read ? "Read" : "New"}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
