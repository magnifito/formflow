import { Request, Response, NextFunction } from 'express';
import logger from '@formflow/shared/logger';
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

  // Log the error with full context
  const errorLog: any = {
    correlationId,
    method: req.method,
    path: req.path,
    statusCode,
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    userId,
    organizationId,
  };

  // Include request details in development
  if (process.env.NODE_ENV === 'development') {
    errorLog.query = req.query;
    errorLog.body = req.body;
  }

  // Log at appropriate level
  if (statusCode >= 500) {
    logger.error('Express error handler caught error', errorLog);
  } else {
    logger.warn('Express error handler caught client error', errorLog);
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Return error response
  res.status(statusCode).json({
    error: statusCode >= 500 && !isDevelopment
      ? 'Internal server error'
      : error.message || 'An error occurred',
    ...(correlationId && { correlationId }), // Include correlation ID for debugging
    ...(isDevelopment && error.stack && { stack: error.stack }),
  });
}
