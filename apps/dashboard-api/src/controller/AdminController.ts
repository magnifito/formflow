import { Router, Response } from "express";
import { AppDataSource } from "../data-source";
import { Organization, User, Form, Submission, OrganizationIntegration } from "@formflow/shared/entities";
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
            totalOrganizations,
            activeOrganizations,
            totalUsers,
            totalForms,
            totalSubmissions
        ] = await Promise.all([
            AppDataSource.manager.count(Organization),
            AppDataSource.manager.count(Organization, { where: { isActive: true } }),
            AppDataSource.manager.count(User),
            AppDataSource.manager.count(Form),
            AppDataSource.manager.count(Submission)
        ]);

        // Get submissions in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSubmissions = await AppDataSource.manager
            .createQueryBuilder(Submission, 'submission')
            .where('submission.createdAt >= :date', { date: thirtyDaysAgo })
            .getCount();

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
    } catch (error: any) {
        logger.error('Error fetching admin stats', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /admin/organizations - List all organizations
router.get('/organizations', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [organizations, total] = await AppDataSource.manager.findAndCount(Organization, {
            order: { createdAt: 'DESC' },
            skip,
            take: limit
        });

        res.json({
            data: organizations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        logger.error('Error fetching organizations', { error: error.message, stack: error.stack, correlationId: req.correlationId });
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
        const existingOrg = await AppDataSource.manager.findOne(Organization, { where: { slug } });
        if (existingOrg) {
            return res.status(400).json({ error: 'Organization with this slug already exists' });
        }

        const organization = AppDataSource.manager.create(Organization, {
            name,
            slug,
            isActive: true
        });

        await AppDataSource.manager.save(organization);

        // Create default organization integration
        const orgIntegration = AppDataSource.manager.create(OrganizationIntegration, {
            organizationId: organization.id,
            emailEnabled: true
        });
        await AppDataSource.manager.save(orgIntegration);

        res.status(201).json(organization);
    } catch (error: any) {
        logger.error('Error creating organization', { error: error.message, stack: error.stack, correlationId: req.correlationId, name, slug });
        res.status(500).json({ error: 'Failed to create organization' });
    }
});

// GET /admin/organizations/:id - Get organization details
router.get('/organizations/:id', async (req: AuthRequest, res: Response) => {
    try {
        const orgId = parseInt(req.params.id);

        const organization = await AppDataSource.manager.findOne(Organization, {
            where: { id: orgId },
            relations: ['users', 'forms', 'whitelistedDomains', 'integration']
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Get submission count for this org
        const submissionCount = await AppDataSource.manager
            .createQueryBuilder(Submission, 'submission')
            .innerJoin('submission.form', 'form')
            .where('form.organizationId = :orgId', { orgId })
            .getCount();

        res.json({
            ...organization,
            stats: {
                userCount: organization.users?.length || 0,
                formCount: organization.forms?.length || 0,
                domainCount: organization.whitelistedDomains?.length || 0,
                submissionCount
            }
        });
    } catch (error: any) {
        logger.error('Error fetching organization', { error: error.message, stack: error.stack, orgId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

// PUT /admin/organizations/:id - Update organization
router.put('/organizations/:id', async (req: AuthRequest, res: Response) => {
    let orgId;
    try {
        orgId = parseInt(req.params.id);
        const { name, slug, isActive } = req.body;

        const organization = await AppDataSource.manager.findOne(Organization, {
            where: { id: orgId }
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

            const existingOrg = await AppDataSource.manager.findOne(Organization, { where: { slug } });
            if (existingOrg) {
                return res.status(400).json({ error: 'Organization with this slug already exists' });
            }
            organization.slug = slug;
        }

        if (name !== undefined) organization.name = name;
        if (isActive !== undefined) organization.isActive = isActive;

        await AppDataSource.manager.save(organization);

        res.json(organization);
    } catch (error: any) {
        logger.error('Error updating organization', { error: error.message, stack: error.stack, orgId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

// DELETE /admin/organizations/:id - Deactivate organization (soft delete)
router.delete('/organizations/:id', async (req: AuthRequest, res: Response) => {
    try {
        const orgId = parseInt(req.params.id);

        const organization = await AppDataSource.manager.findOne(Organization, {
            where: { id: orgId }
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        organization.isActive = false;
        await AppDataSource.manager.save(organization);

        res.json({ message: 'Organization deactivated successfully' });
    } catch (error: any) {
        logger.error('Error deactivating organization', { error: error.message, stack: error.stack, orgId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to deactivate organization' });
    }
});

// GET /admin/organizations/:id/users - List users in organization
router.get('/organizations/:id/users', async (req: AuthRequest, res: Response) => {
    try {
        const orgId = parseInt(req.params.id);

        const users = await AppDataSource.manager.find(User, {
            where: { organizationId: orgId },
            select: ['id', 'email', 'name', 'role', 'isSuperAdmin', 'createdAt']
        });

        res.json(users);
    } catch (error: any) {
        logger.error('Error fetching organization users', { error: error.message, stack: error.stack, orgId, correlationId: req.correlationId });
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

        const organization = await AppDataSource.manager.findOne(Organization, {
            where: { id: orgId }
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const user = await AppDataSource.manager.findOne(User, {
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.organizationId = orgId;
        user.role = role || 'member';
        await AppDataSource.manager.save(user);

        res.json({ message: 'User added to organization', user: { id: user.id, email: user.email, role: user.role } });
    } catch (error: any) {
        logger.error('Error adding user to organization', { error: error.message, stack: error.stack, orgId, userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to add user to organization' });
    }
});

// GET /admin/users - List all users
router.get('/users', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [users, total] = await AppDataSource.manager.findAndCount(User, {
            select: ['id', 'email', 'name', 'organizationId', 'role', 'isSuperAdmin', 'createdAt'],
            relations: ['organization'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit
        });

        res.json({
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        logger.error('Error fetching users', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// PUT /admin/users/:id/super-admin - Toggle super admin status
router.put('/users/:id/super-admin', async (req: AuthRequest, res: Response) => {
    let userId;
    try {
        userId = parseInt(req.params.id);
        const { isSuperAdmin } = req.body;

        const user = await AppDataSource.manager.findOne(User, {
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isSuperAdmin = isSuperAdmin;
        await AppDataSource.manager.save(user);

        res.json({ message: 'Super admin status updated', isSuperAdmin: user.isSuperAdmin });
    } catch (error: any) {
        logger.error('Error updating super admin status', { error: error.message, stack: error.stack, userId, correlationId: req.correlationId });
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
        const existingUser = await AppDataSource.manager.findOne(User, { where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Verify organization exists and is active
        const organization = await AppDataSource.manager.findOne(Organization, {
            where: { id: organizationId }
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
        const user = AppDataSource.manager.create(User, {
            email,
            passwordHash,
            name: name || null,
            organizationId,
            role: role || 'member',
            isSuperAdmin: false
        });

        await AppDataSource.manager.save(user);

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
    } catch (error: any) {
        logger.error('Error creating user', { error: error.message, stack: error.stack, email, organizationId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /admin/users/:id/suspend - Suspend or activate a user
router.put('/users/:id/suspend', async (req: AuthRequest, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'isActive must be a boolean' });
        }

        // Prevent super admin from suspending themselves
        if (userId === req.user!.userId) {
            return res.status(403).json({ error: 'You cannot suspend yourself' });
        }

        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isActive = isActive;
        await AppDataSource.manager.save(user);

        res.json({ message: 'User status updated', isActive: user.isActive });
    } catch (error: any) {
        logger.error('Error updating user status', { error: error.message, stack: error.stack, userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// DELETE /admin/users/:id - Delete a user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);

        // Prevent super admin from deleting themselves
        if (userId === req.user!.userId) {
            return res.status(403).json({ error: 'You cannot delete yourself' });
        }

        const user = await AppDataSource.manager.findOne(User, { where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await AppDataSource.manager.remove(user);

        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        logger.error('Error deleting user', { error: error.message, stack: error.stack, userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// GET /admin/forms - List all forms (paginated)
router.get('/forms', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [forms, total] = await AppDataSource.manager.findAndCount(Form, {
            relations: ['organization'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit
        });

        res.json({
            data: forms,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        logger.error('Error fetching forms', { error: error.message, stack: error.stack, correlationId: req.correlationId });
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

        let queryBuilder = AppDataSource.manager
            .createQueryBuilder(Submission, 'submission')
            .leftJoinAndSelect('submission.form', 'form')
            .leftJoinAndSelect('form.organization', 'organization')
            .orderBy('submission.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (orgId) {
            queryBuilder = queryBuilder.andWhere('form.organizationId = :orgId', { orgId });
        }

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
    } catch (error: any) {
        logger.error('Error fetching submissions', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

export default router;
