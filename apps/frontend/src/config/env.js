/**
 * Environment Configuration Manager
 * Handles dynamic environment switching for frontend
 */

const getEnvConfig = () => {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  
  // Base configuration
  const config = {
    isDevelopment,
    isProduction,
    mode: import.meta.env.MODE,
  };

  // API URLs based on environment
  if (isDevelopment) {
    config.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
    config.socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    config.appName = import.meta.env.VITE_APP_NAME || 'BookShop (Dev)';
    config.enableDebug = true;
  } else if (isProduction) {
    config.apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
    config.socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    config.appName = import.meta.env.VITE_APP_NAME || 'BookShop';
    config.enableDebug = false;
  }

  // Common configuration
  config.imageKitUrlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
  config.imageKitPublicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
  config.googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  config.cdnUrl = import.meta.env.VITE_CDN_URL;
  config.appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

  // Debug logging
  if (config.enableDebug) {
    console.log('🔧 Environment Configuration:', {
      mode: config.mode,
      apiUrl: config.apiUrl,
      socketUrl: config.socketUrl,
      appName: config.appName,
      enableDebug: config.enableDebug
    });
  }

  return config;
};

export const envConfig = getEnvConfig();

export default envConfig;
