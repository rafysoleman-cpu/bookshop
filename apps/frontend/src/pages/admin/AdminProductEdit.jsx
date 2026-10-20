import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Package,
  Plus,
  Trash2,
  Star,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import { invalidateCatalog } from '../../utils/queryKeys'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const MAX_IMAGES = 10
const MAX_VARIANT_OPTIONS = 50

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' }
]

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'hidden', label: 'Hidden' }
]

const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz']
const DIMENSION_UNITS = ['cm', 'in']

const INPUT_CLASS =
  'block w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm'
const LABEL_CLASS = 'block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center'
const CARD_CLASS =
  'bg-white dark:bg-slate-800 rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-4 sm:p-6'
const SELECT_CLASS = `${INPUT_CLASS} appearance-none cursor-pointer`

const errorClass = (hasError) =>
  hasError ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/50' : 'border-gray-200/50 dark:border-slate-700/50 group-hover:bg-gray-50 dark:group-hover:bg-slate-900'

const toInputValue = (value) => {
  if (value === undefined || value === null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 16)
  return String(value)
}

const toIsoDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const toDateInputValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

const createEmptyForm = () => ({
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  author: '',
  isbn: '',
  publisher: '',
  pages: '',
  format: 'paperback',
  language: 'English',
  edition: '',
  publishedDate: '',
  sku: '',
  barcode: '',
  price: '',
  compareAtPrice: '',
  costPrice: '',
  category: '',
  subcategories: [],
  status: 'draft',
  visibility: 'public',
  featured: false,
  tags: '',
  inventory: { quantity: 0, trackQuantity: true, allowBackorder: false, lowStockThreshold: '' },
  weight: { value: '', unit: 'kg' },
  dimensions: { length: '', width: '', height: '', unit: 'cm' },
  shipping: { freeShipping: false, shippingCost: '', shippingWeight: '' },
  tax: { taxable: false, taxRate: '' },
  flashSale: { enabled: false, discountPercentage: '', startDate: '', endDate: '', maxQuantity: '' },
  video: { url: '', thumbnail: '' },
  seo: { title: '', description: '', keywords: '' },
  variants: [],
  images: []
})

const mapProductToForm = (product) => {
  const form = createEmptyForm()

  form.name = product.name ?? ''
  form.slug = product.slug ?? ''
  form.shortDescription = product.shortDescription ?? ''
  form.description = product.description ?? ''
  form.author = product.author ?? ''
  form.isbn = product.isbn ?? ''
  form.publisher = product.publisher ?? ''
  form.pages = toInputValue(product.pages)
  form.format = product.format ?? 'paperback'
  form.language = product.language ?? 'English'
  form.edition = product.edition ?? ''
  form.publishedDate = toDateInputValue(product.publishedDate)
  form.sku = product.sku ?? ''
  form.barcode = product.barcode ?? ''
  form.price = toInputValue(product.price)
  form.compareAtPrice = toInputValue(product.compareAtPrice)
  form.costPrice = toInputValue(product.costPrice)
  form.category = typeof product.category === 'object' ? product.category?._id ?? '' : product.category ?? ''
  form.subcategories = Array.isArray(product.subcategories)
    ? product.subcategories.map((sub) => (typeof sub === 'object' ? sub?._id : sub)).filter(Boolean)
    : []
  form.status = product.status ?? 'draft'
  form.visibility = product.visibility ?? 'public'
  form.featured = Boolean(product.featured)
  form.tags = Array.isArray(product.tags) ? product.tags.join(', ') : ''

  form.inventory = {
    quantity: toInputValue(product.inventory?.quantity ?? 0),
    trackQuantity: product.inventory?.trackQuantity ?? true,
    allowBackorder: product.inventory?.allowBackorder ?? false,
    lowStockThreshold: toInputValue(product.inventory?.lowStockThreshold)
  }

  form.weight = {
    value: toInputValue(product.weight?.value),
    unit: product.weight?.unit || 'kg'
  }

  form.dimensions = {
    length: toInputValue(product.dimensions?.length),
    width: toInputValue(product.dimensions?.width),
    height: toInputValue(product.dimensions?.height),
    unit: product.dimensions?.unit || 'cm'
  }

  form.shipping = {
    freeShipping: product.shipping?.freeShipping ?? false,
    shippingCost: toInputValue(product.shipping?.shippingCost),
    shippingWeight: toInputValue(product.shipping?.shippingWeight)
  }

  form.tax = {
    taxable: product.tax?.taxable ?? false,
    taxRate: toInputValue(product.tax?.taxRate)
  }

  form.flashSale = {
    enabled: product.flashSale?.enabled ?? false,
    discountPercentage: toInputValue(product.flashSale?.discountPercentage),
    startDate: toInputValue(product.flashSale?.startDate),
    endDate: toInputValue(product.flashSale?.endDate),
    maxQuantity: toInputValue(product.flashSale?.maxQuantity)
  }

  form.video = {
    url: product.video?.url ?? '',
    thumbnail: product.video?.thumbnail ?? ''
  }

  form.seo = {
    title: product.seo?.title ?? '',
    description: product.seo?.description ?? '',
    keywords: Array.isArray(product.seo?.keywords) ? product.seo.keywords.join(', ') : ''
  }

  form.variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => ({
        name: variant?.name ?? '',
        options: Array.isArray(variant?.options) ? variant.options.join(', ') : '',
        price: toInputValue(variant?.price),
        sku: variant?.sku ?? '',
        image: variant?.image ?? '',
        inventory: toInputValue(variant?.inventory)
      }))
    : []

  form.images = Array.isArray(product.images)
    ? product.images.map((image, index) => ({
        url: image?.url ?? '',
        alt: image?.alt ?? '',
        fileId: image?.fileId ?? '',
        isMain: image?.isMain ?? index === 0,
        isNew: false
      }))
    : []

  return form
}

const Field = ({ label, hint, error, required, children, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    <label className={LABEL_CLASS}>
      {label}
      {required && <span className="ml-1 text-red-500 dark:text-red-400">*</span>}
      {hint && <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 font-normal">{hint}</span>}
    </label>
    <div className="relative group">{children}</div>
    {error && (
      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
)

const SectionCard = ({ icon: Icon, title, subtitle, badge, children }) => (
  <div className={CARD_CLASS}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
    {children}
  </div>
)

const Toggle = ({ checked, onChange, label, description }) => (
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500"
    />
    <span>
      <span className="block text-sm font-medium text-gray-800 dark:text-slate-200">{label}</span>
      {description && <span className="block text-xs text-gray-500 dark:text-slate-400">{description}</span>}
    </span>
  </label>
)

const AdminProductEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const previewUrlsRef = useRef(new Set())
  const [form, setForm] = useState(createEmptyForm)
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

  // A soft deleted product must keep its status unless an admin explicitly changes it
  const statusOptions = useMemo(
    () =>
      form.status && !STATUS_OPTIONS.some((option) => option.value === form.status)
        ? [...STATUS_OPTIONS, { value: form.status, label: form.status }]
        : STATUS_OPTIONS,
    [form.status]
  )

  const visibilityOptions = useMemo(
    () =>
      form.visibility && !VISIBILITY_OPTIONS.some((option) => option.value === form.visibility)
        ? [...VISIBILITY_OPTIONS, { value: form.visibility, label: form.visibility }]
        : VISIBILITY_OPTIONS,
    [form.visibility]
  )

  const categories = useMemo(
    () =>
      (Array.isArray(categoriesData?.data?.data) && categoriesData.data.data) ||
      (Array.isArray(categoriesData?.data?.categories) && categoriesData.data.categories) ||
      [],
    [categoriesData]
  )

  useEffect(() => {
    if (product) {
      setForm(mapProductToForm(product))
      setErrors({})
      setIsDirty(false)
    }
  }, [product])

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

  const revokePreviewUrl = (url) => {
    if (!url) return
    URL.revokeObjectURL(url)
    previewUrlsRef.current.delete(url)
  }

  const setValue = useCallback((path, value) => {
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
  }, [])

  const clearFieldError = useCallback((field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleImageFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) {
      toast.error('Please choose image files')
      return
    }

    setErrors((prev) => {
      const next = { ...prev }
      delete next.images
      return next
    })

    setIsDirty(true)
    setForm((prev) => {
      const room = MAX_IMAGES - prev.images.length
      if (room <= 0) return prev

      const additions = files.slice(0, room).map((file) => ({
        url: '',
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        fileId: '',
        isMain: prev.images.length === 0,
        isNew: true,
        file,
        previewUrl: createPreviewUrl(file)
      }))

      if (files.length > room) {
        toast.error(`Only ${MAX_IMAGES} images are allowed`);
      }

      return { ...prev, images: [...prev.images, ...additions] }
    })
  }

  const removeImage = (index) => {
    setIsDirty(true)
    setForm((prev) => {
      const target = prev.images[index]
      revokePreviewUrl(target?.previewUrl)

      const images = prev.images.filter((_, position) => position !== index)
      if (images.length > 0 && !images.some((image) => image.isMain)) images[0].isMain = true

      return { ...prev, images }
    })
  }

  const setMainImage = (index) => {
    setIsDirty(true)
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((image, position) => ({ ...image, isMain: position === index }))
    }))
  }

  const moveImage = (index, direction) => {
    setIsDirty(true)
    setForm((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.images.length) return prev

      const images = [...prev.images]
      const [moved] = images.splice(index, 1)
      images.splice(target, 0, moved)
      return { ...prev, images }
    })
  }

  const addVariant = () => {
    setIsDirty(true)
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: '', options: '', price: '', sku: '', image: '', inventory: '0' }
      ]
    }))
  }

  const updateVariant = (index, key, value) => {
    setIsDirty(true)
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, position) =>
        position === index ? { ...variant, [key]: value } : variant
      )
    }))
  }

  const removeVariant = (index) => {
    setIsDirty(true)
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, position) => position !== index)
    }))
  }

  const validateForm = () => {
    const validationErrors = {}

    if (!form.name.trim()) validationErrors.name = 'Book title is required'
    if (form.name.length > 100) validationErrors.name = 'Book title must be 100 characters or fewer'
    if (!form.author.trim()) validationErrors.author = 'Author is required'
    if (form.author.length > 150) validationErrors.author = 'Author must be 150 characters or fewer'

    const price = Number.parseFloat(form.price)
    if (form.price === '' || !Number.isFinite(price)) {
      validationErrors.price = 'Price is required'
    } else if (price < 0) {
      validationErrors.price = 'Price cannot be negative'
    }

    if (!form.category) validationErrors.category = 'Genre is required'

    if (form.compareAtPrice !== '') {
      const compare = Number.parseFloat(form.compareAtPrice)
      if (!Number.isFinite(compare) || compare < 0) {
        validationErrors.compareAtPrice = 'Enter a valid compare at price'
      }
    }

    if (form.costPrice !== '') {
      const cost = Number.parseFloat(form.costPrice)
      if (!Number.isFinite(cost) || cost < 0) {
        validationErrors.costPrice = 'Enter a valid cost price'
      }
    }

    if (form.images.length > MAX_IMAGES) {
      validationErrors.images = `Only ${MAX_IMAGES} images are allowed`
    }

    form.variants.forEach((variant, index) => {
      if (!variant.name.trim()) {
        validationErrors[`variants.${index}.name`] = 'Variant name is required'
      }
      if (variant.price === '' || !Number.isFinite(Number.parseFloat(variant.price))) {
        validationErrors[`variants.${index}.price`] = 'Variant price is required'
      }
    })

    if (form.video.url && form.video.url.trim()) {
      try {
        new URL(form.video.url)
      } catch {
        validationErrors['video.url'] = 'Enter a valid video URL'
      }
    }

    if (form.flashSale.enabled) {
      const discount = Number.parseFloat(form.flashSale.discountPercentage)
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
        validationErrors['flashSale.discountPercentage'] = 'Discount must be between 0 and 100'
      }
      if (form.flashSale.startDate && form.flashSale.endDate) {
        if (new Date(form.flashSale.startDate) >= new Date(form.flashSale.endDate)) {
          validationErrors['flashSale.endDate'] = 'End date must be after the start date'
        }
      }
    }

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }

  const buildPayload = () => {
    const existingImages = form.images
      .filter((image) => !image.isNew && image.url)
      .map(({ url, alt, fileId, isMain }) => ({
        url,
        alt: alt ?? '',
        ...(fileId ? { fileId } : {}),
        isMain
      }))

    const variants = form.variants
      .filter((variant) => variant.name.trim())
      .map((variant) => ({
        name: variant.name.trim(),
        options: variant.options
          .split(',')
          .map((option) => option.trim())
          .filter(Boolean)
          .slice(0, MAX_VARIANT_OPTIONS),
        price: Number.parseFloat(variant.price) || 0,
        sku: variant.sku?.trim() ?? '',
        image: variant.image?.trim() ?? '',
        inventory: Number.parseInt(variant.inventory, 10) || 0
      }))

    const weightValue = toNumberOrNull(form.weight.value)

    return {
      name: form.name.trim(),
      slug: form.slug.trim(),
      shortDescription: form.shortDescription,
      description: form.description,
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      price: Number.parseFloat(form.price),
      compareAtPrice: toNumberOrNull(form.compareAtPrice),
      costPrice: toNumberOrNull(form.costPrice),
      category: form.category,
      subcategories: form.subcategories,
      author: form.author.trim(),
      isbn: form.isbn.trim(),
      publisher: form.publisher.trim(),
      pages: toNumberOrNull(form.pages),
      format: form.format,
      language: form.language.trim(),
      edition: form.edition.trim(),
      publishedDate: form.publishedDate || null,
      status: form.status,
      visibility: form.visibility,
      featured: form.featured,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      imagesJson: existingImages,
      inventory: {
        quantity: Number.parseInt(form.inventory.quantity, 10) || 0,
        trackQuantity: form.inventory.trackQuantity,
        allowBackorder: form.inventory.allowBackorder,
        ...(form.inventory.lowStockThreshold !== ''
          ? { lowStockThreshold: Number.parseInt(form.inventory.lowStockThreshold, 10) || 0 }
          : {})
      },
      ...(weightValue !== null ? { weight: { value: weightValue, unit: form.weight.unit } } : {}),
      dimensions:
        form.dimensions.length !== '' && form.dimensions.width !== '' && form.dimensions.height !== ''
          ? {
              length: Number.parseFloat(form.dimensions.length) || 0,
              width: Number.parseFloat(form.dimensions.width) || 0,
              height: Number.parseFloat(form.dimensions.height) || 0,
              unit: form.dimensions.unit
            }
          : null,
      shipping: {
        freeShipping: form.shipping.freeShipping,
        ...(form.shipping.shippingCost !== ''
          ? { shippingCost: Number.parseFloat(form.shipping.shippingCost) || 0 }
          : {}),
        ...(form.shipping.shippingWeight !== ''
          ? { shippingWeight: Number.parseFloat(form.shipping.shippingWeight) || 0 }
          : {})
      },
      tax: {
        taxable: form.tax.taxable,
        ...(form.tax.taxRate !== '' ? { taxRate: Number.parseFloat(form.tax.taxRate) || 0 } : {})
      },
      flashSale: {
        enabled: form.flashSale.enabled,
        discountPercentage: form.flashSale.enabled ? toNumberOrNull(form.flashSale.discountPercentage) : null,
        startDate: form.flashSale.enabled ? toIsoDate(form.flashSale.startDate) : null,
        endDate: form.flashSale.enabled ? toIsoDate(form.flashSale.endDate) : null,
        maxQuantity: form.flashSale.enabled ? toNumberOrNull(form.flashSale.maxQuantity) : null
      },
      video: {
        url: form.video.url.trim(),
        thumbnail: form.video.thumbnail.trim()
      },
      seo: {
        title: form.seo.title.trim(),
        description: form.seo.description.trim(),
        keywords: form.seo.keywords
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      },
      variants
    }
  }

  const updateMutation = useMutation(
    (payload) => adminAPI.updateProduct(id, payload, form.images.filter((image) => image.isNew).map((image) => image.file)),
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

  const handleSubmit = (event) => {
    event.preventDefault()

    if (updateMutation.isLoading) return
    if (!validateForm()) {
      toast.error('Please fix the highlighted fields')
      return
    }

    updateMutation.mutate(buildPayload())
  }

  const handleReset = () => {
    if (product) {
      form.images.forEach((image) => revokePreviewUrl(image.previewUrl))
      setForm(mapProductToForm(product))
      setErrors({})
      setIsDirty(false)
      toast.success('Changes discarded')
    }
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
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-slate-100 truncate">Edit book</h1>
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
        <SectionCard
          icon={Package}
          title="Basic information"
          subtitle="Naming, descriptions and identifiers"
        >
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <Field label="Book title" required error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(event) => {
                  setValue('name', event.target.value)
                  clearFieldError('name')
                }}
                className={INPUT_CLASS + ' ' + errorClass(errors.name)}
                placeholder="Enter book title"
              />
            </Field>

            <Field label="Slug" hint="URL identifier" error={errors.slug}>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setValue('slug', event.target.value)}
                className={INPUT_CLASS + ' ' + errorClass(errors.slug)}
                placeholder="book-slug"
              />
            </Field>

            <Field label="Short description" hint="Max 200 chars" className="xl:col-span-2">
              <input
                type="text"
                value={form.shortDescription}
                onChange={(event) => setValue('shortDescription', event.target.value)}
                className={INPUT_CLASS}
                placeholder="One line summary shown in listings"
              />
            </Field>

            <Field label="Description" className="xl:col-span-2">
              <textarea
                rows={6}
                value={form.description}
                onChange={(event) => setValue('description', event.target.value)}
                className={INPUT_CLASS}
                placeholder="Full book description"
              />
            </Field>

            <Field label="Author" required error={errors.author}>
              <input
                type="text"
                value={form.author}
                onChange={(event) => {
                  setValue('author', event.target.value)
                  clearFieldError('author')
                }}
                className={INPUT_CLASS + ' ' + errorClass(errors.author)}
                placeholder="Author name"
              />
            </Field>

            <Field label="SKU" hint="Unique when provided">
              <input
                type="text"
                value={form.sku}
                onChange={(event) => setValue('sku', event.target.value)}
                className={INPUT_CLASS}
                placeholder="SKU-12345"
              />
            </Field>

            <Field label="Barcode" hint="Unique when provided" error={errors.barcode}>
              <input
                type="text"
                value={form.barcode}
                onChange={(event) => {
                  setValue('barcode', event.target.value)
                  clearFieldError('barcode')
                }}
                className={INPUT_CLASS + ' ' + errorClass(errors.barcode)}
                placeholder="1234567890123"
              />
            </Field>

            <Field label="ISBN" hint="Unique when provided" error={errors.isbn}>
              <input
                type="text"
                value={form.isbn}
                onChange={(event) => {
                  setValue('isbn', event.target.value)
                  clearFieldError('isbn')
                }}
                className={INPUT_CLASS + ' ' + errorClass(errors.isbn)}
                placeholder="978-3-16-148410-0"
              />
            </Field>

            <Field label="Publisher">
              <input
                type="text"
                value={form.publisher}
                onChange={(event) => setValue('publisher', event.target.value)}
                className={INPUT_CLASS}
                placeholder="Publisher name"
              />
            </Field>

            <Field label="Pages">
              <input
                type="number"
                min="1"
                value={form.pages}
                onChange={(event) => setValue('pages', event.target.value)}
                className={INPUT_CLASS}
                placeholder="0"
              />
            </Field>

            <Field label="Format">
              <select
                value={form.format}
                onChange={(event) => setValue('format', event.target.value)}
                className={SELECT_CLASS}
              >
                <option value="paperback">Paperback</option>
                <option value="hardcover">Hardcover</option>
                <option value="ebook">Ebook</option>
                <option value="audiobook">Audiobook</option>
              </select>
            </Field>

            <Field label="Language">
              <input
                type="text"
                value={form.language}
                onChange={(event) => setValue('language', event.target.value)}
                className={INPUT_CLASS}
                placeholder="English"
              />
            </Field>

            <Field label="Edition">
              <input
                type="text"
                value={form.edition}
                onChange={(event) => setValue('edition', event.target.value)}
                className={INPUT_CLASS}
                placeholder="e.g. 2nd"
              />
            </Field>

            <Field label="Published date">
              <input
                type="date"
                value={form.publishedDate}
                onChange={(event) => setValue('publishedDate', event.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Tags" hint="Comma separated" className="xl:col-span-2">
              <input
                type="text"
                value={form.tags}
                onChange={(event) => setValue('tags', event.target.value)}
                className={INPUT_CLASS}
                placeholder="summer, cotton, casual"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={Star} title="Pricing" subtitle="Selling price and cost basis">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Field label="Price" required error={errors.price}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(event) => {
                  setValue('price', event.target.value)
                  clearFieldError('price')
                }}
                className={INPUT_CLASS + ' ' + errorClass(errors.price)}
                placeholder="0.00"
              />
            </Field>

            <Field label="Compare at price" hint="Shown struck through" error={errors.compareAtPrice}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.compareAtPrice}
                onChange={(event) => {
                  setValue('compareAtPrice', event.target.value)
                  clearFieldError('compareAtPrice')
                }}
                className={INPUT_CLASS + ' ' + errorClass(errors.compareAtPrice)}
                placeholder="0.00"
              />
            </Field>

            <Field label="Cost price" hint="Internal only" error={errors.costPrice}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(event) => {
                  setValue('costPrice', event.target.value)
                  clearFieldError('costPrice')
                }}
                className={INPUT_CLASS + ' ' + errorClass(errors.costPrice)}
                placeholder="0.00"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={Package} title="Inventory" subtitle="Stock levels and tracking">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Field label="Quantity" error={errors['inventory.quantity']}>
              <input
                type="number"
                min="0"
                value={form.inventory.quantity}
                onChange={(event) => setValue('inventory.quantity', event.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Low stock threshold">
              <input
                type="number"
                min="0"
                value={form.inventory.lowStockThreshold}
                onChange={(event) => setValue('inventory.lowStockThreshold', event.target.value)}
                className={INPUT_CLASS}
                placeholder="Not tracked"
              />
            </Field>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
              <Toggle
                checked={form.inventory.trackQuantity}
                onChange={(checked) => setValue('inventory.trackQuantity', checked)}
                label="Track quantity"
                description="Decrease stock automatically when an order is placed"
              />
              <Toggle
                checked={form.inventory.allowBackorder}
                onChange={(checked) => setValue('inventory.allowBackorder', checked)}
                label="Allow backorder"
                description="Keep selling when the stock reaches zero"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={ImageIcon} title="Images" subtitle={`Up to ${MAX_IMAGES} images`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {form.images.map((image, index) => (
              <div
                key={`${image.url || image.previewUrl}-${index}`}
                className={`relative group rounded-xl overflow-hidden border-2 bg-gray-50 dark:bg-slate-900 aspect-square ${
                  image.isMain ? 'border-blue-500' : 'border-gray-200 dark:border-slate-700'
                }`}
              >
                <img
                  src={image.previewUrl || image.url}
                  alt={image.alt || `Book cover ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {image.isMain && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white">
                    Main
                  </span>
                )}

                {image.isNew && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500 text-white">
                    New
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMainImage(index)}
                      disabled={image.isMain}
                      className="p-1 rounded bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                      title="Set as main image"
                    >
                      <Star className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, -1)}
                      disabled={index === 0}
                      className="p-1 rounded bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                      title="Move earlier"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, 1)}
                      disabled={index === form.images.length - 1}
                      className="p-1 rounded bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                      title="Move later"
                    >
                      <ArrowLeft className="w-3 h-3 rotate-180" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1 rounded bg-red-500 text-white hover:bg-red-600"
                    title="Remove image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {form.images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  handleImageFiles(event.dataTransfer.files)
                }}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/40 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-slate-400 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs font-medium">Add image</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              handleImageFiles(event.target.files)
              event.target.value = ''
            }}
          />

          {errors.images && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{errors.images}</p>}

          {form.images.length > 0 && (
            <div className="mt-4 space-y-2">
              {form.images.map((image, index) => (
                <div key={`alt-${index}`} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400 w-20 shrink-0">
                    Image {index + 1}
                    {image.isMain && <span className="text-blue-600 dark:text-blue-400"> (main)</span>}
                  </span>
                  <input
                    type="text"
                    value={image.alt}
                    onChange={(event) => {
                      const value = event.target.value
                      setIsDirty(true)
                      setForm((prev) => ({
                        ...prev,
                        images: prev.images.map((item, position) =>
                          position === index ? { ...item, alt: value } : item
                        )
                      }))
                    }}
                    className={INPUT_CLASS + ' py-1.5 text-xs'}
                    placeholder="Alt text"
                  />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={Package} title="Organisation" subtitle="Genre, status and visibility">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Field label="Genre" required error={errors.category}>
              <select
                value={form.category}
                onChange={(event) => {
                  setValue('category', event.target.value)
                  clearFieldError('category')
                }}
                className={SELECT_CLASS + ' ' + errorClass(errors.category)}
              >
                <option value="">Select a genre</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status" error={errors.status}>
              <select
                value={form.status}
                onChange={(event) => setValue('status', event.target.value)}
                className={SELECT_CLASS}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Visibility">
              <select
                value={form.visibility}
                onChange={(event) => setValue('visibility', event.target.value)}
                className={SELECT_CLASS}
              >
                {visibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <Toggle
                checked={form.featured}
                onChange={(checked) => setValue('featured', checked)}
                label="Featured book"
                description="Highlight this book in featured sections"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Package} title="Variants" subtitle="Optional option combinations">
          <div className="space-y-4">
            {form.variants.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-slate-400">No variants. Add one only if this book has format options.</p>
            )}

            {form.variants.map((variant, index) => (
              <div key={index} className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Variant {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Remove variant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="Name" required error={errors[`variants.${index}.name`]}>
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(event) => updateVariant(index, 'name', event.target.value)}
                      className={INPUT_CLASS + ' ' + errorClass(errors[`variants.${index}.name`])}
                      placeholder="Size"
                    />
                  </Field>

                  <Field label="Options" hint="Comma separated">
                    <input
                      type="text"
                      value={variant.options}
                      onChange={(event) => updateVariant(index, 'options', event.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Small, Medium"
                    />
                  </Field>

                  <Field label="Price" required error={errors[`variants.${index}.price`]}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={variant.price}
                      onChange={(event) => updateVariant(index, 'price', event.target.value)}
                      className={INPUT_CLASS + ' ' + errorClass(errors[`variants.${index}.price`])}
                    />
                  </Field>

                  <Field label="Variant SKU">
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <Field label="Inventory">
                    <input
                      type="number"
                      min="0"
                      value={variant.inventory}
                      onChange={(event) => updateVariant(index, 'inventory', event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <Field label="Image URL">
                    <input
                      type="text"
                      value={variant.image}
                      onChange={(event) => updateVariant(index, 'image', event.target.value)}
                      className={INPUT_CLASS}
                      placeholder="https://"
                    />
                  </Field>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              <Plus className="w-4 h-4" />
              Add variant
            </button>
          </div>
        </SectionCard>

        <SectionCard icon={Package} title="Shipping and tax" subtitle="Delivery cost and taxation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Field label="Weight">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.weight.value}
                  onChange={(event) => setValue('weight.value', event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="0.00"
                />
                <select
                  value={form.weight.unit}
                  onChange={(event) => setValue('weight.unit', event.target.value)}
                  className={SELECT_CLASS + ' w-28'}
                >
                  {WEIGHT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Dimensions">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.dimensions.length}
                  onChange={(event) => setValue('dimensions.length', event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="L"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.dimensions.width}
                  onChange={(event) => setValue('dimensions.width', event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="W"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.dimensions.height}
                  onChange={(event) => setValue('dimensions.height', event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="H"
                />
                <select
                  value={form.dimensions.unit}
                  onChange={(event) => setValue('dimensions.unit', event.target.value)}
                  className={SELECT_CLASS + ' w-24'}
                >
                  {DIMENSION_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Shipping cost">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.shipping.shippingCost}
                onChange={(event) => setValue('shipping.shippingCost', event.target.value)}
                className={INPUT_CLASS}
                placeholder="0.00"
              />
            </Field>

            <Field label="Shipping weight">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.shipping.shippingWeight}
                onChange={(event) => setValue('shipping.shippingWeight', event.target.value)}
                className={INPUT_CLASS}
                placeholder="0.00"
              />
            </Field>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
              <Toggle
                checked={form.shipping.freeShipping}
                onChange={(checked) => setValue('shipping.freeShipping', checked)}
                label="Free shipping"
                description="Override the calculated shipping cost"
              />
              <Toggle
                checked={form.tax.taxable}
                onChange={(checked) => setValue('tax.taxable', checked)}
                label="Taxable"
                description="Apply the configured tax rate to this book"
              />
            </div>

            <Field label="Tax rate (%)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.tax.taxRate}
                onChange={(event) => setValue('tax.taxRate', event.target.value)}
                className={INPUT_CLASS}
                placeholder="Not set"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={Star} title="Flash sale" subtitle="Time limited discount">
          <div className="space-y-4">
            <Toggle
              checked={form.flashSale.enabled}
              onChange={(checked) => setValue('flashSale.enabled', checked)}
              label="Enable flash sale"
              description="Applies a temporary discount to this book"
            />

            {form.flashSale.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Discount (%)" error={errors['flashSale.discountPercentage']}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.flashSale.discountPercentage}
                    onChange={(event) => setValue('flashSale.discountPercentage', event.target.value)}
                    className={INPUT_CLASS + ' ' + errorClass(errors['flashSale.discountPercentage'])}
                  />
                </Field>

                <Field label="Start date">
                  <input
                    type="datetime-local"
                    value={form.flashSale.startDate}
                    onChange={(event) => setValue('flashSale.startDate', event.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label="End date" error={errors['flashSale.endDate']}>
                  <input
                    type="datetime-local"
                    value={form.flashSale.endDate}
                    onChange={(event) => setValue('flashSale.endDate', event.target.value)}
                    className={INPUT_CLASS + ' ' + errorClass(errors['flashSale.endDate'])}
                  />
                </Field>

                <Field label="Max quantity">
                  <input
                    type="number"
                    min="0"
                    value={form.flashSale.maxQuantity}
                    onChange={(event) => setValue('flashSale.maxQuantity', event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Unlimited"
                  />
                </Field>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={ImageIcon} title="Video and SEO" subtitle="Media and search metadata">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Field label="Video URL" error={errors['video.url']}>
              <input
                type="text"
                value={form.video.url}
                onChange={(event) => {
                  setValue('video.url', event.target.value)
                  clearFieldError('video.url')
                }}
                className={INPUT_CLASS + ' ' + errorClass(errors['video.url'])}
                placeholder="https://"
              />
            </Field>

            <Field label="Video thumbnail URL">
              <input
                type="text"
                value={form.video.thumbnail}
                onChange={(event) => setValue('video.thumbnail', event.target.value)}
                className={INPUT_CLASS}
                placeholder="https://"
              />
            </Field>

            <Field label="SEO title">
              <input
                type="text"
                value={form.seo.title}
                onChange={(event) => setValue('seo.title', event.target.value)}
                className={INPUT_CLASS}
                placeholder="Defaults to the book title"
              />
            </Field>

            <Field label="SEO keywords" hint="Comma separated">
              <input
                type="text"
                value={form.seo.keywords}
                onChange={(event) => setValue('seo.keywords', event.target.value)}
                className={INPUT_CLASS}
                placeholder="cotton, t-shirt"
              />
            </Field>

            <Field label="SEO description" className="lg:col-span-2">
              <textarea
                rows={3}
                value={form.seo.description}
                onChange={(event) => setValue('seo.description', event.target.value)}
                className={INPUT_CLASS}
                placeholder="Defaults to the book description"
              />
            </Field>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-900"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg"
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
      </form>
    </div>
  )
}

export default AdminProductEdit
