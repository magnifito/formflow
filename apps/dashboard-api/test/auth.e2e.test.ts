import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../src/index';
import { AppDataSource } from '../src/data-source';
import { TestDatabase, generateTestToken } from './helpers';
import { User } from '@formflow/shared/entities';

describe('Authentication API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let testUser: User;
  let superAdmin: User;

  beforeAll(async () => {
    app = await createApp();
    testDb = new TestDatabase(AppDataSource);
  });

  beforeEach(async () => {
    await testDb.cleanup();

    // Create test users
    superAdmin = await testDb.createSuperAdmin('admin@test.com', 'admin123');
    testUser = await testDb.createTestUser({
      email: 'user@test.com',
      passwordHash: 'user123',
      name: 'Regular User',
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('admin@test.com');
    });

    it('should reject invalid email', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'admin123',
        })
        .expect(401);
    });

    it('should reject invalid password', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject missing credentials', async () => {
      await request(app)
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const token = generateTestToken(superAdmin.id, true);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.email).toBe('admin@test.com');
      expect(response.body.isSuperAdmin).toBe(true);
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const token = generateTestToken(superAdmin.id, true);

      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
