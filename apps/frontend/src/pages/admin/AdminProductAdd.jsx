import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  ArrowLeft,
  Save,
  Upload,
  X,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { invalidateCatalog } from '../../utils/queryKeys'
import uploadService from '../../services/uploadService'
import uploadRecoveryService from '../../services/uploadRecoveryService'
import LoadingSpinner from '../../components/LoadingSpinner'
import UploadRetryPopup from '../../components/UploadRetryPopup'
import EnterpriseUploadProgressBar from '../../components/EnterpriseUploadProgressBar'
import toast from 'react-hot-toast'
import { useSocket } from '../../contexts/SocketContext'

// Keep this in sync with AdminProducts.jsx. The add page writes the record
// before navigating; the products page reads it once and then relies on socket
// events. The request promise below is the fallback when the socket is down.
const PRODUCT_UPLOAD_KEYS = {
  data: 'productUploadData',
  progress: 'productUploadProgress',
  error: 'productUploadError'
}

const readStoredProductUpload = () => {
  try {
    const raw = sessionStorage.getItem(PRODUCT_UPLOAD_KEYS.data)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Settle the upload record after the background request finishes. Runs even
 * though this component is already unmounted, which is what guarantees the
 * progress bar is cleaned up and the list refreshes when the socket fails.
 */
const finalizeBackgroundUpload = (uploadId, status, details = {}) => {
  const stored = readStoredProductUpload()

  // AdminProducts may already have handled this upload via WebSocket.
  if (!stored || (uploadId && stored.uploadId && stored.uploadId !== uploadId)) return

  if (status === 'completed') {
    sessionStorage.setItem(
      PRODUCT_UPLOAD_KEYS.data,
      JSON.stringify({ ...stored, status: 'completed', completedAt: Date.now() })
    )
    sessionStorage.setItem(PRODUCT_UPLOAD_KEYS.progress, '100')
    sessionStorage.removeItem(PRODUCT_UPLOAD_KEYS.error)
    // These snapshots can hold base64 previews; they are only needed on retry.
    sessionStorage.removeItem(`retry_${stored.uploadId}`)
    sessionStorage.removeItem(`previews_${stored.uploadId}`)
  } else {
    const message = details.message || 'Product creation failed'
    sessionStorage.setItem(
      PRODUCT_UPLOAD_KEYS.data,
      JSON.stringify({ ...stored, status: 'error', message })
    )
    sessionStorage.setItem(
      PRODUCT_UPLOAD_KEYS.error,
      JSON.stringify({ error: message, uploadId: stored.uploadId, timestamp: Date.now() })
    )
  }

  window.dispatchEvent(
    new CustomEvent(`productUpload:${status}`, {
      detail: { uploadId: stored.uploadId, ...details }
    })
  )
}

const AdminProductAdd = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { socket, connected } = useSocket()
  const [isDragging, setIsDragging] = useState(false)
  const [activeSection, setActiveSection] = useState('basic')
  
  // Enhanced upload state
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    uploadProgress: 0,
    uploadId: null,
    showRetryPopup: false,
    lastError: null,
    uploadData: null,
    isRetrying: false,
    progressData: null,
    uploadStartTime: null
  })
  
  // Add a ref to track submission state for immediate protection
  const isSubmittingRef = useRef(false)
  const isNavigatingAwayRef = useRef(false)
  const sectionRefs = {
    basic: useRef(null),
    pricing: useRef(null),
    inventory: useRef(null),
    organization: useRef(null),
    shipping: useRef(null),
    images: useRef(null),
    seo: useRef(null)
  }
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    barcode: '',
    description: '',
    price: '',
    costPrice: '',
    quantity: '',
    trackQuantity: true,
    allowBackorder: false,
    status: 'active',
    author: '',
    isbn: '',
    publisher: '',
    pages: '',
    format: 'paperback',
    language: 'English',
    edition: '',
    publishedDate: '',
    categoryId: '',
    tags: '',
    seoTitle: '',
    seoDescription: '',
    images: [],
    dimensions: {
      length: '',
      width: '',
      height: ''
    }
  })
  const [previewImages, setPreviewImages] = useState([])
  const [imageSizes, setImageSizes] = useState([]) // Track individual image sizes
  const [totalImageSize, setTotalImageSize] = useState(0) // Track total size in MB
  const [errors, setErrors] = useState({})
  const [tagInput, setTagInput] = useState('')

  const { data: categoriesData, error: categoriesError, isLoading: categoriesLoading } = useQuery(
    'adminCategoriesForProduct',
    () => adminAPI.getCategories({ page: 1, limit: 100 }),
    { 
      staleTime: 5 * 1000, // Reduced to 5 seconds for more responsive updates
      onError: (error) => {
        console.error('❌ Categories API Error:', error)
        toast.error('Failed to load categories')
      }
    }
  )

  const categories = Array.isArray(categoriesData?.data?.data) ? categoriesData.data.data : 
                  Array.isArray(categoriesData?.data?.categories) ? categoriesData.data.categories :
                  Array.isArray(categoriesData?.data?.data?.categories) ? categoriesData.data.data.categories :
                  Array.isArray(categoriesData?.categories) ? categoriesData.categories :
                  Array.isArray(categoriesData?.success?.data?.categories) ? categoriesData.success.data.categories :
                  Array.isArray(categoriesData?.success?.categories) ? categoriesData.success.categories :
                  []

// Refresh categories when window gets focus (user navigates back to this page)
// Also refresh periodically to get live updates from other pages
useEffect(() => {
  const handleFocus = () => {
    queryClient.invalidateQueries('adminCategoriesForProduct')
    queryClient.refetchQueries('adminCategoriesForProduct')
  }

  // Also refresh categories every 10 seconds to get live updates
  const intervalId = setInterval(() => {
    queryClient.invalidateQueries('adminCategoriesForProduct')
    queryClient.refetchQueries('adminCategoriesForProduct')
  }, 10000) // 10 seconds

  window.addEventListener('focus', handleFocus)
  return () => {
    window.removeEventListener('focus', handleFocus)
    clearInterval(intervalId)
  }
}, [queryClient])

  const handleCloseRetryPopup = () => {
    setUploadState(prev => ({
      ...prev,
      showRetryPopup: false,
      lastError: null
    }))
  }

  // Enhanced upload handlers
  const handleUploadError = (error) => {
    console.error('❌ Upload error:', error)
    
    // Don't show retry popup if we're navigating away (success occurred)
    if (isNavigatingAwayRef.current) {
      console.log('🚫 Skipping retry popup - navigating away after success')
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 0
      }))
      return
    }
    
    // Only show retry popup if we're not already in a success state
    setUploadState(prev => {
      // Don't show retry popup if we're already in a success state
      if (prev.showRetryPopup === false && !prev.lastError) {
        return {
          ...prev,
          isUploading: false,
          uploadProgress: 0
        }
      }
      return {
        ...prev,
        showRetryPopup: true,
        lastError: error,
        isUploading: false
      }
    })
  }

  const handleRetryUpload = async () => {
    if (!uploadState.uploadData) return
    
    // Reset navigating away flag when retrying
    isNavigatingAwayRef.current = false
    
    setUploadState(prev => ({
      ...prev,
      isRetrying: true,
      isUploading: true, // FIX: Set isUploading to true so socket listener works
      showRetryPopup: false
    }))
    
    try {
      await createProductMutation.mutateAsync(uploadState.uploadData)
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('❌ Retry upload failed:', error)
    } finally {
      setUploadState(prev => ({
        ...prev,
        isRetrying: false
      }))
    }
  }

  // Listen for upload progress events via WebSocket
  useEffect(() => {
    if (!socket || !connected || !uploadState.isUploading) {
      return
    }

    console.log('👂 Adding socket listener for upload:progress...')
    
    const handleUploadProgress = (data) => {
      console.log('📈 Upload progress via WebSocket:', data)
      
      // Accept progress if we're currently uploading (uploadId may differ between frontend/backend)
      if (uploadState.isUploading) {
        setUploadState(prev => ({
          ...prev,
          uploadProgress: data.progress || 0,
          // Update uploadId to match backend if provided
          uploadId: data.uploadId || prev.uploadId,
          // Store additional progress data for display
          progressData: {
            status: data.status,
            message: data.message,
            currentImage: data.currentImage,
            totalImages: data.totalImages,
            productName: data.productName
          }
        }))
      }
    }

    socket.on('upload:progress', handleUploadProgress)
    
    return () => {
      console.log('🧹 Cleaning up WebSocket listener...')
      if (socket && typeof socket.off === 'function') {
        socket.off('upload:progress', handleUploadProgress)
      }
    }
  }, [socket, connected, uploadState.isUploading])

  const createProductMutation = useMutation(
    adminAPI.createProduct,
    {
      onSuccess: (data) => {
        console.log('✅ Admin product created successfully:', data)
        // Mark that we're navigating away to prevent retry popup
        isNavigatingAwayRef.current = true
        // Clear any error state and retry popup on success
        setUploadState(prev => ({
          ...prev,
          showRetryPopup: false,
          lastError: null,
          isUploading: false,
          uploadProgress: 0,
          uploadStartTime: null
        }))
            // Don't navigate here since we already navigated in handleSubmit
            // The AdminProducts page will handle the success via WebSocket
            // Invalidate here too so a new product still shows up in the
            // storefront when the socket is unavailable or slow.
            invalidateCatalog(queryClient)
      },
      onError: (error) => {
        console.error('❌ Admin product creation failed:', error)
        
        // Don't show retry popup if we're navigating away (another upload succeeded)
        if (isNavigatingAwayRef.current) {
          console.log('🚫 Skipping retry popup in onError - navigating away after success')
          setUploadState(prev => ({
            ...prev,
            isUploading: false,
            uploadProgress: 0,
            uploadStartTime: null
          }))
          return
        }
        
        // Only show retry popup if we're not already successful
        // This prevents the popup from showing if another upload succeeded
        setUploadState(prev => {
          // Don't show retry popup if we're already in a success state
          if (prev.showRetryPopup === false && !prev.lastError) {
            return {
              ...prev,
              isUploading: false,
              uploadProgress: 0,
              uploadStartTime: null
            }
          }
          return {
            ...prev,
            showRetryPopup: true,
            lastError: error,
            isUploading: false
          }
        })
      },
      onSettled: () => {
        setUploadState(prev => ({
          ...prev,
          isUploading: false,
          uploadProgress: 0,
          uploadStartTime: null
        }))
      }
    }
  )

  const handleRetry = () => {
    const storedData = sessionStorage.getItem('productUploadData')
    if (storedData) {
      const uploadData = JSON.parse(storedData)
      // Clear previous error
      sessionStorage.removeItem('productUploadError')
      // Navigate back to add product page with retry flag
      navigate('/admin/products/add?retry=true')
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const fieldValue = type === 'checkbox' ? checked : value
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }))

    // Auto-generate slug from name
    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData(prev => ({
        ...prev,
        slug
      }))
      
      // Auto-generate SKU from name if empty
      if (!formData.sku || formData.sku.trim() === '') {
        const sku = value
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .substring(0, 20)
        setFormData(prev => ({
          ...prev,
          sku
        }))
      }
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleDimensionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [field]: value
      }
    }))
  }

  const scrollToSection = (sectionName) => {
    setActiveSection(sectionName)
    const element = sectionRefs[sectionName]?.current
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`)
        return false
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image.`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    if (formData.images.length + validFiles.length > 10) {
      toast.error('Maximum 10 images allowed.')
      return
    }

    // Calculate sizes for new files
    const newImageSizes = validFiles.map(file => ({
      size: file.size,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2),
      name: file.name
    }))

    // Check if any file exceeds 20MB
    const oversizedFiles = newImageSizes.filter(img => img.size > 20 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.map(f => f.name).join(', ')} exceed 20MB limit.`)
      return
    }

    const newImages = [...formData.images, ...validFiles]
    setFormData(prev => ({ ...prev, images: newImages }))

    const newPreviews = validFiles.map(file => URL.createObjectURL(file))
    setPreviewImages(prev => [...prev, ...newPreviews])

    // Update image sizes and total
    setImageSizes(prev => [...prev, ...newImageSizes])
    setTotalImageSize(prev => {
      const newTotal = prev + newImageSizes.reduce((sum, img) => sum + parseFloat(img.sizeMB), 0)
      return parseFloat(newTotal.toFixed(2))
    })

    validFiles.forEach(file => URL.revokeObjectURL(file))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      const fileChangeEvent = { target: { files: imageFiles } }
      handleImageChange(fileChangeEvent)
    }
  }

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
    setPreviewImages(prev => {
      const newPreviews = prev.filter((_, i) => i !== index)
      // Revoke the removed URL to free memory
      if (prev[index]) {
        URL.revokeObjectURL(prev[index])
      }
      return newPreviews
    })
    
    // Update image sizes and total
    setImageSizes(prev => {
      const newSizes = prev.filter((_, i) => i !== index)
      const removedSize = prev[index]?.sizeMB || 0
      setTotalImageSize(currentTotal => {
        const newTotal = currentTotal - parseFloat(removedSize)
        return parseFloat(Math.max(0, newTotal).toFixed(2))
      })
      return newSizes
    })
  }

  const handleTagAdd = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Handle retry functionality
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const isRetry = urlParams.get('retry') === 'true'
    const uploadId = urlParams.get('uploadId')
    
    if (isRetry && uploadId) {
      // Check if we have stored form data for this upload
      const storedFormData = sessionStorage.getItem(`retry_${uploadId}`)
      if (storedFormData) {
        try {
          const formData = JSON.parse(storedFormData)
          setFormData(formData)
          // Restore preview images if available
          const storedPreviews = sessionStorage.getItem(`previews_${uploadId}`)
          if (storedPreviews) {
            setPreviewImages(JSON.parse(storedPreviews))
          }
          toast.info('Form data restored. You can retry the upload.', {
            duration: 3000
          })
        } catch (error) {
          console.error('Error restoring form data:', error)
        }
      }
    }
  }, [])

  // Enhanced form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Prevent double submission using ref for immediate protection
    if (isSubmittingRef.current || uploadState.isUploading) {
      console.log('⚠️ Form submission already in progress, ignoring duplicate click')
      return
    }
    
    // Reset navigation flag for new submission
    isNavigatingAwayRef.current = false
    
    // Set submission ref
    isSubmittingRef.current = true
    
    try {
      const uploadId = uploadService.generateUploadId()
      const formDataToSubmit = prepareFormData(uploadId)
      const imageCount = formDataToSubmit.getAll('images')?.length || 0

      // Store upload data in sessionStorage for AdminProducts page. This is
      // what makes the progress bar survive the route change below.
      const uploadInfo = {
        uploadId,
        productName: formDataToSubmit.get('name') || 'Product',
        imageCount,
        totalImages: imageCount,
        startTime: Date.now(),
        status: 'started'
      }
      sessionStorage.setItem(PRODUCT_UPLOAD_KEYS.data, JSON.stringify(uploadInfo))
      sessionStorage.setItem(PRODUCT_UPLOAD_KEYS.progress, '5')
      sessionStorage.removeItem(PRODUCT_UPLOAD_KEYS.error)
      
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        uploadId,
        uploadProgress: 0,
        showRetryPopup: false,
        lastError: null,
        uploadData: formDataToSubmit,
        uploadStartTime: Date.now()
      }))
      
      // Save form data for recovery before upload
      uploadRecoveryService.saveUploadData(formDataToSubmit, uploadId)
      
      // Navigate immediately - the upload continues in the background and
      // AdminProducts renders the realtime progress bar.
      navigate('/admin/products')
      
      // Attach the settlement handlers to the promise itself: they still run
      // after this component unmounts, unlike mutation observer callbacks.
      createProductMutation
        .mutateAsync(formDataToSubmit)
        .then((response) => {
          finalizeBackgroundUpload(uploadId, 'completed', {
            productId: response?.data?.data?.product?._id
          })
        })
        .catch((error) => {
          const apiError = error?.originalError || error
          const responseData = apiError?.response?.data
          finalizeBackgroundUpload(uploadId, 'failed', {
            message:
              responseData?.error ||
              responseData?.message ||
              apiError?.message ||
              'Product creation failed'
          })
        })
        .finally(() => {
          isSubmittingRef.current = false
        })
      return
    } catch (error) {
      console.error('❌ Upload submission failed:', error)
      isSubmittingRef.current = false
    }
  }

  // Prepare form data for submission
  const prepareFormData = (uploadId) => {
    // Store form data for potential retry
    sessionStorage.setItem(`retry_${uploadId}`, JSON.stringify(formData))
    if (previewImages.length > 0) {
      sessionStorage.setItem(`previews_${uploadId}`, JSON.stringify(previewImages))
    }
    
    // Only generate SKU if provided
    let finalSku = formData.sku
    if (!finalSku || finalSku.trim() === '') {
      // Generate unique SKU with timestamp
      const baseSku = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 15) || 'PRODUCT';
      finalSku = `${baseSku}-${Date.now().toString().slice(-6)}`;
    } else {
      // If SKU provided, add timestamp to ensure uniqueness
      finalSku = `${finalSku}-${Date.now().toString().slice(-6)}`;
    }
    
    // Generate unique slug
    let finalSlug = formData.slug || formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
    
    // Add timestamp to make slug unique
    finalSlug = finalSlug ? `${finalSlug}-${Date.now()}` : `product-${Date.now()}`;
    
    const formDataToSubmit = new FormData()
    
    // Add uploadId for WebSocket room targeting
    formDataToSubmit.append('uploadId', uploadId)
    
    // Add all basic fields 
    Object.keys(formData).forEach(key => {
      const value = formData[key]
      // Empty optional fields must not be sent: Joi rejects '' for numbers
      // (pages, compareAtPrice, costPrice) and Mongoose cannot cast '' to a
      // Number. Required fields are still sent so the API reports them.
      const isEmpty = value === '' || value === null || value === undefined
      const isRequiredField = ['name', 'author', 'price', 'categoryId'].includes(key)

      if (key === 'dimensions') {
        // Convert dimensions to numbers for backend validation
        const dimensionsObj = {
          length: parseFloat(formData.dimensions.length) || 0,
          width: parseFloat(formData.dimensions.width) || 0,
          height: parseFloat(formData.dimensions.height) || 0
        }
        formDataToSubmit.append('dimensions', JSON.stringify(dimensionsObj))
      } else if (key === 'tags') {
        formDataToSubmit.append('tags', JSON.stringify(formData.tags))
      } else if (key === 'categoryId') {
        formDataToSubmit.append('category', formData[key])
      } else if (key === 'sku') {
        if (finalSku) {
          formDataToSubmit.append('sku', String(finalSku))
        }
      } else if (key === 'weight') {
        // Convert weight to object format expected by backend
        formDataToSubmit.append('weight', JSON.stringify({
          value: parseFloat(formData[key]) || 0,
          unit: 'kg'
        }))
      } else if (key === 'comparePrice') {
        // Map frontend field to backend field name
        if (!isEmpty) {
          formDataToSubmit.append('compareAtPrice', String(formData[key]))
        }
      } else if (key === 'costPrice') {
        if (!isEmpty) {
          formDataToSubmit.append('costPrice', String(formData[key]))
        }
      } else if (key === 'price') {
        formDataToSubmit.append('price', String(formData[key]))
      } else if (key !== 'images' && key !== 'quantity' && key !== 'trackQuantity' && key !== 'allowBackorder' && key !== 'seoTitle' && key !== 'seoDescription') {
        // The slug is generated above, so it must always be sent.
        if (key === 'slug') {
          formDataToSubmit.append(key, finalSlug)
          return
        }

        if (isEmpty && !isRequiredField) return

        formDataToSubmit.append(key, formData[key])
      }
    })

    // Add inventory object as required by backend
    formDataToSubmit.append('inventory', JSON.stringify({
      quantity: parseInt(formData.quantity) || 0,
      trackQuantity: formData.trackQuantity,
      allowBackorder: formData.allowBackorder
    }))

    // Add SEO object if fields are provided
    if (formData.seoTitle || formData.seoDescription) {
      formDataToSubmit.append('seo', JSON.stringify({
        title: formData.seoTitle || '',
        description: formData.seoDescription || ''
      }))
    }

    // Add images
    formData.images.forEach((image, index) => {
      formDataToSubmit.append(`images`, image)
    })

    return formDataToSubmit
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/40 relative">
      {/* Enterprise Upload Progress Bar */}
      <EnterpriseUploadProgressBar
        isUploading={uploadState.isUploading}
        uploadProgress={uploadState.uploadProgress}
        uploadData={uploadState.uploadData ? {
          productName: uploadState.uploadData.get('name') || 'Product',
          imageCount: uploadState.uploadData.getAll('images')?.length || 0,
          startTime: uploadState.uploadStartTime || Date.now()
        } : null}
        currentImageIndex={uploadState.progressData?.currentImage || 0}
        totalImages={uploadState.progressData?.totalImages || 0}
        onDismiss={() => {
          setUploadState(prev => ({
            ...prev,
            isUploading: false,
            uploadProgress: 0,
            uploadData: null,
            uploadStartTime: null
          }))
        }}
      />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <button
              onClick={() => navigate('/admin/products')}
              className="group flex items-center text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-all duration-200"
            >
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 dark:bg-slate-800/70 group-hover:bg-gray-200 dark:group-hover:bg-slate-700 transition-colors duration-200 mr-2 sm:mr-3">
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="font-medium text-sm sm:text-base">Back</span>
            </button>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden xs:flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 dark:border-blue-800/50">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse mr-1 sm:mr-2"></div>
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">Auto-save</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="sticky top-14 sm:top-16 z-30 bg-white/60 backdrop-blur-md border-b border-gray-200/30 dark:border-slate-700/30">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-8">
          <div className="flex items-center justify-between py-2 sm:py-3 overflow-x-auto scrollbar-hide">
            {['basic', 'pricing', 'inventory', 'organization', 'shipping', 'images', 'seo'].map((section, index) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className={`flex items-center px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-grow ${
                  activeSection === section
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <span className="capitalize">{section}</span>
                {index < 6 && (
                  <div className="w-3 sm:w-4 h-0.5 bg-gray-300 dark:bg-slate-600 mx-1 hidden sm:block"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
      <form id="product-form" onSubmit={handleSubmit} className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-8 py-3 sm:py-4 lg:py-6 xl:py-8">
        <div className="space-y-3 sm:space-y-4 lg:space-y-6 xl:space-y-8">
          {/* Basic Information */}
          <div 
            ref={sectionRefs.basic}
            className={`bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-3 sm:p-4 lg:p-6 xl:p-8 2xl:p-10 transition-all duration-300 scroll-mt-20 sm:scroll-mt-24 lg:scroll-mt-32 ${
              activeSection === 'basic' ? 'ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10' : ''
            }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 lg:mb-8 space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-md sm:rounded-lg lg:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-slate-100">Basic Info</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5 hidden sm:block">Product details</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 dark:border-amber-800/50">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full animate-pulse mr-1 sm:mr-2"></div>
                <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">Required</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Product Name *
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Max 100 chars</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`block w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-md sm:rounded-lg lg:rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 text-xs sm:text-sm ${
                      errors.name ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/50' : ''
                    }`}
                    placeholder="Enter book title"
                    required
                  />
                  <div className="absolute inset-0 rounded-md sm:rounded-lg lg:rounded-xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  URL Slug *
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Auto-generated</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    className={`block w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-md sm:rounded-lg lg:rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 text-xs sm:text-sm ${
                      errors.slug ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/50' : ''
                    }`}
                    placeholder="book-url-slug"
                    required
                  />
                  <div className="absolute inset-0 rounded-md sm:rounded-lg lg:rounded-xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
                {errors.slug && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.slug}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                Description
                <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Optional - Rich text supported</span>
              </label>
              <div className="relative group">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2 sm:rows-3 lg:rows-4"
                  className="block w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-md sm:rounded-lg lg:rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 resize-none text-xs sm:text-sm"
                  placeholder="Describe the book (optional)..."
                />
                <div className="absolute inset-0 rounded-md sm:rounded-lg lg:rounded-xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div 
            ref={sectionRefs.pricing}
            className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 sm:p-8 lg:p-10 transition-all duration-300 scroll-mt-32 ${
              activeSection === 'pricing' ? 'ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10' : ''
            }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                  <div className="w-5 h-5 flex items-center justify-center text-white font-bold text-sm">$</div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Pricing Strategy</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Set competitive prices</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Price *
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Base price</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 font-medium">$</div>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={`block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 ${
                      errors.price ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/50' : ''
                    }`}
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
                {errors.price && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.price}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Compare at Price
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Strikethrough</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 font-medium">$</div>
                  <input
                    type="number"
                    name="comparePrice"
                    value={formData.comparePrice}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Cost Price
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Internal</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 font-medium">$</div>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* Profit Calculator */}
            {formData.price && formData.costPrice && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 dark:border-green-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Estimated Profit</span>
                  <span className="text-lg font-bold text-green-800 dark:text-green-300">
                    ${(parseFloat(formData.price) - parseFloat(formData.costPrice || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                  Margin: {((parseFloat(formData.price) - parseFloat(formData.costPrice || 0)) / parseFloat(formData.price) * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>

          {/* Inventory */}
          <div 
            ref={sectionRefs.inventory}
            className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 sm:p-8 lg:p-10 transition-all duration-300 scroll-mt-32 ${
              activeSection === 'inventory' ? 'ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10' : ''
            }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Inventory Management</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Track stock and availability</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  SKU
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Stock Keeping Unit</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                    placeholder="SKU-12345"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Barcode
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Optional</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                    placeholder="1234567890"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200/50 dark:border-orange-800/50">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="trackQuantity"
                    checked={formData.trackQuantity}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-orange-600 dark:text-orange-400 border-gray-300 dark:border-slate-600 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-700 dark:text-slate-300">Track Quantity</span>
                </label>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${formData.trackQuantity ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                  <span className="text-xs text-gray-500 dark:text-slate-400">{formData.trackQuantity ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>

              {formData.trackQuantity && (
                <div className="space-y-2 animate-fade-in">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                    Quantity *
                    <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Current stock level</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min="0"
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                      placeholder="0"
                      required={formData.trackQuantity}
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              <label className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 dark:border-blue-800/50 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-all duration-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="allowBackorder"
                    checked={formData.allowBackorder}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-700 dark:text-slate-300">Allow Backorder</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${formData.allowBackorder ? 'bg-blue-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                  <span className="text-xs text-gray-500 dark:text-slate-400">{formData.allowBackorder ? 'Enabled' : 'Disabled'}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Book Details */}
          <div 
            ref={sectionRefs.organization}
            className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 sm:p-8 lg:p-10 transition-all duration-300 scroll-mt-32 ${
              activeSection === 'organization' ? 'ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10' : ''
            }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Book Details</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Categorize and describe the book</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Genre *
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Required</span>
                </label>
                <div className="relative group">
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className={`block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 appearance-none cursor-pointer ${
                      errors.categoryId ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/50' : ''
                    }`}
                    required
                  >
                    <option value="">Select a genre</option>
                    {categories.length === 0 ? (
                      <option value="" disabled>Loading genres...</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
                {errors.categoryId && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.categoryId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Author *
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Required</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                    placeholder="Author name"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">ISBN</label>
                <input
                  type="text"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  placeholder="978-3-16-148410-0"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Publisher</label>
                <input
                  type="text"
                  name="publisher"
                  value={formData.publisher}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Publisher name"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Pages</label>
                <input
                  type="number"
                  name="pages"
                  value={formData.pages}
                  onChange={handleInputChange}
                  min="1"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Format</label>
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                >
                  <option value="paperback">Paperback</option>
                  <option value="hardcover">Hardcover</option>
                  <option value="ebook">Ebook</option>
                  <option value="audiobook">Audiobook</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Language</label>
                <input
                  type="text"
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  placeholder="English"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Edition</label>
                <input
                  type="text"
                  name="edition"
                  value={formData.edition}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  placeholder="e.g. 2nd"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Published Date</label>
                <input
                  type="date"
                  name="publishedDate"
                  value={formData.publishedDate}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                />
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                Status *
                <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Book visibility</span>
              </label>
              <div className="relative group">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 appearance-none cursor-pointer"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Tags
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">Book keywords</span>
                </label>
                <div className="px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                  {formData.tags.length} tags
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="relative group flex-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                    placeholder="Add a tag..."
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
                <button
                  type="button"
                  onClick={handleTagAdd}
                  className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-800 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 group"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="ml-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors duration-200 transform hover:scale-110"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div 
            ref={sectionRefs.shipping}
            className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 sm:p-8 lg:p-10 transition-all duration-300 scroll-mt-32 ${
              activeSection === 'shipping' ? 'ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10' : ''
            }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Delivery Details</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Physical product specifications</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Weight (kg)
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">For shipping calculations</span>
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  Dimensions (cm)
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">L × W × H</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="relative group">
                    <input
                      type="number"
                      value={formData.dimensions.length}
                      onChange={(e) => handleDimensionChange('length', e.target.value)}
                      step="0.1"
                      min="0"
                      className="block w-full px-3 py-2 rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 text-sm"
                      placeholder="L"
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                  </div>
                  <div className="relative group">
                    <input
                      type="number"
                      value={formData.dimensions.width}
                      onChange={(e) => handleDimensionChange('width', e.target.value)}
                      step="0.1"
                      min="0"
                      className="block w-full px-3 py-2 rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 text-sm"
                      placeholder="W"
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                  </div>
                  <div className="relative group">
                    <input
                      type="number"
                      value={formData.dimensions.height}
                      onChange={(e) => handleDimensionChange('height', e.target.value)}
                      step="0.1"
                      min="0"
                      className="block w-full px-3 py-2 rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 text-sm"
                      placeholder="H"
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Volume Calculator */}
            {(formData.dimensions.length && formData.dimensions.width && formData.dimensions.height) && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200/50 dark:border-teal-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Calculated Volume</span>
                  <span className="text-lg font-bold text-teal-800 dark:text-teal-300">
                    {(parseFloat(formData.dimensions.length) * parseFloat(formData.dimensions.width) * parseFloat(formData.dimensions.height)).toFixed(2)} cm³
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          <div 
            ref={sectionRefs.images}
            className={`bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-3 sm:p-4 lg:p-6 xl:p-8 transition-all duration-300 scroll-mt-20 sm:scroll-mt-24 lg:scroll-mt-32 ${
              activeSection === 'images' ? 'ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10' : ''
            }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 lg:mb-8 space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-md sm:rounded-lg lg:rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-slate-100">Gallery</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5 hidden sm:block">Product images</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/50 dark:border-purple-800/50">
                <Upload className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">{previewImages.length} / 10</span>
              </div>
            </div>
            
            {/* Drag & Drop Upload Area */}
            <div
              className={`relative border-2 ${isDragging ? 'border-purple-400 bg-purple-50/50 dark:bg-purple-950/50' : 'border-dashed border-gray-300 dark:border-slate-600'} rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 xl:p-12 text-center transition-all duration-300 ${
                isDragging ? 'scale-102 shadow-lg shadow-purple-500/20' : 'hover:border-gray-400 dark:hover:border-slate-500 bg-gray-50/30 dark:bg-slate-900/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="product-images"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <label
                htmlFor="product-images"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 lg:mb-6 transition-all duration-300 ${
                  isDragging ? 'bg-gradient-to-br from-purple-500 to-pink-600 scale-110' : 'bg-gradient-to-br from-purple-100 to-pink-100'
                }`}>
                  <Upload className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 transition-all duration-300 ${
                    isDragging ? 'text-white' : 'text-purple-600 dark:text-purple-400'
                  }`} />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <span className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {isDragging ? 'Drop images' : 'Upload images'}
                  </span>
                  <div className="flex flex-col sm:flex-row items-center text-xs sm:text-sm text-gray-500 dark:text-slate-400 space-y-1 sm:space-y-0 sm:space-x-2">
                    <span>PNG, JPG, GIF up to 20MB</span>
                    <span className="hidden sm:inline text-gray-300 dark:text-slate-600">•</span>
                    <span>Max 10 images</span>
                  </div>
                </div>
              </label>
            </div>
            {errors.images && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/50 dark:border-red-800/50">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errors.images}
                </p>
              </div>
            )}

            {/* Image Preview Grid */}
            {previewImages.length > 0 && (
              <div className="mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Gallery Preview</h4>
                    <div className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-medium">
                      {previewImages.length} images
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Size Capacity Indicator */}
                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 dark:border-blue-800/50">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {totalImageSize.toFixed(1)}MB / 200MB
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-16 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((totalImageSize / 200) * 100, 100)}%` }}
                        ></div>
                      </div>
                      {/* Status Indicator */}
                      {totalImageSize > 180 && (
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    
                    {/* Mobile Size Display */}
                    <div className="sm:hidden flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/50">
                      <Package className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {totalImageSize.toFixed(1)}MB
                      </span>
                      {totalImageSize > 180 && (
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                      )}
                    </div>
                    
                    <span className="text-xs text-gray-500 dark:text-slate-400 hidden sm:block">
                      Drag to reorder • Click to remove
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, images: [] }))
                        setPreviewImages([])
                        setImageSizes([])
                        setTotalImageSize(0)
                      }}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-medium transition-all duration-200"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                {/* Responsive Image Grid - Smaller Size */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-1.5 sm:gap-2 lg:gap-3">
                  {previewImages.map((preview, index) => (
                    <div key={index} className="group relative">
                      {/* Image Container - Smaller Size */}
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800/70 border border-gray-200/50 dark:border-slate-700/50 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg transition-all duration-300">
                        <img
                          src={preview}
                          alt={`Product preview ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="absolute top-1 right-1">
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-110"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Mobile Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="sm:hidden absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      
                      {/* Image Info - Compact with Size */}
                      <div className="mt-1 px-1 py-1 bg-gray-50 dark:bg-slate-900 rounded border border-gray-100 dark:border-slate-800">
                        <div className="flex flex-col items-center space-y-0.5">
                          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                            #{index + 1}
                          </span>
                          {imageSizes[index] && (
                            <span className="text-xs text-gray-400 dark:text-slate-500">
                              {imageSizes[index].sizeMB}MB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEO */}
          <div 
            ref={sectionRefs.seo}
            className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 sm:p-8 lg:p-10 transition-all duration-300 scroll-mt-32 ${
              activeSection === 'seo' ? 'ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10' : ''
            }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
                  <div className="w-5 h-5 flex items-center justify-center text-white font-bold text-sm">SEO</div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Search Optimization</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Improve discoverability</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  SEO Title
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">60 chars max</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="seoTitle"
                    value={formData.seoTitle}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900"
                    placeholder="SEO title for search engines"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/5 to-rose-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center">
                  SEO Description
                  <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">160 chars max</span>
                </label>
                <div className="relative group">
                  <textarea
                    name="seoDescription"
                    value={formData.seoDescription}
                    onChange={handleInputChange}
                    rows="3"
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 resize-none"
                    placeholder="SEO description for search engines"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/5 to-rose-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadState.isUploading || isSubmittingRef.current}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadState.isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
      </div>
      
      {/* Upload Retry Popup */}
      <UploadRetryPopup
        isOpen={uploadState.showRetryPopup}
        onClose={handleCloseRetryPopup}
        error={uploadState.lastError}
        uploadData={uploadState.uploadData}
        onRetry={handleRetryUpload}
        isRetrying={uploadState.isRetrying}
      />
    </div>
  )
}

export default AdminProductAdd
