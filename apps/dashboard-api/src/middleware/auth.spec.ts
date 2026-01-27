
import { Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { verifyToken, AuthRequest } from './auth';

jest.mock('jsonwebtoken');
jest.mock('@formflow/shared/env', () => ({
    getEnv: jest.fn().mockReturnValue('test_secret'),
}));
jest.mock('@formflow/shared/logger', () => ({
    warn: jest.fn(),
    debug: jest.fn(),
}));

describe('Auth Middleware', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        mockReq = {
            headers: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should return 401 if no token provided', () => {
        verifyToken(mockReq as AuthRequest, mockRes as Response, next);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(expect.stringContaining('No token provided'));
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is invalid', () => {
        mockReq.headers = { authorization: 'InvalidFormat' };

        verifyToken(mockReq as AuthRequest, mockRes as Response, next);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if token is valid', () => {
        mockReq.headers = { authorization: 'Bearer valid_token' };
        (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });

        verifyToken(mockReq as AuthRequest, mockRes as Response, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
        expect(mockReq.user).toEqual({ userId: 1 });
        expect(next).toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
        mockReq.headers = { authorization: 'Bearer invalid_token' };
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        verifyToken(mockReq as AuthRequest, mockRes as Response, next);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith('Invalid token.');
        expect(next).not.toHaveBeenCalled();
    });
});
