import { User, Package, Heart, Settings, Shield } from 'lucide-react'

/**
 * Single source of truth for every storefront navigation item.
 *
 * The header (desktop inline + mobile drawer) renders these same arrays, so a
 * link can never drift between breakpoints the way it did when Header.jsx and
 * MobileMenu.jsx each held their own hardcoded copy.
 */

const isActivePath = (to) => (pathname, search) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)

/**
 * Checks if Products link should be active.
 * Active ONLY when:
 * - pathname === '/products' AND
 * - No category query parameter is present
 */
export const isProductsActive = (pathname, search) => {
  if (pathname !== '/products') return false
  const urlParams = new URLSearchParams(search)
  return !urlParams.has('category')
}

/**
 * Checks if Categories dropdown should be active.
 * Active when:
 * - On /products with a category query parameter (e.g., /products?category=123)
 * - On /category/... routes (if they exist)
 */
export const isCategoriesActive = (pathname, search) => {
  // Check if on products page with category filter
  if (pathname === '/products' || pathname.startsWith('/products/')) {
    const urlParams = new URLSearchParams(search)
    return urlParams.has('category')
  }
  // Check if on category-specific routes
  if (pathname.startsWith('/category/')) {
    return true
  }
  return false
}

export const MAIN_NAV = [
  {
    id: 'home',
    label: 'Home',
    to: '/',
    icon: null,
    isActive: isActivePath('/')
  },
  {
    id: 'products',
    label: 'Books',
    to: '/products',
    icon: null,
    isActive: isProductsActive
  },
  {
    id: 'categories',
    label: 'Genres',
    to: null,
    icon: null,
    isDropdown: true,
    isActive: isCategoriesActive
  }
]

export const ACCOUNT_NAV = [
  { id: 'profile', label: 'Profile', to: '/profile', icon: User, isActive: isActivePath('/profile') },
  { id: 'orders', label: 'Orders', to: '/orders', icon: Package, isActive: isActivePath('/orders') },
  { id: 'wishlist', label: 'Wishlist', to: '/wishlist', icon: Heart, isActive: isActivePath('/wishlist') }
]

export const SETTINGS_NAV_ITEM = {
  id: 'settings',
  label: 'Settings',
  to: '/settings',
  icon: Settings,
  isActive: isActivePath('/settings')
}

/**
 * Resolves the admin panel link shown between Wishlist and Settings.
 * Returns null for a plain user, which is what hides the row.
 */
export const getRoleNavItem = ({ user }) => {
  if (user?.role === 'admin') {
    return { id: 'admin-panel', label: 'Admin Panel', to: '/admin', icon: Shield, isActive: isActivePath('/admin') }
  }

  return null
}

/**
 * Full account section in spec order: Profile, Orders, Wishlist, role panel
 * (omitted for plain users), then Settings last.
 *
 * Settings is returned separately from `items` on purpose. The theme quick
 * toggle must sit between the role panel and Settings on both the desktop
 * popover and the mobile drawer, and exposing the split point as data lets
 * both surfaces place it identically — rather than each hardcoding an index,
 * which is how the two menus drifted apart in the first place.
 *
 * Callers render: items → theme toggle → settingsItem.
 */
export const buildAccountNav = ({ user }) => {
  const items = [...ACCOUNT_NAV]
  const roleItem = getRoleNavItem({ user })

  if (roleItem) items.push(roleItem)

  return { items, settingsItem: SETTINGS_NAV_ITEM }
}