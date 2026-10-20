import { useQuery } from 'react-query'
import { categoryAPI } from '../services/api'

export const CATEGORIES_QUERY_KEY = 'categories'

/**
 * Normalises the categories response to a plain array.
 *
 * The live API answers GET /categories with `{ success, data: [...] }`, and the
 * axios response interceptor returns the whole response object, so under
 * react-query the array lives at `response.data.data`. Consumers should not
 * need to know that shape, so we flatten it here once.
 */
const selectCategories = (response) => {
  const payload = response?.data?.data ?? response?.data
  return Array.isArray(payload) ? payload : []
}

/**
 * Shared categories query. Every consumer (header menu, home, products,
 * search) uses this so they share one cache entry under 'categories' and can
 * never disagree about the response shape.
 *
 * Always hits the live API: category ids drive the catalog's `?category=` filter,
 * so inventing categories would produce filters that match nothing.
 */
export const useCategories = (options = {}) =>
  useQuery(CATEGORIES_QUERY_KEY, () => categoryAPI.getCategories(), {
    // Was 30 minutes, which meant a newly created category could stay invisible
    // in the nav and catalog filters for half an hour. Category ids drive the
    // `?category=` filter, so this needs to stay in step with product writes.
    staleTime: 5 * 60 * 1000,
    select: selectCategories,
    ...options
  })