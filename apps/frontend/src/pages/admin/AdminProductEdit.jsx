import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { AlertCircle, ArrowLeft, Save } from 'lucide-react'
import {
  addProductImageFiles,
  getProductSectionForField,
  moveProductImage,
  productToForm,
  removeProductImageAt,
  serializeProductForm,
  setMainProductImageAt,
  updateProductImageAlt,
  validateProductForm
} from '@bookshop/shared/product'
import { adminAPI } from '../../services/api'
import { invalidateCatalog } from '../../utils/queryKeys'
import ProductFormFields from '../../components/admin/ProductFormFields'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminProductEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const previewUrlsRef = useRef(new Set())

  const [form, setForm] = useState(() => productToForm({}))
  const [errors, setErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)

  const {
    data: productData,
    isLoading,
    error: loadError,
    isSuccess
  } = useQuery(['adminProduct', id], () => adminAPI.getProduct(id), {
    retry: false,
    refetchOnWindowFocus: false
  })

  const { data: categoriesData } = useQuery(
    'adminCategoriesForProduct',
    () => adminAPI.getCategories({ page: 1, limit: 100 }),
    { staleTime: 5 * 1000 }
  )

  const product = productData?.data?.data

  const categories =
    (Array.isArray(categoriesData?.data?.data) && categoriesData.data.data) ||
    (Array.isArray(categoriesData?.data?.categories) && categoriesData.data.categories) ||
    []

  useEffect(() => {
    if (product) {
      setForm(productToForm(product))
      setErrors({})
      setIsDirty(false)
    }
  }, [product])

  // Revoke every object URL created for previews when leaving the page.
  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      previewUrlsRef.current.clear()
    },
    []
  )

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

  const setValue = (path, value) => {
    setIsDirty(true)
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

  const handleAddFiles = (files) => {
    const { images, errors: fileErrors } = addProductImageFiles(form.images, files, createPreviewUrl)
    fileErrors.forEach((message) => toast.error(message))
    if (images.length > form.images.length) setIsDirty(true)
    setForm((prev) => ({ ...prev, images }))
  }

  const handleRemoveImage = (index) => {
    const { images, removed } = removeProductImageAt(form.images, index)
    releasePreviewUrl(removed?.previewUrl)
    setIsDirty(true)
    setForm((prev) => ({ ...prev, images }))
  }

  const handleSetMainImage = (index) => {
    setIsDirty(true)
    setForm((prev) => ({ ...prev, images: setMainProductImageAt(prev.images, index) }))
  }

  const handleMoveImage = (index, direction) => {
    setIsDirty(true)
    setForm((prev) => ({ ...prev, images: moveProductImage(prev.images, index, direction) }))
  }

  const handleImageAlt = (index, alt) => {
    setIsDirty(true)
    setForm((prev) => ({ ...prev, images: updateProductImageAlt(prev.images, index, alt) }))
  }

  const updateMutation = useMutation(
    ({ payload, files }) => adminAPI.updateProduct(id, payload, files),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('adminProducts')
        queryClient.invalidateQueries('adminProduct')
        queryClient.invalidateQueries(['adminProduct', id])
        invalidateCatalog(queryClient)
        setIsDirty(false)

        toast.success(response?.data?.message || 'Book updated successfully')
        navigate('/admin/products')
      },
      onError: (error) => {
        const responseData = error?.response?.data
        const details = Array.isArray(responseData?.details) ? responseData.details : []

        if (details.length > 0) {
          const mapped = {}
          details.forEach((detail) => {
            mapped[detail.field] = detail.message
          })
          setErrors(mapped)
        }

        toast.error(responseData?.error || error?.message || 'Failed to update book')
      }
    }
  )

  const scrollToFirstError = (validationErrors) => {
    const firstPath = Object.keys(validationErrors)[0]
    if (!firstPath) return
    document
      .getElementById(getProductSectionForField(firstPath))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (updateMutation.isLoading) return

    const validationErrors = validateProductForm(form)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the highlighted fields')
      scrollToFirstError(validationErrors)
      return
    }

    const { payload, files } = serializeProductForm(form, { mode: 'update' })
    updateMutation.mutate({ payload, files })
  }

  const handleReset = () => {
    if (!product) return
    form.images.forEach((image) => releasePreviewUrl(image.previewUrl))
    setForm(productToForm(product))
    setErrors({})
    setIsDirty(false)
    toast.success('Changes discarded')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/40">
        <LoadingSpinner />
      </div>
    )
  }

  if (loadError || !isSuccess || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/40 px-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Book could not be loaded</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
            {loadError?.response?.data?.error || loadError?.message || 'The book was not found.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800/70 hover:bg-gray-200 dark:hover:bg-slate-700 text-sm font-medium text-gray-800 dark:text-slate-200"
            >
              Back to books
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/40">
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
                  Edit book
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{product.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isDirty && (
                <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Unsaved changes
                </span>
              )}
              <button
                type="button"
                onClick={handleReset}
                disabled={!isDirty || updateMutation.isLoading}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/70 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={updateMutation.isLoading}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {updateMutation.isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <ProductFormFields
          form={form}
          errors={errors}
          setValue={setValue}
          categories={categories}
          disabled={updateMutation.isLoading}
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
              disabled={updateMutation.isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {updateMutation.isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AdminProductEdit
