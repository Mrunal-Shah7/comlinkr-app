// src/features/admin/pages/AllPostsScreen.tsx

import { palette } from "../../../theme/palette";
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAdminAllPosts, useRemovePostMutation, useFeaturePostMutation } from '../hooks/useAdmin';
import { AdminPost } from '@shared/types/api';
import { FilterBar } from '../components/FilterBar';
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

const TYPE_META: Record<string, { icon: string; color: string; bg: string; gradient: [string, string] }> = {
  listing:    { icon: 'home',       color: Colors.brand.blue,  bg: Colors.brand.blueLight,  gradient: [Colors.brand.blue, palette.blueL40_2]   },
  restaurant: { icon: 'restaurant', color: Colors.brand.green, bg: Colors.brand.greenLight, gradient: [Colors.brand.green, palette.greenL32]  },
  event:      { icon: 'calendar',   color: palette.legacyOrange,          bg: palette.legacyOrangeLight,               gradient: [palette.legacyOrange, palette.orangeL44]           },
  news:       { icon: 'newspaper',  color: palette.violet500,          bg: palette.purple100,               gradient: [palette.violet500, palette.legacyPurple]           },
  story:      { icon: 'videocam',   color: Colors.brand.blue,  bg: Colors.brand.blueLight,  gradient: [Colors.brand.blue, palette.blueL40_2]   },
  challenge:  { icon: 'trophy',     color: palette.legacyOrange,          bg: palette.legacyOrangeLight,               gradient: [palette.legacyOrange, palette.orangeL44]           },
  community:  { icon: 'people',     color: Colors.brand.green, bg: Colors.brand.greenLight, gradient: [Colors.brand.green, palette.greenL32]  },
};

const STATUS_META: Record<string, { color: string; bg: string; icon: string }> = {
  active:  { color: Colors.brand.green,   bg: Colors.brand.greenLight, icon: 'checkmark-circle'  },
  pending: { color: palette.amber500,            bg: palette.legacyOrangeLight,               icon: 'time'              },
  flagged: { color: palette.red500,            bg: palette.red50,               icon: 'flag'              },
  removed: { color: Colors.text.tertiary, bg: palette.gray100,               icon: 'close-circle'      },
};

const TYPE_FILTERS = [
  { label: 'All Types', value: 'all_types',  icon: 'apps'       },
  { label: 'Listings',  value: 'listing',    icon: 'home'       },
  { label: 'Community', value: 'community',  icon: 'people'     },
  { label: 'Events',    value: 'event',      icon: 'calendar'   },
  { label: 'News',      value: 'news',       icon: 'newspaper'  },
  { label: 'Stories',   value: 'story',      icon: 'videocam'   },
];

function PostDetailModal({
  post, visible, onClose, onChanged,
}: { post: AdminPost | null; visible: boolean; onClose: () => void; onChanged: () => void }) {
  const { mutate: remove  } = useRemovePostMutation();
  const { mutate: feature } = useFeaturePostMutation();

  if (!post) return null;
  const typeMeta   = TYPE_META[post.type]     ?? TYPE_META.news;
  const statusMeta = STATUS_META[post.status] ?? STATUS_META.active;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dm.overlay}>
        <ScrollView style={dm.sheet} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={dm.handle} />

          {/* Gradient header */}
          <LinearGradient colors={typeMeta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dm.heroBg}>
            <View style={dm.heroCircle} />
            <Pressable style={dm.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={palette.white} />
            </Pressable>
            <View style={[dm.typeChip, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={typeMeta.icon as any} size={12} color={palette.white} />
              <Text style={dm.typeChipText}>{post.type.toUpperCase()}</Text>
            </View>
            <Text style={dm.heroTitle} numberOfLines={3}>{post.title}</Text>
            <View style={[dm.statusChip, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={statusMeta.icon as any} size={11} color={palette.white} />
              <Text style={dm.statusChipText}>{post.status.toUpperCase()}</Text>
            </View>
          </LinearGradient>

          {/* Content */}
          <View style={dm.content}>
            {/* Author + date */}
            <View style={dm.metaRow}>
              <View style={[dm.avatar, { backgroundColor: typeMeta.bg }]}>
                <Text style={[dm.avatarText, { color: typeMeta.color }]}>
                  {(post.author?.[0] ?? 'U').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dm.metaAuthor}>{post.author}</Text>
                <Text style={dm.metaDate}>
                  {new Date(post.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={dm.statsRow}>
              {[
                { icon: 'eye',         value: post.views.toLocaleString(),  label: 'Views',   color: Colors.brand.blue  },
                { icon: 'heart',       value: post.likes.toLocaleString(),  label: 'Likes',   color: palette.red500          },
                { icon: 'chatbubble',  value: (post as any).comments ?? 0,  label: 'Comments',color: Colors.brand.green },
                { icon: 'flag',        value: post.reportCount ?? 0,        label: 'Reports', color: palette.legacyOrange          },
              ].map((s) => (
                <View key={s.label} style={dm.statCard}>
                  <Ionicons name={s.icon as any} size={16} color={s.color} />
                  <Text style={[dm.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={dm.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Full content */}
            <Text style={dm.sectionLabel}>CONTENT</Text>
            <View style={dm.textBox}>
              <Text style={dm.bodyText}>{post.content || 'No content text available.'}</Text>
            </View>

            {/* Report warning */}
            {post.reportCount > 0 && (
              <View style={dm.reportWarning}>
                <Ionicons name="warning" size={16} color={palette.red500} />
                <View style={{ flex: 1 }}>
                  <Text style={dm.reportWarningTitle}>{post.reportCount} report{post.reportCount > 1 ? 's' : ''} filed</Text>
                  <Text style={dm.reportWarningText}>This post has been reported by users. Review carefully before taking action.</Text>
                </View>
              </View>
            )}

            {/* Actions */}
            {post.status !== 'removed' && (
              <View style={dm.actions}>
                <Pressable
                  style={dm.featureBtn}
                  onPress={() => {
                    appAlert('Feature Post?', `Mark "${post.title}" as featured?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Feature', onPress: () => feature(post.id, { onSuccess: () => { onChanged(); onClose(); showToast('Post is now featured.', "success"); } }) },
                    ]);
                  }}
                >
                  <Ionicons name="star" size={15} color={palette.legacyOrange} />
                  <Text style={dm.featureBtnText}>Feature Post</Text>
                </Pressable>
                <Pressable
                  style={dm.removeBtn}
                  onPress={() => appAlert('Remove Post', `Permanently remove "${post.title}"?\n\nThis action cannot be undone.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => remove(post.id, {
                      onSuccess: () => { onChanged(); onClose(); showToast('Post has been permanently removed.', "success"); },
                    }) },
                  ])}
                >
                  <Ionicons name="trash" size={15} color={palette.red500} />
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

function PostCard({ post, onChanged, onView }: { post: AdminPost; onChanged?: () => void; onView: (p: AdminPost) => void }) {
  const { mutate: remove  } = useRemovePostMutation();
  const { mutate: feature } = useFeaturePostMutation();
  const typeMeta   = TYPE_META[post.type]     ?? TYPE_META.news;
  const statusMeta = STATUS_META[post.status] ?? STATUS_META.active;

  return (
    <Pressable onPress={() => onView(post)} style={({ pressed }) => [c.card, pressed && { opacity: 0.96 }]}>
      <LinearGradient colors={typeMeta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={c.accentLine} />

      <View style={c.inner}>
        <View style={c.topRow}>
          <LinearGradient colors={typeMeta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={c.typeIcon}>
            <Ionicons name={typeMeta.icon as any} size={13} color={palette.white} />
          </LinearGradient>
          <View style={[c.typeChip, { backgroundColor: typeMeta.bg }]}>
            <Text style={[c.typeText, { color: typeMeta.color }]}>{post.type}</Text>
          </View>
          <View style={[c.statusChip, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon as any} size={9} color={statusMeta.color} />
            <Text style={[c.statusText, { color: statusMeta.color }]}>{post.status}</Text>
          </View>
          {post.reportCount > 0 && (
            <View style={c.reportChip}>
              <Ionicons name="flag" size={9} color={palette.red500} />
              <Text style={c.reportText}>{post.reportCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={15} color={Colors.text.tertiary} style={{ marginLeft: 'auto' }} />
        </View>

        <Text style={c.title} numberOfLines={2}>{post.title}</Text>
        <Text style={c.content} numberOfLines={2}>{post.content}</Text>

        <View style={c.authorRow}>
          <View style={[c.authorAvatar, { backgroundColor: typeMeta.bg }]}>
            <Text style={[c.authorInitial, { color: typeMeta.color }]}>{(post.author?.[0] ?? 'U').toUpperCase()}</Text>
          </View>
          <Text style={c.author}>{post.author}</Text>
          <Text style={c.dotSep}>·</Text>
          <Ionicons name="time-outline" size={11} color={Colors.text.tertiary} />
          <Text style={c.author}>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        </View>

        <View style={c.statsRow}>
          <View style={c.stat}>
            <Ionicons name="eye-outline" size={13} color={Colors.brand.blue} />
            <Text style={[c.statText, { color: Colors.brand.blue }]}>{post.views.toLocaleString()}</Text>
          </View>
          <View style={c.stat}>
            <Ionicons name="heart-outline" size={13} color={palette.red500} />
            <Text style={[c.statText, { color: palette.red500 }]}>{post.likes.toLocaleString()}</Text>
          </View>
          {(post as any).comments !== undefined && (
            <View style={c.stat}>
              <Ionicons name="chatbubble-outline" size={13} color={Colors.brand.green} />
              <Text style={[c.statText, { color: Colors.brand.green }]}>{(post as any).comments}</Text>
            </View>
          )}
        </View>

        {post.status !== 'removed' && (
          <View style={c.actions}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                appAlert('Feature Post?', `Feature "${post.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Feature', onPress: () => feature(post.id, { onSuccess: () => { onChanged?.(); showToast('Post is now featured.', "success"); } }) },
                ]);
              }}
              style={c.featureBtn}
            >
              <Ionicons name="star" size={12} color={palette.legacyOrange} />
              <Text style={c.featureBtnText}>Feature</Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                appAlert('Remove Post', `Remove "${post.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => remove(post.id, { onSuccess: () => { onChanged?.(); showToast('Post removed.', "success"); } }) },
                ]);
              }}
              style={c.removeBtn}
            >
              <Ionicons name="trash" size={12} color={palette.red500} />
              <Text style={c.removeBtnText}>Remove</Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onView(post);
              }}
              style={c.viewBtn}
            >
              <Ionicons name="expand" size={12} color={Colors.brand.blue} />
              <Text style={c.viewBtnText}>View Full</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function AllPostsScreen() {
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [typeFilter, setTypeFilter] = useState('all_types');
  const [detailPost, setDetailPost] = useState<AdminPost | null>(null);
  const {
    items: posts,
    meta,
    isLoading,
    isLoadingMore,
    refresh,
    loadMore,
  } = useAdminAllPosts();

  const filtered = useMemo(() => posts.filter(p => {
    const term = search.toLowerCase();
    const matchSearch = search === '' || p.title.toLowerCase().includes(term) || p.author.toLowerCase().includes(term) || (p.content ?? '').toLowerCase().includes(term);
    const matchFilter = filter === 'all' || p.status === filter || p.type === filter;
    const matchType   = typeFilter === 'all_types' || p.type === typeFilter;
    return matchSearch && matchFilter && matchType;
  }), [posts, search, filter, typeFilter]);

  const flaggedCount = useMemo(() => posts.filter(p => p.status === 'flagged').length, [posts]);
  const pendingCount = useMemo(() => posts.filter(p => p.status === 'pending').length, [posts]);
  const featuredCount= useMemo(() => posts.filter(p => (p as any).featured).length, [posts]);

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle} />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && posts.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="documents" size={22} color={palette.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>All Posts</Text>
            </View>
            <View style={s.countBadge}>
              <Text style={s.countText}>{meta?.total ?? filtered.length}</Text>
              <Text style={s.countLabel}> posts</Text>
            </View>
          </View>

          {/* Summary row */}
          <View style={s.summaryRow}>
            {[
              { label: 'Total',    value: posts.length,  color: Colors.brand.blue,  icon: 'documents'  },
              { label: 'Flagged',  value: flaggedCount,  color: palette.red500,           icon: 'flag'       },
              { label: 'Pending',  value: pendingCount,  color: palette.amber500,           icon: 'time'       },
              { label: 'Featured', value: featuredCount, color: palette.legacyOrange,           icon: 'star'       },
            ].map((item) => (
              <View key={item.label} style={s.summaryCard}>
                <Ionicons name={item.icon as any} size={14} color={item.color} />
                <Text style={[s.summaryVal, { color: item.color }]}>{item.value}</Text>
                <Text style={s.summaryLbl}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Alert row */}
          {(flaggedCount > 0 || pendingCount > 0) && (
            <View style={s.alertRow}>
              {flaggedCount > 0 && (
                <Pressable style={s.alertChip} onPress={() => setFilter('flagged')}>
                  <Ionicons name="flag" size={12} color={palette.red500} />
                  <Text style={s.alertText}>{flaggedCount} flagged — tap to review</Text>
                </Pressable>
              )}
              {pendingCount > 0 && (
                <Pressable style={[s.alertChip, s.alertChipOrange]} onPress={() => setFilter('pending')}>
                  <Ionicons name="time" size={12} color={palette.legacyOrange} />
                  <Text style={[s.alertText, s.alertTextOrange]}>{pendingCount} pending review</Text>
                </Pressable>
              )}
            </View>
          )}

          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Search title, author or content..."
            filters={[
              { label: 'All',     value: 'all',     count: posts.length    },
              { label: 'Active',  value: 'active',  count: posts.filter(p => p.status === 'active').length  },
              { label: 'Pending', value: 'pending', count: pendingCount    },
              { label: 'Flagged', value: 'flagged', count: flaggedCount    },
              { label: 'Removed', value: 'removed', count: posts.filter(p => p.status === 'removed').length },
            ]}
            activeFilter={filter}
            onFilterChange={setFilter}
          />

          {/* Type filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeScroll} contentContainerStyle={s.typeContent}>
            {TYPE_FILTERS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setTypeFilter(f.value)}
                style={[s.typeChip, typeFilter === f.value && s.typeChipActive]}
              >
                <Ionicons name={f.icon as any} size={12} color={typeFilter === f.value ? Colors.brand.blue : Colors.text.tertiary} />
                <Text style={[s.typeChipText, typeFilter === f.value && s.typeChipTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {isLoading ? (
            <View style={s.loadingCard}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} style={s.loadingIcon}>
                <Ionicons name="hourglass" size={20} color={palette.white} />
              </LinearGradient>
              <Text style={s.loadingText}>Loading posts...</Text>
              <Text style={s.loadingSubText}>Fetching content from server</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="documents-outline" size={40} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No posts found</Text>
              <Text style={s.emptySub}>{(search !== '' || filter !== 'all' || typeFilter !== 'all_types') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            <>
              {filtered.map(post => (
                <PostCard key={post.id} post={post} onChanged={refresh} onView={setDetailPost} />
              ))}
              {meta && meta.page < meta.totalPages && (
                <Pressable style={s.loadMoreBtn} onPress={loadMore} disabled={isLoadingMore}>
                  <Text style={s.loadMoreText}>{isLoadingMore ? 'Loading...' : 'Load more'}</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <PostDetailModal
        post={detailPost}
        visible={detailPost !== null}
        onClose={() => setDetailPost(null)}
        onChanged={refresh}
      />
    </View>
  );
}

const s = createThemedStyles({
  root:           { flex: 1, backgroundColor: palette.legacyBlueLight },
  safe:           { flex: 1 },
  scroll:         { flex: 1 },
  content:        { padding: 18, paddingBottom: 48 },
  decorCircle:    { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(0,118,235,0.06)', top: -60, right: -60 },

  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn:        { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.legacyBlueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  headerIcon:     { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:      { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:          { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },
  countBadge:     { flexDirection: 'row', alignItems: 'baseline', backgroundColor: Colors.brand.blueLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  countText:      { fontSize: 15, fontWeight: '900', color: Colors.brand.blue },
  countLabel:     { fontSize: 10, fontWeight: '600', color: Colors.brand.blue },

  summaryRow:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryCard:    { flex: 1, backgroundColor: palette.white, borderRadius: 13, padding: 10, alignItems: 'center', gap: 3, shadowColor: palette.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryVal:     { fontSize: 18, fontWeight: '900' },
  summaryLbl:     { fontSize: 9, fontWeight: '600', color: Colors.text.tertiary },

  alertRow:       { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  alertChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.red50, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  alertText:      { fontSize: 12, fontWeight: '700', color: palette.red500 },
  alertChipOrange:{ backgroundColor: palette.legacyOrangeLight, borderColor: 'rgba(255,123,0,0.2)' },
  alertTextOrange:{ color: palette.legacyOrange },

  typeScroll:     { marginBottom: 14 },
  typeContent:    { gap: 7, paddingRight: 4 },
  typeChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, backgroundColor: palette.white, borderWidth: 1.5, borderColor: Colors.border.light },
  typeChipActive: { backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue },
  typeChipText:   { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  typeChipTextActive: { color: Colors.brand.blue },

  loadingCard:    { backgroundColor: palette.white, borderRadius: 20, padding: 36, alignItems: 'center', gap: 10, elevation: 3 },
  loadingIcon:    { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  loadingText:    { color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  loadingSubText: { color: Colors.text.tertiary, fontSize: 12 },
  emptyCard:      { backgroundColor: palette.white, borderRadius: 18, padding: 40, alignItems: 'center', gap: 6, elevation: 2 },
  emptyTitle:     { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
  emptySub:       { fontSize: 13, color: Colors.text.tertiary },
  loadMoreBtn:    { backgroundColor: palette.white, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  loadMoreText:   { fontSize: 14, fontWeight: '700', color: Colors.brand.blue },
});

const c = createThemedStyles({
  card:         { backgroundColor: palette.white, borderRadius: 18, marginBottom: 10, shadowColor: palette.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.05)', overflow: 'hidden', flexDirection: 'row' },
  accentLine:   { width: 4, flexShrink: 0 },
  inner:        { flex: 1, padding: 13 },

  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  typeIcon:     { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  typeChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  typeText:     { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  statusChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  statusText:   { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  reportChip:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: palette.red50 },
  reportText:   { fontSize: 10, fontWeight: '800', color: palette.red500 },

  title:        { fontSize: 14, fontWeight: '800', color: Colors.text.primary, marginBottom: 3, lineHeight: 19 },
  content:      { fontSize: 12, color: Colors.text.secondary, lineHeight: 17, marginBottom: 7 },

  authorRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  authorAvatar: { width: 20, height: 20, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  authorInitial:{ fontSize: 9, fontWeight: '900' },
  author:       { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
  dotSep:       { fontSize: 10, color: Colors.text.tertiary },

  statsRow:     { flexDirection: 'row', gap: 12, marginBottom: 10 },
  stat:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:     { fontSize: 12, fontWeight: '700' },

  actions:      { flexDirection: 'row', gap: 7 },
  featureBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: palette.legacyOrangeLight, borderWidth: 1.5, borderColor: 'rgba(255,123,0,0.25)' },
  featureBtnText:{ fontSize: 11, fontWeight: '700', color: palette.legacyOrange },
  removeBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: palette.red50, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)' },
  removeBtnText:{ fontSize: 11, fontWeight: '700', color: palette.red500 },
  viewBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.brand.blueLight, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  viewBtnText:  { fontSize: 11, fontWeight: '700', color: Colors.brand.blue },
});

const dm = createThemedStyles({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: palette.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%' },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: palette.gray200, alignSelf: 'center', marginTop: 12, marginBottom: 0 },

  heroBg:    { padding: 24, paddingTop: 14, borderTopLeftRadius: 28, borderTopRightRadius: 28, position: 'relative', overflow: 'hidden', paddingBottom: 22 },
  heroCircle:{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.1)', top: -50, right: -40 },
  closeBtn:  { position: 'absolute', top: 14, right: 16, width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  typeChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, marginBottom: 10 },
  typeChipText: { fontSize: 10, fontWeight: '800', color: palette.white, letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: palette.white, lineHeight: 26, marginBottom: 10 },
  statusChip:{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  statusChipText: { fontSize: 10, fontWeight: '800', color: palette.white, letterSpacing: 0.5 },

  content:   { padding: 20 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.neutralL95_5 },
  avatar:    { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarText:{ fontSize: 16, fontWeight: '900' },
  metaAuthor:{ fontSize: 14, fontWeight: '800', color: Colors.text.primary },
  metaDate:  { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },

  statsRow:  { flexDirection: 'row', gap: 8, marginBottom: 18 },
  statCard:  { flex: 1, backgroundColor: palette.slate50, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.neutralL93_3 },
  statVal:   { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: Colors.text.tertiary, letterSpacing: 1, marginBottom: 8 },
  textBox:   { backgroundColor: palette.slate50, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: palette.neutralL93_3 },
  bodyText:  { fontSize: 14, color: Colors.text.primary, lineHeight: 21 },

  reportWarning: { flexDirection: 'row', gap: 10, backgroundColor: palette.red50, borderRadius: 13, padding: 14, marginBottom: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  reportWarningTitle: { fontSize: 13, fontWeight: '800', color: palette.red700, marginBottom: 2 },
  reportWarningText: { fontSize: 12, color: palette.red700, lineHeight: 17 },

  actions:      { flexDirection: 'row', gap: 10 },
  featureBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, backgroundColor: palette.legacyOrangeLight, borderWidth: 1.5, borderColor: 'rgba(255,123,0,0.3)' },
  featureBtnText:{ fontSize: 14, fontWeight: '800', color: palette.legacyOrange },
  removeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, backgroundColor: palette.red50, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)' },
  removeBtnText:{ fontSize: 14, fontWeight: '800', color: palette.red500 },
});
