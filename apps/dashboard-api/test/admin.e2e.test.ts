
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
            findAndCount: jest.fn(),
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

describe('Admin Endpoints (E2E)', () => {
    let app: any;

    beforeAll(async () => {
        app = await createApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default auth mocks for Super Admin
        (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });
        // First findOne call is usually verifySuperAdmin middleware checking the user
        // We'll use mockImplementation to return specific values based on the query or order
    });

    it('GET /admin/stats should return stats for super admin', async () => {
        // Mock User for verifySuperAdmin
        (AppDataSource.manager.findOne as jest.Mock).mockResolvedValueOnce({
            id: 1, isSuperAdmin: true, isActive: true
        });

        // Mock stats counts
        (AppDataSource.manager.count as jest.Mock)
            .mockResolvedValueOnce(5)  // orgs
            .mockResolvedValueOnce(4)  // active orgs
            .mockResolvedValueOnce(10) // users
            .mockResolvedValueOnce(20) // forms
            .mockResolvedValueOnce(100); // submissions

        const mockQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(30),
        };
        (AppDataSource.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

        const res = await request(app)
            .get('/admin/stats')
            .set('Authorization', 'Bearer admin_token');

        expect(res.status).toBe(200);
        expect(res.body.organizations.total).toBe(5);
    });

    it('GET /admin/organizations should return list', async () => {
        // Mock User for verifySuperAdmin
        (AppDataSource.manager.findOne as jest.Mock).mockResolvedValueOnce({
            id: 1, isSuperAdmin: true, isActive: true
        });

        const mockOrgs = [{ id: 1, name: 'Org 1' }];
        (AppDataSource.manager.findAndCount as jest.Mock).mockResolvedValue([mockOrgs, 1]);

        const res = await request(app)
            .get('/admin/organizations')
            .set('Authorization', 'Bearer admin_token');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it('should deny access if not super admin', async () => {
        // Mock User for verifySuperAdmin (regular user)
        (AppDataSource.manager.findOne as jest.Mock).mockResolvedValueOnce({
            id: 2, isSuperAdmin: false, isActive: true
        });

        const res = await request(app)
            .get('/admin/stats')
            .set('Authorization', 'Bearer user_token');

        expect(res.status).toBe(403);
    });
});
