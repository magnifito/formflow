
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { db } from '../db';
import AdminController from './AdminController';
import bcrypt from 'bcrypt';

// Mock the db module (Drizzle)
jest.mock('../db', () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
            },
            organizations: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
            },
        },
        select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        offset: jest.fn().mockResolvedValue([]),
                    }),
                }),
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
    users: { id: 'id', email: 'email', organizationId: 'organizationId', isActive: 'isActive', isSuperAdmin: 'isSuperAdmin' },
    organizations: { id: 'id', slug: 'slug', isActive: 'isActive' },
    forms: { id: 'id', organizationId: 'organizationId' },
    submissions: { id: 'id', formId: 'formId', createdAt: 'createdAt' },
}));

jest.mock('@formflow/shared/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed_password'),
}));

jest.mock('../middleware/auth', () => ({
    verifyToken: (req: any, res: any, next: any) => {
        req.user = { userId: 1, email: 'admin@example.com', role: 'admin' };
        next();
    },
}));

jest.mock('../middleware/superAdmin', () => ({
    verifySuperAdmin: (req: any, res: any, next: any) => next(),
}));

const mockedDb = db as jest.Mocked<typeof db>;

const app = express();
app.use(bodyParser.json());
app.use('/admin', AdminController);

describe('AdminController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /stats', () => {
        it('should return admin stats', async () => {
            // Create a thenable query builder mock that supports chaining
            // This mock is thenable at every level of the chain
            const createThenableQueryBuilder = (resolveValue: any) => {
                const builder: any = {
                    where: jest.fn().mockReturnThis(),
                    innerJoin: jest.fn().mockReturnThis(),
                    then: (resolve: any) => resolve(resolveValue),
                };
                return builder;
            };

            // The stats endpoint makes 6 queries:
            // 1. organizations count (no where)
            // 2. active organizations count (with where)
            // 3. users count (no where)
            // 4. forms count (no where)
            // 5. submissions count (no where)
            // 6. recent submissions (with where)
            const mockSelectChain = {
                from: jest.fn().mockReturnValue(createThenableQueryBuilder([{ count: 5 }])),
            };
            (mockedDb.select as jest.Mock).mockReturnValue(mockSelectChain);

            const res = await request(app).get('/admin/stats');
            expect(res.status).toBe(200);
            expect(res.body.organizations.total).toBe(5);
        });
    });

    describe('GET /organizations', () => {
        it('should return paginated organizations', async () => {
            const mockOrgs = [{ id: 1, name: 'Org 1' }];
            (mockedDb.query.organizations.findMany as jest.Mock).mockResolvedValue(mockOrgs);

            // Mock count for pagination
            const mockSelectChain = {
                from: jest.fn().mockResolvedValue([{ count: 1 }]),
            };
            (mockedDb.select as jest.Mock).mockReturnValue(mockSelectChain);

            const res = await request(app).get('/admin/organizations');
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual(mockOrgs);
            expect(res.body.pagination.total).toBe(1);
        });
    });

    describe('POST /organizations', () => {
        it('should create an organization', async () => {
            const newOrg = { name: 'New Org', slug: 'new-org' };
            const savedOrg = { id: 1, ...newOrg };

            (mockedDb.query.organizations.findFirst as jest.Mock).mockResolvedValue(null); // No conflict

            // Mock insert chain
            const mockReturning = jest.fn().mockResolvedValue([savedOrg]);
            const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
            (mockedDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

            const res = await request(app).post('/admin/organizations').send(newOrg);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(savedOrg);
        });

        it('should validate slug uniqueness', async () => {
            (mockedDb.query.organizations.findFirst as jest.Mock).mockResolvedValue({ id: 2 }); // Exists

            const res = await request(app).post('/admin/organizations').send({ name: 'Org', slug: 'existing' });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /users', () => {
        it('should create a new user', async () => {
            const newUser = { email: 'user@test.com', password: 'password123', organizationId: 1 };
            const savedUser = { id: 2, email: newUser.email, organizationId: 1 };
            const mockOrg = { id: 1, isActive: true };

            (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValue(null); // No existing user
            (mockedDb.query.organizations.findFirst as jest.Mock).mockResolvedValue(mockOrg); // Org exists

            // Mock insert chain
            const mockReturning = jest.fn().mockResolvedValue([savedUser]);
            const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
            (mockedDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

            const res = await request(app).post('/admin/users').send(newUser);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(savedUser);
        });
    });
});
