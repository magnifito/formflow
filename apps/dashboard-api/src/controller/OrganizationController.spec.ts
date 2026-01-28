
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { db } from '../db';
import OrganizationController from './OrganizationController';

// Mock the db module (Drizzle)
jest.mock('../db', () => ({
    db: {
        query: {
            forms: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
            },
            organizations: {
                findFirst: jest.fn(),
            },
        },
        select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ count: 0 }]),
                innerJoin: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([{ count: 0 }]),
                }),
            }),
        }),
        insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn(),
            }),
        }),
        update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([]),
            }),
        }),
        delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
        }),
    },
}));



jest.mock('@formflow/shared/db', () => ({
    forms: { id: 'id', organizationId: 'organizationId', slug: 'slug' },
    organizations: { id: 'id' },
    submissions: { id: 'id', formId: 'formId', createdAt: 'createdAt' },
    whitelistedDomains: { id: 'id', organizationId: 'organizationId' },
    generateSubmitHash: jest.fn().mockReturnValue('mock-hash'),
    IntegrationScope: { ORGANIZATION: 'ORGANIZATION', FORM: 'FORM' }
}));

jest.mock('@formflow/shared/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn((msg, meta) => console.error(msg, meta)),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('drizzle-orm', () => ({
    eq: jest.fn().mockReturnValue({}),
    and: jest.fn().mockReturnValue({}),
    desc: jest.fn().mockReturnValue({}),
    asc: jest.fn().mockReturnValue({}),
    isNull: jest.fn().mockReturnValue({}),
    count: jest.fn().mockReturnValue({}),
    gte: jest.fn().mockReturnValue({}),
    sql: jest.fn().mockReturnValue({}),
}));

jest.mock('../middleware/auth', () => ({
    verifyToken: (req: any, res: any, next: any) => {
        req.user = { userId: 1, email: 'test@example.com' };
        next();
    },
}));

jest.mock('../middleware/orgContext', () => ({
    injectOrgContext: (req: any, res: any, next: any) => {
        req.organization = { id: 1, name: 'Test Org' };
        req.orgUser = { id: 1, role: 'admin', isSuperAdmin: false };
        next();
    },
    verifyOrgAdmin: (req: any, res: any, next: any) => next(),
}));

const mockedDb = db as jest.Mocked<typeof db>;

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
            // Create a thenable query builder mock that supports chaining
            const createThenableQueryBuilder = (resolveValue: any) => {
                const builder: any = {
                    where: jest.fn().mockReturnThis(),
                    innerJoin: jest.fn().mockReturnThis(),
                    then: (resolve: any) => resolve(resolveValue),
                };
                return builder;
            };

            // First call is for form count, second is for submissions count
            let callCount = 0;
            const mockSelectChain = {
                from: jest.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        return createThenableQueryBuilder([{ count: 5 }]);
                    } else {
                        return createThenableQueryBuilder([{ count: 10 }]);
                    }
                }),
            };
            (mockedDb.select as jest.Mock).mockReturnValue(mockSelectChain);

            const res = await request(app).get('/org/stats');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ formCount: 5, submissionsThisMonth: 10 });
        });
    });

    describe('GET /forms', () => {
        it('should return forms', async () => {
            const mockForms = [{ id: 1, name: 'Test Form' }];
            (mockedDb.query.forms.findMany as jest.Mock).mockResolvedValue(mockForms);

            const res = await request(app).get('/org/forms');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockForms);
        });
    });

    describe('POST /forms', () => {
        it('should create a form', async () => {
            const newForm = { name: 'New Form', slug: 'new-form' };
            const savedForm = { id: 1, ...newForm, organizationId: 1 };

            (mockedDb.query.forms.findFirst as jest.Mock).mockResolvedValue(null); // No slug conflict
            (mockedDb.query.organizations.findFirst as jest.Mock).mockResolvedValue({ id: 1, name: 'Test Org' });

            // Mock insert chain
            const mockReturning = jest.fn().mockResolvedValue([savedForm]);
            const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
            (mockedDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

            const res = await request(app).post('/org/forms').send(newForm);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(savedForm);
        });

        it('should validate slug uniqueness', async () => {
            (mockedDb.query.forms.findFirst as jest.Mock).mockResolvedValue({ id: 2 }); // Slug exists

            const res = await request(app).post('/org/forms').send({ name: 'Form', slug: 'existing' });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('already exists');
        });
    });

    describe('GET /forms/:id', () => {
        it('should return a form details', async () => {
            const mockForm = { id: 1, name: 'Form 1' };
            (mockedDb.query.forms.findFirst as jest.Mock).mockResolvedValue(mockForm);

            // Mock select chain for submission count
            const mockSelectChain = {
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([{ count: 5 }]),
                }),
            };
            (mockedDb.select as jest.Mock).mockReturnValue(mockSelectChain);

            const res = await request(app).get('/org/forms/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ...mockForm, submissionCount: 5 });
        });

        it('should return 404 if form not found', async () => {
            (mockedDb.query.forms.findFirst as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get('/org/forms/999');
            expect(res.status).toBe(404);
        });
    });
});
