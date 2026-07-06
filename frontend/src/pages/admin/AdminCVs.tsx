import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { AlertTriangle, Globe, Lock } from 'lucide-react'

interface AdminCV {
  id: string
  title: string
  owner_username: string
  is_public: boolean
  updated_at: string
}
import Seo from "../../components/Seo";

export default function AdminCVs() {
  const { data, isLoading, error, refetch } = useQuery<{ cvs: AdminCV[]; total: number }>({
    queryKey: ['admin-cvs'],
    queryFn: () => adminApi.cvs(),
  })

  if (error) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">All CVs</h1>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="text-ink-muted" size={32} />
          <p className="text-sm text-ink">Failed to load CVs</p>
          <p className="text-xs text-ink-muted">Please try again later.</p>
          <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Seo title="Admin CVs" noindex />
      <h1 className="font-display text-2xl font-bold text-ink mb-1">All CVs</h1>
      <p className="text-sm text-ink-muted mb-6">{data?.total ?? 0} total</p>
      <div className="bg-white border border-ash-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-border bg-ash">
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Title</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Owner</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Visibility</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="text-center py-8 text-sm text-ink-muted">Loading…</td></tr>}
            {data?.cvs.map((cv) => (
              <tr key={cv.id} className="border-b border-ash-border last:border-0 hover:bg-ash/50">
                <td className="px-4 py-3 text-sm font-medium text-ink">{cv.title}</td>
                <td className="px-4 py-3 text-xs text-ink-muted">@{cv.owner_username}</td>
                <td className="px-4 py-3">
                  <div className={`flex items-center gap-1 text-xs ${cv.is_public ? 'text-emerald-600' : 'text-ink-muted'}`}>
                    {cv.is_public ? <Globe size={12} /> : <Lock size={12} />}
                    {cv.is_public ? 'Public' : 'Private'}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">{new Date(cv.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
