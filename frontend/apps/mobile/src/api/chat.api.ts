/**
 * Messaging API — Nest `/api/conversations/*`
 */

import { api, ApiError, postFormData } from "./client"; // SPRINT-40: audio upload uses the session-aware multipart helper

export type ConversationStatus = "active" | "pending";
export type ConversationContext = "listing" | "restaurant" | "event" | "dm";

/** Raw conversation from GET /conversations / POST /conversations */
export interface ApiConversationMember {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  isOnline: boolean;
}

export interface ApiLastMessage {
  id: string;
  content: string;
  type: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

export interface ApiConversation {
  id: string;
  type: string;
  title: string | null;
  contextType: string;
  contextId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  members: ApiConversationMember[];
  otherUser: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    isOnline: boolean;
  } | null;
  lastMessage: ApiLastMessage | null;
  unreadCount: number;
  contextLabel: string | null;
}

/** Row shape for the Messages list UI */
export interface ChatListRow {
  id: string;
  name: string;
  lastMsg: string;
  /** The last (non-system) message was sent by the current user — drives the ✓✓ sent marker. */
  lastFromMe: boolean;
  time: string;
  /** ISO ordering timestamp for list sort / real-time updates */ // SPRINT-39:
  updatedAt: string; // SPRINT-39:
  unread: number;
  online: boolean;
  ctx: "Listings" | "Events" | "All";
  verified: boolean;
  isGroup: boolean;
  host?: string;
  eventId?: string;
  /** The listing this chat is about (LISTING conversations). */
  listingId?: string;
  members?: number;
  status: ConversationStatus;
  /** Resolved absolute URL for direct peer avatar, if any */
  avatarUrl?: string;
  /** Peer user ID for 1:1 conversations (used for block/report) */
  recipientId?: string;
  /** Title of the linked listing / event so threads are clearly labelled */
  contextName?: string;
}

export interface ApiMessage {
  id: string;
  content: string;
  type: string;
  isEdited: boolean;
  createdAt: string;
  sender: { id: string; username: string; name: string; avatarUrl: string | null };
  file: { id: string; url: string; mimeType: string } | null;
  imageUrl?: string | null; // SPRINT-40: backend reuses this attachment field for IMAGE and AUDIO
  durationSeconds?: number | null; // SPRINT-40: backend-owned whole-second voice duration
  isOwn: boolean;
}

/** Map Socket.IO `new_message` payload (Nest `MessageResponse`) → `ApiMessage`. */
export function normalizeGatewayMessage(raw: unknown, currentUserId: string): ApiMessage {
  const m = raw as Record<string, unknown>;
  const sender = (m.sender as Record<string, unknown>) || {};
  const createdRaw = m.createdAt;
  let createdAt =
    createdRaw instanceof Date
      ? createdRaw.toISOString()
      : typeof createdRaw === "string"
        ? createdRaw
        : new Date(String(createdRaw)).toISOString();
  if (Number.isNaN(Date.parse(createdAt))) {
    createdAt = new Date().toISOString();
  }
  const imageUrl = (m.imageUrl as string | null | undefined) ?? null;
  const senderId = String(sender.id ?? "");
  const messageType = String(m.type ?? "TEXT"); // SPRINT-40:
  return {
    id: String(m.id ?? ""),
    content: String(m.content ?? ""),
    type: messageType, // SPRINT-40:
    isEdited: Boolean(m.isEdited),
    createdAt,
    sender: {
      id: senderId,
      username: String(sender.username ?? ""),
      name: String(sender.name ?? ""),
      avatarUrl: (sender.avatarUrl as string | null) ?? null,
    },
    file: imageUrl // SPRINT-40: preserve the backend URL and distinguish audio from image metadata
      ? { id: "", url: imageUrl, mimeType: messageType === "AUDIO" ? "audio/mp4" : "image/jpeg" } // SPRINT-40:
      : null, // SPRINT-40:
    imageUrl, // SPRINT-40:
    durationSeconds: // SPRINT-40:
      typeof m.durationSeconds === "number" && Number.isFinite(m.durationSeconds) // SPRINT-40:
        ? Math.round(m.durationSeconds) // SPRINT-40:
        : null, // SPRINT-40:
    isOwn: typeof m.isOwn === "boolean" ? m.isOwn : senderId === currentUserId,
  };
}

export type AudioUploadResponse = { // SPRINT-40:
  url: string; // SPRINT-40:
  key: string; // SPRINT-40:
  size: number; // SPRINT-40:
}; // SPRINT-40:

export type LocalAudioUpload = { // SPRINT-40:
  uri: string; // SPRINT-40:
  fileName: string; // SPRINT-40:
  mimeType: "audio/mp4"; // SPRINT-40:
}; // SPRINT-40:

export interface MessagesPage {
  data: ApiMessage[];
  nextCursor: string | null;
}

export interface StartConversationPayload {
  recipientId?: string;
  recipientName?: string;
  ctx?: ConversationContext;
  contextId?: string;
  contextName?: string;
  message?: string;
}

const CONTEXT_TO_API: Record<ConversationContext, string> = {
  listing: "LISTING",
  restaurant: "GENERAL",
  event: "EVENT",
  dm: "GENERAL",
};

export function formatListTime(iso: string): string {
  // SPRINT-39: exported so conversation_updated can format display time
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Map backend conversation → list row (needs current user for pending + avatar base) */
export function mapConversationToListRow(
  c: ApiConversation,
  currentUserId: string,
  resolveAsset: (path: string | null | undefined) => string
): ChatListRow {
  const myMember = c.members.find((m) => m.userId === currentUserId);
  const pending = myMember?.status === "PENDING";
  const isGroup = c.type === "GROUP";
  const admin = c.members.find((m) => m.role === "ADMIN");
  const lastAt = c.lastMessage?.createdAt ?? c.lastMessageAt ?? c.createdAt;

  let ctx: ChatListRow["ctx"] = "All";
  if (c.contextType === "LISTING") ctx = "Listings";
  else if (c.contextType === "EVENT") ctx = "Events";
  else if (c.contextLabel === "Listings") ctx = "Listings";
  else if (c.contextLabel === "Events") ctx = "Events";

  const name = isGroup ? c.title || "Group chat" : c.otherUser?.name || "Chat";

  const peerAvatar = !isGroup && c.otherUser?.avatarUrl ? resolveAsset(c.otherUser.avatarUrl) : undefined;

  return {
    id: c.id,
    name,
    lastMsg:
      c.lastMessage?.type === "SYSTEM"
        ? c.lastMessage.content
        : c.lastMessage?.content ?? (pending ? "Message request" : "No messages yet"),
    lastFromMe:
      !!c.lastMessage && c.lastMessage.type !== "SYSTEM" && c.lastMessage.senderId === currentUserId,
    time: formatListTime(lastAt),
    updatedAt: lastAt, // SPRINT-39:
    unread: c.unreadCount,
    online: !isGroup && !!c.otherUser?.isOnline,
    ctx,
    verified: c.contextType === "LISTING",
    isGroup,
    host: admin?.name,
    eventId: c.contextType === "EVENT" && c.contextId ? c.contextId : undefined,
    listingId: c.contextType === "LISTING" && c.contextId ? c.contextId : undefined,
    members: isGroup ? c.members.length : undefined,
    status: pending ? "pending" : "active",
    avatarUrl: peerAvatar,
    recipientId: !isGroup && c.otherUser?.id ? String(c.otherUser.id) : undefined,
    contextName: (() => {
      // Use contextLabel if it looks like an actual name (not a generic fallback)
      const label = c.contextLabel?.trim();
      const genericLabels = ["Listing inquiry", "Event inquiry", "Listings", "Events", "General"];
      if (label && !genericLabels.includes(label)) return label;
      // Use conversation title if it's not the peer's display name
      if (c.title && c.title.trim() && c.title.trim() !== (c.otherUser?.name ?? "").trim()) return c.title.trim();
      // Fallback to generic inquiry labels
      if (c.contextType === "LISTING") return "Listing inquiry";
      if (c.contextType === "EVENT") return "Event inquiry";
      if (c.contextType === "GENERAL" && c.contextLabel === "Listings") return "Listing inquiry";
      return undefined;
    })(),
  };
}

export function getConversations(
  filter?: "all" | "listings" | "events",
  search?: string
): Promise<ApiConversation[]> {
  const qs = new URLSearchParams();
  qs.set("type", filter ?? "all");
  const s = search?.trim();
  if (s) qs.set("search", s);
  return api.get<ApiConversation[]>(`/conversations?${qs.toString()}`);
}

export function startOrGetConversation(payload: StartConversationPayload): Promise<ApiConversation> {
  if (!payload.recipientId) {
    return Promise.reject(new Error("recipientId is required"));
  }
  return api.post<ApiConversation>("/conversations", {
    participantId: payload.recipientId,
    contextType: payload.ctx ? CONTEXT_TO_API[payload.ctx] : "GENERAL",
    contextId: payload.contextId,
    title: payload.contextName,
  });
}

export function getConversation(id: string): Promise<ApiConversation> {
  return api.get<ApiConversation>(`/conversations/${id}`);
}

export async function deleteConversation(id: string): Promise<{ message: string }> {
  // SPRINT-27: soft-hide via DELETE /conversations/:id
  return api.delete<{ message: string }>(`/conversations/${id}`);
}

export async function acceptRequest(conversationId: string, currentUserId: string): Promise<unknown> {
  const raw = await api.get<ApiConversation>(`/conversations/${conversationId}`);
  const pending = raw.members?.find((m) => m.userId === currentUserId && m.status === "PENDING");
  if (!pending) {
    throw new Error("No pending request to accept.");
  }
  return api.patch(`/conversations/members/${pending.id}/status`, { status: "ACCEPTED" });
}

export async function declineRequest(conversationId: string, currentUserId: string): Promise<unknown> {
  const raw = await api.get<ApiConversation>(`/conversations/${conversationId}`);
  const pending = raw.members?.find((m) => m.userId === currentUserId && m.status === "PENDING");
  if (!pending) {
    throw new Error("No pending request to decline.");
  }
  return api.patch(`/conversations/members/${pending.id}/status`, { status: "BLOCKED" });
}

export async function getMessages(
  id: string,
  params: { cursor?: string; limit?: number } = {}
): Promise<MessagesPage> {
  const e = new URLSearchParams();
  if (params.cursor) e.set("cursor", params.cursor);
  if (params.limit != null) e.set("limit", String(params.limit));
  const qs = e.toString() ? `?${e.toString()}` : "";
  const raw = await api.get<{ data: ApiMessage[]; nextCursor: string | null }>(
    `/conversations/${id}/messages${qs}`
  );
  return {
    data: raw.data ?? [],
    nextCursor: raw.nextCursor ?? null,
  };
}

export function sendMessage(id: string, text: string): Promise<ApiMessage> {
  return api.post<ApiMessage>(`/conversations/${id}/messages`, { content: text });
}

export async function uploadConversationAudio(file: LocalAudioUpload): Promise<AudioUploadResponse> { // SPRINT-40:
  const form = new FormData(); // SPRINT-40:
  form.append("file", { // SPRINT-40: exact backend multipart field
    uri: file.uri, // SPRINT-40:
    name: file.fileName, // SPRINT-40:
    type: file.mimeType, // SPRINT-40:
  } as unknown as Blob); // SPRINT-40: React Native's FormData file object differs from DOM Blob typing
  return postFormData<AudioUploadResponse>("/conversations/audio/upload", form); // SPRINT-40:
} // SPRINT-40:

export function sendAudioMessage( // SPRINT-40:
  id: string, // SPRINT-40:
  audioUrl: string, // SPRINT-40:
  durationSeconds: number, // SPRINT-40:
): Promise<ApiMessage> { // SPRINT-40:
  return api.post<ApiMessage>(`/conversations/${id}/messages`, { // SPRINT-40:
    type: "AUDIO", // SPRINT-40:
    audioUrl, // SPRINT-40: use upload response unchanged
    durationSeconds, // SPRINT-40:
  }); // SPRINT-40:
} // SPRINT-40:

export function describeAudioUploadError(error: unknown): string { // SPRINT-40:
  const backendMessage = error instanceof ApiError ? error.message : error instanceof Error ? error.message : String(error); // SPRINT-40:
  console.warn("[Sprint 40] Audio upload/send failed:", backendMessage); // SPRINT-40: retain backend reason for diagnostics
  if (/content mismatch|magic|container|declared.*type/i.test(backendMessage)) { // SPRINT-40:
    return "The recording format did not match its declared audio type. Please update ComLinkr before retrying."; // SPRINT-40:
  } // SPRINT-40:
  if (/unsupported.*(media|mime|audio)|media type/i.test(backendMessage)) { // SPRINT-40:
    return "This recording format is not supported."; // SPRINT-40:
  } // SPRINT-40:
  if (/15\s*(mib|mb)|too large|file size|limit/i.test(backendMessage) || (error instanceof ApiError && error.status === 413)) { // SPRINT-40:
    return "This voice message is larger than the 15 MiB upload limit."; // SPRINT-40:
  } // SPRINT-40:
  return "Voice message upload failed. Check your connection and retry."; // SPRINT-40:
} // SPRINT-40:

export function deleteMessage(_conversationId: string, _messageId: string): Promise<void> {
  return Promise.reject(new Error("Delete message is not available on this API version."));
}

export function markConversationRead(id: string): Promise<void> {
  return api.patch(`/conversations/${id}/read`);
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const r = await api.get<{ unreadCount: number }>("/conversations/unread-count");
  return { count: r.unreadCount };
}
