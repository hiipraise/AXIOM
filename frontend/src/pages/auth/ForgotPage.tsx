import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { authApi } from '../../api'
import toast from 'react-hot-toast'

type Mode = 'username' | 'password'

// Slides content in/out without changing card height abruptly
const slide = {
  initial:  { opacity: 0, x: 12 },
  animate:  { opacity: 1, x: 0,  transition: { duration: 0.22, ease: 'easeOut' } },
  exit:     { opacity: 0, x: -12, transition: { duration: 0.16, ease: 'easeIn' } },
} as const

export default function ForgotPage() {
  const [mode, setMode]                 = useState<Mode>('username')
  const [email, setEmail]               = useState('')
  const [username, setUsername]         = useState('')
  const [secretAnswer, setSecretAnswer] = useState('')
  const [newPassword, setNewPassword]   = useState('')
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)
  const [foundUsername, setFoundUsername] = useState('')

  const switchMode = (next: Mode) => {
    setMode(next)
    setDone(false)
  }

  const handleForgotUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.forgotUsername(email)
      setFoundUsername(res.username || '')
      setDone(true)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.recoverAccount({ username, secret_answer: secretAnswer, new_password: newPassword })
      toast.success('Password reset! You can now sign in.')
      setDone(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Recovery failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ash flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-display text-3xl font-bold text-ink">AXIOM</Link>
          <p className="text-sm text-ink-muted mt-1">Account recovery</p>
        </div>

        <div className="card">

          {/* Tab switcher */}
          <div className="flex gap-2 mb-5">
            {(['username', 'password'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === m ? 'bg-ink text-white' : 'bg-ash text-ink-muted hover:text-ink'
                }`}
              >
                {m === 'username' ? 'Find username' : 'Reset password'}
              </button>
            ))}
          </div>

          {/* Fixed-height content area prevents card resize on switch */}
          <div className="relative overflow-hidden" style={{ minHeight: '180px' }}>
            <AnimatePresence mode="wait" initial={false}>

              {/* ── Find username ── */}
              {mode === 'username' && (
                <motion.div key="username" {...slide} className="w-full">
                  {!done ? (
                    <form onSubmit={handleForgotUsername} className="space-y-4">
                      <p className="text-xs text-ink-muted">
                        Enter your registered email to look up your username.
                      </p>
                      <div>
                        <label className="label">Email</label>
                        <input
                          type="email" className="input" value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@example.com" required
                        />
                      </div>
                      <button className="btn-primary w-full justify-center" disabled={loading}>
                        {loading ? 'Searching...' : 'Find username'}
                      </button>
                    </form>
                  ) : (
                    <div className="text-center py-4">
                      {foundUsername ? (
                        <>
                          <p className="text-sm text-ink-muted mb-2">Your username is:</p>
                          <p className="font-mono font-semibold text-ink text-lg">{foundUsername}</p>
                          <Link to="/login" className="btn-primary mt-4 inline-flex">Sign in</Link>
                        </>
                      ) : (
                        <p className="text-sm text-ink-muted">No account found for that email.</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Reset password ── */}
              {mode === 'password' && (
                <motion.div key="password" {...slide} className="w-full">
                  {!done ? (
                    <form onSubmit={handleRecover} className="space-y-4">
                      <p className="text-xs text-ink-muted">
                        Reset your password using your secret question answer.
                      </p>
                      <div>
                        <label className="label">Username</label>
                        <input
                          className="input" value={username}
                          onChange={e => setUsername(e.target.value)}
                          placeholder="your_username" required
                        />
                      </div>
                      <div>
                        <label className="label">Secret question answer</label>
                        <input
                          className="input" value={secretAnswer}
                          onChange={e => setSecretAnswer(e.target.value)}
                          placeholder="Your answer" required
                        />
                      </div>
                      <div>
                        <label className="label">New password</label>
                        <input
                          type="password" className="input" value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="••••••••" required minLength={6}
                        />
                      </div>
                      <button className="btn-primary w-full justify-center" disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset password'}
                      </button>
                    </form>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-ink mb-3">Password reset successfully.</p>
                      <Link to="/login" className="btn-primary inline-flex">Sign in</Link>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <p className="mt-4 pt-4 border-t border-ash-border text-center text-xs text-ink-muted">
            <Link to="/login" className="text-ink hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}