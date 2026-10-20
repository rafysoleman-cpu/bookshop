import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

/**
 * Compact Sun/Moon quick switcher for the account surfaces.
 *
 * Rendered inside the UserMenu popover (variant="row") and the mobile drawer
 * (variant="drawer"), between the role panel row and Settings. One component
 * for both so the two surfaces cannot disagree — the same reasoning behind
 * NavLinkItem.
 *
 * It reports the *resolved* mode (what is actually painted) rather than the
 * preference, so a user on 'system' at night sees the switch in the on
 * position. Flipping it always lands on an explicit light/dark choice instead
 * of handing control back to the OS.
 *
 * The menu is left open on click — this is a preference you flip while
 * browsing, not a destination — so it deliberately does not call the host's
 * onNavigate/close.
 */
const ThemeToggle = ({ variant = 'row' }) => {
  const { isDark, option, toggleTheme } = useTheme()
  const StatusIcon = option.icon
  const isDrawer = variant === 'drawer'

  const statusLabel = option.shortLabel

  // role="menuitemcheckbox" is the valid role for a toggling row inside a
  // role="menu" panel, and keeps the switch operable with the same keyboard
  // expectations as the surrounding links.
  const roleProps = isDrawer
    ? { 'aria-pressed': isDark }
    : { role: 'menuitemcheckbox', 'aria-checked': isDark }

  const chip = (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 dark:bg-slate-700 dark:text-slate-300 ${
        isDrawer ? 'h-10 w-10' : ''
      }`}
      aria-hidden="true"
    >
      <StatusIcon className={isDrawer ? 'h-5 w-5' : 'h-4 w-4'} />
    </span>
  )

  const pill = (
    <span
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-gray-200 dark:bg-slate-700 transition-colors duration-200"
      aria-hidden="true"
    >
      <span
        className={`absolute flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 shadow-sm transition-all duration-200 dark:bg-slate-100 dark:text-slate-700 ${
          isDark ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
        }`}
      >
        {isDark ? (
          <Moon className="h-2.5 w-2.5" />
        ) : (
          <Sun className="h-2.5 w-2.5" />
        )}
      </span>
    </span>
  )

  const handleClick = () => {
    toggleTheme()
  }

  const handleKeyDown = (event) => {
    // Space/Enter already activate a <button>; ArrowLeft/ArrowRight are added
    // so the switch is reachable the way a native toggle is expected to be.
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      toggleTheme()
    }
  }

  if (isDrawer) {
    return (
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Theme: ${statusLabel}. Switch to ${isDark ? 'light' : 'dark'} mode.`}
        {...roleProps}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-slate-800"
      >
        <span className="flex min-w-0 items-center gap-3">
          {chip}
          <span className="min-w-0">
            <span className="block truncate">Theme</span>
            <span className="block truncate text-xs font-normal text-gray-500 dark:text-slate-400">
              {statusLabel}
            </span>
          </span>
        </span>
        {pill}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Theme: ${statusLabel}. Switch to ${isDark ? 'light' : 'dark'} mode.`}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-slate-700"
      {...roleProps}
    >
      {chip}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900 dark:text-slate-100">
          Theme
        </span>
        <span className="block truncate text-xs text-gray-500 dark:text-slate-400">
          {statusLabel}
        </span>
      </span>
      {pill}
    </button>
  )
}

export default ThemeToggle