/**
 * Socket.IO client for Nest `MessagingGateway` namespace `/chat`.
 * Auth: same session cookie as REST (`getSessionCookie`).
 * Exactly one connection per authenticated session — shared by list + thread.
 * // SPRINT-39: centralised ownership, subscribe/emit surface, connection state
 */

import { io, type Socket } from "socket.io-client";
import { getSessionCookie } from "../api/client";

export type MessagingConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"; // SPRINT-39:

type EventHandler = (...args: unknown[]) => void;

function getApiOrigin(): string {
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
  return base.endsWith("/api") ? base.slice(0, -4) : base;
}

let socket: Socket | null = null;
let connectPromise: Promise<Socket | null> | null = null;
let connectionState: MessagingConnectionState = "disconnected"; // SPRINT-39:
const stateListeners = new Set<(state: MessagingConnectionState) => void>(); // SPRINT-39:
/** Handlers registered via subscribe — survive reconnect and pre-connect subscribe. */ // SPRINT-39:
const subscriptions = new Map<string, Set<EventHandler>>(); // SPRINT-39:

function setConnectionState(next: MessagingConnectionState): void {
  // SPRINT-39:
  if (connectionState === next) return;
  connectionState = next;
  stateListeners.forEach((l) => {
    try {
      l(next);
    } catch {
      /* ignore */
    }
  });
}

function attachSubscriptionHandlers(s: Socket): void {
  // SPRINT-39: bind every named subscription to this socket instance
  for (const [event, handlers] of subscriptions) {
    for (const handler of handlers) {
      s.on(event, handler);
    }
  }
}

function wireLifecycle(s: Socket): void {
  // SPRINT-39:
  s.on("connect", () => {
    setConnectionState("connected");
  });
  s.on("disconnect", (_reason: string) => {
    // Reconnecting sockets briefly disconnect; keep "connecting" while reconnection is active.
    if (s.active) {
      setConnectionState("connecting");
    } else {
      setConnectionState("disconnected");
    }
  });
  s.on("connect_error", () => {
    setConnectionState("error");
  });
  s.io.on("reconnect", () => {
    // SPRINT-39: server rejoins rooms on reconnect; client only needs connection itself
    setConnectionState("connected");
  });
}

export function getMessagingConnectionState(): MessagingConnectionState {
  // SPRINT-39:
  return connectionState;
}

export function onMessagingConnectionStateChange(
  listener: (state: MessagingConnectionState) => void,
): () => void {
  // SPRINT-39: expose state for optional offline UI (not built this sprint)
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function getMessagingSocket(): Socket | null {
  return socket?.connected ? socket : null;
}

/**
 * Establish the shared connection once auth is confirmed.
 * Idempotent when already connected / connecting.
 */
export async function connectMessagingSocket(): Promise<Socket | null> {
  // SPRINT-39:
  if (socket?.connected) {
    setConnectionState("connected");
    return socket;
  }

  if (connectPromise) return connectPromise;

  setConnectionState("connecting");

  connectPromise = (async () => {
    try {
      const cookie = await getSessionCookie();
      if (!cookie?.trim()) {
        connectPromise = null;
        setConnectionState("disconnected");
        return null;
      }

      const origin = getApiOrigin();
      const opts: Parameters<typeof io>[1] = {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 1000,
        timeout: 25000,
        extraHeaders: {
          Cookie: cookie,
        },
      };

      const s = io(`${origin}/chat`, opts);

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("socket connect timeout")), 25000);
        s.once("connect", () => {
          clearTimeout(t);
          resolve();
        });
        s.once("connect_error", (err: Error) => {
          clearTimeout(t);
          reject(err);
        });
      });

      wireLifecycle(s);
      attachSubscriptionHandlers(s);
      socket = s;
      connectPromise = null;
      setConnectionState("connected");
      return s;
    } catch {
      connectPromise = null;
      if (socket) {
        try {
          socket.disconnect();
        } catch {
          /* ignore */
        }
        socket = null;
      }
      setConnectionState("error");
      return null;
    }
  })();

  return connectPromise;
}

/** @deprecated Prefer connectMessagingSocket — kept for call-site compatibility during migration. */ // SPRINT-39:
export async function getOrConnectMessagingSocket(): Promise<Socket | null> {
  return connectMessagingSocket();
}

export function disconnectMessagingSocket(): void {
  connectPromise = null;
  if (socket) {
    try {
      // SPRINT-39: do not wipe the subscriptions Map — only detach from this socket instance
      for (const [event, handlers] of subscriptions) {
        for (const handler of handlers) {
          socket.off(event, handler);
        }
      }
      socket.removeAllListeners();
      socket.disconnect();
    } catch {
      /* ignore */
    }
    socket = null;
  }
  setConnectionState("disconnected");
}

/**
 * Subscribe to a named server event. Works whether or not the socket is connected yet;
 * the handler is attached when the connection is established and survives reconnect
 * when the same socket instance reconnects (listeners remain), or is re-attached on a new connect.
 * Returns an unsubscribe function. Does not disconnect the socket.
 */
export function subscribeMessagingEvent(event: string, handler: EventHandler): () => void {
  // SPRINT-39:
  let set = subscriptions.get(event);
  if (!set) {
    set = new Set();
    subscriptions.set(event, set);
  }
  set.add(handler);
  socket?.on(event, handler);

  return () => {
    set!.delete(handler);
    if (set!.size === 0) subscriptions.delete(event);
    socket?.off(event, handler);
  };
}

export function emitMessagingEvent(event: string, payload?: unknown): void {
  // SPRINT-39:
  if (!socket?.connected) return;
  if (payload === undefined) {
    socket.emit(event);
  } else {
    socket.emit(event, payload);
  }
}

export function joinConversationRoom(conversationId: string): void {
  emitMessagingEvent("join_conversation", { conversationId }); // SPRINT-39:
}

export function leaveConversationRoom(conversationId: string): void {
  emitMessagingEvent("leave_conversation", { conversationId }); // SPRINT-39:
}

export type NewMessageSocketPayload = {
  conversationId: string;
  message: unknown;
};

/** Server → personal user room (Sprint 36). */ // SPRINT-39:
export type ConversationUpdatedSocketPayload = {
  conversationId: string;
  messagePreview: string;
  unreadCount: number;
  updatedAt: string;
  /** Plan 09: a message was deleted; reload the row instead of moving it to the top. */
  removed?: boolean;
};

/** Server → conversation room: a message was deleted by its sender or removed by an admin (plan 09, Sprint 53). */
export type MessageRemovedSocketPayload = { conversationId: string; messageId: string };

/** Server → conversation room excluding sender (Sprint 36). */ // SPRINT-39:
export type TypingIndicatorPayload = {
  conversationId: string;
  userId: string;
  displayName: string;
};

export type TypingStoppedPayload = {
  conversationId: string;
  userId: string;
  displayName?: string;
};
