import { Request, Response, NextFunction } from 'express';
import logger, { LogMessages, LogOperation, LogOutcome, maskSensitiveData } from '@formflow/shared/logger';
import { AuthRequest } from './auth';
import { OrgContextRequest } from './orgContext';

/**
 * Express error handling middleware
 * Should be used as the last middleware in the Express app
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Get correlation ID from request
  const correlationId = (req as any).correlationId;
  
  // Get user context if available
  const authReq = req as AuthRequest;
  const orgReq = req as OrgContextRequest;
  const userId = authReq.user?.userId || orgReq.orgUser?.id;
  const organizationId = orgReq.organization?.id;

  // Determine status code
  const statusCode = error.statusCode || error.status || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isServerError = statusCode >= 500;

  // Log the error with full context
  const errorLog: any = {
    operation: LogOperation.HTTP_RESPONSE,
    outcome: LogOutcome.FAILURE,
    correlationId,
    method: req.method,
    path: req.path,
    statusCode,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: isDevelopment ? error.stack : undefined,
    },
    userId,
    organizationId,
  };

  // Include request details in development
  if (isDevelopment) {
    errorLog.query = maskSensitiveData(req.query);
    errorLog.body = maskSensitiveData(req.body);
  }

  // Log at appropriate level
  if (isServerError) {
    logger.error(LogMessages.httpRequestFailed(req.method, req.path, statusCode), errorLog);
  } else {
    logger.warn(LogMessages.httpClientError(req.method, req.path, statusCode), errorLog);
  }

  // Don't leak error details in production
  // Return error response
  res.status(statusCode).json({
    error: statusCode >= 500 && !isDevelopment
      ? 'Internal server error'
      : error.message || 'An error occurred',
    ...(correlationId && { correlationId }), // Include correlation ID for debugging
    ...(isDevelopment && error.stack && { stack: error.stack }),
  });
}
