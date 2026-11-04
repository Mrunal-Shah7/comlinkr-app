import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Home,
  UtensilsCrossed,
  Calendar,
  MessageCircle,
  Flag,
  Clock,
  ShieldCheck,
} from "lucide-react";

type ContentType = "all" | "news" | "event" | "listing" | "restaurant";
type ContentStatus = "published" | "flagged" | "removed" | "pending";

interface ContentItem {
  id: string;
  title: string;
  author: string;
  type: "news" | "event" | "listing" | "restaurant";
  status: ContentStatus;
  date: string;
  reports: number;
  views: number;
  aiVerified?: boolean;
}

const FALLBACK_CONTENT: ContentItem[] = [
  { id: "f1", title: "Spam Post - Buy Now!!!", author: "Unknown User", type: "news", status: "flagged", date: "Feb 11, 2026", reports: 12, views: 45 },
  { id: "f2", title: "Inappropriate Content Post", author: "User123", type: "news", status: "flagged", date: "Feb 10, 2026", reports: 8, views: 67 },
  { id: "f3", title: "Misleading Listing - Scam Report", author: "Suspicious", type: "listing", status: "removed", date: "Feb 8, 2026", reports: 23, views: 12 },
];

function loadAllContent(): ContentItem[] {
  const items: ContentItem[] = [...FALLBACK_CONTENT];
  
  // Load news posts
  try {
    const news = localStorage.getItem("comlinkr_news");
    if (news) {
      const parsed = JSON.parse(news) as any[];
      for (const n of parsed) {
        items.push({
          id: `news_${n.id}`,
          title: n.title,
          author: n.author?.name || "Unknown",
          type: "news",
          status: n.aiVerified ? "published" : "pending",
          date: n.timestamp || "Recently",
          reports: 0,
          views: n.likes || 0,
          aiVerified: n.aiVerified ?? false,
        });
      }
    }
  } catch {}

  // Load events
  try {
    const events = localStorage.getItem("comlinkr_events");
    if (events) {
      const parsed = JSON.parse(events) as any[];
      for (const e of parsed) {
        items.push({
          id: `evt_${e.id}`,
          title: e.title,
          author: e.host?.name || "Unknown",
          type: "event",
          status: e.aiVerified ? "published" : "pending",
          date: e.date || "Recently",
          reports: 0,
          views: e.attendees?.length || 0,
          aiVerified: e.aiVerified ?? false,
        });
      }
    }
  } catch {}

  // Load listings
  try {
    const listings = localStorage.getItem("comlinkr_listings");
    if (listings) {
      const parsed = JSON.parse(listings) as any[];
      for (const l of parsed) {
        items.push({
          id: `lst_${l.id}`,
          title: l.title,
          author: l.landlord?.name || "Unknown",
          type: "listing",
          status: l.aiVerified ? "published" : "pending",
          date: l.postedDate || "Recently",
          reports: 0,
          views: 0,
          aiVerified: l.aiVerified ?? false,
        });
      }
    }
  } catch {}

  // Load restaurants
  try {
    const restaurants = localStorage.getItem("comlinkr_restaurants");
    if (restaurants) {
      const parsed = JSON.parse(restaurants) as any[];
      for (const r of parsed) {
        items.push({
          id: `rst_${r.id}`,
          title: r.name,
          author: "Community",
          type: "restaurant",
          status: r.aiVerified ? "published" : "pending",
          date: "Recently",
          reports: 0,
          views: 0,
          aiVerified: r.aiVerified ?? false,
        });
      }
    }
  } catch {}

  return items;
}

const TYPE_CONFIG = {
  news: { icon: FileText, color: "bg-blue-100 text-blue-600", label: "News" },
  event: { icon: Calendar, color: "bg-green-100 text-green-600", label: "Event" },
  listing: { icon: Home, color: "bg-orange-100 text-orange-600", label: "Listing" },
  restaurant: { icon: UtensilsCrossed, color: "bg-purple-100 text-purple-600", label: "Restaurant" },
};

const STATUS_CONFIG: Record<ContentStatus, { bg: string; text: string; label: string }> = {
  published: { bg: "bg-green-100", text: "text-green-700", label: "Published" },
  flagged: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Flagged" },
  removed: { bg: "bg-red-100", text: "text-red-700", label: "Removed" },
  pending: { bg: "bg-blue-100", text: "text-blue-700", label: "AI Pending" },
};

export default function ContentModeration() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentType>("all");
  const [tab, setTab] = useState<"all" | "flagged">("all");

  useEffect(() => {
    setContent(loadAllContent());
  }, []);

  const filtered = content.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.author.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || item.type === typeFilter;
    const matchTab = tab === "all" || item.status === "flagged";
    return matchSearch && matchType && matchTab;
  });

  const flaggedCount = content.filter((c) => c.status === "flagged").length;
  const pendingCount = content.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Content Moderation</h2>
          <p className="text-sm text-gray-500 mt-1">Review and manage all community content</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {flaggedCount} flagged
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {pendingCount} AI pending
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${tab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          All Content
        </button>
        <button
          onClick={() => setTab("flagged")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${tab === "flagged" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Flag className="w-3.5 h-3.5" />
          Needs Review
          <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{flaggedCount}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {(["all", "news", "event", "listing", "restaurant"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition capitalize ${
                typeFilter === t ? "bg-[#0076EB] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Content Cards */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const typeConf = TYPE_CONFIG[item.type];
          const statusConf = STATUS_CONFIG[item.status];
          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition ${
                item.status === "flagged" ? "border-yellow-200 bg-yellow-50/30" : "border-gray-100"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl ${typeConf.color} flex items-center justify-center flex-shrink-0`}>
                    <typeConf.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-500">by {item.author}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.date}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {item.views}
                      </span>
                      {item.reports > 0 && (
                        <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                          <Flag className="w-3 h-3" /> {item.reports} reports
                        </span>
                      )}
                      {item.aiVerified && (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> AI Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusConf.bg} ${statusConf.text}`}>
                    {statusConf.label}
                  </span>
                  {item.status === "flagged" && (
                    <div className="flex gap-1">
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 transition" title="Approve">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 transition" title="Remove">
                        <XCircle className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                  {item.status === "published" && (
                    <div className="flex gap-1">
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition" title="View">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition" title="Remove">
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No content matches your filters</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}
