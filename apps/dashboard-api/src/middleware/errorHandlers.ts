import logger from '@formflow/shared/logger';

/**
 * Setup global error handlers for uncaught exceptions and unhandled rejections
 * Should be called during application startup
 */
export function setupGlobalErrorHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
    
    // Give logger time to write before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const errorDetails: any = {
      reason: typeof reason === 'object' && reason !== null
        ? {
            name: reason.name,
            message: reason.message,
            stack: reason.stack,
          }
        : reason,
    };

    logger.error('Unhandled Promise Rejection', errorDetails);
    
    // Don't exit for unhandled rejections in production to allow graceful handling
    // but log them for debugging
  });

  // Handle termination signals
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received, shutting down gracefully');
    process.exit(0);
  });
}
