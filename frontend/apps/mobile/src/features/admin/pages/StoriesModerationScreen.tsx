// src/features/admin/pages/StoriesModerationScreen.tsx
//
// Mirrors FoodManagementScreen.tsx's layout (header, summary row, filter bar,
// card list) for the Stories content type, which previously had no admin
// moderation surface at all.

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
import { useAdminStories, useDeleteStoryMutation } from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import { alertAdminApiError } from '../api/handleAdminError';
import { Colors } from '@theme/colors';
import { resolveApiAssetUrl } from '../../../api/feed.api';
import type { AdminStoryRow } from '../../../api/admin.api';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { useBackState } from '../../../hooks/useBackState';

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function relativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm|avi)(\?|$)/i.test(url);
}

function StoryDetailModal({
  story, visible, onClose, onRemove, isDeleting,
}: {
  story: AdminStoryRow | null;
  visible: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  isDeleting: boolean;
}) {
  // The native sheet stays mounted and keeps the last item while it slides away (TR-017).
  story = useLastNonNull(story);
  if (!story) return <DSheet visible={false} onClose={onClose}><View /></DSheet>;
  const expired = isExpired(story.expiresAt);
  const mediaUri = resolveApiAssetUrl(story.mediaUrl);
  const video = isVideoUrl(story.mediaUrl);

  return (
    <DSheet visible={visible} onClose={onClose}>
      <View style={{ flexShrink: 1 }}>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

          <View style={dm.headerRow}>
            <Text style={dm.headerTitle}>Story Detail</Text>
            <Pressable style={dm.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={Colors.text.secondary} />
            </Pressable>
          </View>

          {/* Media preview — the whole point of this modal: admins must be able to SEE
              the reported content, not just metadata. */}
          <View style={dm.mediaWrap}>
            {mediaUri ? (
              <>
                <Image source={{ uri: mediaUri }} style={dm.media} contentFit="cover" />
                {video && (
                  <View style={dm.playOverlay}>
                    <View style={dm.playCircle}>
                      <Ionicons name="play" size={22} color={palette.white} />
                    </View>
                    <Text style={dm.videoLabel}>Video story</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={[dm.media, dm.mediaFallback]}>
                <Ionicons name="image-outline" size={32} color={Colors.text.tertiary} />
                <Text style={dm.mediaFallbackText}>No media URL</Text>
              </View>
            )}
          </View>

          <View style={dm.content}>
            <View style={dm.metaRow}>
              <Ionicons name="person-circle-outline" size={20} color={Colors.text.tertiary} />
              <Text style={dm.authorText}>@{story.author.username}</Text>
              {story.author.fullName ? <Text style={dm.authorFullName}>({story.author.fullName})</Text> : null}
            </View>

            {story.caption ? (
              <>
                <Text style={dm.sectionLabel}>CAPTION</Text>
                <View style={dm.textBox}>
                  <Text style={dm.bodyText}>{story.caption}</Text>
                </View>
              </>
            ) : (
              <Text style={dm.noCaption}>No caption</Text>
            )}

            <Text style={[dm.sectionLabel, { marginTop: 14 }]}>DETAILS</Text>
            <View style={dm.statsRow}>
              <View style={dm.statCard}>
                <Ionicons name="eye" size={15} color={Colors.brand.blue} />
                <Text style={[dm.statVal, { color: Colors.brand.blue }]}>{story.viewCount}</Text>
                <Text style={dm.statLabel}>Views</Text>
              </View>
              <View style={dm.statCard}>
                <Ionicons name="flag" size={15} color={palette.red500} />
                <Text style={[dm.statVal, { color: palette.red500 }]}>{story.reportCount}</Text>
                <Text style={dm.statLabel}>Reports</Text>
              </View>
              <View style={dm.statCard}>
                <Ionicons name={expired ? 'time' : 'checkmark-circle'} size={15} color={expired ? Colors.text.tertiary : Colors.brand.green} />
                <Text style={[dm.statVal, { color: expired ? Colors.text.tertiary : Colors.brand.green }]}>{expired ? 'Expired' : 'Active'}</Text>
                <Text style={dm.statLabel}>Status</Text>
              </View>
            </View>

            <View style={dm.timestampBlock}>
              <View style={dm.timestampRow}>
                <Ionicons name="time-outline" size={13} color={Colors.text.tertiary} />
                <Text style={dm.timestampText}>Posted {relativeTime(story.createdAt)} ({new Date(story.createdAt).toLocaleString()})</Text>
              </View>
              <View style={dm.timestampRow}>
                <Ionicons name="hourglass-outline" size={13} color={Colors.text.tertiary} />
                <Text style={dm.timestampText}>
                  {expired ? 'Expired' : 'Expires'} {new Date(story.expiresAt).toLocaleString()}
                </Text>
              </View>
            </View>

            {story.reportCount > 0 && (
              <View style={dm.reportWarning}>
                <Ionicons name="warning" size={16} color={palette.red500} />
                <View style={{ flex: 1 }}>
                  <Text style={dm.reportWarningTitle}>{story.reportCount} report{story.reportCount > 1 ? 's' : ''} filed</Text>
                  <Text style={dm.reportWarningText}>Review the media above carefully before taking action.</Text>
                </View>
              </View>
            )}

            <Pressable
              style={dm.removeBtn}
              disabled={isDeleting}
              onPress={() => onRemove(story.id)}
            >
              <Ionicons name="trash" size={15} color={palette.red500} />
              <Text style={dm.removeBtnText}>{isDeleting ? 'Removing...' : 'Remove Story'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </DSheet>
  );
}

export default function StoriesModerationScreen() {
  const [search, setSearch] = useBackState('', { coalesceMs: 1200 });
  const [filter, setFilter] = useBackState('all');
  const [detailStory, setDetailStory] = useState<AdminStoryRow | null>(null);
  const {
    items: stories,
    meta,
    isLoading,
    isLoadingMore,
    refresh,
    loadMore,
  } = useAdminStories();
  const { mutate: deleteStory, isPending: isDeleting } = useDeleteStoryMutation();

  const activeCount = stories.filter((st) => st.isActive && !isExpired(st.expiresAt)).length;
  const reportedCount = stories.filter((st) => st.reportCount > 0).length;
  const expiredCount = stories.filter((st) => isExpired(st.expiresAt)).length;

  const filtered = stories.filter((st) => {
    const matchSearch = search === '' || st.author.username.toLowerCase().includes(search.toLowerCase()) || (st.caption ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && st.isActive && !isExpired(st.expiresAt)) ||
      (filter === 'reported' && st.reportCount > 0) ||
      (filter === 'expired' && isExpired(st.expiresAt));
    return matchSearch && matchFilter;
  });

  const handleRemove = (storyId: string) => {
    appAlert('Remove story?', 'This permanently removes the story. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => deleteStory(storyId, {
          onSuccess: () => { setDetailStory(null); void refresh(); },
          onError: (err) => alertAdminApiError(err, 'Remove failed'),
        }),
      },
    ]);
  };

  return (
    <View style={s.root}>
      <AdminBackdrop />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && stories.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[palette.legacyOrange, palette.orangeL44]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="images" size={22} color={palette.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Stories Moderation</Text>
            </View>
            {reportedCount > 0 && (
              <View style={s.alertPill}>
                <View style={s.alertDot} />
                <Text style={s.alertText}>{reportedCount} reported</Text>
              </View>
            )}
          </View>

          <View style={s.summaryRow}>
            {[
              { label: 'Total', value: stories.length, color: palette.legacyOrange },
              { label: 'Active', value: activeCount, color: Colors.brand.green },
              { label: 'Reported', value: reportedCount, color: palette.red500 },
              { label: 'Expired', value: expiredCount, color: Colors.text.tertiary },
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
            placeholder="Search author, caption..."
            filters={[
              { label: 'All', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Reported', value: 'reported', count: reportedCount },
              { label: 'Expired', value: 'expired' },
            ]}
            activeFilter={filter}
            onFilterChange={setFilter}
          />

          {isLoading ? (
            <View style={s.loadingCard}>
              <Ionicons name="hourglass-outline" size={24} color={Colors.text.tertiary} />
              <Text style={s.loadingText}>Loading stories...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="images-outline" size={40} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No stories found</Text>
              <Text style={s.emptySub}>{(search !== '' || filter !== 'all') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            <>
              {filtered.map((story) => {
                const expired = isExpired(story.expiresAt);
                const thumbUri = resolveApiAssetUrl(story.mediaUrl);
                const video = isVideoUrl(story.mediaUrl);
                return (
                  <Pressable key={story.id} onPress={() => setDetailStory(story)} style={({ pressed }) => [s.card, pressed && { opacity: 0.96 }]}>
                    <View style={s.cardRow}>
                      {thumbUri ? (
                        <View style={s.thumbWrap}>
                          <Image source={{ uri: thumbUri }} style={s.thumb} contentFit="cover" />
                          {video && (
                            <View style={s.thumbPlayOverlay}>
                              <Ionicons name="play" size={14} color={palette.white} />
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={[s.thumb, s.thumbFallback]}>
                          <Ionicons name="image-outline" size={20} color={Colors.text.tertiary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={s.cardHeaderRow}>
                          <Ionicons name="person-circle-outline" size={16} color={Colors.text.tertiary} />
                          <Text style={s.cardAuthor}>@{story.author.username}</Text>
                          {story.reportCount > 0 && (
                            <View style={s.reportChip}>
                              <Ionicons name="flag" size={10} color={palette.red500} />
                              <Text style={s.reportChipText}>{story.reportCount}</Text>
                            </View>
                          )}
                          <Ionicons name="chevron-forward" size={15} color={Colors.text.tertiary} style={{ marginLeft: 'auto' }} />
                        </View>
                        {story.caption && <Text style={s.cardCaption} numberOfLines={2}>{story.caption}</Text>}
                        <View style={s.chipRow}>
                          <View style={[s.chip, { backgroundColor: expired ? palette.gray100 : Colors.brand.greenLight }]}>
                            <Ionicons name={expired ? 'time' : 'checkmark-circle'} size={11} color={expired ? Colors.text.tertiary : Colors.brand.green} />
                            <Text style={[s.chipText, { color: expired ? Colors.text.tertiary : Colors.brand.green }]}>{expired ? 'Expired' : 'Active'}</Text>
                          </View>
                          <View style={s.chip}>
                            <Ionicons name="eye" size={11} color={Colors.text.tertiary} />
                            <Text style={s.chipText}>{story.viewCount} views</Text>
                          </View>
                          <View style={s.chip}>
                            <Ionicons name="time-outline" size={11} color={Colors.text.tertiary} />
                            <Text style={s.chipText}>{relativeTime(story.createdAt)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <Pressable
                      style={s.removeBtn}
                      onPress={(e) => { e.stopPropagation?.(); !isDeleting && handleRemove(story.id); }}
                    >
                      <Ionicons name="trash-outline" size={13} color={palette.red500} />
                      <Text style={s.removeBtnText}>Remove</Text>
                    </Pressable>
                  </Pressable>
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

      <StoryDetailModal
        story={detailStory}
        visible={detailStory !== null}
        onClose={() => setDetailStory(null)}
        onRemove={handleRemove}
        isDeleting={isDeleting}
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
  backBtn:     { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.legacyBlueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  headerIcon:  { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headerSub:   { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  title:       { fontSize: 22, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },
  alertPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.red50, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)' },
  alertDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.red500 },
  alertText:   { fontSize: 12, fontWeight: '700', color: palette.red500 },

  summaryRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: palette.white, borderRadius: 14, padding: 12, alignItems: 'center' },
  summaryVal:  { fontSize: 20, fontWeight: '900' },
  summaryLbl:  { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  loadingCard: { backgroundColor: palette.white, borderRadius: 18, padding: 36, alignItems: 'center', gap: 10 },
  loadingText: { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },
  emptyCard:   { backgroundColor: palette.white, borderRadius: 18, padding: 44, alignItems: 'center', gap: 8 },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  emptySub:    { fontSize: 13, color: Colors.text.tertiary },

  card:        { backgroundColor: palette.white, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardRow:     { flexDirection: 'row', gap: 10, marginBottom: 10 },
  thumbWrap:   { position: 'relative' },
  thumb:       { width: 56, height: 56, borderRadius: 12, backgroundColor: palette.gray100 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  thumbPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardAuthor:  { flex: 1, fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  reportChip:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: palette.red50, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  reportChipText: { fontSize: 10, fontWeight: '800', color: palette.red500 },
  cardCaption: { fontSize: 12, color: Colors.text.secondary, marginBottom: 8 },

  chipRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: palette.gray100 },
  chipText:    { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },

  removeBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: palette.red50 },
  removeBtnText: { fontSize: 12, fontWeight: '700', color: palette.red500 },
  loadMoreBtn: { backgroundColor: palette.white, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  loadMoreText:{ fontSize: 14, fontWeight: '700', color: Colors.brand.blue },
});

const dm = createThemedStyles({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: palette.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%' },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: palette.gray200, alignSelf: 'center', marginTop: 12 },

  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  headerTitle:{ fontSize: 16, fontWeight: '900', color: Colors.text.primary },
  closeBtn:   { width: 32, height: 32, borderRadius: 10, backgroundColor: palette.gray100, alignItems: 'center', justifyContent: 'center' },

  mediaWrap:  { paddingHorizontal: 20, paddingTop: 10 },
  media:      { width: '100%', height: 320, borderRadius: 18, backgroundColor: palette.black },
  mediaFallback: { alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.gray100 },
  mediaFallbackText: { fontSize: 12, color: Colors.text.tertiary, fontWeight: '600' },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  playCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  videoLabel: { fontSize: 12, fontWeight: '700', color: palette.white },

  content:    { padding: 20 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  authorText: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  authorFullName: { fontSize: 12, color: Colors.text.tertiary },

  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Colors.text.tertiary, marginBottom: 8 },
  textBox:    { backgroundColor: palette.slate50, borderRadius: 14, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: palette.neutralL93_3 },
  bodyText:   { fontSize: 14, color: Colors.text.primary, lineHeight: 21 },
  noCaption:  { fontSize: 13, color: Colors.text.tertiary, fontStyle: 'italic', marginBottom: 4 },

  statsRow:   { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  statCard:   { flex: 1, backgroundColor: palette.slate50, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.neutralL93_3 },
  statVal:    { fontSize: 15, fontWeight: '900' },
  statLabel:  { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },

  timestampBlock: { marginTop: 14, gap: 6 },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  timestampText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },

  reportWarning: { flexDirection: 'row', gap: 10, backgroundColor: palette.red50, borderRadius: 13, padding: 14, marginTop: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  reportWarningTitle: { fontSize: 13, fontWeight: '800', color: palette.red700, marginBottom: 2 },
  reportWarningText: { fontSize: 12, color: palette.red700, lineHeight: 17 },

  removeBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 13, backgroundColor: palette.red50, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)', marginTop: 18 },
  removeBtnText: { fontSize: 14, fontWeight: '800', color: palette.red500 },
});
