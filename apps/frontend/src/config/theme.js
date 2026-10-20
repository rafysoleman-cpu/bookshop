import { Sun, Moon, Monitor } from 'lucide-react'

/**
 * Single source of truth for the theme system.
 *
 * Three preferences exist, but only two visual modes:
 *   'light'  → forced light
 *   'dark'   → forced dark (the eye-protection slate palette)
 *   'system' → follow the OS via prefers-color-scheme
 *
 * THEME_OPTIONS is consumed by both the /settings radio cards and the status
 * line on the UserMenu toggle, so the wording of a theme cannot drift between
 * the two surfaces.
 *
 * The dark palette deliberately uses Tailwind's `slate` scale, which is
 * byte-identical to the eye-protection colours this project specifies:
 *   slate-900 #0f172a  page background
 *   slate-800 #1e293b  card / surface
 *   slate-100 #f8fafc  primary text
 *   slate-400 #94a3b8  secondary text
 * Pure black (#000000) is never used as a background: the resulting contrast
 * against light text is the main cause of night-time eye strain.
 */

export const THEMES = ['light', 'dark', 'system']

export const DEFAULT_THEME = 'system'

/**
 * Bare localStorage key holding exactly 'light' | 'dark' | 'system'.
 *
 * Deliberately a raw string rather than JSON: zustand's `persist` middleware
 * would write `"dark"` (with quotes), which the inline hydration script in
 * index.html cannot read without parsing.
 */
export const THEME_STORAGE_KEY = 'theme'

export const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light Mode',
    description: 'Crisp light background',
    icon: Sun,
    /** Text shown on the compact UserMenu toggle. */
    shortLabel: 'Light Mode'
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    description: 'Eye protection — dark slate, easy on the eyes at night',
    icon: Moon,
    shortLabel: 'Eye Protection'
  },
  {
    value: 'system',
    label: 'System Default',
    description: 'Automatically matches your device OS settings',
    icon: Monitor,
    shortLabel: 'System Default'
  }
]

const FALLBACK_OPTION = { value: DEFAULT_THEME, label: 'System Default', shortLabel: 'System Default', icon: Monitor, description: '' }

/** Normalises any input (storage junk, API payload) to a known theme value. */
export const normalizeTheme = (value) =>
  THEMES.includes(value) ? value : DEFAULT_THEME

export const getThemeOption = (value) =>
  THEME_OPTIONS.find((option) => option.value === value) || FALLBACK_OPTION

/** Live media query handle; guarded for SSR / very old browsers. */
const getDarkMediaQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

/** The OS preference right now. */
export const prefersDark = () => Boolean(getDarkMediaQuery()?.matches)

/**
 * Collapses a preference into the visual mode that should actually render.
 * 'system' is the only value that consults the OS.
 */
export const resolveTheme = (theme) =>
  normalizeTheme(theme) === 'dark' || (normalizeTheme(theme) === 'system' && prefersDark())
    ? 'dark'
    : 'light'

/**
 * Writes the resolved mode onto <html>.
 *
 * Three things are set deliberately:
 *  - `class="dark"`      → drives Tailwind's `dark:` variants (darkMode: 'class')
 *  - `data-theme`        → lets plain CSS / tests target the mode without
 *                          depending on a Tailwind-specific class name
 *  - `colorScheme`       → makes native UI follow suit: scrollbars, form
 *                          controls and the canvas background, which otherwise
 *                          stay light and flash on scroll
 */
export const applyTheme = (resolved) => {
  if (typeof document === 'undefined') return
  const isDark = resolved === 'dark'
  const root = document.documentElement

  root.classList.toggle('dark', isDark)
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
  root.style.colorScheme = isDark ? 'dark' : 'light'
}