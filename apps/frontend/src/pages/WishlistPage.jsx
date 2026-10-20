import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2, Star, Eye, Grid, List, PackageSearch, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userAPI, cartAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  formatPrice,
  getProductImage,
  getProductPath,
  getProductPrice,
  getProductRating,
  getProductStock
} from '../utils/product'
import { WISHLIST_QUERY_KEY, selectWishlistProducts } from '../hooks/useWishlist'

/**
 * One saved product. Grid and list differ only in layout, so both share this
 * component instead of duplicating the price/rating/stock/button markup — the
 * duplication is what let the two views drift apart.
 */
const WishlistItem = ({ product, viewMode, onAddToCart, onRemove, isBusy }) => {
  const path = getProductPath(product)
  const priceInfo = getProductPrice(product)
  const rating = getProductRating(product)
  const stock = getProductStock(product)
  const name = product.name || 'Untitled product'
  const canBuy = stock.inStock

  const actions = (
    <div className="flex gap-2 mt-auto pt-4">
      <button
        type="button"
        onClick={() => onAddToCart(product)}
        disabled={!canBuy || isBusy}
        title={canBuy ? undefined : 'Out of stock'}
        className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
        <span>{canBuy ? 'Add to Cart' : 'Out of Stock'}</span>
      </button>

      <button
        type="button"
        onClick={() => onRemove(product)}
        disabled={isBusy}
        aria-label={`Remove ${name} from wishlist`}
        title="Remove from wishlist"
        className="btn-outline p-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )

  const price = (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-lg font-bold text-gray-900 dark:text-slate-100">{formatPrice(priceInfo.effectivePrice)}</span>
      {priceInfo.hasDiscount && (
        <span className="text-sm text-gray-500 dark:text-slate-400 line-through">
          {formatPrice(priceInfo.compareAtPrice)}
        </span>
      )}
    </div>
  )

  const ratingRow = rating.hasReviews ? (
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4 text-yellow-400 dark:text-yellow-300 fill-current" aria-hidden="true" />
      <span className="text-sm text-gray-600 dark:text-slate-400">
        {rating.average.toFixed(1)} ({rating.count})
      </span>
    </div>
  ) : null

  if (viewMode === 'list') {
    return (
      <article className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
        <div className="flex gap-4">
          <Link to={path} className="w-24 h-24 bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden flex-shrink-0" tabIndex={-1} aria-hidden="true">
            <img
              src={getProductImage(product, 200, 200)}
              alt={name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </Link>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link to={path} className="font-medium text-gray-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-2">
                  {name}
                </Link>
                {ratingRow}
              </div>
              <div className="text-right flex-shrink-0">
                {price}
                {priceInfo.percentOff > 0 && (
                  <span className="inline-block mt-1 bg-error-100 dark:bg-error-900/40 text-error-800 dark:text-error-300 px-2 py-1 rounded text-xs font-semibold">
                    {priceInfo.percentOff}% OFF
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              {stock.isOutOfStock ? 'Out of stock' : `${stock.quantity} in stock`}
            </p>

            {actions}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={path} className="relative block aspect-square bg-gray-100 dark:bg-slate-800/70 overflow-hidden" tabIndex={-1} aria-hidden="true">
        <img
          src={getProductImage(product, 400, 400)}
          alt={name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />

        {priceInfo.percentOff > 0 && (
          <span className="absolute top-2 left-2 bg-error-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            {priceInfo.percentOff}% OFF
          </span>
        )}

        {stock.isOutOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-gray-900/80 text-white text-center text-xs font-medium py-1">
            Out of stock
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to={path} className="font-medium text-gray-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-2 mb-1">
          {name}
        </Link>

        {ratingRow && <div className="mb-2">{ratingRow}</div>}

        {price}

        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
          {stock.isOutOfStock ? 'Out of stock' : `${stock.quantity} in stock`}
        </p>

        {actions}
      </div>
    </article>
  )
}

const WishlistPage = () => {
  const [viewMode, setViewMode] = useState('grid')
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    data: wishlist = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(WISHLIST_QUERY_KEY, userAPI.getWishlist, {
    // The endpoint is auth-gated; do not fire it for anonymous visitors.
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    select: selectWishlistProducts,
    retry: false
  })

  const removeMutation = useMutation(userAPI.removeFromWishlist, {
    onSuccess: (_data, productId) => {
      // Optimistically drop the row so the list does not wait on a round trip.
      queryClient.setQueryData(WISHLIST_QUERY_KEY, (previous) =>
        (previous || []).filter((product) => String(product._id) !== String(productId))
      )
      queryClient.invalidateQueries(WISHLIST_QUERY_KEY)
    },
    onError: (err, productId) => {
      queryClient.invalidateQueries(WISHLIST_QUERY_KEY)
      toast.error(err.response?.data?.error || 'Failed to remove from wishlist')
    }
  })

  const clearMutation = useMutation(userAPI.clearWishlist, {
    onSuccess: () => {
      queryClient.setQueryData(WISHLIST_QUERY_KEY, [])
      queryClient.invalidateQueries(WISHLIST_QUERY_KEY)
      toast.success('Wishlist cleared')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to clear your wishlist')
    }
  })

  const addToCartMutation = useMutation(cartAPI.addItem, {
    onSuccess: () => {
      queryClient.invalidateQueries('cart')
    }
  })

  const handleMoveToCart = async (product) => {
    try {
      await addToCartMutation.mutateAsync({ productId: product._id, quantity: 1 })
      await removeMutation.mutateAsync(product._id)
      toast.success(`Moved "${product.name}" to your cart`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not move this item to your cart')
    }
  }

  const handleRemove = (product) => removeMutation.mutate(product._id)

  /**
   * Add every in-stock item, one request at a time.
   * Firing them concurrently lets the cart writes interleave, and the shared
   * `isLoading` flag made the per-item spinner flicker for every row at once.
   */
  const handleAddAllToCart = async () => {
    const inStock = wishlist.filter((product) => getProductStock(product).inStock)
    const skipped = wishlist.length - inStock.length

    if (inStock.length === 0) {
      toast.error('None of your saved items are in stock')
      return
    }

    let added = 0
    for (const product of inStock) {
      try {
        // Sequential on purpose — see above.
        // eslint-disable-next-line no-await-in-loop
        await addToCartMutation.mutateAsync({ productId: product._id, quantity: 1 })
        added += 1
      } catch {
        // Keep going; report the shortfall at the end.
      }
    }

    queryClient.invalidateQueries('cart')
    toast.success(
      skipped > 0
        ? `Added ${added} of ${wishlist.length} items (${skipped} out of stock)`
        : `Added ${added} item${added === 1 ? '' : 's'} to cart`
    )
  }

  const handleClearWishlist = () => {
    if (!window.confirm('Are you sure you want to clear your wishlist?')) return
    clearMutation.mutate()
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Heart className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Your wishlist is waiting</h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Log in to see the books you have saved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/login" className="btn-primary">
            Log In
          </Link>
          <Link to="/products" className="btn-outline inline-flex items-center gap-2">
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span>Browse Books</span>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <PackageSearch className="w-16 h-16 text-error-400 dark:text-error-300 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Couldn&apos;t load your wishlist</h1>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          {error?.response?.data?.error || 'Something went wrong. Please try again.'}
        </p>
        <button type="button" onClick={() => refetch()} className="btn-primary">
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          Try Again
        </button>
      </div>
    )
  }

  const hasItems = wishlist.length > 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">My Wishlist</h1>
          <p className="text-gray-600 dark:text-slate-400" aria-live="polite">
            {hasItems ? `${wishlist.length} item${wishlist.length === 1 ? '' : 's'} saved` : 'Your wishlist is empty'}
          </p>
        </div>

        {hasItems && (
          <div
            className="flex items-center border border-gray-300 dark:border-slate-600 rounded-lg"
            role="group"
            aria-label="Change wishlist layout"
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
        )}
      </div>

      {!hasItems ? (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Your wishlist is empty</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Start adding items to your wishlist to keep track of books you love.
          </p>
          <Link to="/products" className="btn-primary inline-flex items-center gap-2">
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span>Browse Books</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {wishlist.map((product) => (
              <WishlistItem
                key={product._id}
                product={product}
                viewMode={viewMode}
                onAddToCart={handleMoveToCart}
                onRemove={handleRemove}
                isBusy={
                  removeMutation.isLoading || clearMutation.isLoading || addToCartMutation.isLoading
                }
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleAddAllToCart}
              disabled={addToCartMutation.isLoading}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              <span>
                {addToCartMutation.isLoading ? 'Adding…' : 'Add All to Cart'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleClearWishlist}
              disabled={clearMutation.isLoading}
              className="btn-outline flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>{clearMutation.isLoading ? 'Clearing…' : 'Clear Wishlist'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WishlistPage