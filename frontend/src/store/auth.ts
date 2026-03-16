import { create } from 'zustand'

export interface User {
  id: string
  username: string
  email: string | null
  role: string
  must_change_password: boolean
  is_active: boolean
}

export interface AuthState {
  user:      User | null
  token:     string | null
  isLoading: boolean
  setAuth:   (user: User, token?: string) => void
  setUser:   (user: User) => void           // ← AccountPage uses this for profile updates
  clearAuth: () => void
}

const SESSION_KEY = 'axiom_st'

function readSession(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY) } catch { return null }
}
function writeSession(t: string | null) {
  try {
    if (t) sessionStorage.setItem(SESSION_KEY, t)
    else   sessionStorage.removeItem(SESSION_KEY)
  } catch {}
}

export const useAuthStore = create<AuthState>(() => ({
  user:      null,
  token:     readSession(),
  isLoading: true,

  setAuth: (user, token) => {
    if (token) writeSession(token)
    useAuthStore.setState({ user, token: token ?? readSession(), isLoading: false })
  },

  // Update user object in-place without touching the token
  setUser: (user) => {
    useAuthStore.setState({ user })
  },

  clearAuth: () => {
    writeSession(null)
    useAuthStore.setState({ user: null, token: null, isLoading: false })
  },
}))