import { Response, NextFunction } from 'express';
import { AppDataSource } from '../data-source';
import { injectOrgContext, verifyOrgAdmin, OrgContextRequest } from './orgContext';
import { AuthRequest } from './auth';
import { User, Organization } from '@formflow/shared/entities';
import { createMockAuthRequest, createMockResponse, createMockNext } from '../../test/mocks/express.mock';
import { createMockManager } from '../../test/mocks/data-source.mock';

// Mock the data-source module
jest.mock('../data-source', () => ({
  AppDataSource: {
    manager: createMockManager(),
  },
}));

describe('orgContext middleware', () => {
  let mockRequest: Partial<OrgContextRequest>;
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

  describe('injectOrgContext - Success Cases', () => {
    it('should inject organization context for regular user with organization', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'user@formflow.fyi',
        isSuperAdmin: false,
        organizationId: 1,
        organization: {
          id: 1,
          name: 'Test Org',
          slug: 'test-org',
          isActive: true,
        } as Organization,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockManager.findOne).toHaveBeenCalledWith(User, {
        where: { id: 1 },
        relations: ['organization'],
      });
      expect(mockRequest.orgUser).toEqual(mockUser);
      expect(mockRequest.organization).toEqual(mockUser.organization);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow super admin without organization context', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'admin@formflow.fyi',
        isSuperAdmin: true,
        organizationId: null,
      };

      mockRequest.headers = {};

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockRequest.orgUser).toEqual(mockUser);
      expect(mockRequest.organization).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow super admin with organization context header', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'admin@formflow.fyi',
        isSuperAdmin: true,
        organizationId: null,
      };

      const mockOrg: Partial<Organization> = {
        id: 2,
        name: 'Context Org',
        slug: 'context-org',
        isActive: true,
      };

      mockRequest.headers = {
        'x-organization-context': '2',
      };

      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockOrg);

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockManager.findOne).toHaveBeenCalledTimes(2);
      expect(mockRequest.orgUser).toEqual(mockUser);
      expect(mockRequest.organization).toEqual(mockOrg);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('injectOrgContext - Authentication Errors', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('injectOrgContext - Authorization Errors', () => {
    it('should return 403 when regular user has no organization', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'user@formflow.fyi',
        isSuperAdmin: false,
        organizationId: null,
        organization: null,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User does not belong to an organization' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when organization is inactive', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'user@formflow.fyi',
        isSuperAdmin: false,
        organizationId: 1,
        organization: {
          id: 1,
          name: 'Test Org',
          slug: 'test-org',
          isActive: false,
        } as Organization,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockUser);

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Organization is inactive' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('injectOrgContext - Edge Cases', () => {
    it('should handle invalid organization context header for super admin', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'admin@formflow.fyi',
        isSuperAdmin: true,
        organizationId: null,
      };

      mockRequest.headers = {
        'x-organization-context': 'invalid',
      };

      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockRequest.orgUser).toEqual(mockUser);
      expect(mockRequest.organization).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle organization context header with non-existent organization', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        email: 'admin@formflow.fyi',
        isSuperAdmin: true,
        organizationId: null,
      };

      mockRequest.headers = {
        'x-organization-context': '999',
      };

      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockRequest.orgUser).toEqual(mockUser);
      expect(mockRequest.organization).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('injectOrgContext - Server Errors', () => {
    it('should return 500 when database query fails', async () => {
      mockManager.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await injectOrgContext(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifyOrgAdmin - Success Cases', () => {
    it('should allow org_admin user', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        role: 'org_admin',
        isSuperAdmin: false,
      };

      mockRequest.orgUser = mockUser as User;

      await verifyOrgAdmin(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow super admin', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        role: 'member',
        isSuperAdmin: true,
      };

      mockRequest.orgUser = mockUser as User;

      await verifyOrgAdmin(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('verifyOrgAdmin - Authentication Errors', () => {
    it('should return 401 when orgUser is not set', async () => {
      mockRequest.orgUser = undefined;

      await verifyOrgAdmin(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Organization context required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifyOrgAdmin - Authorization Errors', () => {
    it('should return 403 when user is regular member', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        role: 'member',
        isSuperAdmin: false,
      };

      mockRequest.orgUser = mockUser as User;

      await verifyOrgAdmin(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Organization admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifyOrgAdmin - Server Errors', () => {
    it('should return 500 when an error occurs', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        role: 'org_admin',
        isSuperAdmin: false,
      };

      mockRequest.orgUser = mockUser as User;
      mockNext.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await verifyOrgAdmin(mockRequest as OrgContextRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
