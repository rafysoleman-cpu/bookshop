import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useLogout } from '../../hooks/useLogout'
import { MAIN_NAV, buildAccountNav } from '../../config/navigation'
import { getInitials } from '../../utils/initials'
import NavLinkItem from './NavLinkItem'
import CategoriesMenu from './CategoriesMenu'
import ThemeToggle from './ThemeToggle'
import useDropdown from './useDropdown'

/**
 * Desktop account popover: identity trigger + account rows + logout.
 *
 * Rows come from buildAccountNav(), so the role-aware Admin item is
 * derived from live store state. The mobile drawer renders the same data via
 * the same config, so the two surfaces cannot disagree.
 *
 * The theme quick toggle is inserted between the role panel row and Settings —
 * see buildAccountNav() for why that split is returned as data rather than
 * hardcoded here. It stays inside this menu by design: the header bar itself
 * is kept clean of extra controls.
 */
const UserMenu = ({ includeHeaderNav = false, onNavigate } = {}) => {
  const { user } = useAuthStore()
  const { pathname, search } = useLocation()
  const logout = useLogout()
  const { isOpen, panelId, containerRef, triggerRef, toggle, close, openOnHover, closeOnHover } =
    useDropdown()

  if (!user) return null

  const { items, settingsItem } = buildAccountNav({ user })
  const initials = getInitials(user?.name)

  const handleLogout = async () => {
    close()
    await logout()
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={openOnHover}
      onMouseLeave={closeOnHover}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-slate-800/70 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900/40 text-xs font-semibold text-primary-700 dark:text-primary-300"
          aria-hidden="true"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initials || 'U'
          )}
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block max-w-[9rem] truncate text-sm font-medium leading-tight text-gray-900 dark:text-slate-100">
            {user?.name || 'User'}
          </span>
          <span className="block max-w-[9rem] truncate text-xs leading-tight text-gray-500 dark:text-slate-400">
            {user?.email}
          </span>
        </span>
        <ChevronDown
          className={`hidden h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500 transition-transform dark:text-slate-500 duration-200 lg:block ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
        <span className="sr-only">Open account menu</span>
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="menu"
          aria-label="Account"
          className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 dark:shadow-black/40 shadow-xl"
        >
          {includeHeaderNav && (
            <>
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Menu
              </p>
              <div className="space-y-0.5">
                {MAIN_NAV.filter((item) => !item.isDropdown).map((item) => (
                  <NavLinkItem
                    key={item.id}
                    item={{ ...item, isActive: item.isActive(pathname, search) }}
                    variant="row"
                    onNavigate={() => {
                      onNavigate?.()
                      close()
                    }}
                  />
                ))}
                <CategoriesMenu variant="row" pathname={pathname} search={search} onNavigate={() => {
                  onNavigate?.()
                  close()
                }} />
              </div>
              <div className="my-1.5 border-t border-gray-200 dark:border-slate-700" />
            </>
          )}

          <div className="space-y-0.5">
            {items.map((item) => (
              <NavLinkItem
                key={item.id}
                item={{ ...item, isActive: item.isActive?.(pathname, search) }}
                variant="row"
                onNavigate={() => {
                  onNavigate?.()
                  close()
                }}
                className={item.isDisabled ? 'opacity-70' : ''}
              />
            ))}
          </div>

          {/* Theme quick toggle — sits between the role panel and Settings. */}
          <div className="my-1.5 border-t border-gray-200 dark:border-slate-700">
            <ThemeToggle variant="row" />
          </div>

          <div className="space-y-0.5">
            <NavLinkItem
              item={{ ...settingsItem, isActive: settingsItem.isActive?.(pathname, search) }}
              variant="row"
              onNavigate={() => {
                onNavigate?.()
                close()
              }}
            />
          </div>

          <div className="my-1.5 border-t border-gray-200 dark:border-slate-700" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:bg-red-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu