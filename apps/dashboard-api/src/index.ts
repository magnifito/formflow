import "reflect-metadata";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sql, eq, count, and, asc } from "drizzle-orm";

// import { AppDataSource } from "./data-source"; // Removed TypeORM DataSource
import { db } from "./db";
import { users, organizations, forms } from "@formflow/shared/drizzle";
// import { User, Organization } from "@formflow/shared/entities"; // Removed TypeORM entities
import { getEnv, loadEnv } from "@formflow/shared/env";
import { verifyToken, AuthRequest } from "./middleware/auth";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { setupGlobalErrorHandlers } from "./middleware/errorHandlers";
import AdminController from "./controller/AdminController";
import OrganizationController from "./controller/OrganizationController";
import IntegrationController from "./controller/IntegrationController";
import QueueController from "./controller/QueueController";
import logger from "@formflow/shared/logger";

const BCRYPT_ROUNDS = 10;

loadEnv();

const redirectUrl = getEnv("REDIRECT_URL") || "https://formflow.fyi";
const DASHBOARD_API_PORT = getEnv("DASHBOARD_API_PORT") || 4000;

/**
 * Create and configure Express app
 * Separated from server initialization for testing
 */
async function createApp() {
    const app = express();

    // Drizzle does not require explicit initialization like TypeORM source

    // ... CORS setup (unchanged) ...
    const allowedOrigins = [redirectUrl, 'http://localhost:4100', 'http://localhost:4200', 'http://127.0.0.1:4100', 'http://127.0.0.1:4200'];
    const strictCorsOptions = {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (like curl, mobile apps)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'x-altcha-spam-filter', 'x-api-key', 'Authorization', 'X-Organization-Context', 'X-CSRF-Token', 'X-Correlation-Id', 'X-Request-Id'],
        exposedHeaders: ['x-correlation-id'],
        credentials: true
    };
    app.use(cors(strictCorsOptions));

    // Health check endpoints
    const startTime = Date.now();

    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - startTime) / 1000),
            service: 'dashboard-api'
        });
    });

    app.get('/health/ready', async (req, res) => {
        try {
            // Check database connectivity
            await db.execute(sql`SELECT 1`);
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
        res.send('Hello, from FormFlow Dashboard API!');
    });

    app.use(bodyParser.json());

    // Request logging middleware (after body parser to capture request body)
    app.use(requestLogger);

    // Setup endpoints (must be before auth routes, no auth required)
    // GET /setup - Check if setup is needed
    app.get('/setup', async (_req: Request, res: Response) => {
        try {
            const result = await db.select({ count: count() }).from(users).where(eq(users.isSuperAdmin, true));
            const superAdminCount = result[0].count;

            res.json({
                setupNeeded: superAdminCount === 0
            });
        } catch (error: any) {
            logger.error('Error checking setup status', { error: error.message, stack: error.stack });
            res.status(500).json({ error: 'Failed to check setup status' });
        }
    });

    // POST /setup - Complete initial setup (create super admin and organization)
    app.post('/setup', cors(strictCorsOptions), async (req: Request, res: Response) => {
        try {
            const { email, password, name, organizationName, organizationSlug } = req.body;

            // Validation
            if (!email || !password || !organizationName || !organizationSlug) {
                return res.status(400).json({ error: 'Email, password, organizationName, and organizationSlug are required' });
            }

            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }

            // Check if setup has already been completed
            const existingSuperAdmin = await db.query.users.findFirst({
                where: eq(users.isSuperAdmin, true)
            });

            if (existingSuperAdmin) {
                return res.status(403).json({ error: 'Setup has already been completed. A super admin already exists.' });
            }

            // Check if email already exists
            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, email)
            });

            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            // Check if organization slug is already taken
            const existingOrg = await db.query.organizations.findFirst({
                where: eq(organizations.slug, organizationSlug)
            });

            if (existingOrg) {
                return res.status(400).json({ error: 'Organization with this slug already exists' });
            }

            // Create organization first
            const [savedOrganization] = await db.insert(organizations).values({
                name: organizationName,
                slug: organizationSlug,
                isActive: true
            }).returning();

            logger.info('Initial organization created during setup', {
                organizationId: savedOrganization.id,
                organizationName: savedOrganization.name,
                correlationId: req.correlationId
            });

            // Create super admin user
            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

            const [savedUser] = await db.insert(users).values({
                email,
                passwordHash,
                name: name || null,
                organizationId: savedOrganization.id, // Assign to the new organization
                role: 'org_admin',
                isSuperAdmin: true,
                isActive: true
            }).returning();

            logger.info('Initial super admin created during setup', {
                userId: savedUser.id,
                email: savedUser.email,
                organizationId: savedOrganization.id,
                correlationId: req.correlationId
            });

            // Generate JWT for immediate login
            const token = jwt.sign(
                { userId: savedUser.id },
                getEnv("JWT_SECRET")!,
                { expiresIn: '24h' }
            );

            res.status(201).json({
                message: 'Setup completed successfully',
                user: {
                    id: savedUser.id,
                    email: savedUser.email,
                    name: savedUser.name,
                    isSuperAdmin: savedUser.isSuperAdmin,
                    organizationId: savedOrganization.id
                },
                organization: {
                    id: savedOrganization.id,
                    name: savedOrganization.name,
                    slug: savedOrganization.slug
                },
                token // Return token for automatic login
            });
        } catch (error: any) {
            logger.error('Error during setup', { error: error.message, stack: error.stack, correlationId: req.correlationId });
            res.status(500).json({ error: 'Failed to complete setup' });
        }
    });

    // Routes

    app.use('/org', OrganizationController);
    app.use('/admin', AdminController);
    app.use('/integrations', IntegrationController);
    app.use('/queue', QueueController);

    // Auth endpoints
    app.post('/auth/login', cors(strictCorsOptions), async (req: Request, res: Response) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const user = await db.query.users.findFirst({ where: eq(users.email, email) });
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const validPassword = await bcrypt.compare(password, user.passwordHash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check if user is suspended
            if (!user.isActive) {
                return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
            }

            // Generate JWT
            const token = jwt.sign(
                { userId: user.id },
                getEnv("JWT_SECRET")!,
                { expiresIn: '24h' }
            );

            res.json({ token, userId: user.id, user: { id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin, organizationId: user.organizationId } });
            logger.info('User logged in successfully', { userId: user.id, email: user.email, correlationId: req.correlationId });
        } catch (error: any) {
            logger.error('Login error', { error: error.message, stack: error.stack, correlationId: req.correlationId });
            res.status(500).json({ error: 'Login failed' });
        }
    });

    // POST /auth/lab-login - Automatic login for Test Lab (local testing only)
    app.post('/auth/lab-login', cors(strictCorsOptions), async (req: Request, res: Response) => {
        try {
            const superAdmin = await db.query.users.findFirst({
                where: and(eq(users.isSuperAdmin, true), eq(users.isActive, true)),
                orderBy: asc(users.id)
            });

            if (!superAdmin) {
                return res.status(404).json({ error: 'No active super admin found for auto-login' });
            }

            // Generate JWT
            const token = jwt.sign(
                { userId: superAdmin.id },
                getEnv("JWT_SECRET")!,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                userId: superAdmin.id,
                user: {
                    id: superAdmin.id,
                    name: superAdmin.name,
                    email: superAdmin.email,
                    isSuperAdmin: superAdmin.isSuperAdmin,
                    organizationId: superAdmin.organizationId
                }
            });
            logger.info('Test Lab auto-login successful', { userId: superAdmin.id, email: superAdmin.email, correlationId: req.correlationId });
        } catch (error: any) {
            logger.error('Lab login error', { error: error.message, stack: error.stack, correlationId: req.correlationId });
            res.status(500).json({ error: 'Lab login failed' });
        }
    });

    // GET /auth/me - Get current authenticated user
    app.get('/auth/me', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        try {
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.user!.userId),
                with: { organization: true }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                isSuperAdmin: user.isSuperAdmin,
                isActive: user.isActive,
                organizationId: user.organizationId,
                role: user.role,
                organization: user.organization ? {
                    id: user.organization.id,
                    name: user.organization.name,
                    slug: user.organization.slug
                } : null
            });
        } catch (error: any) {
            logger.error('Get current user error', { error: error.message, stack: error.stack, userId: req.user?.userId, correlationId: req.correlationId });
            res.status(500).json({ error: 'Failed to get user information' });
        }
    });

    // POST /auth/logout - Logout (client-side token removal, optional server-side logic)
    app.post('/auth/logout', cors(strictCorsOptions), verifyToken, (_req: AuthRequest, res: Response) => {
        // In a JWT-based auth system, logout is primarily client-side (removing the token)
        // Server-side logout would require token blacklisting, which we can implement later if needed
        res.json({ message: 'Logged out successfully' });
    });

    // User management endpoints
    app.get('/api/user/:userId', cors(strictCorsOptions), verifyToken, (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId, 10);
        // Verify that the requesting user is accessing their own data
        if (req.user?.userId !== userId) {
            return res.status(403).json('Unauthorized access to user data');
        }

        if (isNaN(userId)) {
            return res.status(400).json('Invalid user ID');
        }

        db.query.users.findFirst({ where: eq(users.id, userId), with: { organization: true } })
            .then(user => {
                if (!user) {
                    logger.warn('User not found', { userId, correlationId: req.correlationId });
                    return res.status(404).json('User not found');
                }
                res.json(user);
            })
            .catch(error => {
                logger.error('Error fetching user', { error: error.message, stack: error.stack, userId, correlationId: req.correlationId });
                res.status(500).json('Internal Server Error');
            });
    });

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

    const server = app.listen(DASHBOARD_API_PORT, () => {
        logger.info(`Dashboard API server has started on port ${DASHBOARD_API_PORT}`, { port: DASHBOARD_API_PORT, environment: process.env.NODE_ENV || 'development' });
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
