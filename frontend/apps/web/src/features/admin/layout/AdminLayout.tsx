import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, BarChart3, Settings,
  Shield, ChevronLeft, Menu, X, LogOut, Bell, Search,
  Home, UtensilsCrossed, MessageCircle, UserCheck, Headphones,
  Rss, Flag, Lock,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",  icon: LayoutDashboard, path: "/admin"          },
      { label: "Analytics",  icon: BarChart3,        path: "/admin/analytics"},
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Feed",       icon: Rss,              path: "/admin/feed"      },
      { label: "Listings",   icon: Home,             path: "/admin/listings"  },
      { label: "Food",       icon: UtensilsCrossed,  path: "/admin/food"      },
      { label: "Community",  icon: MessageCircle,    path: "/admin/community" },
      { label: "Roommates",  icon: UserCheck,        path: "/admin/roommates" },
      { label: "Moderation", icon: FileText,         path: "/admin/content"   },
    ],
  },
  {
    label: "Users & Safety",
    items: [
      { label: "Users",      icon: Users,            path: "/admin/users"     },
      { label: "Reports",    icon: Flag,             path: "/admin/reports"   },
      { label: "Auth",       icon: Lock,             path: "/admin/auth"      },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Support",    icon: Headphones,       path: "/admin/support"   },
      { label: "Settings",   icon: Settings,         path: "/admin/settings"  },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentLabel =
    ALL_NAV_ITEMS.find((item) =>
      item.path === "/admin"
        ? location.pathname === "/admin"
        : location.pathname.startsWith(item.path)
    )?.label ?? "Admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">Admin</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition relative">
          <Bell className="w-5 h-5 text-gray-700" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <SidebarContent
              currentPath={location.pathname}
              onClose={() => setSidebarOpen(false)}
              onNavigate={(path) => { navigate(path); setSidebarOpen(false); }}
            />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex-col z-40">
        <SidebarContent currentPath={location.pathname} onNavigate={(path) => navigate(path)} />
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex items-center justify-between h-16 px-8 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{currentLabel}</h1>
            <p className="text-xs text-gray-500">ComLinkr Admin Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB] w-64"
              />
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  currentPath,
  onClose,
  onNavigate,
}: {
  currentPath: string;
  onClose?: () => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100 flex-shrink-0">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center shadow-lg shadow-blue-200/50">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 leading-none">ComLinkr</span>
            <span className="block text-[10px] font-semibold text-[#0076EB] uppercase tracking-wider">Admin Panel</span>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Grouped Nav */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.path === "/admin"
                    ? currentPath === "/admin"
                    : currentPath.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => onNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? "bg-[#0076EB]/10 text-[#0076EB]"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <item.icon
                      className={`flex-shrink-0 ${isActive ? "text-[#0076EB]" : "text-gray-400"}`}
                      style={{ width: 17, height: 17 }}
                    />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-100 space-y-1 flex-shrink-0">
        <button
          onClick={() => onNavigate("/app/feed")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
          Back to App
        </button>
        <button
          onClick={() => onNavigate("/auth/login")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  );
}
