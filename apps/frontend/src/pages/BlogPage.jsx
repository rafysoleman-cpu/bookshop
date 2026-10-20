import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  User,
  Clock,
  ArrowRight,
  Search
} from 'lucide-react'
import { useQuery } from 'react-query'
import { blogAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'

const BlogPage = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: blogData, isLoading, isError, error } = useQuery(
    ['blogPosts', currentPage, categoryFilter, searchQuery],
    () => {
      const params = { page: currentPage }
      if (categoryFilter) params.category = categoryFilter
      if (searchQuery) params.search = searchQuery
      return blogAPI.getPosts(params)
    },
    { staleTime: 5 * 60 * 1000 }
  )

  const { data: categoriesData } = useQuery(
    'blogCategories',
    () => blogAPI.getCategories(),
    { staleTime: 30 * 60 * 1000 }
  )

  const { data: popularData } = useQuery(
    'popularBlogPosts',
    () => blogAPI.getPopularPosts({ limit: 5 }),
    { staleTime: 10 * 60 * 1000 }
  )

  const blogResponse = blogData?.data?.data
  const posts = blogResponse?.posts || []
  const pagination = blogResponse?.pagination
  const categories = categoriesData?.data?.data || []
  const popularPosts = popularData?.data?.data || []

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchQuery(searchInput.trim())
    setCurrentPage(1)
  }

  const handleCategoryFilter = (category) => {
    setCategoryFilter(category === categoryFilter ? '' : category)
    setCurrentPage(1)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const readTime = (content) => {
    const words = (content || '').split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
          Unable to load the blog
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          {error?.message || 'Please try again later.'}
        </p>
        <Link to="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">
          Our Blog
        </h1>
        <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
          Tips, trends, and insights from our team and community
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search blog posts..."
              className="search-input w-full"
            />
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-8">
            <div className="flex items-center space-x-4 overflow-x-auto pb-2">
              <button
                onClick={() => handleCategoryFilter('')}
                className={`category-pill whitespace-nowrap ${
                  !categoryFilter
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                    : ''
                }`}
              >
                All Posts
              </button>
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handleCategoryFilter(category.name)}
                  className={`category-pill whitespace-nowrap ${
                    categoryFilter === category.name
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                      : ''
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {posts.length > 0 ? (
            <div className="space-y-8">
              {posts.map((post) => (
                <article
                  key={post._id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {post.featuredImage && (
                    <div className="aspect-video bg-gray-100 dark:bg-slate-800/70 overflow-hidden">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-slate-400 mb-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{readTime(post.content)} min read</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{post.author?.name || 'BookShop'}</span>
                      </div>
                    </div>

                    <Link to={`/blog/${post.slug}`} className="block group">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                    </Link>

                    {post.excerpt && (
                      <p className="text-gray-600 dark:text-slate-400 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    <Link
                      to={`/blog/${post.slug}`}
                      className="inline-flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      <span>Read More</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
                  {searchQuery
                    ? `No posts match "${searchQuery}"`
                    : categoryFilter
                      ? `No posts in ${categoryFilter}`
                      : 'No blog posts found'}
                </h3>
                <p className="text-gray-600 dark:text-slate-400 mb-8">
                  {searchQuery || categoryFilter
                    ? 'Try a different search or category.'
                    : 'Check back later for new content.'}
                </p>
                <Link to="/blog" className="btn-primary">
                  View All Posts
                </Link>
              </div>
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="mt-12">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        <div className="space-y-8">
          {popularPosts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                Popular Posts
              </h3>

              <div className="space-y-4">
                {popularPosts.map((post) => (
                  <div key={post._id} className="flex space-x-3">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800/70 rounded-lg overflow-hidden flex-shrink-0">
                      {post.featuredImage ? (
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/40">
                          <span className="text-primary-600 dark:text-primary-400 font-bold text-sm">
                            {post.title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link to={`/blog/${post.slug}`} className="block group">
                        <h4 className="font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 mb-1">
                          {post.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {formatDate(post.createdAt)}
                        </p>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {categories.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                Categories
              </h3>

              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => handleCategoryFilter(category.name)}
                    className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                      categoryFilter === category.name
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{category.name}</span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {category.count} posts
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BlogPage
