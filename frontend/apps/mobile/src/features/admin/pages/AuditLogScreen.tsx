// src/features/admin/pages/AuditLogScreen.tsx
//
// Read-only chronological trail of every admin action (who, what, target,
// when, reason). Logging happens server-side on every /admin/* mutation —
// this screen has no mutations of its own, matching audit-log best practice
// of an immutable record.

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAdminAuditLog } from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import { Colors } from '@theme/colors';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';

const ACTION_META: Record<string, { color: string; icon: string }> = {
  USER_WARN: { color: '#F59E0B', icon: 'warning' },
  USER_BAN: { color: '#EF4444', icon: 'ban' },
  USER_SUSPEND: { color: '#EF4444', icon: 'ban' },
  USER_RESTORE: { color: Colors.brand.green, icon: 'refresh-circle' },
  LISTING_APPROVE: { color: Colors.brand.green, icon: 'checkmark-circle' },
  LISTING_REJECT: { color: '#EF4444', icon: 'close-circle' },
  REPORT_DISMISS: { color: Colors.text.tertiary, icon: 'close-circle' },
  REPORT_RESOLVE: { color: Colors.brand.green, icon: 'checkmark-circle' },
  BADGE_APPROVE: { color: Colors.brand.green, icon: 'shield-checkmark' },
  BADGE_REJECT: { color: '#EF4444', icon: 'shield' },
};

const CATEGORY_FILTERS = [
  { label: 'All', value: 'all', targetType: undefined },
  { label: 'Users', value: 'users', targetType: 'USER' },
  { label: 'Listings', value: 'listings', targetType: 'LISTING' },
  { label: 'Content', value: 'content', targetType: undefined },
  { label: 'Reports', value: 'reports', targetType: 'REPORT' },
  { label: 'Badges', value: 'badges', targetType: 'BADGE_APPLICATION' },
];

function relativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AuditLogScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const {
    items: entries, meta, isLoading, isLoadingMore, isError, errorMessage, refresh, loadMore, setParams,
  } = useAdminAuditLog();

  const handleFilterChange = (value: string) => {
    setFilter(value);
    const cfg = CATEGORY_FILTERS.find((f) => f.value === value);
    setParams({ targetType: cfg?.targetType, search: search || undefined });
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    setParams((prev) => ({ ...prev, search: text || undefined }));
  };

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return entries.filter((e) => new Date(e.createdAt).toDateString() === today).length;
  }, [entries]);

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && entries.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={['#64748B', '#334155']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="time" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Audit Log</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={[s.statVal, { color: Colors.text.primary }]}>{meta?.total ?? entries.length}</Text>
              <Text style={s.statLbl}>Total actions</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statVal, { color: Colors.brand.blue }]}>{todayCount}</Text>
              <Text style={s.statLbl}>Today</Text>
            </View>
          </View>

          <FilterBar
            searchValue={search}
            onSearchChange={handleSearchChange}
            placeholder="Search admin, target ID, action..."
            filters={CATEGORY_FILTERS.map(({ label, value }) => ({ label, value }))}
            activeFilter={filter}
            onFilterChange={handleFilterChange}
          />

          {isError && errorMessage ? (
            <View style={s.emptyCard}>
              <Text style={{ color: '#EF4444', textAlign: 'center' }}>{errorMessage}</Text>
              <Pressable onPress={refresh} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.brand.blue, fontWeight: '700' }}>Retry</Text>
              </Pressable>
            </View>
          ) : isLoading && entries.length === 0 ? (
            <View style={s.loadingCard}>
              <Text style={s.loadingText}>Loading audit log...</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="time-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No actions logged yet</Text>
              <Text style={s.emptySub}>Every admin action will appear here</Text>
            </View>
          ) : (
            <>
              {entries.map((entry) => {
                const meta2 = ACTION_META[entry.action] ?? { color: Colors.text.secondary, icon: 'ellipse' };
                return (
                  <View key={entry.id} style={s.row}>
                    <View style={[s.iconWrap, { backgroundColor: `${meta2.color}14` }]}>
                      <Ionicons name={meta2.icon as any} size={15} color={meta2.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>
                        <Text style={{ fontWeight: '800' }}>@{entry.admin.username}</Text> · {entry.action.replace(/_/g, ' ').toLowerCase()}
                      </Text>
                      <Text style={s.rowSub}>{entry.targetType} · {entry.targetId}{entry.reason ? ` — ${entry.reason}` : ''}</Text>
                    </View>
                    <Text style={s.rowTime}>{relativeTime(entry.createdAt)}</Text>
                  </View>
                );
              })}
              {meta && meta.page < meta.totalPages && (
                <Pressable style={s.loadMoreBtn} onPress={loadMore} disabled={isLoadingMore}>
                  <Text style={s.loadMoreText}>{isLoadingMore ? 'Loading...' : 'Load more'}</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = createThemedStyles({
  root: { flex: 1, backgroundColor: '#EBF5FF' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 48 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  headerIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 13, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLbl: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  loadingCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 32, alignItems: 'center' },
  loadingText: { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
  emptySub: { fontSize: 13, color: Colors.text.tertiary },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF', borderRadius: 13, padding: 12, marginBottom: 8 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowTitle: { fontSize: 13, color: Colors.text.primary },
  rowSub: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },
  rowTime: { fontSize: 10, color: Colors.text.tertiary, flexShrink: 0 },

  loadMoreBtn: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: Colors.brand.blue },
});
