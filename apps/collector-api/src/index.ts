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
import logger from "@formflow/shared/utils/logger";
import { maskUrl } from "@formflow/shared/utils/logger";
const createChallenge = require("./Alcha/Challenge.js");

loadEnv();

const PORT = getEnv("PORT") || 3001;
const DASHBOARD_API_URL = getEnv("DASHBOARD_API_URL") || "http://localhost:3000";

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
        res.send('Hello, from FormFlow Form API!');
    });
  
    app.use(bodyParser.json());

    // Request logging middleware (after body parser to capture request body)
    app.use(requestLogger);

    // Form submission routes
    app.use('/submit', SubmissionController);

    // Email transporter for legacy endpoints
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

    // Legacy endpoint: Basic post route, sends form data to the users email.
    app.post('/formflow/:apikey', async (req, res) => {
        logger.debug('Legacy formflow endpoint called', { apikey: req.params.apikey, correlationId: req.correlationId });
        const { apikey } = req.params;
        const { name, email, message } = req.body;
        const messageList = [];
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string' && value !== "") {
                messageList.push(`${key}: ${value}`);
            }
        }
        const niceMessage = messageList.join('\n\n');
        if (niceMessage.length > 4000) {
            // If the message is too long, return.
            return;
        }
        if (niceMessage === "") {
            // If the message is empty, return.
            return;
        }
        //wrap nice message in ``` to make it look better
        const niceMessageDiscord = `\`\`\`${niceMessage}\`\`\``;
        // Find the user in the database with API key, then increment the current submissions
        AppDataSource.manager.findOne(User, { where: { apiKey: apikey } })
            .then(async user => {
                if (!user) {
                    logger.warn('User not found for legacy endpoint', { apikey, correlationId: req.correlationId });
                    res.status(401).json('Unauthorized');
                    return;
                }

                // Check allowed domains
                if (user.allowedDomains.length > 0 && req.headers.origin) {
                    const isAllowed = user.allowedDomains.some(domain => req.headers.origin.includes(domain)) 
                        || req.headers.origin.includes("localhost");
                    if (!isAllowed) {
                        logger.warn('Domain not allowed for legacy endpoint', { origin: req.headers.origin, userId: user.id, correlationId: req.correlationId });
                        res.status(403).json('You are not allowed to submit from this domain');
                        return;
                    }
                }

                const recEmail = user.email;
                await sendMail(recEmail, name, email, message, null, res);

                // Send return email if enabled
                if (user.returnBoolean === true) {
                    axios.post(`${DASHBOARD_API_URL}/formflow/return/${apikey}`, {
                        emailToSendTo: email,
                    }).catch(err => logger.error('Return email error', { error: err.message, userId: user.id, correlationId: req.correlationId }));
                }

                // Send to integrations via dashboard-api
                if (user.telegramChatId != null && user.telegramBoolean) {
                    axios.post(`${DASHBOARD_API_URL}/telegram/send/${user.id}`, {
                        message: req.body,
                    }).catch(err => logger.error('Telegram error', { error: err.message, userId: user.id, correlationId: req.correlationId }));
                }

                if (user.discordWebhook != null && user.discordBoolean) {
                    await axios.post(user.discordWebhook, { content: niceMessageDiscord })
                        .catch(err => logger.error('Discord error', { error: err.message, userId: user.id, correlationId: req.correlationId }));
                }

                if (user.makeBoolean === true && user.makeWebhook != null) {
                    axios.post(`${DASHBOARD_API_URL}/make/${apikey}`, {
                        message: req.body,
                    }).catch(err => logger.error('Make error', { error: err.message, userId: user.id, correlationId: req.correlationId }));
                }

                if (user.n8nBoolean === true && user.n8nWebhook != null) {
                    axios.post(`${DASHBOARD_API_URL}/n8n/send/${apikey}`, {
                        message: req.body,
                    }).catch(err => logger.error('n8n error', { error: err.message, userId: user.id, correlationId: req.correlationId }));
                }

                if (user.webhookBoolean === true && user.webhookWebhook != null) {
                    axios.post(`${DASHBOARD_API_URL}/webhook/send/${apikey}`, {
                        message: req.body,
                    }).catch(err => logger.error('Webhook error', { error: err.message, userId: user.id, correlationId: req.correlationId }));
                }
            })
            .catch(error => {
                res.status(500).json(`Internal Server Error: ${error}`);
            });

        async function sendMail(recEmail, name, email, message, file, res) {      
            if (niceMessage === "") {
                return;
            }
            const mailMessage = {
                from: '"New FormFlow Submission" <new-submission@formflow.fyi>',
                to: [recEmail,],
                subject: 'New Form Submission',
                text: `${niceMessage}`,
                attachments: file ? [{ filename: file.originalname, content: file.buffer }] : [],
                auth: {
                    user: getEnv("GMAIL_EMAIL"),
                    refreshToken: getEnv("GMAIL_REFRESH"),
                    accessToken: getEnv("GMAIL_ACCESS"),
                    expires: 1484314697598,
                },
            };
            transporter.sendMail(mailMessage, (error) => {
                if (error) {
                    res.status(500).json(`Error sending email: ${error}`);
                } else {
                    res.json('Email sent successfully');
                }
            });
        }
    });

    // Legacy endpoint: Sends the return email to the user's client's.
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
                        // console.log("sending from smtp server.")
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
                                // console.log("Error sending email: ", error);
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

    // Legacy endpoint: Challenge endpoint
    app.get('/challenge/:apikey', async (req, res) => {
        const apiKey  = req.params.apikey;
        const user = await AppDataSource.manager.findOne(User, { where: { apiKey: apiKey } });
        if (!user) {
            res.status(400).send('User not found');
            return;
        } else {
            createChallenge(req, res);
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
        logger.info(`Form API server has started on port ${PORT}`, { port: PORT, environment: process.env.NODE_ENV || 'development' });
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
