// src/features/admin/pages/RoommatesScreen.tsx

import { palette } from "../../../theme/palette";
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Alert } from 'react-native';
import { DSheet } from '../../../shared/d/Sheet';
import { useLastNonNull } from '../../../hooks/useLastNonNull';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAdminRoommates, useApproveRoommateMutation, useSuspendRoommateMutation } from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import { AdminCard } from '../components/AdminCard';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { ActionButtons } from '../components/ActionButtons';
import { AdminActionType } from '../types';
import { RoommateProfile } from '../mock/adminMockData';
import { Colors } from '@theme/colors';
import { resolveApiAssetUrl } from '../../../api/feed.api';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { useBackState } from '../../../hooks/useBackState';

const STATUS_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  active:    { color: Colors.brand.green,   bg: Colors.brand.greenLight, icon: 'checkmark-circle', label: 'Active'    },
  pending:   { color: palette.amber500,            bg: palette.legacyOrangeLight,               icon: 'time',             label: 'Pending'   },
  matched:   { color: Colors.brand.blue,    bg: Colors.brand.blueLight,  icon: 'people',           label: 'Matched'   },
  suspended: { color: palette.red500,            bg: palette.red50,               icon: 'close-circle',     label: 'Suspended' },
};

function PreferenceRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={dm.detailRow}>
      <View style={dm.detailIconBox}>
        <Ionicons name={icon as any} size={13} color={Colors.brand.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={dm.detailKey}>{label}</Text>
        <Text style={dm.detailVal}>{value}</Text>
      </View>
    </View>
  );
}

function RoommateDetailModal({
  profile, visible, onClose, onApprove, onSuspend,
}: {
  profile: RoommateProfile | null;
  visible: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onSuspend: (id: string) => void;
}) {
  // The native sheet stays mounted and keeps the last item while it slides away (TR-017).
  profile = useLastNonNull(profile);
  if (!profile) return <DSheet visible={false} onClose={onClose}><View /></DSheet>;
  const meta = STATUS_META[profile.status] ?? STATUS_META.pending;
  const prefs = profile.preferences;
  const avatarUri = profile.avatarUrl ? resolveApiAssetUrl(profile.avatarUrl) : '';

  return (
    <DSheet visible={visible} onClose={onClose}>
      <View style={{ flexShrink: 1 }}>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

          <View style={dm.headerRow}>
            <View style={dm.headerLeft}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={dm.avatarImg} />
              ) : (
                <View style={dm.avatar}>
                  <Text style={dm.avatarText}>{(profile.name?.[0] ?? 'U').toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={dm.title}>{profile.name}</Text>
                {profile.username ? <Text style={dm.username}>@{profile.username}</Text> : null}
              </View>
            </View>
            <Pressable style={dm.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={Colors.text.secondary} />
            </Pressable>
          </View>

          <View style={dm.content}>
            <View style={dm.metaRow}>
              <View style={[dm.badge, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                <Text style={[dm.badgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              {profile.verified && (
                <View style={[dm.badge, { backgroundColor: Colors.brand.blueLight }]}>
                  <Ionicons name="shield-checkmark" size={11} color={Colors.brand.blue} />
                  <Text style={[dm.badgeText, { color: Colors.brand.blue }]}>Verified</Text>
                </View>
              )}
              {profile.reports > 0 && (
                <View style={[dm.badge, { backgroundColor: palette.red50 }]}>
                  <Ionicons name="flag" size={11} color={palette.red500} />
                  <Text style={[dm.badgeText, { color: palette.red500 }]}>{profile.reports} report{profile.reports !== 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>

            <Text style={dm.sectionLabel}>BIO</Text>
            <View style={dm.textBox}>
              <Text style={dm.bodyText}>{profile.bio?.trim() || 'No bio provided.'}</Text>
            </View>

            <Text style={[dm.sectionLabel, { marginTop: 14 }]}>PROFILE DETAILS</Text>
            <View style={dm.detailsBlock}>
              <PreferenceRow icon="briefcase-outline" label="Occupation" value={profile.occupation || '—'} />
              <PreferenceRow icon="location-outline" label="Location" value={profile.location || '—'} />
              <PreferenceRow icon="cash-outline" label="Budget" value={profile.budget} />
              <PreferenceRow icon="calendar-outline" label="Move-in date" value={profile.moveInDate} />
              <PreferenceRow icon="home-outline" label="Looking for" value={profile.lookingFor === 'room' ? 'A room' : 'A roommate'} />
              <PreferenceRow icon="male-female-outline" label="Gender / Preference" value={`${profile.gender || '—'} · prefers ${profile.genderPref}`} />
            </View>

            {prefs && (
              <>
                <Text style={[dm.sectionLabel, { marginTop: 14 }]}>LIFESTYLE PREFERENCES</Text>
                <View style={dm.detailsBlock}>
                  {prefs.sleepSchedule && <PreferenceRow icon="moon-outline" label="Sleep schedule" value={prefs.sleepSchedule} />}
                  {prefs.cleanliness && <PreferenceRow icon="sparkles-outline" label="Cleanliness" value={prefs.cleanliness} />}
                  {prefs.noiseLevel && <PreferenceRow icon="volume-medium-outline" label="Noise level" value={prefs.noiseLevel} />}
                  {prefs.guestPolicy && <PreferenceRow icon="people-outline" label="Guest policy" value={prefs.guestPolicy} />}
                  <PreferenceRow icon="paw-outline" label="Pet friendly" value={prefs.petFriendly ? 'Yes' : 'No'} />
                  <PreferenceRow icon="ban-outline" label="Smoking" value={prefs.smoking ? 'Yes' : 'No'} />
                  <PreferenceRow icon="laptop-outline" label="Works from home" value={prefs.workFromHome ? 'Yes' : 'No'} />
                </View>
              </>
            )}

            {(profile.interests?.length || profile.languages?.length) ? (
              <>
                <Text style={[dm.sectionLabel, { marginTop: 14 }]}>INTERESTS & LANGUAGES</Text>
                <View style={dm.tagRow}>
                  {(profile.interests ?? []).map((t) => (
                    <View key={`i-${t}`} style={dm.tagChip}><Text style={dm.tagChipText}>{t}</Text></View>
                  ))}
                  {(profile.languages ?? []).map((t) => (
                    <View key={`l-${t}`} style={[dm.tagChip, { backgroundColor: Colors.brand.blueLight }]}><Text style={[dm.tagChipText, { color: Colors.brand.blue }]}>{t}</Text></View>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={[dm.sectionLabel, { marginTop: 14 }]}>ACTIVITY</Text>
            <View style={dm.statsRow}>
              <View style={dm.statCard}>
                <Ionicons name="eye" size={15} color={Colors.brand.blue} />
                <Text style={[dm.statVal, { color: Colors.brand.blue }]}>{profile.views}</Text>
                <Text style={dm.statLabel}>Views</Text>
              </View>
              <View style={dm.statCard}>
                <Ionicons name="people" size={15} color={palette.violet500} />
                <Text style={[dm.statVal, { color: palette.violet500 }]}>{profile.matches}</Text>
                <Text style={dm.statLabel}>Matches</Text>
              </View>
              <View style={dm.statCard}>
                <Ionicons name="flag" size={15} color={palette.red500} />
                <Text style={[dm.statVal, { color: palette.red500 }]}>{profile.reports}</Text>
                <Text style={dm.statLabel}>Reports</Text>
              </View>
            </View>

            <View style={dm.timestampRow}>
              <Ionicons name="time-outline" size={13} color={Colors.text.tertiary} />
              <Text style={dm.timestampText}>Submitted {profile.submittedDate}</Text>
            </View>

            {(profile.status === 'active' || profile.status === 'pending') && (
              <View style={dm.actions}>
                <Pressable
                  style={dm.approveBtn}
                  onPress={() => appAlert('Approve Profile?', `Approve ${profile.name}'s roommate profile?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Approve', onPress: () => onApprove(profile.id) },
                  ])}
                >
                  <Ionicons name="checkmark-circle" size={15} color={palette.white} />
                  <Text style={dm.approveBtnText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={dm.suspendBtn}
                  onPress={() => appAlert('Suspend Profile?', `Suspend ${profile.name}'s roommate profile?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Suspend', style: 'destructive', onPress: () => onSuspend(profile.id) },
                  ])}
                >
                  <Ionicons name="close-circle" size={15} color={palette.red500} />
                  <Text style={dm.suspendBtnText}>Suspend</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </DSheet>
  );
}

export default function RoommatesScreen() {
  const [search, setSearch] = useBackState('', { coalesceMs: 1200 });
  const [filter, setFilter] = useBackState('all');
  const [detailProfile, setDetailProfile] = useState<RoommateProfile | null>(null);
  const {
    items: profiles,
    meta,
    isLoading,
    isLoadingMore,
    refresh,
    loadMore,
  } = useAdminRoommates();
  const { mutate: approveProfile } = useApproveRoommateMutation();
  const { mutate: suspendProfile } = useSuspendRoommateMutation();

  const filtered = profiles.filter((p) => {
    const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const handleAction = (profileId: string, action: AdminActionType) => {
    if (action === 'approve') approveProfile(profileId, { onSuccess: () => refresh() });
    if (action === 'reject') suspendProfile(profileId, { onSuccess: () => refresh() });
  };

  const handleApprove = (profileId: string) => {
    approveProfile(profileId, { onSuccess: () => { refresh(); setDetailProfile(null); } });
  };

  const handleSuspend = (profileId: string) => {
    suspendProfile(profileId, { onSuccess: () => { refresh(); setDetailProfile(null); } });
  };

  const pendingCount  = profiles.filter(p => p.status === 'pending').length;
  const matchedCount  = profiles.filter(p => p.status === 'matched').length;
  const reportedCount = profiles.filter(p => p.reports > 0).length;

  return (
    <View style={s.root}>
      <AdminBackdrop />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && profiles.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: palette.legacyBlueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[Colors.brand.blue, palette.blueL40_2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="people" size={22} color={palette.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Roommates</Text>
            </View>
            {pendingCount > 0 && (
              <View style={s.alertPill}>
                <View style={s.alertDot} />
                <Text style={s.alertText}>{pendingCount} pending</Text>
              </View>
            )}
          </View>

          {/* Summary */}
          <View style={s.summaryRow}>
            {[
              { label: 'Total',    value: profiles.length,                                    color: Colors.brand.blue  },
              { label: 'Active',   value: profiles.filter(p => p.status === 'active').length, color: Colors.brand.green },
              { label: 'Matched',  value: matchedCount,                                       color: palette.violet500           },
              { label: 'Reported', value: reportedCount,                                      color: palette.red500           },
            ].map((item) => (
              <View key={item.label} style={s.summaryCard}>
                <Text style={[s.summaryVal, { color: item.color }]}>{item.value}</Text>
                <Text style={s.summaryLbl}>{item.label}</Text>
              </View>
            ))}
          </View>

          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Search by name or location..."
            filters={[
              { label: 'All',       value: 'all',       count: profiles.length },
              { label: 'Active',    value: 'active'                            },
              { label: 'Pending',   value: 'pending',   count: pendingCount    },
              { label: 'Matched',   value: 'matched',   count: matchedCount    },
              { label: 'Suspended', value: 'suspended'                         },
            ]}
            activeFilter={filter}
            onFilterChange={setFilter}
          />

          {isLoading ? (
            <View style={s.loadingCard}>
              <Ionicons name="hourglass-outline" size={24} color={Colors.text.tertiary} />
              <Text style={s.loadingText}>Loading roommate profiles...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={40} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No profiles found</Text>
              <Text style={s.emptySub}>{(search !== '' || filter !== 'all') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            <>
              {filtered.map((profile) => {
                const meta = STATUS_META[profile.status] ?? STATUS_META.pending;
                return (
                  <AdminCard
                    key={profile.id}
                    title={profile.name}
                    subtitle={`${profile.occupation} · ${profile.location}`}
                    badge={{ label: meta.label, color: meta.color }}
                    accentColor={meta.color}
                    onPress={() => setDetailProfile(profile)}
                  >
                    <View style={s.chipRow}>
                      <View style={[s.chip, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                        <Text style={[s.chipText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      {profile.age ? ( // TR-040 S-17: a profile without an age showed "Age 0" (rule B6)
                        <View style={[s.chip, { backgroundColor: palette.gray100 }]}>
                          <Ionicons name="person" size={11} color={Colors.text.secondary} />
                          <Text style={[s.chipText, { color: Colors.text.secondary }]}>Age {profile.age}</Text>
                        </View>
                      ) : null}
                      <View style={[s.chip, { backgroundColor: palette.gray100 }]}>
                        <Ionicons name="home" size={11} color={Colors.text.secondary} />
                        <Text style={[s.chipText, { color: Colors.text.secondary }]}>
                          {profile.lookingFor === 'room' ? 'Needs Room' : 'Needs Roommate'}
                        </Text>
                      </View>
                      {profile.verified && (
                        <View style={[s.chip, { backgroundColor: Colors.brand.blueLight }]}>
                          <Ionicons name="shield-checkmark" size={11} color={Colors.brand.blue} />
                          <Text style={[s.chipText, { color: Colors.brand.blue }]}>Verified</Text>
                        </View>
                      )}
                      {profile.reports > 0 && (
                        <View style={[s.chip, { backgroundColor: palette.red50 }]}>
                          <Ionicons name="flag" size={11} color={palette.red500} />
                          <Text style={[s.chipText, { color: palette.red500 }]}>{profile.reports} reports</Text>
                        </View>
                      )}
                    </View>

                    <View style={s.infoGrid}>
                      {[
                        { label: 'Budget',      value: profile.budget      },
                        { label: 'Move-in',     value: profile.moveInDate  },
                        { label: 'Gender Pref', value: profile.genderPref  },
                        { label: 'Matches',     value: String(profile.matches), highlight: true },
                      ].map((item) => (
                        <View key={item.label} style={s.infoItem}>
                          <Text style={s.infoLabel}>{item.label}</Text>
                          <Text style={[s.infoValue, item.highlight && { color: Colors.brand.blue }]}>{item.value}</Text>
                        </View>
                      ))}
                    </View>

                    {(profile.status === 'active' || profile.status === 'pending') && (
                      <ActionButtons actions={['approve', 'reject']} onAction={(a) => handleAction(profile.id, a)} />
                    )}
                    <Pressable style={s.viewBtn} onPress={() => setDetailProfile(profile)}>
                      <Ionicons name="expand" size={12} color={Colors.brand.blue} />
                      <Text style={s.viewBtnText}>View Full Profile</Text>
                    </Pressable>
                  </AdminCard>
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

      <RoommateDetailModal
        profile={detailProfile}
        visible={detailProfile !== null}
        onClose={() => setDetailProfile(null)}
        onApprove={handleApprove}
        onSuspend={handleSuspend}
      />
    </View>
  );
}

const s = createThemedStyles({
  root:        { flex: 1, backgroundColor: palette.legacyBlueLight },
  safe:        { flex: 1 },
  scroll:      { flex: 1 },
  content:     { padding: 18, paddingBottom: 48 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
  headerIcon:  { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headerSub:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  title:       { fontSize: 22, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },
  alertPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.legacyOrangeLight, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.25)' },
  alertDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.amber500 },
  alertText:   { fontSize: 12, fontWeight: '700', color: palette.amber500 },

  summaryRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: palette.white, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: palette.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryVal:  { fontSize: 20, fontWeight: '900' },
  summaryLbl:  { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  loadingCard: { backgroundColor: palette.white, borderRadius: 18, padding: 36, alignItems: 'center', gap: 10, shadowColor: palette.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  loadingText: { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },
  emptyCard:   { backgroundColor: palette.white, borderRadius: 18, padding: 44, alignItems: 'center', gap: 8, shadowColor: palette.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  emptySub:    { fontSize: 13, color: Colors.text.tertiary },

  chipRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText:    { fontSize: 11, fontWeight: '700' },

  infoGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  infoItem:    { minWidth: '22%' },
  infoLabel:   { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600', marginBottom: 1 },
  infoValue:   { fontSize: 12, color: Colors.text.primary, fontWeight: '800' },
  loadMoreBtn: { backgroundColor: palette.white, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  loadMoreText:{ fontSize: 14, fontWeight: '700', color: Colors.brand.blue },
  viewBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.brand.blueLight, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10 },
  viewBtnText: { fontSize: 11, fontWeight: '700', color: Colors.brand.blue },
});

const dm = createThemedStyles({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: palette.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%' },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: palette.gray200, alignSelf: 'center', marginTop: 12 },

  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarImg:  { width: 46, height: 46, borderRadius: 14, backgroundColor: palette.gray100 },
  avatar:     { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '900', color: Colors.brand.blue },
  title:      { fontSize: 18, fontWeight: '900', color: Colors.text.primary },
  username:   { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },
  closeBtn:   { width: 32, height: 32, borderRadius: 10, backgroundColor: palette.gray100, alignItems: 'center', justifyContent: 'center' },

  content:    { padding: 20, paddingTop: 8 },
  metaRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '800' },

  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Colors.text.tertiary, marginBottom: 8 },
  textBox:    { backgroundColor: palette.slate50, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: palette.neutralL93_3 },
  bodyText:   { fontSize: 14, color: Colors.text.primary, lineHeight: 21 },

  detailsBlock: { backgroundColor: palette.slate50, borderRadius: 13, borderWidth: 1, borderColor: palette.neutralL93_3, overflow: 'hidden' },
  detailRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.neutralL93_3 },
  detailIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  detailKey:  { fontSize: 10, fontWeight: '700', color: Colors.text.tertiary, marginBottom: 2, letterSpacing: 0.3 },
  detailVal:  { fontSize: 13, fontWeight: '600', color: Colors.text.primary },

  tagRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip:    { backgroundColor: palette.gray100, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  tagChipText:{ fontSize: 11, fontWeight: '700', color: Colors.text.secondary },

  statsRow:   { flexDirection: 'row', gap: 8 },
  statCard:   { flex: 1, backgroundColor: palette.slate50, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.neutralL93_3 },
  statVal:    { fontSize: 15, fontWeight: '900' },
  statLabel:  { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },

  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  timestampText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },

  actions:    { flexDirection: 'row', gap: 10, marginTop: 18 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, backgroundColor: Colors.brand.green },
  approveBtnText: { fontSize: 14, fontWeight: '800', color: palette.white },
  suspendBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, backgroundColor: palette.red50, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)' },
  suspendBtnText: { fontSize: 14, fontWeight: '800', color: palette.red500 },
});
