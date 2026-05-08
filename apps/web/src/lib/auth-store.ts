import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@im-cms/shared-types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (params: { accessToken: string; refreshToken: string; user: User }) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setAuth: ({ accessToken, refreshToken, user }) => {
        set({ accessToken, refreshToken, user })
      },

      setAccessToken: (token) => {
        set({ accessToken: token })
      },

      clearAuth: () => {
        set({ accessToken: null, refreshToken: null, user: null })
      },

      isAuthenticated: () => {
        return get().accessToken !== null
      },
    }),
    {
      name: 'im-cms-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)
