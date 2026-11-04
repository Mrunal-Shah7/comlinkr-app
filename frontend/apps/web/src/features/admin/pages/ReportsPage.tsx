import { useState } from "react";
import {
  AlertTriangle,
  Flag,
  User,
  FileText,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ChevronRight,
  Shield,
} from "lucide-react";

type ReportStatus = "pending" | "resolved" | "dismissed";
type ReportType = "spam" | "harassment" | "misinformation" | "inappropriate" | "scam";

interface Report {
  id: string;
  reportedContent: string;
  reportedBy: string;
  reportedUser: string;
  type: ReportType;
  reason: string;
  status: ReportStatus;
  date: string;
  category: "post" | "user" | "message" | "listing";
}

const MOCK_REPORTS: Report[] = [
  { id: "1", reportedContent: "Spam post about crypto trading", reportedBy: "Sarah M.", reportedUser: "CryptoGuy99", type: "spam", reason: "Repeated spam posts promoting scam crypto sites", status: "pending", date: "Feb 12, 2026", category: "post" },
  { id: "2", reportedContent: "Offensive comment on community post", reportedBy: "James K.", reportedUser: "ToxicUser", type: "harassment", reason: "Hate speech and personal attacks in comments", status: "pending", date: "Feb 12, 2026", category: "message" },
  { id: "3", reportedContent: "Fake apartment listing", reportedBy: "Emily R.", reportedUser: "FakeAgent", type: "scam", reason: "Listing photos stolen from another site, requesting wire transfer", status: "pending", date: "Feb 11, 2026", category: "listing" },
  { id: "4", reportedContent: "False news about local policy", reportedBy: "Mike T.", reportedUser: "NewsBot", type: "misinformation", reason: "Fabricated claims about city regulations", status: "resolved", date: "Feb 10, 2026", category: "post" },
  { id: "5", reportedContent: "Inappropriate profile content", reportedBy: "Lisa W.", reportedUser: "BadProfile", type: "inappropriate", reason: "Offensive profile picture and bio content", status: "dismissed", date: "Feb 9, 2026", category: "user" },
  { id: "6", reportedContent: "Restaurant review with threats", reportedBy: "David B.", reportedUser: "AngryReviewer", type: "harassment", reason: "Threatening language directed at restaurant owner", status: "pending", date: "Feb 9, 2026", category: "post" },
  { id: "7", reportedContent: "Duplicate spam listings", reportedBy: "Ana G.", reportedUser: "SpamLister", type: "spam", reason: "Same listing posted 15 times across different categories", status: "resolved", date: "Feb 8, 2026", category: "listing" },
];

const TYPE_COLORS: Record<ReportType, string> = {
  spam: "bg-gray-100 text-gray-700",
  harassment: "bg-red-100 text-red-700",
  misinformation: "bg-yellow-100 text-yellow-700",
  inappropriate: "bg-orange-100 text-orange-700",
  scam: "bg-purple-100 text-purple-700",
};

const CATEGORY_ICONS = {
  post: FileText,
  user: User,
  message: MessageCircle,
  listing: Shield,
};

const STATUS_CONFIG: Record<ReportStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  resolved: { bg: "bg-green-100", text: "text-green-700", label: "Resolved" },
  dismissed: { bg: "bg-gray-100", text: "text-gray-600", label: "Dismissed" },
};

export default function ReportsPage() {
  const [tab, setTab] = useState<"all" | "pending" | "resolved">("all");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const filtered = MOCK_REPORTS.filter((r) => {
    if (tab === "pending") return r.status === "pending";
    if (tab === "resolved") return r.status === "resolved" || r.status === "dismissed";
    return true;
  });

  const pendingCount = MOCK_REPORTS.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Review and resolve user reports</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {pendingCount} pending
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["spam", "harassment", "misinformation", "scam"] as ReportType[]).map((type) => {
          const count = MOCK_REPORTS.filter((r) => r.type === type).length;
          return (
            <div key={type} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 capitalize mt-1">{type}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["all", "pending", "resolved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition capitalize flex items-center gap-1.5 ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
            {t === "pending" && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filtered.map((report) => {
          const CategoryIcon = CATEGORY_ICONS[report.category];
          const statusConf = STATUS_CONFIG[report.status];
          const isExpanded = expandedReport === report.id;

          return (
            <div
              key={report.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                report.status === "pending" ? "border-yellow-200" : "border-gray-100"
              }`}
            >
              <button
                onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  report.status === "pending" ? "bg-yellow-100" : "bg-gray-100"
                }`}>
                  <Flag className={`w-5 h-5 ${report.status === "pending" ? "text-yellow-600" : "text-gray-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{report.reportedContent}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${TYPE_COLORS[report.type]}`}>
                      {report.type}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <CategoryIcon className="w-3 h-3" /> {report.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {report.date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusConf.bg} ${statusConf.text}`}>
                    {statusConf.label}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Reported By</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0076EB] flex items-center justify-center text-white text-xs font-bold">
                          {report.reportedBy.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{report.reportedBy}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Reported User</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                          {report.reportedUser.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{report.reportedUser}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Reason</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{report.reason}</p>
                  </div>

                  {report.status === "pending" && (
                    <div className="flex items-center gap-3 pt-2">
                      <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-100 hover:bg-green-200 text-green-700 font-semibold text-sm rounded-xl transition">
                        <CheckCircle2 className="w-4 h-4" />
                        Resolve & Take Action
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm rounded-xl transition">
                        <XCircle className="w-4 h-4" />
                        Dismiss
                      </button>
                      <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-100 hover:bg-red-200 text-red-600 font-semibold text-sm rounded-xl transition">
                        <Eye className="w-4 h-4" />
                        Ban User
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">All clear!</p>
          <p className="text-sm text-gray-400 mt-1">No reports to review in this category</p>
        </div>
      )}
    </div>
  );
}
