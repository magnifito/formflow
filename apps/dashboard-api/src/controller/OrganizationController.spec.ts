import { AppDataSource } from '../data-source';
import router from './OrganizationController';
import { Form, Organization, WhitelistedDomain, OrganizationIntegration, Submission } from '@formflow/shared/entities';
import { OrgContextRequest } from '../middleware/orgContext';
import { createMockOrgContextRequest, createMockResponse, createMockNext } from '../../test/mocks/express.mock';
import { createMockManager, createMockQueryBuilder } from '../../test/mocks/data-source.mock';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('../data-source', () => ({
  AppDataSource: {
    manager: createMockManager(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

describe('OrganizationController', () => {
  let app: express.Application;
  let mockManager: ReturnType<typeof createMockManager>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  const mockToken = 'valid-token';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Skip auth middleware for unit tests
    app.use('/org', (req, res, next) => {
      (req as OrgContextRequest).user = { userId: 1 };
      (req as OrgContextRequest).orgUser = {
        id: 1,
        isSuperAdmin: false,
        organizationId: 1,
      } as any;
      (req as OrgContextRequest).organization = {
        id: 1,
        name: 'Test Org',
        isActive: true,
      } as any;
      next();
    });
    app.use('/org', router);

    mockManager = AppDataSource.manager as ReturnType<typeof createMockManager>;
    mockQueryBuilder = createMockQueryBuilder();
    jest.clearAllMocks();
  });

  describe('GET /org/stats', () => {
    it('should return organization statistics successfully', async () => {
      mockManager.count = jest.fn().mockResolvedValue(5); // formCount
      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.innerJoin = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.andWhere = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(10); // submissionsThisMonth

      const response = await request(app)
        .get('/org/stats')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual({
        formCount: 5,
        submissionsThisMonth: 10,
      });
    });

    it('should return 500 when database query fails', async () => {
      mockManager.count = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/org/stats')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('GET /org/forms', () => {
    it('should return organization forms successfully', async () => {
      const mockForms = [
        { id: 1, name: 'Form 1', submitHash: 'hash1' },
        { id: 2, name: 'Form 2', submitHash: 'hash2' },
      ];

      mockManager.find = jest.fn().mockResolvedValue(mockForms);

      const response = await request(app)
        .get('/org/forms')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual(mockForms);
    });

    it('should return empty array when no forms exist', async () => {
      mockManager.find = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/org/forms')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 500 when database query fails', async () => {
      mockManager.find = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/org/forms')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('POST /org/forms', () => {
    it('should create form successfully', async () => {
      const org = { id: 1, defaultRateLimitEnabled: true };
      const newForm = {
        id: 1,
        name: 'New Form',
        submitHash: 'mock-uuid-v4',
        organizationId: 1,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(org);
      mockManager.create = jest.fn().mockReturnValue(newForm);
      mockManager.save = jest.fn().mockResolvedValue(newForm);

      const response = await request(app)
        .post('/org/forms')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Form' })
        .expect(201);

      expect(response.body.name).toBe('New Form');
      expect(uuidv4).toHaveBeenCalled();
    });

    it('should return 400 when name is missing', async () => {
      await request(app)
        .post('/org/forms')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ description: 'Test description' })
        .expect(400);
    });

    it('should return 500 when database save fails', async () => {
      const org = { id: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(org);
      mockManager.create = jest.fn().mockReturnValue({});
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .post('/org/forms')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Form' })
        .expect(500);
    });
  });

  describe('GET /org/forms/:id', () => {
    it('should return form details successfully', async () => {
      const mockForm = {
        id: 1,
        name: 'Test Form',
        organizationId: 1,
        integration: null,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(mockForm);
      mockManager.count = jest.fn().mockResolvedValue(5); // submissionCount

      const response = await request(app)
        .get('/org/forms/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.submissionCount).toBe(5);
    });

    it('should return 404 when form not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .get('/org/forms/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 500 when database query fails', async () => {
      mockManager.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/org/forms/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('PUT /org/forms/:id', () => {
    it('should update form successfully', async () => {
      const existingForm = {
        id: 1,
        name: 'Old Name',
        organizationId: 1,
        isActive: true,
      };
      const updatedForm = { ...existingForm, name: 'New Name' };

      mockManager.findOne = jest.fn().mockResolvedValue(existingForm);
      mockManager.save = jest.fn().mockResolvedValue(updatedForm);

      const response = await request(app)
        .put('/org/forms/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.name).toBe('New Name');
    });

    it('should return 404 when form not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .put('/org/forms/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should return 500 when database save fails', async () => {
      const existingForm = { id: 1, organizationId: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(existingForm);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .put('/org/forms/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Name' })
        .expect(500);
    });
  });

  describe('DELETE /org/forms/:id', () => {
    it('should delete form successfully', async () => {
      const form = { id: 1, organizationId: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(form);
      mockManager.delete = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/org/forms/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.message).toBe('Form deleted successfully');
      expect(mockManager.delete).toHaveBeenCalledTimes(2); // Submissions and form
    });

    it('should return 404 when form not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .delete('/org/forms/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 500 when database delete fails', async () => {
      const form = { id: 1, organizationId: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(form);
      mockManager.delete = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .delete('/org/forms/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('POST /org/forms/:id/regenerate-hash', () => {
    it('should regenerate submit hash successfully', async () => {
      const form = { id: 1, organizationId: 1, submitHash: 'old-hash' };
      mockManager.findOne = jest.fn().mockResolvedValue(form);
      mockManager.save = jest.fn().mockResolvedValue({ ...form, submitHash: 'mock-uuid-v4' });

      const response = await request(app)
        .post('/org/forms/1/regenerate-hash')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.submitHash).toBe('mock-uuid-v4');
      expect(uuidv4).toHaveBeenCalled();
    });

    it('should return 404 when form not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .post('/org/forms/999/regenerate-hash')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 500 when database save fails', async () => {
      const form = { id: 1, organizationId: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(form);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .post('/org/forms/1/regenerate-hash')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('GET /org/domains', () => {
    it('should return whitelisted domains successfully', async () => {
      const mockDomains = [
        { id: 1, domain: 'formflow.fyi' },
        { id: 2, domain: 'test.com' },
      ];

      mockManager.find = jest.fn().mockResolvedValue(mockDomains);

      const response = await request(app)
        .get('/org/domains')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual(mockDomains);
    });

    it('should return 500 when database query fails', async () => {
      mockManager.find = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/org/domains')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('POST /org/domains', () => {
    it('should add domain successfully', async () => {
      const newDomain = { id: 1, domain: 'formflow.fyi', organizationId: 1 };

      mockManager.findOne = jest.fn().mockResolvedValue(null); // No duplicate
      mockManager.count = jest.fn().mockResolvedValue(5); // Under limit
      mockManager.create = jest.fn().mockReturnValue(newDomain);
      mockManager.save = jest.fn().mockResolvedValue(newDomain);

      const response = await request(app)
        .post('/org/domains')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ domain: 'formflow.fyi' })
        .expect(201);

      expect(response.body.domain).toBe('formflow.fyi');
    });

    it('should return 400 when domain is missing', async () => {
      await request(app)
        .post('/org/domains')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 when domain already exists', async () => {
      const existingDomain = { id: 1, domain: 'formflow.fyi' };
      mockManager.findOne = jest.fn().mockResolvedValue(existingDomain);

      await request(app)
        .post('/org/domains')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ domain: 'formflow.fyi' })
        .expect(400);
    });

    it('should return 400 when domain limit is exceeded', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);
      mockManager.count = jest.fn().mockResolvedValue(50); // At limit

      await request(app)
        .post('/org/domains')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ domain: 'formflow.fyi' })
        .expect(400);
    });

    it('should return 500 when database save fails', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);
      mockManager.count = jest.fn().mockResolvedValue(5);
      mockManager.create = jest.fn().mockReturnValue({});
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .post('/org/domains')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ domain: 'formflow.fyi' })
        .expect(500);
    });
  });

  describe('DELETE /org/domains/:id', () => {
    it('should remove domain successfully', async () => {
      const domain = { id: 1, organizationId: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(domain);
      mockManager.delete = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/org/domains/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.message).toBe('Domain removed successfully');
    });

    it('should return 404 when domain not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .delete('/org/domains/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 500 when database delete fails', async () => {
      const domain = { id: 1, organizationId: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(domain);
      mockManager.delete = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .delete('/org/domains/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('GET /org/integrations', () => {
    it('should return existing integration successfully', async () => {
      const integration = { id: 1, organizationId: 1, emailEnabled: true };
      mockManager.findOne = jest.fn().mockResolvedValue(integration);

      const response = await request(app)
        .get('/org/integrations')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual(integration);
    });

    it('should create default integration when none exists', async () => {
      const newIntegration = { id: 1, organizationId: 1, emailEnabled: true };

      mockManager.findOne = jest.fn().mockResolvedValue(null);
      mockManager.create = jest.fn().mockReturnValue(newIntegration);
      mockManager.save = jest.fn().mockResolvedValue(newIntegration);

      const response = await request(app)
        .get('/org/integrations')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.emailEnabled).toBe(true);
    });

    it('should return 500 when database query fails', async () => {
      mockManager.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/org/integrations')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('PUT /org/integrations', () => {
    it('should update integration successfully', async () => {
      const integration = { id: 1, organizationId: 1, emailEnabled: false };
      const updatedIntegration = { ...integration, emailEnabled: true };

      mockManager.findOne = jest.fn().mockResolvedValue(integration);
      mockManager.save = jest.fn().mockResolvedValue(updatedIntegration);

      const response = await request(app)
        .put('/org/integrations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ emailEnabled: true })
        .expect(200);

      expect(response.body.emailEnabled).toBe(true);
    });

    it('should create integration if it does not exist', async () => {
      const newIntegration = { id: 1, organizationId: 1, emailEnabled: true };

      mockManager.findOne = jest.fn().mockResolvedValue(null);
      mockManager.create = jest.fn().mockReturnValue(newIntegration);
      mockManager.save = jest.fn().mockResolvedValue(newIntegration);

      const response = await request(app)
        .put('/org/integrations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ emailEnabled: true })
        .expect(200);

      expect(response.body.emailEnabled).toBe(true);
    });

    it('should return 500 when database save fails', async () => {
      const integration = { id: 1, organizationId: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(integration);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .put('/org/integrations')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ emailEnabled: true })
        .expect(500);
    });
  });

  describe('GET /org/security-settings', () => {
    it('should return security settings successfully', async () => {
      const org = {
        id: 1,
        defaultRateLimitEnabled: true,
        defaultRateLimitMaxRequests: 10,
        defaultRateLimitWindowSeconds: 60,
        defaultRateLimitMaxRequestsPerHour: 50,
        defaultMinTimeBetweenSubmissionsEnabled: true,
        defaultMinTimeBetweenSubmissionsSeconds: 10,
        defaultMaxRequestSizeBytes: 100000,
        defaultRefererFallbackEnabled: true,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(org);

      const response = await request(app)
        .get('/org/security-settings')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.defaultRateLimitEnabled).toBe(true);
    });

    it('should return 404 when organization not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .get('/org/security-settings')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 500 when database query fails', async () => {
      mockManager.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/org/security-settings')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('PUT /org/security-settings', () => {
    it('should update security settings successfully', async () => {
      const org = {
        id: 1,
        defaultRateLimitEnabled: false,
        defaultRateLimitMaxRequests: 5,
      };

      mockManager.findOne = jest.fn().mockResolvedValue(org);
      mockManager.save = jest.fn().mockResolvedValue({
        ...org,
        defaultRateLimitEnabled: true,
        defaultRateLimitMaxRequests: 20,
      });

      const response = await request(app)
        .put('/org/security-settings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          defaultRateLimitEnabled: true,
          defaultRateLimitMaxRequests: 20,
        })
        .expect(200);

      expect(response.body.defaultRateLimitEnabled).toBe(true);
      expect(response.body.defaultRateLimitMaxRequests).toBe(20);
    });

    it('should return 404 when organization not found', async () => {
      mockManager.findOne = jest.fn().mockResolvedValue(null);

      await request(app)
        .put('/org/security-settings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ defaultRateLimitEnabled: true })
        .expect(404);
    });

    it('should return 500 when database save fails', async () => {
      const org = { id: 1 };
      mockManager.findOne = jest.fn().mockResolvedValue(org);
      mockManager.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .put('/org/security-settings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ defaultRateLimitEnabled: true })
        .expect(500);
    });
  });

  describe('GET /org/submissions', () => {
    it('should return paginated submissions successfully', async () => {
      const mockSubmissions = [
        { id: 1, data: { name: 'Test' } },
        { id: 2, data: { name: 'Test 2' } },
      ];

      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.innerJoinAndSelect = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.skip = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.take = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.andWhere = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount = jest.fn().mockResolvedValue([mockSubmissions, 2]);

      const response = await request(app)
        .get('/org/submissions?page=1&limit=50')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.data).toEqual(mockSubmissions);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by formId when provided', async () => {
      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.innerJoinAndSelect = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.skip = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.take = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.andWhere = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await request(app)
        .get('/org/submissions?formId=1')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'submission.formId = :formId',
        { formId: 1 }
      );
    });

    it('should return 500 when database query fails', async () => {
      mockManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.innerJoinAndSelect = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.skip = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.take = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/org/submissions')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });
});
