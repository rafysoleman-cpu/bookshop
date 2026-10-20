import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ShoppingBag,
  BookOpen
} from 'lucide-react'
import { useQuery } from 'react-query'
import { productAPI } from '../services/api'
import { useCategories } from '../hooks/useCategories'
import ProductCard from '../components/ProductCard'
import CategoryPill from '../components/CategoryPill'
import FlashSaleTimer from '../components/FlashSaleTimer'
import LoadingSpinner from '../components/LoadingSpinner'

/**
 * `GET /products` answers `{ data: { products, pagination } }`, but the
 * featured and flash-sale endpoints answer `{ data: [...] }`. ProductCard
 * expects real Product documents either way, so unwrap each to a plain array.
 */
const selectProductList = (response) => {
  const payload = response?.data?.data ?? response?.data
  if (Array.isArray(payload)) return payload
  return payload?.products || []
}

const HomePage = () => {
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState(null)

  // Fetch featured products
  const { data: featuredProducts, isLoading: featuredLoading } = useQuery(
    'featuredProducts',
    () => productAPI.getFeaturedProducts({ limit: 8 }),
    { 
      staleTime: 5 * 60 * 1000,
      select: selectProductList
    }
  )

  // Fetch flash sale products
  const { data: flashSaleProducts, isLoading: flashLoading } = useQuery(
    'flashSaleProducts',
    () => productAPI.getFlashSaleProducts({ limit: 4 }),
    { 
      staleTime: 60 * 1000,
      select: selectProductList
    }
  )

  // Fetch categories (shared cache, normalised to an array)
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()

  // Fetch top rated products
  const { data: topRatedProducts, isLoading: topRatedLoading } = useQuery(
    'topRatedProducts',
    () => productAPI.getProducts({ sortBy: 'rating', limit: 8 }),
    { 
      staleTime: 5 * 60 * 1000,
      select: selectProductList
    }
  )

  // Calculate flash sale time left
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const endTime = new Date()
      endTime.setHours(23, 59, 59, 999) // End of today
      
      const difference = endTime - now
      
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        
        setFlashSaleTimeLeft({ hours, minutes, seconds })
      } else {
        setFlashSaleTimeLeft(null)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [])

  if (featuredLoading || flashLoading || categoriesLoading || topRatedLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-slate-900 px-6 py-16 sm:px-12 sm:py-24 text-white">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary-100">
              Welcome to BookShop
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Find your next great read.
            </h1>
            <p className="mt-5 text-lg text-primary-100">
              Explore books across fiction, non-fiction, academic, children&apos;s
              and more, all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-6 py-3 font-semibold text-primary-700 dark:text-primary-400 transition-colors hover:bg-primary-50 dark:hover:bg-slate-800/70"
              >
                <ShoppingBag className="h-5 w-5" />
                Browse Books
              </Link>
              <Link
                to="/products?sortBy=newest"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                <BookOpen className="h-5 w-5" />
                New Arrivals
              </Link>
            </div>
          </div>
          <BookOpen className="absolute -bottom-10 -right-6 h-64 w-64 text-white/10 sm:h-80 sm:w-80" />
        </div>
      </section>

      {/* Flash Sale Section */}
      {flashSaleTimeLeft && flashSaleProducts?.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-error-500 to-warning-500 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-8 h-8" />
                <h2 className="text-3xl font-bold">Flash Sale</h2>
              </div>
              <FlashSaleTimer timeLeft={flashSaleTimeLeft} />
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {flashSaleProducts.map((product) => (
                <ProductCard 
                  key={product._id} 
                  product={product}
                />
              ))}
            </div>
            
            <div className="text-center mt-6">
              <Link 
                to="/products?flashSale=true" 
                className="inline-flex items-center space-x-2 bg-white dark:bg-slate-800 text-error-600 dark:text-error-400 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-slate-800/70 transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>View All Flash Deals</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Browse by Genre</h2>
          <p className="text-gray-600 dark:text-slate-400">Explore books by genre</p>
        </div>
        
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((category) => (
            <CategoryPill 
              key={category._id}
              category={category}
            />
          ))}
        </div>
      </section>

      {/* Featured Books */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Featured Books</h2>
            <p className="text-gray-600 dark:text-slate-400">Selected titles from our collection</p>
          </div>
          <Link 
            to="/products?featured=true" 
            className="btn-outline"
          >
            See All
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {featuredProducts?.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* Top Rated Books Products */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Top Rated Books</h2>
            <p className="text-gray-600 dark:text-slate-400">Reader favorites</p>
          </div>
          <Link 
            to="/products?sortBy=rating" 
            className="btn-outline"
          >
            See All
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {topRatedProducts?.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage
