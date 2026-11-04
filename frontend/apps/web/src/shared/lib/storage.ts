type StoredProfile = {
  name: string;
  city: string;
  culture: string[];
  interests: string[];
};

type SavedItem = {
  id: string;
  type: "food" | "event" | "housing";
  title: string;
  subtitle: string;
  image?: string;
  meta?: string;
};

type InterestedEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  host: string;
  attendees: string[];
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  read?: boolean;
  type: "event" | "saved" | "community";
};

const TOKEN_KEY = "comlinkr_token";
const PROFILE_KEY = "comlinkr_profile";
const SAVED_KEY = "comlinkr_saved";
const INTERESTED_KEY = "comlinkr_interested";
const NOTIFICATIONS_KEY = "comlinkr_notifications";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getProfile(): StoredProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as StoredProfile) : null;
}

export function setProfile(profile: StoredProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getSavedItems(): SavedItem[] {
  const raw = localStorage.getItem(SAVED_KEY);
  return raw ? (JSON.parse(raw) as SavedItem[]) : [];
}

export function setSavedItems(items: SavedItem[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(items));
}

export function getInterestedEvents(): InterestedEvent[] {
  const raw = localStorage.getItem(INTERESTED_KEY);
  return raw ? (JSON.parse(raw) as InterestedEvent[]) : [];
}

export function setInterestedEvents(items: InterestedEvent[]) {
  localStorage.setItem(INTERESTED_KEY, JSON.stringify(items));
}

export function getNotifications(): NotificationItem[] {
  const raw = localStorage.getItem(NOTIFICATIONS_KEY);
  return raw ? (JSON.parse(raw) as NotificationItem[]) : [];
}

export function setNotifications(items: NotificationItem[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items));
}

export type { StoredProfile, SavedItem, InterestedEvent, NotificationItem };
