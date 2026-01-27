
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { AppDataSource } from '../data-source';
import OrganizationController from './OrganizationController';
import { Form, Organization, WhitelistedDomain, Submission } from '@formflow/shared/entities';

// Mock dependencies
jest.mock('../data-source', () => ({
    AppDataSource: {
        manager: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
        },
    },
}));

jest.mock('@formflow/shared/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    },
}));

jest.mock('../middleware/orgContext', () => ({
    injectOrgContext: (req, res, next) => {
        req.organization = { id: 1, name: 'Test Org' };
        req.orgUser = { id: 1, role: 'admin', isSuperAdmin: false };
        next();
    },
    verifyOrgAdmin: (req, res, next) => next(),
}));

const app = express();
app.use(bodyParser.json());
app.use('/org', OrganizationController);

describe('OrganizationController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /current', () => {
        it('should return current organization', async () => {
            const res = await request(app).get('/org/current');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ id: 1, name: 'Test Org' });
        });
    });

    describe('GET /stats', () => {
        it('should return stats', async () => {
            (AppDataSource.manager.count as jest.Mock).mockResolvedValue(5); // formCount
            const mockQueryBuilder = {
                innerJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(10),
            };
            (AppDataSource.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const res = await request(app).get('/org/stats');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ formCount: 5, submissionsThisMonth: 10 });
        });
    });

    describe('GET /forms', () => {
        it('should return forms', async () => {
            const mockForms = [{ id: 1, name: 'Test Form' }];
            (AppDataSource.manager.find as jest.Mock).mockResolvedValue(mockForms);

            const res = await request(app).get('/org/forms');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockForms);
        });
    });

    describe('POST /forms', () => {
        it('should create a form', async () => {
            const newForm = { name: 'New Form', slug: 'new-form' };
            const savedForm = { id: 1, ...newForm, organizationId: 1 };

            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(null); // No slug conflict
            (AppDataSource.manager.create as jest.Mock).mockReturnValue(savedForm);
            (AppDataSource.manager.save as jest.Mock).mockResolvedValue(savedForm);

            const res = await request(app).post('/org/forms').send(newForm);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(savedForm);
        });

        it('should validate slug uniqueness', async () => {
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue({ id: 2 }); // Slug exists

            const res = await request(app).post('/org/forms').send({ name: 'Form', slug: 'existing' });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('already exists');
        });
    });

    describe('GET /forms/:id', () => {
        it('should return a form details', async () => {
            const mockForm = { id: 1, name: 'Form 1' };
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockForm);
            (AppDataSource.manager.count as jest.Mock).mockResolvedValue(5);

            const res = await request(app).get('/org/forms/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ...mockForm, submissionCount: 5 });
        });

        it('should return 404 if form not found', async () => {
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get('/org/forms/999');
            expect(res.status).toBe(404);
        });
    });
});
