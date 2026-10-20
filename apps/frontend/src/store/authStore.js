import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'
import { useThemeStore } from './themeStore'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      // Actions
      login: async (credentials) => {
        try {
          set({ isLoading: true })
          const response = await api.post('/auth/login', credentials)
          const { user, accessToken, refreshToken } = response.data.data

          set({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false
          })

          // Set default auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          // Adopt the account's saved theme so it follows the user to this
          // device instead of inheriting whatever the previous visitor chose.
          useThemeStore.getState().syncFromUser(user?.themePreference)

          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Login failed'
          }
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true })
          const response = await api.post('/auth/register', userData)
          const { user, accessToken, refreshToken } = response.data.data

          set({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false
          })

          // Set default auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          // New accounts carry the schema default ('system'); syncing keeps a
          // re-registered email from inheriting a stale local choice.
          useThemeStore.getState().syncFromUser(user?.themePreference)

          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Registration failed'
          }
        }
      },

      logout: async () => {
        try {
          const { refreshToken } = get()
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken })
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          // Clear auth state
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false
          })

          // Remove auth header
          delete api.defaults.headers.common['Authorization']

          // The theme is intentionally left alone: it is a display preference,
          // not session data, so signing out should not flip the screen back
          // to light under a guest. The next sign-in re-applies that account's
          // preference via syncFromUser.
        }
      },

      // Named refreshAccessToken (not refreshToken) so it does not collide with
      // the refreshToken state field above — a duplicate key would silently
      // overwrite the token with this function.
      refreshAccessToken: async () => {
        try {
          const { refreshToken } = get()
          if (!refreshToken) {
            throw new Error('No refresh token available')
          }

          const response = await api.post('/auth/refresh', { refreshToken })
          const { accessToken } = response.data.data

          set({ token: accessToken })

          // Update auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          return accessToken
        } catch (error) {
          // Refresh failed, logout user
          get().logout()
          throw error
        }
      },

      updateProfile: async (userData) => {
        try {
          set({ isLoading: true })
          const response = await api.put('/users/profile', userData)
          const { user } = response.data.data

          set({
            user,
            isLoading: false
          })

          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Profile update failed'
          }
        }
      },

      changePassword: async (passwordData) => {
        try {
          set({ isLoading: true })
          await api.put('/users/password', passwordData)
          set({ isLoading: false })

          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Password change failed'
          }
        }
      },

      initializeAuth: () => {
        const { token, refreshToken, user } = get()

        if (token && refreshToken && user) {
          set({
            isAuthenticated: true
          })

          // Set auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`

          // Re-apply the account's theme on reload, so the server copy wins
          // over a stale value left in localStorage by a previous session.
          useThemeStore.getState().syncFromUser(user?.themePreference)
        }
      },

      setAuth: (authData) => {
        const { user, token, refreshToken } = authData
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true
        })

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },

      // Google OAuth
      googleLogin: (token, refreshToken) => {
        // This would be called after Google OAuth callback
        // For now, we'll implement a basic version
        set({
          token,
          refreshToken,
          isAuthenticated: true
        })

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },

    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export { useAuthStore }
