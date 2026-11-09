// src/features/admin/pages/PollsScreen.tsx
// SPRINT-41: Real AdminPoll shape — isActive→status, votesCount→votes; no audience/endsAt

import { palette } from "../../../theme/palette";
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useAdminPolls, useCreatePollMutation,
  useClosePollMutation, useDeletePollMutation,
} from '../hooks/useAdmin';
import { router } from 'expo-router';
import type { AdminPoll } from '../../../api/admin.api'; // SPRINT-41:
import { Colors } from '@theme/colors';
import { alertAdminApiError } from '../api/handleAdminError'; // SPRINT-41:
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  active:  { color: Colors.brand.green,  bg: Colors.brand.greenLight, label: 'Live'   },
  closed:  { color: Colors.text.tertiary, bg: palette.gray100,              label: 'Closed' },
};

// SPRINT-41: Map contract AdminPoll → screen display fields
function pollStatus(poll: AdminPoll): 'active' | 'closed' { // SPRINT-41:
  return poll.isActive ? 'active' : 'closed'; // SPRINT-41:
} // SPRINT-41:

function optionVotes(votesCount: number): number { // SPRINT-41:
  return votesCount; // SPRINT-41: votesCount → votes
} // SPRINT-41:

// ── Compose Poll Form ─────────────────────────────────────────────────────────

function CreatePollForm({ onCreated }: { onCreated: () => void }) {
  const [question, setQuestion]   = useState('');
  const [options,  setOptions]    = useState(['', '']);
  const { mutate: create, isPending } = useCreatePollMutation();

  const addOption = () => {
    if (options.length < 6) setOptions(prev => [...prev, '']); // SPRINT-41: max 6 options
  };
  const updateOption = (i: number, val: string) => {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  };
  const removeOption = (i: number) => {
    if (options.length <= 2) return; // SPRINT-41: min 2 options
    setOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  const canCreate = question.trim().length > 0 && options.filter(o => o.trim()).length >= 2; // SPRINT-41:

  const handleCreate = () => {
    const filled = options.filter(o => o.trim()); // SPRINT-41: nonempty only
    if (question.trim().length > 300) { // SPRINT-41:
      appAlert('Question too long', 'Question must be at most 300 characters.'); // SPRINT-41:
      return; // SPRINT-41:
    } // SPRINT-41:
    if (filled.length < 2 || filled.length > 6) { // SPRINT-41:
      appAlert('Invalid options', 'Provide between 2 and 6 nonempty options.'); // SPRINT-41:
      return; // SPRINT-41:
    } // SPRINT-41:
    create({ // SPRINT-41: question + options only — no audience/endsAt
      question: question.trim(), // SPRINT-41:
      options: filled, // SPRINT-41:
    }, { // SPRINT-41:
      onSuccess: () => {
        showToast('Your poll is now live.', "success");
        setQuestion(''); setOptions(['', '']);
        onCreated();
      },
      onError: () => alertAdminApiError(new Error('Failed to create poll.'), 'Error'), // SPRINT-41:
    });
  };

  return (
    <View style={f.card}>
      <View style={f.cardHeader}>
        <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={f.iconWrap}>
          <Ionicons name="bar-chart" size={16} color={palette.white} />
        </LinearGradient>
        <Text style={f.cardTitle}>Create Poll</Text>
      </View>

      <Text style={f.label}>QUESTION</Text>
      <View style={f.inputWrap}>
        <TextInput
          style={f.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="What do you want to ask the community?"
          placeholderTextColor={Colors.text.tertiary}
          multiline maxLength={300} // SPRINT-41: contract max 300
        />
        <Text style={f.charCount}>{question.length}/300</Text>
      </View>

      <Text style={f.label}>OPTIONS</Text>
      {options.map((opt, i) => (
        <View key={i} style={f.optionRow}>
          <View style={f.optionDot}>
            <Text style={f.optionDotText}>{String.fromCharCode(65 + i)}</Text>
          </View>
          <View style={[f.inputWrap, { flex: 1, marginBottom: 0 }]}>
            <TextInput
              style={f.input}
              value={opt}
              onChangeText={v => updateOption(i, v)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              placeholderTextColor={Colors.text.tertiary}
              maxLength={80}
            />
          </View>
          {options.length > 2 && (
            <Pressable onPress={() => removeOption(i)} style={f.removeBtn} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={palette.red500} />
            </Pressable>
          )}
        </View>
      ))}
      {options.length < 6 && (
        <Pressable onPress={addOption} style={f.addOptionBtn}>
          <Ionicons name="add-circle-outline" size={16} color={Colors.brand.blue} />
          <Text style={f.addOptionText}>Add Option</Text>
        </Pressable>
      )}

      <Pressable
        onPress={canCreate ? handleCreate : undefined}
        style={[f.createBtn, !canCreate && { opacity: 0.45 }]}
        disabled={isPending || !canCreate}
      >
        <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={f.createBtnGrad}>
          {isPending
            ? <ActivityIndicator color={palette.white} size="small" />
            : <><Ionicons name="send" size={15} color={palette.white} /><Text style={f.createBtnText}>Publish Poll</Text></>
          }
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ── Poll Card ─────────────────────────────────────────────────────────────────

function PollCard({ poll, onChanged }: { poll: AdminPoll; onChanged: () => void }) { // SPRINT-41:
  const { mutate: closePoll } = useClosePollMutation();
  const { mutate: deletePoll } = useDeletePollMutation();
  const status = pollStatus(poll); // SPRINT-41:
  const meta = STATUS_META[status] ?? STATUS_META.closed;
  const maxVotes = Math.max(...poll.options.map(o => optionVotes(o.votesCount)), 1); // SPRINT-41:

  return (
    <View style={p.card}>
      <View style={p.topRow}>
        <View style={[p.statusChip, { backgroundColor: meta.bg }]}>
          <View style={[p.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[p.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={p.totalVotes}>{poll.totalVotes} votes</Text>
      </View>

      <Text style={p.question}>{poll.question}</Text>

      {poll.options.map(opt => {
        const votes = optionVotes(opt.votesCount); // SPRINT-41:
        const pct = poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
        const barPct = Math.round((votes / maxVotes) * 100);
        return (
          <View key={opt.id} style={p.optRow}>
            <Text style={p.optText} numberOfLines={1}>{opt.text}</Text>
            <View style={p.barBg}>
              <LinearGradient
                colors={[Colors.brand.blue, Colors.brand.green]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[p.barFill, { width: `${barPct}%` }]}
              />
            </View>
            <Text style={p.optPct}>{pct}%</Text>
          </View>
        );
      })}

      <View style={p.actions}>
        {status === 'active' && (
          <Pressable
            onPress={() => appAlert('Close Poll', 'Stop accepting votes?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Close', onPress: () => closePoll(poll.id, { onSuccess: onChanged, onError: () => alertAdminApiError(new Error('Toggle failed')) }) }, // SPRINT-41:
            ])}
            style={p.closeBtn}
          >
            <Ionicons name="stop-circle" size={13} color={palette.amber500} />
            <Text style={p.closeBtnText}>Close</Text>
          </Pressable>
        )}
        {status === 'closed' && (
          <Pressable
            onPress={() => appAlert('Reopen Poll', 'Start accepting votes again?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reopen', onPress: () => closePoll(poll.id, { onSuccess: onChanged }) }, // SPRINT-41: toggle
            ])}
            style={p.closeBtn}
          >
            <Ionicons name="play-circle" size={13} color={Colors.brand.green} />
            <Text style={[p.closeBtnText, { color: Colors.brand.green }]}>Reopen</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => appAlert('Delete Poll', 'Permanently delete?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deletePoll(poll.id, { onSuccess: onChanged }) }, // SPRINT-41:
          ])}
          style={p.deleteBtn}
        >
          <Ionicons name="trash" size={13} color={palette.red500} />
          <Text style={p.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PollsScreen() {
  const [tab, setTab] = useState<'create' | 'polls'>('create');
  const [page, setPage] = useState(1); // SPRINT-41:
  const pageSize = 20; // SPRINT-41:
  const { data, isLoading, refetch, isRefetching } = useAdminPolls({ page, pageSize }); // SPRINT-41:
  const polls: AdminPoll[] = data?.data ?? []; // SPRINT-41:
  const meta = data?.meta; // SPRINT-41:

  const activeCount = polls.filter(p => p.isActive).length; // SPRINT-41:
  const totalVotes  = polls.reduce((s, p) => s + p.totalVotes, 0);

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle} />

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
            <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.headerIcon}>
              <Ionicons name="bar-chart" size={22} color={palette.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Community Polls</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: Colors.brand.green }]}>{activeCount}</Text>
              <Text style={s.statLabel}>Active</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: Colors.brand.blue }]}>{meta?.total ?? polls.length}</Text>
              <Text style={s.statLabel}>Total Polls</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: palette.legacyOrange }]}>{totalVotes.toLocaleString()}</Text>
              <Text style={s.statLabel}>Total Votes</Text>
            </View>
          </View>

          <View style={s.tabToggle}>
            <Pressable onPress={() => setTab('create')} style={[s.tabBtn, tab === 'create' && s.tabBtnActive]}>
              <Ionicons name="add-circle" size={16} color={tab === 'create' ? Colors.brand.blue : Colors.text.tertiary} />
              <Text style={[s.tabText, tab === 'create' && s.tabTextActive]}>Create Poll</Text>
            </Pressable>
            <Pressable onPress={() => setTab('polls')} style={[s.tabBtn, tab === 'polls' && s.tabBtnActive]}>
              <Ionicons name="list" size={16} color={tab === 'polls' ? Colors.brand.blue : Colors.text.tertiary} />
              <Text style={[s.tabText, tab === 'polls' && s.tabTextActive]}>All Polls</Text>
            </Pressable>
          </View>

          {tab === 'create' ? (
            <CreatePollForm onCreated={() => { setTab('polls'); refetch(); }} />
          ) : isLoading ? (
            <View style={s.loadingCard}>
              <ActivityIndicator color={Colors.brand.blue} />
              <Text style={s.loadingText}>Loading polls...</Text>
            </View>
          ) : polls.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="bar-chart-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No polls yet</Text>
              <Text style={s.emptySub}>Create your first community poll</Text>
            </View>
          ) : (
            <>
              {polls.map(poll => <PollCard key={poll.id} poll={poll} onChanged={refetch} />)}
              {/* SPRINT-41: pagination */}
              {(meta?.totalPages ?? 1) > 1 && (
                <View style={s.pager}>
                  <Pressable
                    disabled={page <= 1}
                    onPress={() => setPage(p => Math.max(1, p - 1))}
                    style={[s.pagerBtn, page <= 1 && { opacity: 0.4 }]}
                  >
                    <Text style={s.pagerText}>Previous</Text>
                  </Pressable>
                  <Text style={s.pagerLabel}>Page {page} / {meta?.totalPages ?? 1}</Text>
                  <Pressable
                    disabled={page >= (meta?.totalPages ?? 1)}
                    onPress={() => setPage(p => p + 1)}
                    style={[s.pagerBtn, page >= (meta?.totalPages ?? 1) && { opacity: 0.4 }]}
                  >
                    <Text style={s.pagerText}>Next</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = createThemedStyles({
  root:        { flex: 1, backgroundColor: palette.legacyBlueLight },
  safe:        { flex: 1 },
  scroll:      { flex: 1 },
  content:     { padding: 20, paddingBottom: 48 },
  decorCircle: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(0,118,235,0.06)', top: -50, right: -60 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  headerIcon:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:       { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },

  statsRow:    { flexDirection: 'row', backgroundColor: palette.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: palette.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)' },
  statCard:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: palette.neutralL95_5 },

  tabToggle:   { flexDirection: 'row', backgroundColor: palette.white, borderRadius: 14, padding: 4, marginBottom: 16, gap: 4, shadowColor: palette.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tabBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, borderRadius: 11 },
  tabBtnActive:{ backgroundColor: Colors.brand.blueLight },
  tabText:     { fontSize: 13, fontWeight: '700', color: Colors.text.tertiary },
  tabTextActive:{ color: Colors.brand.blue },

  loadingCard: { backgroundColor: palette.white, borderRadius: 18, padding: 32, alignItems: 'center', gap: 10 },
  loadingText: { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard:   { backgroundColor: palette.white, borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
  emptySub:    { fontSize: 13, color: Colors.text.tertiary },

  pager:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingVertical: 8 }, // SPRINT-41:
  pagerBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: palette.white, borderWidth: 1, borderColor: Colors.border.light }, // SPRINT-41:
  pagerText:   { fontSize: 13, fontWeight: '700', color: Colors.brand.blue }, // SPRINT-41:
  pagerLabel:  { fontSize: 12, fontWeight: '600', color: Colors.text.secondary }, // SPRINT-41:
});

const f = createThemedStyles({
  card:            { backgroundColor: palette.white, borderRadius: 20, padding: 20, shadowColor: palette.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,118,235,0.07)' },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  iconWrap:        { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle:       { fontSize: 16, fontWeight: '800', color: Colors.text.primary },

  label:           { fontSize: 11, fontWeight: '800', color: Colors.text.tertiary, letterSpacing: 1, marginTop: 14, marginBottom: 7 },
  inputWrap:       { backgroundColor: Colors.bg.secondary, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border.light, paddingHorizontal: 14, marginBottom: 8 },
  input:           { fontSize: 14, color: Colors.text.primary, paddingVertical: 10 },
  charCount:       { fontSize: 10, color: Colors.text.tertiary, textAlign: 'right', paddingBottom: 4, fontWeight: '600' },

  optionRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  optionDot:       { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionDotText:   { fontSize: 11, fontWeight: '900', color: Colors.brand.blue },
  removeBtn:       { padding: 4 },

  addOptionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addOptionText:   { fontSize: 13, fontWeight: '700', color: Colors.brand.blue },

  createBtn:       { borderRadius: 16, overflow: 'hidden', marginTop: 18, shadowColor: Colors.brand.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 },
  createBtnGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16 },
  createBtnText:   { fontSize: 15, fontWeight: '800', color: palette.white },
});

const p = createThemedStyles({
  card:         { backgroundColor: palette.white, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: palette.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.05)' },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  statusChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusText:   { fontSize: 11, fontWeight: '800' },
  totalVotes:   { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  question:     { fontSize: 15, fontWeight: '800', color: Colors.text.primary, marginBottom: 12, lineHeight: 21 },
  optRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  optText:      { fontSize: 12, fontWeight: '600', color: Colors.text.primary, width: 100 },
  barBg:        { flex: 1, height: 7, backgroundColor: palette.gray100, borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4, minWidth: 4 },
  optPct:       { fontSize: 12, fontWeight: '800', color: Colors.brand.blue, width: 32, textAlign: 'right' },
  actions:      { flexDirection: 'row', gap: 8, marginTop: 10 },
  closeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: palette.legacyOrangeLight, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.25)' },
  closeBtnText: { fontSize: 12, fontWeight: '700', color: palette.amber500 },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: palette.red50, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)' },
  deleteBtnText:{ fontSize: 12, fontWeight: '700', color: palette.red500 },
});
