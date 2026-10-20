import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Truck, 
  Shield, 
  ChevronRight, 
  Plus,
  Minus,
  MapPin,
  User,
  Phone,
  Mail
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { orderAPI, userAPI, cartAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { subtotal, itemCount } = useCartStore()
  const queryClient = useQueryClient()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    isDefault: false
  })
  const [billingAddress, setBillingAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    isDefault: false
  })
  const [sameAsShipping, setSameAsShipping] = useState(true)
  const [paymentMethod] = useState('cash_on_delivery')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [discount, setDiscount] = useState(0)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout')
    }
  }, [isAuthenticated, navigate])

  // Fetch user addresses
  const { data: addressesData } = useQuery(
    'userAddresses',
    userAPI.getAddresses,
    { enabled: isAuthenticated, staleTime: 5 * 60 * 1000 }
  )

  // Fetch cart
  const { data: cartData } = useQuery(
    'cart',
    cartAPI.getCart,
    { enabled: isAuthenticated, staleTime: 30 * 1000 }
  )

  // Create order mutation
  const createOrderMutation = useMutation(
    orderAPI.createOrder,
    {
      onSuccess: (data) => {
        toast.success('Order created successfully!')
        queryClient.invalidateQueries('cart')
        
        navigate(`/orders/${data.data.data._id}`)
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create order')
      }
    }
  )

  const cartItems = cartData?.data?.items || []
  const addresses = addressesData?.data || []

  // Set default address if available
  useEffect(() => {
    const defaultAddress = addresses.find(addr => addr.isDefault)
    if (defaultAddress) {
      setShippingAddress({
        name: defaultAddress.name,
        phone: defaultAddress.phone,
        address: defaultAddress.address,
        city: defaultAddress.city,
        postalCode: defaultAddress.postalCode,
        country: defaultAddress.country,
        isDefault: defaultAddress.isDefault
      })
    }
  }, [addresses])

  const handleAddressChange = (field, value) => {
    setShippingAddress(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBillingAddressChange = (field, value) => {
    setBillingAddress(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const calculateTax = () => {
    return (subtotal || 0) * 0.15 // 15% tax
  }

  const calculateShipping = () => {
    return (subtotal || 0) >= 50 ? 0 : 10 // Free shipping over $50
  }

  const calculateTotal = () => {
    return (subtotal || 0) + calculateTax() + calculateShipping() - discount
  }

  const validateShippingInfo = () => {
    return shippingAddress.name && 
           shippingAddress.phone && 
           shippingAddress.address && 
           shippingAddress.city && 
           shippingAddress.postalCode && 
           shippingAddress.country
  }

  const validateBillingInfo = () => {
    if (sameAsShipping) return true
    return billingAddress.name && 
           billingAddress.phone && 
           billingAddress.address && 
           billingAddress.city && 
           billingAddress.postalCode && 
           billingAddress.country
  }

  const handleNextStep = () => {
    if (currentStep === 1 && !validateShippingInfo()) {
      toast.error('Please complete shipping information')
      return
    }
    if (currentStep === 2 && !validateBillingInfo()) {
      toast.error('Please complete billing information')
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    const orderData = {
      items: cartItems.map(item => ({
        product: item.product._id,
        variant: item.variant,
        quantity: item.quantity
      })),
      paymentMethod,
      shippingAddress,
      billingAddress: sameAsShipping ? shippingAddress : billingAddress,
      couponCode: appliedCoupon?.code
    }

    createOrderMutation.mutate(orderData)
  }

  if (!isAuthenticated) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            BookShop
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                }`}>
                  {step}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= step ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-slate-400'
                }`}>
                  {step === 1 && 'Shipping'}
                  {step === 2 && 'Billing'}
                  {step === 3 && 'Payment'}
                  {step === 4 && 'Review'}
                </span>
                {step < 4 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping */}
            {currentStep === 1 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Shipping Information</h2>
                
                {/* Saved Addresses */}
                {addresses.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Saved Addresses</h3>
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <div
                          key={address._id}
                          className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700"
                          onClick={() => setShippingAddress(address)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{address.name}</p>
                              <p className="text-sm text-gray-600 dark:text-slate-400">{address.phone}</p>
                              <p className="text-sm text-gray-600 dark:text-slate-400">{address.address}</p>
                              <p className="text-sm text-gray-600 dark:text-slate-400">
                                {address.city}, {address.postalCode}, {address.country}
                              </p>
                            </div>
                            {address.isDefault && (
                              <span className="badge-success">Default</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Address Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.name}
                        onChange={(e) => handleAddressChange('name', e.target.value)}
                        className="input"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(e) => handleAddressChange('phone', e.target.value)}
                        className="input"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.address}
                      onChange={(e) => handleAddressChange('address', e.target.value)}
                      className="input"
                      placeholder="123 Main St"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        className="input"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.postalCode}
                        onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                        className="input"
                        placeholder="10001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.country}
                        onChange={(e) => handleAddressChange('country', e.target.value)}
                        className="input"
                        placeholder="United States"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button className="btn-outline" onClick={() => navigate('/cart')}>
                    Back to Cart
                  </button>
                  <button className="btn-primary" onClick={handleNextStep}>
                    Continue to Billing
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Billing */}
            {currentStep === 2 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Billing Information</h2>
                
                <div className="mb-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => setSameAsShipping(e.target.checked)}
                      className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-slate-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300">
                      Same as shipping address
                    </span>
                  </label>
                </div>

                {!sameAsShipping && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={billingAddress.name}
                          onChange={(e) => handleBillingAddressChange('name', e.target.value)}
                          className="input"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={billingAddress.phone}
                          onChange={(e) => handleBillingAddressChange('phone', e.target.value)}
                          className="input"
                          placeholder="+1234567890"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={billingAddress.address}
                        onChange={(e) => handleBillingAddressChange('address', e.target.value)}
                        className="input"
                        placeholder="123 Main St"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={billingAddress.city}
                          onChange={(e) => handleBillingAddressChange('city', e.target.value)}
                          className="input"
                          placeholder="New York"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={billingAddress.postalCode}
                          onChange={(e) => handleBillingAddressChange('postalCode', e.target.value)}
                          className="input"
                          placeholder="10001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={billingAddress.country}
                          onChange={(e) => handleBillingAddressChange('country', e.target.value)}
                          className="input"
                          placeholder="United States"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <button className="btn-outline" onClick={handlePrevStep}>
                    Back to Shipping
                  </button>
                  <button className="btn-primary" onClick={handleNextStep}>
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Payment Method</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash_on_delivery"
                      checked
                      readOnly
                      className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-slate-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Cash on Delivery</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">Pay when you receive your order</div>
                    </div>
                    <Truck className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                  </label>
                </div>

                <div className="flex justify-between mt-6">
                  <button className="btn-outline" onClick={handlePrevStep}>
                    Back to Billing
                  </button>
                  <button className="btn-primary" onClick={handleNextStep}>
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Review Your Order</h2>
                
                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-4">Order Items ({itemCount})</h3>
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={`${item.product._id}-${JSON.stringify(item.variant)}`} className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden">
                          <img
                            src={item.product.images[0]?.url || '/placeholder.svg'}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          {item.variant && (
                            <p className="text-sm text-gray-600 dark:text-slate-400">
                              {item.variant.name}: {item.variant.option}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-slate-400">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping & Billing Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Shipping Address</h3>
                    <div className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                      <p>{shippingAddress.name}</p>
                      <p>{shippingAddress.phone}</p>
                      <p>{shippingAddress.address}</p>
                      <p>{shippingAddress.city}, {shippingAddress.postalCode}</p>
                      <p>{shippingAddress.country}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Billing Address</h3>
                    <div className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                      <p>{sameAsShipping ? shippingAddress.name : billingAddress.name}</p>
                      <p>{sameAsShipping ? shippingAddress.phone : billingAddress.phone}</p>
                      <p>{sameAsShipping ? shippingAddress.address : billingAddress.address}</p>
                      <p>{sameAsShipping ? `${shippingAddress.city}, ${shippingAddress.postalCode}` : `${billingAddress.city}, ${billingAddress.postalCode}`}</p>
                      <p>{sameAsShipping ? shippingAddress.country : billingAddress.country}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button className="btn-outline" onClick={handlePrevStep}>
                    Back to Payment
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handlePlaceOrder}
                    disabled={createOrderMutation.isLoading}
                  >
                    {createOrderMutation.isLoading ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 sticky top-4">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Order Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Subtotal ({itemCount} items)</span>
                  <span className="font-medium">${(subtotal || 0).toFixed(2)}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-success-600 dark:text-success-400">
                    <span>Discount</span>
                    <span className="font-medium">-${discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Tax</span>
                  <span className="font-medium">${calculateTax().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Shipping</span>
                  <span className="font-medium">
                    {calculateShipping() === 0 ? 'Free' : `$${calculateShipping().toFixed(2)}`}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900 dark:text-slate-100">Total</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Secure checkout with SSL encryption
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
