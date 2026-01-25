import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { AppDataSource } from "../data-source";
import { User, Organization } from "@formflow/shared/entities";
import logger from "@formflow/shared/logger";

export type OrgContextRequest = AuthRequest & {
    organization?: Organization;
    orgUser?: User;
};

/**
 * Middleware to inject organization context into the request.
 * Must be used after verifyToken middleware.
 * Ensures the user belongs to an organization and the organization is active.
 *
 * For super admins: Checks for X-Organization-Context header to allow
 * switching between viewing their own forms and managing specific organizations.
 */
export const injectOrgContext = async (req: OrgContextRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.userId) {
            logger.warn('Organization context injection failed - authentication required', { correlationId: req.correlationId });
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await AppDataSource.manager.findOne(User, {
            where: { id: req.user.userId },
            relations: ['organization']
        });

        if (!user) {
            logger.warn('Organization context injection failed - user not found', { userId: req.user.userId, correlationId: req.correlationId });
            return res.status(401).json({ error: 'User not found' });
        }

        // Super admins can bypass organization requirement and switch context
        if (user.isSuperAdmin) {
            req.orgUser = user;

            // Check for organization context header
            const orgContextHeader = req.headers['x-organization-context'];
            if (orgContextHeader) {
                const contextOrgId = parseInt(orgContextHeader as string, 10);
                if (!isNaN(contextOrgId)) {
                    // Load the requested organization
                    const contextOrg = await AppDataSource.manager.findOne(Organization, {
                        where: { id: contextOrgId }
                    });

                    if (contextOrg) {
                        req.organization = contextOrg;
                        return next();
                    }
                }
            }

            // No context header or invalid org - fallback to user's own organization if available
            if (user.organization && user.organization.isActive) {
                req.organization = user.organization;
            } else {
                req.organization = undefined;
            }
            return next();
        }

        if (!user.organizationId || !user.organization) {
            logger.warn('Organization context injection failed - user does not belong to an organization', { userId: user.id, correlationId: req.correlationId });
            return res.status(403).json({ error: 'User does not belong to an organization' });
        }

        if (!user.organization.isActive) {
            logger.warn('Organization context injection failed - organization is inactive', { userId: user.id, organizationId: user.organizationId, correlationId: req.correlationId });
            return res.status(403).json({ error: 'Organization is inactive' });
        }

        req.orgUser = user;
        req.organization = user.organization;
        logger.debug('Organization context injected successfully', { userId: user.id, organizationId: user.organizationId, correlationId: req.correlationId });
        next();
    } catch (error: any) {
        logger.error('Org context injection error', { error: error.message, stack: error.stack, userId: req.user?.userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Middleware to verify that the user is an org admin.
 * Must be used after injectOrgContext middleware.
 */
export const verifyOrgAdmin = async (req: OrgContextRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.orgUser) {
            logger.warn('Org admin verification failed - organization context required', { correlationId: req.correlationId });
            return res.status(401).json({ error: 'Organization context required' });
        }

        // Super admins can also act as org admins
        if (req.orgUser.isSuperAdmin || req.orgUser.role === 'org_admin') {
            logger.debug('Org admin verification successful', { userId: req.orgUser.id, role: req.orgUser.role, isSuperAdmin: req.orgUser.isSuperAdmin, correlationId: req.correlationId });
            next();
        } else {
            logger.warn('Org admin verification failed - insufficient permissions', { userId: req.orgUser.id, role: req.orgUser.role, correlationId: req.correlationId });
            return res.status(403).json({ error: 'Organization admin access required' });
        }
    } catch (error: any) {
        logger.error('Org admin verification error', { error: error.message, stack: error.stack, correlationId: req.correlationId });
        res.status(500).json({ error: 'Internal server error' });
    }
};
