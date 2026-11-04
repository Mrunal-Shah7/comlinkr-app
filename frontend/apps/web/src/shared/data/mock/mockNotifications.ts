import { NotificationItem } from "../../lib/storage";

export const mockNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Event update",
    description: "Rooftop Mixer moved to 7:00 PM.",
    time: "2m ago",
    type: "event",
  },
  {
    id: "n2",
    title: "Saved spot trending",
    description: "Green Fork is getting busy tonight.",
    time: "1h ago",
    type: "saved",
  },
  {
    id: "n3",
    title: "Community reply",
    description: "Marco answered your coworking question.",
    time: "Yesterday",
    type: "community",
  },
];
