import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { Shield, UserX, UserCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface AdminUser {
  _id: string
  username: string
  email?: string
  role: string
  is_active: boolean
  created_at: string
}

export default function AdminUsers() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users(),
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

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Users</h1>
      <p className="text-sm text-ink-muted mb-6">{data?.total ?? 0} total</p>
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
                        onClick={() => window.confirm('Delete this user and all their data?') && del.mutate(u._id)}
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
    </div>
  )
}
