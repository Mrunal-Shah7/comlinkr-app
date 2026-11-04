import { useState, useEffect } from "react";
import {
  Shield, Users, Lock, Ban, RefreshCw,
  CheckCircle2, AlertTriangle, Clock, Globe,
  Smartphone, Monitor, Key, LogOut, Search,
  UserX, ShieldCheck, Activity, MapPin,
} from "lucide-react";

interface AuthSession {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  email: string;
  device: "mobile" | "web" | "tablet";
  os: string;
  ip: string;
  location: string;
  loginTime: string;
  lastActive: string;
  status: "active" | "expired" | "revoked";
  suspicious: boolean;
}

interface AuthLog {
  id: string;
  userName: string;
  userAvatar: string;
  action: "login" | "logout" | "signup" | "password_reset" | "failed_login" | "account_locked";
  ip: string;
  device: string;
  timestamp: string;
  status: "success" | "failed" | "warning";
}

const MOCK_SESSIONS: AuthSession[] = [
  { id: "s1", userId: "user_001", userName: "Alex P.", userAvatar: "AP", email: "alex.p@email.com", device: "web", os: "Windows 11", ip: "192.168.1.45", location: "New York, US", loginTime: "Mar 6, 2026 09:12", lastActive: "2 min ago", status: "active", suspicious: false },
  { id: "s2", userId: "user_002", userName: "Maria L.", userAvatar: "ML", email: "maria.l@email.com", device: "mobile", os: "iOS 18", ip: "10.0.0.22", location: "New York, US", loginTime: "Mar 6, 2026 08:45", lastActive: "15 min ago", status: "active", suspicious: false },
  { id: "s3", userId: "landlord_1", userName: "Sarah Johnson", userAvatar: "SJ", email: "sarah.johnson@comlinkr.com", device: "web", os: "macOS 15", ip: "203.45.67.89", location: "New York, US", loginTime: "Mar 5, 2026 16:30", lastActive: "1 hr ago", status: "active", suspicious: false },
  { id: "s4", userId: "unknown_001", userName: "Unknown User", userAvatar: "??", email: "hacker@suspicious.com", device: "web", os: "Linux", ip: "45.33.32.156", location: "Moscow, RU", loginTime: "Mar 6, 2026 03:22", lastActive: "3 hr ago", status: "active", suspicious: true },
  { id: "s5", userId: "restaurant_1", userName: "Bella Napoli", userAvatar: "BN", email: "owner@bellanapoli.com", device: "tablet", os: "iPadOS 18", ip: "172.16.0.5", location: "New York, US", loginTime: "Mar 5, 2026 12:00", lastActive: "Yesterday", status: "expired", suspicious: false },
  { id: "s6", userId: "user_003", userName: "James K.", userAvatar: "JK", email: "james.k@email.com", device: "mobile", os: "Android 15", ip: "192.168.0.100", location: "Los Angeles, US", loginTime: "Mar 4, 2026 18:00", lastActive: "2 days ago", status: "revoked", suspicious: false },
];

const MOCK_AUTH_LOGS: AuthLog[] = [
  { id: "al1", userName: "Alex P.", userAvatar: "AP", action: "login", ip: "192.168.1.45", device: "Chrome/Windows", timestamp: "Mar 6, 2026 09:12", status: "success" },
  { id: "al2", userName: "Maria L.", userAvatar: "ML", action: "login", ip: "10.0.0.22", device: "Safari/iOS", timestamp: "Mar 6, 2026 08:45", status: "success" },
  { id: "al3", userName: "Unknown", userAvatar: "??", action: "failed_login", ip: "45.33.32.156", device: "Firefox/Linux", timestamp: "Mar 6, 2026 03:22", status: "failed" },
  { id: "al4", userName: "Unknown", userAvatar: "??", action: "failed_login", ip: "45.33.32.156", device: "Firefox/Linux", timestamp: "Mar 6, 2026 03:21", status: "failed" },
  { id: "al5", userName: "Unknown", userAvatar: "??", action: "account_locked", ip: "45.33.32.156", device: "Firefox/Linux", timestamp: "Mar 6, 2026 03:23", status: "warning" },
  { id: "al6", userName: "Emily R.", userAvatar: "ER", action: "signup", ip: "172.31.0.1", device: "Chrome/Windows", timestamp: "Mar 5, 2026 14:15", status: "success" },
  { id: "al7", userName: "James K.", userAvatar: "JK", action: "password_reset", ip: "192.168.0.100", device: "Chrome/Android", timestamp: "Mar 5, 2026 11:30", status: "success" },
  { id: "al8", userName: "Sarah Johnson", userAvatar: "SJ", action: "logout", ip: "203.45.67.89", device: "Safari/macOS", timestamp: "Mar 5, 2026 17:00", status: "success" },
];

const DEVICE_ICON = { mobile: Smartphone, web: Monitor, tablet: Smartphone };

const ACTION_CONFIG: Record<AuthLog["action"], { label: string; color: string }> = {
  login: { label: "Login", color: "bg-green-100 text-green-700" },
  logout: { label: "Logout", color: "bg-gray-100 text-gray-600" },
  signup: { label: "Sign Up", color: "bg-blue-100 text-blue-700" },
  password_reset: { label: "Password Reset", color: "bg-purple-100 text-purple-700" },
  failed_login: { label: "Failed Login", color: "bg-red-100 text-red-700" },
  account_locked: { label: "Account Locked", color: "bg-orange-100 text-orange-700" },
};

function loadAuthData() {
  const users: { email: string; name: string }[] = [];
  try {
    const stored = JSON.parse(localStorage.getItem("comlinkr_all_users") || "[]") as any[];
    for (const u of stored) {
      users.push({ email: u.email, name: u.name });
    }
  } catch {}
  return users;
}

export default function AuthManagementPage() {
  const [tab, setTab] = useState<"sessions" | "logs" | "security">("sessions");
  const [sessions, setSessions] = useState<AuthSession[]>(MOCK_SESSIONS);
  const [logs] = useState<AuthLog[]>(MOCK_AUTH_LOGS);
  const [search, setSearch] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<{ email: string; name: string }[]>([]);

  useEffect(() => { setRegisteredUsers(loadAuthData()); }, []);

  const allSessions = [
    ...sessions,
    ...registeredUsers.map((u, i) => ({
      id: `reg_${i}`,
      userId: `reg_${i}`,
      userName: u.name,
      userAvatar: u.name.slice(0, 2).toUpperCase(),
      email: u.email,
      device: "web" as const,
      os: "Unknown",
      ip: "N/A",
      location: "Unknown",
      loginTime: "Recently",
      lastActive: "Unknown",
      status: "active" as const,
      suspicious: false,
    })),
  ];

  const filteredSessions = allSessions.filter((s) =>
    s.userName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.ip.includes(search)
  );

  const suspiciousCount = sessions.filter((s) => s.suspicious).length;
  const activeCount = sessions.filter((s) => s.status === "active").length;
  const failedLoginsToday = logs.filter((l) => l.action === "failed_login").length;

  const revokeSession = (id: string) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, status: "revoked" as const } : s));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Authentication Management</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor sessions, auth logs and security events</p>
        </div>
        {suspiciousCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> {suspiciousCount} suspicious session{suspiciousCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">Active Sessions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{allSessions.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Sessions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{failedLoginsToday}</p>
          <p className="text-xs text-gray-500 mt-1">Failed Logins</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-2">
            <Shield className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{suspiciousCount}</p>
          <p className="text-xs text-gray-500 mt-1">Suspicious</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["sessions", "logs", "security"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition capitalize flex items-center gap-1.5 ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "sessions" && <Monitor className="w-3.5 h-3.5" />}
            {t === "logs" && <Activity className="w-3.5 h-3.5" />}
            {t === "security" && <Shield className="w-3.5 h-3.5" />}
            {t === "sessions" ? "Active Sessions" : t === "logs" ? "Auth Logs" : "Security"}
          </button>
        ))}
      </div>

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, email or IP..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20 focus:border-[#0076EB]"
            />
          </div>

          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const DeviceIcon = DEVICE_ICON[session.device];
              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition ${
                    session.suspicious ? "border-red-200 bg-red-50/20" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                        session.suspicious ? "bg-red-500" : "bg-gradient-to-br from-[#0076EB] to-[#26B324]"
                      }`}>
                        {session.userAvatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{session.userName}</p>
                          {session.suspicious && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Suspicious
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            session.status === "active" ? "bg-green-100 text-green-700" :
                            session.status === "expired" ? "bg-gray-100 text-gray-500" : "bg-red-100 text-red-700"
                          }`}>
                            {session.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{session.email}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-400">
                          <span className="flex items-center gap-1"><DeviceIcon className="w-3 h-3" />{session.os}</span>
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{session.ip}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{session.location}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last active: {session.lastActive}</span>
                        </div>
                      </div>
                    </div>
                    {session.status === "active" && (
                      <button
                        onClick={() => revokeSession(session.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-xl transition flex-shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auth Logs Tab */}
      {tab === "logs" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Authentication Events</h3>
            <button className="flex items-center gap-1.5 text-xs text-[#0076EB] font-semibold hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const actionConf = ACTION_CONFIG[log.action];
              return (
                <div key={log.id} className={`px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition ${log.status === "failed" ? "bg-red-50/30" : log.status === "warning" ? "bg-orange-50/30" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    log.status === "failed" ? "bg-red-500" : log.status === "warning" ? "bg-orange-500" : "bg-[#26B324]"
                  }`}>
                    {log.status === "failed" ? "!" : log.status === "warning" ? "⚠" : log.userAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{log.userName}</p>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${actionConf.color}`}>
                        {actionConf.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{log.ip} · {log.device} · {log.timestamp}</p>
                  </div>
                  {log.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : log.status === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <div className="space-y-4">
          {/* Suspicious Activity Alert */}
          {suspiciousCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900">Suspicious Activity Detected</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {suspiciousCount} session(s) from unusual locations. Possible brute-force attack from IP 45.33.32.156 (Moscow, RU) — 3 failed login attempts followed by suspicious active session.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition">
                      <Ban className="w-3.5 h-3.5" /> Block IP
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 text-xs font-semibold rounded-xl hover:bg-red-200 transition">
                      <UserX className="w-3.5 h-3.5" /> Revoke Session
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Security Configuration</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { icon: Key, label: "Two-Factor Authentication", desc: "Require 2FA for admin accounts", value: "Enabled", color: "text-green-600" },
                { icon: Clock, label: "Session Timeout", desc: "Auto-logout after inactivity", value: "30 minutes", color: "text-blue-600" },
                { icon: Lock, label: "Password Policy", desc: "Minimum 8 chars, 1 uppercase, 1 number", value: "Enforced", color: "text-green-600" },
                { icon: Globe, label: "IP Rate Limiting", desc: "Max 5 failed attempts per IP per hour", value: "Active", color: "text-green-600" },
                { icon: ShieldCheck, label: "Account Lock Policy", desc: "Lock after 5 consecutive failures", value: "Enabled", color: "text-green-600" },
              ].map((item) => (
                <div key={item.label} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Registered Users from Auth */}
          {registeredUsers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Registered Users ({registeredUsers.length})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {registeredUsers.map((u, i) => (
                  <div key={i} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
