import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Package, 
  Eye, 
  Edit, 
  Trash2,
  MoreHorizontal,
  AlertCircle,
  Plus,
  Upload,
  CheckCircle2
} from 'lucide-react'
import { useQuery, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import Pagination from '../../components/Pagination'
import EnterpriseUploadProgressBar from '../../components/EnterpriseUploadProgressBar'
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal'
import { useSocket } from '../../contexts/SocketContext'
import { invalidateCatalog } from '../../utils/queryKeys'
import toast from 'react-hot-toast'

// Shared storage contract with AdminProductAdd. The add page writes these
// before navigating here so the progress bar survives the route change.
const UPLOAD_STORAGE_KEYS = {
  data: 'productUploadData',
  progress: 'productUploadProgress',
  error: 'productUploadError'
}

// Ignore leftovers from a previous session instead of showing a ghost bar.
const MAX_UPLOAD_AGE_MS = 10 * 60 * 1000
// If no progress event arrives for this long, clear the bar and offer a retry.
// Generous on purpose: the server cannot emit anything until the browser has
// finished sending the request body, which can take a while for many images.
const UPLOAD_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000

const readStoredUpload = () => {
  try {
    const raw = sessionStorage.getItem(UPLOAD_STORAGE_KEYS.data)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && parsed.uploadId ? parsed : null
  } catch {
    return null
  }
}

const clearUploadStorage = () => {
  sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.data)
  sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.progress)
  sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.error)
}

const isFreshUpload = (upload) =>
  Boolean(upload) && Date.now() - (Number(upload.startTime) || 0) < MAX_UPLOAD_AGE_MS

const AdminProducts = () => {
  // TEST FLAG - Set to true to see progress bar for testing, set to false for normal operation
  const SHOW_BAR_FOR_TESTING = false
  // const SHOW_BAR_FOR_TESTING = true
  
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadData, setUploadData] = useState(null)
  const [showError, setShowError] = useState(false)
  const [errorData, setErrorData] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0) // Track current image being uploaded
  const [totalImages, setTotalImages] = useState(0) // Track total images
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, productName: '' })
  const [deletingProductId, setDeletingProductId] = useState(null) // Track which product is being deleted
  const queryClient = useQueryClient()
  const { socket, connected } = useSocket()

  // Id of the upload this page is currently showing. Kept in a ref so socket
  // callbacks never need to re-subscribe when the state changes.
  const currentUploadIdRef = useRef(null)
  const completedUploadIdsRef = useRef(new Set())

  const { data: productsData, isLoading, error } = useQuery(
    ['adminProducts', currentPage, searchQuery, statusFilter],
    () => adminAPI.getProducts({
      page: currentPage,
      search: searchQuery,
      status: statusFilter
    }),
    { 
      staleTime: 5 * 1000, // Reduced to 5 seconds for more responsive updates
      cacheTime: 10 * 60 * 1000, // 10 minutes cache time
      refetchOnWindowFocus: true,
      refetchOnMount: true
    }
  )

  const products = productsData?.data?.products || 
                   productsData?.products || 
                   productsData?.data?.data?.products ||
                   productsData?.data || []
  
  const pagination = productsData?.data?.pagination || 
                     productsData?.pagination || 
                     productsData?.data?.data?.pagination

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  /**
   * Single place that tears down the progress UI. Called by:
   *  - the WebSocket `completed` / `error` events
   *  - the background request promise in AdminProductAdd (custom event)
   *  - the inactivity watchdog below
   * Repeated calls for the same upload are ignored.
   */
  const finalizeUpload = useCallback(({ uploadId, success, message }) => {
    const effectiveId = uploadId || currentUploadIdRef.current

    if (effectiveId) {
      if (success && completedUploadIdsRef.current.has(effectiveId)) return
      if (!success && completedUploadIdsRef.current.has(effectiveId)) return
      if (success) completedUploadIdsRef.current.add(effectiveId)
    }

    clearUploadStorage()
    if (effectiveId && success) {
      // The retry snapshot is only needed if this upload fails.
      sessionStorage.removeItem(`retry_${effectiveId}`)
      sessionStorage.removeItem(`previews_${effectiveId}`)
    }
    currentUploadIdRef.current = null
    setIsUploading(false)
    setUploadProgress(0)
    setUploadData(null)
    setCurrentImageIndex(0)
    setTotalImages(0)

    if (success) {
      setErrorData(null)
      setShowError(false)
      toast.success('Book created successfully!')
      invalidateCatalog(queryClient)
      queryClient.invalidateQueries(['adminProducts'])
      queryClient.refetchQueries(['adminProducts'])
      return
    }

    const failure = {
      error: message || 'Product creation failed. Please try again.',
      uploadId: effectiveId,
      timestamp: Date.now()
    }
    setErrorData(failure)
    setShowError(true)
    sessionStorage.setItem(UPLOAD_STORAGE_KEYS.error, JSON.stringify(failure))
  }, [queryClient])

  /**
   * Socket handler. It reads everything from the event and uses refs /
   * functional updates, so the listener never has to be re-created when
   * progress changes (that churn was the render loop).
   */
  const handleUploadProgress = useCallback((event = {}) => {
    const status = event.status || event.stage
    const uploadId = event.uploadId || currentUploadIdRef.current

    // Only handle events for the upload this page started. Without this the
    // shared `user:user123` room would show another tab's upload here too.
    const isTrackedUpload =
      Boolean(uploadId) &&
      (currentUploadIdRef.current
        ? currentUploadIdRef.current === uploadId
        : readStoredUpload()?.uploadId === uploadId)

    if (!isTrackedUpload) return

    if (uploadId && completedUploadIdsRef.current.has(uploadId)) return

    if (status === 'completed') {
      finalizeUpload({ uploadId, success: true })
      return
    }

    if (status === 'error') {
      finalizeUpload({
        uploadId,
        success: false,
        message: event.message || event.error || 'Upload failed'
      })
      return
    }

    const numericProgress = Number(event.progress)
    const total = Number(event.totalImages ?? event.total ?? 0)
    const current = Number(event.currentImage ?? event.current ?? 0)

    if (status === 'started') {
      const info = {
        uploadId,
        productName: event.productName || 'Product',
        imageCount: total,
        totalImages: total,
        startTime: Date.now(),
        status: 'started'
      }

      currentUploadIdRef.current = uploadId || null
      setUploadData(info)
      setIsUploading(true)
      setUploadProgress(Number.isFinite(numericProgress) ? numericProgress : 0)
      setCurrentImageIndex(0)
      setTotalImages(total)
      sessionStorage.setItem(UPLOAD_STORAGE_KEYS.data, JSON.stringify(info))
      sessionStorage.setItem(
        UPLOAD_STORAGE_KEYS.progress,
        String(Number.isFinite(numericProgress) ? numericProgress : 0)
      )
      return
    }

    // 'uploading' / 'processing' (or any other in-flight stage)
    setUploadData((previous) => {
      const next = {
        ...(previous || {
          uploadId,
          productName: event.productName || 'Product',
          imageCount: total,
          startTime: Date.now()
        }),
        status,
        totalImages: total || previous?.totalImages || 0
      }
      sessionStorage.setItem(UPLOAD_STORAGE_KEYS.data, JSON.stringify(next))
      return next
    })

    setIsUploading(true)
    if (Number.isFinite(numericProgress)) {
      setUploadProgress(numericProgress)
      sessionStorage.setItem(UPLOAD_STORAGE_KEYS.progress, String(numericProgress))
    }
    if (current > 0) setCurrentImageIndex(current)
    if (total > 0) setTotalImages(total)
    if (uploadId && !currentUploadIdRef.current) currentUploadIdRef.current = uploadId
  }, [finalizeUpload])

  // Restore an in-flight (or just-finished) upload exactly once. No polling:
  // from here on the UI is driven by socket events and by the request promise
  // that AdminProductAdd keeps alive after navigating away.
  useEffect(() => {
    const stored = readStoredUpload()
    const storedProgress = Number(sessionStorage.getItem(UPLOAD_STORAGE_KEYS.progress))
    const rawError = sessionStorage.getItem(UPLOAD_STORAGE_KEYS.error)
    let activeUploadId = null

    if (stored && stored.status === 'completed') {
      const finishedRecently =
        Date.now() - (Number(stored.completedAt || stored.startTime) || 0) < 60 * 1000
      if (stored.uploadId) {
        completedUploadIdsRef.current.add(stored.uploadId)
        sessionStorage.removeItem(`retry_${stored.uploadId}`)
        sessionStorage.removeItem(`previews_${stored.uploadId}`)
      }
      clearUploadStorage()
      invalidateCatalog(queryClient)
      queryClient.invalidateQueries(['adminProducts'])
      queryClient.refetchQueries(['adminProducts'])
      if (finishedRecently) toast.success('Book created successfully!')
    } else if (stored && stored.status === 'error') {
      activeUploadId = stored.uploadId || null
      sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.progress)
      if (!rawError) {
        setErrorData({
          error: stored.message || 'Upload failed',
          uploadId: activeUploadId,
          timestamp: Date.now()
        })
        setShowError(true)
      }
    } else if (stored && isFreshUpload(stored)) {
      activeUploadId = stored.uploadId || null
      currentUploadIdRef.current = activeUploadId
      setUploadData(stored)
      setIsUploading(true)
      setUploadProgress(
        Number.isFinite(storedProgress) && storedProgress > 0 ? storedProgress : 5
      )
      setCurrentImageIndex(Number(stored.currentImage) || 0)
      setTotalImages(Number(stored.totalImages || stored.imageCount) || 0)
    } else {
      // Drop orphaned upload data/progress, but keep a recent error so the
      // retry overlay can still be restored below.
      if (stored) sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.data)
      sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.progress)
    }

    if (rawError) {
      try {
        const parsed = JSON.parse(rawError)
        const isRecent =
          Date.now() - (Number(parsed.timestamp) || 0) < MAX_UPLOAD_AGE_MS
        const isSameUpload =
          !activeUploadId || !parsed.uploadId || parsed.uploadId === activeUploadId

        if (isRecent && isSameUpload) {
          setErrorData(parsed)
          setShowError(true)
        } else {
          sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.error)
        }
      } catch {
        sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.error)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One socket listener for the lifetime of the page. It is only re-created
  // when the socket itself reconnects - never on progress updates.
  useEffect(() => {
    if (!socket || !connected || typeof socket.on !== 'function') return undefined

    socket.on('upload:progress', handleUploadProgress)

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('upload:progress', handleUploadProgress)
      }
    }
  }, [socket, connected, handleUploadProgress])

  // AdminProductAdd dispatches these from the background request promise, so
  // completion is still handled when the socket drops mid-upload.
  useEffect(() => {
    const handleCompleted = (event) => {
      finalizeUpload({ uploadId: event?.detail?.uploadId, success: true })
    }
    const handleFailed = (event) => {
      finalizeUpload({
        uploadId: event?.detail?.uploadId,
        success: false,
        message: event?.detail?.message
      })
    }

    window.addEventListener('productUpload:completed', handleCompleted)
    window.addEventListener('productUpload:failed', handleFailed)

    return () => {
      window.removeEventListener('productUpload:completed', handleCompleted)
      window.removeEventListener('productUpload:failed', handleFailed)
    }
  }, [finalizeUpload])

  // Watchdog fallback: if the upload goes silent for 10 minutes, clear the bar
  // instead of leaving the page in a permanent "uploading" state.
  useEffect(() => {
    if (!isUploading) return undefined

    const uploadId = uploadData?.uploadId || currentUploadIdRef.current
    const timeoutId = setTimeout(() => {
      const stored = readStoredUpload()
      if (stored && uploadId && stored.uploadId !== uploadId) return
      finalizeUpload({
        uploadId,
        success: false,
        message: 'The upload stopped responding. Check the book list or retry the upload.'
      })
    }, UPLOAD_INACTIVITY_TIMEOUT_MS)

    return () => clearTimeout(timeoutId)
  }, [isUploading, uploadProgress, uploadData?.uploadId, finalizeUpload])

  const handleRetry = () => {
    const uploadId =
      errorData?.uploadId || currentUploadIdRef.current || readStoredUpload()?.uploadId

    if (!uploadId) {
      toast.error('Upload details have expired. Please create the book again.')
      setShowError(false)
      sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.error)
      return
    }

    sessionStorage.removeItem(UPLOAD_STORAGE_KEYS.error)
    setShowError(false)
    // Retry form data is still stored under retry_<uploadId> in sessionStorage
    navigate(`/admin/products/add?retry=true&uploadId=${uploadId}`)
  }

  const handleDismissProgress = () => {
    const uploadId = uploadData?.uploadId || currentUploadIdRef.current
    if (uploadId) {
      completedUploadIdsRef.current.add(uploadId)
      sessionStorage.removeItem(`retry_${uploadId}`)
      sessionStorage.removeItem(`previews_${uploadId}`)
    }
    clearUploadStorage()
    currentUploadIdRef.current = null
    setIsUploading(false)
    setUploadProgress(0)
    setUploadData(null)
    setCurrentImageIndex(0)
    setTotalImages(0)
    invalidateCatalog(queryClient)
    queryClient.invalidateQueries(['adminProducts'])
    queryClient.refetchQueries(['adminProducts'])
  }

  const handleDeleteProduct = (productId, productName) => {
    setDeleteModal({ isOpen: true, productId, productName })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, productId: null, productName: '' })
  }

  const confirmDeleteProduct = async () => {
    const { productId } = deleteModal
    setDeletingProductId(productId)

    try {
      await adminAPI.deleteProduct(productId)
      toast.success('Book deleted successfully')
      closeDeleteModal()
      // Refresh the products list
      invalidateCatalog(queryClient); queryClient.invalidateQueries('adminProducts')
      queryClient.refetchQueries('adminProducts')
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error(error.response?.data?.error || 'Failed to delete book')
      closeDeleteModal()
    } finally {
      setDeletingProductId(null)
    }
  }

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'deleted', label: 'Deleted' }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/40'
      case 'draft': return 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/40'
      case 'archived': return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
      case 'deleted': return 'text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-950/40'
      default: return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
    }
  }

  // Rendered in both the loading state and the loaded page so the bar is
  // visible immediately after AdminProductAdd redirects here.
  const uploadProgressBar = (
    <div className="relative">
      <EnterpriseUploadProgressBar
        isUploading={SHOW_BAR_FOR_TESTING || isUploading}
        uploadProgress={SHOW_BAR_FOR_TESTING ? 50 : uploadProgress}
        uploadData={SHOW_BAR_FOR_TESTING ? { productName: 'Test Product', imageCount: 5 } : uploadData}
        currentImageIndex={SHOW_BAR_FOR_TESTING ? 2 : currentImageIndex}
        totalImages={SHOW_BAR_FOR_TESTING ? 5 : totalImages}
        onDismiss={handleDismissProgress}
      />
    </div>
  )

  if (isLoading) return (
    <div className="container mx-auto px-4 py-8 relative">
      {uploadProgressBar}
      <LoadingSpinner />
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Enterprise Upload Progress Bar */}
      {uploadProgressBar}

      {/* Error Retry Overlay */}
      {showError && errorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-gray-200/50 dark:border-slate-700/50">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Upload Failed</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {errorData.isNetworkError 
                    ? 'The upload failed due to network issues or timeout. Your data is saved and you can retry.'
                    : errorData.error || 'Product creation failed. Please try again.'
                  }
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Retry Upload</span>
                </button>
                <button
                  onClick={() => setShowError(false)}
                  className="flex-1 bg-gray-100 dark:bg-slate-800/70 text-gray-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Manage Books</h1>
            <p className="text-gray-600 dark:text-slate-400">{products.length} books</p>
          </div>
          
          <Link 
            to="/admin/products/add"
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Book</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books by title, author, or publisher..."
              className="search-input w-full"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
        </div>
      </div>

      {/* Products Table */}
      {products.length > 0 ? (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Book
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {products.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden">
                            {product.images?.[0]?.url ? (
                              <img
                                src={product.images[0].url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/40">
                                <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-slate-100 line-clamp-1">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                              {product.category?.name || 'Uncategorized'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-slate-100">
                          {product.author || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {product.format || ''}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        ${product.price.toFixed(2)}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        {product.inventory?.quantity || 0}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                          {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/products/${product.slug}`}
                            target="_blank"
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          <Link
                            to={`/admin/products/${product._id}/edit`}
                            className="text-success-600 dark:text-success-400 hover:text-success-900 dark:hover:text-success-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {product.status !== 'deleted' && (
                            <button
                              onClick={() => handleDeleteProduct(product._id, product.name)}
                              disabled={deletingProductId === product._id}
                              className={`text-error-600 dark:text-error-400 hover:text-error-900 dark:hover:text-error-300 ${deletingProductId === product._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mt-8">
              <Pagination 
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">No books found</h3>
          <p className="text-gray-600 dark:text-slate-400">Try adjusting your filters or search terms.</p>
        </div>
      )}

      {/* Flagged Books Alert */}
      {products.some(p => p.status === 'flagged') && (
        <div className="mt-8 bg-error-50 dark:bg-error-950/40 border border-error-200 dark:border-error-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-error-900 dark:text-error-300 mb-2">
                Flagged Books
              </h3>
              <p className="text-error-700 dark:text-error-300 mb-4">
                Some products have been flagged and require review.
              </p>
              <button className="btn-primary">
                Review Flagged Books
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteProduct}
        itemName={deleteModal.productName}
        isDeleting={deletingProductId === deleteModal.productId}
      />
    </div>
  )
}

export default AdminProducts
