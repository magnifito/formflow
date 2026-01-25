import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Form, FormIntegration, OrganizationIntegration, WhitelistedDomain, Submission, Integration, IntegrationScope } from "@formflow/shared/entities";
import { getEnv } from "@formflow/shared/env";
import nodemailer from "nodemailer";
import axios from "axios";
import crypto from "crypto";
import logger, { LogOperation, LogMessages } from "@formflow/shared/logger";
import { getTelegramService } from "@formflow/shared/telegram";
import { getBoss, QUEUE_NAMES, IntegrationType, IntegrationJobData, JOB_OPTIONS } from "@formflow/shared/queue";
import { normalizeLegacyFormIntegration, resolveIntegrationStack } from "@formflow/shared/integrations";

const router = Router();
const csrfSecret = getEnv("CSRF_SECRET") || "default-dev-secret-do-not-use-in-prod";
const csrfTtlMinutes = Number.parseInt(getEnv("CSRF_TTL_MINUTES") || "15", 10);
const csrfTtlMs = Number.isFinite(csrfTtlMinutes) && csrfTtlMinutes > 0
    ? csrfTtlMinutes * 60 * 1000
    : 15 * 60 * 1000;

// Rate limiting cache: Map<key, {count: number, windowStart: number, hourlyCount: number, hourlyWindowStart: number}>
const rateLimitCache = new Map<string, {
    count: number;
    windowStart: number;
    hourlyCount: number;
    hourlyWindowStart: number;
    lastSubmissionTime: number;
}>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitCache.entries()) {
        // Remove entries older than 2 hours
        if (now - value.hourlyWindowStart > 2 * 60 * 60 * 1000) {
            rateLimitCache.delete(key);
        }
    }
}, 5 * 60 * 1000);

// Helper to get client IP
const getClientIp = (req: Request): string | null => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || null;
};

// Helper to get origin with Referer fallback
const getOrigin = (req: Request): string | null => {
    const origin = req.headers.origin;
    if (origin) return origin;

    const referer = req.headers.referer || req.headers.referrer;
    if (referer) {
        try {
            const url = new URL(referer);
            return url.origin;
        } catch {
            return null;
        }
    }
    return null;
};

// Helper to check rate limits
const checkRateLimit = (
    ip: string,
    formId: number,
    maxRequests: number,
    windowSeconds: number,
    maxRequestsPerHour: number
): { allowed: boolean; remaining: number; resetAt: number } => {
    const key = `${ip}:${formId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const hourMs = 60 * 60 * 1000;

    let entry = rateLimitCache.get(key);
    if (!entry) {
        entry = {
            count: 1,
            windowStart: now,
            hourlyCount: 1,
            hourlyWindowStart: now,
            lastSubmissionTime: 0
        };
        rateLimitCache.set(key, entry);
        return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    // Reset window if expired
    if (now - entry.windowStart > windowMs) {
        entry.count = 0;
        entry.windowStart = now;
    }

    // Reset hourly window if expired
    if (now - entry.hourlyWindowStart > hourMs) {
        entry.hourlyCount = 0;
        entry.hourlyWindowStart = now;
    }

    // Check limits
    if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs };
    }

    if (entry.hourlyCount >= maxRequestsPerHour) {
        return { allowed: false, remaining: 0, resetAt: entry.hourlyWindowStart + hourMs };
    }

    entry.count++;
    entry.hourlyCount++;
    return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.windowStart + windowMs };
};

// Helper to check minimum time between submissions
const checkMinTimeBetweenSubmissions = (
    ip: string,
    formId: number,
    minSeconds: number
): { allowed: boolean; waitSeconds: number } => {
    const key = `${ip}:${formId}`;
    const entry = rateLimitCache.get(key);

    if (!entry || entry.lastSubmissionTime === 0) {
        return { allowed: true, waitSeconds: 0 };
    }

    const now = Date.now();
    const timeSinceLastSubmission = (now - entry.lastSubmissionTime) / 1000;
    const minTime = minSeconds;

    if (timeSinceLastSubmission < minTime) {
        return { allowed: false, waitSeconds: Math.ceil(minTime - timeSinceLastSubmission) };
    }

    return { allowed: true, waitSeconds: 0 };
};

// Helper to update last submission time
const updateLastSubmissionTime = (ip: string, formId: number): void => {
    const key = `${ip}:${formId}`;
    const entry = rateLimitCache.get(key);
    if (entry) {
        entry.lastSubmissionTime = Date.now();
    } else {
        rateLimitCache.set(key, {
            count: 0,
            windowStart: 0,
            hourlyCount: 0,
            hourlyWindowStart: 0,
            lastSubmissionTime: Date.now()
        });
    }
};

// Helper to format message for display
const formatMessage = (data: Record<string, any>): string => {
    const messageList: string[] = [];
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value !== "") {
            messageList.push(`${key}: ${value}`);
        } else if (Array.isArray(value)) {
            messageList.push(`${key}: ${value.join(', ')}`);
        } else if (value !== null && value !== undefined) {
            messageList.push(`${key}: ${JSON.stringify(value)}`);
        }
    }
    return messageList.join('\n\n');
};

const base64UrlEncode = (input: Buffer | string): string => {
    const base = Buffer.from(input).toString("base64");
    return base.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlDecode = (input: string): string => {
    const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
    return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
};

const signCsrfPayload = (payloadB64: string): string => {
    const signature = crypto.createHmac("sha256", csrfSecret as string).update(payloadB64).digest();
    return base64UrlEncode(signature);
};

const createCsrfToken = (submitHash: string, origin: string): string => {
    const payload = {
        s: submitHash,
        o: origin,
        e: Date.now() + csrfTtlMs
    };
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    const signature = signCsrfPayload(payloadB64);
    return `${payloadB64}.${signature}`;
};

const getCsrfTokenFromRequest = (req: Request, body: Record<string, any>): string | null => {
    const headerToken = req.headers["x-csrf-token"];
    if (typeof headerToken === "string") return headerToken;
    if (Array.isArray(headerToken) && headerToken.length > 0) return headerToken[0];
    if (typeof body.csrfToken === "string") return body.csrfToken;
    if (typeof body._csrf === "string") return body._csrf;
    return null;
};

const verifyCsrfToken = (token: string, submitHash: string, origin: string): boolean => {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return false;

    const expectedSignature = signCsrfPayload(payloadB64);
    if (signature.length !== expectedSignature.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return false;

    let payload: { s?: string; o?: string; e?: number };
    try {
        payload = JSON.parse(base64UrlDecode(payloadB64));
    } catch {
        return false;
    }

    if (!payload || payload.s !== submitHash || payload.o !== origin) return false;
    if (!payload.e || Date.now() > payload.e) return false;
    return true;
};

// GET /s/:identifier/csrf - CSRF token for form submissions
router.get('/:identifier/csrf', async (req: Request, res: Response) => {
    try {
        if (!csrfSecret) {
            return res.status(501).json({ error: 'CSRF protection not configured' });
        }

        const origin = getOrigin(req);  // Uses Referer fallback
        if (!origin) {
            return res.status(400).json({ error: 'Origin or Referer header required' });
        }

        const { identifier } = req.params;
        const form = await AppDataSource.manager.findOne(Form, {
            where: [
                { submitHash: identifier },
                { slug: identifier }
            ],
            relations: ['organization']
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        if (!form.isActive) {
            return res.status(400).json({ error: 'Form is not accepting submissions' });
        }

        if (!form.organization) {
            logger.error('Form has no linked organization', {
                formId: form.id,
                submitHash: identifier,
                operation: LogOperation.CSRF_TOKEN_ISSUE
            });
            return res.status(500).json({ error: 'Form configuration error: No organization linked' });
        }

        if (!form.organization.isActive) {
            return res.status(400).json({ error: 'Organization is inactive' });
        }

        const whitelistedDomains = await AppDataSource.manager.find(WhitelistedDomain, {
            where: { organizationId: form.organizationId }
        });

        if (whitelistedDomains.length > 0) {
            const isAllowed = whitelistedDomains.some(d => origin.includes(d.domain))
                || origin.includes("localhost");

            if (!isAllowed) {
                logger.warn(LogMessages.domainNotAllowed, {
                    operation: LogOperation.DOMAIN_CHECK,
                    origin,
                    submitHash: form.submitHash,
                    formId: form.id,
                    endpoint: 'csrf',
                    correlationId: req.correlationId,
                });
                return res.status(403).json({ error: 'Origin not whitelisted' });
            }
        }

        const token = createCsrfToken(form.submitHash, origin);
        res.json({ token, expiresInSeconds: Math.floor(csrfTtlMs / 1000) });
        logger.info(LogMessages.csrfTokenIssued, {
            operation: LogOperation.CSRF_TOKEN_ISSUE,
            submitHash: form.submitHash,
            formId: form.id,
            origin,
            expiresInSeconds: Math.floor(csrfTtlMs / 1000),
            correlationId: req.correlationId,
        });
    } catch (error: any) {
        logger.error('CSRF token generation failed', {
            operation: LogOperation.CSRF_TOKEN_ISSUE,
            error: error.message,
            stack: error.stack,
            submitHash: req.params.identifier,
            correlationId: req.correlationId,
        });
        res.status(500).json({ error: 'Failed to issue CSRF token' });
    }
});

// POST /s/:identifier - Public form submission endpoint
router.post('/:identifier', async (req: Request, res: Response) => {
    try {
        // Set security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');

        const { identifier } = req.params;
        const clientIp = getClientIp(req);
        const origin = getOrigin(req);  // Uses Referer fallback

        // Check request body size (before parsing)
        const contentLength = req.headers['content-length'];
        if (contentLength) {
            const size = parseInt(contentLength, 10);
            if (size > 100000) {  // Default 100KB limit, will check per-form later
                logger.warn('Request body too large (initial check)', {
                    size,
                    limit: 100000,
                    submitHash: identifier,
                    ip: clientIp,
                    correlationId: req.correlationId,
                });
                return res.status(413).json({ error: 'Request body too large' });
            }
        }

        const formData = { ...(req.body || {}) };
        const csrfToken = getCsrfTokenFromRequest(req, formData);
        delete formData.csrfToken;
        delete formData._csrf;

        // Find form by submitHash only
        const form = await AppDataSource.manager.findOne(Form, {
            where: { submitHash: identifier },
            relations: ['organization', 'integration']
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        if (!form.isActive) {
            return res.status(400).json({ error: 'Form is not accepting submissions' });
        }

        if (!form.organization) {
            logger.error('Form has no linked organization', {
                formId: form.id,
                submitHash: identifier,
                operation: LogOperation.FORM_SUBMIT
            });
            return res.status(500).json({ error: 'Form configuration error: No organization linked' });
        }

        if (!form.organization.isActive) {
            return res.status(400).json({ error: 'Organization is inactive' });
        }

        // Get security settings (form-specific or org defaults)
        const useOrgSecurity = form.useOrgSecuritySettings ?? true;
        const orgDefaults = form.organization;
        const securitySettings = {
            rateLimitEnabled: useOrgSecurity ? (orgDefaults?.defaultRateLimitEnabled ?? true) : (form.rateLimitEnabled ?? true),
            rateLimitMaxRequests: useOrgSecurity ? (orgDefaults?.defaultRateLimitMaxRequests ?? 10) : (form.rateLimitMaxRequests ?? 10),
            rateLimitWindowSeconds: useOrgSecurity ? (orgDefaults?.defaultRateLimitWindowSeconds ?? 60) : (form.rateLimitWindowSeconds ?? 60),
            rateLimitMaxRequestsPerHour: useOrgSecurity ? (orgDefaults?.defaultRateLimitMaxRequestsPerHour ?? 50) : (form.rateLimitMaxRequestsPerHour ?? 50),
            minTimeBetweenSubmissionsEnabled: useOrgSecurity ? (orgDefaults?.defaultMinTimeBetweenSubmissionsEnabled ?? true) : (form.minTimeBetweenSubmissionsEnabled ?? true),
            minTimeBetweenSubmissionsSeconds: useOrgSecurity ? (orgDefaults?.defaultMinTimeBetweenSubmissionsSeconds ?? 10) : (form.minTimeBetweenSubmissionsSeconds ?? 10),
            maxRequestSizeBytes: useOrgSecurity ? (orgDefaults?.defaultMaxRequestSizeBytes ?? 100000) : (form.maxRequestSizeBytes ?? 100000),
            refererFallbackEnabled: useOrgSecurity ? (orgDefaults?.defaultRefererFallbackEnabled ?? true) : (form.refererFallbackEnabled ?? true)
        };

        // Validate Content-Type
        const contentType = req.headers['content-type'];
        if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
            return res.status(400).json({ error: 'Invalid Content-Type' });
        }

        // Check request body size with form-specific limit
        if (contentLength && securitySettings.maxRequestSizeBytes) {
            const size = parseInt(contentLength, 10);
            if (size > securitySettings.maxRequestSizeBytes) {
                logger.warn('Request body too large (form-specific limit)', {
                    size,
                    limit: securitySettings.maxRequestSizeBytes,
                    submitHash: identifier,
                    formId: form.id,
                    ip: clientIp,
                    correlationId: req.correlationId,
                });
                return res.status(413).json({ error: `Request body too large (max ${securitySettings.maxRequestSizeBytes} bytes)` });
            }
        }

        // CSRF validation with Referer fallback support
        if (csrfSecret) {
            if (!origin) {
                return res.status(400).json({ error: 'Origin or Referer header required' });
            }
            if (!csrfToken || !verifyCsrfToken(csrfToken, form.submitHash, origin)) {
                return res.status(403).json({ error: 'Invalid CSRF token' });
            }
        }

        // Check whitelisted domains with Referer fallback
        const whitelistedDomains = await AppDataSource.manager.find(WhitelistedDomain, {
            where: { organizationId: form.organizationId }
        });

        if (whitelistedDomains.length > 0 && origin) {
            const isAllowed = whitelistedDomains.some(d => origin.includes(d.domain))
                || origin.includes("localhost");

            if (!isAllowed) {
                logger.warn(LogMessages.domainNotAllowed, {
                    operation: LogOperation.DOMAIN_CHECK,
                    origin,
                    submitHash: form.submitHash,
                    formId: form.id,
                    endpoint: 'submit',
                    correlationId: req.correlationId,
                });
                return res.status(403).json({ error: 'Origin not whitelisted' });
            }
        }

        // Check minimum time between submissions
        if (securitySettings.minTimeBetweenSubmissionsEnabled && clientIp) {
            const timeCheck = checkMinTimeBetweenSubmissions(
                clientIp,
                form.id,
                securitySettings.minTimeBetweenSubmissionsSeconds || 10
            );
            if (!timeCheck.allowed) {
                return res.status(429).json({
                    error: 'Submission rate limit exceeded',
                    message: `Please wait ${timeCheck.waitSeconds} seconds before submitting again`,
                    retryAfter: timeCheck.waitSeconds
                });
            }
        }

        // Check rate limits
        if (securitySettings.rateLimitEnabled && clientIp) {
            const rateLimit = checkRateLimit(
                clientIp,
                form.id,
                securitySettings.rateLimitMaxRequests || 10,
                securitySettings.rateLimitWindowSeconds || 60,
                securitySettings.rateLimitMaxRequestsPerHour || 50
            );
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'Too many requests. Please try again later.',
                    resetAt: new Date(rateLimit.resetAt).toISOString()
                });
            }
        }

        // Validate message length
        const niceMessage = formatMessage(formData);
        if (niceMessage.length > 4000) {
            return res.status(400).json({ error: 'Submission too large' });
        }

        if (niceMessage === "") {
            return res.status(400).json({ error: 'Empty submission' });
        }

        // Update last submission time for rate limiting
        if (clientIp) {
            updateLastSubmissionTime(clientIp, form.id);
        }

        // Save submission
        const submission = AppDataSource.manager.create(Submission, {
            formId: form.id,
            data: formData,
            originDomain: origin || null,
            ipAddress: clientIp
        });
        await AppDataSource.manager.save(submission);

        // Get integrations to process (org + form stacked with form overrides)
        const [orgIntegrations, formScopedIntegrations] = await Promise.all([
            AppDataSource.manager.find(Integration, {
                where: {
                    organizationId: form.organizationId,
                    scope: IntegrationScope.ORGANIZATION,
                    isActive: true
                }
            }),
            AppDataSource.manager.find(Integration, {
                where: {
                    organizationId: form.organizationId,
                    formId: form.id,
                    scope: IntegrationScope.FORM,
                    isActive: true
                }
            })
        ]);

        const legacyFormIntegrations = formScopedIntegrations.length === 0
            ? normalizeLegacyFormIntegration(form.integration, form.organizationId ?? undefined, form.id)
            : [];

        const resolvedIntegrations = resolveIntegrationStack({
            orgIntegrations,
            formIntegrations: formScopedIntegrations.length ? formScopedIntegrations : legacyFormIntegrations,
            useOrgIntegrations: form.useOrgIntegrations ?? true
        });

        const integrationsToProcess: Array<{ type: IntegrationType, config: any }> = resolvedIntegrations.map(i => ({
            type: i.type,
            config: i.config
        }));

        if (integrationsToProcess.length === 0) {
            return res.json({ message: 'Submission received' });
        }

        // Process integrations
        // Check if queue processing is enabled
        if (getEnv('QUEUE_ENABLED') === 'true') {
            try {
                const boss = await getBoss();
                const jobsToQueue: Array<{ name: string, data: IntegrationJobData, options: any }> = [];

                const baseJobData = {
                    submissionId: submission.id,
                    formId: form.id,
                    organizationId: form.organizationId,
                    formData,
                    formattedMessage: niceMessage,
                    formName: form.name,
                    config: {} // Will be populated per job
                };

                for (const integration of integrationsToProcess) {
                    const queueName = QUEUE_NAMES[integration.type];
                    if (!queueName) continue;

                    jobsToQueue.push({
                        name: queueName,
                        data: {
                            ...baseJobData,
                            integrationType: integration.type,
                            config: integration.config
                        },
                        options: {
                            ...JOB_OPTIONS[integration.type],
                            // Add randomness to singleton key if multiple of same type?
                            // Or utilize integration ID if available? 
                            // Current integrationsToProcess doesn't strictly have ID if from legacy.
                            // We can append hash of config or random UUID for uniqueness if we allow multiple same-type.
                            singletonKey: `${submission.id}-${integration.type}-${crypto.randomBytes(4).toString('hex')}`,
                        }
                    });
                }

                // Enqueue all jobs
                for (const job of jobsToQueue) {
                    await boss.send(job.name, job.data, job.options);
                }

                logger.info('Submitted integration jobs to queue', {
                    operation: LogOperation.FORM_SUBMIT,
                    formId: form.id,
                    submissionId: submission.id,
                    jobCount: jobsToQueue.length,
                    correlationId: req.correlationId
                });

                return res.json({ message: 'Submission received successfully' });

            } catch (error: any) {
                logger.error('Failed to queue jobs, falling back to synchronous execution', {
                    operation: LogOperation.FORM_SUBMIT,
                    error: error.message,
                    formId: form.id,
                    submissionId: submission.id
                });
                // Fall through to synchronous code
            }
        }

        // Process integrations (Synchronous Fallback)
        // We iterate through our normalized list
        for (const integration of integrationsToProcess) {
            try {
                if (integration.type === IntegrationType.EMAIL_SMTP) {
                    const recipients = Array.isArray(integration.config.recipients)
                        ? integration.config.recipients
                        : String(integration.config.recipients || '')
                            .split(',')
                            .map((s: string) => s.trim())
                            .filter(Boolean);

                    if (!integration.config.smtp && !integration.config.oauth) {
                        throw new Error('Email integration missing SMTP or OAuth configuration');
                    }

                    if (recipients && recipients.length > 0) {
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

                        const mailMessage = {
                            from: integration.config.fromEmail || '"New FormFlow Submission" <new-submission@formflow.fyi>',
                            to: recipients,
                            subject: integration.config.subject || `New Form Submission: ${form.name}`,
                            text: niceMessage,
                            auth: integration.config.smtp ? undefined : {
                                user: integration.config.oauth?.user,
                                refreshToken: integration.config.oauth?.refreshToken,
                                accessToken: integration.config.oauth?.accessToken,
                                expires: 1484314697598,
                            },
                        };
                        await transporter.sendMail(mailMessage);
                        logger.info(LogMessages.integrationSendSuccess('Email'), {
                            operation: LogOperation.INTEGRATION_EMAIL_SEND,
                            formId: form.id,
                            submissionId: submission.id
                        });
                    }
                } else if (integration.type === IntegrationType.TELEGRAM) {
                    if (integration.config.chatId) {
                        getTelegramService().sendSubmissionNotification(
                            integration.config.chatId,
                            niceMessage,
                            { formId: form.id, submissionId: submission.id }
                        );
                    }
                } else if (integration.type === IntegrationType.DISCORD) {
                    if (integration.config.webhookUrl) {
                        const discordMessage = `\`\`\`${niceMessage}\`\`\``;
                        await axios.post(integration.config.webhookUrl, { content: discordMessage });
                    }
                }
                // ... Add other fallbacks if critical, or skip (MVP fallback usually covers email mostly)
                else if (integration.type === IntegrationType.SLACK) {
                    if (integration.config.accessToken && integration.config.channelId) {
                        axios.post('https://slack.com/api/chat.postMessage', {
                            channel: integration.config.channelId,
                            text: niceMessage,
                        }, {
                            headers: {
                                'Authorization': `Bearer ${integration.config.accessToken}`,
                                'Content-Type': 'application/json'
                            }
                        }).then(() => {
                            logger.info(LogMessages.integrationSendSuccess('Slack'), {
                                operation: LogOperation.INTEGRATION_SLACK_SEND,
                                formId: form.id,
                                submissionId: submission.id,
                                correlationId: req.correlationId,
                            });
                        }).catch(err => {
                            logger.error(LogMessages.integrationSendFailed('Slack'), {
                                operation: LogOperation.INTEGRATION_SLACK_SEND,
                                error: err.message,
                                formId: form.id,
                                submissionId: submission.id,
                                correlationId: req.correlationId,
                            });
                        });
                    }
                } else if (integration.type === IntegrationType.WEBHOOK) {
                    if (integration.config.webhook) {
                        axios.post(integration.config.webhook, formData).catch(err => {
                            logger.error(LogMessages.integrationSendFailed('Webhook'), {
                                operation: LogOperation.INTEGRATION_WEBHOOK_UPDATE,
                                error: err.message
                            });
                        });
                    }
                }
            } catch (err: any) {
                logger.error(`Synchronous fallback failed for ${integration.type}`, { error: err.message });
            }
        }



        logger.info(LogMessages.formSubmissionProcessed, {
            operation: LogOperation.FORM_SUBMIT,
            formId: form.id,
            submissionId: submission.id,
            formName: form.name,
            origin,
            correlationId: req.correlationId,
        });

        res.json({ message: 'Submission received successfully' });

    } catch (error: any) {
        logger.error(LogMessages.formSubmissionFailed, {
            operation: LogOperation.FORM_SUBMIT,
            error: error.message,
            stack: error.stack,
            identifier: req.params.identifier,
            correlationId: req.correlationId,
        });
        res.status(500).json({
            error: 'Failed to process submission',
            details: error.message,
            stack: error.stack
        });
    }
});

export default router;
