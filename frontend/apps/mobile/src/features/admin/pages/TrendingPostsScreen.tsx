// src/features/admin/pages/TrendingPostsScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAdminTrendingPosts, useRemovePostMutation, useFeaturePostMutation } from '../hooks/useAdmin';
import { TrendingPost } from '@shared/types/api';
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  listing:    { icon: 'home',         color: Colors.brand.blue,   bg: Colors.brand.blueLight  },
  restaurant: { icon: 'restaurant',   color: Colors.brand.green,  bg: Colors.brand.greenLight },
  event:      { icon: 'calendar',     color: '#FF7B00',            bg: '#FFF3E6'               },
  news:       { icon: 'newspaper',    color: '#8B5CF6',            bg: '#F3E8FF'               },
  story:      { icon: 'videocam',     color: Colors.brand.blue,   bg: Colors.brand.blueLight  },
  challenge:  { icon: 'trophy',       color: '#FF7B00',            bg: '#FFF3E6'               },
  community:  { icon: 'people',       color: Colors.brand.green,  bg: Colors.brand.greenLight },
};

const STATUS_META: Record<string, { color: string; bg: string }> = {
  active:  { color: Colors.brand.green, bg: Colors.brand.greenLight },
  flagged: { color: '#F59E0B',           bg: '#FFF3E6'               },
  removed: { color: '#EF4444',           bg: '#FEF2F2'               },
};

function TrendingCard({ post, rank }: { post: TrendingPost; rank: number }) {
  const { mutate: remove }  = useRemovePostMutation();
  const { mutate: feature } = useFeaturePostMutation();
  const typeMeta   = TYPE_META[post.type]   ?? TYPE_META.news;
  const statusMeta = STATUS_META[post.status] ?? STATUS_META.active;

  const rankColors = ['#FF7B00', Colors.brand.blue, Colors.brand.green];
  const rankColor  = rankColors[(rank - 1) % rankColors.length];

  return (
    <View style={c.card}>
      {/* Rank + status */}
      <View style={c.topRow}>
        <View style={[c.rankBadge, { backgroundColor: `${rankColor}18`, borderColor: `${rankColor}40` }]}>
          <Text style={[c.rankText, { color: rankColor }]}>#{rank}</Text>
        </View>
        <View style={[c.typeChip, { backgroundColor: typeMeta.bg }]}>
          <Ionicons name={typeMeta.icon as any} size={11} color={typeMeta.color} />
          <Text style={[c.typeText, { color: typeMeta.color }]}>{post.type}</Text>
        </View>
        <View style={[c.statusChip, { backgroundColor: statusMeta.bg }]}>
          <Text style={[c.statusText, { color: statusMeta.color }]}>{post.status}</Text>
        </View>
        {post.reportCount > 0 && (
          <View style={c.reportChip}>
            <Ionicons name="flag" size={11} color="#EF4444" />
            <Text style={c.reportText}>{post.reportCount}</Text>
          </View>
        )}
      </View>

      {/* Title + author */}
      <Text style={c.title} numberOfLines={2}>{post.title}</Text>
      <Text style={c.author}>by {post.author}</Text>

      {/* Engagement stats */}
      <View style={c.statsRow}>
        <View style={c.stat}>
          <Ionicons name="eye" size={13} color={Colors.brand.blue} />
          <Text style={c.statText}>{post.views.toLocaleString()}</Text>
        </View>
        <View style={c.stat}>
          <Ionicons name="heart" size={13} color="#EF4444" />
          <Text style={c.statText}>{post.likes.toLocaleString()}</Text>
        </View>
        <View style={c.stat}>
          <Ionicons name="chatbubble" size={13} color={Colors.brand.green} />
          <Text style={c.statText}>{post.comments.toLocaleString()}</Text>
        </View>
        <View style={c.stat}>
          <Ionicons name="share-social" size={13} color="#FF7B00" />
          <Text style={c.statText}>{post.shares.toLocaleString()}</Text>
        </View>
        {/* Engagement score bar */}
        <View style={c.scoreBg}>
          <LinearGradient
            colors={['#FF7B00', Colors.brand.blue, Colors.brand.green]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[c.scoreBar, { width: `${post.engagementScore}%` }]}
          />
        </View>
        <Text style={c.scoreText}>{post.engagementScore}</Text>
      </View>

      {/* Actions */}
      {post.status !== 'removed' && (
        <View style={c.actions}>
          <Pressable
            onPress={() => feature(post.id, {
              onSuccess: () => showToast(`"${post.title}" is now featured.`, "success"),
            })}
            style={c.featureBtn}
          >
            <Ionicons name="star" size={13} color="#FF7B00" />
            <Text style={c.featureBtnText}>Feature</Text>
          </Pressable>
          {post.status === 'flagged' && (
            <Pressable
              onPress={() => appAlert('Remove Content', `Remove "${post.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => remove(post.id) },
              ])}
              style={c.removeBtn}
            >
              <Ionicons name="trash" size={13} color="#EF4444" />
              <Text style={c.removeBtnText}>Remove</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function TrendingPostsScreen() {
  const [typeFilter, setTypeFilter] = useState('all');
  const { data, isLoading, refetch, isRefetching } = useAdminTrendingPosts();

  const posts: TrendingPost[] = data ?? [];
  const filtered = typeFilter === 'all'
    ? posts
    : typeFilter === 'flagged'
    ? posts.filter(p => p.status === 'flagged')
    : posts.filter(p => p.type === typeFilter);

  const flaggedCount = posts.filter(p => p.status === 'flagged').length;
  const topEngagement = posts.reduce((s, p) => s + p.engagementScore, 0);

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle} />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.blue} />}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={['#FF7B00', Colors.brand.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.headerIcon}>
              <Ionicons name="trending-up" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Trending Posts</Text>
            </View>
            {flaggedCount > 0 && (
              <View style={s.flagBadge}>
                <Ionicons name="flag" size={12} color="#EF4444" />
                <Text style={s.flagText}>{flaggedCount} flagged</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: Colors.brand.blue }]}>{posts.length}</Text>
              <Text style={s.statLabel}>Trending</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: '#EF4444' }]}>{flaggedCount}</Text>
              <Text style={s.statLabel}>Flagged</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: '#FF7B00' }]}>{posts.reduce((s, p) => s + p.views, 0).toLocaleString()}</Text>
              <Text style={s.statLabel}>Total Views</Text>
            </View>
          </View>

          {/* Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
            {[
              { label: 'All',        value: 'all'        },
              { label: 'Flagged',    value: 'flagged'    },
              { label: 'Listings',   value: 'listing'    },
              { label: 'Restaurants',value: 'restaurant' },
              { label: 'Events',     value: 'event'      },
              { label: 'News',       value: 'news'       },
            ].map(f => (
              <Pressable
                key={f.value}
                onPress={() => setTypeFilter(f.value)}
                style={[s.filterChip, typeFilter === f.value && s.filterChipActive]}
              >
                <Text style={[s.filterText, typeFilter === f.value && s.filterTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {isLoading ? (
            <View style={s.loadingCard}><Text style={s.loadingText}>Loading trending posts...</Text></View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="trending-up-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No posts found</Text>
            </View>
          ) : (
            filtered.map((post, i) => <TrendingCard key={post.id} post={post} rank={i + 1} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = createThemedStyles({
  root:            { flex: 1, backgroundColor: '#EBF5FF' },
  safe:            { flex: 1 },
  scroll:          { flex: 1 },
  content:         { padding: 20, paddingBottom: 48 },
  decorCircle:     { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,123,0,0.06)', top: -50, right: -60 },

  header:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerIcon:      { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:       { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:           { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },
  flagBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.2)' },
  flagText:        { fontSize: 11, fontWeight: '700', color: '#EF4444' },

  statsRow:        { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)' },
  statCard:        { flex: 1, alignItems: 'center' },
  statNum:         { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:       { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', marginTop: 2 },
  statDivider:     { width: 1, backgroundColor: '#F0F2F5' },

  filterScroll:    { marginBottom: 14 },
  filterContent:   { gap: 8, paddingRight: 4 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: Colors.border.light },
  filterChipActive:{ backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue },
  filterText:      { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  filterTextActive:{ color: Colors.brand.blue },

  loadingCard:     { backgroundColor: '#FFF', borderRadius: 18, padding: 32, alignItems: 'center' },
  loadingText:     { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard:       { backgroundColor: '#FFF', borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle:      { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
});

const c = createThemedStyles({
  card:         { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.05)' },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' },
  rankBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5 },
  rankText:     { fontSize: 12, fontWeight: '900' },
  typeChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText:     { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  statusChip:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText:   { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  reportChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: '#FEF2F2' },
  reportText:   { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  title:        { fontSize: 14, fontWeight: '800', color: Colors.text.primary, marginBottom: 3, lineHeight: 20 },
  author:       { fontSize: 12, color: Colors.text.tertiary, marginBottom: 10 },
  statsRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  stat:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:     { fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  scoreBg:      { flex: 1, height: 5, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden', minWidth: 40 },
  scoreBar:     { height: '100%', borderRadius: 3, minWidth: 4 },
  scoreText:    { fontSize: 12, fontWeight: '800', color: '#FF7B00', width: 28, textAlign: 'right' },
  actions:      { flexDirection: 'row', gap: 8 },
  featureBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFF3E6', borderWidth: 1.5, borderColor: 'rgba(255,123,0,0.25)' },
  featureBtnText:{ fontSize: 12, fontWeight: '700', color: '#FF7B00' },
  removeBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)' },
  removeBtnText:{ fontSize: 12, fontWeight: '700', color: '#EF4444' },
});
