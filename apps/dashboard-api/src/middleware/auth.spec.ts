import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { verifyToken, AuthRequest } from './auth';
import { createMockRequest, createMockResponse, createMockNext } from '../../test/mocks/express.mock';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('auth middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken - Success Cases', () => {
    it('should call next() when valid token is provided', () => {
      const token = 'valid-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockRequest.user).toEqual({ userId: 1 });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should attach user to request when token is valid', () => {
      const token = 'valid-token';
      const decoded = { userId: 42 };
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('verifyToken - Authentication Errors', () => {
    it('should return 401 when authorization header is missing', () => {
      mockRequest.headers = {};

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith('Access denied. No token provided.');
      expect(mockNext).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      mockRequest.headers = {
        authorization: 'Invalid token',
      };

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith('Access denied. No token provided.');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is undefined', () => {
      mockRequest.headers = {
        authorization: undefined,
      };

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith('Access denied. No token provided.');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid/expired', () => {
      const token = 'invalid-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith('Invalid token.');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should return 401 when JWT verification throws TokenExpiredError', () => {
      const token = 'expired-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw expiredError;
      });

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith('Invalid token.');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT verification throws JsonWebTokenError', () => {
      const token = 'malformed-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw jwtError;
      });

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith('Invalid token.');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken - Edge Cases', () => {
    it('should handle token with extra spaces', () => {
      const token = 'valid-token';
      mockRequest.headers = {
        authorization: `Bearer  ${token}  `,
      };

      (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing JWT_SECRET environment variable', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const token = 'valid-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });

      verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(token, undefined);
      
      // Restore for other tests
      process.env.JWT_SECRET = originalSecret;
    });
  });
});
