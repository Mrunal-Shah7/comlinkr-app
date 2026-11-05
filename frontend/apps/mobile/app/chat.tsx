import { rs } from "../src/utils/responsive";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  BackHandler,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Keyboard,
  AppState, // SPRINT-40: stop voice playback when the app backgrounds
} from "react-native";
import { Image } from "expo-image"; // SPRINT-31:
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../src/theme/colors";
import { useTheme } from "../src/theme/useTheme";
import { useAuthStore } from "../src/store/auth.store";
import { resolveApiAssetUrl } from "../src/api/feed.api";
import { blockUser as blockUserApi } from "../src/api/profile.api";
import { useBlockStore } from "../src/store/block.store";
import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  startOrGetConversation,
  acceptRequest,
  declineRequest,
  deleteConversation,
  getUnreadCount,
  mapConversationToListRow,
  normalizeGatewayMessage,
  uploadConversationAudio, // SPRINT-40:
  sendAudioMessage, // SPRINT-40:
  describeAudioUploadError, // SPRINT-40:
  formatListTime, // SPRINT-39:
  type ChatListRow,
  type ApiMessage,
} from "../src/api/chat.api";
import { ApiError } from "../src/api/client";
import { useListFetchCacheStore } from "../src/store/listFetchCache.store"; // SPRINT-27
import {
  connectMessagingSocket, // SPRINT-39:
  emitMessagingEvent, // SPRINT-39:
  joinConversationRoom,
  leaveConversationRoom,
  subscribeMessagingEvent, // SPRINT-39:
  type ConversationUpdatedSocketPayload, // SPRINT-39:
  type NewMessageSocketPayload,
  type TypingIndicatorPayload, // SPRINT-39:
  type TypingStoppedPayload, // SPRINT-39:
} from "../src/services/messagingSocket";
import { saveChatContextName, loadChatContextNames } from "../src/services/chatContextCache";
import { // SPRINT-40:
  VoiceRecorderControls, // SPRINT-40:
  deleteTemporaryVoiceRecording, // SPRINT-40:
  type CompletedVoiceRecording, // SPRINT-40:
} from "../components/VoiceRecorderControls"; // SPRINT-40:
import { VoiceMessageBubble, type VoiceDeliveryState } from "../components/VoiceMessageBubble"; // SPRINT-40:
import { LinkifiedText } from "../components/LinkifiedText";
import { stopAndReleaseVoicePlayback } from "../src/services/audioPlayback"; // SPRINT-40:
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from "react-native-svg";

// New:
import { useMuteStore } from "../src/store/mute.store";
import { appAlert } from '../src/shared/ui/Dialogs';
import { showToast } from '../src/shared/ui/Toast';

// SPRINT-39: typing emit debounce / remote expiry intervals
const TYPING_STOP_IDLE_MS = 2000;
const TYPING_REMOTE_EXPIRY_MS = 5000;

// ── Message tick (read receipts) ─────────────────────────────────────────────
function MessageTick({ isOwn, read }: { isOwn: boolean; read?: boolean }) {
  if (!isOwn) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginLeft: rs(3) }}>
      {/* first tick */}
      <Ionicons name="checkmark" size={rs(12)} color={read ? Colors.brand.blue : "#9CA3AF"} />
      {/* second tick offset left to overlap = double tick look */}
      <Ionicons name="checkmark" size={rs(12)} color={read ? Colors.brand.blue : "#9CA3AF"} style={{ marginLeft: rs(-5) }} />
    </View>
  );
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#0060D0","#30855B","#6D28D9","#D97706","#DC2626","#0891B2","#DB2777"];

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({
  name,
  size = 50,
  uri,
}: {
  name: string;
  size?: number;
  online?: boolean;
  uri?: string;
}) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <View style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: getAvatarColor(name),
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <Text style={{ fontSize: size * 0.34, fontWeight: "800", color: "#FFF", letterSpacing: 0.5 }}>
            {initials}
          </Text>
        )}
      </View>
      {/* online dot removed */}
    </View>
  );
}

const TABS = ["All", "Listings", "Events"] as const;
type Tab = typeof TABS[number];

type ThreadMsg =
  | { id: string; kind: "system"; text: string; time: string }
  | {
      id: string;
      kind: "text";
      text: string;
      time: string;
      isOwn: boolean;
      senderName: string;
      isHost: boolean;
    }
  | {
      id: string;
      kind: "image";
      imageUrl: string;
      time: string;
      isOwn: boolean;
      senderName: string;
      isHost: boolean;
    }
  | { // SPRINT-40: persisted and optimistic voice-message row
      id: string; // SPRINT-40:
      kind: "audio"; // SPRINT-40:
      audioUrl: string; // SPRINT-40:
      localUri?: string; // SPRINT-40: retained only while upload/send can be retried
      uploadedUrl?: string; // SPRINT-40: avoids re-upload when message creation alone failed
      mimeType?: "audio/mp4"; // SPRINT-40:
      fileName?: string; // SPRINT-40:
      durationSeconds: number; // SPRINT-40:
      deliveryState: VoiceDeliveryState; // SPRINT-40:
      deliveryError?: string; // SPRINT-40:
      time: string; // SPRINT-40:
      isOwn: boolean; // SPRINT-40:
      senderName: string; // SPRINT-40:
      isHost: boolean; // SPRINT-40:
    };

type AudioThreadMsg = Extract<ThreadMsg, { kind: "audio" }>; // SPRINT-40:

function apiMessageToThreadMsg(m: ApiMessage, conv: ChatListRow): ThreadMsg {
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (m.type === "SYSTEM") {
    return { id: m.id, kind: "system", text: m.content, time };
  }
  const isHost = conv.isGroup && !!conv.host && m.sender.name === conv.host;
  const attachmentUrl = m.imageUrl ?? m.file?.url ?? ""; // SPRINT-40: backend exposes IMAGE/AUDIO URL as imageUrl
  if (m.type === "AUDIO" && attachmentUrl && typeof m.durationSeconds === "number") { // SPRINT-40:
    return { // SPRINT-40:
      id: m.id, // SPRINT-40:
      kind: "audio", // SPRINT-40:
      audioUrl: attachmentUrl, // SPRINT-40:
      durationSeconds: Math.min(600, Math.max(1, Math.round(m.durationSeconds))), // SPRINT-40:
      deliveryState: "sent", // SPRINT-40:
      time, // SPRINT-40:
      isOwn: m.isOwn, // SPRINT-40:
      senderName: m.sender.name, // SPRINT-40:
      isHost, // SPRINT-40:
    }; // SPRINT-40:
  } // SPRINT-40:
  if (m.type === "IMAGE" && attachmentUrl) { // SPRINT-40:
    return {
      id: m.id,
      kind: "image",
      imageUrl: resolveApiAssetUrl(attachmentUrl), // SPRINT-40:
      time,
      isOwn: m.isOwn,
      senderName: m.sender.name,
      isHost,
    };
  }
  return {
    id: m.id,
    kind: "text",
    text: m.content,
    time,
    isOwn: m.isOwn,
    senderName: m.sender.name,
    isHost,
  };
}

// ── Conversation list ─────────────────────────────────────────────────────────
function ConvList({
  onSelect,
  bottomInset,
  conversations,
  loading,
  refreshing,
  onRefresh,
  tab,
  setTab,
}: {
  onSelect: (id: string) => void;
  bottomInset: number;
  conversations: ChatListRow[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const { isDark, tc } = useTheme();
  const [search, setSearch] = useState("");

  const data = conversations.filter((c) => {
    if (!c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return tab === "All" || c.ctx === tab;
  });

  const count = (t: Tab) =>
    t === "All" ? conversations.length : conversations.filter((c) => c.ctx === t).length;

  return (
    <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
      {/* Search bar */}
      <View style={{ paddingHorizontal: rs(16), paddingTop: rs(14), paddingBottom: rs(10) }}>
        <View style={[l.searchBar, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
          <Ionicons name="search-outline" size={17} color={tc.textTertiary} />
          <TextInput
            style={[l.searchInput, { color: tc.textPrimary }]}
            placeholder="Search conversations..."
            placeholderTextColor={tc.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: rs(8), bottom: rs(8), left: rs(8), right: rs(8) }}>
              <Ionicons name="close-circle" size={17} color={tc.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: rs(16), paddingBottom: rs(12), gap: rs(8) }}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            activeOpacity={0.8}
            onPress={() => setTab(t)}
            style={[l.tab, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, tab === t && l.tabActive]}
          >
            <Text style={[l.tabText, { color: tc.textSecondary }, tab === t && l.tabTextActive]}>{t}</Text>
            <View style={[l.tabBadge, tab === t && l.tabBadgeActive]}>
              <Text style={[l.tabBadgeText, tab === t && l.tabBadgeTextActive]}>{count(t)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conversation rows */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomInset + 36 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.blue} />
        }
        ListHeaderComponent={
          loading && conversations.length === 0 ? (
            <View style={{ paddingVertical: rs(32), alignItems: "center" }}>
              <ActivityIndicator color={Colors.brand.blue} />
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: tc.borderLight, marginLeft: rs(82) }} />
        )}
        renderItem={({ item }) => {
          const isEvent = item.ctx === "Events";
          const isPending = item.status === "pending";
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onSelect(item.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: rs(16),
                paddingVertical: rs(13),
                backgroundColor: isPending
                  ? (isDark ? "#1A1200" : "#FFFBF5")
                  : item.unread > 0
                  ? (isDark ? "#0A1628" : "#FAFCFF")
                  : tc.cardBg,
                overflow: "hidden",
              }}
            >
              {/* Left accent bar — orange for pending, blue for unread */}
              {(item.unread > 0 || isPending) && (
                <View style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: rs(4),
                  backgroundColor: isPending ? Colors.brand.orange : Colors.brand.blue,
                }} />
              )}

              {/* Avatar */}
              <View style={{ marginRight: rs(12), flexShrink: 0 }}>
                {isEvent ? (
                  <View style={l.eventAvatar}>
                    <Ionicons name="people" size={22} color="#C45200" />
                    {item.members && (
                      <View style={{ position: "absolute", bottom: rs(-2), right: rs(-2), backgroundColor: "#257A86", borderRadius: rs(8), paddingHorizontal: rs(4), paddingVertical: rs(1), borderWidth: 1.5, borderColor: "#FFF" }}>
                        <Text style={{ fontSize: rs(8), fontWeight: "900", color: "#FFF" }}>{item.members}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Avatar name={item.name} size={50} online={item.online} uri={item.avatarUrl} />
                )}
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                {/* Name + time */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: rs(4) }}>
                  <Text style={[l.convName, { color: tc.textPrimary }, (item.unread > 0 || isPending) && [l.convNameBold, isDark && { color: "#FFF" }]]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.verified && (
                    <Ionicons name="checkmark-circle" size={13} color={Colors.brand.blue} style={{ marginLeft: rs(4) }} />
                  )}
                  <View style={{ flex: 1 }} />
                  <Text style={[l.convTime, { color: tc.textTertiary }, (item.unread > 0 || isPending) && l.convTimeBold]}>{item.time}</Text>
                </View>

                {/* Tags */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: rs(5), flexWrap: "wrap", gap: rs(4) }}>
                  <View style={[l.ctxTag,
                    isEvent
                      ? [l.ctxEvent, isDark && { backgroundColor: "#2A1200" }]
                      : item.ctx === "Listings"
                      ? [l.ctxListing, isDark && { backgroundColor: "#0A1628" }]
                      : [{ backgroundColor: isDark ? "#1A1A2E" : "#F3F4F6" }]
                  ]}>
                    <Ionicons
                      name={isEvent ? "calendar-outline" : item.ctx === "Listings" ? "home-outline" : "chatbubble-outline"}
                      size={11}
                      color={isEvent ? "#C45200" : item.ctx === "Listings" ? Colors.brand.blue : tc.textSecondary}
                    />
                  </View>
                  {/* Property / event name tag */}
                  {item.contextName ? (
                    <View style={[
                      l.ctxNameTag,
                      item.contextName !== "Listing inquiry" && item.contextName !== "Event inquiry" && !isDark && {
                        backgroundColor: isEvent ? "#E2F0F1" : "#EEF5FF",
                        borderColor: isEvent ? "#FFD0A8" : "#C5DBFF",
                      },
                      isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight },
                    ]}>
                      <Ionicons
                        name={isEvent ? "calendar-outline" : "home-outline"}
                        size={9}
                        color={isEvent ? "#C45200" : Colors.brand.blue}
                      />
                      <Text style={[l.ctxNameText, {
                        color: item.contextName !== "Listing inquiry" && item.contextName !== "Event inquiry"
                          ? (isEvent ? "#C45200" : Colors.brand.blue)
                          : tc.textSecondary
                      }]} numberOfLines={1}>{item.contextName}</Text>
                    </View>
                  ) : null}
                  {item.isGroup && (
                    <View style={[l.groupTag, isDark && { backgroundColor: tc.inputBg }]}>
                      <Text style={[l.groupTagText, isDark && { color: tc.textTertiary }]}>GROUP</Text>
                    </View>
                  )}
                  {/* Pending chip */}
                  {isPending && (
                    <View style={l.pendingChip}>
                      <View style={{ width: rs(5), height: rs(5), borderRadius: rs(3), backgroundColor: Colors.brand.orange }} />
                      <Text style={l.pendingChipText}>Pending</Text>
                    </View>
                  )}
                  {item.host && !isPending && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(3) }}>
                      <Ionicons name="shield-checkmark" size={9} color="#257A86" />
                      <Text style={{ fontSize: rs(10), fontWeight: "700", color: tc.textTertiary }}>by {item.host}</Text>
                    </View>
                  )}
                </View>

                {/* Last message */}
                <Text numberOfLines={1} style={[l.convMsg, { color: tc.textTertiary }, (item.unread > 0) && [l.convMsgBold, { color: tc.textPrimary }]]}>
                  {item.lastFromMe && !isPending && !item.isGroup && (
                    <Text style={{ color: Colors.brand.blue }}>✓✓ </Text>
                  )}
                  {item.lastMsg}
                </Text>
              </View>

              {/* Right badge — orange clock for pending, blue unread count */}
              {isPending ? (
                <View style={l.pendingBadge}>
                  <Ionicons name="time-outline" size={14} color={Colors.brand.orange} />
                </View>
              ) : item.unread > 0 ? (
                <View style={l.unreadBadge}>
                  <Text style={{ fontSize: rs(12), fontWeight: "900", color: "#FFF" }}>{item.unread}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          // While the first load is in flight the header spinner shows; don't claim "no conversations" under it.
          loading ? null : (
          <View style={{ alignItems: "center", marginTop: rs(80) }}>
            <View style={[l.emptyIcon, { backgroundColor: isDark ? tc.inputBg : "#EEF5FF" }]}>
              <Ionicons name="chatbubbles-outline" size={36} color={Colors.brand.blue} />
            </View>
            <Text style={[l.emptyTitle, { color: tc.textPrimary }]}>No conversations yet</Text>
            <Text style={[l.emptyDesc, { color: tc.textSecondary }]}>Connect with your community to start chatting</Text>
          </View>
          )
        }
      />
    </View>
  );
}

const l = StyleSheet.create({
  searchBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: rs(16), backgroundColor: "#FFF",
    borderRadius: rs(16), borderWidth: 1.5, borderColor: "#D0DCEE",
    height: rs(48),
    shadowColor: "#0A2540", shadowOpacity: 0.07, shadowRadius: rs(8),
    shadowOffset: { width: 0, height: rs(3) }, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: rs(14), color: "#0A2540", fontWeight: "500", marginHorizontal: rs(8) },

  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rs(6),
    paddingVertical: rs(9), borderRadius: rs(12),
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#D0DCEE",
  },
  tabActive: { backgroundColor: Colors.brand.blue, borderColor: Colors.brand.blue },
  tabText: { fontSize: rs(13), fontWeight: "700", color: "#5A6A7E" },
  tabTextActive: { color: "#FFF" },
  tabBadge: {
    minWidth: 20, height: rs(20), borderRadius: rs(10), paddingHorizontal: rs(5),
    backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center",
  },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  tabBadgeText: { fontSize: rs(11), fontWeight: "800", color: Colors.brand.blue },
  tabBadgeTextActive: { color: "#FFF" },

  convName: { fontSize: rs(15), fontWeight: "600", color: "#1E2F44", flex: 1 },
  convNameBold: { fontWeight: "800", color: "#0A1E35" },
  convTime: { fontSize: rs(11), color: "#8A9DB5", fontWeight: "500" },
  convTimeBold: { color: Colors.brand.blue, fontWeight: "700" },
  convMsg: { fontSize: rs(13), color: "#7A90AC", fontWeight: "400" },
  convMsgBold: { color: "#0A2540", fontWeight: "600" },

  ctxTag: {
    flexDirection: "row", alignItems: "center", gap: rs(3),
    paddingHorizontal: rs(7), paddingVertical: rs(3), borderRadius: rs(7),
  },
  ctxEvent: { backgroundColor: "#E2F0F1" },
  ctxListing: { backgroundColor: "#EEF5FF" },
  ctxText: { fontSize: rs(9), fontWeight: "800", letterSpacing: 0.3 },
  ctxNameTag: {
    flexDirection: "row", alignItems: "center", gap: rs(3),
    paddingHorizontal: rs(7), paddingVertical: rs(3), borderRadius: rs(7),
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
    maxWidth: rs(140),
  },
  ctxNameText: { fontSize: rs(9), fontWeight: "700", flex: 1 },
  groupTag: {
    backgroundColor: "#F3F4F6", paddingHorizontal: rs(7), paddingVertical: rs(3),
    borderRadius: rs(7),
  },
  groupTagText: { fontSize: rs(9), fontWeight: "800", color: "#6B7280", letterSpacing: 0.4 },

  // Pending
  pendingChip: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: Colors.brand.orangeLight,
    paddingHorizontal: rs(7), paddingVertical: rs(3), borderRadius: rs(7), marginLeft: rs(4),
    borderWidth: 1, borderColor: Colors.brand.orange + "30",
  },
  pendingChipText: { fontSize: rs(9), fontWeight: "800", color: Colors.brand.orange, letterSpacing: 0.4 },
  pendingBadge: {
    width: rs(30), height: rs(30), borderRadius: rs(15),
    backgroundColor: Colors.brand.orangeLight,
    alignItems: "center", justifyContent: "center",
    marginLeft: rs(8), flexShrink: 0,
    borderWidth: 1.5, borderColor: Colors.brand.orange + "40",
  },

  unreadBadge: {
    width: rs(26), height: rs(26), borderRadius: rs(13),
    backgroundColor: Colors.brand.blue,
    alignItems: "center", justifyContent: "center",
    marginLeft: rs(8), flexShrink: 0,
    shadowColor: Colors.brand.blue, shadowOpacity: 0.45, shadowRadius: rs(8),
    shadowOffset: { width: 0, height: rs(2) }, elevation: 5,
    borderWidth: 2, borderColor: "#FFF",
  },

  eventAvatar: {
    width: rs(50), height: rs(50), borderRadius: rs(16),
    backgroundColor: "#E2F0F1", alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#FFD0A8",
  },

  emptyIcon: {
    width: rs(80), height: rs(80), borderRadius: rs(40),
    backgroundColor: "#EEF5FF", alignItems: "center", justifyContent: "center", marginBottom: rs(14),
  },
  emptyTitle: { fontSize: rs(17), fontWeight: "800", color: "#0A2540", marginBottom: rs(6) },
  emptyDesc: { fontSize: rs(13), color: "#7A90AC", textAlign: "center", paddingHorizontal: rs(40), fontWeight: "500" },
});

// ── Emoji categories (static, defined outside component to avoid re-creation) ──
const EMOJI_CATS = [
  {
    key: "smileys", icon: "😀", label: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  },
  {
    key: "gestures", icon: "👍", label: "People",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁️","👅","👄","💋","🫀","🫁","🧬","🩸","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷"],
  },
  {
    key: "hearts", icon: "❤️", label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","🔥","✨","💫","⭐","🌟","💥","❄️","🌊","🌀","🌈","☀️","🌤️","⛅","🌦️","🌧️","⛈️","🌩️","🌨️","🌬️","🌪️","🌫️","🌂","☂️","🌡️","🌞","🌝","🌛","🌜","🌚","🌕","🌙","🌠"],
  },
  {
    key: "symbols", icon: "🎉", label: "Symbols",
    emojis: ["🎉","🎊","🎈","🎁","🎀","🎗️","🏆","🥇","🥈","🥉","🏅","👑","💰","💵","💸","💎","🔔","🎵","🎶","🎼","🎤","🎧","✅","❌","⭕","🚫","⛔","❗","❓","‼️","⁉️","💯","📶","📱","📲","💻","⌨️","🖥️","📸","📷","📹","🎥","📞","☎️","🗣️","👀","🆕","🆓","🔑","🔐","🔒","🔓","🔗","💡","🔦","🕯️","🪔","📌","📍","📎","🖇️","✏️","🖊️","🖋️","📝","📁","📂","📋","📅","📆","🗓️","🗃️","🗂️","📊","📈","📉","🗒️","🗓️"],
  },
  {
    key: "animals", icon: "🐶", label: "Animals",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🦆","🐔","🐧","🐦","🐤","🐣","🐥","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐈‍⬛","🐓","🦃","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐿️","🦔"],
  },
  {
    key: "food", icon: "🍕", label: "Food",
    emojis: ["🍕","🍔","🌮","🌯","🥙","🧆","🥚","🍳","🥘","🍲","🥣","🥗","🍿","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🫖","🍵","🧃","🥤","🧋","🍶","🍾","🍷","🍸","🍹","🍺","🍻","🥂","🥃","🧉","🍴","🍽️","🥄","🔪"],
  },
  {
    key: "travel", icon: "🏠", label: "Places",
    emojis: ["🏠","🏡","🏢","🏥","🏦","🏨","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🕍","⛩️","🕋","⛲","⛺","🌁","🌃","🏙️","🌄","🌅","🌆","🌇","🌉","🎠","🎡","🎢","🎪","🏔️","⛰️","🌋","🏕️","🏖️","🏜️","🏝️","🏞️","🌊","🌈","🌏","🌎","🌍","🧭","🌐","🗺️","✈️","🛫","🛬","💺","🚀","🛸","🚁","🚂","🚃","🚄","🚅","🚆","🚇","🚌","🚑","🚒","🚓","🚕","🚗","🚙","🛻","🚚","🚛","🚜","🏎️","🏍️","🛵","🚲","🛴","⛵","🚤","🛥️","🛳️","🚢"],
  },
  {
    key: "activities", icon: "⚽", label: "Sports",
    emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🥅","⛳","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","⛹️","🤺","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖️","🎪","🤹","🎭","🩰","🎨","🖼️","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🎲","♟️","🎯","🎳","🎰","🎮","🕹️"],
  },
];

// ── Thread ────────────────────────────────────────────────────────────────────
function Thread({
  id,
  row: conv,
  onBack,
  onDeleteConversation,
  currentUserId,
  onConversationUpdated,
  initialComposerText,
  onComposerPrefillConsumed,
}: {
  id: string;
  row: ChatListRow;
  onBack: () => void;
  onDeleteConversation: (id: string) => void;
  currentUserId: string;
  onConversationUpdated: () => void;
  initialComposerText?: string;
  onComposerPrefillConsumed?: () => void;
}) {
  const { tc, isDark } = useTheme();
  const blockUserStore = useBlockStore((s) => s.blockUser);

  // New:
  const isConvMuted = useMuteStore((s) => s.isMuted(conv.id));
  const toggleConvMute = useMuteStore((s) => s.toggleMute);
  useEffect(() => {
    void useMuteStore.getState().hydrate();
  }, []);

  const isGroupChat = !!conv?.isGroup;
  const isPending = conv?.status === "pending";

  const [threadMsgs, setThreadMsgs] = useState<ThreadMsg[]>([]);
  const threadMsgsRef = useRef<ThreadMsg[]>([]); // SPRINT-40: cleanup retryable local recordings on thread exit
  threadMsgsRef.current = threadMsgs; // SPRINT-40:
  const conversationGenerationRef = useRef(0); // SPRINT-40: prevent async delivery from mutating a later thread
  const audioDeliveriesInFlightRef = useRef<Set<string>>(new Set()); // SPRINT-40: retry lock
  const [threadLoading, setThreadLoading] = useState(true);
  const [liveMembers, setLiveMembers] = useState<{ id: string; name: string; role: string }[]>([]);

  const [text, setText] = useState("");
  const [voiceComposerActive, setVoiceComposerActive] = useState(false); // SPRINT-40:
  const composerPrefillAppliedRef = useRef(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sendAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  // Avoid double-counting the bottom safe-area inset: KeyboardAvoidingView already
  // shifts the whole screen up by the keyboard height when it's open, so adding
  // insets.bottom on top of that (below) leaves a visible gap above the keyboard.
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => { // SPRINT-40: voice notes do not continue across thread navigation/backgrounding
    conversationGenerationRef.current += 1; // SPRINT-40:
    const subscription = AppState.addEventListener("change", (nextState) => { // SPRINT-40:
      if (nextState !== "active") stopAndReleaseVoicePlayback(); // SPRINT-40:
    }); // SPRINT-40:
    return () => { // SPRINT-40:
      subscription.remove(); // SPRINT-40:
      stopAndReleaseVoicePlayback(); // SPRINT-40:
      conversationGenerationRef.current += 1; // SPRINT-40: invalidate pending UI callbacks
      threadMsgsRef.current.forEach((message) => { // SPRINT-40:
        if ( // SPRINT-40: failed idle drafts have no future owner after leaving the thread
          message.kind === "audio" && // SPRINT-40:
          message.deliveryState === "failed" && // SPRINT-40:
          message.localUri && // SPRINT-40:
          !audioDeliveriesInFlightRef.current.has(message.id) // SPRINT-40:
        ) deleteTemporaryVoiceRecording(message.localUri); // SPRINT-40:
      }); // SPRINT-40:
    }; // SPRINT-40:
  }, [id]); // SPRINT-40: conversation changes run the same cleanup as unmount

  // SPRINT-39: local typing emit state + remote typers with expiry
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const localTypingRef = useRef(false);
  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingExpiryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Parent re-renders pass a new `conv` object and often a new `onConversationUpdated` fn.
  // If those were in `loadThread` deps, the effect below re-fetched messages every render → 429 throttle.
  const convRef = useRef(conv);
  convRef.current = conv;
  const onInboxRefreshRef = useRef(onConversationUpdated);
  onInboxRefreshRef.current = onConversationUpdated;

  const clearRemoteTypingUser = useCallback((userId: string) => {
    // SPRINT-39:
    const t = typingExpiryTimersRef.current.get(userId);
    if (t) {
      clearTimeout(t);
      typingExpiryTimersRef.current.delete(userId);
    }
    setTypingUsers((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const clearAllRemoteTyping = useCallback(() => {
    // SPRINT-39:
    typingExpiryTimersRef.current.forEach((t) => clearTimeout(t));
    typingExpiryTimersRef.current.clear();
    setTypingUsers(new Map());
  }, []);

  const emitTypingStop = useCallback(() => {
    // SPRINT-39:
    if (typingIdleTimerRef.current) {
      clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = null;
    }
    if (!localTypingRef.current) return;
    localTypingRef.current = false;
    emitMessagingEvent("typing_stop", { conversationId: id });
  }, [id]);

  const handleVoiceComposerActiveChange = useCallback((active: boolean) => { // SPRINT-40:
    setVoiceComposerActive(active); // SPRINT-40:
    if (!active) return; // SPRINT-40:
    setShowEmoji(false); // SPRINT-40:
    emitTypingStop(); // SPRINT-40:
  }, [emitTypingStop]); // SPRINT-40:

  const emitTypingStartIfNeeded = useCallback(() => {
    // SPRINT-39: first keystroke after inactivity only
    if (localTypingRef.current) return;
    localTypingRef.current = true;
    emitMessagingEvent("typing_start", { conversationId: id });
  }, [id]);

  const handleComposerTextChange = useCallback(
    (value: string) => {
      // SPRINT-39:
      setText(value);
      if (isPending) return;
      if (!value.trim()) {
        emitTypingStop();
        return;
      }
      emitTypingStartIfNeeded();
      if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = setTimeout(() => {
        emitTypingStop();
      }, TYPING_STOP_IDLE_MS);
    },
    [emitTypingStartIfNeeded, emitTypingStop, isPending],
  );

  const loadThread = useCallback(async () => {
    try {
      setThreadLoading(true);
      const { data } = await getMessages(id, { limit: 80 });
      const c = convRef.current;
      setThreadMsgs(data.map((m) => apiMessageToThreadMsg(m, c)));
      try {
        await markConversationRead(id);
        onInboxRefreshRef.current();
      } catch {
        /* ignore */
      }
    } catch {
      setThreadMsgs([]);
    } finally {
      setThreadLoading(false);
    }
  }, [id]);

  const [emojiCat, setEmojiCat] = useState("smileys");

  // Load once per thread id (not on every parent re-render).
  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  // Load live member list when group info panel opens
  useEffect(() => {
    if (!showGroupInfo || !isGroupChat || !id) return;
    getConversation(id)
      .then((raw) => {
        setLiveMembers(
          (raw.members ?? []).map((m) => ({ id: m.userId, name: m.name || m.username, role: m.role }))
        );
      })
      .catch(() => {});
  }, [showGroupInfo, isGroupChat, id]);

  useEffect(() => {
    composerPrefillAppliedRef.current = false;
  }, [id]);

  useEffect(() => {
    const t = initialComposerText?.trim();
    if (!t || composerPrefillAppliedRef.current) return;
    setText(t);
    composerPrefillAppliedRef.current = true;
    onComposerPrefillConsumed?.();
  }, [id, initialComposerText, onComposerPrefillConsumed]);

  // Real-time messages + typing via shared socket module (does not own connect/disconnect). // SPRINT-39:
  useEffect(() => {
    if (!currentUserId?.trim() || !id) return;

    const handler = (raw: unknown) => {
      const payload = raw as NewMessageSocketPayload;
      if (payload.conversationId !== id) return;
      try {
        const apiMsg = normalizeGatewayMessage(payload.message, currentUserId);
        clearRemoteTypingUser(apiMsg.sender.id); // SPRINT-39: clear typer when their message arrives
        setThreadMsgs((prev) => {
          if (prev.some((m) => m.id === apiMsg.id)) return prev;
          let next = prev; // SPRINT-40:
          if (apiMsg.type === "AUDIO" && apiMsg.isOwn && typeof apiMsg.durationSeconds === "number") { // SPRINT-40:
            const exactIndex = prev.findIndex((message) => // SPRINT-40: uploaded URL uniquely identifies the optimistic row
              message.kind === "audio" && // SPRINT-40:
              message.deliveryState !== "sent" && // SPRINT-40:
              Boolean(message.uploadedUrl) && // SPRINT-40:
              message.uploadedUrl === apiMsg.imageUrl, // SPRINT-40:
            ); // SPRINT-40:
            const durationCandidates = prev // SPRINT-40: fallback only when exactly one unsent row can match
              .map((message, index) => ({ message, index })) // SPRINT-40:
              .filter(({ message }) => // SPRINT-40:
                message.kind === "audio" && // SPRINT-40:
                message.deliveryState !== "sent" && // SPRINT-40:
                message.durationSeconds === Math.round(apiMsg.durationSeconds!), // SPRINT-40:
              ); // SPRINT-40:
            const pendingIndex = exactIndex >= 0 // SPRINT-40:
              ? exactIndex // SPRINT-40:
              : durationCandidates.length === 1 ? durationCandidates[0].index : -1; // SPRINT-40:
            if (pendingIndex >= 0) { // SPRINT-40:
              const pending = prev[pendingIndex] as AudioThreadMsg; // SPRINT-40:
              if (pending.localUri) deleteTemporaryVoiceRecording(pending.localUri); // SPRINT-40: upload is complete before gateway emission
              next = prev.filter((_, index) => index !== pendingIndex); // SPRINT-40:
            } // SPRINT-40:
          } // SPRINT-40:
          return [...next, apiMessageToThreadMsg(apiMsg, convRef.current)]; // SPRINT-40:
        });
        onInboxRefreshRef.current();
      } catch {
        /* ignore */
      }
    };

    const onTypingIndicator = (raw: unknown) => {
      // SPRINT-39:
      const payload = raw as TypingIndicatorPayload;
      if (payload.conversationId !== id) return;
      if (payload.userId === currentUserId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(payload.userId, payload.displayName || "Someone");
        return next;
      });
      const existing = typingExpiryTimersRef.current.get(payload.userId);
      if (existing) clearTimeout(existing);
      typingExpiryTimersRef.current.set(
        payload.userId,
        setTimeout(() => {
          clearRemoteTypingUser(payload.userId);
        }, TYPING_REMOTE_EXPIRY_MS),
      );
    };

    const onTypingStopped = (raw: unknown) => {
      // SPRINT-39:
      const payload = raw as TypingStoppedPayload;
      if (payload.conversationId !== id) return;
      clearRemoteTypingUser(payload.userId);
    };

    const unsubMessage = subscribeMessagingEvent("new_message", handler); // SPRINT-39:
    const unsubTyping = subscribeMessagingEvent("typing_indicator", onTypingIndicator); // SPRINT-39:
    const unsubTypingStop = subscribeMessagingEvent("typing_stopped", onTypingStopped); // SPRINT-39:
    const unsubConnect = subscribeMessagingEvent("connect", () => {
      joinConversationRoom(id);
    }); // SPRINT-39:

    let cancelled = false;
    void connectMessagingSocket().then((s) => {
      // SPRINT-39: ensure join after connect (subscribe alone can miss the first connect event)
      if (cancelled || !s) return;
      joinConversationRoom(id);
    });

    return () => {
      cancelled = true;
      emitTypingStop(); // SPRINT-39: stop on leave
      clearAllRemoteTyping(); // SPRINT-39:
      unsubMessage();
      unsubTyping();
      unsubTypingStop();
      unsubConnect();
      leaveConversationRoom(id);
      // SPRINT-39: must NOT disconnect the shared socket — list and other screens share it
    };
  }, [id, currentUserId, clearRemoteTypingUser, clearAllRemoteTyping, emitTypingStop]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (threadMsgs.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [threadMsgs.length]);

  const send = async () => {
    if (!text.trim() || isPending) return;
    const t = text.trim();
    setText("");
    setShowEmoji(false);
    emitTypingStop(); // SPRINT-39: stop on send
    try {
      const sent = await sendMessage(id, t);
      setThreadMsgs((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev; // socket may have already delivered this message
        return [...prev, apiMessageToThreadMsg(sent, convRef.current)];
      });
      onConversationUpdated();
      Animated.sequence([
        Animated.timing(sendAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.spring(sendAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not send message.";
      appAlert("Send failed", msg);
    }
  };

  const deliverVoiceMessage = useCallback(async (pending: AudioThreadMsg) => { // SPRINT-40:
    if (!pending.localUri || !pending.mimeType || !pending.fileName) return; // SPRINT-40:
    if (audioDeliveriesInFlightRef.current.has(pending.id)) return; // SPRINT-40: suppress double-tap Retry
    audioDeliveriesInFlightRef.current.add(pending.id); // SPRINT-40:
    const generation = conversationGenerationRef.current; // SPRINT-40:
    setThreadMsgs((prev) => prev.map((message) => // SPRINT-40:
      message.id === pending.id && message.kind === "audio" // SPRINT-40:
        ? { ...message, deliveryState: "uploading", deliveryError: undefined } // SPRINT-40:
        : message, // SPRINT-40:
    )); // SPRINT-40:

    let uploadedUrl = pending.uploadedUrl; // SPRINT-40:
    try { // SPRINT-40:
      if (!uploadedUrl) { // SPRINT-40:
        const uploaded = await uploadConversationAudio({ // SPRINT-40:
          uri: pending.localUri, // SPRINT-40:
          fileName: pending.fileName, // SPRINT-40:
          mimeType: pending.mimeType, // SPRINT-40:
        }); // SPRINT-40:
        uploadedUrl = uploaded.url; // SPRINT-40: retain backend URL unchanged
        if (generation === conversationGenerationRef.current) { // SPRINT-40:
          setThreadMsgs((prev) => prev.map((message) => // SPRINT-40:
            message.id === pending.id && message.kind === "audio" // SPRINT-40:
              ? { ...message, uploadedUrl } // SPRINT-40: exact socket reconciliation key
              : message, // SPRINT-40:
          )); // SPRINT-40:
        } // SPRINT-40:
      } // SPRINT-40:

      const sent = await sendAudioMessage(id, uploadedUrl, pending.durationSeconds); // SPRINT-40:
      const serverMessage = apiMessageToThreadMsg(sent, convRef.current); // SPRINT-40:
      deleteTemporaryVoiceRecording(pending.localUri); // SPRINT-40:
      if (generation === conversationGenerationRef.current) { // SPRINT-40:
        setThreadMsgs((prev) => { // SPRINT-40:
          const withoutPending = prev.filter((message) => message.id !== pending.id); // SPRINT-40:
          if (withoutPending.some((message) => message.id === sent.id)) return withoutPending; // SPRINT-40: socket/REST dedupe by server ID
          return [...withoutPending, serverMessage]; // SPRINT-40:
        }); // SPRINT-40:
        onInboxRefreshRef.current(); // SPRINT-40:
      } // SPRINT-40:
    } catch (error) { // SPRINT-40:
      const deliveryError = describeAudioUploadError(error); // SPRINT-40:
      if (generation === conversationGenerationRef.current) { // SPRINT-40:
        setThreadMsgs((prev) => prev.map((message) => // SPRINT-40:
          message.id === pending.id && message.kind === "audio" // SPRINT-40:
            ? { ...message, uploadedUrl, deliveryState: "failed", deliveryError } // SPRINT-40:
            : message, // SPRINT-40:
        )); // SPRINT-40:
      } else { // SPRINT-40:
        deleteTemporaryVoiceRecording(pending.localUri); // SPRINT-40: no retry UI remains after navigation
      } // SPRINT-40:
    } finally { // SPRINT-40:
      audioDeliveriesInFlightRef.current.delete(pending.id); // SPRINT-40:
    } // SPRINT-40:
  }, [id]); // SPRINT-40:

  const queueVoiceRecording = useCallback((recording: CompletedVoiceRecording) => { // SPRINT-40:
    emitTypingStop(); // SPRINT-40: recording replaces composing text
    const pending: AudioThreadMsg = { // SPRINT-40:
      id: `pending-audio-${Date.now()}`, // SPRINT-40:
      kind: "audio", // SPRINT-40:
      audioUrl: recording.uri, // SPRINT-40: local URI renders only as pending metadata, not playback
      localUri: recording.uri, // SPRINT-40:
      mimeType: recording.mimeType, // SPRINT-40:
      fileName: recording.fileName, // SPRINT-40:
      durationSeconds: recording.durationSeconds, // SPRINT-40:
      deliveryState: "uploading", // SPRINT-40:
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), // SPRINT-40:
      isOwn: true, // SPRINT-40:
      senderName: "You", // SPRINT-40:
      isHost: false, // SPRINT-40:
    }; // SPRINT-40:
    setThreadMsgs((prev) => [...prev, pending]); // SPRINT-40: immediate upload feedback
    void deliverVoiceMessage(pending); // SPRINT-40:
  }, [deliverVoiceMessage, emitTypingStop]); // SPRINT-40:

  const handleAccept = async () => {
    try {
      await acceptRequest(id, currentUserId);
      await loadThread();
      onConversationUpdated();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e instanceof Error ? e.message : e);
      appAlert("Could not accept", msg);
    }
  };

  const handleLongPressMsg = (msg: ThreadMsg) => {
    if (msg.kind !== "text") return;
    const isMe = msg.isOwn;
    const options = [
      // TODO(next build): Copy is hidden for now — it only showed an alert and never wrote to the clipboard.
      // Re-enable once expo-clipboard is installed (needs a new native build) and use Clipboard.setStringAsync(msg.text).
      // { text: "Copy", onPress: () => appAlert("Copied", msg.text) },
      ...(isMe
        ? [
            {
              text: "Delete",
              style: "destructive" as const,
              onPress: () => setThreadMsgs((prev) => prev.filter((m) => m.id !== msg.id)),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ];
    // Show a short preview as the dialog body; a bare "Message" title left the dialog looking empty.
    const preview = msg.text.length > 120 ? `${msg.text.slice(0, 120)}…` : msg.text;
    appAlert("Message options", preview, options);
  };

  const handleDecline = async () => {
    try {
      await declineRequest(id, currentUserId);
      onBack();
      onConversationUpdated();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e instanceof Error ? e.message : e);
      appAlert("Could not decline", msg);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: tc.pageBg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <LinearGradient
        colors={isGroupChat ? [Colors.brand.orange, "#E56800"] : isPending ? [Colors.brand.orange, "#CC5000"] : [Colors.brand.blue, Colors.brand.blueDark]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[th.hdr, { paddingTop: insets.top + 8 }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: rs(14), paddingTop: rs(6), gap: rs(10) }}>
          <TouchableOpacity onPress={onBack} style={th.hdrBtn} hitSlop={{ top: rs(10), bottom: rs(10), left: rs(10), right: rs(10) }}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          {isGroupChat ? (
            <View style={th.groupAvatar}>
              <Ionicons name="people" size={20} color="#C45200" />
            </View>
          ) : (
            <Avatar name={conv.name} size={40} online={conv.online && !isPending} uri={conv.avatarUrl} />
          )}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => isGroupChat && setShowGroupInfo(!showGroupInfo)}
            activeOpacity={isGroupChat ? 0.7 : 1}
          >
            <Text style={th.hdrName} numberOfLines={1}>{conv.name}</Text>
            {isGroupChat ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4), marginTop: rs(2) }}>
                <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={{ fontSize: rs(11), fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>
                  {conv.members || 10} members · Tap for info
                </Text>
              </View>
            ) : isPending ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), marginTop: rs(2) }}>
                <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={{ fontSize: rs(11), fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>
                  Request pending acceptance
                </Text>
              </View>
            ) : conv.contextName || conv.ctx !== "All" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: rs(4), marginTop: rs(2) }}>
                <Ionicons
                  name={conv.ctx === "Events" ? "calendar-outline" : conv.ctx === "Listings" ? "home-outline" : "pricetag-outline"}
                  size={11}
                  color="rgba(255,255,255,0.75)"
                />
                <Text style={{ fontSize: rs(11), fontWeight: "600", color: "rgba(255,255,255,0.8)" }} numberOfLines={1}>
                  {conv.contextName ?? (conv.ctx === "Listings" ? "Listing inquiry" : conv.ctx === "Events" ? "Event inquiry" : "")}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: rs(6) }}>
            {isGroupChat ? (
              <TouchableOpacity style={th.hdrBtn} onPress={() => setShowGroupInfo(!showGroupInfo)}>
                <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            ) : !isPending ? (<>
              <TouchableOpacity style={th.hdrBtn} onPress={() => setShowMenu(true)}>
                <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </>) : null}
          </View>
        </View>
      </LinearGradient>

      {/* ── Message Request Banner ── */}
      {isPending && (
        <View style={[th.requestBanner, { backgroundColor: tc.cardBg, borderBottomColor: Colors.brand.orange + "25" }]}>
          <View style={th.requestBannerTop}>
            <View style={th.requestIconBox}>
              <Ionicons name="lock-closed" size={18} color={Colors.brand.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[th.requestTitle, { color: tc.textPrimary }]}>New message request</Text>
              <Text style={[th.requestSubtitle, { color: tc.textSecondary }]}>
                <Text style={{ fontWeight: "800", color: tc.textPrimary }}>{conv.name}</Text> wants to connect. Accept to start chatting.
              </Text>
            </View>
          </View>
          <View style={th.requestActions}>
            <Pressable style={[th.requestAcceptBtn, { flex: 1, backgroundColor: Colors.brand.green }]} onPress={() => void handleAccept()}>
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
              <Text style={th.requestAcceptText}>Accept</Text>
            </Pressable>
            <Pressable style={[th.requestDeclineBtn, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]} onPress={() => void handleDecline()}>
              <Ionicons name="close-circle-outline" size={16} color={Colors.text.secondary} />
              <Text style={[th.requestDeclineText, { color: tc.textSecondary }]}>Decline</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Group info panel (collapsible) */}
      {isGroupChat && showGroupInfo && (
        <View style={[th.groupInfoPanel, { backgroundColor: tc.cardBg, borderBottomColor: tc.borderLight }]}>
          <View style={th.groupInfoSection}>
            <Text style={[th.groupInfoLabel, { color: tc.textTertiary }]}>ORGANIZER (ADMIN)</Text>
            <View style={th.groupInfoRow}>
              <Avatar name={conv.host || "Organizer"} size={32} />
              <View style={{ flex: 1, marginLeft: rs(10) }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6) }}>
                  <Text style={[th.groupInfoName, { color: tc.textPrimary }]}>{conv.host}</Text>
                  <View style={th.adminBadge}>
                    <Ionicons name="shield-checkmark" size={9} color="#FFF" />
                    <Text style={th.adminBadgeText}>ADMIN</Text>
                  </View>
                </View>
                <Text style={[th.groupInfoSub, { color: tc.textTertiary }]}>Event organizer · Can manage this group</Text>
              </View>
            </View>
          </View>
          <View style={th.groupInfoSection}>
            <Text style={[th.groupInfoLabel, { color: tc.textTertiary }]}>
              MEMBERS ({liveMembers.length > 0 ? liveMembers.length : (conv.members || "—")})
            </Text>
            <View style={{ gap: rs(8) }}>
              {(liveMembers.length > 0 ? liveMembers : []).slice(0, 6).map((m) => (
                <View key={m.id} style={th.groupInfoRow}>
                  <Avatar name={m.name} size={28} />
                  <View style={{ flex: 1, marginLeft: rs(10), flexDirection: "row", alignItems: "center", gap: rs(6) }}>
                    <Text style={[th.groupInfoName, { fontSize: rs(13), color: tc.textPrimary }]}>{m.name}</Text>
                    {m.role === "ADMIN" && (
                      <View style={th.adminBadge}>
                        <Text style={th.adminBadgeText}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {liveMembers.length === 0 && (
                <Text style={{ fontSize: rs(12), color: tc.textTertiary, fontWeight: "500" }}>Loading members…</Text>
              )}
              {liveMembers.length > 6 && (
                <Text style={{ fontSize: rs(12), color: tc.textTertiary, fontWeight: "600" }}>
                  + {liveMembers.length - 6} more
                </Text>
              )}
            </View>
          </View>
          <View style={[th.groupInfoSection, { borderBottomWidth: 0 }]}>
            <Text style={[th.groupInfoLabel, { color: tc.textTertiary }]}>GROUP RULES</Text>
            <View style={{ gap: rs(6) }}>
              {[
                "Be respectful and on-topic",
                "No spam or self-promotion",
                "Only the organizer can pin messages",
              ].map((rule, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: rs(8) }}>
                  <View style={{ width: rs(18), height: rs(18), borderRadius: rs(9), backgroundColor: Colors.brand.blueLight, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: rs(10), fontWeight: "800", color: Colors.brand.blue }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontSize: rs(13), color: tc.textSecondary, fontWeight: "500" }}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Day separator */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: rs(20), paddingVertical: rs(10), gap: rs(10), backgroundColor: tc.sectionBg }}>
        <View style={{ flex: 1, height: rs(1), backgroundColor: tc.borderLight }} />
        <Text style={{ fontSize: rs(11), fontWeight: "600", color: tc.textTertiary }}>Today</Text>
        <View style={{ flex: 1, height: rs(1), backgroundColor: tc.borderLight }} />
      </View>

      {/* Messages — SPRINT-39: wrap so typing overlay does not change ScrollView layout height */}
      <View style={{ flex: 1, backgroundColor: tc.sectionBg }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: rs(16), gap: rs(10) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {threadLoading && threadMsgs.length === 0 ? (
          <View style={{ paddingVertical: rs(40), alignItems: "center" }}>
            <ActivityIndicator color={Colors.brand.blue} />
          </View>
        ) : null}
        {threadMsgs.map((msg) => {
          if (msg.kind === "system") {
            return (
              <View key={msg.id} style={[th.systemMsg, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
                <Ionicons name="megaphone-outline" size={14} color={Colors.brand.blue} />
                <Text style={[th.systemMsgText, isDark && { color: tc.textSecondary }]}>{msg.text}</Text>
              </View>
            );
          }

          if (msg.kind === "audio") { // SPRINT-40: render voice notes with normal sender attribution
            const isMe = msg.isOwn;
            const isHost = msg.isHost;
            return (
              <View
                key={msg.id}
                style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: rs(8) }}
              >
                {!isMe ? <Avatar name={msg.senderName} size={28} /> : null}
                <View style={{ maxWidth: "82%", gap: rs(3) }}>
                  {isGroupChat && !isMe ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), marginBottom: rs(2), marginLeft: rs(4) }}>
                      <Text style={{ fontSize: rs(11), fontWeight: "700", color: isHost ? "#C45200" : "#5A6A7E" }}>
                        {msg.senderName}
                      </Text>
                      {isHost ? (
                        <View style={th.inlineAdminBadge}>
                          <Ionicons name="shield-checkmark" size={8} color="#FFF" />
                          <Text style={th.inlineAdminText}>ADMIN</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  <VoiceMessageBubble
                    messageId={msg.id}
                    url={msg.audioUrl}
                    durationSeconds={msg.durationSeconds}
                    isOwn={isMe}
                    deliveryState={msg.deliveryState}
                    deliveryError={msg.deliveryError}
                    onRetryDelivery={() => void deliverVoiceMessage(msg)}
                  />
                  <View style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "center", gap: rs(3), marginHorizontal: rs(4) }}>
                    <Text style={{ fontSize: rs(10), color: tc.textTertiary }}>{msg.time}</Text>
                    <MessageTick isOwn={isMe} />
                  </View>
                </View>
              </View>
            );
          }

          if (msg.kind === "image") {
            const isMe = msg.isOwn;
            const isHost = msg.isHost;
            return (
              <View key={msg.id} style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: rs(8) }}>
                {!isMe && <Avatar name={msg.senderName} size={28} />}
                <View style={{ maxWidth: "74%", gap: rs(3) }}>
                  {isGroupChat && !isMe && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), marginBottom: rs(2), marginLeft: rs(4) }}>
                      <Text style={{ fontSize: rs(11), fontWeight: "700", color: isHost ? "#C45200" : "#5A6A7E" }}>
                        {msg.senderName}
                      </Text>
                      {isHost && (
                        <View style={th.inlineAdminBadge}>
                          <Ionicons name="shield-checkmark" size={8} color="#FFF" />
                          <Text style={th.inlineAdminText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={[th.bubble, { paddingHorizontal: rs(8), paddingVertical: rs(8), overflow: "hidden" }]}>
                    <Image
                      source={{ uri: msg.imageUrl }}
                      style={{ width: rs(220), height: rs(160), borderRadius: rs(12) }}
                      contentFit="contain"
                      cachePolicy="disk"
                      transition={300}
                    />
                  </View>
                  <View style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "center", gap: rs(3), marginHorizontal: rs(4) }}>
                    <Text style={{ fontSize: rs(10), color: tc.textTertiary }}>{msg.time}</Text>
                    <MessageTick isOwn={isMe} read={(msg as any).read} />
                  </View>
                </View>
              </View>
            );
          }

          const isMe = msg.isOwn;
          const isHost = msg.isHost;

          return (
            <Pressable key={msg.id} onLongPress={() => handleLongPressMsg(msg)} style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: rs(8) }}>
              {!isMe && <Avatar name={msg.senderName} size={28} />}
              <View style={{ maxWidth: "74%", gap: rs(3) }}>
                {isGroupChat && !isMe && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: rs(5), marginBottom: rs(2), marginLeft: rs(4) }}>
                    <Text style={{ fontSize: rs(11), fontWeight: "700", color: isHost ? "#C45200" : "#5A6A7E" }}>
                      {msg.senderName}
                    </Text>
                    {isHost && (
                      <View style={th.inlineAdminBadge}>
                        <Ionicons name="shield-checkmark" size={8} color="#FFF" />
                        <Text style={th.inlineAdminText}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                )}
                {isMe ? (
                  <View style={[th.bubble, { borderBottomRightRadius: rs(5), backgroundColor: Colors.brand.blue, shadowColor: Colors.brand.blue, shadowOpacity: 0.18, shadowRadius: rs(8), shadowOffset: { width: 0, height: rs(3) }, elevation: 4 }]}>
                    <LinkifiedText text={msg.text} style={{ fontSize: rs(14), lineHeight: rs(21), color: "#FFF", fontWeight: "500" }} linkStyle={{ color: "#FFF", fontWeight: "700", textDecorationLine: "underline" }} />
                  </View>
                ) : isHost ? (
                  <View style={[th.bubble, { borderBottomLeftRadius: rs(5), backgroundColor: Colors.brand.orange, shadowColor: Colors.brand.orange, shadowOpacity: 0.13, shadowRadius: rs(6), shadowOffset: { width: 0, height: rs(2) }, elevation: 3 }]}>
                    <LinkifiedText text={msg.text} style={{ fontSize: rs(14), lineHeight: rs(21), color: "#FFF", fontWeight: "500" }} linkStyle={{ color: "#FFF", fontWeight: "700", textDecorationLine: "underline" }} />
                  </View>
                ) : (
                  <View style={[th.bubble, { backgroundColor: tc.cardBg, borderBottomLeftRadius: rs(5), shadowColor: "#0A2540", shadowOpacity: 0.06, shadowRadius: rs(5), shadowOffset: { width: 0, height: rs(2) }, elevation: 2 }]}>
                    <LinkifiedText text={msg.text} style={{ fontSize: rs(14), lineHeight: rs(21), color: tc.textPrimary, fontWeight: "500" }} />
                  </View>
                )}
                <View style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "center", gap: rs(3), marginHorizontal: rs(4) }}>
                  <Text style={{ fontSize: rs(10), color: tc.textTertiary }}>{msg.time}</Text>
                  <MessageTick isOwn={isMe} read={(msg as any).read} />
                </View>
              </View>
            </Pressable>
          );
        })}
        <View style={{ height: rs(8) }} />
      </ScrollView>

      {/* SPRINT-39: typing indicator — absolute overlay; does not shift message list scroll */}
      {typingUsers.size > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: rs(20),
            paddingVertical: rs(6),
            backgroundColor: "transparent",
          }}
        >
          <Text style={{ fontSize: rs(12), fontWeight: "600", color: tc.textTertiary, fontStyle: "italic" }} numberOfLines={1}>
            {(() => {
              const names = Array.from(typingUsers.values());
              if (names.length === 1) return `${names[0]} is typing…`;
              if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
              return `${names[0]}, ${names[1]}, and others are typing…`;
            })()}
          </Text>
        </View>
      ) : null}
      </View>

      {/* SPRINT-40: text and tap-to-record controls share the existing composer */}
      <View style={{
        flexDirection: "row", alignItems: "flex-end",
        paddingHorizontal: rs(12), paddingTop: rs(10),
        borderTopWidth: 1, borderTopColor: tc.borderLight,
        backgroundColor: tc.cardBg, gap: rs(8),
        paddingBottom: (keyboardVisible ? 0 : insets.bottom) + (Platform.OS === "ios" ? 10 : rs(10)),
      }}>
        <View style={{ display: voiceComposerActive ? "none" : "flex", flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: tc.inputBg, borderRadius: rs(22), borderWidth: 1.5, borderColor: tc.borderLight, paddingLeft: rs(16), paddingRight: rs(6), paddingVertical: rs(6), minHeight: 44, maxHeight: 120 }}>
          {/* SPRINT-40: hide text controls without unmounting recorder */}
          <TextInput
            style={{ flex: 1, fontSize: rs(14), color: tc.textPrimary, paddingVertical: 0, maxHeight: 100, fontWeight: "500", includeFontPadding: false, textAlignVertical: "center" }}
            placeholder={
              isPending
                ? "Accept the request to reply…"
                : isGroupChat
                ? "Message the group..."
                : "Type a message..."
            }
            placeholderTextColor={tc.textTertiary}
            value={text}
            onChangeText={handleComposerTextChange} // SPRINT-39:
            multiline
            editable={!isPending}
            selectionColor={Colors.brand.blue}
          />
          <TouchableOpacity
            style={{ paddingBottom: rs(4), paddingLeft: rs(4) }}
            onPress={() => {
              Keyboard.dismiss();
              setShowEmoji((p) => !p);
            }}
          >
            <Ionicons name={showEmoji ? "happy" : "happy-outline"} size={19} color={showEmoji ? Colors.brand.blue : "#8A9DB5"} />
          </TouchableOpacity>
        </View>
        <View style={{ display: text.trim() && !voiceComposerActive ? "none" : "flex", flex: voiceComposerActive ? 1 : undefined }}>
          {/* SPRINT-40: recorder stays mounted across mode changes */}
          <VoiceRecorderControls
            disabled={isPending}
            onRecordingReady={queueVoiceRecording}
            onActiveChange={handleVoiceComposerActiveChange} // SPRINT-40:
          />
        </View>
        <Animated.View style={{ display: text.trim() && !voiceComposerActive ? "flex" : "none", transform: [{ scale: sendAnim }] }}>
          {/* SPRINT-40: mic replaces disabled send button when composer is empty */}
          <TouchableOpacity
            disabled={!text.trim()}
            onPress={() => void send()}
            style={{ width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: text.trim() ? Colors.brand.blue : tc.inputBg, alignItems: "center", justifyContent: "center", marginBottom: rs(1), borderWidth: text.trim() ? 0 : 1.5, borderColor: tc.borderLight, shadowColor: Colors.brand.blue, shadowOpacity: text.trim() ? 0.28 : 0, shadowRadius: rs(8), shadowOffset: { width: 0, height: rs(3) }, elevation: text.trim() ? 5 : 0 }}
          >
            <Ionicons name="send" size={16} color={text.trim() ? "#FFF" : tc.textSecondary} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Emoji picker panel — categorized grid */}
      {showEmoji && !voiceComposerActive && ( // SPRINT-40: recording mode owns the composer surface
        <View style={{ backgroundColor: tc.cardBg, borderTopWidth: 1, borderTopColor: tc.borderLight, paddingBottom: insets.bottom }}>
          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: rs(10), gap: rs(4), paddingVertical: rs(8) }}>
            {EMOJI_CATS.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setEmojiCat(cat.key)}
                style={{
                  paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(10),
                  backgroundColor: emojiCat === cat.key ? Colors.brand.blue : (tc.inputBg),
                  borderWidth: 1.5,
                  borderColor: emojiCat === cat.key ? Colors.brand.blue : tc.borderLight,
                  flexDirection: "row", alignItems: "center", gap: rs(4),
                }}
              >
                <Text style={{ fontSize: rs(14) }}>{cat.icon}</Text>
                {emojiCat === cat.key && (
                  <Text style={{ fontSize: rs(11), fontWeight: "700", color: "#FFF" }}>{cat.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Emoji grid */}
          <ScrollView style={{ maxHeight: rs(160) }} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: rs(8), paddingBottom: rs(10) }}>
            {(EMOJI_CATS.find((c) => c.key === emojiCat)?.emojis ?? []).map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => handleComposerTextChange(text + e)} // SPRINT-39: emoji insert also drives typing
                style={{ width: "12.5%", alignItems: "center", paddingVertical: rs(5) }}
              >
                <Text style={{ fontSize: rs(22) }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Three-dots menu modal */}
      <Modal visible={showMenu} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setShowMenu(false)}>
          {/* onStartShouldSetResponder stops touches on this sheet from bubbling to the backdrop Pressable */}
          <View
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: tc.cardBg, borderTopLeftRadius: rs(20), borderTopRightRadius: rs(20), paddingBottom: insets.bottom + 12, paddingTop: rs(8) }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ width: rs(36), height: rs(4), borderRadius: rs(2), backgroundColor: tc.borderLight, alignSelf: "center", marginBottom: rs(12) }} />
            {[
              {
                icon: "person-outline", label: "View Profile",
                onPress: () => {
                  setShowMenu(false);
                  const rid = conv.recipientId ?? conv.id;
                  if (rid && rid !== currentUserId) {
                    router.push({ pathname: "/public-profile" as any, params: { userId: rid } });
                  } else {
                    router.push("/profile" as any);
                  }
                },
              },
//               {
//                 icon: "notifications-off-outline", label: "Mute Notifications",
//                 onPress: () => {
//                   setShowMenu(false);
//                   appAlert("Muted", `Notifications muted for this conversation.`);
//                 },
//               },

              // New:
              {
                icon: isConvMuted ? "notifications-outline" : "notifications-off-outline",
                label: isConvMuted ? "Unmute Notifications" : "Mute Notifications",
                onPress: async () => {
                  setShowMenu(false);
                  const nowMuted = await toggleConvMute(conv.id);
                  appAlert(
                    nowMuted ? "Muted" : "Unmuted",
                    nowMuted ? "Notifications muted for this conversation." : "Notifications unmuted for this conversation.",
                  );
                },
              },
              {
                icon: "ban-outline", label: "Block User",
                onPress: () => {
                  setShowMenu(false);
                  appAlert(
                    "Block User",
                    `Block ${conv.name}? They won't be able to message you or see your content.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Block",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            const targetId = conv.recipientId ?? conv.id;
                            await blockUserApi(targetId);
                            await blockUserStore({ id: targetId, name: conv.name, avatar: conv.avatarUrl });
                            showToast(`${conv.name} has been blocked.`, "success");
                            onBack();
                            onConversationUpdated();
                          } catch (e) {
                            const msg = e instanceof ApiError ? e.message : "Could not block user.";
                            appAlert("Error", msg);
                          }
                        },
                      },
                    ]
                  );
                },
              },
              {
                icon: "trash-outline", label: "Delete Chat",
                onPress: () => {
                  setShowMenu(false);
                  appAlert(
                    "Remove conversation?", // SPRINT-27
                    "Remove this conversation from your inbox?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove", // SPRINT-27
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await deleteConversation(id);
                          } catch (e) {
                            const msg = e instanceof ApiError ? e.message : "Could not delete conversation.";
                            appAlert("Error", msg);
                            return;
                          }
                          onDeleteConversation(id);
                          onBack();
                        },
                      },
                    ]
                  );
                },
              },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                style={{ flexDirection: "row", alignItems: "center", gap: rs(14), paddingHorizontal: rs(20), paddingVertical: rs(15) }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: rs(40), height: rs(40), borderRadius: rs(12), alignItems: "center", justifyContent: "center",
                  backgroundColor: (item.label === "Delete Chat" || item.label === "Block User") ? "#FEF2F2" : (tc.inputBg),
                }}>
                  <Ionicons name={item.icon as any} size={20} color={(item.label === "Delete Chat" || item.label === "Block User") ? "#EF4444" : Colors.brand.blue} />
                </View>
                <Text style={{ fontSize: rs(15), fontWeight: "600", color: (item.label === "Delete Chat" || item.label === "Block User") ? "#EF4444" : tc.textPrimary }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const th = StyleSheet.create({
  hdr: { paddingBottom: rs(14) },
  hdrBtn: {
    width: rs(36), height: rs(36), borderRadius: rs(12),
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center", justifyContent: "center",
  },
  hdrName: { fontSize: rs(16), fontWeight: "800", color: "#FFF", letterSpacing: -0.2 },
  groupAvatar: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: "#E2F0F1",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },

  // ── Message Request Banner ──
  requestBanner: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.orange + "25",
    padding: rs(14),
    gap: rs(12),
  },
  requestBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(12),
  },
  requestIconBox: {
    width: rs(42), height: rs(42), borderRadius: rs(14),
    backgroundColor: Colors.brand.orangeLight,
    borderWidth: 1.5, borderColor: Colors.brand.orange + "30",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  requestTitle: {
    fontSize: rs(14), fontWeight: "800", color: Colors.text.primary, marginBottom: rs(2),
  },
  requestSubtitle: {
    fontSize: rs(12), color: Colors.text.secondary, lineHeight: rs(17),
  },
  requestActions: {
    flexDirection: "row",
    gap: rs(10),
  },
  requestAcceptBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(6), paddingVertical: rs(11), borderRadius: rs(12),
  },
  requestAcceptText: { fontSize: rs(13), fontWeight: "800", color: "#FFF" },
  requestDeclineBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: rs(6), paddingVertical: rs(11), paddingHorizontal: rs(16),
    borderRadius: rs(12), backgroundColor: "#F3F4F6",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  requestDeclineText: { fontSize: rs(13), fontWeight: "700", color: Colors.text.secondary },

  // ── Group info ──
  groupInfoPanel: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#E5EFF8",
    shadowColor: "#0A2540", shadowOpacity: 0.06, shadowRadius: rs(10),
    shadowOffset: { width: 0, height: rs(3) }, elevation: 4,
  },
  groupInfoSection: {
    paddingHorizontal: rs(16), paddingVertical: rs(12),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEF2F8",
  },
  groupInfoLabel: { fontSize: rs(9), fontWeight: "800", color: "#8A9DB5", letterSpacing: 1, textTransform: "uppercase", marginBottom: rs(8) },
  groupInfoRow: { flexDirection: "row", alignItems: "center", marginBottom: rs(4) },
  groupInfoName: { fontSize: rs(14), fontWeight: "700", color: "#0A2540" },
  groupInfoSub: { fontSize: rs(11), color: "#7A90AC", marginTop: rs(1) },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(3),
    backgroundColor: "#257A86", borderRadius: rs(6), paddingHorizontal: rs(6), paddingVertical: rs(2),
  },
  adminBadgeText: { fontSize: rs(8), fontWeight: "900", color: "#FFF", letterSpacing: 0.5 },
  inlineAdminBadge: {
    flexDirection: "row", alignItems: "center", gap: rs(2),
    backgroundColor: "#257A86", borderRadius: rs(5), paddingHorizontal: rs(5), paddingVertical: rs(2),
  },
  inlineAdminText: { fontSize: rs(7), fontWeight: "900", color: "#FFF", letterSpacing: 0.5 },

  // ── Messages ──
  systemMsg: {
    flexDirection: "row", alignItems: "center", gap: rs(7), alignSelf: "center",
    backgroundColor: "#EEF5FF", borderRadius: rs(12), paddingHorizontal: rs(14), paddingVertical: rs(8),
    maxWidth: "88%", borderWidth: 1, borderColor: "#D0E4FF",
  },
  systemMsgText: { fontSize: rs(12), fontWeight: "600", color: "#4A6A9A", flex: 1, lineHeight: rs(17) },
  bubble: {
    paddingHorizontal: rs(14), paddingVertical: rs(10), borderRadius: rs(18),
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { isDark, tc } = useTheme();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? "";

  const params = useLocalSearchParams<{
    eventId?: string;
    eventTitle?: string;
    eventHost?: string;
    /** Open an existing thread (e.g. event group chat from event detail). */
    conversationId?: string;
    recipientId?: string;
    recipientName?: string;
    recipientType?: string;
    restaurantName?: string;
    contextId?: string;
    contextName?: string;
    returnTo?: string;
    /** One-time pre-fill for the message composer (e.g. listing video tour). */
    initialMessage?: string;
  }>();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ChatListRow | null>(null);
  // Guards against double-invocation of the thread back action (double-tap on the
  // chevron, or the on-screen button and the hardware back button firing for the
  // same user gesture). router.back()/router.replace() are queued and resolve on a
  // later tick, so without this a second call before the first resolves can pop the
  // stack twice and leave zero screens to render (the "app goes black" bug).
  const threadBackInFlightRef = useRef(false);
  const listBackInFlightRef = useRef(false);
  const [listTab, setListTab] = useState<Tab>("All");
  const [conversations, setConversations] = useState<ChatListRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [headerUnread, setHeaderUnread] = useState(0);
  const [threadComposerPrefill, setThreadComposerPrefill] = useState<string | undefined>(undefined);
  const insets = useSafeAreaInsets();

  const resolveAsset = useCallback((p: string | null | undefined) => resolveApiAssetUrl(p), []);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) {
      setConversations([]);
      setListLoading(false);
      return;
    }
    try {
      setListLoading(true);
      const filter =
        listTab === "All" ? "all" : listTab === "Listings" ? "listings" : "events";
      const [raw, contextCache] = await Promise.all([
        getConversations(filter),
        loadChatContextNames(),
      ]);
      const genericFallbacks = new Set(["Listing inquiry", "Event inquiry"]);
      setConversations(raw.map((c) => {
        const row = mapConversationToListRow(c, currentUserId, resolveAsset);
        if ((!row.contextName || genericFallbacks.has(row.contextName)) && contextCache[row.id]) {
          row.contextName = contextCache[row.id];
        }
        return row;
      }));
      const uc = await getUnreadCount();
      setHeaderUnread(uc.count);
      useListFetchCacheStore.getState().markFetched("messages"); // SPRINT-27
    } catch {
      // preserve existing conversations on error so inbox doesn't blank out
    } finally {
      setListLoading(false);
    }
  }, [currentUserId, listTab, resolveAsset]);

  /** Coalesce inbox refreshes from mark-read + send (avoids hammering GET /conversations). */
  const inboxDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (inboxDebounceRef.current) clearTimeout(inboxDebounceRef.current);
    },
    [],
  );
  const scheduleInboxRefresh = useCallback(() => {
    if (inboxDebounceRef.current) clearTimeout(inboxDebounceRef.current);
    inboxDebounceRef.current = setTimeout(() => {
      inboxDebounceRef.current = null;
      void loadConversations();
    }, 400);
  }, [loadConversations]);

  useEffect(() => {
    // SPRINT-27: 10-minute stale-while-revalidate gate
    if (!useListFetchCacheStore.getState().shouldFetch("messages")) return;
    void loadConversations();
  }, [loadConversations]);

  // SPRINT-39: do not disconnect the shared socket when leaving Messages — owned by auth lifecycle

  const selectedIdRef = useRef<string | null>(null); // SPRINT-39:
  selectedIdRef.current = selectedId;
  const conversationsRef = useRef(conversations); // SPRINT-39:
  conversationsRef.current = conversations;

  // SPRINT-39: consume conversation_updated on the list (and while a thread is open for preview/order)
  useEffect(() => {
    if (!currentUserId) return;

    const onConversationUpdated = (raw: unknown) => {
      const payload = raw as ConversationUpdatedSocketPayload;
      if (!payload?.conversationId) return;

      const prev = conversationsRef.current;
      const idx = prev.findIndex((c) => c.id === payload.conversationId);
      if (idx < 0) {
        // Brand-new conversation not in list — refetch rather than invent a partial row
        void loadConversations(); // SPRINT-39:
        return;
      }

      const openId = selectedIdRef.current;
      const existing = prev[idx];
      const updated: ChatListRow = {
        ...existing,
        lastMsg: payload.messagePreview,
        lastFromMe: false, // conversation_updated is only sent to the members who did not send the message
        time: formatListTime(payload.updatedAt),
        updatedAt: payload.updatedAt,
        // Server unread is authoritative; suppress only while that thread is open
        unread: openId === payload.conversationId ? existing.unread : payload.unreadCount, // SPRINT-39:
      };

      const next = [updated, ...prev.filter((_, i) => i !== idx)];
      conversationsRef.current = next;
      setConversations(next);
      // Recalculate the Messages header unread chip from the updated list (1 badge found)
      setHeaderUnread(next.reduce((sum, row) => sum + (row.unread > 0 ? row.unread : 0), 0)); // SPRINT-39:
    };

    return subscribeMessagingEvent("conversation_updated", onConversationUpdated); // SPRINT-39:
  }, [currentUserId, loadConversations]);

  const onRefreshList = useCallback(async () => {
    useListFetchCacheStore.getState().clearFetchTimestamp("messages"); // SPRINT-27
    setRefreshing(true);
    try {
      await loadConversations();
    } finally {
      setRefreshing(false);
    }
  }, [loadConversations]);

  // Deep link / housing "Message" without session
  useEffect(() => {
    const rid = params.recipientId?.trim();
    if (!rid || currentUserId) return;
    appAlert("Sign in required", "Log in to message the landlord or host.");
  }, [params.recipientId, currentUserId]);

  // Open or create conversation when navigated with recipientId (listing / user DM)
  useEffect(() => {
    const rid = params.recipientId?.trim();
    if (!rid || !currentUserId) return;

    let cancelled = false;
    const draft = params.initialMessage?.trim() || undefined;
    (async () => {
      try {
        // Check if a conversation with this recipient already exists locally (avoids duplicate creation)
        const existing = conversations.find(
          (c) => !c.isGroup && (c.recipientId === rid || c.id === rid)
        );
        if (existing) {
          if (cancelled) return;
          if (draft) setThreadComposerPrefill(draft);
          setSelectedRow(existing);
          setSelectedId(existing.id);
          router.setParams({
            recipientId: "", contextId: "", recipientType: "",
            recipientName: "", eventId: "", eventTitle: "", eventHost: "",
            restaurantName: "", conversationId: "", initialMessage: "",
            // This push set recipientId fresh; only keep returnTo if THIS push also set it,
            // otherwise a returnTo left over from an earlier, unrelated navigation would
            // hijack this thread's back button (e.g. router.replace to housing/food).
            returnTo: params.returnTo ?? "",
          });
          return;
        }

        const raw = await startOrGetConversation({
          recipientId: rid,
          ctx:
            params.recipientType === "landlord" || params.recipientType === "roommate" || params.recipientType === "room-host"
              ? "listing"
              : params.recipientType === "event"
              ? "event"
              : "dm",
          contextId: params.contextId,
          contextName: params.contextName,
        });
        if (cancelled) return;
        if (draft) setThreadComposerPrefill(draft);
        const row = mapConversationToListRow(raw, currentUserId, resolveAsset);
        // Overlay contextName from params when backend title is missing
        const paramCtxName = params.contextName?.trim();
        const genericFallbacks = new Set(["Listing inquiry", "Event inquiry"]);
        if (paramCtxName && (!row.contextName || genericFallbacks.has(row.contextName))) {
          row.contextName = paramCtxName;
        }
        // Persist so the name survives inbox refreshes
        if (row.contextName && !genericFallbacks.has(row.contextName)) {
          void saveChatContextName(row.id, row.contextName);
        }
        setConversations((prev) => {
          const i = prev.findIndex((c) => c.id === row.id);
          if (i >= 0) {
            const next = [...prev];
            next[i] = row;
            return next;
          }
          return [row, ...prev];
        });
        setSelectedRow(row);
        setSelectedId(row.id);
        // Drop deep-link query params so this effect does not POST /conversations again on re-render / focus.
        router.setParams({
          recipientId: "",
          contextId: "",
          recipientType: "",
          recipientName: "",
          eventId: "",
          eventTitle: "",
          eventHost: "",
          restaurantName: "",
          conversationId: "",
          initialMessage: "",
          // Only keep returnTo if THIS push set it fresh — otherwise a stale value
          // from an earlier navigation could hijack this thread's back button.
          returnTo: params.returnTo ?? "",
        });
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Could not open conversation.";
        appAlert("Messages", msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.recipientId, params.contextId, params.recipientType, params.initialMessage, currentUserId, resolveAsset]);

  // Open an existing conversation (event group chat, etc.) when navigated with conversationId
  useEffect(() => {
    const cid = params.conversationId?.trim();
    if (!cid || !currentUserId) return;

    let cancelled = false;
    const draft = params.initialMessage?.trim() || undefined;
    void (async () => {
      try {
        const raw = await getConversation(cid);
        if (cancelled) return;
        if (draft) setThreadComposerPrefill(draft);
        const row = mapConversationToListRow(raw, currentUserId, resolveAsset);
        const paramCtxName2 = params.contextName?.trim();
        const genericFallbacks2 = new Set(["Listing inquiry", "Event inquiry"]);
        if (paramCtxName2 && (!row.contextName || genericFallbacks2.has(row.contextName))) {
          row.contextName = paramCtxName2;
        }
        if (row.contextName && !genericFallbacks2.has(row.contextName)) {
          void saveChatContextName(row.id, row.contextName);
        }
        setConversations((prev) => {
          const i = prev.findIndex((c) => c.id === row.id);
          if (i >= 0) {
            const next = [...prev];
            next[i] = row;
            return next;
          }
          return [row, ...prev];
        });
        setSelectedRow(row);
        setSelectedId(row.id);
        router.setParams({
          conversationId: "",
          eventId: "",
          eventTitle: "",
          eventHost: "",
          recipientId: "",
          contextId: "",
          recipientType: "",
          recipientName: "",
          restaurantName: "",
          initialMessage: "",
          // Only keep returnTo if THIS push set it fresh — otherwise a stale value
          // from an earlier navigation could hijack this thread's back button.
          returnTo: params.returnTo ?? "",
        });
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Could not open conversation.";
        appAlert("Messages", msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.conversationId, params.initialMessage, currentUserId, resolveAsset]);

  // Shared thread-back action used by BOTH the on-screen chevron and the Android
  // hardware back button. Guarded against re-entrancy: router.back()/router.replace()
  // are queued by expo-router and only resolve on a later tick, so if this were
  // callable twice before the first call resolves (double-tap, or the on-screen
  // button and hardware back firing for the same gesture), the stack could be
  // popped twice and left with nothing to render (the "app goes black" bug).
  const handleThreadBack = useCallback(() => {
    if (threadBackInFlightRef.current) return;
    threadBackInFlightRef.current = true;
    // Unmount the thread (and its back button) immediately so a stray second
    // tap can't reach this handler again while navigation is still in flight.
    setSelectedId(null);
    setSelectedRow(null);
    if (params.returnTo === "housing" || params.returnTo === "food") {
      if (router.canGoBack()) router.back();
      else router.replace(params.returnTo === "housing" ? "/(tabs)/housing" : "/(tabs)/food");
    } else {
      void loadConversations();
    }
    // Release the guard on the next tick once expo-router's queued navigation
    // (if any) has had a chance to actually run.
    setTimeout(() => {
      threadBackInFlightRef.current = false;
    }, 500);
  }, [params.returnTo, loadConversations]);

  // Android hardware back button — while a thread is open, close it instead of
  // letting the event fall through to the OS (which would exit the app if no
  // other handler claims it first).
  useEffect(() => {
    if (!selectedId) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleThreadBack();
      return true;
    });
    return () => sub.remove();
  }, [selectedId, handleThreadBack]);

  // Android hardware back button — on the conversation list itself, make sure
  // back always lands somewhere inside the app rather than exiting when the
  // router has no screen left to pop to.
  useEffect(() => {
    if (selectedId) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (listBackInFlightRef.current) return true;
      listBackInFlightRef.current = true;
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/feed");
      }
      setTimeout(() => {
        listBackInFlightRef.current = false;
      }, 500);
      return true;
    });
    return () => sub.remove();
  }, [selectedId]);

  if (!isAuthed) {
    return <Redirect href="/(auth)/login" />;
  }

  if (selectedId && selectedRow) {
    return (
      <>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <Thread
          id={selectedId}
          row={selectedRow}
          onBack={handleThreadBack}
          onDeleteConversation={(cid) => {
            setConversations((prev) => prev.filter((c) => c.id !== cid));
          }}
          currentUserId={currentUserId}
          onConversationUpdated={scheduleInboxRefresh}
          initialComposerText={threadComposerPrefill}
          onComposerPrefillConsumed={() => setThreadComposerPrefill(undefined)}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: true }} />
      <View style={{ flex: 1, backgroundColor: tc.pageBg }}>
      {/* Header */}
      <View style={[m.headerWhite, { backgroundColor: tc.headerBg, borderBottomColor: tc.borderLight, paddingTop: insets.top }]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: rs(14), paddingTop: rs(10), paddingBottom: rs(12), gap: rs(10) }}>
          <TouchableOpacity onPress={() => {
            if (listBackInFlightRef.current) return;
            listBackInFlightRef.current = true;
            if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed" as any);
            setTimeout(() => { listBackInFlightRef.current = false; }, 500);
          }} style={[m.iconBtnWhite, { backgroundColor: isDark ? tc.inputBg : "#EEF5FF" }]} hitSlop={{ top: rs(10), bottom: rs(10), left: rs(10), right: rs(10) }}>
            <Ionicons name="chevron-back" size={22} color={Colors.brand.blue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Svg height={28} width={160}>
              <Defs>
                <SvgGradient id="chatTitleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={Colors.brand.blue} />
                  <Stop offset="100%" stopColor={Colors.brand.green} />
                </SvgGradient>
              </Defs>
              <SvgText fill="url(#chatTitleGrad)" fontSize={20} fontWeight="900" x="0" y={22} letterSpacing="-0.4">
                Messages
              </SvgText>
            </Svg>
            {headerUnread > 0 && (
              <View style={m.unreadChip}>
                <View style={m.unreadDot} />
                <Text style={m.unreadChipText}>{headerUnread} unread</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[m.iconBtnWhite, { backgroundColor: isDark ? tc.inputBg : "#EEF5FF" }]} onPress={() => appAlert("New Chat", "Select a contact to start a new conversation.")}>
            <Ionicons name="create-outline" size={19} color={Colors.brand.blue} />
          </TouchableOpacity>
        </View>
      </View>

      <ConvList
        onSelect={(cid) => {
          const row = conversations.find((c) => c.id === cid);
          if (row) {
            // Clear any stale returnTo from a prior housing/food deep link so
            // the back button doesn't hijack navigation for this conversation.
            if (params.returnTo) router.setParams({ returnTo: "" });
            setSelectedRow(row);
            setSelectedId(cid);
          }
        }}
        bottomInset={insets.bottom}
        conversations={conversations}
        loading={listLoading}
        refreshing={refreshing}
        onRefresh={onRefreshList}
        tab={listTab}
        setTab={setListTab}
      />
    </View>
    </>
  );
}

const m = StyleSheet.create({
  headerWhite: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E6EA",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: rs(6),
    shadowOffset: { width: 0, height: rs(2) },
    elevation: 3,
  },
  iconBtnWhite: {
    width: rs(38), height: rs(38), borderRadius: rs(12),
    backgroundColor: "#EEF5FF",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: rs(20), fontWeight: "900", color: Colors.brand.blue, letterSpacing: -0.4 },
  unreadChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E3F1EA", borderWidth: 1, borderColor: "#BBF7D0",
    paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(12),
    alignSelf: "flex-start", marginTop: rs(4),
    
  },
  unreadDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: Colors.brand.green, marginRight: rs(5) },
  unreadChipText: { fontSize: rs(11), fontWeight: "700", color: Colors.brand.green, letterSpacing: 0.2 },
});
