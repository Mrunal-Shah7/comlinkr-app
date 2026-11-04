// src/features/admin/types/index.ts

import React from 'react';

export type AdminActionType = 'approve' | 'reject' | 'suspend' | 'delete' | 'restore' | 'warn' | 'ban' | 'grant_badge' | 'revoke_badge' | 'remove_content' | 'feature';

export interface ActionButtonConfig {
  label: string;
  action: AdminActionType;
  variant: 'primary' | 'danger' | 'warning' | 'success' | 'ghost';
  requiresConfirmation: boolean;
  confirmMessage?: string;
  icon: string;
}

export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  width?: number;
  renderCell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
  color?: string;
}

export interface AdminDashboardTab {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  route: string;
}

export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ACTION_CONFIGS: Record<AdminActionType, ActionButtonConfig> = {
  approve: { label: 'Approve', action: 'approve', variant: 'success', requiresConfirmation: false, icon: 'checkmark-circle' },
  reject:  { label: 'Reject',  action: 'reject',  variant: 'danger',  requiresConfirmation: true,  icon: 'close-circle',    confirmMessage: 'Are you sure you want to reject this?' },
  suspend: { label: 'Suspend', action: 'suspend', variant: 'warning', requiresConfirmation: true,  icon: 'pause-circle',    confirmMessage: 'Suspend this account?' },
  delete:  { label: 'Delete',  action: 'delete',  variant: 'danger',  requiresConfirmation: true,  icon: 'trash',           confirmMessage: 'This is permanent. Continue?' },
  restore: { label: 'Restore', action: 'restore', variant: 'primary', requiresConfirmation: false, icon: 'refresh-circle'  },
  warn:           { label: 'Warn',         action: 'warn',         variant: 'warning', requiresConfirmation: true,  icon: 'warning',            confirmMessage: 'Send a warning to this user?' },
  ban:            { label: 'Ban',          action: 'ban',          variant: 'danger',  requiresConfirmation: true,  icon: 'ban',                confirmMessage: 'Permanently ban this user?' },
  grant_badge:    { label: 'Grant Badge',  action: 'grant_badge',  variant: 'success', requiresConfirmation: false, icon: 'shield-checkmark'    },
  revoke_badge:   { label: 'Revoke Badge', action: 'revoke_badge', variant: 'danger',  requiresConfirmation: true,  icon: 'shield',             confirmMessage: 'Revoke this badge?' },
  remove_content: { label: 'Remove',       action: 'remove_content', variant: 'danger', requiresConfirmation: true, icon: 'trash',              confirmMessage: 'Remove this content?' },
  feature:        { label: 'Feature',      action: 'feature',      variant: 'primary', requiresConfirmation: false, icon: 'star'                },
};