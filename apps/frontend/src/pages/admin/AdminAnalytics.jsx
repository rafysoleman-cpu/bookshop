import { useState } from 'react'
import {
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  BookOpen
} from 'lucide-react'
import { useQuery } from 'react-query'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState('30')

  const { data: analyticsData, isLoading } = useQuery(
    ['adminAnalytics', timeRange],
    () => adminAPI.getAnalytics({ period: parseInt(timeRange, 10) }),
    { staleTime: 5 * 60 * 1000 }
  )

  const analytics = analyticsData?.data?.data

  const timeRanges = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
    { value: '365', label: 'Last year' }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0)
  }

  const formatDate = (value) => {
    if (!value) return ''
    const date = new Date(`${value}T00:00:00`)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) return <LoadingSpinner />

  const salesData = analytics?.salesData || []
  const userRegistrations = analytics?.userRegistrations || []
  const topBooks = analytics?.topBooks || []

  const maxRevenue = Math.max(...salesData.map((day) => day.revenue || 0), 1)
  const maxRegistrations = Math.max(...userRegistrations.map((day) => day.users || 0), 1)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Analytics</h1>
          <p className="text-gray-600 dark:text-slate-400">Book sales and store performance</p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="input min-w-[160px]"
        >
          {timeRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 dark:bg-success-900/40 rounded-lg">
              <DollarSign className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {formatCurrency(analytics?.totalRevenue || 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Revenue</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {formatNumber(analytics?.totalOrders || 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Paid Orders</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-warning-100 dark:bg-warning-900/40 rounded-lg">
              <Users className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {formatNumber(analytics?.newUsers || 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">New Users</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {formatNumber(analytics?.totalUsers || 0)} total
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
              <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            {formatNumber(analytics?.totalProducts || 0)}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">Total Books</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Sales Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">Sales Trend</h2>

          {salesData.length > 0 ? (
            <div className="space-y-4">
              {salesData.map((day) => (
                <div key={day._id} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-gray-600 dark:text-slate-400">
                    {formatDate(day._id)}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary-600 h-3 rounded-full"
                      style={{ width: `${Math.max(2, ((day.revenue || 0) / maxRevenue) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-sm font-medium text-gray-900 dark:text-slate-100">
                    {formatCurrency(day.revenue)}
                  </span>
                  <span className="w-20 text-right text-sm text-gray-600 dark:text-slate-400">
                    {formatNumber(day.orders)} orders
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-slate-400">No paid orders in this period</p>
            </div>
          )}
        </div>

        {/* Top Books */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">Top Books</h2>

          {topBooks.length > 0 ? (
            <div className="space-y-4">
              {topBooks.slice(0, 8).map((book, index) => (
                <div key={book._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{book.name}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                      {book.author || 'Unknown author'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {formatCurrency(book.price)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {formatNumber(book.soldCount)} sold
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-slate-400">No sales data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* User Growth */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">User Growth</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Avg. order value {formatCurrency(analytics?.averageOrderValue || 0)}
          </p>
        </div>

        {userRegistrations.length > 0 ? (
          <div className="space-y-4">
            {userRegistrations.map((day) => (
              <div key={day._id} className="flex items-center gap-4">
                <span className="w-16 text-sm text-gray-600 dark:text-slate-400">
                  {formatDate(day._id)}
                </span>
                <div className="flex-1 bg-gray-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-success-600 h-3 rounded-full"
                    style={{ width: `${Math.max(2, ((day.users || 0) / maxRegistrations) * 100)}%` }}
                  />
                </div>
                <span className="w-24 text-right text-sm font-medium text-gray-900 dark:text-slate-100">
                  {formatNumber(day.users)} new
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400">No new registrations in this period</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAnalytics
