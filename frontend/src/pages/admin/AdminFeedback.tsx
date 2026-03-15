import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api'
import { Star, MessageSquare, Lightbulb, Trash2, Hammer, HelpCircle } from 'lucide-react'

interface FeedbackItem {
  id: string
  type: string
  rating: number | null
  message: string
  page: string
  user_id: string | null
  ts: string
}

interface Summary {
  total: number
  by_type: Record<string, number>
  avg_rating: number | null
}

interface FeedbackResponse {
  total: number
  items: FeedbackItem[]
}

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  rate:   { label: 'Rating',         icon: Star,          color: 'text-amber-500 bg-amber-50  border-amber-100' },
  keep:   { label: 'Keep building',  icon: Hammer,        color: 'text-blue-600  bg-blue-50   border-blue-100'  },
  add:    { label: 'Add feature',    icon: Lightbulb,     color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  remove: { label: 'Remove feature', icon: Trash2,        color: 'text-red-500   bg-red-50    border-red-100'   },
  other:  { label: 'Other',          icon: MessageSquare, color: 'text-ink-muted  bg-ash       border-ash-border' },
}

const ALL_TYPES = ['', 'rate', 'keep', 'add', 'remove', 'other']

function TypeBadge({ type }: { type: string }) {
  const meta  = TYPE_META[type] || TYPE_META.other
  const Icon  = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
      <Icon size={10} /> {meta.label}
    </span>
  )
}

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[11px] text-ink-muted">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={11} className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-ash-border'} />
      ))}
    </div>
  )
}

export default function AdminFeedback() {
  const [filter, setFilter] = useState('')
  const [page, setPage]     = useState(0)
  const limit = 20

  const { data: summary }                  = useQuery<Summary>({ queryKey: ['feedback-summary'], queryFn: () => api.get('/feedback/summary').then(r => r.data) })
  const { data, isLoading }                = useQuery<FeedbackResponse>({
    queryKey: ['feedback', filter, page],
    queryFn:  () => api.get(`/feedback?skip=${page * limit}&limit=${limit}${filter ? `&type=${filter}` : ''}`).then(r => r.data),
  })

  const fmt = (ts: string) =>
    new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Feedback</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {summary?.total ?? 0} submissions from users
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total + avg rating */}
        <div className="bg-white rounded-xl border border-ash-border p-4 col-span-2 sm:col-span-1">
          <p className="text-[11px] text-ink-muted mb-1">Total</p>
          <p className="font-display text-2xl font-bold text-ink">{summary?.total ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-ash-border p-4">
          <p className="text-[11px] text-ink-muted mb-1">Avg rating</p>
          <p className="font-display text-2xl font-bold text-ink">
            {summary?.avg_rating ? `${summary.avg_rating}★` : '—'}
          </p>
        </div>
        {/* Per-type counts */}
        {(['rate','keep','add','remove','other'] as const).map(t => {
          const meta = TYPE_META[t]
          const Icon = meta.icon
          return (
            <div key={t} className="bg-white rounded-xl border border-ash-border p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={11} className="text-ink-muted" />
                <p className="text-[11px] text-ink-muted">{meta.label}</p>
              </div>
              <p className="font-display text-2xl font-bold text-ink">
                {summary?.by_type?.[t] ?? 0}
              </p>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-ash rounded-lg p-1 w-fit flex-wrap">
        {ALL_TYPES.map(t => (
          <button
            key={t}
            onClick={() => { setFilter(t); setPage(0) }}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
              filter === t ? 'bg-white text-ink shadow-sm font-medium' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t === '' ? 'All' : TYPE_META[t]?.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-ash-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-border bg-ash">
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3">Type</th>
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3">Rating</th>
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3">Message</th>
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden sm:table-cell">Page</th>
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden md:table-cell">User</th>
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-10 text-sm text-ink-muted">Loading…</td></tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-sm text-ink-muted">No feedback yet.</td></tr>
            )}
            {data?.items.map(item => (
              <tr key={item.id} className="border-b border-ash-border last:border-0 hover:bg-ash/50 transition-colors">
                <td className="px-4 py-3">
                  <TypeBadge type={item.type} />
                </td>
                <td className="px-4 py-3">
                  <RatingStars rating={item.rating} />
                </td>
                <td className="px-4 py-3 max-w-xs">
                  {item.message ? (
                    <p className="text-xs text-ink line-clamp-2">{item.message}</p>
                  ) : (
                    <span className="text-[11px] text-ink-muted italic">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-[11px] text-ink-muted font-mono">{item.page || '—'}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-[11px] text-ink-muted font-mono">
                    {item.user_id ? item.user_id.slice(0, 8) + '…' : 'Guest'}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-[11px] text-ink-muted whitespace-nowrap">{fmt(item.ts)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-xs border border-ash-border rounded-lg hover:bg-ash disabled:opacity-40 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-ink-muted">
            Page {page + 1} of {Math.ceil(data.total / limit)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= data.total}
            className="px-4 py-2 text-xs border border-ash-border rounded-lg hover:bg-ash disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}