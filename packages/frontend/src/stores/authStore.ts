import { create } from 'zustand'
import type { User } from '@agilix/shared'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('agilix_token'),
  isAuthenticated: !!localStorage.getItem('agilix_token'),

  setAuth: (user, token) => {
    localStorage.setItem('agilix_token', token)
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('agilix_token')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
