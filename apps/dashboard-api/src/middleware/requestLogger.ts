import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger, { maskHeaders, maskSensitiveData } from '@formflow/shared/utils/logger';
import { AuthRequest } from './auth';
import { OrgContextRequest } from './orgContext';

// Extend Request type to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * Request logging middleware
 * Generates correlation ID and logs incoming requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Skip health check endpoints
  if (req.path === '/health' || req.path === '/health/ready') {
    return next();
  }

  // Log sampling configuration
  const logSampleRate = parseFloat(process.env.LOG_SAMPLE_RATE || '1.0');
  const shouldSample = logSampleRate >= 1.0 || Math.random() < logSampleRate;
  
  // Skip logging if not sampled (for high-traffic endpoints)
  if (!shouldSample) {
    return next();
  }

  // Generate correlation ID
  const correlationId = uuidv4();
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Get user context if available
  const authReq = req as AuthRequest;
  const orgReq = req as OrgContextRequest;
  const userId = authReq.user?.userId || orgReq.orgUser?.id;
  const organizationId = orgReq.organization?.id;

  // Request body logging configuration
  const shouldLogBody = process.env.LOG_REQUEST_BODY === 'true' || 
                        (process.env.NODE_ENV === 'development' && process.env.LOG_REQUEST_BODY !== 'false');
  const bodyMethods = ['POST', 'PUT', 'PATCH'];
  const maxBodySize = 10 * 1024; // 10KB
  const contentType = req.headers['content-type'] || '';

  const requestLog: any = {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'],
    headers: maskHeaders(req.headers),
    userId,
    organizationId,
  };

  // Log request body if enabled and appropriate
  if (shouldLogBody && bodyMethods.includes(req.method) && req.body) {
    // Skip multipart/form-data (file uploads)
    if (!contentType.includes('multipart/form-data')) {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (bodyStr.length <= maxBodySize) {
        try {
          const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          requestLog.body = maskSensitiveData(bodyObj);
        } catch {
          // If parsing fails, just log as string (truncated)
          requestLog.body = bodyStr.substring(0, maxBodySize);
        }
      } else {
        requestLog.body = `[Request body too large: ${bodyStr.length} bytes, max: ${maxBodySize}]`;
      }
    }
  }

  // Log incoming request
  logger.info('Incoming request', requestLog);

  // Response body logging (only in development or when explicitly enabled)
  const shouldLogResponseBody = process.env.LOG_RESPONSE_BODY === 'true' || 
                                 (process.env.NODE_ENV === 'development' && process.env.LOG_RESPONSE_BODY !== 'false');
  const maxResponseBodySize = 5 * 1024; // 5KB
  let responseBody: any = undefined;

  if (shouldLogResponseBody) {
    // Intercept response methods to capture body
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function(body: any) {
      responseBody = body;
      return originalJson(body);
    };

    res.send = function(body: any) {
      // Only capture if it's JSON-like (not binary)
      if (typeof body === 'string' || typeof body === 'object') {
        responseBody = body;
      }
      return originalSend(body);
    };
  }

  // Log response when finished
  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const slowRequestThreshold = parseInt(process.env.LOG_SLOW_REQUEST_THRESHOLD || '1000', 10);

    // Determine log level based on status code
    const statusCode = res.statusCode;
    let logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    // Log slow requests as warnings
    if (duration > slowRequestThreshold && logLevel === 'info') {
      logLevel = 'warn';
    }

    const logData: any = {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      userId,
      organizationId,
    };

    if (duration > slowRequestThreshold) {
      logData.slowRequest = true;
      logData.threshold = slowRequestThreshold;
    }

    // Add response body if enabled and available
    if (shouldLogResponseBody && responseBody !== undefined) {
      const responseBodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
      if (responseBodyStr.length <= maxResponseBodySize) {
        try {
          const responseBodyObj = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
          logData.responseBody = maskSensitiveData(responseBodyObj);
        } catch {
          logData.responseBody = responseBodyStr.substring(0, maxResponseBodySize);
        }
      } else {
        logData.responseBody = `[Response body too large: ${responseBodyStr.length} bytes, max: ${maxResponseBodySize}]`;
      }
    }

    logger[logLevel]('Outgoing response', logData);
  });

  next();
}
