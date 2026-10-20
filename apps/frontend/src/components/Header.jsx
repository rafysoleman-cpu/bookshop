import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { MAIN_NAV } from '../config/navigation'
import NavLinkItem from './header/NavLinkItem'
import HeaderSearch from './header/HeaderSearch'
import CategoriesMenu from './header/CategoriesMenu'
import UserMenu from './header/UserMenu'
import MobileMenu from './MobileMenu'

/**
 * Unified storefront header.
 *
 * Desktop (lg+): Logo → Search → Primary nav → Cart → User, single row.
 * Mobile/tablet: Logo → Cart → Menu in row one, full-width search in row two.
 * The drawer handles navigation only; it no longer repeats search or account
 * rows at the bottom.
 */
const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { isAuthenticated } = useAuthStore()
  const { itemCount, openCart } = useCartStore()
  const { pathname, search } = useLocation()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-all duration-300 ${isScrolled
            ? 'border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 shadow-md backdrop-blur-md'
            : 'border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm'
          }`}
      >
        <div className="container mx-auto px-4">
          {/* Row one */}
          <div className="flex h-16 items-center gap-2 sm:gap-3 lg:gap-4">
            {/* 1. Logo */}
            <div className="flex shrink-0 items-center">
              <Link
                to="/"
                className="flex items-center gap-1.5 text-lg font-bold text-primary-600 dark:text-primary-400 transition-colors hover:text-primary-700 dark:hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900 sm:gap-2 sm:text-xl lg:text-2xl"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 sm:h-8 sm:w-8">
                  <span className="text-xs font-bold text-white sm:text-sm">E</span>
                </span>
                <span className="hidden sm:inline">BookShop</span>
              </Link>
            </div>

            {/* 2. Search Bar - flexible, always in header row */}
            <div className="min-w-0 flex-1 px-1 sm:px-2">
              <HeaderSearch variant="inline" />
            </div>

            {/* 3. Main Nav Links (Home, Products, Categories) - large screens only */}
            <nav
              aria-label="Primary"
              className="hidden items-center gap-1 lg:flex xl:gap-2"
            >
              {MAIN_NAV.filter((item) => !item.isDropdown).map((item) => (
                <NavLinkItem
                  key={item.id}
                  item={{ ...item, isActive: item.isActive(pathname, search) }}
                  variant="inline"
                />
              ))}
              <CategoriesMenu pathname={pathname} search={search} />
            </nav>

            {/* 4. Cart Button + User Profile/Dropdown + Hamburger */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 md:gap-2">
              <button
                type="button"
                onClick={openCart}
                aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : 'Cart'}
                className="relative rounded-lg p-2 text-gray-600 dark:text-slate-400 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-slate-800/70 hover:text-primary-600 dark:hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {itemCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {isAuthenticated ? (
                <>
                  <div className="hidden md:block lg:hidden">
                    <UserMenu includeHeaderNav />
                  </div>
                  <div className="hidden lg:block">
                    <UserMenu />
                  </div>
                </>
              ) : (
                <div className="hidden items-center gap-1 md:flex">
                  <Link
                    to="/login"
                    className="btn-ghost rounded-lg px-2 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:px-3"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary rounded-lg px-2 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900 sm:px-3"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                className="rounded-lg p-2 text-gray-600 dark:text-slate-400 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-slate-800/70 hover:text-primary-600 dark:hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900 md:hidden"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Spacer offsetting the fixed header */}
      <div className="h-16" aria-hidden="true" />

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  )
}

export default Header