import { useState, useEffect } from "react";
import {
  Search, Filter, Home, CheckCircle2, XCircle, Eye,
  Trash2, MoreVertical, MapPin, DollarSign, BedDouble,
  ShieldCheck, Clock, Star, AlertTriangle,
} from "lucide-react";

type ListingStatus = "active" | "pending" | "rejected" | "removed";
type ListingCategory = "all" | "apartment" | "room" | "studio" | "house" | "condo";

interface AdminListing {
  id: string;
  title: string;
  landlord: string;
  landlordAvatar: string;
  price: string;
  location: string;
  beds: number;
  type: "apartment" | "room" | "studio" | "house" | "condo";
  status: ListingStatus;
  date: string;
  views: number;
  favorites: number;
  verified: boolean;
  isNew: boolean;
}

const SEED_LISTINGS: AdminListing[] = [
  { id: "l1", title: "Luxury 2BR in Downtown Manhattan", landlord: "Sarah Johnson", landlordAvatar: "SJ", price: "$3,200/mo", location: "Downtown Manhattan, NY", beds: 2, type: "apartment", status: "active", date: "Jan 15, 2026", views: 644, favorites: 44, verified: true, isNew: false },
  { id: "l2", title: "Modern Studio in Midtown West", landlord: "Michael Torres", landlordAvatar: "MT", price: "$2,100/mo", location: "Midtown West, NY", beds: 0, type: "studio", status: "active", date: "Jan 22, 2026", views: 420, favorites: 28, verified: true, isNew: false },
  { id: "l3", title: "Cozy Room in Forest Hills", landlord: "Robert Kim", landlordAvatar: "RK", price: "$1,200/mo", location: "Forest Hills, Queens", beds: 1, type: "room", status: "pending", date: "Feb 10, 2026", views: 0, favorites: 0, verified: false, isNew: true },
  { id: "l4", title: "Spacious 1BR in East Village", landlord: "Anna Petrov", landlordAvatar: "AP", price: "$2,400/mo", location: "East Village, NY", beds: 1, type: "apartment", status: "active", date: "Feb 20, 2026", views: 260, favorites: 34, verified: true, isNew: false },
  { id: "l5", title: "3BR Luxury Condo - Financial District", landlord: "Empire Realty", landlordAvatar: "ER", price: "$5,800/mo", location: "Financial District, NY", beds: 3, type: "condo", status: "active", date: "Dec 1, 2025", views: 892, favorites: 64, verified: true, isNew: false },
  { id: "l6", title: "Suspicious Cheap Apartment Listing", landlord: "FakeOwner", landlordAvatar: "FO", price: "$500/mo", location: "Manhattan", beds: 2, type: "apartment", status: "rejected", date: "Mar 2, 2026", views: 12, favorites: 0, verified: false, isNew: false },
];

const STATUS_CONFIG: Record<ListingStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  removed: { bg: "bg-gray-100", text: "text-gray-600", label: "Removed" },
};

function loadListings(): AdminListing[] {
  const listings = [...SEED_LISTINGS];
  try {
    const stored = JSON.parse(localStorage.getItem("comlinkr_listings") || "[]") as any[];
    for (const l of stored) {
      listings.push({
        id: `ls_${l.id}`,
        title: l.title || "Untitled Listing",
        landlord: l.landlord?.name || "Unknown",
        landlordAvatar: (l.landlord?.name || "U").slice(0, 2).toUpperCase(),
        price: l.price || "N/A",
        location: l.location || "Not specified",
        beds: l.beds || 0,
        type: (l.type as AdminListing["type"]) || "apartment",
        status: l.aiVerified ? "active" : "pending",
        date: l.postedDate || "Recently",
        views: 0,
        favorites: 0,
        verified: l.aiVerified ?? false,
        isNew: true,
      });
    }
  } catch {}
  return listings;
}

export default function ListingsManagementPage() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ListingCategory>("all");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => { setListings(loadListings()); }, []);

  const filtered = listings.filter((l) => {
    const matchSearch =
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.landlord.toLowerCase().includes(search.toLowerCase()) ||
      l.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchCat = categoryFilter === "all" || l.type === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const activeCount = listings.filter((l) => l.status === "active").length;

  const handleAction = (id: string, action: "approve" | "reject" | "remove" | "verify") => {
    setListings((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: action === "approve" ? "active" : action === "reject" ? "rejected" : action === "remove" ? "removed" : l.status,
              verified: action === "verify" ? true : l.verified,
            }
          : l
      )
    );
    setActionMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Listings Management</h2>
          <p className="text-sm text-gray-500 mt-1">Approve, verify and manage housing listings</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            <Home className="w-3.5 h-3.5" /> {activeCount} active
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
              <Clock className="w-3.5 h-3.5" /> {pendingCount} pending approval
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["active", "pending", "rejected", "removed"] as ListingStatus[]).map((status) => {
          const conf = STATUS_CONFIG[status];
          const count = listings.filter((l) => l.status === status).length;
          return (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`p-4 rounded-xl border text-left transition ${statusFilter === status ? "border-[#0076EB] bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}
            >
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className={`text-xs font-semibold capitalize mt-1 ${conf.text}`}>{conf.label}</p>
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
              placeholder="Search by title, landlord or location..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {(["all", "apartment", "room", "studio", "house", "condo"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                categoryFilter === cat ? "bg-[#0076EB] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "all" ? "All Types" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Listing</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Price</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Performance</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((listing) => {
                const statusConf = STATUS_CONFIG[listing.status];
                return (
                  <tr key={listing.id} className={`hover:bg-gray-50 transition ${listing.status === "pending" ? "bg-yellow-50/30" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Home className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-xs">{listing.title}</p>
                            {listing.isNew && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">NEW</span>}
                            {listing.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {listing.location}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">by {listing.landlord} · {listing.date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-green-500" />
                        {listing.price.replace("$", "")}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <BedDouble className="w-3 h-3" /> {listing.beds === 0 ? "Studio" : `${listing.beds} bed${listing.beds > 1 ? "s" : ""}`}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{listing.views}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3" />{listing.favorites}</span>
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
                          onClick={() => setActionMenu(actionMenu === listing.id ? null : listing.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {actionMenu === listing.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1">
                              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                <Eye className="w-4 h-4" /> View Listing
                              </button>
                              {listing.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleAction(listing.id, "approve")}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleAction(listing.id, "reject")}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <XCircle className="w-4 h-4" /> Reject
                                  </button>
                                </>
                              )}
                              {listing.status === "active" && !listing.verified && (
                                <button
                                  onClick={() => handleAction(listing.id, "verify")}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50"
                                >
                                  <ShieldCheck className="w-4 h-4" /> Verify
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => handleAction(listing.id, "remove")}
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
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No listings match your filters</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
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
