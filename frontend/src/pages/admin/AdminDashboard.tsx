import { useQuery } from "@tanstack/react-query";
import { adminApi, api } from "../../api";
import {
  Users,
  FileText,
  Globe,
  TrendingUp,
  Eye,
  MonitorSmartphone,
  Smartphone,
  UserCheck,
  PieChart,
  Video,
  MessageCircle,
  Megaphone,
  Brain,
  Shield,
  Download,
  DownloadCloud,
} from "lucide-react";
import { downloadCSV } from "../../utils/csvExport";
import AnomalyAlerts from "../../components/admin/AnomalyAlerts";
import UserSearchPanel from "../../components/admin/UserSearchPanel";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TooltipPayload {
  name: string;
  value: number | string;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface Stats {
  total_users: number;
  total_cvs: number;
  public_cvs: number;
  total_job_tracker_entries: number;
}

interface Overview {
  views: number;
  sessions: number;
  authenticated_users: number;
}

interface DailyRow {
  date: string;
  views: number;
  sessions: number;
}

interface TopPage {
  path: string;
  views: number;
}

interface InterviewStats {
  total_sessions: number;
  completed_sessions: number;
  active_sessions: number;
  avg_score: number | null;
  dimension_averages: { dimension: string; avg: number }[];
  status_breakdown: Record<string, number>;
}

interface EngagementStats {
  active_users_30d: number;
  total_feedback: number;
  feedback_per_100_users: number;
  sentiment_breakdown: Record<string, number>;
  total_announcements: number;
  announcement_clicks: number;
  announcement_dismisses: number;
}

// ─── AI Usage Stats ─────────────────────────────────────────────────────────────────
interface AIDailyStats {
  date: string;
  calls: number;
  tokens: number;
  failed: number;
  [key: string]: unknown;
}

interface AIFeatureBreakdown {
  feature: string;
  calls: number;
}

interface AIStats {
  total_calls: number;
  daily: AIDailyStats[];
  feature_breakdown: AIFeatureBreakdown[];
  error_rate: number;
  active_users_30d: number;
}

// ─── Security Stats ────────────────────────────────────────────────────────────────
interface SecurityStats {
  total_failed_logins: number;
  daily_failed: { date: string; count: number }[];
  top_failed_usernames: { username: string; count: number }[];
  unique_ips_30d: number;
  total_other_events: number;
}

// ─── Export Stats ────────────────────────────────────────────────────────────────
interface ExportDailyStats {
  date: string;
  count: number;
  size_mb: number;
  [key: string]: unknown;
}

interface ExportTypeBreakdown {
  type: string;
  count: number;
  size_mb: number;
}

interface ExportStats {
  total_exports: number;
  daily: ExportDailyStats[];
  type_breakdown: ExportTypeBreakdown[];
  active_users_30d: number;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number | undefined;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-ash-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-ash flex items-center justify-center">
          <Icon size={13} className="text-ink-muted" />
        </div>
        <span className="text-xs text-ink-muted">{label}</span>
      </div>
      <p className="font-display text-2xl font-bold text-ink leading-none">
        {value ?? "—"}
      </p>
      {sub && <p className="text-[11px] text-ink-muted mt-1">{sub}</p>}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ash-border rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-ink mb-1">{label}</p>
      {payload.map((p: TooltipPayload) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric" });

import Seo from "../../components/Seo";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: adminApi.stats,
  });
  const { data: overview } = useQuery<Overview>({
    queryKey: ["analytics-overview"],
    queryFn: () => api.get("/analytics/overview").then((r) => r.data),
  });
  const { data: daily = [] } = useQuery<DailyRow[]>({
    queryKey: ["analytics-daily"],
    queryFn: () => api.get("/analytics/daily?days=30").then((r) => r.data),
  });
  const { data: topPages = [] } = useQuery<TopPage[]>({
    queryKey: ["analytics-top-pages"],
    queryFn: () => api.get("/analytics/top-pages").then((r) => r.data),
  });
  const { data: interviewStats } = useQuery<InterviewStats>({
    queryKey: ["admin-interview-stats"],
    queryFn: () => api.get("/admin/interview-stats").then((r) => r.data),
  });
  const { data: engagementStats } = useQuery<EngagementStats>({
    queryKey: ["admin-engagement-stats"],
    queryFn: () => adminApi.engagementStats(),
  });
  const { data: aiStats } = useQuery<AIStats>({
    queryKey: ["admin-ai-stats"],
    queryFn: () => adminApi.aiStats(),
  });
  const { data: securityStats } = useQuery<SecurityStats>({
    queryKey: ["admin-security-stats"],
    queryFn: () => adminApi.securityStats(),
  });
  const { data: exportStats } = useQuery<ExportStats>({
    queryKey: ["admin-export-stats"],
    queryFn: () => adminApi.exportStats(),
  });
  const { data: pushStats } = useQuery({
    queryKey: ["admin-push-stats"],
    queryFn: () => adminApi.pushStats(),
  });

  const dailyFormatted = daily.map((r) => ({ ...r, date: fmtDate(r.date) }));
  const maxViews = Math.max(...daily.map((r) => r.views), 1);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <Seo title="Admin Dashboard" noindex />
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">
          Dashboard
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Platform overview · last 30 days
        </p>
      </div>

      {/* ── Alerts + User Search ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-ash-border p-5 space-y-3">
          <AnomalyAlerts
            securityStats={securityStats}
            aiStats={aiStats}
            engagementStats={engagementStats}
            daily={daily}
          />
        </div>
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <UserSearchPanel />
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total users" value={stats?.total_users} icon={Users} />
        <StatCard label="Total CVs" value={stats?.total_cvs} icon={FileText} />
        <StatCard label="Public CVs" value={stats?.public_cvs} icon={Globe} />
        <StatCard
          label="Page views"
          value={overview?.views}
          icon={Eye}
          sub="last 30 days"
        />
        <StatCard
          label="Sessions"
          value={overview?.sessions}
          icon={MonitorSmartphone}
          sub="unique browser sessions"
        />
        <StatCard
          label="Signed-in visits"
          value={overview?.authenticated_users}
          icon={UserCheck}
          sub="distinct logged-in users"
        />

        {/* Job & Application stats */}
        <StatCard
          label="Saved jobs"
          value={stats?.total_job_tracker_entries}
          icon={PieChart}
          sub="saved list"
        />

        {/* Interview Session stats */}
        <StatCard
          label="Interview sessions"
          value={interviewStats?.total_sessions}
          icon={Video}
          sub="all time"
        />
        <StatCard
          label="Completed"
          value={interviewStats?.completed_sessions}
          icon={Video}
          sub="finished"
        />
        <StatCard
          label="Active"
          value={interviewStats?.active_sessions}
          icon={Video}
          sub="in progress"
        />
        <StatCard
          label="Avg score"
          value={
            interviewStats?.avg_score ? `${interviewStats.avg_score}/10` : "—"
          }
          icon={TrendingUp}
        />

        {/* Engagement stats */}
        <StatCard
          label="Active users"
          value={engagementStats?.active_users_30d}
          icon={Users}
          sub="last 30 days"
        />
        <StatCard
          label="Feedback"
          value={engagementStats?.total_feedback}
          icon={MessageCircle}
          sub="all time"
        />
        <StatCard
          label="Feedback rate"
          value={
            engagementStats?.feedback_per_100_users
              ? `${engagementStats.feedback_per_100_users}/100`
              : "—"
          }
          icon={PieChart}
          sub="per 100 users"
        />
        <StatCard
          label="Announcements"
          value={engagementStats?.total_announcements}
          icon={Megaphone}
          sub="all time"
        />
        <StatCard
          label="Push subscriptions"
          value={pushStats?.total_subscriptions}
          icon={Smartphone}
          sub={
            pushStats
              ? pushStats.vapid_configured
                ? `${pushStats.distinct_users} user${pushStats.distinct_users !== 1 ? "s" : ""}`
                : "VAPID not configured"
              : undefined
          }
        />
      </div>

      {/* ── AI Usage Stats ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink">AI Usage</p>
        <button
          onClick={() =>
            downloadCSV(aiStats?.daily || [], "ai-daily", [
              { key: "date", label: "Date" },
              { key: "calls", label: "Calls" },
              { key: "failed", label: "Failed" },
            ])
          }
          disabled={!aiStats?.daily?.length}
          className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
        >
          <DownloadCloud size={11} /> CSV
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="AI Calls"
          value={aiStats?.total_calls}
          icon={Brain}
          sub="all time"
        />
        <StatCard
          label="Active"
          value={aiStats?.active_users_30d}
          icon={Users}
          sub="last 30 days"
        />
        <StatCard
          label="Error Rate"
          value={aiStats?.error_rate ? `${aiStats.error_rate}%` : "0%"}
          icon={Brain}
          sub="failures"
        />
        <StatCard
          label="Features"
          value={aiStats?.feature_breakdown.length}
          icon={Brain}
          sub="in use"
        />
      </div>

      {/* ── Security Stats ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink">Security</p>
        <button
          onClick={() =>
            downloadCSV(
              securityStats?.daily_failed || [],
              "security-daily-failed",
              [
                { key: "date", label: "Date" },
                { key: "count", label: "Failed logins" },
              ],
            )
          }
          disabled={!securityStats?.daily_failed?.length}
          className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
        >
          <DownloadCloud size={11} /> CSV
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Failed Logins"
          value={securityStats?.total_failed_logins}
          icon={Shield}
          sub="all time"
        />
        <StatCard
          label="Unique IPs"
          value={securityStats?.unique_ips_30d}
          icon={Shield}
          sub="last 30 days"
        />
        <StatCard
          label="Top Target"
          value={securityStats?.top_failed_usernames[0]?.username || "—"}
          icon={Shield}
          sub="most attempted"
        />
        <StatCard
          label="Breach Risk"
          value={securityStats?.top_failed_usernames[0]?.count || 0}
          icon={Shield}
          sub="attempts on top user"
        />
      </div>

      {/* ── Export Stats ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink">Exports</p>
        <button
          onClick={() =>
            downloadCSV(exportStats?.daily || [], "export-daily", [
              { key: "date", label: "Date" },
              { key: "count", label: "Exports" },
            ])
          }
          disabled={!exportStats?.daily?.length}
          className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
        >
          <DownloadCloud size={11} /> CSV
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="PDF Exports"
          value={exportStats?.total_exports}
          icon={Download}
          sub="all time"
        />
        <StatCard
          label="Active"
          value={exportStats?.active_users_30d}
          icon={Users}
          sub="last 30 days"
        />
        <StatCard
          label="CV-PDF"
          value={
            exportStats?.type_breakdown.find((t) => t.type === "cv-pdf")
              ?.count || 0
          }
          icon={Download}
          sub="user CVs"
        />
        <StatCard
          label="HTML-PDF"
          value={
            exportStats?.type_breakdown.find((t) => t.type === "html-pdf")
              ?.count || 0
          }
          icon={Download}
          sub="builder exports"
        />
      </div>

      {/* ── Traffic chart ── */}
      <div className="bg-white rounded-xl border border-ash-border p-5">
        <p className="text-sm font-semibold text-ink mb-4">
          Traffic — last 30 days
        </p>
        {daily.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-ink-muted">
            No data yet. Traffic will appear here once users visit the site.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={dailyFormatted}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E2E8F0"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="views"
                name="Views"
                stroke="#0F172A"
                strokeWidth={2}
                fill="url(#gViews)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Sessions"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#gSessions)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Top pages + hourly side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top pages */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Top pages</p>
          {topPages.length === 0 ? (
            <p className="text-xs text-ink-muted">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {topPages.map(({ path, views }) => (
                <div key={path} className="flex items-center gap-3">
                  <span className="text-xs text-ink-muted font-mono truncate flex-1 min-w-0">
                    {path}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-ash rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ink rounded-full"
                        style={{
                          width: `${(views / (topPages[0]?.views || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-ink w-7 text-right">
                      {views}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick platform stats */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">CV activity</p>
          <div className="space-y-3">
            {[
              {
                label: "Total CVs created",
                value: stats?.total_cvs ?? 0,
                max: stats?.total_cvs ?? 1,
              },
              {
                label: "Public CVs",
                value: stats?.public_cvs ?? 0,
                max: stats?.total_cvs ?? 1,
              },
            ].map(({ label, value, max }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-muted">{label}</span>
                  <span className="text-xs font-semibold text-ink">
                    {value}
                  </span>
                </div>
                <div className="h-1.5 bg-ash rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink rounded-full transition-all"
                    style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interview Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weakest dimensions */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">
            Interview dimensions
          </p>
          {interviewStats?.dimension_averages &&
          interviewStats.dimension_averages.length > 0 ? (
            <div className="space-y-3">
              {[...interviewStats.dimension_averages]
                .sort((a, b) => a.avg - b.avg)
                .slice(0, 6)
                .map(({ dimension, avg }) => (
                  <div key={dimension}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted capitalize">
                        {dimension}
                      </span>
                      <span
                        className={`text-xs font-semibold ${avg < 5 ? "text-red-600" : avg < 7 ? "text-amber-600" : "text-green-600"}`}
                      >
                        {avg}/10
                      </span>
                    </div>
                    <div className="h-2 bg-ash rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${avg < 5 ? "bg-red-500" : avg < 7 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${avg * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No interview data yet.</p>
          )}
        </div>

        {/* Interview status breakdown */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Session status</p>
          {interviewStats?.status_breakdown &&
          Object.keys(interviewStats.status_breakdown).length > 0 ? (
            <div className="space-y-3">
              {[
                {
                  status: "not_started",
                  label: "Not started",
                  color: "bg-gray-400",
                },
                {
                  status: "in_progress",
                  label: "In progress",
                  color: "bg-blue-500",
                },
                { status: "paused", label: "Paused", color: "bg-amber-500" },
                {
                  status: "completed",
                  label: "Completed",
                  color: "bg-green-500",
                },
              ].map(({ status, label, color }) => {
                const count = interviewStats.status_breakdown?.[status] ?? 0;
                const total = interviewStats?.total_sessions ?? 1;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted">{label}</span>
                      <span className="text-xs font-semibold text-ink">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 bg-ash rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{
                          width: `${Math.min((count / total) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No session data yet.</p>
          )}
        </div>
      </div>

      {/* Announcement Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Announcement clicks vs dismisses */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">
            Announcement interactions
          </p>
          {engagementStats &&
          (engagementStats.announcement_clicks > 0 ||
            engagementStats.announcement_dismisses > 0) ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-muted">Clicks (CTAs)</span>
                  <span className="text-xs font-semibold text-ink">
                    {engagementStats.announcement_clicks}
                  </span>
                </div>
                <div className="h-2 bg-ash rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${engagementStats.total_announcements > 0 ? (engagementStats.announcement_clicks / engagementStats.total_announcements) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-muted">Dismisses</span>
                  <span className="text-xs font-semibold text-ink">
                    {engagementStats.announcement_dismisses}
                  </span>
                </div>
                <div className="h-2 bg-ash rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${engagementStats.total_announcements > 0 ? (engagementStats.announcement_dismisses / engagementStats.total_announcements) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">
              No announcement interactions yet.
            </p>
          )}
        </div>

        {/* Feedback sentiment */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">
            Feedback sentiment
          </p>
          {engagementStats?.sentiment_breakdown &&
          Object.keys(engagementStats.sentiment_breakdown).length > 0 ? (
            <div className="space-y-3">
              {[
                {
                  sentiment: "positive",
                  label: "Positive",
                  color: "bg-green-500",
                },
                {
                  sentiment: "neutral",
                  label: "Neutral",
                  color: "bg-gray-400",
                },
                {
                  sentiment: "negative",
                  label: "Negative",
                  color: "bg-red-500",
                },
              ].map(({ sentiment, label, color }) => {
                const count =
                  engagementStats.sentiment_breakdown?.[sentiment] ?? 0;
                const total = engagementStats?.total_feedback ?? 1;
                return (
                  <div key={sentiment}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted">{label}</span>
                      <span className="text-xs font-semibold text-ink">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 bg-ash rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{
                          width: `${Math.min((count / total) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No feedback yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
