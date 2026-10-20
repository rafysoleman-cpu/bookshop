import { useState, useEffect } from 'react'
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
  const [earlyWebSocketEvents, setEarlyWebSocketEvents] = useState([]) // Buffer for early events
  const [currentImageIndex, setCurrentImageIndex] = useState(0) // Track current image being uploaded
  const [totalImages, setTotalImages] = useState(0) // Track total images
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, productName: '' })
  const [deletingProductId, setDeletingProductId] = useState(null) // Track which product is being deleted
  const queryClient = useQueryClient()
  const { socket, connected } = useSocket()

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

  // Debug: Log actual response structure
  console.log('Products API Response:', productsData)
  console.log('Extracted Products:', products)
  console.log('Pagination:', pagination)

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // WebSocket integration for real-time upload progress
  useEffect(() => {
    console.log('🔌 Setting up WebSocket listener...', { 
      socket: !!socket, 
      socketType: typeof socket,
      socketMethods: socket ? Object.getOwnPropertyNames(Object.getPrototypeOf(socket)) : 'null',
      connected,
      isUploading, 
      uploadData 
    });
    
    if (!socket) {
      console.log('❌ No socket available');
      return;
    }

    // Wait for socket to be connected before setting up listeners
    if (!connected) {
      console.log('⏳ Socket not connected yet, waiting...');
      return;
    }

    // Double-check socket has the 'on' method
    if (typeof socket.on !== 'function') {
      console.log('❌ Socket does not have "on" method. Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(socket)));
      console.log('🔍 Socket object details:', {
        socket,
        constructor: socket.constructor,
        prototype: Object.getPrototypeOf(socket),
        isSocketIO: socket.constructor && socket.constructor.name === 'Socket'
      });
      return;
    }

    const handleUploadProgress = (data) => {
      console.log('📊 Upload progress via WebSocket:', data);
      
      try {
        // If we receive a 'started' event and no upload is active, start the progress bar
        if (data.status === 'started' && !isUploading && !uploadData) {
          console.log('🚀 Starting progress bar from WebSocket event:', data);
          const uploadInfo = {
            uploadId: data.uploadId,
            productName: data.productName || 'Unknown Product',
            imageCount: data.totalImages || 0,
            startTime: Date.now(),
            status: 'started'
          };
          
          setUploadData(uploadInfo);
          setIsUploading(true);
          setUploadProgress(data.progress || 0);
          setCurrentImageIndex(0); // Reset current image index
          setTotalImages(data.totalImages || 0); // Set total images
          
          // Store in sessionStorage for persistence
          sessionStorage.setItem('productUploadData', JSON.stringify(uploadInfo));
          sessionStorage.setItem('productUploadProgress', (data.progress || 0).toString());
          
          // Process any buffered events
          if (earlyWebSocketEvents.length > 0) {
            console.log('🔄 Processing buffered WebSocket events:', earlyWebSocketEvents.length);
            earlyWebSocketEvents.forEach(event => {
              console.log('🔄 Processing buffered event:', event);
              if (event.status === 'uploading') {
                setUploadProgress(event.progress || 0);
                setCurrentImageIndex(event.currentImage || 0);
                setTotalImages(event.totalImages || 0);
                sessionStorage.setItem('productUploadProgress', (event.progress || 0).toString());
              } else if (event.status === 'processing') {
                setUploadProgress(event.progress || 0);
                sessionStorage.setItem('productUploadProgress', (event.progress || 0).toString());
              } else if (event.status === 'completed') {
                setIsUploading(false);
                setUploadProgress(0);
                setUploadData(null);
                setCurrentImageIndex(0);
                setTotalImages(0);
                sessionStorage.removeItem('productUploadData');
                sessionStorage.removeItem('productUploadProgress');
                sessionStorage.removeItem('productUploadError');
                toast.success('Book created successfully!');
                invalidateCatalog(queryClient); queryClient.invalidateQueries('adminProducts');
                queryClient.refetchQueries('adminProducts');
              } else if (event.status === 'error') {
                setErrorData({
                  error: event.message || 'Upload failed',
                  timestamp: Date.now()
                });
                setShowError(true);
                setIsUploading(false);
                setUploadProgress(0);
                setUploadData(null);
                setCurrentImageIndex(0);
                setTotalImages(0);
                sessionStorage.removeItem('productUploadData');
                sessionStorage.removeItem('productUploadProgress');
              }
            });
            setEarlyWebSocketEvents([]);
          }
          return;
        }
        
        // Update progress if we have an active upload
        if (isUploading && uploadData) {
          console.log('🔄 Updating progress:', data.progress, '%');
          // Update progress with real data from backend
          setUploadProgress(data.progress || 0)
          
          // Update current image tracking if available
          if (data.currentImage && data.totalImages) {
            setCurrentImageIndex(data.currentImage);
            setTotalImages(data.totalImages);
          }
          
          // Store real progress in sessionStorage
          sessionStorage.setItem('productUploadProgress', data.progress.toString())
          
          // Handle completion
          if (data.status === 'completed') {
            console.log('✅ Upload completed via WebSocket')
            // Hide progress bar immediately
            setIsUploading(false)
            setUploadProgress(0)
            setUploadData(null)
            // Clear sessionStorage
            sessionStorage.removeItem('productUploadData')
            sessionStorage.removeItem('productUploadProgress')
            sessionStorage.removeItem('productUploadError')
            // Show success toast
            toast.success('Book created successfully!')
            // Refresh products list
            invalidateCatalog(queryClient); queryClient.invalidateQueries('adminProducts')
            queryClient.refetchQueries('adminProducts')
          }
          
          // Handle errors
          if (data.status === 'error') {
            console.error('❌ Upload error via WebSocket:', data.message)
            
            setErrorData({
              error: data.message || 'Upload failed',
              timestamp: Date.now()
            })
            setShowError(true)
            setIsUploading(false)
            setUploadProgress(0)
            setUploadData(null)
            // Clear sessionStorage
            sessionStorage.removeItem('productUploadData')
            sessionStorage.removeItem('productUploadProgress')
          }
        } else {
          console.log('⚠️ Received progress but no active upload:', { isUploading, uploadData });
          // Buffer early events for later processing
          setEarlyWebSocketEvents(prev => [...prev, data])
          console.log('📦 Buffered early WebSocket event:', data);
        }
      } catch (error) {
        console.error('❌ Error in handleUploadProgress:', error)
        
        // Prevent infinite loop with setUploadData error
        if (error.message === 'setUploadData is not defined') {
          console.log('🔄 Ignoring recursive setUploadData error from catch block');
          return
        }
        
        // Store error in sessionStorage for display
        sessionStorage.setItem('productUploadError', JSON.stringify({
          error: error.message || 'Progress tracking failed',
          isNetworkError: false,
          timestamp: Date.now()
        }))
      }
    }

    console.log('👂 Adding socket listener for upload:progress...');
    socket.on('upload:progress', handleUploadProgress)
    
    return () => {
      console.log('🧹 Cleaning up WebSocket listener...');
      if (socket && typeof socket.off === 'function') {
        socket.off('upload:progress', handleUploadProgress)
      }
    }
  }, [socket, connected, isUploading, uploadData])

  // Handle upload progress and errors from sessionStorage
  useEffect(() => {
    let interval = null
    
    // Don't clear sessionStorage on mount - check if there's active upload data
    const existingUploadData = sessionStorage.getItem('productUploadData')
    if (!existingUploadData) {
      // Only clear if there's no active upload
      sessionStorage.removeItem('productUploadProgress')
      sessionStorage.removeItem('productUploadError')
    }
    
    const checkUploadProgress = () => {
      try {
        const progress = sessionStorage.getItem('productUploadProgress')
        const data = sessionStorage.getItem('productUploadData')
        const error = sessionStorage.getItem('productUploadError')
        
        // Debug logging
        console.log('🔍 Upload Progress Check:', {
          progress,
          data: data ? JSON.parse(data) : null,
          error: error ? JSON.parse(error) : null,
          isUploading,
          uploadProgress,
          uploadData
        })
        
        if (data) {
          try {
            const uploadInfo = JSON.parse(data)
            console.log('📦 Found upload data, setting up progress bar:', uploadInfo);
            
            // Safely set upload data with error handling
            try {
              setUploadData(uploadInfo)
              setIsUploading(true)
              
              // Set initial progress from sessionStorage
              if (progress) {
                setUploadProgress(parseInt(progress))
              }
              
              // Process any buffered WebSocket events
              if (earlyWebSocketEvents.length > 0) {
                console.log('🔄 Processing buffered WebSocket events:', earlyWebSocketEvents.length);
                earlyWebSocketEvents.forEach(event => {
                  console.log('🔄 Processing buffered event:', event);
                  // Re-process the event with the now-ready upload state
                  if (event.stage === 'started') {
                    setUploadProgress(event.progress || 0)
                  } else if (event.stage === 'uploading') {
                    setUploadProgress(event.progress || 0)
                  } else if (event.stage === 'completed') {
                    setIsUploading(false)
                    setUploadProgress(0)
                    setUploadData(null)
                    sessionStorage.removeItem('productUploadData')
                    sessionStorage.removeItem('productUploadProgress')
                    sessionStorage.removeItem('productUploadError')
                    toast.success('Book created successfully!')
                    invalidateCatalog(queryClient); queryClient.invalidateQueries('adminProducts')
                    queryClient.refetchQueries('adminProducts')
                  } else if (event.stage === 'error') {
                    setErrorData({
                      error: event.error || 'Upload failed',
                      timestamp: Date.now()
                    })
                    setShowError(true)
                    setIsUploading(false)
                    setUploadProgress(0)
                    setUploadData(null)
                    sessionStorage.removeItem('productUploadData')
                    sessionStorage.removeItem('productUploadProgress')
                  }
                });
                // Clear the buffer
                setEarlyWebSocketEvents([])
              }
            } catch (setStateError) {
              console.error('❌ Error setting upload data:', setStateError)
              return
            }
            
            // Use real progress from API if available, otherwise estimate
            if (progress && parseInt(progress) > 0) {
              setUploadProgress(parseInt(progress))
            } else {
              // Start with 5% progress to show immediate feedback
              setUploadProgress(5)
              sessionStorage.setItem('productUploadProgress', '5')
            }
            
            // Add fallback timeout to clear progress bar if stuck
            setTimeout(() => {
              if (uploadProgress === 100 && isUploading) {
                console.log('⏰ Fallback: Clearing stuck progress bar at 100%');
                try {
                  setIsUploading(false)
                  setUploadProgress(0)
                  setUploadData(null)
                } catch (clearError) {
                  console.error('❌ Error clearing upload state:', clearError)
                }
                sessionStorage.removeItem('productUploadData')
                sessionStorage.removeItem('productUploadProgress')
                sessionStorage.removeItem('productUploadError')
                invalidateCatalog(queryClient); queryClient.invalidateQueries('adminProducts')
                queryClient.refetchQueries('adminProducts')
              }
            }, 8000) // 8 second fallback timeout
          } catch (parseError) {
            console.error('❌ Error parsing upload data:', parseError)
            // Clear corrupted data
            sessionStorage.removeItem('productUploadData')
            sessionStorage.removeItem('productUploadProgress')
            try {
              setIsUploading(false)
              setUploadData(null)
            } catch (clearError) {
              console.error('❌ Error clearing state after parse error:', clearError)
            }
          }
        }
        
        if (error) {
          try {
            const errorInfo = JSON.parse(error)
            console.log('❌ Found upload error:', errorInfo);
            
            // Prevent infinite loop with setUploadData error
            if (errorInfo.error === 'setUploadData is not defined') {
              console.log('🔄 Clearing recursive setUploadData error');
              sessionStorage.removeItem('productUploadError')
              return // Don't display this error to user
            }
            
            setErrorData(errorInfo)
            setShowError(true)
            setIsUploading(false)
            // Clear progress
            sessionStorage.removeItem('productUploadProgress')
          } catch (parseError) {
            console.error('❌ Error parsing error data:', parseError)
            sessionStorage.removeItem('productUploadError')
          }
        }
        
        // Stop polling if there's no upload data or error
        if (!data && !error && interval) {
          clearInterval(interval)
          interval = null
        }
      } catch (error) {
        console.error('❌ Error checking upload progress:', error)
      }
    }

    // Handle window focus to recheck upload progress
    const handleWindowFocus = () => {
      console.log('🔄 Window focused, checking upload progress...')
      checkUploadProgress()
    }

    // Check immediately on mount
    checkUploadProgress()
    
    // Also check after short delays to catch any delayed sessionStorage updates
    setTimeout(checkUploadProgress, 50)
    setTimeout(checkUploadProgress, 100)
    setTimeout(checkUploadProgress, 300)
    
    // Only start polling if there's actual upload data
    const hasUploadData = sessionStorage.getItem('productUploadData') || sessionStorage.getItem('productUploadError')
    if (hasUploadData) {
      interval = setInterval(checkUploadProgress, 500)
    }
    
    // Add window focus listener
    window.addEventListener('focus', handleWindowFocus)
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [])

  // Clear upload data when component unmounts or on successful load (but not during active uploads)
  useEffect(() => {
    if (!isLoading && products.length > 0) {
      // Only clear upload data if there's no active upload in progress
      const hasActiveUpload = sessionStorage.getItem('productUploadData') || 
                           sessionStorage.getItem('productUploadProgress') || 
                           sessionStorage.getItem('productUploadError');
      
      if (!hasActiveUpload) {
        console.log('🧹 Clearing any lingering upload data...');
        sessionStorage.removeItem('productUploadData')
        sessionStorage.removeItem('productUploadProgress')
        sessionStorage.removeItem('productUploadError')
        setIsUploading(false)
        setUploadProgress(0)
        setUploadData(null)
      }
    }
  }, [isLoading, products.length, isUploading]) // Add isUploading dependency

  const handleRetry = () => {
    const storedData = sessionStorage.getItem('productUploadData')
    if (storedData) {
      const uploadInfo = JSON.parse(storedData)
      // Clear previous error
      sessionStorage.removeItem('productUploadError')
      setShowError(false)
      // Navigate back to add product page with retry flag and preserved data
      navigate('/admin/products/add?retry=true&uploadId=' + uploadInfo.uploadId)
    }
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

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Enterprise Upload Progress Bar */}
      <div className="relative">
        <EnterpriseUploadProgressBar
          isUploading={SHOW_BAR_FOR_TESTING || isUploading}
          uploadProgress={SHOW_BAR_FOR_TESTING ? 50 : uploadProgress}
          uploadData={SHOW_BAR_FOR_TESTING ? { productName: 'Test Product', imageCount: 5 } : uploadData}
          currentImageIndex={SHOW_BAR_FOR_TESTING ? 2 : currentImageIndex}
          totalImages={SHOW_BAR_FOR_TESTING ? 5 : totalImages}
          onDismiss={() => {
            setIsUploading(false)
            setUploadProgress(0)
            setUploadData(null)
            sessionStorage.removeItem('productUploadData')
            sessionStorage.removeItem('productUploadProgress')
            sessionStorage.removeItem('productUploadError')
            invalidateCatalog(queryClient); queryClient.invalidateQueries('adminProducts')
            queryClient.refetchQueries('adminProducts')
          }}
        />
      </div>

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
