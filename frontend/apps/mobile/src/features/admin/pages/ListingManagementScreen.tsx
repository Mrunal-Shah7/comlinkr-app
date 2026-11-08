// src/features/admin/pages/ListingManagementScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Pressable, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useAdminListings,
  useApproveListingMutation,
  useModerateListingMutation,
} from '../hooks/useAdmin';
import { router } from 'expo-router';
import { FilterBar } from '../components/FilterBar';
import { Listing } from '@shared/types/api';
import { alertAdminApiError } from '../api/handleAdminError'; // SPRINT-41:
import { Colors } from '@theme/colors';
import { resolveApiAssetUrl } from '../../../api/feed.api';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

type AdminListing = Listing & { propertyType?: string; backendStatus?: string }; // SPRINT-41:

// SPRINT-41: active = AVAILABLE; inactive = RENTED / UNLISTED
const STATUS_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  active:   { color: Colors.brand.green,   bg: Colors.brand.greenLight, icon: 'checkmark-circle', label: 'Active'   }, // SPRINT-41:
  inactive: { color: Colors.text.tertiary, bg: '#F3F4F6',               icon: 'eye-off',          label: 'Inactive' }, // SPRINT-41:
};

const PROPERTY_TYPES = [ // SPRINT-41:
  { key: 'APARTMENT', label: 'Apartment', icon: 'business' }, // SPRINT-41:
  { key: 'HOUSE', label: 'House', icon: 'home' }, // SPRINT-41:
  { key: 'STUDIO', label: 'Studio', icon: 'square' }, // SPRINT-41:
  { key: 'ROOM', label: 'Room', icon: 'bed' }, // SPRINT-41:
]; // SPRINT-41:

function ListingCard({
  listing, onRefreshed,
}: { listing: AdminListing; onRefreshed: () => void }) { // SPRINT-41:
  const [expanded, setExpanded] = useState(false);
  const { mutate: approve, isPending: isApproving } = useApproveListingMutation();
  const { mutate: moderate } = useModerateListingMutation();
  const meta = STATUS_META[listing.status] ?? STATUS_META.inactive;
  const backend = listing.backendStatus; // SPRINT-41:

  const handleApprove = () => {
    appAlert('Approve Listing?', `Set "${listing.title}" to AVAILABLE (publicly visible)?`, [ // SPRINT-41:
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => approve(listing.id, {
          onSuccess: () => { showToast('Listing is now AVAILABLE.', "success"); onRefreshed(); }, // SPRINT-41:
          onError: (err) => alertAdminApiError(err, 'Approve failed'), // SPRINT-41:
        }),
      },
    ]);
  };

  // SPRINT-41: Unlist — reject and hide both set UNLISTED; do not claim distinct outcomes
  const handleUnlist = () => { // SPRINT-41:
    appAlert( // SPRINT-41:
      'Unlist Listing?', // SPRINT-41:
      'This hides the listing from public view (sets status to UNLISTED). Reject and hide have the same outcome.', // SPRINT-41:
      [ // SPRINT-41:
        { text: 'Cancel', style: 'cancel' }, // SPRINT-41:
        { // SPRINT-41:
          text: 'Unlist', // SPRINT-41:
          style: 'destructive', // SPRINT-41:
          onPress: () => moderate({ listingId: listing.id, action: 'hide' }, { // SPRINT-41:
            onSuccess: () => { showToast('Listing is now UNLISTED (hidden from public).', "success"); onRefreshed(); }, // SPRINT-41:
            onError: (err) => alertAdminApiError(err, 'Unlist failed'), // SPRINT-41:
          }), // SPRINT-41:
        }, // SPRINT-41:
      ], // SPRINT-41:
    ); // SPRINT-41:
  }; // SPRINT-41:

  const handleDelete = () => {
    appAlert('Delete Listing?', 'Permanently delete this listing? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => moderate({ listingId: listing.id, action: 'delete' }, {
          onSuccess: () => { showToast('Listing has been permanently removed.', "success"); onRefreshed(); },
          onError: (err) => alertAdminApiError(err, 'Delete failed'), // SPRINT-41:
        }),
      },
    ]);
  };

  const submittedDate = listing.createdAt
    ? new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <View style={lc.card}>
      <View style={[lc.accentLine, { backgroundColor: Colors.brand.blue }]} />
      <View style={lc.inner}>

        <View style={lc.topRow}>
          <View style={[lc.catIcon, { backgroundColor: `${Colors.brand.blue}14` }]}>
            <Ionicons name="home" size={16} color={Colors.brand.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={lc.title} numberOfLines={2}>{listing.title}</Text>
            <Text style={lc.sub} numberOfLines={1}>
              {listing.location?.city ?? 'No city'}{listing.location?.country ? `, ${listing.location.country}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[lc.statusChip, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon as any} size={11} color={meta.color} />
              <Text style={[lc.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {backend ? ( // SPRINT-41:
              <Text style={lc.backendStatus}>{backend}</Text>
            ) : null}
          </View>
        </View>

        <View style={lc.chipsRow}>
          {listing.price != null && (
            <View style={lc.chip}>
              <Ionicons name="pricetag" size={11} color={Colors.text.secondary} />
              <Text style={lc.chipText}>${listing.price}{listing.currency ? ` ${listing.currency}` : ''}</Text>
            </View>
          )}
          <View style={lc.chip}>
            <Ionicons name="eye" size={11} color={Colors.text.secondary} />
            <Text style={lc.chipText}>{listing.viewCount ?? 0} views</Text>
          </View>
          <View style={lc.chip}>
            <Ionicons name="heart" size={11} color={Colors.text.secondary} />
            <Text style={lc.chipText}>{listing.favoriteCount ?? 0} saves</Text>
          </View>
          {listing.propertyType && (
            <View style={lc.chip}>
              <Ionicons name="business-outline" size={11} color={Colors.text.secondary} />
              <Text style={lc.chipText}>{listing.propertyType}</Text>
            </View>
          )}
        </View>

        {listing.author && (
          <View style={lc.ownerRow}>
            <View style={lc.ownerAvatar}>
              <Text style={lc.ownerAvatarText}>
                {listing.author.firstName?.[0] ?? ''}{listing.author.lastName?.[0] ?? ''}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={lc.ownerName}>{listing.author.firstName} {listing.author.lastName}</Text>
              <Text style={lc.ownerEmail}>@{listing.author.username}</Text>
            </View>
          </View>
        )}

        <Pressable style={lc.expandBtn} onPress={() => setExpanded((p) => !p)}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.brand.blue} />
          <Text style={lc.expandText}>{expanded ? 'Hide Details' : 'View Full Listing'}</Text>
        </Pressable>

        {expanded && (
          <View style={lc.expandPanel}>
            {listing.images && listing.images.length > 0 ? (
              <>
                <Text style={lc.sectionLabel}>PHOTOS ({listing.images.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                  {listing.images.map((img, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: resolveApiAssetUrl(img) }}
                      style={{ width: 120, height: 90, borderRadius: 10, backgroundColor: '#F3F4F6' }}
                      contentFit="cover"
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {listing.description ? (
              <>
                <Text style={lc.sectionLabel}>DESCRIPTION</Text>
                <View style={lc.descBox}>
                  <Text style={lc.descText}>{listing.description}</Text>
                </View>
              </>
            ) : null}

            <Text style={[lc.sectionLabel, { marginTop: 12 }]}>LISTING DETAILS</Text>
            <View style={lc.detailsBlock}>
              {listing.location?.address ? (
                <View style={lc.detailRow}>
                  <View style={lc.detailIconBox}>
                    <Ionicons name="location-outline" size={13} color={Colors.brand.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={lc.detailKey}>Address</Text>
                    <Text style={lc.detailVal}>{listing.location.address}</Text>
                  </View>
                </View>
              ) : null}
              {listing.location?.city ? (
                <View style={lc.detailRow}>
                  <View style={lc.detailIconBox}>
                    <Ionicons name="map-outline" size={13} color={Colors.brand.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={lc.detailKey}>City / State</Text>
                    <Text style={lc.detailVal}>
                      {listing.location.city}{listing.location.state ? `, ${listing.location.state}` : ''}{listing.location.country ? `, ${listing.location.country}` : ''}
                    </Text>
                  </View>
                </View>
              ) : null}
              {listing.propertyType ? (
                <View style={lc.detailRow}>
                  <View style={lc.detailIconBox}>
                    <Ionicons name="business-outline" size={13} color={Colors.brand.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={lc.detailKey}>Property Type</Text>
                    <Text style={lc.detailVal}>{listing.propertyType}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <Text style={[lc.sectionLabel, { marginTop: 12 }]}>SUBMISSION DATE</Text>
            <View style={lc.submittedRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.text.tertiary} />
              <Text style={lc.submittedText}>{submittedDate}</Text>
            </View>
          </View>
        )}

        {/* SPRINT-41: Approve / Unlist / Delete — no RejectModal with fake reasons */}
        <View style={lc.actions}>
          {listing.status === 'active' ? ( // SPRINT-41:
            <>
              <Pressable style={lc.unlistBtn} onPress={handleUnlist}>
                <Ionicons name="eye-off" size={14} color="#F59E0B" />
                <Text style={lc.unlistBtnText}>Unlist</Text>
              </Pressable>
              <Pressable style={lc.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash" size={14} color="#EF4444" />
                <Text style={lc.deleteBtnText}>Delete</Text>
              </Pressable>
            </>
          ) : ( // SPRINT-41:
            <>
              <Pressable style={lc.unlistBtn} onPress={handleUnlist}>
                <Ionicons name="eye-off" size={14} color="#F59E0B" />
                <Text style={lc.unlistBtnText}>Unlist</Text>
              </Pressable>
              <Pressable style={lc.actionBtnWrap} disabled={isApproving} onPress={handleApprove}>
                <LinearGradient colors={[Colors.brand.green, '#1a8a18']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={lc.actionBtnGrad}>
                  <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                  <Text style={lc.actionBtnText}>{isApproving ? 'Approving...' : 'Approve'}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={lc.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash" size={14} color="#EF4444" />
                <Text style={lc.deleteBtnText}>Delete</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ListingManagementScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'AVAILABLE' | 'RENTED' | 'UNLISTED'>('all'); // SPRINT-41:
  const [propertyFilter, setPropertyFilter] = useState('all'); // SPRINT-41:

  const { // SPRINT-41:
    items: listings, // SPRINT-41:
    meta, // SPRINT-41:
    isLoading, // SPRINT-41:
    isLoadingMore, // SPRINT-41:
    isError, // SPRINT-41:
    errorMessage, // SPRINT-41:
    refresh, // SPRINT-41:
    loadMore, // SPRINT-41:
    setParams, // SPRINT-41:
  } = useAdminListings(); // SPRINT-41:

  useEffect(() => { // SPRINT-41:
    const t = setTimeout(() => { // SPRINT-41:
      setParams({ // SPRINT-41:
        search: search.trim() || undefined, // SPRINT-41:
        status: statusFilter === 'all' ? undefined : statusFilter, // SPRINT-41:
        propertyType: propertyFilter === 'all' ? undefined : propertyFilter, // SPRINT-41:
      }); // SPRINT-41:
    }, 300); // SPRINT-41:
    return () => clearTimeout(t); // SPRINT-41:
  }, [search, statusFilter, propertyFilter, setParams]); // SPRINT-41:

  const totalLabel = meta?.total ?? listings.length; // SPRINT-41:

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
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="list" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Listing Management</Text>
            </View>
            <View style={s.countPill}>
              <Text style={s.countText}>{totalLabel}</Text>
            </View>
          </View>

          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Search title or address..."
            filters={[
              { label: 'All', value: 'all' }, // SPRINT-41:
              { label: 'Available', value: 'AVAILABLE' }, // SPRINT-41:
              { label: 'Rented', value: 'RENTED' }, // SPRINT-41:
              { label: 'Unlisted', value: 'UNLISTED' }, // SPRINT-41:
            ]}
            activeFilter={statusFilter}
            onFilterChange={(v) => setStatusFilter(v as typeof statusFilter)}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catContent}>
            <Pressable
              style={[s.catChip, propertyFilter === 'all' && s.catChipActive]}
              onPress={() => setPropertyFilter('all')}
            >
              <Ionicons name="apps" size={13} color={propertyFilter === 'all' ? Colors.brand.blue : Colors.text.tertiary} />
              <Text style={[s.catChipText, propertyFilter === 'all' && s.catChipTextActive]}>All Types</Text>
            </Pressable>
            {PROPERTY_TYPES.map((pt) => (
              <Pressable
                key={pt.key}
                style={[s.catChip, propertyFilter === pt.key && s.catChipActive]}
                onPress={() => setPropertyFilter(propertyFilter === pt.key ? 'all' : pt.key)}
              >
                <Ionicons name={pt.icon as any} size={13} color={propertyFilter === pt.key ? Colors.brand.blue : Colors.text.tertiary} />
                <Text style={[s.catChipText, propertyFilter === pt.key && s.catChipTextActive]}>{pt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {isError && errorMessage ? ( // SPRINT-41:
            <View style={s.emptyCard}>
              <Text style={{ color: '#EF4444', textAlign: 'center' }}>{errorMessage}</Text>
              <Pressable onPress={refresh} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.brand.blue, fontWeight: '700' }}>Retry</Text>
              </Pressable>
            </View>
          ) : isLoading && listings.length === 0 ? (
            <View style={s.loadingCard}><Text style={s.loadingText}>Loading listings...</Text></View>
          ) : listings.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="list-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No listings found</Text>
              <Text style={s.emptySub}>{(search !== '' || statusFilter !== 'all') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            <>
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onRefreshed={refresh}
                />
              ))}
              {meta && meta.page < meta.totalPages && ( // SPRINT-41:
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
  root:         { flex: 1, backgroundColor: '#EBF5FF' },
  safe:         { flex: 1 },
  scroll:       { flex: 1 },
  content:      { padding: 18, paddingBottom: 48 },

  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  headerIcon:   { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:    { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:        { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },
  countPill:    { backgroundColor: Colors.brand.blueLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  countText:    { fontSize: 14, fontWeight: '900', color: Colors.brand.blue },

  catScroll:         { marginBottom: 14 },
  catContent:        { gap: 7, paddingRight: 4 },
  catChip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: Colors.border.light },
  catChipActive:     { backgroundColor: Colors.brand.blueLight, borderColor: Colors.brand.blue },
  catChipText:       { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  catChipTextActive: { color: Colors.brand.blue },

  loadingCard:  { backgroundColor: '#FFF', borderRadius: 18, padding: 32, alignItems: 'center' },
  loadingText:  { color: Colors.text.tertiary, fontSize: 14 },
  emptyCard:    { backgroundColor: '#FFF', borderRadius: 18, padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle:   { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 6 },
  emptySub:     { fontSize: 13, color: Colors.text.tertiary },
  loadMoreBtn:  { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' }, // SPRINT-41:
  loadMoreText: { fontSize: 14, fontWeight: '700', color: Colors.brand.blue }, // SPRINT-41:
});

const lc = createThemedStyles({
  card:            { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 12, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)', overflow: 'hidden', flexDirection: 'row' },
  accentLine:      { width: 4, flexShrink: 0 },
  inner:           { flex: 1, padding: 14 },

  topRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  catIcon:         { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:           { fontSize: 14, fontWeight: '800', color: Colors.text.primary, lineHeight: 19 },
  sub:             { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },
  statusChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  statusText:      { fontSize: 10, fontWeight: '800' },
  backendStatus:   { fontSize: 9, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.5 }, // SPRINT-41:

  chipsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3F4F6' },
  chipText:        { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },

  ownerRow:        { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10, backgroundColor: '#F8FAFC', borderRadius: 11, padding: 9, borderWidth: 1, borderColor: '#E8ECF0' },
  ownerAvatar:     { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ownerAvatarText: { fontSize: 11, fontWeight: '900', color: Colors.brand.blue },
  ownerName:       { fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  ownerEmail:      { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },

  expandBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginBottom: 4 },
  expandText:      { fontSize: 12, fontWeight: '700', color: Colors.brand.blue },

  expandPanel:     { paddingTop: 8, marginBottom: 10 },
  sectionLabel:    { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Colors.text.tertiary, marginBottom: 7 },

  descBox:         { backgroundColor: '#F8FAFC', borderRadius: 11, padding: 12, borderWidth: 1, borderColor: '#E8ECF0', marginBottom: 4 },
  descText:        { fontSize: 13, color: Colors.text.secondary, lineHeight: 19 },

  detailsBlock:    { backgroundColor: '#F8FAFC', borderRadius: 13, borderWidth: 1, borderColor: '#E8ECF0', overflow: 'hidden', marginBottom: 4 },
  detailRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  detailIconBox:   { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  detailKey:       { fontSize: 10, fontWeight: '700', color: Colors.text.tertiary, marginBottom: 2, letterSpacing: 0.3 },
  detailVal:       { fontSize: 13, fontWeight: '600', color: Colors.text.primary },

  submittedRow:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  submittedText:   { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },

  actions:         { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  actionBtnWrap:   { flex: 1, borderRadius: 11, overflow: 'hidden', minWidth: 100 },
  actionBtnGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  actionBtnText:   { fontSize: 13, fontWeight: '800', color: '#FFF' },
  unlistBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: '#FFF3E6', borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.2)' }, // SPRINT-41:
  unlistBtnText:   { fontSize: 12, fontWeight: '700', color: '#F59E0B' }, // SPRINT-41:
  deleteBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.2)' },
  deleteBtnText:   { fontSize: 12, fontWeight: '700', color: '#EF4444' },
});
