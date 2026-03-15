import { useQuery } from '@tanstack/react-query'
import { adminApi, api } from '../../api'
import {
  Users, FileText, Globe, Star, TrendingUp,
  Eye, MonitorSmartphone, UserCheck, ArrowUpRight,
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
    </div>
  )
}