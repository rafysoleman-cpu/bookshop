/**
 * Global API Request Logger Middleware
 * Provides detailed logging for all API requests and responses
 */
import { getRedisClient } from '../config/redis.js';

// Store active requests for tracking
const activeRequests = new Map();

// Helper function to sanitize headers for logging
const sanitizeHeaders = (headers) => {
  const sanitized = { ...headers };
  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  return sanitized;
};

// Helper function to sanitize body for logging
const sanitizeBody = (body) => {
  if (!body) return null;
  
  const sanitized = { ...body };
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.currentPassword;
  delete sanitized.newPassword;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.key;
  
  return sanitized;
};

// Helper function to get request size
const getRequestSize = (req) => {
  const contentLength = req.headers['content-length'];
  return contentLength ? `${(parseInt(contentLength) / 1024).toFixed(2)} KB` : 'Unknown';
};

// Helper function to log to console with colors
const colorLog = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const requestLogger = async (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${req.method}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store request info
  activeRequests.set(requestId, {
    method: req.method,
    url: req.originalUrl,
    startTime,
    ip: req.ip || req.connection.remoteAddress
  });

  // Log incoming request (simplified)
  console.log(`${colorLog.cyan}🚀 ${req.method} ${req.originalUrl}${colorLog.reset} (${req.ip || 'unknown'})`);
  
  // Only log details for important requests
  const importantRoutes = ['/admin/products', '/upload', '/auth'];
  const isImportant = importantRoutes.some(route => req.originalUrl.includes(route));
  
  if (isImportant) {
    console.log(`${colorLog.blue}  Query:${colorLog.reset}`, JSON.stringify(req.query, null, 2));
    
    // Log body (sanitized) only for POST/PUT
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
      const body = sanitizeBody(req.body);
      if (Object.keys(body).length > 0) {
        console.log(`${colorLog.blue}  Body:${colorLog.reset}`, JSON.stringify(body, null, 2));
      }
    }
    
    // Log files if any
    if (req.files) {
      const fileCount = Array.isArray(req.files) ? req.files.length : (req.file ? 1 : 0);
      console.log(`${colorLog.magenta}  Files:${colorLog.reset} ${fileCount} file(s)`);
    }
  }

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Log response (simplified)
    console.log(`${colorLog.green}✅ ${res.statusCode} ${duration}ms${colorLog.reset}`);
    
    // Only log detailed response for important requests
    if (isImportant) {
      const responseHeaders = {};
      res.getHeaderNames().forEach(name => {
        responseHeaders[name] = res.getHeader(name);
      });
      if (Object.keys(responseHeaders).length > 0) {
        console.log(`${colorLog.yellow}  Response Headers:${colorLog.reset}`, JSON.stringify(responseHeaders, null, 2));
      }
    }

    // Log response body for important requests only (in development only)
    if (isImportant && process.env.NODE_ENV === 'development' && chunk) {
      try {
        const contentType = res.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          const responseText = chunk.toString(encoding || 'utf8');
          if (responseText.length < 500) { // Only log small responses
            console.log(`${colorLog.yellow}  Response:${colorLog.reset}`, responseText);
          } else {
            console.log(`${colorLog.yellow}  Response:${colorLog.reset} [Large response - ${responseText.length} characters]`);
          }
        }
      } catch (error) {
        console.log(`${colorLog.red}  Error parsing response body:${colorLog.reset}`, error.message);
      }
    }

    // Remove from active requests
    activeRequests.delete(requestId);

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  // Handle errors
  res.on('error', (error) => {
    console.error(`\n${colorLog.red}❌ API Error [${requestId}]${colorLog.reset}`, error);
    activeRequests.delete(requestId);
  });

  next();
};

// Helper function to log active requests
export const logActiveRequests = () => {
  if (activeRequests.size === 0) {
    console.log(`${colorLog.cyan}📊 No active requests${colorLog.reset}`);
    return;
  }

  console.log(`${colorLog.cyan}📊 Active Requests (${activeRequests.size}):${colorLog.reset}`);
  const now = Date.now();
  activeRequests.forEach((request, id) => {
    const duration = now - request.startTime;
    console.log(`  ${id}: ${request.method} ${request.url} (${duration}ms)`);
  });
};

// Helper function to log request statistics
export const logRequestStats = async () => {
  try {
    const redis = getRedisClient();
    const stats = await redis.get('api_stats');
    
    if (stats) {
      console.log(`${colorLog.magenta}📈 API Statistics:${colorLog.reset}`, JSON.parse(stats));
    } else {
      console.log(`${colorLog.magenta}📈 API Statistics:${colorLog.reset} No statistics available`);
    }
  } catch (error) {
    console.error('Failed to get API statistics:', error);
  }
};

export default requestLogger;
