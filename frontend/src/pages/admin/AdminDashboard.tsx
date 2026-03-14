import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { Users, FileText, Globe, Star, TrendingUp } from 'lucide-react'

interface Stats {
  total_users: number
  total_cvs: number
  public_cvs: number
  total_ratings: number
  avg_rating: number | null
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: adminApi.stats,
  })

  const cards = [
    { label: 'Total Users', value: stats?.total_users ?? '—', icon: Users },
    { label: 'Total CVs', value: stats?.total_cvs ?? '—', icon: FileText },
    { label: 'Public CVs', value: stats?.public_cvs ?? '—', icon: Globe },
    { label: 'Ratings', value: stats?.total_ratings ?? '—', icon: Star },
    { label: 'Avg Rating', value: stats?.avg_rating ? `${stats.avg_rating} / 5` : '—', icon: TrendingUp },
  ]

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Admin Dashboard</h1>
      <p className="text-sm text-ink-muted mb-8">Platform overview</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-ash-border p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={15} className="text-ink-muted" />
              <span className="text-xs text-ink-muted">{label}</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{isLoading ? '…' : value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
