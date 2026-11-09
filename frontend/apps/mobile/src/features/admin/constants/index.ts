// src/features/admin/constants/index.ts

import { palette } from "../../../theme/palette";
export const ADMIN_ROUTES = {
  DASHBOARD:     '/admin',
  USERS:         '/admin/users',
  LISTINGS:      '/admin/listings',
  REPORTS:       '/admin/reports',
  ANALYTICS:     '/admin/analytics',
  NOTIFICATIONS: '/admin/notifications',
  POLLS:         '/admin/polls',
  VERIFICATIONS: '/admin/verifications',
  TRENDING:      '/admin/trending',
  POSTS:         '/admin/posts',
  AREA:          '/admin/area',
} as const;

export const ROLE_COLORS: Record<string, string> = {
  USER:        palette.slate500,
  ADMIN:       palette.skyL46,
  SUPER_ADMIN: palette.amber500,
  MODERATOR:   palette.greenL42,
};

export const STATUS_COLORS = {
  listing: {
    active:    { color: palette.greenL42, bg: palette.greenL95 },
    pending:   { color: palette.amber500, bg: palette.legacyOrangeLight },
    rejected:  { color: palette.red500, bg: palette.red50 },
    suspended: { color: palette.slate500, bg: palette.gray100 },
    inactive:  { color: palette.slate500, bg: palette.gray100 },
  },
  report: {
    open:         { color: palette.red500, bg: palette.red50 },
    under_review: { color: palette.amber500, bg: palette.legacyOrangeLight },
    resolved:     { color: palette.greenL42, bg: palette.greenL95 },
    dismissed:    { color: palette.slate500, bg: palette.gray100 },
  },
  notification: {
    draft:     { color: palette.slate500, bg: palette.gray100 },
    scheduled: { color: palette.skyL46, bg: palette.legacyBlueLight  },
    sent:      { color: palette.greenL42, bg: palette.greenL95  },
    failed:    { color: palette.red500, bg: palette.red50  },
  },
} as const;

export const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  low:    { color: palette.slate500, bg: palette.gray100 },
  normal: { color: palette.skyL46, bg: palette.legacyBlueLight },
  high:   { color: palette.amber500, bg: palette.legacyOrangeLight },
  urgent: { color: palette.red500, bg: palette.red50 },
};

export const CATEGORY_ICONS: Record<string, string> = {
  housing:   'home',
  food:      'restaurant',
  community: 'people',
  general:   'grid',
};

export const PAGE_SIZE = 20;
export const STALE_TIME_STATS = 1000 * 60 * 5;   // 5 min
export const STALE_TIME_LISTS = 1000 * 60 * 2;   // 2 min