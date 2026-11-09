// src/features/admin/pages/DataPrivacyScreen.tsx
//
// Two sections: a queue of privacy requests (export/erasure) awaiting review,
// and a manual lookup that lets an admin trigger a fresh export or erasure
// request for a user directly — so admins never need to touch the database to
// answer a data-subject request.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useAdminPrivacyRequests,
  useApprovePrivacyRequestMutation,
  useRejectPrivacyRequestMutation,
  useRequestDataExportMutation,
  useRequestErasureMutation,
  useAdminUserDetail,
} from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import { alertAdminApiError } from '../api/handleAdminError';
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: '#F59E0B', bg: '#FFF3E6', label: 'Pending' },
  PROCESSING: { color: Colors.brand.blue, bg: Colors.brand.blueLight, label: 'Processing' },
  COMPLETED: { color: Colors.brand.green, bg: Colors.brand.greenLight, label: 'Completed' },
  REJECTED: { color: '#EF4444', bg: '#FEF2F2', label: 'Rejected' },
};

function relativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ManualLookup() {
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [erasureReason, setErasureReason] = useState('');
  const [showErasureInput, setShowErasureInput] = useState(false);

  const { data: user, isLoading, errorMessage } = useAdminUserDetail(activeId);
  const { mutate: requestExport, isPending: isExporting } = useRequestDataExportMutation();
  const { mutate: requestErasure, isPending: isErasing } = useRequestErasureMutation();

  const handleExport = () => {
    if (!activeId) return;
    requestExport({ userId: activeId }, {
      onSuccess: () => showToast('The export request has been queued.', "success"),
      onError: (err) => alertAdminApiError(err, 'Export request failed'),
    });
  };

  const handleErasure = () => {
    if (!activeId || !erasureReason.trim()) return;
    appAlert('Submit erasure request?', 'This begins the account erasure process. This cannot be undone once processed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit', style: 'destructive',
        onPress: () => requestErasure({ userId: activeId, reason: erasureReason.trim() }, {
          onSuccess: () => { showToast('The erasure request has been queued for review.', "success"); setShowErasureInput(false); setErasureReason(''); },
          onError: (err) => alertAdminApiError(err, 'Erasure request failed'),
        }),
      },
    ]);
  };

  return (
    <View style={s.card}>
      <Text style={s.sectionLabel}>MANUAL LOOKUP</Text>
      <View style={s.lookupRow}>
        <TextInput
          style={s.lookupInput}
          placeholder="Enter user ID..."
          placeholderTextColor={Colors.text.tertiary}
          value={lookupId}
          onChangeText={setLookupId}
          autoCapitalize="none"
        />
        <Pressable style={s.lookupBtn} onPress={() => setActiveId(lookupId.trim() || null)}>
          <Ionicons name="search" size={16} color="#FFF" />
        </Pressable>
      </View>

      {activeId && isLoading ? (
        <ActivityIndicator color={Colors.brand.blue} style={{ marginTop: 12 }} />
      ) : activeId && errorMessage ? (
        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 12 }}>{errorMessage}</Text>
      ) : activeId && user ? (
        <View style={s.lookupResult}>
          <Text style={s.lookupName}>{user.fullName ?? user.name ?? user.username}</Text>
          <Text style={s.lookupSub}>@{user.username} · {user.email}</Text>
          {user.counts && (
            <View style={s.lookupCountsRow}>
              <Text style={s.lookupCountsText}>
                {user.counts.feedPosts} posts · {user.counts.housingListings} listings · {user.counts.restaurants} restaurants · {user.counts.conversations} chats · {user.counts.events} events
              </Text>
            </View>
          )}
          <View style={s.lookupActionsRow}>
            <Pressable style={s.exportBtn} onPress={handleExport} disabled={isExporting}>
              <Ionicons name="download-outline" size={14} color={Colors.brand.blue} />
              <Text style={s.exportBtnText}>Generate Data Export</Text>
            </Pressable>
            <Pressable style={s.erasureBtn} onPress={() => setShowErasureInput((p) => !p)} disabled={isErasing}>
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
              <Text style={s.erasureBtnText}>Submit Erasure Request</Text>
            </Pressable>
          </View>
          {showErasureInput && (
            <View style={s.erasureInputRow}>
              <TextInput
                style={s.erasureInput}
                placeholder="Reason for erasure request (required)..."
                placeholderTextColor={Colors.text.tertiary}
                value={erasureReason}
                onChangeText={setErasureReason}
                multiline
              />
              <Pressable style={s.erasureSendBtn} onPress={handleErasure} disabled={!erasureReason.trim() || isErasing}>
                <Ionicons name="send" size={14} color="#FFF" />
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function DataPrivacyScreen() {
  const [filter, setFilter] = useState('all');
  const {
    items: requests, meta, isLoading, isLoadingMore, isError, errorMessage, refresh, loadMore, setParams,
  } = useAdminPrivacyRequests();
  const { mutate: approve, isPending: isApproving } = useApprovePrivacyRequestMutation();
  const { mutate: reject, isPending: isRejecting } = useRejectPrivacyRequestMutation();
  const hasMutation = isApproving || isRejecting;

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setParams({ status: value === 'all' ? undefined : (value.toUpperCase() as any) });
  };

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = (requestId: string) => {
    appAlert('Approve request?', 'This triggers backend processing (export generation or erasure pipeline).', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => approve({ requestId }, { onSuccess: () => void refresh(), onError: (err) => alertAdminApiError(err, 'Approve failed') }) },
    ]);
  };

  const handleSendReject = () => {
    if (!rejectingId || !rejectReason.trim()) return;
    reject({ requestId: rejectingId, reason: rejectReason.trim() }, {
      onSuccess: () => { void refresh(); setRejectingId(null); setRejectReason(''); },
      onError: (err) => alertAdminApiError(err, 'Reject failed'),
    });
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <SafeAreaView style={s.safe}>
        <ScrollView keyboardShouldPersistTaps="handled"
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && requests.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={['#8B5CF6', '#6D3FD1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="lock-closed" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Data Privacy</Text>
            </View>
            {pendingCount > 0 && (
              <View style={s.urgentBadge}>
                <Text style={s.urgentText}>{pendingCount} pending</Text>
              </View>
            )}
          </View>

          <ManualLookup />

          <Text style={[s.sectionLabel, { marginTop: 20 }]}>PRIVACY REQUESTS</Text>
          <FilterBar
            searchValue=""
            onSearchChange={() => {}}
            placeholder=""
            filters={[
              { label: 'All', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'Processing', value: 'processing' },
              { label: 'Completed', value: 'completed' },
              { label: 'Rejected', value: 'rejected' },
            ]}
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
          ) : isLoading && requests.length === 0 ? (
            <View style={s.loadingCard}>
              <Text style={s.loadingText}>Loading privacy requests...</Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="lock-open-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No privacy requests</Text>
              <Text style={s.emptySub}>Export & erasure requests will appear here</Text>
            </View>
          ) : (
            <>
              {requests.map((req) => {
                const meta2 = STATUS_META[req.status] ?? STATUS_META.PENDING;
                return (
                  <View key={req.id} style={s.card}>
                    <View style={s.cardHeaderRow}>
                      <Ionicons name={req.type === 'EXPORT' ? 'download-outline' : 'trash-outline'} size={16} color={meta2.color} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{req.type === 'EXPORT' ? 'Data Export' : 'Erasure Request'}</Text>
                        <Text style={s.cardSub}>{req.user.username} · {req.user.email}</Text>
                      </View>
                      <View style={[s.statusChip, { backgroundColor: meta2.bg }]}>
                        <Text style={[s.statusChipText, { color: meta2.color }]}>{meta2.label}</Text>
                      </View>
                    </View>
                    {req.reason && <Text style={s.cardReason}>{req.reason}</Text>}
                    <Text style={s.cardMeta}>Requested by {req.requestedBy.toLowerCase()} · {relativeTime(req.createdAt)}</Text>
                    {req.status === 'PENDING' && (
                      <>
                        {rejectingId === req.id && (
                          <View style={s.erasureInputRow}>
                            <TextInput
                              style={s.erasureInput}
                              placeholder="Rejection reason (required)..."
                              placeholderTextColor={Colors.text.tertiary}
                              value={rejectReason}
                              onChangeText={setRejectReason}
                              multiline
                            />
                            <Pressable style={s.erasureSendBtn} onPress={handleSendReject} disabled={!rejectReason.trim() || hasMutation}>
                              <Ionicons name="send" size={14} color="#FFF" />
                            </Pressable>
                          </View>
                        )}
                        <View style={s.actionsRow}>
                          <Pressable style={s.rejectBtn} onPress={() => !hasMutation && setRejectingId((p) => (p === req.id ? null : req.id))}>
                            <Text style={s.rejectBtnText}>Reject</Text>
                          </Pressable>
                          <Pressable style={s.approveBtn} onPress={() => !hasMutation && handleApprove(req.id)}>
                            <Text style={s.approveBtnText}>Approve & Process</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                    {req.downloadUrl && (
                      <Text style={s.downloadNote}>Export ready — signed link available server-side.</Text>
                    )}
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
  urgentBadge: { backgroundColor: '#FFF3E6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.25)' },
  urgentText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },

  sectionLabel: { fontSize: 11, fontWeight: '900', color: Colors.text.tertiary, letterSpacing: 1.2, marginBottom: 10 },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  cardSub: { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },
  cardReason: { fontSize: 12, color: Colors.text.secondary, marginBottom: 6 },
  cardMeta: { fontSize: 11, color: Colors.text.tertiary, marginBottom: 8 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 10, fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 8 },
  rejectBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  rejectBtnText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  approveBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.brand.green },
  approveBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  downloadNote: { fontSize: 11, color: Colors.brand.green, marginTop: 6 },

  loadingCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 32, alignItems: 'center' },
  loadingText: { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
  emptySub: { fontSize: 13, color: Colors.text.tertiary },

  loadMoreBtn: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: Colors.brand.blue },

  lookupRow: { flexDirection: 'row', gap: 8 },
  lookupInput: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.15)', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: Colors.text.primary },
  lookupBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: Colors.brand.blue, alignItems: 'center', justifyContent: 'center' },
  lookupResult: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  lookupName: { fontSize: 14, fontWeight: '800', color: Colors.text.primary },
  lookupSub: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  lookupCountsRow: { marginTop: 8 },
  lookupCountsText: { fontSize: 11, color: Colors.text.tertiary },
  lookupActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)', backgroundColor: Colors.brand.blueLight },
  exportBtnText: { fontSize: 12, fontWeight: '700', color: Colors.brand.blue },
  erasureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: '#FEF2F2' },
  erasureBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  erasureInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  erasureInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: Colors.text.primary },
  erasureSendBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
});
