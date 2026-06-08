import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { Building2, UserX, UserCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'
import ConfirmDialog from '../../components/UI/ConfirmDialog'

interface AdminUser {
  _id: string
  username: string
  email?: string
  role: string
  is_active: boolean
  created_at: string
}

interface RecruiterProfile {
  id: string
  user_id: string
  company_name: string
  company_slug: string
  website?: string
  verified: boolean
  is_approved: boolean
  created_at: string
}

export default function AdminUsers() {
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const { data, isLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users(),
  })
  const { data: recruiters = [] } = useQuery<RecruiterProfile[]>({
    queryKey: ['admin-recruiters'],
    queryFn: adminApi.recruiters,
  })

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.setRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role updated') },
  })

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? adminApi.deactivate(id) : adminApi.activate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Updated') },
  })

  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User deleted') },
    onError: () => toast.error('Cannot delete this user'),
  })

  const recruiterApproval = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      adminApi.setRecruiterApproval(id, { is_approved: approved, verified: approved }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-recruiters'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Recruiter updated')
    },
  })

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Users</h1>
      <p className="text-sm text-ink-muted mb-6">{data?.total ?? 0} total</p>
      {recruiters.length > 0 && (
        <section className="mb-6 rounded-xl border border-ash-border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Building2 size={16} className="text-ink-muted" />
            <h2 className="font-display text-lg font-bold text-ink">Recruiter approvals</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {recruiters.map((profile) => (
              <article key={profile.id} className="rounded-lg border border-ash-border bg-ash/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{profile.company_name}</p>
                    <p className="text-xs text-ink-muted">/{profile.company_slug}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile.is_approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {profile.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => recruiterApproval.mutate({ id: profile.id, approved: true })}>Approve</button>
                  <button className="btn-ghost !py-1.5 !px-3 !text-xs" onClick={() => recruiterApproval.mutate({ id: profile.id, approved: false })}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="bg-white border border-ash-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-border bg-ash">
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Username</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Email</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Role</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">Joined</th>
              <th className="text-right text-xs font-medium text-ink-muted px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-8 text-sm text-ink-muted">Loading…</td></tr>
            )}
            {data?.users.map((u) => (
              <tr key={u._id} className="border-b border-ash-border last:border-0 hover:bg-ash/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-ink">{u.username}</td>
                <td className="px-4 py-3 text-xs text-ink-muted">{u.email || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => setRole.mutate({ id: u._id, role: e.target.value })}
                    disabled={u.role === 'superadmin'}
                    className="text-xs border border-ash-border rounded px-2 py-1 bg-white focus:outline-none disabled:opacity-50"
                  >
                    <option value="user">user</option>
                    <option value="recruiter">recruiter</option>
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                    {u.role === 'superadmin' && <option value="superadmin">superadmin</option>}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 flex items-center justify-end gap-2">
                  {u.role !== 'superadmin' && (
                    <>
                      <button
                        onClick={() => toggle.mutate({ id: u._id, active: u.is_active })}
                        className="p-1.5 text-ink-muted hover:text-ink transition-colors"
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="p-1.5 text-ink-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user?"
        description={
          <>
            Delete <span className="font-medium text-ink">{deleteTarget?.username}</span> and all associated data? This action cannot be undone.
          </>
        }
        confirmLabel="Delete user"
        variant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          del.mutate(deleteTarget._id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
