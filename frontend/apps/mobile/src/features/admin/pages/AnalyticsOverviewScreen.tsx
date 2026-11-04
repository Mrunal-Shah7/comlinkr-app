// src/features/admin/pages/AnalyticsOverviewScreen.tsx
// SPRINT-41: Show only real AdminAnalytics fields — no period/trends/DAU/retention fabrications

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAdminStats } from '../hooks/useAdmin'; // SPRINT-41:
import type { AdminAnalytics } from '../../../api/admin.api'; // SPRINT-41:
import { Colors } from '@theme/colors';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';

function StatCard({ label, value, icon, gradient, sub }: { // SPRINT-41: removed trend prop
  label: string; value: string | number; icon: string;
  gradient: [string, string]; sub?: string;
}) {
  return (
    <View style={sc.card}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sc.iconBox}>
        <Ionicons name={icon as any} size={16} color="#FFF" />
      </LinearGradient>
      <Text style={sc.value}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
      {sub ? <Text style={sc.sub}>{sub}</Text> : null}
    </View>
  );
}

function MetricRow({ // SPRINT-41:
  icon, label, value, color, sub, isFirst,
}: {
  icon: string; label: string; value: string | number; color: string; sub?: string | null; isFirst?: boolean;
}) {
  return (
    <View
      style={[s.totalsRow, !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0F2F5' }]}
    >
      <View style={[s.totalsIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={15} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.totalsLabel}>{label}</Text>
        {sub ? <Text style={s.totalsSub}>{sub}</Text> : null}
      </View>
      <Text style={[s.totalsValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function AnalyticsOverviewScreen() {
  const { data, isLoading, refetch, isRefetching } = useAdminStats(); // SPRINT-41:
  const analytics = data as AdminAnalytics | null; // SPRINT-41: raw AdminAnalytics (no mockApiResponse wrap)

  const u = analytics?.users; // SPRINT-41:
  const c = analytics?.content; // SPRINT-41:
  const e = analytics?.engagement; // SPRINT-41:
  const r = analytics?.reports; // SPRINT-41:
  const b = analytics?.badges; // SPRINT-41:

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle} />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.green} />}
        >
          <View style={s.header}>
            <Pressable
              onPress={() => router.back()}
              style={s.backBtn}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[Colors.brand.green, Colors.brand.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="bar-chart" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Analytics Overview</Text>
            </View>
            <View style={s.livePill}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>Live</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={s.loadingCard}>
              <LinearGradient colors={[Colors.brand.green, Colors.brand.blue]} style={s.loadingIcon}>
                <Ionicons name="hourglass" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={s.loadingText}>Loading analytics data...</Text>
              <Text style={s.loadingSubText}>Fetching live platform totals</Text>
            </View>
          ) : !analytics ? (
            <View style={s.noDataCard}>
              <Ionicons name="analytics-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.noDataTitle}>No analytics data</Text>
              <Text style={s.noDataSub}>Could not load platform analytics. Pull to refresh.</Text>
            </View>
          ) : (
            <>
              {/* SPRINT-41: Users — total / active / newThisWeek / newThisMonth */}
              <Text style={s.sectionTitle}>USERS</Text>
              <View style={s.kpiGrid}>
                <StatCard label="Total Users" value={u?.total ?? '—'} icon="people" gradient={[Colors.brand.blue, '#0054CC']} />
                <StatCard label="Active Users" value={u?.active ?? '—'} icon="pulse" gradient={[Colors.brand.green, '#1a8a18']} />
                <StatCard label="New This Week" value={u?.newThisWeek ?? '—'} icon="person-add" gradient={['#FF7B00', '#E05000']} />
                <StatCard label="New This Month" value={u?.newThisMonth ?? '—'} icon="calendar" gradient={['#8B5CF6', '#6D3FD1']} />
              </View>

              {/* SPRINT-41: Content — seven contract types */}
              <Text style={s.sectionTitle}>CONTENT</Text>
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cardHeaderIcon}>
                    <Ionicons name="layers" size={14} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>Content Counts</Text>
                    <Text style={s.cardSubTitle}>Live totals from GET /admin/analytics</Text>
                  </View>
                </View>
                <MetricRow isFirst icon="create" label="Feed Posts" value={c?.feedPosts ?? '—'} color="#8B5CF6" />
                <MetricRow icon="home" label="Housing Listings" value={c?.housingListings ?? '—'} color="#F59E0B" />
                <MetricRow icon="restaurant" label="Restaurants" value={c?.restaurants ?? '—'} color={Colors.brand.green} />
                <MetricRow icon="calendar" label="Events" value={c?.events ?? '—'} color="#FF7B00" />
                <MetricRow icon="book" label="Stories" value={c?.stories ?? '—'} color={Colors.brand.blue} />
                <MetricRow icon="trophy" label="Challenges" value={c?.challenges ?? '—'} color="#8B5CF6" />
                <MetricRow icon="help-circle" label="Community Questions" value={c?.communityQuestions ?? '—'} color={Colors.brand.blue} />
              </View>

              {/* SPRINT-41: Engagement — four contract types */}
              <Text style={s.sectionTitle}>ENGAGEMENT</Text>
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <LinearGradient colors={[Colors.brand.green, '#1a8a18']} style={s.cardHeaderIcon}>
                    <Ionicons name="heart" size={14} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>Engagement Totals</Text>
                    <Text style={s.cardSubTitle}>Likes, comments, messages, reviews</Text>
                  </View>
                </View>
                <MetricRow isFirst icon="heart" label="Total Likes" value={e?.totalLikes ?? '—'} color="#EF4444" />
                <MetricRow icon="chatbubble" label="Total Comments" value={e?.totalComments ?? '—'} color={Colors.brand.blue} />
                <MetricRow icon="mail" label="Total Messages" value={e?.totalMessages ?? '—'} color={Colors.brand.green} />
                <MetricRow icon="star" label="Total Reviews" value={e?.totalReviews ?? '—'} color="#F59E0B" />
              </View>

              {/* SPRINT-41: Reports + badges */}
              <Text style={s.sectionTitle}>MODERATION</Text>
              <View style={s.kpiGrid}>
                <StatCard label="Pending Reports" value={r?.pending ?? '—'} icon="flag" gradient={['#EF4444', '#C72626']} />
                <StatCard label="Badge Pending" value={b?.pendingApplications ?? '—'} icon="time" gradient={['#FF7B00', '#E05000']} />
                <StatCard label="Badges Approved" value={b?.totalApproved ?? '—'} icon="shield-checkmark" gradient={['#8B5CF6', '#6D3FD1']} />
              </View>
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
  content:     { padding: 20, paddingBottom: 48 },
  decorCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(38,179,36,0.06)', top: -60, right: -60 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backBtn:     { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  headerIcon:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:       { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },
  livePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(38,179,36,0.25)' },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.brand.green },
  liveText:    { fontSize: 11, fontWeight: '800', color: Colors.brand.green },

  sectionTitle: { fontSize: 11, fontWeight: '900', color: Colors.text.tertiary, letterSpacing: 1.2, marginBottom: 10 },

  kpiGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },

  loadingCard:    { backgroundColor: '#FFF', borderRadius: 20, padding: 36, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  loadingIcon:    { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loadingText:    { color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  loadingSubText: { color: Colors.text.tertiary, fontSize: 12 },

  card:           { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)' },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardHeaderIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle:      { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  cardSubTitle:   { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },

  noDataCard:  { backgroundColor: '#FFF', borderRadius: 20, padding: 44, alignItems: 'center', gap: 8 },
  noDataTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  noDataSub:   { fontSize: 13, color: Colors.text.tertiary, textAlign: 'center' },

  totalsRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  totalsIconBox:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  totalsLabel:    { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  totalsSub:      { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },
  totalsValue:    { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
});

const sc = createThemedStyles({
  card:     { width: '47.5%', backgroundColor: '#FFF', borderRadius: 16, padding: 13, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,118,235,0.05)' },
  iconBox:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  value:    { fontSize: 22, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5, marginBottom: 2 },
  label:    { fontSize: 11, fontWeight: '600', color: Colors.text.tertiary, marginBottom: 4 },
  sub:      { fontSize: 10, color: Colors.text.tertiary },
});
