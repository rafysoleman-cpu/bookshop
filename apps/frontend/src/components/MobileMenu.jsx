import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, LogOut, LogIn, UserPlus } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useLogout } from '../hooks/useLogout'
import { MAIN_NAV, buildAccountNav } from '../config/navigation'
import { getInitials } from '../utils/initials'
import NavLinkItem from './header/NavLinkItem'
import CategoriesMenu from './header/CategoriesMenu'
import ThemeToggle from './header/ThemeToggle'

/**
 * Mobile slide-in drawer.
 *
 * Layout (enterprise IA): identity card at the top, then the navigation
 * sections, with the session action (Logout, or Sign In / Register) pinned to
 * the bottom. Search is intentionally absent — it lives in the header's second
 * row so it is reachable without opening the drawer.
 *
 * Every row comes from config/navigation.jsx and the shared NavLinkItem, the
 * same data the desktop header uses, so the two surfaces cannot drift. The
 * theme toggle uses the same shared ThemeToggle component and the same slot in
 * the account list, so it stays in step with the desktop popover.
 */
const MobileMenu = ({ isOpen, onClose }) => {
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)
  const { pathname, search } = useLocation()
  const { user } = useAuthStore()
  const logout = useLogout()

  const handleNavigate = () => onClose()

  // Move focus into the drawer when it opens.
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus()
  }, [isOpen])

  // Escape closes the drawer; Tab is trapped inside it while open.
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Close on route change so a back/forward navigation cannot leave it open.
  useEffect(() => {
    if (isOpen) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (!isOpen) return null

  const { items: accountItems, settingsItem } = user
    ? buildAccountNav({ user })
    : { items: [], settingsItem: null }

  const handleLogout = async () => {
    onClose()
    await logout()
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="animate-fade-in absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="animate-slide-in-right absolute inset-y-0 right-0 flex w-[min(21rem,88vw)] flex-col bg-white dark:bg-slate-800 shadow-2xl"
      >
        {/* Drawer title row */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-4 py-3.5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Menu</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-2 text-gray-500 dark:text-slate-400 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-slate-800/70 hover:text-gray-700 dark:hover:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Identity at the top */}
          <div className="border-b border-gray-100 dark:border-slate-700 bg-gradient-to-br from-primary-50 to-white p-4 dark:from-slate-700 dark:to-slate-800">
            {user ? (
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900/40 text-sm font-semibold text-primary-700 dark:text-primary-300 ring-2 ring-white shadow-sm dark:ring-slate-800"
                  aria-hidden="true"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(user.name) || 'U'
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {user.name || 'User'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Welcome to BookShop</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                  Sign in to sync your cart, wishlist and orders across devices.
                </p>
              </>
            )}
          </div>

          {/* Primary navigation */}
          <nav aria-label="Mobile primary" className="p-3">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
              Menu
            </p>
            <div className="space-y-0.5">
              {MAIN_NAV.filter((item) => !item.isDropdown).map((item) => (
                <NavLinkItem
                  key={item.id}
                  item={{ ...item, isActive: item.isActive(pathname, search) }}
                  variant="drawer"
                  onNavigate={handleNavigate}
                />
              ))}

              <CategoriesMenu variant="drawer" onNavigate={handleNavigate} pathname={pathname} search={search} />
            </div>
          </nav>

          {/* Account navigation (signed-in only) */}
          {user && (
            <nav aria-label="Mobile account" className="border-t border-gray-100 dark:border-slate-700 p-3">
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Account
              </p>
              <div className="space-y-0.5">
                {accountItems.map((item) => (
                  <NavLinkItem
                    key={item.id}
                    item={{ ...item, isActive: item.isActive?.(pathname, search) }}
                    variant="drawer"
                    onNavigate={handleNavigate}
                    className={item.isDisabled ? 'opacity-70' : ''}
                  />
                ))}

                {/* Theme quick toggle — same slot as the desktop popover. */}
                <div className="my-2 border-t border-gray-100 dark:border-slate-700 pt-2">
                  <ThemeToggle variant="drawer" />
                </div>

                {settingsItem && (
                  <NavLinkItem
                    item={{ ...settingsItem, isActive: settingsItem.isActive?.(pathname, search) }}
                    variant="drawer"
                    onNavigate={handleNavigate}
                  />
                )}
              </div>
            </nav>
          )}
        </div>

        {/* Session action pinned to the bottom */}
        <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:bg-red-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={handleNavigate}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={handleNavigate}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MobileMenu