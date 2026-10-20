import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Share2,
  Check,
  Facebook,
  Twitter,
  Linkedin
} from 'lucide-react'
import { useQuery } from 'react-query'
import { blogAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const BlogDetailPage = () => {
  const { slug } = useParams()
  const [copyStatus, setCopyStatus] = useState('')

  const { data: postData, isLoading } = useQuery(
    ['blogPost', slug],
    () => blogAPI.getPost(slug),
    { staleTime: 5 * 60 * 1000 }
  )

  const postResponse = postData?.data?.data
  const post = postResponse?.post
  const relatedPosts = postResponse?.relatedPosts || []

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

  const handleShare = (platform) => {
    const url = window.location.href
    const text = post?.title || ''
    let shareUrl = ''

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      default:
        return
    }

    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400')
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
          Blog post not found
        </h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          The blog post you're looking for doesn't exist.
        </p>
        <Link to="/blog" className="btn-primary">
          Back to Blog
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/blog"
        className="btn-outline inline-flex items-center space-x-2 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Blog</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <article className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            {post.featuredImage && (
              <div className="aspect-video bg-gray-100 dark:bg-slate-800/70 overflow-hidden">
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 lg:p-8">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-slate-400 mb-6">
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

              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-6 leading-tight">
                {post.title}
              </h1>

              <div
                className="prose prose-lg max-w-none text-gray-700 dark:text-slate-300"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {post.tags && post.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 dark:bg-slate-800/70 text-gray-700 dark:text-slate-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>

          {relatedPosts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">
                Related Posts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <div
                    key={relatedPost._id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {relatedPost.featuredImage && (
                      <div className="aspect-video bg-gray-100 dark:bg-slate-800/70 overflow-hidden">
                        <img
                          src={relatedPost.featuredImage}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-4">
                      <Link
                        to={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <h3 className="font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 mb-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {formatDate(relatedPost.createdAt)}
                        </p>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Share Article
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  aria-label="Share on Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleShare('twitter')}
                  className="p-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                  aria-label="Share on Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleShare('linkedin')}
                  className="p-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  aria-label="Share on LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={copyToClipboard}
                className="w-full btn-outline flex items-center justify-center space-x-2"
              >
                {copyStatus === 'copied' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>
                  {copyStatus === 'copied'
                    ? 'Link copied'
                    : copyStatus === 'failed'
                      ? 'Copy failed'
                      : 'Copy Link'}
                </span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              About the Author
            </h3>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                {post.author?.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/40">
                    <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100">
                  {post.author?.name || 'BookShop'}
                </h4>
                {post.author?.bio && (
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {post.author.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlogDetailPage
