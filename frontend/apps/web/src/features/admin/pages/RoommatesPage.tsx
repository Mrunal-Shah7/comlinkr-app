import { useState, useEffect } from "react";
import {
  Search, Filter, Users, CheckCircle2, XCircle,
  Eye, Trash2, MoreVertical, MapPin, DollarSign,
  ShieldCheck, Clock, Star, Home, UserCheck, AlertTriangle, Ban,
} from "lucide-react";

type RoommateStatus = "active" | "pending" | "matched" | "removed" | "suspended";

interface RoommateProfile {
  id: string;
  name: string;
  avatar: string;
  age: number;
  occupation: string;
  budget: string;
  location: string;
  moveInDate: string;
  status: RoommateStatus;
  verified: boolean;
  gender: string;
  genderPref: string;
  pets: boolean;
  smoking: boolean;
  lookingFor: "room" | "roommate";
  submittedDate: string;
  views: number;
  matches: number;
  reports: number;
}

const SEED_ROOMMATES: RoommateProfile[] = [
  { id: "rm1", name: "David Chen", avatar: "DC", age: 28, occupation: "Software Engineer", budget: "$1,500/mo", location: "Brooklyn, NY", moveInDate: "Apr 1, 2026", status: "active", verified: true, gender: "Male", genderPref: "Any", pets: false, smoking: false, lookingFor: "roommate", submittedDate: "Mar 1, 2026", views: 45, matches: 3, reports: 0 },
  { id: "rm2", name: "Priya Sharma", avatar: "PS", age: 25, occupation: "Marketing Manager", budget: "$1,200/mo", location: "Astoria, Queens", moveInDate: "Mar 15, 2026", status: "active", verified: true, gender: "Female", genderPref: "Female", pets: true, smoking: false, lookingFor: "room", submittedDate: "Feb 28, 2026", views: 78, matches: 5, reports: 0 },
  { id: "rm3", name: "Marcus Johnson", avatar: "MJ", age: 31, occupation: "Teacher", budget: "$1,000/mo", location: "Harlem, NY", moveInDate: "Apr 15, 2026", status: "pending", verified: false, gender: "Male", genderPref: "Any", pets: false, smoking: false, lookingFor: "roommate", submittedDate: "Mar 5, 2026", views: 0, matches: 0, reports: 0 },
  { id: "rm4", name: "Sofia Torres", avatar: "ST", age: 23, occupation: "Graduate Student", budget: "$900/mo", location: "Washington Heights, NY", moveInDate: "May 1, 2026", status: "active", verified: true, gender: "Female", genderPref: "Any", pets: false, smoking: false, lookingFor: "room", submittedDate: "Mar 2, 2026", views: 34, matches: 2, reports: 0 },
  { id: "rm5", name: "Kwame Asante", avatar: "KA", age: 29, occupation: "Financial Analyst", budget: "$1,800/mo", location: "Midtown Manhattan", moveInDate: "Apr 1, 2026", status: "matched", verified: true, gender: "Male", genderPref: "Male", pets: false, smoking: false, lookingFor: "roommate", submittedDate: "Feb 15, 2026", views: 92, matches: 7, reports: 0 },
  { id: "rm6", name: "Aisha Rahman", avatar: "AR", age: 26, occupation: "Nurse", budget: "$1,100/mo", location: "Jackson Heights, Queens", moveInDate: "Mar 20, 2026", status: "active", verified: false, gender: "Female", genderPref: "Female", pets: false, smoking: false, lookingFor: "room", submittedDate: "Mar 4, 2026", views: 22, matches: 1, reports: 0 },
  { id: "rm7", name: "Fake Profile - Scammer", avatar: "FP", age: 22, occupation: "Unknown", budget: "$500/mo", location: "Manhattan", moveInDate: "Immediately", status: "suspended", verified: false, gender: "Male", genderPref: "Any", pets: false, smoking: false, lookingFor: "roommate", submittedDate: "Mar 6, 2026", views: 5, matches: 0, reports: 8 },
];

const STATUS_CONFIG: Record<RoommateStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  matched: { bg: "bg-blue-100", text: "text-blue-700", label: "Matched" },
  removed: { bg: "bg-gray-100", text: "text-gray-600", label: "Removed" },
  suspended: { bg: "bg-red-100", text: "text-red-700", label: "Suspended" },
};

function loadRoommates(): RoommateProfile[] {
  const profiles = [...SEED_ROOMMATES];
  try {
    const stored = JSON.parse(localStorage.getItem("comlinkr_roommates") || "[]") as any[];
    for (const r of stored) {
      profiles.push({
        id: `ls_${r.id}`,
        name: r.name || "Unknown",
        avatar: (r.name || "U").slice(0, 2).toUpperCase(),
        age: r.age || 0,
        occupation: r.occupation || "Not specified",
        budget: r.budget || "N/A",
        location: r.location || "Not specified",
        moveInDate: r.moveInDate || "Flexible",
        status: "pending",
        verified: false,
        gender: r.gender || "Not specified",
        genderPref: r.genderPref || "Any",
        pets: r.pets ?? false,
        smoking: r.smoking ?? false,
        lookingFor: r.lookingFor || "roommate",
        submittedDate: "Recently",
        views: 0,
        matches: 0,
        reports: 0,
      });
    }
  } catch {}
  return profiles;
}

export default function RoommatesPage() {
  const [profiles, setProfiles] = useState<RoommateProfile[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoommateStatus | "all">("all");
  const [lookingFilter, setLookingFilter] = useState<"all" | "room" | "roommate">("all");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => { setProfiles(loadRoommates()); }, []);

  const filtered = profiles.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.occupation.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchLooking = lookingFilter === "all" || p.lookingFor === lookingFilter;
    return matchSearch && matchStatus && matchLooking;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const pendingCount = profiles.filter((p) => p.status === "pending").length;
  const activeCount = profiles.filter((p) => p.status === "active").length;
  const matchedCount = profiles.filter((p) => p.status === "matched").length;

  const handleAction = (id: string, action: "approve" | "suspend" | "remove" | "verify") => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: action === "approve" ? "active" : action === "suspend" ? "suspended" : action === "remove" ? "removed" : p.status,
              verified: action === "verify" ? true : p.verified,
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
          <h2 className="text-xl font-bold text-gray-900">Roommate Matching</h2>
          <p className="text-sm text-gray-500 mt-1">Manage roommate profiles, verify users and monitor matches</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            <Users className="w-3.5 h-3.5" /> {activeCount} active
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            <UserCheck className="w-3.5 h-3.5" /> {matchedCount} matched
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
              <Clock className="w-3.5 h-3.5" /> {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["active", "pending", "matched", "suspended", "removed"] as RoommateStatus[]).map((status) => {
          const conf = STATUS_CONFIG[status];
          const count = profiles.filter((p) => p.status === status).length;
          return (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`p-3 rounded-xl border text-left transition ${statusFilter === status ? "border-[#0076EB] bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}
            >
              <p className="text-xl font-bold text-gray-900">{count}</p>
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
              placeholder="Search by name, location or occupation..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {(["all", "roommate", "room"] as const).map((l) => (
              <button
                key={l}
                onClick={() => { setLookingFilter(l); setPage(1); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
                  lookingFilter === l ? "bg-[#0076EB] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {l === "all" ? "All" : l === "roommate" ? "Seeking Roommate" : "Seeking Room"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Profile</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Budget & Location</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Preferences</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((profile) => {
                const statusConf = STATUS_CONFIG[profile.status];
                return (
                  <tr key={profile.id} className={`hover:bg-gray-50 transition ${profile.status === "suspended" ? "bg-red-50/20" : profile.status === "pending" ? "bg-yellow-50/20" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D3FD1] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {profile.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
                            {profile.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                          <p className="text-xs text-gray-500">{profile.age} · {profile.occupation}</p>
                          {profile.reports > 0 && (
                            <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3" /> {profile.reports} reports
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-green-500" />{profile.budget.replace("$", "")}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{profile.location}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Move-in: {profile.moveInDate}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Seeking:</span> {profile.lookingFor === "room" ? "A room" : "A roommate"}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Gender pref:</span> {profile.genderPref}
                        </p>
                        <div className="flex items-center gap-2">
                          {profile.pets && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Pets OK</span>}
                          {profile.smoking && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Smoking OK</span>}
                          <span className="text-xs text-gray-400"><Eye className="w-3 h-3 inline mr-0.5" />{profile.views}</span>
                          <span className="text-xs text-gray-400"><Star className="w-3 h-3 inline mr-0.5" />{profile.matches}</span>
                        </div>
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
                          onClick={() => setActionMenu(actionMenu === profile.id ? null : profile.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {actionMenu === profile.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1">
                              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                <Eye className="w-4 h-4" /> View Profile
                              </button>
                              {profile.status === "pending" && (
                                <>
                                  <button onClick={() => handleAction(profile.id, "approve")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50">
                                    <CheckCircle2 className="w-4 h-4" /> Approve
                                  </button>
                                  <button onClick={() => handleAction(profile.id, "suspend")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                                    <XCircle className="w-4 h-4" /> Reject
                                  </button>
                                </>
                              )}
                              {profile.status === "active" && !profile.verified && (
                                <button onClick={() => handleAction(profile.id, "verify")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50">
                                  <ShieldCheck className="w-4 h-4" /> Verify Profile
                                </button>
                              )}
                              {profile.status === "suspended" && (
                                <button onClick={() => handleAction(profile.id, "approve")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50">
                                  <CheckCircle2 className="w-4 h-4" /> Reactivate
                                </button>
                              )}
                              {profile.status !== "suspended" && (
                                <button onClick={() => handleAction(profile.id, "suspend")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-yellow-700 hover:bg-yellow-50">
                                  <Ban className="w-4 h-4" /> Suspend
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button onClick={() => handleAction(profile.id, "remove")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
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
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No roommate profiles match your filters</p>
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
