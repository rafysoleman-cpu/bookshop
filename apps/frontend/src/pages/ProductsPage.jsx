import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  Grid,
  List,
  PackageSearch,
  RefreshCw,
  SlidersHorizontal,
  X
} from 'lucide-react'
import { useQuery } from 'react-query'
import { productAPI } from '../services/api'
import { useCategories } from '../hooks/useCategories'
import ProductCard from '../components/ProductCard'
import { ProductGridSkeleton } from '../components/ProductCardSkeleton'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Best Selling' }
]

const RATING_OPTIONS = [
  { value: '4', label: '4+ Stars' },
  { value: '3', label: '3+ Stars' },
  { value: '2', label: '2+ Stars' },
  { value: '1', label: '1+ Stars' }
]

const FILTER_KEYS = ['search', 'category', 'minPrice', 'maxPrice', 'rating', 'sortBy']

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)

  // The URL is the single source of truth for every filter. Reading state out
  // of it (instead of mirroring it into useState) means the header's category
  // links, browser back/forward and the sidebar can never disagree, and there
  // is no effect that writes params back on every render.
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const rating = searchParams.get('rating') || ''
  const sortBy = searchParams.get('sortBy') || 'relevance'
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  const { data: categories = [], isLoading: categoriesLoading } = useCategories()

  // Query params are built from primitives so react-query's structural sharing
  // sees a stable key between renders.
  const queryParams = useMemo(() => {
    const params = { page, limit: PAGE_SIZE, sortBy }
    if (search) params.search = search
    if (category) params.category = category
    if (minPrice) params.minPrice = minPrice
    if (maxPrice) params.maxPrice = maxPrice
    if (rating) params.rating = rating
    return params
  }, [page, search, category, minPrice, maxPrice, rating, sortBy])

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  } = useQuery(['products', queryParams], () => productAPI.getProducts(queryParams), {
    // keepPreviousData holds the current page on screen while the next one
    // loads, so pagination does not flash a skeleton over the whole grid.
    keepPreviousData: true,
    staleTime: 60 * 1000
  })

  const products = response?.data?.data?.products || []
  const pagination = response?.data?.data?.pagination || {}
  const total = pagination.total || 0
  const totalPages = pagination.totalPages || pagination.pages || 0
  const activeCategory = categories.find((item) => String(item._id) === String(category))

  const hasFilters = FILTER_KEYS.some(
    (key) => key !== 'sortBy' && Boolean(searchParams.get(key))
  )

  /**
   * Merge a patch into the query string. Any filter change resets to page 1,
   * otherwise changing e.g. the category while on page 4 would land on a page
   * that no longer exists.
   */
  const updateParams = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams)

      Object.entries(patch).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) next.delete(key)
        else next.set(key, String(value))
      })

      if (resetPage) next.delete('page')
      // 'relevance' is the backend default, so keep it out of the URL.
      if (next.get('sortBy') === 'relevance') next.delete('sortBy')

      setSearchParams(next)
    },
    [searchParams, setSearchParams]
  )

  const handlePageChange = useCallback(
    (nextPage) => {
      if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) return
      updateParams({ page: nextPage > 1 ? nextPage : '' }, { resetPage: false })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [updateParams, totalPages]
  )

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const heading = search
    ? `Search results for "${search}"`
    : activeCategory?.name || 'All Books'

  const showSkeleton = isLoading
  const showGrid = !showSkeleton && products.length > 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">{heading}</h1>
          <p className="text-gray-600 dark:text-slate-400" aria-live="polite">
            {isLoading
              ? 'Loading products…'
              : `${total} product${total === 1 ? '' : 's'} found`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <label htmlFor="sortBy" className="sr-only">
              Sort products
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(event) => updateParams({ sortBy: event.target.value })}
              className="appearance-none bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg pl-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <div
            className="flex items-center border border-gray-300 dark:border-slate-600 rounded-lg"
            role="group"
            aria-label="Change product layout"
          >
            {[
              { mode: 'grid', icon: Grid, label: 'Grid view' },
              { mode: 'list', icon: List, label: 'List view' }
            ].map(({ mode, icon: Icon, label }, index) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                aria-label={label}
                className={`p-2 ${
                  index === 0 ? 'rounded-l-lg' : 'rounded-r-lg'
                } ${viewMode === mode ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            className="lg:hidden flex items-center gap-2 btn-outline"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {search && (
            <FilterChip label={`“${search}”`} onRemove={() => updateParams({ search: '' })} />
          )}
          {category && (
            <FilterChip
              label={activeCategory?.name || 'Genre'}
              onRemove={() => updateParams({ category: '' })}
            />
          )}
          {(minPrice || maxPrice) && (
            <FilterChip
              label={`${minPrice ? formatFilterPrice(minPrice) : '$0'} – ${
                maxPrice ? formatFilterPrice(maxPrice) : 'any'
              }`}
              onRemove={() => updateParams({ minPrice: '', maxPrice: '' })}
            />
          )}
          {rating && (
            <FilterChip
              label={`${rating}+ stars`}
              onRemove={() => updateParams({ rating: '' })}
            />
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline"
          >
            Reset all
          </button>
        </div>
      )}

      <div className="flex gap-8">
        <aside
          className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}
          aria-label="Product filters"
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Filters</h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="filter-category"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
              >
                Category
              </label>
              <select
                id="filter-category"
                value={category}
                onChange={(event) => updateParams({ category: event.target.value })}
                disabled={categoriesLoading}
                className="w-full input"
              >
                <option value="">All Genres</option>
                {categories.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <span className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Price Range</span>
              <div className="space-y-2">
                <label htmlFor="filter-min-price" className="sr-only">
                  Minimum price
                </label>
                <input
                  id="filter-min-price"
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(event) => updateParams({ minPrice: event.target.value })}
                  className="w-full input"
                />
                <label htmlFor="filter-max-price" className="sr-only">
                  Maximum price
                </label>
                <input
                  id="filter-max-price"
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(event) => updateParams({ maxPrice: event.target.value })}
                  className="w-full input"
                />
              </div>
            </div>

            <div className="mb-2">
              <label htmlFor="filter-rating" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Minimum Rating
              </label>
              <select
                id="filter-rating"
                value={rating}
                onChange={(event) => updateParams({ rating: event.target.value })}
                className="w-full input"
              >
                <option value="">All Ratings</option>
                {RATING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {/* Subtle inline progress bar for background refetches, so the grid
              stays interactive instead of being replaced by skeletons. */}
          {isFetching && !isLoading && (
            <div className="h-0.5 w-full bg-gray-100 dark:bg-slate-800/70 overflow-hidden rounded mb-4">
              <div className="h-full w-1/3 bg-primary-500 animate-pulse" />
            </div>
          )}

          {showSkeleton && <ProductGridSkeleton count={PAGE_SIZE} viewMode={viewMode} />}

          {!showSkeleton && isError && (
            <div className="text-center py-16">
              <PackageSearch className="w-16 h-16 text-error-400 dark:text-error-300 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
                We couldn&apos;t load these books
              </h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                {error?.response?.data?.error || 'Something went wrong. Please try again.'}
              </p>
              <button type="button" onClick={() => refetch()} className="btn-primary">
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Try Again
              </button>
            </div>
          )}

          {!showSkeleton && !isError && !showGrid && (
            <div className="text-center py-16">
              <PackageSearch className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
                No books found{category ? ' in this genre' : ''}
              </h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                {activeCategory?.name
                  ? `${activeCategory.name} has no matching books right now.`
                  : 'Try adjusting your filters or search terms.'}
              </p>
              {hasFilters ? (
                <button type="button" onClick={clearFilters} className="btn-primary">
                  Reset Filters
                </button>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">Check back soon — new books are added regularly.</p>
              )}
            </div>
          )}

          {showGrid && (
            <>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                    : 'space-y-4'
                }
              >
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} viewMode={viewMode} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="mt-12" aria-label="Product pagination">
                  <Pagination
                    currentPage={pagination.page || page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

const formatFilterPrice = (value) => `$${parseFloat(value).toFixed(0)}`

const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-sm">
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter ${label}`}
      className="p-0.5 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/40"
    >
      <X className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  </span>
)

export default ProductsPage