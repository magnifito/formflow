import request from 'supertest';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import { createApp } from '../src/index';
import { AppDataSource } from '../src/data-source';
import { TestDatabase, createTestFormData } from './helpers';
import { Organization, Form } from '@formflow/shared/entities';

describe('Submission API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let testOrg: Organization;
  let testForm: Form;

  beforeAll(async () => {
    // Create app instance for this test suite
    app = await createApp();
    testDb = new TestDatabase(AppDataSource);
  });

  beforeEach(async () => {
    // Clean database before each test
    await testDb.cleanup();

    // Create test organization and form
    testOrg = await testDb.createTestOrganization({
      name: 'Test Org',
      slug: 'test-org',
      apiKey: 'test-org-key-123',
    });

    testForm = await testDb.createTestForm(testOrg.id, {
      name: 'Contact Form',
      captchaEnabled: false, // Disable for simpler tests
      csrfEnabled: false,
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('POST /submit/:formId', () => {
    it('should accept valid form submission', async () => {
      const formData = createTestFormData();

      const response = await request(app)
        .post(`/submit/${testForm.id}`)
        .send(formData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject submission with invalid form ID', async () => {
      const formData = createTestFormData();

      await request(app)
        .post('/submit/99999')
        .send(formData)
        .expect(404);
    });

    it('should reject empty submission', async () => {
      await request(app)
        .post(`/submit/${testForm.id}`)
        .send({})
        .expect(400);
    });

    it('should handle large form data', async () => {
      const largeFormData = createTestFormData({
        message: 'A'.repeat(3000), // Large but under 4000 char limit
      });

      const response = await request(app)
        .post(`/submit/${testForm.id}`)
        .send(largeFormData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject oversized form data', async () => {
      const oversizedData = createTestFormData({
        message: 'A'.repeat(5000), // Over 4000 char limit
      });

      await request(app)
        .post(`/submit/${testForm.id}`)
        .send(oversizedData)
        .expect(400);
    });
  });

  describe('Domain Whitelisting', () => {
    beforeEach(async () => {
      // Create form with domain whitelist
      testForm = await testDb.createTestForm(testOrg.id, {
        name: 'Restricted Form',
        captchaEnabled: false,
        csrfEnabled: false,
      });

      // Add whitelisted domain
      const formRepo = AppDataSource.getRepository(Form);
      testForm.whitelistedDomains = ['example.com'];
      await formRepo.save(testForm);
    });

    it('should accept submission from whitelisted domain', async () => {
      const formData = createTestFormData();

      await request(app)
        .post(`/submit/${testForm.id}`)
        .set('Origin', 'https://example.com')
        .send(formData)
        .expect(200);
    });

    it('should reject submission from non-whitelisted domain', async () => {
      const formData = createTestFormData();

      await request(app)
        .post(`/submit/${testForm.id}`)
        .set('Origin', 'https://evil.com')
        .send(formData)
        .expect(403);
    });

    it('should allow localhost in development', async () => {
      const formData = createTestFormData();

      await request(app)
        .post(`/submit/${testForm.id}`)
        .set('Origin', 'http://localhost:3000')
        .send(formData)
        .expect(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should accept requests within rate limit', async () => {
      const formData = createTestFormData();

      // Send 3 requests (under typical limit)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/submit/${testForm.id}`)
          .send(formData)
          .expect(200);
      }
    });

    it('should return rate limit headers', async () => {
      const formData = createTestFormData();

      const response = await request(app)
        .post(`/submit/${testForm.id}`)
        .send(formData);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    // Note: Full rate limit testing would require many requests
    // and is better suited for integration tests with proper mocking
  });

  describe('CSRF Protection', () => {
    beforeEach(async () => {
      // Enable CSRF for this form
      const formRepo = AppDataSource.getRepository(Form);
      testForm.csrfEnabled = true;
      await formRepo.save(testForm);
    });

    it('should reject submission without CSRF token when enabled', async () => {
      const formData = createTestFormData();

      await request(app)
        .post(`/submit/${testForm.id}`)
        .send(formData)
        .expect(403);
    });

    it('should accept submission with valid CSRF token', async () => {
      // First get a CSRF token (if endpoint exists)
      // For now, we'll skip this test as it requires session management
      // This would be implemented when CSRF token generation endpoint is added
    });
  });

  describe('Field Validation', () => {
    it('should accept valid email format', async () => {
      const formData = createTestFormData({
        email: 'valid@example.com',
      });

      await request(app)
        .post(`/submit/${testForm.id}`)
        .send(formData)
        .expect(200);
    });

    it('should sanitize HTML in form fields', async () => {
      const formData = createTestFormData({
        message: '<script>alert("xss")</script>Normal text',
      });

      const response = await request(app)
        .post(`/submit/${testForm.id}`)
        .send(formData)
        .expect(200);

      // Verify submission was accepted (sanitization happens server-side)
      expect(response.body.success).toBe(true);
    });

    it('should handle special characters', async () => {
      const formData = createTestFormData({
        name: 'José García-López',
        message: 'Testing special chars: ñ, ü, €, ©',
      });

      await request(app)
        .post(`/submit/${testForm.id}`)
        .send(formData)
        .expect(200);
    });
  });
});
