import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/auth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth }           = useAuthStore()
  const navigate              = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(form)
      setAuth(res.user, res.token)   // ← token saved to sessionStorage
      if (res.user.must_change_password) {
        toast('Please set a new password.', { icon: '🔒' })
        navigate('/account')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ash flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-display text-3xl font-bold text-ink tracking-tight">AXIOM</Link>
          <p className="text-sm text-ink-muted mt-1">AI CV Generator</p>
        </div>

        <div className="card">
          <h2 className="font-semibold text-ink mb-5">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input className="input" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="your_username" autoComplete="username" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" autoComplete="current-password" required />
            </div>
            <button className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-ash-border space-y-2 text-center">
            <Link to="/forgot" className="text-xs text-ink-muted hover:text-ink">
              Forgot username or password?
            </Link>
            <p className="text-xs text-ink-muted">
              No account?{' '}
              <Link to="/register" className="text-ink font-medium hover:underline">Register</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted mt-4">
          Continue without account?{' '}
          <Link to="/guest" className="text-ink hover:underline">Session-only mode</Link>
        </p>
      </div>
    </div>
  )
}