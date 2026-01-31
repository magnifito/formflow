import './bootstrap'; // Must be first
import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { getEnv } from '@formflow/shared/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { setupGlobalErrorHandlers } from './middleware/errorHandlers';
import SubmissionController from './controller/SubmissionController';
import logger from '@formflow/shared/logger';
import { startWorker, stopBoss } from '@formflow/shared/queue';

const COLLECTOR_API_PORT = getEnv('COLLECTOR_API_PORT') || 3000;

/**
 * Create and configure Express app
 * Separated from server initialization for testing
 */
async function createApp() {
  const app = express();

  // Drizzle does not require explicit initialization like TypeORM

  // CORS - Allow all origins for public form submissions
  // CORS - Allow all origins for public form submissions, referencing the request origin if needed
  // We need to be dynamic to support specific localhost development ports
  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost/127.0.0.1 for development (any port) including Lab
      if (
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }

      // Allow all others for now (public forms)
      // Ideally we would check against whitelisted domains here too if we wanted strict CORS at middleware level
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'x-altcha-spam-filter',
      'Authorization',
      'X-Organization-Context',
      'X-CSRF-Token',
      'X-Correlation-Id',
      'X-Request-Id',
    ],
    exposedHeaders: ['x-correlation-id'],
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Health check endpoints
  const startTime = Date.now();

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      service: 'form-api',
    });
  });

  app.get('/health/ready', async (req, res) => {
    try {
      // Check database connectivity
      await db.execute(sql`SELECT 1`);
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (error: any) {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      });
    }
  });

  app.get('/', (req, res) => {
    res.send('Hello, from FormFlow API!');
  });

  app.use(bodyParser.json());

  // Request logging middleware (after body parser to capture request body)
  app.use(requestLogger);

  // Form submission routes
  app.use('/s', SubmissionController);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 * Only used when running the app directly (not in tests)
 */
async function startServer() {
  const app = await createApp();

  // startWorker and stopBoss imported at top of file

  // Start queue worker
  try {
    await startWorker();
    logger.info('Queue worker started');
  } catch (err: any) {
    logger.error('Failed to start queue worker', { error: err.message });
  }

  const server = app.listen(COLLECTOR_API_PORT, () => {
    logger.info(`Form API server has started on port ${COLLECTOR_API_PORT}`, {
      port: COLLECTOR_API_PORT,
      environment: process.env.NODE_ENV || 'development',
    });
  });

  const shutdown = async () => {
    logger.info('Shutting down server...');
    server.close(async () => {
      logger.info('HTTP server closed');
      await stopBoss();
      process.exit(0);
    });
    server.closeAllConnections();

    // Force exit if hanging
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { app, server };
}

// Only start server if this file is run directly (not imported by tests)
if (require.main === module) {
  // Setup global error handlers
  setupGlobalErrorHandlers();

  startServer().catch((error) => {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

export { createApp, startServer };
