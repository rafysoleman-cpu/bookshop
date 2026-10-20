import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Save,
  Upload,
  X,
  Folder,
  Info,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { invalidateCatalog } from '../../utils/queryKeys'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminCategoryNew = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    status: 'active',
    image: null
  })
  const [previewImage, setPreviewImage] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: categoriesData } = useQuery(
    'adminCategoriesForParent',
    () => adminAPI.getCategories({ page: 1, limit: 100 }),
    { staleTime: 30 * 1000 }
  )

  const categories = categoriesData?.data?.data || []

  const createCategoryMutation = useMutation(
    adminAPI.createCategory,
    {
      onSuccess: (data) => {
        console.log('Genre created successfully:', data)
        // Invalidate categories cache to refresh the list immediately
        invalidateCatalog(queryClient)
        queryClient.invalidateQueries('adminCategories')
        queryClient.invalidateQueries('adminCategoriesForProduct')
        // Also refetch immediately to ensure fresh data
        queryClient.refetchQueries('adminCategories')
        queryClient.refetchQueries('adminCategoriesForProduct')
        toast.success('Genre created successfully!', {
          icon: <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />,
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '12px',
            fontWeight: '500',
            padding: '12px 20px'
          }
        })
        navigate('/admin/categories')
      },
      onError: (error) => {
        console.error('Category creation error:', error)
        setIsSubmitting(false)
        if (error.response?.data?.error?.includes('duplicate key')) {
          setErrors({ slug: 'This URL slug is already taken. Please use a different name.' })
          toast.error('Genre with this name already exists', {
            icon: <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />,
            style: {
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '12px',
              fontWeight: '500'
            }
          })
        } else {
          setErrors(error.response?.data?.errors || {})
          toast.error('Failed to create genre', {
            icon: <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          })
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
        .replace(/-+/g, '-')
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
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formDataToSubmit = new FormData()
    
    Object.keys(formData).forEach(key => {
      if (key === 'image') {
        if (formData[key] instanceof File) {
          formDataToSubmit.append(key, formData[key])
        }
      } else if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
        formDataToSubmit.append(key, formData[key])
      }
    })

    createCategoryMutation.mutate(formDataToSubmit)
  }

  if (createCategoryMutation.isLoading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/categories')}
                className="group relative inline-flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="font-medium">Back to Genres</span>
              </button>
              
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
              
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Create New Genre
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Add a new genre to organize your books</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Draft</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Card */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Folder className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Basic Information</h2>
                  <p className="text-blue-100 text-sm mt-0.5">Essential details about your genre</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <span>Genre Name</span>
                    <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500`}
                      placeholder="Enter genre name"
                      required
                    />
                    {errors.name && (
                      <div className="absolute right-3 top-3.5">
                        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                      </div>
                    )}
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <span>URL Slug</span>
                    <span className="text-red-500 dark:text-red-400">*</span>
                    <div className="group relative">
                      <Info className="w-4 h-4 text-gray-400 dark:text-slate-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        This will be used in the URL
                      </div>
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border ${errors.slug ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 font-mono text-sm`}
                      placeholder="genre-url-slug"
                      required
                    />
                    {errors.slug && (
                      <div className="absolute right-3 top-3.5">
                        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                      </div>
                    )}
                  </div>
                  {errors.slug && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.slug}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  <span>Description</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 dark:text-slate-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      Optional: Describe this genre
                    </div>
                  </div>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 resize-none"
                  placeholder="Describe this genre..."
                />
              </div>
            </div>
          </div>

          {/* Genre Settings Card */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Folder className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Genre Settings</h2>
                  <p className="text-purple-100 text-sm mt-0.5">Configure hierarchy and visibility</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <span>Parent Genre</span>
                    <div className="group relative">
                      <Info className="w-4 h-4 text-gray-400 dark:text-slate-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        Optional: Create subgenre
                      </div>
                    </div>
                  </label>
                  <select
                    name="parentId"
                    value={formData.parentId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-slate-100"
                  >
                    <option value="">None (Root Genre)</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <span>Status</span>
                    <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-slate-100"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Genre Image Card */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-8 py-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Genre Image</h2>
                  <p className="text-green-100 text-sm mt-0.5">Upload a visual representation</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8 space-y-6 lg:space-y-0">
                <div className="flex-1 lg:max-w-md">
                  <div className="relative group">
                    <input
                      type="file"
                      id="category-image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="category-image"
                      className="block w-full cursor-pointer"
                    >
                      <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-400 rounded-2xl p-12 text-center transition-all duration-300 group-hover:border-blue-400 group-hover:bg-blue-50/50 dark:bg-blue-950/50">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-full group-hover:bg-blue-200 transition-colors">
                            <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-gray-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Click to upload image
                            </p>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                              PNG, JPG, GIF up to 5MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                    {errors.image && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 mt-3">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.image}</span>
                      </p>
                    )}
                  </div>
                </div>

                {previewImage && (
                  <div className="relative group">
                    <div className="relative overflow-hidden rounded-2xl shadow-lg ring-4 ring-white/50">
                      <img
                        src={previewImage}
                        alt="Genre preview"
                        className="w-32 h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transform hover:scale-110 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Preview
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                onClick={() => navigate('/admin/categories')}
                className="px-8 py-3.5 bg-gray-100 dark:bg-slate-800/70 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Create Genre</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminCategoryNew

