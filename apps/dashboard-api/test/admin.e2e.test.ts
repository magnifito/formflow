import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../src/index';
import { AppDataSource } from '../src/data-source';
import { TestDatabase, generateTestToken, createTestOrgData, createTestUserData } from './helpers';
import { User, Organization } from '@formflow/shared/entities';

describe('Admin API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let superAdmin: User;
  let regularUser: User;
  let testOrg: Organization;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await createApp();
    testDb = new TestDatabase(AppDataSource);
  });

  beforeEach(async () => {
    await testDb.cleanup();

    // Create super admin and regular user
    superAdmin = await testDb.createSuperAdmin();
    adminToken = generateTestToken(superAdmin.id, true);

    testOrg = await testDb.createTestOrganization();
    regularUser = await testDb.createTestUser({
      email: 'user@test.com',
      organizationId: testOrg.id,
    });
    userToken = generateTestToken(regularUser.id, false);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('GET /admin/stats', () => {
    it('should return system stats for super admin', async () => {
      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('organizations');
      expect(response.body.organizations).toHaveProperty('total');
      expect(response.body).toHaveProperty('users');
      expect(response.body.users).toHaveProperty('total');
      expect(response.body).toHaveProperty('forms');
      expect(response.body.forms).toHaveProperty('total');
      expect(response.body).toHaveProperty('submissions');
      expect(response.body.submissions).toHaveProperty('total');
    });

    it('should reject non-super-admin users', async () => {
      await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/admin/stats')
        .expect(401);
    });
  });

  describe('POST /admin/organizations', () => {
    it('should create organization as super admin', async () => {
      const orgData = createTestOrgData({
        name: 'New Test Org',
        slug: 'new-test-org',
      });

      const response = await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orgData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('New Test Org');
      expect(response.body.slug).toBe('new-test-org');
      expect(response.body).toHaveProperty('isActive');
    });

    it('should reject duplicate slug', async () => {
      const orgData = createTestOrgData({
        slug: testOrg.slug, // Use existing slug
      });

      await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orgData)
        .expect(400);
    });

    it('should reject non-super-admin', async () => {
      const orgData = createTestOrgData();

      await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orgData)
        .expect(403);
    });
  });

  describe('GET /admin/organizations', () => {
    it('should list all organizations for super admin', async () => {
      // Create additional orgs
      await testDb.createTestOrganization({ name: 'Org 2', slug: 'org-2' });
      await testDb.createTestOrganization({ name: 'Org 3', slug: 'org-3' });

      const response = await request(app)
        .get('/admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
    });

    it('should support pagination', async () => {
      // Create multiple orgs
      for (let i = 0; i < 5; i++) {
        await testDb.createTestOrganization({
          name: `Org ${i}`,
          slug: `org-${i}`,
        });
      }

      const response = await request(app)
        .get('/admin/organizations?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(3);
      expect(response.body.pagination.page).toBe(1);
    });
  });

  describe('POST /admin/users', () => {
    it('should create user as super admin', async () => {
      const userData = createTestUserData({
        email: 'newuser@test.com',
        organizationId: testOrg.id,
        role: 'member',
      });

      const response = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('newuser@test.com');
      expect(response.body.organizationId).toBe(testOrg.id);
    });

    it('should reject duplicate email', async () => {
      const userData = createTestUserData({
        email: regularUser.email, // Use existing email
      });

      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);
    });

    it('should validate email format', async () => {
      const userData = createTestUserData({
        email: 'invalid-email',
      });

      await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);
    });
  });

  describe('GET /admin/users', () => {
    it('should list all users for super admin', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter users by organization', async () => {
      const org2 = await testDb.createTestOrganization({
        name: 'Org 2',
        slug: 'org-2',
      });
      await testDb.createTestUser({
        email: 'user2@test.com',
        organizationId: org2.id,
      });

      const response = await request(app)
        .get(`/admin/users?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response has data and includes user from testOrg
      expect(Array.isArray(response.body.data)).toBe(true);
      const testOrgUser = response.body.data.find((u: User) => u.organizationId === testOrg.id);
      expect(testOrgUser).toBeDefined();
      expect(testOrgUser.email).toBe('user@test.com');
    });
  });

  describe('PUT /admin/users/:id/super-admin', () => {
    it('should promote user to super admin', async () => {
      const response = await request(app)
        .put(`/admin/users/${regularUser.id}/super-admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isSuperAdmin: true })
        .expect(200);

      expect(response.body.isSuperAdmin).toBe(true);
    });

    it('should demote user from super admin', async () => {
      // First promote
      await request(app)
        .put(`/admin/users/${regularUser.id}/super-admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isSuperAdmin: true });

      // Then demote
      const response = await request(app)
        .put(`/admin/users/${regularUser.id}/super-admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isSuperAdmin: false })
        .expect(200);

      expect(response.body.isSuperAdmin).toBe(false);
    });
  });

  describe('GET /admin/submissions', () => {
    it('should list all submissions across organizations', async () => {
      const response = await request(app)
        .get('/admin/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support filtering by organization', async () => {
      const response = await request(app)
        .get(`/admin/submissions?organizationId=${testOrg.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });
});
