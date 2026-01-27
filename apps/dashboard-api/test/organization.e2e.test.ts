
import request from 'supertest';
import { createApp } from '../src/index';
import { AppDataSource } from '../src/data-source';
import jwt from 'jsonwebtoken';

// Mock Data Source
jest.mock('../src/data-source', () => ({
    AppDataSource: {
        isInitialized: false,
        initialize: jest.fn().mockResolvedValue(true),
        manager: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
        },
    },
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

        // Mock findOne for injectOrgContext (User)
        (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockUser);

        const res = await request(app)
            .get('/org/current')
            .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('My Org');
    });

    it('GET /org/stats should return stats', async () => {
        const mockOrg = { id: 1, name: 'My Org', isActive: true };
        const mockUser = { id: 1, organizationId: 1, organization: mockOrg, isActive: true };

        (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockUser); // context
        (AppDataSource.manager.count as jest.Mock).mockResolvedValue(5); // formCount

        const mockQueryBuilder = {
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(10),
        };
        (AppDataSource.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

        const res = await request(app)
            .get('/org/stats')
            .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ formCount: 5, submissionsThisMonth: 10 });
    });

    it('should return 403 if user has no organization', async () => {
        const mockUser = { id: 2, isActive: true }; // No org
        (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockUser);

        const res = await request(app)
            .get('/org/current')
            .set('Authorization', 'Bearer token');

        expect(res.status).toBe(403);
    });
});
