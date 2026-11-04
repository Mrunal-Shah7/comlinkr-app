import { useState, useEffect } from "react";
import {
  Search, Filter, Eye, Trash2, CheckCircle2,
  FileText, Calendar, TrendingUp, MessageCircle, Heart,
  Flag, Clock, ShieldCheck, Star, Pin, MoreVertical,
} from "lucide-react";

type FeedType = "all" | "news" | "event" | "story" | "challenge" | "poll";
type FeedStatus = "published" | "pending" | "flagged" | "removed";

interface FeedPost {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  type: "news" | "event" | "story" | "challenge" | "poll";
  status: FeedStatus;
  date: string;
  likes: number;
  comments: number;
  views: number;
  reports: number;
  aiVerified: boolean;
  featured: boolean;
  tags: string[];
}

const SEED_POSTS: FeedPost[] = [
  { id: "f1", title: "NYC Spring Community Meetup — Prospect Park", author: "Alex P.", authorAvatar: "AP", type: "event", status: "published", date: "Mar 1, 2026", likes: 198, comments: 72, views: 1230, reports: 0, aiVerified: true, featured: true, tags: ["event", "community"] },
  { id: "f2", title: "New Roommate Policy Changes in NYC — What You Need to Know", author: "Maria L.", authorAvatar: "ML", type: "news", status: "published", date: "Mar 4, 2026", likes: 134, comments: 89, views: 870, reports: 0, aiVerified: true, featured: false, tags: ["news", "housing"] },
  { id: "f3", title: "Weekend Challenge: Best NYC Street Food Photo", author: "Admin User", authorAvatar: "AU", type: "challenge", status: "published", date: "Mar 5, 2026", likes: 87, comments: 34, views: 430, reports: 0, aiVerified: false, featured: true, tags: ["challenge", "food"] },
  { id: "f4", title: "My NYC Experience Story", author: "Alex P.", authorAvatar: "AP", type: "story", status: "pending", date: "Mar 6, 2026", likes: 0, comments: 0, views: 0, reports: 0, aiVerified: false, featured: false, tags: ["story", "nyc"] },
  { id: "f5", title: "Spam: Get Rich Quick with Crypto!!!", author: "SpamBot", authorAvatar: "SB", type: "news", status: "flagged", date: "Mar 3, 2026", likes: 2, comments: 1, views: 45, reports: 12, aiVerified: false, featured: false, tags: [] },
  { id: "f6", title: "Community Poll: Best Neighborhoods for Newcomers", author: "Admin User", authorAvatar: "AU", type: "poll", status: "published", date: "Feb 28, 2026", likes: 312, comments: 48, views: 1840, reports: 0, aiVerified: true, featured: false, tags: ["poll", "community"] },
  { id: "f7", title: "Inappropriate Content Post", author: "User123", authorAvatar: "U1", type: "story", status: "removed", date: "Feb 10, 2026", likes: 0, comments: 0, views: 67, reports: 8, aiVerified: false, featured: false, tags: [] },
];

const TYPE_CONFIG = {
  news: { icon: FileText, color: "bg-blue-100 text-blue-600", label: "News" },
  event: { icon: Calendar, color: "bg-green-100 text-green-600", label: "Event" },
  story: { icon: MessageCircle, color: "bg-purple-100 text-purple-600", label: "Story" },
  challenge: { icon: Star, color: "bg-orange-100 text-orange-600", label: "Challenge" },
  poll: { icon: TrendingUp, color: "bg-pink-100 text-pink-600", label: "Poll" },
};

const STATUS_CONFIG: Record<FeedStatus, { bg: string; text: string; label: string }> = {
  published: { bg: "bg-green-100", text: "text-green-700", label: "Published" },
  pending: { bg: "bg-blue-100", text: "text-blue-700", label: "Pending" },
  flagged: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Flagged" },
  removed: { bg: "bg-red-100", text: "text-red-700", label: "Removed" },
};

function loadFeedPosts(): FeedPost[] {
  const posts = [...SEED_POSTS];
  try {
    const news = JSON.parse(localStorage.getItem("comlinkr_news") || "[]") as any[];
    for (const n of news) {
      posts.push({
        id: `ls_news_${n.id}`,
        title: n.title || "Untitled",
        author: n.author?.name || "Unknown",
        authorAvatar: (n.author?.name || "U").slice(0, 2).toUpperCase(),
        type: "news",
        status: n.aiVerified ? "published" : "pending",
        date: n.timestamp || "Recently",
        likes: n.likes || 0,
        comments: 0,
        views: 0,
        reports: 0,
        aiVerified: n.aiVerified ?? false,
        featured: false,
        tags: n.tags || [],
      });
    }
    const events = JSON.parse(localStorage.getItem("comlinkr_events") || "[]") as any[];
    for (const e of events) {
      posts.push({
        id: `ls_evt_${e.id}`,
        title: e.title || "Untitled Event",
        author: e.host?.name || "Unknown",
        authorAvatar: (e.host?.name || "U").slice(0, 2).toUpperCase(),
        type: "event",
        status: e.aiVerified ? "published" : "pending",
        date: e.date || "Recently",
        likes: 0,
        comments: 0,
        views: e.attendees?.length || 0,
        reports: 0,
        aiVerified: e.aiVerified ?? false,
        featured: false,
        tags: [],
      });
    }
  } catch {}
  return posts;
}

export default function FeedManagementPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FeedType>("all");
  const [statusFilter, setStatusFilter] = useState<FeedStatus | "all">("all");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => { setPosts(loadFeedPosts()); }, []);

  const filtered = posts.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.type === typeFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const flaggedCount = posts.filter((p) => p.status === "flagged").length;
  const pendingCount = posts.filter((p) => p.status === "pending").length;

  const handleAction = (postId: string, action: "approve" | "remove" | "feature" | "flag") => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              status: action === "approve" ? "published" : action === "remove" ? "removed" : action === "flag" ? "flagged" : p.status,
              featured: action === "feature" ? !p.featured : p.featured,
            }
          : p
      )
    );
    setActionMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Feed Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all feed posts — news, events, stories, challenges & polls
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {flaggedCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
              <Flag className="w-3.5 h-3.5" /> {flaggedCount} flagged
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              <Clock className="w-3.5 h-3.5" /> {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["news", "event", "story", "challenge", "poll"] as const).map((type) => {
          const conf = TYPE_CONFIG[type];
          const count = posts.filter((p) => p.type === type).length;
          return (
            <button
              key={type}
              onClick={() => { setTypeFilter(type); setPage(1); }}
              className={`flex items-center gap-2 p-3 rounded-xl border transition ${typeFilter === type ? "border-[#0076EB] bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}
            >
              <div className={`w-8 h-8 rounded-lg ${conf.color} flex items-center justify-center flex-shrink-0`}>
                <conf.icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">{conf.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search posts by title or author..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {(["all", "published", "pending", "flagged", "removed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition capitalize ${
                  statusFilter === s ? "bg-[#0076EB] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Post</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Engagement</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((post) => {
                const typeConf = TYPE_CONFIG[post.type];
                const statusConf = STATUS_CONFIG[post.status];
                return (
                  <tr key={post.id} className={`hover:bg-gray-50 transition ${post.status === "flagged" ? "bg-yellow-50/40" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {post.authorAvatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-xs">{post.title}</p>
                            {post.featured && <Pin className="w-3 h-3 text-[#FF7B00] flex-shrink-0" />}
                            {post.aiVerified && <ShieldCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">by {post.author} · {post.date}</p>
                          {post.reports > 0 && (
                            <p className="text-xs text-red-600 font-semibold mt-0.5 flex items-center gap-1">
                              <Flag className="w-3 h-3" /> {post.reports} reports
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${typeConf.color}`}>
                        <typeConf.icon className="w-3 h-3" /> {typeConf.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comments}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusConf.bg} ${statusConf.text}`}>
                        {statusConf.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenu(actionMenu === post.id ? null : post.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {actionMenu === post.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1">
                              {post.status !== "published" && (
                                <button
                                  onClick={() => handleAction(post.id, "approve")}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Approve
                                </button>
                              )}
                              <button
                                onClick={() => handleAction(post.id, "feature")}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pin className="w-4 h-4" /> {post.featured ? "Unfeature" : "Feature"}
                              </button>
                              {post.status !== "flagged" && (
                                <button
                                  onClick={() => handleAction(post.id, "flag")}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-yellow-700 hover:bg-yellow-50"
                                >
                                  <Flag className="w-4 h-4" /> Flag
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => handleAction(post.id, "remove")}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" /> Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No posts match your filters</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 text-sm font-medium rounded-lg ${page === i + 1 ? "bg-[#0076EB] text-white" : "hover:bg-gray-100 text-gray-600"}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
