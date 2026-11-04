import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Shield,
  Mail,
  Ban,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";

type UserStatus = "active" | "suspended" | "pending";

interface AppUser {
  id: string;
  name: string;
  email: string;
  handle?: string;
  city: string;
  joinDate: string;
  posts: number;
  status: UserStatus;
  avatar: string;
  verified: boolean;
  role?: string;
}

const FALLBACK_USERS: AppUser[] = [
  { id: "1", name: "Sarah Martinez", email: "sarah.m@email.com", city: "New York", joinDate: "Jan 15, 2026", posts: 24, status: "active", avatar: "SM", verified: true },
  { id: "2", name: "James Kim", email: "james.k@email.com", city: "Los Angeles", joinDate: "Jan 22, 2026", posts: 12, status: "active", avatar: "JK", verified: true },
  { id: "3", name: "Emily Rivera", email: "emily.r@email.com", city: "Chicago", joinDate: "Feb 1, 2026", posts: 3, status: "pending", avatar: "ER", verified: false },
];

function loadAllUsers(): AppUser[] {
  const users: AppUser[] = [...FALLBACK_USERS];
  const seenEmails = new Set(users.map(u => u.email));

  // Load registered users from localStorage
  try {
    const stored = localStorage.getItem("comlinkr_all_users");
    if (stored) {
      const registered = JSON.parse(stored) as any[];
      for (const u of registered) {
        if (!seenEmails.has(u.email)) {
          seenEmails.add(u.email);
          users.push({
            id: u.id,
            name: u.name,
            email: u.email,
            handle: u.handle,
            city: u.city || "Not set",
            joinDate: u.joinDate || "Recently",
            posts: u.posts ?? 0,
            status: (u.status as UserStatus) || "active",
            avatar: u.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U",
            verified: false,
            role: u.role || "user",
          });
        }
      }
    }
  } catch {}

  // Also check for the current logged-in user
  try {
    const currentUser = localStorage.getItem("comlinkr_user");
    if (currentUser) {
      const cu = JSON.parse(currentUser);
      if (cu.email && !seenEmails.has(cu.email)) {
        users.push({
          id: cu.id,
          name: cu.name,
          email: cu.email,
          handle: cu.handle,
          city: cu.city || "Not set",
          joinDate: "Recently",
          posts: 0,
          status: "active",
          avatar: cu.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U",
          verified: false,
          role: cu.role || "user",
        });
      }
    }
  } catch {}

  return users;
}

const STATUS_STYLES: Record<UserStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  suspended: { bg: "bg-red-100", text: "text-red-700", label: "Suspended" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
};

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | UserStatus>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => {
    setAllUsers(loadAllUsers());
  }, []);

  const filtered = allUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUsers.size === paginated.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginated.map((u) => u.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-1">{allUsers.length.toLocaleString()} total users</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0076EB] to-[#26B324] text-white text-sm font-semibold rounded-xl hover:shadow-lg transition">
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search users by name, email, or city..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {(["all", "active", "suspended", "pending"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition capitalize ${
                  filterStatus === s
                    ? "bg-[#0076EB] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {selectedUsers.size > 0 && (
          <div className="mt-3 flex items-center gap-3 px-4 py-2.5 bg-blue-50 rounded-xl">
            <span className="text-sm font-medium text-[#0076EB]">{selectedUsers.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <button className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg hover:bg-green-200 transition">Approve</button>
              <button className="text-xs font-semibold text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">Suspend</button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3.5 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#0076EB] focus:ring-[#0076EB]"
                  />
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">City</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Posts</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 transition ${selectedUsers.has(user.id) ? "bg-blue-50/50" : ""}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#0076EB] focus:ring-[#0076EB]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-900 truncate">{user.name}</span>
                          {user.verified && <CheckCircle2 className="w-3.5 h-3.5 text-[#0076EB] flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{user.city}</span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className="text-sm text-gray-500">{user.joinDate}</span>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="text-sm font-medium text-gray-900">{user.posts}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${STATUS_STYLES[user.status].bg} ${STATUS_STYLES[user.status].text}`}>
                      {STATUS_STYLES[user.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      {actionMenu === user.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1">
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <Eye className="w-4 h-4" /> View Profile
                            </button>
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <Mail className="w-4 h-4" /> Send Email
                            </button>
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <Shield className="w-4 h-4" /> Change Role
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            {user.status === "suspended" ? (
                              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50">
                                <CheckCircle2 className="w-4 h-4" /> Reactivate
                              </button>
                            ) : (
                              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                                <Ban className="w-4 h-4" /> Suspend
                              </button>
                            )}
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                              <XCircle className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                  page === i + 1 ? "bg-[#0076EB] text-white" : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
