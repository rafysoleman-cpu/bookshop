import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import {
  addProductImageFiles,
  buildProductFormData,
  createEmptyProductForm,
  getProductSectionForField,
  moveProductImage,
  removeProductImageAt,
  serializeProductForm,
  setMainProductImageAt,
  updateProductImageAlt,
  validateProductForm
} from '@bookshop/shared/product'
import { adminAPI } from '../../services/api'
import { invalidateCatalog } from '../../utils/queryKeys'
import uploadService from '../../services/uploadService'
import uploadRecoveryService from '../../services/uploadRecoveryService'
import EnterpriseUploadProgressBar from '../../components/EnterpriseUploadProgressBar'
import UploadRetryPopup from '../../components/UploadRetryPopup'
import ProductFormFields from '../../components/admin/ProductFormFields'
import toast from 'react-hot-toast'
import { useSocket } from '../../contexts/SocketContext'

// Shared with AdminProducts.jsx: the add page writes the record before
// navigating, the products page renders the realtime progress bar from it.
const PRODUCT_UPLOAD_KEYS = {
  data: 'productUploadData',
  progress: 'productUploadProgress',
  error: 'productUploadError'
}

const FORM_SECTIONS = [
  { id: 'basic', label: 'Basic' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'organization', label: 'Organisation' },
  { id: 'shipping', label: 'Delivery' },
  { id: 'promotions', label: 'Tax & promo' },
  { id: 'images', label: 'Gallery' },
  { id: 'video', label: 'Video' },
  { id: 'seo', label: 'SEO' },
  { id: 'variants', label: 'Variants' }
]

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
  const queryClient = useQueryClient()
  const { socket, connected } = useSocket()

  const [form, setForm] = useState(createEmptyProductForm)
  const [errors, setErrors] = useState({})
  const [activeSection, setActiveSection] = useState('basic')

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

  const isSubmittingRef = useRef(false)
  const isNavigatingAwayRef = useRef(false)
  const previewUrlsRef = useRef(new Set())

  const { data: categoriesData } = useQuery(
    'adminCategoriesForProduct',
    () => adminAPI.getCategories({ page: 1, limit: 100 }),
    {
      staleTime: 5 * 1000,
      onError: () => toast.error('Failed to load genres')
    }
  )

  const categories =
    (Array.isArray(categoriesData?.data?.data) && categoriesData.data.data) ||
    (Array.isArray(categoriesData?.data?.categories) && categoriesData.data.categories) ||
    []

  // Keep genres fresh when the admin comes back from the category page.
  useEffect(() => {
    const handleFocus = () => queryClient.invalidateQueries('adminCategoriesForProduct')
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient])

  // Revoke every object URL created for previews when leaving the page.
  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      previewUrlsRef.current.clear()
    },
    []
  )

  // Restore the form after a reload-triggered retry. Files cannot be restored
  // (browser security), so only the field values come back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('retry') !== 'true') return

    const uploadId = params.get('uploadId')
    const raw = uploadId ? sessionStorage.getItem(`retry_${uploadId}`) : null
    if (!raw) return

    try {
      const stored = JSON.parse(raw)
      const next = { ...createEmptyProductForm(), ...stored, images: [] }
      setForm(next)
      toast.info('Form restored. Re-attach the images and submit again.', { duration: 5000 })
    } catch (error) {
      console.error('Could not restore the form', error)
    }
  }, [])

  const setValue = (path, value) => {
    setForm((prev) => {
      const next = { ...prev }
      const keys = path.split('.')

      if (keys.length === 1) {
        next[keys[0]] = value
        return next
      }

      const [head, ...rest] = keys
      next[head] = { ...prev[head] }
      let cursor = next[head]

      rest.forEach((key, index) => {
        if (index === rest.length - 1) {
          cursor[key] = value
        } else {
          cursor[key] = { ...cursor[key] }
          cursor = cursor[key]
        }
      })

      return next
    })

    setErrors((prev) => {
      if (!prev[path]) return prev
      const next = { ...prev }
      delete next[path]
      return next
    })
  }

  const createPreviewUrl = (file) => {
    const url = URL.createObjectURL(file)
    previewUrlsRef.current.add(url)
    return url
  }

  const releasePreviewUrl = (url) => {
    if (!url) return
    URL.revokeObjectURL(url)
    previewUrlsRef.current.delete(url)
  }

  const handleAddFiles = (files) => {
    const { images, errors: fileErrors } = addProductImageFiles(form.images, files, createPreviewUrl)
    fileErrors.forEach((message) => toast.error(message))
    if (images !== form.images) setForm((prev) => ({ ...prev, images }))
  }

  const handleRemoveImage = (index) => {
    const { images, removed } = removeProductImageAt(form.images, index)
    releasePreviewUrl(removed?.previewUrl)
    setForm((prev) => ({ ...prev, images }))
  }

  const handleSetMainImage = (index) => {
    setForm((prev) => ({ ...prev, images: setMainProductImageAt(prev.images, index) }))
  }

  const handleMoveImage = (index, direction) => {
    setForm((prev) => ({ ...prev, images: moveProductImage(prev.images, index, direction) }))
  }

  const handleImageAlt = (index, alt) => {
    setForm((prev) => ({ ...prev, images: updateProductImageAlt(prev.images, index, alt) }))
  }

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToFirstError = (validationErrors) => {
    const firstPath = Object.keys(validationErrors)[0]
    if (!firstPath) return
    scrollToSection(getProductSectionForField(firstPath))
  }

  /* ------------------------------ upload ------------------------------ */

  const createProductMutation = useMutation(adminAPI.createProduct, {
    onSuccess: () => {
      isNavigatingAwayRef.current = true
      setUploadState((prev) => ({
        ...prev,
        showRetryPopup: false,
        lastError: null,
        isUploading: false,
        uploadProgress: 0,
        uploadStartTime: null
      }))
      invalidateCatalog(queryClient)
    },
    onError: (error) => {
      if (isNavigatingAwayRef.current) {
        setUploadState((prev) => ({ ...prev, isUploading: false, uploadProgress: 0, uploadStartTime: null }))
        return
      }

      setUploadState((prev) => ({
        ...prev,
        showRetryPopup: true,
        lastError: error,
        isUploading: false
      }))
    },
    onSettled: () => {
      setUploadState((prev) => ({ ...prev, isUploading: false, uploadProgress: 0, uploadStartTime: null }))
    }
  })

  const handleCloseRetryPopup = () => {
    setUploadState((prev) => ({ ...prev, showRetryPopup: false, lastError: null }))
  }

  const handleRetryUpload = async () => {
    if (!uploadState.uploadData) return
    isNavigatingAwayRef.current = false

    setUploadState((prev) => ({
      ...prev,
      isRetrying: true,
      isUploading: true,
      showRetryPopup: false
    }))

    try {
      await createProductMutation.mutateAsync(uploadState.uploadData)
    } catch (error) {
      console.error('Retry upload failed', error)
    } finally {
      setUploadState((prev) => ({ ...prev, isRetrying: false }))
    }
  }

  // Live upload progress over the socket.
  useEffect(() => {
    if (!socket || !connected || !uploadState.isUploading) return undefined

    const handleUploadProgress = (data) => {
      setUploadState((prev) => ({
        ...prev,
        uploadProgress: data.progress || 0,
        uploadId: data.uploadId || prev.uploadId,
        progressData: {
          status: data.status,
          message: data.message,
          currentImage: data.currentImage,
          totalImages: data.totalImages,
          productName: data.productName
        }
      }))
    }

    socket.on('upload:progress', handleUploadProgress)
    return () => {
      if (typeof socket.off === 'function') socket.off('upload:progress', handleUploadProgress)
    }
  }, [socket, connected, uploadState.isUploading])

  /* ------------------------------ submit ------------------------------ */

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmittingRef.current || uploadState.isUploading) return

    const validationErrors = validateProductForm(form)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the highlighted fields')
      scrollToFirstError(validationErrors)
      return
    }

    isSubmittingRef.current = true
    isNavigatingAwayRef.current = false

    try {
      const uploadId = uploadService.generateUploadId()
      const { payload, files } = serializeProductForm(form, { mode: 'create' })
      const formDataToSubmit = buildProductFormData(payload, files)
      formDataToSubmit.append('uploadId', uploadId)

      const imageCount = files.length

      // Remember the form (without files) so a failed upload can be retried
      // after a reload without retyping everything.
      const formWithoutImages = { ...form }
      delete formWithoutImages.images
      sessionStorage.setItem(`retry_${uploadId}`, JSON.stringify(formWithoutImages))

      sessionStorage.setItem(
        PRODUCT_UPLOAD_KEYS.data,
        JSON.stringify({
          uploadId,
          productName: payload.name || 'Product',
          imageCount,
          totalImages: imageCount,
          startTime: Date.now(),
          status: 'started'
        })
      )
      sessionStorage.setItem(PRODUCT_UPLOAD_KEYS.progress, '5')
      sessionStorage.removeItem(PRODUCT_UPLOAD_KEYS.error)

      setUploadState((prev) => ({
        ...prev,
        isUploading: true,
        uploadId,
        uploadProgress: 0,
        showRetryPopup: false,
        lastError: null,
        uploadData: formDataToSubmit,
        uploadStartTime: Date.now()
      }))

      uploadRecoveryService.saveUploadData(formDataToSubmit, uploadId)

      // Navigate immediately: the request keeps running in the background and
      // AdminProducts renders the realtime progress bar.
      navigate('/admin/products')

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
    } catch (error) {
      console.error('Upload submission failed', error)
      isSubmittingRef.current = false
      toast.error(error?.message || 'Could not start the upload')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/40">
      <EnterpriseUploadProgressBar
        isUploading={uploadState.isUploading}
        uploadProgress={uploadState.uploadProgress}
        uploadData={
          uploadState.uploadData
            ? {
                productName: uploadState.uploadData.get('name') || 'Product',
                imageCount: uploadState.uploadData.getAll('images')?.length || 0,
                startTime: uploadState.uploadStartTime || Date.now()
              }
            : null
        }
        currentImageIndex={uploadState.progressData?.currentImage || 0}
        totalImages={uploadState.progressData?.totalImages || 0}
        onDismiss={() =>
          setUploadState((prev) => ({
            ...prev,
            isUploading: false,
            uploadProgress: 0,
            uploadData: null,
            uploadStartTime: null
          }))
        }
      />

      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/70 text-gray-600 dark:text-slate-400 transition-colors"
                aria-label="Back to books"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-slate-100 truncate">
                  Add a book
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                  Every field below is saved to the product record
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-[57px] sm:top-[65px] z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-gray-200/30 dark:border-slate-700/30">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {FORM_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <ProductFormFields
          form={form}
          errors={errors}
          setValue={setValue}
          categories={categories}
          disabled={uploadState.isUploading}
          images={{
            onChange: handleAddFiles,
            onRemove: handleRemoveImage,
            onSetMain: handleSetMainImage,
            onMove: handleMoveImage,
            onAltChange: handleImageAlt
          }}
        />

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/70 hover:bg-gray-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadState.isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {uploadState.isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create book
                </>
              )}
            </button>
          </div>
        </div>
      </form>

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
