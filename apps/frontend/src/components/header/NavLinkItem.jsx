import { Link } from 'react-router-dom'

/**
 * One link primitive shared by the desktop primary nav, the popover rows and
 * the mobile drawer.
 *
 * variant:
 *   'inline' → plain text nav link in the header bar
 *   'row'    → dropdown/popover row, optional leading icon + meta line
 *   'drawer' → full-width drawer row with icon and right-aligned meta
 *
 * Destination, label and active state always come from the caller, which reads
 * from config/navigation.jsx, so the three surfaces cannot drift apart.
 */
const NavLinkItem = ({ item, variant = 'inline', onNavigate, className = '', style }) => {
  const { label, to, icon: Icon, isActive, meta, trailing: TrailingIcon } = item

  if (variant === 'inline') {
    return (
      <Link
        to={to}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        style={style}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900 ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold'
            : 'text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400'
        } ${className}`}
      >
        {label}
      </Link>
    )
  }

  if (variant === 'drawer') {
    return (
      <Link
        to={to}
        onClick={onNavigate}
        style={style}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold'
            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-800'
        } ${className}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          {Icon && (
            <Icon
              className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-slate-500'}`}
              aria-hidden="true"
            />
          )}
          <span className="truncate">{label}</span>
        </span>
        {meta ? (
          <span className="shrink-0 text-xs font-normal tabular-nums text-gray-400 dark:text-slate-500">{meta}</span>
        ) : (
          TrailingIcon && <TrailingIcon className="h-4 w-4 shrink-0 text-gray-300 dark:text-slate-600" aria-hidden="true" />
        )}
      </Link>
    )
  }

  // 'row' — dropdown / popover rows
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onNavigate}
      style={style}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
        isActive ? 'bg-primary-50 dark:bg-primary-950/40' : 'hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-700'
      } ${className}`}
    >
      {Icon && (
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
          isActive
            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
            : 'bg-gray-100 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400'
        }`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-medium ${
          isActive ? 'text-primary-600 dark:text-primary-400 font-semibold' : 'text-gray-900 dark:text-slate-100'
        }`}>{label}</span>
        {meta && <span className="block text-xs text-gray-500 dark:text-slate-400">{meta}</span>}
      </span>
      {TrailingIcon && <TrailingIcon className="h-4 w-4 shrink-0 text-gray-300 dark:text-slate-600" aria-hidden="true" />}
    </Link>
  )
}

export default NavLinkItem