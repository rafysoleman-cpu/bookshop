import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  Minus, 
  Plus, 
  Share2,
  Truck,
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { productAPI, reviewAPI, cartAPI, userAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ReviewCard from '../components/ReviewCard'
import toast from 'react-hot-toast'
import {
  formatPrice,
  getProductCategory,
  getProductImage,
  getProductImages,
  getProductPrice,
  getProductRating,
  getProductStock
} from '../utils/product'

const ProductDetailPage = () => {
  // The route is declared as `products/:slug`, but the backend accepts either
  // the slug or the ObjectId, so cards that fall back to `_id` still resolve.
  const { slug } = useParams()
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [activeTab, setActiveTab] = useState('description')
  
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch product details
  const { data: product, isLoading, error } = useQuery(
    ['product', slug],
    () => productAPI.getProduct(slug),
    { staleTime: 60 * 1000, retry: false }
  )

  const productData = product?.data?.data

  // Fetch product reviews
  const { data: reviewsData } = useQuery(
    ['productReviews', productData?._id],
    () => reviewAPI.getProductReviews(productData?._id),
    { enabled: !!productData?._id, staleTime: 2 * 60 * 1000 }
  )

  // Add to cart mutation
  const addToCartMutation = useMutation(
    cartAPI.addItem,
    {
      onSuccess: () => {
        toast.success('Product added to cart!')
        queryClient.invalidateQueries('cart')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to add to cart')
      }
    }
  )

  // Wishlist lives on the user router, not the cart router.
  const addToWishlistMutation = useMutation(
    (productId) => userAPI.addToWishlist(productId),
    {
      onSuccess: () => {
        toast.success('Added to wishlist!')
        queryClient.invalidateQueries('userWishlist')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to add to wishlist')
      }
    }
  )

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart')
      return
    }

    const productId = productData?._id
    if (productId) {
      await addToCartMutation.mutateAsync({
        productId,
        quantity,
        variant: selectedVariant
      })
    }
  }

  const handleAddToWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist')
      return
    }

    const productId = productData?._id
    if (productId) {
      await addToWishlistMutation.mutateAsync(productId)
    }
  }

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change
    const maxQuantity = selectedVariant
      ? selectedVariant.inventory
      : productData?.inventory?.quantity || 0

    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity)
    }
  }

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant)
    setQuantity(1)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !productData) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Product not found</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">The product you're looking for doesn't exist.</p>
        <Link to="/products" className="btn-primary">
          aack to Products
        </Link>
      </div>
    )
  }

  const reviews = reviewsData?.data?.data?.reviews || reviewsData?.data?.reviews || []
  const images = getProductImages(productData)
  const priceInfo = getProductPrice(productData)
  const rating = getProductRating(productData)
  const stock = getProductStock(productData)
  const category = getProductCategory(productData)

  // A selected variant can carry its own price and stock.
  const finalPrice = selectedVariant?.price ?? priceInfo.effectivePrice
  const maxQuantity = selectedVariant?.inventory ?? stock.quantity

  return (
    <div className="container mx-auto px-4 py-8">
      {/* areadcrumb */}
      <nav className="breadcrumb mb-8" aria-label="areadcrumb">
        <Link to="/" className="breadcrumb-item">Home</Link>
        <span className="breadcrumb-separator">/</span>
        {category?._id ? (
          <>
            <Link to="/products" className="breadcrumb-item">Products</Link>
            <span className="breadcrumb-separator">/</span>
            <Link
              to={`/products?category=${category._id}`}
              className="breadcrumb-item"
            >
              {category.name || 'Category'}
            </Link>
            <span className="breadcrumb-separator">/</span>
          </>
        ) : (
          <>
            <Link to="/products" className="breadcrumb-item">Products</Link>
            <span className="breadcrumb-separator">/</span>
          </>
        )}
        <span className="breadcrumb-item">{productData.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden">
            <img
              src={images[selectedImage]?.url || getProductImage(productData, 600, 600)}
              alt={productData.name}
              className="w-full h-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = getProductImage(null, 600, 600)
              }}
            />
            
            {/* Discount aadge */}
            {priceInfo.percentOff > 0 && (
              <div className="absolute top-4 left-4 bg-error-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                -{priceInfo.percentOff}%
              </div>
            )}

            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  aria-label="Previous image"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full p-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  aria-label="Next image"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full p-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Images */}
          {images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-primary-500' : 'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`${productData.name} ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Video if available */}
          {productData.video && (
            <div className="aspect-video bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden">
              <video
                src={productData.video.url}
                poster={productData.video.thumbnail}
                controls
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          {/* Product Title and Rating */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">{productData.name}</h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {rating.hasReviews ? (
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 text-yellow-400 dark:text-yellow-300 fill-current" />
                  <span className="font-semibold">{rating.average.toFixed(1)}</span>
                  <span className="text-gray-500 dark:text-slate-400">({rating.count} reviews)</span>
                </div>
              ) : (
                <span className="text-gray-500 dark:text-slate-400">No reviews yet</span>
              )}

              {productData.soldCount > 0 && (
                <>
                  <span className="text-gray-500 dark:text-slate-400 hidden sm:inline">|</span>
                  <span className="text-gray-600 dark:text-slate-400">{productData.soldCount} sold</span>
                </>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-3xl font-bold text-gray-900 dark:text-slate-100">
              {formatPrice(finalPrice)}
            </span>
            
            {priceInfo.hasDiscount && priceInfo.compareAtPrice > finalPrice && (
              <span className="text-xl text-gray-500 dark:text-slate-400 line-through">
                {formatPrice(priceInfo.compareAtPrice)}
              </span>
            )}

            {priceInfo.flashActive && (
              <span className="text-sm font-medium text-error-600 dark:text-error-400">
                Flash sale: {priceInfo.flashPercentage}% off
              </span>
            )}
          </div>

          {/* Variants */}
          {productData.variants && productData.variants.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Options</h3>
              <div className="space-y-3">
                {productData.variants.map((variant) => (
                  <div key={variant.name} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{variant.name}</label>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleVariantChange({ name: variant.name, option })}
                          className={`px-4 py-2 rounded-lg border ${
                            selectedVariant?.name === variant.name && selectedVariant?.option === option
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                              : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Quantity</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-lg">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <label htmlFor="product-quantity" className="sr-only">
                  Quantity
                </label>
                <input
                  id="product-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), Math.max(1, maxQuantity)))
                  }
                  className="w-16 text-center border-0 focus:outline-none"
                  min="1"
                  max={maxQuantity}
                />
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= maxQuantity}
                  aria-label="Increase quantity"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <span className="text-sm text-gray-600 dark:text-slate-400">
                {maxQuantity} available
              </span>
            </div>
          </div>

          {/* Action auttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleAddToCart}
              disabled={addToCartMutation.isLoading || stock.isOutOfStock}
              className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>
                {stock.isOutOfStock
                  ? 'Out of Stock'
                  : addToCartMutation.isLoading
                    ? 'Adding...'
                    : 'Add to Cart'}
              </span>
            </button>
            
            <button
              onClick={handleAddToWishlist}
              disabled={addToWishlistMutation.isLoading || !isAuthenticated}
              title={isAuthenticated ? undefined : 'Log in to save this product'}
              className="btn-outline flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Heart className="w-5 h-5" />
              <span>Wishlist</span>
            </button>
            
            <button className="btn-outline">
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Product Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-t border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <Truck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Free Shipping</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">On orders over $50</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Secure Payment</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">100% secure</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Easy Returns</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">30 days return</p>
              </div>
            </div>
          </div>

          {/* Product Info Tabs */}
          <div className="border-t border-gray-200 dark:border-slate-700">
            <div className="flex space-x-8">
              {['description', 'reviews', 'shipping'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="py-6">
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  <p>{productData.description}</p>
                  {productData.shortDescription && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                      <h4 className="font-semibold mb-2">Quick Summary</h4>
                      <p>{productData.shortDescription}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Customer Reviews</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Reviews can be written from a delivered order.
                    </p>
                  </div>

                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <ReviewCard key={review._id} review={review} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-slate-400">No reviews yet. Be the first to review!</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Shipping Information</h4>
                    <p className="text-gray-600 dark:text-slate-400">
                      Free shipping on orders over $50. Standard shipping takes 3-5 business days.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Return Policy</h4>
                    <p className="text-gray-600 dark:text-slate-400">
                      We offer a 30-day return policy for unused items in original packaging.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailPage
