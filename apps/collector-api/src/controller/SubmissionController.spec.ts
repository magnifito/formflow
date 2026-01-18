import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import router from './SubmissionController';
import { Form, WhitelistedDomain, Submission, OrganizationIntegration, FormIntegration } from '@formflow/shared/entities';
import { createMockRequest, createMockResponse } from '../../test/mocks/express.mock';
import { createMockManager } from '../../test/mocks/data-source.mock';
import nodemailer from 'nodemailer';
import axios from 'axios';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('../data-source', () => ({
  AppDataSource: {
    manager: createMockManager(),
  },
}));

jest.mock('nodemailer');
jest.mock('axios');

describe('SubmissionController', () => {
  let app: express.Application;
  let mockManager: ReturnType<typeof createMockManager>;
  const originalEnv = process.env;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/submit', router);
    
    mockManager = AppDataSource.manager as ReturnType<typeof createMockManager>;
    jest.clearAllMocks();
    
    // Set up default environment variables
    process.env = {
      ...originalEnv,
      CSRF_SECRET: 'test-csrf-secret',
      CSRF_TTL_MINUTES: '15',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /submit/:submitHash/csrf', () => {
    it('should return CSRF token successfully', async () => {
      const form = {
        id: 1,
        submitHash: 'test-hash',
        isActive: true,
        organizationId: 1,
        organization: {
          id: 1,
          isActive: true,
        },
      };

      mockManager.findOne = jest.fn().mockResolvedValue(form);
      mockManager.find = jest.fn().mockResolvedValue([]); // No whitelisted domains

      const response = await request(app)
        .get('/submit/test-hash/csrf')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expiresInSeconds');
    });

    it('should return 501 when CSRF_SECRET is not configured', async () => {
      delete process.env.CSRF_SECRET;

      await request(app)
        .get('/submit/test-hash/csrf')
        .set('Origin', 'https://example.com')
        .expect(501);
    });

    it('should return 400 when origin and referer are missing', async () => {
      await request(app)
        .get('/submit/test-hash/csrf')
        .expect(400);
    });

    it('should use referer header when origin is missing', async () => {
      const form = {
        id: 1,
        submitHash: 'test-hash',
        isActive: true,
        organizationId: 1,
        organization: { id: 1, isActive: true },
      };

      mockManager.findOne = jest.fn().mockResolvedValue(form);
      mockManager.find = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/submit/test-hash/csrf')
        .set('Referer', 'https://example.com/page')
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should return 404 when form not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .get('/submit/invalid-hash/csrf')
        .set('Origin', 'https://example.com')
        .expect(404);
    });

    it('should return 400 when form is inactive', async () => {
      const form = {
        id: 1,
        submitHash: 'test-hash',
        isActive: false,
        organization: { id: 1, isActive: true },
      };

      mockManager.findOne = jest.fn().mockResolvedValue(form);

      await request(app)
        .get('/submit/test-hash/csrf')
        .set('Origin', 'https://example.com')
        .expect(400);
    });

    it('should return 400 when organization is inactive', async () => {
      const form = {
        id: 1,
        submitHash: 'test-hash',
        isActive: true,
        organization: {
          id: 1,
          isActive: false,
        },
      };

      mockManager.findOne = jest.fn().mockResolvedValue(form);

      await request(app)
        .get('/submit/test-hash/csrf')
        .set('Origin', 'https://example.com')
        .expect(400);
    });

    it('should return 403 when origin is not whitelisted', async () => {
      const form = {
        id: 1,
        submitHash: 'test-hash',
        isActive: true,
        organizationId: 1,
        organization: { id: 1, isActive: true },
      };

      const whitelistedDomain = {
        id: 1,
        domain: 'allowed.com',
        organizationId: 1,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(form);
      mockManager.find = jest.fn().mockResolvedValue([whitelistedDomain]);

      await request(app)
        .get('/submit/test-hash/csrf')
        .set('Origin', 'https://notallowed.com')
        .expect(403);
    });

    it('should allow localhost even when not whitelisted', async () => {
      const form = {
        id: 1,
        submitHash: 'test-hash',
        isActive: true,
        organizationId: 1,
        organization: { id: 1, isActive: true },
      };

      const whitelistedDomain = {
        id: 1,
        domain: 'allowed.com',
        organizationId: 1,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(form);
      mockManager.find = jest.fn().mockResolvedValue([whitelistedDomain]);

      const response = await request(app)
        .get('/submit/test-hash/csrf')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should return 500 when database query fails', async () => {
      mockManager.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/submit/test-hash/csrf')
        .set('Origin', 'https://example.com')
        .expect(500);
    });
  });

  describe('POST /submit/:submitHash', () => {
    const mockForm = {
      id: 1,
      submitHash: 'test-hash',
      isActive: true,
      organizationId: 1,
      useOrgSecuritySettings: true,
      organization: {
        id: 1,
        isActive: true,
        defaultRateLimitEnabled: true,
        defaultRateLimitMaxRequests: 10,
        defaultRateLimitWindowSeconds: 60,
        defaultRateLimitMaxRequestsPerHour: 50,
        defaultMinTimeBetweenSubmissionsEnabled: true,
        defaultMinTimeBetweenSubmissionsSeconds: 10,
        defaultMaxRequestSizeBytes: 100000,
        defaultRefererFallbackEnabled: true,
      },
      integration: null,
    };

    it('should accept submission successfully', async () => {
      const mockSubmission = {
        id: 1,
        formId: 1,
        data: { name: 'Test', email: 'test@example.com' },
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.find = jest.fn().mockResolvedValue([]); // No whitelisted domains
      mockManager.create = jest.fn().mockReturnValue(mockSubmission);
      mockManager.save = jest.fn().mockResolvedValue(mockSubmission);

      // Create a valid CSRF token
      const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');

      const response = await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({
          name: 'Test',
          email: 'test@example.com',
          csrfToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Submission received');
    });

    it('should return 404 when form not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .post('/submit/invalid-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 400 when form is inactive', async () => {
      const inactiveForm = { ...mockForm, isActive: false };
      mockManager.findOne = jest.fn().mockResolvedValue(inactiveForm);

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test' })
        .expect(400);
    });

    it('should return 400 when organization is inactive', async () => {
      const formWithInactiveOrg = {
        ...mockForm,
        organization: { ...mockForm.organization, isActive: false },
      };
      mockManager.findOne = jest.fn().mockResolvedValue(formWithInactiveOrg);

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test' })
        .expect(400);
    });

    it('should return 413 when request body is too large', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .set('Content-Length', '200000')
        .send({ name: 'Test' })
        .expect(413);
    });

    it('should return 400 when origin is missing and CSRF is required', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);

      await request(app)
        .post('/submit/test-hash')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test' })
        .expect(400);
    });

    it('should return 403 when CSRF token is invalid', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.find = jest.fn().mockResolvedValue([]);

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({
          name: 'Test',
          csrfToken: 'invalid-token',
        })
        .expect(403);
    });

    it('should return 403 when origin is not whitelisted', async () => {
      const whitelistedDomain = {
        id: 1,
        domain: 'allowed.com',
        organizationId: 1,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.find = jest.fn().mockResolvedValue([whitelistedDomain]);

      const csrfToken = createValidCsrfToken('test-hash', 'https://notallowed.com');

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://notallowed.com')
        .set('Content-Type', 'application/json')
        .send({
          name: 'Test',
          csrfToken,
        })
        .expect(403);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // Simulate rate limit by making multiple requests
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.find = jest.fn().mockResolvedValue([]);
      mockManager.create = jest.fn().mockReturnValue({});
      mockManager.save = jest.fn().mockResolvedValue({});

      const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');

      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/submit/test-hash')
          .set('Origin', 'https://example.com')
          .set('Content-Type', 'application/json')
          .set('X-Forwarded-For', '192.168.1.1')
          .send({
            name: `Test ${i}`,
            csrfToken,
          })
          .expect(200);
      }

      // Next request should be rate limited
      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({
          name: 'Test 11',
          csrfToken,
        })
        .expect(429);
    });

    it('should return 429 when minimum time between submissions is violated', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.find = jest.fn().mockResolvedValue([]);
      mockManager.create = jest.fn().mockReturnValue({});
      mockManager.save = jest.fn().mockResolvedValue({});

      const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');

      // First submission
      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .set('X-Forwarded-For', '192.168.1.2')
        .send({
          name: 'Test',
          csrfToken,
        })
        .expect(200);

      // Immediate second submission should fail
      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .set('X-Forwarded-For', '192.168.1.2')
        .send({
          name: 'Test 2',
          csrfToken,
        })
        .expect(429);
    });

    it('should return 400 when submission is empty', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.find = jest.fn().mockResolvedValue([]);

      const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({
          csrfToken,
        })
        .expect(400);
    });

    it('should return 400 when submission is too large', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.find = jest.fn().mockResolvedValue([]);

      const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');
      const largeData = 'x'.repeat(5000);

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({
          message: largeData,
          csrfToken,
        })
        .expect(400);
    });

    it('should return 400 when Content-Type is invalid', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'text/plain')
        .send('invalid content')
        .expect(400);
    });

    it('should handle webhook integration failure gracefully', async () => {
      const formWithIntegration = {
        ...mockForm,
        integration: {
          id: 1,
          webhookUrl: 'https://webhook.example.com',
          webhookEnabled: true,
        },
      };

      const mockSubmission = {
        id: 1,
        formId: 1,
        data: { name: 'Test' },
      };

      mockManager.findOne = jest.fn().mockResolvedValue(formWithIntegration);
      mockManager.find = jest.fn().mockResolvedValue([]);
      mockManager.create = jest.fn().mockReturnValue(mockSubmission);
      mockManager.save = jest.fn().mockResolvedValue(mockSubmission);
      (axios.post as jest.Mock) = jest.fn().mockRejectedValue(new Error('Webhook failed'));

      const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');

      // Submission should still succeed even if webhook fails
      const response = await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({
          name: 'Test',
          csrfToken,
        })
        .expect(200);

      expect(response.body.message).toBe('Submission received');
    });

    it('should return 500 when database save fails', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.find = jest.fn().mockResolvedValue([]);
      mockManager.create = jest.fn().mockReturnValue({});
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');

      await request(app)
        .post('/submit/test-hash')
        .set('Origin', 'https://example.com')
        .set('Content-Type', 'application/json')
        .send({
          name: 'Test',
          csrfToken,
        })
        .expect(500);
    });
  });

  describe('Helper Functions', () => {
    describe('getClientIp', () => {
      it('should extract IP from x-forwarded-for header', async () => {
        const form = {
          id: 1,
          submitHash: 'test-hash',
          isActive: true,
          organizationId: 1,
          organization: { id: 1, isActive: true },
        };

        mockManager.findOne = jest.fn().mockResolvedValue(form);
        mockManager.find = jest.fn().mockResolvedValue([]);
        mockManager.create = jest.fn().mockReturnValue({});
        mockManager.save = jest.fn().mockResolvedValue({});

        const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');

        await request(app)
          .post('/submit/test-hash')
          .set('Origin', 'https://example.com')
          .set('X-Forwarded-For', '192.168.1.100, 10.0.0.1')
          .set('Content-Type', 'application/json')
          .send({
            name: 'Test',
            csrfToken,
          })
          .expect(200);
      });
    });

    describe('getOrigin', () => {
      it('should use referer when origin is missing', async () => {
        const form = {
          id: 1,
          submitHash: 'test-hash',
          isActive: true,
          organizationId: 1,
          organization: { id: 1, isActive: true },
        };

        mockManager.findOne = jest.fn().mockResolvedValue(form);
        mockManager.find = jest.fn().mockResolvedValue([]);
        mockManager.create = jest.fn().mockReturnValue({});
        mockManager.save = jest.fn().mockResolvedValue({});

        const csrfToken = createValidCsrfToken('test-hash', 'https://example.com');

        await request(app)
          .post('/submit/test-hash')
          .set('Referer', 'https://example.com/page')
          .set('Content-Type', 'application/json')
          .send({
            name: 'Test',
            csrfToken,
          })
          .expect(200);
      });
    });
  });
});

// Helper function to create a valid CSRF token for testing
function createValidCsrfToken(submitHash: string, origin: string): string {
  const crypto = require('crypto');
  const csrfSecret = process.env.CSRF_SECRET || 'test-csrf-secret';
  const csrfTtlMs = 15 * 60 * 1000;

  const payload = {
    s: submitHash,
    o: origin,
    e: Date.now() + csrfTtlMs,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const signature = crypto
    .createHmac('sha256', csrfSecret)
    .update(payloadB64)
    .digest();

  const signatureB64 = Buffer.from(signature)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${payloadB64}.${signatureB64}`;
}
