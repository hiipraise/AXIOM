import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { Search, Users, X } from 'lucide-react'

interface AdminUser {
  _id: string
  username: string
  email?: string
  role: string
  is_active: boolean
  created_at: string
}

interface UserSearchPanelProps {
  onSelectUser?: (userId: string) => void
}

const ROLE_OPTS = [
  { value: '', label: 'Any role' },
  { value: 'user', label: 'User' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' },
]

const STATUS_OPTS = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export default function UserSearchPanel({ onSelectUser }: UserSearchPanelProps) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const hasFilters = q || role || status || dateFrom || dateTo

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-search', q, role, status, dateFrom, dateTo],
    queryFn: () =>
      adminApi.searchUsers({
        q: q || undefined,
        role: role || undefined,
        status: status || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        limit: 20,
      }) as unknown as Promise<{ users: AdminUser[]; total: number }>,
    enabled: Boolean(hasFilters),
  })

  const clearFilters = () => {
    setQ('')
    setRole('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users size={14} className="text-ink-muted" />
        <p className="text-xs font-semibold text-ink">User search</p>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto text-[11px] text-ink-muted hover:text-ink flex items-center gap-1"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username or email..."
          className="w-full pl-8 pr-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1.5 text-[11px] border border-ash-border rounded bg-white focus:outline-none focus:border-ink"
        >
          {ROLE_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1.5 text-[11px] border border-ash-border rounded bg-white focus:outline-none focus:border-ink"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <label className="text-[10px] text-ink-muted">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1.5 text-[11px] border border-ash-border rounded focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="text-[10px] text-ink-muted">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1.5 text-[11px] border border-ash-border rounded focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      {/* Results */}
      {hasFilters ? (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {data && data.users.length === 0 && (
            <p className="text-[11px] text-ink-muted text-center py-3">No users match your filters.</p>
          )}
          {data?.users.map((u) => (
            <button
              key={u._id}
              onClick={() => onSelectUser?.(u._id)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-ash text-left transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink truncate">{u.username}</p>
                <p className="text-[10px] text-ink-muted truncate">{u.email || '—'}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  u.role === 'admin' || u.role === 'superadmin'
                    ? 'bg-purple-50 text-purple-700'
                    : u.role === 'staff'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-ash text-ink-muted'
                }`}>
                  {u.role}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
              </div>
            </button>
          ))}
          {data && data.total > 20 && (
            <p className="text-[10px] text-ink-muted text-center pt-1">
              +{data.total - 20} more. Refine your search.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-5 text-center">
          <Search size={18} className="text-ink-muted/40 mb-2" />
          <p className="text-[11px] text-ink-muted">Type a username or email to search users.</p>
          <p className="text-[10px] text-ink-muted mt-1">Use the filters below to narrow by role, status, or join date.</p>
        </div>
      )}
    </div>
  )
}
