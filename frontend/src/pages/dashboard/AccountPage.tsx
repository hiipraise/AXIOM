import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/auth'
import toast from 'react-hot-toast'
import { Shield, Mail, Key, Trash2, AlertTriangle } from 'lucide-react'

export default function AccountPage() {
  const { user, clearAuth, setUser } = useAuthStore()
  const navigate = useNavigate()

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [profileForm, setProfileForm] = useState({ email: user?.email || '', secret_question: '', secret_answer: '' })
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password })
      toast.success('Password updated')
      setPwForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = {}
      if (profileForm.email) payload.email = profileForm.email
      if (profileForm.secret_question) payload.secret_question = profileForm.secret_question
      if (profileForm.secret_answer) payload.secret_answer = profileForm.secret_answer
      const updated = await authApi.updateProfile(payload)
      setUser(updated)
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.username) {
      toast.error('Username does not match')
      return
    }
    try {
      await authApi.deleteAccount()
      clearAuth()
      navigate('/login')
      toast.success('Account deleted')
    } catch {
      toast.error('Failed to delete account')
    }
  }

  const questions = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your primary school?",
    "What was the make of your first car?",
  ]

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Account</h1>
        <p className="text-sm text-ink-muted mt-0.5">@{user?.username} · <span className="capitalize">{user?.role}</span></p>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Key size={15} className="text-ink-muted" />
          <h2 className="font-medium text-ink text-sm">Change password</h2>
        </div>
        <form onSubmit={handleChangePw} className="space-y-3">
          <div>
            <label className="label">Current password</label>
            <input type="password" className="input" value={pwForm.old_password}
              onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">New password</label>
              <input type="password" className="input" value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label className="label">Confirm</label>
              <input type="password" className="input" value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required />
            </div>
          </div>
          <button className="btn-secondary text-sm" disabled={loading}>Update password</button>
        </form>
      </div>

      {/* Profile / recovery */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={15} className="text-ink-muted" />
          <h2 className="font-medium text-ink text-sm">Recovery options</h2>
        </div>
        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Secret question</label>
            <select className="input" value={profileForm.secret_question}
              onChange={(e) => setProfileForm({ ...profileForm, secret_question: e.target.value })}>
              <option value="">— update secret question —</option>
              {questions.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          {profileForm.secret_question && (
            <div>
              <label className="label">Answer</label>
              <input className="input" value={profileForm.secret_answer}
                onChange={(e) => setProfileForm({ ...profileForm, secret_answer: e.target.value })}
                placeholder="Your answer" />
            </div>
          )}
          <button className="btn-secondary text-sm" disabled={loading}>Save recovery options</button>
        </form>
      </div>

      {/* Delete account */}
      <div className="card border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-red-500" />
          <h2 className="font-medium text-red-700 text-sm">Delete account</h2>
        </div>
        <p className="text-xs text-ink-muted mb-3">
          This permanently deletes your account and all CVs. Type your username to confirm.
        </p>
        <div className="flex gap-2">
          <input className="input text-sm" placeholder={user?.username} value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)} />
          <button
            className="btn-danger whitespace-nowrap"
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== user?.username}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
