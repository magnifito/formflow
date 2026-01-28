
import request from 'supertest';
import { createApp } from '../src/index';
import { db } from '../src/db';
import jwt from 'jsonwebtoken';

// Mock the db module (Drizzle)
jest.mock('../src/db', () => ({
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
                leftJoin: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([{ count: 0 }]),
                }),
                innerJoin: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([{ count: 0 }]),
                }),
            }),
        }),
        execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    },
}));

jest.mock('@formflow/shared/db', () => ({
    users: { id: 'id', email: 'email', isSuperAdmin: 'isSuperAdmin', isActive: 'isActive', organizationId: 'organizationId' },
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
    LogOperation: {},
    LogOutcome: {
        SUCCESS: 'success',
        FAILURE: 'failure',
    },
    maskSensitiveData: jest.fn((data) => data),
    maskHeaders: jest.fn((headers) => headers),
    maskUrl: jest.fn((url) => url),
    LogMessages: new Proxy({}, {
        get: (target, prop) => jest.fn(() => `[LogMessages.${String(prop)}]`),
    }),
}));

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

const mockedDb = db as jest.Mocked<typeof db>;

describe('Admin Endpoints (E2E)', () => {
    let app: any;

    beforeAll(async () => {
        app = await createApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default auth mocks for Super Admin
        (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });
    });

    it('GET /admin/stats should return stats for super admin', async () => {
        // Mock User for verifySuperAdmin
        (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValueOnce({
            id: 1, isSuperAdmin: true, isActive: true
        });

        // Create a thenable query builder mock that supports chaining
        const createThenableQueryBuilder = (resolveValue: any) => {
            const builder: any = {
                where: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                then: (resolve: any) => resolve(resolveValue),
            };
            return builder;
        };

        // The stats endpoint makes multiple queries
        const mockSelectChain = {
            from: jest.fn().mockReturnValue(createThenableQueryBuilder([{ count: 5 }])),
        };
        (mockedDb.select as jest.Mock).mockReturnValue(mockSelectChain);

        const res = await request(app)
            .get('/admin/stats')
            .set('Authorization', 'Bearer admin_token');

        expect(res.status).toBe(200);
        expect(res.body.organizations.total).toBe(5);
    });

    it('GET /admin/organizations should return list', async () => {
        // Mock User for verifySuperAdmin
        (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValueOnce({
            id: 1, isSuperAdmin: true, isActive: true
        });

        const mockOrgs = [{ id: 1, name: 'Org 1' }];
        (mockedDb.query.organizations.findMany as jest.Mock).mockResolvedValue(mockOrgs);

        // Mock count for pagination
        const mockSelectChain = {
            from: jest.fn().mockResolvedValue([{ count: 1 }]),
        };
        (mockedDb.select as jest.Mock).mockReturnValue(mockSelectChain);

        const res = await request(app)
            .get('/admin/organizations')
            .set('Authorization', 'Bearer admin_token');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it('should deny access if not super admin', async () => {
        // Mock User for verifySuperAdmin (regular user)
        (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValueOnce({
            id: 2, isSuperAdmin: false, isActive: true
        });

        const res = await request(app)
            .get('/admin/stats')
            .set('Authorization', 'Bearer user_token');

        expect(res.status).toBe(403);
    });
});
