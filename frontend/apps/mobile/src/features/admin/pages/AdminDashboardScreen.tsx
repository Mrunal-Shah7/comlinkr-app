// src/features/admin/pages/AdminDashboardScreen.tsx

import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStats, useAdminBadgeApplications, useAdminSupportTickets, useAdminReports, useAdminPrivacyRequests } from '../hooks/useAdmin';
import { StatsWidget } from '../components/StatsWidget';
import { Colors } from '@theme/colors';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';

type ActionItem = {
  label: string;
  route: string;
  icon: string;
  gradient: [string, string];
  badge?: number;
  desc: string;
};

const ACTION_GROUPS: { title: string; icon: string; items: ActionItem[] }[] = [
  {
    title: 'CONTENT & FEED',
    icon: 'newspaper',
    items: [
      { label: 'Feed Management',    route: '/admin/feed',          icon: 'newspaper',        gradient: [Colors.brand.blue,  Colors.brand.green], desc: 'Manage feed posts & events'       },
      { label: 'All Posts',          route: '/admin/posts',         icon: 'documents',        gradient: [Colors.brand.blue,  '#0054CC'],           desc: 'Review & moderate all content'    },
      { label: 'Trending Posts',     route: '/admin/trending',      icon: 'trending-up',      gradient: ['#FF7B00',          Colors.brand.blue],   desc: 'Monitor viral & flagged posts'    },
      { label: 'Community Polls',    route: '/admin/polls',         icon: 'bar-chart',        gradient: [Colors.brand.blue,  Colors.brand.green],  desc: 'Create & manage community polls'  },
    ],
  },
  {
    title: 'APP SECTIONS',
    icon: 'apps',
    items: [
      { label: 'Community',          route: '/admin/community',     icon: 'chatbubbles',      gradient: ['#8B5CF6',          '#6D3FD1'],            desc: 'Questions, tips & discussions'    },
      { label: 'Roommates',          route: '/admin/roommates',     icon: 'people',           gradient: [Colors.brand.blue,  '#0054CC'],            desc: 'Review roommate profiles'         },
      { label: 'Food & Restaurants', route: '/admin/food',          icon: 'restaurant',       gradient: ['#FF7B00',          '#E05000'],            desc: 'Manage restaurant listings'       },
    ],
  },
  {
    title: 'USERS & VERIFICATION',
    icon: 'people',
    items: [
      { label: 'Manage Users',        route: '/admin/users',         icon: 'people',           gradient: [Colors.brand.blue,  '#0054CC'],            desc: 'View, suspend, manage accounts'   },
      { label: 'Badge Verifications', route: '/admin/verifications', icon: 'shield-checkmark', gradient: ['#FF7B00',          Colors.brand.blue],    desc: 'Approve badge applications'       },
    ],
  },
  {
    title: 'LISTINGS & AREA',
    icon: 'home',
    items: [
      { label: 'Manage Listings',    route: '/admin/listings',      icon: 'list',             gradient: ['#F59E0B',          '#D97706'],            desc: 'Approve, reject, verify listings' },
      { label: 'Area Management',    route: '/admin/area',          icon: 'map',              gradient: [Colors.brand.green, Colors.brand.blue],   desc: 'Control active neighborhoods'     },
    ],
  },
  {
    title: 'MODERATION & ANALYTICS',
    icon: 'stats-chart',
    items: [
      { label: 'Review Reports',     route: '/admin/reports',       icon: 'flag',             gradient: ['#EF4444',          '#C72626'],            desc: 'Handle content reports'           },
      { label: 'Analytics',          route: '/admin/analytics',     icon: 'stats-chart',      gradient: [Colors.brand.green, Colors.brand.blue],   desc: 'Growth, retention & engagement'   },
      { label: 'Send Notifications', route: '/admin/notifications', icon: 'notifications',    gradient: ['#8B5CF6',          '#6D3FD1'],            desc: 'Broadcast to users'               },
    ],
  },
  {
    title: 'SUPPORT & SECURITY',
    icon: 'headset',
    items: [
      { label: 'Support Requests',   route: '/admin/support',       icon: 'headset',          gradient: [Colors.brand.blue,  Colors.brand.green],  desc: 'View & resolve user tickets'      },
      { label: 'Auth Sessions',      route: '/admin/auth',          icon: 'lock-closed',      gradient: ['#8B5CF6',          '#6D3FD1'],            desc: 'Monitor logins & revoke sessions' },
    ],
  },
  {
    title: 'SAFETY & PRIVACY',
    icon: 'shield-checkmark',
    items: [
      { label: 'Audit Log',          route: '/admin/audit-log',       icon: 'time',             gradient: ['#64748B',          '#334155'],           desc: 'Track every admin action'         },
      { label: 'Data Privacy',       route: '/admin/privacy',         icon: 'lock-closed',      gradient: ['#8B5CF6',          '#6D3FD1'],            desc: 'GDPR export & erasure requests'   },
      { label: 'Chat Moderation',    route: '/admin/chat-moderation', icon: 'chatbox-ellipses', gradient: ['#EF4444',          '#C72626'],            desc: 'Review reported conversations'    },
      { label: 'Stories Moderation', route: '/admin/stories',         icon: 'images',           gradient: ['#FF7B00',          '#E05000'],            desc: 'Moderate story posts'             },
    ],
  },
];

export default function AdminDashboardScreen() {
  const { data: statsData, isLoading, isError, refetch, isRefetching } = useAdminStats();
  const { items: badgeApps } = useAdminBadgeApplications(); // SPRINT-41: list-state shape
  const { data: supportData } = useAdminSupportTickets();
  const { items: allOpenReports } = useAdminReports({ status: 'PENDING' });
  const { items: privacyRequests } = useAdminPrivacyRequests({ status: 'PENDING' });

  // SPRINT-41: useAdminStats returns AdminAnalytics directly (no mockApiResponse wrap)
  const analytics = statsData; // SPRINT-41:
  const pendingBadges = badgeApps.length; // SPRINT-41:
  const openTickets = (supportData?.data ?? []).filter(
    (t: { status?: string }) => t.status === 'OPEN' || t.status === 'open',
  ).length;
  const totalOpenReports = allOpenReports.length;
  const openChatReports = allOpenReports.filter(r => (r.targetType ?? '').toUpperCase() === 'CHAT_MESSAGE').length;
  const openPrivacyRequests = privacyRequests.length;

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const groups = ACTION_GROUPS.map(g => ({
    ...g,
    items: g.items.map(item => {
      if (item.route === '/admin/verifications')    return { ...item, badge: pendingBadges > 0 ? pendingBadges : undefined };
      if (item.route === '/admin/support')           return { ...item, badge: openTickets   > 0 ? openTickets   : undefined };
      if (item.route === '/admin/reports')           return { ...item, badge: totalOpenReports > 0 ? totalOpenReports : undefined };
      if (item.route === '/admin/privacy')           return { ...item, badge: openPrivacyRequests > 0 ? openPrivacyRequests : undefined };
      if (item.route === '/admin/chat-moderation')   return { ...item, badge: openChatReports > 0 ? openChatReports : undefined };
      return item;
    }),
  }));

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle1} />
      <View style={s.decorCircle2} />

      <SafeAreaView style={s.safe}>
        {/* ── Top bar with back button ── */}
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
          </Pressable>
          <Text style={s.topBarTitle}>Admin Panel</Text>
          <Pressable onPress={() => refetch()} style={s.refreshBtn} hitSlop={10}>
            <Ionicons name="refresh" size={20} color={Colors.brand.green} />
          </Pressable>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FFF" />}
        >
          {/* ── Hero Card ── */}
          <LinearGradient
            colors={[Colors.brand.blue, '#0048B8', Colors.brand.green]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroCard}
          >
            <View style={s.heroCircle1} />
            <View style={s.heroCircle2} />

            <View style={s.heroTop}>
              <View style={s.heroLeft}>
                <Text style={s.heroGreeting}>{greeting} 👋</Text>
                <Text style={s.heroTitle}>Admin Panel</Text>
                <Text style={s.heroSub}>ComLinkr · Full Control</Text>
              </View>
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                style={s.heroAvatarBg}
              >
                <Ionicons name="shield-checkmark" size={28} color="#FFF" />
              </LinearGradient>
            </View>

            <View style={s.heroStats}>
              {[
                { label: 'Users',    value: analytics?.users?.total ?? '—', icon: 'people'    }, // SPRINT-41:
                { label: 'Listings', value: analytics?.content?.housingListings ?? '—', icon: 'home' }, // SPRINT-41:
                { label: 'Reports',  value: analytics?.reports?.pending ?? '—', icon: 'flag'  }, // SPRINT-41:
                { label: 'Tickets',  value: openTickets,                 icon: 'headset'   },
              ].map((item, i) => (
                <React.Fragment key={item.label}>
                  {i > 0 && <View style={s.heroDivider} />}
                  <View style={s.heroStat}>
                    <Ionicons name={item.icon as any} size={13} color="rgba(255,255,255,0.7)" />
                    <Text style={s.heroStatValue}>{item.value}</Text>
                    <Text style={s.heroStatLabel}>{item.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>

          {/* ── Quick Alerts ── */}
          {/* SPRINT-41: pendingListings removed (not in AdminAnalytics); use reports.pending */}
          {(pendingBadges > 0 || openTickets > 0 || (analytics?.reports?.pending ?? 0) > 0) && (
            <View style={s.alertsSection}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIconBox, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="alert-circle" size={13} color="#EF4444" />
                </View>
                <Text style={[s.sectionLabel, { color: '#EF4444' }]}>ACTION REQUIRED</Text>
              </View>
              <View style={s.alertsCard}>
                {pendingBadges > 0 && (
                  <Pressable style={s.alertRow} onPress={() => router.push('/admin/verifications' as any)}>
                    <LinearGradient colors={['#FF7B00', Colors.brand.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.alertIcon}>
                      <Ionicons name="shield-checkmark" size={16} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.alertTitle}>{pendingBadges} badge verification{pendingBadges > 1 ? 's' : ''} pending</Text>
                      <Text style={s.alertSub}>Applications awaiting admin review</Text>
                    </View>
                    <View style={s.alertBadge}><Text style={s.alertBadgeText}>{pendingBadges}</Text></View>
                  </Pressable>
                )}
                {openTickets > 0 && (
                  <Pressable style={[s.alertRow, pendingBadges > 0 && s.alertRowBorder]} onPress={() => router.push('/admin/support' as any)}>
                    <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.alertIcon}>
                      <Ionicons name="headset" size={16} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.alertTitle}>{openTickets} open support ticket{openTickets > 1 ? 's' : ''}</Text>
                      <Text style={s.alertSub}>Tickets waiting for admin response</Text>
                    </View>
                    <View style={[s.alertBadge, { backgroundColor: Colors.brand.blue }]}><Text style={s.alertBadgeText}>{openTickets}</Text></View>
                  </Pressable>
                )}
                {(analytics?.reports?.pending ?? 0) > 0 && (
                  <Pressable style={[s.alertRow, (pendingBadges > 0 || openTickets > 0) && s.alertRowBorder]} onPress={() => router.push('/admin/reports' as any)}>
                    <LinearGradient colors={['#EF4444', '#C72626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.alertIcon}>
                      <Ionicons name="flag" size={16} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.alertTitle}>{analytics!.reports.pending} report{analytics!.reports.pending > 1 ? 's' : ''} need attention</Text>
                      <Text style={s.alertSub}>Content flagged by community members</Text>
                    </View>
                    <View style={[s.alertBadge, { backgroundColor: '#EF4444' }]}><Text style={s.alertBadgeText}>{analytics!.reports.pending}</Text></View>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* ── Error banner ── */}
          {isError && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={s.errorText}>Failed to load stats. Pull to refresh.</Text>
            </View>
          )}

          {/* ── Stats grid ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIconBox}>
                <Ionicons name="stats-chart" size={13} color={Colors.brand.blue} />
              </View>
              <Text style={s.sectionLabel}>OVERVIEW</Text>
            </View>
            {isLoading ? (
              <View style={s.loadingCard}>
                <Ionicons name="hourglass-outline" size={26} color={Colors.text.tertiary} />
                <Text style={s.loadingText}>Loading stats...</Text>
              </View>
            ) : (
              <View style={s.statsGrid}>
                {/* SPRINT-41: real AdminAnalytics fields only — no fabricated trends / pendingListings */}
                <StatsWidget label="Total Users"    value={analytics?.users?.total ?? 0} icon="people"       color={Colors.brand.blue} />
                <StatsWidget label="Active Users"   value={analytics?.users?.active ?? 0} icon="pulse"        color={Colors.brand.green} />
                <StatsWidget label="Listings"       value={analytics?.content?.housingListings ?? 0} icon="home" color="#F59E0B" />
                <StatsWidget label="Pending Badges" value={analytics?.badges?.pendingApplications ?? pendingBadges} icon="time" color="#FF7B00" />
                <StatsWidget label="Open Reports"   value={analytics?.reports?.pending ?? 0} icon="flag"         color="#EF4444" />
                <StatsWidget label="Badge Queue"    value={pendingBadges}               icon="shield"       color="#8B5CF6" />
              </View>
            )}
          </View>

          {/* ── Action groups ── */}
          {groups.map((group) => (
            <View key={group.title} style={s.section}>
              <View style={s.sectionHeader}>
                <View style={s.sectionIconBox}>
                  <Ionicons name={group.icon as any} size={13} color={Colors.brand.blue} />
                </View>
                <Text style={s.sectionLabel}>{group.title}</Text>
              </View>
              <View style={s.actionsCard}>
                {group.items.map((item, i) => (
                  <Pressable
                    key={item.route}
                    onPress={() => router.push(item.route as any)}
                    style={({ pressed }) => [
                      s.actionRow,
                      i < group.items.length - 1 && s.actionRowBorder,
                      pressed && s.actionRowPressed,
                    ]}
                  >
                    <LinearGradient
                      colors={item.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.actionIcon}
                    >
                      <Ionicons name={item.icon as any} size={18} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.actionLabel}>{item.label}</Text>
                      <Text style={s.actionDesc}>{item.desc}</Text>
                    </View>
                    <View style={s.actionRight}>
                      {item.badge !== undefined && (
                        <View style={s.actionBadge}>
                          <Text style={s.actionBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                      <View style={s.chevronWrap}>
                        <Ionicons name="chevron-forward" size={13} color={Colors.text.tertiary} />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Text style={s.footer}>ComLinkr Admin · v1.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = createThemedStyles({
  root:           { flex: 1, backgroundColor: '#EBF5FF' },
  safe:           { flex: 1 },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn:        { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  refreshBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(38,179,36,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(38,179,36,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  topBarTitle:    { fontSize: 16, fontWeight: '800', color: Colors.brand.blue, letterSpacing: -0.2 },
  scroll:         { flex: 1 },
  content:        { padding: 18, paddingBottom: 64 },
  decorCircle1:   { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(0,118,235,0.06)', top: -80, right: -80 },
  decorCircle2:   { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(38,179,36,0.05)', bottom: 100, left: -70 },

  // Hero
  heroCard:       { borderRadius: 24, padding: 22, marginBottom: 22, overflow: 'hidden' },
  heroCircle1:    { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -50 },
  heroCircle2:    { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -35, left: 50 },
  heroTop:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
  heroLeft:       { flex: 1 },
  heroGreeting:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 5 },
  heroTitle:      { fontSize: 30, fontWeight: '900', color: '#FFF', letterSpacing: -0.8, marginBottom: 3 },
  heroSub:        { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  heroAvatarBg:   { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  heroStats:      { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 16, paddingVertical: 14 },
  heroStat:       { flex: 1, alignItems: 'center', gap: 3 },
  heroStatValue:  { fontSize: 19, fontWeight: '900', color: '#FFF', letterSpacing: -0.4 },
  heroStatLabel:  { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  heroDivider:    { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'stretch', marginVertical: 4 },

  // Error
  errorBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.2)' },
  errorText:      { color: '#EF4444', fontSize: 13, fontWeight: '500', flex: 1 },

  // Loading
  loadingCard:    { backgroundColor: '#FFF', borderRadius: 20, padding: 36, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  loadingText:    { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },

  // Sections
  section:        { marginBottom: 20 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11, marginLeft: 2 },
  sectionIconBox: { width: 22, height: 22, borderRadius: 7, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center' },
  sectionLabel:   { fontSize: 11, fontWeight: '900', color: Colors.text.tertiary, letterSpacing: 1.4, flex: 1 },
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },

  // Action groups
  actionsCard:     {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,118,235,0.06)',
  },
  actionRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  actionRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F3F7' },
  actionRowPressed:{ backgroundColor: '#F5F9FF' },
  actionIcon:      { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionLabel:     { fontSize: 14, fontWeight: '800', color: Colors.text.primary, marginBottom: 2 },
  actionDesc:      { fontSize: 11, color: Colors.text.tertiary, lineHeight: 15 },
  actionRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBadge:     { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  actionBadgeText: { fontSize: 11, fontWeight: '900', color: '#FFF' },
  chevronWrap:     { width: 24, height: 24, borderRadius: 8, backgroundColor: '#F3F5F8', alignItems: 'center', justifyContent: 'center' },

  footer:         { textAlign: 'center', fontSize: 11, color: Colors.text.tertiary, fontWeight: '500', marginTop: 8 },

  // Alerts section
  alertsSection:  { marginBottom: 20 },
  alertsCard:     { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.1)', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3 },
  alertRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 13 },
  alertRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#FEF2F2' },
  alertIcon:      { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alertTitle:     { fontSize: 13, fontWeight: '800', color: Colors.text.primary, marginBottom: 1 },
  alertSub:       { fontSize: 11, color: Colors.text.tertiary },
  alertBadge:     { backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, minWidth: 26, alignItems: 'center' },
  alertBadgeText: { fontSize: 12, fontWeight: '900', color: '#FFF' },
});
