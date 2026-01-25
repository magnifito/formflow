import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User, Integration, Form, IntegrationScope } from "@formflow/shared/entities";
import { verifyToken, AuthRequest } from "../middleware/auth";
import logger, { LogOperation } from "@formflow/shared/logger";
import { IntegrationType } from "@formflow/shared/queue";
import { getTelegramService } from "@formflow/shared/telegram";
import { resolveIntegrationStack, normalizeLegacyFormIntegration } from "@formflow/shared/integrations";
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
            if (!api.provider || !api.apiKey) throw new Error('Email API provider and apiKey are required');
            config.emailApi = api;
            break;
        }
        case IntegrationType.SLACK: {
            if (!config.accessToken || !config.channelId) {
                throw new Error('Slack access token and channel ID are required');
            }
            break;
        }
        case IntegrationType.DISCORD: {
            if (!config.webhookUrl) throw new Error('Discord webhook URL is required');
            break;
        }
        case IntegrationType.TELEGRAM: {
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
    return AppDataSource.manager.findOne(Form, {
        where: { id: formId, organizationId },
        relations: ['integration']
    });
};

// GET / - List all integrations for the user's organization
router.get('/', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { formId: rawFormId, scope: rawScope } = req.query;

        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user || user.organizationId === null) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const formId = rawFormId ? parseInt(String(rawFormId), 10) : undefined;
        const scope = rawScope as IntegrationScope | undefined;

        if (formId) {
            const form = await getFormIfAuthorized(formId, user.organizationId);
            if (!form) {
                return res.status(404).json({ error: 'Form not found for this organization' });
            }
        }

        const where: any = { organizationId: user.organizationId };
        if (formId) where.formId = formId;
        if (scope === IntegrationScope.ORGANIZATION || scope === IntegrationScope.FORM) {
            where.scope = scope;
        }

        const integrations = await AppDataSource.manager.find(Integration, {
            where,
            order: { createdAt: 'DESC' }
        });

        res.json(integrations);
    } catch (error: any) {
        logger.error('Failed to list integrations', { error: error.message, userId: req.user?.userId });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST / - Create a new integration
router.post('/', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { type, name, config, formId: rawFormId, scope: rawScope, isActive } = req.body;

        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user || user.organizationId === null) {
            return res.status(404).json({ error: 'Organization not found' });
        }

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
            const form = await getFormIfAuthorized(formId, user.organizationId);
            if (!form) {
                return res.status(404).json({ error: 'Form not found for this organization' });
            }
        }

        const normalizedConfig = normalizeConfigForType(type, config);

        const integration = AppDataSource.manager.create(Integration, {
            organizationId: user.organizationId,
            formId: formId || null,
            scope,
            type,
            name,
            config: normalizedConfig,
            isActive: isActive !== undefined ? Boolean(isActive) : true
        });

        await AppDataSource.manager.save(integration);

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
        const userId = req.user!.userId;
        const integrationId = parseInt(req.params.id);
        const { name, config, isActive, formId: rawFormId } = req.body;

        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user || user.organizationId === null) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const integration = await AppDataSource.manager.findOne(Integration, {
            where: { id: integrationId, organizationId: user.organizationId }
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        if (rawFormId) {
            const form = await getFormIfAuthorized(parseInt(String(rawFormId), 10), user.organizationId);
            if (!form) {
                return res.status(404).json({ error: 'Form not found for this organization' });
            }
            integration.formId = form.id;
            integration.scope = IntegrationScope.FORM;
        }

        if (name !== undefined) integration.name = name;
        if (config !== undefined) integration.config = normalizeConfigForType(integration.type, config);
        if (isActive !== undefined) integration.isActive = Boolean(isActive);

        await AppDataSource.manager.save(integration);

        logger.info('Integration updated', {
            operation: LogOperation.INTEGRATION_UPDATE,
            integrationId,
            organizationId: user.organizationId,
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
        const userId = req.user!.userId;
        const integrationId = parseInt(req.params.id);

        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user || user.organizationId === null) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const integration = await AppDataSource.manager.findOne(Integration, {
            where: { id: integrationId, organizationId: user.organizationId }
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        await AppDataSource.manager.remove(integration);

        logger.info('Integration deleted', {
            operation: LogOperation.INTEGRATION_DELETE,
            integrationId,
            organizationId: user.organizationId,
            correlationId: req.correlationId
        });

        res.json({ message: 'Integration deleted successfully' });
    } catch (error: any) {
        logger.error('Failed to delete integration', { error: error.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /hierarchy - Fetch org + form integrations and resolved stacks
router.get('/hierarchy', cors(strictCorsOptions), verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user || user.organizationId === null) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const [forms, integrations] = await Promise.all([
            AppDataSource.manager.find(Form, {
                where: { organizationId: user.organizationId },
                relations: ['integration']
            }),
            AppDataSource.manager.find(Integration, {
                where: { organizationId: user.organizationId }
            })
        ]);

        const orgIntegrations = integrations.filter(i => i.scope === IntegrationScope.ORGANIZATION || !i.formId);
        const formScoped = integrations.filter(i => i.scope === IntegrationScope.FORM || i.formId);

        const formsPayload = forms.map(form => {
            const scoped = formScoped.filter(i => i.formId === form.id);
            const legacy = scoped.length === 0
                ? normalizeLegacyFormIntegration(form.integration, user.organizationId ?? undefined, form.id)
                : [];

            const effectiveIntegrations = resolveIntegrationStack({
                orgIntegrations,
                formIntegrations: scoped.length ? scoped : legacy,
                useOrgIntegrations: form.useOrgIntegrations ?? true
            });

            return {
                id: form.id,
                name: form.name,
                slug: form.slug,
                useOrgIntegrations: form.useOrgIntegrations,
                integrations: scoped,
                legacyIntegrations: legacy,
                effectiveIntegrations
            };
        });

        res.json({
            organizationIntegrations: orgIntegrations,
            forms: formsPayload
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

        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user || user.organizationId === null) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const integration = await AppDataSource.manager.findOne(Integration, {
            where: { id: integrationId, organizationId: user.organizationId }
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        const testMessage = `FormFlow Test: Your "${integration.name}" integration is working correctly!`;
        const testData = {
            test: true,
            message: "Success",
            timestamp: new Date().toISOString(),
            source: "FormFlow Integration Tester"
        };

        try {
            switch (integration.type) {
                case IntegrationType.EMAIL_SMTP: {
                    const recipients = parseRecipients(integration.config.recipients);
                    if (!recipients.length) throw new Error('No recipients configured');
                    if (!integration.config.smtp && !integration.config.oauth) {
                        throw new Error('Email integration missing SMTP or OAuth configuration');
                    }

                    const transporter = integration.config.smtp
                        ? nodemailer.createTransport({
                            host: integration.config.smtp.host,
                            port: integration.config.smtp.port,
                            secure: integration.config.smtp.secure ?? true,
                            auth: {
                                user: integration.config.smtp.username,
                                pass: integration.config.smtp.password,
                            },
                        })
                        : nodemailer.createTransport({
                            host: 'smtp.gmail.com',
                            port: 465,
                            secure: true,
                            auth: {
                                type: 'OAuth2',
                                clientId: integration.config.oauth?.clientId,
                                clientSecret: integration.config.oauth?.clientSecret,
                            },
                        });

                    await transporter.sendMail({
                        from: integration.config.fromEmail || '"FormFlow Test" <no-reply@formflow.fyi>',
                        to: recipients,
                        subject: `Test: ${integration.name}`,
                        text: testMessage,
                        auth: integration.config.smtp ? undefined : {
                            user: integration.config.oauth?.user,
                            refreshToken: integration.config.oauth?.refreshToken,
                            accessToken: integration.config.oauth?.accessToken,
                        },
                    });
                    break;
                }
                case IntegrationType.TELEGRAM: {
                    const chatId = integration.config.chatId;
                    if (!chatId) throw new Error('No Chat ID configured');
                    const tgResult = await getTelegramService().sendMessage({
                        chatId: Number(chatId),
                        message: testMessage
                    });
                    if (!tgResult.success) throw new Error(tgResult.error || 'Telegram error');
                    break;
                }
                case IntegrationType.DISCORD: {
                    const webhookUrl = integration.config.webhookUrl;
                    if (!webhookUrl) throw new Error('No Webhook URL configured');
                    await axios.post(webhookUrl, { content: `**${testMessage}**` });
                    break;
                }
                case IntegrationType.SLACK: {
                    const { accessToken, channelId } = integration.config;
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
                    const url = integration.config.webhook;
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
