import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import { Plus, Trash2, RadioTower, Clock, Users, MousePointer2, Edit3, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '../../components/UI'

interface Announcement {
  id: string
  text: string
  type: 'info' | 'warning' | 'success'
  active: boolean
  scheduled_at: string | null
  target_segment: string
  clicks: number
  dismisses: number
  created_at: string
  updated_at: string
}

const TYPE_OPTS = [
  { value: 'info',    label: 'Info',    dot: 'bg-ink' },
  { value: 'warning', label: 'Warning', dot: 'bg-amber-500' },
  { value: 'success', label: 'Success', dot: 'bg-emerald-500' },
]

const SEGMENT_OPTS = [
  { value: 'all',          label: 'All users' },
  { value: 'new_users',    label: 'New users (first 7 days)' },
  { value: 'active_users', label: 'Active users (last 30 days)' },
  { value: 'role:user',    label: 'Role: User' },
  { value: 'role:staff',   label: 'Role: Staff' },
  { value: 'role:admin',   label: 'Role: Admin' },
]

const SEGMENT_LABELS: Record<string, string> = {
  all: 'All users',
  new_users: 'New users (first 7 days)',
  active_users: 'Active users (last 30 days)',
  'role:user': 'Role: User',
  'role:staff': 'Role: Staff',
  'role:admin': 'Role: Admin',
}

const toISO = (v: string) => (v ? new Date(v).toISOString() : null)

const toInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
import Seo from "../../components/Seo";

export default function AdminAnnouncements() {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [type, setType] = useState<'info' | 'warning' | 'success'>('info')
  const [scheduledAt, setScheduledAt] = useState('')
  const [targetSegment, setTargetSegment] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editType, setEditType] = useState<'info' | 'warning' | 'success'>('info')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editTargetSegment, setEditTargetSegment] = useState('all')

  const { data: list = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['admin-announcements'],
    queryFn:  () => api.get('/announcements').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () =>
      api.post('/announcements', {
        text,
        type,
        scheduled_at: toISO(scheduledAt),
        target_segment: targetSegment,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] })
      qc.invalidateQueries({ queryKey: ['announcement-active'] })
      setText('')
      setScheduledAt('')
      setTargetSegment('all')
      toast.success('Announcement created')
    },
    onError: () => toast.error('Failed to create'),
  })

  const activate = useMutation({
    mutationFn: (id: string) => api.put(`/announcements/${id}/activate`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-announcements'] }); qc.invalidateQueries({ queryKey: ['announcement-active'] }) },
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => api.put(`/announcements/${id}/deactivate`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-announcements'] }); qc.invalidateQueries({ queryKey: ['announcement-active'] }) },
  })

  const update = useMutation({
    mutationFn: (ann: Announcement) =>
      api.put(`/announcements/${ann.id}`, {
        text: editText !== ann.text ? editText : undefined,
        type: editType !== ann.type ? editType : undefined,
        scheduled_at: toISO(editScheduledAt) !== ann.scheduled_at ? toISO(editScheduledAt) : undefined,
        target_segment: editTargetSegment !== ann.target_segment ? editTargetSegment : undefined,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] })
      qc.invalidateQueries({ queryKey: ['announcement-active'] })
      setEditingId(null)
      toast.success('Announcement updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-announcements'] }); qc.invalidateQueries({ queryKey: ['announcement-active'] }); toast.success('Deleted') },
  })

  const startEdit = (ann: Announcement) => {
    setEditingId(ann.id)
    setEditText(ann.text)
    setEditType(ann.type)
    setEditScheduledAt(toInput(ann.scheduled_at))
    setEditTargetSegment(ann.target_segment)
  }

  const cancelEdit = () => setEditingId(null)

  const isScheduled = (ann: Announcement) =>
    ann.scheduled_at && !ann.active && new Date(ann.scheduled_at) > new Date()

  const fmt = (d: string) =>
    new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl">
      <Seo title="Admin Announcements" noindex />
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Announcements</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          One active announcement scrolls at the top of every page. You can schedule future announcements and target specific user segments.
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          <div>
            <label className="label flex items-center gap-1.5">
              <Clock size={12} className="text-ink-muted" />
              Schedule (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Users size={12} className="text-ink-muted" />
              Target segment
            </label>
            <select
              value={targetSegment}
              onChange={e => setTargetSegment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink bg-white"
            >
              {SEGMENT_OPTS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {scheduledAt && (
          <p className="text-[11px] text-ink-muted">
            <Clock size={11} className="inline mr-1" />
            Will be published on {fmt(toISO(scheduledAt)!)}
          </p>
        )}

        <button
          onClick={() => create.mutate()}
          disabled={!text.trim() || create.isPending}
          className="btn-primary disabled:opacity-50"
        >
          <Plus size={14} />
          {create.isPending
            ? 'Creating…'
            : scheduledAt
              ? 'Schedule announcement'
              : 'Publish & activate'}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-ash-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-ash-border bg-ash">
                <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3">Status</th>
                <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3">Message</th>
                <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden md:table-cell">Target</th>
                <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden lg:table-cell">Clicks</th>
                <th className="text-left text-[11px] font-medium text-ink-muted px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <div className="h-5 w-16 rounded-full bg-ash-dark" />
                        <div className="h-4 w-48 rounded bg-ash-dark" />
                        <div className="hidden sm:block h-4 w-14 rounded bg-ash-dark" />
                        <div className="hidden md:block h-4 w-20 rounded bg-ash-dark" />
                        <div className="hidden lg:block h-4 w-12 rounded bg-ash-dark" />
                        <div className="hidden lg:block h-4 w-24 rounded bg-ash-dark" />
                        <div className="ml-auto h-4 w-20 rounded bg-ash-dark" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!isLoading && list.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-ink-muted">No announcements yet.</td></tr>
              )}
              {list.map(ann => {
                const isEditing = editingId === ann.id
                const scheduled = isScheduled(ann)

                return (
                  <tr key={ann.id} className="border-b border-ash-border last:border-0 hover:bg-ash/40 transition-colors">
                    <td className="px-4 py-3">
                      {ann.active ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                          <RadioTower size={12} className="animate-pulse" /> Live
                        </span>
                      ) : scheduled ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                          <Clock size={12} /> Scheduled
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-muted">Off</span>
                      )}
                      {scheduled && ann.scheduled_at && (
                        <div className="text-[10px] text-ink-muted mt-0.5">{fmt(ann.scheduled_at)}</div>
                      )}
                    </td>

                    {isEditing ? (
                      <>
                        <td className="px-4 py-3" colSpan={2}>
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1.5 text-xs border border-ash-border rounded focus:outline-none focus:border-ink resize-none"
                            />
                            <div className="flex gap-1.5">
                              {TYPE_OPTS.map(o => (
                                <button
                                  key={o.value}
                                  onClick={() => setEditType(o.value as typeof type)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-all ${
                                    editType === o.value
                                      ? 'border-ink bg-ink text-white'
                                      : 'border-ash-border text-ink-muted hover:bg-ash'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${o.dot}`} />
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <select
                            value={editTargetSegment}
                            onChange={e => setEditTargetSegment(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-ash-border rounded bg-white focus:outline-none focus:border-ink"
                          >
                            {SEGMENT_OPTS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex gap-3">
                            <span className="text-[11px] text-ink-muted flex items-center gap-1">
                              <MousePointer2 size={11} /> {ann.clicks}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[11px] text-ink-muted">{fmt(ann.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => {
                                if (editingId === ann.id) {
                                  update.mutate(ann)
                                }
                              }}
                              disabled={!editText.trim() || update.isPending}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-ink-muted hover:text-ink hover:bg-ash rounded transition-colors"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                            <input
                              type="datetime-local"
                              value={editScheduledAt}
                              onChange={e => setEditScheduledAt(e.target.value)}
                              className="w-32 px-2 py-1 text-[10px] border border-ash-border rounded focus:outline-none focus:border-ink"
                              title="Schedule date/time"
                            />
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
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
                          <span className="text-[11px] text-ink-muted">
                            {SEGMENT_LABELS[ann.target_segment] || ann.target_segment}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex gap-3">
                            <span className="text-[11px] text-ink-muted flex items-center gap-1" title="Clicks">
                              <MousePointer2 size={11} /> {ann.clicks}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[11px] text-ink-muted">{fmt(ann.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => startEdit(ann)}
                              className="p-1.5 text-ink-muted hover:text-ink hover:bg-ash rounded transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={13} />
                            </button>
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
                                {scheduled ? 'Publish now' : 'Activate'}
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(ann)}
                              className="p-1.5 text-ink-muted hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Announcement"
          description={
            <>Delete announcement "{deleteTarget?.text}"? This cannot be undone.</>
          }
          confirmLabel="Delete"
          variant="danger"
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) {
              remove.mutate(deleteTarget.id)
              setDeleteTarget(null)
            }
          }}
          loading={remove.isPending}
        />
      )}
    </div>
  )
}