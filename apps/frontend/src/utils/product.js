import { getPlaceholderImage } from './placeholder'

/**
 * Read-only view models for the Product model in
 * `apps/backend/src/models/Product.js`.
 *
 * The card, the grid and the detail page all need the same handful of derived
 * values (primary image, effective price, discount, rating, detail link). Doing
 * that derivation in one place keeps every surface rendering identical data and
 * keeps the components free of `?.` chains that silently render blanks when a
 * field is null.
 */

/** Coerce anything to a finite number, else null. Guards against NaN/undefined. */
const toNumber = (value) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return typeof num === 'number' && Number.isFinite(num) ? num : null
}

/**
 * Resolve a product's images into a plain `[{ url, alt }]` list.
 * The schema stores objects (`{ url, alt, isMain }`), but populated and
 * partially-hydrated documents can arrive as bare strings, so both are accepted.
 */
export const getProductImages = (product) => {
  const images = product?.images
  if (!Array.isArray(images)) return []

  return images
    .map((image) => {
      if (typeof image === 'string') return { url: image, alt: '' }
      if (!image || typeof image !== 'object') return null
      return { url: image.url || '', alt: image.alt || '', isMain: Boolean(image.isMain) }
    })
    .filter((image) => image.url)
}

/**
 * Primary image for a product. Prefers the image flagged `isMain`, otherwise
 * falls back to the first one, otherwise to a local SVG placeholder so a
 * product with no uploads never renders a broken image icon.
 */
export const getProductImage = (product, width = 300, height = 300) => {
  const images = getProductImages(product)
  const primary = images.find((image) => image.isMain) || images[0]
  return primary?.url || getPlaceholderImage(width, height)
}

/**
 * Price block. The schema has `price` plus an optional `compareAtPrice`
 * (strike-through reference) — there is no `salePrice`/`discountPrice`.
 * A live flash sale additionally discounts off `price`.
 */
export const getProductPrice = (product) => {
  const price = toNumber(product?.price) ?? 0
  const compareAtPrice = toNumber(product?.compareAtPrice)
  const hasDiscounted = compareAtPrice !== null && compareAtPrice > price

  const flashSale = product?.flashSale
  const flashActive = Boolean(flashSale?.enabled) && (flashSale.discountPercentage || 0) > 0
  const flashPercentage = flashActive ? flashSale.discountPercentage : 0

  const effectivePrice = Math.max(0, price - (price * flashPercentage) / 100)

  // Only a compareAtPrice can be struck through; a flash sale has no reference
  // price, it just lowers the amount paid.
  const referencePrice = hasDiscounted ? compareAtPrice : null

  let percentOff = 0
  if (referencePrice && referencePrice > effectivePrice) {
    percentOff = Math.round(((referencePrice - effectivePrice) / referencePrice) * 100)
  } else if (flashActive) {
    percentOff = Math.round(flashPercentage)
  }

  return {
    price,
    effectivePrice,
    compareAtPrice: referencePrice,
    hasDiscount: hasDiscounted,
    flashActive,
    flashPercentage,
    percentOff
  }
}

export const formatPrice = (value) =>
  `$${toNumber(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

/** Ratings live under `ratings.{average,count}` — never `rating`/`numReviews`. */
export const getProductRating = (product) => {
  const average = toNumber(product?.ratings?.average) ?? 0
  const count = toNumber(product?.ratings?.count) ?? 0
  return {
    average: Math.min(5, Math.max(0, average)),
    count,
    hasReviews: count > 0
  }
}

/** Category is a ref; populated it arrives as `{ _id, name, slug }`. */
export const getProductCategory = (product) => {
  const category = product?.category
  if (!category) return null
  if (typeof category === 'string') return { _id: category, name: '', slug: '' }
  return {
    _id: category._id || category.id || '',
    name: category.name || '',
    slug: category.slug || ''
  }
}

/** Stock comes from `inventory.quantity`; backorders mean 0 is still buyable. */
export const getProductStock = (product) => {
  const inventory = product?.inventory
  const quantity = toNumber(inventory?.quantity) ?? 0
  const trackQuantity = inventory?.trackQuantity !== false
  const allowBackorder = Boolean(inventory?.allowBackorder)
  const lowStockThreshold = toNumber(inventory?.lowStockThreshold) ?? 10

  return {
    quantity,
    trackQuantity,
    allowBackorder,
    lowStockThreshold,
    inStock: !trackQuantity || allowBackorder || quantity > 0,
    isLowStock: trackQuantity && !allowBackorder && quantity > 0 && quantity <= lowStockThreshold,
    isOutOfStock: trackQuantity && !allowBackorder && quantity <= 0
  }
}

/**
 * Detail-page path. Slugs are the canonical, readable identifier (the backend
 * generates them in a `pre('save')` hook), but they are optional in the schema
 * and absent on un-saved documents, so fall back to the id the detail endpoint
 * also accepts.
 */
export const getProductPath = (product) => {
  if (!product) return '/products'
  const identifier = product.slug || product._id
  return identifier ? `/products/${identifier}` : '/products'
}

export const isSameProduct = (a, b) => {
  if (!a || !b) return false
  const idA = a._id || a
  const idB = b._id || b
  return String(idA) === String(idB)
}