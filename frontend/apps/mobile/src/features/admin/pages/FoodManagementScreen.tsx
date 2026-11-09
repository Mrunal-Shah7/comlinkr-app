// src/features/admin/pages/FoodManagementScreen.tsx

import { palette } from "../../../theme/palette";
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAdminFoodListings, useVerifyFoodListingMutation, useSuspendFoodListingMutation } from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import { AdminCard } from '../components/AdminCard';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { ActionButtons } from '../components/ActionButtons';
import { AdminActionType } from '../types';
import { FoodListing } from '../mock/adminMockData';
import { Colors } from '@theme/colors';
import { resolveApiAssetUrl } from '../../../api/feed.api';
import { createThemedStyles } from '../../../theme/themedStyles';

const STATUS_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  active:    { color: Colors.brand.green,   bg: Colors.brand.greenLight, icon: 'checkmark-circle', label: 'Active'    },
  pending:   { color: palette.amber500,            bg: palette.legacyOrangeLight,               icon: 'time',             label: 'Pending'   },
  suspended: { color: palette.red500,            bg: palette.red50,               icon: 'close-circle',     label: 'Suspended' },
};

const PRICE_COLOR: Record<string, string> = {
  '$':    Colors.brand.green,
  '$$':   palette.amber500,
  '$$$':  palette.red500,
  '$$$$': palette.violet500,
};

function FoodCard({
  listing, onAction,
}: { listing: FoodListing; onAction: (id: string, action: AdminActionType) => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[listing.status] ?? STATUS_META.pending;
  const hasExtra = Boolean(listing.description || listing.address || listing.phone || listing.website || (listing.images && listing.images.length > 0));

  return (
    <AdminCard
      title={listing.name}
      subtitle={listing.cuisine}
      badge={{ label: meta.label, color: meta.color }}
      accentColor={meta.color}
    >
      <View style={s.chipRow}>
        <View style={[s.chip, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={11} color={meta.color} />
          <Text style={[s.chipText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <View style={[s.chip, { backgroundColor: palette.gray100 }]}>
          <Text style={[s.chipText, { color: PRICE_COLOR[listing.price] ?? Colors.text.secondary, fontWeight: '900' }]}>{listing.price}</Text>
        </View>
        <View style={[s.chip, { backgroundColor: listing.openNow ? Colors.brand.greenLight : palette.gray100 }]}>
          <Ionicons name={listing.openNow ? 'checkmark-circle' : 'time'} size={11} color={listing.openNow ? Colors.brand.green : Colors.text.tertiary} />
          <Text style={[s.chipText, { color: listing.openNow ? Colors.brand.green : Colors.text.tertiary }]}>
            {listing.openNow ? 'Open' : 'Closed'}
          </Text>
        </View>
        {listing.verified && (
          <View style={[s.chip, { backgroundColor: Colors.brand.blueLight }]}>
            <Ionicons name="shield-checkmark" size={11} color={Colors.brand.blue} />
            <Text style={[s.chipText, { color: Colors.brand.blue }]}>Verified</Text>
          </View>
        )}
      </View>
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Ionicons name="star" size={12} color={palette.amber500} />
          <Text style={s.statText}>{listing.rating} ({listing.reviews})</Text>
        </View>
        <View style={s.statItem}>
          <Ionicons name="storefront" size={12} color={Colors.text.tertiary} />
          <Text style={s.statText}>{listing.services.join(' · ')}</Text>
        </View>
      </View>

      {hasExtra && (
        <Pressable style={s.expandBtn} onPress={() => setExpanded((p) => !p)}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.brand.blue} />
          <Text style={s.expandText}>{expanded ? 'Hide Details' : 'View Full Profile'}</Text>
        </Pressable>
      )}

      {expanded && (
        <View style={s.expandPanel}>
          {listing.images && listing.images.length > 0 && (
            <>
              <Text style={s.sectionLabel}>PHOTOS ({listing.images.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                {listing.images.map((img, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: resolveApiAssetUrl(img) }}
                    style={{ width: 120, height: 90, borderRadius: 10, backgroundColor: palette.gray100 }}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            </>
          )}

          {listing.description ? (
            <>
              <Text style={s.sectionLabel}>DESCRIPTION</Text>
              <View style={s.descBox}>
                <Text style={s.descText}>{listing.description}</Text>
              </View>
            </>
          ) : null}

          <Text style={[s.sectionLabel, { marginTop: 12 }]}>CONTACT & LOCATION</Text>
          <View style={s.detailsBlock}>
            {listing.address ? (
              <View style={s.detailRow}>
                <View style={s.detailIconBox}>
                  <Ionicons name="location-outline" size={13} color={Colors.brand.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailKey}>Address</Text>
                  <Text style={s.detailVal}>{listing.address}</Text>
                </View>
              </View>
            ) : null}
            {listing.phone ? (
              <Pressable style={s.detailRow} onPress={() => Linking.openURL(`tel:${listing.phone}`)}>
                <View style={s.detailIconBox}>
                  <Ionicons name="call-outline" size={13} color={Colors.brand.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailKey}>Phone</Text>
                  <Text style={s.detailVal}>{listing.phone}</Text>
                </View>
              </Pressable>
            ) : null}
            {listing.website ? (
              <Pressable style={s.detailRow} onPress={() => Linking.openURL(listing.website!)}>
                <View style={s.detailIconBox}>
                  <Ionicons name="globe-outline" size={13} color={Colors.brand.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailKey}>Website</Text>
                  <Text style={s.detailVal} numberOfLines={1}>{listing.website}</Text>
                </View>
              </Pressable>
            ) : null}
            {!listing.address && !listing.phone && !listing.website && (
              <View style={s.detailRow}>
                <Text style={s.detailVal}>No contact info on file.</Text>
              </View>
            )}
          </View>

          <Text style={[s.sectionLabel, { marginTop: 12 }]}>RATINGS & REVIEWS</Text>
          <View style={s.detailsBlock}>
            <View style={s.detailRow}>
              <View style={s.detailIconBox}>
                <Ionicons name="star-outline" size={13} color={Colors.brand.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.detailKey}>Average rating</Text>
                <Text style={s.detailVal}>{listing.rating} / 5 ({listing.reviews} review{listing.reviews !== 1 ? 's' : ''})</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {listing.status === 'pending' && (
        <ActionButtons actions={['approve', 'reject']} onAction={(a) => onAction(listing.id, a)} />
      )}
    </AdminCard>
  );
}

export default function FoodManagementScreen() {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');
  const {
    items: listings,
    meta,
    isLoading,
    isLoadingMore,
    refresh,
    loadMore,
  } = useAdminFoodListings();
  const { mutate: verify  }   = useVerifyFoodListingMutation();
  const { mutate: suspend }   = useSuspendFoodListingMutation();

  const filtered = listings.filter((l) => {
    const matchSearch = search === '' || l.name.toLowerCase().includes(search.toLowerCase()) || l.cuisine.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || l.status === filter;
    return matchSearch && matchFilter;
  });

  const handleAction = (id: string, action: AdminActionType) => {
    if (action === 'approve') verify(id, { onSuccess: () => refresh() });
    if (action === 'reject') suspend(id, { onSuccess: () => refresh() });
  };

  const pendingCount = listings.filter(l => l.status === 'pending').length;
  const openNowCount = listings.filter(l => l.openNow).length;

  return (
    <View style={s.root}>
      <AdminBackdrop />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && listings.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: palette.legacyBlueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[palette.legacyOrange, palette.orangeL44]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="restaurant" size={22} color={palette.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Food Management</Text>
            </View>
            {pendingCount > 0 && (
              <View style={s.alertPill}>
                <View style={[s.alertDot, { backgroundColor: palette.amber500 }]} />
                <Text style={[s.alertText, { color: palette.amber500 }]}>{pendingCount} pending</Text>
              </View>
            )}
          </View>

          {/* Summary */}
          <View style={s.summaryRow}>
            {[
              { label: 'Total',   value: listings.length,                                    color: palette.legacyOrange           },
              { label: 'Active',  value: listings.filter(l => l.status === 'active').length, color: Colors.brand.green  },
              { label: 'Pending', value: pendingCount,                                       color: palette.amber500           },
              { label: 'Open',    value: openNowCount,                                       color: Colors.brand.blue   },
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
            placeholder="Search restaurants..."
            filters={[
              { label: 'All',       value: 'all',       count: listings.length },
              { label: 'Active',    value: 'active'                            },
              { label: 'Pending',   value: 'pending',   count: pendingCount    },
              { label: 'Suspended', value: 'suspended'                         },
            ]}
            activeFilter={filter}
            onFilterChange={setFilter}
          />

          {isLoading ? (
            <View style={s.loadingCard}>
              <Ionicons name="hourglass-outline" size={24} color={Colors.text.tertiary} />
              <Text style={s.loadingText}>Loading restaurants...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="restaurant-outline" size={40} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No listings found</Text>
              <Text style={s.emptySub}>{(search !== '' || filter !== 'all') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            <>
              {filtered.map((listing) => (
                <FoodCard key={listing.id} listing={listing} onAction={handleAction} />
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
  alertDot:    { width: 6, height: 6, borderRadius: 3 },
  alertText:   { fontSize: 12, fontWeight: '700' },

  summaryRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: palette.white, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: palette.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryVal:  { fontSize: 20, fontWeight: '900' },
  summaryLbl:  { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  loadingCard: { backgroundColor: palette.white, borderRadius: 18, padding: 36, alignItems: 'center', gap: 10, shadowColor: palette.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  loadingText: { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },
  emptyCard:   { backgroundColor: palette.white, borderRadius: 18, padding: 44, alignItems: 'center', gap: 8, shadowColor: palette.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  emptySub:    { fontSize: 13, color: Colors.text.tertiary },

  chipRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText:    { fontSize: 11, fontWeight: '700' },
  statsRow:    { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 4 },
  statItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:    { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
  loadMoreBtn: { backgroundColor: palette.white, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' },
  loadMoreText:{ fontSize: 14, fontWeight: '700', color: Colors.brand.blue },

  expandBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.gray100, marginTop: 6, marginBottom: 4 },
  expandText:  { fontSize: 12, fontWeight: '700', color: Colors.brand.blue },
  expandPanel: { paddingTop: 4, marginBottom: 10 },
  sectionLabel:{ fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Colors.text.tertiary, marginBottom: 7 },
  descBox:     { backgroundColor: palette.slate50, borderRadius: 11, padding: 12, borderWidth: 1, borderColor: palette.neutralL93_3, marginBottom: 4 },
  descText:    { fontSize: 13, color: Colors.text.secondary, lineHeight: 19 },
  detailsBlock:{ backgroundColor: palette.slate50, borderRadius: 13, borderWidth: 1, borderColor: palette.neutralL93_3, overflow: 'hidden', marginBottom: 4 },
  detailRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.neutralL93_3 },
  detailIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  detailKey:   { fontSize: 10, fontWeight: '700', color: Colors.text.tertiary, marginBottom: 2, letterSpacing: 0.3 },
  detailVal:   { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
});
