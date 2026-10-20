import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft,
  Save,
  Upload,
  X,
  Folder
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { invalidateCatalog } from '../../utils/queryKeys'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminCategoryEdit = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    status: 'active',
    image: null
  })
  const [previewImage, setPreviewImage] = useState(null)
  const [existingImage, setExistingImage] = useState(null)
  const [errors, setErrors] = useState({})
  const queryClient = useQueryClient()

  const { data: categoriesData } = useQuery(
    'adminCategoriesForParent',
    () => adminAPI.getCategories({ page: 1, limit: 100 }),
    { staleTime: 30 * 1000 }
  )

  const { data: categoryData, isLoading: categoryLoading } = useQuery(
    ['adminCategory', id],
    () => adminAPI.getCategories().then(res => {
      const categories = res.data.data || []
      const category = categories.find(cat => cat._id === id)
      if (!category) {
        throw new Error('Genre not found')
      }
      return category
    }),
    {
      enabled: !!id,
      onSuccess: (category) => {
        setFormData({
          name: category.name || '',
          slug: category.slug || '',
          description: category.description || '',
          parentId: category.parent?._id || '',
          status: category.status || 'active',
          image: null
        })
        setExistingImage(category.image)
        setPreviewImage(category.image)
      },
      onError: () => {
        toast.error('Genre not found')
        navigate('/admin/categories')
      }
    }
  )

  const categories = categoriesData?.data?.data || []

  const updateCategoryMutation = useMutation(
    ({ id, data }) => adminAPI.updateCategory(id, data),
    {
      onSuccess: (data) => {
        console.log('Genre updated successfully:', data)
        // This handler previously invalidated nothing at all, so both the admin
        // list and the storefront nav kept showing the pre-edit name/slug until
        // a manual refresh.
        invalidateCatalog(queryClient)
        queryClient.invalidateQueries('adminCategories')
        queryClient.invalidateQueries('adminCategoriesForProduct')
        queryClient.refetchQueries('adminCategories')
        toast.success('Genre updated successfully!')
        navigate('/admin/categories')
      },
      onError: (error) => {
        console.error('Category update error:', error)
        if (error.response?.data?.error?.includes('duplicate key')) {
          setErrors({ slug: 'This URL slug is already taken. Please use a different name.' })
          toast.error('Genre with this name already exists')
        } else {
          setErrors(error.response?.data?.errors || {})
          toast.error('Failed to update genre')
        }
      }
    }
  )

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Auto-generate slug from name
    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .replace(/-+/g, '-') // Replace multiple dashes with single dash
      setFormData(prev => ({
        ...prev,
        slug
      }))
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Image size should be less than 5MB'
        }))
        return
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }))

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }))
    setPreviewImage(null)
    setExistingImage(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    console.log('Form data before submission:', formData)
    
    const formDataToSubmit = new FormData()
    
    // Only append fields that have values
    Object.keys(formData).forEach(key => {
      if (key === 'image') {
        // Only append image if a new file is selected
        if (formData[key] instanceof File) {
          console.log('Appending new image file:', formData[key])
          formDataToSubmit.append(key, formData[key])
        } else {
          console.log('Keeping existing image - no new file selected')
        }
      } else if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
        console.log(`Appending ${key}:`, formData[key])
        formDataToSubmit.append(key, formData[key])
      }
    })

    // Log FormData contents for debugging
    console.log('FormData contents:')
    for (let [key, value] of formDataToSubmit.entries()) {
      console.log(`${key}:`, value)
    }

    updateCategoryMutation.mutate({ id, data: formDataToSubmit })
  }

  if (categoryLoading) return <LoadingSpinner />

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/categories')}
          className="flex items-center text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Genres
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Edit Genre</h1>
        <p className="text-gray-600 dark:text-slate-400">Update genre information</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 lg:p-8">
          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Genre Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`input ${errors.name ? 'border-error-500' : ''}`}
                  placeholder="Enter genre name"
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  URL Slug *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className={`input ${errors.slug ? 'border-error-500' : ''}`}
                  placeholder="genre-url-slug"
                  required
                />
                {errors.slug && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.slug}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="input"
                placeholder="Describe this genre..."
              />
            </div>
          </div>

          {/* Genre Settings */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Genre Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Parent Genre
                </label>
                <select
                  name="parentId"
                  value={formData.parentId}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="">None (Root Genre)</option>
                  {categories
                    .filter(cat => cat._id !== id) // Exclude self from parent options
                    .map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Genre Image */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Genre Image</h2>
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8 space-y-6 lg:space-y-0">
              <div className="flex-1 lg:max-w-md">
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-slate-500 transition-colors">
                  <input
                    type="file"
                    id="category-image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="category-image"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 dark:text-slate-500 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">
                      Click to upload new image
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      PNG, JPG, GIF up to 5MB
                    </span>
                  </label>
                </div>
                {errors.image && (
                  <p className="mt-2 text-sm text-error-600 dark:text-error-400">{errors.image}</p>
                )}
              </div>

              {(previewImage || existingImage) && (
                <div className="relative">
                  <img
                    src={previewImage || existingImage}
                    alt="Genre preview"
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 hover:bg-error-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-6 lg:pt-8 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => navigate('/admin/categories')}
              className="btn-secondary"
              disabled={updateCategoryMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateCategoryMutation.isLoading}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{updateCategoryMutation.isLoading ? 'Updating...' : 'Update Genre'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AdminCategoryEdit

