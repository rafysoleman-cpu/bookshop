import { useState } from 'react'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { reviewAPI } from '../services/api'

const ReviewForm = ({ productId, orderId, onSubmit }) => {
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRatingChange = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.comment.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSubmitting(true)

    try {
      if (!orderId) {
        throw new Error('Reviews can be submitted from a delivered order.')
      }

      await reviewAPI.createReview({
        product: productId,
        order: orderId,
        rating: formData.rating,
        title: formData.title.trim(),
        content: formData.comment.trim()
      })

      toast.success('Review submitted successfully!')
      setFormData({
        rating: 5,
        title: '',
        comment: ''
      })
      
      if (onSubmit) {
        onSubmit()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">Write a Review</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Rating
          </label>
          <div className="flex items-center space-x-2">
            {[...Array(5)].map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleRatingChange(index + 1)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-6 h-6 ${
                    index < formData.rating
                      ? 'text-yellow-400 dark:text-yellow-300 fill-current'
                      : 'text-gray-300 dark:text-slate-600 hover:text-yellow-400 dark:hover:text-yellow-300'
                  } transition-colors`}
                />
              </button>
            ))}
            <span className="text-sm text-gray-600 dark:text-slate-400 ml-2">
              {formData.rating} out of 5
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Review Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Summarize your experience"
            className="input"
            required
          />
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Your Review
          </label>
          <textarea
            id="comment"
            name="comment"
            value={formData.comment}
            onChange={handleInputChange}
            rows={4}
            placeholder="Share your thoughts about the book..."
            className="input resize-none"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex items-center space-x-2"
          >
            <span>{isSubmitting ? 'Submitting...' : 'Submit Review'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default ReviewForm
