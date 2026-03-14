import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { Star } from 'lucide-react'

interface Rating {
  id: string
  cv_id: string
  score: number
  comment?: string
  created_at: string
}

export default function AdminRatings() {
  const { data: ratings = [], isLoading } = useQuery<Rating[]>({
    queryKey: ['admin-ratings'],
    queryFn: adminApi.ratings,
  })

  const avg = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(2) : null

  return (
    <div className="p-8">
      <div className="flex items-baseline gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Ratings</h1>
        {avg && <span className="text-sm text-ink-muted">Avg: <strong className="text-ink">{avg} / 5</strong></span>}
      </div>

      {/* Score distribution */}
      {ratings.length > 0 && (
        <div className="bg-white border border-ash-border rounded-xl p-5 mb-6">
          <p className="text-xs font-medium text-ink mb-4">Score Distribution</p>
          {[5, 4, 3, 2, 1].map((score) => {
            const count = ratings.filter((r) => r.score === score).length
            const pct = ratings.length > 0 ? (count / ratings.length) * 100 : 0
            return (
              <div key={score} className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1 w-10">
                  <span className="text-xs text-ink">{score}</span>
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 bg-ash rounded-full h-2">
                  <div className="bg-ink h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-ink-muted w-8 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-white border border-ash-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-border bg-ash">
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Score</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">CV ID</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Comment</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="text-center py-8 text-sm text-ink-muted">Loading…</td></tr>}
            {ratings.map((r) => (
              <tr key={r.id} className="border-b border-ash-border last:border-0 hover:bg-ash/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: r.score }).map((_, i) => (
                      <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted font-mono">{r.cv_id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-xs text-ink">{r.comment || <span className="text-ink-muted italic">—</span>}</td>
                <td className="px-4 py-3 text-xs text-ink-muted">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
