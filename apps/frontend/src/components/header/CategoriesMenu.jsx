import { useMemo } from 'react'
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories'
import { isCategoriesActive } from '../../config/navigation'
import NavLinkItem from './NavLinkItem'
import useDropdown from './useDropdown'

const STATUS_TEXT = {
  loading: 'Loading categories…',
  error: 'Categories unavailable.',
  empty: 'No categories yet.'
}

/**
 * Categories menu fed live by GET /api/v1/categories.
 *
 * `variant="inline"` → hover/click popover in the header bar (desktop).
 * `variant="drawer"` → disclosure section in the mobile drawer.
 *
 * Both variants render the same rows through the same NavLinkItem primitive
 * from the same query, so data, order and links cannot diverge.
 */
const CategoriesMenu = ({ variant = 'inline', onNavigate, pathname = '', search = '' }) => {
  const isDrawer = variant === 'drawer'
  const isRow = variant === 'row'
  const {
    isOpen,
    panelId,
    containerRef,
    triggerRef,
    toggle,
    close,
    openOnHover,
    closeOnHover
  } = useDropdown()

  // Shared 'categories' query — one cache entry across the whole app.
  const { data: categories = [], isLoading, isError } = useCategories()

  const rows = useMemo(
    () =>
      categories.map((category) => ({
        id: category._id,
        label: category.name,
        // The products endpoint matches on the category ObjectId, so the id is
        // what belongs in the query string (see backend routes/product.js).
        to: `/products?category=${category._id}`,
        meta: category.productCount > 0 ? `${category.productCount} products` : null,
        // Nested categories are indented using their persisted level.
        depth: Math.min(category.level ?? 0, 2),
        // Check if this specific category is active
        isActive: (currentPathname, currentSearch) => {
          if (currentPathname !== '/products') return false
          const urlParams = new URLSearchParams(currentSearch)
          return urlParams.get('category') === category._id
        }
      })),
    [categories]
  )

  const handleNavigate = () => {
    close()
    onNavigate?.()
  }

  const statusText = isLoading
    ? STATUS_TEXT.loading
    : isError
      ? STATUS_TEXT.error
      : rows.length === 0
        ? STATUS_TEXT.empty
        : null

  const rowVariant = isDrawer ? 'drawer' : 'row'

  // Calculate active state for Categories trigger
  const isActive = isCategoriesActive(pathname, search)

  const renderRows = () =>
    rows.map((row) => (
      <NavLinkItem
        key={row.id}
        item={{ ...row, isActive: row.isActive?.(pathname, search) }}
        variant={rowVariant}
        onNavigate={handleNavigate}
        className={row.depth > 0 ? 'opacity-90' : ''}
        style={row.depth > 0 ? { paddingLeft: `${0.75 + row.depth * 0.9}rem` } : undefined}
      />
    ))

  // ---------------------------------------------------------------- drawer
  if (isDrawer) {
    return (
      <div>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            isActive ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-3">
            <LayoutGrid className={`h-5 w-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-slate-500'}`} aria-hidden="true" />
            Categories
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-gray-300 dark:text-slate-600 transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div
            id={panelId}
            className="animate-fade-in mt-1 space-y-0.5 rounded-xl bg-gray-50 dark:bg-slate-900 p-1.5"
          >
            {statusText && (
              <p className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">{statusText}</p>
            )}
            {renderRows()}
          </div>
        )}
      </div>
    )
  }

  // --------------------------------------------------------------- row (dropdown popover)
  if (isRow) {
    return (
      <div
        ref={containerRef}
        className="relative"
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          role="menuitem"
          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            isActive ? 'bg-primary-50 dark:bg-primary-950/40' : 'hover:bg-gray-50 dark:hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 ${
              isActive ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : ''
            }`}>
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className={`min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-slate-100 ${
              isActive ? 'text-primary-600 dark:text-primary-400 font-semibold' : ''
            }`}>Categories</span>
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-gray-300 dark:text-slate-600 transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div
            id={panelId}
            role="menu"
            aria-label="Product categories"
            className="animate-fade-in mt-1 max-h-[70vh] space-y-0.5 overflow-y-auto overscroll-contain rounded-xl bg-gray-50 dark:bg-slate-900 p-1.5"
          >
            {statusText && <p className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">{statusText}</p>}
            {renderRows()}
          </div>
        )}
      </div>
    )
  }

  // --------------------------------------------------------------- desktop
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
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900 ${
          isActive || isOpen ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold' : 'text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400'
        }`}
      >
        Categories
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="menu"
          aria-label="Product categories"
          className="animate-scale-in absolute left-0 top-full z-50 mt-2 max-h-[70vh] w-72 origin-top-left overflow-y-auto overscroll-contain rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl"
        >
          {statusText && <p className="px-3 py-3 text-sm text-gray-500 dark:text-slate-400">{statusText}</p>}
          {renderRows()}
        </div>
      )}
    </div>
  )
}

export default CategoriesMenu