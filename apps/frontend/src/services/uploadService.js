import { api } from './api.js'

class UploadService {
  constructor() {
    this.activeUploads = new Map()
    this.uploadProgress = new Map()
    this.lastProgressTime = new Map()
    this.stuckDetectionThreshold = 30000 // 30 seconds without progress (was 5s)
    this.baseTimeout = 60000 // 60 seconds base timeout (was 15s)
    this.maxTimeout = 300000 // 5 minutes maximum timeout (was 30s)
  }

  /**
   * Enhanced product upload with intelligent timeout handling
   */
  async uploadProduct(productData, customEndpoint = null) {
    const uploadId = this.generateUploadId()
    const startTime = Date.now()
    
    try {
      console.log('🚀 Starting enhanced product upload:', { uploadId, customEndpoint })
      
      // Initialize upload tracking
      this.initializeUploadTracking(uploadId, productData)
      
      // Calculate dynamic timeout based on file sizes
      const dynamicTimeout = this.calculateDynamicTimeout(productData)
      console.log('⏱️ Dynamic timeout calculated:', dynamicTimeout)
      
      // Start progress monitoring
      const progressMonitor = this.startProgressMonitoring(uploadId)
      
      // Create upload with enhanced configuration
      const uploadPromise = this.createUploadRequest(productData, uploadId, dynamicTimeout, customEndpoint)
      
      // Race between upload and timeout detection
      const result = await Promise.race([
        uploadPromise,
        this.createTimeoutDetector(uploadId, dynamicTimeout, startTime),
        this.createStuckDetector(uploadId)
      ])
      
      // Cleanup monitoring
      progressMonitor.stop()
      this.cleanupUpload(uploadId)
      
      console.log('✅ Upload completed successfully:', { uploadId, duration: Date.now() - startTime })
      return result
      
    } catch (error) {
      console.error('❌ Upload failed:', { uploadId, error })
      this.cleanupUpload(uploadId)
      throw this.enhanceError(error, uploadId)
    }
  }

  /**
   * Initialize tracking for upload progress and stuck detection
   */
  initializeUploadTracking(uploadId, productData) {
    this.activeUploads.set(uploadId, {
      startTime: Date.now(),
      data: productData,
      status: 'uploading'
    })
    
    this.uploadProgress.set(uploadId, 0)
    this.lastProgressTime.set(uploadId, Date.now())
  }

  /**
   * Calculate dynamic timeout based on file sizes and network conditions
   */
  calculateDynamicTimeout(productData) {
    let totalFileSize = 0
    let fileCount = 0
    
    if (productData instanceof FormData) {
      for (let [key, value] of productData.entries()) {
        if (key === 'images' && value instanceof File) {
          totalFileSize += value.size
          fileCount++
        }
      }
    }
    
    // Base timeout + file size factor
    const sizeFactor = Math.min(totalFileSize / (1024 * 1024) * 10000, 300000) // Max 5min for files
    const countFactor = Math.min(fileCount * 30000, 120000) // Max 2min for multiple files
    
    const dynamicTimeout = Math.min(
      this.baseTimeout + sizeFactor + countFactor,
      this.maxTimeout
    )
    
    console.log('📊 Upload analysis:', {
      totalFileSize: (totalFileSize / 1024 / 1024).toFixed(2) + 'MB',
      fileCount,
      sizeFactor: (sizeFactor / 1000).toFixed(0) + 's',
      countFactor: (countFactor / 1000).toFixed(0) + 's',
      dynamicTimeout: (dynamicTimeout / 1000).toFixed(0) + 's'
    })
    
    return dynamicTimeout
  }

  /**
   * Create upload request with progress tracking
   */
  async createUploadRequest(productData, uploadId, timeout, customEndpoint = null) {
    const endpoint = customEndpoint || '/admin/products'
    return api.post(endpoint, productData, {
      timeout,
      headers: {
        'Content-Type': 'multipart/form-data' // Important for FormData uploads
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        this.updateProgress(uploadId, progress)
      },
      uploadId // Pass uploadId to backend for progress tracking
    })
  }

  /**
   * Update upload progress and reset stuck detection timer
   */
  updateProgress(uploadId, progress) {
    this.uploadProgress.set(uploadId, progress)
    this.lastProgressTime.set(uploadId, Date.now())
    
    // Emit progress event for UI
    window.dispatchEvent(new CustomEvent('productUploadProgress', {
      detail: { uploadId, progress }
    }))
    
    console.log(`📈 Upload progress: ${uploadId} - ${progress}%`)
  }

  /**
   * Start monitoring upload progress for stuck detection
   */
  startProgressMonitoring(uploadId) {
    const monitor = {
      interval: null,
      stop: () => {
        if (monitor.interval) {
          clearInterval(monitor.interval)
        }
      }
    }
    
    monitor.interval = setInterval(() => {
      const lastProgress = this.lastProgressTime.get(uploadId)
      const currentProgress = this.uploadProgress.get(uploadId)
      const timeSinceProgress = Date.now() - lastProgress
      
      // Check if upload is stuck
      if (timeSinceProgress > this.stuckDetectionThreshold) {
        console.warn('⚠️ Upload appears to be stuck:', {
          uploadId,
          timeSinceProgress: (timeSinceProgress / 1000).toFixed(0) + 's',
          currentProgress
        })
      }
      
      // Emit progress for UI updates
      window.dispatchEvent(new CustomEvent('productUploadMonitoring', {
        detail: {
          uploadId,
          progress: currentProgress,
          timeSinceProgress,
          isStuck: timeSinceProgress > this.stuckDetectionThreshold
        }
      }))
    }, 5000) // Check every 5 seconds (was 1s)
    
    return monitor
  }

  /**
   * Create timeout detector that only fails if truly stuck
   */
  async createTimeoutDetector(uploadId, timeout, startTime) {
    return new Promise((_, reject) => {
      const checkTimeout = () => {
        const elapsed = Date.now() - startTime
        const lastProgress = this.lastProgressTime.get(uploadId)
        const timeSinceProgress = Date.now() - lastProgress
        const currentProgress = this.uploadProgress.get(uploadId)
        
        // Only timeout if we've exceeded total time AND haven't made progress recently
        if (elapsed > timeout && timeSinceProgress > this.stuckDetectionThreshold) {
          console.error('⏰ Upload timeout detected:', {
            uploadId,
            elapsed: (elapsed / 1000).toFixed(0) + 's',
            timeSinceProgress: (timeSinceProgress / 1000).toFixed(0) + 's',
            currentProgress
          })
          
          reject(new Error(`Upload timed out after ${timeout / 1000} seconds. Progress stopped at ${currentProgress}%`))
          return
        }
        
        // If we're still making progress or within time limits, continue checking
        if (elapsed < timeout) {
          setTimeout(checkTimeout, 1000) // Check every 1 second (was 5s)
        }
      }
      
      setTimeout(checkTimeout, 10000) // Start checking after 10 seconds
    })
  }

  /**
   * Create stuck detector that fails when no progress for too long
   */
  async createStuckDetector(uploadId) {
    return new Promise((_, reject) => {
      const checkStuck = () => {
        const lastProgress = this.lastProgressTime.get(uploadId)
        const timeSinceProgress = Date.now() - lastProgress
        const currentProgress = this.uploadProgress.get(uploadId)
        
        // If stuck for too long, fail
        if (timeSinceProgress > this.stuckDetectionThreshold * 2) { // 10 seconds (was 60s)
          console.error('🚫 Upload stuck detected:', {
            uploadId,
            timeSinceProgress: (timeSinceProgress / 1000).toFixed(0) + 's',
            currentProgress
          })
          
          reject(new Error(`Upload stuck. No progress for ${timeSinceProgress / 1000} seconds. Current progress: ${currentProgress}%`))
          return
        }
        
        // Continue checking
        setTimeout(checkStuck, 2000) // Check every 2 seconds (was 10s)
      }
      
      setTimeout(checkStuck, 3000) // Start checking after 3 seconds (was 30s)
    })
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error, uploadId) {
    const enhancedError = new Error(error.message)
    enhancedError.originalError = error
    // Keep the Axios response so callers can read the backend's validation
    // message instead of only "Request failed with status code 400".
    enhancedError.response = error.response
    enhancedError.status = error.response?.status
    enhancedError.uploadId = uploadId
    enhancedError.uploadProgress = this.uploadProgress.get(uploadId) || 0
    enhancedError.uploadDuration = Date.now() - (this.activeUploads.get(uploadId)?.startTime || Date.now())
    
    // Add error type classification
    if (error.message.includes('timeout')) {
      enhancedError.type = 'timeout'
    } else if (error.message.includes('stuck')) {
      enhancedError.type = 'stuck'
    } else if (!error.response) {
      enhancedError.type = 'network'
    } else {
      enhancedError.type = 'server'
    }
    
    return enhancedError
  }

  /**
   * Get current upload progress
   */
  getUploadProgress(uploadId) {
    return {
      progress: this.uploadProgress.get(uploadId) || 0,
      lastProgressTime: this.lastProgressTime.get(uploadId) || Date.now(),
      timeSinceProgress: Date.now() - (this.lastProgressTime.get(uploadId) || Date.now()),
      isStuck: Date.now() - (this.lastProgressTime.get(uploadId) || Date.now()) > this.stuckDetectionThreshold
    }
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadId) {
    console.log('🛑 Cancelling upload:', uploadId)
    this.cleanupUpload(uploadId)
  }

  /**
   * Cleanup upload tracking
   */
  cleanupUpload(uploadId) {
    this.activeUploads.delete(uploadId)
    this.uploadProgress.delete(uploadId)
    this.lastProgressTime.delete(uploadId)
  }

  /**
   * Generate unique upload ID
   */
  generateUploadId() {
    return 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Get all active uploads
   */
  getActiveUploads() {
    return Array.from(this.activeUploads.entries()).map(([id, data]) => ({
      id,
      ...data,
      progress: this.getUploadProgress(id)
    }))
  }
}

// Create singleton instance
const uploadService = new UploadService()

export default uploadService
