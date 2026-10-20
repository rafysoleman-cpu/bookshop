import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Package, 
  Calendar, 
  Truck, 
  CheckCircle, 
  MapPin, 
  User, 
  Phone,
  Mail,
  CreditCard,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { orderAPI, reviewAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ReviewForm from '../components/ReviewForm'
import toast from 'react-hot-toast'

const OrderDetailPage = () => {
  const { id } = useParams()
  const [showReviewForm, setShowReviewForm] = useState(false)
  const queryClient = useQueryClient()

  // Fetch order details
  const { data: orderData, isLoading } = useQuery(
    ['order', id],
    () => orderAPI.getOrder(id),
    { staleTime: 30 * 1000 }
  )

  // Cancel order mutation
  const cancelOrderMutation = useMutation(
    ({ id, reason }) => orderAPI.cancelOrder(id, reason),
    {
      onSuccess: () => {
        toast.success('Order cancelled successfully!')
        queryClient.invalidateQueries(['order', id])
        queryClient.invalidateQueries('orders')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to cancel order')
      }
    }
  )

  const order = orderData?.data?.data

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Package className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
      case 'paid':
        return <CheckCircle className="w-6 h-6 text-blue-500 dark:text-blue-400" />
      case 'processing':
        return <Package className="w-6 h-6 text-purple-500 dark:text-purple-400" />
      case 'shipped':
        return <Truck className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
      case 'delivered':
        return <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />
      case 'cancelled':
        return <RefreshCw className="w-6 h-6 text-red-500 dark:text-red-400" />
      default:
        return <Package className="w-6 h-6 text-gray-500 dark:text-slate-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800'
      case 'paid':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
      case 'processing':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
      case 'shipped':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
      case 'delivered':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800'
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
      default:
        return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCancelOrder = () => {
    const reason = prompt('Please provide a reason for cancellation:')
    if (reason) {
      cancelOrderMutation.mutate({ id, reason })
    }
  }

  const canCancel = () => {
    return order?.status === 'pending' || order?.status === 'paid'
  }

  const canReview = () => {
    return order?.status === 'delivered'
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Order not found</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">The order you're looking for doesn't exist.</p>
        <Link to="/orders" className="btn-primary">
          Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/orders" className="btn-outline inline-flex items-center space-x-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              Order #{order.orderNumber}
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          
          <div className={`px-4 py-2 rounded-lg border ${getStatusColor(order.status)}`}>
            <div className="flex items-center space-x-2">
              {getStatusIcon(order.status)}
              <span className="font-medium">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Order Items</h2>
            
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 pb-4 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.product.images?.[0]?.url || '/placeholder.svg'}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">
                      {item.product.name}
                    </h3>
                    {item.variant && (
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        {item.variant.name}: {item.variant.option}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      ${item.price.toFixed(2)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Information */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Shipping Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 dark:text-slate-500 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-slate-100">Shipping Address</h3>
                  <div className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                    <p>{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.phone}</p>
                    <p>{order.shippingAddress.address}</p>
                    <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
              </div>

              {order.trackingNumber && (
                <div className="flex items-start space-x-3">
                  <Truck className="w-5 h-5 text-gray-400 dark:text-slate-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">Tracking Information</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Tracking Number: {order.trackingNumber}
                    </p>
                    {order.estimatedDelivery && (
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        Estimated Delivery: {formatDate(order.estimatedDelivery)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Payment Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CreditCard className="w-5 h-5 text-gray-400 dark:text-slate-500 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-slate-100">Payment Method</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 capitalize">
                    {order.paymentMethod.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Status: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </p>
                </div>
              </div>

              {order.transactionId && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-slate-100">Transaction ID</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{order.transactionId}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Subtotal</span>
                <span className="font-medium">${order.subtotal.toFixed(2)}</span>
              </div>
              
              {order.discount > 0 && (
                <div className="flex justify-between text-success-600 dark:text-success-400">
                  <span>Discount</span>
                  <span className="font-medium">-${order.discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Tax</span>
                <span className="font-medium">${order.tax.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Shipping</span>
                <span className="font-medium">
                  {order.shipping === 0 ? 'Free' : `$${order.shipping.toFixed(2)}`}
                </span>
              </div>
              
              <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-slate-100">Total</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Actions</h2>
            
            <div className="space-y-3">
              {canCancel() && (
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelOrderMutation.isLoading}
                  className="w-full btn-outline flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{cancelOrderMutation.isLoading ? 'Cancelling...' : 'Cancel Order'}</span>
                </button>
              )}
              
              {canReview() && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="w-full btn-primary"
                >
                  Write Review
                </button>
              )}
            </div>
          </div>

          {/* Customer Support */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Need Help?</h2>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Email Support</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">support@bookshop.local</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Phone Support</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">+1-234-567-8900</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Write a Review</h2>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400"
                >
                  ×
                </button>
              </div>
              
              {order.items.map((item) => (
                <ReviewForm
                  key={item.product._id}
                  productId={item.product._id}
                  orderId={order._id}
                  onSubmit={() => {
                    setShowReviewForm(false)
                    queryClient.invalidateQueries(['productReviews', item.product._id])
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetailPage
