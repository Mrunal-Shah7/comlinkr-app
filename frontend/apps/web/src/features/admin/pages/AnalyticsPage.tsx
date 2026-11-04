import {
  TrendingUp,
  Users,
  FileText,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MapPin,
} from "lucide-react";

const WEEKLY_STATS = [
  { day: "Mon", users: 45, posts: 12 },
  { day: "Tue", users: 62, posts: 18 },
  { day: "Wed", users: 38, posts: 9 },
  { day: "Thu", users: 71, posts: 24 },
  { day: "Fri", users: 89, posts: 31 },
  { day: "Sat", users: 54, posts: 15 },
  { day: "Sun", users: 43, posts: 11 },
];

const TOP_POSTS = [
  { title: "Community Cleanup Drive This Saturday", views: 2341, likes: 189, type: "Event" },
  { title: "Best Coffee Shops in Manhattan", views: 1892, likes: 143, type: "News" },
  { title: "Spacious 2BR in Brooklyn Heights", views: 1654, likes: 98, type: "Listing" },
  { title: "Authentic Ramen at Ichiran NYC", views: 1432, likes: 201, type: "Restaurant" },
  { title: "Free Yoga in Central Park", views: 1287, likes: 167, type: "Event" },
];

const CITY_STATS = [
  { city: "New York", users: 4231, percentage: 33 },
  { city: "Los Angeles", users: 2187, percentage: 17 },
  { city: "Chicago", users: 1543, percentage: 12 },
  { city: "Houston", users: 1098, percentage: 9 },
  { city: "Phoenix", users: 876, percentage: 7 },
  { city: "Other", users: 2912, percentage: 22 },
];

const METRICS = [
  { label: "Page Views", value: "48.2K", change: "+18%", up: true, icon: Eye },
  { label: "Avg. Session", value: "4m 32s", change: "+7%", up: true, icon: Clock },
  { label: "New Sign-ups", value: "384", change: "+24%", up: true, icon: Users },
  { label: "Bounce Rate", value: "32%", change: "-5%", up: false, icon: TrendingUp },
];

export default function AnalyticsPage() {
  const maxUsers = Math.max(...WEEKLY_STATS.map((d) => d.users));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Platform performance and engagement metrics</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Last 7 Days</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <m.icon className="w-5 h-5 text-gray-400" />
              <span className={`flex items-center gap-0.5 text-xs font-bold ${m.up ? "text-green-600" : "text-red-600"}`}>
                {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {m.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0076EB]" />
              <h3 className="text-base font-bold text-gray-900">Weekly Activity</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0076EB]" /> Users
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#26B324]" /> Posts
              </span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-48">
            {WEEKLY_STATS.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end" style={{ height: "160px" }}>
                  <div
                    className="flex-1 bg-gradient-to-t from-[#0076EB] to-[#0076EB]/60 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${(day.users / maxUsers) * 100}%` }}
                    title={`${day.users} users`}
                  />
                  <div
                    className="flex-1 bg-gradient-to-t from-[#26B324] to-[#26B324]/60 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${(day.posts / maxUsers) * 100}%` }}
                    title={`${day.posts} posts`}
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <FileText className="w-5 h-5 text-[#26B324]" />
            <h3 className="text-base font-bold text-gray-900">Top Content</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {TOP_POSTS.map((post, idx) => (
              <div key={idx} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition">
                <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{post.type}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {post.views.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#0076EB]">❤️ {post.likes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users by City */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-[#FF7B00]" />
          <h3 className="text-base font-bold text-gray-900">Users by City</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CITY_STATS.map((c) => (
            <div key={c.city} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0076EB]/10 to-[#26B324]/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#0076EB]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{c.city}</span>
                  <span className="text-xs font-bold text-gray-500">{c.percentage}%</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0076EB] to-[#26B324] rounded-full transition-all"
                    style={{ width: `${c.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{c.users.toLocaleString()} users</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
