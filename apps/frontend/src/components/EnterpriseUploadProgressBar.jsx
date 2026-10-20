import React from 'react'

const EnterpriseUploadProgressBar = ({ 
  isUploading, 
  uploadProgress, 
  uploadData, 
  currentImageIndex = 0, 
  totalImages = 0,
  onDismiss 
}) => {
  if (!isUploading || !uploadData) return null

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss()
    }
  }

  return (
    <>
      {/* Enterprise Upload Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 border-blue-500/20">
        {/* Ambient Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r animate-pulse"></div>
        
        <div className="relative w-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4">
          {/* Mobile Layout - Premium Stacked */}
          <div className="block sm:hidden space-y-3">
            {/* Premium Header with Glow */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-800/50 to-blue-800/50 rounded-xl p-3 border border-blue-500/20 shadow-lg">
              <div className="flex items-center space-x-3">
                {/* Advanced Spinner with Glow */}
                <div className="relative w-8 h-8">
                  {/* Outer Glow Ring */}
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-lg animate-pulse"></div>
                  {/* Progress Ring */}
                  <svg className="absolute inset-0 w-8 h-8 transform -rotate-90">
                    <circle cx="16" cy="16" r="12" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="2" fill="none" />
                    <circle cx="16" cy="16" r="12" stroke="url(#gradient-mobile)" strokeWidth="2" fill="none" 
                      strokeDasharray={`${2 * Math.PI * 12}`} 
                      strokeDashoffset={`${2 * Math.PI * 12 * (1 - uploadProgress / 100)}`}
                      className="transition-all duration-500 ease-out" />
                    <defs>
                      <linearGradient id="gradient-mobile" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Center Percentage */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white drop-shadow-lg">{uploadProgress}%</span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-white truncate mb-1 drop-shadow">Creating "{uploadData.productName}"</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <p className="text-xs text-blue-200 font-medium">
                      {uploadProgress < 30 
                        ? 'Initializing secure connection...'
                        : uploadProgress < 80
                        ? `Processing ${uploadData.imageCount} file${uploadData.imageCount !== 1 ? 's' : ''}...`
                        : uploadProgress < 95
                        ? 'Optimizing data...'
                        : 'Finalizing creation...'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg px-3 py-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-blue-300">
                    {uploadProgress < 30 
                      ? 'STARTING'
                      : uploadProgress < 80
                      ? 'UPLOADING'
                      : uploadProgress < 95
                      ? 'PROCESSING'
                      : 'FINALIZING'
                    }
                  </span>
                  {uploadProgress === 100 && (
                    <button
                      onClick={handleDismiss}
                      className="text-blue-400 dark:text-blue-300 hover:text-blue-300 transition-colors"
                      title="Dismiss progress bar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Compact Progress Bar */}
            <div className="space-y-2">
              <div className="relative">
                {/* Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-lg"></div>
                {/* Progress Bar */}
                <div className="relative bg-slate-700/50 rounded-full h-2 overflow-hidden border border-blue-500/30 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full transition-all duration-700 ease-out relative shadow-lg shadow-blue-500/50"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    {/* Animated Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    {/* Pulsing Overlay */}
                    <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-300 font-medium">
                  {uploadProgress < 30 
                    ? 'Establishing connection...'
                    : uploadProgress < 80
                    ? 'Transferring files...'
                    : uploadProgress < 95
                    ? 'Processing data...'
                    : 'Completing operation...'
                  }
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 dark:text-slate-500">
                    {uploadProgress < 30 
                      ? `${Math.floor(uploadProgress / 30 * 2)}s remaining`
                      : uploadProgress < 80
                      ? `${Math.floor((80 - uploadProgress) / 50 * 4)}s remaining`
                      : uploadProgress < 95
                      ? `${Math.floor((95 - uploadProgress) / 15 * 2)}s remaining`
                      : 'Almost complete...'
                    }
                  </span>
                  {uploadProgress === 100 && (
                    <button
                      onClick={handleDismiss}
                      className="text-blue-400 dark:text-blue-300 hover:text-blue-300 transition-colors"
                      title="Dismiss progress bar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tablet Layout - Premium Compact */}
          <div className="hidden sm:block md:hidden">
            <div className="bg-gradient-to-r from-slate-800/50 to-blue-800/50 rounded-xl p-4 border border-blue-500/20 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Premium Spinner */}
                  <div className="relative w-9 h-9">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-lg animate-pulse"></div>
                    <svg className="absolute inset-0 w-9 h-9 transform -rotate-90">
                      <circle cx="18" cy="18" r="14" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="2" fill="none" />
                      <circle cx="18" cy="18" r="14" stroke="url(#gradient-tablet)" strokeWidth="2" fill="none" 
                        strokeDasharray={`${2 * Math.PI * 14}`} 
                        strokeDashoffset={`${2 * Math.PI * 14 * (1 - uploadProgress / 100)}`}
                        className="transition-all duration-500 ease-out" />
                      <defs>
                        <linearGradient id="gradient-tablet" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="50%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white drop-shadow-lg">{uploadProgress}%</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate mb-1 drop-shadow">Creating "{uploadData.productName}"</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                      <p className="text-xs text-blue-200">
                        {uploadProgress < 30 
                          ? 'Initializing secure connection...'
                          : uploadProgress < 80
                          ? `Processing ${uploadData.imageCount} file${uploadData.imageCount !== 1 ? 's' : ''}...`
                          : uploadProgress < 95
                          ? 'Optimizing data...'
                          : 'Finalizing creation...'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-36 bg-slate-700/50 rounded-full h-2 overflow-hidden border border-blue-500/30">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full transition-all duration-500 ease-out relative shadow-lg shadow-blue-500/50"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg px-2 py-1">
                      <span className="text-xs font-semibold text-blue-300">
                        {uploadProgress < 30 ? 'STARTING' : uploadProgress < 80 ? 'UPLOADING' : uploadProgress < 95 ? 'PROCESSING' : 'FINALIZING'}
                      </span>
                    </div>
                    {uploadProgress === 100 && (
                      <button
                        onClick={handleDismiss}
                        className="text-blue-400 dark:text-blue-300 hover:text-blue-300 transition-colors text-lg"
                        title="Dismiss progress bar"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Enterprise Full */}
          <div className="hidden md:block">
            <div className="bg-gradient-to-r from-slate-800/50 via-blue-800/50 to-slate-800/50 rounded-2xl p-5 border border-blue-500/20 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {/* Enterprise Spinner */}
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-xl animate-pulse"></div>
                    <svg className="absolute inset-0 w-10 h-10 transform -rotate-90">
                      <circle cx="20" cy="20" r="16" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="3" fill="none" />
                      <circle cx="20" cy="20" r="16" stroke="url(#gradient-desktop)" strokeWidth="3" fill="none" 
                        strokeDasharray={`${2 * Math.PI * 16}`} 
                        strokeDashoffset={`${2 * Math.PI * 16 * (1 - uploadProgress / 100)}`}
                        className="transition-all duration-700 ease-out filter drop-shadow-lg" />
                      <defs>
                        <linearGradient id="gradient-desktop" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="50%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-white drop-shadow-lg">{uploadProgress}%</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-base font-bold text-white truncate drop-shadow">Creating "{uploadData.productName}"</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-xl shadow-green-400/50"></div>
                        <span className="text-sm font-semibold text-green-400 dark:text-green-300">ACTIVE</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-sm text-blue-200 font-medium">
                        {uploadProgress < 15 && currentImageIndex === 0
                          ? 'Initializing secure connection and preparing upload...'
                          : uploadProgress < 90
                          ? `Uploading image ${currentImageIndex} of ${totalImages} with enterprise-grade encryption...`
                          : uploadProgress < 95
                          ? 'Optimizing data and validating integrity...'
                          : 'Finalizing creation and deploying to production...'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="relative w-48 bg-slate-700/50 rounded-full h-2 overflow-hidden border border-blue-500/30 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full transition-all duration-700 ease-out relative shadow-xl shadow-blue-500/50"
                        style={{ width: `${uploadProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-blue-300 font-medium">
                        {uploadProgress < 30 
                          ? 'Establishing connection...'
                          : uploadProgress < 80
                          ? 'Transferring files...'
                          : uploadProgress < 95
                          ? 'Processing data...'
                          : 'Completing operation...'
                        }
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 dark:text-slate-500">
                          {uploadProgress < 30 
                            ? `${Math.floor(uploadProgress / 30 * 2)}s remaining`
                            : uploadProgress < 80
                            ? `${Math.floor((80 - uploadProgress) / 50 * 4)}s remaining`
                            : uploadProgress < 95
                            ? `${Math.floor((95 - uploadProgress) / 15 * 2)}s remaining`
                            : 'Almost complete...'
                          }
                        </span>
                        {uploadProgress === 100 && (
                          <button
                            onClick={handleDismiss}
                            className="text-blue-400 dark:text-blue-300 hover:text-blue-300 transition-colors text-lg font-bold"
                            title="Dismiss progress bar"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl px-4 py-2 shadow-lg">
                    <span className="text-sm font-bold text-blue-300">
                      {uploadProgress < 30 ? 'INITIALIZING' : uploadProgress < 80 ? 'UPLOADING' : uploadProgress < 95 ? 'PROCESSING' : 'FINALIZING'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default EnterpriseUploadProgressBar