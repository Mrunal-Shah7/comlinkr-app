import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle, Home, Search, Send, ArrowLeft, CheckCircle2,
  MoreVertical, Phone, Video, Smile, Paperclip, ChevronRight,
  Sparkles, X, Users, Calendar, Check, CheckCheck,
} from "lucide-react";
import { mockListings } from "../../../shared/data/mock/mockListings";
import { Listing } from "../../housing/housing.types";

/* ─────────────── Types ─────────────── */

type StoredMessage = {
  id: string;
  text: string;
  isMe: boolean;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  senderName?: string;
};

type ChatThread = {
  id: string;
  kind: "listing" | "event";
  title: string;
  subtitle: string;
  verified: boolean;
  avatar?: string;
  messages: StoredMessage[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  image: string;
  meta?: string;
  onlineNow: boolean;
  listingId?: string;
  price?: number;
  landlordName?: string;
  eventId?: string;
  hostName?: string;
  attendeeCount?: number;
};

/* ─────────────── Storage Keys ─────────────── */

const LISTING_CHAT_PREFIX = "comlinkr_listing_chats_";
const EVENT_CHAT_PREFIX = "comlinkr_event_chat_";
const CHAT_CHANNEL_NAME = "comlinkr_chat_sync";

/* ─────────────── Helpers ─────────────── */

function timeNow() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getAllListings(): Listing[] {
  try {
    const stored = localStorage.getItem("comlinkr_listings");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return mockListings;
}

/* ─────────────── Component ─────────────── */

export default function ChatPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "listings" | "events">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  /* ───── BroadcastChannel for cross-tab real-time sync ───── */
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(CHAT_CHANNEL_NAME);
      channelRef.current.onmessage = () => { loadChats(); };
    } catch { /* Safari fallback — ignored */ }
    return () => { channelRef.current?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const broadcastUpdate = useCallback(() => {
    try { channelRef.current?.postMessage({ type: "chat-updated" }); } catch { /* ignore */ }
  }, []);

  /* ───── Load all chats from localStorage ───── */
  const loadChats = useCallback(() => {
    const allThreads: ChatThread[] = [];
    const listings = getAllListings();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // ── Listing chats ──
      if (key.startsWith(LISTING_CHAT_PREFIX)) {
        const listingId = key.replace(LISTING_CHAT_PREFIX, "");
        const stored = localStorage.getItem(key);
        if (!stored) continue;
        try {
          const messages: StoredMessage[] = JSON.parse(stored);
          if (messages.length === 0) continue;
          const listing = listings.find(l => l.id === listingId);
          if (!listing) continue;
          const lastMsg = messages[messages.length - 1];
          const unread = messages.filter(m => !m.isMe && m.status !== "read").length;

          allThreads.push({
            id: key,
            kind: "listing",
            title: listing.title,
            subtitle: listing.landlord?.name || "Landlord",
            verified: listing.landlord?.verified || false,
            avatar: listing.landlord?.avatar,
            messages,
            lastMessage: lastMsg.text,
            lastMessageTime: lastMsg.timestamp,
            unreadCount: Math.min(unread, 9),
            image: listing.images?.[0] || "",
            meta: `$${listing.price}/mo`,
            onlineNow: Math.random() > 0.3,
            listingId,
            price: listing.price,
            landlordName: listing.landlord?.name,
          });
        } catch { /* skip */ }
      }

      // ── Event chats ──
      if (key.startsWith(EVENT_CHAT_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (!stored) continue;
        try {
          const data = JSON.parse(stored);
          const messages: StoredMessage[] = data.messages || [];
          if (messages.length === 0) continue;
          const lastMsg = messages[messages.length - 1];
          const unread = messages.filter((m: StoredMessage) => !m.isMe && m.status !== "read").length;

          allThreads.push({
            id: key,
            kind: "event",
            title: data.eventTitle || "Event Chat",
            subtitle: `Hosted by ${data.hostName || "Unknown"}`,
            verified: false,
            messages,
            lastMessage: lastMsg.text,
            lastMessageTime: lastMsg.timestamp,
            unreadCount: Math.min(unread, 9),
            image: data.eventImage || "",
            meta: `${data.attendeeCount || messages.length} members`,
            onlineNow: true,
            eventId: data.eventId,
            hostName: data.hostName,
            attendeeCount: data.attendeeCount || 0,
          });
        } catch { /* skip */ }
      }
    }

    // Sort newest first
    allThreads.sort((a, b) => {
      const tA = a.messages[a.messages.length - 1]?.timestamp || "";
      const tB = b.messages[b.messages.length - 1]?.timestamp || "";
      return tB.localeCompare(tA);
    });

    setThreads(allThreads);

    // Keep selected thread in sync
    setSelectedThread(prev => {
      if (!prev) return null;
      const updated = allThreads.find(t => t.id === prev.id);
      return updated || prev;
    });
  }, []);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 1500);
    const onStorage = () => loadChats();
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(interval); window.removeEventListener("storage", onStorage); };
  }, [loadChats]);

  /* ───── Auto-scroll ───── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedThread?.messages.length]);

  /* ───── Mark messages as read when opening a thread ───── */
  useEffect(() => {
    if (!selectedThread) return;
    const stored = localStorage.getItem(selectedThread.id);
    if (!stored) return;
    try {
      if (selectedThread.kind === "listing") {
        const msgs: StoredMessage[] = JSON.parse(stored);
        const updated = msgs.map(m => (!m.isMe ? { ...m, status: "read" as const } : m));
        localStorage.setItem(selectedThread.id, JSON.stringify(updated));
      } else {
        const data = JSON.parse(stored);
        data.messages = (data.messages || []).map((m: StoredMessage) =>
          !m.isMe ? { ...m, status: "read" as const } : m
        );
        localStorage.setItem(selectedThread.id, JSON.stringify(data));
      }
      broadcastUpdate();
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread?.id]);

  /* ───── Send message ───── */
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedThread) return;

    const userMessage: StoredMessage = {
      id: `m${Date.now()}`,
      text: newMessage.trim(),
      isMe: true,
      timestamp: timeNow(),
      status: "sent",
      senderName: "You",
    };

    let updatedMessages: StoredMessage[];

    if (selectedThread.kind === "listing") {
      updatedMessages = [...selectedThread.messages, userMessage];
      localStorage.setItem(selectedThread.id, JSON.stringify(updatedMessages));
    } else {
      const stored = localStorage.getItem(selectedThread.id);
      const data = stored ? JSON.parse(stored) : { messages: [] };
      data.messages = [...(data.messages || []), userMessage];
      updatedMessages = data.messages;
      localStorage.setItem(selectedThread.id, JSON.stringify(data));
    }

    setSelectedThread(prev => prev ? {
      ...prev,
      messages: updatedMessages,
      lastMessage: userMessage.text,
      lastMessageTime: userMessage.timestamp,
    } : null);

    setNewMessage("");
    broadcastUpdate();

    // Simulate "delivered" after 800ms
    const threadSnapshot = { ...selectedThread };
    setTimeout(() => {
      markStatus(threadSnapshot, userMessage.id, "delivered");
    }, 800);

    // Simulate "read" after 1.5s
    setTimeout(() => {
      markStatus(threadSnapshot, userMessage.id, "read");
    }, 1500);

    // Simulate typing + reply
    setIsTyping(true);
    const delay = 1800 + Math.random() * 1500;
    setTimeout(() => {
      setIsTyping(false);
      simulateReply(threadSnapshot);
    }, delay);
  };

  /* ───── Update message delivery status ───── */
  const markStatus = (thread: ChatThread, msgId: string, status: "delivered" | "read") => {
    try {
      if (thread.kind === "listing") {
        const stored = localStorage.getItem(thread.id);
        if (!stored) return;
        const msgs: StoredMessage[] = JSON.parse(stored);
        const idx = msgs.findIndex(m => m.id === msgId);
        if (idx !== -1) msgs[idx].status = status;
        localStorage.setItem(thread.id, JSON.stringify(msgs));
      } else {
        const stored = localStorage.getItem(thread.id);
        if (!stored) return;
        const data = JSON.parse(stored);
        const idx = (data.messages as StoredMessage[]).findIndex(m => m.id === msgId);
        if (idx !== -1) data.messages[idx].status = status;
        localStorage.setItem(thread.id, JSON.stringify(data));
      }
      broadcastUpdate();
      loadChats();
    } catch { /* ignore */ }
  };

  /* ───── Simulate reply ───── */
  const simulateReply = (thread: ChatThread) => {
    const listingResponses = [
      "Thanks for your interest! The place is still available 🏡",
      "Great question — I'll check and get back to you shortly!",
      "I can show you the apartment this weekend. Does Saturday afternoon work?",
      "The neighborhood is wonderful! Lots of restaurants and shops nearby 🍕",
      "Yes, utilities are included in the rent. Let me know if you have other questions!",
      "I just updated the listing photos. Take another look!",
    ];

    const eventResponses = [
      "Excited for the event! Can't wait to see everyone 🎉",
      "Does anyone know if there's parking nearby?",
      "I'll be bringing snacks! Who else is contributing?",
      "Great event — thanks for organizing this! 🙌",
      "Is there a dress code or is it casual?",
      "Running a few minutes late but I'll be there!",
      "Just confirmed my spot. See you all there! 😊",
      "Anyone else coming from downtown? Let's share a ride!",
    ];

    const attendeeNames = ["Alex R.", "Sam K.", "Jordan L.", "Taylor M.", "Casey N.", "Morgan W.", "Riley P.", "Jamie S."];
    const isEvent = thread.kind === "event";
    const responses = isEvent ? eventResponses : listingResponses;
    const senderName = isEvent
      ? attendeeNames[Math.floor(Math.random() * attendeeNames.length)]
      : (thread.landlordName || thread.subtitle);

    const reply: StoredMessage = {
      id: `m${Date.now()}`,
      text: responses[Math.floor(Math.random() * responses.length)],
      isMe: false,
      timestamp: timeNow(),
      status: "delivered",
      senderName,
    };

    try {
      if (thread.kind === "listing") {
        const stored = localStorage.getItem(thread.id);
        const msgs: StoredMessage[] = stored ? JSON.parse(stored) : [];
        msgs.push(reply);
        localStorage.setItem(thread.id, JSON.stringify(msgs));
      } else {
        const stored = localStorage.getItem(thread.id);
        const data = stored ? JSON.parse(stored) : { messages: [] };
        data.messages.push(reply);
        localStorage.setItem(thread.id, JSON.stringify(data));
      }
      broadcastUpdate();
      loadChats();
    } catch { /* ignore */ }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* ───── Filters ───── */
  const filteredThreads = threads.filter(t => {
    if (activeTab === "listings" && t.kind !== "listing") return false;
    if (activeTab === "events" && t.kind !== "event") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q);
    }
    return true;
  });

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  /* ═══════════════════════════════════════════════════
     ███  CONVERSATION VIEW — Full-screen chat
     ═══════════════════════════════════════════════════ */
  if (selectedThread) {
    const isEvent = selectedThread.kind === "event";
    const headerGradient = isEvent
      ? "from-[#FF7B00] to-[#e06800]"
      : "from-[#0076EB] to-[#0056b3]";

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
        <div className="mx-auto w-full max-w-[430px] flex flex-col h-full bg-white shadow-xl">
          {/* Chat Header */}
          <div className={`bg-gradient-to-r ${headerGradient} px-4 py-3 text-white safe-top`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedThread(null)}
                  className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  {selectedThread.image ? (
                    <img
                      src={selectedThread.image}
                      alt={selectedThread.title}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/30 ${isEvent ? "bg-orange-400" : "bg-blue-400"}`}>
                      {isEvent ? <Calendar className="w-5 h-5 text-white" /> : <Home className="w-5 h-5 text-white" />}
                    </div>
                  )}
                  {selectedThread.onlineNow && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2" style={{ borderColor: isEvent ? "#FF7B00" : "#0076EB" }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">
                      {isEvent ? selectedThread.title : selectedThread.subtitle}
                    </span>
                    {selectedThread.verified && (
                      <CheckCircle2 className="w-4 h-4 text-green-300 flex-shrink-0" />
                    )}
                    {isEvent && (
                      <span className="flex items-center gap-0.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                        <Users className="w-3 h-3" /> Group
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 truncate">
                    {isEvent ? selectedThread.subtitle : selectedThread.title}
                    {selectedThread.onlineNow && (
                      <span className="ml-1.5 text-green-300">• Online</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isEvent && (
                  <>
                    <button className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors">
                      <Video className="w-5 h-5" />
                    </button>
                  </>
                )}
                {isEvent && (
                  <button className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors">
                    <Users className="w-5 h-5" />
                  </button>
                )}
                <button className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Listing Quick Info */}
          {!isEvent && selectedThread.listingId && (
            <button
              onClick={() => navigate(`/app/housing/${selectedThread.listingId}`)}
              className="bg-white border-b px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <img
                src={selectedThread.image}
                alt={selectedThread.title}
                className="w-11 h-11 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{selectedThread.title}</p>
                <p className="text-xs text-[#0076EB] font-semibold">{selectedThread.meta}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </button>
          )}

          {/* Event Info Bar */}
          {isEvent && (
            <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <p className="text-xs text-orange-700 font-medium flex-1 truncate">{selectedThread.title}</p>
              <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Users className="w-3 h-3" /> {selectedThread.meta}
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {selectedThread.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}
              >
                <div className="flex items-end gap-2 max-w-[85%]">
                  {!message.isMe && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      isEvent ? "bg-gradient-to-br from-[#FF7B00] to-[#e06800]" : "bg-gradient-to-br from-[#0076EB] to-[#26B324]"
                    }`}>
                      {(message.senderName || selectedThread.subtitle).charAt(0)}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.isMe
                        ? `bg-gradient-to-r ${headerGradient} text-white rounded-br-lg`
                        : "bg-white text-gray-900 shadow-sm rounded-bl-lg"
                    }`}
                  >
                    {/* Sender name in group chats */}
                    {isEvent && !message.isMe && message.senderName && (
                      <p className="text-[10px] font-bold text-orange-500 mb-0.5">{message.senderName}</p>
                    )}
                    <p className="text-[15px] leading-relaxed">{message.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${message.isMe ? "justify-end" : ""}`}>
                      <span className={`text-[10px] ${message.isMe ? "text-white/60" : "text-gray-400"}`}>
                        {message.timestamp}
                      </span>
                      {/* Read receipts */}
                      {message.isMe && (
                        <span className="flex-shrink-0">
                          {message.status === "read" ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                          ) : message.status === "delivered" ? (
                            <CheckCheck className="w-3.5 h-3.5 text-white/50" />
                          ) : (
                            <Check className="w-3 h-3 text-white/40" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    isEvent ? "bg-gradient-to-br from-[#FF7B00] to-[#e06800]" : "bg-gradient-to-br from-[#0076EB] to-[#26B324]"
                  }`}>
                    {selectedThread.subtitle.charAt(0)}
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-lg px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="bg-white border-t px-3 py-3 safe-bottom">
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#0076EB] hover:bg-gray-100 rounded-full transition-colors">
                <Smile className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#0076EB] hover:bg-gray-100 rounded-full transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isEvent ? "Message the group..." : "Type a message..."}
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`w-10 h-10 flex items-center justify-center text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all bg-gradient-to-r ${headerGradient}`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     ███  THREADS LIST VIEW
     ═══════════════════════════════════════════════════ */
  return (
    <div className="-mx-4 -mt-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0076EB] via-[#0066cc] to-[#0056b3] px-5 pt-6 pb-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {threads.length > 0
                ? `${threads.length} conversation${threads.length !== 1 ? "s" : ""}${totalUnread > 0 ? ` • ${totalUnread} unread` : ""}`
                : "Chat with landlords & event groups"}
            </p>
          </div>
          <div className="relative w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#0076EB]">
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs: All / Listings / Events */}
      <div className="flex gap-2 px-5 -mt-4">
        {(["all", "listings", "events"] as const).map(tab => {
          const count = tab === "all" ? threads.length : threads.filter(t => t.kind === (tab === "listings" ? "listing" : "event")).length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm ${
                isActive
                  ? "bg-white text-[#0076EB] shadow-md"
                  : "bg-white/60 text-gray-600 hover:bg-white/80"
              }`}
            >
              {tab === "all" && <MessageCircle className="w-3.5 h-3.5" />}
              {tab === "listings" && <Home className="w-3.5 h-3.5" />}
              {tab === "events" && <Calendar className="w-3.5 h-3.5" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {count > 0 && (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive ? "bg-[#0076EB] text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Threads List */}
      <div className="px-4 py-4">
        {filteredThreads.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
              <MessageCircle className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {activeTab === "events" ? "No event chats yet" : activeTab === "listings" ? "No listing chats yet" : "No conversations yet"}
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              {activeTab === "events"
                ? "Join an event chat from the Feed page"
                : "Start chatting by browsing listings or events"
              }
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/app/housing")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0076EB] to-[#0056b3] text-white rounded-2xl font-semibold hover:shadow-lg transition-all text-sm"
              >
                <Home className="w-4 h-4" /> Listings
              </button>
              <button
                onClick={() => navigate("/app/feed")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF7B00] to-[#e06800] text-white rounded-2xl font-semibold hover:shadow-lg transition-all text-sm"
              >
                <Calendar className="w-4 h-4" /> Events
              </button>
            </div>

            <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 text-left">
                  <strong>Tip:</strong> Click "Chat" on any listing or "Join Event Chat" on events to start a real-time conversation
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredThreads.map((thread) => {
              const isEvt = thread.kind === "event";
              return (
                <button
                  key={thread.id}
                  className="w-full p-3.5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-[#0076EB]/30 text-left group"
                  onClick={() => setSelectedThread(thread)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {thread.image ? (
                        <img
                          src={thread.image}
                          alt={thread.title}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          isEvt ? "bg-gradient-to-br from-orange-100 to-orange-50" : "bg-gradient-to-br from-blue-100 to-blue-50"
                        }`}>
                          {isEvt ? <Calendar className="w-6 h-6 text-orange-500" /> : <Home className="w-6 h-6 text-[#0076EB]" />}
                        </div>
                      )}
                      {/* Online dot */}
                      {thread.onlineNow && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                      )}
                      {/* Type badge */}
                      <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
                        isEvt ? "bg-orange-500" : "bg-[#0076EB]"
                      }`}>
                        {isEvt ? <Calendar className="w-2.5 h-2.5 text-white" /> : <Home className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-gray-900 text-sm truncate">
                            {isEvt ? thread.title : thread.subtitle}
                          </span>
                          {thread.verified && (
                            <CheckCircle2 className="w-4 h-4 text-[#0076EB] flex-shrink-0" />
                          )}
                          {isEvt && (
                            <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                              GROUP
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{thread.lastMessageTime}</span>
                      </div>
                      <p className={`text-xs font-semibold truncate mb-1 ${isEvt ? "text-orange-500" : "text-[#0076EB]"}`}>
                        {isEvt ? thread.subtitle : thread.title}
                        {thread.meta && <span className="text-gray-400 font-normal ml-1.5">· {thread.meta}</span>}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{thread.lastMessage}</p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-r ${
                        isEvt ? "from-[#FF7B00] to-[#e06800]" : "from-[#0076EB] to-[#26B324]"
                      }`}>
                        <span className="text-[11px] font-bold text-white">{thread.unreadCount}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      {threads.length > 0 && (
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-40">
          <button
            onClick={() => navigate("/app/feed")}
            className="w-12 h-12 bg-gradient-to-r from-[#FF7B00] to-[#e06800] rounded-2xl shadow-lg flex items-center justify-center text-white hover:shadow-xl hover:scale-105 transition-all"
            title="Browse Events"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/app/housing")}
            className="w-12 h-12 bg-gradient-to-r from-[#0076EB] to-[#26B324] rounded-2xl shadow-lg flex items-center justify-center text-white hover:shadow-xl hover:scale-105 transition-all"
            title="Browse Listings"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
