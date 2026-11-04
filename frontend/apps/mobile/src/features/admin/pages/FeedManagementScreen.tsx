// src/features/admin/pages/FeedManagementScreen.tsx

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAdminFeedPosts, useFeatureFeedPostMutation, useRemoveFeedPostMutation } from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import { AdminCard } from '../components/AdminCard';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { ActionButtons } from '../components/ActionButtons';
import { AdminActionType } from '../types';
import { FeedPost } from '../mock/adminMockData';
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { showToast } from '../../../shared/ui/Toast';

const STATUS_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  published: { color: Colors.brand.green,   bg: Colors.brand.greenLight, icon: 'checkmark-circle', label: 'Published' },
  pending:   { color: '#F59E0B',            bg: '#FFF3E6',               icon: 'time',             label: 'Pending'   },
  flagged:   { color: '#EF4444',            bg: '#FEF2F2',               icon: 'alert-circle',     label: 'Flagged'   },
  removed:   { color: Colors.text.tertiary, bg: '#F3F4F6',               icon: 'close-circle',     label: 'Removed'   },
};

const TYPE_META: Record<string, { color: string; icon: string }> = {
  event:     { color: Colors.brand.blue,  icon: 'calendar'  },
  news:      { color: '#8B5CF6',          icon: 'newspaper' },
  story:     { color: '#F59E0B',          icon: 'book'      },
  challenge: { color: '#FF7B00',          icon: 'trophy'    },
  poll:      { color: Colors.brand.green, icon: 'bar-chart' },
};

function FeedPostDetailModal({
  post, visible, onClose, onFeature, onRemove,
}: {
  post: FeedPost | null;
  visible: boolean;
  onClose: () => void;
  onFeature: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!post) return null;
  const sm = STATUS_META[post.status] ?? STATUS_META.removed;
  const tm = TYPE_META[post.type] ?? { color: Colors.text.tertiary, icon: 'document' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dm.overlay}>
        <ScrollView style={dm.sheet} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={dm.handle} />

          <View style={dm.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={[dm.typeChip, { backgroundColor: tm.color + '18' }]}>
                <Ionicons name={tm.icon as any} size={11} color={tm.color} />
                <Text style={[dm.typeChipText, { color: tm.color }]}>{post.type.toUpperCase()}</Text>
              </View>
              <Text style={dm.title}>{post.title}</Text>
            </View>
            <Pressable style={dm.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={Colors.text.secondary} />
            </Pressable>
          </View>

          <View style={dm.content}>
            <View style={dm.metaRow}>
              <View style={[dm.badge, { backgroundColor: sm.bg }]}>
                <Ionicons name={sm.icon as any} size={11} color={sm.color} />
                <Text style={[dm.badgeText, { color: sm.color }]}>{sm.label}</Text>
              </View>
              {post.featured && (
                <View style={[dm.badge, { backgroundColor: '#FFF3E6' }]}>
                  <Ionicons name="star" size={11} color="#FF7B00" />
                  <Text style={[dm.badgeText, { color: '#FF7B00' }]}>Featured</Text>
                </View>
              )}
              {post.reports > 0 && (
                <View style={[dm.badge, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="flag" size={11} color="#EF4444" />
                  <Text style={[dm.badgeText, { color: '#EF4444' }]}>{post.reports} report{post.reports !== 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>

            <Text style={dm.sectionLabel}>AUTHOR</Text>
            <View style={dm.authorRow}>
              <View style={dm.avatar}>
                <Text style={dm.avatarText}>{(post.author?.[0] ?? 'U').toUpperCase()}</Text>
              </View>
              <View>
                <Text style={dm.authorName}>{post.author}</Text>
                <Text style={dm.authorDate}>
                  {post.createdAt ? new Date(post.createdAt).toLocaleString() : post.date}
                </Text>
              </View>
            </View>

            <Text style={[dm.sectionLabel, { marginTop: 14 }]}>FULL CONTENT</Text>
            <View style={dm.textBox}>
              <Text style={dm.bodyText}>{post.content?.trim() ? post.content : 'No content text available for this post.'}</Text>
            </View>

            <Text style={[dm.sectionLabel, { marginTop: 14 }]}>ENGAGEMENT</Text>
            <View style={dm.statsRow}>
              <View style={dm.statCard}>
                <Ionicons name="heart" size={15} color="#EF4444" />
                <Text style={[dm.statVal, { color: '#EF4444' }]}>{post.likes.toLocaleString()}</Text>
                <Text style={dm.statLabel}>Likes</Text>
              </View>
              <View style={dm.statCard}>
                <Ionicons name="chatbubble" size={15} color={Colors.brand.green} />
                <Text style={[dm.statVal, { color: Colors.brand.green }]}>{post.comments.toLocaleString()}</Text>
                <Text style={dm.statLabel}>Comments</Text>
              </View>
              <View style={dm.statCard}>
                <Ionicons name="eye" size={15} color={Colors.brand.blue} />
                <Text style={[dm.statVal, { color: Colors.brand.blue }]}>{post.views.toLocaleString()}</Text>
                <Text style={dm.statLabel}>Views</Text>
              </View>
            </View>

            {post.tags.length > 0 && (
              <>
                <Text style={[dm.sectionLabel, { marginTop: 14 }]}>TAGS</Text>
                <View style={dm.tagRow}>
                  {post.tags.map((t) => (
                    <View key={t} style={dm.tagChip}><Text style={dm.tagChipText}>#{t}</Text></View>
                  ))}
                </View>
              </>
            )}

            {(post.status === 'pending' || post.status === 'flagged' || post.status === 'published') && (
              <View style={dm.actions}>
                <Pressable
                  style={dm.featureBtn}
                  onPress={() => appAlert('Feature Post?', `Feature "${post.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Feature', onPress: () => onFeature(post.id) },
                  ])}
                >
                  <Ionicons name="star" size={15} color="#FF7B00" />
                  <Text style={dm.featureBtnText}>Feature Post</Text>
                </Pressable>
                <Pressable
                  style={dm.removeBtn}
                  onPress={() => appAlert('Remove Post', `Remove "${post.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => onRemove(post.id) },
                  ])}
                >
                  <Ionicons name="trash" size={15} color="#EF4444" />
                  <Text style={dm.removeBtnText}>Remove Post</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function FeedManagementScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [detailPost, setDetailPost] = useState<FeedPost | null>(null);
  const {
    items: posts,
    meta,
    isLoading,
    isLoadingMore,
    refresh,
    loadMore,
  } = useAdminFeedPosts();
  const { mutate: featurePost } = useFeatureFeedPostMutation();
  const { mutate: removePost }  = useRemoveFeedPostMutation();

  const filtered = posts.filter((p) => {
    const matchSearch = search === '' || p.title.toLowerCase().includes(search.toLowerCase()) || p.author.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter || p.type === filter;
    return matchSearch && matchFilter;
  });

  const handleAction = (postId: string, action: AdminActionType) => {
    if (action === 'approve') featurePost(postId, { onSuccess: () => refresh() });
    if (action === 'reject')  removePost(postId, { onSuccess: () => refresh() });
  };

  const handleFeature = (postId: string) => {
    featurePost(postId, {
      onSuccess: () => { refresh(); setDetailPost(null); showToast('Post is now featured.', "success"); },
    });
  };

  const handleRemove = (postId: string) => {
    removePost(postId, {
      onSuccess: () => { refresh(); setDetailPost(null); showToast('Post has been removed.', "success"); },
    });
  };

  const pendingCount = posts.filter(p => p.status === 'pending').length;
  const flaggedCount = posts.filter(p => p.status === 'flagged').length;

  return (
    <View style={s.root}>
      <AdminBackdrop />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && posts.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="newspaper" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Feed Management</Text>
            </View>
            {(pendingCount + flaggedCount) > 0 && (
              <View style={s.alertPill}>
                <View style={s.alertDot} />
                <Text style={s.alertText}>{pendingCount + flaggedCount} review</Text>
              </View>
            )}
          </View>

          {/* Summary */}
          <View style={s.summaryRow}>
            {[
              { label: 'Total',     value: posts.length,                                       color: Colors.brand.blue  },
              { label: 'Published', value: posts.filter(p => p.status === 'published').length, color: Colors.brand.green },
              { label: 'Pending',   value: pendingCount,                                       color: '#F59E0B'           },
              { label: 'Flagged',   value: flaggedCount,                                       color: '#EF4444'           },
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
            placeholder="Search feed posts..."
            filters={[
              { label: 'All',       value: 'all',     count: posts.length },
              { label: 'Published', value: 'published'                    },
              { label: 'Pending',   value: 'pending', count: pendingCount },
              { label: 'Flagged',   value: 'flagged', count: flaggedCount },
              { label: 'Events',    value: 'event'                        },
              { label: 'News',      value: 'news'                         },
            ]}
            activeFilter={filter}
            onFilterChange={setFilter}
          />

          {isLoading ? (
            <View style={s.loadingCard}>
              <Ionicons name="hourglass-outline" size={24} color={Colors.text.tertiary} />
              <Text style={s.loadingText}>Loading feed posts...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="newspaper-outline" size={40} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No posts found</Text>
              <Text style={s.emptySub}>{(search !== '' || filter !== 'all') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            <>
              {filtered.map((post) => {
                const sm = STATUS_META[post.status] ?? STATUS_META.removed;
                const tm = TYPE_META[post.type]     ?? { color: Colors.text.tertiary, icon: 'document' };
                return (
                  <AdminCard
                    key={post.id}
                    title={post.title}
                    subtitle={`by ${post.author} · ${post.date}`}
                    badge={{ label: sm.label, color: sm.color }}
                    accentColor={sm.color}
                    onPress={() => setDetailPost(post)}
                  >
                    <View style={s.chipRow}>
                      <View style={[s.chip, { backgroundColor: tm.color + '18' }]}>
                        <Ionicons name={tm.icon as any} size={11} color={tm.color} />
                        <Text style={[s.chipText, { color: tm.color }]}>{post.type.charAt(0).toUpperCase() + post.type.slice(1)}</Text>
                      </View>
                      {post.featured && (
                        <View style={[s.chip, { backgroundColor: '#FFF3E6' }]}>
                          <Ionicons name="star" size={11} color="#FF7B00" />
                          <Text style={[s.chipText, { color: '#FF7B00' }]}>Featured</Text>
                        </View>
                      )}
                      {post.reports > 0 && (
                        <View style={[s.chip, { backgroundColor: '#FEF2F2' }]}>
                          <Ionicons name="flag" size={11} color="#EF4444" />
                          <Text style={[s.chipText, { color: '#EF4444' }]}>{post.reports} report{post.reports !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.statsRow}>
                      {[
                        { icon: 'heart',      val: post.likes    },
                        { icon: 'chatbubble', val: post.comments },
                        { icon: 'eye',        val: post.views    },
                      ].map((stat) => (
                        <View key={stat.icon} style={s.statItem}>
                          <Ionicons name={stat.icon as any} size={12} color={Colors.text.tertiary} />
                          <Text style={s.statText}>{stat.val.toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                    {(post.status === 'pending' || post.status === 'flagged') && (
                      <ActionButtons actions={['approve', 'reject']} onAction={(a) => handleAction(post.id, a)} />
                    )}
                    <Pressable style={s.viewBtn} onPress={() => setDetailPost(post)}>
                      <Ionicons name="expand" size={12} color={Colors.brand.blue} />
                      <Text style={s.viewBtnText}>View Full</Text>
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

      <FeedPostDetailModal
        post={detailPost}
        visible={detailPost !== null}
        onClose={() => setDetailPost(null)}
        onFeature={handleFeature}
        onRemove={handleRemove}
      />
    </View>
  );
}

const s = createThemedStyles({
  root:        { flex: 1, backgroundColor: '#EBF5FF' },
  safe:        { flex: 1 },
  scroll:      { flex: 1 },
  content:     { padding: 18, paddingBottom: 48 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
  headerIcon:  { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headerSub:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  title:       { fontSize: 22, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },
  alertPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3E6', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.25)' },
  alertDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
  alertText:   { fontSize: 12, fontWeight: '700', color: '#F59E0B' },

  summaryRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryVal:  { fontSize: 20, fontWeight: '900' },
  summaryLbl:  { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  loadingCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 36, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  loadingText: { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },
  emptyCard:   { backgroundColor: '#FFF', borderRadius: 18, padding: 44, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  emptySub:    { fontSize: 13, color: Colors.text.tertiary },

  chipRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText:    { fontSize: 11, fontWeight: '700' },
  statsRow:    { flexDirection: 'row', gap: 14, marginBottom: 8 },
  statItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:    { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
  loadMoreBtn: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  loadMoreText:{ fontSize: 14, fontWeight: '700', color: Colors.brand.blue },
  viewBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.brand.blueLight, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10 },
  viewBtnText: { fontSize: 11, fontWeight: '700', color: Colors.brand.blue },
});

const dm = createThemedStyles({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%' },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12 },

  headerRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  typeChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, marginBottom: 8 },
  typeChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title:      { fontSize: 19, fontWeight: '900', color: Colors.text.primary, lineHeight: 25 },
  closeBtn:   { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  content:    { padding: 20, paddingTop: 8 },
  metaRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '800' },

  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Colors.text.tertiary, marginBottom: 8 },
  authorRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '900', color: Colors.brand.blue },
  authorName: { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  authorDate: { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },

  textBox:    { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8ECF0' },
  bodyText:   { fontSize: 14, color: Colors.text.primary, lineHeight: 21 },

  statsRow:   { flexDirection: 'row', gap: 8 },
  statCard:   { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E8ECF0' },
  statVal:    { fontSize: 15, fontWeight: '900' },
  statLabel:  { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },

  tagRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip:    { backgroundColor: '#F3F4F6', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  tagChipText:{ fontSize: 11, fontWeight: '700', color: Colors.text.secondary },

  actions:    { flexDirection: 'row', gap: 10, marginTop: 18 },
  featureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, backgroundColor: '#FFF3E6', borderWidth: 1.5, borderColor: 'rgba(255,123,0,0.3)' },
  featureBtnText: { fontSize: 14, fontWeight: '800', color: '#FF7B00' },
  removeBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)' },
  removeBtnText: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
});
