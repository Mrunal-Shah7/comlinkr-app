// src/features/admin/pages/VerificationsScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  RefreshControl, Alert, TextInput, Modal, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useAdminBadgeApplications,
  useApproveBadgeMutation,
  useRejectBadgeMutation,
} from '../hooks/useAdmin';
import type { BadgeApplication } from '../../../api/badges.api';
import { adminGetBadgeDocumentUrl } from '../../../api/admin.api'; // SPRINT-41:
import { alertAdminApiError, handleAdminApiError } from '../api/handleAdminError'; // SPRINT-41:
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

const BADGE_META: Record<string, { label: string; icon: string; gradient: [string, string]; description: string; checklistItems: string[] }> = {
  LANDLORD: {
    label: 'Verified Landlord',
    icon: 'home',
    gradient: [Colors.brand.blue, '#0054CC'],
    description: 'Property owners who list housing on ComLinkr',
    checklistItems: [
      'Full legal name matches ID document',
      'Business phone number is valid',
      'Property address is complete and specific',
      'Ownership type declared (owns / manages)',
      'Government ID document uploaded & legible',
      'Proof of right to list uploaded & valid',
    ],
  },
  RESTAURANT_OWNER: {
    label: 'Verified Restaurant Owner',
    icon: 'restaurant',
    gradient: [Colors.brand.green, '#1a8a18'],
    description: 'Owners of restaurants listed on ComLinkr',
    checklistItems: [
      'Full legal name matches ID',
      'Restaurant name and address provided',
      'Business phone number is valid',
      'Cuisine type declared',
      'Business license / registration uploaded',
    ],
  },
  AGENCY: {
    label: 'Verified Agency',
    icon: 'business',
    gradient: ['#FF7B00', '#E56800'],
    description: 'Licensed real estate agencies',
    checklistItems: [
      'Agency name is a registered business',
      'Full legal name of contact person',
      'Business phone and email provided',
      'Agency license number valid',
      'Company registration doc uploaded',
      'Website domain matches business name',
    ],
  },
  LOCAL_REVIEWER: {
    label: 'Local Reviewer',
    icon: 'star',
    gradient: ['#8B5CF6', '#6D3FD1'],
    description: 'Trusted community members who review local spots',
    checklistItems: [
      'Full name verified against ID',
      'Neighborhood area is specific',
      'Reviewer bio is genuine and descriptive',
      'Government ID uploaded & legible',
    ],
  },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  GOVERNMENT_ID:    'Government ID',
  LEASE_AGREEMENT:  'Lease Agreement',
  PROPERTY_DEED:    'Property Deed',
  BUSINESS_LICENSE: 'Business License',
  HEALTH_PERMIT:    'Health Permit',
  AGENCY_LICENSE:   'Agency License',
  MLS_CERTIFICATE:  'MLS Certificate',
  TAX_DOCUMENT:     'Tax Document',
  UTILITY_BILL:     'Utility Bill',
  BANK_STATEMENT:   'Bank Statement',
};

function InfoRow({ icon, label, value, highlight }: {
  icon: string; label: string; value?: string | number | null; highlight?: boolean;
}) {
  if (!value && value !== 0) return null;
  return (
    <View style={[d.infoRow, highlight && d.infoRowHighlight]}>
      <View style={[d.infoIconWrap, highlight && d.infoIconWrapHighlight]}>
        <Ionicons name={icon as any} size={13} color={highlight ? '#FF7B00' : Colors.brand.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={d.infoLabel}>{label}</Text>
        <Text style={[d.infoValue, highlight && d.infoValueHighlight]}>{String(value)}</Text>
      </View>
    </View>
  );
}

function MissingRow({ label }: { label: string }) {
  return (
    <View style={d.missingRow}>
      <View style={d.missingIconWrap}>
        <Ionicons name="alert-circle" size={13} color="#F59E0B" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={d.missingLabel}>{label}</Text>
        <Text style={d.missingValue}>Not provided</Text>
      </View>
    </View>
  );
}

function RejectModal({
  visible, app, onClose, onSuccess,
}: { visible: boolean; app: BadgeApplication | null; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const { mutate: reject, isPending } = useRejectBadgeMutation();

  const QUICK_REASONS = [
    'Documents are unclear or illegible — please resubmit with higher-quality scans.',
    'Government ID appears expired. Please submit a current valid ID.',
    'Business license / proof of ownership is missing or invalid.',
    'The address provided does not match the documents submitted.',
    'Information provided appears inaccurate or inconsistent.',
    'Duplicate application — a similar application is already under review.',
  ];

  if (!app) return null;

  const handleReject = () => {
    if (!reason.trim()) { appAlert('Required', 'Please enter a rejection reason.'); return; } // SPRINT-41: notes required
    reject({ applicationId: app.id, reason: reason.trim() }, {
      onSuccess: () => {
        showToast('Application has been rejected.', "success");
        setReason('');
        onClose();
        onSuccess();
      },
      onError: (err) => alertAdminApiError(err, 'Reject failed'), // SPRINT-41:
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={m.overlay}>
          <ScrollView
            style={m.sheet}
            contentContainerStyle={{ paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={m.sheetHandle} />
            <View style={m.sheetHeader}>
              <LinearGradient colors={['#EF4444', '#DC2626']} style={m.sheetIconGrad}>
                <Ionicons name="close-circle" size={20} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={m.title}>Reject Application</Text>
                <Text style={m.sub} numberOfLines={1}>
                  {app.applicant?.fullName ?? app.fullLegalName} — {BADGE_META[app.badgeType]?.label ?? app.badgeType}
                </Text>
              </View>
            </View>

            <View style={m.warningBox}>
              <Ionicons name="warning" size={15} color="#D97706" />
              <Text style={m.warningText}>
                Rejection notes are required and saved with the application. Be specific and helpful.
              </Text>
            </View>

            <Text style={m.label}>QUICK REJECTION REASONS</Text>
            {QUICK_REASONS.map((r, i) => (
              <Pressable
                key={i}
                style={[m.reasonRow, reason === r && m.reasonRowActive]}
                onPress={() => setReason(r)}
              >
                <View style={[m.reasonRadio, reason === r && m.reasonRadioActive]}>
                  {reason === r && <View style={m.reasonRadioDot} />}
                </View>
                <Text style={[m.reasonText, reason === r && m.reasonTextActive]}>{r}</Text>
              </Pressable>
            ))}

            <Text style={[m.label, { marginTop: 16 }]}>REJECTION NOTES *</Text>
            <View style={m.inputWrap}>
              <TextInput
                style={m.input}
                value={reason}
                onChangeText={setReason}
                placeholder="Write a detailed reason..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
            </View>
            <Text style={m.charCount}>{reason.length}/1000</Text>

            <View style={m.actions}>
              <Pressable onPress={onClose} style={m.cancelBtn}>
                <Text style={m.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleReject}
                disabled={isPending || !reason.trim()}
                style={[m.rejectBtn, (isPending || !reason.trim()) && { opacity: 0.5 }]}
              >
                <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={m.rejectBtnGrad}>
                  <Ionicons name="close-circle" size={15} color="#FFF" />
                  <Text style={m.rejectText}>{isPending ? 'Rejecting...' : 'Reject Application'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ApplicationCard({
  app, onReject, onApproved,
}: {
  app: BadgeApplication;
  onReject: (app: BadgeApplication) => void;
  onApproved: () => void;
}) {
  const { mutate: approve, isPending } = useApproveBadgeMutation();
  const meta = BADGE_META[app.badgeType] ?? BADGE_META.LANDLORD;
  const [expanded, setExpanded] = useState(false);
  const [checkedItems, setCheckedItems] = useState<boolean[]>(new Array(meta.checklistItems.length).fill(false));
  const [openingDocId, setOpeningDocId] = useState<string | null>(null); // SPRINT-41:
  const [approveNotes, setApproveNotes] = useState(''); // SPRINT-41: optional

  const checkedCount = checkedItems.filter(Boolean).length;
  const displayName = app.applicant?.fullName ?? app.fullLegalName;
  const secondaryLine = app.applicant?.username ? `@${app.applicant.username}` : '';

  const toggleCheck = (i: number) => {
    setCheckedItems(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  // SPRINT-41: Open document — fetch signed URL on press, then Linking.openURL; no fileUrl / no prefetch
  const openDocument = async (documentId: string) => { // SPRINT-41:
    setOpeningDocId(documentId); // SPRINT-41:
    try { // SPRINT-41:
      const { url } = await adminGetBadgeDocumentUrl(app.id, documentId); // SPRINT-41:
      await Linking.openURL(url); // SPRINT-41:
    } catch (err) { // SPRINT-41:
      appAlert('Could not open document', handleAdminApiError(err)); // SPRINT-41:
    } finally { // SPRINT-41:
      setOpeningDocId(null); // SPRINT-41:
    } // SPRINT-41:
  }; // SPRINT-41:

  // SPRINT-41: Approve allowed without checklist — checklist is private scratch only
  const handleApprove = () => { // SPRINT-41:
    appAlert( // SPRINT-41:
      'Approve Badge', // SPRINT-41:
      `Grant ${meta.label} to ${displayName}?`, // SPRINT-41:
      [ // SPRINT-41:
        { text: 'Cancel', style: 'cancel' }, // SPRINT-41:
        { // SPRINT-41:
          text: 'Approve & Grant Badge', // SPRINT-41:
          onPress: () => approve( // SPRINT-41:
            { // SPRINT-41:
              applicationId: app.id, // SPRINT-41:
              adminNotes: approveNotes.trim() || undefined, // SPRINT-41:
            }, // SPRINT-41:
            { // SPRINT-41:
              onSuccess: () => { // SPRINT-41:
                showToast(`${meta.label} badge granted to ${displayName}.`, "success"); // SPRINT-41:
                onApproved(); // SPRINT-41:
              }, // SPRINT-41:
              onError: (err) => alertAdminApiError(err, 'Approve failed'), // SPRINT-41:
            }, // SPRINT-41:
          ), // SPRINT-41:
        }, // SPRINT-41:
      ], // SPRINT-41:
    ); // SPRINT-41:
  }; // SPRINT-41:

  const renderTypeSpecificForm = () => {
    switch (app.badgeType) {
      case 'LANDLORD':
        return (
          <>
            <Text style={c.formGroupLabel}>PROPERTY DETAILS</Text>
            <InfoRow icon="key" label="Ownership Type" value={app.ownershipType === 'OWN' ? 'Owns the property' : app.ownershipType ? 'Property manager / agent' : null} highlight={!!app.ownershipType} />
            {!app.ownershipType && <MissingRow label="Ownership Type" />}
            <InfoRow icon="location" label="Property Address" value={app.propertyAddress} />
            {!app.propertyAddress && <MissingRow label="Property Address" />}
          </>
        );
      case 'RESTAURANT_OWNER':
        return (
          <>
            <Text style={c.formGroupLabel}>RESTAURANT DETAILS</Text>
            <InfoRow icon="restaurant" label="Restaurant Name" value={app.restaurantName} />
            {!app.restaurantName && <MissingRow label="Restaurant Name" />}
            <InfoRow icon="flame" label="Cuisine Type" value={app.cuisineType} />
            {!app.cuisineType && <MissingRow label="Cuisine Type" />}
            <InfoRow icon="location" label="Restaurant Address" value={app.restaurantAddress} />
            {!app.restaurantAddress && <MissingRow label="Restaurant Address" />}
          </>
        );
      case 'AGENCY':
        return (
          <>
            <Text style={c.formGroupLabel}>AGENCY DETAILS</Text>
            <InfoRow icon="business" label="Agency Name" value={app.agencyName} />
            {!app.agencyName && <MissingRow label="Agency Name" />}
            <InfoRow icon="card" label="Agency License #" value={app.agencyLicense} />
            {!app.agencyLicense && <MissingRow label="Agency License Number" />}
            <InfoRow icon="home" label="Properties Managed" value={app.propertiesManaged != null ? `${app.propertiesManaged} properties` : null} />
            <InfoRow icon="globe" label="Company Website" value={app.companyWebsite} />
          </>
        );
      case 'LOCAL_REVIEWER':
        return (
          <>
            <Text style={c.formGroupLabel}>REVIEWER DETAILS</Text>
            <InfoRow icon="map" label="Neighborhood Focus" value={app.neighborhoodArea} />
            {!app.neighborhoodArea && <MissingRow label="Neighborhood Area" />}
            <InfoRow icon="person" label="Reviewer Bio" value={app.reviewerBio} />
            {!app.reviewerBio && <MissingRow label="Reviewer Bio" />}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={c.card}>
      <LinearGradient colors={meta.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={c.accentLine} />

      <View style={c.cardInner}>
        <View style={c.topRow}>
          <LinearGradient colors={meta.gradient} style={c.badgeIcon}>
            <Ionicons name={meta.icon as any} size={18} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={c.userName}>{displayName}</Text>
            {!!secondaryLine && <Text style={c.userSub}>{secondaryLine}</Text>}
            {!!app.applicant?.email && <Text style={c.userEmail}>{app.applicant.email}</Text>}
          </View>
          <View style={c.pendingChip}>
            <View style={c.pendingDot} />
            <Text style={c.pendingText}>Pending</Text>
          </View>
        </View>

        <View style={[c.badgeTypeBanner, { backgroundColor: `${meta.gradient[0]}12`, borderColor: `${meta.gradient[0]}25` }]}>
          <LinearGradient colors={meta.gradient} style={c.badgeTypeDot}>
            <Ionicons name={meta.icon as any} size={10} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[c.badgeTypeLabel, { color: meta.gradient[0] }]}>{meta.label}</Text>
            <Text style={c.badgeTypeDesc}>{meta.description}</Text>
          </View>
        </View>

        <View style={c.contactStrip}>
          {app.businessPhone && (
            <View style={c.contactChip}>
              <Ionicons name="call-outline" size={11} color={Colors.text.tertiary} />
              <Text style={c.contactText}>{app.businessPhone}</Text>
            </View>
          )}
          {(app.businessEmail || app.applicant?.email) && (
            <View style={c.contactChip}>
              <Ionicons name="mail-outline" size={11} color={Colors.text.tertiary} />
              <Text style={c.contactText} numberOfLines={1}>{app.businessEmail ?? app.applicant?.email}</Text>
            </View>
          )}
          <View style={c.contactChip}>
            <Ionicons name="calendar-outline" size={11} color={Colors.text.tertiary} />
            <Text style={c.contactText}>
              {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        </View>

        <Pressable style={c.expandBtn} onPress={() => setExpanded(p => !p)}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.brand.blue} />
          <Text style={c.expandBtnText}>{expanded ? 'Collapse Details' : 'View Full Application'}</Text>
        </Pressable>

        {expanded && (
          <View style={c.expandedPanel}>
            <View style={c.formSection}>
              <View style={c.formSectionHeader}>
                <LinearGradient colors={[Colors.brand.blue, '#0054CC']} style={c.formSectionIcon}>
                  <Ionicons name="person" size={11} color="#FFF" />
                </LinearGradient>
                <Text style={c.formSectionTitle}>Applicant Identity</Text>
              </View>
              <InfoRow icon="person" label="Full Legal Name" value={app.fullLegalName} />
              {!app.fullLegalName && <MissingRow label="Full Legal Name" />}
              <InfoRow icon="call" label="Business Phone" value={app.businessPhone} />
              {!app.businessPhone && <MissingRow label="Business Phone" />}
              <InfoRow icon="mail" label="Business Email" value={app.businessEmail} />
              {app.applicant && (
                <>
                  <InfoRow icon="at" label="Username" value={`@${app.applicant.username}`} />
                  <InfoRow icon="mail" label="Account Email" value={app.applicant.email} />
                </>
              )}
            </View>

            <View style={c.formSection}>
              <View style={c.formSectionHeader}>
                <LinearGradient colors={meta.gradient} style={c.formSectionIcon}>
                  <Ionicons name={meta.icon as any} size={11} color="#FFF" />
                </LinearGradient>
                <Text style={c.formSectionTitle}>{meta.label} Details</Text>
              </View>
              {renderTypeSpecificForm()}
            </View>

            <View style={c.formSection}>
              <View style={c.formSectionHeader}>
                <LinearGradient colors={['#8B5CF6', '#6D3FD1']} style={c.formSectionIcon}>
                  <Ionicons name="documents" size={11} color="#FFF" />
                </LinearGradient>
                <Text style={c.formSectionTitle}>
                  Submitted Documents ({app.documents?.length ?? 0})
                </Text>
              </View>
              {!app.documents || app.documents.length === 0 ? (
                <View style={c.noDocsBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
                  <Text style={c.noDocsText}>No documents uploaded</Text>
                </View>
              ) : (
                app.documents.map((doc, i) => (
                  <View key={doc.id ?? i} style={c.docRow}>
                    <View style={c.docIconWrap}>
                      <Ionicons name="document-text" size={14} color={Colors.brand.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={c.docName}>{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</Text>
                      {doc.createdAt && (
                        <Text style={c.docDate}>
                          Uploaded {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      )}
                    </View>
                    <Pressable // SPRINT-41:
                      style={c.viewDocBtn}
                      disabled={openingDocId === doc.id}
                      onPress={() => void openDocument(doc.id)} // SPRINT-41:
                    >
                      <Ionicons name="open-outline" size={13} color={Colors.brand.blue} />
                      <Text style={c.viewDocText}>{openingDocId === doc.id ? 'Opening...' : 'View Doc'}</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* SPRINT-41: Checklist labeled as private scratch — not saved, not shared; does not block approve */}
            <View style={c.formSection}>
              <View style={c.formSectionHeader}>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={c.formSectionIcon}>
                  <Ionicons name="clipboard" size={11} color="#FFF" />
                </LinearGradient>
                <Text style={c.formSectionTitle}>Private scratch notes — not saved, not shared</Text>
              </View>
              <View style={c.checklistInfo}>
                <Ionicons name="information-circle-outline" size={13} color={Colors.brand.blue} />
                <Text style={c.checklistInfoText}>
                  Optional personal aid only. These checks stay on this device and are never sent to the server. You can approve without checking every item.
                </Text>
              </View>
              {meta.checklistItems.map((item, i) => (
                <Pressable key={i} style={[c.checklistRow, checkedItems[i] && c.checklistRowChecked]} onPress={() => toggleCheck(i)}>
                  <View style={[c.checkBox, checkedItems[i] && c.checkBoxChecked]}>
                    {checkedItems[i] && <Ionicons name="checkmark" size={13} color="#FFF" />}
                  </View>
                  <Text style={[c.checklistText, checkedItems[i] && c.checklistTextChecked]}>{item}</Text>
                </Pressable>
              ))}
              <Text style={c.scratchHint}>{checkedCount}/{meta.checklistItems.length} marked locally</Text>
            </View>

            {/* SPRINT-41: Optional approve notes (persisted) */}
            <View style={c.formSection}>
              <Text style={c.formGroupLabel}>OPTIONAL APPROVE NOTES</Text>
              <View style={c.notesInputWrap}>
                <TextInput
                  style={c.notesInput}
                  value={approveNotes}
                  onChangeText={setApproveNotes}
                  placeholder="Optional notes saved with approval..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                  maxLength={1000}
                />
              </View>
            </View>
          </View>
        )}

        {/* SPRINT-41: Request More Information removed (local-only fake) */}
        <View style={c.actions}>
          <Pressable onPress={() => onReject(app)} style={c.rejectBtn}>
            <Ionicons name="close-circle" size={14} color="#EF4444" />
            <Text style={c.rejectBtnText}>Reject</Text>
          </Pressable>
          <Pressable
            onPress={handleApprove}
            disabled={isPending}
            style={c.approveBtn}
          >
            <LinearGradient
              colors={[Colors.brand.green, '#1a8a18']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={c.approveBtnGrad}
            >
              <Ionicons name="shield-checkmark" size={14} color="#FFF" />
              <Text style={c.approveBtnText}>{isPending ? 'Approving...' : 'Approve'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function VerificationsScreen() {
  const [filter, setFilter] = useState<'all' | 'landlord' | 'restaurant_owner' | 'agency' | 'local_reviewer'>('all');
  const [rejectTarget, setRejectTarget] = useState<BadgeApplication | null>(null);
  const { // SPRINT-41:
    items: applications, // SPRINT-41:
    meta, // SPRINT-41:
    isLoading, // SPRINT-41:
    isLoadingMore, // SPRINT-41:
    isError, // SPRINT-41:
    errorMessage, // SPRINT-41:
    refresh, // SPRINT-41:
    loadMore, // SPRINT-41:
  } = useAdminBadgeApplications(); // SPRINT-41:

  const filtered = filter === 'all' ? applications : applications.filter(a => a.badgeType === filter.toUpperCase());

  const counts = {
    all:              applications.length,
    landlord:         applications.filter(a => a.badgeType === 'LANDLORD').length,
    restaurant_owner: applications.filter(a => a.badgeType === 'RESTAURANT_OWNER').length,
    agency:           applications.filter(a => a.badgeType === 'AGENCY').length,
    local_reviewer:   applications.filter(a => a.badgeType === 'LOCAL_REVIEWER').length,
  };

  const FILTER_TABS = [
    { label: 'All Applications', value: 'all' as const, icon: 'apps', gradient: [Colors.brand.blue, Colors.brand.green] as [string, string] },
    { label: 'Landlord',   value: 'landlord' as const,         icon: 'home',       gradient: [Colors.brand.blue, '#0054CC'] as [string, string] },
    { label: 'Restaurant', value: 'restaurant_owner' as const, icon: 'restaurant', gradient: [Colors.brand.green, '#1a8a18'] as [string, string] },
    { label: 'Agency',     value: 'agency' as const,           icon: 'business',   gradient: ['#FF7B00', '#E56800'] as [string, string] },
    { label: 'Reviewer',   value: 'local_reviewer' as const,   icon: 'star',       gradient: ['#8B5CF6', '#6D3FD1'] as [string, string] },
  ];

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle} />

      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && applications.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable
              onPress={() => router.back()}
              style={s.backBtn}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={['#FF7B00', Colors.brand.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.headerIcon}>
              <Ionicons name="shield-checkmark" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title}>Badge Verifications</Text>
            </View>
            {(meta?.total ?? counts.all) > 0 && (
              <View style={s.queueBadge}>
                <View style={s.queueDot} />
                <Text style={s.queueText}>{meta?.total ?? counts.all} pending</Text>
              </View>
            )}
          </View>

          <View style={s.statsRow}>
            {[
              { label: 'Landlord',   count: counts.landlord,         color: Colors.brand.blue  },
              { label: 'Restaurant', count: counts.restaurant_owner, color: Colors.brand.green },
              { label: 'Agency',     count: counts.agency,           color: '#FF7B00'           },
              { label: 'Reviewer',   count: counts.local_reviewer,   color: '#8B5CF6'           },
            ].map(stat => (
              <View key={stat.label} style={s.statCard}>
                <Text style={[s.statNum, { color: stat.color }]}>{stat.count}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.securityNotice}>
            <LinearGradient colors={['#FFF7ED', '#FFF3E6']} style={s.securityNoticeBg}>
              <Ionicons name="shield-checkmark" size={16} color="#FF7B00" />
              <View style={{ flex: 1 }}>
                <Text style={s.securityNoticeTitle}>Review carefully</Text>
                <Text style={s.securityNoticeText}>
                  Open documents on demand before approving. The on-screen checklist is private scratch only — it is not saved or shared.
                </Text>
              </View>
            </LinearGradient>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
            {FILTER_TABS.map(f => {
              const isActive = filter === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFilter(f.value)}
                  style={[s.filterChip, isActive && s.filterChipActive]}
                >
                  {isActive ? (
                    <LinearGradient colors={f.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.filterChipGrad}>
                      <Ionicons name={f.icon as any} size={12} color="#FFF" />
                      <Text style={s.filterTextActive}>{f.label}</Text>
                      {counts[f.value] > 0 && (
                        <View style={s.filterCountActive}>
                          <Text style={s.filterCountActiveText}>{counts[f.value]}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <>
                      <Ionicons name={f.icon as any} size={12} color={Colors.text.tertiary} />
                      <Text style={s.filterText}>{f.label}</Text>
                      {counts[f.value] > 0 && (
                        <View style={s.filterCount}>
                          <Text style={s.filterCountText}>{counts[f.value]}</Text>
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {isError && errorMessage ? ( // SPRINT-41:
            <View style={s.emptyCard}>
              <Text style={{ color: '#EF4444', textAlign: 'center' }}>{errorMessage}</Text>
              <Pressable onPress={refresh} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.brand.blue, fontWeight: '700' }}>Retry</Text>
              </Pressable>
            </View>
          ) : isLoading && applications.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="hourglass-outline" size={36} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>Loading applications...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} style={s.emptyIcon}>
                <Ionicons name="shield-checkmark" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={s.emptyTitle}>All clear!</Text>
              <Text style={s.emptySub}>No pending badge applications in this category</Text>
            </View>
          ) : (
            <>
              {filtered.map(app => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onReject={setRejectTarget}
                  onApproved={refresh}
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

      <RejectModal
        visible={rejectTarget !== null}
        app={rejectTarget}
        onSuccess={refresh}
        onClose={() => setRejectTarget(null)}
      />
    </View>
  );
}

const s = createThemedStyles({
  root:         { flex: 1, backgroundColor: '#EBF5FF' },
  safe:         { flex: 1 },
  scroll:       { flex: 1 },
  content:      { padding: 20, paddingBottom: 48 },
  decorCircle:  { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,123,0,0.06)', top: -50, right: -60 },

  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  headerIcon:   { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:    { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  title:        { fontSize: 20, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.4 },
  queueBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF3E6', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,123,0,0.25)' },
  queueDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF7B00' },
  queueText:    { fontSize: 12, fontWeight: '700', color: '#FF7B00' },

  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard:     { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statNum:      { fontSize: 18, fontWeight: '900' },
  statLabel:    { fontSize: 9, fontWeight: '700', color: Colors.text.tertiary, marginTop: 2 },

  securityNotice:    { marginBottom: 14, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,123,0,0.2)' },
  securityNoticeBg:  { flexDirection: 'row', gap: 10, padding: 13, alignItems: 'flex-start' },
  securityNoticeTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  securityNoticeText:  { fontSize: 11, color: '#92400E', lineHeight: 16 },

  filterScroll: { marginBottom: 16 },
  filterContent:{ gap: 8, paddingRight: 4 },
  filterChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: Colors.border.light, overflow: 'hidden' },
  filterChipActive: { borderColor: 'transparent' },
  filterChipGrad:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9 },
  filterText:       { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, paddingHorizontal: 13, paddingVertical: 9 },
  filterTextActive: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  filterCount:      { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginRight: 9 },
  filterCountText:  { fontSize: 10, fontWeight: '800', color: Colors.text.secondary },
  filterCountActive:{ backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  filterCountActiveText: { fontSize: 10, fontWeight: '800', color: '#FFF' },

  emptyCard:    { backgroundColor: '#FFF', borderRadius: 20, padding: 44, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  emptyIcon:    { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  emptySub:     { fontSize: 13, color: Colors.text.tertiary, textAlign: 'center' },
  loadMoreBtn:  { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' }, // SPRINT-41:
  loadMoreText: { fontSize: 14, fontWeight: '700', color: Colors.brand.blue }, // SPRINT-41:
});

const c = createThemedStyles({
  card:         { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 16, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,118,235,0.06)', overflow: 'hidden', flexDirection: 'row' },
  accentLine:   { width: 4, flexShrink: 0 },
  cardInner:    { flex: 1, padding: 15 },

  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  badgeIcon:    { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userName:     { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  userSub:      { fontSize: 11, color: Colors.brand.blue, fontWeight: '600', marginTop: 1 },
  userEmail:    { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },
  pendingChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF3E6', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,123,0,0.2)' },
  pendingDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF7B00' },
  pendingText:  { fontSize: 11, fontWeight: '800', color: '#FF7B00' },

  badgeTypeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 11, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  badgeTypeDot:    { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  badgeTypeLabel:  { fontSize: 13, fontWeight: '800' },
  badgeTypeDesc:   { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },

  contactStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  contactChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: '#E8ECF0' },
  contactText:  { fontSize: 11, color: Colors.text.secondary, fontWeight: '500', maxWidth: 150 },

  expandBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginBottom: 4 },
  expandBtnText:  { fontSize: 12, fontWeight: '700', color: Colors.brand.blue, flex: 1 },

  expandedPanel:  { marginBottom: 10 },

  formSection:       { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  formSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  formSectionIcon:   { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  formSectionTitle:  { fontSize: 12, fontWeight: '800', color: Colors.text.primary, letterSpacing: 0.2, flex: 1 },
  formGroupLabel:    { fontSize: 10, fontWeight: '800', color: Colors.text.tertiary, letterSpacing: 0.8, marginBottom: 8, marginTop: 2 },

  noDocsBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3E6', borderRadius: 10, padding: 10 },
  noDocsText:   { fontSize: 12, color: '#D97706', fontWeight: '600' },

  docRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  docIconWrap:  { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docName:      { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  docDate:      { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },
  viewDocBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: Colors.brand.blueLight, borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' },
  viewDocText:  { fontSize: 11, fontWeight: '700', color: Colors.brand.blue },

  checklistInfo:     { flexDirection: 'row', gap: 7, alignItems: 'flex-start', backgroundColor: Colors.brand.blueLight, borderRadius: 9, padding: 9, marginBottom: 10 },
  checklistInfoText:  { flex: 1, fontSize: 11, color: Colors.brand.blue, lineHeight: 16 },
  checklistRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  checklistRowChecked:{ backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 6, borderBottomColor: 'transparent' },
  checklistText:      { flex: 1, fontSize: 13, color: Colors.text.secondary, lineHeight: 18 },
  checklistTextChecked:{ color: Colors.brand.green, fontWeight: '600' },
  checkBox:           { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: Colors.border.light, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  checkBoxChecked:    { backgroundColor: Colors.brand.green, borderColor: Colors.brand.green },
  scratchHint:        { fontSize: 11, color: Colors.text.tertiary, marginTop: 8, fontWeight: '600' }, // SPRINT-41:

  notesInputWrap: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8ECF0', paddingHorizontal: 10 }, // SPRINT-41:
  notesInput:     { fontSize: 13, color: Colors.text.primary, paddingVertical: 10, minHeight: 60, textAlignVertical: 'top' }, // SPRINT-41:

  actions:      { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  rejectBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 11, backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)' },
  rejectBtnText:{ fontSize: 12, fontWeight: '700', color: '#EF4444' },
  approveBtn:   { flex: 1, borderRadius: 11, overflow: 'hidden' },
  approveBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  approveBtnText:{ fontSize: 13, fontWeight: '800', color: '#FFF' },
});

const d = createThemedStyles({
  infoRow:          { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8, backgroundColor: '#FFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  infoRowHighlight: { backgroundColor: '#FFF7ED', borderColor: 'rgba(255,123,0,0.2)' },
  infoIconWrap:     { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  infoIconWrapHighlight: { backgroundColor: '#FFF3E6' },
  infoLabel:        { fontSize: 10, fontWeight: '700', color: Colors.text.tertiary, marginBottom: 2 },
  infoValue:        { fontSize: 13, fontWeight: '600', color: Colors.text.primary, lineHeight: 18 },
  infoValueHighlight: { color: '#92400E' },
  missingRow:       { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  missingIconWrap:  { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  missingLabel:     { fontSize: 10, fontWeight: '700', color: '#D97706', marginBottom: 2 },
  missingValue:     { fontSize: 12, fontWeight: '500', color: '#D97706' },
});

const m = createThemedStyles({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, maxHeight: '92%' },
  sheetHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },
  sheetHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetIconGrad: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 17, fontWeight: '900', color: Colors.text.primary },
  sub:           { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },

  warningBox:    { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 11, padding: 11, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', alignItems: 'flex-start' },
  warningText:   { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },

  label:         { fontSize: 10, fontWeight: '800', color: Colors.text.tertiary, letterSpacing: 1, marginBottom: 8 },

  reasonRow:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  reasonRowActive:{ backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 8, borderBottomWidth: 0, marginHorizontal: -8 },
  reasonRadio:   { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border.light, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  reasonRadioActive: { borderColor: Colors.brand.blue },
  reasonRadioDot:{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand.blue },
  reasonText:    { flex: 1, fontSize: 12, color: Colors.text.secondary, lineHeight: 17 },
  reasonTextActive:{ color: Colors.brand.blue, fontWeight: '600' },

  inputWrap:     { backgroundColor: Colors.bg.secondary, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border.light, paddingHorizontal: 14, marginBottom: 4 },
  input:         { fontSize: 14, color: Colors.text.primary, paddingVertical: 12, minHeight: 100, textAlignVertical: 'top' },
  charCount:     { fontSize: 11, color: Colors.text.tertiary, textAlign: 'right', marginBottom: 16 },

  actions:       { flexDirection: 'row', gap: 10 },
  cancelBtn:     { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText:    { fontSize: 14, fontWeight: '700', color: Colors.text.secondary },
  rejectBtn:     { flex: 2, borderRadius: 13, overflow: 'hidden' },
  rejectBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14 },
  rejectText:    { fontSize: 14, fontWeight: '800', color: '#FFF' },
});
