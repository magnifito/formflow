
import request from 'supertest';
import { createApp } from '../src/index';
import { AppDataSource } from '../src/data-source';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock Data Source
jest.mock('../src/data-source', () => ({
    AppDataSource: {
        isInitialized: false,
        initialize: jest.fn().mockResolvedValue(true),
        manager: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
        },
    },
}));

jest.mock('@formflow/shared/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
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

jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn().mockResolvedValue('hashed_password'),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock_token'),
    verify: jest.fn(),
}));

describe('Auth Endpoints (E2E)', () => {
    let app: any;

    beforeAll(async () => {
        app = await createApp();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /auth/login', () => {
        it('should login successfully with valid credentials', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                isActive: true,
                organizationId: 1
            };

            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('should return 401 for invalid credentials', async () => {
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'wrong@example.com', password: 'password' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /auth/me', () => {
        it('should return current user details', async () => {
            // Mock verifyToken middleware behavior by mocking jwt.verify
            (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                organization: { id: 1, name: 'Org 1' }
            };
            (AppDataSource.manager.findOne as jest.Mock).mockResolvedValue(mockUser);

            const res = await request(app)
                .get('/auth/me')
                .set('Authorization', 'Bearer valid_token');

            expect(res.status).toBe(200);
            expect(res.body.email).toBe('test@example.com');
            expect(res.body.organization.name).toBe('Org 1');
        });

        it('should return 401 without token', async () => {
            const res = await request(app).get('/auth/me');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /setup', () => {
        it('should complete setup if no superadmin exists', async () => {
            // Mock check for existing superadmin
            (AppDataSource.manager.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // No existing superadmin
                .mockResolvedValueOnce(null) // No user with email
                .mockResolvedValueOnce(null); // No org with slug

            const mockOrg = { id: 1, name: 'Admin Org', slug: 'admin-org' };
            const mockUser = { id: 1, email: 'admin@example.com', organizationId: 1, isSuperAdmin: true };

            (AppDataSource.manager.create as jest.Mock)
                .mockReturnValueOnce(mockOrg)
                .mockReturnValueOnce(mockUser);

            (AppDataSource.manager.save as jest.Mock)
                .mockResolvedValueOnce(mockOrg)
                .mockResolvedValueOnce(mockUser);

            const res = await request(app).post('/setup').send({
                email: 'admin@example.com',
                password: 'password123',
                name: 'Admin',
                organizationName: 'Admin Org',
                organizationSlug: 'admin-org'
            });

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('Setup completed');
            expect(res.body).toHaveProperty('token');
        });
    });
});
