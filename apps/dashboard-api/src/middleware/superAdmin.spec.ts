import { Response, NextFunction } from 'express';
import { AppDataSource } from '../data-source';
import { verifySuperAdmin, AuthRequest } from './superAdmin';
import { User } from '@formflow/shared/entities';
import { createMockAuthRequest, createMockResponse, createMockNext } from '../../test/mocks/express.mock';
import { createMockManager } from '../../test/mocks/data-source.mock';

// Mock the data-source module
jest.mock('../data-source', () => ({
  AppDataSource: {
    manager: createMockManager(),
  },
}));

describe('superAdmin middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;
  let mockManager: ReturnType<typeof createMockManager>;

  beforeEach(() => {
    mockRequest = createMockAuthRequest(1);
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockManager = AppDataSource.manager as ReturnType<typeof createMockManager>;
    jest.clearAllMocks();
  });

  describe('verifySuperAdmin - Success Cases', () => {
    it('should call next() when user is super admin', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'admin@example.com',
        isSuperAdmin: true,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockManager.findOne).toHaveBeenCalledWith(User, {
        where: { id: 1 },
      });
      expect((mockRequest as any).adminUser).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should attach adminUser to request when user is super admin', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'admin@example.com',
        isSuperAdmin: true,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect((mockRequest as any).adminUser).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('verifySuperAdmin - Authentication Errors', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it('should return 401 when userId is missing', async () => {
      mockRequest.user = {} as any;

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found in database', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockManager.findOne).toHaveBeenCalledWith(User, {
        where: { id: 1 },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifySuperAdmin - Authorization Errors', () => {
    it('should return 403 when user is not super admin', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'user@example.com',
        isSuperAdmin: false,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Super Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
      expect((mockRequest as any).adminUser).toBeUndefined();
    });

    it('should return 403 when isSuperAdmin is explicitly false', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'user@example.com',
        isSuperAdmin: false,
        role: 'org_admin',
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Super Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifySuperAdmin - Server Errors', () => {
    it('should return 500 when database query fails', async () => {
      mockManager.findOne = jest.fn().mockRejectedValue(new Error('Database connection error'));

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when database throws unexpected error', async () => {
      mockManager.findOne = jest.fn().mockRejectedValue(new Error('Unexpected database error'));

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifySuperAdmin - Edge Cases', () => {
    it('should handle user with isSuperAdmin as null', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'user@example.com',
        isSuperAdmin: null as any,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Super Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user with isSuperAdmin as undefined', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'user@example.com',
        isSuperAdmin: undefined as any,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await verifySuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Super Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
