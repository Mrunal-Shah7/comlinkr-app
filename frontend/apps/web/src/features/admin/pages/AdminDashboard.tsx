import {
  Users, FileText, TrendingUp, AlertTriangle, Eye, ArrowUpRight,
  Home, UtensilsCrossed, Calendar, Activity, MessageCircle,
  Headphones, Shield, UserCheck, BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

function getCount(key: string): number {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored).length;
  } catch {}
  return 0;
}

function getRecentActivity(): { user: string; action: string; type: string; time: string; ts: number }[] {
  const activities: { user: string; action: string; type: string; time: string; ts: number }[] = [];

  try {
    const listings = JSON.parse(localStorage.getItem("comlinkr_listings") || "[]");
    for (const l of listings) {
      if (l.postedDate === "Just now") {
        activities.push({ user: l.landlord?.name || "User", action: `listed "${l.title}"`, type: "housing", time: "Recently", ts: parseInt(l.id?.replace("l_", "") || "0") });
      }
    }
  } catch {}

  try {
    const news = JSON.parse(localStorage.getItem("comlinkr_news") || "[]");
    for (const n of news) {
      if (n.timestamp === "Just now") {
        activities.push({ user: n.author?.name || "User", action: `posted "${n.title}"`, type: "news", time: "Recently", ts: parseInt(n.id?.replace("news_", "") || "0") });
      }
    }
  } catch {}

  try {
    const events = JSON.parse(localStorage.getItem("comlinkr_events") || "[]");
    for (const e of events) {
      if (e.id?.startsWith("evt_")) {
        activities.push({ user: e.host?.name || "User", action: `created event "${e.title}"`, type: "event", time: "Recently", ts: parseInt(e.id?.replace("evt_", "") || "0") });
      }
    }
  } catch {}

  try {
    const users = JSON.parse(localStorage.getItem("comlinkr_all_users") || "[]");
    for (const u of users) {
      activities.push({ user: u.name, action: "joined the community", type: "user", time: u.joinDate || "Recently", ts: parseInt(u.id?.replace("u_", "") || "0") });
    }
  } catch {}

  try {
    const tickets = JSON.parse(localStorage.getItem("comlinkr_support_requests") || "[]");
    for (const t of tickets) {
      activities.push({ user: t.userName || "User", action: `opened support ticket: "${t.subject}"`, type: "support", time: "Recently", ts: parseInt(t.id?.replace("ticket_", "") || "0") });
    }
  } catch {}

  activities.sort((a, b) => b.ts - a.ts);
  return activities.slice(0, 8);
}

const FALLBACK_ACTIVITY = [
  { user: "Sarah M.", action: "created a new housing listing", type: "housing", time: "2 min ago" },
  { user: "James K.", action: "reported a post", type: "report", time: "8 min ago" },
  { user: "Emily R.", action: "joined the community", type: "user", time: "15 min ago" },
  { user: "Marcus J.", action: 'opened support ticket: "Cannot reset password"', type: "support", time: "30 min ago" },
  { user: "Priya S.", action: "created a roommate profile", type: "roommate", time: "1 hr ago" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0, news: 0, events: 0, listings: 0, restaurants: 0, roommates: 0, supportTickets: 0,
  });
  const [recentActivity, setRecentActivity] = useState<{ user: string; action: string; type: string; time: string }[]>([]);

  useEffect(() => {
    const userCount = getCount("comlinkr_all_users") + 3;
    const newsCount = getCount("comlinkr_news");
    const eventsCount = getCount("comlinkr_events");
    const listingsCount = getCount("comlinkr_listings");
    const restaurantsCount = getCount("comlinkr_restaurants");
    const roommatesCount = getCount("comlinkr_roommates");
    const supportCount = getCount("comlinkr_support_requests");
    setStats({ users: userCount, news: newsCount, events: eventsCount, listings: listingsCount, restaurants: restaurantsCount, roommates: roommatesCount, supportTickets: supportCount });
    const activity = getRecentActivity();
    setRecentActivity(activity.length > 0 ? activity : FALLBACK_ACTIVITY);
  }, []);

  const STATS_CARDS = [
    { label: "Total Users",      value: (stats.users + 47).toLocaleString(),                          change: "+12%", icon: Users,          color: "from-[#0076EB] to-blue-400",     link: "/admin/users"     },
    { label: "Active Posts",     value: (stats.news + stats.events + stats.listings + 14).toLocaleString(), change: "+8%",  icon: FileText,       color: "from-[#26B324] to-green-400",    link: "/admin/feed"      },
    { label: "Restaurants",      value: (stats.restaurants + 5).toLocaleString(),                     change: "+24%", icon: UtensilsCrossed, color: "from-[#FF7B00] to-orange-400",  link: "/admin/food"      },
    { label: "Listings",         value: (stats.listings + 6).toLocaleString(),                        change: "+15%", icon: Home,            color: "from-purple-500 to-purple-400",  link: "/admin/listings"  },
    { label: "Community",        value: (stats.news + stats.events + 8).toLocaleString(),             change: "+31%", icon: MessageCircle,   color: "from-pink-500 to-pink-400",      link: "/admin/community" },
    { label: "Roommates",        value: (stats.roommates + 7).toLocaleString(),                       change: "+42%", icon: UserCheck,       color: "from-indigo-500 to-indigo-400",  link: "/admin/roommates" },
    { label: "Support Tickets",  value: (stats.supportTickets + 7).toLocaleString(),                  change: "+3%",  icon: Headphones,      color: "from-teal-500 to-teal-400",      link: "/admin/support"   },
    { label: "Open Reports",     value: "4",                                                           change: "-5%",  icon: AlertTriangle,   color: "from-red-500 to-red-400",         link: "/admin/reports"   },
  ];

  const CONTENT_BREAKDOWN = [
    { label: "Feed Posts",        count: stats.news + 6,               icon: FileText,       color: "bg-blue-100 text-blue-600",   link: "/admin/feed"      },
    { label: "Events",            count: stats.events + 8,             icon: Calendar,       color: "bg-green-100 text-green-600", link: "/admin/feed"      },
    { label: "Housing Listings",  count: stats.listings + 6,           icon: Home,           color: "bg-orange-100 text-orange-600", link: "/admin/listings"},
    { label: "Restaurants",       count: stats.restaurants + 5,        icon: UtensilsCrossed,color: "bg-purple-100 text-purple-600", link: "/admin/food"    },
    { label: "Community Posts",   count: stats.news + stats.events + 8,icon: MessageCircle,  color: "bg-pink-100 text-pink-600",   link: "/admin/community" },
    { label: "Roommate Profiles", count: stats.roommates + 7,          icon: UserCheck,      color: "bg-indigo-100 text-indigo-600",link: "/admin/roommates"},
  ];

  const maxCount = Math.max(...CONTENT_BREAKDOWN.map(c => c.count), 1);

  const QUICK_ACTIONS = [
    { label: "Users",      icon: Users,         color: "text-[#0076EB]", bg: "bg-blue-50 hover:bg-blue-100",     link: "/admin/users"     },
    { label: "Reports",    icon: AlertTriangle,  color: "text-red-500",   bg: "bg-red-50 hover:bg-red-100",       link: "/admin/reports"   },
    { label: "Support",    icon: Headphones,     color: "text-teal-600",  bg: "bg-teal-50 hover:bg-teal-100",     link: "/admin/support"   },
    { label: "Auth",       icon: Shield,         color: "text-purple-600",bg: "bg-purple-50 hover:bg-purple-100", link: "/admin/auth"      },
    { label: "Analytics",  icon: BarChart3,      color: "text-green-600", bg: "bg-green-50 hover:bg-green-100",   link: "/admin/analytics" },
    { label: "Roommates",  icon: UserCheck,      color: "text-indigo-600",bg: "bg-indigo-50 hover:bg-indigo-100", link: "/admin/roommates" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS_CARDS.map((stat) => (
          <Link to={stat.link} key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition block">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                stat.change.startsWith("+") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#0076EB]" />
              <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
            </div>
            <Link to="/admin/content" className="text-sm text-[#0076EB] font-semibold hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity.map((item, idx) => (
              <div key={idx} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                    item.type === "housing" ? "bg-[#0076EB]" :
                    item.type === "report"  ? "bg-red-500"   :
                    item.type === "user"    ? "bg-[#26B324]" :
                    item.type === "food"    ? "bg-[#FF7B00]" :
                    item.type === "support" ? "bg-teal-500"  :
                    item.type === "roommate"? "bg-indigo-500":
                    "bg-purple-500"
                  }`}>
                    {item.user.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">{item.user}</span> {item.action}
                    </p>
                    <p className="text-xs text-gray-400">{item.time}</p>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-gray-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Content Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
              <TrendingUp className="w-5 h-5 text-[#26B324]" />
              <h2 className="text-base font-bold text-gray-900">Content Overview</h2>
            </div>
            <div className="p-5 space-y-3">
              {CONTENT_BREAKDOWN.map((item) => (
                <Link to={item.link} key={item.label} className="flex items-center gap-3 hover:opacity-80 transition">
                  <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#0076EB] to-[#26B324] rounded-full transition-all"
                        style={{ width: `${Math.max((item.count / maxCount) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  to={action.link}
                  className={`flex flex-col items-center gap-1.5 p-3 ${action.bg} rounded-xl transition text-center`}
                >
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                  <span className="text-xs font-semibold text-gray-700">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
