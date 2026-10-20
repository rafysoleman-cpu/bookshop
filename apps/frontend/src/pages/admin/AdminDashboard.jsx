import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  ShoppingCart, 
  Package, 
  DollarSign,
  AlertCircle,
  Home,
  BookOpen
} from 'lucide-react'
import { useQuery } from 'react-query'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'

const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d')

  // Fetch admin dashboard stats
  const { data: dashboardData, isLoading } = useQuery(
    ['adminDashboard', timeRange],
    () => adminAPI.getDashboard({ timeRange }),
    { staleTime: 5 * 60 * 1000 }
  )

  const dashboard = dashboardData?.data?.data

  const timeRanges = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-slate-400">Platform overview and management</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Home Button */}
          <Link 
            to="/"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Go Home</span>
            <span className="sm:hidden">Home</span>
          </Link>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input min-w-[140px] w-full sm:w-auto"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 dark:bg-success-900/40 rounded-lg">
              <DollarSign className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <span className="text-sm text-success-600 dark:text-success-400 font-medium">
              +{dashboard?.revenueChange || 0}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {formatCurrency(dashboard?.stats?.revenue?.total || 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Total Revenue</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
              <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
              +{dashboard?.stats?.users?.change || 0}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {formatNumber(dashboard?.stats?.users?.total || 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Total Users</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-warning-100 dark:bg-warning-900/40 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
            <span className="text-sm text-warning-600 dark:text-warning-400 font-medium">
              {formatNumber(dashboard?.stats?.orders?.pending || 0)} pending
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {formatNumber(dashboard?.stats?.orders?.total || 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Total Orders</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
              <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              {formatNumber(dashboard?.stats?.products?.active || 0)} active
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {formatNumber(dashboard?.stats?.products?.total || 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Total Books</p>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Orders</h2>
              <Link 
                to="/admin/orders"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {dashboard?.recentOrders?.length > 0 ? (
              <div className="space-y-4">
                {dashboard.recentOrders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-800 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                        #{order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                        {order.user?.name || 'Guest'}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-slate-400">No recent orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Books */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Top Books</h2>
              <Link 
                to="/admin/products"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {dashboard?.topProducts?.length > 0 ? (
              <div className="space-y-4">
                {dashboard.topProducts.slice(0, 5).map((product) => (
                  <div key={product._id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-800 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                        {product.author || 'Unknown author'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {formatCurrency(product.price || 0)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        {product.soldCount || 0} sold
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-slate-400">No book sales yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link 
          to="/admin/users"
          className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/40 rounded-lg group-hover:bg-primary-200 transition-colors">
              <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                Manage Users
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                View and manage all users
              </p>
            </div>
          </div>
        </Link>

        <Link 
          to="/admin/categories"
          className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-warning-100 dark:bg-warning-900/40 rounded-lg group-hover:bg-warning-200 transition-colors">
              <BookOpen className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-warning-600 dark:group-hover:text-warning-400 transition-colors">
                Manage Genres
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Organize book categories
              </p>
            </div>
          </div>
        </Link>

        <Link 
          to="/admin/products"
          className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg group-hover:bg-indigo-200 transition-colors">
              <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Manage Books
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Review and manage books
              </p>
            </div>
          </div>
        </Link>

        <Link 
          to="/admin/orders"
          className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-success-100 dark:bg-success-900/40 rounded-lg group-hover:bg-success-200 transition-colors">
              <ShoppingCart className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-success-600 dark:group-hover:text-success-400 transition-colors">
                Manage Orders
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                View and manage orders
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* System Alerts */}
      {dashboard?.alerts?.length > 0 && (
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">System Alerts</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {dashboard.alerts.map((alert, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-error-50 dark:bg-error-950/40 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-error-900 dark:text-error-300">{alert.title}</p>
                    <p className="text-sm text-error-700 dark:text-error-300">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
