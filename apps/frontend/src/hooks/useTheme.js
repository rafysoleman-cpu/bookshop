import { useCallback } from 'react'
import { useThemeStore } from '../store/themeStore'
import { getThemeOption, resolveTheme } from '../config/theme'

/**
 * Reads the theme state and exposes the two mutations the UI needs.
 *
 * Components depend on this rather than on the store directly, so the
 * selector shape stays in one place and a consumer can never accidentally
 * subscribe to the whole store and re-render on unrelated changes.
 *
 * Returns `resolvedTheme` (what is painted) alongside `theme` (the
 * preference), because the compact toggle reflects the *effective* mode while
 * the settings page reflects the *chosen* preference — on 'system' at night
 * those are deliberately different values.
 */
export const useTheme = () => {
  const theme = useThemeStore((state) => state.theme)
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)

  const setTheme = useThemeStore((state) => state.setTheme)
  const toggleResolvedTheme = useThemeStore((state) => state.toggleResolvedTheme)

  const isDark = resolvedTheme === 'dark'
  const option = getThemeOption(theme)

  const handleToggle = useCallback(() => toggleResolvedTheme(), [toggleResolvedTheme])

  return {
    theme,
    resolvedTheme,
    isDark,
    option,
    setTheme,
    toggleTheme: handleToggle,
    /** Convenience for UI that only cares about the mode, not the source. */
    isSystemDark: theme === 'system' && resolveTheme(theme) === 'dark'
  }
}

export default useTheme