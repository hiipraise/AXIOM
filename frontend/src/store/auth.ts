import { create } from 'zustand'

interface User {
  id: string
  username: string
  email: string | null
  role: string
  must_change_password: boolean
  is_active: boolean
}

interface AuthState {
  user:      User | null
  token:     string | null   // in memory + sessionStorage
  isLoading: boolean
  setAuth:   (user: User, token?: string) => void
  clearAuth: () => void
}

// sessionStorage: survives page reload but NOT tab close — acceptable security trade-off
// This is NOT localStorage — it is session-scoped
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
  token:     readSession(),   // rehydrate on module load
  isLoading: true,

  setAuth: (user, token) => {
    if (token) writeSession(token)
    useAuthStore.setState({ user, token: token ?? readSession(), isLoading: false })
  },

  clearAuth: () => {
    writeSession(null)
    useAuthStore.setState({ user: null, token: null, isLoading: false })
  },
}))