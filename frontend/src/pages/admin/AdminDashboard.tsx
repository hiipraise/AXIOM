import { useQuery } from '@tanstack/react-query'
import { adminApi, api } from '../../api'
import {
  Users, FileText, Globe, Star, TrendingUp,
  Eye, MonitorSmartphone, UserCheck, ArrowUpRight,
  Briefcase, FileCheck, PieChart,
  Video, MessageCircle, Megaphone, Building2, UserSearch,
  Brain, Shield, Download,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'

interface Stats {
  total_users: number
  total_cvs: number
  public_cvs: number
  total_ratings: number
  avg_rating: number | null
  total_axiom_jobs: number
  active_axiom_jobs: number
  closed_axiom_jobs: number
  total_applications: number
  total_job_tracker_entries: number
  app_status_breakdown: Record<string, number>
  top_categories: { category: string; count: number }[]
}

interface Overview {
  views: number
  sessions: number
  authenticated_users: number
}

interface DailyRow {
  date: string
  views: number
  sessions: number
}

interface TopPage {
  path: string
  views: number
}

interface InterviewStats {
  total_sessions: number
  completed_sessions: number
  active_sessions: number
  avg_score: number | null
  dimension_averages: { dimension: string; avg: number }[]
  status_breakdown: Record<string, number>
}

interface EngagementStats {
  active_users_30d: number
  total_feedback: number
  feedback_per_100_users: number
  sentiment_breakdown: Record<string, number>
  total_announcements: number
  announcement_clicks: number
  announcement_dismisses: number
}

interface RecruiterActivityRecruiter {
  id: string
  company_name: string
  company_slug: string
  verified: boolean
  total_jobs: number
  active_jobs: number
  total_applications: number
  last_activity: string | null
  is_dormant: boolean
  created_at: string | null
}

interface RecruiterActivitySummary {
  total_recruiters: number
  active_recruiters: number
  dormant_recruiters: number
  never_used: number
  total_jobs_posted: number
  total_applications: number
}

interface RecruiterActivity {
  recruiters: RecruiterActivityRecruiter[]
  summary: RecruiterActivitySummary
}

// ─── AI Usage Stats ─────────────────────────────────────────────────────────────────
interface AIDailyStats {
  date: string
  total_calls: number
  successful_calls: number
  failed_calls: number
}

interface AIFeatureBreakdown {
  feature: string
  calls: number
}

interface AIStats {
  total_calls: number
  daily: AIDailyStats[]
  feature_breakdown: AIFeatureBreakdown[]
  error_rate: number
  active_users_30d: number
}

// ─── Security Stats ────────────────────────────────────────────────────────────────
interface SecurityDailyStats {
  date: string
  failed_logins: number
}

interface SecurityStats {
  total_failed_logins: number
  daily: SecurityDailyStats[]
  top_failed_usernames: { username: string; attempts: number }[]
  unique_ips_30d: number
}

// ─── Export Stats ────────────────────────────────────────────────────────────────
interface ExportDailyStats {
  date: string
  total_exports: number
}

interface ExportTypeBreakdown {
  type: string
  count: number
}

interface ExportStats {
  total_exports: number
  daily: ExportDailyStats[]
  type_breakdown: ExportTypeBreakdown[]
  active_users_30d: number
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, sub,
}: {
  label: string
  value: string | number | undefined
  icon: React.ComponentType<{ size?: string | number; className?: string }>
  sub?: string
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
        {value ?? '—'}
      </p>
      {sub && <p className="text-[11px] text-ink-muted mt-1">{sub}</p>}
    </div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-ash-border rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-ink mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: stats }    = useQuery<Stats>({ queryKey: ['admin-stats'],    queryFn: adminApi.stats })
  const { data: overview } = useQuery<Overview>({ queryKey: ['analytics-overview'], queryFn: () => api.get('/analytics/overview').then(r => r.data) })
  const { data: daily = [] } = useQuery<DailyRow[]>({ queryKey: ['analytics-daily'],    queryFn: () => api.get('/analytics/daily?days=30').then(r => r.data) })
  const { data: topPages = [] } = useQuery<TopPage[]>({ queryKey: ['analytics-top-pages'], queryFn: () => api.get('/analytics/top-pages').then(r => r.data) })
  const { data: interviewStats } = useQuery<InterviewStats>({ queryKey: ['admin-interview-stats'], queryFn: () => api.get('/admin/interview-stats').then(r => r.data) })
  const { data: engagementStats } = useQuery<EngagementStats>({ queryKey: ['admin-engagement-stats'], queryFn: () => adminApi.engagementStats() })
  const { data: recruiterActivity } = useQuery<RecruiterActivity>({ queryKey: ['admin-recruiter-activity'], queryFn: () => adminApi.recruiterActivity() })
  const { data: aiStats } = useQuery<AIStats>({ queryKey: ['admin-ai-stats'], queryFn: () => adminApi.aiStats() })
  const { data: securityStats } = useQuery<SecurityStats>({ queryKey: ['admin-security-stats'], queryFn: () => adminApi.securityStats() })
  const { data: exportStats } = useQuery<ExportStats>({ queryKey: ['admin-export-stats'], queryFn: () => adminApi.exportStats() })

  const dailyFormatted = daily.map(r => ({ ...r, date: fmtDate(r.date) }))
  const maxViews = Math.max(...daily.map(r => r.views), 1)

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-muted mt-0.5">Platform overview · last 30 days</p>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total users"    value={stats?.total_users}   icon={Users} />
        <StatCard label="Total CVs"      value={stats?.total_cvs}     icon={FileText} />
        <StatCard label="Public CVs"     value={stats?.public_cvs}    icon={Globe} />
        <StatCard label="Avg rating"     value={stats?.avg_rating ? `${stats.avg_rating}/5` : '—'} icon={Star} />
        <StatCard label="Page views"     value={overview?.views}      icon={Eye}              sub="last 30 days" />
        <StatCard label="Sessions"       value={overview?.sessions}   icon={MonitorSmartphone} sub="unique browser sessions" />
        <StatCard label="Signed-in visits" value={overview?.authenticated_users} icon={UserCheck} sub="distinct logged-in users" />
        <StatCard label="Ratings total"  value={stats?.total_ratings} icon={TrendingUp} />

        {/* Job & Application stats */}
        <StatCard label="Total jobs"     value={stats?.total_axiom_jobs}   icon={Briefcase} sub="all time" />
        <StatCard label="Active jobs"   value={stats?.active_axiom_jobs} icon={Briefcase} sub="currently open" />
        <StatCard label="Applications"   value={stats?.total_applications} icon={FileCheck} sub="AXIOM platform" />
        <StatCard label="Tracked apps"   value={stats?.total_job_tracker_entries} icon={PieChart} sub="external jobs" />

        {/* Interview Session stats */}
        <StatCard label="Interview sessions" value={interviewStats?.total_sessions} icon={Video} sub="all time" />
        <StatCard label="Completed" value={interviewStats?.completed_sessions} icon={Video} sub="finished" />
        <StatCard label="Active" value={interviewStats?.active_sessions} icon={Video} sub="in progress" />
        <StatCard label="Avg score" value={interviewStats?.avg_score ? `${interviewStats.avg_score}/10` : '—'} icon={TrendingUp} />

        {/* Engagement stats */}
        <StatCard label="Active users" value={engagementStats?.active_users_30d} icon={Users} sub="last 30 days" />
        <StatCard label="Feedback" value={engagementStats?.total_feedback} icon={MessageCircle} sub="all time" />
        <StatCard label="Feedback rate" value={engagementStats?.feedback_per_100_users ? `${engagementStats.feedback_per_100_users}/100` : '—'} icon={PieChart} sub="per 100 users" />
        <StatCard label="Announcements" value={engagementStats?.total_announcements} icon={Megaphone} sub="all time" />

        {/* Recruiter activity stats */}
        <StatCard label="Recruiters" value={recruiterActivity?.summary.total_recruiters} icon={Building2} sub="approved" />
        <StatCard label="Active" value={recruiterActivity?.summary.active_recruiters} icon={UserSearch} sub="last 30 days" />
        <StatCard label="Dormant" value={recruiterActivity?.summary.dormant_recruiters} icon={Building2} sub="no recent activity" />
        <StatCard label="Never used" value={recruiterActivity?.summary.never_used} icon={Building2} sub="no jobs posted" />
      </div>

      {/* ── AI Usage Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="AI Calls" value={aiStats?.total_calls} icon={Brain} sub="all time" />
        <StatCard label="Active" value={aiStats?.active_users_30d} icon={Users} sub="last 30 days" />
        <StatCard label="Error Rate" value={aiStats?.error_rate ? `${aiStats.error_rate}%` : '0%'} icon={Brain} sub="failures" />
        <StatCard label="Features" value={aiStats?.feature_breakdown.length} icon={Brain} sub="in use" />
      </div>

      {/* ── Security Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Failed Logins" value={securityStats?.total_failed_logins} icon={Shield} sub="all time" />
        <StatCard label="Unique IPs" value={securityStats?.unique_ips_30d} icon={Shield} sub="last 30 days" />
        <StatCard label="Top Target" value={securityStats?.top_failed_usernames[0]?.username || '—'} icon={Shield} sub="most attempted" />
        <StatCard label="Breach Risk" value={securityStats?.top_failed_usernames[0]?.attempts || 0} icon={Shield} sub="attempts on top user" />
      </div>

      {/* ── Export Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="PDF Exports" value={exportStats?.total_exports} icon={Download} sub="all time" />
        <StatCard label="Active" value={exportStats?.active_users_30d} icon={Users} sub="last 30 days" />
        <StatCard label="CV-PDF" value={exportStats?.type_breakdown.find(t => t.type === 'cv-pdf')?.count || 0} icon={Download} sub="user CVs" />
        <StatCard label="HTML-PDF" value={exportStats?.type_breakdown.find(t => t.type === 'html-pdf')?.count || 0} icon={Download} sub="builder exports" />
      </div>

      {/* ── Traffic chart ── */}
      <div className="bg-white rounded-xl border border-ash-border p-5">
        <p className="text-sm font-semibold text-ink mb-4">Traffic — last 30 days</p>
        {daily.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-ink-muted">
            No data yet. Traffic will appear here once users visit the site.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyFormatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gViews"    x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0F172A" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="views"    name="Views"    stroke="#0F172A" strokeWidth={2} fill="url(#gViews)"    dot={false} />
              <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#6366F1" strokeWidth={2} fill="url(#gSessions)" dot={false} />
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
                  <span className="text-xs text-ink-muted font-mono truncate flex-1 min-w-0">{path}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-ash rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ink rounded-full"
                        style={{ width: `${(views / (topPages[0]?.views || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-ink w-7 text-right">{views}</span>
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
              { label: 'Total CVs created',  value: stats?.total_cvs ?? 0,     max: stats?.total_cvs ?? 1 },
              { label: 'Public CVs',         value: stats?.public_cvs ?? 0,    max: stats?.total_cvs ?? 1 },
              { label: 'Ratings submitted',  value: stats?.total_ratings ?? 0, max: stats?.total_cvs ?? 1 },
            ].map(({ label, value, max }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-muted">{label}</span>
                  <span className="text-xs font-semibold text-ink">{value}</span>
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

      {/* ── Application funnel + Top categories ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Application conversion funnel */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Application funnel</p>
          {stats?.app_status_breakdown && Object.keys(stats.app_status_breakdown).length > 0 ? (
            <div className="space-y-3">
              {[
                { status: 'applied', label: 'Applied', color: 'bg-blue-500' },
                { status: 'viewed', label: 'Viewed', color: 'bg-indigo-500' },
                { status: 'interested', label: 'Interested', color: 'bg-purple-500' },
                { status: 'interview_scheduled', label: 'Interview', color: 'bg-amber-500' },
                { status: 'offered', label: 'Offered', color: 'bg-green-500' },
                { status: 'rejected', label: 'Rejected', color: 'bg-red-400' },
                { status: 'accepted', label: 'Accepted', color: 'bg-emerald-600' },
                { status: 'declined', label: 'Declined', color: 'bg-gray-400' },
              ].map(({ status, label, color }) => {
                const count = stats.app_status_breakdown?.[status] ?? 0
                const total = stats?.total_applications ?? 1
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted">{label}</span>
                      <span className="text-xs font-semibold text-ink">{count}</span>
                    </div>
                    <div className="h-2 bg-ash rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${Math.min((count / total) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No application data yet.</p>
          )}
        </div>

        {/* Top job categories */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Top job categories</p>
          {stats?.top_categories && stats.top_categories.length > 0 ? (
            <div className="space-y-3">
              {stats.top_categories.map(({ category, count }) => {
                const maxCount = stats.top_categories?.[0]?.count || 1
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted">{category}</span>
                      <span className="text-xs font-semibold text-ink">{count}</span>
                    </div>
                    <div className="h-2 bg-ash rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#a0449f] rounded-full transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No job categories yet.</p>
          )}
        </div>
      </div>

      {/* Interview Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weakest dimensions */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Interview dimensions</p>
          {interviewStats?.dimension_averages && interviewStats.dimension_averages.length > 0 ? (
            <div className="space-y-3">
              {[...interviewStats.dimension_averages]
                .sort((a, b) => a.avg - b.avg)
                .slice(0, 6)
                .map(({ dimension, avg }) => (
                  <div key={dimension}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted capitalize">{dimension}</span>
                      <span className={`text-xs font-semibold ${avg < 5 ? 'text-red-600' : avg < 7 ? 'text-amber-600' : 'text-green-600'}`}>
                        {avg}/10
                      </span>
                    </div>
                    <div className="h-2 bg-ash rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${avg < 5 ? 'bg-red-500' : avg < 7 ? 'bg-amber-500' : 'bg-green-500'}`}
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
          {interviewStats?.status_breakdown && Object.keys(interviewStats.status_breakdown).length > 0 ? (
            <div className="space-y-3">
              {[
                { status: 'not_started', label: 'Not started', color: 'bg-gray-400' },
                { status: 'in_progress', label: 'In progress', color: 'bg-blue-500' },
                { status: 'paused', label: 'Paused', color: 'bg-amber-500' },
                { status: 'completed', label: 'Completed', color: 'bg-green-500' },
              ].map(({ status, label, color }) => {
                const count = interviewStats.status_breakdown?.[status] ?? 0
                const total = interviewStats?.total_sessions ?? 1
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted">{label}</span>
                      <span className="text-xs font-semibold text-ink">{count}</span>
                    </div>
                    <div className="h-2 bg-ash rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${Math.min((count / total) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No session data yet.</p>
          )}
        </div>
      </div>

      {/* Recruiter Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Recruiter activity</p>
          {recruiterActivity && recruiterActivity.recruiters.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {recruiterActivity.recruiters.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-ash-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{r.company_name || 'Unnamed'}</p>
                    <p className="text-xs text-ink-muted">
                      {r.total_jobs} jobs · {r.total_applications} apps
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.is_dormant ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {r.is_dormant ? 'Dormant' : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No recruiters yet.</p>
          )}
        </div>

        {/* Applications by recruiter */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Top recruiters by applications</p>
          {recruiterActivity && recruiterActivity.recruiters.length > 0 ? (
            <div className="space-y-3">
              {[...recruiterActivity.recruiters]
                .sort((a, b) => b.total_applications - a.total_applications)
                .slice(0, 5)
                .map((r, i) => {
                  const maxApps = Math.max(...recruiterActivity.recruiters.map(x => x.total_applications), 1)
                  const pct = (r.total_applications / maxApps) * 100
                  return (
                    <div key={r.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-ink-muted truncate">{r.company_name || 'Unnamed'}</span>
                        <span className="text-xs font-semibold text-ink">{r.total_applications}</span>
                      </div>
                      <div className="h-2 bg-ash rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No application data yet.</p>
          )}
        </div>
      </div>

      {/* Announcement Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Announcement clicks vs dismisses */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Announcement interactions</p>
          {engagementStats && (engagementStats.announcement_clicks > 0 || engagementStats.announcement_dismisses > 0) ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-muted">Clicks (CTAs)</span>
                  <span className="text-xs font-semibold text-ink">{engagementStats.announcement_clicks}</span>
                </div>
                <div className="h-2 bg-ash rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${engagementStats.total_announcements > 0 ? (engagementStats.announcement_clicks / engagementStats.total_announcements) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-muted">Dismisses</span>
                  <span className="text-xs font-semibold text-ink">{engagementStats.announcement_dismisses}</span>
                </div>
                <div className="h-2 bg-ash rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${engagementStats.total_announcements > 0 ? (engagementStats.announcement_dismisses / engagementStats.total_announcements) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No announcement interactions yet.</p>
          )}
        </div>

        {/* Feedback sentiment */}
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <p className="text-sm font-semibold text-ink mb-4">Feedback sentiment</p>
          {engagementStats?.sentiment_breakdown && Object.keys(engagementStats.sentiment_breakdown).length > 0 ? (
            <div className="space-y-3">
              {[
                { sentiment: 'positive', label: 'Positive', color: 'bg-green-500' },
                { sentiment: 'neutral', label: 'Neutral', color: 'bg-gray-400' },
                { sentiment: 'negative', label: 'Negative', color: 'bg-red-500' },
              ].map(({ sentiment, label, color }) => {
                const count = engagementStats.sentiment_breakdown?.[sentiment] ?? 0
                const total = engagementStats?.total_feedback ?? 1
                return (
                  <div key={sentiment}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted">{label}</span>
                      <span className="text-xs font-semibold text-ink">{count}</span>
                    </div>
                    <div className="h-2 bg-ash rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${Math.min((count / total) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No feedback yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}