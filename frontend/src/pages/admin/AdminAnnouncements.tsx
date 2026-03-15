import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import { Plus, Trash2, Radio, RadioTower } from 'lucide-react'
import toast from 'react-hot-toast'

interface Announcement {
  id: string
  text: string
  type: 'info' | 'warning' | 'success'
  active: boolean
  created_at: string
}

const TYPE_OPTS = [
  { value: 'info',    label: 'Info',    dot: 'bg-ink' },
  { value: 'warning', label: 'Warning', dot: 'bg-amber-500' },
  { value: 'success', label: 'Success', dot: 'bg-emerald-500' },
]

export default function AdminAnnouncements() {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [type, setType] = useState<'info' | 'warning' | 'success'>('info')

  const { data: list = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['admin-announcements'],
    queryFn:  () => api.get('/announcements').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/announcements', { text, type }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] })
      qc.invalidateQueries({ queryKey: ['announcement-active'] })
      setText('')
      toast.success('Announcement published')
    },
    onError: () => toast.error('Failed to publish'),
  })

  const activate = useMutation({
    mutationFn: (id: string) => api.put(`/announcements/${id}/activate`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-announcements'] }); qc.invalidateQueries({ queryKey: ['announcement-active'] }) },
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => api.put(`/announcements/${id}/deactivate`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-announcements'] }); qc.invalidateQueries({ queryKey: ['announcement-active'] }) },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-announcements'] }); qc.invalidateQueries({ queryKey: ['announcement-active'] }); toast.success('Deleted') },
  })

  const fmt = (d: string) =>
    new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Announcements</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          One active announcement scrolls at the top of every page.
        </p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-ash-border p-5 space-y-4">
        <p className="text-sm font-semibold text-ink">New announcement</p>

        <div>
          <label className="label">Message</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            placeholder="e.g. New CV themes coming next week — stay tuned!"
            className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none"
          />
        </div>

        <div>
          <label className="label">Type</label>
          <div className="flex gap-2">
            {TYPE_OPTS.map(o => (
              <button
                key={o.value}
                onClick={() => setType(o.value as typeof type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                  type === o.value
                    ? 'border-ink bg-ink text-white'
                    : 'border-ash-border text-ink-muted hover:bg-ash'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${o.dot}`} />
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => create.mutate()}
          disabled={!text.trim() || create.isPending}
          className="btn-primary disabled:opacity-50"
        >
          <Plus size={14} />
          {create.isPending ? 'Publishing…' : 'Publish & activate'}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-ash-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-border bg-ash">
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3">Status</th>
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3">Message</th>
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden sm:table-cell">Type</th>
              <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden md:table-cell">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-ink-muted">Loading…</td></tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-ink-muted">No announcements yet.</td></tr>
            )}
            {list.map(ann => (
              <tr key={ann.id} className="border-b border-ash-border last:border-0 hover:bg-ash/40 transition-colors">
                <td className="px-4 py-3">
                  {ann.active ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                      <RadioTower size={12} className="animate-pulse" /> Live
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-muted">Off</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-xs text-ink line-clamp-2">{ann.text}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${
                    ann.type === 'warning' ? 'bg-amber-50 text-amber-700' :
                    ann.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                    'bg-ash text-ink-muted'
                  }`}>
                    {ann.type}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-[11px] text-ink-muted">{fmt(ann.created_at)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {ann.active ? (
                      <button
                        onClick={() => deactivate.mutate(ann.id)}
                        className="text-[11px] text-ink-muted hover:text-ink px-2 py-1 rounded hover:bg-ash transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => activate.mutate(ann.id)}
                        className="text-[11px] text-ink-muted hover:text-emerald-600 px-2 py-1 rounded hover:bg-ash transition-colors"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => remove.mutate(ann.id)}
                      className="p-1.5 text-ink-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}