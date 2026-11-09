// src/features/admin/pages/ReportsScreen.tsx

import React, { useMemo, useState } from 'react';
import {
  Alert, View, Text, ScrollView, StyleSheet, RefreshControl,
  Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useAdminReports,
  useDismissReportMutation,
  useDeleteListingFromReportMutation,
  useReportActionMutation,
} from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import type { AdminListingReport, AdminReportActionType } from '../../../api/admin.api';
import { alertAdminApiError } from '../api/handleAdminError'; // SPRINT-41:
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

const STATUS_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  PENDING:   { color: '#EF4444',            bg: '#FEF2F2',               icon: 'alert-circle',     label: 'Pending'   },
  RESOLVED:  { color: Colors.brand.green,   bg: Colors.brand.greenLight, icon: 'checkmark-circle', label: 'Resolved'  },
  DISMISSED: { color: Colors.text.tertiary, bg: '#F3F4F6',               icon: 'close-circle',     label: 'Dismissed' },
};

const TARGET_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  HOUSING:           { icon: 'home',              color: Colors.brand.blue,  label: 'Housing Listing' },
  housing:           { icon: 'home',              color: Colors.brand.blue,  label: 'Housing Listing' },
  RESTAURANT:        { icon: 'restaurant',         color: Colors.brand.green, label: 'Restaurant' },
  restaurant:        { icon: 'restaurant',         color: Colors.brand.green, label: 'Restaurant' },
  USER:              { icon: 'person',             color: '#8B5CF6',          label: 'User' },
  COMMUNITY_POST:    { icon: 'chatbubbles',         color: '#8B5CF6',          label: 'Community Post' },
  COMMUNITY_MEMBER:  { icon: 'person-circle',       color: '#8B5CF6',          label: 'Community Member' },
  QA_QUESTION:       { icon: 'help-circle',         color: '#F59E0B',          label: 'Q&A Question' },
  QA_ANSWER:         { icon: 'chatbox',             color: '#F59E0B',          label: 'Q&A Answer' },
  EVENT:             { icon: 'calendar',            color: Colors.brand.blue,  label: 'Event' },
  CHAT_MESSAGE:      { icon: 'chatbox-ellipses',     color: '#EF4444',          label: 'Chat Message' },
};

const ACTIONABLE_TARGET_TYPES = new Set([
  'USER', 'COMMUNITY_POST', 'COMMUNITY_MEMBER', 'QA_QUESTION', 'QA_ANSWER', 'EVENT', 'CHAT_MESSAGE',
]);

const SOURCE_META: Record<string, { color: string; bg: string; label: string }> = { // SPRINT-41:
  LISTING_REPORT: { color: Colors.brand.blue, bg: Colors.brand.blueLight, label: 'Via listing reports' }, // SPRINT-41:
  CONTENT_REPORT: { color: '#8B5CF6', bg: '#F3F0FF', label: 'Via content reports' }, // SPRINT-41:
}; // SPRINT-41:

const REASON_LABELS: Record<string, string> = {
  misinformation: 'Misinformation',
  spam: 'Spam or advertising',
  scam: 'Scam or fraud',
  inappropriate: 'Inappropriate content',
  harassment: 'Harassment or bullying',
  hate_speech: 'Hate speech',
  violence: 'Violence or threats',
  copyright: 'Copyright infringement',
  fake_listing: 'Fake or misleading listing',
  price_mismatch: 'Price mismatch',
  wrong_location: 'Wrong location info',
  other: 'Other',
};

function ReportCard({
  report,
  relativeTime,
  onDismiss,
  onResolve,
  onAction,
}: {
  report: AdminListingReport;
  relativeTime: (d: string) => string;
  onDismiss: (id: string) => void;
  onResolve: (id: string) => void;
  onAction: (report: AdminListingReport, action: AdminReportActionType, reason?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [warnMessage, setWarnMessage] = useState('');
  const [showWarnInput, setShowWarnInput] = useState(false);
  const isContent = report.source === 'CONTENT_REPORT'; // SPRINT-41:
  const isListing = report.source === 'LISTING_REPORT' || (!report.source && report.status === 'PENDING'); // SPRINT-41:
  const statusKey = report.status ?? (isContent ? undefined : 'PENDING'); // SPRINT-41:
  const meta = statusKey ? (STATUS_META[statusKey] ?? STATUS_META.PENDING) : STATUS_META.PENDING;
  const rawType = report.targetType ?? '';
  const typeMeta = TARGET_TYPE_META[rawType] ?? TARGET_TYPE_META[rawType.toLowerCase()] ?? TARGET_TYPE_META.HOUSING;
  const reasonLabel = REASON_LABELS[report.reason] ?? report.reason;
  const sourceMeta = SOURCE_META[report.source ?? ''] ?? null; // SPRINT-41:
  const isActionableType = ACTIONABLE_TARGET_TYPES.has(rawType.toUpperCase());
  const isPendingStatus = report.status === 'PENDING' || !report.status;

  return (
    <View style={rc.card}>
      <View style={[rc.accentLine, { backgroundColor: isContent ? '#8B5CF6' : meta.color }]} />

      <View style={rc.inner}>
        <View style={rc.headerRow}>
          <View style={[rc.typeIconWrap, { backgroundColor: `${typeMeta.color}14` }]}>
            <Ionicons name={typeMeta.icon as any} size={16} color={typeMeta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rc.targetTitle} numberOfLines={2}>
              {report.targetTitle ?? `${typeMeta.label} · ${report.targetId}`}
            </Text>
            <Text style={rc.targetSub}>{typeMeta.label}</Text>
          </View>
          {!isContent && (
            <View style={[rc.statusChip, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon as any} size={11} color={meta.color} />
              <Text style={[rc.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          )}
        </View>

        <View style={rc.chipsRow}>
          {sourceMeta && ( // SPRINT-41: always show source on card
            <View style={[rc.chip, { backgroundColor: sourceMeta.bg }]}>
              <Ionicons name="layers" size={11} color={sourceMeta.color} />
              <Text style={[rc.chipText, { color: sourceMeta.color }]}>{sourceMeta.label}</Text>
            </View>
          )}
          <View style={rc.chip}>
            <Ionicons name="person" size={11} color={Colors.text.tertiary} />
            <Text style={rc.chipText}>@{report.reporter.username}</Text>
          </View>
          <View style={[rc.chip, { backgroundColor: '#FFF3E6' }]}>
            <Ionicons name="flag" size={11} color="#FF7B00" />
            <Text style={[rc.chipText, { color: '#FF7B00' }]}>{reasonLabel}</Text>
          </View>
          <View style={rc.chip}>
            <Ionicons name="time-outline" size={11} color={Colors.text.tertiary} />
            <Text style={rc.chipText}>{relativeTime(report.createdAt)}</Text>
          </View>
        </View>

        <Pressable style={rc.expandBtn} onPress={() => setExpanded((p) => !p)}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.brand.blue} />
          <Text style={rc.expandText}>{expanded ? 'Hide Details' : 'View Full Report'}</Text>
        </Pressable>

        {expanded && (
          <View style={rc.expandPanel}>
            <Text style={rc.sectionLabel}>REPORTED CONTENT</Text>
            {report.targetAddress && (
              <View style={rc.detailRow}>
                <Ionicons name="location-outline" size={13} color={Colors.text.tertiary} />
                <Text style={rc.detailText}>{report.targetAddress}</Text>
              </View>
            )}
            <View style={rc.detailRow}>
              <Ionicons name="key-outline" size={13} color={Colors.text.tertiary} />
              <Text style={rc.detailText}>Content ID: {report.targetId}</Text>
            </View>

            <Text style={[rc.sectionLabel, { marginTop: 12 }]}>REASON</Text>
            <View style={rc.descBox}>
              <Text style={rc.descText}>{report.reason}</Text>
            </View>

            <Text style={[rc.sectionLabel, { marginTop: 12 }]}>REPORTER</Text>
            <View style={rc.detailRow}>
              <Ionicons name="person-outline" size={13} color={Colors.text.tertiary} />
              <Text style={rc.detailText}>@{report.reporter.username}</Text>
            </View>

            <View style={[rc.detailRow, { marginTop: 4 }]}>
              <Ionicons name="calendar-outline" size={13} color={Colors.text.tertiary} />
              <Text style={rc.detailText}>
                Submitted: {new Date(report.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </View>
        )}

        {/* Branch by targetType: HOUSING/RESTAURANT keep the original dismiss/resolve flow;
            USER/COMMUNITY/QA/EVENT/CHAT get type-specific actions; anything unmapped falls
            back to the original "cannot be actioned" notice so nothing regresses. */}
        {isListing && (report.status === 'PENDING' || !report.status) ? ( // SPRINT-41: unchanged HOUSING/RESTAURANT path
          <View style={rc.actionsRow}>
            <Pressable style={rc.dismissBtn} onPress={() => onDismiss(report.id)}>
              <Ionicons name="close" size={13} color={Colors.text.secondary} />
              <Text style={rc.dismissText}>Dismiss</Text>
            </Pressable>
            <Pressable style={rc.resolveBtn} onPress={() => onResolve(report.id)}>
              <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={rc.resolveBtnGrad}>
                <Ionicons name="trash" size={13} color="#FFF" />
                <Text style={rc.resolveText}>Resolve (delete)</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : isListing ? (
          <View style={[rc.resolvedBanner, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon as any} size={13} color={meta.color} />
            <Text style={[rc.resolvedBannerText, { color: meta.color }]}>This report has been {meta.label.toLowerCase()}</Text>
          </View>
        ) : isActionableType && isPendingStatus ? (
          <View style={{ marginTop: 8 }}>
            {rawType.toUpperCase() === 'USER' && (
              <>
                {showWarnInput && (
                  <View style={rc.warnInputRow}>
                    <TextInput
                      style={rc.warnInput}
                      placeholder="Warning message to send..."
                      placeholderTextColor={Colors.text.tertiary}
                      value={warnMessage}
                      onChangeText={setWarnMessage}
                      multiline
                    />
                    <Pressable
                      style={rc.warnSendBtn}
                      onPress={() => {
                        if (!warnMessage.trim()) return;
                        onAction(report, 'WARN_USER', warnMessage.trim());
                        setShowWarnInput(false);
                        setWarnMessage('');
                      }}
                    >
                      <Ionicons name="send" size={14} color="#FFF" />
                    </Pressable>
                  </View>
                )}
                <View style={rc.actionsRow}>
                  <Pressable style={rc.dismissBtn} onPress={() => onDismiss(report.id)}>
                    <Ionicons name="close" size={13} color={Colors.text.secondary} />
                    <Text style={rc.dismissText}>Dismiss</Text>
                  </Pressable>
                  <Pressable style={rc.warnBtn} onPress={() => setShowWarnInput((p) => !p)}>
                    <Ionicons name="alert-circle-outline" size={13} color="#F59E0B" />
                    <Text style={rc.warnBtnText}>Warn</Text>
                  </Pressable>
                  <Pressable style={rc.resolveBtn} onPress={() => onAction(report, 'SUSPEND_USER')}>
                    <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={rc.resolveBtnGrad}>
                      <Ionicons name="ban" size={13} color="#FFF" />
                      <Text style={rc.resolveText}>Suspend</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
                {report.reportedUser?.id && (
                  <Pressable
                    style={rc.caseFileBtn}
                    onPress={() => router.push(`/admin/user-safety/${report.reportedUser!.id}` as any)}
                  >
                    <Ionicons name="folder-open-outline" size={13} color={Colors.brand.blue} />
                    <Text style={rc.caseFileBtnText}>View case file</Text>
                  </Pressable>
                )}
              </>
            )}
            {['COMMUNITY_POST', 'COMMUNITY_MEMBER', 'QA_QUESTION', 'QA_ANSWER', 'EVENT'].includes(rawType.toUpperCase()) && (
              <View style={rc.actionsRow}>
                <Pressable style={rc.dismissBtn} onPress={() => onDismiss(report.id)}>
                  <Ionicons name="close" size={13} color={Colors.text.secondary} />
                  <Text style={rc.dismissText}>Dismiss</Text>
                </Pressable>
                <Pressable style={rc.resolveBtn} onPress={() => onAction(report, 'REMOVE_CONTENT')}>
                  <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={rc.resolveBtnGrad}>
                    <Ionicons name="trash" size={13} color="#FFF" />
                    <Text style={rc.resolveText}>Remove content</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
            {rawType.toUpperCase() === 'CHAT_MESSAGE' && (
              <>
                <View style={rc.actionsRow}>
                  <Pressable style={rc.dismissBtn} onPress={() => onDismiss(report.id)}>
                    <Ionicons name="close" size={13} color={Colors.text.secondary} />
                    <Text style={rc.dismissText}>Dismiss</Text>
                  </Pressable>
                  <Pressable style={rc.warnBtn} onPress={() => onAction(report, 'REMOVE_MESSAGE')}>
                    <Ionicons name="trash-outline" size={13} color="#F59E0B" />
                    <Text style={rc.warnBtnText}>Remove msg</Text>
                  </Pressable>
                  <Pressable style={rc.resolveBtn} onPress={() => onAction(report, 'BAN_FROM_CHAT')}>
                    <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={rc.resolveBtnGrad}>
                      <Ionicons name="ban" size={13} color="#FFF" />
                      <Text style={rc.resolveText}>Ban sender</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
                {report.parentId && (
                  <Pressable
                    style={rc.caseFileBtn}
                    onPress={() => router.push({ pathname: '/admin/chat-moderation', params: { conversationId: report.parentId! } } as any)}
                  >
                    <Ionicons name="chatbox-outline" size={13} color={Colors.brand.blue} />
                    <Text style={rc.caseFileBtnText}>View conversation</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        ) : !isPendingStatus && isActionableType ? (
          <View style={[rc.resolvedBanner, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon as any} size={13} color={meta.color} />
            <Text style={[rc.resolvedBannerText, { color: meta.color }]}>This report has been {meta.label.toLowerCase()}</Text>
          </View>
        ) : (
          <View style={rc.contentNotice}>
            <Ionicons name="information-circle" size={14} color="#8B5CF6" />
            <Text style={rc.contentNoticeText}>
              Content reports cannot be actioned from this queue yet
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { // SPRINT-41:
    items: reports, // SPRINT-41:
    meta, // SPRINT-41:
    isLoading, // SPRINT-41:
    isLoadingMore, // SPRINT-41:
    isError, // SPRINT-41:
    errorMessage, // SPRINT-41:
    refresh, // SPRINT-41:
    loadMore, // SPRINT-41:
  } = useAdminReports(); // SPRINT-41:
  const { mutate: dismissReport, isPending: isDismissing } = useDismissReportMutation();
  const { mutate: deleteListing, isPending: isDeleting } = useDeleteListingFromReportMutation();
  const { mutate: actionReport, isPending: isActioning } = useReportActionMutation();

  const filtered = useMemo(() => reports.filter((r) => {
    const term = search.toLowerCase();
    const matchSearch =
      search === '' ||
      r.reason.toLowerCase().includes(term) ||
      (r.targetTitle ?? '').toLowerCase().includes(term) ||
      r.reporter.username.toLowerCase().includes(term) ||
      (r.source ?? '').toLowerCase().includes(term); // SPRINT-41:
    const type = (r.targetType ?? '').toUpperCase();
    if (filter === 'listing_source') return matchSearch && r.source === 'LISTING_REPORT'; // SPRINT-41:
    if (filter === 'content_source') return matchSearch && r.source === 'CONTENT_REPORT'; // SPRINT-41:
    if (filter === 'type_user') return matchSearch && type === 'USER';
    if (filter === 'type_community') return matchSearch && (type === 'COMMUNITY_POST' || type === 'COMMUNITY_MEMBER');
    if (filter === 'type_qa') return matchSearch && (type === 'QA_QUESTION' || type === 'QA_ANSWER');
    if (filter === 'type_event') return matchSearch && type === 'EVENT';
    if (filter === 'type_chat') return matchSearch && type === 'CHAT_MESSAGE';
    const statusMap: Record<string, string> = { open: 'PENDING', resolved: 'RESOLVED', dismissed: 'DISMISSED' };
    const mappedStatus = statusMap[filter];
    const matchFilter =
      filter === 'all' ||
      r.status === mappedStatus;
    return matchSearch && matchFilter;
  }), [reports, search, filter]);

  const openCount = reports.filter(r => r.status === 'PENDING' || !r.status).length; // SPRINT-41: widened from "source !== CONTENT_REPORT" now that more types are actionable
  const contentCount = reports.filter(r => r.source === 'CONTENT_REPORT').length; // SPRINT-41:
  const userReportCount = reports.filter(r => (r.targetType ?? '').toUpperCase() === 'USER').length;
  const hasMutation = isDismissing || isDeleting || isActioning;

  const relativeTime = useMemo(() => (date: string) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, []);

  // SPRINT-41: Simple dismiss confirm — no notes (not persisted)
  const handleDismiss = (reportId: string) => { // SPRINT-41:
    appAlert( // SPRINT-41:
      'Dismiss Report', // SPRINT-41:
      'Mark this listing report as dismissed? No action will be taken against the content.', // SPRINT-41:
      [ // SPRINT-41:
        { text: 'Cancel', style: 'cancel' }, // SPRINT-41:
        { // SPRINT-41:
          text: 'Dismiss', // SPRINT-41:
          onPress: () => dismissReport({ reportId }, { // SPRINT-41:
            onSuccess: () => void refresh(), // SPRINT-41:
            onError: (err) => alertAdminApiError(err, 'Dismiss failed'), // SPRINT-41:
          }), // SPRINT-41:
        }, // SPRINT-41:
      ], // SPRINT-41:
    ); // SPRINT-41:
  }; // SPRINT-41:

  // SPRINT-41: Resolve deletes target AND resolves ALL reports for that target
  const handleResolve = (reportId: string) => { // SPRINT-41:
    appAlert( // SPRINT-41:
      'Resolve & delete target?', // SPRINT-41:
      'This permanently deletes the reported listing/restaurant AND resolves ALL listing reports for that same target. This cannot be undone.', // SPRINT-41:
      [ // SPRINT-41:
        { text: 'Cancel', style: 'cancel' }, // SPRINT-41:
        { // SPRINT-41:
          text: 'Delete & resolve all', // SPRINT-41:
          style: 'destructive', // SPRINT-41:
          onPress: () => { // SPRINT-41:
            deleteListing({ reportId }, { // SPRINT-41:
              onSuccess: () => { // SPRINT-41:
                showToast('Target deleted and all associated listing reports resolved.', "success"); // SPRINT-41:
                void refresh(); // SPRINT-41:
              }, // SPRINT-41:
              onError: (err) => alertAdminApiError(err, 'Resolve failed'), // SPRINT-41:
            }); // SPRINT-41:
          }, // SPRINT-41:
        }, // SPRINT-41:
      ], // SPRINT-41:
    ); // SPRINT-41:
  }; // SPRINT-41:

  const ACTION_CONFIRM: Partial<Record<AdminReportActionType, { title: string; message: string; confirmLabel: string; destructive?: boolean }>> = {
    SUSPEND_USER: { title: 'Suspend user?', message: 'This suspends the reported user’s account.', confirmLabel: 'Suspend', destructive: true },
    REMOVE_CONTENT: { title: 'Remove content?', message: 'This permanently removes the reported content. This cannot be undone.', confirmLabel: 'Remove', destructive: true },
    REMOVE_MESSAGE: { title: 'Remove message?', message: 'This permanently removes the reported message. This cannot be undone.', confirmLabel: 'Remove', destructive: true },
    BAN_FROM_CHAT: { title: 'Ban sender from chat?', message: 'This suspends the message sender’s account.', confirmLabel: 'Ban', destructive: true },
  };

  // WARN_USER is sent directly (the inline TextInput in ReportCard is its own confirm step);
  // every other action gets a confirm dialog since they're destructive/irreversible.
  const handleAction = (report: AdminListingReport, action: AdminReportActionType, reason?: string) => {
    const runAction = () => actionReport({ reportId: report.id, action, reason }, {
      onSuccess: () => void refresh(),
      onError: (err) => alertAdminApiError(err, 'Action failed'),
    });
    const cfg = ACTION_CONFIRM[action];
    if (!cfg) {
      runAction();
      return;
    }
    appAlert(
      cfg.title,
      cfg.message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: cfg.confirmLabel, style: cfg.destructive ? 'destructive' : 'default', onPress: runAction },
      ],
    );
  };

  return (
    <View style={s.root}>
      <AdminBackdrop />

      <SafeAreaView style={s.safe}>
        <ScrollView keyboardShouldPersistTaps="handled"
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && reports.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="flag" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Reports & Moderation</Text>
            </View>
            {openCount > 0 && (
              <View style={s.urgentBadge}>
                <View style={s.urgentDot} />
                <Text style={s.urgentText}>{openCount} open</Text>
              </View>
            )}
          </View>

          <View style={s.statsRow}>
            {[
              { label: 'Total', value: meta?.total ?? reports.length, color: Colors.text.primary },
              { label: 'Pending', value: openCount, color: '#EF4444' },
              { label: 'Users', value: userReportCount, color: '#8B5CF6' },
              { label: 'Content', value: contentCount, color: '#F59E0B' }, // SPRINT-41:
            ].map((stat) => (
              <View key={stat.label} style={s.statCard}>
                <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLbl}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Search reason, title, reporter..."
            filters={[
              { label: 'All', value: 'all' },
              { label: 'Pending', value: 'open' },
              { label: 'Listing', value: 'listing_source' }, // SPRINT-41:
              { label: 'Content', value: 'content_source' }, // SPRINT-41:
              { label: 'Users', value: 'type_user' },
              { label: 'Community', value: 'type_community' },
              { label: 'Q&A', value: 'type_qa' },
              { label: 'Events', value: 'type_event' },
              { label: 'Chat', value: 'type_chat' },
              { label: 'Resolved', value: 'resolved' },
              { label: 'Dismissed', value: 'dismissed' },
            ]}
            activeFilter={filter}
            onFilterChange={setFilter}
          />

          {isError && errorMessage ? ( // SPRINT-41:
            <View style={s.emptyCard}>
              <Text style={{ color: '#EF4444', textAlign: 'center' }}>{errorMessage}</Text>
              <Pressable onPress={refresh} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.brand.blue, fontWeight: '700' }}>Retry</Text>
              </Pressable>
            </View>
          ) : isLoading && reports.length === 0 ? (
            <View style={s.loadingCard}>
              <Text style={s.loadingText}>Loading reports...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="flag-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No reports found</Text>
              <Text style={s.emptySub}>{(search !== '' || filter !== 'all') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            <>
              {filtered.map((report) => (
                <ReportCard
                  key={`${report.source ?? 'R'}-${report.id}`}
                  report={report}
                  relativeTime={relativeTime}
                  onDismiss={!hasMutation ? handleDismiss : () => {}}
                  onResolve={!hasMutation ? handleResolve : () => {}}
                  onAction={!hasMutation ? handleAction : () => {}}
                />
              ))}
              {meta && meta.page < meta.totalPages && ( // SPRINT-41:
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
  root:        { flex: 1, backgroundColor: '#EBF5FF' },
  safe:        { flex: 1 },
  scroll:      { flex: 1 },
  content:     { padding: 18, paddingBottom: 48 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  headerIcon:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:       { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.2)' },
  urgentDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  urgentText:  { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  statsRow:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard:    { flex: 1, backgroundColor: '#FFF', borderRadius: 13, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statVal:     { fontSize: 18, fontWeight: '900' },
  statLbl:     { fontSize: 9, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2, textAlign: 'center' },

  loadingCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 32, alignItems: 'center' },
  loadingText: { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard:   { backgroundColor: '#FFF', borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
  emptySub:    { fontSize: 13, color: Colors.text.tertiary },
  loadMoreBtn: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' }, // SPRINT-41:
  loadMoreText:{ fontSize: 14, fontWeight: '700', color: Colors.brand.blue }, // SPRINT-41:
});

const rc = createThemedStyles({
  card:            { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 12, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden', flexDirection: 'row' },
  accentLine:      { width: 4, flexShrink: 0 },
  inner:           { flex: 1, padding: 14 },

  headerRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  typeIconWrap:    { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  targetTitle:     { fontSize: 14, fontWeight: '800', color: Colors.text.primary, flex: 1, lineHeight: 19 },
  targetSub:       { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },
  statusChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  statusText:      { fontSize: 10, fontWeight: '800' },

  chipsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3F4F6' },
  chipText:        { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },

  expandBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginBottom: 4 },
  expandText:      { fontSize: 12, fontWeight: '700', color: Colors.brand.blue },

  expandPanel:     { paddingTop: 12, marginBottom: 10 },
  sectionLabel:    { fontSize: 10, fontWeight: '800', color: Colors.text.tertiary, letterSpacing: 0.8, marginBottom: 7 },
  detailRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailText:      { fontSize: 12, color: Colors.text.secondary, flex: 1 },
  descBox:         { backgroundColor: '#F8FAFC', borderRadius: 11, padding: 12, borderWidth: 1, borderColor: '#E8ECF0' },
  descText:        { fontSize: 13, color: Colors.text.primary, lineHeight: 19 },

  actionsRow:      { flexDirection: 'row', gap: 8, marginTop: 8 },
  dismissBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  dismissText:     { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  resolveBtn:      { flex: 1, borderRadius: 10, overflow: 'hidden' },
  resolveBtnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  resolveText:     { fontSize: 12, fontWeight: '800', color: '#FFF' },

  contentNotice:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, backgroundColor: '#F3F0FF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' }, // SPRINT-41:
  contentNoticeText: { flex: 1, fontSize: 12, color: '#6D3FD1', lineHeight: 17, fontWeight: '600' }, // SPRINT-41:

  resolvedBanner:  { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, marginTop: 8 },
  resolvedBannerText: { fontSize: 12, fontWeight: '600' },

  warnBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: '#FFFBEB' },
  warnBtnText:     { fontSize: 12, fontWeight: '700', color: '#B45309' },
  warnInputRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  warnInput:       { flex: 1, minHeight: 38, maxHeight: 90, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: Colors.text.primary },
  warnSendBtn:     { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  caseFileBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)', backgroundColor: Colors.brand.blueLight },
  caseFileBtnText: { fontSize: 12, fontWeight: '700', color: Colors.brand.blue },
});
