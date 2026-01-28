import { Router, Response } from "express";
import { db } from "../db";
import { organizations, users, forms, submissions } from "@formflow/shared/db";
import { eq, desc, count, and, gte } from "drizzle-orm";
import { verifyToken, AuthRequest } from "../middleware/auth";
import { verifySuperAdmin } from "../middleware/superAdmin";
import bcrypt from "bcrypt";
import logger from "@formflow/shared/logger";

const BCRYPT_ROUNDS = 10;
const router = Router();

// All admin routes require authentication and super admin status
router.use(verifyToken);
router.use(verifySuperAdmin);

// GET /admin/stats - System-wide statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {

        const [
            orgsResult,
            activeOrgsResult,
            usersResult,
            formsResult,
            submissionsResult
        ] = await Promise.all([
            db.select({ count: count() }).from(organizations),
            db.select({ count: count() }).from(organizations).where(eq(organizations.isActive, true)),
            db.select({ count: count() }).from(users),
            db.select({ count: count() }).from(forms),
            db.select({ count: count() }).from(submissions)
        ]);

        const totalOrganizations = orgsResult[0].count;
        const activeOrganizations = activeOrgsResult[0].count;
        const totalUsers = usersResult[0].count;
        const totalForms = formsResult[0].count;
        const totalSubmissions = submissionsResult[0].count;

        // Get submissions in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSubmissionsResult = await db.select({ count: count() })
            .from(submissions)
            .where(gte(submissions.createdAt, thirtyDaysAgo));

        const recentSubmissions = recentSubmissionsResult[0].count;

        res.json({
            organizations: {
                total: totalOrganizations,
                active: activeOrganizations,
                inactive: totalOrganizations - activeOrganizations
            },
            users: {
                total: totalUsers
            },
            forms: {
                total: totalForms
            },
            submissions: {
                total: totalSubmissions,
                last30Days: recentSubmissions
            }
        });
    } catch (error) {
        const err = error as Error;
        logger.error('Error fetching admin stats', { error: err.message, stack: err.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /admin/organizations - List all organizations
router.get('/organizations', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const organizationsList = await db.query.organizations.findMany({
            orderBy: desc(organizations.createdAt),
            limit,
            offset: skip
        });

        const totalResult = await db.select({ count: count() }).from(organizations);
        const total = totalResult[0].count;

        res.json({

            data: organizationsList,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        const err = error as Error;
        logger.error('Error fetching organizations', { error: err.message, stack: err.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

// POST /admin/organizations - Create organization
router.post('/organizations', async (req: AuthRequest, res: Response) => {
    let name, slug;
    try {
        ({ name, slug } = req.body);

        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required' });
        }

        // Validate slug format (lowercase, alphanumeric, hyphens only)
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(slug)) {
            return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens only' });
        }

        // Check if slug already exists
        const existingOrg = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
        if (existingOrg) {
            return res.status(400).json({ error: 'Organization with this slug already exists' });
        }

        const [organization] = await db.insert(organizations).values({
            name,
            slug,
            isActive: true
        }).returning();

        res.status(201).json(organization);
    } catch (error) {
        const err = error as Error;
        logger.error('Error creating organization', { error: err.message, stack: err.stack, correlationId: req.correlationId, name, slug });
        res.status(500).json({ error: 'Failed to create organization' });
    }
});

// GET /admin/organizations/:id - Get organization details
router.get('/organizations/:id', async (req: AuthRequest, res: Response) => {
    let orgId;
    try {

        orgId = parseInt(req.params.id);

        const organization = await db.query.organizations.findFirst({
            where: eq(organizations.id, orgId),
            with: { users: true, forms: true, whitelistedDomains: true }
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Get submission count for this org
        // Drizzle doesn't support complex inner join counts easily in query builder without sql
        const submissionCountResult = await db.select({ count: count() })
            .from(submissions)
            .innerJoin(forms, eq(submissions.formId, forms.id))
            .where(eq(forms.organizationId, orgId));

        const submissionCount = submissionCountResult[0].count;

        res.json({
            ...organization,
            stats: {
                userCount: organization.users.length,
                formCount: organization.forms.length,
                domainCount: organization.whitelistedDomains.length,
                submissionCount
            }
        });
    } catch (error) {
        const err = error as Error;
        logger.error('Error fetching organization', { error: err.message, stack: err.stack, orgId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

// PUT /admin/organizations/:id - Update organization
router.put('/organizations/:id', async (req: AuthRequest, res: Response) => {
    let orgId;
    try {
        orgId = parseInt(req.params.id);
        const { name, slug, isActive } = req.body;

        const organization = await db.query.organizations.findFirst({
            where: eq(organizations.id, orgId)
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // If slug is being changed, validate it
        if (slug && slug !== organization.slug) {
            const slugRegex = /^[a-z0-9-]+$/;
            if (!slugRegex.test(slug)) {
                return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens only' });
            }

            const existingOrg = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
            if (existingOrg) {
                return res.status(400).json({ error: 'Organization with this slug already exists' });
            }
        }

        await db.update(organizations)
            .set({
                name: name ?? organization.name,
                slug: slug ?? organization.slug,
                isActive: isActive ?? organization.isActive,
                updatedAt: new Date()
            })
            .where(eq(organizations.id, orgId));

        const updatedOrg = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
        res.json(updatedOrg);
    } catch (error) {
        const err = error as Error;
        logger.error('Error updating organization', { error: err.message, stack: err.stack, orgId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

// DELETE /admin/organizations/:id - Deactivate organization (soft delete)
router.delete('/organizations/:id', async (req: AuthRequest, res: Response) => {
    let orgId;
    try {
        orgId = parseInt(req.params.id);

        const organization = await db.query.organizations.findFirst({
            where: eq(organizations.id, orgId)
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        await db.update(organizations)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(organizations.id, orgId));

        res.json({ message: 'Organization deactivated successfully' });
    } catch (error) {
        const err = error as Error;
        logger.error('Error deactivating organization', { error: err.message, stack: err.stack, orgId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to deactivate organization' });
    }
});

// GET /admin/organizations/:id/users - List users in organization
router.get('/organizations/:id/users', async (req: AuthRequest, res: Response) => {
    let orgId;
    try {
        orgId = parseInt(req.params.id);

        const usersList = await db.query.users.findMany({
            where: eq(users.organizationId, orgId),
            columns: {
                id: true,
                email: true,
                name: true,
                role: true,
                isSuperAdmin: true,
                createdAt: true
            }
        });

        res.json(usersList);
    } catch (error) {
        const err = error as Error;
        logger.error('Error fetching organization users', { error: err.message, stack: err.stack, orgId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /admin/organizations/:id/users - Add user to organization
router.post('/organizations/:id/users', async (req: AuthRequest, res: Response) => {
    let orgId, userId;
    try {
        orgId = parseInt(req.params.id);
        ({ userId } = req.body);
        const { role } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const organization = await db.query.organizations.findFirst({
            where: eq(organizations.id, orgId)
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await db.update(users)
            .set({ organizationId: orgId, role: role || 'member' })
            .where(eq(users.id, userId));

        const updatedUser = await db.query.users.findFirst({ where: eq(users.id, userId) });

        if (updatedUser) {
            res.json({ message: 'User added to organization', user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role } });
        } else {
            res.status(404).json({ error: 'User not found after update' });
        }
    } catch (error) {
        const err = error as Error;
        logger.error('Error adding user to organization', { error: err.message, stack: err.stack, orgId, userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to add user to organization' });
    }
});

// GET /admin/users - List all users
router.get('/users', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const usersList = await db.query.users.findMany({
            with: { organization: true },
            orderBy: desc(users.createdAt),
            limit,
            offset: skip
        });

        const totalResult = await db.select({ count: count() }).from(users);
        const total = totalResult[0].count;

        res.json({
            data: usersList,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        const err = error as Error;
        logger.error('Error fetching users', { error: err.message, stack: err.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// PUT /admin/users/:id/super-admin - Toggle super admin status
router.put('/users/:id/super-admin', async (req: AuthRequest, res: Response) => {
    let userId;
    try {
        userId = parseInt(req.params.id);
        const { isSuperAdmin } = req.body;

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await db.update(users)
            .set({ isSuperAdmin, updatedAt: new Date() })
            .where(eq(users.id, userId));

        res.json({ message: 'Super admin status updated', isSuperAdmin });
    } catch (error) {
        const err = error as Error;
        logger.error('Error updating super admin status', { error: err.message, stack: err.stack, userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to update super admin status' });
    }
});

// POST /admin/users - Create new user
router.post('/users', async (req: AuthRequest, res: Response) => {
    let email, organizationId;
    try {
        ({ email, organizationId } = req.body);
        const { password, name, role } = req.body;

        // Validation
        if (!email || !password || !organizationId) {
            return res.status(400).json({ error: 'Email, password, and organizationId are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        if (role && !['member', 'org_admin'].includes(role)) {
            return res.status(400).json({ error: 'Role must be either member or org_admin' });
        }

        // Check if user already exists
        const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Verify organization exists and is active
        const organization = await db.query.organizations.findFirst({
            where: eq(organizations.id, organizationId)
        });
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (!organization.isActive) {
            return res.status(400).json({ error: 'Cannot add users to inactive organization' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create user
        const [user] = await db.insert(users).values({
            email,
            passwordHash,
            name: name || null,
            organizationId,
            role: role || 'member',
            isSuperAdmin: false,
            isActive: true
        }).returning();

        // Return user without password hash
        res.status(201).json({
            id: user.id,
            email: user.email,
            name: user.name,
            organizationId: user.organizationId,
            role: user.role,
            isSuperAdmin: user.isSuperAdmin,
            createdAt: user.createdAt
        });
    } catch (error) {
        const err = error as Error;
        logger.error('Error creating user', { error: err.message, stack: err.stack, email, organizationId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /admin/users/:id/suspend - Suspend or activate a user
router.put('/users/:id/suspend', async (req: AuthRequest, res: Response) => {
    let userId;
    try {
        userId = parseInt(req.params.id, 10);
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'isActive must be a boolean' });
        }

        // Prevent super admin from suspending themselves
        if (req.user && userId === req.user.userId) {
            return res.status(403).json({ error: 'You cannot suspend yourself' });
        }

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await db.update(users)
            .set({ isActive, updatedAt: new Date() })
            .where(eq(users.id, userId));

        res.json({ message: 'User status updated', isActive });
    } catch (error) {
        const err = error as Error;
        logger.error('Error updating user status', { error: err.message, stack: err.stack, userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// DELETE /admin/users/:id - Delete a user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
    let userId;
    try {
        userId = parseInt(req.params.id, 10);

        // Prevent super admin from deleting themselves
        if (req.user && userId === req.user.userId) {
            return res.status(403).json({ error: 'You cannot delete yourself' });
        }

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await db.delete(users).where(eq(users.id, userId));

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        const err = error as Error;
        logger.error('Error deleting user', { error: err.message, stack: err.stack, userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// GET /admin/forms - List all forms (paginated)
router.get('/forms', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const formsList = await db.query.forms.findMany({
            with: { organization: true },
            orderBy: desc(forms.createdAt),
            limit,
            offset: skip
        });

        const totalResult = await db.select({ count: count() }).from(forms);
        const total = totalResult[0].count;

        res.json({
            data: formsList,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        const err = error as Error;
        logger.error('Error fetching forms', { error: err.message, stack: err.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});


// GET /admin/submissions - All submissions (paginated)
router.get('/submissions', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;
        const orgId = req.query.orgId ? parseInt(req.query.orgId as string) : undefined;
        const formId = req.query.formId ? parseInt(req.query.formId as string) : undefined;

        const whereConditions = [];
        if (orgId) {
            // We need to join to filter by orgId on form, which Drizzle query builder does via `with` filtering or separate logic.
            // But for standard filtering efficiency, we might need a raw query or clearer two-step.
            // However, `findMany` filters on relations are tricky.
            // Let's use `db.select().from(submissions)...` join approach for this complex query.
            whereConditions.push(eq(forms.organizationId, orgId));
        }
        if (formId) {
            whereConditions.push(eq(submissions.formId, formId));
        }

        const baseQuery = db.select({
            submission: submissions,
            form: forms,
            organization: organizations
        })
            .from(submissions)
            .leftJoin(forms, eq(submissions.formId, forms.id))
            .leftJoin(organizations, eq(forms.organizationId, organizations.id));

        if (whereConditions.length > 0) {
            baseQuery.where(and(...whereConditions));
        }

        const submissionsWithRelations = await baseQuery
            .limit(limit)
            .offset(skip)
            .orderBy(desc(submissions.createdAt));

        // Remap to match previous structure roughly, or just return flattened
        // The frontend expects { data: [ { ...submission, form: { ...form, organization: ... } } ] }
        const data = submissionsWithRelations.map(row => ({
            ...row.submission,
            form: {
                ...row.form,
                organization: row.organization
            }
        }));

        // Count query
        const countQuery = db.select({ count: count() })
            .from(submissions)
            .leftJoin(forms, eq(submissions.formId, forms.id));

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
    } catch (error) {
        const err = error as Error;
        logger.error('Error fetching submissions', { error: err.message, stack: err.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

export default router;
