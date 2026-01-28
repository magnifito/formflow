
import request from 'supertest';
import { createApp } from '../src/index';
import { db } from '../src/db';
import bcrypt from 'bcrypt';
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
        },
        select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ count: 0 }]),
            }),
        }),
        insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn(),
            }),
        }),
        execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    },
}));

jest.mock('@formflow/shared/drizzle', () => ({
    users: { id: 'id', email: 'email', isSuperAdmin: 'isSuperAdmin' },
    organizations: { id: 'id', slug: 'slug' },
    forms: {},
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

const mockedDb = db as jest.Mocked<typeof db>;

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

            (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('should return 401 for invalid credentials', async () => {
            (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValue(null);

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
            (mockedDb.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser);

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
            // Mock check for existing superadmin - using select().from().where() pattern
            const mockSelectChain = {
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([{ count: 0 }]),
                }),
            };
            (mockedDb.select as jest.Mock).mockReturnValue(mockSelectChain);

            // Mock findFirst calls
            (mockedDb.query.users.findFirst as jest.Mock)
                .mockResolvedValueOnce(null) // No existing superadmin
                .mockResolvedValueOnce(null); // No user with email

            (mockedDb.query.organizations.findFirst as jest.Mock)
                .mockResolvedValueOnce(null); // No org with slug

            const mockOrg = { id: 1, name: 'Admin Org', slug: 'admin-org' };
            const mockUser = { id: 1, email: 'admin@example.com', organizationId: 1, isSuperAdmin: true };

            // Mock insert chain
            const mockReturningOrg = jest.fn().mockResolvedValue([mockOrg]);
            const mockValuesOrg = jest.fn().mockReturnValue({ returning: mockReturningOrg });

            const mockReturningUser = jest.fn().mockResolvedValue([mockUser]);
            const mockValuesUser = jest.fn().mockReturnValue({ returning: mockReturningUser });

            (mockedDb.insert as jest.Mock)
                .mockReturnValueOnce({ values: mockValuesOrg })
                .mockReturnValueOnce({ values: mockValuesUser });

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
