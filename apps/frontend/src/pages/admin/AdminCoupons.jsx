import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Tag, 
  Edit, 
  Trash2, 
  Plus,
  MoreHorizontal,
  Calendar,
  Percent,
  DollarSign
} from 'lucide-react'
import { useQuery } from 'react-query'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import Pagination from '../../components/Pagination'

const AdminCoupons = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data: couponsData, isLoading } = useQuery(
    ['adminCoupons', currentPage, searchQuery, statusFilter, typeFilter],
    () => adminAPI.getCoupons({
      page: currentPage,
      search: searchQuery,
      status: statusFilter,
      type: typeFilter
    }),
    { staleTime: 30 * 1000 }
  )

  const coupons = couponsData?.data?.coupons || []
  const pagination = couponsData?.data?.pagination

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'expired', label: 'Expired' },
    { value: 'scheduled', label: 'Scheduled' }
  ]

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'fixed', label: 'Fixed Amount' },
    { value: 'free_shipping', label: 'Free Shipping' }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/40'
      case 'inactive': return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
      case 'expired': return 'text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-950/40'
      case 'scheduled': return 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/40'
      default: return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'percentage': return 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40'
      case 'fixed': return 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/40'
      case 'free_shipping': return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
      default: return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />
      case 'fixed': return <DollarSign className="w-4 h-4" />
      case 'free_shipping': return <Tag className="w-4 h-4" />
      default: return <Tag className="w-4 h-4" />
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpired = (endDate) => {
    return new Date(endDate) < new Date()
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Manage Coupons</h1>
          <p className="text-gray-600 dark:text-slate-400">{coupons.length} coupons</p>
        </div>
        
        <Link 
          to="/admin/coupons/new"
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Coupon</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupons..."
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
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Coupons Table */}
      {coupons.length > 0 ? (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Coupon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Valid Period
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
                  {coupons.map((coupon) => {
                    const expired = isExpired(coupon.endDate)
                    const currentStatus = expired ? 'expired' : coupon.status
                    
                    return (
                      <tr key={coupon._id} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden flex items-center justify-center">
                              <Tag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                {coupon.code}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-slate-400">
                                {coupon.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getTypeColor(coupon.type)}`}>
                            {getTypeIcon(coupon.type)}
                            <span>{coupon.type.replace('_', ' ').charAt(0).toUpperCase() + coupon.type.replace('_', ' ').slice(1)}</span>
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                          {coupon.type === 'percentage' ? (
                            `${coupon.value}%`
                          ) : coupon.type === 'fixed' ? (
                            `$${coupon.value}`
                          ) : (
                            'Free Shipping'
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                          <div className="space-y-1">
                            <div>
                              {coupon.usedCount || 0} / {coupon.usageLimit || '∞'}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-primary-600 h-2 rounded-full" 
                                style={{
                                  width: `${coupon.usageLimit ? Math.min((coupon.usedCount || 0) / coupon.usageLimit * 100, 100) : 0}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {formatDate(coupon.startDate)} - {formatDate(coupon.endDate)}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                            {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/admin/coupons/${coupon._id}/edit`}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            
                            <button className="text-error-600 dark:text-error-400 hover:text-error-900 dark:hover:text-error-300">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
          <Tag className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">No coupons found</h3>
          <p className="text-gray-600 dark:text-slate-400 mb-8">
            Try adjusting your filters or create your first coupon.
          </p>
          <Link 
            to="/admin/coupons/new"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </Link>
        </div>
      )}

      {/* Coupon Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
              <Tag className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
              Total
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {coupons.length}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Coupons</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 dark:bg-success-900/40 rounded-lg">
              <Percent className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <span className="text-sm text-success-600 dark:text-success-400 font-medium">
              Active
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {coupons.filter(c => c.status === 'active' && !isExpired(c.endDate)).length}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Active Coupons</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-error-100 dark:bg-error-900/40 rounded-lg">
              <Calendar className="w-6 h-6 text-error-600 dark:text-error-400" />
            </div>
            <span className="text-sm text-error-600 dark:text-error-400 font-medium">
              Expired
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {coupons.filter(c => isExpired(c.endDate)).length}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Expired Coupons</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
              <DollarSign className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              Used
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Total Uses</p>
        </div>
      </div>
    </div>
  )
}

export default AdminCoupons
