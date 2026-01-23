import "reflect-metadata";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import cors from "cors";
import crypto from "crypto";
import axios from 'axios';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { AppDataSource } from "./data-source";
import { User, Organization } from "@formflow/shared/entities";
import { getEnv, loadEnv } from "@formflow/shared/env";
import { verifyToken, AuthRequest } from "./middleware/auth";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { setupGlobalErrorHandlers } from "./middleware/errorHandlers";
import AdminController from "./controller/AdminController";
import OrganizationController from "./controller/OrganizationController";
import logger from "@formflow/shared/logger";
import { maskUrl } from "@formflow/shared/logger";

const BCRYPT_ROUNDS = 10;

loadEnv();

const redirectUrl = getEnv("REDIRECT_URL") || "https://formflow.fyi";
const PORT = getEnv("PORT") || 3000;

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

    const allowedOrigins = [redirectUrl, 'http://localhost:4200', 'http://localhost:5177'];
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
        allowedHeaders: ['Content-Type', 'x-altcha-spam-filter', 'x-api-key', 'Authorization', 'X-Organization-Context', 'X-CSRF-Token'],
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
        res.send('Hello, from FormFlow Dashboard API!');
    });
  
    app.use(bodyParser.json());

    // Request logging middleware (after body parser to capture request body)
    app.use(requestLogger);

    // Setup endpoints (must be before auth routes, no auth required)
    // GET /setup - Check if setup is needed
    app.get('/setup', async (_req: Request, res: Response) => {
        try {
            const superAdminCount = await AppDataSource.manager.count(User, {
                where: { isSuperAdmin: true }
            });
            
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
            const existingSuperAdmin = await AppDataSource.manager.findOne(User, {
                where: { isSuperAdmin: true }
            });

            if (existingSuperAdmin) {
                return res.status(403).json({ error: 'Setup has already been completed. A super admin already exists.' });
            }

            // Check if email already exists
            const existingUser = await AppDataSource.manager.findOne(User, {
                where: { email }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            // Check if organization slug is already taken
            const existingOrg = await AppDataSource.manager.findOne(Organization, {
                where: { slug: organizationSlug }
            });

            if (existingOrg) {
                return res.status(400).json({ error: 'Organization with this slug already exists' });
            }

            // Create organization first
            const organization = AppDataSource.manager.create(Organization, {
                name: organizationName,
                slug: organizationSlug,
                isActive: true
            });

            const savedOrganization = await AppDataSource.manager.save(organization);
            logger.info('Initial organization created during setup', { 
                organizationId: savedOrganization.id, 
                organizationName: savedOrganization.name,
                correlationId: req.correlationId 
            });

            // Create super admin user
            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

            const superAdmin = AppDataSource.manager.create(User, {
                email,
                passwordHash,
                name: name || null,
                organizationId: savedOrganization.id, // Assign to the new organization
                role: 'org_admin',
                isSuperAdmin: true,
                isActive: true
            });

            const savedUser = await AppDataSource.manager.save(superAdmin);
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

    // Dashboard routes
    app.use('/admin', AdminController);
    app.use('/org', OrganizationController);

    // Auth endpoints
    app.post('/auth/login', cors(strictCorsOptions), async (req: Request, res: Response) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const user = await AppDataSource.manager.findOne(User, { where: { email } });
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

    // GET /auth/me - Get current authenticated user
    app.get('/auth/me', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        try {
            const user = await AppDataSource.manager.findOne(User, {
                where: { id: req.user!.userId },
                relations: ['organization']
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

        AppDataSource.manager.findOne(User, { where: { id: userId }, relations: ['organization'] })
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

    app.post('/create-api-key/:userId', cors(strictCorsOptions), verifyToken, (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const userPromise = AppDataSource.manager.findOne(User, { where: { id: userId } });
        userPromise.then(user => {
            if (!user) {
                res.status(401).json('Unauthorized');
                return;
            }
            const { v4: uuidv4 } = require('uuid');
            user.apiKey = uuidv4();
            AppDataSource.manager.save(user)
            .then(() => {
                res.json({ apiKey: user.apiKey });
            })
            .catch(error => {
                res.status(500).json('Internal Server Error');
            });
        });
    });

    app.post('/regenerate-api-key/:userId', cors(strictCorsOptions), verifyToken, (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const userPromise = AppDataSource.manager.findOne(User, { where: { id: userId } });
        userPromise.then(user => {
            if (!user) {
                res.status(401).json('Unauthorized');
                return;
            }
            const { v4: uuidv4 } = require('uuid');
            user.apiKey = uuidv4();
            AppDataSource.manager.save(user)
            .then(() => {
                res.json({ apiKey: user.apiKey });
            })
            .catch(error => {
                res.status(500).json('Internal Server Error');
            });
        });
    });

    app.post('/update-email/:userId', cors(strictCorsOptions), verifyToken, (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const userPromise = AppDataSource.manager.findOne(User, { where: { id: userId } });
        userPromise.then(user => {
            if (!user) {
                res.status(404).json('User not found');
                return;
            }
            user.email = req.body.email;
            return AppDataSource.manager.save(user)
                .then(() => {
                    res.json({ message: 'Email updated successfully' });
                });
        })
        .catch(error => {
            res.status(500).json('Internal Server Error');
        });
    });

    // Integration endpoints - Telegram
    app.post('/telegram/toggle/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { telegramBoolean } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            if (telegramBoolean == true && user.currentPlugins + 1 > user.maxPlugins && user.maxPlugins !== null) {
                res.status(400).send('You have reached your plugin limit');
                return;
            } else {
                user.telegramBoolean = telegramBoolean;
                if (telegramBoolean == true) {
                    user.currentPlugins += 1;
                } else {
                    user.currentPlugins -= 1;
                }
                if (user.currentPlugins < 0) {
                    user.currentPlugins = 0;
                } else if (user.currentPlugins > user.maxPlugins) {
                    user.currentPlugins = user.maxPlugins;
                }
                await AppDataSource.manager.save(user);
                res.status(200).send('Telegram settings updated successfully');
            }
        }
    });

    app.post('/telegram/send/:userId', async (req, res) => {
        const userId = parseInt(req.params.userId);
        logger.debug('Telegram send request', { userId, correlationId: req.correlationId });
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            const message = req.body.message;
            const messageList = [];
            // Loop through the message object and format it to be sent to Telegram
            for (const [key, value] of Object.entries(message)) {
                if (typeof value === 'string') {
                    messageList.push(`${key}: ${value}`);
                } else if (Array.isArray(value)) {
                    messageList.push(`${key}: ${value.join(', ')}`);
                } else {
                    messageList.push(`${key}: ${JSON.stringify(value)}`);
                }
            }
            // Join the formatted message list into a single string
            const formattedMessage = messageList.join('\n\n');

            const sendTelegramMessage = async (chatId, message) => {
                const url = `https://api.telegram.org/bot${getEnv("TELEGRAM_API_TOKEN")}/sendMessage`;
                logger.debug('Sending Telegram message', { chatId, url: maskUrl(url), correlationId: req.correlationId });
            
                try {
                    await axios.post(url, {
                        chat_id: chatId,
                        text: message,
                    });
                    logger.info('Telegram message sent successfully', { chatId, correlationId: req.correlationId });
                } catch (error: any) {
                    logger.error('Error sending Telegram message', { error: error.message, chatId, correlationId: req.correlationId });
                }
            };
            await sendTelegramMessage(user.telegramChatId, formattedMessage);
        }
    });

    app.post('/telegram/unlink/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            const url = `https://api.telegram.org/bot${getEnv("TELEGRAM_API_TOKEN")}/sendMessage`;
            await axios.post(url, {
                chat_id: user.telegramChatId,
                text: "FormFlow will no longer be sending your form submission data to this chat!",
            }).catch(() => {});
            user.telegramChatId = null;
            await AppDataSource.manager.save(user);
            res.json({ message: 'Telegram unlinked successfully' });
        }
    });

    // Integration endpoints - Discord
    app.post('/discord/toggle/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { discordBoolean } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            if (discordBoolean == true && user.currentPlugins + 1 > user.maxPlugins && user.maxPlugins !== null) {
                res.status(400).send('You have reached your plugin limit');
                return;
            } else {
                user.discordBoolean = discordBoolean;
                if (discordBoolean == true) {
                    user.currentPlugins += 1;
                } else {
                    user.currentPlugins -= 1;
                }
                await AppDataSource.manager.save(user);
                res.status(200).send('Discord settings updated successfully');
            }
        }
    });

    app.post('/discord/webhook/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { discordWebhook } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            user.discordWebhook = discordWebhook;
            await AppDataSource.manager.save(user);
            res.json({ message: 'Discord webhook settings updated successfully' });
        }
    });

    // Integration endpoints - Make.com
    app.post('/make/:apikey', cors(strictCorsOptions), async (req, res) => {
        const apiKey = req.params.apikey;
        const message = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { apiKey } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            try {
                logger.info('Sending to Make.com', { apiKey, webhookUrl: maskUrl(user.makeWebhook), correlationId: req.correlationId });
                // Send form data to Make.com
                await axios.post(user.makeWebhook, message);
                res.status(200).send('Form submitted successfully');
            } catch (error: any) {
                logger.error('Error sending data to Make.com', { error: error.message, apiKey, correlationId: req.correlationId });
                res.status(500).send('Internal Server Error');
            }
        }
    });

    app.post('/make/toggle/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { makeBoolean } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            if (makeBoolean == true && user.currentPlugins + 1 > user.maxPlugins && user.maxPlugins !== null) {
                logger.warn('Cannot toggle Make.com - max plugins reached', { userId, currentPlugins: user.currentPlugins, maxPlugins: user.maxPlugins, correlationId: req.correlationId });
                res.status(400).send('You have reached your plugin limit');
                return;
            } else {
                logger.debug('Updating Make.com settings', { userId, makeBoolean, correlationId: req.correlationId });
                user.makeBoolean = makeBoolean;
                if (makeBoolean == true) {
                    user.currentPlugins += 1;
                } else {
                    user.currentPlugins -= 1;
                }
                await AppDataSource.manager.save(user);
                logger.info('Make.com settings updated', { userId, makeBoolean, currentPlugins: user.currentPlugins, maxPlugins: user.maxPlugins, correlationId: req.correlationId });
                res.json({ message: 'Make settings updated successfully' });
            }
        }
    });

    app.post('/make/unlink/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            user.makeWebhook = null;
            await AppDataSource.manager.save(user);
            res.json({ message: 'Make unlinked successfully' });
        }
    });

    app.post('/make/webhook/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { makeWebhook } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            user.makeWebhook = makeWebhook;
            await AppDataSource.manager.save(user);
            res.json({ message: 'Make webhook settings updated successfully' });
        }
    });

    // Integration endpoints - n8n
    app.post('/n8n/send/:apikey', cors(strictCorsOptions), async (req, res) => {
        const apiKey = req.params.apikey;
        const message = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { apiKey } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            try {
                // Send form data to N8N.com
                logger.info('Sending to n8n', { apiKey, webhookUrl: maskUrl(user.n8nWebhook), correlationId: req.correlationId });
                await axios.post(user.n8nWebhook, message);
                res.status(200).send('Form submitted successfully');
            } catch (error: any) {
                logger.error('Error sending message to n8n', { error: error.message, apiKey, correlationId: req.correlationId });
                res.send('Error sending message');
            }
        }
    });

    app.post('/n8n/toggle/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { n8nBoolean } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            if (n8nBoolean == true && user.currentPlugins + 1 > user.maxPlugins && user.maxPlugins !== null) {
                logger.warn('Cannot toggle n8n - max plugins reached', { userId, currentPlugins: user.currentPlugins, maxPlugins: user.maxPlugins, correlationId: req.correlationId });
                res.status(400).send('You have reached your plugin limit');
                return;
            } else {
                logger.debug('Updating n8n settings', { userId, n8nBoolean, correlationId: req.correlationId });
                user.n8nBoolean = n8nBoolean;
                if (n8nBoolean == true) {
                    user.currentPlugins += 1;
                } else {
                    user.currentPlugins -= 1;
                }
                await AppDataSource.manager.save(user);
                res.json({ message: 'N8n settings updated successfully' });
            }
        }
    });

    app.post('/n8n/unlink/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            user.n8nWebhook = null;
            await AppDataSource.manager.save(user);
            res.json({ message: 'N8n unlinked successfully' });
        }
    });

    app.post('/n8n/webhook/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { n8nWebhook } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            user.n8nWebhook = n8nWebhook;
            await AppDataSource.manager.save(user);
            res.json({ message: 'N8n webhook settings updated successfully' });
        }
    });

    // Integration endpoints - Generic Webhook
    app.post('/webhook/toggle/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { webhookBoolean } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            if (webhookBoolean == true && user.currentPlugins + 1 > user.maxPlugins && user.maxPlugins !== null) {
                logger.warn('Cannot toggle webhook - max plugins reached', { userId, currentPlugins: user.currentPlugins, maxPlugins: user.maxPlugins, correlationId: req.correlationId });
                res.status(400).send('You have reached your plugin limit');
                return;
            } else {
                logger.debug('Updating webhook settings', { userId, webhookBoolean, correlationId: req.correlationId });
                user.webhookBoolean = webhookBoolean;
                if (webhookBoolean == true) {
                    user.currentPlugins += 1;
                } else {
                    user.currentPlugins -= 1;
                }
                await AppDataSource.manager.save(user);
                res.json({ message: 'Webhook settings updated successfully' });
            }
        }
    });

    app.post('/webhook/unlink/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            user.webhookWebhook = null;
            await AppDataSource.manager.save(user);
            res.json({ message: 'Webhook unlinked successfully' });
        }
    });

    app.post('/webhook/webhook/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { webhookWebhook } = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            user.webhookWebhook = webhookWebhook;
            await AppDataSource.manager.save(user);
            res.json({ message: 'Webhook settings updated successfully' });
        }
    });

    app.post('/webhook/send/:apikey', cors(strictCorsOptions), async (req, res) => {
        const apiKey = req.params.apikey;
        const message = req.body;
        const user = await AppDataSource.manager.findOne(User, { where: { apiKey } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            try {
                logger.info('Sending webhook', { apiKey, webhookUrl: maskUrl(user.webhookWebhook), correlationId: req.correlationId });
                await axios.post(user.webhookWebhook, message);
                res.status(200).send('Form submitted successfully');
            } catch (error: any) {
                logger.error('Error sending webhook', { error: error.message, apiKey, correlationId: req.correlationId });
                res.send('Error sending message');
            }
        }
    });

    // User domain management
    app.post('/add-domain/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId, 10);
        const domain = req.body.domain;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
    
        if (!user) {
            res.status(400).send('User not found');
            return;
        } 
        if (user.allowedDomains.length <= 50) {
            user.allowedDomains.push(domain);
            await AppDataSource.manager.save(user);
            res.json({ message: 'Domain added successfully' });
        } else {
            res.status(400).send('You can only add 50 domains');
        }
    });

    app.post('/remove-domain/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId, 10);
        const domain = req.body.domain;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            user.allowedDomains = user.allowedDomains.filter(d => d !== domain);
            await AppDataSource.manager.save(user);
            res.json({ message: 'Domain removed successfully' });
        }
    });

    // Return email settings
    app.post('/update-return-settings/:userId', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
        const userId = parseInt(req.params.userId);
        const { smtpHost, smtpPort, smtpUsername, smtpPassword, emailSubject, emailBody, returnMessage } = req.body;
        try {
            const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
            if (!user) {
                res.status(400).send('User not found');
                return;
            } else {
                user.returnBoolean = returnMessage;
                user.emailSubject = emailSubject;
                user.emailBody = emailBody;
                await AppDataSource.manager.save(user);
                user.smtpHost = smtpHost;
                user.smtpPort = smtpPort;
                user.smtpUsername = smtpUsername;
                user.smtpPassword = smtpPassword;
                user.fromEmailAccessToken = null;
                user.fromEmail = null;
                user.fromEmailRefreshToken = null;
                res.json({ message: 'Settings updated successfully' });
                if (smtpHost && smtpPort && smtpUsername && smtpPassword) {
                    await AppDataSource.manager.save(user);
                }
            }

        } catch (error: any) {
            logger.error('Error during update return settings', { error: error.message, stack: error.stack, userId, correlationId: req.correlationId });
            res.status(500).json({ error: 'An error occurred during the update process' });
        }
    });

    // Telegram OAuth
    app.get('/oauth/telegram/:userId', cors(strictCorsOptions), async (req, res) => {
        const userId = parseInt(req.params.userId);
        const verifyTelegramHash = (authData, botToken) => {
            const secretKey = crypto.createHash('sha256').update(botToken).digest();
            const dataCheckString = Object.keys(authData)
                .filter(key => key !== 'hash')
                .sort()
                .map(key => `${key}=${authData[key]}`)
                .join('\n');
        
            const hmac = crypto.createHmac('sha256', secretKey)
                .update(dataCheckString)
                .digest('hex');
        
            return hmac === authData.hash;
        };
        
        const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.query;
        const botToken = getEnv("TELEGRAM_API_TOKEN");
    
        try {
            const isValid = await verifyTelegramHash(req.query, botToken);

            if (isValid) {
                const sendTelegramMessage = async (chatId, message) => {
                    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
                
                    try {
                        await axios.post(url, {
                            chat_id: chatId,
                            text: message,
                        });
                    } catch (_error) {
                        // Silently ignore Telegram send errors
                    }
                };
                await sendTelegramMessage(id, `Hi ${first_name}! FormFlow will now be sending your form submission data to this chat!`);

                const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
                if (!user) {
                    res.status(400).send('User not found');
                    return;
                } else {
                    user.telegramChatId = Number(id);
                    await AppDataSource.manager.save(user);
                    res.redirect(redirectUrl + "/dashboard");
                    return;
                }
            } else {
                // Invalid hash
                res.status(400).send('Invalid request');
            }
        } catch (error) {
            res.status(500).send('Internal Server Error');
        }
    });

    // Legacy return email endpoint (called by form-api)
    app.post('/formflow/return/:apikey', async (req, res) => {
        const isValidEmail = async (email: string): Promise<boolean> => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        try {
            const { emailToSendTo } = req.body;
            const apiKey = req.params.apikey;
            const user = await AppDataSource.manager.findOne(User, { where: { apiKey } });
            if (!user) {
                res.status(400).send('User not found');
                return;
            } else {
                if (user.returnBoolean === true && user.emailSubject && user.emailBody) {
                    const email = user.fromEmail;
                    const accessToken = user.fromEmailAccessToken;
                    const refreshToken = user.fromEmailRefreshToken;
                    const smtpHost = user.smtpHost;
                    const smtpPort = user.smtpPort;
                    const smtpUsername = user.smtpUsername;
                    const smtpPassword = user.smtpPassword;
                    const emailSubject = user.emailSubject;
                    const emailBody = user.emailBody;
                    const returnMessage = user.returnBoolean;
                    if (smtpHost && smtpPort && smtpUsername && smtpPassword && emailSubject && emailBody && returnMessage && await isValidEmail(emailToSendTo) === true) {
                        const transporter = nodemailer.createTransport({
                            host: smtpHost,
                            port: smtpPort,
                            secure: true,
                            auth: {
                                user: smtpUsername,
                                pass: smtpPassword,
                            },
                        });
                        const mailMessage = {
                            from: smtpUsername,
                            to: emailToSendTo,
                            subject: emailSubject,
                            text: emailBody,
                        }
                        transporter.sendMail(mailMessage, (error) => {
                            if (error) {
                                return;
                            } else {
                                res.json({ message: 'Email sent successfully' });
                            }
                        }); 
                    } else if (email && accessToken && refreshToken && await isValidEmail(emailToSendTo) === true) {
                        logger.info('Sending return email from Gmail', { userId: user.id, emailToSendTo, correlationId: req.correlationId });
                        const transporter = nodemailer.createTransport({
                            host: 'smtp.gmail.com',
                            port: 465,
                            secure: true,
                            auth: {
                                type: 'OAuth2',
                                user: email,
                                accessToken: accessToken,
                                refreshToken: refreshToken,
                                clientId: getEnv("GOOGLE_CLIENT_ID"),
                                clientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
                            },
                        });
                        const mailMessage = {
                            from: email,
                            to: emailToSendTo,
                            subject: emailSubject,
                            text: emailBody,
                        }
                        transporter.sendMail(mailMessage, (error) => {
                            if (error) {
                                logger.error('Error sending return email from Gmail', { error: error.message, userId: user.id, emailToSendTo, correlationId: req.correlationId });
                                res.status(500).json('Error sending email');
                            } else {
                                logger.info('Return email sent successfully from Gmail', { userId: user.id, emailToSendTo, correlationId: req.correlationId });
                                res.json({ message: 'Email sent successfully' });
                            }
                        });
                    } else {
                        logger.info('Sending return email from FormFlow email', { userId: user.id, emailToSendTo, correlationId: req.correlationId });
                        const emailSubject = user.emailSubject;
                        const emailBody = user.emailBody;
                        const transporter = nodemailer.createTransport({
                            host: 'smtp.gmail.com',
                            port: 465,
                            secure: true,
                            auth: {
                                type: 'OAuth2',
                                clientId: getEnv("GMAIL_CLIENT"),
                                clientSecret: getEnv("GMAIL_SECRET"),
                            },
                        });
                        const mailMessage = {
                            from: getEnv("EMAIL_USER"),
                            to: emailToSendTo,
                            subject: emailSubject,
                            text: emailBody,
                        };
                        transporter.sendMail(mailMessage, (error) => {
                            if (error) {
                                res.status(500).json('Error sending email');
                            } else {
                                res.json({ message: 'Email sent successfully' });
                            }
                        });
                        return
                    }
                }
            }

        } catch (error) {
            res.status(500).json({ error: 'Failed to send email' });
        }
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

    const server = app.listen(PORT, () => {
        logger.info(`Dashboard API server has started on port ${PORT}`, { port: PORT, environment: process.env.NODE_ENV || 'development' });
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
