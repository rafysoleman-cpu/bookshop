import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Folder, 
  Edit, 
  Trash2, 
  Plus,
  MoreHorizontal,
  Package,
  RefreshCw,
  CheckSquare,
  Square,
  Eye,
  AlertCircle,
  CheckCircle2,
  Info,
  Grid3X3,
  List
} from 'lucide-react'
import { useQuery, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { invalidateCatalog } from '../../utils/queryKeys'
import LoadingSpinner from '../../components/LoadingSpinner'
import Pagination from '../../components/Pagination'
import toast from 'react-hot-toast'

const AdminCategories = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [viewMode, setViewMode] = useState('grid') // grid or list
  const [isRefreshing, setIsRefreshing] = useState(false)

  const queryClient = useQueryClient()

  const { data: categoriesData, isLoading, refetch } = useQuery(
    ['adminCategories', currentPage, searchQuery, statusFilter],
    () => adminAPI.getCategories(),
    { staleTime: 30 * 1000 }
  )

  const categories = Array.isArray(categoriesData?.data?.data) ? categoriesData.data.data : []
  const pagination = categoriesData?.data?.pagination

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
      case 'inactive': return 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
      default: return 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      case 'inactive': return <AlertCircle className="w-4 h-4 text-gray-500 dark:text-slate-400" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500 dark:text-slate-400" />
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) return
    
    if (window.confirm(`Are you sure you want to delete ${selectedCategories.length} categories?`)) {
      try {
        await adminAPI.bulkDeleteCategories(selectedCategories)
        setSelectedCategories([])
        // Invalidate cache to refresh the list
    invalidateCatalog(queryClient)
    queryClient.invalidateQueries('adminCategories')
    queryClient.invalidateQueries('adminCategoriesForProduct')
        toast.success(`${selectedCategories.length} categories deleted successfully!`, {
          icon: <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />,
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: '12px',
            fontWeight: '500',
            padding: '12px 20px'
          }
        })
      } catch (error) {
        console.error('Bulk delete failed:', error)
        toast.error('Failed to delete categories. Please try again.', {
          icon: <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
        })
      }
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Invalidate cache to refresh the list
      queryClient.invalidateQueries('adminCategories')
      queryClient.invalidateQueries('adminCategoriesForProduct')
      toast.success('Categories refreshed!', {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />,
        style: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          borderRadius: '12px',
          fontWeight: '500',
          padding: '12px 20px'
        }
      })
    } catch (error) {
      console.error('Refresh failed:', error)
      toast.error('Failed to refresh categories', {
        icon: <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle category selection
  const handleCategorySelect = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([])
    } else {
      setSelectedCategories(categories.map(cat => cat._id))
    }
  }

  // Calculate stats
  const stats = {
    total: categories.length,
    active: categories.filter(cat => cat.status === 'active').length,
    inactive: categories.filter(cat => cat.status === 'inactive').length,
    withProducts: categories.filter(cat => cat.productCount > 0).length
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Genre Management
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage the genres used to organize books</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>{categories.length} Genres</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {stats.total}
            </h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm">All Genres</p>
          </div>

          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {stats.active}
            </h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm">Active Genres</p>
          </div>

          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Books</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0)}
            </h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm">Total Books</p>
          </div>

        </div>

        {/* Actions Bar */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Left Section - Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search genres..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-slate-100"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center space-x-3">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 bg-gray-100 dark:bg-slate-800/70 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 rounded-xl transition-all duration-200 group relative"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* New Genre Button */}
              <Link 
                to="/admin/categories/new"
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                <span>New Genre</span>
              </Link>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedCategories.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {selectedCategories.length} genres selected
                  </span>
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    Clear selection
                  </button>
                </div>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Categories Display */}
        {categories.length === 0 ? (
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-gray-100 dark:bg-slate-800/70 rounded-full">
                <Folder className="w-12 h-12 text-gray-400 dark:text-slate-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">No genres found</h3>
                <p className="text-gray-600 dark:text-slate-400 mb-6">
                  {searchQuery || statusFilter 
                    ? 'Try adjusting your filters or search terms.' 
                    : 'Get started by creating your first category.'}
                </p>
                <Link 
                  to="/admin/categories/new"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Genre</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-gray-900/5 dark:shadow-black/40 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
                  >
                    {selectedCategories.length === categories.length ? (
                      <Square className="w-4 h-4" />
                    ) : (
                      <CheckSquare className="w-4 h-4" />
                    )}
                    <span>Select All</span>
                  </button>
                  <span className="text-gray-400 dark:text-slate-500">|</span>
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Showing {categories.length} categories
                  </span>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-slate-800/70 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'grid' 
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'list' 
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categories.map((category) => (
                    <div
                      key={category._id}
                      className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-3 left-3 z-10">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category._id)}
                          onChange={() => handleCategorySelect(category._id)}
                          className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                        />
                      </div>

                      {/* Category Image */}
                      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Folder className="w-12 h-12 text-gray-400 dark:text-slate-500" />
                        )}
                      </div>

                      {/* Category Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                            {category.name}
                          </h3>
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(category.status)}`}>
                            {getStatusIcon(category.status)}
                            <span>{category.status}</span>
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2">
                          {category.description || 'No description available'}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Package className="w-3 h-3" />
                              <span>{category.productCount || 0}</span>
                            </span>
                            {category.parent && (
                              <span className="flex items-center space-x-1">
                                <Folder className="w-3 h-3" />
                                <span>{category.parent.name}</span>
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Link
                              to={`/admin/categories/${category._id}/edit`}
                              className="p-1.5 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                            </Link>
                            <button
                              onClick={() => handleCategorySelect(category._id)}
                              className="p-1.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedCategories.length === categories.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Genre</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Products</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Parent</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {categories.map((category) => (
                      <tr key={category._id} className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category._id)}
                            onChange={() => handleCategorySelect(category._id)}
                            className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt={category.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800/70 rounded-lg flex items-center justify-center">
                                <Folder className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-slate-100">{category.name}</div>
                              <div className="text-sm text-gray-500 dark:text-slate-400">{category.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(category.status)}`}>
                            {getStatusIcon(category.status)}
                            <span>{category.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                          {category.productCount || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                          {category.parent ? category.parent.name : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/admin/categories/${category._id}/edit`}
                              className="p-1.5 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleCategorySelect(category._id)}
                              className="p-1.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.pages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminCategories

