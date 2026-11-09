// src/features/admin/pages/NotificationManagementScreen.tsx

import { palette } from "../../../theme/palette";
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAdminNotifications, useSendNotificationMutation, useAdminStats } from '../hooks/useAdmin';
import { AdminNotification, NotificationAudience } from '@shared/types/api';
import { Colors } from '@theme/colors';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';
import { useBackState } from '../../../hooks/useBackState';

// ── Compose Form ──────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function ComposeForm({ onSent }: { onSent: () => void }) {
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [audience, setAudience] = useState<NotificationAudience>('all');

  const { mutate: send, isPending } = useSendNotificationMutation();
  const { data: stats } = useAdminStats();

  const audienceOptions: { label: string; value: NotificationAudience; icon: string; desc: string }[] = [
    { label: 'All Users',    value: 'all',    icon: 'globe',  desc: stats ? `${formatCount(stats.users.total)} recipients` : 'All registered users' },
    { label: 'Active Users', value: 'active', icon: 'pulse',  desc: stats ? `${formatCount(stats.users.active)} active in 30 days` : 'Active in 30 days' },
    { label: 'Admins Only',  value: 'admins', icon: 'shield', desc: 'Admin team only' },
  ];

  function handleSend() {
    if (!title.trim() || !body.trim()) {
      appAlert('Missing Fields', 'Please fill in both title and message.');
      return;
    }
    const audienceLabel = audienceOptions.find((o) => o.value === audience)?.label ?? audience;
    appAlert(
      'Send Notification',
      `Send "${title}" to ${audienceLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          onPress: () => send(
            { title: title.trim(), body: body.trim(), audience },
            {
              onSuccess: () => {
                showToast('Notification delivered successfully.', "success");
                setTitle(''); setBody('');
                setAudience('all');
                onSent();
              },
              onError: () => appAlert('Error', 'Failed to send. Please try again.'),
            }
          ),
        },
      ]
    );
  }


  return (
    <View style={c.card}>
      <View style={c.cardHeader}>
        <View style={c.iconWrap}>
          <Ionicons name="create" size={18} color={palette.violet500} />
        </View>
        <Text style={c.cardTitle}>Compose Notification</Text>
      </View>

      {/* Title */}
      <Text style={c.fieldLabel}>Title</Text>
      <View style={c.inputWrap}>
        <TextInput
          style={c.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Notification title..."
          placeholderTextColor={Colors.text.tertiary}
          maxLength={80}
        />
        <Text style={c.charCount}>{title.length}/80</Text>
      </View>

      {/* Body */}
      <Text style={c.fieldLabel}>Message</Text>
      <View style={[c.inputWrap, c.textAreaWrap]}>
        <TextInput
          style={[c.input, c.textArea]}
          value={body}
          onChangeText={setBody}
          placeholder="Write your message here..."
          placeholderTextColor={Colors.text.tertiary}
          multiline
          maxLength={300}
          textAlignVertical="top"
        />
        <Text style={c.charCount}>{body.length}/300</Text>
      </View>

      {/* Audience */}
      <Text style={c.fieldLabel}>Audience</Text>
      <View style={c.optionRow}>
        {audienceOptions.map(opt => (
          <Pressable
            key={opt.value}
            onPress={() => setAudience(opt.value)}
            style={[c.optionChip, audience === opt.value && c.optionChipActive]}
          >
            <Ionicons name={opt.icon as any} size={14} color={audience === opt.value ? Colors.brand.blue : Colors.text.tertiary} />
            <View>
              <Text style={[c.optionLabel, audience === opt.value && c.optionLabelActive]}>{opt.label}</Text>
              <Text style={c.optionDesc}>{opt.desc}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Send Button */}
      <Pressable
        onPress={handleSend}
        disabled={isPending}
        style={({ pressed }) => [c.sendBtn, pressed && { opacity: 0.85 }, isPending && { opacity: 0.7 }]}
      >
        <LinearGradient
          colors={[Colors.brand.blue, Colors.brand.green]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={c.sendBtnGrad}
        >
          {isPending
            ? <ActivityIndicator color={palette.white} size="small" />
            : <>
                <Ionicons name="send" size={16} color={palette.white} />
                <Text style={c.sendBtnText}>Send Notification</Text>
              </>
          }
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ── History Card ──────────────────────────────────────────────────────────────

function NotificationHistoryCard({ item }: { item: AdminNotification }) {
  const sc = STATUS_COLORS.notification[item.status] ?? STATUS_COLORS.notification.draft;
  const pc = PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.normal;

  return (
    <View style={h.card}>
      <View style={h.topRow}>
        <View style={[h.statusChip, { backgroundColor: sc.bg }]}>
          <View style={[h.statusDot, { backgroundColor: sc.color }]} />
          <Text style={[h.statusText, { color: sc.color }]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={[h.priorityChip, { backgroundColor: pc.bg }]}>
          <Text style={[h.priorityText, { color: pc.color }]}>{item.priority.toUpperCase()}</Text>
        </View>
        <View style={h.audienceChip}>
          <Ionicons name="people" size={11} color={Colors.text.tertiary} />
          <Text style={h.audienceText}>{item.audience}</Text>
        </View>
      </View>

      <Text style={h.title}>{item.title}</Text>
      <Text style={h.body} numberOfLines={2}>{item.body}</Text>

      <View style={h.footer}>
        {item.recipientCount != null && (
          <View style={h.stat}>
            <Ionicons name="people-outline" size={12} color={Colors.text.tertiary} />
            <Text style={h.statText}>{item.recipientCount.toLocaleString()} sent</Text>
          </View>
        )}
        {item.openRate != null && (
          <View style={h.stat}>
            <Ionicons name="eye-outline" size={12} color={Colors.brand.green} />
            <Text style={[h.statText, { color: Colors.brand.green }]}>{item.openRate}% open rate</Text>
          </View>
        )}
        {item.scheduledFor && (
          <View style={h.stat}>
            <Ionicons name="time-outline" size={12} color={Colors.brand.blue} />
            <Text style={[h.statText, { color: Colors.brand.blue }]}>
              Scheduled {new Date(item.scheduledFor).toLocaleDateString()}
            </Text>
          </View>
        )}
        <Text style={h.date}>
          {item.sentAt
            ? new Date(item.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function NotificationManagementScreen() {
  const [tab, setTab, setTabSilently] = useBackState<'compose' | 'history'>('compose');
  const { data, isLoading, refetch, isRefetching } = useAdminNotifications();
  const notifications: AdminNotification[] = data?.data ?? [];

  const sentCount = notifications.filter(n => n.status === 'sent').length;

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle} />

      <SafeAreaView style={s.safe}>
        <ScrollView keyboardShouldPersistTaps="handled"
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.violet500} />}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: palette.legacyBlueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[palette.violet500, palette.legacyPurple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="notifications" size={22} color={palette.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Notifications</Text>
            </View>
          </View>

          {/* Mini Stats */}
          <View style={s.miniStats}>
            <View style={s.miniStat}>
              <Text style={[s.miniStatNum, { color: Colors.brand.green }]}>{sentCount}</Text>
              <Text style={s.miniStatLabel}>Sent</Text>
            </View>
          </View>

          {/* Tab Toggle */}
          <View style={s.tabToggle}>
            <Pressable onPress={() => setTab('compose')} style={[s.tabBtn, tab === 'compose' && s.tabBtnActive]}>
              <Ionicons name="create" size={16} color={tab === 'compose' ? palette.violet500 : Colors.text.tertiary} />
              <Text style={[s.tabBtnText, tab === 'compose' && s.tabBtnTextActive]}>Compose</Text>
            </Pressable>
            <Pressable onPress={() => setTab('history')} style={[s.tabBtn, tab === 'history' && s.tabBtnActive]}>
              <Ionicons name="time" size={16} color={tab === 'history' ? palette.violet500 : Colors.text.tertiary} />
              <Text style={[s.tabBtnText, tab === 'history' && s.tabBtnTextActive]}>History</Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          {tab === 'compose' ? (
            <ComposeForm onSent={() => setTabSilently('history')} />
          ) : (
            <>
              <Text style={s.sectionLabel}>SENT & SCHEDULED</Text>
              {isLoading ? (
                <View style={s.loadingCard}>
                  <ActivityIndicator color={palette.violet500} />
                  <Text style={s.loadingText}>Loading notifications...</Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={s.emptyCard}>
                  <Ionicons name="notifications-off-outline" size={36} color={Colors.text.tertiary} />
                  <Text style={s.emptyTitle}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map(n => <NotificationHistoryCard key={n.id} item={n} />)
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = createThemedStyles({
  root:          { flex: 1, backgroundColor: palette.legacyBlueLight },
  safe:          { flex: 1 },
  scroll:        { flex: 1 },
  content:       { padding: 20, paddingBottom: 48 },
  decorCircle:   { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(139,92,246,0.06)', top: -60, right: -60 },

  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  headerIcon:    { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:     { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:         { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },

  miniStats:     { flexDirection: 'row', backgroundColor: palette.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: palette.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(139,92,246,0.06)' },
  miniStat:      { flex: 1, alignItems: 'center' },
  miniStatNum:   { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  miniStatLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', marginTop: 2 },
  miniStatDivider:{ width: 1, backgroundColor: palette.neutralL95_5 },

  tabToggle:     { flexDirection: 'row', backgroundColor: palette.white, borderRadius: 14, padding: 4, marginBottom: 18, gap: 4, shadowColor: palette.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tabBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, borderRadius: 11 },
  tabBtnActive:  { backgroundColor: palette.purple100 },
  tabBtnText:    { fontSize: 14, fontWeight: '700', color: Colors.text.tertiary },
  tabBtnTextActive:{ color: palette.violet500 },

  sectionLabel:  { fontSize: 11, fontWeight: '800', color: Colors.text.tertiary, letterSpacing: 1.5, marginBottom: 12 },
  loadingCard:   { backgroundColor: palette.white, borderRadius: 18, padding: 32, alignItems: 'center', gap: 10 },
  loadingText:   { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard:     { backgroundColor: palette.white, borderRadius: 18, padding: 40, alignItems: 'center', gap: 8 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
});

const c = createThemedStyles({
  card:          { backgroundColor: palette.white, borderRadius: 20, padding: 20, shadowColor: palette.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4, borderWidth: 1, borderColor: 'rgba(139,92,246,0.07)' },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  iconWrap:      { width: 36, height: 36, borderRadius: 11, backgroundColor: palette.purple100, alignItems: 'center', justifyContent: 'center' },
  cardTitle:     { fontSize: 16, fontWeight: '800', color: Colors.text.primary },

  fieldLabel:    { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, marginBottom: 7, marginTop: 14 },
  inputWrap:     { backgroundColor: Colors.bg.secondary, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border.light, paddingHorizontal: 14, paddingVertical: 4 },
  textAreaWrap:  { paddingBottom: 8 },
  input:         { fontSize: 14, color: Colors.text.primary, paddingVertical: 10 },
  textArea:      { height: 90, paddingTop: 10 },
  charCount:     { fontSize: 10, color: Colors.text.tertiary, textAlign: 'right', paddingBottom: 4, fontWeight: '600' },

  optionRow:     { gap: 8 },
  optionChip:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border.light, backgroundColor: Colors.bg.secondary },
  optionChipActive:{ borderColor: Colors.brand.blue, backgroundColor: Colors.brand.blueLight },
  optionLabel:   { fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
  optionLabelActive:{ color: Colors.brand.blue },
  optionDesc:    { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },

  sendBtn:       { borderRadius: 16, overflow: 'hidden', shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 },
  sendBtnGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 16 },
  sendBtnText:   { fontSize: 16, fontWeight: '800', color: palette.white, letterSpacing: 0.3 },
});

const h = createThemedStyles({
  card:          { backgroundColor: palette.white, borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: palette.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.05)' },
  topRow:        { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  statusChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusDot:     { width: 6, height: 6, borderRadius: 3 },
  statusText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  priorityChip:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  priorityText:  { fontSize: 10, fontWeight: '800' },
  audienceChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: palette.gray100 },
  audienceText:  { fontSize: 10, fontWeight: '700', color: Colors.text.secondary, textTransform: 'capitalize' },
  title:         { fontSize: 15, fontWeight: '800', color: Colors.text.primary, marginBottom: 4 },
  body:          { fontSize: 13, color: Colors.text.secondary, lineHeight: 19, marginBottom: 12 },
  footer:        { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  stat:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:      { fontSize: 11, fontWeight: '600', color: Colors.text.tertiary },
  date:          { marginLeft: 'auto', fontSize: 11, color: Colors.text.tertiary, fontWeight: '500' },
});