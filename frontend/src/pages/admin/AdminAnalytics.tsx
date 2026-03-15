import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Eye, MonitorSmartphone, UserCheck, Clock } from 'lucide-react'

interface DailyRow    { date: string; views: number; sessions: number }
interface TopPage     { path: string; views: number }
interface TopRef      { referrer: string; count: number }
interface HourlyRow   { hour: number; views: number }
interface Overview    { views: number; sessions: number; authenticated_users: number }

const DAYS_OPTIONS = [7, 14, 30]

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function fmtHour(h: number) {
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-ash-border rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-ink mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? '#0F172A' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)

  const { data: overview }    = useQuery<Overview>({ queryKey: ['analytics-overview'], queryFn: () => api.get('/analytics/overview').then(r => r.data) })
  const { data: daily = [] }  = useQuery<DailyRow[]>({ queryKey: ['analytics-daily', days],  queryFn: () => api.get(`/analytics/daily?days=${days}`).then(r => r.data) })
  const { data: topPages = [] } = useQuery<TopPage[]>({ queryKey: ['analytics-top-pages'],  queryFn: () => api.get('/analytics/top-pages').then(r => r.data) })
  const { data: topRefs = [] } = useQuery<TopRef[]>({ queryKey: ['analytics-top-refs'],     queryFn: () => api.get('/analytics/top-referrers').then(r => r.data) })
  const { data: hourly = [] }  = useQuery<HourlyRow[]>({ queryKey: ['analytics-hourly'],    queryFn: () => api.get('/analytics/hourly').then(r => r.data) })

  const dailyFmt  = daily.map(r => ({ ...r, date: fmtDate(r.date) }))
  const hourlyFmt = hourly.map(r => ({ ...r, label: fmtHour(r.hour) }))
  const peakHour  = hourly.length ? hourly.reduce((a, b) => a.views > b.views ? a : b) : null

  const STAT_CARDS = [
    { label: 'Page views',       value: overview?.views,               icon: Eye,              sub: 'last 30 days' },
    { label: 'Unique sessions',  value: overview?.sessions,            icon: MonitorSmartphone, sub: 'browser sessions' },
    { label: 'Logged-in visits', value: overview?.authenticated_users, icon: UserCheck,         sub: 'distinct users' },
    { label: 'Peak hour',        value: peakHour ? fmtHour(peakHour.hour) : '—', icon: Clock, sub: peakHour ? `${peakHour.views} views` : 'last 7 days' },
  ]

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Analytics</h1>
          <p className="text-sm text-ink-muted mt-0.5">Page visits and session data</p>
        </div>
        <div className="flex items-center gap-1 bg-ash rounded-lg p-1">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                days === d ? 'bg-white text-ink shadow-sm font-medium' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-ash-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-ash flex items-center justify-center flex-shrink-0">
                <Icon size={13} className="text-ink-muted" />
              </div>
              <span className="text-xs text-ink-muted">{label}</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink leading-none">{value ?? '—'}</p>
            {sub && <p className="text-[11px] text-ink-muted mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Views + sessions over time */}
      <div className="bg-white rounded-xl border border-ash-border p-5">
        <p className="text-sm font-semibold text-ink mb-1">
          Views &amp; sessions — last {days} days
        </p>
        <p className="text-xs text-ink-muted mb-4">
          <span className="inline-flex items-center gap-1.5 mr-4">
            <span className="w-3 h-0.5 bg-ink inline-block rounded-full" /> Views
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-400 inline-block rounded-full" /> Sessions
          </span>
        </p>
        {daily.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyFmt} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0F172A" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#818CF8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="views"    name="Views"    stroke="#0F172A" strokeWidth={2} fill="url(#gV)" dot={false} />
              <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#818CF8" strokeWidth={2} fill="url(#gS)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Hourly heatmap */}
      <div className="bg-white rounded-xl border border-ash-border p-5">
        <p className="text-sm font-semibold text-ink mb-1">Activity by hour</p>
        <p className="text-xs text-ink-muted mb-4">Average views per hour of day — last 7 days</p>
        {hourly.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyFmt} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="views" name="Views" radius={[3, 3, 0, 0]}>
                {hourlyFmt.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.hour === peakHour?.hour ? '#0F172A' : '#E2E8F0'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top pages + referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopList
          title="Top pages"
          rows={topPages.map(p => ({ label: p.path, value: p.views }))}
          mono
        />
        <TopList
          title="Top referrers"
          rows={topRefs.map(r => ({ label: r.referrer || 'Direct', value: r.count }))}
        />
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-36 flex items-center justify-center text-xs text-ink-muted border-2 border-dashed border-ash-border rounded-xl">
      No data yet — check back once users visit the site.
    </div>
  )
}

function TopList({ title, rows, mono }: {
  title: string
  rows: { label: string; value: number }[]
  mono?: boolean
}) {
  const max = rows[0]?.value || 1
  return (
    <div className="bg-white rounded-xl border border-ash-border p-5">
      <p className="text-sm font-semibold text-ink mb-4">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-muted">No data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`text-xs text-ink-muted truncate flex-1 min-w-0 ${mono ? 'font-mono' : ''}`}>
                {label}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-20 h-1.5 bg-ash rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink rounded-full"
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-ink w-6 text-right">{value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}