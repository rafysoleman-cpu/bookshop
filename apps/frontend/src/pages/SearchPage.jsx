import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  SlidersHorizontal,
  X,
  TrendingUp,
  Clock
} from 'lucide-react'
import { useQuery } from 'react-query'
import { searchAPI } from '../services/api'
import { useCategories } from '../hooks/useCategories'
import ProductCard from '../components/ProductCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: '',
    sortBy: 'relevance'
  })

  const currentPage = parseInt(searchParams.get('page')) || 1

  // Fetch search results
  const { data: searchResults, isLoading, refetch } = useQuery(
    ['searchResults', currentPage, query, filters],
    () => {
      const params = {
        q: query,
        page: currentPage,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        rating: filters.rating,
        sortBy: filters.sortBy
      }
      return searchAPI.searchProducts(params)
    },
    { enabled: !!query, staleTime: 2 * 60 * 1000 }
  )

  // Fetch suggestions
  const { data: suggestionsData } = useQuery(
    ['searchSuggestions', query],
    () => searchAPI.getSuggestions({ q: query }),
    { enabled: query.length > 1, staleTime: 30 * 1000 }
  )

  // Fetch popular searches
  const { data: popularData } = useQuery(
    'popularSearches',
    () => searchAPI.getPopular(),
    { staleTime: 60 * 60 * 1000 }
  )

  // Fetch categories for filters (shared cache, normalised to an array)
  const { data: categories = [] } = useCategories()

  const products = searchResults?.data?.products || []
  const pagination = searchResults?.data?.pagination
  const popularSearches = popularData?.data?.popular || []

  useEffect(() => {
    if (suggestionsData?.data) {
      setSuggestions(suggestionsData.data.products || [])
    }
  }, [suggestionsData])

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSuggestions(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      const params = new URLSearchParams()
      params.append('q', query.trim())
      params.append('page', '1')
      setSearchParams(params)
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    const params = new URLSearchParams()
    params.append('q', suggestion)
    params.append('page', '1')
    setSearchParams(params)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      rating: '',
      sortBy: 'relevance'
    })
  }

  const handlePageChange = (page) => {
    const params = new URLSearchParams()
    params.append('q', query)
    params.append('page', page)
    setSearchParams(params)
    window.scrollTo(0, 0)
  }

  const handlePopularSearch = (searchTerm) => {
    setQuery(searchTerm)
    const params = new URLSearchParams()
    params.append('q', searchTerm)
    params.append('page', '1')
    setSearchParams(params)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6">Search Books</h1>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search for books, authors, genres..."
              className="search-input w-full"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 dark:text-slate-500" />
              </button>
            )}
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-4">
                <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Suggestions</h3>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </form>
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
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full input"
                >
                  <option value="">All Genres</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Price Range
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-full input"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-full input"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Minimum Rating
                </label>
                <select
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                  className="w-full input"
                >
                  <option value="">All Ratings</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full input"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>

              {/* Clear Filters */}
              <button
                onClick={clearFilters}
                className="w-full btn-outline"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center space-x-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Search Results Header */}
          {query && (
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  {products.length} results for "{query}"
                </h2>
                <p className="text-gray-600 dark:text-slate-400">
                  Showing {pagination?.page || 1} of {pagination?.pages || 1} pages
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Sort */}
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="input"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                </select>
                
                {/* View Mode */}
                <div className="flex items-center space-x-2 border border-gray-300 dark:border-slate-600 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Popular Searches */}
          {!query && popularSearches.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Popular Searches</h3>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handlePopularSearch(item.name)}
                    className="category-pill"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products Grid/List */}
          {isLoading ? (
            <LoadingSpinner />
          ) : products.length > 0 ? (
            <>
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }>
                {products.map((product) => (
                  <ProductCard 
                    key={product._id} 
                    product={product}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="mt-12">
                  <Pagination 
                    currentPage={pagination.page}
                    totalPages={pagination.pages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : query ? (
            // No Results
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
                No results found for "{query}"
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Try adjusting your search terms or browse our popular genres
              </p>
              <div className="space-y-4">
                <button
                  onClick={clearFilters}
                  className="btn-primary"
                >
                  Clear Filters
                </button>
                <Link to="/products" className="btn-outline block">
                  Browse All Books
                </Link>
              </div>
            </div>
          ) : (
            // Initial State
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
                Search for books
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Find exactly what you're looking for from our extensive collection
              </p>
              
              {/* Quick Search Categories */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-slate-100">Popular Genres</h4>
                <div className="flex flex-wrap gap-2 justify-center">
                  {categories.slice(0, 6).map((category) => (
                    <button
                      key={category._id}
                      onClick={() => setQuery(category.name)}
                      className="category-pill"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default SearchPage
