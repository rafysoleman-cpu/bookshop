import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'
import { useAuthStore } from './authStore'

const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      isLoading: false,
      isOpen: false,

      // Actions
      addItem: async (productId, quantity = 1, variant = null) => {
        try {
          set({ isLoading: true })
          
          const { isAuthenticated } = useAuthStore.getState()
          
          if (isAuthenticated) {
            // Add to server cart
            await api.post('/cart/add', { productId, quantity, variant })
          } else {
            // Add to local cart
            const { items } = get()
            const existingItem = items.find(item => 
              item.product === productId && 
              JSON.stringify(item.variant) === JSON.stringify(variant)
            )

            if (existingItem) {
              existingItem.quantity += quantity
            } else {
              items.push({
                product: productId,
                variant,
                quantity,
                price: 0, // Will be updated when product details are fetched
                addedAt: new Date().toISOString()
              })
            }
          }

          set({ isLoading: false })
          get().fetchCart() // Refresh cart
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Failed to add item to cart'
          }
        }
      },

      updateItemQuantity: async (productId, quantity, variant = null) => {
        try {
          set({ isLoading: true })
          
          const { isAuthenticated } = useAuthStore.getState()
          
          if (isAuthenticated) {
            await api.put('/cart/update', { productId, quantity, variant })
          } else {
            const { items } = get()
            const item = items.find(item => 
              item.product === productId && 
              JSON.stringify(item.variant) === JSON.stringify(variant)
            )

            if (item) {
              if (quantity <= 0) {
                get().removeItem(productId, variant)
              } else {
                item.quantity = quantity
              }
            }
          }

          set({ isLoading: false })
          get().fetchCart()
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Failed to update item quantity'
          }
        }
      },

      removeItem: async (productId, variant = null) => {
        try {
          set({ isLoading: true })
          
          const { isAuthenticated } = useAuthStore.getState()
          
          if (isAuthenticated) {
            await api.delete('/cart/remove', { data: { productId, variant } })
          } else {
            const { items } = get()
            const newItems = items.filter(item => 
              !(item.product === productId && 
                JSON.stringify(item.variant) === JSON.stringify(variant))
            )
            set({ items: newItems })
          }

          set({ isLoading: false })
          get().fetchCart()
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Failed to remove item from cart'
          }
        }
      },

      clearCart: async () => {
        try {
          set({ isLoading: true })
          
          const { isAuthenticated } = useAuthStore.getState()
          
          if (isAuthenticated) {
            await api.delete('/cart/clear')
          }
          
          set({ items: [], isLoading: false })
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Failed to clear cart'
          }
        }
      },

      fetchCart: async () => {
        try {
          const { isAuthenticated } = useAuthStore.getState()
          
          if (isAuthenticated) {
            const response = await api.get('/cart')
            const { items, subtotal } = response.data.data
            set({ items, isLoading: false })
          } else {
            // For guest cart, we already have items in local state
            set({ isLoading: false })
          }
        } catch (error) {
          set({ isLoading: false })
          console.error('Failed to fetch cart:', error)
        }
      },

      mergeGuestCart: async () => {
        try {
          const { items } = get()
          
          if (items.length > 0) {
            await api.post('/cart/merge', { guestSessionId: get().getSessionId() })
            set({ items: [] })
            get().fetchCart()
          }
        } catch (error) {
          console.error('Failed to merge guest cart:', error)
        }
      },

      toggleCart: () => {
        set(state => ({ isOpen: !state.isOpen }))
      },

      openCart: () => {
        set({ isOpen: true })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      // Computed values
      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      get subtotal() {
        return get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      },

      get isEmpty() {
        return get().items.length === 0
      },

      // Helper methods
      getSessionId: () => {
        // Generate or retrieve session ID for guest cart
        let sessionId = localStorage.getItem('guest-session-id')
        if (!sessionId) {
          sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
          localStorage.setItem('guest-session-id', sessionId)
        }
        return sessionId
      },

      initializeCart: (isAuthenticated = false) => {
        // Initialize cart from localStorage if not authenticated
        if (!isAuthenticated) {
          get().fetchCart()
        }
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items
      })
    }
  )
)

export { useCartStore }
