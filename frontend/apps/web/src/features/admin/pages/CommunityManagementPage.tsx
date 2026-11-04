import { useState, useEffect } from "react";
import {
  Search, MessageCircle, ThumbsUp, Eye, Trash2,
  CheckCircle2, Flag, Clock, MoreVertical,
  Pin, TrendingUp, Users, HelpCircle,
} from "lucide-react";

type PostStatus = "published" | "pending" | "flagged" | "removed";
type PostCategory = "all" | "question" | "discussion" | "tip" | "announcement" | "event";

interface CommunityPost {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  category: "question" | "discussion" | "tip" | "announcement" | "event";
  status: PostStatus;
  date: string;
  upvotes: number;
  answers: number;
  views: number;
  reports: number;
  pinned: boolean;
  tags: string[];
}

const SEED_POSTS: CommunityPost[] = [
  { id: "c1", title: "Best neighborhoods for newcomers in NYC?", author: "Maria L.", authorAvatar: "ML", category: "question", status: "published", date: "Mar 1, 2026", upvotes: 48, answers: 12, views: 342, reports: 0, pinned: true, tags: ["nyc", "newcomers"] },
  { id: "c2", title: "Tips for apartment hunting in Manhattan", author: "Alex P.", authorAvatar: "AP", category: "tip", status: "published", date: "Feb 28, 2026", upvotes: 67, answers: 8, views: 512, reports: 0, pinned: false, tags: ["housing", "tips"] },
  { id: "c3", title: "Community Spring Meetup — Prospect Park", author: "Admin User", authorAvatar: "AU", category: "event", status: "published", date: "Mar 5, 2026", upvotes: 134, answers: 22, views: 890, reports: 0, pinned: true, tags: ["event", "spring"] },
  { id: "c4", title: "How do I find a reliable plumber in Brooklyn?", author: "James K.", authorAvatar: "JK", category: "question", status: "published", date: "Mar 4, 2026", upvotes: 15, answers: 6, views: 178, reports: 0, pinned: false, tags: ["brooklyn", "services"] },
  { id: "c5", title: "Scam landlord warning — avoid this building!", author: "Emily R.", authorAvatar: "ER", category: "discussion", status: "flagged", date: "Mar 3, 2026", upvotes: 89, answers: 34, views: 670, reports: 3, pinned: false, tags: ["warning", "scam"] },
  { id: "c6", title: "My experience moving from Lagos to NYC", author: "Chioma A.", authorAvatar: "CA", category: "discussion", status: "published", date: "Feb 20, 2026", upvotes: 156, answers: 28, views: 1240, reports: 0, pinned: false, tags: ["immigration", "story"] },
  { id: "c7", title: "Spam: Buy followers NOW!!!", author: "SpamBot", authorAvatar: "SB", category: "announcement", status: "removed", date: "Feb 15, 2026", upvotes: 0, answers: 0, views: 12, reports: 15, pinned: false, tags: [] },
  { id: "c8", title: "New feature announcement: Roommate matching is live!", author: "Admin User", authorAvatar: "AU", category: "announcement", status: "pending", date: "Mar 6, 2026", upvotes: 0, answers: 0, views: 0, reports: 0, pinned: false, tags: ["feature", "roommates"] },
];

const CATEGORY_CONFIG = {
  question: { icon: HelpCircle, color: "bg-blue-100 text-blue-600", label: "Question" },
  discussion: { icon: MessageCircle, color: "bg-purple-100 text-purple-600", label: "Discussion" },
  tip: { icon: TrendingUp, color: "bg-green-100 text-green-600", label: "Tip" },
  announcement: { icon: Pin, color: "bg-orange-100 text-orange-600", label: "Announcement" },
  event: { icon: Users, color: "bg-pink-100 text-pink-600", label: "Event" },
};

const STATUS_CONFIG: Record<PostStatus, { bg: string; text: string; label: string }> = {
  published: { bg: "bg-green-100", text: "text-green-700", label: "Published" },
  pending: { bg: "bg-blue-100", text: "text-blue-700", label: "Pending" },
  flagged: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Flagged" },
  removed: { bg: "bg-red-100", text: "text-red-700", label: "Removed" },
};

function loadCommunityPosts(): CommunityPost[] {
  return [...SEED_POSTS];
}

export default function CommunityManagementPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PostCategory>("all");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => { setPosts(loadCommunityPosts()); }, []);

  const filtered = posts.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const flaggedCount = posts.filter((p) => p.status === "flagged").length;
  const pendingCount = posts.filter((p) => p.status === "pending").length;

  const handleAction = (id: string, action: "approve" | "remove" | "pin" | "flag") => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: action === "approve" ? "published" : action === "remove" ? "removed" : action === "flag" ? "flagged" : p.status,
              pinned: action === "pin" ? !p.pinned : p.pinned,
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
          <h2 className="text-xl font-bold text-gray-900">Community Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Moderate questions, discussions, tips, announcements and events
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Category Pills */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {(["question", "discussion", "tip", "announcement", "event"] as const).map((cat) => {
          const conf = CATEGORY_CONFIG[cat];
          const count = posts.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setPage(1); }}
              className={`flex items-center gap-2 p-3 rounded-xl border transition ${categoryFilter === cat ? "border-[#0076EB] bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}
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
              placeholder="Search community posts..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
            />
          </div>
          <div className="flex items-center gap-2">
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
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Engagement</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((post) => {
                const catConf = CATEGORY_CONFIG[post.category];
                const statusConf = STATUS_CONFIG[post.status];
                return (
                  <tr key={post.id} className={`hover:bg-gray-50 transition ${post.status === "flagged" ? "bg-yellow-50/30" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {post.authorAvatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-xs">{post.title}</p>
                            {post.pinned && <Pin className="w-3 h-3 text-[#FF7B00] flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">by {post.author} · {post.date}</p>
                          {post.reports > 0 && (
                            <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-0.5">
                              <Flag className="w-3 h-3" /> {post.reports} reports
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${catConf.color}`}>
                        <catConf.icon className="w-3 h-3" /> {catConf.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.upvotes}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.answers}</span>
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
                                <button onClick={() => handleAction(post.id, "approve")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50">
                                  <CheckCircle2 className="w-4 h-4" /> Approve
                                </button>
                              )}
                              <button onClick={() => handleAction(post.id, "pin")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                <Pin className="w-4 h-4" /> {post.pinned ? "Unpin" : "Pin to top"}
                              </button>
                              {post.status !== "flagged" && (
                                <button onClick={() => handleAction(post.id, "flag")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-yellow-700 hover:bg-yellow-50">
                                  <Flag className="w-4 h-4" /> Flag
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button onClick={() => handleAction(post.id, "remove")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
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
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No community posts match your filters</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">‹</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 text-sm font-medium rounded-lg ${page === i + 1 ? "bg-[#0076EB] text-white" : "hover:bg-gray-100 text-gray-600"}`}>{i + 1}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
