// src/features/admin/pages/UserSafetyCaseFileScreen.tsx
//
// Unified per-user safety view: identity, reports against/by the user, warning
// history, ban/suspension history, active sessions, content summary, and quick
// moderation actions — so an admin doesn't need to hop across four separate
// screens (or the database) to understand one user's safety record.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useAdminUserDetail,
  useAdminUserWarnings,
  useAdminUserBanHistory,
  useAdminReportsAgainstUser,
  useAdminReportsByUser,
  useAdminAuthSessions,
  useTerminateUserSessionsMutation,
  useAdminUserAction,
} from '../hooks/useAdmin';
import { alertAdminApiError } from '../api/handleAdminError';
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

const ROLE_META: Record<string, { color: string; bg: string; icon: string }> = {
  USER:  { color: Colors.text.secondary, bg: '#F3F4F6',              icon: 'person' },
  ADMIN: { color: Colors.brand.blue,     bg: Colors.brand.blueLight, icon: 'shield' },
};

function initialsFrom(name: string, username: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return username.slice(0, 2).toUpperCase() || '?';
}

function relativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SectionHeader({ icon, label, count }: { icon: string; label: string; count?: number }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconBox}>
        <Ionicons name={icon as any} size={13} color={Colors.brand.blue} />
      </View>
      <Text style={s.sectionLabel}>{label}</Text>
      {count !== undefined && <Text style={s.sectionCount}>{count}</Text>}
    </View>
  );
}

export default function UserSafetyCaseFileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id ?? null;

  const { data: detail, isLoading: isLoadingDetail, errorMessage: detailError, refetch: refetchDetail } = useAdminUserDetail(userId);
  const { items: warnings, isLoading: isLoadingWarnings, refresh: refreshWarnings } = useAdminUserWarnings(userId);
  const { items: banHistory, isLoading: isLoadingBans, refresh: refreshBans } = useAdminUserBanHistory(userId);
  const { items: reportsAgainst, isLoading: isLoadingReportsAgainst, refresh: refreshReportsAgainst } = useAdminReportsAgainstUser(userId);
  const { items: reportsBy, isLoading: isLoadingReportsBy, refresh: refreshReportsBy } = useAdminReportsByUser(userId);
  const { data: sessionsData, isLoading: isLoadingSessions, refetch: refetchSessions } = useAdminAuthSessions({ page: 1, pageSize: 20, userId: userId ?? undefined });
  const { mutate: terminateAllSessions, isPending: isTerminating } = useTerminateUserSessionsMutation();
  const { mutate: performAction, isPending: isActioning } = useAdminUserAction();

  const [refreshing, setRefreshing] = useState(false);
  const [showWarnInput, setShowWarnInput] = useState(false);
  const [warnMessage, setWarnMessage] = useState('');

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchDetail(),
      refreshWarnings(),
      refreshBans(),
      refreshReportsAgainst(),
      refreshReportsBy(),
      refetchSessions(),
    ]);
    setRefreshing(false);
  };

  const displayName = detail?.fullName || detail?.name || detail?.username || 'Unknown user';
  const isActive = detail?.isActive ?? true;
  const role = String(detail?.role ?? 'USER').toUpperCase();
  const roleMeta = ROLE_META[role] ?? ROLE_META.USER;
  const sessions = sessionsData?.data ?? [];

  const handleSendWarn = () => {
    if (!userId || !warnMessage.trim()) return;
    performAction({ userId, action: { action: 'warn' }, warnMessage: warnMessage.trim() }, {
      onSuccess: () => { void refreshAll(); setShowWarnInput(false); setWarnMessage(''); showToast('Warning sent', "success"); },
      onError: (err) => alertAdminApiError(err, 'Warn failed'),
    });
  };

  const handleSuspend = () => {
    if (!userId) return;
    appAlert('Suspend user?', 'This blocks the user from accessing their account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Suspend', style: 'destructive',
        onPress: () => performAction({ userId, action: { action: 'suspend' } }, {
          onSuccess: () => void refreshAll(),
          onError: (err) => alertAdminApiError(err, 'Suspend failed'),
        }),
      },
    ]);
  };

  const handleRestore = () => {
    if (!userId) return;
    performAction({ userId, action: { action: 'restore' } }, {
      onSuccess: () => void refreshAll(),
      onError: (err) => alertAdminApiError(err, 'Restore failed'),
    });
  };

  const handleTerminateAllSessions = () => {
    if (!userId) return;
    appAlert('Terminate all sessions?', 'This signs the user out of every device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Terminate all', style: 'destructive',
        onPress: () => terminateAllSessions(userId, {
          onSuccess: () => void refetchSessions(),
          onError: (err) => alertAdminApiError(err, 'Terminate failed'),
        }),
      },
    ]);
  };

  const hasMutation = isActioning || isTerminating;

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={['#8B5CF6', '#6D3FD1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="folder-open" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Safety Case File</Text>
            </View>
          </View>

          {isLoadingDetail ? (
            <View style={s.loadingCard}>
              <ActivityIndicator color={Colors.brand.blue} />
              <Text style={s.loadingText}>Loading user...</Text>
            </View>
          ) : detailError ? (
            <View style={s.emptyCard}>
              <Text style={{ color: '#EF4444', textAlign: 'center' }}>{detailError}</Text>
              <Pressable onPress={() => void refetchDetail()} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.brand.blue, fontWeight: '700' }}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Identity card */}
              <View style={s.identityCard}>
                <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
                  <Text style={s.avatarText}>{initialsFrom(displayName, detail?.username ?? '')}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.identityName}>{displayName}</Text>
                  <Text style={s.identityHandle}>@{detail?.username}</Text>
                  <Text style={s.identityEmail}>{detail?.email}</Text>
                  <View style={s.identityChipsRow}>
                    <View style={[s.chip, { backgroundColor: roleMeta.bg }]}>
                      <Ionicons name={roleMeta.icon as any} size={11} color={roleMeta.color} />
                      <Text style={[s.chipText, { color: roleMeta.color }]}>{role}</Text>
                    </View>
                    <View style={[s.chip, { backgroundColor: isActive ? Colors.brand.greenLight : '#FEF2F2' }]}>
                      <Ionicons name={isActive ? 'checkmark-circle' : 'close-circle'} size={11} color={isActive ? Colors.brand.green : '#EF4444'} />
                      <Text style={[s.chipText, { color: isActive ? Colors.brand.green : '#EF4444' }]}>{isActive ? 'Active' : 'Suspended'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Content summary */}
              {detail?.counts && (
                <>
                  <SectionHeader icon="stats-chart" label="CONTENT SUMMARY" />
                  <View style={s.statsGrid}>
                    {[
                      { label: 'Posts', value: detail.counts.feedPosts, color: Colors.brand.blue },
                      { label: 'Listings', value: detail.counts.housingListings, color: '#F59E0B' },
                      { label: 'Restaurants', value: detail.counts.restaurants, color: Colors.brand.green },
                      { label: 'Chats', value: detail.counts.conversations, color: '#8B5CF6' },
                      { label: 'Events', value: detail.counts.events, color: '#FF7B00' },
                    ].map((stat) => (
                      <View key={stat.label} style={s.statCard}>
                        <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
                        <Text style={s.statLbl}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Reports against this user */}
              <SectionHeader icon="flag" label="REPORTS AGAINST THIS USER" count={reportsAgainst.length} />
              {isLoadingReportsAgainst ? (
                <ActivityIndicator color={Colors.brand.blue} style={{ marginBottom: 16 }} />
              ) : reportsAgainst.length === 0 ? (
                <Text style={s.emptyInline}>No reports filed against this user.</Text>
              ) : (
                reportsAgainst.map((r) => (
                  <View key={r.id} style={s.listRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.listRowTitle}>{r.reason}</Text>
                      <Text style={s.listRowSub}>by @{r.reporter.username} · {relativeTime(r.createdAt)} · {r.status}</Text>
                    </View>
                  </View>
                ))
              )}

              {/* Reports filed by this user */}
              <SectionHeader icon="megaphone" label="REPORTS FILED BY THIS USER" count={reportsBy.length} />
              {isLoadingReportsBy ? (
                <ActivityIndicator color={Colors.brand.blue} style={{ marginBottom: 16 }} />
              ) : reportsBy.length === 0 ? (
                <Text style={s.emptyInline}>This user hasn't filed any reports.</Text>
              ) : (
                reportsBy.map((r) => (
                  <View key={r.id} style={s.listRow}>
                    <Ionicons name="flag-outline" size={14} color={Colors.text.tertiary} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.listRowTitle}>{r.targetTitle ?? r.targetType}</Text>
                      <Text style={s.listRowSub}>{r.reason} · {relativeTime(r.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}

              {/* Warning history */}
              <SectionHeader icon="warning" label="WARNING HISTORY" count={warnings.length} />
              {isLoadingWarnings ? (
                <ActivityIndicator color={Colors.brand.blue} style={{ marginBottom: 16 }} />
              ) : warnings.length === 0 ? (
                <Text style={s.emptyInline}>No warnings issued.</Text>
              ) : (
                warnings.map((w) => (
                  <View key={w.id} style={s.listRow}>
                    <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.listRowTitle}>{w.message}</Text>
                      <Text style={s.listRowSub}>by @{w.issuedBy.username} · {relativeTime(w.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}

              {/* Ban/suspension history */}
              <SectionHeader icon="ban" label="BAN / SUSPENSION HISTORY" count={banHistory.length} />
              {isLoadingBans ? (
                <ActivityIndicator color={Colors.brand.blue} style={{ marginBottom: 16 }} />
              ) : banHistory.length === 0 ? (
                <Text style={s.emptyInline}>No bans or suspensions on record.</Text>
              ) : (
                banHistory.map((b) => (
                  <View key={b.id} style={s.listRow}>
                    <Ionicons name={b.action === 'RESTORE' ? 'checkmark-circle-outline' : 'ban-outline'} size={14} color={b.action === 'RESTORE' ? Colors.brand.green : '#EF4444'} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.listRowTitle}>{b.action}{b.reason ? ` — ${b.reason}` : ''}</Text>
                      <Text style={s.listRowSub}>by @{b.actedBy.username} · {relativeTime(b.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}

              {/* Active sessions */}
              <SectionHeader icon="lock-closed" label="ACTIVE SESSIONS" count={sessions.length} />
              {isLoadingSessions ? (
                <ActivityIndicator color={Colors.brand.blue} style={{ marginBottom: 16 }} />
              ) : sessions.length === 0 ? (
                <Text style={s.emptyInline}>No active sessions.</Text>
              ) : (
                <>
                  {sessions.map((sess) => (
                    <View key={sess.sessionId} style={s.listRow}>
                      <Ionicons name="phone-portrait-outline" size={14} color={Colors.text.tertiary} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.listRowTitle}>{sess.provider ?? 'Email/password'}</Text>
                        <Text style={s.listRowSub}>Last active {relativeTime(sess.approximateLastActivityAt)}</Text>
                      </View>
                    </View>
                  ))}
                  <Pressable style={s.terminateBtn} onPress={handleTerminateAllSessions} disabled={hasMutation}>
                    <Ionicons name="log-out-outline" size={14} color="#EF4444" />
                    <Text style={s.terminateBtnText}>Terminate all sessions</Text>
                  </Pressable>
                </>
              )}

              {/* Quick actions footer */}
              <SectionHeader icon="flash" label="QUICK ACTIONS" />
              {showWarnInput && (
                <View style={s.warnInputRow}>
                  <TextInput
                    style={s.warnInput}
                    placeholder="Warning message to send..."
                    placeholderTextColor={Colors.text.tertiary}
                    value={warnMessage}
                    onChangeText={setWarnMessage}
                    multiline
                  />
                  <Pressable style={s.warnSendBtn} onPress={handleSendWarn} disabled={hasMutation}>
                    <Ionicons name="send" size={14} color="#FFF" />
                  </Pressable>
                </View>
              )}
              <View style={s.actionsRow}>
                <Pressable style={[s.actionBtn, { backgroundColor: '#FFF3E6' }]} onPress={() => setShowWarnInput((p) => !p)} disabled={hasMutation}>
                  <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
                  <Text style={[s.actionBtnText, { color: '#F59E0B' }]}>Warn</Text>
                </Pressable>
                {isActive ? (
                  <Pressable style={[s.actionBtn, { backgroundColor: '#FEF2F2' }]} onPress={handleSuspend} disabled={hasMutation}>
                    <Ionicons name="ban-outline" size={16} color="#EF4444" />
                    <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Suspend</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[s.actionBtn, { backgroundColor: Colors.brand.greenLight }]} onPress={handleRestore} disabled={hasMutation}>
                    <Ionicons name="refresh-circle-outline" size={16} color={Colors.brand.green} />
                    <Text style={[s.actionBtnText, { color: Colors.brand.green }]}>Restore</Text>
                  </Pressable>
                )}
              </View>
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

  loadingCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 32, alignItems: 'center', gap: 10 },
  loadingText: { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyInline: { fontSize: 12, color: Colors.text.tertiary, marginBottom: 16, paddingHorizontal: 2 },

  identityCard: { flexDirection: 'row', gap: 14, backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  avatar: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  identityName: { fontSize: 16, fontWeight: '900', color: Colors.text.primary },
  identityHandle: { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },
  identityEmail: { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },
  identityChipsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: 10, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionIconBox: { width: 22, height: 22, borderRadius: 7, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: Colors.text.tertiary, letterSpacing: 1.2, flex: 1 },
  sectionCount: { fontSize: 11, fontWeight: '800', color: Colors.text.secondary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statCard: { flexBasis: '18%', flexGrow: 1, backgroundColor: '#FFF', borderRadius: 13, padding: 10, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '900' },
  statLbl: { fontSize: 9, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2, textAlign: 'center' },

  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  listRowTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  listRowSub: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },

  terminateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: '#FEF2F2', marginBottom: 20 },
  terminateBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { fontSize: 13, fontWeight: '800' },

  warnInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  warnInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: Colors.text.primary },
  warnSendBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
});
