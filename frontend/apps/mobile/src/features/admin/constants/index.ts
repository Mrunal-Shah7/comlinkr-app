// src/features/admin/constants/index.ts

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
  USER:        '#64748B',
  ADMIN:       '#0076EB',
  SUPER_ADMIN: '#F59E0B',
  MODERATOR:   '#26B324',
};

export const STATUS_COLORS = {
  listing: {
    active:    { color: '#26B324', bg: '#EAFBE9' },
    pending:   { color: '#F59E0B', bg: '#FFF3E6' },
    rejected:  { color: '#EF4444', bg: '#FEF2F2' },
    suspended: { color: '#64748B', bg: '#F3F4F6' },
    inactive:  { color: '#64748B', bg: '#F3F4F6' },
  },
  report: {
    open:         { color: '#EF4444', bg: '#FEF2F2' },
    under_review: { color: '#F59E0B', bg: '#FFF3E6' },
    resolved:     { color: '#26B324', bg: '#EAFBE9' },
    dismissed:    { color: '#64748B', bg: '#F3F4F6' },
  },
  notification: {
    draft:     { color: '#64748B', bg: '#F3F4F6' },
    scheduled: { color: '#0076EB', bg: '#EBF5FF'  },
    sent:      { color: '#26B324', bg: '#EAFBE9'  },
    failed:    { color: '#EF4444', bg: '#FEF2F2'  },
  },
} as const;

export const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  low:    { color: '#64748B', bg: '#F3F4F6' },
  normal: { color: '#0076EB', bg: '#EBF5FF' },
  high:   { color: '#F59E0B', bg: '#FFF3E6' },
  urgent: { color: '#EF4444', bg: '#FEF2F2' },
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