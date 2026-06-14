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
  roadmap_progress?: { step_id: string; completed_at: string }[]
}

export interface AuthState {
  user:      User | null
  token:     string | null
  isLoading: boolean
  setAuth:   (user: User, token?: string, expiresInSeconds?: number) => void
  setUser:   (user: User) => void           // ← AccountPage uses this for profile updates
  clearAuth: () => void
}

const SESSION_KEY = 'axiom_st'
const EXPIRY_KEY   = 'axiom_exp'
const DEFAULT_EXPIRY_MS = 55 * 60 * 1000

function readSession(): string | null {
  try {
    const expiry = sessionStorage.getItem(EXPIRY_KEY)
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(EXPIRY_KEY)
      return null
    }
    return sessionStorage.getItem(SESSION_KEY)
  } catch { return null }
}
function writeSession(t: string | null, expiresInMs: number = DEFAULT_EXPIRY_MS) {
  try {
    if (t) {
      sessionStorage.setItem(SESSION_KEY, t)
      sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresInMs))
    } else {
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(EXPIRY_KEY)
    }
  } catch {}
}

export const useAuthStore = create<AuthState>(() => ({
  user:      null,
  token:     readSession(),
  isLoading: true, // wait for bootstrap to validate token before showing content

  setAuth: (user, token, expiresInSeconds) => {
    if (token) writeSession(token, expiresInSeconds ? expiresInSeconds * 1000 : DEFAULT_EXPIRY_MS)
    useAuthStore.setState({ user, token: token ?? readSession(), isLoading: false })
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
