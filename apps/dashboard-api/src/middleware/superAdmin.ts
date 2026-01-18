import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { AppDataSource } from "../data-source";
import { User } from "@formflow/shared/entities";

/**
 * Middleware to verify that the authenticated user is a Super Admin.
 * Must be used after verifyToken middleware.
 */
export const verifySuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await AppDataSource.manager.findOne(User, {
            where: { id: req.user.userId }
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (!user.isSuperAdmin) {
            return res.status(403).json({ error: 'Super Admin access required' });
        }

        // Attach full user to request for convenience
        (req as any).adminUser = user;
        next();
    } catch (error) {
        console.error('Super Admin verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
