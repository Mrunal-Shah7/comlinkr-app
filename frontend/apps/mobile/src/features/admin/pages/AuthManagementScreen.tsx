// src/features/admin/pages/AuthManagementScreen.tsx
// SPRINT-41: Contract AdminSessionItem — no device/OS/IP/location/suspicious fabrications

import { palette } from "../../../theme/palette";
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Pressable,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useAdminAuthSessions,
  useRevokeSessionMutation,
  useTerminateUserSessionsMutation, // SPRINT-41:
} from '../hooks/useAdmin';
import { AdminCard } from '../components/AdminCard';
import { AdminBackdrop } from '../components/AdminBackdrop';
import type { AdminSessionItem } from '../../../api/admin.api'; // SPRINT-41:
import { getSessionCookie, ApiError } from '../../../api/client'; // SPRINT-41:
import { Colors } from '@theme/colors';
import { alertAdminApiError } from '../api/handleAdminError'; // SPRINT-41:
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { showToast } from '../../../shared/ui/Toast';

// SPRINT-41: Extract prefix-free session id from signed comlinkr.sid cookie when possible
function extractSessionIdFromCookie(cookieHeader: string | null): string | null { // SPRINT-41:
  if (!cookieHeader) return null; // SPRINT-41:
  const match = cookieHeader.match(/(?:^|;\s*)comlinkr\.sid=([^;]+)/); // SPRINT-41:
  if (!match?.[1]) return null; // SPRINT-41:
  let value = decodeURIComponent(match[1]); // SPRINT-41:
  if (value.startsWith('s:')) { // SPRINT-41: express-session signed cookie
    value = value.slice(2); // SPRINT-41:
    const dot = value.lastIndexOf('.'); // SPRINT-41:
    if (dot > 0) return value.slice(0, dot); // SPRINT-41:
  } // SPRINT-41:
  return value || null; // SPRINT-41:
} // SPRINT-41:

function formatApproxActivity(iso: string): string { // SPRINT-41:
  const d = new Date(iso); // SPRINT-41:
  if (Number.isNaN(d.getTime())) return iso; // SPRINT-41:
  return d.toLocaleString('en-US', { // SPRINT-41:
    month: 'short', day: 'numeric', year: 'numeric', // SPRINT-41:
    hour: 'numeric', minute: '2-digit', // SPRINT-41:
  }); // SPRINT-41:
} // SPRINT-41:

function formatRemaining(seconds: number): string { // SPRINT-41:
  if (seconds <= 0) return 'Expired / unknown'; // SPRINT-41:
  const h = Math.floor(seconds / 3600); // SPRINT-41:
  const m = Math.floor((seconds % 3600) / 60); // SPRINT-41:
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h remaining`; // SPRINT-41:
  if (h > 0) return `${h}h ${m}m remaining`; // SPRINT-41:
  return `${m}m remaining`; // SPRINT-41:
} // SPRINT-41:

export default function AuthManagementScreen() {
  const [userIdInput, setUserIdInput] = useState(''); // SPRINT-41:
  const [appliedUserId, setAppliedUserId] = useState<string | undefined>(); // SPRINT-41:
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null); // SPRINT-41:

  const { data, isLoading, refetch, isRefetching } = useAdminAuthSessions({ // SPRINT-41:
    page: 1, // SPRINT-41:
    pageSize: 50, // SPRINT-41:
    userId: appliedUserId, // SPRINT-41:
  }); // SPRINT-41:
  const { mutate: terminateSession, isPending: terminating } = useRevokeSessionMutation(); // SPRINT-41:
  const { mutate: terminateUserSessions, isPending: bulkPending } = useTerminateUserSessionsMutation(); // SPRINT-41:

  useEffect(() => { // SPRINT-41:
    void getSessionCookie().then((cookie) => { // SPRINT-41:
      setCurrentSessionId(extractSessionIdFromCookie(cookie)); // SPRINT-41:
    }); // SPRINT-41:
  }, []); // SPRINT-41:

  const sessions: AdminSessionItem[] = data?.data ?? []; // SPRINT-41:
  const truncated = data?.truncated === true; // SPRINT-41:
  const meta = data?.meta; // SPRINT-41:

  const handleTerminate = (session: AdminSessionItem) => { // SPRINT-41:
    if (currentSessionId && session.sessionId === currentSessionId) { // SPRINT-41:
      appAlert('Current session', 'You cannot terminate your own current session.'); // SPRINT-41:
      return; // SPRINT-41:
    } // SPRINT-41:
    appAlert( // SPRINT-41:
      'Terminate Session', // SPRINT-41:
      `End session for ${session.user.fullName || session.user.username}?`, // SPRINT-41:
      [ // SPRINT-41:
        { text: 'Cancel', style: 'cancel' }, // SPRINT-41:
        { // SPRINT-41:
          text: 'Terminate', // SPRINT-41:
          style: 'destructive', // SPRINT-41:
          onPress: () => { // SPRINT-41:
            terminateSession(session.sessionId, { // SPRINT-41:
              onSuccess: () => { // SPRINT-41:
                showToast('The session has been ended.', "success"); // SPRINT-41:
                refetch(); // SPRINT-41:
              }, // SPRINT-41:
              onError: (err?: unknown) => { // SPRINT-41:
                if (err instanceof ApiError && err.status === 400) { // SPRINT-41: current session
                  appAlert('Current session', 'You cannot terminate your own current session.'); // SPRINT-41:
                  return; // SPRINT-41:
                } // SPRINT-41:
                alertAdminApiError(err ?? new Error('Could not terminate session')); // SPRINT-41:
              }, // SPRINT-41:
            }); // SPRINT-41:
          }, // SPRINT-41:
        }, // SPRINT-41:
      ], // SPRINT-41:
    ); // SPRINT-41:
  }; // SPRINT-41:

  // SPRINT-41: Bulk terminate — show terminatedCount + truncation warning
  const runBulkTerminate = (userId: string, displayName: string) => { // SPRINT-41:
    appAlert( // SPRINT-41:
      'Terminate All User Sessions', // SPRINT-41:
      `End all discoverable sessions for ${displayName}? Your current session is preserved.`, // SPRINT-41:
      [ // SPRINT-41:
        { text: 'Cancel', style: 'cancel' }, // SPRINT-41:
        { // SPRINT-41:
          text: 'Terminate All', // SPRINT-41:
          style: 'destructive', // SPRINT-41:
          onPress: async () => { // SPRINT-41:
            const result = await terminateUserSessions(userId); // SPRINT-41:
            if (!result) { // SPRINT-41:
              alertAdminApiError(new Error('Bulk terminate failed')); // SPRINT-41:
              return; // SPRINT-41:
            } // SPRINT-41:
            appAlert( // SPRINT-41:
              'Sessions terminated', // SPRINT-41:
              result.truncated // SPRINT-41:
                ? `Terminated ${result.terminatedCount} session(s). Warning: scan was truncated — additional sessions may remain.` // SPRINT-41:
                : `Terminated ${result.terminatedCount} session(s).`, // SPRINT-41:
            ); // SPRINT-41:
            refetch(); // SPRINT-41:
          }, // SPRINT-41:
        }, // SPRINT-41:
      ], // SPRINT-41:
    ); // SPRINT-41:
  }; // SPRINT-41:

  const applyUserIdFilter = () => { // SPRINT-41:
    const trimmed = userIdInput.trim(); // SPRINT-41:
    setAppliedUserId(trimmed || undefined); // SPRINT-41:
  }; // SPRINT-41:

  return (
    <View style={s.root}>
      <AdminBackdrop />

      <SafeAreaView style={s.safe}>
        <ScrollView keyboardShouldPersistTaps="handled"
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: palette.legacyBlueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[palette.violet500, palette.legacyPurple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="lock-closed" size={22} color={palette.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Auth Sessions</Text>
            </View>
          </View>

          <View style={s.summaryRow}>
            {[
              { label: 'Shown', value: sessions.length, color: palette.violet500 }, // SPRINT-41:
              { label: 'Total', value: meta?.total ?? sessions.length, color: Colors.brand.blue }, // SPRINT-41:
            ].map((item) => (
              <View key={item.label} style={s.summaryCard}>
                <Text style={[s.summaryVal, { color: item.color }]}>{item.value}</Text>
                <Text style={s.summaryLbl}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* SPRINT-41: Truncation notice when Redis scan hit ceiling */}
          {truncated && (
            <View style={s.truncBanner}>
              <Ionicons name="information-circle" size={16} color={palette.amber500} />
              <Text style={s.truncText}>
                Session list may be incomplete — Redis scan reached the safety ceiling. Additional sessions may exist.
              </Text>
            </View>
          )}

          {/* SPRINT-41: Optional userId filter */}
          <View style={s.filterCard}>
            <Text style={s.filterLabel}>FILTER BY USER ID</Text>
            <View style={s.filterRow}>
              <TextInput
                style={s.filterInput}
                value={userIdInput}
                onChangeText={setUserIdInput}
                placeholder="UUID (optional)"
                placeholderTextColor={Colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={applyUserIdFilter} style={s.filterBtn}>
                <Text style={s.filterBtnText}>Apply</Text>
              </Pressable>
              {appliedUserId ? (
                <Pressable onPress={() => { setUserIdInput(''); setAppliedUserId(undefined); }} style={s.clearBtn}>
                  <Text style={s.clearBtnText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {isLoading ? (
            <View style={s.loadingCard}>
              <ActivityIndicator color={Colors.brand.blue} />
              <Text style={s.loadingText}>Loading auth sessions...</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="lock-closed-outline" size={40} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No sessions found</Text>
              <Text style={s.emptySub}>Try clearing the user filter or pull to refresh</Text>
            </View>
          ) : (
            sessions.map((session) => {
              const isCurrent = !!currentSessionId && session.sessionId === currentSessionId; // SPRINT-41:
              const displayName = session.user.fullName || session.user.username; // SPRINT-41:
              return (
                <AdminCard
                  key={session.sessionId} // SPRINT-41:
                  title={displayName} // SPRINT-41:
                  subtitle={session.user.email} // SPRINT-41:
                  badge={isCurrent // SPRINT-41:
                    ? { label: 'Current', color: Colors.brand.blue } // SPRINT-41:
                    : { label: session.user.role, color: Colors.brand.green } // SPRINT-41:
                  }
                  accentColor={isCurrent ? Colors.brand.blue : palette.violet500} // SPRINT-41:
                >
                  <View style={s.detailGrid}>
                    <View style={s.detailItem}>
                      <Text style={s.detailLabel}>Session ID</Text>
                      <Text style={s.detailValue} numberOfLines={1}>{session.sessionId}</Text>
                    </View>
                    <View style={s.detailItem}>
                      <Text style={s.detailLabel}>Provider</Text>
                      <Text style={s.detailValue}>{session.provider ?? '—'}</Text>
                    </View>
                    <View style={s.detailItemWide}>
                      <Text style={s.detailLabel}>Approximate last activity</Text>
                      <Text style={s.detailValue}>{formatApproxActivity(session.approximateLastActivityAt)}</Text>
                    </View>
                    <View style={s.detailItemWide}>
                      <Text style={s.detailLabel}>Remaining lifetime</Text>
                      <Text style={s.detailValue}>{formatRemaining(session.remainingLifetimeSeconds)}</Text>
                    </View>
                  </View>

                  <View style={s.actionRow}>
                    <Pressable
                      onPress={() => handleTerminate(session)}
                      disabled={isCurrent || terminating} // SPRINT-41:
                      style={[s.terminateBtn, (isCurrent || terminating) && { opacity: 0.45 }]}
                    >
                      <Ionicons name="close-circle" size={14} color={palette.red500} />
                      <Text style={s.terminateText}>{isCurrent ? 'Current session' : 'Terminate'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => runBulkTerminate(session.user.id, displayName)} // SPRINT-41:
                      disabled={bulkPending}
                      style={[s.bulkBtn, bulkPending && { opacity: 0.45 }]}
                    >
                      <Ionicons name="people" size={14} color={palette.violet500} />
                      <Text style={s.bulkText}>End all for user</Text>
                    </Pressable>
                  </View>
                </AdminCard>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = createThemedStyles({
  root:            { flex: 1, backgroundColor: palette.legacyBlueLight },
  safe:            { flex: 1 },
  scroll:          { flex: 1 },
  content:         { padding: 18, paddingBottom: 48 },

  header:          { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
  headerIcon:      { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headerSub:       { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  title:           { fontSize: 22, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },

  summaryRow:      { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard:     { flex: 1, backgroundColor: palette.white, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: palette.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryVal:      { fontSize: 20, fontWeight: '900' },
  summaryLbl:      { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  truncBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.legacyOrangeLight, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.25)' }, // SPRINT-41:
  truncText:       { color: palette.amber700, fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }, // SPRINT-41:

  filterCard:      { backgroundColor: palette.white, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)' }, // SPRINT-41:
  filterLabel:     { fontSize: 10, fontWeight: '900', color: Colors.text.tertiary, letterSpacing: 1, marginBottom: 8 }, // SPRINT-41:
  filterRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 }, // SPRINT-41:
  filterInput:     { flex: 1, backgroundColor: Colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border.light, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: Colors.text.primary }, // SPRINT-41:
  filterBtn:       { backgroundColor: Colors.brand.blue, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }, // SPRINT-41:
  filterBtnText:   { color: palette.white, fontSize: 13, fontWeight: '800' }, // SPRINT-41:
  clearBtn:        { paddingHorizontal: 10, paddingVertical: 10 }, // SPRINT-41:
  clearBtnText:    { color: Colors.text.secondary, fontSize: 13, fontWeight: '700' }, // SPRINT-41:

  loadingCard:     { backgroundColor: palette.white, borderRadius: 18, padding: 36, alignItems: 'center', gap: 10, shadowColor: palette.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  loadingText:     { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },
  emptyCard:       { backgroundColor: palette.white, borderRadius: 18, padding: 44, alignItems: 'center', gap: 8, shadowColor: palette.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  emptyTitle:      { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  emptySub:        { fontSize: 13, color: Colors.text.tertiary },

  detailGrid:      { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 12 },
  detailItem:      { minWidth: '40%', flexGrow: 1 },
  detailItemWide:  { width: '100%' }, // SPRINT-41:
  detailLabel:     { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600', marginBottom: 2 },
  detailValue:     { fontSize: 12, color: Colors.text.primary, fontWeight: '700' },

  actionRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, // SPRINT-41:
  terminateBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: palette.red50, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)' }, // SPRINT-41:
  terminateText:   { fontSize: 12, fontWeight: '700', color: palette.red500 }, // SPRINT-41:
  bulkBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: palette.violet50, borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.25)' }, // SPRINT-41:
  bulkText:        { fontSize: 12, fontWeight: '700', color: palette.violet500 }, // SPRINT-41:
});
