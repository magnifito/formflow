import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { AppDataSource } from "../data-source";
import { User, Organization } from "@formflow/shared/entities";

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
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await AppDataSource.manager.findOne(User, {
            where: { id: req.user.userId },
            relations: ['organization']
        });

        if (!user) {
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

            // No context header or invalid org - use super admin's personal context (null org)
            req.organization = undefined;
            return next();
        }

        if (!user.organizationId || !user.organization) {
            return res.status(403).json({ error: 'User does not belong to an organization' });
        }

        if (!user.organization.isActive) {
            return res.status(403).json({ error: 'Organization is inactive' });
        }

        req.orgUser = user;
        req.organization = user.organization;
        next();
    } catch (error) {
        console.error('Org context injection error:', error);
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
            return res.status(401).json({ error: 'Organization context required' });
        }

        // Super admins can also act as org admins
        if (req.orgUser.isSuperAdmin || req.orgUser.role === 'org_admin') {
            next();
        } else {
            return res.status(403).json({ error: 'Organization admin access required' });
        }
    } catch (error) {
        console.error('Org admin verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
