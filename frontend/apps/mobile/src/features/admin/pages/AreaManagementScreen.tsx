// src/features/admin/pages/AreaManagementScreen.tsx

import { palette } from "../../../theme/palette";
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAdminAreaData, useToggleAreaMutation } from '../hooks/useAdmin';
import { AreaNeighborhood } from '@shared/types/api';
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

function AreaCard({ area, onToggle }: { area: AreaNeighborhood; onToggle: (id: string, active: boolean) => void }) {
  const activeColor = area.isActive ? Colors.brand.green : Colors.text.tertiary;
  const activeBg    = area.isActive ? Colors.brand.greenLight : palette.gray100;

  return (
    <View style={[c.card, !area.isActive && c.cardInactive]}>
      <View style={c.topRow}>
        <View style={[c.areaIcon, { backgroundColor: area.isActive ? Colors.brand.blueLight : palette.gray100 }]}>
          <Ionicons name="map" size={18} color={area.isActive ? Colors.brand.blue : Colors.text.tertiary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[c.areaName, !area.isActive && c.areaNameInactive]}>{area.name}</Text>
          <Text style={c.areaCity}>{area.city}</Text>
        </View>
        <Pressable
          onPress={() => onToggle(area.id, !area.isActive)}
          style={[c.toggleBtn, area.isActive ? c.toggleBtnActive : c.toggleBtnInactive]}
        >
          <View style={[c.toggleThumb, area.isActive ? c.toggleThumbActive : c.toggleThumbInactive]} />
        </Pressable>
      </View>

      {/* Status chip */}
      <View style={[c.statusChip, { backgroundColor: activeBg }]}>
        <View style={[c.statusDot, { backgroundColor: activeColor }]} />
        <Text style={[c.statusText, { color: activeColor }]}>
          {area.isActive ? 'Active — Visible to Users' : 'Inactive — Hidden from Users'}
        </Text>
      </View>

      {/* Stats grid */}
      <View style={c.statsGrid}>
        <View style={c.statItem}>
          <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={c.statIcon}>
            <Ionicons name="people" size={12} color={palette.white} />
          </LinearGradient>
          <View>
            <Text style={c.statNum}>{area.activeUsers}</Text>
            <Text style={c.statLabel}>Active Users</Text>
          </View>
        </View>
        <View style={c.statItem}>
          <LinearGradient colors={[Colors.brand.green, palette.greenL32]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={c.statIcon}>
            <Ionicons name="list" size={12} color={palette.white} />
          </LinearGradient>
          <View>
            <Text style={c.statNum}>{area.listingCount}</Text>
            <Text style={c.statLabel}>Listings</Text>
          </View>
        </View>
        <View style={c.statItem}>
          <LinearGradient colors={[palette.legacyOrange, palette.orangeL45]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={c.statIcon}>
            <Ionicons name="calendar" size={12} color={palette.white} />
          </LinearGradient>
          <View>
            <Text style={c.statNum}>{area.eventCount}</Text>
            <Text style={c.statLabel}>Events</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AreaManagementScreen() {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { data, isLoading, refetch, isRefetching } = useAdminAreaData();
  const { mutate: toggleArea } = useToggleAreaMutation();

  const areas: AreaNeighborhood[] = data?.data ?? [];
  const filtered =
    filter === 'all'      ? areas :
    filter === 'active'   ? areas.filter(a => a.isActive) :
                            areas.filter(a => !a.isActive);

  const activeCount   = areas.filter(a => a.isActive).length;
  const inactiveCount = areas.filter(a => !a.isActive).length;
  const totalUsers    = areas.reduce((s, a) => s + a.activeUsers, 0);

  const handleToggle = (areaId: string, activate: boolean) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    appAlert(
      activate ? 'Activate Area' : 'Deactivate Area',
      `${activate ? 'Make' : 'Hide'} "${area.name}" ${activate ? 'visible to users' : 'from users'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: activate ? 'Activate' : 'Deactivate',
          onPress: () => toggleArea({ areaId, active: activate }, {
            onSuccess: () => showToast(`"${area.name}" has been ${activate ? 'activated' : 'deactivated'}.`, "success"),
          }),
        },
      ]
    );
  };

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle1} />
      <View style={s.decorCircle2} />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.blue} />}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: palette.legacyBlueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[Colors.brand.green, Colors.brand.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.headerIcon}>
              <Ionicons name="map" size={22} color={palette.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Area Management</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: Colors.brand.green }]}>{activeCount}</Text>
              <Text style={s.statLabel}>Active Areas</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: Colors.text.tertiary }]}>{inactiveCount}</Text>
              <Text style={s.statLabel}>Inactive</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: Colors.brand.blue }]}>{totalUsers.toLocaleString()}</Text>
              <Text style={s.statLabel}>Total Users</Text>
            </View>
          </View>

          {/* Info banner */}
          <View style={s.infoBanner}>
            <Ionicons name="information-circle" size={16} color={Colors.brand.blue} />
            <Text style={s.infoText}>Active areas appear in the app's city selector and feed. Inactive areas are hidden from users.</Text>
          </View>

          {/* Filter */}
          <View style={s.filterRow}>
            {([
              { label: `All (${areas.length})`,          value: 'all'      as const },
              { label: `Active (${activeCount})`,         value: 'active'   as const },
              { label: `Inactive (${inactiveCount})`,     value: 'inactive' as const },
            ]).map(f => (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                style={[s.filterChip, filter === f.value && s.filterChipActive]}
              >
                <Text style={[s.filterText, filter === f.value && s.filterTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          {isLoading ? (
            <View style={s.loadingCard}><Text style={s.loadingText}>Loading areas...</Text></View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="map-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No areas found</Text>
            </View>
          ) : (
            filtered.map(area => (
              <AreaCard key={area.id} area={area} onToggle={handleToggle} />
            ))
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
  decorCircle1:{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(38,179,36,0.06)', top: -50, right: -60 },
  decorCircle2:{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(0,118,235,0.05)', bottom: 80, left: -50 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn:     { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.legacyBlueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  headerIcon:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:       { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },

  statsRow:    { flexDirection: 'row', backgroundColor: palette.white, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: palette.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)' },
  statCard:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: palette.neutralL95_5 },

  infoBanner:  { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.brand.blueLight, borderRadius: 13, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  infoText:    { fontSize: 12, color: Colors.brand.blue, flex: 1, lineHeight: 17, fontWeight: '500' },

  filterRow:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: palette.white, borderWidth: 1.5, borderColor: Colors.border.light },
  filterChipActive:{ backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue },
  filterText:  { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  filterTextActive:{ color: Colors.brand.blue },

  loadingCard: { backgroundColor: palette.white, borderRadius: 18, padding: 32, alignItems: 'center' },
  loadingText: { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard:   { backgroundColor: palette.white, borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
});

const c = createThemedStyles({
  card:           { backgroundColor: palette.white, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: palette.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)' },
  cardInactive:   { opacity: 0.75 },
  topRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  areaIcon:       { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  areaName:       { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  areaNameInactive:{ color: Colors.text.secondary },
  areaCity:       { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },

  toggleBtn:      { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  toggleBtnActive:{ backgroundColor: Colors.brand.green },
  toggleBtnInactive:{ backgroundColor: palette.gray300 },
  toggleThumb:    { width: 20, height: 20, borderRadius: 10, backgroundColor: palette.white, shadowColor: palette.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  toggleThumbActive:  { alignSelf: 'flex-end' },
  toggleThumbInactive:{ alignSelf: 'flex-start' },

  statusChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 10, marginBottom: 12 },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusText:     { fontSize: 12, fontWeight: '700' },

  statsGrid:      { flexDirection: 'row', gap: 10 },
  statItem:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.slate50, padding: 10, borderRadius: 12 },
  statIcon:       { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statNum:        { fontSize: 16, fontWeight: '900', color: Colors.text.primary },
  statLabel:      { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600', marginTop: 1 },
});
