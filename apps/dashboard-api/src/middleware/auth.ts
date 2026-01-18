import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { getEnv } from "@formflow/shared/env";
import logger from "@formflow/shared/logger";

export type AuthRequest = Request & {
    user?: {
        userId: number;
    };
};

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        logger.warn('Access denied - no token provided', { correlationId: req.correlationId });
        return res.status(401).json('Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, getEnv("JWT_SECRET")!);
        req.user = decoded as { userId: number };
        logger.debug('Token verified successfully', { userId: req.user.userId, correlationId: req.correlationId });
        next();
    } catch (error: any) {
        logger.warn('Invalid token', { error: error.message, correlationId: req.correlationId });
        res.status(401).json('Invalid token.');
    }
}; 
