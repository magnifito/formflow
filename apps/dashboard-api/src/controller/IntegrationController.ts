import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, integrations, forms, organizations } from "@formflow/shared/db";
import { eq, and, desc, asc, isNull } from "drizzle-orm";
// We need IntegrationScope from db as it might be an enum shared across apps
import { IntegrationScope } from "@formflow/shared/db";
import { verifyToken, AuthRequest } from "../middleware/auth";
import logger, { LogOperation } from "@formflow/shared/logger";
import { IntegrationType } from "@formflow/shared/queue";
import { TelegramService } from "@formflow/shared/telegram";
import { resolveIntegrationStack } from "@formflow/shared/integrations";
import axios from "axios";
import nodemailer from "nodemailer";
import cors from "cors";


const router = Router();

// Define strict CORS options for integration management
const strictCorsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-altcha-spam-filter', 'x-api-key', 'Authorization', 'X-Organization-Context', 'X-CSRF-Token'],
    credentials: true
};

const parseRecipients = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    return String(value).split(',').map(v => v.trim()).filter(Boolean);
};

const normalizeConfigForType = (type: IntegrationType, rawConfig: any) => {
    const config = { ...(rawConfig || {}) };

    switch (type) {
        case IntegrationType.EMAIL_SMTP: {
            config.recipients = parseRecipients(config.recipients);
            if (!config.recipients.length) throw new Error('Email recipients are required');
            if (!config.smtp && !config.oauth) {
                throw new Error('Provide SMTP credentials or OAuth tokens for email integrations');
            }
            if (config.smtp) {
                if (!config.smtp.host || !config.smtp.port || !config.smtp.username || !config.smtp.password) {
                    throw new Error('SMTP host, port, username, and password are required');
                }
            }
            if (config.oauth) {
                if (!config.oauth.clientId || !config.oauth.clientSecret || !config.oauth.user || !config.oauth.refreshToken || !config.oauth.accessToken) {
                    throw new Error('OAuth clientId, clientSecret, user, refreshToken, and accessToken are required');
                }
            }
            break;
        }
        case IntegrationType.EMAIL_API: {
            config.recipients = parseRecipients(config.recipients);
            const api = config.emailApi || {};
            if (!config.recipients.length) throw new Error('Email recipients are required');
            if (!api.provider || !api.apiToken) throw new Error('Email API provider and apiToken are required');
            config.emailApi = api;
            break;
        }
        case IntegrationType.SLACK: {
            // accessToken can come from org settings, only channelId is required per-integration
            if (!config.channelId) throw new Error('Slack channel ID is required');
            break;
        }
        case IntegrationType.DISCORD: {
            if (!config.webhookUrl) throw new Error('Discord webhook URL is required');
            break;
        }
        case IntegrationType.TELEGRAM: {
            // botToken can come from org settings, only chatId is required per-integration
            if (!config.chatId) throw new Error('Telegram chat ID is required');
            break;
        }
        case IntegrationType.WEBHOOK: {
            if (!config.webhook) throw new Error('Webhook URL is required');
            break;
        }
        default:
            break;
    }

    return config;
};

const getFormIfAuthorized = async (formId: number | undefined, organizationId: number) => {
    if (!formId) return null;
    return db.query.forms.findFirst({
        where: and(eq(forms.id, formId), eq(forms.organizationId, organizationId))
    });
};

const resolveOrganizationContext = async (req: AuthRequest) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, req.user!.userId),
        with: { organization: true }
    });
    if (!user) {
        throw new Error('User not found');
    }

    if (user.isSuperAdmin) {
        const headerOrg = req.headers['x-organization-context'];
        if (headerOrg) {
            const orgId = parseInt(String(headerOrg), 10);
            if (!isNaN(orgId)) {
                const org = await db.query.organizations.findFirst({
                    where: and(eq(organizations.id, orgId), eq(organizations.isActive, true))
                });
                if (org) {
                    return { user, organizationId: org.id };
                }
            }
        }
        // fallback to first active org if none specified and user has none
        if (user.organizationId) {
            return { user, organizationId: user.organizationId };
        }
        const firstOrg = await db.query.organizations.findFirst({
            where: eq(organizations.isActive, true),
            orderBy: asc(organizations.id)
        });
        if (!firstOrg) throw new Error('No active organization available for context');
        return { user, organizationId: firstOrg.id };
    }

    if (!user.organizationId) {
        throw new Error('Organization not found');
    }
    return { user, organizationId: user.organizationId };
};

// GET / - List all integrations for the user's organization
router.get('/', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { formId: rawFormId, scope: rawScope } = req.query;
        const { user, organizationId } = await resolveOrganizationContext(req);

        const formId = rawFormId ? parseInt(String(rawFormId), 10) : undefined;
        const scope = rawScope as IntegrationScope | undefined;

        if (formId) {
            const form = await getFormIfAuthorized(formId, organizationId);
            if (!form) {
                return res.status(404).json({ error: 'Form not found for this organization' });
            }
        }

        const whereConditions: any[] = [eq(integrations.organizationId, organizationId)];
        if (formId) whereConditions.push(eq(integrations.formId, formId));
        if (scope === IntegrationScope.ORGANIZATION || scope === IntegrationScope.FORM) {
            whereConditions.push(eq(integrations.scope, scope));
        }

        const integrationsList = await db.query.integrations.findMany({
            where: and(...whereConditions),
            orderBy: desc(integrations.createdAt)
        });

        res.json(integrationsList);
    } catch (error: any) {
        logger.error('Failed to list integrations', { error: error.message, userId: req.user?.userId });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST / - Create a new integration
router.post('/', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { type, name, config, formId: rawFormId, scope: rawScope, isActive } = req.body;

        const { user, organizationId } = await resolveOrganizationContext(req);

        if (!type || !name) {
            return res.status(400).json({ error: 'Type and Name are required' });
        }

        // Validate type
        if (!Object.values(IntegrationType).includes(type)) {
            return res.status(400).json({ error: 'Invalid integration type' });
        }

        const formId = rawFormId ? parseInt(String(rawFormId), 10) : undefined;
        const requestedScope = rawScope === IntegrationScope.FORM ? IntegrationScope.FORM : IntegrationScope.ORGANIZATION;
        const scope: IntegrationScope = formId ? IntegrationScope.FORM : requestedScope;

        if (scope === IntegrationScope.FORM && !formId) {
            return res.status(400).json({ error: 'formId is required for form overrides' });
        }

        if (formId) {
            const form = await getFormIfAuthorized(formId, organizationId);
            if (!form) {
                return res.status(404).json({ error: 'Form not found for this organization' });
            }
        }

        const normalizedConfig = normalizeConfigForType(type, config);

        const [integration] = await db.insert(integrations).values({
            organizationId,
            formId: formId || null,
            scope,
            type,
            name,
            config: normalizedConfig,
            isActive: isActive !== undefined ? Boolean(isActive) : true
        }).returning();

        logger.info('Integration created', {
            operation: LogOperation.INTEGRATION_CREATE,
            integrationId: integration.id,
            type,
            organizationId: user.organizationId,
            correlationId: req.correlationId
        });

        res.status(201).json(integration);
    } catch (error: any) {
        logger.error('Failed to create integration', { error: error.message });
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// PUT /:id - Update an integration
router.put('/:id', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const integrationId = parseInt(req.params.id);
        const { name, config, isActive, formId: rawFormId } = req.body;

        const { organizationId } = await resolveOrganizationContext(req);

        const integration = await db.query.integrations.findFirst({
            where: and(eq(integrations.id, integrationId), eq(integrations.organizationId, organizationId))
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        // Prepare updates
        const updates: any = { updatedAt: new Date() };

        if (rawFormId) {
            const form = await getFormIfAuthorized(parseInt(String(rawFormId), 10), organizationId);
            if (!form) {
                return res.status(404).json({ error: 'Form not found for this organization' });
            }
            updates.formId = form.id;
            updates.scope = IntegrationScope.FORM;

            // Update local object for logging/response
            integration.formId = form.id;
            integration.scope = IntegrationScope.FORM;
        }

        if (name !== undefined) {
            updates.name = name;
            integration.name = name;
        }
        if (config !== undefined) {
            const newConfig = normalizeConfigForType(integration.type as IntegrationType, config);
            updates.config = newConfig;
            integration.config = newConfig;
        }
        if (isActive !== undefined) {
            updates.isActive = Boolean(isActive);
            integration.isActive = Boolean(isActive);
        }

        await db.update(integrations).set(updates).where(eq(integrations.id, integrationId));

        logger.info('Integration updated', {
            operation: LogOperation.INTEGRATION_UPDATE,
            integrationId,
            organizationId,
            correlationId: req.correlationId
        });

        res.json(integration);
    } catch (error: any) {
        logger.error('Failed to update integration', { error: error.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /:id - Delete an integration
router.delete('/:id', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const integrationId = parseInt(req.params.id);

        const { organizationId, user } = await resolveOrganizationContext(req);

        const integration = await db.query.integrations.findFirst({
            where: and(eq(integrations.id, integrationId), eq(integrations.organizationId, organizationId))
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        await db.delete(integrations).where(eq(integrations.id, integrationId));

        logger.info('Integration deleted', {
            operation: LogOperation.INTEGRATION_DELETE,
            integrationId,
            organizationId,
            correlationId: req.correlationId
        });

        res.json({ message: 'Integration deleted successfully' });
    } catch (error: any) {
        logger.error('Failed to delete integration', { error: error.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /hierarchy - Fetch org + form integrations and resolved stacks
// GET /hierarchy - Fetch org + form integrations and resolved stacks
router.get('/hierarchy', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { organizationId } = await resolveOrganizationContext(req);

        let formsList: any[] = [];
        let integrationsList: any[] = [];

        [formsList, integrationsList] = await Promise.all([
            db.query.forms.findMany({
                where: eq(forms.organizationId, organizationId)
            }),
            db.query.integrations.findMany({
                where: eq(integrations.organizationId, organizationId)
            })
        ]);

        const orgIntegrations = integrationsList.filter(i => i.scope === IntegrationScope.ORGANIZATION || !i.formId);
        const formScoped = integrationsList.filter(i => i.scope === IntegrationScope.FORM || i.formId);

        const formsPayload = formsList.map(form => {
            const scoped = formScoped.filter(i => i.formId === form.id);
            const effectiveIntegrations = resolveIntegrationStack({
                orgIntegrations,
                formIntegrations: scoped,
                useOrgIntegrations: form.useOrgIntegrations ?? true
            });

            return {
                id: form.id,
                name: form.name,
                slug: form.slug,
                useOrgIntegrations: form.useOrgIntegrations,
                integrations: scoped,
                effectiveIntegrations
            };
        });

        res.json({
            organizationIntegrations: orgIntegrations,
            forms: formsPayload
        });

        logger.info('Integrations hierarchy fetched', {
            organizationId,
            orgIntegrationCount: orgIntegrations.length,
            formCount: formsList.length,
            correlationId: req.correlationId
        });
    } catch (error: any) {
        logger.error('Failed to load integration hierarchy', { error: error.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /:id/test - Test an integration
router.post('/:id/test', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const integrationId = parseInt(req.params.id);

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user || user.organizationId === null) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const integration = await db.query.integrations.findFirst({
            where: and(eq(integrations.id, integrationId), eq(integrations.organizationId, user.organizationId))
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        // Get organization for bot tokens
        const organization = await db.query.organizations.findFirst({
            where: eq(organizations.id, user.organizationId)
        });

        const testMessage = `FormFlow Test: Your "${integration.name}" integration is working correctly!`;
        const testData = {
            test: true,
            message: "Success",
            timestamp: new Date().toISOString(),
            source: "FormFlow Integration Tester"
        };

        // Merge org-level bot tokens with integration config
        const rawConfig = integration.config as any;
        const config = {
            ...rawConfig,
            // Use org tokens if not in integration config
            accessToken: rawConfig.accessToken || organization?.slackBotToken,
            botToken: rawConfig.botToken || organization?.telegramBotToken,
        };

        try {
            switch (integration.type) {
                case IntegrationType.EMAIL_SMTP: {
                    const recipients = parseRecipients(config.recipients);
                    if (!recipients.length) throw new Error('No recipients configured');
                    if (!config.smtp && !config.oauth) {
                        throw new Error('Email integration missing SMTP or OAuth configuration');
                    }

                    const transporter = config.smtp
                        ? nodemailer.createTransport({
                            host: config.smtp.host,
                            port: config.smtp.port,
                            secure: config.smtp.secure ?? (config.smtp.port === 465),
                            auth: {
                                user: config.smtp.username,
                                pass: config.smtp.password,
                            },
                            tls: {
                                rejectUnauthorized: false
                            },
                            debug: true,
                            logger: true,
                            connectionTimeout: 10000,
                            greetingTimeout: 10000,
                            socketTimeout: 10000,
                            ignoreTLS: config.smtp.host === '127.0.0.1' || config.smtp.host === 'localhost' || config.smtp.port === 1025,
                        })
                        : nodemailer.createTransport({
                            host: 'smtp.gmail.com',
                            port: 465,
                            secure: true,
                            auth: {
                                type: 'OAuth2',
                                clientId: config.oauth?.clientId,
                                clientSecret: config.oauth?.clientSecret,
                            },
                        });

                    await transporter.sendMail({
                        from: config.fromEmail || '"FormFlow Test" <no-reply@formflow.fyi>',
                        to: recipients,
                        subject: `Test: ${integration.name}`,
                        text: testMessage,
                        auth: config.smtp ? undefined : {
                            user: config.oauth?.user,
                            refreshToken: config.oauth?.refreshToken,
                            accessToken: config.oauth?.accessToken,
                        },
                    });
                    break;
                }
                case IntegrationType.TELEGRAM: {
                    const { botToken, chatId } = config;
                    if (!botToken) throw new Error('No Bot Token configured');
                    if (!chatId) throw new Error('No Chat ID configured');
                    const telegramService = new TelegramService(botToken);
                    const tgResult = await telegramService.sendMessage({
                        chatId: Number(chatId),
                        message: testMessage
                    });
                    if (!tgResult.success) throw new Error(tgResult.error || 'Telegram error');
                    break;
                }
                case IntegrationType.DISCORD: {
                    const webhookUrl = config.webhookUrl;
                    if (!webhookUrl) throw new Error('No Webhook URL configured');
                    await axios.post(webhookUrl, { content: `**${testMessage}**` });
                    break;
                }
                case IntegrationType.SLACK: {
                    const { accessToken, channelId } = config;
                    if (!accessToken || !channelId) throw new Error('Slack config missing');
                    await axios.post('https://slack.com/api/chat.postMessage', {
                        channel: channelId,
                        text: testMessage,
                    }, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    break;
                }
                case IntegrationType.WEBHOOK: {
                    const url = config.webhook;
                    if (!url) throw new Error('No Webhook URL configured');
                    await axios.post(url, testData);
                    break;
                }
                default:
                    throw new Error(`Testing not supported for ${integration.type}`);
            }
        } catch (handlerError: any) {
            logger.error('Integration test failed', {
                integrationId,
                type: integration.type,
                error: handlerError.message
            });
            return res.status(400).json({
                error: 'Test failed',
                details: handlerError.message || 'Unknown error'
            });
        }

        res.json({ success: true, message: 'Test successful' });
    } catch (error: any) {
        logger.error('Error testing integration', { error: error.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /types - List valid integration types
router.get('/types', cors(strictCorsOptions), (req: Request, res: Response) => {
    res.json(Object.values(IntegrationType));
});

export default router;
