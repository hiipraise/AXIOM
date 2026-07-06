import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, getErrorDetail } from '../../api'
import { useAuthStore } from '../../store/auth'
import toast from 'react-hot-toast'
import { Bell, Briefcase, Mail, Key, Trash2, AlertTriangle, Download, Globe } from 'lucide-react'
import ConfirmDialog from '../../components/UI/ConfirmDialog'
import Seo from "../../components/Seo";

export default function AccountPage() {
  const { user, clearAuth, setUser } = useAuthStore()
  const navigate = useNavigate()

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [profileForm, setProfileForm] = useState({ email: user?.email || '', secret_question: '', secret_answer: '' })
  const [emailNotifications, setEmailNotifications] = useState(Boolean(user?.email_notifications))
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleSetPw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.setPassword({ new_password: pwForm.new_password })
      toast.success('Password set! You can now sign in with your username and password.')
      setPwForm({ old_password: '', new_password: '', confirm: '' })
      // Refresh user state so the UI switches to "Change password"
      const fresh = await authApi.me()
      setUser(fresh)
    } catch (err) {
      toast.error(getErrorDetail(err) || 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

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
    } catch (err) {
      toast.error(getErrorDetail(err) || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  /** Save recovery options: email + secret Q&A only. */
  const handleSaveRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: { email?: string; secret_question?: string; secret_answer?: string } = {};
      if (profileForm.email) payload.email = profileForm.email
      if (profileForm.secret_question) payload.secret_question = profileForm.secret_question
      if (profileForm.secret_answer) payload.secret_answer = profileForm.secret_answer
      const updated = await authApi.updateProfile(payload)
      setUser(updated)
      toast.success('Recovery options saved')
    } catch (err) {
      toast.error(getErrorDetail(err) || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  /** Save notification preferences: toggles email notifications only. */
  const handleSaveNotifications = async () => {
    setLoading(true)
    try {
      const updated = await authApi.updateProfile({
        email_notifications: Boolean(profileForm.email && emailNotifications),
      })
      setUser(updated)
      toast.success('Notification preferences saved')
    } catch (err) {
      toast.error(getErrorDetail(err) || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
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
      <Seo title="Account Settings" noindex />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Account</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          @{user?.username} · <span className="capitalize">{user?.role}</span>
          {user?.oauth_provider && (
            <span className="inline-flex items-center gap-1 ml-2 rounded-full border border-ash-border bg-ash px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
              <Globe size={11} />
              Connected via {user.oauth_provider === 'google' ? 'Google' : 'LinkedIn'}
            </span>
          )}
        </p>
      </div>

      {/* Password section: Set password (no password set) or Change password (has password) */}
      {user?.has_password === false ? (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Key size={15} className="text-ink-muted" />
            <h2 className="font-medium text-ink text-sm">Set password</h2>
          </div>
          {user?.oauth_provider && (
            <p className="text-xs text-ink-muted mb-4 leading-relaxed">
              You signed up via {user.oauth_provider === "google" ? "Google" : "LinkedIn"}.{" "}
              Setting a password lets you also sign in with your username and password.
            </p>
          )}
          <form onSubmit={handleSetPw} className="space-y-3">
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
            <button className="btn-secondary text-sm" disabled={loading}>Set password</button>
          </form>
        </div>
      ) : (
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
      )}

      {/* Profile / recovery */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={15} className="text-ink-muted" />
          <h2 className="font-medium text-ink text-sm">Recovery options</h2>
        </div>
        <form onSubmit={handleSaveRecovery} className="space-y-3">
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

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase size={15} className="text-ink-muted" />
          <h2 className="font-medium text-ink text-sm">CV targeting</h2>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          Career level, industry, and target role are set per CV in the editor so each resume can target a different opportunity.
        </p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={15} className="text-ink-muted" />
          <h2 className="font-medium text-ink text-sm">Notification preferences</h2>
        </div>
        <label className={`flex items-center justify-between gap-4 rounded-xl border border-ash-border p-3 ${profileForm.email ? "cursor-pointer" : "opacity-60"}`}>
          <div>
            <p className="text-sm font-medium text-ink">Email notifications</p>
            <p className="text-xs text-ink-muted">
              {profileForm.email ? `Send important account and application updates to ${profileForm.email}.` : "Add an email address above to enable email notifications."}
            </p>
          </div>
          <input
            type="checkbox"
            className="h-4 w-4 accent-ink"
            checked={Boolean(profileForm.email && emailNotifications)}
            disabled={!profileForm.email}
            onChange={(e) => setEmailNotifications(e.target.checked)}
          />
        </label>
        <button
          className="btn-secondary text-sm mt-3"
          disabled={loading || !profileForm.email}
          onClick={handleSaveNotifications}
        >
          Save notification preferences
        </button>
      </div>

      {/* Download my data */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Download size={15} className="text-ink-muted" />
          <h2 className="font-medium text-ink text-sm">Download my data</h2>
        </div>
        <p className="text-xs text-ink-muted mb-3">
          Export all your data (CVs, applications, saved jobs, notifications) as a JSON file. Use this before deleting your account.
        </p>
        <button
          className="btn-secondary text-sm"
          onClick={() => setShowDownloadConfirm(true)}
        >
          <Download size={13} className="mr-1.5" />
          Download my data
        </button>
      </div>

      {/* Delete account */}
      <div className="card border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-red-500" />
          <h2 className="font-medium text-red-700 text-sm">Delete account</h2>
        </div>
        <p className="text-xs text-ink-muted mb-3">
          Permanently deletes your account, all CVs, applications, and saved jobs. This action cannot be undone.
        </p>
        <button
          className="btn-danger text-sm"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 size={13} className="mr-1.5" />
          Delete my account
        </button>
      </div>

      <ConfirmDialog
        open={showDownloadConfirm}
        title="Download your data"
        description={
          <span>
            This will export all your data (CVs, saved jobs, notifications, feedback) as a JSON file.{" "}
            Your account and data will remain intact — this is a read-only export.
          </span>
        }
        confirmLabel="Download"
        cancelLabel="Cancel"
        variant="default"
        loading={downloading}
        loadingLabel="Downloading…"
        onConfirm={async () => {
          setDownloading(true)
          try {
            await authApi.downloadMyData()
          } finally {
            setDownloading(false)
            setShowDownloadConfirm(false)
          }
        }}
        onClose={() => {
          if (!downloading) setShowDownloadConfirm(false)
        }}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete your account"
        description={
          <span>
            Are you sure you want to permanently delete your account and all its data? This action cannot be undone.
          </span>
        }
        confirmLabel="Delete account"
        cancelLabel="Keep account"
        variant="danger"
        loading={loading}
        loadingLabel="Deleting account…"
        onConfirm={handleDeleteAccount}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
