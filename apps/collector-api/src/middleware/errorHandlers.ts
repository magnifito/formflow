import logger, { LogMessages, LogOperation, LogOutcome } from '@formflow/shared/logger';

/**
 * Setup global error handlers for uncaught exceptions and unhandled rejections
 * Should be called during application startup
 */
export function setupGlobalErrorHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error(LogMessages.systemUncaughtException, {
      operation: LogOperation.SYSTEM_ERROR,
      outcome: LogOutcome.FAILURE,
      error,
      process: {
        pid: process.pid,
        uptimeMs: Math.round(process.uptime() * 1000),
      },
    });
    
    // Give logger time to write before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(LogMessages.systemUnhandledRejection, {
      operation: LogOperation.SYSTEM_ERROR,
      outcome: LogOutcome.FAILURE,
      error: reason,
      process: {
        pid: process.pid,
        uptimeMs: Math.round(process.uptime() * 1000),
      },
    });
    
    // Don't exit for unhandled rejections in production to allow graceful handling
    // but log them for debugging
  });

  // Handle termination signals
  process.on('SIGTERM', () => {
    logger.info(LogMessages.systemShutdownSignal('SIGTERM'), {
      operation: LogOperation.SYSTEM_SHUTDOWN,
      outcome: LogOutcome.SUCCESS,
      signal: 'SIGTERM',
    });
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info(LogMessages.systemShutdownSignal('SIGINT'), {
      operation: LogOperation.SYSTEM_SHUTDOWN,
      outcome: LogOutcome.SUCCESS,
      signal: 'SIGINT',
    });
    process.exit(0);
  });
}
