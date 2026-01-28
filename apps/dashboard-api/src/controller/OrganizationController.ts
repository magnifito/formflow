import { Router, Response } from "express";
import { db } from "../db";
import logger from "@formflow/shared/logger";
import { organizations, forms, submissions, whitelistedDomains, generateSubmitHash } from "@formflow/shared/db";
import { eq, desc, count, and, gte, isNull } from "drizzle-orm";
import { verifyToken } from "../middleware/auth";
import { injectOrgContext, verifyOrgAdmin, OrgContextRequest } from "../middleware/orgContext";

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

// ============ DETAILS ============

// GET /org/current - Get current organization details
router.get('/current', async (req: OrgContextRequest, res: Response) => {
    try {
        // We can just return req.organization because injectOrgContext middleware
        // has already loaded it based on the header or user default
        if (!req.organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.json(req.organization);
    } catch (error: any) {
        logger.error('Error fetching current organization', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch organization details' });
    }
});

// ============ STATS ============

// GET /org/stats - Get organization statistics for dashboard
router.get('/stats', async (req: OrgContextRequest, res: Response) => {
    try {
        const organizationId = getEffectiveOrgId(req);

        // Get form count
        const formCountCondition = organizationId !== null
            ? eq(forms.organizationId, organizationId)
            : isNull(forms.organizationId);

        const formCountResult = await db
            .select({ count: count() })
            .from(forms)
            .where(formCountCondition);
        const formCount = formCountResult[0].count;

        // Get submissions this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const submissionsQuery = db.select({ count: count() })
            .from(submissions)
            .innerJoin(forms, eq(submissions.formId, forms.id))
            .where(
                and(
                    organizationId !== null ? eq(forms.organizationId, organizationId) : isNull(forms.organizationId),
                    gte(submissions.createdAt, startOfMonth)
                )
            );

        const submissionsResult = await submissionsQuery;
        const submissionsThisMonth = submissionsResult[0].count;

        res.json({
            formCount,
            submissionsThisMonth
        });
    } catch (error: any) {
        logger.error('Error fetching stats', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// ============ FORMS ============

// GET /org/forms - List organization's forms
router.get('/forms', async (req: OrgContextRequest, res: Response) => {
    try {
        const organizationId = getEffectiveOrgId(req);

        // TypeScript check for organizationId being null is tricky with Drizzle unless we handle it explicitly
        // If it can be null (super admin contextless), we query for null orgId
        const whereClause = organizationId !== null ? eq(forms.organizationId, organizationId) : isNull(forms.organizationId);

        const formsList = await db.query.forms.findMany({
            where: whereClause,
            orderBy: desc(forms.createdAt)
        });

        res.json(formsList);
    } catch (error: any) {
        logger.error('Error fetching forms', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});

// GET /org/forms/all - List all organizations with their forms (super admin only)
router.get('/forms/all', async (req: OrgContextRequest, res: Response) => {
    try {
        if (!req.orgUser?.isSuperAdmin) {
            return res.status(403).json({ error: 'Super admin access required' });
        }

        const orgs = await db.query.organizations.findMany({
            orderBy: (organizations, { asc }) => [asc(organizations.id)]
        });
        const allForms = await db.query.forms.findMany({
            orderBy: (forms, { asc }) => [asc(forms.organizationId), asc(forms.name)]
        });

        const grouped = orgs.map(org => ({
            organization: org,
            forms: allForms.filter(f => f.organizationId === org.id)
        }));

        res.json(grouped);
    } catch (error: any) {
        logger.error('Error fetching all org forms', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});

// POST /org/forms - Create new form (org admin only)
router.post('/forms', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    let name, slug;
    try {
        ({ name, slug } = req.body);
        const { description, useOrgIntegrations } = req.body;
        const user = req.orgUser!;

        if (!name) {
            return res.status(400).json({ error: 'Form name is required' });
        }

        // Determine organization context
        let organizationId: number;
        if (user.isSuperAdmin) {
            // Super admin MUST explicitly specify an organization
            if (req.body.organizationId && req.body.organizationId !== 'null') {
                organizationId = parseInt(req.body.organizationId as string);
            } else {
                // If not specified, default to their own org if exists, otherwise error
                if (!req.organization) {
                    return res.status(400).json({ error: 'Organization is required for form creation' });
                }
                organizationId = req.organization!.id;
            }
        } else {
            // Regular user always tied to their organization
            organizationId = req.organization!.id;
        }

        // Check if slug is provided and unique
        if (slug) {
            const slugRegex = /^[a-z0-9-]+$/;
            if (!slugRegex.test(slug)) {
                return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens only' });
            }

            const existingForm = await db.query.forms.findFirst({ where: eq(forms.slug, slug) });
            if (existingForm) {
                return res.status(400).json({ error: 'Form with this slug already exists' });
            }
        } else {
            // Generate a default slug: name-hex
            const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            slug = `${baseSlug}-${randomSuffix}`;
        }

        // Get organization for default security settings
        const organization = organizationId ? await db.query.organizations.findFirst({
            where: eq(organizations.id, organizationId)
        }) : null;

        const [form] = await db.insert(forms).values({
            organizationId,
            name,
            slug,
            description: description || null,
            submitHash: generateSubmitHash(),
            isActive: true,
            useOrgIntegrations: useOrgIntegrations !== false,
            useOrgSecuritySettings: true,
            rateLimitEnabled: organization?.defaultRateLimitEnabled ?? true,
            rateLimitMaxRequests: organization?.defaultRateLimitMaxRequests ?? 10,
            rateLimitWindowSeconds: organization?.defaultRateLimitWindowSeconds ?? 60,
            rateLimitMaxRequestsPerHour: organization?.defaultRateLimitMaxRequestsPerHour ?? 50,
            minTimeBetweenSubmissionsEnabled: organization?.defaultMinTimeBetweenSubmissionsEnabled ?? true,
            minTimeBetweenSubmissionsSeconds: organization?.defaultMinTimeBetweenSubmissionsSeconds ?? 10,
            maxRequestSizeBytes: organization?.defaultMaxRequestSizeBytes ?? 100000,
            refererFallbackEnabled: organization?.defaultRefererFallbackEnabled ?? true
        }).returning();

        res.status(201).json(form);
    } catch (error: any) {
        logger.error('Error creating form', { error: error.message, stack: error.stack, name, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to create form' });
    }
});

// GET /org/forms/:id - Get form details
router.get('/forms/:id', async (req: OrgContextRequest, res: Response) => {
    let formId;
    try {
        formId = parseInt(req.params.id);
        const organizationId = getEffectiveOrgId(req);

        const form = await db.query.forms.findFirst({
            where: and(eq(forms.id, formId), organizationId ? eq(forms.organizationId, organizationId) : undefined)
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Get submission count
        const submissionCountResult = await db.select({ count: count() })
            .from(submissions)
            .where(eq(submissions.formId, formId));

        const submissionCount = submissionCountResult[0].count;

        res.json({
            ...form,
            submissionCount
        });
    } catch (error: any) {
        logger.error('Error fetching form', { error: error.message, stack: error.stack, formId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch form' });
    }
});

// PUT /org/forms/:id - Update form (org admin only)
router.put('/forms/:id', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    let formId;
    try {
        formId = parseInt(req.params.id);
        const {
            name, slug, description, isActive, useOrgIntegrations,
            captchaEnabled, csrfEnabled,
            useOrgSecuritySettings,
            rateLimitEnabled, rateLimitMaxRequests, rateLimitWindowSeconds, rateLimitMaxRequestsPerHour,
            minTimeBetweenSubmissionsEnabled, minTimeBetweenSubmissionsSeconds,
            maxRequestSizeBytes, refererFallbackEnabled
        } = req.body;
        const organizationId = getEffectiveOrgId(req);

        const form = await db.query.forms.findFirst({
            where: and(eq(forms.id, formId), organizationId ? eq(forms.organizationId, organizationId) : undefined)
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Slug Uniqueness Check
        if (slug !== undefined && slug !== form.slug) {
            const slugRegex = /^[a-z0-9-]+$/;
            if (!slugRegex.test(slug)) {
                return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens only' });
            }

            const existingForm = await db.query.forms.findFirst({ where: eq(forms.slug, slug) });
            if (existingForm) {
                return res.status(400).json({ error: 'Form with this slug already exists' });
            }
        }

        await db.update(forms).set({
            name: name ?? form.name,
            description: description ?? form.description,
            isActive: isActive ?? form.isActive,
            useOrgIntegrations: useOrgIntegrations ?? form.useOrgIntegrations,
            slug: slug ?? form.slug,
            captchaEnabled: captchaEnabled ?? form.captchaEnabled,
            csrfEnabled: csrfEnabled ?? form.csrfEnabled,
            useOrgSecuritySettings: useOrgSecuritySettings ?? form.useOrgSecuritySettings,
            rateLimitEnabled: rateLimitEnabled ?? form.rateLimitEnabled,
            rateLimitMaxRequests: rateLimitMaxRequests ?? form.rateLimitMaxRequests,
            rateLimitWindowSeconds: rateLimitWindowSeconds ?? form.rateLimitWindowSeconds,
            rateLimitMaxRequestsPerHour: rateLimitMaxRequestsPerHour ?? form.rateLimitMaxRequestsPerHour,
            minTimeBetweenSubmissionsEnabled: minTimeBetweenSubmissionsEnabled ?? form.minTimeBetweenSubmissionsEnabled,
            minTimeBetweenSubmissionsSeconds: minTimeBetweenSubmissionsSeconds ?? form.minTimeBetweenSubmissionsSeconds,
            maxRequestSizeBytes: maxRequestSizeBytes ?? form.maxRequestSizeBytes,
            refererFallbackEnabled: refererFallbackEnabled ?? form.refererFallbackEnabled,
            updatedAt: new Date()
        }).where(eq(forms.id, formId));

        const updatedForm = await db.query.forms.findFirst({ where: eq(forms.id, formId) });
        res.json(updatedForm);
    } catch (error: any) {
        logger.error('Error updating form', { error: error.message, stack: error.stack, formId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to update form' });
    }
});

// DELETE /org/forms/:id - Delete form (org admin only)
router.delete('/forms/:id', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    let formId;
    try {
        formId = parseInt(req.params.id);
        const organizationId = getEffectiveOrgId(req);

        const form = await db.query.forms.findFirst({
            where: and(eq(forms.id, formId), organizationId ? eq(forms.organizationId, organizationId) : undefined)
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Delete related submissions first
        await db.delete(submissions).where(eq(submissions.formId, formId));
        await db.delete(forms).where(eq(forms.id, formId));

        res.json({ message: 'Form deleted successfully' });
    } catch (error: any) {
        logger.error('Error deleting form', { error: error.message, stack: error.stack, formId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to delete form' });
    }
});

// POST /org/forms/:id/regenerate-hash - Generate new submit hash (org admin only)
router.post('/forms/:id/regenerate-hash', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    let formId;
    try {
        formId = parseInt(req.params.id);
        const organizationId = getEffectiveOrgId(req);

        const form = await db.query.forms.findFirst({
            where: and(eq(forms.id, formId), organizationId ? eq(forms.organizationId, organizationId) : undefined)
        });

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const newHash = generateSubmitHash();
        await db.update(forms)
            .set({ submitHash: newHash, updatedAt: new Date() })
            .where(eq(forms.id, formId));

        res.json({ submitHash: newHash });
    } catch (error: any) {
        logger.error('Error regenerating hash', { error: error.message, stack: error.stack, formId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to regenerate hash' });
    }
});

// ============ WHITELISTED DOMAINS ============

// GET /org/domains - List whitelisted domains
router.get('/domains', async (req: OrgContextRequest, res: Response) => {
    try {
        const domains = await db.query.whitelistedDomains.findMany({
            where: eq(whitelistedDomains.organizationId, req.organization!.id),
            orderBy: desc(whitelistedDomains.createdAt)
        });

        res.json(domains);
    } catch (error: any) {
        logger.error('Error fetching domains', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch domains' });
    }
});

// POST /org/domains - Add whitelisted domain (org admin only)
router.post('/domains', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    let domain;
    try {
        ({ domain } = req.body);

        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        // Check for duplicate
        // Check for duplicate
        const existing = await db.query.whitelistedDomains.findFirst({
            where: and(
                eq(whitelistedDomains.organizationId, req.organization!.id),
                eq(whitelistedDomains.domain, domain)
            )
        });

        if (existing) {
            return res.status(400).json({ error: 'Domain already whitelisted' });
        }

        // Limit to 50 domains
        const domainCountResult = await db.select({ count: count() })
            .from(whitelistedDomains)
            .where(eq(whitelistedDomains.organizationId, req.organization!.id));

        const domainCount = domainCountResult[0].count;

        if (domainCount >= 50) {
            return res.status(400).json({ error: 'Maximum of 50 domains allowed' });
        }

        const [whitelistedDomain] = await db.insert(whitelistedDomains).values({
            organizationId: req.organization!.id,
            domain
        }).returning();

        res.status(201).json(whitelistedDomain);
    } catch (error: any) {
        logger.error('Error adding domain', { error: error.message, stack: error.stack, domain, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to add domain' });
    }
});

// DELETE /org/domains/:id - Remove whitelisted domain (org admin only)
router.delete('/domains/:id', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    let domainId;
    try {
        domainId = parseInt(req.params.id);

        const domain = await db.query.whitelistedDomains.findFirst({
            where: and(
                eq(whitelistedDomains.id, domainId),
                eq(whitelistedDomains.organizationId, req.organization!.id)
            )
        });

        if (!domain) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        await db.delete(whitelistedDomains).where(eq(whitelistedDomains.id, domainId));

        res.json({ message: 'Domain removed successfully' });
    } catch (error: any) {
        logger.error('Error removing domain', { error: error.message, stack: error.stack, domainId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to remove domain' });
    }
});

// ============ SECURITY SETTINGS ============

// GET /org/security-settings - Get organization default security settings
router.get('/security-settings', async (req: OrgContextRequest, res: Response) => {
    try {
        const organization = await db.query.organizations.findFirst({
            where: eq(organizations.id, req.organization!.id)
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
    } catch (error: any) {
        logger.error('Error fetching security settings', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch security settings' });
    }
});

// PUT /org/security-settings - Update organization default security settings (org admin only)
router.put('/security-settings', verifyOrgAdmin, async (req: OrgContextRequest, res: Response) => {
    try {
        const organization = await db.query.organizations.findFirst({
            where: eq(organizations.id, req.organization!.id)
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

        const updates: any = {};
        if (defaultRateLimitEnabled !== undefined) updates.defaultRateLimitEnabled = defaultRateLimitEnabled;
        if (defaultRateLimitMaxRequests !== undefined) updates.defaultRateLimitMaxRequests = defaultRateLimitMaxRequests;
        if (defaultRateLimitWindowSeconds !== undefined) updates.defaultRateLimitWindowSeconds = defaultRateLimitWindowSeconds;
        if (defaultRateLimitMaxRequestsPerHour !== undefined) updates.defaultRateLimitMaxRequestsPerHour = defaultRateLimitMaxRequestsPerHour;
        if (defaultMinTimeBetweenSubmissionsEnabled !== undefined) updates.defaultMinTimeBetweenSubmissionsEnabled = defaultMinTimeBetweenSubmissionsEnabled;
        if (defaultMinTimeBetweenSubmissionsSeconds !== undefined) updates.defaultMinTimeBetweenSubmissionsSeconds = defaultMinTimeBetweenSubmissionsSeconds;
        if (defaultMaxRequestSizeBytes !== undefined) updates.defaultMaxRequestSizeBytes = defaultMaxRequestSizeBytes;
        if (defaultRefererFallbackEnabled !== undefined) updates.defaultRefererFallbackEnabled = defaultRefererFallbackEnabled;

        if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date();
            await db.update(organizations).set(updates).where(eq(organizations.id, organization.id));
        }

        // Re-fetch to confirm current state
        const updatedOrg = await db.query.organizations.findFirst({ where: eq(organizations.id, organization.id) });

        res.json({
            defaultRateLimitEnabled: updatedOrg!.defaultRateLimitEnabled,
            defaultRateLimitMaxRequests: updatedOrg!.defaultRateLimitMaxRequests,
            defaultRateLimitWindowSeconds: updatedOrg!.defaultRateLimitWindowSeconds,
            defaultRateLimitMaxRequestsPerHour: updatedOrg!.defaultRateLimitMaxRequestsPerHour,
            defaultMinTimeBetweenSubmissionsEnabled: updatedOrg!.defaultMinTimeBetweenSubmissionsEnabled,
            defaultMinTimeBetweenSubmissionsSeconds: updatedOrg!.defaultMinTimeBetweenSubmissionsSeconds,
            defaultMaxRequestSizeBytes: updatedOrg!.defaultMaxRequestSizeBytes,
            defaultRefererFallbackEnabled: updatedOrg!.defaultRefererFallbackEnabled
        });
    } catch (error: any) {
        logger.error('Error updating security settings', { error: error.message, stack: error.stack, correlationId: req.correlationId });
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

        const whereConditions = [];
        if (organizationId !== null) {
            whereConditions.push(eq(forms.organizationId, organizationId));
        } else {
            // If null (super admin contextless), we might want to see orphaned forms or ALL forms?
            // Original code: 'form.organizationId ' + (organizationId === null ? 'IS NULL' : '= :orgId')
            // This implies if orgId is null, we look for forms with NULL orgId.
            whereConditions.push(isNull(forms.organizationId));
        }

        if (formId) {
            whereConditions.push(eq(submissions.formId, formId));
        }

        const baseQuery = db.select({
            submission: submissions,
            form: forms
        })
            .from(submissions)
            .innerJoin(forms, eq(submissions.formId, forms.id));

        if (whereConditions.length > 0) {
            baseQuery.where(and(...whereConditions));
        }

        const results = await baseQuery
            .orderBy(desc(submissions.createdAt))
            .limit(limit)
            .offset(skip);

        const data = results.map(row => ({
            ...row.submission,
            form: row.form
        }));

        const countQuery = db.select({ count: count() })
            .from(submissions)
            .innerJoin(forms, eq(submissions.formId, forms.id));

        if (whereConditions.length > 0) {
            countQuery.where(and(...whereConditions));
        }

        const totalResult = await countQuery;
        const total = totalResult[0].count;

        res.json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        logger.error('Error fetching submissions', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

export default router;
