import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  Calendar, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Filter,
  ChevronDown
} from 'lucide-react'
import { useQuery } from 'react-query'
import { orderAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'

const OrdersPage = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery(
    ['orders', currentPage, statusFilter],
    () => {
      const params = { page: currentPage }
      if (statusFilter) params.status = statusFilter
      return orderAPI.getOrders(params)
    },
    { staleTime: 30 * 1000 }
  )

  const orders = ordersData?.data?.orders || []
  const pagination = ordersData?.data?.pagination

  const statusOptions = [
    { value: '', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-blue-500 dark:text-blue-400" />
      case 'processing':
        return <Package className="w-5 h-5 text-purple-500 dark:text-purple-400" />
      case 'shipped':
        return <Truck className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
      default:
        return <Package className="w-5 h-5 text-gray-500 dark:text-slate-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40'
      case 'paid':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
      case 'processing':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40'
      case 'shipped':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
      case 'delivered':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40'
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
      default:
        return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo(0, 0)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">My Orders</h1>
        <p className="text-gray-600 dark:text-slate-400">Track and manage your orders</p>
      </div>

      <div className="flex gap-8">
        {/* Filters Sidebar */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">Filters</h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Order Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full input"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Orders List */}
        <main className="flex-1">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {statusFilter && (
                <span className="badge-primary ml-2">{statusFilter}</span>
              )}
            </button>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-6">
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                            Order #{order.orderNumber}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                          ${order.total.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-4">
                      <div className="space-y-3">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={item.product.images?.[0]?.url || '/placeholder.svg'}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-slate-100 line-clamp-1">
                                {item.product.name}
                              </h4>
                              {item.variant && (
                                <p className="text-sm text-gray-600 dark:text-slate-400">
                                  {item.variant.name}: {item.variant.option}
                                </p>
                              )}
                              <p className="text-sm text-gray-600 dark:text-slate-400">
                                Qty: {item.quantity} × ${item.price.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                ${(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {order.items.length > 3 && (
                          <div className="text-center text-sm text-gray-600 dark:text-slate-400">
                            +{order.items.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Status Timeline */}
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(order.status)}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            {order.status === 'pending' && 'Order is being processed'}
                            {order.status === 'paid' && 'Payment confirmed'}
                            {order.status === 'processing' && 'Order is being prepared'}
                            {order.status === 'shipped' && 'Order is on the way'}
                            {order.status === 'delivered' && 'Order has been delivered'}
                            {order.status === 'cancelled' && 'Order was cancelled'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                      <div className="flex space-x-3">
                        <Link
                          to={`/orders/${order._id}`}
                          className="btn-outline flex items-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </Link>
                        
                        {order.status === 'delivered' && (
                          <button className="btn-outline">
                            Write Review
                          </button>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-slate-400">
                        {order.trackingNumber && (
                          <p>Tracking: {order.trackingNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
                No orders found
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-8">
                {statusFilter 
                  ? `No ${statusFilter} orders found.`
                  : "You haven't placed any orders yet."
                }
              </p>
              <Link to="/products" className="btn-primary">
                Start Shopping
              </Link>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-8">
              <Pagination 
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default OrdersPage
