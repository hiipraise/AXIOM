import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/auth'
import toast from 'react-hot-toast'
import { ChevronDown } from 'lucide-react'

const QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?",
  "What was the make of your first car?",
]

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '', password: '', email: '',
    secret_question: '', secret_answer: '',
  })
  const [showOptional, setShowOptional] = useState(false)
  const [loading, setLoading]           = useState(false)
  const { setAuth }                     = useAuthStore()
  const navigate                        = useNavigate()

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[a-zA-Z0-9_\-]+$/.test(form.username)) {
      toast.error('Username: letters, numbers, underscores, hyphens only')
      return
    }
    setLoading(true)
    try {
      const payload: Record<string, string> = { username: form.username, password: form.password }
      if (form.email)           payload.email           = form.email
      if (form.secret_question) payload.secret_question = form.secret_question
      if (form.secret_answer)   payload.secret_answer   = form.secret_answer
      const res = await authApi.register(payload)
      setAuth(res.user, res.token)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ash flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-display text-3xl font-bold text-ink tracking-tight">AXIOM</Link>
          <p className="text-sm text-ink-muted mt-1">Create your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="label">Username <span className="text-red-500">*</span></label>
              <input
                className="input" value={form.username} onChange={f('username')}
                placeholder="unique_username" autoComplete="username"
                required minLength={3} maxLength={32}
              />
              <p className="text-[11px] text-ink-muted mt-1">Letters, numbers, _ and - only</p>
            </div>

            <div>
              <label className="label">Password <span className="text-red-500">*</span></label>
              <input
                type="password" className="input" value={form.password} onChange={f('password')}
                placeholder="••••••••" autoComplete="new-password"
                required minLength={6}
              />
            </div>

            {/* Toggle — no layout jump because AnimatePresence handles height */}
            <button
              type="button"
              onClick={() => setShowOptional(v => !v)}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${showOptional ? 'rotate-180' : ''}`}
              />
              Recovery options (optional)
            </button>

            <AnimatePresence initial={false}>
              {showOptional && (
                <motion.div
                  key="optional"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="label">Email (for username recovery)</label>
                      <input
                        type="email" className="input" value={form.email} onChange={f('email')}
                        placeholder="you@example.com" autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="label">Secret question</label>
                      <select className="input" value={form.secret_question} onChange={f('secret_question')}>
                        <option value="">— select a question —</option>
                        {QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>

                    <AnimatePresence initial={false}>
                      {form.secret_question && (
                        <motion.div
                          key="answer"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <label className="label">Answer</label>
                          <input
                            className="input" value={form.secret_answer} onChange={f('secret_answer')}
                            placeholder="Your answer"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 pt-4 border-t border-ash-border text-center text-xs text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-ink font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}