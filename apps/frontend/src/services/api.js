import axios from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 300000, // Extended to 5 minutes for large file uploads
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for CORS
})

// Export api for upload service
export { api }

// Debug logging
console.log('🔧 API Configuration:')
console.log('Base URL:', api.defaults.baseURL)
console.log('Environment:', import.meta.env.MODE)
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      origin: window.location.origin
    })

    // Add auth token if available
    const token = localStorage.getItem('auth-storage')
    if (token) {
      try {
        const authData = JSON.parse(token)
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth token:', error)
      }
    }

    // Add session ID for guest cart
    const sessionId = localStorage.getItem('guest-session-id')
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId
    }

    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    })
    return response
  },
  async (error) => {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      corsError: error.message.includes('CORS'),
      networkError: !error.response
    })
    const originalRequest = error.config

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh token
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          const authData = JSON.parse(authStorage)
          const refreshToken = authData.state?.refreshToken

          if (refreshToken) {
            const response = await axios.post(
              `${api.defaults.baseURL}/auth/refresh`,
              { refreshToken }
            )

            const { accessToken } = response.data.data

            // Update stored token
            authData.state.token = accessToken
            localStorage.setItem('auth-storage', JSON.stringify(authData))

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error)
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        isNetworkError: true
      })
    }

    return Promise.reject(error)
  }
)

// API service methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  // Admin authentication
  adminLogin: (credentials) => api.post('/auth/admin-login', credentials),
  adminVerifyOTP: (data) => api.post('/auth/admin-verify-otp', data),
  adminResendOTP: (data) => api.post('/auth/admin-resend-otp', data),
  getAdminEmails: () => api.get('/auth/admin-emails')
}

export const userAPI = {
  updateProfile: (userData) => api.put('/users/profile', userData),
  updateTheme: (theme) => api.put('/users/theme', { theme }),
  changePassword: (passwordData) => api.put('/users/password', passwordData),
  getAddresses: () => api.get('/users/addresses'),
  addAddress: (addressData) => api.post('/users/addresses', addressData),
  updateAddress: (addressId, addressData) => api.put(`/users/addresses/${addressId}`, addressData),
  deleteAddress: (addressId) => api.delete(`/users/addresses/${addressId}`),
  getWishlist: () => api.get('/users/wishlist'),
  addToWishlist: (productId) => api.post('/users/wishlist', { productId }),
  removeFromWishlist: (productId) => api.delete(`/users/wishlist/${productId}`),
  clearWishlist: () => api.delete('/users/wishlist')
}

export const productAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  getFeaturedProducts: (params) => api.get('/products/featured/list', { params }),
  getFlashSaleProducts: (params) => api.get('/products/flash-sale/list', { params }),
  searchProducts: (params) => api.get('/search/products', { params })
}

export const categoryAPI = {
  getCategories: () => api.get('/categories'),
  getCategory: (slug) => api.get(`/categories/${slug}`),
  getCategoryTree: () => api.get('/categories/tree/all')
}

export const cartAPI = {
  getCart: () => api.get('/cart'),
  addItem: (itemData) => api.post('/cart/add', itemData),
  updateItem: (itemData) => api.put('/cart/update', itemData),
  removeItem: (itemData) => api.delete('/cart/remove', { data: itemData }),
  clearCart: () => api.delete('/cart/clear'),
  mergeGuestCart: (guestSessionId) => api.post('/cart/merge', { guestSessionId })
}

export const orderAPI = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id, reason) => api.put(`/orders/${id}/cancel`, { reason })
}

export const paymentAPI = {
  initiatePayment: (paymentData) => api.post('/payments/initiate', paymentData),
  getPaymentStatus: (orderId) => api.get(`/payments/status/${orderId}`)
}

import uploadService from './uploadService.js'
import { buildProductFormData } from '@bookshop/shared/product'

// The multipart serialiser lives in @bookshop/shared so the admin forms, the
// client validation and the backend share one definition of every field.
export { buildProductFormData }

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  toggleUserStatus: (userId) => api.patch(`/admin/users/${userId}/toggle-status`),
  updateUserStatus: (userId, statusData) => api.put(`/admin/users/${userId}/status`, statusData),

  getProducts: (params) => api.get('/admin/products', { params }),
  getProduct: (id) => api.get(`/admin/products/${id}`),
  createProduct: (productData) => {
    return uploadService.uploadProduct(productData, '/admin/products')
  },
  updateProduct: (id, productData, files = []) => {
    const formData = buildProductFormData(productData, files)

    return api.put(`/admin/products/${id}`, formData, {
      // Let the browser set multipart/form-data so the boundary is included
      headers: { 'Content-Type': undefined },
      timeout: 300000
    })
  },
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  updateProductStatus: (productId, statusData) => api.put(`/admin/products/${productId}/status`, statusData),

  getOrders: (params) => api.get('/admin/orders', { params }),
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, statusData) => api.put(`/admin/orders/${id}/status`, statusData),

  getCategories: (params) => api.get('/admin/categories', { params }),
  createCategory: (categoryData) => {
    // Handle FormData separately for file uploads
    if (categoryData instanceof FormData) {
      return api.post('/admin/categories', categoryData, {
        headers: {
          'Content-Type': undefined, // Let browser set it automatically for FormData
        },
      })
    }
    // For regular JSON data
    return api.post('/admin/categories', categoryData)
  },
  updateCategory: (id, categoryData) => api.put(`/admin/categories/${id}`, categoryData),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  bulkDeleteCategories: (categoryIds) => api.delete('/admin/categories/bulk', { data: { categoryIds } }),

  // Coupon management
  createCoupon: (couponData) => api.post('/admin/coupons', couponData),
  getAnalytics: (params) => api.get('/admin/analytics', { params })
}

export const searchAPI = {
  searchProducts: (params) => api.get('/search/products', { params }),
  getSuggestions: (params) => api.get('/search/suggestions', { params }),
  getPopular: () => api.get('/search/popular'),
  advancedSearch: (searchData) => api.post('/search/advanced', searchData)
}

export const reviewAPI = {
  getProductReviews: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
  createReview: (reviewData) => api.post('/reviews', reviewData),
  updateReview: (reviewId, reviewData) => api.put(`/reviews/${reviewId}`, reviewData),
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`),
  markHelpful: (reviewId) => api.post(`/reviews/${reviewId}/helpful`),
  getUserReviews: (params) => api.get('/reviews/user', { params })
}

export const couponAPI = {
  getCoupons: () => api.get('/coupons'),
  validateCoupon: (couponData) => api.post('/coupons/validate', couponData),
  getCoupon: (code) => api.get(`/coupons/${code}`)
}

export const contactAPI = {
  sendMessage: (messageData) => api.post('/contact', messageData)
}

export const blogAPI = {
  getPosts: (params) => api.get('/blog', { params }),
  getPost: (slug) => api.get(`/blog/${slug}`),
  getCategories: () => api.get('/blog/categories/all'),
  getPopularPosts: (params) => api.get('/blog/popular/list', { params })
}

export default api
