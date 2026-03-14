import { create } from 'zustand'
import { User } from '../types'
import { setToken } from '../api'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  setAuth: (user, token) => {
    setToken(token)
    set({ user, token })
  },
  clearAuth: () => {
    setToken(null)
    set({ user: null, token: null })
  },
  setUser: (user) => set({ user }),
}))

// Listen for forced logout (401)
window.addEventListener('axiom:logout', () => {
  useAuthStore.getState().clearAuth()
})
