/**
 * Settings API — matches Nest `SettingsController` (`/settings/*`).
 *
 * Notification channel toggles (likes, comments, …) live under `/notifications/preferences`
 * — see `notifications.api.ts` (`getNotificationPreferences` / `updateNotificationPreferences`).
 */

import { api } from "./client";

// ─── Account ─────────────────────────────────────────────────────────────────

export interface SettingsAccount {
  email: string;
  username: string;
  fullName: string;
  providers: { provider: string; linkedAt: string }[];
}

export interface UpdateAccountPayload {
  currentPassword: string;
  newEmail?: string;
  newPassword?: string;
  newUsername?: string;
}

export function getSettingsAccount(): Promise<SettingsAccount> {
  return api.get<SettingsAccount>("/settings/account");
}

export function updateSettingsAccount(body: UpdateAccountPayload): Promise<{ message: string }> {
  return api.patch<{ message: string }>("/settings/account", body);
}

// ─── Privacy ─────────────────────────────────────────────────────────────────

export interface SettingsPrivacy {
  id?: string;
  userId?: string;
  publicProfile: boolean;
  showLocation: boolean;
  activityStatus: boolean;
}

export function getSettingsPrivacy(): Promise<SettingsPrivacy> {
  return api.get<SettingsPrivacy>("/settings/privacy");
}

export function updateSettingsPrivacy(
  partial: Partial<Pick<SettingsPrivacy, "publicProfile" | "showLocation" | "activityStatus">>
): Promise<SettingsPrivacy> {
  return api.patch<SettingsPrivacy>("/settings/privacy", partial);
}

// ─── Blocked users ────────────────────────────────────────────────────────────

export interface BlockedUserEntry {
  id: string;
  user: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
  blockedAt: string;
}

export function getSettingsBlockedUsers(): Promise<BlockedUserEntry[]> {
  return api.get<BlockedUserEntry[]>("/settings/blocked-users");
}

export function unblockSettingsUser(targetUserId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/settings/blocked-users/${targetUserId}`);
}

// ─── Account deletion ─────────────────────────────────────────────────────────

export function requestAccountDeletion(): Promise<{ message: string; deletionDate: string }> {
  return api.post<{ message: string; deletionDate: string }>("/settings/delete-account");
}

export function cancelAccountDeletion(): Promise<{ message: string }> {
  return api.post<{ message: string }>("/settings/cancel-deletion");
}
