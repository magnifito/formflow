import "reflect-metadata";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import cors from "cors";
import axios from 'axios';
import { AppDataSource } from "./data-source";
import { User } from "@formflow/shared/entities";
import { getEnv, loadEnv } from "@formflow/shared/env";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { setupGlobalErrorHandlers } from "./middleware/errorHandlers";
import SubmissionController from "./controller/SubmissionController";
import logger from "@formflow/shared/logger";

loadEnv();

const COLLECTOR_API_PORT = getEnv("COLLECTOR_API_PORT") || 3000;
const DASHBOARD_API_PORT = getEnv("DASHBOARD_API_PORT") || 4000;
const DASHBOARD_API_URL = getEnv("DASHBOARD_API_URL") || `http://localhost:${DASHBOARD_API_PORT}`;

/**
 * Create and configure Express app
 * Separated from server initialization for testing
 */
async function createApp() {
    const app = express();

    // Initialize database connection if not already initialized
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    // CORS - Allow all origins for public form submissions
    const corsOptions = {
        origin: "*",
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'x-altcha-spam-filter', 'x-api-key', 'Authorization', 'X-Organization-Context', 'X-CSRF-Token'],
    };
    app.use(cors(corsOptions));

    // Health check endpoints
    const startTime = Date.now();

    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - startTime) / 1000),
            service: 'form-api'
        });
    });

    app.get('/health/ready', async (req, res) => {
        try {
            // Check database connectivity
            await AppDataSource.manager.query('SELECT 1');
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                database: 'connected'
            });
        } catch (error: any) {
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                error: error.message
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

    const server = app.listen(COLLECTOR_API_PORT, () => {
        logger.info(`Form API server has started on port ${COLLECTOR_API_PORT}`, { port: COLLECTOR_API_PORT, environment: process.env.NODE_ENV || 'development' });
    });

    return { app, server };
}

// Only start server if this file is run directly (not imported by tests)
if (require.main === module) {
    // Setup global error handlers
    setupGlobalErrorHandlers();

    startServer().catch((error) => {
        logger.error('Failed to start server', { error: error.message, stack: error.stack });
        process.exit(1);
    });
}

export { createApp, startServer };
