import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../src/index';
import { AppDataSource } from '../src/data-source';
import { TestDatabase, generateOrgContextToken, createTestFormConfig } from './helpers';
import { User, Organization } from '@formflow/shared/entities';

describe('Organization API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let testOrg: Organization;
  let testUser: User;
  let orgToken: string;

  beforeAll(async () => {
    app = await createApp();
    testDb = new TestDatabase(AppDataSource);
  });

  beforeEach(async () => {
    await testDb.cleanup();

    testOrg = await testDb.createTestOrganization();
    testUser = await testDb.createTestUser({
      email: 'user@test.com',
      organizationId: testOrg.id,
      role: 'org_admin',
    });
    orgToken = generateOrgContextToken(testUser.id, testOrg.id);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('GET /org/forms', () => {
    it('should list organization forms', async () => {
      // Create test forms
      await testDb.createTestForm(testOrg.id, { name: 'Form 1' });
      await testDb.createTestForm(testOrg.id, { name: 'Form 2' });

      const response = await request(app)
        .get('/org/forms')
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should only show forms from user organization', async () => {
      // Create another org with forms
      const otherOrg = await testDb.createTestOrganization({
        name: 'Other Org',
        slug: 'other-org',
      });
      await testDb.createTestForm(otherOrg.id, { name: 'Other Form' });

      const response = await request(app)
        .get('/org/forms')
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(200);

      expect(response.body.every((f: any) => f.organizationId === testOrg.id)).toBe(true);
    });
  });

  describe('POST /org/forms', () => {
    it('should create form in organization', async () => {
      const formConfig = createTestFormConfig({
        name: 'Contact Form',
        captchaEnabled: true,
      });

      const response = await request(app)
        .post('/org/forms')
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .send(formConfig)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Contact Form');
      expect(response.body.organizationId).toBe(testOrg.id);
    });

    it.skip('should respect organization form limits', async () => {
      // TODO: Implement maxForms field in Organization entity and form limit checking
      // Update org to have maxForms = 1
      const orgRepo = AppDataSource.getRepository(Organization);
      (testOrg as any).maxForms = 1;
      await orgRepo.save(testOrg);

      // Create first form (should succeed)
      const formConfig1 = createTestFormConfig({ name: 'Form 1' });
      await request(app)
        .post('/org/forms')
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .send(formConfig1)
        .expect(201);

      // Try to create second form (should fail)
      const formConfig2 = createTestFormConfig({ name: 'Form 2' });
      await request(app)
        .post('/org/forms')
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .send(formConfig2)
        .expect(403);
    });
  });

  describe('GET /org/forms/:id', () => {
    it('should get form details', async () => {
      const form = await testDb.createTestForm(testOrg.id, {
        name: 'Test Form',
      });

      const response = await request(app)
        .get(`/org/forms/${form.id}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(200);

      expect(response.body.id).toBe(form.id);
      expect(response.body.name).toBe('Test Form');
    });

    it('should reject access to other organization forms', async () => {
      const otherOrg = await testDb.createTestOrganization({
        name: 'Other Org',
        slug: 'other-org',
      });
      const otherForm = await testDb.createTestForm(otherOrg.id);

      await request(app)
        .get(`/org/forms/${otherForm.id}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(404);
    });
  });

  describe('PUT /org/forms/:id', () => {
    it('should update form configuration', async () => {
      const form = await testDb.createTestForm(testOrg.id, {
        name: 'Original Name',
        captchaEnabled: false,
      });

      const response = await request(app)
        .put(`/org/forms/${form.id}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .send({
          name: 'Updated Name',
          captchaEnabled: true,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.captchaEnabled).toBe(true);
    });
  });

  describe('DELETE /org/forms/:id', () => {
    it('should delete form', async () => {
      const form = await testDb.createTestForm(testOrg.id);

      await request(app)
        .delete(`/org/forms/${form.id}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/org/forms/${form.id}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(404);
    });
  });

  describe('GET /org/submissions', () => {
    it('should list organization submissions', async () => {
      const response = await request(app)
        .get('/org/submissions')
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/org/submissions?page=1&limit=10')
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });
  });

  describe('GET /org/integrations', () => {
    it('should list organization integrations', async () => {
      const response = await request(app)
        .get('/org/integrations')
        .set('Authorization', `Bearer ${orgToken}`)
        .set('X-Organization-Context', testOrg.id.toString())
        .expect(200);

      expect(response.body).toHaveProperty('organizationId');
      expect(response.body.organizationId).toBe(testOrg.id);
    });
  });
});
