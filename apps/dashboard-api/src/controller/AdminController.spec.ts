import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import router from './AdminController';
import { Organization, User, Submission } from '@formflow/shared/entities';
import { AuthRequest } from '../middleware/auth';
import { createMockAuthRequest, createMockResponse } from '../../test/mocks/express.mock';
import { createMockManager, createMockQueryBuilder } from '../../test/mocks/data-source.mock';
import bcrypt from 'bcrypt';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('../data-source', () => ({
  AppDataSource: {
    manager: createMockManager(),
  },
}));

jest.mock('bcrypt');

describe('AdminController', () => {
  let app: express.Application;
  let mockManager: ReturnType<typeof createMockManager>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  const mockToken = 'valid-super-admin-token';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Skip auth middleware for unit tests - we're testing controller logic
    app.use('/admin', (req, res, next) => {
      (req as AuthRequest).user = { userId: 1 };
      next();
    });
    app.use('/admin', router);

    mockManager = AppDataSource.manager as ReturnType<typeof createMockManager>;
    mockQueryBuilder = createMockQueryBuilder();
    jest.clearAllMocks();
  });

  describe('GET /admin/stats', () => {
    it('should return system statistics successfully', async () => {
      mockManager.count = jest.fn()
        .mockResolvedValueOnce(10) // totalOrganizations
        .mockResolvedValueOnce(8)  // activeOrganizations
        .mockResolvedValueOnce(25) // totalUsers
        .mockResolvedValueOnce(50) // totalForms
        .mockResolvedValueOnce(200); // totalSubmissions

      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(15); // recentSubmissions

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual({
        organizations: {
          total: 10,
          active: 8,
          inactive: 2,
        },
        users: {
          total: 25,
        },
        forms: {
          total: 50,
        },
        submissions: {
          total: 200,
          last30Days: 15,
        },
      });
    });

    it('should return 500 when database query fails', async () => {
      mockManager.count = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);

      expect(mockManager.count).toHaveBeenCalled();
    });
  });

  describe('GET /admin/organizations', () => {
    it('should return paginated organizations successfully', async () => {
      const mockOrgs = [
        { id: 1, name: 'Org 1', slug: 'org-1' },
        { id: 2, name: 'Org 2', slug: 'org-2' },
      ];

      mockManager.findAndCount = jest.fn().mockResolvedValue([mockOrgs, 2]);

      const response = await request(app)
        .get('/admin/organizations?page=1&limit=20')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.data).toEqual(mockOrgs);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should use default pagination when query params are missing', async () => {
      mockManager.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      await request(app)
        .get('/admin/organizations')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockManager.findAndCount).toHaveBeenCalledWith(
        Organization,
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it('should return 500 when database query fails', async () => {
      mockManager.findAndCount = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/admin/organizations')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('POST /admin/organizations', () => {
    it('should create organization successfully', async () => {
      const newOrg = { id: 1, name: 'New Org', slug: 'new-org', isActive: true };
      const mockIntegration = { id: 1, organizationId: 1, emailEnabled: true };

      mockManager.findOne = jest.fn().mockResolvedValue(null); // No existing org
      mockManager.create = jest.fn()
        .mockReturnValueOnce(newOrg)
        .mockReturnValueOnce(mockIntegration);
      mockManager.save = jest.fn()
        .mockResolvedValueOnce(newOrg)
        .mockResolvedValueOnce(mockIntegration);

      const response = await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Org', slug: 'new-org' })
        .expect(201);

      expect(response.body).toMatchObject(newOrg);
      expect(mockManager.save).toHaveBeenCalledTimes(2);
    });

    it('should return 400 when name is missing', async () => {
      await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ slug: 'new-org' })
        .expect(400);

      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it('should return 400 when slug is missing', async () => {
      await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Org' })
        .expect(400);
    });

    it('should return 400 when slug format is invalid', async () => {
      await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Org', slug: 'Invalid_Slug!' })
        .expect(400);

      expect(response.body.error).toBe('Slug must be lowercase alphanumeric with hyphens only');
    });

    it('should return 400 when slug already exists', async () => {
      const existingOrg = { id: 1, slug: 'existing-org' };
      mockManager.findOne = jest.fn().mockResolvedValue(existingOrg);

      await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Org', slug: 'existing-org' })
        .expect(400);

      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('should return 500 when database save fails', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);
      mockManager.create = jest.fn().mockReturnValue({});
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Org', slug: 'new-org' })
        .expect(500);
    });
  });

  describe('GET /admin/organizations/:id', () => {
    it('should return organization details successfully', async () => {
      const mockOrg = {
        id: 1,
        name: 'Test Org',
        users: [{ id: 1 }],
        forms: [{ id: 1 }, { id: 2 }],
        whitelistedDomains: [{ id: 1 }],
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockOrg);
      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.innerJoin = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(100);

      const response = await request(app)
        .get('/admin/organizations/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.stats).toEqual({
        userCount: 1,
        formCount: 2,
        domainCount: 1,
        submissionCount: 100,
      });
    });

    it('should return 404 when organization not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .get('/admin/organizations/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 500 when database query fails', async () => {
      mockManager.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/admin/organizations/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('PUT /admin/organizations/:id', () => {
    it('should update organization successfully', async () => {
      const existingOrg = { id: 1, name: 'Old Name', slug: 'old-slug', isActive: true };
      const updatedOrg = { ...existingOrg, name: 'New Name' };

      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(existingOrg) // Find org
        .mockResolvedValueOnce(null); // Check duplicate slug
      mockManager.save = jest.fn().mockResolvedValue(updatedOrg);

      const response = await request(app)
        .put('/admin/organizations/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.name).toBe('New Name');
    });

    it('should return 404 when organization not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .put('/admin/organizations/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should return 400 when slug format is invalid', async () => {
      const existingOrg = { id: 1, slug: 'old-slug' };
      mockManager.findOne = jest.fn().mockResolvedValue(existingOrg);

      await request(app)
        .put('/admin/organizations/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ slug: 'Invalid_Slug!' })
        .expect(400);
    });

    it('should return 400 when new slug already exists', async () => {
      const existingOrg = { id: 1, slug: 'old-slug' };
      const duplicateOrg = { id: 2, slug: 'new-slug' };
      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(existingOrg)
        .mockResolvedValueOnce(duplicateOrg);

      await request(app)
        .put('/admin/organizations/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ slug: 'new-slug' })
        .expect(400);
    });

    it('should return 500 when database save fails', async () => {
      const existingOrg = { id: 1, slug: 'old-slug' };
      mockManager.findOne = jest.fn().mockResolvedValue(existingOrg);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .put('/admin/organizations/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Name' })
        .expect(500);
    });
  });

  describe('DELETE /admin/organizations/:id', () => {
    it('should deactivate organization successfully', async () => {
      const org = { id: 1, isActive: true };
      mockManager.findOne = jest.fn().mockResolvedValue(org);
      mockManager.save = jest.fn().mockResolvedValue({ ...org, isActive: false });

      const response = await request(app)
        .delete('/admin/organizations/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.message).toBe('Organization deactivated successfully');
      expect(org.isActive).toBe(false);
    });

    it('should return 404 when organization not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .delete('/admin/organizations/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 500 when database save fails', async () => {
      const org = { id: 1, isActive: true };
      mockManager.findOne = jest.fn().mockResolvedValue(org);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .delete('/admin/organizations/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('GET /admin/organizations/:id/users', () => {
    it('should return users in organization successfully', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@formflow.fyi', role: 'member' },
        { id: 2, email: 'user2@formflow.fyi', role: 'org_admin' },
      ];

      mockManager.find = jest.fn().mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/admin/organizations/1/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual(mockUsers);
    });

    it('should return 500 when database query fails', async () => {
      mockManager.find = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/admin/organizations/1/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('POST /admin/organizations/:id/users', () => {
    it('should add user to organization successfully', async () => {
      const org = { id: 1, name: 'Test Org' };
      const user = { id: 2, email: 'user@formflow.fyi', role: 'member' };
      const updatedUser = { ...user, organizationId: 1, role: 'org_admin' };

      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(org)
        .mockResolvedValueOnce(user);
      mockManager.save = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .post('/admin/organizations/1/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ userId: 2, role: 'org_admin' })
        .expect(200);

      expect(response.body.message).toBe('User added to organization');
    });

    it('should return 400 when userId is missing', async () => {
      await request(app)
        .post('/admin/organizations/1/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ role: 'org_admin' })
        .expect(400);
    });

    it('should return 404 when organization not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .post('/admin/organizations/999/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ userId: 2 })
        .expect(404);
    });

    it('should return 404 when user not found', async () => {
      const org = { id: 1 };
      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(org)
        .mockResolvedValueOnce(null);

      await request(app)
        .post('/admin/organizations/1/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ userId: 999 })
        .expect(404);
    });

    it('should return 500 when database save fails', async () => {
      const org = { id: 1 };
      const user = { id: 2 };
      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(org)
        .mockResolvedValueOnce(user);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .post('/admin/organizations/1/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ userId: 2 })
        .expect(500);
    });
  });

  describe('GET /admin/users', () => {
    it('should return paginated users successfully', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@formflow.fyi' },
        { id: 2, email: 'user2@formflow.fyi' },
      ];

      mockManager.findAndCount = jest.fn().mockResolvedValue([mockUsers, 2]);

      const response = await request(app)
        .get('/admin/users?page=1&limit=20')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should return 500 when database query fails', async () => {
      mockManager.findAndCount = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('PUT /admin/users/:id/super-admin', () => {
    it('should update super admin status successfully', async () => {
      const user = { id: 1, isSuperAdmin: false };
      const updatedUser = { ...user, isSuperAdmin: true };

      mockManager.findOne = jest.fn().mockResolvedValue(user);
      mockManager.save = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/admin/users/1/super-admin')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isSuperAdmin: true })
        .expect(200);

      expect(response.body.isSuperAdmin).toBe(true);
    });

    it('should return 404 when user not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .put('/admin/users/999/super-admin')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isSuperAdmin: true })
        .expect(404);
    });

    it('should return 500 when database save fails', async () => {
      const user = { id: 1, isSuperAdmin: false };
      mockManager.findOne = jest.fn().mockResolvedValue(user);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .put('/admin/users/1/super-admin')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isSuperAdmin: true })
        .expect(500);
    });
  });

  describe('POST /admin/users', () => {
    it('should create user successfully', async () => {
      const org = { id: 1, isActive: true };
      const newUser = {
        id: 1,
        email: 'newuser@formflow.fyi',
        name: 'New User',
        organizationId: 1,
        role: 'member',
        isSuperAdmin: false,
        createdAt: new Date(),
      };

      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(null) // No existing user
        .mockResolvedValueOnce(org); // Organization exists
      (bcrypt.hash as jest.Mock) = jest.fn().mockResolvedValue('hashed-password');
      mockManager.create = jest.fn().mockReturnValue(newUser);
      mockManager.save = jest.fn().mockResolvedValue(newUser);

      const response = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          email: 'newuser@formflow.fyi',
          password: 'password123',
          name: 'New User',
          organizationId: 1,
          role: 'member',
        })
        .expect(201);

      expect(response.body.email).toBe('newuser@formflow.fyi');
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should return 400 when email is missing', async () => {
      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ password: 'password123', organizationId: 1 })
        .expect(400);
    });

    it('should return 400 when password is missing', async () => {
      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ email: 'user@formflow.fyi', organizationId: 1 })
        .expect(400);
    });

    it('should return 400 when organizationId is missing', async () => {
      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ email: 'user@formflow.fyi', password: 'password123' })
        .expect(400);
    });

    it('should return 400 when password is too short', async () => {
      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          email: 'user@formflow.fyi',
          password: 'short',
          organizationId: 1,
        })
        .expect(400);
    });

    it('should return 400 when role is invalid', async () => {
      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          email: 'user@formflow.fyi',
          password: 'password123',
          organizationId: 1,
          role: 'invalid_role',
        })
        .expect(400);
    });

    it('should return 400 when user email already exists', async () => {
      const existingUser = { id: 1, email: 'existing@formflow.fyi' };
      mockManager.findOne = jest.fn().mockResolvedValue(existingUser);

      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          email: 'existing@formflow.fyi',
          password: 'password123',
          organizationId: 1,
        })
        .expect(400);
    });

    it('should return 404 when organization not found', async () => {
      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(null) // No existing user
        .mockResolvedValueOnce(null); // Organization not found

      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          email: 'user@formflow.fyi',
          password: 'password123',
          organizationId: 999,
        })
        .expect(404);
    });

    it('should return 400 when organization is inactive', async () => {
      const inactiveOrg = { id: 1, isActive: false };
      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(inactiveOrg);

      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          email: 'user@formflow.fyi',
          password: 'password123',
          organizationId: 1,
        })
        .expect(400);
    });

    it('should return 500 when database save fails', async () => {
      const org = { id: 1, isActive: true };
      mockManager.findOne = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(org);
      (bcrypt.hash as jest.Mock) = jest.fn().mockResolvedValue('hashed-password');
      mockManager.create = jest.fn().mockReturnValue({});
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          email: 'user@formflow.fyi',
          password: 'password123',
          organizationId: 1,
        })
        .expect(500);
    });
  });

  describe('PUT /admin/users/:id/suspend', () => {
    it('should suspend user successfully', async () => {
      const user = { id: 2, isActive: true };
      mockManager.findOne = jest.fn().mockResolvedValue(user);
      mockManager.save = jest.fn().mockResolvedValue({ ...user, isActive: false });

      const response = await request(app)
        .put('/admin/users/2/suspend')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should return 400 when isActive is not a boolean', async () => {
      await request(app)
        .put('/admin/users/2/suspend')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isActive: 'not-a-boolean' })
        .expect(400);
    });

    it('should return 403 when trying to suspend self', async () => {
      // req.user.userId is 1 (from mock auth)
      await request(app)
        .put('/admin/users/1/suspend')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isActive: false })
        .expect(403);
    });

    it('should return 404 when user not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .put('/admin/users/999/suspend')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isActive: false })
        .expect(404);
    });

    it('should return 500 when database save fails', async () => {
      const user = { id: 2, isActive: true };
      mockManager.findOne = jest.fn().mockResolvedValue(user);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .put('/admin/users/2/suspend')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isActive: false })
        .expect(500);
    });
  });

  describe('DELETE /admin/users/:id', () => {
    it('should delete user successfully', async () => {
      const user = { id: 2 };
      mockManager.findOne = jest.fn().mockResolvedValue(user);
      mockManager.remove = jest.fn().mockResolvedValue(user);

      const response = await request(app)
        .delete('/admin/users/2')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.message).toBe('User deleted successfully');
    });

    it('should return 403 when trying to delete self', async () => {
      await request(app)
        .delete('/admin/users/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });

    it('should return 404 when user not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .delete('/admin/users/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 500 when database remove fails', async () => {
      const user = { id: 2 };
      mockManager.findOne = jest.fn().mockResolvedValue(user);
      mockManager.remove = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .delete('/admin/users/2')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('GET /admin/submissions', () => {
    it('should return paginated submissions successfully', async () => {
      const mockSubmissions = [
        { id: 1, data: { name: 'Test' } },
        { id: 2, data: { name: 'Test 2' } },
      ];

      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.leftJoinAndSelect = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.skip = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.take = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.andWhere = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount = jest.fn().mockResolvedValue([mockSubmissions, 2]);

      const response = await request(app)
        .get('/admin/submissions?page=1&limit=50')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.data).toEqual(mockSubmissions);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by orgId when provided', async () => {
      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.leftJoinAndSelect = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.skip = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.take = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.andWhere = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await request(app)
        .get('/admin/submissions?orgId=1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'form.organizationId = :orgId',
        { orgId: 1 }
      );
    });

    it('should return 500 when database query fails', async () => {
      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.leftJoinAndSelect = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.skip = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.take = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/admin/submissions')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });
});
