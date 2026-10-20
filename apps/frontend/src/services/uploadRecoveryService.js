class UploadRecoveryService {
  constructor() {
    this.storageKey = 'productUploadRecovery'
    this.maxAge = 3600000 // 1 hour
    this.maxStorageSize = 10 * 1024 * 1024 // 10MB
  }

  /**
   * Save upload data for recovery
   */
  saveUploadData(formData, uploadId, error = null) {
    try {
      const recoveryData = {
        uploadId,
        timestamp: Date.now(),
        formData: this.sanitizeFormData(formData),
        error: error ? {
          message: error.message,
          type: error.type,
          uploadProgress: error.uploadProgress
        } : null,
        metadata: {
          fileSize: this.calculateFormDataSize(formData),
          fieldCount: this.countFormDataFields(formData),
          hasImages: this.hasImages(formData)
        }
      }

      // Get existing recovery data
      const existingData = this.getStoredRecoveryData()
      
      // Add new data
      existingData[uploadId] = recoveryData
      
      // Clean old data and check storage limits
      this.cleanupOldData(existingData)
      
      if (this.isStorageSizeExceeded(existingData)) {
        this.removeOldestEntries(existingData)
      }
      
      // Save to sessionStorage (more reliable than localStorage for large data)
      sessionStorage.setItem(this.storageKey, JSON.stringify(existingData))
      
      console.log('💾 Upload data saved for recovery:', {
        uploadId,
        fileSize: (recoveryData.metadata.fileSize / 1024).toFixed(2) + 'KB',
        fieldCount: recoveryData.metadata.fieldCount
      })
      
      return true
    } catch (error) {
      console.error('❌ Failed to save upload data:', error)
      return false
    }
  }

  /**
   * Get stored recovery data
   */
  getStoredRecoveryData() {
    try {
      const stored = sessionStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('❌ Failed to read recovery data:', error)
      return {}
    }
  }

  /**
   * Get specific recovery data by upload ID
   */
  getRecoveryData(uploadId) {
    const allData = this.getStoredRecoveryData()
    const recoveryData = allData[uploadId]
    
    if (!recoveryData) {
      return null
    }
    
    // Check if data is too old
    if (Date.now() - recoveryData.timestamp > this.maxAge) {
      this.removeRecoveryData(uploadId)
      return null
    }
    
    return recoveryData
  }

  /**
   * Restore form data from recovery
   */
  restoreFormData(uploadId) {
    const recoveryData = this.getRecoveryData(uploadId)
    
    if (!recoveryData) {
      return null
    }
    
    try {
      // Restore FormData if it was FormData
      if (recoveryData.formData.isFormData) {
        const restoredFormData = new FormData()
        
        // Restore all fields
        Object.entries(recoveryData.formData.fields).forEach(([key, value]) => {
          if (key === 'images' && Array.isArray(value)) {
            // Restore image files (if they were stored as data URLs)
            value.forEach((imageData, index) => {
              if (imageData.dataUrl) {
                // Convert data URL back to File
                const file = this.dataURLtoFile(imageData.dataUrl, imageData.name, imageData.type)
                restoredFormData.append('images', file)
              } else if (imageData.file) {
                // Original file object (if still available)
                restoredFormData.append('images', imageData.file)
              }
            })
          } else {
            restoredFormData.append(key, value)
          }
        })
        
        return restoredFormData
      } else {
        // Return regular form data object
        return recoveryData.formData
      }
    } catch (error) {
      console.error('❌ Failed to restore form data:', error)
      return null
    }
  }

  /**
   * Sanitize form data for storage
   */
  sanitizeFormData(formData) {
    if (formData instanceof FormData) {
      const sanitized = {
        isFormData: true,
        fields: {}
      }
      
      // Process all FormData entries
      for (let [key, value] of formData.entries()) {
        if (key === 'images' && value instanceof File) {
          // Convert image files to data URLs for storage
          if (!sanitized.fields.images) {
            sanitized.fields.images = []
          }
          
          // For files, we need to convert to data URL or store metadata
          // Since files can't be directly stored, we'll store as much as possible
          sanitized.fields.images.push({
            name: value.name,
            size: value.size,
            type: value.type,
            lastModified: value.lastModified,
            // Note: Actual file data can't be stored reliably in sessionStorage
            // We'll store metadata and handle file restoration differently
            fileReference: true
          })
        } else {
          sanitized.fields[key] = value
        }
      }
      
      return sanitized
    } else {
      // Regular object - store as-is
      return formData
    }
  }

  /**
   * Calculate FormData size for storage limits
   */
  calculateFormDataSize(formData) {
    let size = 0
    
    if (formData instanceof FormData) {
      for (let [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          size += value.length * 2 // UTF-16 bytes
        } else if (value instanceof File) {
          size += value.size
        }
      }
    } else if (typeof formData === 'object') {
      size += JSON.stringify(formData).length * 2
    }
    
    return size
  }

  /**
   * Count form fields
   */
  countFormDataFields(formData) {
    if (formData instanceof FormData) {
      let count = 0
      for (let _ of formData.entries()) {
        count++
      }
      return count
    } else if (typeof formData === 'object') {
      return Object.keys(formData).length
    }
    return 0
  }

  /**
   * Check if FormData contains images
   */
  hasImages(formData) {
    if (!formData) {
      return false
    }
    
    if (formData instanceof FormData) {
      return formData.has('images')
    } else if (formData.images) {
      return true
    }
    return false
  }

  /**
   * Clean up old recovery data
   */
  cleanupOldData(data) {
    const now = Date.now()
    const keysToDelete = []
    
    Object.entries(data).forEach(([uploadId, recoveryData]) => {
      if (now - recoveryData.timestamp > this.maxAge) {
        keysToDelete.push(uploadId)
      }
    })
    
    keysToDelete.forEach(uploadId => {
      delete data[uploadId]
    })
    
    if (keysToDelete.length > 0) {
      console.log('🧹 Cleaned up old recovery data:', keysToDelete.length, 'entries')
    }
  }

  /**
   * Check if storage size exceeds limits
   */
  isStorageSizeExceeded(data) {
    const size = JSON.stringify(data).length * 2 // UTF-16 bytes
    return size > this.maxStorageSize
  }

  /**
   * Remove oldest entries to free space
   */
  removeOldestEntries(data) {
    const entries = Object.entries(data)
    
    // Sort by timestamp (oldest first)
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp)
    
    // Remove oldest 25% of entries
    const removeCount = Math.ceil(entries.length * 0.25)
    const toRemove = entries.slice(0, removeCount)
    
    toRemove.forEach(([uploadId]) => {
      delete data[uploadId]
    })
    
    console.log('🗑️ Removed oldest recovery entries:', removeCount)
  }

  /**
   * Remove specific recovery data
   */
  removeRecoveryData(uploadId) {
    const data = this.getStoredRecoveryData()
    delete data[uploadId]
    sessionStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  /**
   * Clear all recovery data
   */
  clearAllRecoveryData() {
    sessionStorage.removeItem(this.storageKey)
    console.log('🗑️ All recovery data cleared')
  }

  /**
   * Get all available recovery data
   */
  getAllRecoveryData() {
    const data = this.getStoredRecoveryData()
    return Object.entries(data).map(([uploadId, recoveryData]) => ({
      uploadId,
      ...recoveryData,
      age: Date.now() - recoveryData.timestamp,
      isExpired: Date.now() - recoveryData.timestamp > this.maxAge
    }))
  }

  /**
   * Convert data URL to File object
   */
  dataURLtoFile(dataUrl, filename, mimeType) {
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    
    return new File([u8arr], filename, { type: mimeType })
  }

  /**
   * Create retry data for navigation
   */
  createRetryData(formData, error, uploadProgress) {
    const uploadId = 'retry_' + Date.now()
    
    this.saveUploadData(formData, uploadId, error)
    
    return {
      uploadId,
      error,
      uploadProgress,
      hasRecoveryData: true
    }
  }

  /**
   * Check if recovery data exists for current session
   */
  hasRecoveryData() {
    const data = this.getStoredRecoveryData()
    return Object.keys(data).length > 0
  }

  /**
   * Get recovery summary for UI display
   */
  getRecoverySummary() {
    const allData = this.getAllRecoveryData()
    const validData = allData.filter(item => !item.isExpired)
    
    return {
      totalEntries: allData.length,
      validEntries: validData.length,
      expiredEntries: allData.length - validData.length,
      totalSize: JSON.stringify(allData).length * 2,
      oldestEntry: validData.length > 0 ? Math.min(...validData.map(item => item.age)) : 0,
      newestEntry: validData.length > 0 ? Math.max(...validData.map(item => item.age)) : 0
    }
  }
}

// Create singleton instance
const uploadRecoveryService = new UploadRecoveryService()

export default uploadRecoveryService
