import React, { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, X, Clock, Wifi, WifiOff, Server, FileImage } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const UploadRetryPopup = ({ 
  isOpen, 
  onClose, 
  error, 
  uploadData, 
  onRetry,
  isRetrying 
}) => {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(30)
  const [errorDetails, setErrorDetails] = useState({
    type: 'unknown',
    message: '',
    recoverable: true
  })

  useEffect(() => {
    if (isOpen && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, countdown])

  useEffect(() => {
    if (error) {
      // Analyze error type for better user experience
      const errorType = getErrorType(error)
      setErrorDetails(errorType)
    }
  }, [error])

  const getErrorType = (error) => {
    const message = error?.message || error?.toString() || 'Unknown error'
    
    if (message.includes('timeout') || message.includes('TIMEOUT')) {
      return {
        type: 'timeout',
        message: 'Upload timed out. This might be due to a slow connection or large file size.',
        recoverable: true,
        icon: Clock,
        color: 'text-orange-500 dark:text-orange-400'
      }
    }
    
    if (message.includes('network') || message.includes('Network') || !error.response) {
      return {
        type: 'network',
        message: 'Network connection lost. Please check your internet connection.',
        recoverable: true,
        icon: WifiOff,
        color: 'text-red-500 dark:text-red-400'
      }
    }
    
    if (message.includes('server') || error.response?.status >= 500) {
      return {
        type: 'server',
        message: 'Server error occurred. Our team has been notified.',
        recoverable: true,
        icon: Server,
        color: 'text-purple-500 dark:text-purple-400'
      }
    }
    
    if (message.includes('file') || message.includes('size') || message.includes('format')) {
      return {
        type: 'file',
        message: 'File validation failed. Please check your file formats and sizes.',
        recoverable: false,
        icon: FileImage,
        color: 'text-blue-500 dark:text-blue-400'
      }
    }
    
    return {
      type: 'unknown',
      message: message || 'An unexpected error occurred during upload.',
      recoverable: true,
      icon: AlertTriangle,
      color: 'text-gray-500 dark:text-slate-400'
    }
  }

  const handleRetry = () => {
    if (errorDetails.recoverable) {
      onRetry()
    } else {
      // For non-recoverable errors, redirect to edit page with preserved data
      handleEditRetry()
    }
  }

  const handleEditRetry = () => {
    // Store upload data in sessionStorage for recovery
    if (uploadData) {
      sessionStorage.setItem('productUploadRetry', JSON.stringify({
        formData: uploadData.formData,
        timestamp: Date.now(),
        error: errorDetails
      }))
    }
    navigate('/product/add', { 
      state: { 
        retryData: uploadData,
        error: errorDetails 
      } 
    })
    onClose()
  }

  const handleClose = () => {
    // Store data for potential recovery
    if (uploadData) {
      sessionStorage.setItem('productUploadRetry', JSON.stringify({
        formData: uploadData.formData,
        timestamp: Date.now(),
        error: errorDetails
      }))
    }
    onClose()
  }

  if (!isOpen) return null

  const ErrorIcon = errorDetails.icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gray-50 dark:bg-slate-900 ${errorDetails.color}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Upload Failed</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">{errorDetails.type} error</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          <div className="mb-6">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">{errorDetails.message}</p>
            
            {/* Additional error details */}
            {error?.response?.data?.message && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{error.response.data.message}</p>
              </div>
            )}
            
            {error?.response?.data?.errors && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/40 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Validation Errors:</p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {Object.entries(error.response.data.errors).map(([field, message]) => (
                    <li key={field} className="flex items-start">
                      <span className="font-medium mr-2">{field}:</span>
                      <span>{message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>



          {/* Recovery Options */}
          <div className="space-y-3">
            {errorDetails.recoverable ? (
              <>
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Retrying Upload...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Upload</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleEditRetry}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-slate-800/70 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>Edit & Retry</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleEditRetry}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <span>Fix Issues & Retry</span>
              </button>
            )}
          </div>

          {/* Auto-dismiss countdown */}
          {countdown > 0 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                This popup will close automatically in {countdown} seconds
              </p>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Need Help?</h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Ensure files are under 5MB each</li>
              <li>• Try refreshing the page and retry</li>
              <li>• Contact support if issues persist</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Your data is preserved and will be available for retry
          </p>
          <button
            onClick={handleClose}
            className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadRetryPopup
