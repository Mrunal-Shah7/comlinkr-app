// src/features/admin/pages/ChatModerationScreen.tsx
//
// Reported-messages queue (reuses the unified report hook filtered to
// CHAT_MESSAGE) plus a read-only conversation transcript drill-down, reached
// either from a report card's "View conversation" button or a direct
// conversationId param.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useAdminReportedMessages,
  useAdminConversationDetail,
  useAdminConversationMessages,
  useDismissReportMutation,
  useReportActionMutation,
  useDeleteChatMessageMutation,
} from '../hooks/useAdmin';
import { alertAdminApiError } from '../api/handleAdminError';
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';

function relativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ConversationViewer({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { data: conversation, isLoading: isLoadingConvo } = useAdminConversationDetail(conversationId);
  const { items: messages, isLoading: isLoadingMessages, refresh, loadMore, meta, isLoadingMore } = useAdminConversationMessages(conversationId);
  const { mutate: deleteMessage, isPending: isDeleting } = useDeleteChatMessageMutation();

  const handleDelete = (messageId: string) => {
    appAlert('Remove message?', 'This permanently removes the message. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => deleteMessage({ messageId }, {
          onSuccess: () => void refresh(),
          onError: (err) => alertAdminApiError(err, 'Remove failed'),
        }),
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
        </Pressable>
        <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
          <Ionicons name="chatbox-ellipses" size={22} color="#FFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Admin Module</Text>
          <Text style={s.title}>Conversation</Text>
        </View>
      </View>

      {isLoadingConvo ? (
        <ActivityIndicator color={Colors.brand.blue} style={{ marginTop: 20 }} />
      ) : conversation ? (
        <View style={s.convoSummary}>
          <Text style={s.convoParticipants}>
            {conversation.participants.map((p) => `@${p.username}`).join(' · ')}
          </Text>
          <Text style={s.convoMeta}>{conversation.messageCount} messages</Text>
        </View>
      ) : null}

      {isLoadingMessages && messages.length === 0 ? (
        <ActivityIndicator color={Colors.brand.blue} style={{ marginTop: 20 }} />
      ) : messages.length === 0 ? (
        <Text style={s.emptyInline}>No messages found.</Text>
      ) : (
        <>
          {messages.map((m) => (
            <View key={m.id} style={s.messageRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.messageSender}>@{m.sender.username}</Text>
                <Text style={[s.messageContent, m.isDeleted && s.messageDeleted]}>
                  {m.isDeleted ? '(message removed)' : m.content}
                </Text>
                <Text style={s.messageTime}>{relativeTime(m.createdAt)}</Text>
              </View>
              {!m.isDeleted && (
                <Pressable onPress={() => handleDelete(m.id)} disabled={isDeleting} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
              )}
            </View>
          ))}
          {meta && meta.page < meta.totalPages && (
            <Pressable style={s.loadMoreBtn} onPress={loadMore} disabled={isLoadingMore}>
              <Text style={s.loadMoreText}>{isLoadingMore ? 'Loading...' : 'Load more'}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

export default function ChatModerationScreen() {
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const [viewingConversation, setViewingConversation] = useState<string | null>(params.conversationId ?? null);

  const {
    items: reports, meta, isLoading, isLoadingMore, isError, errorMessage, refresh, loadMore,
  } = useAdminReportedMessages();
  const { mutate: dismissReport, isPending: isDismissing } = useDismissReportMutation();
  const { mutate: actionReport, isPending: isActioning } = useReportActionMutation();
  const hasMutation = isDismissing || isActioning;

  if (viewingConversation) {
    return (
      <View style={s.root}>
        <AdminBackdrop />
        <SafeAreaView style={s.safe}>
          <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <ConversationViewer conversationId={viewingConversation} onBack={() => setViewingConversation(null)} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const handleDismiss = (reportId: string) => {
    appAlert('Dismiss report?', 'No action will be taken against the message.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dismiss', onPress: () => dismissReport({ reportId }, { onSuccess: () => void refresh(), onError: (err) => alertAdminApiError(err, 'Dismiss failed') }) },
    ]);
  };

  const handleRemoveMessage = (reportId: string) => {
    appAlert('Remove message?', 'This permanently removes the reported message.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => actionReport({ reportId, action: 'REMOVE_MESSAGE' }, { onSuccess: () => void refresh(), onError: (err) => alertAdminApiError(err, 'Remove failed') }) },
    ]);
  };

  const handleBanSender = (reportId: string) => {
    appAlert('Ban sender?', 'This suspends the message sender’s account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ban', style: 'destructive', onPress: () => actionReport({ reportId, action: 'BAN_FROM_CHAT' }, { onSuccess: () => void refresh(), onError: (err) => alertAdminApiError(err, 'Ban failed') }) },
    ]);
  };

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && reports.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="chatbox-ellipses" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Chat Moderation</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={[s.statVal, { color: '#EF4444' }]}>{meta?.total ?? reports.length}</Text>
              <Text style={s.statLbl}>Reported</Text>
            </View>
          </View>

          {isError && errorMessage ? (
            <View style={s.emptyCard}>
              <Text style={{ color: '#EF4444', textAlign: 'center' }}>{errorMessage}</Text>
              <Pressable onPress={refresh} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.brand.blue, fontWeight: '700' }}>Retry</Text>
              </Pressable>
            </View>
          ) : isLoading && reports.length === 0 ? (
            <View style={s.loadingCard}>
              <Text style={s.loadingText}>Loading reported messages...</Text>
            </View>
          ) : reports.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="chatbox-ellipses-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No reported messages</Text>
              <Text style={s.emptySub}>Reported chat messages will appear here</Text>
            </View>
          ) : (
            <>
              {reports.map((report) => (
                <View key={report.id} style={s.card}>
                  <View style={s.cardHeaderRow}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={s.cardTitle} numberOfLines={2}>{report.targetTitle ?? 'Reported message'}</Text>
                  </View>
                  <Text style={s.cardMeta}>Reported by @{report.reporter.username} · {report.reason} · {relativeTime(report.createdAt)}</Text>
                  {report.status === 'PENDING' || !report.status ? (
                    <View style={s.actionsRow}>
                      <Pressable style={s.dismissBtn} onPress={() => !hasMutation && handleDismiss(report.id)}>
                        <Ionicons name="close" size={13} color={Colors.text.secondary} />
                        <Text style={s.dismissText}>Dismiss</Text>
                      </Pressable>
                      <Pressable style={s.warnBtn} onPress={() => !hasMutation && handleRemoveMessage(report.id)}>
                        <Ionicons name="trash-outline" size={13} color="#F59E0B" />
                        <Text style={s.warnBtnText}>Remove msg</Text>
                      </Pressable>
                      <Pressable style={s.resolveBtn} onPress={() => !hasMutation && handleBanSender(report.id)}>
                        <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.resolveBtnGrad}>
                          <Ionicons name="ban" size={13} color="#FFF" />
                          <Text style={s.resolveText}>Ban sender</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={s.resolvedBanner}>
                      <Text style={s.resolvedBannerText}>Resolved</Text>
                    </View>
                  )}
                  {report.parentId && (
                    <Pressable style={s.viewConvoBtn} onPress={() => setViewingConversation(report.parentId!)}>
                      <Ionicons name="chatbox-outline" size={13} color={Colors.brand.blue} />
                      <Text style={s.viewConvoBtnText}>View conversation</Text>
                    </Pressable>
                  )}
                </View>
              ))}
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

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 13, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLbl: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  loadingCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 32, alignItems: 'center' },
  loadingText: { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
  emptySub: { fontSize: 13, color: Colors.text.tertiary },
  emptyInline: { fontSize: 12, color: Colors.text.tertiary, textAlign: 'center', marginTop: 20 },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  cardMeta: { fontSize: 11, color: Colors.text.tertiary, marginBottom: 10 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  dismissBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  dismissText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  warnBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: '#FFFBEB' },
  warnBtnText: { fontSize: 12, fontWeight: '700', color: '#B45309' },
  resolveBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  resolveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  resolveText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  resolvedBanner: { paddingVertical: 8, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10 },
  resolvedBannerText: { fontSize: 12, fontWeight: '600', color: Colors.text.tertiary },

  viewConvoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)', backgroundColor: Colors.brand.blueLight },
  viewConvoBtnText: { fontSize: 12, fontWeight: '700', color: Colors.brand.blue },

  loadMoreBtn: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: Colors.brand.blue },

  convoSummary: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 14 },
  convoParticipants: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  convoMeta: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },

  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  messageSender: { fontSize: 12, fontWeight: '700', color: Colors.brand.blue },
  messageContent: { fontSize: 13, color: Colors.text.primary, marginTop: 2 },
  messageDeleted: { color: Colors.text.tertiary, fontStyle: 'italic' },
  messageTime: { fontSize: 10, color: Colors.text.tertiary, marginTop: 4 },
});
