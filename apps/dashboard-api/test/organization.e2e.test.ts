
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
            },
            organizations: {
                findFirst: jest.fn(),
            },
            forms: {
                findMany: jest.fn(),
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
        execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    },
}));

jest.mock('@formflow/shared/drizzle', () => ({
    users: { id: 'id', email: 'email', organizationId: 'organizationId', isActive: 'isActive' },
    organizations: { id: 'id', slug: 'slug', isActive: 'isActive' },
    forms: { id: 'id', organizationId: 'organizationId' },
    submissions: { id: 'id', formId: 'formId', createdAt: 'createdAt' },
    whitelistedDomains: { id: 'id', organizationId: 'organizationId' },
    integrations: { id: 'id', organizationId: 'organizationId' },
    generateSubmitHash: jest.fn().mockReturnValue('mock-hash'),
    IntegrationScope: { ORGANIZATION: 'ORGANIZATION', FORM: 'FORM' }
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

jest.mock('drizzle-orm', () => ({
    eq: jest.fn(),
    and: jest.fn(),
    desc: jest.fn(),
    asc: jest.fn(),
    isNull: jest.fn(),
    count: jest.fn(),
    gte: jest.fn(),
    sql: jest.fn(),
}));

const mockedDb = db as jest.Mocked<typeof db>;

describe('Organization Endpoints (E2E)', () => {
    let app: any;

    beforeAll(async () => {
        app = await createApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });
    });

    it('GET /org/current should return organization details', async () => {
        const mockOrg = { id: 1, name: 'My Org', isActive: true };
        const mockUser = { id: 1, organizationId: 1, organization: mockOrg, isActive: true };

        // Mock findFirst for injectOrgContext (User with organization)
        (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser);

        const res = await request(app)
            .get('/org/current')
            .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('My Org');
    });

    it('GET /org/stats should return stats', async () => {
        const mockOrg = { id: 1, name: 'My Org', isActive: true };
        const mockUser = { id: 1, organizationId: 1, organization: mockOrg, isActive: true };

        (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser); // context

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

        const res = await request(app)
            .get('/org/stats')
            .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ formCount: 5, submissionsThisMonth: 10 });
    });

    it('should return 403 if user has no organization', async () => {
        const mockUser = { id: 2, isActive: true, organizationId: null, organization: null }; // No org
        (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser);

        const res = await request(app)
            .get('/org/current')
            .set('Authorization', 'Bearer token');

        expect(res.status).toBe(403);
    });
});
