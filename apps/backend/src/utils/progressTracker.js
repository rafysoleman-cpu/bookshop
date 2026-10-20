/**
 * Progress tracking utility for long-running operations
 */

/**
 * Create a progress tracker for uploads
 * @param {Object} options - Progress tracking options
 * @returns {Object} - Progress tracker instance
 */
export const createProgressTracker = (options = {}) => {
  const {
    totalSteps = 100,
    onProgress = null,
    timeout = 300000, // 5 minutes default
    onTimeout = null
  } = options;

  let currentStep = 0;
  let startTime = Date.now();
  let timeoutId = null;
  let isActive = true;

  // Set timeout
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      isActive = false;
      if (onTimeout) {
        onTimeout();
      }
    }, timeout);
  }

  return {
    /**
     * Update progress
     * @param {number} step - Current step (0-100)
     * @param {string} message - Progress message
     */
    update: (step, message = '') => {
      if (!isActive) return;

      currentStep = Math.min(Math.max(0, step), totalSteps);
      
      const progressData = {
        percent: Math.round((currentStep / totalSteps) * 100),
        step: currentStep,
        message,
        elapsed: Date.now() - startTime,
        estimated: currentStep > 0 ? 
          ((Date.now() - startTime) / currentStep) * (totalSteps - currentStep) : 0
      };

      if (onProgress) {
        onProgress(progressData);
      }

      // Complete if reached end
      if (currentStep >= totalSteps) {
        this.complete();
      }
    },

    /**
     * Increment progress by one step
     * @param {string} message - Progress message
     */
    increment: (message = '') => {
      this.update(currentStep + 1, message);
    },

    /**
     * Mark as complete
     */
    complete: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isActive = false;
      
      if (onProgress) {
        onProgress({
          percent: 100,
          step: totalSteps,
          message: 'Complete',
          elapsed: Date.now() - startTime,
          estimated: 0
        });
      }
    },

    /**
     * Cancel the progress tracker
     */
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isActive = false;
    },

    /**
     * Get current progress
     */
    getProgress: () => ({
      percent: Math.round((currentStep / totalSteps) * 100),
      step: currentStep,
      elapsed: Date.now() - startTime,
      isActive
    })
  };
};

/**
 * Create a Server-Sent Events stream for progress updates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} operation - Async operation to track
 * @returns {Promise} - Operation result
 */
export const createProgressStream = (req, res, operation) => {
  return new Promise((resolve, reject) => {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial event
    res.write(`data: ${JSON.stringify({ type: 'start', message: 'Starting upload...' })}\n\n`);

    const tracker = createProgressTracker({
      onProgress: (progress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
      },
      onTimeout: () => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Operation timed out' })}\n\n`);
        res.end();
        reject(new Error('Operation timed out'));
      },
      timeout: 600000 // 10 minutes for SSE
    });

    // Handle client disconnect
    req.on('close', () => {
      tracker.cancel();
      reject(new Error('Client disconnected'));
    });

    // Run the operation
    Promise.resolve(operation(tracker))
      .then((result) => {
        tracker.complete();
        res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
        res.end();
        resolve(result);
      })
      .catch((error) => {
        tracker.cancel();
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
        reject(error);
      });
  });
};

/**
 * Create a timeout wrapper for async operations
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} timeoutMessage - Timeout error message
 * @returns {Promise} - Wrapped promise
 */
export const withTimeout = (promise, timeoutMs = 300000, timeoutMessage = 'Operation timed out') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
};

/**
 * Batch processor for multiple files with progress tracking
 * @param {Array} items - Items to process
 * @param {Function} processor - Processing function
 * @param {Object} options - Batch processing options
 * @returns {Promise} - Processing results
 */
export const createBatchProcessor = (items, processor, options = {}) => {
  const {
    concurrency = 3, // Process 3 items at once
    onProgress = null,
    onItemComplete = null,
    onItemError = null
  } = options;

  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    let completed = 0;
    let inProgress = 0;
    let currentIndex = 0;

    const totalItems = items.length;
    const tracker = createProgressTracker({
      totalSteps: totalItems,
      onProgress: (progress) => {
        if (onProgress) {
          onProgress({
            ...progress,
            completed,
            total: totalItems,
            errors: errors.length
          });
        }
      }
    });

    const processNext = async () => {
      if (currentIndex >= totalItems || inProgress >= concurrency) {
        return;
      }

      const item = items[currentIndex++];
      const itemIndex = currentIndex - 1;
      inProgress++;

      try {
        const result = await processor(item, itemIndex);
        results[itemIndex] = result;
        
        if (onItemComplete) {
          onItemComplete(item, result, itemIndex);
        }
      } catch (error) {
        errors[itemIndex] = error;
        
        if (onItemError) {
          onItemError(item, error, itemIndex);
        }
      } finally {
        inProgress--;
        completed++;
        tracker.increment();
        
        // Continue processing
        if (completed < totalItems) {
          setImmediate(processNext);
        } else {
          tracker.complete();
          
          if (errors.length > 0) {
            resolve({ results, errors, success: false });
          } else {
            resolve({ results, errors: [], success: true });
          }
        }
      }
    };

    // Start processing
    const initialConcurrency = Math.min(concurrency, totalItems);
    for (let i = 0; i < initialConcurrency; i++) {
      setImmediate(processNext);
    }
  });
};
