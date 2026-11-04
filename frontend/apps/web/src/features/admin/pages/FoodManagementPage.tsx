import { useState, useEffect } from "react";
import {
  Search, Filter, UtensilsCrossed, CheckCircle2, XCircle,
  Eye, Trash2, MoreVertical, Star, Clock,
  ShieldCheck, AlertTriangle, TrendingUp, DollarSign,
} from "lucide-react";

type RestaurantStatus = "active" | "pending" | "suspended" | "removed";
type CuisineFilter = "all" | "italian" | "mexican" | "japanese" | "thai" | "indian" | "american" | "other";

interface AdminRestaurant {
  id: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  cuisine: string;
  price: string;
  rating: number;
  reviews: number;
  status: RestaurantStatus;
  openNow: boolean;
  verified: boolean;
  submittedDate: string;
  views: number;
  orders: number;
  tags: string[];
}

const SEED_RESTAURANTS: AdminRestaurant[] = [
  { id: "r1", name: "Bella Napoli", owner: "Bella Napoli", ownerAvatar: "BN", cuisine: "Italian", price: "$$", rating: 4.8, reviews: 324, status: "active", openNow: true, verified: true, submittedDate: "Jan 20, 2026", views: 1560, orders: 289, tags: ["pasta", "pizza", "nyc"] },
  { id: "r2", name: "Taqueria El Sol", owner: "Taqueria El Sol", ownerAvatar: "TS", cuisine: "Mexican", price: "$", rating: 4.6, reviews: 218, status: "active", openNow: true, verified: true, submittedDate: "Feb 14, 2026", views: 890, orders: 156, tags: ["tacos", "mexican"] },
  { id: "r3", name: "Sakura Sushi", owner: "Sakura Sushi", ownerAvatar: "SS", cuisine: "Japanese", price: "$$$", rating: 4.9, reviews: 412, status: "active", openNow: true, verified: true, submittedDate: "Mar 10, 2026", views: 980, orders: 167, tags: ["sushi", "omakase"] },
  { id: "r4", name: "Thai Orchid", owner: "Thai Orchid", ownerAvatar: "TO", cuisine: "Thai", price: "$$", rating: 4.3, reviews: 167, status: "pending", openNow: false, verified: false, submittedDate: "Apr 5, 2026", views: 0, orders: 0, tags: ["thai", "curries"] },
  { id: "r5", name: "Spice Route", owner: "Spice Route", ownerAvatar: "SR", cuisine: "Indian", price: "$$", rating: 4.7, reviews: 289, status: "active", openNow: true, verified: true, submittedDate: "Jan 25, 2026", views: 745, orders: 98, tags: ["curry", "indian"] },
  { id: "r6", name: "Fake Restaurant - Spam", owner: "SpamOwner", ownerAvatar: "SO", cuisine: "American", price: "$", rating: 0, reviews: 0, status: "suspended", openNow: false, verified: false, submittedDate: "Mar 5, 2026", views: 12, orders: 0, tags: [] },
];

const STATUS_CONFIG: Record<RestaurantStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  suspended: { bg: "bg-red-100", text: "text-red-700", label: "Suspended" },
  removed: { bg: "bg-gray-100", text: "text-gray-600", label: "Removed" },
};

function loadRestaurants(): AdminRestaurant[] {
  const restaurants = [...SEED_RESTAURANTS];
  try {
    const stored = JSON.parse(localStorage.getItem("comlinkr_restaurants") || "[]") as any[];
    for (const r of stored) {
      restaurants.push({
        id: `ls_${r.id}`,
        name: r.name || "Unnamed Restaurant",
        owner: r.owner || "Unknown",
        ownerAvatar: (r.name || "U").slice(0, 2).toUpperCase(),
        cuisine: r.cuisine || "Other",
        price: r.price || "$",
        rating: r.rating || 0,
        reviews: r.reviews || 0,
        status: r.aiVerified ? "active" : "pending",
        openNow: r.openNow ?? false,
        verified: r.aiVerified ?? false,
        submittedDate: "Recently",
        views: 0,
        orders: 0,
        tags: r.tags || [],
      });
    }
  } catch {}
  return restaurants;
}

export default function FoodManagementPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RestaurantStatus | "all">("all");
  const [cuisineFilter, setCuisineFilter] = useState<CuisineFilter>("all");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => { setRestaurants(loadRestaurants()); }, []);

  const filtered = restaurants.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(search.toLowerCase()) ||
      r.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchCuisine = cuisineFilter === "all" || r.cuisine.toLowerCase() === cuisineFilter;
    return matchSearch && matchStatus && matchCuisine;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const pendingCount = restaurants.filter((r) => r.status === "pending").length;
  const activeCount = restaurants.filter((r) => r.status === "active").length;

  const handleAction = (id: string, action: "approve" | "suspend" | "remove" | "verify") => {
    setRestaurants((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: action === "approve" ? "active" : action === "suspend" ? "suspended" : action === "remove" ? "removed" : r.status,
              verified: action === "verify" ? true : r.verified,
            }
          : r
      )
    );
    setActionMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Food & Restaurants</h2>
          <p className="text-sm text-gray-500 mt-1">Manage restaurant listings, verify businesses and monitor activity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            <UtensilsCrossed className="w-3.5 h-3.5" /> {activeCount} active
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
              <Clock className="w-3.5 h-3.5" /> {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["active", "pending", "suspended", "removed"] as RestaurantStatus[]).map((status) => {
          const conf = STATUS_CONFIG[status];
          const count = restaurants.filter((r) => r.status === status).length;
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
              placeholder="Search by restaurant name, cuisine or owner..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {(["all", "italian", "mexican", "japanese", "thai", "indian", "american"] as const).map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => { setCuisineFilter(cuisine); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                cuisineFilter === cuisine ? "bg-[#FF7B00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cuisine === "all" ? "All Cuisines" : cuisine}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurants Cards */}
      <div className="grid grid-cols-1 gap-3">
        {paginated.map((restaurant) => {
          const statusConf = STATUS_CONFIG[restaurant.status];
          return (
            <div
              key={restaurant.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition ${restaurant.status === "pending" ? "border-yellow-200" : "border-gray-100"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF7B00] to-orange-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {restaurant.ownerAvatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900">{restaurant.name}</h3>
                      {restaurant.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${restaurant.openNow ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {restaurant.openNow ? "Open" : "Closed"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <UtensilsCrossed className="w-3 h-3" /> {restaurant.cuisine}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> {restaurant.price}
                      </span>
                      {restaurant.rating > 0 && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" /> {restaurant.rating} ({restaurant.reviews} reviews)
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {restaurant.views} views
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {restaurant.orders} orders
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Submitted {restaurant.submittedDate} · Owner: {restaurant.owner}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusConf.bg} ${statusConf.text}`}>
                    {statusConf.label}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === restaurant.id ? null : restaurant.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                    {actionMenu === restaurant.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1">
                          <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <Eye className="w-4 h-4" /> View Details
                          </button>
                          {restaurant.status === "pending" && (
                            <button
                              onClick={() => handleAction(restaurant.id, "approve")}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve
                            </button>
                          )}
                          {restaurant.status === "active" && !restaurant.verified && (
                            <button
                              onClick={() => handleAction(restaurant.id, "verify")}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50"
                            >
                              <ShieldCheck className="w-4 h-4" /> Verify Business
                            </button>
                          )}
                          {restaurant.status !== "suspended" && (
                            <button
                              onClick={() => handleAction(restaurant.id, "suspend")}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-yellow-700 hover:bg-yellow-50"
                            >
                              <XCircle className="w-4 h-4" /> Suspend
                            </button>
                          )}
                          {restaurant.status === "suspended" && (
                            <button
                              onClick={() => handleAction(restaurant.id, "approve")}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Reactivate
                            </button>
                          )}
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => handleAction(restaurant.id, "remove")}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No restaurants match your filters</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
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
  );
}
