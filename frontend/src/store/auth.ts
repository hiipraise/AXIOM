import { create } from 'zustand'
import { clearQueryCache } from '../lib/queryClient'

export interface User {
  id: string
  username: string
  email: string | null
  email_notifications?: boolean
  role: string
  must_change_password: boolean
  is_active: boolean
  is_first_login?: boolean
  oauth_provider?: string | null
  has_password?: boolean
  roadmap_progress?: { step_id: string; completed_at: string }[]
  last_username_change?: string | null
  username_edit_session_expires_at?: string | null
}

export interface AuthState {
  user:      User | null
  token:     string | null
  isLoading: boolean
  rememberMe: boolean
  setAuth:   (user: User, token?: string, expiresInSeconds?: number) => void
  setUser:   (user: User) => void           // ← AccountPage uses this for profile updates
  clearAuth: () => void
  setRememberMe: (remember: boolean) => void
}

const SESSION_KEY = 'axiom_st'
const EXPIRY_KEY   = 'axiom_exp'
const REMEMBER_KEY = 'axiom_remember'
const DEFAULT_EXPIRY_MS = 55 * 60 * 1000  // ~55 min (JWT is 24h, but we revalidate)

function getStorage(remember?: boolean): Storage {
  return remember ?? localStorage.getItem(REMEMBER_KEY) === 'true' ? localStorage : sessionStorage
}

function readSession(): string | null {
  try {
    // Try sessionStorage first, then localStorage
    const storage = [sessionStorage, localStorage]
    for (const s of storage) {
      const expiry = s.getItem(EXPIRY_KEY)
      if (expiry && Date.now() > parseInt(expiry, 10)) {
        s.removeItem(SESSION_KEY)
        s.removeItem(EXPIRY_KEY)
        continue
      }
      const token = s.getItem(SESSION_KEY)
      if (token) return token
    }
    return null
  } catch { return null }
}

function readRememberMe(): boolean {
  try { return localStorage.getItem(REMEMBER_KEY) === 'true' } catch { return false }
}

function writeSession(t: string | null, expiresInMs: number = DEFAULT_EXPIRY_MS, remember?: boolean) {
  try {
    const store = getStorage(remember)
    if (t) {
      store.setItem(SESSION_KEY, t)
      store.setItem(EXPIRY_KEY, String(Date.now() + expiresInMs))
      if (remember) localStorage.setItem(REMEMBER_KEY, 'true')
      else localStorage.removeItem(REMEMBER_KEY)
    } else {
      // Clear from both stores
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(EXPIRY_KEY)
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(EXPIRY_KEY)
      localStorage.removeItem(REMEMBER_KEY)
    }
  } catch {}
}

export const useAuthStore = create<AuthState>(() => ({
  user:      null,
  token:     readSession(),
  isLoading: true, // wait for bootstrap to validate token before showing content
  rememberMe: readRememberMe(),

  setAuth: (user, token, expiresInSeconds) => {
    if (token) writeSession(token, expiresInSeconds ? expiresInSeconds * 1000 : DEFAULT_EXPIRY_MS, useAuthStore.getState().rememberMe)
    useAuthStore.setState({ user, token: token ?? readSession(), isLoading: false })
  },

  setRememberMe: (remember: boolean) => {
    useAuthStore.setState({ rememberMe: remember })
    // Re-persist token to the correct store if already logged in
    const currentToken = useAuthStore.getState().token
    if (currentToken) {
      writeSession(currentToken, DEFAULT_EXPIRY_MS, remember)
    }
  },

  // Update user object in-place without touching the token
  setUser: (user) => {
    useAuthStore.setState({ user })
  },

  clearAuth: () => {
    writeSession(null)
    clearQueryCache() // Clear all cached user data
    useAuthStore.setState({ user: null, token: null, isLoading: false })
  },
}))

// Expose expiry for SessionTimeoutWarning
export function getTokenExpiry(): number | null {
  try {
    const e = localStorage.getItem(EXPIRY_KEY)
    if (e) return parseInt(e, 10)
    const e2 = sessionStorage.getItem(EXPIRY_KEY)
    if (e2) return parseInt(e2, 10)
    return null
  } catch { return null }
}
