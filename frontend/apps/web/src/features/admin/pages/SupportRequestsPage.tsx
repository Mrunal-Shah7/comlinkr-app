import { useState, useEffect } from "react";
import {
  Headphones, Search, Clock, CheckCircle2,
  XCircle, ChevronRight, AlertTriangle, User, Mail,
  Tag, Send, RefreshCw, HelpCircle,
} from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";
type TicketCategory = "all" | "billing" | "technical" | "listing" | "account" | "abuse" | "other";

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  email: string;
  category: Exclude<TicketCategory, "all">;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  adminResponse?: string;
}

const SEED_TICKETS: SupportTicket[] = [
  { id: "t001", userId: "user_001", userName: "Alex P.", userAvatar: "AP", email: "alex.p@email.com", category: "listing", subject: "Listing removed without reason", message: "My housing listing was removed without any notification. I verified the listing and it met all guidelines. Please review.", status: "open", priority: "high", createdAt: "Mar 6, 2026 08:30", updatedAt: "Mar 6, 2026 08:30" },
  { id: "t002", userId: "user_002", userName: "Maria L.", userAvatar: "ML", email: "maria.l@email.com", category: "account", subject: "Cannot reset my password", message: "I'm trying to reset my password but the reset email is not arriving. I've tried 3 times already.", status: "in_progress", priority: "medium", createdAt: "Mar 5, 2026 14:00", updatedAt: "Mar 5, 2026 16:30", assignedTo: "Admin User", adminResponse: "Hi Maria, we're looking into this issue. Please check your spam folder and try again." },
  { id: "t003", userId: "landlord_3", userName: "Robert Kim", userAvatar: "RK", email: "robert.kim@comlinkr.com", category: "listing", subject: "Verification taking too long", message: "I submitted my landlord verification documents over a week ago and still haven't heard back. Can you please expedite this?", status: "open", priority: "medium", createdAt: "Mar 4, 2026 11:00", updatedAt: "Mar 4, 2026 11:00" },
  { id: "t004", userId: "restaurant_4", userName: "Thai Orchid", userAvatar: "TO", email: "owner@thaiorchid.com", category: "technical", subject: "App crashes when uploading photos", message: "Every time I try to upload a photo for my restaurant listing, the app crashes on iOS. I'm using iPhone 15 Pro.", status: "in_progress", priority: "high", createdAt: "Mar 3, 2026 16:45", updatedAt: "Mar 5, 2026 09:00", assignedTo: "Tech Team" },
  { id: "t005", userId: "user_001", userName: "Alex P.", userAvatar: "AP", email: "alex.p@email.com", category: "abuse", subject: "User harassing me in chat", message: "A user has been sending threatening messages. Please take action. I've attached screenshots.", status: "open", priority: "urgent", createdAt: "Mar 6, 2026 10:00", updatedAt: "Mar 6, 2026 10:00" },
  { id: "t006", userId: "user_003", userName: "Emily R.", userAvatar: "ER", email: "emily.r@email.com", category: "other", subject: "How do I find a roommate?", message: "I'm new to the app. Can you explain how the roommate matching feature works?", status: "resolved", priority: "low", createdAt: "Feb 28, 2026 09:00", updatedAt: "Mar 1, 2026 10:00", assignedTo: "Admin User", adminResponse: "Hi Emily! You can find roommates by visiting the Roommates section in the app. Use filters for budget, location and preferences. Hope this helps!" },
  { id: "t007", userId: "landlord_1", userName: "Sarah Johnson", userAvatar: "SJ", email: "sarah.johnson@comlinkr.com", category: "billing", subject: "Charged twice for premium listing", message: "My credit card was charged twice for the same premium listing upgrade. Please refund one of the charges.", status: "resolved", priority: "high", createdAt: "Feb 25, 2026 13:00", updatedAt: "Feb 26, 2026 11:00", adminResponse: "We've identified the duplicate charge and processed a refund. It should appear in 3-5 business days." },
];

const STATUS_CONFIG: Record<TicketStatus, { bg: string; text: string; label: string; icon: typeof Clock }> = {
  open: { bg: "bg-blue-100", text: "text-blue-700", label: "Open", icon: HelpCircle },
  in_progress: { bg: "bg-yellow-100", text: "text-yellow-700", label: "In Progress", icon: Clock },
  resolved: { bg: "bg-green-100", text: "text-green-700", label: "Resolved", icon: CheckCircle2 },
  closed: { bg: "bg-gray-100", text: "text-gray-600", label: "Closed", icon: XCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-gray-100", text: "text-gray-600", label: "Low" },
  medium: { bg: "bg-blue-100", text: "text-blue-700", label: "Medium" },
  high: { bg: "bg-orange-100", text: "text-orange-700", label: "High" },
  urgent: { bg: "bg-red-100", text: "text-red-700", label: "Urgent" },
};

const CATEGORY_LABELS: Record<Exclude<TicketCategory, "all">, string> = {
  billing: "Billing", technical: "Technical", listing: "Listing", account: "Account", abuse: "Abuse/Safety", other: "Other",
};

function loadSupportTickets(): SupportTicket[] {
  const tickets = [...SEED_TICKETS];
  try {
    const stored = JSON.parse(localStorage.getItem("comlinkr_support_requests") || "[]") as any[];
    for (const t of stored) {
      tickets.push({
        id: `ls_${t.id || Date.now()}`,
        userId: t.userId || "unknown",
        userName: t.userName || t.name || "Unknown User",
        userAvatar: (t.userName || t.name || "U").slice(0, 2).toUpperCase(),
        email: t.email || "N/A",
        category: (t.category as SupportTicket["category"]) || "other",
        subject: t.subject || "Support Request",
        message: t.message || t.description || "",
        status: "open",
        priority: (t.priority as TicketPriority) || "medium",
        createdAt: t.createdAt || "Recently",
        updatedAt: t.createdAt || "Recently",
      });
    }
  } catch {}
  return tickets;
}

export default function SupportRequestsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory>("all");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => { setTickets(loadSupportTickets()); }, []);

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchCat = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status === "open").length;

  const handleStatusChange = (id: string, status: TicketStatus) => {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status, updatedAt: "Just now" } : t));
  };

  const handleReply = (id: string) => {
    const reply = replyText[id];
    if (!reply?.trim()) return;
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: "in_progress", adminResponse: reply, updatedAt: "Just now", assignedTo: "Admin User" }
          : t
      )
    );
    setReplyText((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Support Requests</h2>
          <p className="text-sm text-gray-500 mt-1">Manage user support tickets and inquiries</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> {urgentCount} urgent
            </span>
          )}
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            <HelpCircle className="w-3.5 h-3.5" /> {openCount} open
          </span>
          {inProgressCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
              <Clock className="w-3.5 h-3.5" /> {inProgressCount} in progress
            </span>
          )}
          <button
            onClick={() => setTickets(loadSupportTickets())}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full hover:bg-gray-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map((status) => {
          const conf = STATUS_CONFIG[status];
          const count = tickets.filter((t) => t.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
              className={`p-4 rounded-xl border text-left transition ${statusFilter === status ? "border-[#0076EB] bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}
            >
              <div className={`w-8 h-8 rounded-lg ${conf.bg} flex items-center justify-center mb-2`}>
                <conf.icon className={`w-4 h-4 ${conf.text}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className={`text-xs font-semibold mt-1 ${conf.text}`}>{conf.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by subject, user or email..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-4 h-4 text-gray-400" />
          {(["all", "billing", "technical", "listing", "account", "abuse", "other"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                categoryFilter === cat ? "bg-[#0076EB] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filtered.map((ticket) => {
          const statusConf = STATUS_CONFIG[ticket.status];
          const priorityConf = PRIORITY_CONFIG[ticket.priority];
          const isExpanded = expandedTicket === ticket.id;

          return (
            <div
              key={ticket.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                ticket.priority === "urgent" && ticket.status === "open"
                  ? "border-red-200"
                  : ticket.status === "open" ? "border-blue-100" : "border-gray-100"
              }`}
            >
              {/* Ticket Row */}
              <button
                onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                className="w-full px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  {ticket.userAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ticket.userName} · {ticket.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${priorityConf.bg} ${priorityConf.text}`}>
                        {priorityConf.label}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusConf.bg} ${statusConf.text}`}>
                        {statusConf.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600`}>
                      {CATEGORY_LABELS[ticket.category]}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ticket.createdAt}
                    </span>
                    {ticket.assignedTo && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3" /> {ticket.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition ${isExpanded ? "rotate-90" : ""}`} />
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  {/* Message */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">User Message</p>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {ticket.userAvatar}
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 flex-1">{ticket.message}</p>
                    </div>
                  </div>

                  {/* Admin Response (if any) */}
                  {ticket.adminResponse && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Admin Response</p>
                      <div className="flex items-start gap-3 justify-end">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex-1">
                          <p className="text-sm text-blue-900">{ticket.adminResponse}</p>
                          <p className="text-xs text-blue-500 mt-1">— {ticket.assignedTo || "Admin"} · {ticket.updatedAt}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          A
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reply Box */}
                  {ticket.status !== "closed" && ticket.status !== "resolved" && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Reply to {ticket.userName}</p>
                      <div className="flex gap-2">
                        <textarea
                          value={replyText[ticket.id] || ""}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                          placeholder="Type your response..."
                          rows={3}
                          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB] resize-none"
                        />
                        <button
                          onClick={() => handleReply(ticket.id)}
                          disabled={!replyText[ticket.id]?.trim()}
                          className="flex flex-col items-center justify-center gap-1 px-4 py-2 bg-gradient-to-r from-[#0076EB] to-[#26B324] text-white text-xs font-semibold rounded-xl hover:shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                    {ticket.status === "open" && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, "in_progress")}
                        className="flex items-center gap-1.5 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-semibold rounded-xl transition"
                      >
                        <Clock className="w-3.5 h-3.5" /> Mark In Progress
                      </button>
                    )}
                    {(ticket.status === "open" || ticket.status === "in_progress") && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, "resolved")}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold rounded-xl transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                      </button>
                    )}
                    {ticket.status !== "closed" && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, "closed")}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Close Ticket
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-xl transition ml-auto">
                      <Mail className="w-3.5 h-3.5" /> Email User
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Headphones className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No support tickets found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}
