// src/features/admin/pages/UserManagementScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Modal,
  TextInput, Pressable, Alert, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAdminUsers, useAdminUserAction, useAdminUserDetail } from '../hooks/useAdmin'; // SPRINT-41:
import type { AdminUserActionVars } from '../hooks/useAdmin';
import { FilterBar } from '../components/FilterBar';
import { ActionButtons } from '../components/ActionButtons';
import { AdminAction, UserProfile } from '@shared/types/api';
import { AdminActionType } from '../types';
import type { AdminApiRole, AdminUser } from '../../../api/admin.api'; // SPRINT-41:
import { alertAdminApiError } from '../api/handleAdminError'; // SPRINT-41:
import { FadeImage } from '../../../../components/FadeImage'; // SPRINT-41:
import { Colors } from '@theme/colors';
import { appAlert } from '../../../shared/ui/Dialogs';
import { createThemedStyles } from '../../../theme/themedStyles';
import { AdminBackdrop } from '../components/AdminBackdrop';
import { showToast } from '../../../shared/ui/Toast';

const GRANT_BADGE_OPTIONS: { value: string; label: string; icon: string; color: string }[] = [
  { value: 'LANDLORD',         label: 'Verified Landlord',         icon: 'home',       color: Colors.brand.blue  },
  { value: 'RESTAURANT_OWNER', label: 'Verified Restaurant Owner', icon: 'restaurant', color: Colors.brand.green },
  { value: 'AGENCY',           label: 'Verified Agency',           icon: 'business',   color: '#FF7B00'          },
  { value: 'LOCAL_REVIEWER',   label: 'Local Reviewer',            icon: 'star',       color: '#8B5CF6'          },
];

const BADGE_META: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  LANDLORD:         { color: Colors.brand.blue,  bg: Colors.brand.blueLight,  label: 'Landlord',          icon: 'home'       },
  RESTAURANT_OWNER: { color: Colors.brand.green, bg: Colors.brand.greenLight, label: 'Restaurant Owner',  icon: 'restaurant' },
  AGENCY:           { color: '#FF7B00',           bg: '#FFF3E6',               label: 'Agency',            icon: 'business'   },
  LOCAL_REVIEWER:   { color: '#8B5CF6',           bg: '#F3F0FF',               label: 'Local Reviewer',    icon: 'star'       },
};

const ROLE_META: Record<string, { color: string; bg: string; icon: string }> = {
  USER:  { color: Colors.text.secondary, bg: '#F3F4F6',              icon: 'person' },
  ADMIN: { color: Colors.brand.blue,     bg: Colors.brand.blueLight, icon: 'shield' },
};

type ListUser = UserProfile & { badges?: string[] }; // SPRINT-41:

function initialsFrom(first?: string, last?: string, username?: string): string { // SPRINT-41:
  const a = first?.[0] ?? username?.[0] ?? ''; // SPRINT-41:
  const b = last?.[0] ?? ''; // SPRINT-41:
  return `${a}${b}`.toUpperCase() || '?'; // SPRINT-41:
} // SPRINT-41:

function badgesFromDetail(detail: AdminUser | null): string[] { // SPRINT-41:
  if (!detail) return []; // SPRINT-41:
  if (detail.badges?.length) return detail.badges; // SPRINT-41:
  if (detail.userBadges?.length) return detail.userBadges.map((b) => b.badgeType); // SPRINT-41:
  return []; // SPRINT-41:
} // SPRINT-41:

function UserProfileModal({
  userId, listUser, visible, onClose, onAction, onRevokeBadge, onChangeRole, onRequestDelete,
}: {
  userId: string | null; // SPRINT-41:
  listUser: ListUser | null; // SPRINT-41:
  visible: boolean;
  onClose: () => void;
  onAction: (userId: string, action: AdminActionType) => void;
  onRevokeBadge: (userId: string, badgeType: string) => void; // SPRINT-41:
  onChangeRole: (userId: string, role: AdminApiRole) => void; // SPRINT-41:
  onRequestDelete: (user: ListUser) => void; // SPRINT-41:
}) {
  const { data: detail, isLoading, errorMessage, refetch } = useAdminUserDetail(visible ? userId : null); // SPRINT-41:

  if (!listUser || !userId) return null;

  const displayName = detail?.fullName || detail?.name || `${listUser.firstName} ${listUser.lastName}`.trim() || listUser.username; // SPRINT-41:
  const nameParts = displayName.trim().split(/\s+/); // SPRINT-41:
  const firstName = nameParts[0] ?? listUser.firstName; // SPRINT-41:
  const lastName = nameParts.slice(1).join(' ') || listUser.lastName; // SPRINT-41:
  const roleRaw = String(detail?.role ?? listUser.role).toUpperCase(); // SPRINT-41:
  const role = roleRaw === 'ADMIN' ? 'ADMIN' : 'USER'; // SPRINT-41:
  const roleMeta = ROLE_META[role] ?? ROLE_META.USER;
  const isActive = typeof detail?.isActive === 'boolean' ? detail.isActive : listUser.isActive; // SPRINT-41:
  const email = detail?.email ?? listUser.email; // SPRINT-41:
  const username = detail?.username ?? listUser.username; // SPRINT-41:
  const avatarUrl = detail?.avatarUrl ?? listUser.avatar ?? null; // SPRINT-41:
  const badges = badgesFromDetail(detail); // SPRINT-41:
  const counts = detail?.counts; // SPRINT-41:
  const city = detail?.city ?? detail?.location?.city ?? listUser.city; // SPRINT-41:
  const country = detail?.country ?? detail?.location?.country ?? listUser.country; // SPRINT-41:

  const joinDate = (detail?.createdAt ?? listUser.createdAt)
    ? new Date(detail?.createdAt ?? listUser.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  const handleRevokeBadge = () => {
    if (badges.length === 0) {
      appAlert('No Badges', 'This user has no badges to revoke.');
      return;
    }
    appAlert(
      'Revoke Badge',
      'Select badge to revoke:',
      [
        ...badges.map((b: string) => ({
          text: BADGE_META[b]?.label ?? b,
          onPress: () => {
            appAlert(
              'Confirm Revoke',
              `Remove the ${BADGE_META[b]?.label ?? b} badge from ${firstName}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Revoke',
                  style: 'destructive',
                  onPress: () => onRevokeBadge(userId, b), // SPRINT-41:
                },
              ],
            );
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <ScrollView keyboardShouldPersistTaps="handled" style={pm.sheet} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={pm.handle} />

          <LinearGradient colors={['#EBF5FF', '#F4F9FF']} style={pm.headerBg}>
            <View style={pm.avatarWrap}>
              {avatarUrl ? ( // SPRINT-41:
                <FadeImage uri={avatarUrl} style={pm.avatarImg} resizeMode="cover" /> // SPRINT-41:
              ) : ( // SPRINT-41:
                <LinearGradient colors={[Colors.brand.blue, Colors.brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pm.avatar}>
                  <Text style={pm.avatarText}>{initialsFrom(firstName, lastName, username)}</Text>
                </LinearGradient>
              )}
              <View style={[pm.roleBadge, { backgroundColor: roleMeta.bg }]}>
                <Ionicons name={roleMeta.icon as any} size={11} color={roleMeta.color} />
                <Text style={[pm.roleBadgeText, { color: roleMeta.color }]}>{role}</Text>
              </View>
            </View>
            <Text style={pm.userName}>{displayName}</Text>
            <Text style={pm.userHandle}>@{username}</Text>
            <Text style={pm.userEmail}>{email}</Text>
            <Pressable style={pm.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.text.secondary} />
            </Pressable>
          </LinearGradient>

          {/* SPRINT-41: Real counts from detail only — no fabricated reportCount / lastActiveAt */}
          {isLoading ? ( // SPRINT-41:
            <View style={pm.statsRow}>
              <ActivityIndicator color={Colors.brand.blue} style={{ paddingVertical: 20 }} />
            </View>
          ) : errorMessage ? ( // SPRINT-41:
            <View style={pm.statsRow}>
              <Pressable onPress={() => void refetch()} style={{ padding: 16, flex: 1 }}>
                <Text style={{ color: '#EF4444', textAlign: 'center', fontSize: 13 }}>{errorMessage}</Text>
                <Text style={{ color: Colors.brand.blue, textAlign: 'center', marginTop: 6, fontWeight: '700' }}>Tap to retry</Text>
              </Pressable>
            </View>
          ) : ( // SPRINT-41:
            <View style={pm.statsRow}>
              {[
                { label: 'Posts', value: counts?.feedPosts ?? 0, color: Colors.brand.blue }, // SPRINT-41:
                { label: 'Listings', value: counts?.housingListings ?? 0, color: '#F59E0B' }, // SPRINT-41:
                { label: 'Events', value: counts?.events ?? 0, color: Colors.brand.green }, // SPRINT-41:
              ].map((stat) => (
                <View key={stat.label} style={pm.statCard}>
                  <Text style={[pm.statVal, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={pm.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}

          {counts && ( // SPRINT-41:
            <View style={[pm.statsRow, { backgroundColor: '#FFF' }]}>
              <View style={pm.statCard}>
                <Text style={[pm.statVal, { color: '#8B5CF6', fontSize: 18 }]}>{counts.restaurants}</Text>
                <Text style={pm.statLbl}>Restaurants</Text>
              </View>
              <View style={pm.statCard}>
                <Text style={[pm.statVal, { color: '#FF7B00', fontSize: 18 }]}>{counts.conversations}</Text>
                <Text style={pm.statLbl}>Chats</Text>
              </View>
            </View>
          )}

          <View style={pm.content}>
            <Text style={pm.sectionLabel}>ACCOUNT INFORMATION</Text>
            <View style={pm.infoCard}>
              <View style={pm.infoRow}>
                <View style={[pm.infoIcon, { backgroundColor: Colors.brand.blueLight }]}>
                  <Ionicons name="calendar" size={14} color={Colors.brand.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pm.infoKey}>Joined</Text>
                  <Text style={pm.infoVal}>{joinDate}</Text>
                </View>
              </View>
              <View style={pm.divider} />
              <View style={pm.infoRow}>
                <View style={[pm.infoIcon, { backgroundColor: isActive ? Colors.brand.greenLight : '#FEF2F2' }]}>
                  <Ionicons name={isActive ? 'checkmark-circle' : 'close-circle'} size={14} color={isActive ? Colors.brand.green : '#EF4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pm.infoKey}>Account Status</Text>
                  <Text style={[pm.infoVal, { color: isActive ? Colors.brand.green : '#EF4444' }]}>
                    {isActive ? 'Active' : 'Suspended'}
                  </Text>
                </View>
              </View>
              {(city || country) && (
                <>
                  <View style={pm.divider} />
                  <View style={pm.infoRow}>
                    <View style={[pm.infoIcon, { backgroundColor: '#F3F4F6' }]}>
                      <Ionicons name="location" size={14} color={Colors.text.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={pm.infoKey}>Location</Text>
                      <Text style={pm.infoVal}>{[city, country].filter(Boolean).join(', ')}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            <Text style={[pm.sectionLabel, { marginTop: 20 }]}>BADGES</Text>
            {badges.length === 0 ? (
              <View style={pm.noBadgesRow}>
                <Ionicons name="ribbon-outline" size={16} color={Colors.text.tertiary} />
                <Text style={pm.noBadgesText}>No badges granted</Text>
              </View>
            ) : (
              <View style={pm.badgesRow}>
                {badges.map((b: string) => {
                  const bm = BADGE_META[b] ?? { color: Colors.text.secondary, bg: '#F3F4F6', label: b, icon: 'shield' };
                  return (
                    <View key={b} style={[pm.badgeChip, { backgroundColor: bm.bg }]}>
                      <Ionicons name={bm.icon as any} size={12} color={bm.color} />
                      <Text style={[pm.badgeChipText, { color: bm.color }]}>{bm.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={[pm.sectionLabel, { marginTop: 20 }]}>ROLE & PERMISSIONS</Text>
            <View style={pm.roleCard}>
              <View style={[pm.roleIconWrap, { backgroundColor: roleMeta.bg }]}>
                <Ionicons name={roleMeta.icon as any} size={22} color={roleMeta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pm.roleName}>{role}</Text>
                <Text style={pm.roleDesc}>
                  {role === 'USER'
                    ? 'Standard platform user — can post, message, and list.'
                    : 'Full admin access to all platform management tools.'}
                </Text>
              </View>
            </View>

            {/* SPRINT-41: Role change USER ↔ ADMIN only */}
            {isActive && ( // SPRINT-41:
              <View style={pm.promoteRow}>
                {role === 'USER' ? ( // SPRINT-41:
                  <Pressable style={pm.promoteBtn} onPress={() => { // SPRINT-41:
                    appAlert('Promote to Admin?', `Give ${firstName} ADMIN role?`, [ // SPRINT-41:
                      { text: 'Cancel', style: 'cancel' }, // SPRINT-41:
                      { text: 'Promote', onPress: () => onChangeRole(userId, 'ADMIN') }, // SPRINT-41:
                    ]); // SPRINT-41:
                  }}>
                    <Ionicons name="arrow-up-circle" size={14} color={Colors.brand.green} />
                    <Text style={pm.promoteBtnText}>Promote to Admin</Text>
                  </Pressable>
                ) : ( // SPRINT-41:
                  <Pressable style={[pm.promoteBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => { // SPRINT-41:
                    appAlert('Demote to User?', `Change ${firstName} from ADMIN to USER?`, [ // SPRINT-41:
                      { text: 'Cancel', style: 'cancel' }, // SPRINT-41:
                      { text: 'Demote', style: 'destructive', onPress: () => onChangeRole(userId, 'USER') }, // SPRINT-41:
                    ]); // SPRINT-41:
                  }}>
                    <Ionicons name="arrow-down-circle" size={14} color="#EF4444" />
                    <Text style={[pm.promoteBtnText, { color: '#EF4444' }]}>Demote to User</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Text style={[pm.sectionLabel, { marginTop: 20 }]}>ADMIN ACTIONS</Text>
            <View style={pm.actionsGrid}>
              <Pressable
                style={[pm.actionBtn, { backgroundColor: '#F3F0FF', flex: 1, width: '100%' }]}
                onPress={() => { onClose(); router.push(`/admin/user-safety/${userId}` as any); }}
              >
                <View style={[pm.actionBtnIconBox, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                  <Ionicons name="folder-open" size={18} color="#8B5CF6" />
                </View>
                <Text style={[pm.actionBtnText, { color: '#8B5CF6' }]}>View Safety Case File</Text>
                <Text style={pm.actionBtnSub}>Reports, warnings, bans & sessions</Text>
              </Pressable>

              {isActive ? (
                <>
                  <Pressable
                    style={[pm.actionBtn, { backgroundColor: '#FFF3E6' }]}
                    onPress={() => { onAction(userId, 'warn'); onClose(); }}
                  >
                    <View style={[pm.actionBtnIconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                      <Ionicons name="warning" size={18} color="#F59E0B" />
                    </View>
                    <Text style={[pm.actionBtnText, { color: '#F59E0B' }]}>Warn User</Text>
                    <Text style={pm.actionBtnSub}>Send a warning notification</Text>
                  </Pressable>

                  <Pressable
                    style={[pm.actionBtn, { backgroundColor: '#FEF2F2' }]}
                    onPress={() => { onAction(userId, 'suspend'); onClose(); }}
                  >
                    <View style={[pm.actionBtnIconBox, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                      <Ionicons name="ban" size={18} color="#EF4444" />
                    </View>
                    <Text style={[pm.actionBtnText, { color: '#EF4444' }]}>Suspend</Text>
                    <Text style={pm.actionBtnSub}>Block account access</Text>
                  </Pressable>

                  <Pressable
                    style={[pm.actionBtn, { backgroundColor: Colors.brand.blueLight }]}
                    onPress={() => { onAction(userId, 'grant_badge'); onClose(); }}
                  >
                    <View style={[pm.actionBtnIconBox, { backgroundColor: 'rgba(0,118,235,0.12)' }]}>
                      <Ionicons name="shield-checkmark" size={18} color={Colors.brand.blue} />
                    </View>
                    <Text style={[pm.actionBtnText, { color: Colors.brand.blue }]}>Grant Badge</Text>
                    <Text style={pm.actionBtnSub}>Assign verification badge</Text>
                  </Pressable>

                  {badges.length > 0 && (
                    <Pressable
                      style={[pm.actionBtn, { backgroundColor: '#F3F0FF' }]}
                      onPress={handleRevokeBadge}
                    >
                      <View style={[pm.actionBtnIconBox, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                        <Ionicons name="ribbon" size={18} color="#8B5CF6" />
                      </View>
                      <Text style={[pm.actionBtnText, { color: '#8B5CF6' }]}>Revoke Badge</Text>
                      <Text style={pm.actionBtnSub}>Remove a granted badge</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[pm.actionBtn, { backgroundColor: '#FEF2F2' }]}
                    onPress={() => { // SPRINT-41:
                      onClose(); // SPRINT-41:
                      onRequestDelete({ ...listUser, id: userId, email, username, firstName, lastName }); // SPRINT-41:
                    }}
                  >
                    <View style={[pm.actionBtnIconBox, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
                      <Ionicons name="trash" size={18} color="#DC2626" />
                    </View>
                    <Text style={[pm.actionBtnText, { color: '#DC2626' }]}>Delete Account</Text>
                    <Text style={pm.actionBtnSub}>Permanently remove user</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[pm.actionBtn, { backgroundColor: Colors.brand.greenLight, flex: 1, width: '100%' }]}
                  onPress={() => { onAction(userId, 'restore'); onClose(); }}
                >
                  <View style={[pm.actionBtnIconBox, { backgroundColor: 'rgba(38,179,36,0.12)' }]}>
                    <Ionicons name="refresh-circle" size={18} color={Colors.brand.green} />
                  </View>
                  <Text style={[pm.actionBtnText, { color: Colors.brand.green }]}>Restore Account</Text>
                  <Text style={pm.actionBtnSub}>Re-enable account access</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// SPRINT-41: Typed confirmation for permanent delete
function DeleteConfirmModal({ // SPRINT-41:
  visible, user, onClose, onConfirm, // SPRINT-41:
}: { // SPRINT-41:
  visible: boolean; // SPRINT-41:
  user: ListUser | null; // SPRINT-41:
  onClose: () => void; // SPRINT-41:
  onConfirm: () => void; // SPRINT-41:
}) { // SPRINT-41:
  const [typed, setTyped] = useState(''); // SPRINT-41:
  useEffect(() => { if (visible) setTyped(''); }, [visible]); // SPRINT-41:
  if (!user) return null; // SPRINT-41:
  const ok = // SPRINT-41:
    typed === 'DELETE' || // SPRINT-41:
    typed.toLowerCase() === user.email.toLowerCase() || // SPRINT-41:
    typed.toLowerCase() === user.username.toLowerCase(); // SPRINT-41:
  return ( // SPRINT-41:
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={dcm.overlay}>
          <View style={dcm.card}>
            <Text style={dcm.title}>Permanently delete user?</Text>
            <Text style={dcm.sub}>
              This cannot be undone. Type DELETE, or the user&apos;s email ({user.email}) or username ({user.username}) to confirm.
            </Text>
            <TextInput
              style={dcm.input}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="DELETE / email / username"
              placeholderTextColor={Colors.text.tertiary}
            />
            <View style={dcm.actions}>
              <Pressable style={dcm.cancelBtn} onPress={onClose}>
                <Text style={dcm.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[dcm.deleteBtn, !ok && { opacity: 0.4 }]}
                disabled={!ok}
                onPress={onConfirm}
              >
                <Text style={dcm.deleteText}>Delete forever</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  ); // SPRINT-41:
} // SPRINT-41:

function WarnModal({
  visible, userId, userName,
  onClose, onSubmit,
}: { visible: boolean; userId: string | null; userName: string; onClose: () => void; onSubmit: (msg: string) => void }) {
  const [text, setText] = useState('');

  const QUICK_WARNS = [
    'Your content was flagged for containing misinformation. Please review our community guidelines.',
    'Repeated reports have been filed against your account. Further violations may result in suspension.',
    'Your listing contains inaccurate information. Please update it to reflect current details.',
    'Harassment is not tolerated on ComLinkr. This is a formal warning — any further violations will result in account suspension.',
  ];

  const handleSend = () => {
    if (!text.trim()) { appAlert('Required', 'Enter a warning message.'); return; }
    onSubmit(text.trim());
    setText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={wm.overlay}>
          <ScrollView style={wm.sheet} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={wm.handle} />
            <View style={wm.headerRow}>
              <View style={wm.iconWrap}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={wm.title}>Send Warning</Text>
                <Text style={wm.sub}>{userName}</Text>
              </View>
            </View>

            <View style={wm.infoBox}>
              <Ionicons name="information-circle" size={14} color={Colors.brand.blue} />
              <Text style={wm.infoText}>This message will be sent as a push notification and saved as an in-app alert. The user cannot reply to it.</Text>
            </View>

            <Text style={wm.label}>QUICK TEMPLATES</Text>
            {QUICK_WARNS.map((msg, i) => (
              <Pressable key={i} style={wm.quickRow} onPress={() => setText(msg)}>
                <Ionicons name="flash" size={13} color="#F59E0B" />
                <Text style={wm.quickText} numberOfLines={2}>{msg}</Text>
              </Pressable>
            ))}

            <Text style={[wm.label, { marginTop: 14 }]}>WARNING MESSAGE *</Text>
            <View style={wm.inputWrap}>
              <TextInput
                style={wm.input}
                placeholder="Write your warning..."
                placeholderTextColor={Colors.text.tertiary}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />
            </View>
            <Text style={wm.charCount}>{text.length}/2000</Text>

            <View style={wm.actions}>
              <Pressable style={wm.cancelBtn} onPress={onClose}>
                <Text style={wm.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={wm.sendBtnWrap} onPress={handleSend}>
                <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={wm.sendBtnGrad}>
                  <Ionicons name="warning" size={15} color="#FFF" />
                  <Text style={wm.sendText}>Send Warning</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GrantBadgeModal({
  visible, userId,
  onClose, onGrant,
}: { visible: boolean; userId: string | null; onClose: () => void; onGrant: (badgeType: string) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={gbm.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={gbm.card}>
          <Text style={gbm.title}>Grant Verification Badge</Text>
          <Text style={gbm.sub}>Choose the badge type to assign to this user.</Text>
          {GRANT_BADGE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={gbm.optRow}
              onPress={() => onGrant(opt.value)}
            >
              <View style={[gbm.optIcon, { backgroundColor: `${opt.color}18` }]}>
                <Ionicons name={opt.icon as any} size={16} color={opt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={gbm.optLabel}>{opt.label}</Text>
                <Text style={gbm.optSub}>Verified by admin review</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
            </Pressable>
          ))}
          <Pressable style={gbm.cancelBtn} onPress={onClose}>
            <Text style={gbm.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function UserManagementScreen() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'USER' | 'ADMIN'>('all'); // SPRINT-41:
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'suspended'>('all'); // SPRINT-41:
  const [warnUserId, setWarnUserId]     = useState<string | null>(null);
  const [warnUserName, setWarnUserName] = useState('');
  const [grantUserId, setGrantUserId]   = useState<string | null>(null);
  const [profileUser, setProfileUser]   = useState<ListUser | null>(null); // SPRINT-41:
  const [deleteUser, setDeleteUser]     = useState<ListUser | null>(null); // SPRINT-41:

  const { // SPRINT-41:
    items: users, // SPRINT-41:
    meta, // SPRINT-41:
    isLoading, // SPRINT-41:
    isLoadingMore, // SPRINT-41:
    isError, // SPRINT-41:
    errorMessage, // SPRINT-41:
    refresh, // SPRINT-41:
    loadMore, // SPRINT-41:
    setParams, // SPRINT-41:
  } = useAdminUsers(); // SPRINT-41:
  const { mutate: performAction } = useAdminUserAction();

  // SPRINT-41: Push filters to server (debounced search via effect)
  useEffect(() => { // SPRINT-41:
    const t = setTimeout(() => { // SPRINT-41:
      setParams({ // SPRINT-41:
        search: search.trim() || undefined, // SPRINT-41:
        role: roleFilter === 'all' ? undefined : roleFilter, // SPRINT-41:
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active', // SPRINT-41:
      }); // SPRINT-41:
    }, 300); // SPRINT-41:
    return () => clearTimeout(t); // SPRINT-41:
  }, [search, roleFilter, activeFilter, setParams]); // SPRINT-41:

  const runUserAction = (vars: AdminUserActionVars) => {
    void performAction(vars, {
      onSuccess: () => void refresh(), // SPRINT-41:
      onError: (err) => alertAdminApiError(err, 'Action failed'), // SPRINT-41:
    });
  };

  const handleAction = (userId: string, action: AdminActionType) => {
    const user = users.find(u => u.id === userId);
    if (action === 'warn') {
      setWarnUserId(userId);
      setWarnUserName(user ? `${user.firstName} ${user.lastName}`.trim() || user.username : '');
      return;
    }
    if (action === 'grant_badge') {
      setGrantUserId(userId);
      return;
    }
    if (action === 'delete') { // SPRINT-41:
      if (user) setDeleteUser(user); // SPRINT-41:
      return; // SPRINT-41:
    } // SPRINT-41:
    runUserAction({
      userId,
      action: { action, targetId: userId, targetType: 'user' } as AdminAction,
    });
  };

  const submitWarn = (msg: string) => {
    if (!warnUserId) return;
    const uid = warnUserId;
    void performAction(
      { userId: uid, action: { action: 'warn', targetId: uid, targetType: 'user' } as AdminAction, warnMessage: msg },
      {
        onSuccess: () => { setWarnUserId(null); void refresh(); showToast('The user has been notified.', "success"); }, // SPRINT-41:
        onError: (err) => alertAdminApiError(err, 'Action failed'), // SPRINT-41:
      }
    );
  };

  const submitGrantBadge = (badgeType: string) => {
    if (!grantUserId) return;
    const uid = grantUserId;
    void performAction(
      { userId: uid, action: { action: 'grant_badge', targetId: uid, targetType: 'user' } as AdminAction, grantBadgeType: badgeType },
      {
        onSuccess: () => { setGrantUserId(null); void refresh(); showToast('The verification badge has been assigned.', "success"); }, // SPRINT-41:
        onError: (err) => alertAdminApiError(err, 'Action failed'), // SPRINT-41:
      }
    );
  };

  const handleRevokeBadge = (userId: string, badgeType: string) => { // SPRINT-41:
    void performAction( // SPRINT-41:
      { userId, action: { action: 'revoke_badge', targetId: userId, targetType: 'user' } as AdminAction, revokeBadgeType: badgeType }, // SPRINT-41:
      { // SPRINT-41:
        onSuccess: () => { setProfileUser(null); void refresh(); showToast('The badge has been removed.', "success"); }, // SPRINT-41:
        onError: (err) => alertAdminApiError(err, 'Revoke failed'), // SPRINT-41:
      }, // SPRINT-41:
    ); // SPRINT-41:
  }; // SPRINT-41:

  const handleChangeRole = (userId: string, role: AdminApiRole) => { // SPRINT-41:
    void performAction( // SPRINT-41:
      { userId, action: { action: 'ban', targetId: userId, targetType: 'user' } as AdminAction, role }, // SPRINT-41:
      { // SPRINT-41:
        onSuccess: () => { setProfileUser(null); void refresh(); showToast(`User role set to ${role}.`, "success"); }, // SPRINT-41:
        onError: (err) => alertAdminApiError(err, 'Role change failed'), // SPRINT-41:
      }, // SPRINT-41:
    ); // SPRINT-41:
  }; // SPRINT-41:

  const confirmDelete = () => { // SPRINT-41:
    if (!deleteUser) return; // SPRINT-41:
    const uid = deleteUser.id; // SPRINT-41:
    setDeleteUser(null); // SPRINT-41:
    runUserAction({ // SPRINT-41:
      userId: uid, // SPRINT-41:
      action: { action: 'delete', targetId: uid, targetType: 'user' } as AdminAction, // SPRINT-41:
    }); // SPRINT-41:
  }; // SPRINT-41:

  const totalLabel = meta?.total ?? users.length; // SPRINT-41:

  return (
    <View style={s.root}>
      <AdminBackdrop />
      <View style={s.decorCircle} />

      <SafeAreaView style={s.safe}>
        <ScrollView keyboardShouldPersistTaps="handled"
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading && users.length > 0} onRefresh={refresh} tintColor={Colors.brand.blue} />}
        >
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,118,235,0.15)' }} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
            </Pressable>
            <LinearGradient colors={[Colors.brand.blue, '#0054CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerIcon}>
              <Ionicons name="people" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Admin Module</Text>
              <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>User Management</Text>
              <View style={[s.countPill, { alignSelf: 'flex-start', marginTop: 6 }]}>
                <Text style={s.countText}>{totalLabel}</Text>
                <Text style={s.countLabel}> users</Text>
              </View>
            </View>
          </View>

          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Search name, email or username..."
            filters={[
              { label: 'All', value: 'all' }, // SPRINT-41:
              { label: 'Active', value: 'active' }, // SPRINT-41:
              { label: 'Suspended', value: 'suspended' }, // SPRINT-41:
              { label: 'Users', value: 'USER' }, // SPRINT-41:
              { label: 'Admins', value: 'ADMIN' }, // SPRINT-41:
            ]}
            activeFilter={activeFilter !== 'all' ? activeFilter : roleFilter !== 'all' ? roleFilter : 'all'} // SPRINT-41:
            onFilterChange={(v) => { // SPRINT-41:
              if (v === 'active' || v === 'suspended') { // SPRINT-41:
                setActiveFilter(v); // SPRINT-41:
                setRoleFilter('all'); // SPRINT-41:
              } else if (v === 'USER' || v === 'ADMIN') { // SPRINT-41:
                setRoleFilter(v); // SPRINT-41:
                setActiveFilter('all'); // SPRINT-41:
              } else { // SPRINT-41:
                setActiveFilter('all'); // SPRINT-41:
                setRoleFilter('all'); // SPRINT-41:
              } // SPRINT-41:
            }}
          />

          {isError && errorMessage ? ( // SPRINT-41:
            <View style={s.emptyCard}>
              <Text style={{ color: '#EF4444', textAlign: 'center' }}>{errorMessage}</Text>
              <Pressable onPress={refresh} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.brand.blue, fontWeight: '700' }}>Retry</Text>
              </Pressable>
            </View>
          ) : isLoading && users.length === 0 ? (
            <View style={s.loadingCard}>
              <Ionicons name="hourglass-outline" size={24} color={Colors.text.tertiary} />
              <Text style={s.loadingText}>Loading users...</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={40} color={Colors.text.tertiary} />
              <Text style={s.emptyTitle}>No users found</Text>
              <Text style={s.emptySub}>{(search !== '' || activeFilter !== 'all') ? 'Nothing matches your search or filters' : 'Nothing here yet'}</Text>
            </View>
          ) : (
            <>
              {users.map((user) => {
                const roleMeta = ROLE_META[user.role] ?? ROLE_META.USER;
                const joinDate = user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '';
                return (
                  <Pressable key={user.id} style={uc.card} onPress={() => setProfileUser(user)}>
                    <View style={[uc.accentLine, { backgroundColor: user.isActive ? Colors.brand.blue : '#EF4444' }]} />
                    <View style={uc.inner}>
                      <View style={uc.topRow}>
                        <LinearGradient
                          colors={user.isActive ? [Colors.brand.blue, Colors.brand.green] : ['#9CA3AF', '#6B7280']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={uc.avatar}
                        >
                          <Text style={uc.avatarText}>
                            {initialsFrom(user.firstName, user.lastName, user.username)}
                          </Text>
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={uc.userName}>{user.firstName} {user.lastName}</Text>
                          <Text style={uc.userSub}>@{user.username} · {user.email}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
                      </View>

                      <View style={uc.metaRow}>
                        <View style={[uc.chip, { backgroundColor: user.isActive ? Colors.brand.greenLight : '#FEF2F2' }]}>
                          <View style={[uc.dot, { backgroundColor: user.isActive ? Colors.brand.green : '#EF4444' }]} />
                          <Text style={[uc.chipText, { color: user.isActive ? Colors.brand.green : '#EF4444' }]}>
                            {user.isActive ? 'Active' : 'Suspended'}
                          </Text>
                        </View>
                        <View style={[uc.chip, { backgroundColor: roleMeta.bg }]}>
                          <Ionicons name={roleMeta.icon as any} size={11} color={roleMeta.color} />
                          <Text style={[uc.chipText, { color: roleMeta.color }]}>{user.role}</Text>
                        </View>
                        {(user.badges?.length ?? 0) > 0 && ( // SPRINT-41:
                          <View style={[uc.chip, { backgroundColor: Colors.brand.greenLight }]}>
                            <Ionicons name="ribbon" size={11} color={Colors.brand.green} />
                            <Text style={[uc.chipText, { color: Colors.brand.green }]}>{user.badges!.length} badge{user.badges!.length === 1 ? '' : 's'}</Text>
                          </View>
                        )}
                      </View>

                      <View style={uc.footerRow}>
                        {user.city && (
                          <View style={uc.footerItem}>
                            <Ionicons name="location-outline" size={11} color={Colors.text.tertiary} />
                            <Text style={uc.footerText}>{user.city}{user.country ? `, ${user.country}` : ''}</Text>
                          </View>
                        )}
                        {joinDate && (
                          <View style={uc.footerItem}>
                            <Ionicons name="calendar-outline" size={11} color={Colors.text.tertiary} />
                            <Text style={uc.footerText}>Joined {joinDate}</Text>
                          </View>
                        )}
                      </View>

                      <ActionButtons
                        actions={user.isActive
                          ? (user.role === 'USER' ? ['grant_badge', 'warn', 'suspend', 'delete'] : ['warn', 'suspend', 'delete'])
                          : ['restore', 'delete']}
                        onAction={(action) => handleAction(user.id, action)}
                      />
                    </View>
                  </Pressable>
                );
              })}
              {meta && meta.page < meta.totalPages && ( // SPRINT-41:
                <Pressable style={s.loadMoreBtn} onPress={loadMore} disabled={isLoadingMore}>
                  <Text style={s.loadMoreText}>{isLoadingMore ? 'Loading...' : 'Load more'}</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <UserProfileModal
        userId={profileUser?.id ?? null} // SPRINT-41:
        listUser={profileUser} // SPRINT-41:
        visible={profileUser !== null}
        onClose={() => setProfileUser(null)}
        onAction={handleAction}
        onRevokeBadge={handleRevokeBadge} // SPRINT-41:
        onChangeRole={handleChangeRole} // SPRINT-41:
        onRequestDelete={setDeleteUser} // SPRINT-41:
      />

      <DeleteConfirmModal // SPRINT-41:
        visible={deleteUser !== null} // SPRINT-41:
        user={deleteUser} // SPRINT-41:
        onClose={() => setDeleteUser(null)} // SPRINT-41:
        onConfirm={confirmDelete} // SPRINT-41:
      />

      <WarnModal
        visible={warnUserId !== null}
        userId={warnUserId}
        userName={warnUserName}
        onClose={() => setWarnUserId(null)}
        onSubmit={submitWarn}
      />

      <GrantBadgeModal
        visible={grantUserId !== null}
        userId={grantUserId}
        onClose={() => setGrantUserId(null)}
        onGrant={submitGrantBadge}
      />
    </View>
  );
}

const s = createThemedStyles({
  root:         { flex: 1, backgroundColor: '#EBF5FF' },
  safe:         { flex: 1 },
  scroll:       { flex: 1 },
  content:      { padding: 18, paddingBottom: 48 },
  decorCircle:  { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(0,118,235,0.06)', top: -60, right: -70 },

  header:       { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
  headerIcon:   { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub:    { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  title:        { fontSize: 22, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },
  countPill:    { flexDirection: 'row', alignItems: 'baseline', backgroundColor: Colors.brand.blueLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.15)' },
  countText:    { fontSize: 16, fontWeight: '900', color: Colors.brand.blue },
  countLabel:   { fontSize: 11, fontWeight: '600', color: Colors.brand.blue },

  loadingCard:  { backgroundColor: '#FFF', borderRadius: 18, padding: 36, alignItems: 'center', gap: 10, elevation: 3 },
  loadingText:  { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },
  emptyCard:    { backgroundColor: '#FFF', borderRadius: 18, padding: 44, alignItems: 'center', gap: 8, elevation: 3 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  emptySub:     { fontSize: 13, color: Colors.text.tertiary },
  loadMoreBtn:  { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(0,118,235,0.2)' }, // SPRINT-41:
  loadMoreText: { fontSize: 14, fontWeight: '700', color: Colors.brand.blue }, // SPRINT-41:
});

const uc = createThemedStyles({
  card:        { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 10, shadowColor: '#0A2540', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', overflow: 'hidden', flexDirection: 'row' },
  accentLine:  { width: 4, flexShrink: 0 },
  inner:       { flex: 1, padding: 13 },

  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:      { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 15, fontWeight: '900', color: '#FFF' },
  userName:    { fontSize: 14, fontWeight: '800', color: Colors.text.primary },
  userSub:     { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },

  metaRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dot:         { width: 5, height: 5, borderRadius: 3 },
  chipText:    { fontSize: 10, fontWeight: '700' },

  footerRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  footerItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText:  { fontSize: 11, color: Colors.text.tertiary },
});

const pm = createThemedStyles({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%' },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 0 },

  headerBg:      { padding: 24, paddingTop: 16, alignItems: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, position: 'relative' },
  avatarWrap:    { alignItems: 'center', marginBottom: 10 },
  avatar:        { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarImg:     { width: 72, height: 72, borderRadius: 22, marginBottom: 8, overflow: 'hidden' }, // SPRINT-41:
  avatarText:    { fontSize: 26, fontWeight: '900', color: '#FFF' },
  roleBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roleBadgeText: { fontSize: 11, fontWeight: '800' },
  userName:      { fontSize: 20, fontWeight: '900', color: Colors.text.primary, marginTop: 4 },
  userHandle:    { fontSize: 13, color: Colors.text.tertiary, marginTop: 2 },
  userEmail:     { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  closeBtn:      { position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },

  statsRow:      { flexDirection: 'row', gap: 1, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', justifyContent: 'center' },
  statCard:      { flex: 1, paddingVertical: 16, alignItems: 'center' },
  statVal:       { fontSize: 22, fontWeight: '900' },
  statLbl:       { fontSize: 11, fontWeight: '600', color: Colors.text.tertiary, marginTop: 2 },

  content:       { padding: 20 },
  sectionLabel:  { fontSize: 10, fontWeight: '900', color: Colors.text.tertiary, letterSpacing: 1.2, marginBottom: 10 },

  infoCard:      { backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E8ECF0', marginBottom: 4 },
  infoRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  infoIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoKey:       { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', marginBottom: 2 },
  infoVal:       { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  divider:       { height: 1, backgroundColor: '#E8ECF0', marginHorizontal: 14 },

  badgesRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  badgeChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeChipText: { fontSize: 12, fontWeight: '700' },
  noBadgesRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8ECF0', marginBottom: 4 },
  noBadgesText:  { fontSize: 13, color: Colors.text.tertiary, fontWeight: '500' },

  roleCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E8ECF0' },
  roleIconWrap:  { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  roleName:      { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginBottom: 3 },
  roleDesc:      { fontSize: 12, color: Colors.text.tertiary, lineHeight: 17 },

  promoteRow:    { marginTop: 10 },
  promoteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 12, backgroundColor: Colors.brand.greenLight, borderWidth: 1.5, borderColor: 'rgba(38,179,36,0.2)' },
  promoteBtnText:{ fontSize: 14, fontWeight: '700', color: Colors.brand.green },

  actionsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn:        { width: '47%', padding: 14, borderRadius: 14, gap: 6 },
  actionBtnIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionBtnText:    { fontSize: 13, fontWeight: '800' },
  actionBtnSub:     { fontSize: 11, color: Colors.text.tertiary },
});

const wm = createThemedStyles({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, maxHeight: '88%' },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF3E6', alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 17, fontWeight: '900', color: Colors.text.primary },
  sub:        { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },
  infoBox:    { flexDirection: 'row', gap: 8, backgroundColor: Colors.brand.blueLight, borderRadius: 11, padding: 11, marginBottom: 14, alignItems: 'flex-start' },
  infoText:   { flex: 1, fontSize: 12, color: Colors.brand.blue, lineHeight: 17 },
  label:      { fontSize: 10, fontWeight: '900', color: Colors.text.tertiary, letterSpacing: 1.2, marginBottom: 7 },
  quickRow:   { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  quickText:  { flex: 1, fontSize: 12, color: Colors.text.secondary, lineHeight: 17 },
  inputWrap:  { backgroundColor: Colors.bg.secondary, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.border.light, paddingHorizontal: 14, marginBottom: 4 },
  input:      { fontSize: 14, color: Colors.text.primary, paddingVertical: 10, minHeight: 100 },
  charCount:  { fontSize: 11, color: Colors.text.tertiary, textAlign: 'right', marginBottom: 16 },
  actions:    { flexDirection: 'row', gap: 10 },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 13, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: Colors.text.secondary },
  sendBtnWrap:{ flex: 2, borderRadius: 13, overflow: 'hidden' },
  sendBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13 },
  sendText:   { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const gbm = createThemedStyles({
  overlay:    { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  card:       { backgroundColor: '#FFF', borderRadius: 20, padding: 22 },
  title:      { fontSize: 18, fontWeight: '800', color: Colors.text.primary, marginBottom: 4 },
  sub:        { fontSize: 13, color: Colors.text.tertiary, marginBottom: 18, lineHeight: 18 },
  optRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optLabel:   { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  optSub:     { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },
  cancelBtn:  { paddingVertical: 13, borderRadius: 13, backgroundColor: '#F3F4F6', alignItems: 'center', marginTop: 14 },
  cancelText: { fontSize: 14, fontWeight: '700', color: Colors.text.secondary },
});

const dcm = createThemedStyles({ // SPRINT-41:
  overlay:    { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 24 }, // SPRINT-41:
  card:       { backgroundColor: '#FFF', borderRadius: 20, padding: 22 }, // SPRINT-41:
  title:      { fontSize: 18, fontWeight: '800', color: '#DC2626', marginBottom: 8 }, // SPRINT-41:
  sub:        { fontSize: 13, color: Colors.text.secondary, marginBottom: 14, lineHeight: 19 }, // SPRINT-41:
  input:      { borderWidth: 1.5, borderColor: Colors.border.light, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text.primary, marginBottom: 16 }, // SPRINT-41:
  actions:    { flexDirection: 'row', gap: 10 }, // SPRINT-41:
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 13, backgroundColor: '#F3F4F6', alignItems: 'center' }, // SPRINT-41:
  cancelText: { fontSize: 14, fontWeight: '700', color: Colors.text.secondary }, // SPRINT-41:
  deleteBtn:  { flex: 1, paddingVertical: 13, borderRadius: 13, backgroundColor: '#DC2626', alignItems: 'center' }, // SPRINT-41:
  deleteText: { fontSize: 14, fontWeight: '800', color: '#FFF' }, // SPRINT-41:
}); // SPRINT-41:
