import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user:      User | null
  isLoading: boolean
  setAuth:   (user: User) => void
  clearAuth: () => void
  setUser:   (user: User) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user:      null,
  isLoading: true,   // true until the /me bootstrap resolves

  setAuth:   (user) => set({ user, isLoading: false }),
  clearAuth: ()     => set({ user: null, isLoading: false }),
  setUser:   (user) => set({ user }),
}))

// Forced logout from 401 interceptor
window.addEventListener('axiom:logout', () => {
  useAuthStore.getState().clearAuth()
})