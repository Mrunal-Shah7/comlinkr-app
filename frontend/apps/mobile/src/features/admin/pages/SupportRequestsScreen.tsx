// src/features/admin/pages/SupportRequestsScreen.tsx
// SPRINT-41: Real support tickets — OPEN|REPLIED|CLOSED only; no category/priority

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Modal,
  TextInput, Pressable, Alert, KeyboardAvoidingView, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useAdminSupportTickets,
  useReplyToTicketMutation,
  useCloseSupportTicketMutation,
} from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import { Colors } from '@theme/colors';
import { alertAdminApiError } from '../api/handleAdminError'; // SPRINT-41:
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';

// SPRINT-41: Local ticket type without category/priority (not on backend)
type AdminSupportTicketView = { // SPRINT-41:
  id: string; // SPRINT-41:
  userName: string; // SPRINT-41:
  email: string; // SPRINT-41:
  subject: string; // SPRINT-41:
  message: string; // SPRINT-41:
  status: 'open' | 'replied' | 'closed'; // SPRINT-41: maps OPEN|REPLIED|CLOSED
  createdAt: string; // SPRINT-41:
  adminResponse?: string; // SPRINT-41:
}; // SPRINT-41:

const STATUS_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  open:    { color: '#EF4444',            bg: '#FEF2F2',               icon: 'alert-circle',     label: 'Open'    }, // SPRINT-41:
  replied: { color: Colors.brand.green,   bg: Colors.brand.greenLight, icon: 'checkmark-circle', label: 'Replied' }, // SPRINT-41:
  closed:  { color: Colors.text.tertiary, bg: '#F3F4F6',               icon: 'close-circle',     label: 'Closed'  }, // SPRINT-41:
};

// SPRINT-41: Single generic quick-reply list (not per-category)
const QUICK_REPLIES = [ // SPRINT-41:
  "Thank you for reaching out. We've reviewed your request and will follow up shortly.", // SPRINT-41:
  "We've looked into this and taken appropriate action. Please let us know if you need anything else.", // SPRINT-41:
  "Thanks for the details. Could you share any additional information so we can help further?", // SPRINT-41:
  "This has been resolved on our end. Reply if the issue continues.", // SPRINT-41:
]; // SPRINT-41:

function ReplyModal({
  visible, ticket, onClose, onSuccess,
}: {
  visible: boolean;
  ticket: AdminSupportTicketView | null; // SPRINT-41:
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reply, setReply] = useState('');
  const [closeAfter, setCloseAfter] = useState(false);
  const { mutate: sendReply, isPending } = useReplyToTicketMutation();

  if (!ticket) return null;

  const sm = STATUS_META[ticket.status] ?? STATUS_META.open;
  const isClosed = ticket.status === 'closed'; // SPRINT-41:

  const handleSend = () => {
    if (isClosed) { // SPRINT-41:
      appAlert('Ticket closed', 'Cannot reply to a closed ticket.'); // SPRINT-41:
      return; // SPRINT-41:
    } // SPRINT-41:
    if (!reply.trim()) {
      appAlert('Reply required', 'Please enter a reply message before sending.');
      return;
    }
    if (reply.trim().length > 2000) { // SPRINT-41:
      appAlert('Reply too long', 'Reply must be at most 2000 characters.'); // SPRINT-41:
      return; // SPRINT-41:
    } // SPRINT-41:
    sendReply(
      { ticketId: ticket.id, reply: reply.trim(), close: closeAfter }, // SPRINT-41: optional close flag
      {
        onSuccess: () => {
          appAlert(
            'Reply Sent',
            closeAfter
              ? 'Your reply has been sent and the ticket has been closed.'
              : 'Your reply has been sent. The ticket is marked as replied.'
          );
          setReply('');
          setCloseAfter(false);
          onClose();
          onSuccess();
        },
        onError: () => {
          alertAdminApiError(new Error('Could not send reply.'), 'Failed'); // SPRINT-41:
        },
      }
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={mo.overlay}>
          <ScrollView
            style={mo.sheet}
            contentContainerStyle={{ paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={mo.handle} />

            <View style={mo.headerRow}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mo.headerIcon}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={mo.title}>Reply to Ticket</Text>
                <Text style={mo.titleSub} numberOfLines={1}>{ticket.subject}</Text>
              </View>
            </View>

            <View style={mo.metaRow}>
              <View style={[mo.metaChip, { backgroundColor: sm.bg }]}>
                <Ionicons name={sm.icon as any} size={11} color={sm.color} />
                <Text style={[mo.metaChipText, { color: sm.color }]}>{sm.label}</Text>
              </View>
              <View style={mo.metaChip}>
                <Ionicons name="person" size={11} color={Colors.text.tertiary} />
                <Text style={mo.metaChipText}>{ticket.userName}</Text>
              </View>
            </View>

            <Text style={mo.label}>ORIGINAL MESSAGE</Text>
            <View style={mo.originalBox}>
              <Text style={mo.originalText}>{ticket.message}</Text>
            </View>

            {ticket.adminResponse && (
              <>
                <Text style={[mo.label, { marginTop: 12 }]}>PREVIOUS RESPONSE</Text>
                <View style={mo.prevResponseBox}>
                  <View style={mo.prevResponseHeader}>
                    <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mo.prevResponseIcon}>
                      <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                    </LinearGradient>
                    <Text style={mo.prevResponseLabel}>Admin</Text>
                  </View>
                  <Text style={mo.prevResponseText}>{ticket.adminResponse}</Text>
                </View>
              </>
            )}

            {!isClosed && ( // SPRINT-41: disable reply UI when closed
              <>
                <Text style={[mo.label, { marginTop: 14 }]}>QUICK REPLIES</Text>
                {QUICK_REPLIES.map((qr, i) => (
                  <Pressable key={i} style={mo.quickRow} onPress={() => setReply(qr)}>
                    <Ionicons name="flash" size={13} color={Colors.brand.blue} />
                    <Text style={mo.quickText} numberOfLines={2}>{qr}</Text>
                  </Pressable>
                ))}

                <Text style={[mo.label, { marginTop: 14 }]}>YOUR REPLY *</Text>
                <View style={mo.inputWrap}>
                  <TextInput
                    style={mo.input}
                    value={reply}
                    onChangeText={setReply}
                    placeholder="Type your response to the user..."
                    placeholderTextColor={Colors.text.tertiary}
                    multiline
                    maxLength={2000} // SPRINT-41:
                    textAlignVertical="top"
                  />
                </View>
                <Text style={mo.charCount}>{reply.length}/2000</Text>

                <Pressable style={mo.closeToggle} onPress={() => setCloseAfter((p) => !p)}>
                  <View style={[mo.checkbox, closeAfter && mo.checkboxActive]}>
                    {closeAfter && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={mo.checkboxLabel}>Close ticket after replying</Text>
                    <Text style={mo.checkboxSub}>Marks the ticket CLOSED when sent</Text>
                  </View>
                </Pressable>
              </>
            )}

            <View style={mo.actions}>
              <Pressable onPress={onClose} style={mo.cancelBtn}>
                <Text style={mo.cancelText}>Cancel</Text>
              </Pressable>
              {!isClosed && (
                <Pressable onPress={handleSend} disabled={isPending} style={[mo.sendBtn, isPending && { opacity: 0.6 }]}>
                  <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={mo.sendBtnGrad}>
                    <Ionicons name="send" size={15} color="#FFF" />
                    <Text style={mo.sendText}>{isPending ? 'Sending...' : closeAfter ? 'Reply & Close' : 'Send Reply'}</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TicketCard({
  ticket,
  onReply,
  onClose,
}: { ticket: AdminSupportTicketView; onReply: (t: AdminSupportTicketView) => void; onClose: (id: string) => void }) { // SPRINT-41:
  const [expanded, setExpanded] = useState(false);
  const sm = STATUS_META[ticket.status] ?? STATUS_META.open;
  const canReply = ticket.status !== 'closed'; // SPRINT-41:

  return (
    <View style={tc.card}>
      <View style={[tc.accentLine, { backgroundColor: sm.color }]} />

      <View style={tc.inner}>
        <View style={tc.headerRow}>
          <View style={[tc.catIcon, { backgroundColor: `${sm.color}14` }]}>
            <Ionicons name="headset" size={16} color={sm.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={tc.subject} numberOfLines={2}>{ticket.subject}</Text>
            <Text style={tc.userLine}>{ticket.userName} · {ticket.email}</Text>
          </View>
          <View style={[tc.statusChip, { backgroundColor: sm.bg }]}>
            <Ionicons name={sm.icon as any} size={11} color={sm.color} />
            <Text style={[tc.statusText, { color: sm.color }]}>{sm.label}</Text>
          </View>
        </View>

        <View style={tc.chips}>
          <View style={tc.chip}>
            <Ionicons name="calendar-outline" size={11} color={Colors.text.tertiary} />
            <Text style={tc.chipText}>{ticket.createdAt}</Text>
          </View>
        </View>

        <View style={tc.messageBox}>
          <Text style={tc.messageText} numberOfLines={expanded ? undefined : 2}>{ticket.message}</Text>
          <Pressable onPress={() => setExpanded((p) => !p)} style={tc.expandBtn}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.brand.blue} />
            <Text style={tc.expandText}>{expanded ? 'Show less' : 'Read full message'}</Text>
          </Pressable>
        </View>

        {expanded && (
          <View style={tc.expandPanel}>
            <Text style={tc.detailLabel}>DETAILS</Text>
            <View style={tc.detailsBlock}>
              <View style={[tc.detailRow, { borderBottomWidth: 0 }]}>
                <View style={tc.detailIconBox}>
                  <Ionicons name="mail-outline" size={13} color={Colors.brand.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={tc.detailKey}>Email · Submitted</Text>
                  <Text style={tc.detailVal}>{ticket.email} · {ticket.createdAt}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {ticket.adminResponse && (
          <View style={tc.responseBox}>
            <View style={tc.responseHeader}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={tc.responseIconBox}>
                <Ionicons name="shield-checkmark" size={10} color="#FFF" />
              </LinearGradient>
              <Text style={tc.responseLabel}>ADMIN REPLY</Text>
            </View>
            <Text style={tc.responseText}>{ticket.adminResponse}</Text>
          </View>
        )}

        {canReply ? (
          <View style={tc.actions}>
            {ticket.status === 'open' && (
              <Pressable style={tc.closeBtn} onPress={() => onClose(ticket.id)}>
                <Ionicons name="close-circle" size={14} color={Colors.text.secondary} />
                <Text style={tc.closeBtnText}>Close Ticket</Text>
              </Pressable>
            )}
            <Pressable style={tc.replyBtn} onPress={() => onReply(ticket)}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tc.replyBtnGrad}>
                <Ionicons name="chatbubble-ellipses" size={14} color="#FFF" />
                <Text style={tc.replyBtnText}>{ticket.adminResponse ? 'Reply Again' : 'Reply'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={[tc.resolvedBanner, { backgroundColor: sm.bg }]}>
            <Ionicons name={sm.icon as any} size={13} color={sm.color} />
            <Text style={[tc.resolvedText, { color: sm.color }]}>
              Ticket closed {ticket.adminResponse ? '· Admin replied' : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function SupportRequestsScreen() {
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all'); // SPRINT-41: all | open | replied | closed
  const [replyTarget, setReplyTarget] = useState<AdminSupportTicketView | null>(null); // SPRINT-41:

  // SPRINT-41: Map UI filter → API status enum
  const apiStatus = // SPRINT-41:
    filter === 'open' ? 'OPEN' : // SPRINT-41:
    filter === 'replied' ? 'REPLIED' : // SPRINT-41:
    filter === 'closed' ? 'CLOSED' : // SPRINT-41:
    undefined; // SPRINT-41:

  const { data, isLoading, refetch, isRefetching } = useAdminSupportTickets( // SPRINT-41:
    apiStatus ? { status: apiStatus, page: 1, pageSize: 50 } : { page: 1, pageSize: 50 }, // SPRINT-41:
  ); // SPRINT-41:
  const { mutate: closeTicket } = useCloseSupportTicketMutation();

  const tickets: AdminSupportTicketView[] = (data?.data ?? []) as AdminSupportTicketView[]; // SPRINT-41:

  const STATUS_ORDER: Record<string, number> = { open: 0, replied: 1, closed: 2 }; // SPRINT-41:
  const sorted = [...tickets].sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));

  const filtered = sorted.filter((t) => {
    const matchSearch = search === '' ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.message.toLowerCase().includes(search.toLowerCase());
    return matchSearch; // SPRINT-41: status filtered via API
  });

  const openCount    = tickets.filter(t => t.status === 'open').length; // SPRINT-41:
  const repliedCount = tickets.filter(t => t.status === 'replied').length; // SPRINT-41:
  const closedCount  = tickets.filter(t => t.status === 'closed').length; // SPRINT-41:

  const handleClose = (ticketId: string) => {
    appAlert(
      'Close Ticket',
      'Close this ticket? The user will receive a "Ticket closed" notification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          onPress: () => closeTicket(ticketId, { onSuccess: () => refetch() }),
        },
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
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="headset" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Support Tickets</Text>
            </View>
            {openCount > 0 && (
              <View style={s.openBadge}>
                <View style={s.openDot} />
                <Text style={s.openText}>{openCount} open</Text>
              </View>
            )}
          </View>

          <View style={s.summaryRow}>
            {[
              { label: 'Open',    value: openCount,    color: '#EF4444'            }, // SPRINT-41:
              { label: 'Replied', value: repliedCount, color: Colors.brand.green  }, // SPRINT-41:
              { label: 'Closed',  value: closedCount,  color: Colors.text.tertiary}, // SPRINT-41:
            ].map((item) => (
              <View key={item.label} style={s.summaryCard}>
                <Text style={[s.summaryVal, { color: item.color }]}>{item.value}</Text>
                <Text style={s.summaryLbl}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* SPRINT-41: Status filter OPEN | REPLIED | CLOSED only */}
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Search tickets, users, messages..."
            filters={[
              { label: 'All',     value: 'all',     count: tickets.length },
              { label: 'Open',    value: 'open',    count: openCount      },
              { label: 'Replied', value: 'replied', count: repliedCount   },
              { label: 'Closed',  value: 'closed',  count: closedCount    },
            ]}
            activeFilter={filter}
            onFilterChange={setFilter}
          />

          {isLoading ? (
            <View style={s.loadingCard}>
              <Ionicons name="hourglass-outline" size={24} color={Colors.text.tertiary} />
              <Text style={s.loadingText}>Loading support tickets...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="headset-outline" size={40} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No tickets found</Text>
              <Text style={s.emptySub}>{(search !== '' || filter !== 'all') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            filtered.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onReply={setReplyTarget}
                onClose={handleClose}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <ReplyModal
        visible={replyTarget !== null}
        ticket={replyTarget}
        onClose={() => setReplyTarget(null)}
        onSuccess={refetch}
      />
    </View>
  );
}

const s = createThemedStyles({
  root:         { flex: 1, backgroundColor: '#EBF5FF' },
  safe:         { flex: 1 },
  scroll:       { flex: 1 },
  content:      { padding: 18, paddingBottom: 48 },

  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  headerIcon:   { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:    { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  title:        { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },
  openBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.2)' },
  openDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  openText:     { fontSize: 11, fontWeight: '700', color: '#EF4444' },

  summaryRow:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryCard:  { flex: 1, backgroundColor: '#FFF', borderRadius: 13, padding: 11, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)' },
  summaryVal:   { fontSize: 18, fontWeight: '900' },
  summaryLbl:   { fontSize: 9, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  loadingCard:  { backgroundColor: '#FFF', borderRadius: 18, padding: 36, alignItems: 'center', gap: 10, elevation: 3 },
  loadingText:  { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },
  emptyCard:    { backgroundColor: '#FFF', borderRadius: 18, padding: 44, alignItems: 'center', gap: 8, elevation: 3 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  emptySub:     { fontSize: 13, color: Colors.text.tertiary },
});

const tc = createThemedStyles({
  card:           { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 12, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)', overflow: 'hidden', flexDirection: 'row' },
  accentLine:     { width: 4, flexShrink: 0 },
  inner:          { flex: 1, padding: 14 },

  headerRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  catIcon:        { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  subject:        { fontSize: 14, fontWeight: '800', color: Colors.text.primary, flex: 1, lineHeight: 19 },
  userLine:       { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },
  statusChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  statusText:     { fontSize: 10, fontWeight: '800' },

  chips:          { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#F3F4F6' },
  chipText:       { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },

  messageBox:     { backgroundColor: '#EFF9FF', borderRadius: 11, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,118,235,0.12)' },
  messageText:    { fontSize: 13, color: Colors.text.primary, lineHeight: 19 },
  expandBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 7 },
  expandText:     { fontSize: 12, fontWeight: '700', color: Colors.brand.blue },

  expandPanel:    { marginBottom: 10 },
  detailLabel:    { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Colors.text.tertiary, marginBottom: 7 },
  detailsBlock:   { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E8ECF0', overflow: 'hidden' },
  detailRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  detailIconBox:  { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  detailKey:      { fontSize: 10, fontWeight: '700', color: Colors.text.tertiary, marginBottom: 2 },
  detailVal:      { fontSize: 13, fontWeight: '600', color: Colors.text.primary },

  responseBox:    { backgroundColor: '#F0FFF4', borderRadius: 11, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(38,179,36,0.2)' },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  responseIconBox:{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  responseLabel:  { fontSize: 11, fontWeight: '900', color: Colors.brand.green, letterSpacing: 0.8 },
  responseText:   { fontSize: 13, color: Colors.text.primary, lineHeight: 19 },

  actions:        { flexDirection: 'row', gap: 8, marginTop: 4 },
  closeBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  closeBtnText:   { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  replyBtn:       { flex: 1, borderRadius: 10, overflow: 'hidden' },
  replyBtnGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  replyBtnText:   { fontSize: 13, fontWeight: '800', color: '#FFF' },

  resolvedBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 10, marginTop: 4 },
  resolvedText:   { fontSize: 12, fontWeight: '600' },
});

const mo = createThemedStyles({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, maxHeight: '92%' },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },

  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerIcon:   { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 17, fontWeight: '900', color: Colors.text.primary },
  titleSub:     { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },

  metaRow:      { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginBottom: 14 },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: '#F3F4F6' },
  metaChipText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },

  label:        { fontSize: 10, fontWeight: '900', color: Colors.text.tertiary, letterSpacing: 1.2, marginBottom: 7 },

  originalBox:  { backgroundColor: '#EFF9FF', borderRadius: 12, padding: 13, borderWidth: 1, borderColor: 'rgba(0,118,235,0.12)', marginBottom: 4 },
  originalText: { fontSize: 13, color: Colors.text.primary, lineHeight: 19 },

  prevResponseBox:    { backgroundColor: '#F0FFF4', borderRadius: 12, padding: 13, borderWidth: 1, borderColor: 'rgba(38,179,36,0.2)', marginBottom: 4 },
  prevResponseHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  prevResponseIcon:   { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  prevResponseLabel:  { fontSize: 11, fontWeight: '900', color: Colors.brand.green, letterSpacing: 0.8 },
  prevResponseText:   { fontSize: 13, color: Colors.text.primary, lineHeight: 19 },

  quickRow:     { flexDirection: 'row', gap: 9, alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  quickText:    { flex: 1, fontSize: 12, color: Colors.text.secondary, lineHeight: 17 },

  inputWrap:    { backgroundColor: Colors.bg.secondary, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border.light, paddingHorizontal: 14, marginBottom: 4 },
  input:        { fontSize: 14, color: Colors.text.primary, paddingVertical: 12, minHeight: 110 },
  charCount:    { fontSize: 11, color: Colors.text.tertiary, textAlign: 'right', marginBottom: 12 },

  closeToggle:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border.light, marginBottom: 16 },
  checkbox:     { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: Colors.border.light, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  checkboxActive: { backgroundColor: Colors.brand.green, borderColor: Colors.brand.green },
  checkboxLabel:{ fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  checkboxSub:  { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },

  actions:      { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: 13, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText:   { fontSize: 14, fontWeight: '700', color: Colors.text.secondary },
  sendBtn:      { flex: 2, borderRadius: 13, overflow: 'hidden' },
  sendBtnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13 },
  sendText:     { fontSize: 14, fontWeight: '800', color: '#FFF' },
});
