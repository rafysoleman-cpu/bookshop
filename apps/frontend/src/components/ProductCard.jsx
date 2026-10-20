import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Star, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '../store/cartStore'
import { useWishlist } from '../hooks/useWishlist'
import {
  formatPrice,
  getProductCategory,
  getProductImage,
  getProductPath,
  getProductPrice,
  getProductRating,
  getProductStock
} from '../utils/product'

const PLACEHOLDER_SIZE = { grid: [400, 400], list: [200, 200] }

/**
 * Rating row. Renders a placeholder-width line when a product has no reviews
 * yet so cards in a grid stay the same height instead of jumping.
 */
const Rating = ({ rating, className = '' }) => {
  if (!rating.hasReviews) {
    return <div className={`h-5 ${className}`} aria-hidden="true" />
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Star className="w-4 h-4 text-yellow-400 dark:text-yellow-300 fill-current shrink-0" aria-hidden="true" />
      <span className="text-sm text-gray-600 dark:text-slate-400">
        {rating.average.toFixed(1)}
        <span className="text-gray-400 dark:text-slate-500"> ({rating.count})</span>
      </span>
    </div>
  )
}

const PriceBlock = ({ priceInfo, size = 'md' }) => {
  const sizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl'
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`${sizes[size]} font-bold text-gray-900 dark:text-slate-100`}>
        {formatPrice(priceInfo.effectivePrice)}
      </span>
      {priceInfo.hasDiscount && (
        <span className="text-sm text-gray-500 dark:text-slate-400 line-through">
          {formatPrice(priceInfo.compareAtPrice)}
        </span>
      )}
    </div>
  )
}

const ProductCard = ({ product, viewMode = 'grid' }) => {
  const addItem = useCartStore((state) => state.addItem)
  const { isSaved, toggle, isPending: wishlistPending, enabled: wishlistEnabled } = useWishlist()

  if (!product) return null

  const productId = product._id
  const name = product.name || 'Untitled book'
  const author = typeof product.author === 'string' ? product.author.trim() : ''
  const path = getProductPath(product)
  const priceInfo = getProductPrice(product)
  const rating = getProductRating(product)
  const stock = getProductStock(product)
  const category = getProductCategory(product)
  const saved = isSaved(product)

  const handleAddToCart = async () => {
    if (!productId || stock.isOutOfStock) return

    const result = await addItem(productId, 1)
    if (!result?.success) {
      toast.error(result?.error || 'Could not add this item to your cart')
    }
  }

  const wishlistButton = (extraClass = '') => (
    <button
      type="button"
      onClick={(event) => {
        // The card is wrapped in links in places; keep the click on the button.
        event.preventDefault()
        event.stopPropagation()
        toggle(product)
      }}
      disabled={!wishlistEnabled || wishlistPending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      title={wishlistEnabled ? (saved ? 'Remove from wishlist' : 'Add to wishlist') : 'Log in to save'}
      className={`p-2 rounded-full shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        saved ? 'bg-error-50 dark:bg-error-950/40 text-error-600 dark:text-error-400' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/70'
      } ${extraClass}`}
    >
      <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
    </button>
  )

  if (viewMode === 'list') {
    return (
      <article className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-shadow hover:shadow-lg">
        <div className="flex gap-4">
          <Link
            to={path}
            className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden flex-shrink-0"
            tabIndex={-1}
            aria-hidden="true"
          >
            <img
              src={getProductImage(product, ...PLACEHOLDER_SIZE.list)}
              alt={name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = getProductImage(null, ...PLACEHOLDER_SIZE.list)
              }}
            />
          </Link>

          <div className="flex-1 min-w-0">
            {category?.name && (
              <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-1 truncate">
                {category.name}
              </p>
            )}

            <Link to={path} className="block">
              <h3 className="font-medium text-gray-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-2 mb-1">
                {name}
              </h3>
            </Link>

            {author && (
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-2 truncate">by {author}</p>
            )}

            <Rating rating={rating} className="mb-2" />

            <PriceBlock priceInfo={priceInfo} />

            {stock.isOutOfStock && (
              <p className="text-sm text-error-600 dark:text-error-400 mt-1">Out of stock</p>
            )}
            {stock.isLowStock && (
              <p className="text-sm text-warning-600 dark:text-warning-400 mt-1">Only {stock.quantity} left</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            {wishlistButton()}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!productId || stock.isOutOfStock}
              aria-label={`Add ${name} to cart`}
              title={stock.isOutOfStock ? 'Out of stock' : 'Add to cart'}
              className="btn-primary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative aspect-square bg-gray-100 dark:bg-slate-800/70 overflow-hidden flex-shrink-0">
        <Link to={path} className="block w-full h-full" tabIndex={-1} aria-hidden="true">
          <img
            src={getProductImage(product, ...PLACEHOLDER_SIZE.grid)}
            alt={name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(event) => {
              // A dead image URL should degrade to the placeholder, not a
              // broken-image glyph.
              event.currentTarget.onerror = null
              event.currentTarget.src = getProductImage(null, ...PLACEHOLDER_SIZE.grid)
            }}
          />
        </Link>

        {priceInfo.percentOff > 0 && (
          <span className="absolute top-2 left-2 bg-error-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            {priceInfo.flashActive && priceInfo.flashPercentage > 0
              ? `Flash -${priceInfo.flashPercentage}%`
              : `-${priceInfo.percentOff}%`}
          </span>
        )}

        {stock.isOutOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-gray-900/80 text-white text-center text-xs font-medium py-1">
            Out of stock
          </span>
        )}

        <div className="absolute top-2 right-2 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {wishlistButton()}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {category?.name && (
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-1 truncate">
            {category.name}
          </p>
        )}

        <Link to={path} className="block">
          <h3 className="font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 mb-1">
            {name}
          </h3>
        </Link>

        {author && (
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2 truncate">by {author}</p>
        )}

        <Rating rating={rating} className="mb-2" />

        <PriceBlock priceInfo={priceInfo} />

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!productId || stock.isOutOfStock}
          className="w-full btn-primary flex items-center justify-center gap-2 mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4" aria-hidden="true" />
          <span>{stock.isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
        </button>
      </div>
    </article>
  )
}

// The card is rendered in grids of up to 24 on the products page; memoising
// keeps scroll/pagination re-renders from re-running the derived-value helpers
// for every card whose props did not change.
export default memo(ProductCard)