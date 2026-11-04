import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Settings, Bell, FileText, HelpCircle, Shield, LayoutDashboard } from "lucide-react";
import { ROUTES } from "../routes/routePaths";
import { useAuth } from "../providers/AuthProvider";

const MENU_ITEMS = [
  { label: "Profile", icon: User, to: ROUTES.profile },
  { label: "My Posts", icon: FileText, to: ROUTES.myPosts },
  { label: "Notifications", icon: Bell, to: ROUTES.notifications },
  { label: "Settings", icon: Settings, to: ROUTES.settings },
  { label: "Help & Support", icon: HelpCircle, to: ROUTES.support },
  { label: "Privacy Policy", icon: Shield, to: ROUTES.privacyPolicy },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const { logout, user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function handleLogout() {
    // Call AuthProvider's logout to clear all auth state
    logout();
    
    // Close menu
    setOpen(false);
    
    // Navigate to login page
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition"
        aria-label="Open menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">Open menu</span>
        <div className="flex flex-col gap-1">
          <span className={`block h-0.5 w-5 bg-gray-900 rounded transition-all ${open ? 'rotate-45 translate-y-1.5' : ''}`} />
          <span className={`block h-0.5 w-5 bg-gray-900 rounded transition-all ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-5 bg-gray-900 rounded transition-all ${open ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 z-50 animate-fadeIn">
            <div className="flex flex-col py-2">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Menu</p>
              </div>
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center gap-3 px-4 py-3 text-gray-900 hover:bg-gray-50 transition"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="h-5 w-5 text-brand-blue" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              {isAdmin && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <Link
                    to={ROUTES.admin}
                    className="flex items-center gap-3 px-4 py-3 text-gray-900 hover:bg-blue-50 transition"
                    onClick={() => setOpen(false)}
                  >
                    <LayoutDashboard className="h-5 w-5 text-[#0076EB]" />
                    <span className="font-medium">Admin Panel</span>
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#0076EB] text-white rounded-full">ADMIN</span>
                  </Link>
                </>
              )}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition rounded-lg"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
