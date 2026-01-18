import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { AppDataSource } from "../data-source";
import { User } from "@formflow/shared/entities";
import logger from "@formflow/shared/utils/logger";

/**
 * Middleware to verify that the authenticated user is a Super Admin.
 * Must be used after verifyToken middleware.
 */
export const verifySuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.userId) {
            logger.warn('Super admin verification failed - authentication required', { correlationId: req.correlationId });
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await AppDataSource.manager.findOne(User, {
            where: { id: req.user.userId }
        });

        if (!user) {
            logger.warn('Super admin verification failed - user not found', { userId: req.user.userId, correlationId: req.correlationId });
            return res.status(401).json({ error: 'User not found' });
        }

        if (!user.isSuperAdmin) {
            logger.warn('Super admin verification failed - insufficient permissions', { userId: user.id, isSuperAdmin: user.isSuperAdmin, correlationId: req.correlationId });
            return res.status(403).json({ error: 'Super Admin access required' });
        }

        // Attach full user to request for convenience
        (req as any).adminUser = user;
        logger.debug('Super admin verification successful', { userId: user.id, correlationId: req.correlationId });
        next();
    } catch (error: any) {
        logger.error('Super Admin verification error', { error: error.message, stack: error.stack, userId: req.user?.userId, correlationId: req.correlationId });
        res.status(500).json({ error: 'Internal server error' });
    }
};
