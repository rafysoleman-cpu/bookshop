import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export const WISHLIST_QUERY_KEY = 'userWishlist'

/**
 * Unwrap the wishlist payload to a plain array.
 *
 * `GET /users/wishlist` answers `{ success, data: { wishlist: [...] } }`, so the
 * products sit one level deeper than a bare array — reading `response.data`
 * yields the wrapper object, and `.length` / `.map()` on it silently fail.
 * Every consumer should go through here instead of re-deriving the shape.
 */
const unwrapWishlist = (response) => {
  const payload = response?.data?.data ?? response?.data
  const list = Array.isArray(payload) ? payload : payload?.wishlist
  return Array.isArray(list) ? list : []
}

/** Wishlist query result -> populated Product documents. */
export const selectWishlistProducts = (response) => unwrapWishlist(response)

/** Wishlist query result -> `Set` of product id strings. */
export const selectWishlistIds = (response) =>
  unwrapWishlist(response)
    .map((entry) => (entry && typeof entry === 'object' ? entry._id : entry))
    .filter(Boolean)
    .map(String)

/**
 * Shared wishlist state for product cards.
 *
 * Every card mounts this hook, but they all subscribe to the *same* React Query
 * key, so a grid of 20 cards issues exactly one request and they all re-render
 * together after a toggle. The returned mutation is also shared, which keeps
 * optimistic updates consistent across the grid.
 */
export const useWishlist = () => {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: wishlistIds } = useQuery(WISHLIST_QUERY_KEY, userAPI.getWishlist, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    select: selectWishlistIds,
    // A failed wishlist fetch must not surface an error on every card.
    retry: false
  })

  const wishlist = useMemo(() => new Set(wishlistIds || []), [wishlistIds])

  const toggleWishlist = useMutation(
    ({ productId, isSaved }) =>
      isSaved ? userAPI.removeFromWishlist(productId) : userAPI.addToWishlist(productId),
    {
      onSuccess: (_data, { isSaved, productName }) => {
        toast.success(isSaved ? 'Removed from wishlist' : `Added ${productName ? `"${productName}"` : 'product'} to wishlist`)
        queryClient.invalidateQueries(WISHLIST_QUERY_KEY)
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Could not update your wishlist. Please try again.')
      }
    }
  )

  const isSaved = (product) => {
    const id = product?._id
    return id ? wishlist.has(String(id)) : false
  }

  const toggle = (product) => {
    if (!isAuthenticated) {
      toast.error('Please log in to use your wishlist')
      return
    }

    const id = product?._id
    if (!id) return

    toggleWishlist.mutate({ productId: id, isSaved: wishlist.has(String(id)), productName: product.name })
  }

  return {
    isSaved,
    toggle,
    isPending: toggleWishlist.isLoading,
    enabled: isAuthenticated
  }
}