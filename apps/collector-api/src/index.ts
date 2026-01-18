import "reflect-metadata";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import axios from 'axios';
import { AppDataSource } from "./data-source";
import { User } from "@formflow/shared/entities";
import SubmissionController from "./controller/SubmissionController";
const createChallenge = require("./Alcha/Challenge.js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || "http://localhost:3000";

async function initializeServer() {
    await AppDataSource.initialize();

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

    // Form submission routes
    app.use('/submit', SubmissionController);

    // Email transporter for legacy endpoints
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            type: 'OAuth2',
            clientId: process.env.GMAIL_CLIENT,
            clientSecret: process.env.GMAIL_SECRET,
        },
    });

    // Legacy endpoint: Basic post route, sends form data to the users email.
    app.post('/formflow/:apikey', async (req, res) => {
        console.log("req.body: ", req.body);
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
                    console.log("User not found!");
                    res.status(401).json('Unauthorized');
                    return;
                }

                // Check allowed domains
                if (user.allowedDomains.length > 0 && req.headers.origin) {
                    const isAllowed = user.allowedDomains.some(domain => req.headers.origin.includes(domain)) 
                        || req.headers.origin.includes("localhost");
                    if (!isAllowed) {
                        console.log("Domain not allowed:", req.headers.origin);
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
                    }).catch(err => console.error('Return email error:', err));
                }

                // Send to integrations via dashboard-api
                if (user.telegramChatId != null && user.telegramBoolean) {
                    axios.post(`${DASHBOARD_API_URL}/telegram/send/${user.id}`, {
                        message: req.body,
                    }).catch(err => console.error('Telegram error:', err));
                }

                if (user.discordWebhook != null && user.discordBoolean) {
                    await axios.post(user.discordWebhook, { content: niceMessageDiscord })
                        .catch(err => console.error('Discord error:', err));
                }

                if (user.makeBoolean === true && user.makeWebhook != null) {
                    axios.post(`${DASHBOARD_API_URL}/make/${apikey}`, {
                        message: req.body,
                    }).catch(err => console.error('Make error:', err));
                }

                if (user.n8nBoolean === true && user.n8nWebhook != null) {
                    axios.post(`${DASHBOARD_API_URL}/n8n/send/${apikey}`, {
                        message: req.body,
                    }).catch(err => console.error('n8n error:', err));
                }

                if (user.webhookBoolean === true && user.webhookWebhook != null) {
                    axios.post(`${DASHBOARD_API_URL}/webhook/send/${apikey}`, {
                        message: req.body,
                    }).catch(err => console.error('Webhook error:', err));
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
                    user: process.env.GMAIL_EMAIL,
                    refreshToken: process.env.GMAIL_REFRESH,
                    accessToken: process.env.GMAIL_ACCESS,
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
                        console.log("sending from gmail.")
                        const transporter = nodemailer.createTransport({
                            host: 'smtp.gmail.com',
                            port: 465,
                            secure: true,
                            auth: {
                                type: 'OAuth2',
                                user: email,
                                accessToken: accessToken,
                                refreshToken: refreshToken,
                                clientId: process.env.GOOGLE_CLIENT_ID,
                                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
                                console.error(error);
                                res.status(500).json('Error sending email');
                            } else {
                                res.json({ message: 'Email sent successfully' });
                            }
                        });
                    } else {
                        console.log("Sending from formflow email.")
                        const emailSubject = user.emailSubject;
                        const emailBody = user.emailBody;
                        const mailMessage = {
                            from: process.env.EMAIL_USER,
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

    app.listen(PORT, () => {
        console.log(`Form API server has started on port ${PORT}.`);
    });
}

initializeServer();

export { app, initializeServer };
