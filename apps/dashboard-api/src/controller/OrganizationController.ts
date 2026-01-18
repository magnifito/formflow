import { Router, Response } from "express";
import { AppDataSource } from "../data-source";
import { Form, Organization, WhitelistedDomain, OrganizationIntegration, Submission } from "@formflow/shared/entities";
import { verifyToken } from "../middleware/auth";
import { injectOrgContext, verifyOrgAdmin, OrgContextRequest } from "../middleware/orgContext";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Helper function to determine the effective organization ID for the current request
const getEffectiveOrgId = (req: OrgContextRequest): number | null => {
    const user = req.orgUser!;
    // Super admin with context uses context org, otherwise uses their own (null)
    // Regular users always use their organization
    return user.isSuperAdmin && req.organization
        ? req.organization.id
        : (user.isSuperAdmin ? null : req.organization!.id);
};

// All org routes require authentication and organization context
router.use(verifyToken);
router.use(injectOrgContext);

// ============ STATS ============

// GET /org/stats - Get organization statistics for dashboard
router.get('/stats', async (req: OrgContextRequest, res: Response) => {
    try {
        const organizationId = getEffectiveOrgId(req);

        // Get form count
        const formCount = await AppDataSource.manager.count(Form, {
            where: { organizationId }
        });

        // Get submissions this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const submissionsThisMonth = await AppDataSource.manager
            .createQueryBuilder(Submission, 'submission')
            .innerJoin('submission.form', 'form')
            .where('form.organizationId ' + (organizationId === null ? 'IS NULL' : '= :orgId'),
                organizationId === null ? {} : { orgId: organizationId })
            .andWhere('submission.createdAt >= :startOfMonth', { startOfMonth })
            .getCount();

        res.json({
            formCount,
            submissionsThisMonth
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// ============ FORMS ============

// GET /org/forms - List organization's forms
router.get('/forms', async (req: OrgContextRequest, res: Response) => {
    try {
        const organizationId = getEffectiveOrgId(req);

        const forms = await AppDataSource.manager.find(Form, {
            where: { organizationId },
            order: { createdAt: 'DESC' }
        });

        res.json(forms);
    } catch (error) {
        console.error('Error fetching forms:', error);
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});

// POST /org/forms - Create new form (org admin only)
router.post('/forms', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        const { name, description, useOrgIntegrations } = req.body;
        const user = req.orgUser!;

        if (!name) {
            return res.status(400).json({ error: 'Form name is required' });
        }

        // Determine organization context
        let organizationId: number | null;
        if (user.isSuperAdmin && req.organization) {
            // Super admin working in an organization context
            organizationId = req.organization.id;
        } else if (user.isSuperAdmin) {
            // Super admin working in their own context (no org)
            organizationId = null;
        } else {
            // Regular user
            organizationId = req.organization!.id;
        }

        // Get organization for default security settings
        const organization = organizationId ? await AppDataSource.manager.findOne(Organization, {
            where: { id: organizationId }
        }) : null;

        const form = AppDataSource.manager.create(Form, {
            organizationId,
            name,
            description: description || null,
            submitHash: uuidv4(),
            isActive: true,
            useOrgIntegrations: useOrgIntegrations !== false, // default to true
            useOrgSecuritySettings: true, // default to using org settings
            // Form-specific defaults (only used if useOrgSecuritySettings = false)
            rateLimitEnabled: organization?.defaultRateLimitEnabled ?? true,
            rateLimitMaxRequests: organization?.defaultRateLimitMaxRequests ?? 10,
            rateLimitWindowSeconds: organization?.defaultRateLimitWindowSeconds ?? 60,
            rateLimitMaxRequestsPerHour: organization?.defaultRateLimitMaxRequestsPerHour ?? 50,
            minTimeBetweenSubmissionsEnabled: organization?.defaultMinTimeBetweenSubmissionsEnabled ?? true,
            minTimeBetweenSubmissionsSeconds: organization?.defaultMinTimeBetweenSubmissionsSeconds ?? 10,
            maxRequestSizeBytes: organization?.defaultMaxRequestSizeBytes ?? 100000,
            refererFallbackEnabled: organization?.defaultRefererFallbackEnabled ?? true
        });

        await AppDataSource.manager.save(form);

        res.status(201).json(form);
    } catch (error) {
        console.error('Error creating form:', error);
        res.status(500).json({ error: 'Failed to create form' });
    }
});

// GET /org/forms/:id - Get form details
router.get('/forms/:id', async (req: OrgContextRequest, res: Response) => {
    try {
        const formId = parseInt(req.params.id);
        const organizationId = getEffectiveOrgId(req);

        const form = await AppDataSource.manager.findOne(Form, {
            where: { id: formId, organizationId },
            relations: ['integration']
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Get submission count
        const submissionCount = await AppDataSource.manager.count(Submission, {
            where: { formId }
        });

        res.json({
            ...form,
            submissionCount
        });
    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({ error: 'Failed to fetch form' });
    }
});

// PUT /org/forms/:id - Update form (org admin only)
router.put('/forms/:id', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        const formId = parseInt(req.params.id);
        const { 
            name, description, isActive, useOrgIntegrations,
            useOrgSecuritySettings,
            rateLimitEnabled, rateLimitMaxRequests, rateLimitWindowSeconds, rateLimitMaxRequestsPerHour,
            minTimeBetweenSubmissionsEnabled, minTimeBetweenSubmissionsSeconds,
            maxRequestSizeBytes, refererFallbackEnabled
        } = req.body;
        const organizationId = getEffectiveOrgId(req);

        const form = await AppDataSource.manager.findOne(Form, {
            where: { id: formId, organizationId }
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Basic form fields
        if (name !== undefined) form.name = name;
        if (description !== undefined) form.description = description;
        if (isActive !== undefined) form.isActive = isActive;
        if (useOrgIntegrations !== undefined) form.useOrgIntegrations = useOrgIntegrations;

        // Security settings
        if (useOrgSecuritySettings !== undefined) form.useOrgSecuritySettings = useOrgSecuritySettings;
        if (rateLimitEnabled !== undefined) form.rateLimitEnabled = rateLimitEnabled;
        if (rateLimitMaxRequests !== undefined) form.rateLimitMaxRequests = rateLimitMaxRequests;
        if (rateLimitWindowSeconds !== undefined) form.rateLimitWindowSeconds = rateLimitWindowSeconds;
        if (rateLimitMaxRequestsPerHour !== undefined) form.rateLimitMaxRequestsPerHour = rateLimitMaxRequestsPerHour;
        if (minTimeBetweenSubmissionsEnabled !== undefined) form.minTimeBetweenSubmissionsEnabled = minTimeBetweenSubmissionsEnabled;
        if (minTimeBetweenSubmissionsSeconds !== undefined) form.minTimeBetweenSubmissionsSeconds = minTimeBetweenSubmissionsSeconds;
        if (maxRequestSizeBytes !== undefined) form.maxRequestSizeBytes = maxRequestSizeBytes;
        if (refererFallbackEnabled !== undefined) form.refererFallbackEnabled = refererFallbackEnabled;

        await AppDataSource.manager.save(form);

        res.json(form);
    } catch (error) {
        console.error('Error updating form:', error);
        res.status(500).json({ error: 'Failed to update form' });
    }
});

// DELETE /org/forms/:id - Delete form (org admin only)
router.delete('/forms/:id', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        const formId = parseInt(req.params.id);
        const organizationId = getEffectiveOrgId(req);

        const form = await AppDataSource.manager.findOne(Form, {
            where: { id: formId, organizationId }
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Delete related submissions first
        await AppDataSource.manager.delete(Submission, { formId });
        await AppDataSource.manager.delete(Form, { id: formId });

        res.json({ message: 'Form deleted successfully' });
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).json({ error: 'Failed to delete form' });
    }
});

// POST /org/forms/:id/regenerate-hash - Generate new submit hash (org admin only)
router.post('/forms/:id/regenerate-hash', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        const formId = parseInt(req.params.id);
        const organizationId = getEffectiveOrgId(req);

        const form = await AppDataSource.manager.findOne(Form, {
            where: { id: formId, organizationId }
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        form.submitHash = uuidv4();
        await AppDataSource.manager.save(form);

        res.json({ submitHash: form.submitHash });
    } catch (error) {
        console.error('Error regenerating hash:', error);
        res.status(500).json({ error: 'Failed to regenerate hash' });
    }
});

// ============ WHITELISTED DOMAINS ============

// GET /org/domains - List whitelisted domains
router.get('/domains', async (req: OrgContextRequest, res: Response) => {
    try {
        const domains = await AppDataSource.manager.find(WhitelistedDomain, {
            where: { organizationId: req.organization!.id },
            order: { createdAt: 'DESC' }
        });

        res.json(domains);
    } catch (error) {
        console.error('Error fetching domains:', error);
        res.status(500).json({ error: 'Failed to fetch domains' });
    }
});

// POST /org/domains - Add whitelisted domain (org admin only)
router.post('/domains', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        const { domain } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        // Check for duplicate
        const existing = await AppDataSource.manager.findOne(WhitelistedDomain, {
            where: { organizationId: req.organization!.id, domain }
        });

        if (existing) {
            return res.status(400).json({ error: 'Domain already whitelisted' });
        }

        // Limit to 50 domains
        const domainCount = await AppDataSource.manager.count(WhitelistedDomain, {
            where: { organizationId: req.organization!.id }
        });

        if (domainCount >= 50) {
            return res.status(400).json({ error: 'Maximum of 50 domains allowed' });
        }

        const whitelistedDomain = AppDataSource.manager.create(WhitelistedDomain, {
            organizationId: req.organization!.id,
            domain
        });

        await AppDataSource.manager.save(whitelistedDomain);

        res.status(201).json(whitelistedDomain);
    } catch (error) {
        console.error('Error adding domain:', error);
        res.status(500).json({ error: 'Failed to add domain' });
    }
});

// DELETE /org/domains/:id - Remove whitelisted domain (org admin only)
router.delete('/domains/:id', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        const domainId = parseInt(req.params.id);

        const domain = await AppDataSource.manager.findOne(WhitelistedDomain, {
            where: { id: domainId, organizationId: req.organization!.id }
        });

        if (!domain) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        await AppDataSource.manager.delete(WhitelistedDomain, { id: domainId });

        res.json({ message: 'Domain removed successfully' });
    } catch (error) {
        console.error('Error removing domain:', error);
        res.status(500).json({ error: 'Failed to remove domain' });
    }
});

// ============ INTEGRATIONS ============

// GET /org/integrations - Get organization integration defaults
router.get('/integrations', async (req: OrgContextRequest, res: Response) => {
    try {
        let integration = await AppDataSource.manager.findOne(OrganizationIntegration, {
            where: { organizationId: req.organization!.id }
        });

        // Create default if doesn't exist
        if (!integration) {
            integration = AppDataSource.manager.create(OrganizationIntegration, {
                organizationId: req.organization!.id,
                emailEnabled: true
            });
            await AppDataSource.manager.save(integration);
        }

        res.json(integration);
    } catch (error) {
        console.error('Error fetching integrations:', error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

// PUT /org/integrations - Update organization integrations (org admin only)
router.put('/integrations', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        let integration = await AppDataSource.manager.findOne(OrganizationIntegration, {
            where: { organizationId: req.organization!.id }
        });

        if (!integration) {
            integration = AppDataSource.manager.create(OrganizationIntegration, {
                organizationId: req.organization!.id
            });
        }

        // Update all provided fields
        const allowedFields = [
            'emailEnabled', 'emailRecipients', 'returnEmailEnabled', 'emailSubject', 'emailBody',
            'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'fromEmail',
            'fromEmailAccessToken', 'fromEmailRefreshToken',
            'telegramEnabled', 'telegramChatId',
            'discordEnabled', 'discordWebhook',
            'makeEnabled', 'makeWebhook',
            'n8nEnabled', 'n8nWebhook',
            'webhookEnabled', 'webhookUrl',
            'slackEnabled', 'slackChannelId', 'slackAccessToken', 'slackChannelName'
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                (integration as any)[field] = req.body[field];
            }
        }

        await AppDataSource.manager.save(integration);

        res.json(integration);
    } catch (error) {
        console.error('Error updating integrations:', error);
        res.status(500).json({ error: 'Failed to update integrations' });
    }
});

// ============ SECURITY SETTINGS ============

// GET /org/security-settings - Get organization default security settings
router.get('/security-settings', async (req: OrgContextRequest, res: Response) => {
    try {
        const organization = await AppDataSource.manager.findOne(Organization, {
            where: { id: req.organization!.id }
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({
            defaultRateLimitEnabled: organization.defaultRateLimitEnabled,
            defaultRateLimitMaxRequests: organization.defaultRateLimitMaxRequests,
            defaultRateLimitWindowSeconds: organization.defaultRateLimitWindowSeconds,
            defaultRateLimitMaxRequestsPerHour: organization.defaultRateLimitMaxRequestsPerHour,
            defaultMinTimeBetweenSubmissionsEnabled: organization.defaultMinTimeBetweenSubmissionsEnabled,
            defaultMinTimeBetweenSubmissionsSeconds: organization.defaultMinTimeBetweenSubmissionsSeconds,
            defaultMaxRequestSizeBytes: organization.defaultMaxRequestSizeBytes,
            defaultRefererFallbackEnabled: organization.defaultRefererFallbackEnabled
        });
    } catch (error) {
        console.error('Error fetching security settings:', error);
        res.status(500).json({ error: 'Failed to fetch security settings' });
    }
});

// PUT /org/security-settings - Update organization default security settings (org admin only)
router.put('/security-settings', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        const organization = await AppDataSource.manager.findOne(Organization, {
            where: { id: req.organization!.id }
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const {
            defaultRateLimitEnabled,
            defaultRateLimitMaxRequests,
            defaultRateLimitWindowSeconds,
            defaultRateLimitMaxRequestsPerHour,
            defaultMinTimeBetweenSubmissionsEnabled,
            defaultMinTimeBetweenSubmissionsSeconds,
            defaultMaxRequestSizeBytes,
            defaultRefererFallbackEnabled
        } = req.body;

        if (defaultRateLimitEnabled !== undefined) organization.defaultRateLimitEnabled = defaultRateLimitEnabled;
        if (defaultRateLimitMaxRequests !== undefined) organization.defaultRateLimitMaxRequests = defaultRateLimitMaxRequests;
        if (defaultRateLimitWindowSeconds !== undefined) organization.defaultRateLimitWindowSeconds = defaultRateLimitWindowSeconds;
        if (defaultRateLimitMaxRequestsPerHour !== undefined) organization.defaultRateLimitMaxRequestsPerHour = defaultRateLimitMaxRequestsPerHour;
        if (defaultMinTimeBetweenSubmissionsEnabled !== undefined) organization.defaultMinTimeBetweenSubmissionsEnabled = defaultMinTimeBetweenSubmissionsEnabled;
        if (defaultMinTimeBetweenSubmissionsSeconds !== undefined) organization.defaultMinTimeBetweenSubmissionsSeconds = defaultMinTimeBetweenSubmissionsSeconds;
        if (defaultMaxRequestSizeBytes !== undefined) organization.defaultMaxRequestSizeBytes = defaultMaxRequestSizeBytes;
        if (defaultRefererFallbackEnabled !== undefined) organization.defaultRefererFallbackEnabled = defaultRefererFallbackEnabled;

        await AppDataSource.manager.save(organization);

        res.json({
            defaultRateLimitEnabled: organization.defaultRateLimitEnabled,
            defaultRateLimitMaxRequests: organization.defaultRateLimitMaxRequests,
            defaultRateLimitWindowSeconds: organization.defaultRateLimitWindowSeconds,
            defaultRateLimitMaxRequestsPerHour: organization.defaultRateLimitMaxRequestsPerHour,
            defaultMinTimeBetweenSubmissionsEnabled: organization.defaultMinTimeBetweenSubmissionsEnabled,
            defaultMinTimeBetweenSubmissionsSeconds: organization.defaultMinTimeBetweenSubmissionsSeconds,
            defaultMaxRequestSizeBytes: organization.defaultMaxRequestSizeBytes,
            defaultRefererFallbackEnabled: organization.defaultRefererFallbackEnabled
        });
    } catch (error) {
        console.error('Error updating security settings:', error);
        res.status(500).json({ error: 'Failed to update security settings' });
    }
});

// ============ SUBMISSIONS ============

// GET /org/submissions - List organization's submissions
router.get('/submissions', async (req: OrgContextRequest, res: Response) => {
    try {
        const organizationId = getEffectiveOrgId(req);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;
        const formId = req.query.formId ? parseInt(req.query.formId as string) : undefined;

        let queryBuilder = AppDataSource.manager
            .createQueryBuilder(Submission, 'submission')
            .innerJoinAndSelect('submission.form', 'form')
            .where('form.organizationId ' + (organizationId === null ? 'IS NULL' : '= :orgId'),
                organizationId === null ? {} : { orgId: organizationId })
            .orderBy('submission.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (formId) {
            queryBuilder = queryBuilder.andWhere('submission.formId = :formId', { formId });
        }

        const [submissions, total] = await queryBuilder.getManyAndCount();

        res.json({
            data: submissions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

export default router;
