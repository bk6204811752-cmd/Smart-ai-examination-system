import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  _id: string
  email: string
  full_name: string
  name?: string
  role: 'student' | 'teacher' | 'admin'
  program?: string
  semester?: number
  department?: string
  cgpa?: number
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  setUser: (user: User) => void
  setToken: (token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user: User, token: string) => set({ user, token, isAuthenticated: true }),
      setUser: (user: User) => set({ user, isAuthenticated: true }),
      setToken: (token: string) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (updates: Partial<User>) =>
        set((state: AuthState) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage',
    }
  )
)
