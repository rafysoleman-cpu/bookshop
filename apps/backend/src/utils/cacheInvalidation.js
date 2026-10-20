import { deleteCache, deleteCachePattern } from '../config/redis.js';

export const PRODUCT_CACHE_PATTERNS = Object.freeze([
  'products:*',
  'search:products:*',
  'search:suggestions:*',
  'search:popular'
]);

export const CATEGORY_CACHE_PATTERNS = Object.freeze(['categories:*']);

/**
 * Drop every cached copy of a product.
 *
 * `GET /products/:idOrSlug` caches under whichever identifier the caller used
 * (see routes/product.js), and the storefront links by slug. Clearing only
 * `product:<id>` therefore leaves `product:<slug>` cached, so an already-visited
 * product page keeps serving the old copy until the TTL expires, and a slug
 * change orphans the previous key entirely.
 *
 * @param {string} productId  ObjectId of the product
 * @param {string|string[]} [slugs]  Current and/or previous slug(s). Updates
 *   should pass both, since the pre-update slug may already be cached.
 */
export const invalidateProductCaches = (productId, slugs) => {
  const jobs = PRODUCT_CACHE_PATTERNS.map((pattern) => deleteCachePattern(pattern));

  const detailKeys = new Set();
  if (productId) {
    detailKeys.add(`product:${productId}`);
  }

  for (const slug of Array.isArray(slugs) ? slugs : [slugs]) {
    if (slug) {
      detailKeys.add(`product:${slug}`);
    }
  }

  for (const key of detailKeys) {
    jobs.push(deleteCache(key));
  }

  return Promise.all(jobs);
};

export const invalidateCategoryCaches = () =>
  Promise.all(CATEGORY_CACHE_PATTERNS.map((pattern) => deleteCachePattern(pattern)));
