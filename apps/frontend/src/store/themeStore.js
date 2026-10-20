import { create } from 'zustand'
import { useAuthStore } from './authStore'
import { userAPI } from '../services/api'
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  normalizeTheme,
  prefersDark,
  resolveTheme
} from '../config/theme'

/**
 * Theme preference state.
 *
 * Hand-rolled persistence instead of zustand's `persist` middleware, because
 * the stored value must be the bare string `light` / `dark` / `system` — that
 * is both the documented contract and what the inline script in index.html
 * reads to avoid a white flash before React boots.
 */

const readStoredTheme = () => {
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    // Safari private mode throws on localStorage access. Falling back to the
    // OS preference still gives a correct first paint, just without a
    // remembered choice.
    return DEFAULT_THEME
  }
}

const writeStoredTheme = (theme) => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Preference stays in memory for this session; nothing else to do.
  }
}

/**
 * Subscribes to OS-level dark mode changes, but only while the preference is
 * 'system'. Leaving `system` tears the listener down so a forced theme does
 * not keep re-rendering against OS changes the user has opted out of.
 */
let mediaQuery = null
let stopMediaListener = null

const syncSystemListener = (theme) => {
  const shouldListen = theme === 'system'

  if (!shouldListen) {
    stopMediaListener?.()
    stopMediaListener = null
    mediaQuery = null
    return
  }

  if (mediaQuery || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    applyTheme(resolveTheme(useThemeStore.getState().theme))
    useThemeStore.setState({ resolvedTheme: resolveTheme(useThemeStore.getState().theme) })
  }

  // Safari < 14 only has the deprecated addListener/removeListener pair.
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onChange)
    stopMediaListener = () => mediaQuery?.removeEventListener('change', onChange)
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(onChange)
    stopMediaListener = () => mediaQuery?.removeListener(onChange)
  } else {
    stopMediaListener = null
  }
}

/**
 * Pushes the preference to the backend so it follows the user to another
 * device. Failures are swallowed: a theme that fails to sync must still have
 * applied locally, and a 401 here must not trigger the global logout
 * interceptor over a cosmetic preference.
 *
 * This closes a static import cycle with authStore (which imports this module
 * to seed the theme at sign-in). That is safe because neither module
 * dereferences the other during evaluation — only inside action bodies, long
 * after both modules have finished initialising.
 */
const persistToServer = async (theme) => {
  try {
    if (!useAuthStore.getState().isAuthenticated) return

    const response = await userAPI.updateTheme(theme)
    const updatedUser = response?.data?.data?.user

    if (updatedUser) {
      // Keep the persisted auth blob in step so a reload — or a second tab —
      // does not read a stale preference back out of `auth-storage`.
      useAuthStore.setState((state) => ({
        user: { ...state.user, themePreference: updatedUser.themePreference ?? theme }
      }))
    }
  } catch {
    // Local preference already applied; server sync is best-effort.
  }
}

export const useThemeStore = create((set, get) => ({
  /** The stored preference: 'light' | 'dark' | 'system'. */
  theme: DEFAULT_THEME,
  /** What is actually painted: 'light' | 'dark'. */
  resolvedTheme: 'light',
  /** True once init() has run, so consumers can skip the pre-hydration value. */
  isReady: false,

  /**
   * Boot-time read. Called once from main.jsx before render. The inline script
   * in index.html has already painted the correct theme by this point; this
   * mirrors that work into React state and wires up the OS listener.
   */
  init: () => {
    if (get().isReady) return
    const theme = readStoredTheme()
    const resolvedTheme = resolveTheme(theme)

    applyTheme(resolvedTheme)
    syncSystemListener(theme)
    set({ theme, resolvedTheme, isReady: true })
  },

  /**
   * Changes the preference. The DOM update happens synchronously before any
   * network call so the switch feels instant, then the value is synced to the
   * server in the background.
   */
  setTheme: (next) => {
    const theme = normalizeTheme(next)
    const resolvedTheme = resolveTheme(theme)

    writeStoredTheme(theme)
    applyTheme(resolvedTheme)
    syncSystemListener(theme)
    set({ theme, resolvedTheme })

    persistToServer(theme)
  },

  /**
   * Flips between light and dark. Used by the compact Sun/Moon switch in the
   * account menu, which must always land on a definite mode — resolving
   * against the current effective theme means a user sitting on 'system' at
   * night gets an explicit 'light' when they flip, instead of being thrown
   * back to following the OS.
   */
  toggleResolvedTheme: () => {
    get().setTheme(resolveTheme(get().theme) === 'dark' ? 'light' : 'dark')
  },

  /**
   * Adopts the preference stored on the user profile after sign-in, so the
   * theme follows the account rather than the browser.
   */
  syncFromUser: (preference) => {
    if (!preference) return
    const theme = normalizeTheme(preference)
    const resolvedTheme = resolveTheme(theme)

    writeStoredTheme(theme)
    applyTheme(resolvedTheme)
    syncSystemListener(theme)
    set({ theme, resolvedTheme })
  }
}))

export default useThemeStore