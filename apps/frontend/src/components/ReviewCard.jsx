import { Star } from 'lucide-react'

const ReviewCard = ({ review }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
      {/* Review Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            {review.user?.avatar ? (
              <img
                src={review.user.avatar}
                alt={review.user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/40">
                <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                  {review.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-slate-100">
              {review.user?.name || 'Anonymous'}
            </h4>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>
        
        {/* Rating */}
        <div className="flex items-center space-x-1">
          {[...Array(5)].map((_, index) => (
            <Star
              key={index}
              className={`w-4 h-4 ${
                index < review.rating
                  ? 'text-yellow-400 dark:text-yellow-300 fill-current'
                  : 'text-gray-300 dark:text-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Review Content */}
      <div className="space-y-2">
        {review.title && (
          <h5 className="font-medium text-gray-900 dark:text-slate-100">{review.title}</h5>
        )}
        
        <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
          {review.comment}
        </p>
        
        {/* Verified Purchase Badge */}
        {review.verifiedPurchase && (
          <div className="flex items-center space-x-1 text-sm text-success-600 dark:text-success-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Verified Purchase</span>
          </div>
        )}
      </div>

      {/* Helpful Votes */}
      {review.helpfulVotes !== undefined && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-slate-400">
            <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Helpful ({review.helpfulVotes || 0})
            </button>
            <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Not Helpful
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewCard
