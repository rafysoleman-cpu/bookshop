/**
 * Query keys shared between the storefront and the admin screens.
 *
 * Keeping them here is what makes cross-screen invalidation possible: the
 * storefront reads `['products', params]` / `['product', slug]` / `categories`,
 * while the admin screens maintain their own `adminProducts` /
 * `adminCategories` entries. Invalidating only the admin keys leaves a shopper's
 * already-open tab showing a catalog that no longer exists.
 */
export const PRODUCTS_QUERY_KEY = 'products'
export const PRODUCT_QUERY_KEY = 'product'
export const CATEGORIES_QUERY_KEY = 'categories'

/**
 * Invalidate everything a shopper can be looking at.
 *
 * react-query v3 matches keys by prefix, so `PRODUCTS_QUERY_KEY` covers every
 * `['products', queryParams]` combination (each filter/sort/page has its own
 * entry) without having to enumerate them.
 *
 * Call this after any successful product or category write, anywhere in the app.
 */
export const invalidateCatalog = (queryClient) => {
  queryClient.invalidateQueries(PRODUCTS_QUERY_KEY)
  queryClient.invalidateQueries(PRODUCT_QUERY_KEY)
  queryClient.invalidateQueries(CATEGORIES_QUERY_KEY)
}
