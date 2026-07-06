import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { Smartphone } from 'lucide-react'
import type { PushSubscriptionEntry } from '../../types'
import Seo from '../../components/Seo'

export default function AdminPushSubscriptions() {
  const { data, isLoading } = useQuery<{ subscriptions: PushSubscriptionEntry[]; total: number }>({
    queryKey: ['admin-push-subscriptions'],
    queryFn: () => adminApi.pushSubscriptions(),
  })

  return (
    <div className="p-8">
      <Seo title="Admin Push Subscriptions" noindex />
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Push Subscriptions</h1>
      <p className="text-sm text-ink-muted mb-6">{data?.total ?? 0} subscribed user{data?.total !== 1 ? 's' : ''}</p>

      <div className="bg-white border border-ash-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-border bg-ash">
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Username</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Email</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Subscribed</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Endpoint</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-6 rounded bg-ash-dark" />
                      <div className="h-4 w-24 rounded bg-ash-dark" />
                      <div className="h-4 w-32 rounded bg-ash-dark" />
                      <div className="h-4 w-20 rounded bg-ash-dark" />
                      <div className="h-4 w-48 rounded bg-ash-dark" />
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!isLoading && data?.subscriptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-ink-muted">
                    <Smartphone size={24} className="text-ash-dark opacity-40" />
                    <p className="text-sm">No push subscriptions yet</p>
                    <p className="text-xs">Users can enable push notifications from their notification preferences panel.</p>
                  </div>
                </td>
              </tr>
            )}
            {data?.subscriptions.map((sub) => (
              <tr key={sub.user_id} className="border-b border-ash-border last:border-0 hover:bg-ash/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700">
                    <Smartphone size={13} />
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-ink">{sub.username}</td>
                <td className="px-4 py-3 text-xs text-ink-muted">{sub.email || '—'}</td>
                <td className="px-4 py-3 text-xs text-ink-muted">
                  {sub.subscribed_at
                    ? new Date(sub.subscribed_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-[10px] text-ink-muted font-mono max-w-[200px] truncate" title={sub.endpoint}>
                  {sub.endpoint || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
